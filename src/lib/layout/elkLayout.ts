import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData, Family } from '../../types';

export const PERSON_WIDTH = 180;
export const PERSON_HEIGHT = 72;
const H_GAP = 40;   // horizontal gap between siblings
const V_GAP = 100;  // vertical gap between generations
const COUPLE_GAP = 24; // gap between the two partners

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function familiesWhereParent(personId: string, families: FamilyTreeData['families']): Family[] {
  return Object.values(families).filter((f) =>
    f.partners.some((p) => p.personId === personId)
  );
}

// ─── subtree width calculation ───────────────────────────────────────────────

function subtreeWidth(
  personId: string,
  families: FamilyTreeData['families'],
  visited = new Set<string>()
): number {
  if (visited.has(personId)) return PERSON_WIDTH;
  visited.add(personId);

  const parentFamilies = familiesWhereParent(personId, families);
  if (parentFamilies.length === 0) return PERSON_WIDTH;

  let totalChildWidth = 0;
  for (const fam of parentFamilies) {
    const childIds = fam.children.map((c) => c.personId);
    if (childIds.length === 0) continue;
    const widths = childIds.map((cid) => subtreeWidth(cid, families, new Set(visited)));
    totalChildWidth += widths.reduce((a, b) => a + b, 0) + H_GAP * (childIds.length - 1);
  }

  // The couple occupies 2 cards + COUPLE_GAP
  const coupleWidth = PERSON_WIDTH * 2 + COUPLE_GAP;
  return Math.max(coupleWidth, totalChildWidth);
}

// ─── main layout ─────────────────────────────────────────────────────────────

export async function computeLayout(
  data: FamilyTreeData,
  visiblePersonIds?: Set<string>
): Promise<LayoutResult> {
  const { persons, families } = data;

  const allPersonIds = visiblePersonIds
    ? Object.keys(persons).filter((id) => visiblePersonIds.has(id))
    : Object.keys(persons);

  // Find root people: those who are not children of any visible person
  const childIds = new Set(
    Object.values(families)
      .flatMap((f) => f.children.map((c) => c.personId))
      .filter((id) => allPersonIds.includes(id))
  );
  const roots = allPersonIds.filter((id) => !childIds.has(id));

  const positions = new Map<string, { x: number; y: number }>();
  const placedFamilies = new Set<string>();

  // Track all visible partner IDs so we don't re-place them as roots
  const placedAsPartner = new Set<string>();

  function placeFamily(
    fam: Family,
    centerX: number,
    parentBottomY: number
  ) {
    if (placedFamilies.has(fam.id)) return;
    placedFamilies.add(fam.id);

    const visibleChildren = fam.children
      .map((c) => c.personId)
      .filter((id) => allPersonIds.includes(id));

    // Place partners side-by-side centered on centerX
    const [p1, p2] = fam.partners;
    const coupleY = parentBottomY;

    if (p1 && allPersonIds.includes(p1.personId)) {
      if (!positions.has(p1.personId)) {
        positions.set(p1.personId, {
          x: centerX - PERSON_WIDTH - COUPLE_GAP / 2,
          y: coupleY,
        });
        placedAsPartner.add(p1.personId);
      }
    }
    if (p2 && allPersonIds.includes(p2.personId)) {
      if (!positions.has(p2.personId)) {
        positions.set(p2.personId, {
          x: centerX + COUPLE_GAP / 2,
          y: coupleY,
        });
        placedAsPartner.add(p2.personId);
      }
    }

    if (visibleChildren.length === 0) return;

    // Calculate total width needed for children row
    const childWidths = visibleChildren.map((cid) => subtreeWidth(cid, families));
    const totalWidth =
      childWidths.reduce((a, b) => a + b, 0) + H_GAP * (visibleChildren.length - 1);

    const childY = coupleY + PERSON_HEIGHT + V_GAP;
    let cursor = centerX - totalWidth / 2;

    for (let i = 0; i < visibleChildren.length; i++) {
      const childId = visibleChildren[i];
      const childCenter = cursor + childWidths[i] / 2;
      positions.set(childId, { x: childCenter - PERSON_WIDTH / 2, y: childY });

      // Recurse into child's own families
      const childFamilies = familiesWhereParent(childId, families);
      for (const cf of childFamilies) {
        placeFamily(cf, childCenter, childY + PERSON_HEIGHT + V_GAP);
      }

      cursor += childWidths[i] + H_GAP;
    }
  }

  // Place each root person and their descendant families
  // First pass: collect families rooted from each root person
  let rootCursor = 0;
  const rootFamilyGroups: Array<{ famId: string; center: number }> = [];

  for (const rootId of roots) {
    const rootFams = familiesWhereParent(rootId, families).filter(
      (f) => !placedFamilies.has(f.id)
    );
    if (rootFams.length === 0) {
      // Solo person with no family
      if (!positions.has(rootId)) {
        positions.set(rootId, { x: rootCursor, y: 0 });
        rootCursor += PERSON_WIDTH + H_GAP;
      }
    } else {
      for (const fam of rootFams) {
        const sw = subtreeWidth(rootId, families);
        const center = rootCursor + sw / 2;
        rootFamilyGroups.push({ famId: fam.id, center });
        rootCursor += sw + H_GAP * 2;
      }
    }
  }

  // Place all root families
  for (const { famId, center } of rootFamilyGroups) {
    const fam = families[famId];
    if (fam) placeFamily(fam, center, 0);
  }

  // Place any remaining unplaced persons (partners not yet positioned)
  for (const id of allPersonIds) {
    if (!positions.has(id)) {
      positions.set(id, { x: rootCursor, y: 0 });
      rootCursor += PERSON_WIDTH + H_GAP;
    }
  }

  // ── Build React Flow nodes ──────────────────────────────────────────────────
  const rfNodes: Node[] = [];
  for (const id of allPersonIds) {
    const pos = positions.get(id) ?? { x: 0, y: 0 };
    rfNodes.push({
      id: `person-${id}`,
      type: 'personNode',
      position: pos,
      data: { personId: id },
      style: { width: PERSON_WIDTH, height: PERSON_HEIGHT },
    });
  }

  // ── Build React Flow edges ──────────────────────────────────────────────────
  const rfEdges: Edge[] = [];
  const edgeStyle = { stroke: '#6366f1', strokeWidth: 2 };

  for (const fam of Object.values(families)) {
    const visiblePartners = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const visibleChildren = fam.children.filter((c) => allPersonIds.includes(c.personId));

    const [p1, p2] = visiblePartners;
    const hasP1 = !!p1;
    const hasP2 = !!p2;

    // Couple connector edge (horizontal, rendered as a straight line)
    if (hasP1 && hasP2) {
      rfEdges.push({
        id: `couple-${fam.id}`,
        source: `person-${p1.personId}`,
        target: `person-${p2.personId}`,
        type: 'straight',
        style: edgeStyle,
        sourceHandle: null,
        targetHandle: null,
      });
    }

    // Parent → child edges
    // Connect from whichever partner exists (prefer p1, fall back to p2)
    const parentNodeId = hasP1
      ? `person-${p1.personId}`
      : hasP2
      ? `person-${p2.personId}`
      : null;

    if (parentNodeId) {
      for (const child of visibleChildren) {
        rfEdges.push({
          id: `parent-child-${fam.id}-${child.personId}`,
          source: parentNodeId,
          target: `person-${child.personId}`,
          type: 'smoothstep',
          style: edgeStyle,
        });
      }
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}

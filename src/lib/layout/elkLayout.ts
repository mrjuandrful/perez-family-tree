import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData, Family } from '../../types';

export const PERSON_WIDTH = 180;
export const PERSON_HEIGHT = 80;
const H_GAP = 50;    // horizontal gap between sibling subtrees
const V_GAP = 100;   // vertical gap between generations
const COUPLE_GAP = 40; // gap between the two partner cards
const HEART_SIZE = 28; // heart node width/height

// Heart node IDs for married couples
const HEART_FAMILIES = new Set(['F001', 'F003', 'F004']); // Juan+Melissa, Gonzalo+Osiris, Evaristo+Zoila

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
// Returns the width of the subtree rooted at a FAMILY (couple + all descendants).
// For a solo person with no family, returns PERSON_WIDTH.

function familySubtreeWidth(
  famId: string,
  families: FamilyTreeData['families'],
  visitedFams = new Set<string>()
): number {
  if (visitedFams.has(famId)) return PERSON_WIDTH * 2 + COUPLE_GAP;
  visitedFams.add(famId);

  const fam = families[famId];
  if (!fam) return PERSON_WIDTH;

  const coupleWidth = PERSON_WIDTH * 2 + COUPLE_GAP;

  if (fam.children.length === 0) return coupleWidth;

  // For each child, compute the max subtree width (child's own families)
  let totalChildWidth = 0;
  for (let i = 0; i < fam.children.length; i++) {
    const childId = fam.children[i].personId;
    const childFams = familiesWhereParent(childId, families).filter(
      (cf) => !visitedFams.has(cf.id)
    );
    if (childFams.length === 0) {
      totalChildWidth += PERSON_WIDTH;
    } else {
      // Sum widths of all child's families
      let childTotalWidth = 0;
      for (const cf of childFams) {
        childTotalWidth += familySubtreeWidth(cf.id, families, new Set(visitedFams));
      }
      totalChildWidth += childTotalWidth;
    }
    if (i < fam.children.length - 1) totalChildWidth += H_GAP;
  }

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

  // Find root families: families where both partners are roots (not children of any visible family)
  const childIds = new Set(
    Object.values(families)
      .flatMap((f) => f.children.map((c) => c.personId))
      .filter((id) => allPersonIds.includes(id))
  );

  // Root persons: visible persons who are not children of any visible person
  const rootPersonIds = allPersonIds.filter((id) => !childIds.has(id));

  // Root families: families where ALL partners are root persons (none are children of another visible family)
  // This ensures grandparent families appear at the top, not families where one partner has unknown parents
  const rootFamilies = Object.values(families).filter((f) =>
    f.partners.every((p) =>
      !allPersonIds.includes(p.personId) || rootPersonIds.includes(p.personId)
    )
  );

  // Solo roots: root persons not in any family
  const rootFamilyPartnerIds = new Set(
    rootFamilies.flatMap((f) => f.partners.map((p) => p.personId))
  );
  const soloRoots = rootPersonIds.filter((id) => !rootFamilyPartnerIds.has(id));

  const positions = new Map<string, { x: number; y: number }>();
  const heartPositions = new Map<string, { x: number; y: number }>();
  const placedFamilies = new Set<string>();

  // placeFamily: recursively places a family centered at centerX, with couple at y=coupleY
  function placeFamily(fam: Family, centerX: number, coupleY: number) {
    if (placedFamilies.has(fam.id)) return;
    placedFamilies.add(fam.id);

    const [p1, p2] = fam.partners;
    const hasP1 = p1 && allPersonIds.includes(p1.personId);
    const hasP2 = p2 && allPersonIds.includes(p2.personId);

    // Place partners side-by-side centered on centerX
    if (hasP1 && hasP2) {
      // Two partners: p1 on left, p2 on right, heart centered between them
      const leftX = centerX - PERSON_WIDTH - COUPLE_GAP / 2;
      const rightX = centerX + COUPLE_GAP / 2;
      if (!positions.has(p1.personId)) positions.set(p1.personId, { x: leftX, y: coupleY });
      if (!positions.has(p2.personId)) positions.set(p2.personId, { x: rightX, y: coupleY });

      if (HEART_FAMILIES.has(fam.id)) {
        // Heart centered between the two cards
        heartPositions.set(fam.id, {
          x: centerX - HEART_SIZE / 2,
          y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
        });
      }
    } else if (hasP1) {
      if (!positions.has(p1.personId)) positions.set(p1.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    } else if (hasP2) {
      if (!positions.has(p2.personId)) positions.set(p2.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    }

    const visibleChildren = fam.children
      .map((c) => c.personId)
      .filter((id) => allPersonIds.includes(id));

    if (visibleChildren.length === 0) return;

    // Calculate child subtree widths
    const childSubtreeWidths = visibleChildren.map((childId) => {
      const childFams = familiesWhereParent(childId, families).filter(
        (cf) => !placedFamilies.has(cf.id)
      );
      if (childFams.length === 0) return PERSON_WIDTH;
      let w = 0;
      for (let i = 0; i < childFams.length; i++) {
        w += familySubtreeWidth(childFams[i].id, families, new Set(placedFamilies));
        if (i < childFams.length - 1) w += H_GAP;
      }
      return w;
    });

    const totalChildWidth =
      childSubtreeWidths.reduce((a, b) => a + b, 0) + H_GAP * (visibleChildren.length - 1);

    const childY = coupleY + PERSON_HEIGHT + V_GAP;
    let cursor = centerX - totalChildWidth / 2;

    for (let i = 0; i < visibleChildren.length; i++) {
      const childId = visibleChildren[i];
      const childWidth = childSubtreeWidths[i];
      const childCenter = cursor + childWidth / 2;

      // Place child person centered in their subtree slot
      if (!positions.has(childId)) {
        positions.set(childId, { x: childCenter - PERSON_WIDTH / 2, y: childY });
      }

      // Recurse into child's own families
      const childFams = familiesWhereParent(childId, families).filter(
        (cf) => !placedFamilies.has(cf.id)
      );
      for (const cf of childFams) {
        placeFamily(cf, childCenter, childY + PERSON_HEIGHT + V_GAP);
      }

      cursor += childWidth + H_GAP;
    }
  }

  // Calculate total width of all root families to center them
  const rootWidths = rootFamilies.map((f) => familySubtreeWidth(f.id, families));
  const totalRootWidth =
    rootWidths.reduce((a, b) => a + b, 0) + H_GAP * 2 * (rootFamilies.length - 1);

  let rootCursor = -totalRootWidth / 2;

  for (let i = 0; i < rootFamilies.length; i++) {
    const fam = rootFamilies[i];
    const w = rootWidths[i];
    const center = rootCursor + w / 2;
    placeFamily(fam, center, 0);
    rootCursor += w + H_GAP * 2;
  }

  // Place solo roots
  let soloCursor = rootCursor;
  for (const id of soloRoots) {
    if (!positions.has(id)) {
      positions.set(id, { x: soloCursor, y: 0 });
      soloCursor += PERSON_WIDTH + H_GAP;
    }
  }

  // Place any remaining unplaced persons
  for (const id of allPersonIds) {
    if (!positions.has(id)) {
      positions.set(id, { x: soloCursor, y: 0 });
      soloCursor += PERSON_WIDTH + H_GAP;
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

  // Heart nodes for married couples
  for (const [famId, pos] of heartPositions) {
    rfNodes.push({
      id: `heart-${famId}`,
      type: 'heartNode',
      position: pos,
      data: { famId },
      style: { width: HEART_SIZE, height: HEART_SIZE },
      selectable: false,
      draggable: false,
    });
  }

  // ── Build React Flow edges ──────────────────────────────────────────────────
  const rfEdges: Edge[] = [];
  const edgeStyle = { stroke: '#6366f1', strokeWidth: 2 };
  const dissolvedEdgeStyle = { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '6,4' };

  for (const fam of Object.values(families)) {
    const visiblePartners = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const visibleChildren = fam.children.filter((c) => allPersonIds.includes(c.personId));

    const [p1, p2] = visiblePartners;
    const hasP1 = !!p1;
    const hasP2 = !!p2;

    // Couple connector edge (horizontal line between partners)
    if (hasP1 && hasP2) {
      const style = fam.dissolved ? dissolvedEdgeStyle : edgeStyle;
      if (HEART_FAMILIES.has(fam.id)) {
        // Two edges: p1 → heart, heart → p2
        rfEdges.push({
          id: `couple-a-${fam.id}`,
          source: `person-${p1.personId}`,
          target: `heart-${fam.id}`,
          type: 'straight',
          style,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
        rfEdges.push({
          id: `couple-b-${fam.id}`,
          source: `heart-${fam.id}`,
          target: `person-${p2.personId}`,
          type: 'straight',
          style,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
      } else {
        rfEdges.push({
          id: `couple-${fam.id}`,
          source: `person-${p1.personId}`,
          target: `person-${p2.personId}`,
          type: 'straight',
          style,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
      }
    }

    // Parent → child edges
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

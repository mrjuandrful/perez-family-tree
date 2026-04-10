import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData, Family } from '../../types';

export const PERSON_WIDTH = 180;
export const PERSON_HEIGHT = 80;
const H_GAP = 50;    // horizontal gap between sibling subtrees
const ROW_HEIGHT = 220; // vertical distance between generation rows (node height + spacing)
const COUPLE_GAP = 50; // horizontal gap between the two partner cards (must fit heart)

// Families with a heart connector node
const HEART_FAMILIES = new Set(['F001', 'F003', 'F004']);
const HEART_SIZE = 28;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

// ─── Step 1: assign generation depth to every person ────────────────────────
// Generation 0 = root ancestors (no visible parents).
// We do a top-down BFS through family→children edges.

function assignGenerations(
  allPersonIds: string[],
  families: FamilyTreeData['families']
): Map<string, number> {
  const gen = new Map<string, number>();
  const allIds = new Set(allPersonIds);

  // childIds: persons who appear as children in any visible family
  const childIds = new Set(
    Object.values(families).flatMap((f) => f.children.map((c) => c.personId))
      .filter((id) => allIds.has(id))
  );

  // Roots: visible persons not listed as children in any visible family
  const roots = allPersonIds.filter((id) => !childIds.has(id));
  roots.forEach((id) => gen.set(id, 0));

  // BFS: process from the set of persons with a known generation,
  // propagating downward through children. Re-queue if a generation is raised.
  const queue = [...roots];
  const inQueue = new Set(roots);

  while (queue.length > 0) {
    const personId = queue.shift()!;
    inQueue.delete(personId);
    const personGen = gen.get(personId) ?? 0;

    for (const fam of Object.values(families)) {
      if (!fam.partners.some((p) => p.personId === personId)) continue;

      // Align all partners to the max generation among known partners in this family
      let maxPartnerGen = personGen;
      for (const p of fam.partners) {
        if (allIds.has(p.personId)) {
          maxPartnerGen = Math.max(maxPartnerGen, gen.get(p.personId) ?? 0);
        }
      }
      // Update partners that are below the max
      for (const p of fam.partners) {
        if (!allIds.has(p.personId)) continue;
        const existing = gen.get(p.personId) ?? 0;
        if (existing < maxPartnerGen) {
          gen.set(p.personId, maxPartnerGen);
          if (!inQueue.has(p.personId)) { queue.push(p.personId); inQueue.add(p.personId); }
        }
      }

      // Children get maxPartnerGen + 1
      const childGen = maxPartnerGen + 1;
      for (const c of fam.children) {
        if (!allIds.has(c.personId)) continue;
        const existing = gen.get(c.personId) ?? -1;
        if (existing < childGen) {
          gen.set(c.personId, childGen);
          if (!inQueue.has(c.personId)) { queue.push(c.personId); inQueue.add(c.personId); }
        }
      }
    }
  }

  // Any unassigned person gets generation 0
  for (const id of allPersonIds) {
    if (!gen.has(id)) gen.set(id, 0);
  }

  return gen;
}

// ─── Step 2: compute subtree width for each family ──────────────────────────
// Width of a family = max(coupleWidth, sum of children subtree widths + gaps)

function familySubtreeWidth(
  famId: string,
  families: FamilyTreeData['families'],
  allPersonIds: string[],
  cache: Map<string, number> = new Map(),
  visiting: Set<string> = new Set()
): number {
  if (cache.has(famId)) return cache.get(famId)!;
  if (visiting.has(famId)) return PERSON_WIDTH * 2 + COUPLE_GAP;
  visiting.add(famId);

  const fam = families[famId];
  if (!fam) return PERSON_WIDTH;

  const coupleWidth = PERSON_WIDTH * 2 + COUPLE_GAP;
  const visibleChildren = fam.children.map((c) => c.personId).filter((id) => allPersonIds.includes(id));

  if (visibleChildren.length === 0) {
    cache.set(famId, coupleWidth);
    return coupleWidth;
  }

  let totalChildWidth = 0;
  for (let i = 0; i < visibleChildren.length; i++) {
    const childId = visibleChildren[i];
    const childFams = Object.values(families).filter(
      (f) => f.partners.some((p) => p.personId === childId) && !visiting.has(f.id)
    );
    if (childFams.length === 0) {
      totalChildWidth += PERSON_WIDTH;
    } else {
      for (const cf of childFams) {
        totalChildWidth += familySubtreeWidth(cf.id, families, allPersonIds, cache, new Set(visiting));
      }
    }
    if (i < visibleChildren.length - 1) totalChildWidth += H_GAP;
  }

  const width = Math.max(coupleWidth, totalChildWidth);
  cache.set(famId, width);
  visiting.delete(famId);
  return width;
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

  // Assign generation depth
  const genMap = assignGenerations(allPersonIds, families);

  // Find root families (all partners are generation 0 and in allPersonIds)
  const childIds = new Set(
    Object.values(families).flatMap((f) => f.children.map((c) => c.personId))
      .filter((id) => allPersonIds.includes(id))
  );
  const rootPersonIds = new Set(allPersonIds.filter((id) => !childIds.has(id)));

  const rootFamilies = Object.values(families).filter((f) =>
    f.partners.every((p) => !allPersonIds.includes(p.personId) || rootPersonIds.has(p.personId))
  );

  const soloRootIds = allPersonIds.filter(
    (id) => rootPersonIds.has(id) &&
      !Object.values(families).some((f) => f.partners.some((p) => p.personId === id))
  );

  // Subtree width cache
  const widthCache = new Map<string, number>();
  const rootWidths = rootFamilies.map((f) =>
    familySubtreeWidth(f.id, families, allPersonIds, widthCache)
  );
  const soloWidth = soloRootIds.length * PERSON_WIDTH + Math.max(0, soloRootIds.length - 1) * H_GAP;
  const totalRootWidth = rootWidths.reduce((a, b) => a + b, 0)
    + H_GAP * 2 * Math.max(0, rootFamilies.length - 1)
    + (soloRootIds.length > 0 ? H_GAP * 2 + soloWidth : 0);

  const positions = new Map<string, { x: number; y: number }>();
  const heartPositions = new Map<string, { x: number; y: number }>();
  const placedFamilies = new Set<string>();

  // placeFamily: places a couple centered at centerX, then fans children below.
  // A child's position is set here only if they have no family of their own.
  // If a child has their own family, that family's placeFamily call will set their position.
  function placeFamily(fam: Family, centerX: number) {
    if (placedFamilies.has(fam.id)) return;
    placedFamilies.add(fam.id);

    const [p1, p2] = fam.partners;
    const hasP1 = p1 && allPersonIds.includes(p1.personId);
    const hasP2 = p2 && allPersonIds.includes(p2.personId);

    const partnerGen = hasP1
      ? (genMap.get(p1.personId) ?? 0)
      : hasP2
      ? (genMap.get(p2.personId) ?? 0)
      : 0;
    const coupleY = partnerGen * ROW_HEIGHT;

    // Always place partners from centerX — overwrite any prior solo-child placement
    if (hasP1 && hasP2) {
      const leftX = centerX - PERSON_WIDTH - COUPLE_GAP / 2;
      const rightX = centerX + COUPLE_GAP / 2;
      positions.set(p1.personId, { x: leftX, y: coupleY });
      positions.set(p2.personId, { x: rightX, y: coupleY });

      if (HEART_FAMILIES.has(fam.id)) {
        heartPositions.set(fam.id, {
          x: centerX - HEART_SIZE / 2,
          y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
        });
      }
    } else if (hasP1) {
      positions.set(p1.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    } else if (hasP2) {
      positions.set(p2.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    }

    const visibleChildren = fam.children
      .map((c) => c.personId)
      .filter((id) => allPersonIds.includes(id));

    if (visibleChildren.length === 0) return;

    // Subtree width for each child slot
    const childSubtreeWidths = visibleChildren.map((childId) => {
      const childFams = Object.values(families).filter(
        (f) => f.partners.some((p) => p.personId === childId)
      );
      if (childFams.length === 0) return PERSON_WIDTH;
      return childFams.reduce((sum, cf, i) =>
        sum + familySubtreeWidth(cf.id, families, allPersonIds, widthCache) + (i > 0 ? H_GAP : 0), 0
      );
    });

    const totalChildWidth =
      childSubtreeWidths.reduce((a, b) => a + b, 0) + H_GAP * (visibleChildren.length - 1);

    let cursor = centerX - totalChildWidth / 2;

    for (let i = 0; i < visibleChildren.length; i++) {
      const childId = visibleChildren[i];
      const childWidth = childSubtreeWidths[i];
      const childCenter = cursor + childWidth / 2;
      const childGen = genMap.get(childId) ?? (partnerGen + 1);
      const childY = childGen * ROW_HEIGHT;

      // Recurse into child's own families first — they will set the child's position as a partner
      const childFams = Object.values(families).filter(
        (f) => f.partners.some((p) => p.personId === childId) && !placedFamilies.has(f.id)
      );

      if (childFams.length > 0) {
        for (const cf of childFams) {
          placeFamily(cf, childCenter);
        }
      } else {
        // Child has no family — place them as a solo person in their slot
        positions.set(childId, { x: childCenter - PERSON_WIDTH / 2, y: childY });
      }

      cursor += childWidth + H_GAP;
    }
  }

  // Place root families
  let rootCursor = -totalRootWidth / 2;
  for (let i = 0; i < rootFamilies.length; i++) {
    const fam = rootFamilies[i];
    const w = rootWidths[i];
    placeFamily(fam, rootCursor + w / 2);
    rootCursor += w + H_GAP * 2;
  }

  // Place solo roots
  for (const id of soloRootIds) {
    if (!positions.has(id)) {
      positions.set(id, { x: rootCursor, y: 0 });
      rootCursor += PERSON_WIDTH + H_GAP;
    }
  }

  // Place any remaining unplaced
  for (const id of allPersonIds) {
    if (!positions.has(id)) {
      positions.set(id, { x: rootCursor, y: 0 });
      rootCursor += PERSON_WIDTH + H_GAP;
    }
  }

  // ── React Flow nodes ───────────────────────────────────────────────────────
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

  // Heart nodes
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

  // ── React Flow edges ───────────────────────────────────────────────────────
  const rfEdges: Edge[] = [];
  const edgeStyle = { stroke: '#6366f1', strokeWidth: 2 };
  const dissolvedEdgeStyle = { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: '6,4' };

  for (const fam of Object.values(families)) {
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const vc = fam.children.filter((c) => allPersonIds.includes(c.personId));

    const [p1, p2] = vp;
    const hasP1 = !!p1;
    const hasP2 = !!p2;
    const style = fam.dissolved ? dissolvedEdgeStyle : edgeStyle;

    // Couple connector: bottom of each partner card → shared midpoint node, then to children
    if (hasP1 && hasP2) {
      if (HEART_FAMILIES.has(fam.id)) {
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

    // Parent → child: from bottom of p1 (or p2) to top of each child
    const parentNodeId = hasP1
      ? `person-${p1.personId}`
      : hasP2
      ? `person-${p2.personId}`
      : null;

    if (parentNodeId) {
      for (const child of vc) {
        rfEdges.push({
          id: `parent-child-${fam.id}-${child.personId}`,
          source: parentNodeId,
          target: `person-${child.personId}`,
          type: 'smoothstep',
          style: edgeStyle,
          sourceHandle: 'bottom',
        });
      }
    }
  }

  return { nodes: rfNodes, edges: rfEdges };
}

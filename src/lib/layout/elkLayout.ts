import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData, Family } from '../../types';

export const PERSON_WIDTH = 200;
export const PERSON_HEIGHT = 100;
const H_GAP = 60;    // horizontal gap between sibling subtrees
const ROW_HEIGHT = 260; // vertical distance between generation rows
const COUPLE_GAP = 54; // horizontal gap between the two partner cards (must fit heart)
const BAND_WIDTH = 8000; // wide enough to always fill the viewport
const BAND_HEIGHT = ROW_HEIGHT; // each band fills its full row slot

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

  // Find root families AFTER generation assignment.
  // A root family is one where all visible partners are at generation 0.
  // (Partners bumped to gen > 0 by alignment are NOT roots.)
  const childIds = new Set(
    Object.values(families).flatMap((f) => f.children.map((c) => c.personId))
      .filter((id) => allPersonIds.includes(id))
  );
  const rootPersonIds = new Set(
    allPersonIds.filter((id) => !childIds.has(id) && (genMap.get(id) ?? 0) === 0)
  );

  const rootFamilies = Object.values(families).filter((f) => {
    const visiblePartners = f.partners.filter((p) => allPersonIds.includes(p.personId));
    return visiblePartners.length > 0 && visiblePartners.every((p) => rootPersonIds.has(p.personId));
  });

  // Subtree width cache
  const widthCache = new Map<string, number>();

  const positions = new Map<string, { x: number; y: number }>();
  const heartPositions = new Map<string, { x: number; y: number }>();
  const placedFamilies = new Set<string>();

  // ── Pass 1: place all non-root families top-down, starting from the deepest root family ──
  // Find the "anchor" root family — the one whose subtree contains everyone else.
  // We pick the root family with the largest subtree width.
  const nonRootFamilies = Object.values(families).filter((f) =>
    !rootFamilies.includes(f)
  );

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

    if (hasP1 && hasP2) {
      // If one partner is already placed, derive centerX from their position
      // rather than overwriting them
      const p1Placed = positions.has(p1.personId);
      const p2Placed = positions.has(p2.personId);
      if (p1Placed && !p2Placed) {
        const p1X = positions.get(p1.personId)!.x;
        centerX = p1X + PERSON_WIDTH + COUPLE_GAP / 2;
        positions.set(p2.personId, { x: centerX + COUPLE_GAP / 2, y: coupleY });
        // recompute heart using actual p1 center
        if (!fam.dissolved) {
          const actualCenterX = p1X + PERSON_WIDTH + COUPLE_GAP / 2;
          heartPositions.set(fam.id, {
            x: actualCenterX - HEART_SIZE / 2,
            y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
          });
        }
      } else if (p2Placed && !p1Placed) {
        const p2X = positions.get(p2.personId)!.x;
        centerX = p2X - PERSON_WIDTH - COUPLE_GAP / 2;
        positions.set(p1.personId, { x: centerX - PERSON_WIDTH - COUPLE_GAP / 2, y: coupleY });
        if (!fam.dissolved) {
          heartPositions.set(fam.id, {
            x: centerX - HEART_SIZE / 2,
            y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
          });
        }
      } else if (!p1Placed && !p2Placed) {
        positions.set(p1.personId, { x: centerX - PERSON_WIDTH - COUPLE_GAP / 2, y: coupleY });
        positions.set(p2.personId, { x: centerX + COUPLE_GAP / 2, y: coupleY });
        if (!fam.dissolved) {
          heartPositions.set(fam.id, {
            x: centerX - HEART_SIZE / 2,
            y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
          });
        }
      } else {
        // Both already placed — just add the heart if needed
        if (!fam.dissolved) {
          const p1X = positions.get(p1.personId)!.x;
          const p2X = positions.get(p2.personId)!.x;
          const midX = (p1X + PERSON_WIDTH + p2X) / 2;
          heartPositions.set(fam.id, {
            x: midX - HEART_SIZE / 2,
            y: coupleY + PERSON_HEIGHT / 2 - HEART_SIZE / 2,
          });
        }
      }
    } else if (hasP1 && !positions.has(p1.personId)) {
      positions.set(p1.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    } else if (hasP2 && !positions.has(p2.personId)) {
      positions.set(p2.personId, { x: centerX - PERSON_WIDTH / 2, y: coupleY });
    }

    const visibleChildren = fam.children
      .map((c) => c.personId)
      .filter((id) => allPersonIds.includes(id));

    if (visibleChildren.length === 0) return;

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

      const unplacedChildFams = Object.values(families).filter(
        (f) => f.partners.some((p) => p.personId === childId) && !placedFamilies.has(f.id)
      );

      if (unplacedChildFams.length > 0) {
        for (const cf of unplacedChildFams) {
          placeFamily(cf, childCenter);
        }
      }

      if (!positions.has(childId)) {
        positions.set(childId, { x: childCenter - PERSON_WIDTH / 2, y: childY });
      }

      cursor += childWidth + H_GAP;
    }
  }

  // Place non-root families first (they anchor all child positions)
  // Sort by generation so parents are placed before children
  const nonRootSorted = nonRootFamilies.sort((a, b) => {
    const genA = Math.min(...a.partners.map((p) => genMap.get(p.personId) ?? 0));
    const genB = Math.min(...b.partners.map((p) => genMap.get(p.personId) ?? 0));
    return genA - genB;
  });

  // Find the widest non-root subtree to use as the horizontal anchor
  let anchorFamily = nonRootSorted[0];
  let anchorWidth = 0;
  for (const f of nonRootSorted) {
    const w = familySubtreeWidth(f.id, families, allPersonIds, widthCache);
    if (w > anchorWidth) { anchorWidth = w; anchorFamily = f; }
  }

  if (anchorFamily) {
    placeFamily(anchorFamily, 0);
  }
  // Place any remaining non-root families not yet placed.
  // placeFamily() will self-correct centerX if one partner is already positioned.
  for (const f of nonRootSorted) {
    if (!placedFamilies.has(f.id)) placeFamily(f, 0);
  }

  // ── Pass 2: place root (grandparent) families centered above their children ──
  // First compute ideal centerX for each root family, then resolve overlaps.
  const COUPLE_FULL_WIDTH = PERSON_WIDTH * 2 + COUPLE_GAP; // total width a couple occupies

  const rootPlacements: Array<{ fam: Family; centerX: number }> = [];

  for (const fam of rootFamilies) {
    if (placedFamilies.has(fam.id)) continue;

    const visibleChildren = fam.children
      .map((c) => c.personId)
      .filter((id) => allPersonIds.includes(id));

    let centerX = 0;
    if (visibleChildren.length > 0) {
      const placedChildXs = visibleChildren
        .map((id) => positions.get(id))
        .filter(Boolean)
        .map((p) => p!.x + PERSON_WIDTH / 2);
      if (placedChildXs.length > 0) {
        centerX = placedChildXs.reduce((a, b) => a + b, 0) / placedChildXs.length;
      }
    }
    rootPlacements.push({ fam, centerX });
  }

  // Sort by centerX so we resolve left-to-right
  rootPlacements.sort((a, b) => a.centerX - b.centerX);

  // Push apart any overlapping couples (minimum gap between right edge of one and left edge of next)
  const MIN_GAP = H_GAP;
  for (let i = 1; i < rootPlacements.length; i++) {
    const prev = rootPlacements[i - 1];
    const curr = rootPlacements[i];
    const prevRight = prev.centerX + COUPLE_FULL_WIDTH / 2;
    const currLeft  = curr.centerX - COUPLE_FULL_WIDTH / 2;
    if (currLeft < prevRight + MIN_GAP) {
      curr.centerX = prevRight + MIN_GAP + COUPLE_FULL_WIDTH / 2;
    }
  }

  // Apply positions and re-center single children under their grandparent couple
  for (const { fam, centerX } of rootPlacements) {
    placedFamilies.add(fam.id);

    const [p1, p2] = fam.partners;
    const hasP1 = p1 && allPersonIds.includes(p1.personId);
    const hasP2 = p2 && allPersonIds.includes(p2.personId);
    const coupleY = 0;

    if (hasP1 && hasP2) {
      positions.set(p1.personId, { x: centerX - PERSON_WIDTH - COUPLE_GAP / 2, y: coupleY });
      positions.set(p2.personId, { x: centerX + COUPLE_GAP / 2, y: coupleY });
      if (!fam.dissolved) {
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

  }

  // Place solo roots and any remaining unplaced
  let fallbackCursor = 0;
  for (const id of allPersonIds) {
    if (!positions.has(id)) {
      positions.set(id, { x: fallbackCursor, y: 0 });
      fallbackCursor += PERSON_WIDTH + H_GAP;
    }
  }

  // ── Center the entire layout around x=0 ───────────────────────────────────
  const allX = Array.from(positions.values()).map((p) => p.x);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX) + PERSON_WIDTH;
  const offsetX = -(minX + maxX) / 2;
  for (const [id, pos] of positions) {
    positions.set(id, { x: pos.x + offsetX, y: pos.y });
  }
  for (const [famId, pos] of heartPositions) {
    heartPositions.set(famId, { x: pos.x + offsetX, y: pos.y });
  }

  // ── Generation band nodes (rendered behind everything) ────────────────────
  // Compute which generations are present and label them relative to root person
  const rootPersonId = data.meta.rootPersonId;
  const rootGen = rootPersonId ? (genMap.get(rootPersonId) ?? null) : null;

  const generationLabels: Record<number, string> = {};
  if (rootGen !== null) {
    const genSet = new Set(allPersonIds.map((id) => genMap.get(id) ?? 0));
    for (const g of genSet) {
      const diff = g - rootGen;
      if (diff === 0) generationLabels[g] = 'Your Generation';
      else if (diff === -1) generationLabels[g] = 'Parents';
      else if (diff === -2) generationLabels[g] = 'Grandparents';
      else if (diff === -3) generationLabels[g] = 'Great-Grandparents';
      else if (diff === 1) generationLabels[g] = 'Children';
      else if (diff === 2) generationLabels[g] = 'Grandchildren';
      else generationLabels[g] = `Generation ${g}`;
    }
  }

  // ── React Flow nodes ───────────────────────────────────────────────────────
  const rfNodes: Node[] = [];

  // Band nodes first so they render behind person nodes
  const genSet = new Set(allPersonIds.map((id) => genMap.get(id) ?? 0));
  for (const g of genSet) {
    // Band spans the full row: from top-of-row to top-of-next-row
    const bandY = g * ROW_HEIGHT - 10;
    rfNodes.push({
      id: `band-gen-${g}`,
      type: 'generationBand',
      position: { x: -BAND_WIDTH / 2, y: bandY },
      data: { generation: g, label: generationLabels[g] ?? `Generation ${g}` },
      style: { width: BAND_WIDTH, height: BAND_HEIGHT, pointerEvents: 'none' },
      selectable: false,
      draggable: false,
      zIndex: -10,
      focusable: false,
    });
  }

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
    const coupleStyle = fam.dissolved ? dissolvedEdgeStyle : edgeStyle;

    // ── Couple connector (horizontal line between partners, with optional heart) ──
    if (hasP1 && hasP2) {
      if (!fam.dissolved) {
        rfEdges.push({
          id: `couple-a-${fam.id}`,
          source: `person-${p1.personId}`,
          target: `heart-${fam.id}`,
          type: 'straight',
          style: coupleStyle,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
        rfEdges.push({
          id: `couple-b-${fam.id}`,
          source: `heart-${fam.id}`,
          target: `person-${p2.personId}`,
          type: 'straight',
          style: coupleStyle,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
      } else {
        rfEdges.push({
          id: `couple-${fam.id}`,
          source: `person-${p1.personId}`,
          target: `person-${p2.personId}`,
          type: 'straight',
          style: coupleStyle,
          sourceHandle: 'right',
          targetHandle: 'left',
        });
      }
    }

    // ── Family connector: one custom SVG edge draws the entire T-bar ──────────
    if (vc.length === 0) continue;

    const p1Pos = hasP1 ? (positions.get(p1.personId) ?? null) : null;
    const p2Pos = hasP2 ? (positions.get(p2.personId) ?? null) : null;
    const childPositions = vc.map((c) => positions.get(c.personId)).filter(Boolean) as { x: number; y: number }[];

    if (childPositions.length === 0) continue;

    // source/target are required by React Flow but the custom edge ignores them
    const sourceId = hasP1 ? `person-${p1.personId}` : `person-${p2!.personId}`;
    const targetId = `person-${vc[0].personId}`;

    rfEdges.push({
      id: `connector-${fam.id}`,
      source: sourceId,
      target: targetId,
      type: 'familyConnector',
      data: { p1: p1Pos, p2: p2Pos, children: childPositions },
      style: { pointerEvents: 'none' },
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

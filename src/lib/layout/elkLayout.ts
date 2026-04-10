import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData, Family } from '../../types';
import { extractSegments, intersectSegments } from './connectorGeometry';

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

  // ── Place any still-unplaced persons near their siblings ────────────────────
  for (const id of allPersonIds) {
    if (positions.has(id)) continue;
    const g = genMap.get(id) ?? 0;
    const y = g * ROW_HEIGHT;

    let insertX = 0;
    for (const fam of Object.values(families)) {
      const siblingIds = fam.children.map((c) => c.personId).filter((sid) => allPersonIds.includes(sid));
      if (!siblingIds.includes(id)) continue;
      const placedSibXs = siblingIds
        .filter((sid) => sid !== id && positions.has(sid))
        .map((sid) => positions.get(sid)!.x);
      if (placedSibXs.length > 0) {
        insertX = Math.max(...placedSibXs) + PERSON_WIDTH + H_GAP;
        break;
      }
    }
    positions.set(id, { x: insertX, y });
  }

  // ── Overlap resolver: treat coupled partners as a unit ───────────────────
  // Build a map from personId -> set of personIds they are coupled with on same row
  const coupleOf = new Map<string, string[]>(); // personId -> [partner, ...]
  for (const fam of Object.values(families)) {
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    if (vp.length < 2) continue;
    const [pa, pb] = vp;
    const paPos = positions.get(pa.personId);
    const pbPos = positions.get(pb.personId);
    if (!paPos || !pbPos) continue;
    // Only couple them if on same generation row
    if (Math.abs(paPos.y - pbPos.y) < 5) {
      if (!coupleOf.has(pa.personId)) coupleOf.set(pa.personId, []);
      if (!coupleOf.has(pb.personId)) coupleOf.set(pb.personId, []);
      coupleOf.get(pa.personId)!.push(pb.personId);
      coupleOf.get(pb.personId)!.push(pa.personId);
    }
  }

  // Build "slots": each slot is a group of persons that must move together (a couple).
  // A person not in any couple is its own slot.
  const visited = new Set<string>();
  // slot = { ids: string[], leftX: number, rightX: number }
  type Slot = { ids: string[]; leftX: number; rightX: number; y: number };
  const slotsByGen = new Map<number, Slot[]>();

  for (const id of allPersonIds) {
    if (visited.has(id)) continue;
    const pos = positions.get(id);
    if (!pos) continue;
    const g = genMap.get(id) ?? 0;

    // BFS: gather all persons coupled (transitively) with this person on same row
    const unit: string[] = [];
    const q = [id];
    while (q.length > 0) {
      const cur = q.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      unit.push(cur);
      for (const partner of (coupleOf.get(cur) ?? [])) {
        if (!visited.has(partner)) q.push(partner);
      }
    }

    const xs = unit.map((uid) => positions.get(uid)!.x);
    const leftX = Math.min(...xs);
    const rightX = Math.max(...xs) + PERSON_WIDTH;

    if (!slotsByGen.has(g)) slotsByGen.set(g, []);
    slotsByGen.get(g)!.push({ ids: unit, leftX, rightX, y: pos.y });
  }

  // For each generation, sort slots by leftX and push apart any that overlap
  const MIN_CARD_GAP = H_GAP;
  for (const [, slots] of slotsByGen) {
    slots.sort((a, b) => a.leftX - b.leftX);

    for (let i = 1; i < slots.length; i++) {
      const prev = slots[i - 1];
      const curr = slots[i];
      const needed = prev.rightX + MIN_CARD_GAP;
      if (curr.leftX < needed) {
        const shift = needed - curr.leftX;
        // Move all persons in this slot right by shift
        for (const uid of curr.ids) {
          const p = positions.get(uid)!;
          positions.set(uid, { x: p.x + shift, y: p.y });
        }
        curr.leftX += shift;
        curr.rightX += shift;
      }
    }
  }

  // ── Recompute heart positions after overlap resolution ────────────────────
  for (const fam of Object.values(families)) {
    if (fam.dissolved) continue;
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    if (vp.length < 2) continue;
    const p1pos = positions.get(vp[0].personId);
    const p2pos = positions.get(vp[1].personId);
    if (!p1pos || !p2pos) continue;
    const midX = (p1pos.x + PERSON_WIDTH + p2pos.x) / 2;
    const y = p1pos.y + PERSON_HEIGHT / 2 - HEART_SIZE / 2;
    heartPositions.set(fam.id, { x: midX - HEART_SIZE / 2, y });
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

  // ── Compute per-generation bounding boxes for routeX calculation ──────────
  const genMinX = new Map<number, number>();
  const genMaxX = new Map<number, number>();
  for (const id of allPersonIds) {
    const pos = positions.get(id);
    if (!pos) continue;
    const g = genMap.get(id) ?? 0;
    genMinX.set(g, Math.min(genMinX.get(g) ?? Infinity, pos.x));
    genMaxX.set(g, Math.max(genMaxX.get(g) ?? -Infinity, pos.x + PERSON_WIDTH));
  }

  // ── Per-family colors ─────────────────────────────────────────────────────
  const FAMILY_COLORS = [
    '#6366f1', // indigo
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#14b8a6', // teal
    '#f97316', // orange
  ];
  const famIds = Object.keys(families).sort();
  const famColor = new Map(famIds.map((id, i) => [id, FAMILY_COLORS[i % FAMILY_COLORS.length]]));

  // ── Step 1: compute routeX for every family that needs it ────────────────
  // A family needs routeX when its connector would pass through cards on an intermediate generation row.
  const famRouteX = new Map<string, number | undefined>();

  for (const fam of Object.values(families)) {
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const vc = fam.children.filter((c) => allPersonIds.includes(c.personId));
    if (vc.length === 0) { famRouteX.set(fam.id, undefined); continue; }

    const [p1, p2] = vp;
    const p1Pos = p1 ? (positions.get(p1.personId) ?? null) : null;
    const p2Pos = p2 ? (positions.get(p2.personId) ?? null) : null;
    const childPositions = vc.map((c) => positions.get(c.personId)).filter(Boolean) as { x: number; y: number }[];
    if (childPositions.length === 0) { famRouteX.set(fam.id, undefined); continue; }

    const partnerGen = p1 ? (genMap.get(p1.personId) ?? 0) : (genMap.get(p2!.personId) ?? 0);
    const childGen = genMap.get(vc[0].personId) ?? partnerGen + 1;

    let routeX: number | undefined;

    if (childGen > partnerGen + 1) {
      // Spans more than one generation — ALWAYS route outside to avoid crossing intermediate rows
      let maxRight = -Infinity;
      for (let g = partnerGen; g <= childGen; g++) {
        maxRight = Math.max(maxRight, genMaxX.get(g) ?? -Infinity);
      }
      routeX = maxRight + 70;
    } else {
      // Adjacent generations — only route outside if stem X falls inside occupied area
      const stemX = p1Pos && p2Pos
        ? (p1Pos.x + PERSON_WIDTH / 2 + p2Pos.x + PERSON_WIDTH / 2) / 2
        : ((p1Pos ?? p2Pos)!.x + PERSON_WIDTH / 2);
      const childCenters = childPositions.map((c) => c.x + PERSON_WIDTH / 2);
      const midChildX = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;

      // The Z horizontal travels between stemX and midChildX — check if it crosses any card
      const zLeft = Math.min(stemX, midChildX);
      const zRight = Math.max(stemX, midChildX);

      // Check intermediate rows (none for adjacent gens, but check same gen cards)
      let needsRoute = false;
      for (let g = partnerGen + 1; g < childGen; g++) {
        const rMin = genMinX.get(g) ?? Infinity;
        const rMax = genMaxX.get(g) ?? -Infinity;
        if (zRight > rMin - 10 && zLeft < rMax + 10) { needsRoute = true; break; }
      }

      if (needsRoute) {
        let maxRight = -Infinity;
        for (let g = partnerGen; g <= childGen; g++) {
          maxRight = Math.max(maxRight, genMaxX.get(g) ?? -Infinity);
        }
        routeX = maxRight + 70;
      }
    }

    famRouteX.set(fam.id, routeX);
  }

  // ── Step 2: extract segments ──────────────────────────────────────────────
  type Seg = import('./connectorGeometry').Segment;
  const allSegments: Seg[] = [];
  const famSegments = new Map<string, Seg[]>();

  for (const fam of Object.values(families)) {
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const vc = fam.children.filter((c) => allPersonIds.includes(c.personId));
    if (vc.length === 0) continue;
    const [p1, p2] = vp;
    const p1Pos = p1 ? (positions.get(p1.personId) ?? null) : null;
    const p2Pos = p2 ? (positions.get(p2.personId) ?? null) : null;
    const childPositions = vc.map((c) => positions.get(c.personId)).filter(Boolean) as { x: number; y: number }[];
    if (childPositions.length === 0) continue;
    const segs = extractSegments(p1Pos, p2Pos, childPositions, fam.id, famRouteX.get(fam.id));
    famSegments.set(fam.id, segs);
    allSegments.push(...segs);
  }

  // ── Step 2b: detect co-linear overlapping segments, assign per-axis nudges ─
  // For each family, compute:
  //   vNudge: X shift applied to ALL vertical segments of this family
  //   hNudge: Y shift applied to ALL horizontal segments of this family
  // Strategy: group segments by line key (v:X or h:Y). Within each group,
  // find overlapping segment pairs. Assign slots 0,1,2,... and nudge = slot*STEP - center.
  const LANE_STEP = 5;

  // segNudge: famId → { vNudge, hNudge }
  const famVNudge = new Map<string, number>(); // X shift for vertical segments
  const famHNudge = new Map<string, number>(); // Y shift for horizontal segments

  // Group by line key, collect {famId, min, max} per segment
  const vLineGroups = new Map<number, Array<{ famId: string; lo: number; hi: number }>>();
  const hLineGroups = new Map<number, Array<{ famId: string; lo: number; hi: number }>>();

  for (const [famId, segs] of famSegments) {
    for (const seg of segs) {
      const isV = Math.abs(seg.x1 - seg.x2) < 0.5;
      if (isV) {
        const xKey = Math.round(seg.x1);
        if (!vLineGroups.has(xKey)) vLineGroups.set(xKey, []);
        vLineGroups.get(xKey)!.push({ famId, lo: Math.min(seg.y1, seg.y2), hi: Math.max(seg.y1, seg.y2) });
      } else {
        const yKey = Math.round(seg.y1);
        if (!hLineGroups.has(yKey)) hLineGroups.set(yKey, []);
        hLineGroups.get(yKey)!.push({ famId, lo: Math.min(seg.x1, seg.x2), hi: Math.max(seg.x1, seg.x2) });
      }
    }
  }

  // For a group of segments on the same line, find cliques of overlapping segments
  // and assign lanes within each clique.
  function assignNudges(
    groups: Map<number, Array<{ famId: string; lo: number; hi: number }>>,
    nudgeMap: Map<string, number>
  ) {
    for (const entries of groups.values()) {
      // Deduplicate by famId — a family may have multiple segments on the same line
      const byFam = new Map<string, { lo: number; hi: number }>();
      for (const e of entries) {
        if (!byFam.has(e.famId)) byFam.set(e.famId, { lo: e.lo, hi: e.hi });
        else {
          const cur = byFam.get(e.famId)!;
          byFam.set(e.famId, { lo: Math.min(cur.lo, e.lo), hi: Math.max(cur.hi, e.hi) });
        }
      }
      const fams = Array.from(byFam.entries()); // [{famId, {lo,hi}}]
      if (fams.length < 2) continue;

      // Build overlap graph: two entries overlap if their ranges intersect
      // Find connected components (families that overlap with each other transitively)
      const n = fams.length;
      const adj: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = fams[i][1], b = fams[j][1];
          if (a.lo < b.hi - 2 && b.lo < a.hi - 2) { // overlapping ranges
            adj[i][j] = adj[j][i] = true;
          }
        }
      }

      // BFS connected components
      const visited = new Array(n).fill(false);
      for (let start = 0; start < n; start++) {
        if (visited[start]) continue;
        const component: number[] = [];
        const q = [start];
        visited[start] = true;
        while (q.length) {
          const cur = q.shift()!;
          component.push(cur);
          for (let k = 0; k < n; k++) {
            if (!visited[k] && adj[cur][k]) { visited[k] = true; q.push(k); }
          }
        }
        if (component.length < 2) continue;
        // Assign lanes: sort by famId for determinism, spread symmetrically
        component.sort((a, b) => fams[a][0].localeCompare(fams[b][0]));
        const total = component.length;
        const center = (total - 1) / 2;
        for (let i = 0; i < total; i++) {
          const famId = fams[component[i]][0];
          const nudge = Math.round((i - center) * LANE_STEP);
          // Only set if not already set, or take the larger absolute nudge
          const existing = nudgeMap.get(famId) ?? 0;
          if (Math.abs(nudge) > Math.abs(existing)) nudgeMap.set(famId, nudge);
        }
      }
    }
  }

  assignNudges(vLineGroups, famVNudge);
  assignNudges(hLineGroups, famHNudge);

  // ── Step 3: compute crossings ─────────────────────────────────────────────
  const famCrossings = new Map<string, import('./connectorGeometry').Crossing[]>();
  for (const [famId, segs] of famSegments) {
    const seen = new Set<string>();
    const crossings: import('./connectorGeometry').Crossing[] = [];
    for (const seg of segs) {
      for (const other of allSegments) {
        if (other.famId === famId) continue;
        const pt = intersectSegments(seg, other);
        if (pt) {
          const key = `${Math.round(pt.x)},${Math.round(pt.y)}`;
          if (!seen.has(key)) { seen.add(key); crossings.push({ cx: pt.x, cy: pt.y }); }
        }
      }
    }
    famCrossings.set(famId, crossings);
  }

  // ── React Flow edges ───────────────────────────────────────────────────────
  const rfEdges: Edge[] = [];

  for (const fam of Object.values(families)) {
    const vp = fam.partners.filter((p) => allPersonIds.includes(p.personId));
    const vc = fam.children.filter((c) => allPersonIds.includes(c.personId));

    const [p1, p2] = vp;
    const hasP1 = !!p1;
    const hasP2 = !!p2;
    const color = famColor.get(fam.id) ?? '#6366f1';
    const coupleStyle = fam.dissolved
      ? { stroke: color, strokeWidth: 2, strokeDasharray: '6,4' }
      : { stroke: color, strokeWidth: 2 };

    // ── Couple connector ──────────────────────────────────────────────────────
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
          zIndex: 10,
        });
        rfEdges.push({
          id: `couple-b-${fam.id}`,
          source: `heart-${fam.id}`,
          target: `person-${p2.personId}`,
          type: 'straight',
          style: coupleStyle,
          sourceHandle: 'right',
          targetHandle: 'left',
          zIndex: 10,
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
          zIndex: 10,
        });
      }
    }

    // ── Family connector ──────────────────────────────────────────────────────
    if (vc.length === 0) continue;

    const p1Pos = hasP1 ? (positions.get(p1.personId) ?? null) : null;
    const p2Pos = hasP2 ? (positions.get(p2.personId) ?? null) : null;
    const childPositions = vc.map((c) => positions.get(c.personId)).filter(Boolean) as { x: number; y: number }[];
    if (childPositions.length === 0) continue;

    const routeX = famRouteX.get(fam.id);
    const sourceId = hasP1 ? `person-${p1.personId}` : `person-${p2!.personId}`;
    const targetId = `person-${vc[0].personId}`;

    rfEdges.push({
      id: `connector-${fam.id}`,
      source: sourceId,
      target: targetId,
      type: 'familyConnector',
      data: {
        p1: p1Pos,
        p2: p2Pos,
        children: childPositions,
        color,
        crossings: famCrossings.get(fam.id) ?? [],
        routeX,
        vNudge: famVNudge.get(fam.id) ?? 0,
        hNudge: famHNudge.get(fam.id) ?? 0,
      },
      style: { pointerEvents: 'none' },
      zIndex: 5,
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

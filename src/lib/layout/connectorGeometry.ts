// Shared geometry utilities for family connector paths.
// Used by both elkLayout.ts (crossing detection) and FamilyConnectorEdge.tsx (path rendering).

export const CONN_PW = 200;   // must match PERSON_WIDTH in elkLayout
export const CONN_PH = 100;   // must match PERSON_HEIGHT
export const PARENT_BAR_DROP = 48;  // px below parent bottom before horizontal bar
export const CHILD_BAR_OFFSET = 56; // px above child top for horizontal child bar
export const ROW_H = 260;           // must match ROW_HEIGHT in elkLayout

export interface Pos { x: number; y: number; }

export interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  famId: string;
  /** True for the vertical drop from a parent card bottom down to the horizontal bar.
   *  These segments are anchored to the card position and must NOT be nudged. */
  parentDrop?: boolean;
}

export interface Crossing {
  cx: number;
  cy: number;
}

// routeX: when set, the Z-path routes vertically down to childBarY via this X
// (used to route around cards that would otherwise be crossed)
export interface RouteHint {
  routeX?: number; // override X for Z routing
}

/** Intersect two axis-aligned segments. Returns intersection or null. */
export function intersectSegments(a: Segment, b: Segment): { x: number; y: number } | null {
  if (a.famId === b.famId) return null;
  const aH = Math.abs(a.y1 - a.y2) < 0.5;
  const bH = Math.abs(b.y1 - b.y2) < 0.5;
  if (aH === bH) return null; // parallel

  const hSeg = aH ? a : b;
  const vSeg = aH ? b : a;

  const hY = hSeg.y1;
  const vX = vSeg.x1;
  const hMinX = Math.min(hSeg.x1, hSeg.x2);
  const hMaxX = Math.max(hSeg.x1, hSeg.x2);
  const vMinY = Math.min(vSeg.y1, vSeg.y2);
  const vMaxY = Math.max(vSeg.y1, vSeg.y2);

  if (vX <= hMinX + 1 || vX >= hMaxX - 1) return null;
  if (hY <= vMinY + 1 || hY >= vMaxY - 1) return null;

  return { x: vX, y: hY };
}

/** Extract all axis-aligned segments from a T-bar connector. */
export function extractSegments(
  p1: Pos | null, p2: Pos | null, children: Pos[], famId: string,
  routeX?: number
): Segment[] {
  const segs: Segment[] = [];
  if (children.length === 0) return segs;

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];
  const midChildX = (leftChildX + rightChildX) / 2;

  const add = (x1: number, y1: number, x2: number, y2: number, parentDrop = false) =>
    segs.push({ x1, y1, x2, y2, famId, parentDrop });

  if (p1 && p2) {
    const p1cx = p1.x + CONN_PW / 2;
    const p2cx = p2.x + CONN_PW / 2;
    const pBy = p1.y + CONN_PH;
    const barY = pBy + PARENT_BAR_DROP;
    const stemX = (p1cx + p2cx) / 2;

    add(p1cx, pBy, p1cx, barY, true);   // parent drop — not nudged
    add(p2cx, pBy, p2cx, barY, true);   // parent drop — not nudged
    add(p1cx, barY, p2cx, barY);

    if (routeX !== undefined) {
      // Route: down from parent bar, jog out to routeX (outside all cards),
      // drop all the way to just above child row, jog back to midChildX, drop to childBarY
      const jog1Y = pBy + PARENT_BAR_DROP + 10; // just below parent bar
      const jog2Y = childBarY - 10;              // just above child bar
      add(stemX, barY, stemX, jog1Y);
      add(stemX, jog1Y, routeX, jog1Y);
      add(routeX, jog1Y, routeX, jog2Y);
      add(routeX, jog2Y, midChildX, jog2Y);
      add(midChildX, jog2Y, midChildX, childBarY);
    } else if (Math.abs(stemX - midChildX) > 2) {
      const midY = barY + (childBarY - barY) * 0.5;
      add(stemX, barY, stemX, midY);
      add(stemX, midY, midChildX, midY);
      add(midChildX, midY, midChildX, children[0].y); // extend to child row for full crossing coverage
    } else {
      add(stemX, barY, stemX, children[0].y); // extend to child row
    }
  } else {
    const px = (p1 ?? p2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;

    if (routeX !== undefined) {
      const jog1Y = pby + PARENT_BAR_DROP + 10;
      const jog2Y = childBarY - 10;
      add(pbx, pby, pbx, jog1Y, true);  // parent drop — not nudged
      add(pbx, jog1Y, routeX, jog1Y);
      add(routeX, jog1Y, routeX, jog2Y);
      add(routeX, jog2Y, midChildX, jog2Y);
      add(midChildX, jog2Y, midChildX, children[0].y); // extend to child row
    } else if (Math.abs(pbx - midChildX) > 2) {
      const midY = pby + (childBarY - pby) * 0.5;
      add(pbx, pby, pbx, midY, true);   // parent drop — not nudged
      add(pbx, midY, midChildX, midY);
      add(midChildX, midY, midChildX, children[0].y); // extend to child row
    } else {
      add(pbx, pby, pbx, children[0].y, true); // single straight drop — not nudged
    }
  }

  if (childCenters.length > 1) {
    add(leftChildX, childBarY, rightChildX, childBarY);
  }
  for (const cx of childCenters) {
    add(cx, childBarY, cx, children[0].y);
  }

  return segs;
}

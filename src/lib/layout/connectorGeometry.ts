// Shared geometry utilities for family connector paths.
// Used by both elkLayout.ts (crossing detection) and FamilyConnectorEdge.tsx (path rendering).

export const CONN_PW = 200;   // must match PERSON_WIDTH in elkLayout
export const CONN_PH = 100;   // must match PERSON_HEIGHT
export const PARENT_BAR_DROP = 30;
export const CHILD_BAR_OFFSET = 40;

export interface Pos { x: number; y: number; }

export interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
  famId: string;
}

export interface Crossing {
  cx: number;
  cy: number;
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
  p1: Pos | null, p2: Pos | null, children: Pos[], famId: string
): Segment[] {
  const segs: Segment[] = [];
  if (children.length === 0) return segs;

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];

  const add = (x1: number, y1: number, x2: number, y2: number) =>
    segs.push({ x1, y1, x2, y2, famId });

  if (p1 && p2) {
    const p1cx = p1.x + CONN_PW / 2;
    const p2cx = p2.x + CONN_PW / 2;
    const pBy = p1.y + CONN_PH;
    const barY = pBy + PARENT_BAR_DROP;
    const stemX = (p1cx + p2cx) / 2;

    add(p1cx, pBy, p1cx, barY);
    add(p2cx, pBy, p2cx, barY);
    add(p1cx, barY, p2cx, barY);

    const midChildX = (leftChildX + rightChildX) / 2;
    if (Math.abs(stemX - midChildX) > 2) {
      const midY = (barY + childBarY) / 2;
      add(stemX, barY, stemX, midY);
      add(stemX, midY, midChildX, midY);
      add(midChildX, midY, midChildX, childBarY);
    } else {
      add(stemX, barY, stemX, childBarY);
    }
  } else {
    const px = (p1 ?? p2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;
    const midChildX = (leftChildX + rightChildX) / 2;

    if (Math.abs(pbx - midChildX) > 2) {
      const midY = (pby + childBarY) / 2;
      add(pbx, pby, pbx, midY);
      add(pbx, midY, midChildX, midY);
      add(midChildX, midY, midChildX, childBarY);
    } else {
      add(pbx, pby, pbx, childBarY);
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

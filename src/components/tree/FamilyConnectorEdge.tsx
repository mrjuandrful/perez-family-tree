import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import {
  CONN_PW, CONN_PH, PARENT_BAR_DROP, CHILD_BAR_OFFSET,
  type Pos, type Crossing,
} from '../../lib/layout/connectorGeometry';

const R = 8;
const HUMP_R = 6;

export interface FamilyConnectorData {
  p1: Pos | null;
  p2: Pos | null;
  children: Pos[];
  color: string;
  crossings: Crossing[];
  routeX?: number;
}

// Find crossings that lie on the segment (x1,y1)→(x2,y2).
// Guards HUMP_R+R away from each endpoint so humps don't overlap corners.
function crossingsOnSeg(
  sx1: number, sy1: number, sx2: number, sy2: number,
  crossings: Crossing[]
): { t: number; cx: number; cy: number }[] {
  const isV = Math.abs(sx1 - sx2) < 0.5;
  const guard = HUMP_R + R + 2;
  return crossings
    .filter((c) => {
      if (isV) {
        if (Math.abs(c.cx - sx1) > 2) return false;
        const lo = Math.min(sy1, sy2), hi = Math.max(sy1, sy2);
        return c.cy > lo + guard && c.cy < hi - guard;
      } else {
        if (Math.abs(c.cy - sy1) > 2) return false;
        const lo = Math.min(sx1, sx2), hi = Math.max(sx1, sx2);
        return c.cx > lo + guard && c.cx < hi - guard;
      }
    })
    .map((c) => ({
      t: isV ? (c.cy - sy1) / (sy2 - sy1) : (c.cx - sx1) / (sx2 - sx1),
      cx: c.cx,
      cy: c.cy,
    }))
    .sort((a, b) => a.t - b.t);
}

// Build path commands from (x1,y1) to (x2,y2) with humps at crossings.
// Only vertical segments draw humps (they bridge over horizontal lines).
// fullX1/fullY1/fullX2/fullY2 are the full segment extents used for crossing lookup
// (the actual path may start/end at trimmed coords due to rounded corners).
function segPath(
  x1: number, y1: number, x2: number, y2: number,
  crossings: Crossing[],
  fullX1?: number, fullY1?: number, fullX2?: number, fullY2?: number
): string {
  const lx1 = fullX1 ?? x1, ly1 = fullY1 ?? y1;
  const lx2 = fullX2 ?? x2, ly2 = fullY2 ?? y2;
  const isV = Math.abs(lx1 - lx2) < 0.5;
  const hits = crossingsOnSeg(lx1, ly1, lx2, ly2, crossings);
  if (hits.length === 0 || !isV) return ` L ${x2} ${y2}`;

  // Only vertical segments draw humps
  let d = '';
  for (const { cy } of hits) {
    d += ` L ${x1} ${cy - HUMP_R} A ${HUMP_R} ${HUMP_R} 0 0 1 ${x1} ${cy + HUMP_R}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

function buildPath(
  p1: Pos | null, p2: Pos | null, children: Pos[],
  crossings: Crossing[], routeX: number | undefined
): string {
  if (children.length === 0) return '';

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];
  const midChildX = (leftChildX + rightChildX) / 2;

  const parts: string[] = [];

  if (p1 && p2) {
    const p1cx = p1.x + CONN_PW / 2;
    const p2cx = p2.x + CONN_PW / 2;
    const pBy = p1.y + CONN_PH;
    const barY = pBy + PARENT_BAR_DROP;
    const stemX = (p1cx + p2cx) / 2;

    // Left parent drop: full range p1cx,pBy → p1cx,barY for crossing lookup
    parts.push(
      `M ${p1cx} ${pBy}` +
      segPath(p1cx, pBy, p1cx, barY - R, crossings, p1cx, pBy, p1cx, barY) +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` +
      ` L ${stemX} ${barY}`
    );
    // Right parent drop
    parts.push(
      `M ${p2cx} ${pBy}` +
      segPath(p2cx, pBy, p2cx, barY - R, crossings, p2cx, pBy, p2cx, barY) +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` +
      ` L ${stemX} ${barY}`
    );

    if (routeX !== undefined) {
      const jog1Y = pBy + PARENT_BAR_DROP + 10;
      const jog2Y = childBarY - 10;
      const goRight = routeX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, jog1Y - R, crossings, stemX, barY, stemX, jog1Y) +
        ` Q ${stemX} ${jog1Y} ${stemX + (goRight ? R : -R)} ${jog1Y}` +
        ` L ${routeX + (goRight ? -R : R)} ${jog1Y}` +
        ` Q ${routeX} ${jog1Y} ${routeX} ${jog1Y + R}` +
        segPath(routeX, jog1Y + R, routeX, jog2Y - R, crossings, routeX, jog1Y, routeX, jog2Y) +
        ` Q ${routeX} ${jog2Y} ${routeX + (goRight ? -R : R)} ${jog2Y}` +
        ` L ${midChildX + (goRight ? R : -R)} ${jog2Y}` +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings, midChildX, jog2Y, midChildX, childBarY)
      );
    } else if (Math.abs(stemX - midChildX) > 2) {
      const midY = pBy + CONN_PH + (childBarY - pBy - CONN_PH) * 0.5;
      const goRight = midChildX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, midY - R, crossings, stemX, barY, stemX, midY) +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        ` L ${midChildX + (goRight ? -R : R)} ${midY}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings, midChildX, midY, midChildX, childBarY)
      );
    } else {
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, childBarY, crossings)
      );
    }
  } else {
    const px = (p1 ?? p2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;

    if (routeX !== undefined) {
      const jog1Y = pby + PARENT_BAR_DROP + 10;
      const jog2Y = childBarY - 10;
      const goRight = routeX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, jog1Y - R, crossings, pbx, pby, pbx, jog1Y) +
        ` Q ${pbx} ${jog1Y} ${pbx + (goRight ? R : -R)} ${jog1Y}` +
        ` L ${routeX + (goRight ? -R : R)} ${jog1Y}` +
        ` Q ${routeX} ${jog1Y} ${routeX} ${jog1Y + R}` +
        segPath(routeX, jog1Y + R, routeX, jog2Y - R, crossings, routeX, jog1Y, routeX, jog2Y) +
        ` Q ${routeX} ${jog2Y} ${routeX + (goRight ? -R : R)} ${jog2Y}` +
        ` L ${midChildX + (goRight ? R : -R)} ${jog2Y}` +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings, midChildX, jog2Y, midChildX, childBarY)
      );
    } else if (Math.abs(pbx - midChildX) > 2) {
      const midY = pby + (childBarY - pby) * 0.5;
      const goRight = midChildX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, midY - R, crossings, pbx, pby, pbx, midY) +
        ` Q ${pbx} ${midY} ${pbx + (goRight ? R : -R)} ${midY}` +
        ` L ${midChildX + (goRight ? -R : R)} ${midY}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings, midChildX, midY, midChildX, childBarY)
      );
    } else {
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, childBarY, crossings)
      );
    }
  }

  // Child bar + drops
  if (childCenters.length === 1) {
    parts.push(
      `M ${childCenters[0]} ${childBarY}` +
      segPath(childCenters[0], childBarY, childCenters[0], children[0].y, crossings)
    );
  } else {
    parts.push(
      `M ${leftChildX} ${children[0].y} V ${childBarY + R}` +
      ` Q ${leftChildX} ${childBarY} ${leftChildX + R} ${childBarY}` +
      ` L ${rightChildX - R} ${childBarY}` +
      ` Q ${rightChildX} ${childBarY} ${rightChildX} ${childBarY + R} V ${children[0].y}`
    );
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(
        `M ${cx} ${childBarY}` +
        segPath(cx, childBarY, cx, children[0].y, crossings)
      );
    }
  }

  return parts.join(' ');
}

function FamilyConnectorEdge({ data }: EdgeProps) {
  const { p1, p2, children, color, crossings = [], routeX } = (data as unknown) as FamilyConnectorData;
  if (!children || children.length === 0) return null;
  const d = buildPath(p1 ?? null, p2 ?? null, children, crossings, routeX);
  if (!d) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color ?? '#6366f1'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default memo(FamilyConnectorEdge);

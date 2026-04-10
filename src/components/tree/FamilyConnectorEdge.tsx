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

function crossingsOnSeg(
  sx1: number, sy1: number, sx2: number, sy2: number,
  crossings: Crossing[]
): { t: number }[] {
  const isV = Math.abs(sx1 - sx2) < 0.5;
  return crossings
    .filter((c) => {
      if (isV) {
        if (Math.abs(c.cx - sx1) > 2) return false;
        const lo = Math.min(sy1, sy2), hi = Math.max(sy1, sy2);
        return c.cy > lo + HUMP_R + 2 && c.cy < hi - HUMP_R - 2;
      } else {
        if (Math.abs(c.cy - sy1) > 2) return false;
        const lo = Math.min(sx1, sx2), hi = Math.max(sx1, sx2);
        return c.cx > lo + HUMP_R + 2 && c.cx < hi - HUMP_R - 2;
      }
    })
    .map((c) => ({
      t: isV ? (c.cy - sy1) / (sy2 - sy1) : (c.cx - sx1) / (sx2 - sx1),
    }))
    .sort((a, b) => a.t - b.t);
}

// Build a segment path from (x1,y1) to (x2,y2) with humps at crossings.
// Returns everything AFTER the initial M command (caller adds M).
function segPath(
  x1: number, y1: number, x2: number, y2: number,
  crossings: Crossing[]
): string {
  const isV = Math.abs(x1 - x2) < 0.5;
  const hits = crossingsOnSeg(x1, y1, x2, y2, crossings);
  if (hits.length === 0) return ` L ${x2} ${y2}`;

  let d = '';
  for (const { t } of hits) {
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    if (isV) {
      // vertical crossed by horizontal — hump right
      d += ` L ${cx} ${cy - HUMP_R} A ${HUMP_R} ${HUMP_R} 0 0 1 ${cx} ${cy + HUMP_R}`;
    } else {
      // horizontal crossed by vertical — hump up
      d += ` L ${cx - HUMP_R} ${cy} A ${HUMP_R} ${HUMP_R} 0 0 0 ${cx + HUMP_R} ${cy}`;
    }
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

    // Left parent: drop to bar, round corner right
    parts.push(
      `M ${p1cx} ${pBy}` + segPath(p1cx, pBy, p1cx, barY - R, crossings) +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` +
      segPath(p1cx + R, barY, stemX, barY, crossings)
    );
    // Right parent: drop to bar, round corner left
    parts.push(
      `M ${p2cx} ${pBy}` + segPath(p2cx, pBy, p2cx, barY - R, crossings) +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` +
      segPath(p2cx - R, barY, stemX, barY, crossings)
    );

    if (routeX !== undefined) {
      // Outer routing: down from stem, jog to routeX, down, jog to midChildX
      const jog1Y = pBy + Math.round((childBarY - pBy) * 0.3);
      const jog2Y = childBarY - 20;
      const goRight = routeX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, jog1Y - R, crossings) +
        ` Q ${stemX} ${jog1Y} ${stemX + (goRight ? R : -R)} ${jog1Y}` +
        segPath(stemX + (goRight ? R : -R), jog1Y, routeX + (goRight ? -R : R), jog1Y, crossings) +
        ` Q ${routeX} ${jog1Y} ${routeX} ${jog1Y + R}` +
        segPath(routeX, jog1Y + R, routeX, jog2Y - R, crossings) +
        ` Q ${routeX} ${jog2Y} ${routeX + (goRight ? -R : R)} ${jog2Y}` +
        segPath(routeX + (goRight ? -R : R), jog2Y, midChildX + (goRight ? R : -R), jog2Y, crossings) +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings)
      );
    } else if (Math.abs(stemX - midChildX) > 2) {
      const midY = pBy + CONN_PH + (childBarY - pBy - CONN_PH) * 0.5;
      const goRight = midChildX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, midY - R, crossings) +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        segPath(stemX + (goRight ? R : -R), midY, midChildX + (goRight ? -R : R), midY, crossings) +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings)
      );
    } else {
      parts.push(`M ${stemX} ${barY}` + segPath(stemX, barY, stemX, childBarY, crossings));
    }
  } else {
    const px = (p1 ?? p2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;

    if (routeX !== undefined) {
      const jog1Y = pby + Math.round((childBarY - pby) * 0.3);
      const jog2Y = childBarY - 20;
      const goRight = routeX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, jog1Y - R, crossings) +
        ` Q ${pbx} ${jog1Y} ${pbx + (goRight ? R : -R)} ${jog1Y}` +
        segPath(pbx + (goRight ? R : -R), jog1Y, routeX + (goRight ? -R : R), jog1Y, crossings) +
        ` Q ${routeX} ${jog1Y} ${routeX} ${jog1Y + R}` +
        segPath(routeX, jog1Y + R, routeX, jog2Y - R, crossings) +
        ` Q ${routeX} ${jog2Y} ${routeX + (goRight ? -R : R)} ${jog2Y}` +
        segPath(routeX + (goRight ? -R : R), jog2Y, midChildX + (goRight ? R : -R), jog2Y, crossings) +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings)
      );
    } else if (Math.abs(pbx - midChildX) > 2) {
      const midY = pby + (childBarY - pby) * 0.5;
      const goRight = midChildX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, midY - R, crossings) +
        ` Q ${pbx} ${midY} ${pbx + (goRight ? R : -R)} ${midY}` +
        segPath(pbx + (goRight ? R : -R), midY, midChildX + (goRight ? -R : R), midY, crossings) +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings)
      );
    } else {
      parts.push(`M ${pbx} ${pby}` + segPath(pbx, pby, pbx, childBarY, crossings));
    }
  }

  // Child bar + drops
  if (childCenters.length === 1) {
    parts.push(`M ${childCenters[0]} ${childBarY}` + segPath(childCenters[0], childBarY, childCenters[0], children[0].y, crossings));
  } else {
    parts.push(
      `M ${leftChildX} ${children[0].y} V ${childBarY + R}` +
      ` Q ${leftChildX} ${childBarY} ${leftChildX + R} ${childBarY}` +
      segPath(leftChildX + R, childBarY, rightChildX - R, childBarY, crossings) +
      ` Q ${rightChildX} ${childBarY} ${rightChildX} ${childBarY + R} V ${children[0].y}`
    );
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(`M ${cx} ${childBarY}` + segPath(cx, childBarY, cx, children[0].y, crossings));
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

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
  laneOffset?: number;
}

// Find crossings that lie on the segment (x1,y1)→(x2,y2).
// fullX1/Y1/fullX2/Y2 are the full segment extents for lookup (before corner trimming).
function crossingsOnSeg(
  x1: number, y1: number, x2: number, y2: number,
  crossings: Crossing[]
): { cy: number }[] {
  const isV = Math.abs(x1 - x2) < 0.5;
  if (!isV) return []; // only vertical segments draw humps
  const guard = HUMP_R + 2;
  const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
  return crossings
    .filter((c) => Math.abs(c.cx - x1) <= 2 && c.cy > lo + guard && c.cy < hi - guard)
    .map((c) => ({ cy: c.cy }))
    .sort((a, b) => a.cy - b.cy);
}

// Build path commands for one segment, with humps where vertical lines are crossed.
// Horizontal segments pass straight through (no humps — vertical lines bridge over them).
// fullX1/fullY1/fullX2/fullY2: full extent of this segment for crossing detection
// (actual path starts/ends at x1,y1 → x2,y2 which may be corner-trimmed)
function segPath(
  x1: number, y1: number, x2: number, y2: number,
  crossings: Crossing[],
  fullY1?: number, fullY2?: number
): string {
  const isV = Math.abs(x1 - x2) < 0.5;
  if (!isV) return ` L ${x2} ${y2}`;

  const fy1 = fullY1 ?? y1;
  const fy2 = fullY2 ?? y2;
  const hits = crossingsOnSeg(x1, fy1, x2, fy2, crossings);
  if (hits.length === 0) return ` L ${x2} ${y2}`;

  let d = '';
  for (const { cy } of hits) {
    // skip humps outside the actual drawn range
    if (cy <= Math.min(y1, y2) || cy >= Math.max(y1, y2)) continue;
    d += ` L ${x1} ${cy - HUMP_R} A ${HUMP_R} ${HUMP_R} 0 0 1 ${x1} ${cy + HUMP_R}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

function buildPath(
  p1: Pos | null, p2: Pos | null, children: Pos[],
  crossings: Crossing[], routeX: number | undefined,
  laneOffset: number
): string {
  if (children.length === 0) return '';

  // Apply lane offset to all X coordinates so this family's lines are shifted
  const ox = laneOffset;
  const shiftP = (p: Pos | null) => p ? { x: p.x + ox, y: p.y } : null;
  const sp1 = shiftP(p1);
  const sp2 = shiftP(p2);
  const sChildren = children.map((c) => ({ x: c.x + ox, y: c.y }));
  const sRouteX = routeX !== undefined ? routeX + ox : undefined;

  const childBarY = sChildren[0].y - CHILD_BAR_OFFSET;
  const childCenters = sChildren.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];
  const midChildX = (leftChildX + rightChildX) / 2;

  const parts: string[] = [];

  if (sp1 && sp2) {
    const p1cx = sp1.x + CONN_PW / 2;
    const p2cx = sp2.x + CONN_PW / 2;
    const pBy = sp1.y + CONN_PH;
    const barY = pBy + PARENT_BAR_DROP;
    const stemX = (p1cx + p2cx) / 2;

    // Left parent drop (full range pBy→barY for crossing detection)
    parts.push(
      `M ${p1cx} ${pBy}` +
      segPath(p1cx, pBy, p1cx, barY - R, crossings, pBy, barY) +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY} L ${stemX} ${barY}`
    );
    // Right parent drop
    parts.push(
      `M ${p2cx} ${pBy}` +
      segPath(p2cx, pBy, p2cx, barY - R, crossings, pBy, barY) +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY} L ${stemX} ${barY}`
    );

    if (sRouteX !== undefined) {
      const jog1Y = pBy + PARENT_BAR_DROP + 10;
      const jog2Y = childBarY - 10;
      const goRight = sRouteX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, jog1Y - R, crossings, barY, jog1Y) +
        ` Q ${stemX} ${jog1Y} ${stemX + (goRight ? R : -R)} ${jog1Y}` +
        ` L ${sRouteX + (goRight ? -R : R)} ${jog1Y}` +
        ` Q ${sRouteX} ${jog1Y} ${sRouteX} ${jog1Y + R}` +
        segPath(sRouteX, jog1Y + R, sRouteX, jog2Y - R, crossings, jog1Y, jog2Y) +
        ` Q ${sRouteX} ${jog2Y} ${sRouteX + (goRight ? -R : R)} ${jog2Y}` +
        ` L ${midChildX + (goRight ? R : -R)} ${jog2Y}` +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings, jog2Y, childBarY)
      );
    } else if (Math.abs(stemX - midChildX) > 2) {
      const midY = pBy + CONN_PH + (childBarY - pBy - CONN_PH) * 0.5;
      const goRight = midChildX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, midY - R, crossings, barY, midY) +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        ` L ${midChildX + (goRight ? -R : R)} ${midY}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings, midY, childBarY)
      );
    } else {
      parts.push(
        `M ${stemX} ${barY}` +
        segPath(stemX, barY, stemX, childBarY, crossings)
      );
    }
  } else {
    const px = (sp1 ?? sp2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;

    if (sRouteX !== undefined) {
      const jog1Y = pby + PARENT_BAR_DROP + 10;
      const jog2Y = childBarY - 10;
      const goRight = sRouteX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, jog1Y - R, crossings, pby, jog1Y) +
        ` Q ${pbx} ${jog1Y} ${pbx + (goRight ? R : -R)} ${jog1Y}` +
        ` L ${sRouteX + (goRight ? -R : R)} ${jog1Y}` +
        ` Q ${sRouteX} ${jog1Y} ${sRouteX} ${jog1Y + R}` +
        segPath(sRouteX, jog1Y + R, sRouteX, jog2Y - R, crossings, jog1Y, jog2Y) +
        ` Q ${sRouteX} ${jog2Y} ${sRouteX + (goRight ? -R : R)} ${jog2Y}` +
        ` L ${midChildX + (goRight ? R : -R)} ${jog2Y}` +
        ` Q ${midChildX} ${jog2Y} ${midChildX} ${jog2Y + R}` +
        segPath(midChildX, jog2Y + R, midChildX, childBarY, crossings, jog2Y, childBarY)
      );
    } else if (Math.abs(pbx - midChildX) > 2) {
      const midY = pby + (childBarY - pby) * 0.5;
      const goRight = midChildX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        segPath(pbx, pby, pbx, midY - R, crossings, pby, midY) +
        ` Q ${pbx} ${midY} ${pbx + (goRight ? R : -R)} ${midY}` +
        ` L ${midChildX + (goRight ? -R : R)} ${midY}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        segPath(midChildX, midY + R, midChildX, childBarY, crossings, midY, childBarY)
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
      segPath(childCenters[0], childBarY, childCenters[0], sChildren[0].y, crossings, childBarY, sChildren[0].y)
    );
  } else {
    parts.push(
      `M ${leftChildX} ${sChildren[0].y} V ${childBarY + R}` +
      ` Q ${leftChildX} ${childBarY} ${leftChildX + R} ${childBarY}` +
      ` L ${rightChildX - R} ${childBarY}` +
      ` Q ${rightChildX} ${childBarY} ${rightChildX} ${childBarY + R} V ${sChildren[0].y}`
    );
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(
        `M ${cx} ${childBarY}` +
        segPath(cx, childBarY, cx, sChildren[0].y, crossings, childBarY, sChildren[0].y)
      );
    }
  }

  return parts.join(' ');
}

function FamilyConnectorEdge({ data }: EdgeProps) {
  const { p1, p2, children, color, crossings = [], routeX, laneOffset = 0 } = (data as unknown) as FamilyConnectorData;
  if (!children || children.length === 0) return null;
  const d = buildPath(p1 ?? null, p2 ?? null, children, crossings, routeX, laneOffset);
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

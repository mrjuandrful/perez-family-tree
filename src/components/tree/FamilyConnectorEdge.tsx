import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import {
  CONN_PW, CONN_PH, PARENT_BAR_DROP, CHILD_BAR_OFFSET,
  type Pos, type Crossing,
} from '../../lib/layout/connectorGeometry';

const R = 8;
const HUMP_R = 4;

export interface FamilyConnectorData {
  p1: Pos | null;
  p2: Pos | null;
  children: Pos[];
  color: string;
  crossings: Crossing[];
  routeX?: number;
  vNudge?: number; // X shift applied to every vertical segment of this family
  hNudge?: number; // Y shift applied to every horizontal segment of this family
}

// Returns humps on a vertical segment at x going from fy1→fy2 (full range for lookup).
// Actual drawn portion is y1→y2 (corner-trimmed).
function humpsOnVertical(
  x: number, y1: number, y2: number,
  fy1: number, fy2: number,
  crossings: Crossing[]
): string {
  const guard = HUMP_R + 1;
  const lo = Math.min(fy1, fy2), hi = Math.max(fy1, fy2);
  const hits = crossings
    .filter((c) => Math.abs(c.cx - x) <= 2 && c.cy > lo + guard && c.cy < hi - guard)
    .map((c) => c.cy)
    .sort((a, b) => a - b);

  if (hits.length === 0) return ` L ${x} ${y2}`;
  let d = '';
  for (const cy of hits) {
    if (cy <= Math.min(y1, y2) || cy >= Math.max(y1, y2)) continue;
    d += ` L ${x} ${cy - HUMP_R} A ${HUMP_R} ${HUMP_R} 0 0 1 ${x} ${cy + HUMP_R}`;
  }
  d += ` L ${x} ${y2}`;
  return d;
}

// Straight horizontal line (no humps — vertical segments bridge over horizontals)
function hLine(_x1: number, y: number, x2: number): string {
  return ` L ${x2} ${y}`;
}

function buildPath(
  p1: Pos | null, p2: Pos | null, children: Pos[],
  crossings: Crossing[], routeX: number | undefined,
  vNudge: number, hNudge: number
): string {
  if (children.length === 0) return '';

  // vx: X coordinate of a vertical line rooted at card center cx, nudged
  // hy: Y coordinate of a horizontal line at base y, nudged
  const vx = (cx: number) => cx + vNudge;
  const hy = (y: number) => y + hNudge;

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];
  const midChildX = (leftChildX + rightChildX) / 2;

  // nudged versions
  const vleftChildX = vx(leftChildX);
  const vrightChildX = vx(rightChildX);
  const vmidChildX = vx(midChildX);
  const hchildBarY = hy(childBarY);

  const parts: string[] = [];

  if (p1 && p2) {
    const p1cx = p1.x + CONN_PW / 2;
    const p2cx = p2.x + CONN_PW / 2;
    const pBy = p1.y + CONN_PH;          // bottom of parent cards (not nudged — fixed by card)
    const barY = hy(pBy + PARENT_BAR_DROP); // horizontal bar connecting parents — h-nudged
    // Parent drops are NOT nudged — they always connect to the actual card bottom.
    // Only the stem (from barY downward) is nudged.
    const stemX = vx((p1cx + p2cx) / 2);

    // Left parent drop: vertical from card bottom to barY (at card center, no nudge)
    parts.push(
      `M ${p1cx} ${pBy}` +
      humpsOnVertical(p1cx, pBy, barY - R, pBy, barY, crossings) +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` +
      hLine(p1cx + R, barY, stemX)
    );
    // Right parent drop
    parts.push(
      `M ${p2cx} ${pBy}` +
      humpsOnVertical(p2cx, pBy, barY - R, pBy, barY, crossings) +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` +
      hLine(p2cx - R, barY, stemX)
    );

    if (routeX !== undefined) {
      const vrouteX = vx(routeX);
      const jog1Y = hy(pBy + PARENT_BAR_DROP + 10);
      const jog2Y = hy(childBarY - 10);
      const goRight = vrouteX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        humpsOnVertical(stemX, barY, jog1Y - R, barY, jog1Y, crossings) +
        ` Q ${stemX} ${jog1Y} ${stemX + (goRight ? R : -R)} ${jog1Y}` +
        hLine(stemX + (goRight ? R : -R), jog1Y, vrouteX + (goRight ? -R : R)) +
        ` Q ${vrouteX} ${jog1Y} ${vrouteX} ${jog1Y + R}` +
        humpsOnVertical(vrouteX, jog1Y + R, jog2Y - R, jog1Y, jog2Y, crossings) +
        ` Q ${vrouteX} ${jog2Y} ${vrouteX + (goRight ? -R : R)} ${jog2Y}` +
        hLine(vrouteX + (goRight ? -R : R), jog2Y, vmidChildX + (goRight ? R : -R)) +
        ` Q ${vmidChildX} ${jog2Y} ${vmidChildX} ${jog2Y + R}` +
        humpsOnVertical(vmidChildX, jog2Y + R, hchildBarY, jog2Y, hchildBarY, crossings)
      );
    } else if (Math.abs(stemX - vmidChildX) > 2) {
      const midY = hy(barY + (childBarY - barY) * 0.5);
      const goRight = vmidChildX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        humpsOnVertical(stemX, barY, midY - R, barY, midY, crossings) +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        hLine(stemX + (goRight ? R : -R), midY, vmidChildX + (goRight ? -R : R)) +
        ` Q ${vmidChildX} ${midY} ${vmidChildX} ${midY + R}` +
        humpsOnVertical(vmidChildX, midY + R, hchildBarY, midY, hchildBarY, crossings)
      );
    } else {
      parts.push(
        `M ${stemX} ${barY}` +
        humpsOnVertical(stemX, barY, hchildBarY, barY, hchildBarY, crossings)
      );
    }
  } else {
    // Single parent — parent drop uses un-nudged pbx (connects to actual card center)
    const px = (p1 ?? p2)!;
    const pbx = px.x + CONN_PW / 2;
    const pby = px.y + CONN_PH;
    if (routeX !== undefined) {
      const vrouteX = vx(routeX);
      const jog1Y = hy(pby + PARENT_BAR_DROP + 10);
      const jog2Y = hy(childBarY - 10);
      const goRight = vrouteX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        humpsOnVertical(pbx, pby, jog1Y - R, pby, jog1Y, crossings) +
        ` Q ${pbx} ${jog1Y} ${pbx + (goRight ? R : -R)} ${jog1Y}` +
        hLine(pbx + (goRight ? R : -R), jog1Y, vrouteX + (goRight ? -R : R)) +
        ` Q ${vrouteX} ${jog1Y} ${vrouteX} ${jog1Y + R}` +
        humpsOnVertical(vrouteX, jog1Y + R, jog2Y - R, jog1Y, jog2Y, crossings) +
        ` Q ${vrouteX} ${jog2Y} ${vrouteX + (goRight ? -R : R)} ${jog2Y}` +
        hLine(vrouteX + (goRight ? -R : R), jog2Y, vmidChildX + (goRight ? R : -R)) +
        ` Q ${vmidChildX} ${jog2Y} ${vmidChildX} ${jog2Y + R}` +
        humpsOnVertical(vmidChildX, jog2Y + R, hchildBarY, jog2Y, hchildBarY, crossings)
      );
    } else if (Math.abs(pbx - vmidChildX) > 2) {
      const midY = hy(pby + (childBarY - pby) * 0.5);
      const goRight = vmidChildX > pbx;
      parts.push(
        `M ${pbx} ${pby}` +
        humpsOnVertical(pbx, pby, midY - R, pby, midY, crossings) +
        ` Q ${pbx} ${midY} ${pbx + (goRight ? R : -R)} ${midY}` +
        hLine(pbx + (goRight ? R : -R), midY, vmidChildX + (goRight ? -R : R)) +
        ` Q ${vmidChildX} ${midY} ${vmidChildX} ${midY + R}` +
        humpsOnVertical(vmidChildX, midY + R, hchildBarY, midY, hchildBarY, crossings)
      );
    } else {
      parts.push(
        `M ${pbx} ${pby}` +
        humpsOnVertical(pbx, pby, hchildBarY, pby, hchildBarY, crossings)
      );
    }
  }

  // Child bar + drops
  if (childCenters.length === 1) {
    parts.push(
      `M ${vleftChildX} ${hchildBarY}` +
      humpsOnVertical(vleftChildX, hchildBarY, children[0].y, hchildBarY, children[0].y, crossings)
    );
  } else {
    parts.push(
      `M ${vleftChildX} ${children[0].y} V ${hchildBarY + R}` +
      ` Q ${vleftChildX} ${hchildBarY} ${vleftChildX + R} ${hchildBarY}` +
      hLine(vleftChildX + R, hchildBarY, vrightChildX - R) +
      ` Q ${vrightChildX} ${hchildBarY} ${vrightChildX} ${hchildBarY + R} V ${children[0].y}`
    );
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(
        `M ${vx(cx)} ${hchildBarY}` +
        humpsOnVertical(vx(cx), hchildBarY, children[0].y, hchildBarY, children[0].y, crossings)
      );
    }
  }

  return parts.join(' ');
}

function FamilyConnectorEdge({ data }: EdgeProps) {
  const { p1, p2, children, color, crossings = [], routeX, vNudge = 0, hNudge = 0 } =
    (data as unknown) as FamilyConnectorData;
  if (!children || children.length === 0) return null;
  const d = buildPath(p1 ?? null, p2 ?? null, children, crossings, routeX, vNudge, hNudge);
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

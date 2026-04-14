import { describe, it, expect } from 'vitest';
import { computeLayout } from '../elkLayout';
import familyData from '../../../data/perez-family.json';
import type { FamilyTreeData } from '../../../types';
import {
  CONN_PW, CONN_PH, PARENT_BAR_DROP, CHILD_BAR_OFFSET,
  type Pos, type Crossing,
} from '../connectorGeometry';

const data = familyData as unknown as FamilyTreeData;
const R = 8;
const HUMP_R = 4;

function humpsOnVertical(x: number, y1: number, y2: number, fy1: number, fy2: number, crossings: Crossing[]): string {
  const guard = HUMP_R + 1;
  const lo = Math.min(fy1, fy2), hi = Math.max(fy1, fy2);
  const hits = crossings
    .filter((c) => Math.abs(c.cx - x) <= 2 && c.cy > lo + guard && c.cy < hi - guard)
    .map((c) => c.cy).sort((a, b) => a - b);
  if (hits.length === 0) return ` L ${x} ${y2}`;
  let d = '';
  for (const cy of hits) {
    if (cy <= Math.min(y1, y2) || cy >= Math.max(y1, y2)) continue;
    d += ` L ${x} ${cy - HUMP_R} A ${HUMP_R} ${HUMP_R} 0 0 1 ${x} ${cy + HUMP_R}`;
  }
  d += ` L ${x} ${y2}`;
  return d;
}

function hLine(_x1: number, y: number, x2: number): string { return ` L ${x2} ${y}`; }

function buildPath(p1: Pos | null, p2: Pos | null, children: Pos[], crossings: Crossing[], routeX: number | undefined, vNudge: number, hNudge: number): string {
  if (children.length === 0) return '';
  const vx = (cx: number) => cx + vNudge;
  const hy = (y: number) => y + hNudge;
  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + CONN_PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0], rightChildX = childCenters[childCenters.length - 1];
  const midChildX = (leftChildX + rightChildX) / 2;
  const vleftChildX = vx(leftChildX), vrightChildX = vx(rightChildX), vmidChildX = vx(midChildX);
  const hchildBarY = hy(childBarY);
  const childRowY = children[0].y;
  const parts: string[] = [];

  if (p1 && p2) {
    const p1cx = p1.x + CONN_PW / 2, p2cx = p2.x + CONN_PW / 2;
    const pBy = p1.y + CONN_PH;
    const barY = hy(pBy + PARENT_BAR_DROP);
    const stemX = vx((p1cx + p2cx) / 2);
    parts.push(`M ${p1cx} ${pBy}` + humpsOnVertical(p1cx, pBy, barY - R, pBy, barY, crossings) + ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` + hLine(p1cx + R, barY, stemX));
    parts.push(`M ${p2cx} ${pBy}` + humpsOnVertical(p2cx, pBy, barY - R, pBy, barY, crossings) + ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` + hLine(p2cx - R, barY, stemX));
    if (routeX !== undefined) {
      const vrouteX = vx(routeX), jog1Y = barY + 10, jog2Y = hchildBarY - 10, goRight = vrouteX > stemX;
      parts.push(`M ${stemX} ${barY}` + humpsOnVertical(stemX, barY, jog1Y - R, barY, jog1Y, crossings) + ` Q ${stemX} ${jog1Y} ${stemX + (goRight ? R : -R)} ${jog1Y}` + hLine(stemX + (goRight ? R : -R), jog1Y, vrouteX + (goRight ? -R : R)) + ` Q ${vrouteX} ${jog1Y} ${vrouteX} ${jog1Y + R}` + humpsOnVertical(vrouteX, jog1Y + R, jog2Y - R, jog1Y, jog2Y, crossings) + ` Q ${vrouteX} ${jog2Y} ${vrouteX + (goRight ? -R : R)} ${jog2Y}` + hLine(vrouteX + (goRight ? -R : R), jog2Y, vmidChildX + (goRight ? R : -R)) + ` Q ${vmidChildX} ${jog2Y} ${vmidChildX} ${jog2Y + R}` + humpsOnVertical(vmidChildX, jog2Y + R, hchildBarY, jog2Y, hchildBarY, crossings));
    } else if (Math.abs(stemX - vmidChildX) > 2) {
      const midY = barY + (hchildBarY - barY) * 0.5, goRight = vmidChildX > stemX;
      parts.push(`M ${stemX} ${barY}` + humpsOnVertical(stemX, barY, midY - R, barY, midY, crossings) + ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` + hLine(stemX + (goRight ? R : -R), midY, vmidChildX + (goRight ? -R : R)) + ` Q ${vmidChildX} ${midY} ${vmidChildX} ${midY + R}` + humpsOnVertical(vmidChildX, midY + R, childRowY, midY, childRowY, crossings));
    } else {
      parts.push(`M ${stemX} ${barY}` + humpsOnVertical(stemX, barY, childRowY, barY, childRowY, crossings));
    }
  } else {
    const px = (p1 ?? p2)!, pbx = px.x + CONN_PW / 2, pby = px.y + CONN_PH;
    if (routeX !== undefined) {
      const vrouteX = vx(routeX), jog1Y = hy(pby + PARENT_BAR_DROP + 10), jog2Y = hy(childBarY - 10), goRight = vrouteX > pbx;
      parts.push(`M ${pbx} ${pby}` + humpsOnVertical(pbx, pby, jog1Y - R, pby, jog1Y, crossings) + ` Q ${pbx} ${jog1Y} ${pbx + (goRight ? R : -R)} ${jog1Y}` + hLine(pbx + (goRight ? R : -R), jog1Y, vrouteX + (goRight ? -R : R)) + ` Q ${vrouteX} ${jog1Y} ${vrouteX} ${jog1Y + R}` + humpsOnVertical(vrouteX, jog1Y + R, jog2Y - R, jog1Y, jog2Y, crossings) + ` Q ${vrouteX} ${jog2Y} ${vrouteX + (goRight ? -R : R)} ${jog2Y}` + hLine(vrouteX + (goRight ? -R : R), jog2Y, vmidChildX + (goRight ? R : -R)) + ` Q ${vmidChildX} ${jog2Y} ${vmidChildX} ${jog2Y + R}` + humpsOnVertical(vmidChildX, jog2Y + R, hchildBarY, jog2Y, hchildBarY, crossings));
    } else if (Math.abs(pbx - vmidChildX) > 2) {
      const midY = hy(pby + (childBarY - pby) * 0.5), goRight = vmidChildX > pbx;
      parts.push(`M ${pbx} ${pby}` + humpsOnVertical(pbx, pby, midY - R, pby, midY, crossings) + ` Q ${pbx} ${midY} ${pbx + (goRight ? R : -R)} ${midY}` + hLine(pbx + (goRight ? R : -R), midY, vmidChildX + (goRight ? -R : R)) + ` Q ${vmidChildX} ${midY} ${vmidChildX} ${midY + R}` + humpsOnVertical(vmidChildX, midY + R, hchildBarY, midY, hchildBarY, crossings));
    } else {
      parts.push(`M ${pbx} ${pby}` + humpsOnVertical(pbx, pby, hchildBarY, pby, hchildBarY, crossings));
    }
  }
  if (childCenters.length === 1) {
    parts.push(`M ${vleftChildX} ${hchildBarY}` + humpsOnVertical(vleftChildX, hchildBarY, childRowY, hchildBarY, childRowY, crossings));
  } else {
    parts.push(`M ${vleftChildX} ${childRowY} V ${hchildBarY + R}` + ` Q ${vleftChildX} ${hchildBarY} ${vleftChildX + R} ${hchildBarY}` + hLine(vleftChildX + R, hchildBarY, vrightChildX - R) + ` Q ${vrightChildX} ${hchildBarY} ${vrightChildX} ${hchildBarY + R} V ${childRowY}`);
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(`M ${vx(cx)} ${hchildBarY}` + humpsOnVertical(vx(cx), hchildBarY, childRowY, hchildBarY, childRowY, crossings));
    }
  }
  return parts.join(' ');
}

describe('buildPath e2e — arcs appear in SVG path', () => {
  it('produces arc (A) commands for families with crossings', async () => {
    const { edges } = await computeLayout(data);
    let totalArcs = 0;
    for (const e of edges.filter(e2 => e2.type === 'familyConnector')) {
      const d = e.data as { p1: Pos | null; p2: Pos | null; children: Pos[]; crossings: Crossing[]; routeX?: number; vNudge: number; hNudge: number };
      const path = buildPath(d.p1, d.p2, d.children, d.crossings, d.routeX, d.vNudge, d.hNudge);
      const arcs = (path.match(/ A /g) ?? []).length;
      if (d.crossings.length > 0) console.log(`  ${e.id}: crossings=${d.crossings.length} arcs=${arcs}`);
      totalArcs += arcs;
    }
    console.log(`Total arcs: ${totalArcs}`);
    expect(totalArcs).toBeGreaterThan(0);
  });
});

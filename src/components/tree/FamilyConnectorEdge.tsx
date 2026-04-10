import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';

const PW = 180;
const PH = 96;
const R = 8;
const PARENT_BAR_DROP = 30;
const CHILD_BAR_OFFSET = 40;

interface Pos { x: number; y: number; }
interface FamilyConnectorData { p1: Pos | null; p2: Pos | null; children: Pos[]; }

function buildPath(p1: Pos | null, p2: Pos | null, children: Pos[]): string {
  if (children.length === 0) return '';

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + PW / 2).sort((a, b) => a - b);
  const leftChildX  = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];

  const parts: string[] = [];

  // ── Stem: from parents down to childBarY ────────────────────────────────────
  let stemX: number; // X of the vertical stem that meets the child bar

  if (p1 && p2) {
    const p1cx = p1.x + PW / 2;
    const p2cx = p2.x + PW / 2;
    const pBy  = p1.y + PH;
    const barY = pBy + PARENT_BAR_DROP;
    stemX = (p1cx + p2cx) / 2;

    // Left parent down → round corner → across to stem
    parts.push(
      `M ${p1cx} ${pBy}` +
      ` V ${barY - R}` +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` +
      ` H ${stemX}`
    );
    // Right parent down → round corner → across to stem
    parts.push(
      `M ${p2cx} ${pBy}` +
      ` V ${barY - R}` +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` +
      ` H ${stemX}`
    );
    // Stem down — if stemX ≠ midChildX, draw a Z: vertical then horizontal then vertical
    if (Math.abs(stemX - (leftChildX + rightChildX) / 2) > 2) {
      const midChildX = (leftChildX + rightChildX) / 2;
      const midY = (barY + childBarY) / 2;
      const goRight = midChildX > stemX;
      parts.push(
        `M ${stemX} ${barY}` +
        ` V ${midY - R}` +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        ` H ${midChildX + (goRight ? -R : R)}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        ` V ${childBarY}`
      );
      stemX = midChildX;
    } else {
      parts.push(`M ${stemX} ${barY} V ${childBarY}`);
    }
  } else {
    const px = (p1 ?? p2)!;
    const pbx = px.x + PW / 2;
    const pby = px.y + PH;
    stemX = pbx;

    if (Math.abs(stemX - (leftChildX + rightChildX) / 2) > 2) {
      const midChildX = (leftChildX + rightChildX) / 2;
      const midY = (pby + childBarY) / 2;
      const goRight = midChildX > stemX;
      parts.push(
        `M ${stemX} ${pby}` +
        ` V ${midY - R}` +
        ` Q ${stemX} ${midY} ${stemX + (goRight ? R : -R)} ${midY}` +
        ` H ${midChildX + (goRight ? -R : R)}` +
        ` Q ${midChildX} ${midY} ${midChildX} ${midY + R}` +
        ` V ${childBarY}`
      );
      stemX = midChildX;
    } else {
      parts.push(`M ${stemX} ${pby} V ${childBarY}`);
    }
  }

  // ── Child bar + drops ───────────────────────────────────────────────────────
  const childTopY = children[0].y;

  if (childCenters.length === 1) {
    // Single child — straight drop from stem
    parts.push(`M ${childCenters[0]} ${childBarY} V ${childTopY}`);
  } else {
    // Left end: start below leftmost child, round corner up-then-right along bar
    parts.push(
      `M ${leftChildX} ${childTopY}` +
      ` V ${childBarY + R}` +
      ` Q ${leftChildX} ${childBarY} ${leftChildX + R} ${childBarY}` +
      ` H ${rightChildX - R}` +
      ` Q ${rightChildX} ${childBarY} ${rightChildX} ${childBarY + R}` +
      ` V ${childTopY}`
    );
    // Middle children — straight drops from bar
    for (const cx of childCenters.slice(1, -1)) {
      parts.push(`M ${cx} ${childBarY} V ${childTopY}`);
    }
  }

  return parts.join(' ');
}

function FamilyConnectorEdge({ data }: EdgeProps) {
  const { p1, p2, children } = (data as unknown) as FamilyConnectorData;
  if (!children || children.length === 0) return null;
  const d = buildPath(p1 ?? null, p2 ?? null, children);
  if (!d) return null;
  return (
    <path d={d} fill="none" stroke="#6366f1" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" />
  );
}

export default memo(FamilyConnectorEdge);

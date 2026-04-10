import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';

const PW = 180;
const PH = 80;
const R = 8;               // corner radius
const PARENT_BAR_DROP = 30; // how far below parents the horizontal joining bar sits
const CHILD_BAR_OFFSET = 40; // how far above children row the child bar sits

interface Pos { x: number; y: number; }

interface FamilyConnectorData {
  p1: Pos | null;
  p2: Pos | null;
  children: Pos[];
}

function buildPath(p1: Pos | null, p2: Pos | null, children: Pos[]): string {
  if (children.length === 0) return '';

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + PW / 2).sort((a, b) => a - b);
  const leftChildX = childCenters[0];
  const rightChildX = childCenters[childCenters.length - 1];

  const parts: string[] = [];

  if (p1 && p2) {
    const p1cx = p1.x + PW / 2; // bottom-center of parent 1
    const p2cx = p2.x + PW / 2; // bottom-center of parent 2
    const pBy  = p1.y + PH;     // bottom Y of parents (same row)
    const barY = pBy + PARENT_BAR_DROP; // Y of horizontal joining bar
    const midX = (p1cx + p2cx) / 2;

    // Left parent: straight down, rounded corner right, horizontal to midX
    parts.push(
      `M ${p1cx} ${pBy}` +
      ` V ${barY - R}` +
      ` Q ${p1cx} ${barY} ${p1cx + R} ${barY}` +
      ` H ${midX}`
    );

    // Right parent: straight down, rounded corner left, horizontal to midX
    parts.push(
      `M ${p2cx} ${pBy}` +
      ` V ${barY - R}` +
      ` Q ${p2cx} ${barY} ${p2cx - R} ${barY}` +
      ` H ${midX}`
    );

    // Vertical stem from midpoint of parent bar down to child bar
    parts.push(`M ${midX} ${barY} V ${childBarY}`);

  } else {
    // Single parent — straight vertical stem
    const px = (p1 ?? p2)!;
    const pbx = px.x + PW / 2;
    const pby = px.y + PH;
    parts.push(`M ${pbx} ${pby} V ${childBarY}`);
  }

  // Horizontal child bar
  if (leftChildX < rightChildX) {
    parts.push(`M ${leftChildX} ${childBarY} H ${rightChildX}`);
  }

  // Vertical drops from child bar to each child top
  for (const cx of childCenters) {
    const childTopY = children[0].y;
    parts.push(
      `M ${cx} ${childBarY}` +
      ` V ${childTopY}`
    );
  }

  return parts.join(' ');
}

function FamilyConnectorEdge({ data }: EdgeProps) {
  const { p1, p2, children } = (data as unknown) as FamilyConnectorData;
  if (!children || children.length === 0) return null;

  const d = buildPath(p1 ?? null, p2 ?? null, children);
  if (!d) return null;

  return (
    <path
      d={d}
      fill="none"
      stroke="#6366f1"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default memo(FamilyConnectorEdge);

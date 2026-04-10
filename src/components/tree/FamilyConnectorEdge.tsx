import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';

const PW = 180; // PERSON_WIDTH
const PH = 80;  // PERSON_HEIGHT
const R = 10;   // corner radius
const CHILD_BAR_OFFSET = 40; // px above children row where horizontal bar sits

interface Pos { x: number; y: number; }

interface FamilyConnectorData {
  p1: Pos | null;
  p2: Pos | null;
  children: Pos[];
}

// Rounded corner: going down then turning horizontal
// from (x, fromY) → down to (x, turnY-R) → curve → (x±R, turnY) → horizontal to (toX, turnY)
function downThenHoriz(x: number, fromY: number, turnY: number, toX: number): string {
  const goRight = toX >= x;
  const rx = goRight ? R : -R;
  return `M ${x} ${fromY} V ${turnY - R} Q ${x} ${turnY} ${x + rx} ${turnY} H ${toX}`;
}

// Rounded corner: going horizontal then turning down
// from (fromX, y) → horizontal to (turnX±R, y) → curve → (turnX, y+R) → down to (turnX, toY)
function horizThenDown(fromX: number, y: number, turnX: number, toY: number): string {
  const goLeft = fromX < turnX;
  const rx = goLeft ? R : -R;
  return `M ${fromX} ${y} H ${turnX - rx} Q ${turnX} ${y} ${turnX} ${y + R} V ${toY}`;
}

function buildPath(p1: Pos | null, p2: Pos | null, children: Pos[]): string {
  if (children.length === 0) return '';

  const childBarY = children[0].y - CHILD_BAR_OFFSET;
  const childCenters = children.map((c) => c.x + PW / 2);
  const leftChildX = Math.min(...childCenters);
  const rightChildX = Math.max(...childCenters);

  const segments: string[] = [];

  if (p1 && p2) {
    const p1bx = p1.x + PW / 2;
    const p1by = p1.y + PH;
    const p2bx = p2.x + PW / 2;

    // Left parent: down then turn right to midpoint
    segments.push(downThenHoriz(p1bx, p1by, childBarY, (p1bx + p2bx) / 2));
    // Right parent: down then turn left to midpoint
    segments.push(downThenHoriz(p2bx, p1by, childBarY, (p1bx + p2bx) / 2));
  } else {
    // Single parent: straight vertical stem down to bar
    const px = (p1 ?? p2)!;
    const pbx = px.x + PW / 2;
    const pby = px.y + PH;
    segments.push(`M ${pbx} ${pby} V ${childBarY}`);
  }

  // Horizontal child bar spanning leftmost to rightmost child center
  if (leftChildX < rightChildX) {
    segments.push(`M ${leftChildX} ${childBarY} H ${rightChildX}`);
  }

  // Drop from bar to each child top
  for (const cx of childCenters) {
    const childTopY = children[0].y;
    if (childCenters.length === 1) {
      // Single child: straight vertical drop
      segments.push(`M ${cx} ${childBarY} V ${childTopY}`);
    } else {
      // Multiple children: horizontal from bar midpoint to child, then drop down
      const barMidX = (leftChildX + rightChildX) / 2;
      if (Math.abs(cx - barMidX) < 1) {
        segments.push(`M ${cx} ${childBarY} V ${childTopY}`);
      } else {
        segments.push(horizThenDown(barMidX, childBarY, cx, childTopY));
      }
    }
  }

  return segments.join(' ');
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

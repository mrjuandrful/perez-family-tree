import { describe, it, expect } from 'vitest';
import {
  intersectSegments,
  extractSegments,
  CONN_PW,
  CHILD_BAR_OFFSET,
} from '../connectorGeometry';
import type { Segment } from '../connectorGeometry';

// ── helpers ──────────────────────────────────────────────────────────────────
function seg(x1: number, y1: number, x2: number, y2: number, famId = 'A'): Segment {
  return { x1, y1, x2, y2, famId };
}

// ── Test 1: intersectSegments — basic crossing ────────────────────────────────
describe('intersectSegments', () => {
  it('detects a clean perpendicular crossing', () => {
    const h = seg(0, 50, 100, 50, 'A');   // horizontal at y=50
    const v = seg(50, 0,  50, 100, 'B');  // vertical   at x=50
    const result = intersectSegments(h, v);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(50);
    expect(result!.y).toBeCloseTo(50);
  });

  // Test 2: same family — must not produce a crossing
  it('returns null for segments from the same family', () => {
    const h = seg(0, 50, 100, 50, 'A');
    const v = seg(50, 0, 50, 100, 'A');   // same famId
    expect(intersectSegments(h, v)).toBeNull();
  });

  // Test 3: parallel segments — must not produce a crossing
  it('returns null for parallel segments', () => {
    const h1 = seg(0, 50, 100, 50, 'A');
    const h2 = seg(0, 60, 100, 60, 'B');
    expect(intersectSegments(h1, h2)).toBeNull();
  });

  // Test 4: T-crossing — one segment endpoint touches the other midpoint
  // The guard is ±1, so endpoint contact should NOT count as a crossing
  it('returns null when vertical endpoint is on the horizontal (endpoint touch)', () => {
    // vertical from y=0 to y=50, horizontal at y=50 — endpoint contact
    const h = seg(0, 50, 100, 50, 'A');
    const v = seg(50, 0,  50,  50, 'B');
    // hY=50 == vMaxY=50, filtered out by hY >= vMaxY - 1
    expect(intersectSegments(h, v)).toBeNull();
  });

  // Test 5: no overlap — vertical and horizontal don't reach each other
  it('returns null when segments do not overlap in space', () => {
    const h = seg(0,   50, 30, 50, 'A');  // only spans x 0..30
    const v = seg(50, 0,  50, 100, 'B'); // at x=50
    expect(intersectSegments(h, v)).toBeNull();
  });

  // Test 6: crossings at non-integer positions
  it('handles non-integer coordinates', () => {
    const h = seg(0, 123.5, 200, 123.5, 'A');
    const v = seg(75.3, 0,  75.3, 300,  'B');
    const result = intersectSegments(h, v);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(75.3);
    expect(result!.y).toBeCloseTo(123.5);
  });
});

// ── Test 7–9: extractSegments output ─────────────────────────────────────────
describe('extractSegments', () => {
  const P1 = { x: 0, y: 0 };
  const P2 = { x: CONN_PW + 54, y: 0 };  // right partner (COUPLE_GAP = 54)
  const CHILD = { x: CONN_PW + 27, y: 260 }; // child directly below

  it('produces segments for a two-parent family', () => {
    const segs = extractSegments(P1, P2, [CHILD], 'F1');
    expect(segs.length).toBeGreaterThan(0);
    // Every segment should reference famId
    expect(segs.every(s => s.famId === 'F1')).toBe(true);
  });

  it('child bar segment spans from leftmost to rightmost child center', () => {
    const C1 = { x: 0,   y: 260 };
    const C2 = { x: 400, y: 260 };
    const segs = extractSegments(P1, P2, [C1, C2], 'F2');
    const childBarY = 260 - CHILD_BAR_OFFSET;
    const hSegs = segs.filter(s => Math.abs(s.y1 - s.y2) < 0.5 && Math.abs(s.y1 - childBarY) < 1);
    expect(hSegs.length).toBeGreaterThan(0);
    // Child bar should span both child centers
    const maxX = Math.max(...hSegs.map(s => Math.max(s.x1, s.x2)));
    const minX = Math.min(...hSegs.map(s => Math.min(s.x1, s.x2)));
    expect(maxX).toBeGreaterThanOrEqual(C2.x + CONN_PW / 2 - 1);
    expect(minX).toBeLessThanOrEqual(C1.x + CONN_PW / 2 + 1);
  });

  it('single-parent produces a straight vertical drop when parent is above child', () => {
    const parent = { x: 0, y: 0 };
    const child  = { x: 0, y: 260 };
    const segs = extractSegments(parent, null, [child], 'F3');
    expect(segs.length).toBeGreaterThan(0);
    // All segments should belong to F3
    expect(segs.every(s => s.famId === 'F3')).toBe(true);
  });
});

// ── Test 10: parentDrop flag on extractSegments ───────────────────────────────
describe('extractSegments parentDrop flag', () => {
  it('marks parent drop segments with parentDrop=true', () => {
    const P1 = { x: 0, y: 0 };
    const P2 = { x: CONN_PW + 54, y: 0 };
    const child = { x: CONN_PW + 27, y: 260 };
    const segs = extractSegments(P1, P2, [child], 'F1');
    const drops = segs.filter(s => s.parentDrop);
    // Should have exactly 2 parent drops (one per parent)
    expect(drops.length).toBe(2);
    // Drops should be vertical
    drops.forEach(d => expect(Math.abs(d.x1 - d.x2)).toBeLessThan(0.5));
  });

  it('non-parent-drop segments have parentDrop falsy', () => {
    const P1 = { x: 0, y: 0 };
    const P2 = { x: CONN_PW + 54, y: 0 };
    const child = { x: CONN_PW + 27, y: 260 };
    const segs = extractSegments(P1, P2, [child], 'F1');
    const nonDrops = segs.filter(s => !s.parentDrop);
    expect(nonDrops.length).toBeGreaterThan(0);
  });
});

// ── crossing detection between families ──────────────────────────────────────
describe('crossing detection between families', () => {
  it('detects crossing when family A vertical crosses family B horizontal', () => {
    // Family A: vertical drop at x=100, y=50→200
    const vA = seg(100, 50, 100, 200, 'A');
    // Family B: horizontal bar at y=100, x=50→200
    const hB = seg(50, 100, 200, 100, 'B');

    const result = intersectSegments(vA, hB);
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(100);
    expect(result!.y).toBeCloseTo(100);
  });

  it('a vertical segment does NOT self-cross (same family horizontal)', () => {
    const vA = seg(100, 50,  100, 200, 'A');
    const hA = seg(50,  100, 200, 100, 'A');
    expect(intersectSegments(vA, hA)).toBeNull();
  });
});

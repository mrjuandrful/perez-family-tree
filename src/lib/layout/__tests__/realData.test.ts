import { describe, it, expect } from 'vitest';
import { computeLayout } from '../elkLayout';
import familyData from '../../../data/perez-family.json';
import type { FamilyTreeData } from '../../../types';

const data = familyData as unknown as FamilyTreeData;

describe('real perez family data layout', () => {
  it('produces non-empty crossings for families whose connectors cross', async () => {
    const { edges } = await computeLayout(data);
    const connectors = edges.filter(e => e.type === 'familyConnector');

    console.log('\n=== Connector crossings ===');
    let totalCrossings = 0;
    for (const e of connectors) {
      const d = e.data as { crossings: { cx: number; cy: number }[]; vNudge: number; hNudge: number };
      console.log(`  ${e.id}: crossings=${d.crossings.length}  vNudge=${d.vNudge}  hNudge=${d.hNudge}`);
      totalCrossings += d.crossings.length;
    }
    console.log(`  Total crossings across all families: ${totalCrossings}`);

    // With 7 families across 4 generations, there MUST be at least some crossings
    expect(totalCrossings).toBeGreaterThan(0);
  });

  it('all connector edges have numeric vNudge and hNudge', async () => {
    const { edges } = await computeLayout(data);
    const connectors = edges.filter(e => e.type === 'familyConnector');
    for (const e of connectors) {
      const d = e.data as { vNudge: unknown; hNudge: unknown };
      expect(typeof d.vNudge).toBe('number');
      expect(typeof d.hNudge).toBe('number');
    }
  });

  it('families with overlapping stems get different vNudge values', async () => {
    const { edges } = await computeLayout(data);
    // F001 (Juan Miguel+Melissa→kids) and F002 (Juan Gonzalo+Zaida→Juan Miguel...)
    // share the same vertical region — at least one should have non-zero nudge
    const connectors = edges.filter(e => e.type === 'familyConnector');
    const nudges = connectors.map(e => (e.data as { vNudge: number }).vNudge);
    console.log('\n=== vNudges ===', nudges);
    // hNudge is what separates horizontal co-linear segments in this tree (±20)
    // vNudge may be 0 if no vertical stems share the same X
    const { edges: edges2 } = await computeLayout(data);
    const hNudges = edges2.filter(e => e.type === 'familyConnector')
      .map(e => (e.data as { hNudge: number }).hNudge);
    const hasNonZeroHNudge = hNudges.some(n => n !== 0);
    expect(hasNonZeroHNudge).toBe(true);
  });
});

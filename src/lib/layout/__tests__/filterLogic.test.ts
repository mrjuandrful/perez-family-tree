import { describe, it, expect } from 'vitest';
import type { FamilyTreeData } from '../../../types';

// ── Replicate the filter logic from useTreeLayout.ts ─────────────────────────
// We test it in isolation so bugs are caught without a full React render.

function tagFilter(
  data: FamilyTreeData,
  surnameFilter: string[]
): Set<string> {
  const allPersonIds = Object.keys(data.persons);

  const matchesFilter = (id: string) => {
    const p = data.persons[id];
    return (p.tags ?? []).some((tag) => surnameFilter.includes(tag));
  };

  const seedIds = new Set(allPersonIds.filter(matchesFilter));
  const expanded = new Set(seedIds);

  for (const fam of Object.values(data.families)) {
    const partnerIds = fam.partners.map((p) => p.personId);
    const childIds = fam.children.map((c) => c.personId);

    const partnerMatch = partnerIds.some((id) => seedIds.has(id));
    const childMatch = childIds.some((id) => seedIds.has(id));
    if (!partnerMatch && !childMatch) continue;

    partnerIds.forEach((id) => expanded.add(id));
    if (partnerMatch) childIds.forEach((id) => expanded.add(id));
    if (childMatch) partnerIds.forEach((id) => expanded.add(id));
  }

  return expanded;
}

// BFS from useTreeLayout.ts
function bfsGenerations(
  data: FamilyTreeData,
  startId: string,
  maxGenerations: number
): Set<string> {
  const visited = new Set<string>([startId]);
  let frontier = new Set<string>([startId]);

  for (let gen = 0; gen < maxGenerations; gen++) {
    const nextFrontier = new Set<string>();
    for (const personId of frontier) {
      for (const fam of Object.values(data.families)) {
        const isPartner = fam.partners.some((p) => p.personId === personId);
        const isChild = fam.children.some((c) => c.personId === personId);
        if (isPartner) {
          for (const p of fam.partners) {
            if (!visited.has(p.personId)) { nextFrontier.add(p.personId); visited.add(p.personId); }
          }
          for (const c of fam.children) {
            if (!visited.has(c.personId)) { nextFrontier.add(c.personId); visited.add(c.personId); }
          }
        }
        if (isChild) {
          for (const p of fam.partners) {
            if (!visited.has(p.personId)) { nextFrontier.add(p.personId); visited.add(p.personId); }
          }
          for (const c of fam.children) {
            if (!visited.has(c.personId)) { nextFrontier.add(c.personId); visited.add(c.personId); }
          }
        }
      }
    }
    frontier = nextFrontier;
    if (frontier.size === 0) break;
  }
  return visited;
}

// ── fixtures ──────────────────────────────────────────────────────────────────
function person(id: string, tags: string[] = []) {
  return {
    id,
    names: { given: { en: id, es: id }, surname: { en: 'X', es: 'X' } },
    gender: 'unknown' as const,
    living: true,
    mediaIds: [],
    tags,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

const TREE: FamilyTreeData = {
  meta: { version: '1.0', title: { en: 'T', es: 'T' }, rootPersonId: 'Child1', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  persons: {
    P1:     person('P1',     ['perez-line']),
    P2:     person('P2',     []),             // spouse of P1
    Child1: person('Child1', ['perez-line']),
    Child2: person('Child2', ['perez-line']),
    M1:     person('M1',     ['martinez-line']),
    M2:     person('M2',     []),             // spouse of M1
    MC1:    person('MC1',    ['martinez-line']),
  },
  families: {
    F1: {
      id: 'F1', type: 'marriage',
      partners: [{ personId: 'P1', role: 'partner1' }, { personId: 'P2', role: 'partner2' }],
      children: [{ personId: 'Child1', relationship: 'biological' }, { personId: 'Child2', relationship: 'biological' }],
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    },
    F2: {
      id: 'F2', type: 'marriage',
      partners: [{ personId: 'M1', role: 'partner1' }, { personId: 'M2', role: 'partner2' }],
      children: [{ personId: 'MC1', relationship: 'biological' }],
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    },
  },
  media: {},
};

// ── Test 19: tag filter — perez-line only ─────────────────────────────────────
describe('tagFilter', () => {
  it('includes perez-line persons and their unlabelled spouses', () => {
    const visible = tagFilter(TREE, ['perez-line']);
    expect(visible.has('P1')).toBe(true);
    expect(visible.has('P2')).toBe(true);    // spouse pulled in
    expect(visible.has('Child1')).toBe(true);
    expect(visible.has('Child2')).toBe(true);
  });

  it('excludes martinez-line persons when only perez-line is selected', () => {
    const visible = tagFilter(TREE, ['perez-line']);
    expect(visible.has('M1')).toBe(false);
    expect(visible.has('M2')).toBe(false);
    expect(visible.has('MC1')).toBe(false);
  });

  // Test 20: martinez-line filter works independently
  it('includes martinez-line persons when that filter is selected', () => {
    const visible = tagFilter(TREE, ['martinez-line']);
    expect(visible.has('M1')).toBe(true);
    expect(visible.has('M2')).toBe(true);   // spouse pulled in
    expect(visible.has('MC1')).toBe(true);
    expect(visible.has('P1')).toBe(false);
  });

  // Test 21: combining both filters shows all persons
  it('combining both filters shows everyone', () => {
    const visible = tagFilter(TREE, ['perez-line', 'martinez-line']);
    for (const id of Object.keys(TREE.persons)) {
      expect(visible.has(id)).toBe(true);
    }
  });

  // Test 22: empty filter returns nothing (caller should pass all)
  it('returns empty set when no filter tags given', () => {
    const visible = tagFilter(TREE, []);
    expect(visible.size).toBe(0);
  });
});

// ── Test 23–24: BFS generation filter ────────────────────────────────────────
describe('bfsGenerations', () => {
  const LINEAR: FamilyTreeData = {
    meta: { version: '1.0', title: { en: 'L', es: 'L' }, rootPersonId: 'Child', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    persons: {
      GP:    person('GP'),
      GPs:   person('GPs'),
      Parent: person('Parent'),
      Spouse: person('Spouse'),
      Child:  person('Child'),
      GC:     person('GC'),
    },
    families: {
      FGP:  { id: 'FGP',  type: 'marriage', partners: [{personId:'GP', role:'partner1'},{personId:'GPs', role:'partner2'}], children:[{personId:'Parent',relationship:'biological'}], createdAt:'2024-01-01T00:00:00Z', updatedAt:'2024-01-01T00:00:00Z' },
      FP:   { id: 'FP',   type: 'marriage', partners: [{personId:'Parent', role:'partner1'},{personId:'Spouse', role:'partner2'}], children:[{personId:'Child',relationship:'biological'}], createdAt:'2024-01-01T00:00:00Z', updatedAt:'2024-01-01T00:00:00Z' },
      FC:   { id: 'FC',   type: 'marriage', partners: [{personId:'Child', role:'partner1'}], children:[{personId:'GC',relationship:'biological'}], createdAt:'2024-01-01T00:00:00Z', updatedAt:'2024-01-01T00:00:00Z' },
    },
    media: {},
  };

  it('gen=1 from Child includes Parent/Spouse and GC but not GP/GPs', () => {
    const ids = bfsGenerations(LINEAR, 'Child', 1);
    expect(ids.has('Child')).toBe(true);
    expect(ids.has('Parent')).toBe(true);
    expect(ids.has('Spouse')).toBe(true);
    expect(ids.has('GC')).toBe(true);
    expect(ids.has('GP')).toBe(false);
    expect(ids.has('GPs')).toBe(false);
  });

  it('gen=2 from Child includes grandparents', () => {
    const ids = bfsGenerations(LINEAR, 'Child', 2);
    expect(ids.has('GP')).toBe(true);
    expect(ids.has('GPs')).toBe(true);
  });
});

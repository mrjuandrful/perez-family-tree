import { describe, it, expect } from 'vitest';
import { buildSearchIndex } from '../../../src/lib/search/buildIndex';
import type { FamilyTreeData } from '../../../src/types';

const mockData: FamilyTreeData = {
  meta: {
    version: '1.0',
    title: { en: 'Test', es: 'Test' },
    createdAt: '',
    updatedAt: '',
  },
  persons: {
    P1: {
      id: 'P1',
      names: { given: { en: 'Juan', es: 'Juan' }, surname: { en: 'Perez', es: 'Pérez' } },
      mediaIds: [],
      createdAt: '',
      updatedAt: '',
    },
    P2: {
      id: 'P2',
      names: { given: { en: 'Maria', es: 'María' }, surname: { en: 'Gonzalez', es: 'González' } },
      bio: { en: 'A wonderful person', es: 'Una persona maravillosa' },
      mediaIds: [],
      createdAt: '',
      updatedAt: '',
    },
  },
  families: {},
  media: {},
};

describe('buildSearchIndex', () => {
  it('finds person by English name', () => {
    const index = buildSearchIndex(mockData);
    const results = index.search('Juan');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('P1');
  });

  it('finds person by Spanish name', () => {
    const index = buildSearchIndex(mockData);
    const results = index.search('María');
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('P2');
  });

  it('finds person by bio keyword', () => {
    const index = buildSearchIndex(mockData);
    const results = index.search('wonderful');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.id).toBe('P2');
  });

  it('returns empty for unknown query', () => {
    const index = buildSearchIndex(mockData);
    const results = index.search('zzznomatch999');
    expect(results).toHaveLength(0);
  });
});

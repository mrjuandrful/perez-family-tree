import { useState, useEffect, useMemo } from 'react';
import { buildSearchIndex } from '../lib/search/buildIndex';
import { useFamilyTreeStore } from '../store';
import type { Person } from '../types';

export function useSearch(query: string): Person[] {
  const data = useFamilyTreeStore((s) => s.data);
  const [results, setResults] = useState<Person[]>([]);

  const index = useMemo(() => buildSearchIndex(data), [data]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const hits = index.search(query.trim(), { limit: 10 });
    setResults(hits.map((h) => data.persons[h.item.id]).filter(Boolean));
  }, [query, index, data]);

  return results;
}

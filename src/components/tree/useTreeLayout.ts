import { useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { computeLayout } from '../../lib/layout/elkLayout';
import { useFamilyTreeStore, useUIStore } from '../../store';

export function useTreeLayout() {
  const data = useFamilyTreeStore((s) => s.data);
  const generationFilter = useUIStore((s) => s.generationFilter);
  const surnameFilter = useUIStore((s) => s.surnameFilter);
  const focusPersonId = useUIStore((s) => s.focusPersonId);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      // Build the set of visible person IDs based on filters
      let visiblePersonIds: Set<string> | undefined;

      const allPersonIds = Object.keys(data.persons);

      // Surname filter
      if (surnameFilter.length > 0) {
        const filtered = allPersonIds.filter((id) => {
          const p = data.persons[id];
          const surnameEn = p.names.surname.en.toLowerCase();
          const surnameEs = p.names.surname.es.toLowerCase();
          return surnameFilter.some(
            (s) => surnameEn.includes(s.toLowerCase()) || surnameEs.includes(s.toLowerCase())
          );
        });
        visiblePersonIds = new Set(filtered);
      }

      // Generation filter (BFS from focus person)
      if (generationFilter > 0 && focusPersonId) {
        const bfsIds = bfsGenerations(data, focusPersonId, generationFilter);
        if (visiblePersonIds) {
          visiblePersonIds = new Set([...visiblePersonIds].filter((id) => bfsIds.has(id)));
        } else {
          visiblePersonIds = bfsIds;
        }
      }

      try {
        const result = await computeLayout(data, visiblePersonIds);
        if (!cancelled) {
          setNodes(result.nodes);
          setEdges(result.edges);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [data, generationFilter, surnameFilter, focusPersonId]);

  return { nodes, edges, loading };
}

function bfsGenerations(data: import('../../types').FamilyTreeData, startId: string, maxGenerations: number): Set<string> {
  const visited = new Set<string>([startId]);
  let frontier = new Set<string>([startId]);

  for (let gen = 0; gen < maxGenerations; gen++) {
    const nextFrontier = new Set<string>();

    for (const personId of frontier) {
      for (const fam of Object.values(data.families)) {
        const isPartner = fam.partners.some((p) => p.personId === personId);
        const isChild = fam.children.some((c) => c.personId === personId);

        if (isPartner) {
          // Add other partners and all children
          for (const p of fam.partners) {
            if (!visited.has(p.personId)) {
              nextFrontier.add(p.personId);
              visited.add(p.personId);
            }
          }
          for (const c of fam.children) {
            if (!visited.has(c.personId)) {
              nextFrontier.add(c.personId);
              visited.add(c.personId);
            }
          }
        }

        if (isChild) {
          // Add parents and siblings
          for (const p of fam.partners) {
            if (!visited.has(p.personId)) {
              nextFrontier.add(p.personId);
              visited.add(p.personId);
            }
          }
          for (const c of fam.children) {
            if (!visited.has(c.personId)) {
              nextFrontier.add(c.personId);
              visited.add(c.personId);
            }
          }
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.size === 0) break;
  }

  return visited;
}

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

      // Family line filter — surnameFilter holds tag values like "zitt-line"
      // Seed: anyone tagged with one of the selected lines.
      // Expand: include their spouses and children so nuclear families stay intact.
      if (surnameFilter.length > 0) {
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

          // Include all partners of any matched family
          partnerIds.forEach((id) => expanded.add(id));
          // Include children if a partner is a seed (show their kids)
          if (partnerMatch) childIds.forEach((id) => expanded.add(id));
          // Include parents if a child is a seed (show where they came from)
          if (childMatch) partnerIds.forEach((id) => expanded.add(id));
        }

        visiblePersonIds = expanded;
      }

      // Generation filter (BFS from focus person, or root person if none selected)
      if (generationFilter > 0) {
        // Find the anchor person: prefer focus person if visible, else pick any visible person, else use root
        let genAnchorId = focusPersonId;
        if (visiblePersonIds && !visiblePersonIds.has(genAnchorId ?? '')) {
          // Focus person not in visible set, pick first visible person
          const visibleArray = Array.from(visiblePersonIds);
          genAnchorId = visibleArray.length > 0 ? visibleArray[0] : null;
        }
        if (!genAnchorId) {
          genAnchorId = data.meta.rootPersonId ?? null;
        }

        if (genAnchorId) {
          const bfsIds = bfsGenerations(data, genAnchorId, generationFilter);
          if (visiblePersonIds) {
            visiblePersonIds = new Set([...visiblePersonIds].filter((id) => bfsIds.has(id)));
          } else {
            visiblePersonIds = bfsIds;
          }
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

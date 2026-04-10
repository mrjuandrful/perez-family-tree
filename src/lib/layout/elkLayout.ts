import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { FamilyTreeData } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elk = new (ELK as any)();

const PERSON_WIDTH = 180;
const PERSON_HEIGHT = 80;
const FAMILY_WIDTH = 20;
const FAMILY_HEIGHT = 20;

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  children?: ElkNode[];
  edges?: ElkEdge[];
  layoutOptions?: Record<string, string>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export async function computeLayout(
  data: FamilyTreeData,
  visiblePersonIds?: Set<string>
): Promise<LayoutResult> {
  const { persons, families } = data;

  const personIds = visiblePersonIds
    ? Object.keys(persons).filter((id) => visiblePersonIds.has(id))
    : Object.keys(persons);

  const elkNodes: ElkNode[] = [
    ...personIds.map((id) => ({
      id: `person-${id}`,
      width: PERSON_WIDTH,
      height: PERSON_HEIGHT,
    })),
  ];

  const elkEdges: ElkEdge[] = [];

  const includedFamilies = Object.values(families).filter((fam) => {
    const hasVisiblePartner = fam.partners.some((p) => personIds.includes(p.personId));
    const hasVisibleChild = fam.children.some((c) => personIds.includes(c.personId));
    return hasVisiblePartner || hasVisibleChild;
  });

  for (const fam of includedFamilies) {
    const famNodeId = `family-${fam.id}`;
    elkNodes.push({ id: famNodeId, width: FAMILY_WIDTH, height: FAMILY_HEIGHT });

    for (const partner of fam.partners) {
      if (!personIds.includes(partner.personId)) continue;
      elkEdges.push({
        id: `edge-partner-${fam.id}-${partner.personId}`,
        sources: [`person-${partner.personId}`],
        targets: [famNodeId],
      });
    }

    for (const child of fam.children) {
      if (!personIds.includes(child.personId)) continue;
      elkEdges.push({
        id: `edge-child-${fam.id}-${child.personId}`,
        sources: [famNodeId],
        targets: [`person-${child.personId}`],
      });
    }
  }

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.spacing.nodeNode': '30',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laid: ElkNode = await elk.layout(graph as any);

  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  for (const n of laid.children ?? []) {
    if (n.id.startsWith('person-')) {
      const personId = n.id.replace('person-', '');
      rfNodes.push({
        id: n.id,
        type: 'personNode',
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { personId },
        style: { width: PERSON_WIDTH, height: PERSON_HEIGHT },
      });
    } else if (n.id.startsWith('family-')) {
      const familyId = n.id.replace('family-', '');
      rfNodes.push({
        id: n.id,
        type: 'familyNode',
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { familyId },
        style: { width: FAMILY_WIDTH, height: FAMILY_HEIGHT },
      });
    }
  }

  for (const e of laid.edges ?? []) {
    const edge = e as ElkEdge;
    rfEdges.push({
      id: edge.id,
      source: edge.sources[0],
      target: edge.targets[0],
      type: 'smoothstep',
      style: { stroke: '#9ca3af', strokeWidth: 1.5 },
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

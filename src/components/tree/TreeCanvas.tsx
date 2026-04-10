import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PersonNode from './PersonNode';
import FamilyNode from './FamilyNode';
import TreeControls from './TreeControls';
import { useTreeLayout } from './useTreeLayout';
import { useUIStore } from '../../store';

const nodeTypes: NodeTypes = {
  personNode: PersonNode,
  familyNode: FamilyNode,
};

function TreeCanvasInner() {
  const { nodes: layoutNodes, edges: layoutEdges, loading } = useTreeLayout();
  const [, , onNodesChange] = useNodesState(layoutNodes);
  const [, , onEdgesChange] = useEdgesState(layoutEdges);

  const setSelectedPerson = useUIStore((s) => s.setSelectedPerson);
  const setFocusPerson = useUIStore((s) => s.setFocusPerson);
  const selectedPersonId = useUIStore((s) => s.selectedPersonId);

  // Sync layout changes into RF state
  const syncedNodes = useMemo(() => {
    return layoutNodes.map((n) => ({
      ...n,
      selected: n.id === `person-${selectedPersonId}`,
    }));
  }, [layoutNodes, selectedPersonId]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.type === 'personNode') {
      const personId = (node.data as { personId: string }).personId;
      setSelectedPerson(personId);
      setFocusPerson(personId);
    }
  }, [setSelectedPerson, setFocusPerson]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Building family tree...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={syncedNodes}
        edges={layoutEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gray-50"
      >
        <Background color="#e5e7eb" gap={20} />
        <MiniMap
          nodeColor={(n) => n.type === 'familyNode' ? '#818cf8' : '#6366f1'}
          className="!bg-white !border-gray-200"
        />
        <TreeControls />
      </ReactFlow>
    </div>
  );
}

export default function TreeCanvas() {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner />
    </ReactFlowProvider>
  );
}

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function FamilyNode() {
  return (
    <div
      style={{ width: 20, height: 20 }}
      className="rounded-full bg-indigo-400 border-2 border-indigo-500 shadow"
      title="Family unit"
    >
      <Handle type="target" position={Position.Top} style={{ background: '#818cf8', border: '2px solid #6366f1' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#818cf8', border: '2px solid #6366f1' }} />
    </div>
  );
}

export default memo(FamilyNode);

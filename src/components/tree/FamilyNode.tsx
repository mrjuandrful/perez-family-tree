import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function FamilyNode() {
  return (
    <div
      className="w-5 h-5 rounded-full bg-indigo-300 border-2 border-indigo-400"
      title="Family unit"
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-300 !border-indigo-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-300 !border-indigo-400" />
    </div>
  );
}

export default memo(FamilyNode);

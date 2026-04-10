import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function HeartNode() {
  return (
    <div
      style={{ width: 28, height: 28 }}
      className="flex items-center justify-center pointer-events-none select-none"
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: 'transparent', border: 'none', left: 0 }}
      />
      <span style={{ fontSize: 20, lineHeight: 1 }}>❤️</span>
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: 'transparent', border: 'none', right: 0 }}
      />
    </div>
  );
}

export default memo(HeartNode);

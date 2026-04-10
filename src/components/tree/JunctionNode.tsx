import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// Invisible junction node — just a dot where parent lines converge before splitting to children
function JunctionNode() {
  return (
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}>
      <Handle type="target" id="left" position={Position.Left} style={{ opacity: 0, left: 0 }} />
      <Handle type="target" id="right" position={Position.Right} style={{ opacity: 0, right: 0 }} />
      <Handle type="target" id="top" position={Position.Top} style={{ opacity: 0, top: 0 }} />
      <Handle type="source" id="bottom" position={Position.Bottom} style={{ opacity: 0, bottom: 0 }} />
    </div>
  );
}

export default memo(JunctionNode);

import { memo } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function RoundedStepEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  });

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      style={style}
      markerEnd={markerEnd}
      className="react-flow__edge-path"
    />
  );
}

export default memo(RoundedStepEdge);

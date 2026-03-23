import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react'

export function CustomEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: '#7c3aed',
        strokeWidth: 2.5,
        strokeDasharray: '5,5',
        transition: 'stroke 0.3s ease',
        ...style,
      }}
    />
  )
}


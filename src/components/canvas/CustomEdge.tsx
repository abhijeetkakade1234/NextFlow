// src/components/canvas/CustomEdge.tsx
'use client'
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react'

export function CustomEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: '#7c3aed',
        strokeWidth: 2,
        strokeDasharray: '8 4',
        animation: 'edge-flow 1.5s linear infinite',
        ...style,
      }}
    />
  )
}

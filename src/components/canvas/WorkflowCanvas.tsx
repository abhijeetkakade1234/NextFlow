// src/components/canvas/WorkflowCanvas.tsx
'use client'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import { useCallback, useEffect } from 'react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '@/store/workflow-store'
import { useUIStore } from '@/store/ui-store'
import { nodeTypes } from './nodeTypes'
import { CustomEdge } from './CustomEdge'
import { KeyboardHandler } from './KeyboardHandler'

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

function Canvas({ workflowId }: { workflowId: string }) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setViewport,
  } = useWorkflowStore()
  const setSelectedNodeIds = useUIStore(s => s.setSelectedNodeIds)
  const { screenToFlowPosition } = useReactFlow()

  // Expose workflowId globally for node run buttons
  useEffect(() => {
    (window as any).__currentWorkflowId = workflowId
  }, [workflowId])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNode(type, position)
  }, [screenToFlowPosition, addNode])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onSelectionChange = useCallback((params: { nodes: Array<{ id: string }> }) => {
    setSelectedNodeIds(params.nodes.map(n => n.id))
  }, [setSelectedNodeIds])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onSelectionChange={onSelectionChange}
      onMoveEnd={(_, viewport) => setViewport(viewport)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'custom', animated: true }}
      fitView
      deleteKeyCode={['Delete', 'Backspace']}
      className="bg-[#0a0a0a]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.5}
        color="#1f1f1f"
      />
      <MiniMap
        nodeColor="#7c3aed"
        maskColor="rgba(0,0,0,0.7)"
        position="bottom-right"
        style={{
          background: '#111111',
          border: '1px solid #1f1f1f',
          borderRadius: '8px',
        }}
      />
      <Controls
        position="bottom-left"
        style={{
          background: '#111111',
          border: '1px solid #1f1f1f',
        }}
      />
      <KeyboardHandler />
    </ReactFlow>
  )
}

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <Canvas workflowId={workflowId} />
      </div>
    </ReactFlowProvider>
  )
}

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
  getIncomers,
  Connection,
  Edge,
  Node,
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

  const isValidConnection = useCallback(
    (connection: any) => {
      const { source, target } = connection
      if (!source || !target || source === target) return false

      const targetBuilder = (node: Node, edges: Edge[]): boolean => {
        if (node.id === source) return true
        for (const incomer of getIncomers(node, nodes, edges)) {
          if (targetBuilder(incomer, edges)) return true
        }
        return false
      }

      const foundNode = nodes.find((n) => n.id === target)
      if (!foundNode) return false

      return !targetBuilder(foundNode, edges)
    },
    [nodes, edges]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onSelectionChange={onSelectionChange}
      onMoveEnd={(_, viewport) => setViewport(viewport)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ 
        type: 'custom', 
        animated: true,
        style: { strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.1)' } 
      }}
      fitView
      deleteKeyCode={['Delete', 'Backspace']}
      className="bg-transparent"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={40}
        size={1}
        color="rgba(255, 255, 255, 0.05)"
      />
      <MiniMap 
        position="bottom-right"
        className="!bg-krea-surface !border-krea-border !rounded-xl overflow-hidden shadow-krea"
        maskColor="rgba(0,0,0,0.4)"
        nodeColor="#7c3aed"
        nodeStrokeWidth={3}
        zoomable
        pannable
      />
      <KeyboardHandler />
    </ReactFlow>
  )
}


export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  return (
    <div className="w-full h-full">
      <Canvas workflowId={workflowId} />
    </div>
  )
}


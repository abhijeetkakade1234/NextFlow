// src/store/workflow-store.ts
'use client'
import { create } from 'zustand'
import { temporal } from 'zundo'
import { immer } from 'zustand/middleware/immer'
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Viewport,
} from '@xyflow/react'
import { AppNode, NodeData } from '@/types/nodes'
import { isValidConnection } from '@/lib/connection-validator'
import { createNode } from '@/lib/node-factory'

type WorkflowState = {
  workflowId: string | null
  workflowName: string
  nodes: AppNode[]
  edges: Edge[]
  viewport: Viewport
  isDirty: boolean
  isSaving: boolean

  setWorkflowId: (id: string) => void
  setWorkflowName: (name: string) => void
  loadWorkflow: (nodes: AppNode[], edges: Edge[], viewport?: Viewport) => void

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (type: string, position?: { x: number; y: number }) => void
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  deleteNode: (nodeId: string) => void

  setViewport: (viewport: Viewport) => void
  setIsSaving: (v: boolean) => void
  markClean: () => void
}

function wouldCreateCycle(edges: Edge[], newEdge: Edge): boolean {
  const allEdges = [...edges, newEdge]
  const adjacency = new Map<string, string[]>()

  for (const edge of allEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    adjacency.get(edge.source)!.push(edge.target)
  }

  const visited = new Set<string>()
  const stack = new Set<string>()

  function dfs(node: string): boolean {
    if (stack.has(node)) return true
    if (visited.has(node)) return false

    visited.add(node)
    stack.add(node)

    for (const neighbor of adjacency.get(node) ?? []) {
      if (dfs(neighbor)) return true
    }

    stack.delete(node)
    return false
  }

  return dfs(newEdge.source)
}

function getHandleType(nodeType: string, handleId: string): string {
  const map: Record<string, Record<string, string>> = {
    textNode:         { output: 'text' },
    uploadImageNode:  { output: 'image_url' },
    uploadVideoNode:  { output: 'video_url' },
    llmNode:          { system_prompt: 'text', user_message: 'text', images: 'image_url', output: 'text' },
    cropImageNode:    { image_url: 'image_url', x_percent: 'number', y_percent: 'number', width_percent: 'number', height_percent: 'number', output: 'image_url' },
    extractFrameNode: { video_url: 'video_url', timestamp: 'text', output: 'image_url' },
  }
  return map[nodeType]?.[handleId] ?? 'text'
}

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    immer((set, get) => ({
      workflowId: null,
      workflowName: 'Untitled Workflow',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      isSaving: false,

      setWorkflowId: (id) => set(s => { s.workflowId = id }),
      setWorkflowName: (name) => set(s => { s.workflowName = name; s.isDirty = true }),

      loadWorkflow: (nodes, edges, viewport) => set(s => {
        s.nodes = nodes
        s.edges = edges
        if (viewport) s.viewport = viewport
        s.isDirty = false
      }),

      onNodesChange: (changes) => set(s => {
        s.nodes = applyNodeChanges(changes, s.nodes) as AppNode[]
        s.isDirty = true
      }),

      onEdgesChange: (changes) => set(s => {
        s.edges = applyEdgeChanges(changes, s.edges)
        s.isDirty = true
      }),

      onConnect: (connection) => set(s => {
        const sourceNode = s.nodes.find(n => n.id === connection.source)
        const targetNode = s.nodes.find(n => n.id === connection.target)
        if (!sourceNode || !targetNode) return

        const sourceHandleType = getHandleType(sourceNode.type!, connection.sourceHandle!)
        const targetHandleType = getHandleType(targetNode.type!, connection.targetHandle!)

        if (!isValidConnection(sourceHandleType, targetHandleType)) {
          console.warn(`Invalid connection: ${sourceHandleType} → ${targetHandleType}`)
          return
        }

        const newEdge: Edge = {
          ...connection,
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          type: 'custom',
          animated: true,
          style: { stroke: '#7c3aed', strokeWidth: 2 },
        }

        if (wouldCreateCycle(s.edges, newEdge)) {
          console.warn('Cycle detected — connection rejected')
          return
        }

        s.edges = addEdge(newEdge, s.edges)
        s.isDirty = true
      }),

      addNode: (type, position) => set(s => {
        const pos = position ?? { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 }
        const node = createNode(type, pos)
        s.nodes.push(node)
        s.isDirty = true
      }),

      updateNodeData: (nodeId, data) => set(s => {
        const node = s.nodes.find(n => n.id === nodeId)
        if (node) {
          Object.assign(node.data, data)
          s.isDirty = true
        }
      }),

      deleteNode: (nodeId) => set(s => {
        s.nodes = s.nodes.filter(n => n.id !== nodeId)
        s.edges = s.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        s.isDirty = true
      }),

      setViewport: (viewport) => set(s => { s.viewport = viewport }),
      setIsSaving: (v) => set(s => { s.isSaving = v }),
      markClean: () => set(s => { s.isDirty = false }),
    })),
    {
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges }),
    }
  )
)

// Undo/redo hooks (from zundo)
export const useWorkflowHistory = () => useWorkflowStore.temporal.getState()

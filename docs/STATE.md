# NextFlow — State Management (Zustand)

## Overview
Three stores, each with single responsibility:
1. `workflow-store.ts` — React Flow state (nodes, edges, undo/redo)
2. `execution-store.ts` — per-node execution status + current run
3. `ui-store.ts` — sidebar state, selected run, collapse state

**Install `zundo` for undo/redo support:**
```bash
npm install zundo
```

---

## 1. workflow-store.ts

```typescript
// src/store/workflow-store.ts
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
  isDirty: boolean         // true when unsaved changes exist
  isSaving: boolean

  // Actions
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

// Using zundo for temporal state (undo/redo)
// Using immer for immutable updates
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
        // 1. Get handle types from node data
        const sourceNode = s.nodes.find(n => n.id === connection.source)
        const targetNode = s.nodes.find(n => n.id === connection.target)
        if (!sourceNode || !targetNode) return

        // 2. Validate connection type
        // (get handle types from the DOM data attributes or from a lookup map)
        const sourceHandleType = getHandleType(sourceNode.type!, connection.sourceHandle!)
        const targetHandleType = getHandleType(targetNode.type!, connection.targetHandle!)
        
        if (!isValidConnection(sourceHandleType, targetHandleType)) {
          // Connection rejected — React Flow will not add invalid edges
          // Optionally show a toast here
          console.warn(`Invalid connection: ${sourceHandleType} → ${targetHandleType}`)
          return
        }

        // 3. Check for cycles (DAG validation)
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
      // Only track nodes and edges in undo history, not metadata
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges }),
    }
  )
)

// Undo/redo hooks (from zundo)
export const useWorkflowHistory = () => useWorkflowStore.temporal.getState()

// ─── Cycle Detection (Kahn's Algorithm) ──────────────────────

function wouldCreateCycle(edges: Edge[], newEdge: Edge): boolean {
  const allEdges = [...edges, newEdge]
  const adjacency = new Map<string, string[]>()
  
  for (const edge of allEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    adjacency.get(edge.source)!.push(edge.target)
  }

  // DFS cycle detection
  const visited = new Set<string>()
  const stack = new Set<string>()
  
  function dfs(node: string): boolean {
    if (stack.has(node)) return true   // back edge = cycle
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

// ─── Handle Type Lookup ───────────────────────────────────────

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
```

---

## 2. execution-store.ts

```typescript
// src/store/execution-store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { RunStatus } from '@/types/execution'

type NodeStatus = 'idle' | 'running' | 'success' | 'error'

type ExecutionState = {
  // Per-node status for current run
  nodeStatuses: Record<string, NodeStatus>
  
  // Per-node output for current run (updated live as nodes complete)
  nodeOutputs: Record<string, string | null>
  
  // Current active run ID
  currentRunId: string | null
  
  // Is any execution in progress?
  isRunning: boolean

  // Actions
  startRun: (runId: string, nodeIds: string[]) => void
  setNodeStatus: (nodeId: string, status: NodeStatus) => void
  setNodeOutput: (nodeId: string, output: string) => void
  setNodeError: (nodeId: string, error: string) => void
  completeRun: () => void
  resetExecution: () => void
}

export const useExecutionStore = create<ExecutionState>()(
  immer((set) => ({
    nodeStatuses: {},
    nodeOutputs: {},
    currentRunId: null,
    isRunning: false,

    startRun: (runId, nodeIds) => set(s => {
      s.currentRunId = runId
      s.isRunning = true
      for (const nodeId of nodeIds) {
        s.nodeStatuses[nodeId] = 'running'
        s.nodeOutputs[nodeId] = null
      }
    }),

    setNodeStatus: (nodeId, status) => set(s => {
      s.nodeStatuses[nodeId] = status
    }),

    setNodeOutput: (nodeId, output) => set(s => {
      s.nodeOutputs[nodeId] = output
      s.nodeStatuses[nodeId] = 'success'
    }),

    setNodeError: (nodeId, error) => set(s => {
      s.nodeStatuses[nodeId] = 'error'
    }),

    completeRun: () => set(s => {
      s.isRunning = false
    }),

    resetExecution: () => set(s => {
      s.nodeStatuses = {}
      s.nodeOutputs = {}
      s.currentRunId = null
      s.isRunning = false
    }),
  }))
)
```

---

## 3. ui-store.ts

```typescript
// src/store/ui-store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type UIState = {
  // Sidebar collapse state
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  
  // History panel
  selectedRunId: string | null
  
  // Node selection for selective execution
  selectedNodeIds: string[]
  
  // Search in left sidebar
  nodeSearch: string

  // Actions
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setSelectedRunId: (id: string | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  setNodeSearch: (q: string) => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    selectedRunId: null,
    selectedNodeIds: [],
    nodeSearch: '',

    toggleLeftSidebar: () => set(s => { s.leftSidebarOpen = !s.leftSidebarOpen }),
    toggleRightSidebar: () => set(s => { s.rightSidebarOpen = !s.rightSidebarOpen }),
    setSelectedRunId: (id) => set(s => { s.selectedRunId = id }),
    setSelectedNodeIds: (ids) => set(s => { s.selectedNodeIds = ids }),
    setNodeSearch: (q) => set(s => { s.nodeSearch = q }),
  }))
)
```

---

## Undo/Redo Keyboard Shortcuts

```tsx
// Add to WorkflowCanvas.tsx or a dedicated KeyboardHandler component
'use client'
import { useEffect } from 'react'
import { useWorkflowHistory } from '@/store/workflow-store'

export function KeyboardHandler() {
  const { undo, redo } = useWorkflowHistory()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return null
}
```

---

## Auto-Save Hook

```typescript
// src/hooks/useAutoSave.ts
import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'

export function useAutoSave() {
  const { workflowId, nodes, edges, viewport, isDirty, setIsSaving, markClean } = useWorkflowStore()
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!isDirty || !workflowId) return

    // Debounce: wait 1500ms of inactivity before saving
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodesJson: nodes, edgesJson: edges, viewport }),
        })
        markClean()
      } catch (err) {
        console.error('Auto-save failed', err)
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => clearTimeout(timerRef.current)
  }, [nodes, edges, viewport, isDirty, workflowId])
}
```

---

## Connection Validator

```typescript
// src/lib/connection-validator.ts
export function isValidConnection(
  sourceType: string,
  targetType: string
): boolean {
  // Rules: what can connect to what
  const RULES: Record<string, string[]> = {
    text:      ['text', 'system_prompt', 'user_message', 'number', 'timestamp'],
    image_url: ['image_url', 'images'],
    video_url: ['video_url'],
    number:    ['number', 'text'],   // numbers can flow into text fields
  }
  return RULES[sourceType]?.includes(targetType) ?? false
}
```

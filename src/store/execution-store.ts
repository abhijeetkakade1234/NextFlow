// src/store/execution-store.ts
'use client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type NodeStatus = 'idle' | 'running' | 'success' | 'error'

type ExecutionState = {
  nodeStatuses: Record<string, NodeStatus>
  nodeOutputs: Record<string, string | null>
  currentRunId: string | null
  isRunning: boolean

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

    setNodeError: (nodeId) => set(s => {
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

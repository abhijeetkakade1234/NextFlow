// src/types/execution.ts

export type RunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELLED'
export type RunScope = 'FULL' | 'SELECTED' | 'SINGLE'
export type NodeStatus = 'idle' | 'running' | 'success' | 'error'

export type RunResult = {
  runId: string
  status: RunStatus
  nodeResults: NodeResultItem[]
  durationMs: number
}

export type NodeResultItem = {
  id: string
  nodeId: string
  nodeType: string
  nodeLabel?: string
  status: RunStatus
  inputs?: Record<string, unknown>
  output?: unknown
  error?: string
  startedAt: string
  completedAt?: string
  durationMs?: number
  triggerRunId?: string
}

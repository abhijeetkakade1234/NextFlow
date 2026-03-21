// src/types/workflow.ts
import { AppNode } from './nodes'
import { Edge } from '@xyflow/react'

export type WorkflowMeta = {
  id: string
  userId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  _count?: { runs: number }
}

export type WorkflowWithNodes = WorkflowMeta & {
  nodesJson: AppNode[]
  edgesJson: Edge[]
  viewport?: { x: number; y: number; zoom: number }
  runs?: WorkflowRun[]
}

export type WorkflowRun = {
  id: string
  workflowId: string
  userId: string
  scope: 'FULL' | 'SELECTED' | 'SINGLE'
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELLED'
  startedAt: string
  completedAt?: string
  durationMs?: number
  nodeIds: string[]
  createdAt: string
  nodeResults: NodeResult[]
}

export type NodeResult = {
  id: string
  runId: string
  nodeId: string
  nodeType: string
  nodeLabel?: string
  status: 'RUNNING' | 'SUCCESS' | 'FAILED'
  inputs?: unknown
  output?: unknown
  error?: string
  startedAt: string
  completedAt?: string
  durationMs?: number
  triggerRunId?: string
}

import { batch, task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

import type { textNodeTask } from './text-node-task'
import type { uploadImageNodeTask } from './upload-image-node-task'
import type { uploadVideoNodeTask } from './upload-video-node-task'
import type { llmTask } from './llm-task'
import type { cropImageTask } from './crop-image-task'
import type { extractFrameTask } from './extract-frame-task'

const ExecutionInputSchema = z.object({
  workflowId: z.string(),
  runId: z.string(),
  targetNodeIds: z.array(z.string()),
})

type FlowNode = {
  id: string
  type: string
  data: Record<string, unknown>
}

type FlowEdge = {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

type NodeResultRow = {
  id: string
  nodeId: string
  nodeType: string
}

type TaskId =
  | 'text-node-task'
  | 'upload-image-node-task'
  | 'upload-video-node-task'
  | 'llm-task'
  | 'crop-image-task'
  | 'extract-frame-task'

type BatchItem = {
  id: TaskId
  payload: Record<string, unknown>
  node: FlowNode
  nodeResultId: string
}

export const workflowExecutionTask = task({
  id: 'workflow-execution-task',
  maxDuration: 600,

  run: async (payload: z.infer<typeof ExecutionInputSchema>) => {
    const { workflowId, runId, targetNodeIds } = payload

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    })
    if (!workflow) throw new Error('Workflow not found')

    const allNodes = workflow.nodesJson as FlowNode[]
    const allEdges = workflow.edgesJson as FlowEdge[]

    const nodeResults = await prisma.nodeResult.findMany({
      where: { runId },
    })

    await executeWorkflow(allNodes, allEdges, targetNodeIds, runId, nodeResults)

    return { success: true }
  },
})

async function executeWorkflow(
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  targetNodeIds: string[],
  runId: string,
  nodeResults: NodeResultRow[]
): Promise<void> {
  const startTime = Date.now()

  const nodes = allNodes.filter((n) => targetNodeIds.includes(n.id))
  const edges = allEdges.filter((e) => targetNodeIds.includes(e.target))

  const deps = buildDependencyMap(nodes, edges)
  const completed = new Map<string, unknown>()
  let anyFailed = false
  let anySucceeded = false

  while (completed.size < nodes.length) {
    const wave = nodes.filter(
      (n) => !completed.has(n.id) && [...(deps.get(n.id) ?? [])].every((depId) => completed.has(depId))
    )

    if (wave.length === 0) break

    const batchItems: BatchItem[] = []

    for (const node of wave) {
      const nodeResult = nodeResults.find((nr) => nr.nodeId === node.id)
      if (!nodeResult) {
        completed.set(node.id, null)
        anyFailed = true
        continue
      }

      const inputs = resolveInputs(node, allNodes, edges, completed)
      await prisma.nodeResult.update({
        where: { id: nodeResult.id },
        data: {
          inputs: JSON.stringify(inputs),
          startedAt: new Date(),
          status: 'RUNNING',
          error: null,
        },
      })

      const buildResult = buildTaskBatchItem(node, inputs, nodeResult.id)
      if ('error' in buildResult) {
        await markNodeFailed(nodeResult.id, buildResult.error)
        completed.set(node.id, null)
        anyFailed = true
        continue
      }

      batchItems.push({ ...buildResult, node, nodeResultId: nodeResult.id })
    }

    if (batchItems.length === 0) {
      continue
    }

    let result:
      | Awaited<
          ReturnType<
            typeof batch.triggerAndWait<
              | typeof textNodeTask
              | typeof uploadImageNodeTask
              | typeof uploadVideoNodeTask
              | typeof llmTask
              | typeof cropImageTask
              | typeof extractFrameTask
            >
          >
        >
      | null = null

    try {
      result = await batch.triggerAndWait<
        | typeof textNodeTask
        | typeof uploadImageNodeTask
        | typeof uploadVideoNodeTask
        | typeof llmTask
        | typeof cropImageTask
        | typeof extractFrameTask
      >(batchItems.map((item) => ({ id: item.id, payload: item.payload })) as any)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task batch failed'
      for (const batchItem of batchItems) {
        await markNodeFailed(batchItem.nodeResultId, message)
        completed.set(batchItem.node.id, null)
        anyFailed = true
      }
      continue
    }

    for (let i = 0; i < batchItems.length; i++) {
      const batchItem = batchItems[i]
      const runResult = result.runs[i]
      if (runResult?.ok) {
        completed.set(batchItem.node.id, extractTaskOutput(batchItem.id, runResult.output))
        anySucceeded = true
        continue
      }

      await markNodeFailed(batchItem.nodeResultId, String(runResult?.error ?? 'Task failed'))
      completed.set(batchItem.node.id, null)
      anyFailed = true
    }
  }

  const finalStatus = anyFailed ? (anySucceeded ? 'PARTIAL' : 'FAILED') : 'SUCCESS'

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    },
  })
}

async function markNodeFailed(nodeResultId: string, errorMessage: string): Promise<void> {
  await prisma.nodeResult.update({
    where: { id: nodeResultId },
    data: {
      status: 'FAILED',
      error: errorMessage,
      completedAt: new Date(),
      durationMs: 0,
    },
  })
}

function buildTaskBatchItem(
  node: FlowNode,
  inputs: Record<string, unknown>,
  nodeResultId: string
): { id: TaskId; payload: Record<string, unknown> } | { error: string } {
  if (node.type === 'textNode') {
    return {
      id: 'text-node-task',
      payload: {
        nodeResultId,
        content: String(node.data.content ?? ''),
      },
    }
  }

  if (node.type === 'uploadImageNode') {
    const imageUrl = (node.data.imageUrl as string | null | undefined) ?? null
    if (!imageUrl) return { error: 'Missing required input: image_url' }
    return {
      id: 'upload-image-node-task',
      payload: {
        nodeResultId,
        imageUrl,
      },
    }
  }

  if (node.type === 'uploadVideoNode') {
    const videoUrl = (node.data.videoUrl as string | null | undefined) ?? null
    if (!videoUrl) return { error: 'Missing required input: video_url' }
    return {
      id: 'upload-video-node-task',
      payload: {
        nodeResultId,
        videoUrl,
      },
    }
  }

  if (node.type === 'llmNode') {
    const userMessage =
      (inputs.user_message as string | undefined) ??
      (node.data.manualUserMessage as string | undefined) ??
      ''

    if (!userMessage.trim()) {
      return { error: 'Missing required input: user_message' }
    }

    const imageValues = inputs.images
    const imageUrls = Array.isArray(imageValues)
      ? imageValues.filter((value): value is string => typeof value === 'string')
      : []

    return {
      id: 'llm-task',
      payload: {
        nodeResultId,
        model: node.data.model as string,
        systemPrompt:
          (inputs.system_prompt as string | undefined) ??
          (node.data.manualSystemPrompt as string | undefined),
        userMessage,
        imageUrls,
      },
    }
  }

  if (node.type === 'cropImageNode') {
    const imageUrl = inputs.image_url as string | undefined
    if (!imageUrl) return { error: 'Missing required input: image_url' }

    return {
      id: 'crop-image-task',
      payload: {
        nodeResultId,
        imageUrl,
        xPercent: Number(inputs.x_percent ?? node.data.xPercent ?? 0),
        yPercent: Number(inputs.y_percent ?? node.data.yPercent ?? 0),
        widthPercent: Number(inputs.width_percent ?? node.data.widthPercent ?? 100),
        heightPercent: Number(inputs.height_percent ?? node.data.heightPercent ?? 100),
      },
    }
  }

  if (node.type === 'extractFrameNode') {
    const videoUrl = inputs.video_url as string | undefined
    if (!videoUrl) return { error: 'Missing required input: video_url' }

    return {
      id: 'extract-frame-task',
      payload: {
        nodeResultId,
        videoUrl,
        timestamp: String(inputs.timestamp ?? node.data.timestamp ?? '0'),
      },
    }
  }

  return { error: `Unsupported node type: ${node.type}` }
}

function extractTaskOutput(taskId: TaskId, output: unknown): unknown {
  if (taskId === 'text-node-task') {
    return (output as { text?: string })?.text ?? null
  }

  if (taskId === 'llm-task') {
    return (output as { text?: string })?.text ?? null
  }

  if (
    taskId === 'upload-image-node-task' ||
    taskId === 'upload-video-node-task' ||
    taskId === 'crop-image-task' ||
    taskId === 'extract-frame-task'
  ) {
    return (output as { url?: string })?.url ?? null
  }

  return output
}

function buildDependencyMap(nodes: FlowNode[], edges: FlowEdge[]) {
  const deps = new Map<string, Set<string>>()
  const targetSet = new Set(nodes.map((n) => n.id))
  for (const node of nodes) deps.set(node.id, new Set())
  for (const edge of edges) {
    if (targetSet.has(edge.source) && targetSet.has(edge.target)) {
      deps.get(edge.target)?.add(edge.source)
    }
  }
  return deps
}

function getStaticNodeOutput(sourceNode: FlowNode | undefined): unknown {
  if (!sourceNode) return undefined

  if (sourceNode.type === 'textNode') {
    return sourceNode.data.content
  }

  if (sourceNode.type === 'uploadImageNode') {
    return sourceNode.data.imageUrl
  }

  if (sourceNode.type === 'uploadVideoNode') {
    return sourceNode.data.videoUrl
  }

  return undefined
}

function resolveInputs(
  node: FlowNode,
  allNodes: FlowNode[],
  edges: FlowEdge[],
  completed: Map<string, unknown>
) {
  const inputs: Record<string, unknown> = {}
  const incomingEdges = edges.filter((e) => e.target === node.id)
  const nodeById = new Map(allNodes.map((n) => [n.id, n]))

  for (const edge of incomingEdges) {
    const upstreamOutput = completed.has(edge.source)
      ? completed.get(edge.source)
      : getStaticNodeOutput(nodeById.get(edge.source))

    if (upstreamOutput === undefined || upstreamOutput === null) {
      continue
    }

    if (edge.targetHandle === 'images') {
      const existing = inputs.images
      inputs.images = Array.isArray(existing) ? [...existing, upstreamOutput] : [upstreamOutput]
      continue
    }

    inputs[edge.targetHandle] = upstreamOutput
  }

  return inputs
}

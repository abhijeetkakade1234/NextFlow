// src/lib/execution-engine.ts
import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '@/lib/prisma'

// Import task type shapes for triggerAndWait inference
import type { llmTask } from '@/trigger/llm-task'
import type { cropImageTask } from '@/trigger/crop-image-task'
import type { extractFrameTask } from '@/trigger/extract-frame-task'

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

// ─── Main Entry Point ─────────────────────────────────────────

export async function executeWorkflow(
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  targetNodeIds: string[],
  runId: string,
  nodeResults: NodeResultRow[]
): Promise<void> {
  const startTime = Date.now()

  const nodes = allNodes.filter(n => targetNodeIds.includes(n.id))
  const edges = allEdges.filter(
    e => targetNodeIds.includes(e.source) && targetNodeIds.includes(e.target)
  )

  const deps = buildDependencyMap(nodes, edges)
  const completed = new Map<string, unknown>()
  let anyFailed = false
  let anySucceeded = false

  while (completed.size < nodes.length) {
    const wave = nodes.filter(n =>
      !completed.has(n.id) &&
      [...(deps.get(n.id) ?? [])].every(depId => completed.has(depId))
    )

    if (wave.length === 0) {
      console.error('Execution deadlock — breaking')
      break
    }

    const waveResults = await Promise.allSettled(
      wave.map(node => executeNode(node, edges, completed, nodeResults, runId))
    )

    for (let i = 0; i < wave.length; i++) {
      const node = wave[i]
      const result = waveResults[i]
      if (result.status === 'fulfilled') {
        completed.set(node.id, result.value)
        anySucceeded = true
      } else {
        completed.set(node.id, null)
        anyFailed = true
      }
    }
  }

  const finalStatus = anyFailed
    ? (anySucceeded ? 'PARTIAL' : 'FAILED')
    : 'SUCCESS'

  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    },
  })
}

// ─── Execute a Single Node ────────────────────────────────────

async function executeNode(
  node: FlowNode,
  edges: FlowEdge[],
  completed: Map<string, unknown>,
  nodeResults: NodeResultRow[],
  _runId: string
): Promise<unknown> {
  const nodeResult = nodeResults.find(nr => nr.nodeId === node.id)
  if (!nodeResult) throw new Error(`No nodeResult for ${node.id}`)

  const inputs = resolveInputs(node, edges, completed)

  await prisma.nodeResult.update({
    where: { id: nodeResult.id },
    data: { inputs: JSON.stringify(inputs) },
  })

  switch (node.type) {
    case 'textNode': {
      const output = node.data.content as string
      await prisma.nodeResult.update({
        where: { id: nodeResult.id },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ text: output }),
          completedAt: new Date(),
          durationMs: 0,
        },
      })
      return output
    }

    case 'uploadImageNode':
    case 'uploadVideoNode': {
      const url = (node.data.imageUrl ?? node.data.videoUrl) as string | null
      if (!url) throw new Error('No file uploaded')
      await prisma.nodeResult.update({
        where: { id: nodeResult.id },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ url }),
          completedAt: new Date(),
          durationMs: 0,
        },
      })
      return url
    }

    case 'llmNode': {
      const result = await tasks.triggerAndWait<typeof llmTask>('llm-task', {
        nodeResultId: nodeResult.id,
        model: node.data.model as string,
        systemPrompt: (inputs.system_prompt as string | undefined) ?? (node.data.manualSystemPrompt as string | undefined),
        userMessage: (inputs.user_message as string | undefined) ?? (node.data.manualUserMessage as string),
        imageUrls: inputs.images ? [inputs.images].flat() as string[] : [],
      })
      if (!result.ok) throw new Error('LLM task failed')
      return result.output.text
    }

    case 'cropImageNode': {
      const imageUrl = inputs.image_url as string | undefined
      if (!imageUrl) throw new Error('No image_url input for crop node')
      const result = await tasks.triggerAndWait<typeof cropImageTask>('crop-image-task', {
        nodeResultId: nodeResult.id,
        imageUrl,
        xPercent: Number(inputs.x_percent ?? node.data.xPercent ?? 0),
        yPercent: Number(inputs.y_percent ?? node.data.yPercent ?? 0),
        widthPercent: Number(inputs.width_percent ?? node.data.widthPercent ?? 100),
        heightPercent: Number(inputs.height_percent ?? node.data.heightPercent ?? 100),
      })
      if (!result.ok) throw new Error('Crop task failed')
      return result.output.url
    }

    case 'extractFrameNode': {
      const videoUrl = inputs.video_url as string | undefined
      if (!videoUrl) throw new Error('No video_url input for extract frame node')
      const result = await tasks.triggerAndWait<typeof extractFrameTask>('extract-frame-task', {
        nodeResultId: nodeResult.id,
        videoUrl,
        timestamp: String(inputs.timestamp ?? node.data.timestamp ?? '0'),
      })
      if (!result.ok) throw new Error('Extract frame task failed')
      return result.output.url
    }

    default:
      throw new Error(`Unknown node type: ${node.type}`)
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function buildDependencyMap(
  nodes: FlowNode[],
  edges: FlowEdge[]
): Map<string, Set<string>> {
  const deps = new Map<string, Set<string>>()
  for (const node of nodes) {
    deps.set(node.id, new Set())
  }
  for (const edge of edges) {
    deps.get(edge.target)?.add(edge.source)
  }
  return deps
}

function resolveInputs(
  node: FlowNode,
  edges: FlowEdge[],
  completed: Map<string, unknown>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}
  const incomingEdges = edges.filter(e => e.target === node.id)

  for (const edge of incomingEdges) {
    const upstreamOutput = completed.get(edge.source)
    if (upstreamOutput !== undefined && upstreamOutput !== null) {
      if (edge.targetHandle === 'images') {
        const existing = inputs.images
        inputs.images = Array.isArray(existing)
          ? [...existing, upstreamOutput]
          : [upstreamOutput]
      } else {
        inputs[edge.targetHandle] = upstreamOutput
      }
    }
  }

  return inputs
}

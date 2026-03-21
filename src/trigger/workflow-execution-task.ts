// src/trigger/workflow-execution-task.ts
import { task, tasks } from '@trigger.dev/sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// Import task type shapes for triggerAndWait inference
import type { llmTask } from './llm-task'
import type { cropImageTask } from './crop-image-task'
import type { extractFrameTask } from './extract-frame-task'

const ExecutionInputSchema = z.object({
  workflowId:    z.string(),
  runId:         z.string(),
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

export const workflowExecutionTask = task({
  id: 'workflow-execution-task',
  maxDuration: 600,
  
  run: async (payload: z.infer<typeof ExecutionInputSchema>) => {
    const { workflowId, runId, targetNodeIds } = payload

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    })
    if (!workflow) throw new Error('Workflow not found')

    const allNodes = workflow.nodesJson as any[]
    const allEdges = workflow.edgesJson as any[]

    const nodeResults = await prisma.nodeResult.findMany({
      where: { runId },
    })

    await executeWorkflow(allNodes, allEdges, targetNodeIds, runId, nodeResults)

    return { success: true }
  },
})

// ─── Execution Logic (Inlined to avoid circular deps) ──────────

async function executeWorkflow(
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

    if (wave.length === 0) break

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
      const result = await tasks.triggerAndWait<typeof cropImageTask>('crop-image-task', {
        nodeResultId: nodeResult.id,
        imageUrl: inputs.image_url as string,
        xPercent: Number(inputs.x_percent ?? node.data.xPercent ?? 0),
        yPercent: Number(inputs.y_percent ?? node.data.yPercent ?? 0),
        widthPercent: Number(inputs.width_percent ?? node.data.widthPercent ?? 100),
        heightPercent: Number(inputs.height_percent ?? node.data.heightPercent ?? 100),
      })
      if (!result.ok) throw new Error('Crop task failed')
      return result.output.url
    }
    default: return null
  }
}

function buildDependencyMap(nodes: FlowNode[], edges: FlowEdge[]) {
  const deps = new Map<string, Set<string>>()
  for (const node of nodes) deps.set(node.id, new Set())
  for (const edge of edges) deps.get(edge.target)?.add(edge.source)
  return deps
}

function resolveInputs(node: FlowNode, edges: FlowEdge[], completed: Map<string, unknown>) {
  const inputs: Record<string, unknown> = {}
  const incomingEdges = edges.filter(e => e.target === node.id)
  for (const edge of incomingEdges) {
    const upstreamOutput = completed.get(edge.source)
    if (upstreamOutput !== undefined && upstreamOutput !== null) {
      if (edge.targetHandle === 'images') {
        const existing = inputs.images
        inputs.images = Array.isArray(existing) ? [...existing, upstreamOutput] : [upstreamOutput]
      } else {
        inputs[edge.targetHandle] = upstreamOutput
      }
    }
  }
  return inputs
}

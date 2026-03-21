# NextFlow — Execution Engine + Sample Workflow

## lib/execution-engine.ts (Complete)

```typescript
// src/lib/execution-engine.ts
import { tasks } from '@trigger.dev/sdk/v3'
import { llmTask } from '@/trigger/llm-task'
import { cropImageTask } from '@/trigger/crop-image-task'
import { extractFrameTask } from '@/trigger/extract-frame-task'
import { prisma } from '@/lib/prisma'

type FlowNode = {
  id: string
  type: string
  data: Record<string, any>
}

type FlowEdge = {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

type NodeResult = {
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
  nodeResults: NodeResult[]
): Promise<void> {
  const startTime = Date.now()

  // 1. Filter to only target nodes and their relevant edges
  const nodes = allNodes.filter(n => targetNodeIds.includes(n.id))
  const edges = allEdges.filter(
    e => targetNodeIds.includes(e.source) && targetNodeIds.includes(e.target)
  )

  // 2. Build dependency map: nodeId → Set of nodeIds it depends on
  const deps = buildDependencyMap(nodes, edges)

  // 3. Execute in topological waves
  const completed = new Map<string, any>()  // nodeId → output value
  let anyFailed = false
  let anySucceeded = false

  while (completed.size < nodes.length) {
    // Find nodes whose all dependencies are satisfied
    const wave = nodes.filter(n =>
      !completed.has(n.id) &&
      [...(deps.get(n.id) ?? [])].every(depId => completed.has(depId))
    )

    if (wave.length === 0) {
      // Deadlock — shouldn't happen if DAG validation works, but guard anyway
      console.error('Execution deadlock — breaking')
      break
    }

    // 4. Execute all nodes in this wave CONCURRENTLY
    const waveResults = await Promise.allSettled(
      wave.map(node => executeNode(node, edges, completed, nodeResults, runId))
    )

    // 5. Collect results
    for (let i = 0; i < wave.length; i++) {
      const node = wave[i]
      const result = waveResults[i]

      if (result.status === 'fulfilled') {
        completed.set(node.id, result.value)
        anySucceeded = true
      } else {
        // Node failed — mark as completed with error sentinel so downstream can still check
        completed.set(node.id, null)
        anyFailed = true
      }
    }
  }

  // 6. Update run status
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
  completed: Map<string, any>,
  nodeResults: NodeResult[],
  runId: string
): Promise<any> {
  const nodeResult = nodeResults.find(nr => nr.nodeId === node.id)
  if (!nodeResult) throw new Error(`No nodeResult for ${node.id}`)

  // Resolve input values from connected upstream nodes
  const inputs = resolveInputs(node, edges, completed)

  // Update inputs in DB
  await prisma.nodeResult.update({
    where: { id: nodeResult.id },
    data: { inputs: JSON.stringify(inputs) },
  })

  // Dispatch to correct Trigger.dev task
  switch (node.type) {
    case 'textNode': {
      // Text node has no execution — its output is just data.content
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
      // Upload nodes have no execution — output is already the uploaded URL
      const url = node.data.imageUrl ?? node.data.videoUrl
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
      const result = await tasks.triggerAndWait(llmTask, {
        nodeResultId: nodeResult.id,
        model: node.data.model,
        systemPrompt: inputs.system_prompt ?? node.data.manualSystemPrompt ?? undefined,
        userMessage: inputs.user_message ?? node.data.manualUserMessage,
        imageUrls: inputs.images ? [inputs.images].flat() : [],
      })
      if (!result.ok) throw new Error(result.error ?? 'LLM task failed')
      return result.output.text
    }

    case 'cropImageNode': {
      const imageUrl = inputs.image_url
      if (!imageUrl) throw new Error('No image_url input for crop node')
      
      const result = await tasks.triggerAndWait(cropImageTask, {
        nodeResultId: nodeResult.id,
        imageUrl,
        xPercent: Number(inputs.x_percent ?? node.data.xPercent ?? 0),
        yPercent: Number(inputs.y_percent ?? node.data.yPercent ?? 0),
        widthPercent: Number(inputs.width_percent ?? node.data.widthPercent ?? 100),
        heightPercent: Number(inputs.height_percent ?? node.data.heightPercent ?? 100),
      })
      if (!result.ok) throw new Error(result.error ?? 'Crop task failed')
      return result.output.url
    }

    case 'extractFrameNode': {
      const videoUrl = inputs.video_url
      if (!videoUrl) throw new Error('No video_url input for extract frame node')
      
      const result = await tasks.triggerAndWait(extractFrameTask, {
        nodeResultId: nodeResult.id,
        videoUrl,
        timestamp: String(inputs.timestamp ?? node.data.timestamp ?? '0'),
      })
      if (!result.ok) throw new Error(result.error ?? 'Extract frame task failed')
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
  completed: Map<string, any>
): Record<string, any> {
  const inputs: Record<string, any> = {}
  const incomingEdges = edges.filter(e => e.target === node.id)

  for (const edge of incomingEdges) {
    const upstreamOutput = completed.get(edge.source)
    if (upstreamOutput !== undefined && upstreamOutput !== null) {
      // For "images" handle — support multiple connections (array)
      if (edge.targetHandle === 'images') {
        if (!inputs.images) inputs.images = []
        inputs.images.push(upstreamOutput)
      } else {
        inputs[edge.targetHandle] = upstreamOutput
      }
    }
  }

  return inputs
}
```

---

## Sample Workflow (Product Marketing Kit Generator)

```typescript
// src/lib/sample-workflow.ts
import { AppNode } from '@/types/nodes'
import { Edge } from '@xyflow/react'

export const SAMPLE_NODES: AppNode[] = [
  // ─── Branch A ──────────────────────────────────

  {
    id: 'upload-image-1',
    type: 'uploadImageNode',
    position: { x: 80, y: 80 },
    data: { label: 'Upload Image', imageUrl: null, fileName: null },
  },
  {
    id: 'crop-image-1',
    type: 'cropImageNode',
    position: { x: 400, y: 80 },
    data: {
      label: 'Crop Image',
      xPercent: 10, yPercent: 10, widthPercent: 80, heightPercent: 80,
      result: null, isRunning: false, error: null,
    },
  },
  {
    id: 'text-system-1',
    type: 'textNode',
    position: { x: 400, y: 300 },
    data: {
      label: 'System Prompt',
      content: 'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.',
    },
  },
  {
    id: 'text-product-1',
    type: 'textNode',
    position: { x: 400, y: 460 },
    data: {
      label: 'Product Details',
      content: 'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.',
    },
  },
  {
    id: 'llm-1',
    type: 'llmNode',
    position: { x: 720, y: 200 },
    data: {
      label: 'Product Description LLM',
      model: 'gemini-1.5-flash',
      manualSystemPrompt: '',
      manualUserMessage: '',
      result: null, isRunning: false, error: null,
    },
  },

  // ─── Branch B ──────────────────────────────────

  {
    id: 'upload-video-1',
    type: 'uploadVideoNode',
    position: { x: 80, y: 600 },
    data: { label: 'Upload Video', videoUrl: null, fileName: null },
  },
  {
    id: 'extract-frame-1',
    type: 'extractFrameNode',
    position: { x: 400, y: 600 },
    data: { label: 'Extract Frame', timestamp: '50%', result: null, isRunning: false, error: null },
  },

  // ─── Convergence ───────────────────────────────

  {
    id: 'text-system-2',
    type: 'textNode',
    position: { x: 1040, y: 100 },
    data: {
      label: 'Social Media Prompt',
      content: 'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.',
    },
  },
  {
    id: 'llm-2',
    type: 'llmNode',
    position: { x: 1040, y: 300 },
    data: {
      label: 'Final Marketing Summary',
      model: 'gemini-1.5-flash',
      manualSystemPrompt: '',
      manualUserMessage: '',
      result: null, isRunning: false, error: null,
    },
  },
]

export const SAMPLE_EDGES: Edge[] = [
  // Branch A connections
  { id: 'e1', source: 'upload-image-1', sourceHandle: 'output',  target: 'crop-image-1',  targetHandle: 'image_url',     type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e2', source: 'crop-image-1',   sourceHandle: 'output',  target: 'llm-1',         targetHandle: 'images',        type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e3', source: 'text-system-1',  sourceHandle: 'output',  target: 'llm-1',         targetHandle: 'system_prompt', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e4', source: 'text-product-1', sourceHandle: 'output',  target: 'llm-1',         targetHandle: 'user_message',  type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },

  // Branch B connections
  { id: 'e5', source: 'upload-video-1', sourceHandle: 'output',  target: 'extract-frame-1', targetHandle: 'video_url',   type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },

  // Convergence connections
  { id: 'e6', source: 'text-system-2',  sourceHandle: 'output',  target: 'llm-2',         targetHandle: 'system_prompt', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e7', source: 'llm-1',          sourceHandle: 'output',  target: 'llm-2',         targetHandle: 'user_message',  type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e8', source: 'crop-image-1',   sourceHandle: 'output',  target: 'llm-2',         targetHandle: 'images',        type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e9', source: 'extract-frame-1', sourceHandle: 'output', target: 'llm-2',         targetHandle: 'images',        type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
]

export const SAMPLE_WORKFLOW = {
  name: 'Product Marketing Kit Generator',
  nodes: SAMPLE_NODES,
  edges: SAMPLE_EDGES,
}
```

---

## Custom Animated Edge

```tsx
// src/components/canvas/CustomEdge.tsx
'use client'
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react'

export function CustomEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: '#7c3aed',
        strokeWidth: 2,
        strokeDasharray: '8 4',
        animation: 'edge-flow 1.5s linear infinite',
        ...style,
      }}
    />
  )
}
```

---

## Right Sidebar: Run History

```tsx
// src/components/sidebar/RunHistoryList.tsx
'use client'
import { formatDistanceToNow } from 'date-fns'
import { useUIStore } from '@/store/ui-store'

const STATUS_COLORS = {
  SUCCESS:  'bg-green-500/20 text-green-400 border-green-500/30',
  FAILED:   'bg-red-500/20 text-red-400 border-red-500/30',
  RUNNING:  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  PARTIAL:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

const SCOPE_LABELS = {
  FULL:     'Full Run',
  SELECTED: 'Selected',
  SINGLE:   'Single Node',
}

export function RunHistoryList({ runs }: { runs: any[] }) {
  const { selectedRunId, setSelectedRunId } = useUIStore()

  return (
    <div className="space-y-2 p-3">
      {runs.map(run => (
        <button
          key={run.id}
          onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}
          className="w-full text-left p-3 rounded-lg border border-krea-border 
                     hover:border-krea-border-hover bg-krea-surface transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[run.status as keyof typeof STATUS_COLORS]}`}>
              {run.status}
            </span>
            <span className="text-xs text-krea-muted">
              {SCOPE_LABELS[run.scope as keyof typeof SCOPE_LABELS]}
            </span>
          </div>
          <div className="text-xs text-krea-muted">
            {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
            {run.durationMs && ` · ${(run.durationMs / 1000).toFixed(1)}s`}
          </div>
        </button>
      ))}
    </div>
  )
}
```

```tsx
// src/components/sidebar/RunHistoryDetail.tsx
'use client'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_ICONS = {
  SUCCESS: <CheckCircle size={12} className="text-green-400" />,
  FAILED:  <XCircle size={12} className="text-red-400" />,
  RUNNING: <Clock size={12} className="text-indigo-400" />,
}

export function RunHistoryDetail({ run }: { run: any }) {
  return (
    <div className="p-3">
      <h3 className="text-sm font-medium text-krea-text mb-3">
        Run #{run.id.slice(-6)} · {run.scope}
      </h3>
      <div className="space-y-2">
        {run.nodeResults.map((nr: any) => (
          <div key={nr.id} className="p-2 rounded-lg bg-krea-bg border border-krea-border">
            <div className="flex items-center gap-2 mb-1">
              {STATUS_ICONS[nr.status as keyof typeof STATUS_ICONS]}
              <span className="text-xs font-medium text-krea-text">{nr.nodeLabel ?? nr.nodeType}</span>
              {nr.durationMs && (
                <span className="text-xs text-krea-muted ml-auto">
                  {(nr.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            {nr.output && (
              <p className="text-xs text-krea-muted truncate">
                Output: {JSON.stringify(JSON.parse(nr.output as string)).slice(0, 80)}...
              </p>
            )}
            {nr.error && (
              <p className="text-xs text-red-400">Error: {nr.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

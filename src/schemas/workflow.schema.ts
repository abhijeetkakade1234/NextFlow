import { z } from 'zod'

const NODE_TYPES = [
  'textNode',
  'uploadImageNode',
  'uploadVideoNode',
  'llmNode',
  'cropImageNode',
  'extractFrameNode',
] as const

const SOURCE_HANDLE_MAP: Record<(typeof NODE_TYPES)[number], readonly string[]> = {
  textNode: ['output'],
  uploadImageNode: ['output'],
  uploadVideoNode: ['output'],
  llmNode: ['output'],
  cropImageNode: ['output'],
  extractFrameNode: ['output'],
}

const TARGET_HANDLE_MAP: Record<(typeof NODE_TYPES)[number], readonly string[]> = {
  textNode: [],
  uploadImageNode: [],
  uploadVideoNode: [],
  llmNode: ['system_prompt', 'user_message', 'images'],
  cropImageNode: ['image_url', 'x_percent', 'y_percent', 'width_percent', 'height_percent'],
  extractFrameNode: ['video_url', 'timestamp'],
}

type HandleType = 'text' | 'image_url' | 'video_url' | 'number'

function getHandleType(nodeType: string, handleId: string): HandleType | null {
  const map: Record<string, Record<string, HandleType>> = {
    textNode: { output: 'text' },
    uploadImageNode: { output: 'image_url' },
    uploadVideoNode: { output: 'video_url' },
    llmNode: { system_prompt: 'text', user_message: 'text', images: 'image_url', output: 'text' },
    cropImageNode: {
      image_url: 'image_url',
      x_percent: 'number',
      y_percent: 'number',
      width_percent: 'number',
      height_percent: 'number',
      output: 'image_url',
    },
    extractFrameNode: { video_url: 'video_url', timestamp: 'text', output: 'image_url' },
  }
  return map[nodeType]?.[handleId] ?? null
}

const NODE_TYPE_VALUES = new Set<string>(NODE_TYPES)

const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

const ViewportSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite(),
})

const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: PositionSchema,
  data: z.record(z.string(), z.unknown()),
}).passthrough()

const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().min(1).nullable(),
  targetHandle: z.string().min(1).nullable(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  style: z.record(z.string(), z.unknown()).optional(),
}).passthrough()

function refineGraph(
  payload: {
    nodesJson: Array<z.infer<typeof WorkflowNodeSchema>>
    edgesJson: Array<z.infer<typeof WorkflowEdgeSchema>>
  },
  ctx: z.RefinementCtx
) {
  const nodeMap = new Map<string, string>()

  payload.nodesJson.forEach((node, index) => {
    if (!NODE_TYPE_VALUES.has(node.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported node type: ${node.type}`,
        path: ['nodesJson', index, 'type'],
      })
      return
    }
    nodeMap.set(node.id, node.type)
  })

  payload.edgesJson.forEach((edge, index) => {
    const sourceType = nodeMap.get(edge.source)
    const targetType = nodeMap.get(edge.target)

    if (!sourceType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge source does not exist: ${edge.source}`,
        path: ['edgesJson', index, 'source'],
      })
      return
    }

    if (!targetType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge target does not exist: ${edge.target}`,
        path: ['edgesJson', index, 'target'],
      })
      return
    }

    const allowedSources = SOURCE_HANDLE_MAP[sourceType as (typeof NODE_TYPES)[number]]
    const allowedTargets = TARGET_HANDLE_MAP[targetType as (typeof NODE_TYPES)[number]]
    const sourceHandle = edge.sourceHandle ?? ''
    const targetHandle = edge.targetHandle ?? ''

    if (!allowedSources.includes(sourceHandle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid source handle '${sourceHandle || 'null'}' for ${sourceType}`,
        path: ['edgesJson', index, 'sourceHandle'],
      })
    }

    if (!allowedTargets.includes(targetHandle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid target handle '${targetHandle || 'null'}' for ${targetType}`,
        path: ['edgesJson', index, 'targetHandle'],
      })
      return
    }

    const sourceHandleType = getHandleType(sourceType, sourceHandle)
    const targetHandleType = getHandleType(targetType, targetHandle)
    if (sourceHandleType && targetHandleType && sourceHandleType !== targetHandleType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Type mismatch: ${sourceHandleType} -> ${targetHandleType}`,
        path: ['edgesJson', index],
      })
    }
  })
}

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).default('Untitled Workflow'),
  description: z.string().max(500).optional(),
})

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodesJson: z.array(WorkflowNodeSchema).optional(),
  edgesJson: z.array(WorkflowEdgeSchema).optional(),
  viewport: ViewportSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.nodesJson || !value.edgesJson) return
  refineGraph({ nodesJson: value.nodesJson, edgesJson: value.edgesJson }, ctx)
})

export const ImportWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodesJson: z.array(WorkflowNodeSchema),
  edgesJson: z.array(WorkflowEdgeSchema),
  viewport: ViewportSchema.optional(),
}).superRefine((value, ctx) => {
  refineGraph(value, ctx)
})

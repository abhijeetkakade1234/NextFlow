// src/schemas/run.schema.ts
import { z } from 'zod'

export const CreateRunSchema = z.object({
  workflowId: z.string().cuid(),
  scope: z.enum(['FULL', 'SELECTED', 'SINGLE']),
  nodeIds: z.array(z.string()).optional(),
  nodeId: z.string().optional(),
}).refine(
  data => data.scope !== 'SELECTED' || (data.nodeIds && data.nodeIds.length > 0),
  { message: 'nodeIds required for SELECTED scope' }
).refine(
  data => data.scope !== 'SINGLE' || !!data.nodeId,
  { message: 'nodeId required for SINGLE scope' }
)

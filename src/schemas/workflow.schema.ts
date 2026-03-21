// src/schemas/workflow.schema.ts
import { z } from 'zod'

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).default('Untitled Workflow'),
  description: z.string().max(500).optional(),
})

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodesJson: z.array(z.any()).optional(),
  edgesJson: z.array(z.any()).optional(),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  }).optional(),
})

export const ImportWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  nodesJson: z.array(z.any()),
  edgesJson: z.array(z.any()),
})

// src/schemas/upload.schema.ts
import { z } from 'zod'

export const UploadParamsSchema = z.object({
  fileType: z.enum(['image', 'video']),
  fileName: z.string(),
})

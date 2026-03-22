import { task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const UploadImageNodeInputSchema = z.object({
  nodeResultId: z.string(),
  imageUrl: z.string().url(),
})

export const uploadImageNodeTask = task({
  id: 'upload-image-node-task',
  maxDuration: 30,
  run: async (payload: z.infer<typeof UploadImageNodeInputSchema>, { ctx }) => {
    const startTime = Date.now()
    const { nodeResultId, imageUrl } = payload

    try {
      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ url: imageUrl }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })

      return { success: true as const, url: imageUrl }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'FAILED',
          error: message,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })
      throw error
    }
  },
})

import { task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const TextNodeInputSchema = z.object({
  nodeResultId: z.string(),
  content: z.string(),
})

export const textNodeTask = task({
  id: 'text-node-task',
  maxDuration: 30,
  run: async (payload: z.infer<typeof TextNodeInputSchema>, { ctx }) => {
    const startTime = Date.now()
    const { nodeResultId, content } = payload

    try {
      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ text: content }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })

      return { success: true as const, text: content }
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

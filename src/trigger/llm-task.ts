// src/trigger/llm-task.ts
import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const LLMInputSchema = z.object({
  nodeResultId: z.string(),
  model:        z.string(),
  systemPrompt: z.string().optional(),
  userMessage:  z.string(),
  imageUrls:    z.array(z.string()).optional(),
})

export const llmTask = task({
  id: 'llm-task',
  maxDuration: 120,

  run: async (payload: z.infer<typeof LLMInputSchema>, { ctx }) => {
    const { nodeResultId, model, systemPrompt, userMessage, imageUrls = [] } = payload
    const startTime = Date.now()

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
      const geminiModel = genAI.getGenerativeModel({
        model,
        ...(systemPrompt && {
          systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
        }),
      })

      const parts: Part[] = [{ text: userMessage }]

      for (const imageUrl of imageUrls) {
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = response.headers.get('content-type') ?? 'image/jpeg'
        parts.push({
          inlineData: { data: base64, mimeType: mimeType as any }
        })
      }

      const result = await geminiModel.generateContent(parts)
      const text = result.response.text()

      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ text }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })

      return { success: true, text }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })
      throw error
    }
  },
})

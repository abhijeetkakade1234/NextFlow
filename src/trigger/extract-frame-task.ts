// src/trigger/extract-frame-task.ts
import { task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { $ } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { Transloadit, type CreateAssemblyOptions } from 'transloadit'
import { prisma } from '../lib/prisma'
import { requireEnv } from '../lib/env'

const ExtractFrameInputSchema = z.object({
  nodeResultId: z.string(),
  videoUrl:     z.string().url(),
  timestamp:    z.string().default('0'),
})

async function resolveTimestamp(videoPath: string, timestamp: string): Promise<number> {
  if (timestamp.endsWith('%')) {
    const result = await $`ffprobe -v quiet -print_format json -show_format ${videoPath}`
    const data = JSON.parse(result.stdout) as { format: { duration: string } }
    const duration = parseFloat(data.format.duration)
    const pct = parseFloat(timestamp) / 100
    return duration * pct
  }
  return parseFloat(timestamp) || 0
}

async function uploadToTransloadit(filePath: string): Promise<string> {
  const client = new Transloadit({
    authKey: requireEnv('TRANSLOADIT_KEY'),
    authSecret: requireEnv('TRANSLOADIT_SECRET'),
  })

  const options: CreateAssemblyOptions = {
    params: {
      steps: {
        ':original': { robot: '/upload/handle' as '/upload/handle', result: true },
      },
    },
    uploads: { file: (await import('fs')).createReadStream(filePath) },
    waitForCompletion: true,
  }

  const result = await client.createAssembly(options)
  const url = (result.results as Record<string, Array<{ url: string }>>)?.[':original']?.[0]?.url
  if (!url) throw new Error('No URL in Transloadit response')
  return url
}

export const extractFrameTask = task({
  id: 'extract-frame-task',
  maxDuration: 60,

  run: async (payload: z.infer<typeof ExtractFrameInputSchema>, { ctx }) => {
    const { nodeResultId, videoUrl, timestamp } = payload
    const startTime = Date.now()
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-'))

    try {
      const response = await fetch(videoUrl)
      const buffer = await response.arrayBuffer()
      const ext = videoUrl.split('.').pop()?.toLowerCase() ?? 'mp4'
      const inputPath = path.join(tmpDir, `input.${ext}`)
      const outputPath = path.join(tmpDir, 'frame.jpg')
      await fs.writeFile(inputPath, Buffer.from(buffer))

      const seekTime = await resolveTimestamp(inputPath, timestamp)
      await $`ffmpeg -ss ${seekTime} -i ${inputPath} -vframes 1 -q:v 2 ${outputPath}`

      const frameUrl = await uploadToTransloadit(outputPath)

      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ url: frameUrl }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })

      return { success: true as const, url: frameUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      })
      throw error
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  },
})

// src/trigger/extract-frame-task.ts
import { task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { execa } from 'execa'
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

function getBinaryPath(envName: 'FFMPEG_PATH' | 'FFPROBE_PATH', fallback: string): string {
  const value = process.env[envName]?.trim()
  return value && value.length > 0 ? value : fallback
}

async function resolveTimestamp(videoPath: string, timestamp: string): Promise<number> {
  const value = timestamp.trim()
  if (value.endsWith('%')) {
    const pctString = value.slice(0, -1)
    const pct = Number(pctString)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error(`Invalid timestamp percentage: "${timestamp}"`)
    }

    const ffprobeBin = getBinaryPath('FFPROBE_PATH', 'ffprobe')
    const result = await execa(ffprobeBin, ['-v', 'quiet', '-print_format', 'json', '-show_format', videoPath])
    const data = JSON.parse(result.stdout) as { format: { duration: string } }
    const duration = parseFloat(data.format.duration)
    return duration * (pct / 100)
  }

  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`Invalid timestamp seconds: "${timestamp}"`)
  }
  return seconds
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
      const ffmpegBin = getBinaryPath('FFMPEG_PATH', 'ffmpeg')
      await execa(ffmpegBin, ['-ss', String(seekTime), '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath])

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
      const message = error instanceof Error ? error.message : 'Unknown error'
      const errorMessage =
        /ffprobe|ffmpeg|not recognized/i.test(message)
          ? 'FFmpeg/ffprobe not found. Install FFmpeg or set FFMPEG_PATH and FFPROBE_PATH in .env.local.'
          : message
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

// src/trigger/crop-image-task.ts
import { task } from '@trigger.dev/sdk'
import { z } from 'zod'
import { $ } from 'execa'
import { execa } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { Transloadit, type CreateAssemblyOptions } from 'transloadit'
import { prisma } from '../lib/prisma'
import { requireEnv } from '../lib/env'

const CropInputSchema = z.object({
  nodeResultId:  z.string(),
  imageUrl:      z.string().url(),
  xPercent:      z.number().min(0).max(100).default(0),
  yPercent:      z.number().min(0).max(100).default(0),
  widthPercent:  z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
})

function getBinaryPath(envName: 'FFMPEG_PATH' | 'FFPROBE_PATH', fallback: string): string {
  const value = process.env[envName]?.trim()
  return value && value.length > 0 ? value : fallback
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

export const cropImageTask = task({
  id: 'crop-image-task',
  maxDuration: 60,

  run: async (payload: z.infer<typeof CropInputSchema>, { ctx }) => {
    const { nodeResultId, imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload
    const startTime = Date.now()
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crop-'))

    try {
      const response = await fetch(imageUrl)
      const buffer = await response.arrayBuffer()
      const ext = imageUrl.split('.').pop()?.toLowerCase() ?? 'jpg'
      const inputPath = path.join(tmpDir, `input.${ext}`)
      const outputPath = path.join(tmpDir, 'output.jpg')
      await fs.writeFile(inputPath, Buffer.from(buffer))

      const ffprobeBin = getBinaryPath('FFPROBE_PATH', 'ffprobe')
      const probeResult = await execa(ffprobeBin, ['-v', 'quiet', '-print_format', 'json', '-show_streams', inputPath])
      const probeData = JSON.parse(probeResult.stdout) as {
        streams: Array<{ codec_type: string; width: number; height: number }>
      }
      const stream = probeData.streams.find(s => s.codec_type === 'video')
      if (!stream) throw new Error('No video stream found in image')
      const { width, height } = stream

      const cropX = Math.round((xPercent / 100) * width)
      const cropY = Math.round((yPercent / 100) * height)
      const cropW = Math.round((widthPercent / 100) * width)
      const cropH = Math.round((heightPercent / 100) * height)

      const ffmpegBin = getBinaryPath('FFMPEG_PATH', 'ffmpeg')
      await execa(ffmpegBin, ['-i', inputPath, '-vf', `crop=${cropW}:${cropH}:${cropX}:${cropY}`, '-q:v', '2', outputPath])

      const croppedUrl = await uploadToTransloadit(outputPath)

      await prisma.nodeResult.update({
        where: { id: nodeResultId },
        data: {
          status: 'SUCCESS',
          output: JSON.stringify({ url: croppedUrl }),
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          triggerRunId: ctx.run.id,
        },
      })

      return { success: true as const, url: croppedUrl }
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

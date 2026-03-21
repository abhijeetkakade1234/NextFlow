# NextFlow — Trigger.dev Tasks

## Setup

```bash
# Initialize Trigger.dev in the project
npx trigger.dev@latest init

# Dev server (runs alongside Next.js)
npx trigger.dev@latest dev

# Deploy tasks
npx trigger.dev@latest deploy
```

---

## trigger.config.ts
```typescript
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ['./src/trigger'],
})
```

---

## Required Environment Variables for Tasks
```bash
GOOGLE_GENERATIVE_AI_API_KEY=   # from Google AI Studio
TRANSLOADIT_KEY=                # Transloadit auth key
TRANSLOADIT_SECRET=             # Transloadit auth secret
DATABASE_URL=                   # Neon PostgreSQL
```

---

## Task 1: LLM Task (Gemini API)

```typescript
// src/trigger/llm-task.ts
import { task } from '@trigger.dev/sdk/v3'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const LLMInputSchema = z.object({
  nodeResultId:  z.string(),
  model:         z.string(),
  systemPrompt:  z.string().optional(),
  userMessage:   z.string(),
  imageUrls:     z.array(z.string()).optional(),
})

export const llmTask = task({
  id: 'llm-task',
  maxDuration: 120,  // 2 minutes max
  
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

      // Build content parts (text + optional images)
      const parts: Part[] = [{ text: userMessage }]

      // Fetch and encode images as base64
      for (const imageUrl of imageUrls) {
        const response = await fetch(imageUrl)
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = response.headers.get('content-type') ?? 'image/jpeg'
        
        parts.push({
          inlineData: {
            data: base64,
            mimeType: mimeType as any,
          }
        })
      }

      const result = await geminiModel.generateContent(parts)
      const text = result.response.text()

      // Update node result in DB
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

      throw error  // Trigger.dev will handle retry
    }
  },
})
```

---

## Task 2: Crop Image Task (FFmpeg)

```typescript
// src/trigger/crop-image-task.ts
import { task } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { $ } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { prisma } from '@/lib/prisma'

// Install FFmpeg in Trigger.dev
// Add to trigger.config.ts: additionalPackages: ['ffmpeg']
// OR use: import { ffmpeg } from '@trigger.dev/build/extensions/core'

const CropInputSchema = z.object({
  nodeResultId: z.string(),
  imageUrl:     z.string().url(),
  xPercent:     z.number().min(0).max(100).default(0),
  yPercent:     z.number().min(0).max(100).default(0),
  widthPercent: z.number().min(1).max(100).default(100),
  heightPercent: z.number().min(1).max(100).default(100),
})

export const cropImageTask = task({
  id: 'crop-image-task',
  maxDuration: 60,
  
  run: async (payload: z.infer<typeof CropInputSchema>, { ctx }) => {
    const { nodeResultId, imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload
    const startTime = Date.now()
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crop-'))

    try {
      // 1. Download image
      const response = await fetch(imageUrl)
      const buffer = await response.arrayBuffer()
      const ext = imageUrl.split('.').pop()?.toLowerCase() ?? 'jpg'
      const inputPath = path.join(tmpDir, `input.${ext}`)
      const outputPath = path.join(tmpDir, `output.jpg`)
      await fs.writeFile(inputPath, Buffer.from(buffer))

      // 2. Get image dimensions with ffprobe
      const probeResult = await $`ffprobe -v quiet -print_format json -show_streams ${inputPath}`
      const probeData = JSON.parse(probeResult.stdout)
      const stream = probeData.streams.find((s: any) => s.codec_type === 'video')
      const width = stream.width as number
      const height = stream.height as number

      // 3. Calculate pixel values from percentages
      const cropX = Math.round((xPercent / 100) * width)
      const cropY = Math.round((yPercent / 100) * height)
      const cropW = Math.round((widthPercent / 100) * width)
      const cropH = Math.round((heightPercent / 100) * height)

      // 4. FFmpeg crop
      // Filter: crop=width:height:x:y
      await $`ffmpeg -i ${inputPath} -vf crop=${cropW}:${cropH}:${cropX}:${cropY} -q:v 2 ${outputPath}`

      // 5. Upload result to Transloadit
      const croppedUrl = await uploadToTransloadit(outputPath, 'image/jpeg')

      // 6. Update DB
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

      return { success: true, url: croppedUrl }

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
      // Cleanup temp files
      await fs.rm(tmpDir, { recursive: true, force: true })
    }
  },
})
```

---

## Task 3: Extract Frame Task (FFmpeg)

```typescript
// src/trigger/extract-frame-task.ts
import { task } from '@trigger.dev/sdk/v3'
import { z } from 'zod'
import { $ } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { prisma } from '@/lib/prisma'

const ExtractFrameInputSchema = z.object({
  nodeResultId: z.string(),
  videoUrl:     z.string().url(),
  timestamp:    z.string().default('0'),  // "5" or "50%"
})

export const extractFrameTask = task({
  id: 'extract-frame-task',
  maxDuration: 60,
  
  run: async (payload: z.infer<typeof ExtractFrameInputSchema>, { ctx }) => {
    const { nodeResultId, videoUrl, timestamp } = payload
    const startTime = Date.now()
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-'))

    try {
      // 1. Download video
      const response = await fetch(videoUrl)
      const buffer = await response.arrayBuffer()
      const ext = videoUrl.split('.').pop()?.toLowerCase() ?? 'mp4'
      const inputPath = path.join(tmpDir, `input.${ext}`)
      const outputPath = path.join(tmpDir, `frame.jpg`)
      await fs.writeFile(inputPath, Buffer.from(buffer))

      // 2. Resolve timestamp (handle percentage)
      const seekTime = await resolveTimestamp(inputPath, timestamp)

      // 3. Extract single frame at seekTime
      // -ss: seek to time, -vframes 1: extract 1 frame, -q:v 2: high quality JPEG
      await $`ffmpeg -ss ${seekTime} -i ${inputPath} -vframes 1 -q:v 2 ${outputPath}`

      // 4. Upload to Transloadit
      const frameUrl = await uploadToTransloadit(outputPath, 'image/jpeg')

      // 5. Update DB
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

      return { success: true, url: frameUrl }

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

// ─── Helpers ─────────────────────────────────────────────────

async function resolveTimestamp(videoPath: string, timestamp: string): Promise<number> {
  if (timestamp.endsWith('%')) {
    // Get video duration first
    const result = await $`ffprobe -v quiet -print_format json -show_format ${videoPath}`
    const data = JSON.parse(result.stdout)
    const duration = parseFloat(data.format.duration)
    const pct = parseFloat(timestamp) / 100
    return duration * pct
  }
  return parseFloat(timestamp) || 0
}

async function uploadToTransloadit(
  filePath: string,
  mimeType: string
): Promise<string> {
  // Upload to Transloadit and return CDN URL
  const TransloaditClient = (await import('transloadit')).default
  const client = new TransloaditClient({
    authKey: process.env.TRANSLOADIT_KEY!,
    authSecret: process.env.TRANSLOADIT_SECRET!,
  })

  const fileData = await fs.readFile(filePath)
  
  return new Promise((resolve, reject) => {
    const assembly = client.createAssembly({
      params: {
        steps: {
          ':original': { robot: '/upload/handle' },
          compress: {
            use: ':original',
            robot: '/image/resize',  // passthrough for already-processed images
            result: true,
          },
        },
      },
      files: { file: { name: path.basename(filePath), data: fileData } },
      waitForCompletion: true,
    })

    assembly.then((result: any) => {
      const url = result.results?.compress?.[0]?.url 
               ?? result.results?.[':original']?.[0]?.url
      if (url) resolve(url)
      else reject(new Error('No URL in Transloadit response'))
    }).catch(reject)
  })
}
```

---

## FFmpeg in Trigger.dev

Add to `trigger.config.ts` to install FFmpeg in the Trigger.dev worker:

```typescript
import { defineConfig } from '@trigger.dev/sdk/v3'
import { ffmpeg } from '@trigger.dev/build/extensions/core'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  build: {
    extensions: [ffmpeg()],  // ← This installs FFmpeg
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ['./src/trigger'],
})
```

**Install build extensions:**
```bash
npm install @trigger.dev/build
```

---

## How Tasks Are Triggered from API Routes

```typescript
// src/app/api/runs/route.ts (POST)
import { tasks } from '@trigger.dev/sdk/v3'
import { llmTask } from '@/trigger/llm-task'

// Trigger a single task:
const handle = await tasks.trigger(llmTask, {
  nodeResultId: nodeResult.id,
  model: nodeData.model,
  userMessage: resolvedUserMessage,
  systemPrompt: resolvedSystemPrompt,
  imageUrls: resolvedImageUrls,
})

// Trigger multiple tasks concurrently (parallel branches):
const handles = await Promise.all(independentNodes.map(node =>
  tasks.trigger(getTaskForNode(node), buildPayload(node))
))

// Wait for a specific task to complete:
const result = await tasks.triggerAndWait(llmTask, payload)
```

---

## Execution Flow: API Route → Tasks

```
POST /api/runs
├── 1. Auth check (Clerk)
├── 2. Validate body (Zod)
├── 3. Create WorkflowRun in DB (status: RUNNING)
├── 4. Create NodeResult entries for each node (status: RUNNING)
├── 5. Call execution-engine.ts
│   ├── Topological sort of DAG
│   ├── Wave 1: no-dependency nodes → trigger ALL concurrently
│   │   ├── triggerAndWait(llmTask, {...})
│   │   └── triggerAndWait(cropImageTask, {...})   ← runs in parallel
│   ├── Wave 2: nodes whose deps completed → trigger concurrently
│   └── etc.
├── 6. Update WorkflowRun status (SUCCESS/FAILED/PARTIAL)
└── 7. Return { runId }
```

**IMPORTANT:** The execution engine runs inside the API route (server-side).
It uses `triggerAndWait` to block until each task completes before moving to the next wave.
Individual waves run concurrently with `Promise.all`.

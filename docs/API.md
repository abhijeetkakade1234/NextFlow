# NextFlow — API Routes

## All Routes Overview

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/workflows | List user's workflows |
| POST | /api/workflows | Create new workflow |
| GET | /api/workflows/[id] | Get workflow with runs |
| PUT | /api/workflows/[id] | Update workflow (auto-save) |
| DELETE | /api/workflows/[id] | Delete workflow |
| GET | /api/workflows/[id]/export | Export as JSON |
| POST | /api/workflows/import | Import from JSON |
| POST | /api/runs | Create + execute a run |
| GET | /api/runs/[id] | Get run + node results |
| POST | /api/upload/params | Get Transloadit signed params |

---

## Zod Schemas

```typescript
// src/schemas/workflow.schema.ts
import { z } from 'zod'

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).default('Untitled Workflow'),
  description: z.string().max(500).optional(),
})

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodesJson: z.array(z.any()).optional(),   // React Flow node objects
  edgesJson: z.array(z.any()).optional(),   // React Flow edge objects
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
```

```typescript
// src/schemas/run.schema.ts
import { z } from 'zod'

export const CreateRunSchema = z.object({
  workflowId: z.string().cuid(),
  scope: z.enum(['FULL', 'SELECTED', 'SINGLE']),
  // For SELECTED scope: which node IDs to run
  nodeIds: z.array(z.string()).optional(),
  // For SINGLE scope: which node to run
  nodeId: z.string().optional(),
}).refine(
  data => data.scope !== 'SELECTED' || (data.nodeIds && data.nodeIds.length > 0),
  { message: 'nodeIds required for SELECTED scope' }
).refine(
  data => data.scope !== 'SINGLE' || !!data.nodeId,
  { message: 'nodeId required for SINGLE scope' }
)
```

```typescript
// src/schemas/upload.schema.ts
import { z } from 'zod'

export const UploadParamsSchema = z.object({
  fileType: z.enum(['image', 'video']),
  fileName: z.string(),
})
```

---

## /api/workflows/route.ts

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateWorkflowSchema } from '@/schemas/workflow.schema'

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { runs: true } },
    },
  })

  return NextResponse.json({ workflows })
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = CreateWorkflowSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const workflow = await prisma.workflow.create({
    data: { ...result.data, userId },
  })

  return NextResponse.json({ workflow }, { status: 201 })
}
```

---

## /api/workflows/[id]/route.ts

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateWorkflowSchema } from '@/schemas/workflow.schema'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, userId },
    include: {
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          nodeResults: {
            orderBy: { startedAt: 'asc' },
          },
        },
      },
    },
  })

  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ workflow })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = UpdateWorkflowSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  // userId in where clause prevents unauthorized updates
  const workflow = await prisma.workflow.updateMany({
    where: { id: params.id, userId },
    data: result.data,
  })

  if (workflow.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.workflow.deleteMany({
    where: { id: params.id, userId },
  })

  return NextResponse.json({ success: true })
}
```

---

## /api/workflows/[id]/export/route.ts

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, userId },
    select: { name: true, nodesJson: true, edgesJson: true, viewport: true },
  })

  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return as downloadable JSON file
  return new NextResponse(
    JSON.stringify({ ...workflow, exportedAt: new Date().toISOString() }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${workflow.name.replace(/\s+/g, '_')}.json"`,
      },
    }
  )
}
```

---

## /api/runs/route.ts (most complex — execution entry point)

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateRunSchema } from '@/schemas/run.schema'
import { executeWorkflow } from '@/lib/execution-engine'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = CreateRunSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const { workflowId, scope, nodeIds, nodeId } = result.data

  // Fetch workflow + verify ownership
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  // Determine which nodes to execute
  const allNodes = workflow.nodesJson as any[]
  const allEdges = workflow.edgesJson as any[]
  
  let targetNodeIds: string[]
  if (scope === 'FULL') {
    targetNodeIds = allNodes.map(n => n.id)
  } else if (scope === 'SELECTED') {
    targetNodeIds = nodeIds!
  } else {
    targetNodeIds = [nodeId!]
  }

  // Create run record
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      scope,
      status: 'RUNNING',
      nodeIds: targetNodeIds,
      nodeResults: {
        create: targetNodeIds.map(nId => {
          const node = allNodes.find(n => n.id === nId)
          return {
            nodeId: nId,
            nodeType: node?.type ?? 'unknown',
            nodeLabel: node?.data?.label ?? nId,
            status: 'RUNNING',
            inputs: null,
          }
        }),
      },
    },
    include: { nodeResults: true },
  })

  // Start execution (async — don't await in the response)
  // This allows us to return the runId immediately
  executeWorkflow(allNodes, allEdges, targetNodeIds, run.id, run.nodeResults)
    .catch(err => {
      console.error('Execution failed:', err)
      prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', completedAt: new Date() },
      })
    })

  return NextResponse.json({ runId: run.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 })

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId, userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { nodeResults: { orderBy: { startedAt: 'asc' } } },
  })

  return NextResponse.json({ runs })
}
```

---

## /api/runs/[id]/route.ts

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await prisma.workflowRun.findFirst({
    where: { id: params.id, userId },
    include: {
      nodeResults: { orderBy: { startedAt: 'asc' } },
    },
  })

  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ run })
}
```

---

## /api/upload/params/route.ts

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { UploadParamsSchema } from '@/schemas/upload.schema'
import { createTransloaditParams } from '@/lib/transloadit'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = UploadParamsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { params, signature } = createTransloaditParams(result.data.fileType)
  return NextResponse.json({ params, signature })
}
```

---

## /src/lib/transloadit.ts

```typescript
import crypto from 'crypto'

export function createTransloaditParams(fileType: 'image' | 'video') {
  const steps = fileType === 'image'
    ? {
        ':original': { robot: '/upload/handle' },
        optimized: {
          use: ':original',
          robot: '/image/resize',
          result: true,
          width: 2048,
          height: 2048,
          resize_strategy: 'fit',
          imagemagick_stack: 'v3.0.0',
        },
      }
    : {
        ':original': { robot: '/upload/handle', result: true },
      }

  const params = {
    auth: {
      key: process.env.TRANSLOADIT_KEY!,
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    },
    steps,
  }

  const paramsString = JSON.stringify(params)
  const signature = crypto
    .createHmac('sha384', process.env.TRANSLOADIT_SECRET!)
    .update(paramsString)
    .digest('hex')

  return { params, signature: `sha384:${signature}` }
}
```

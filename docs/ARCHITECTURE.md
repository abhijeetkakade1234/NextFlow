# NextFlow — Architecture & Code Patterns

## Complete File Tree
```
nextflow/
├── prisma/
│   └── schema.prisma                    # see SCHEMA.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   │   └── [[...sign-in]]/
│   │   │   │       └── page.tsx
│   │   │   └── sign-up/
│   │   │       └── [[...sign-up]]/
│   │   │           └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx               # sidebar layout shell
│   │   │   ├── page.tsx                 # redirect → /workflows
│   │   │   └── workflows/
│   │   │       ├── page.tsx             # workflow list
│   │   │       └── [id]/
│   │   │           └── page.tsx         # editor canvas
│   │   ├── api/
│   │   │   ├── workflows/
│   │   │   │   ├── route.ts             # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # GET one, PUT update, DELETE
│   │   │   │       └── export/
│   │   │   │           └── route.ts     # GET export JSON
│   │   │   ├── runs/
│   │   │   │   ├── route.ts             # POST create run
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts         # GET run + node results
│   │   │   └── upload/
│   │   │       └── params/
│   │   │           └── route.ts         # POST Transloadit signed params
│   │   ├── layout.tsx                   # root with ClerkProvider
│   │   └── globals.css                  # Krea theme variables
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── WorkflowCanvas.tsx       # ReactFlow wrapper
│   │   │   ├── CanvasControls.tsx       # zoom/fit buttons
│   │   │   └── CustomEdge.tsx           # animated purple edge
│   │   ├── nodes/
│   │   │   ├── BaseNode.tsx             # shared wrapper
│   │   │   ├── TextNode.tsx
│   │   │   ├── UploadImageNode.tsx
│   │   │   ├── UploadVideoNode.tsx
│   │   │   ├── LLMNode.tsx
│   │   │   ├── CropImageNode.tsx
│   │   │   └── ExtractFrameNode.tsx
│   │   ├── sidebar/
│   │   │   ├── LeftSidebar.tsx          # node palette
│   │   │   ├── NodeDragButton.tsx       # draggable node button
│   │   │   ├── RightSidebar.tsx         # history panel
│   │   │   ├── RunHistoryList.tsx       # list of runs
│   │   │   └── RunHistoryDetail.tsx     # expanded run detail
│   │   └── ui/                          # shadcn components + custom
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       └── Spinner.tsx
│   ├── lib/
│   │   ├── prisma.ts                    # singleton client
│   │   ├── execution-engine.ts          # DAG traversal + parallel execution
│   │   ├── transloadit.ts               # signed params helper
│   │   └── utils.ts                     # cn(), formatDate(), etc.
│   ├── store/
│   │   ├── workflow-store.ts            # nodes, edges, history (undo/redo)
│   │   ├── execution-store.ts           # per-node run status
│   │   └── ui-store.ts                  # sidebar collapse, selected run
│   ├── trigger/
│   │   ├── llm-task.ts                  # Gemini API task
│   │   ├── crop-image-task.ts           # FFmpeg crop task
│   │   └── extract-frame-task.ts        # FFmpeg frame extract task
│   ├── types/
│   │   ├── nodes.ts                     # NodeData union types
│   │   ├── workflow.ts                  # WorkflowWithNodes type
│   │   └── execution.ts                 # RunResult, NodeResult types
│   └── schemas/
│       ├── workflow.schema.ts           # Zod schemas for workflow API
│       ├── run.schema.ts                # Zod schemas for run API
│       └── upload.schema.ts             # Zod schemas for upload API
├── trigger.config.ts                    # Trigger.dev project config
├── middleware.ts                        # Clerk middleware
├── .env.local                           # see ENV.md
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Package.json Dependencies

```json
{
  "dependencies": {
    "next": "14.2.5",
    "@clerk/nextjs": "^5.2.0",
    "@prisma/client": "^5.16.0",
    "@google/generative-ai": "^0.15.0",
    "@trigger.dev/sdk": "^4.4.3",
    "@xyflow/react": "^12.0.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "uppy": "^3.25.0",
    "@uppy/transloadit": "^3.5.0",
    "@uppy/core": "^3.11.0",
    "@uppy/dashboard": "^3.8.0",
    "immer": "^10.1.1",
    "@tanstack/react-query": "^5.50.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "prisma": "^5.16.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.19"
  }
}
```

**Install command:**
```bash
npm install next@14.2.5 @clerk/nextjs @prisma/client @google/generative-ai @trigger.dev/sdk @xyflow/react zustand zod lucide-react clsx tailwind-merge uppy @uppy/transloadit @uppy/core @uppy/dashboard immer @tanstack/react-query date-fns

npm install -D prisma @types/node @types/react typescript tailwindcss autoprefixer
```

---

## middleware.ts (Clerk v5 App Router pattern)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

---

## trigger.config.ts

```typescript
import { defineConfig } from '@trigger.dev/sdk'

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

## tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Krea dark theme
        'krea-bg': '#0a0a0a',
        'krea-surface': '#111111',
        'krea-border': '#1f1f1f',
        'krea-border-hover': '#2a2a2a',
        'krea-text': '#e5e5e5',
        'krea-muted': '#6b7280',
        'krea-accent': '#7c3aed',       // purple
        'krea-accent-light': '#a78bfa',
        'krea-success': '#10b981',
        'krea-error': '#ef4444',
        'krea-warning': '#f59e0b',
        'krea-running': '#6366f1',
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'edge-flow': 'edge-flow 1s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(124, 58, 237, 0.4)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(124, 58, 237, 0.8)' },
        },
        'edge-flow': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

---

## globals.css (React Flow imports + Krea theme)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* REQUIRED: React Flow styles */
@import '@xyflow/react/dist/style.css';

:root {
  --krea-bg: #0a0a0a;
  --krea-surface: #111111;
  --krea-border: #1f1f1f;
  --krea-text: #e5e5e5;
  --krea-accent: #7c3aed;
}

body {
  background: var(--krea-bg);
  color: var(--krea-text);
  font-family: 'Inter', sans-serif;
  overflow: hidden; /* prevent body scroll, canvas handles it */
}

/* React Flow overrides */
.react-flow__background {
  background-color: var(--krea-bg) !important;
}

.react-flow__minimap {
  background-color: var(--krea-surface) !important;
  border: 1px solid var(--krea-border);
  border-radius: 8px;
}

.react-flow__controls {
  background-color: var(--krea-surface) !important;
  border: 1px solid var(--krea-border) !important;
}

.react-flow__controls button {
  background-color: var(--krea-surface) !important;
  border-bottom: 1px solid var(--krea-border) !important;
  color: var(--krea-text) !important;
}

/* Node glow animation when running */
.node-running {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(124, 58, 237, 0.4); }
  50% { box-shadow: 0 0 20px 6px rgba(124, 58, 237, 0.8); }
}
```

---

## API Route Pattern (ALL routes follow this exactly)

```typescript
// src/app/api/workflows/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { CreateWorkflowSchema } from '@/schemas/workflow.schema'

export async function GET(req: NextRequest) {
  // 1. Auth check — ALWAYS first
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Business logic with userId isolation
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ workflows })
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Parse + validate body with Zod
  const body = await req.json()
  const result = CreateWorkflowSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const workflow = await prisma.workflow.create({
    data: { ...result.data, userId },
  })

  return NextResponse.json({ workflow }, { status: 201 })
}
```

---

## Zustand Store Pattern (with Immer)

```typescript
import { create } from 'zustand'
import { temporal } from 'zundo'           // for undo/redo
import { immer } from 'zustand/middleware/immer'
import { Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

// Always use immer for mutations
// Always use temporal (zundo) for undo/redo
// Never mutate state directly
```

---

## lib/prisma.ts (singleton — prevents connection pool exhaustion)

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## React Flow Canvas Pattern

```tsx
// src/components/canvas/WorkflowCanvas.tsx
'use client'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '@/store/workflow-store'
import { nodeTypes } from './nodeTypes'  // map of all 6 node types
import { CustomEdge } from './CustomEdge'

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

export function WorkflowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useWorkflowStore()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'custom', animated: true }}
      fitView
      deleteKeyCode={['Delete', 'Backspace']}
      className="bg-krea-bg"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1.5}
        color="#1f1f1f"
      />
      <MiniMap
        nodeColor="#7c3aed"
        maskColor="rgba(0,0,0,0.7)"
        position="bottom-right"
      />
      <Controls position="bottom-left" />
    </ReactFlow>
  )
}
```

---

## Handle Type System (enforces type-safe connections)

```typescript
// src/types/nodes.ts
export const HANDLE_TYPES = {
  TEXT: 'text',
  IMAGE_URL: 'image_url',
  VIDEO_URL: 'video_url',
  NUMBER: 'number',
} as const

// In node components, add data-handletype attribute:
// <Handle data-handletype="text" type="source" position={Position.Right} />

// In onConnect handler in workflow-store.ts — validate before adding edge:
export function isValidConnection(
  sourceHandleType: string,
  targetHandleType: string
): boolean {
  const rules: Record<string, string[]> = {
    text:       ['text', 'system_prompt', 'user_message', 'number'],
    image_url:  ['image_url', 'images'],
    video_url:  ['video_url'],
    number:     ['number', 'text'],
  }
  return rules[sourceHandleType]?.includes(targetHandleType) ?? false
}
```

---

## Execution Engine Pattern

```typescript
// src/lib/execution-engine.ts
// Topological sort → find nodes with no remaining dependencies → trigger concurrently

export async function executeWorkflow(
  nodes: AppNode[],
  edges: Edge[],
  scope: 'full' | 'selected' | 'single',
  selectedNodeIds?: string[]
): Promise<RunResult> {
  // 1. Filter nodes by scope
  // 2. Build adjacency list (directed graph)
  // 3. Topological sort (Kahn's algorithm)
  // 4. Execute in waves: each wave = nodes whose deps are all resolved
  // 5. Within each wave, trigger all tasks CONCURRENTLY with Promise.all()
  // 6. Pass outputs from upstream nodes as inputs to downstream nodes
  // 7. Save run + node results to DB
}
```

---

## Component Naming Conventions
- All components: PascalCase, .tsx extension
- All hooks: camelCase with `use` prefix
- All stores: `use[Name]Store` 
- All API routes: lowercase folder names
- All Trigger.dev tasks: kebab-case file names, exported as `const [name]Task`
- All Zod schemas: `[Name]Schema` suffix
- All TypeScript types/interfaces: PascalCase

## Import Aliases (tsconfig.json paths)
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
Always use `@/` imports, never relative `../../` imports.



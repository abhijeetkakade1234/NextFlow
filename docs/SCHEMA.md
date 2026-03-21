# NextFlow — Database Schema

## Prisma Schema (paste into prisma/schema.prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // Neon requires this for migrations
}

// ─────────────────────────────────────────────
// WORKFLOW
// ─────────────────────────────────────────────

model Workflow {
  id          String   @id @default(cuid())
  userId      String                          // Clerk userId
  name        String   @default("Untitled Workflow")
  description String?
  
  // Serialized React Flow state (nodes + edges as JSON)
  nodesJson   Json     @default("[]")         // FlowNode[]
  edgesJson   Json     @default("[]")         // FlowEdge[]
  
  // Viewport state (zoom + pan position)
  viewport    Json?                           // { x, y, zoom }
  
  runs        WorkflowRun[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
  @@index([userId, updatedAt])
}

// ─────────────────────────────────────────────
// WORKFLOW RUN (one entry per execution)
// ─────────────────────────────────────────────

model WorkflowRun {
  id          String    @id @default(cuid())
  workflowId  String
  workflow    Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  userId      String                          // denormalized for fast queries
  
  // Execution scope
  scope       RunScope  @default(FULL)
  
  // Overall status
  status      RunStatus @default(RUNNING)
  
  // Timing
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  durationMs  Int?                            // computed on completion
  
  // Which nodes were included in this run (array of nodeIds)
  nodeIds     String[]  @default([])
  
  nodeResults NodeResult[]
  
  createdAt   DateTime  @default(now())
  
  @@index([workflowId])
  @@index([userId, createdAt])
}

// ─────────────────────────────────────────────
// NODE RESULT (one entry per node per run)
// ─────────────────────────────────────────────

model NodeResult {
  id          String      @id @default(cuid())
  runId       String
  run         WorkflowRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  
  nodeId      String                          // React Flow node id
  nodeType    String                          // 'textNode' | 'llmNode' | etc.
  nodeLabel   String?                         // display name
  
  status      RunStatus   @default(RUNNING)
  
  // Serialized inputs that were used
  inputs      Json?                           // { handleName: value }
  
  // Serialized output produced
  output      Json?                           // string | { url: string } | null
  
  // Error message if failed
  error       String?
  
  // Timing
  startedAt   DateTime    @default(now())
  completedAt DateTime?
  durationMs  Int?
  
  // Trigger.dev run ID for debugging
  triggerRunId String?
  
  @@index([runId])
  @@index([runId, nodeId])
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum RunScope {
  FULL      // entire workflow
  SELECTED  // user selected N nodes
  SINGLE    // single node run
}

enum RunStatus {
  RUNNING
  SUCCESS
  FAILED
  PARTIAL   // some nodes succeeded, some failed
  CANCELLED
}
```

---

## Setup Commands

```bash
# 1. Initialize Prisma
npx prisma init

# 2. Paste schema above into prisma/schema.prisma

# 3. Push schema to Neon (creates tables)
npx prisma db push

# 4. Generate Prisma Client
npx prisma generate

# 5. (Optional) Open Prisma Studio to verify
npx prisma studio
```

---

## Neon Setup (get DATABASE_URL)

1. Go to https://neon.tech → New Project
2. Name: `nextflow`
3. Copy **Connection string** (DATABASE_URL) — starts with `postgres://`
4. Copy **Direct connection** (DIRECT_URL) — for Prisma migrations
5. Paste both into `.env.local`

---

## Key Design Decisions

### Why store nodes/edges as JSON in Workflow?
React Flow's node/edge objects are complex nested types. Storing them as JSON columns
avoids creating 6 separate node tables while still allowing full restoration of canvas state.
The JSON is validated on the way in via Zod before saving.

### Why denormalize userId on WorkflowRun?
Allows fetching all runs for a user in a single query without JOIN, improving dashboard
performance.

### Why durationMs as Int?
Milliseconds as integer is simpler than timestamp arithmetic in queries and easy to display
("4.2s" = `(durationMs / 1000).toFixed(1) + 's'`).

### onDelete: Cascade
Deleting a Workflow cascades to all its WorkflowRuns.
Deleting a WorkflowRun cascades to all its NodeResults.
This prevents orphaned records.

---

## Query Patterns

### Get workflow with run history (right sidebar)
```typescript
const workflow = await prisma.workflow.findFirst({
  where: { id: workflowId, userId },
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
```

### Save workflow (auto-save)
```typescript
await prisma.workflow.update({
  where: { id, userId },   // userId check prevents unauthorized updates
  data: {
    nodesJson: nodes,
    edgesJson: edges,
    viewport,
    updatedAt: new Date(),
  },
})
```

### Create run + node results atomically
```typescript
const run = await prisma.workflowRun.create({
  data: {
    workflowId,
    userId,
    scope,
    status: 'RUNNING',
    nodeIds: selectedNodeIds,
    nodeResults: {
      create: selectedNodeIds.map(nodeId => ({
        nodeId,
        nodeType: getNodeType(nodeId),
        status: 'RUNNING',
      })),
    },
  },
  include: { nodeResults: true },
})
```

### Update node result after Trigger.dev task completes
```typescript
await prisma.nodeResult.update({
  where: { id: nodeResultId },
  data: {
    status: success ? 'SUCCESS' : 'FAILED',
    output: outputValue,
    error: errorMessage,
    completedAt: new Date(),
    durationMs: Date.now() - startTime,
    triggerRunId,
  },
})
```

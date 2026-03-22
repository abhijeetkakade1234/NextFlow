# NextFlow Architecture (2026)

## 1) High-Level System

```text
Browser UI (React Flow + Zustand)
  -> Next.js Route Handlers (App Router API)
    -> Prisma (Workflow/Run/NodeResult in PostgreSQL)
    -> Trigger.dev (DAG orchestrator + node tasks)
      -> Gemini API (LLM)
      -> Transloadit (media upload/output)
      -> FFmpeg/ffprobe (crop/extract)
```

## 2) Request/Execution Flow

```text
User edits canvas
  -> useAutoSave (debounced)
    -> PUT /api/workflows/[id]
      -> Zod validate graph
      -> Prisma update workflow JSON

User clicks Run (FULL/SELECTED/SINGLE)
  -> POST /api/runs
    -> create WorkflowRun + NodeResult rows (RUNNING)
    -> trigger workflow-execution-task (Trigger.dev)

workflow-execution-task
  -> build dependency waves for in-scope nodes
  -> resolve upstream inputs
  -> dispatch batch.triggerAndWait(...) for node tasks
  -> each child task writes NodeResult status/output/error
  -> finalize WorkflowRun as SUCCESS/PARTIAL/FAILED

UI polling
  -> GET /api/runs/[runId]
  -> update node cards + right sidebar history
```

## 3) Core Runtime Components

### Frontend
- Canvas + interactions: [WorkflowCanvas.tsx](/d:/NextFlow/src/components/canvas/WorkflowCanvas.tsx)
- Workflow editor shell/header/actions: [WorkflowEditorClient.tsx](/d:/NextFlow/src/app/(dashboard)/workflows/[id]/WorkflowEditorClient.tsx)
- Run history panel: [RightSidebar.tsx](/d:/NextFlow/src/components/sidebar/RightSidebar.tsx)
- Autosave: [useAutoSave.ts](/d:/NextFlow/src/hooks/useAutoSave.ts)

### API Layer (Next.js App Router)
- Runs create/list: [route.ts](/d:/NextFlow/src/app/api/runs/route.ts)
- Run detail: [route.ts](/d:/NextFlow/src/app/api/runs/[id]/route.ts)
- Workflow read/update/delete: [route.ts](/d:/NextFlow/src/app/api/workflows/[id]/route.ts)
- Workflow import: [route.ts](/d:/NextFlow/src/app/api/workflows/import/route.ts)
- Transloadit params signing: [route.ts](/d:/NextFlow/src/app/api/upload/params/route.ts)

### Execution Layer (Trigger.dev)
- Master DAG orchestrator: [workflow-execution-task.ts](/d:/NextFlow/src/trigger/workflow-execution-task.ts)
- Child tasks:
  - [text-node-task.ts](/d:/NextFlow/src/trigger/text-node-task.ts)
  - [upload-image-node-task.ts](/d:/NextFlow/src/trigger/upload-image-node-task.ts)
  - [upload-video-node-task.ts](/d:/NextFlow/src/trigger/upload-video-node-task.ts)
  - [llm-task.ts](/d:/NextFlow/src/trigger/llm-task.ts)
  - [crop-image-task.ts](/d:/NextFlow/src/trigger/crop-image-task.ts)
  - [extract-frame-task.ts](/d:/NextFlow/src/trigger/extract-frame-task.ts)
- Trigger config + FFmpeg extension: [trigger.config.ts](/d:/NextFlow/trigger.config.ts)

### Data/Validation/Security
- Prisma schema: [schema.prisma](/d:/NextFlow/prisma/schema.prisma)
- Workflow schemas: [workflow.schema.ts](/d:/NextFlow/src/schemas/workflow.schema.ts)
- Run schema: [run.schema.ts](/d:/NextFlow/src/schemas/run.schema.ts)
- Rate limiting: [rate-limit.ts](/d:/NextFlow/src/lib/rate-limit.ts)
- Auth proxy (Next 16 convention): [proxy.ts](/d:/NextFlow/src/proxy.ts)

## 4) Database Model

### Workflow
- Stores user-owned workflow metadata + canvas JSON (`nodesJson`, `edgesJson`, `viewport`).

### WorkflowRun
- One row per execution request.
- Tracks `scope` (`FULL|SELECTED|SINGLE`), overall `status`, timing, and included `nodeIds`.

### NodeResult
- One row per node for a run.
- Tracks `status`, `inputs`, `output`, `error`, timing, and `triggerRunId`.

Reference: [schema.prisma](/d:/NextFlow/prisma/schema.prisma)

## 5) Scope Semantics

- `FULL`: all nodes in workflow are included.
- `SELECTED`: only provided node IDs are included.
- `SINGLE`: only one node ID is included.

Important behavior:
- Dependencies outside current scope are not auto-executed.
- For scoped runs, static upstream values (e.g. text/upload node data) can still be used during input resolution.
- Missing required inputs fail fast at node level with deterministic `FAILED` node result.

## 6) Parallelism Model

- The master task executes nodes in topological waves.
- Nodes with all in-scope dependencies resolved are batched together.
- Wave tasks run concurrently via `batch.triggerAndWait`.
- Right sidebar shows node timing (start offset + start/end time + duration) for reviewer-visible parallel proof.

## 7) Abuse Protection

In-memory per-user/IP route rate limiters are enforced on mutation-heavy routes:
- `POST /api/runs`
- `PUT /api/workflows/[id]`
- `POST /api/workflows/import`
- `POST /api/upload/params`

Reference: [rate-limit.ts](/d:/NextFlow/src/lib/rate-limit.ts)

## 8) Deployment Topology

```text
Vercel (Next.js app)
  - App Router pages + API routes
  - Clerk auth enforcement (proxy.ts)
  - Prisma to Neon PostgreSQL

Trigger.dev worker
  - Executes workflow-execution-task + child tasks
  - Uses FFmpeg build extension
  - Calls Gemini + Transloadit
```

## 9) Reviewer Demo Critical Paths

1. `Text -> LLM`
2. `Upload Image -> Crop Image`
3. `Upload Video -> Extract Frame`
4. Parallel merge sample workflow (`Product Marketing Kit Generator`)

Checklist reference: [TESTING.md](/d:/NextFlow/docs/TESTING.md)

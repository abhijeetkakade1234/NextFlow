# NextFlow — Master Build Plan

## What We're Building
A pixel-perfect Krea.ai workflow builder clone focused on LLM workflows.
React Flow canvas · 6 node types · Trigger.dev execution · Gemini API · Clerk auth · Prisma + Neon PostgreSQL

---

## Tech Stack (locked, do not deviate)
| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js | 14 (App Router) |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | v3 |
| Canvas | React Flow | v11 |
| Auth | Clerk | v5 |
| DB ORM | Prisma | v5 |
| DB | Neon PostgreSQL | - |
| State | Zustand | v4 |
| Validation | Zod | v3 |
| Execution | Trigger.dev | v3 |
| File Upload | Transloadit | JS SDK |
| LLM | @google/generative-ai | latest |
| Icons | Lucide React | latest |
| Media | FFmpeg (via Trigger.dev) | - |

---

## Build Phases (execute in order)

### Phase 0 — Project Setup
- [ ] `npx create-next-app@latest nextflow --typescript --tailwind --app --src-dir`
- [ ] Install all deps (see SETUP.md)
- [ ] Configure `tsconfig.json` strict mode
- [ ] Set up `.env.local` (see ENV.md)
- [ ] `npx prisma init` → paste schema from SCHEMA.md
- [ ] `npx prisma db push` → verify on Neon dashboard
- [ ] Configure Clerk middleware (see ARCHITECTURE.md)
- [ ] Configure Trigger.dev v3 (see TRIGGER.md)
- [ ] Verify: `npm run dev` starts without errors

### Phase 1 — Layout Shell
- [ ] `globals.css` — Krea dark theme CSS variables
- [ ] Root layout with ClerkProvider
- [ ] Auth layout for sign-in/sign-up pages
- [ ] Dashboard layout with left + right sidebar slots
- [ ] `LeftSidebar.tsx` — static shell (no functionality yet)
- [ ] `RightSidebar.tsx` — static shell
- [ ] `WorkflowCanvas.tsx` — React Flow with dot grid, no nodes yet
- [ ] Verify: layout renders correctly at `/workflows`

### Phase 2 — Node UI (no execution)
Build each node component visually complete but non-functional.
Order: TextNode → UploadImageNode → UploadVideoNode → LLMNode → CropImageNode → ExtractFrameNode
- [ ] `BaseNode.tsx` — wrapper with glow effect, delete button, handle styles
- [ ] All 6 nodes rendering on canvas via drag from sidebar
- [ ] Verify: all nodes can be added, moved, deleted

### Phase 3 — State Management
- [ ] `workflow-store.ts` — nodes, edges, undo/redo
- [ ] `execution-store.ts` — per-node status (idle/running/success/error)
- [ ] `history-store.ts` — run history list
- [ ] Wire sidebar node buttons to store (click = add node)
- [ ] Wire undo/redo (Ctrl+Z / Ctrl+Y)
- [ ] DAG cycle detection on edge connect
- [ ] Type-safe edge validation (no image→text connections)
- [ ] Verify: all state operations work correctly

### Phase 4 — Database + API Routes
- [ ] `lib/prisma.ts` singleton
- [ ] `api/workflows/route.ts` — GET list, POST create
- [ ] `api/workflows/[id]/route.ts` — GET, PUT, DELETE
- [ ] `api/workflows/[id]/export/route.ts` — JSON export
- [ ] `api/runs/route.ts` — POST create run
- [ ] `api/runs/[id]/route.ts` — GET run + node details
- [ ] `api/upload/params/route.ts` — Transloadit signature
- [ ] All routes: Clerk auth check + Zod validation
- [ ] Verify: all API routes tested with REST client

### Phase 5 — Persistence
- [ ] Auto-save workflow to DB on change (debounced 1500ms)
- [ ] Load workflow from DB on page load
- [ ] Workflow list page at `/workflows`
- [ ] Create new workflow button
- [ ] Import workflow from JSON
- [ ] Verify: refresh page preserves workflow state

### Phase 6 — File Uploads (Transloadit)
- [ ] `api/upload/params/route.ts` — generate signed Transloadit params
- [ ] `UploadImageNode.tsx` — wire Transloadit upload + preview
- [ ] `UploadVideoNode.tsx` — wire Transloadit upload + video preview
- [ ] Verify: files upload and return CDN URL

### Phase 7 — Trigger.dev Tasks
- [ ] `trigger/llm-task.ts` — Gemini API call
- [ ] `trigger/crop-image-task.ts` — FFmpeg crop
- [ ] `trigger/extract-frame-task.ts` — FFmpeg frame extraction
- [ ] Verify: each task runs individually via Trigger.dev dashboard

### Phase 8 — Execution Engine
- [ ] `lib/execution-engine.ts` — topological sort + parallel branch detection
- [ ] Run full workflow button
- [ ] Run single node (right-click menu)
- [ ] Run selected nodes
- [ ] Pulsating glow effect during execution (CSS animation)
- [ ] Per-node result display (inline on node)
- [ ] Error display on failed nodes
- [ ] Run history saved to DB after each run
- [ ] Right sidebar history panel — list + click to expand
- [ ] Verify: sample workflow runs end-to-end

### Phase 9 — Sample Workflow
- [ ] Pre-built workflow JSON in `lib/sample-workflow.ts`
- [ ] "Load Sample" button on empty canvas
- [ ] Verify: all 9 nodes present, branches run in parallel

### Phase 10 — Polish + Deploy
- [ ] Animated purple edges
- [ ] MiniMap (bottom-right)
- [ ] Canvas fit-view on load
- [ ] Responsive overflow handling
- [ ] All loading spinners
- [ ] Error boundary components
- [ ] `vercel.json` with env var references
- [ ] Deploy to Vercel
- [ ] Verify: live URL works end-to-end

---

## Critical Rules (never break these)
1. **Every node execution MUST go through a Trigger.dev task** — no direct API calls in components
2. **All API routes MUST check Clerk auth** — `auth()` at the top of every route handler
3. **All API routes MUST validate with Zod** — before any DB or business logic
4. **Zustand is the single source of truth** for React Flow state — never use local useState for nodes/edges
5. **Circular connections are forbidden** — check DAG validity on every edge add
6. **Type-safe connections** — enforce handle types, reject invalid connections visually
7. **User isolation** — every DB query filters by `userId` from Clerk

---

## File Creation Order (avoid import errors)
```
types/ → schemas/ → lib/prisma.ts → store/ → lib/execution-engine.ts
→ components/ui/ → components/nodes/ → components/canvas/ → components/sidebar/
→ app/api/ → app/(auth)/ → app/(dashboard)/ → trigger/
```

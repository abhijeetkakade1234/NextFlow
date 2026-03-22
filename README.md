# NextFlow

NextFlow is a Krea-style visual workflow builder for LLM and media pipelines, built with Next.js App Router, React Flow, Trigger.dev v4, Clerk, Prisma, and Neon.

## Current Status

Implemented:
- Krea-like canvas layout with collapsible sidebars
- 6 node types: Text, Upload Image, Upload Video, Run LLM, Crop Image, Extract Frame
- Type-safe DAG connections + cycle prevention + undo/redo
- Workflow persistence (save/load/export/import JSON)
- Execution scopes: FULL, SINGLE, SELECTED
- Trigger.dev v4 execution pipeline with parallel DAG wave execution
- Every node execution routed through Trigger tasks (`text/upload/llm/crop/extract`)
- Run history panel with list + run detail (node-level status, inputs, outputs/errors, duration, timing offsets)
- Sample workflow loader (`Product Marketing Kit Generator`)

Still optional/polish:
- Additional product polish features beyond assignment rubric

## Stack

- Next.js `16.2.1`
- React `19`
- TypeScript `strict`
- Tailwind CSS `v4`
- React Flow `v12`
- Clerk `v7`
- Prisma `v7` + Neon PostgreSQL
- Trigger.dev `4.4.3`
- Transloadit
- Google Generative AI SDK

## Environment Variables

Create `.env.local` with:

```bash
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/workflows"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/workflows"

GOOGLE_GENERATIVE_AI_API_KEY="..."

TRIGGER_SECRET_KEY="tr_dev_..."
TRIGGER_PROJECT_ID="proj_..."

TRANSLOADIT_KEY="..."
TRANSLOADIT_SECRET="..."

# local-only (Windows)
# FFMPEG_PATH="C:\\...\\ffmpeg.exe"
# FFPROBE_PATH="C:\\...\\ffprobe.exe"
```

## Local Dev

```bash
npm install
npx prisma db push
npm run dev
```

App runs at `http://localhost:3000`.

## Deployment Notes

- `vercel.json` is included for env variable mapping.
- Use production Trigger key (`tr_prod_...`) and deploy tasks:

```bash
npx trigger.dev@latest deploy
```

## Production Smoke Checklist

Run these on deployed URL:

1. `Text -> LLM` completes and writes output.
2. `Upload Image -> Crop Image` returns cropped URL.
3. `Upload Video -> Extract Frame` returns frame URL.
4. Parallel merge sample workflow completes and final LLM waits for both branches.

# Trigger.dev (v4)

## Local Development

Use one command for app + worker:

```bash
npm run dev
```

This runs:
- `next dev`
- `trigger.dev dev --env-file .env.local`

## Required Env Vars

```bash
TRIGGER_SECRET_KEY=tr_dev_...
TRIGGER_PROJECT_ID=proj_...
DATABASE_URL=...
GOOGLE_GENERATIVE_AI_API_KEY=...
TRANSLOADIT_KEY=...
TRANSLOADIT_SECRET=...
```

## Task Layout

Tasks are in:
- `src/trigger/text-node-task.ts`
- `src/trigger/upload-image-node-task.ts`
- `src/trigger/upload-video-node-task.ts`
- `src/trigger/llm-task.ts`
- `src/trigger/crop-image-task.ts`
- `src/trigger/extract-frame-task.ts`
- `src/trigger/workflow-execution-task.ts` (master DAG orchestrator)

All node executions are Trigger tasks. The master task only orchestrates DAG waves and dispatches typed child tasks.

`trigger.config.ts` uses:

```ts
import { defineConfig } from '@trigger.dev/sdk'
import { ffmpeg } from '@trigger.dev/build/extensions/core'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  maxDuration: 300,
  dirs: ['src/trigger'],
  build: {
    extensions: [ffmpeg()],
  },
})
```

## Deploy

```bash
npx trigger.dev@latest deploy
```

Use `tr_prod_...` key in production.

## Scope Semantics

- `FULL`: run all nodes in DAG order with parallel waves.
- `SELECTED`: run only selected nodes; dependencies outside the selection are not auto-executed.
- `SINGLE`: run only one node; connected text/upload static values can be used as direct inputs.

# NextFlow Plan (Current)

This file tracks current assignment closure priorities.

## Priority 1: Reviewer-Critical UX

- Run history list + expandable run detail (node-level)
- Full / Single / Selected execution scope support in UI
- Deterministic loading/error states

## Priority 2: Deliverables

- Workflow import API (`POST /api/workflows/import`)
- Import JSON UI action
- Sample workflow loader (`Product Marketing Kit Generator`)
- Export/import round-trip verification

## Priority 3: Deployment Readiness

- Vercel env mapping (`vercel.json`)
- Trigger.dev production deploy flow
- Next 16 proxy convention (`src/proxy.ts`)

## Priority 4: Final Verification

- Execute all scenarios in `docs/TESTING.md`
- Confirm single-node run hard pass
- Confirm load/perf sanity run

## Current Architecture Guardrails

- Every node type executes through Trigger child tasks.
- Master workflow task only orchestrates dependency waves + scope behavior.
- Run history surfaces node-level timing offsets for parallel proof.
- Import API validates node/edge shape, handle compatibility, and node types.

## Notes

- Stack is Next 16 + Trigger.dev v4 + Prisma 7.
- Do not follow legacy docs that reference Trigger v3 or older Next conventions.

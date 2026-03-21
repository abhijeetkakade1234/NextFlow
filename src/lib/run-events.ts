// src/lib/run-events.ts
export const RUN_STARTED_EVENT = 'nextflow:run-started'

type RunStartedDetail = {
  runId: string
  nodeIds: string[]
}

export function emitRunStarted(runId: string, nodeIds: string[]) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<RunStartedDetail>(RUN_STARTED_EVENT, {
      detail: { runId, nodeIds },
    })
  )
}

export type { RunStartedDetail }


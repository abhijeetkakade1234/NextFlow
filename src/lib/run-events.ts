// src/lib/run-events.ts
export const RUN_STARTED_EVENT = 'nextflow:run-started'
export const RUN_HISTORY_REFRESH_EVENT = 'nextflow:run-history-refresh'

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
  window.dispatchEvent(new Event(RUN_HISTORY_REFRESH_EVENT))
}

export function emitRunHistoryRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(RUN_HISTORY_REFRESH_EVENT))
}

export type { RunStartedDetail }

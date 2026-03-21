// src/store/ui-store.ts
'use client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type UIState = {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  selectedRunId: string | null
  selectedNodeIds: string[]
  nodeSearch: string

  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setSelectedRunId: (id: string | null) => void
  setSelectedNodeIds: (ids: string[]) => void
  setNodeSearch: (q: string) => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    selectedRunId: null,
    selectedNodeIds: [],
    nodeSearch: '',

    toggleLeftSidebar: () => set(s => { s.leftSidebarOpen = !s.leftSidebarOpen }),
    toggleRightSidebar: () => set(s => { s.rightSidebarOpen = !s.rightSidebarOpen }),
    setSelectedRunId: (id) => set(s => { s.selectedRunId = id }),
    setSelectedNodeIds: (ids) => set(s => { s.selectedNodeIds = ids }),
    setNodeSearch: (q) => set(s => { s.nodeSearch = q }),
  }))
)

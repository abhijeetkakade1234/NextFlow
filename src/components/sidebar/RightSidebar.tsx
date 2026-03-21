// src/components/sidebar/RightSidebar.tsx
'use client'
import { ChevronRight, ChevronLeft, History } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

export function RightSidebar() {
  const { rightSidebarOpen, toggleRightSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        'h-full bg-[#111111] border-l border-[#1f1f1f] flex flex-col transition-all duration-200 flex-shrink-0',
        rightSidebarOpen ? 'w-72' : 'w-12'
      )}
    >
      {rightSidebarOpen ? (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[#7c3aed]" />
              <h2 className="text-sm font-semibold text-[#e5e5e5]">Run History</h2>
            </div>
            <button
              onClick={toggleRightSidebar}
              className="p-1 rounded text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <History size={32} className="text-[#1f1f1f] mx-auto mb-3" />
              <p className="text-sm text-[#6b7280]">No runs yet</p>
              <p className="text-xs text-[#6b7280] mt-1">Run a workflow to see history here</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-3">
          <button
            onClick={toggleRightSidebar}
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}

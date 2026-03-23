'use client'
import { useWorkflowStore } from '@/store/workflow-store'
import { useExecutionStore } from '@/store/execution-store'
import { UserButton } from '@clerk/nextjs'
import { Moon, Share2, Sparkles, Wand2, Info, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { workflowName, setWorkflowName, isSaving } = useWorkflowStore()
  const { isRunning } = useExecutionStore()

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
      {/* Left: Project Info */}
      <div className="flex items-center gap-3 bg-krea-surface backdrop-blur-md border border-krea-border rounded-full px-4 py-1.5 shadow-krea pointer-events-auto">
        <Link 
          href="/workflows"
          className="p-1 rounded-full hover:bg-white/10 text-krea-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="w-px h-4 bg-krea-border mx-1" />
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-krea-accent" />
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-sm font-medium text-white outline-none w-32 focus:w-48 transition-all"
            placeholder="Untitled"
          />
          {isSaving && <div className="w-1.5 h-1.5 rounded-full bg-krea-accent animate-pulse" />}
        </div>
      </div>

      {/* Center: Context/Status (Simulated) */}
      <div className="hidden md:flex items-center gap-4 bg-krea-surface backdrop-blur-md border border-krea-border rounded-full px-5 py-1.5 shadow-krea pointer-events-auto">
        <span className="text-xs font-medium text-krea-text-secondary">Flux Kontext</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white">6 CU</span>
          <Info size={12} className="text-krea-muted cursor-help" />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 bg-krea-surface backdrop-blur-md border border-krea-border rounded-full px-2 py-1 shadow-krea pointer-events-auto">
        <button className="p-2 rounded-full hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Moon size={18} />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 text-sm font-medium text-krea-text-secondary hover:text-white transition-all">
          <Share2 size={16} />
          <span>Share</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-1.5 bg-white text-black rounded-full text-sm font-bold hover:bg-white/90 transition-all">
          <Sparkles size={16} />
          <span>Turn workflow into app</span>
        </button>
        <div className="w-px h-6 bg-krea-border mx-1" />
        <div className="pr-1">
          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-7 h-7' } }} />
        </div>
      </div>
    </div>
  )
}

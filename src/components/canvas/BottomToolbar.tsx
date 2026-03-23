'use client'
import { useReactFlow } from '@xyflow/react'
import { 
  Undo2, Redo2, Keyboard, Plus, MousePointer2, 
  Hand, Scissors, Link2, ChevronUp 
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pointer-events-none">
      {/* Navigation Group */}
      <div className="flex items-center gap-1 bg-krea-surface backdrop-blur-md border border-krea-border rounded-xl px-1.5 py-1 shadow-krea pointer-events-auto">
        <button className="p-2 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Undo2 size={18} />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Redo2 size={18} />
        </button>
        <div className="w-px h-6 bg-krea-border mx-1" />
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm font-medium text-krea-text-secondary hover:text-white transition-colors">
          <Keyboard size={16} />
          <span>Keyboard shortcuts</span>
        </button>
      </div>

      {/* Tools Group */}
      <div className="flex items-center gap-1 bg-krea-surface backdrop-blur-md border border-krea-border rounded-xl px-1.5 py-1 shadow-krea pointer-events-auto">
        <button className="p-2.5 rounded-lg bg-krea-accent text-white shadow-lg shadow-krea-accent/20">
          <Plus size={20} />
        </button>
        <button className="p-2.5 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <MousePointer2 size={18} />
        </button>
        <button className="p-2.5 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Hand size={18} />
        </button>
        <button className="p-2.5 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Scissors size={18} />
        </button>
        <button className="p-2.5 rounded-lg hover:bg-white/10 text-krea-muted hover:text-white transition-colors">
          <Link2 size={18} />
        </button>
      </div>
    </div>
  )
}

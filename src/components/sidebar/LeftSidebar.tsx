'use client'
import { 
  Home, BrainCircuit, Layout, Box, 
  Image as ImageIcon, Video, Zap, Banana, 
  PlayCircle, Edit3, Mic2, Move, Cuboid, 
  RefreshCw, MoreHorizontal, ChevronLeft, ChevronRight,
  Search, Type, Bot, Crop, Film
} from 'lucide-react'
import { useWorkflowStore } from '@/store/workflow-store'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'train', icon: BrainCircuit, label: 'Train Lora' },
  { id: 'nodes', icon: Layout, label: 'Node Editor', active: true },
  { id: 'assets', icon: Box, label: 'Assets' },
]

const QUICK_ACCESS = [
  { type: 'textNode',         label: 'Text',      Icon: Type,   color: 'text-purple-400' },
  { type: 'uploadImageNode',  label: 'Image',     Icon: ImageIcon, color: 'text-blue-400' },
  { type: 'uploadVideoNode',  label: 'Video',     Icon: Video,     color: 'text-orange-400' },
  { type: 'llmNode',          label: 'Run LLM',   Icon: Bot,    color: 'text-violet-400' },
  { type: 'cropImageNode',    label: 'Crop',      Icon: Crop,   color: 'text-orange-400' },
  { type: 'extractFrameNode', label: 'Frame',     Icon: Film,   color: 'text-pink-400' },
]

export function LeftSidebar() {
  const addNode = useWorkflowStore(s => s.addNode)
  const { leftSidebarOpen, toggleLeftSidebar } = useUIStore()

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside
      className={cn(
        'h-full bg-krea-surface border-r border-krea-border flex flex-col transition-all duration-300 shadow-krea overflow-hidden',
        leftSidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Main Nav */}
      <div className="p-3 space-y-1">
        {MAIN_NAV.map((item) => (
          <button
            key={item.id}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group',
              item.active ? 'bg-white/10 text-white' : 'text-krea-muted hover:text-white hover:bg-white/5'
            )}
          >
            <item.icon size={20} className={cn('flex-shrink-0', item.active ? 'text-white' : 'text-krea-muted group-hover:text-white')} />
            {leftSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </div>

      <div className="px-3 mb-4">
        <div className={cn(
          "flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-3 py-2 transition-all focus-within:border-white/10",
          !leftSidebarOpen && "justify-center px-0"
        )}>
          <Search size={18} className="text-krea-muted" />
          {leftSidebarOpen && (
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent text-sm text-white outline-none w-full"
            />
          )}
        </div>
      </div>

      {/* Tools Section */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 hide-scrollbar">
        {leftSidebarOpen && (
          <p className="px-3 mb-2 text-[10px] font-bold text-krea-muted uppercase tracking-[0.2em]">Tools</p>
        )}
        
        {QUICK_ACCESS.map((node) => (
          <button
            key={node.type}
            draggable
            onDragStart={e => onDragStart(e, node.type)}
            onClick={() => addNode(node.type)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-krea-text-secondary hover:text-white hover:bg-white/5 transition-all group"
          >
            <node.Icon size={20} className={cn('flex-shrink-0', node.color)} />
            {leftSidebarOpen && (
              <>
                <span className="text-sm font-medium flex-1 text-left">{node.label}</span>
                <MoreHorizontal size={14} className="text-krea-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
        ))}
      </div>

      {/* Profile & Collapse */}
      <div className="p-3 mt-auto">
        <button
          onClick={toggleLeftSidebar}
          className="w-full flex items-center justify-center p-3 rounded-2xl text-krea-muted hover:text-white hover:bg-white/10 transition-all"
        >
          {leftSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  )
}


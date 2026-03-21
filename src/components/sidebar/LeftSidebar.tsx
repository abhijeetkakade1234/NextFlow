// src/components/sidebar/LeftSidebar.tsx
'use client'
import { Bot, Crop, Film, GripVertical, Image, Search, Type, Video, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflow-store'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'

const SIDEBAR_NODES = [
  { type: 'textNode',         label: 'Text',          Icon: Type,   color: 'text-purple-400' },
  { type: 'uploadImageNode',  label: 'Upload Image',  Icon: Image,  color: 'text-blue-400' },
  { type: 'uploadVideoNode',  label: 'Upload Video',  Icon: Video,  color: 'text-green-400' },
  { type: 'llmNode',          label: 'Run Any LLM',   Icon: Bot,    color: 'text-violet-400' },
  { type: 'cropImageNode',    label: 'Crop Image',    Icon: Crop,   color: 'text-orange-400' },
  { type: 'extractFrameNode', label: 'Extract Frame', Icon: Film,   color: 'text-pink-400' },
]

export function LeftSidebar() {
  const addNode = useWorkflowStore(s => s.addNode)
  const { leftSidebarOpen, toggleLeftSidebar, nodeSearch, setNodeSearch } = useUIStore()

  const filtered = SIDEBAR_NODES.filter(n =>
    n.label.toLowerCase().includes(nodeSearch.toLowerCase())
  )

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside
      className={cn(
        'h-full bg-[#111111] border-r border-[#1f1f1f] flex flex-col transition-all duration-200 flex-shrink-0',
        leftSidebarOpen ? 'w-60' : 'w-12'
      )}
    >
      {leftSidebarOpen ? (
        <>
          {/* Search */}
          <div className="p-3 border-b border-[#1f1f1f]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7280]" />
              <input
                value={nodeSearch}
                onChange={e => setNodeSearch(e.target.value)}
                placeholder="Search nodes..."
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg pl-8 pr-3 py-2
                           text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none
                           focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </div>

          {/* Label */}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Quick Access</p>
          </div>

          {/* Node Buttons */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {filtered.map(({ type, label, Icon, color }) => (
              <button
                key={type}
                draggable
                onDragStart={e => onDragStart(e, type)}
                onClick={() => addNode(type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                           text-[#e5e5e5] hover:bg-[#161616] hover:border-[#2a2a2a]
                           border border-transparent transition-all duration-150 group"
              >
                <div className={cn('p-1.5 rounded-md bg-[#0a0a0a] group-hover:bg-[#1f1f1f]', color)}>
                  <Icon size={14} />
                </div>
                <span className="text-sm">{label}</span>
                <GripVertical size={12} className="ml-auto text-[#6b7280] opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {/* Collapse toggle */}
          <div className="p-3 border-t border-[#1f1f1f]">
            <button
              onClick={toggleLeftSidebar}
              className="w-full flex items-center justify-center p-2 rounded-lg
                         text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-3 gap-2">
          <button
            onClick={toggleLeftSidebar}
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {SIDEBAR_NODES.map(({ type, Icon, color }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              title={type}
              className={cn('p-2 rounded-lg hover:bg-[#161616] transition-colors', color)}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

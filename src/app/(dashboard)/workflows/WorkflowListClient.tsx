// src/app/(dashboard)/workflows/WorkflowListClient.tsx
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Workflow, Play, Search, Eye, EyeOff, ChevronDown, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type WorkflowListItem = {
  id: string
  name: string
  updatedAt: Date
  _count: { runs: number }
}

// Mock Data for Templates
const TEMPLATES = [
  {
    id: 't1',
    name: 'Empty Workflow',
    desc: 'Start from scratch',
    img: null,
    nodes: [],
    edges: []
  },
  {
    id: 't2',
    name: 'Image Generator',
    desc: 'Simple text to image Generation with Krea 1',
    img: 'https://s.krea.ai/template/image-gen.webp',
    nodes: [
      { id: '1', type: 'textNode', position: { x: 100, y: 100 }, data: { content: 'A beautiful sunset over the mountains' } },
      { id: '2', type: 'llmNode', position: { x: 400, y: 100 }, data: { model: 'gemini-1.5-pro' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', targetHandle: 'user_message', type: 'custom' }
    ]
  },
  {
    id: 't3',
    name: 'Video Generator',
    desc: 'Simple Video Generation with Wan 2.1',
    img: 'https://s.krea.ai/template/video-gen.webp',
    nodes: [
      { id: '1', type: 'uploadVideoNode', position: { x: 100, y: 100 }, data: {} },
      { id: '2', type: 'extractFrameNode', position: { x: 400, y: 100 }, data: { timestamp: '0' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', targetHandle: 'video_url', type: 'custom' }
    ]
  },
]

export function WorkflowListClient({ initialWorkflows, createWorkflowAction, createFromTemplateAction }: {
  initialWorkflows: WorkflowListItem[]
  createWorkflowAction: (formData: FormData) => Promise<void>
  createFromTemplateAction: (name: string, nodes: any, edges: any) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState('projects')
  const [searchQuery, setSearchQuery] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)
  const [sortBy, setSortBy] = useState<'last_viewed' | 'date_created' | 'alphabetical'>('last_viewed')
  const [orderBy, setOrderBy] = useState<'newest' | 'oldest'>('newest')
  const [isSortOpen, setIsSortOpen] = useState(false)

  const filteredWorkflows = useMemo(() => {
    let list = [...initialWorkflows]

    // Tab filter 
    if (activeTab === 'templates') {
      return TEMPLATES.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Projects Tab
    if (searchQuery) {
      list = list.filter(wf => wf.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (hideEmpty) {
      list = list.filter(wf => wf._count.runs > 0)
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'last_viewed' || sortBy === 'date_created') {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      } else if (sortBy === 'alphabetical') {
        comparison = a.name.localeCompare(b.name)
      }

      return orderBy === 'newest' ? comparison : -comparison
    })

    return list
  }, [initialWorkflows, activeTab, searchQuery, hideEmpty, sortBy, orderBy])

  return (
    <div className="px-12 pt-0 pb-12">
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 pt-20 sticky top-0 bg-[#0b0b0b] z-30">
        <div className="flex items-center gap-1">
          {['Projects', 'Apps', 'Examples', 'Templates'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`text-sm font-bold px-3.5 py-1 rounded-xl transition-all ${activeTab === tab.toLowerCase()
                ? 'bg-[#1a1a1a] text-white'
                : 'text-krea-muted hover:text-white'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-krea-muted group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-full pl-10 pr-4 py-1.5 h-9 text-xs outline-none focus:bg-white/10 focus:border-white/10 transition-all w-72 placeholder-krea-muted font-medium"
            />
          </div>

          <div className="relative">
            <div
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-9 px-4 flex items-center gap-2 bg-white/5 border border-white/5 rounded-full text-sm font-bold text-white cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all select-none"
            >
              <span className="whitespace-nowrap capitalize">
                {sortBy === 'last_viewed' ? 'Last viewed' : sortBy === 'alphabetical' ? 'Alphabetical' : 'Date created'}
              </span>
              <ChevronDown size={14} className={`text-krea-muted transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Sort Dropdown Menu */}
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-krea-surface-solid border border-white/5 rounded-2xl shadow-2xl z-50 py-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Sort by</span>
                  </div>

                  {[
                    { id: 'last_viewed', label: 'Last viewed' },
                    { id: 'date_created', label: 'Date created' },
                    { id: 'alphabetical', label: 'Alphabetical' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id as any); setIsSortOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                    >
                      {opt.label}
                      {sortBy === opt.id && <Check size={14} className="text-white" />}
                    </button>
                  ))}

                  <div className="my-2 border-t border-white/5" />

                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Order by</span>
                  </div>

                  {[
                    { id: 'newest', label: 'Newest first' },
                    { id: 'oldest', label: 'Oldest first' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setOrderBy(opt.id as any); setIsSortOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 transition-colors text-left"
                    >
                      {opt.label}
                      {orderBy === opt.id && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setHideEmpty(!hideEmpty)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border ${hideEmpty
              ? 'bg-krea-accent/20 border-krea-accent/40 text-krea-accent'
              : 'bg-white/5 border-white/5 text-krea-muted hover:text-white'
              }`}
            title={hideEmpty ? "Show all projects" : "Hide empty projects"}
          >
            {hideEmpty ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
        {/* New Workflow Card (only on projects tab and when not searching) */}
        {activeTab === 'projects' && !searchQuery && (
          <form action={createWorkflowAction} className="flex flex-col group">
            <button
              type="submit"
              className="w-full aspect-[4/3] bg-[#141414] border border-white/5 rounded-2xl flex items-center justify-center hover:border-white/10 hover:bg-white/5 transition-all group shadow-sm shadow-black/40"
            >
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Plus size={18} className="text-black" strokeWidth={3} />
              </div>
            </button>
            <div className="mt-2.5 px-0.5">
              <p className="text-sm font-bold text-white group-hover:text-white/80 transition-colors">New Workflow</p>
            </div>
          </form>
        )}

        {/* Categories Rendering */}
        {activeTab === 'projects' && filteredWorkflows.map((wf: any) => (
          <Link
            key={wf.id}
            href={`/workflows/${wf.id}`}
            className="flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="aspect-[4/3] bg-[#141414] rounded-2xl border border-white/5 overflow-hidden relative group-hover:border-white/10 transition-all shadow-xl shadow-black/40">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <Workflow size={20} className="text-krea-muted" />
                </div>
              </div>
            </div>
            <div className="mt-2.5 px-0.5 space-y-0.5">
              <p className="text-sm font-bold text-white group-hover:text-white/80 transition-colors line-clamp-1">
                {wf.name || 'Untitled'}
              </p>
              <p className="text-[11px] font-medium text-white/40">
                Edited {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        ))}

        {activeTab === 'templates' && (filteredWorkflows as typeof TEMPLATES).map((tmpl) => (
          <div
            key={tmpl.id}
            onClick={() => createFromTemplateAction(tmpl.name, tmpl.nodes, tmpl.edges)}
            className="flex flex-col group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="aspect-video bg-[#141414] rounded-2xl border border-white/5 overflow-hidden relative group-hover:border-white/10 transition-all flex items-center justify-center shadow-xl shadow-black/40">
              {tmpl.id === 't1' ? (
                <Plus size={24} className="text-white/20 group-hover:text-white/40 transition-all" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-black flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                  <Workflow size={36} className="text-krea-accent" />
                </div>
              )}
            </div>
            <div className="mt-2.5 px-0.5 space-y-0.5">
              <p className="text-sm font-bold text-white group-hover:text-krea-accent transition-colors line-clamp-1">{tmpl.name}</p>
              <p className="text-[10px] text-white/40 leading-relaxed line-clamp-1">{tmpl.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 opacity-20">
          <Workflow size={64} className="mb-4 stroke-1" />
          <p className="text-lg font-bold uppercase tracking-widest">No matching results</p>
        </div>
      )}
    </div>
  )
}

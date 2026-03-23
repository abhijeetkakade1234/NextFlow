// src/components/nodes/UploadVideoNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Video, Loader2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadVideoFlowNode } from '@/types/nodes'
import { cn } from '@/lib/utils'

export function UploadVideoNode({ id, data }: NodeProps<UploadVideoFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const normalizeUrl = (value: string): string => {
    if (value.startsWith('//')) return `https:${value}`
    if (value.startsWith('http://')) return value.replace('http://', 'https://')
    return value
  }

  const extractResultUrl = (resultItem: Record<string, unknown> | undefined): string | null => {
    if (!resultItem) return null
    const ssl = resultItem.ssl_url
    if (typeof ssl === 'string' && ssl.length > 0) return normalizeUrl(ssl)
    const url = resultItem.url
    if (typeof url === 'string' && url.length > 0) return normalizeUrl(url)
    return null
  }

  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true)
      setUploadStatus('Preparing...')
      updateNodeData(id, { error: null })

      const res = await fetch('/api/upload/params', {
        method: 'POST',
        body: JSON.stringify({ fileType: 'video', fileName: file.name }),
        headers: { 'Content-Type': 'application/json' },
      })
      const paramsPayload = await res.json()
      if (!res.ok) {
        updateNodeData(id, { error: paramsPayload.error ?? 'Failed setup' })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }
      const { params, paramsString, signature } = paramsPayload

      const formData = new FormData()
      formData.append('params', typeof paramsString === 'string' ? paramsString : JSON.stringify(params))
      formData.append('signature', signature)
      formData.append('file', file)

      const uploadRes = await fetch('https://api2.transloadit.com/assemblies', {
        method: 'POST',
        body: formData,
      })
      const assembly = await uploadRes.json()
      if (!uploadRes.ok) {
        updateNodeData(id, { error: 'Upload failed' })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }

      let attempts = 0
      const poll = async (): Promise<string | null> => {
        setUploadStatus(`Uploading... ${Math.min(attempts + 1, 20)}/20`)
        const statusRes = await fetch(`https://api2.transloadit.com/assemblies/${assembly.assembly_id}`)
        const status = await statusRes.json()
        if (status.ok === 'ASSEMBLY_COMPLETED') {
          return (
            extractResultUrl(status.results?.playable?.[0]) ??
            extractResultUrl(status.results?.encoded?.[0]) ??
            extractResultUrl(status.results?.optimized?.[0]) ??
            extractResultUrl(status.results?.[':original']?.[0])
          )
        }
        if (attempts++ < 20) {
          await new Promise(r => setTimeout(r, 1000))
          return poll()
        }
        return null
      }

      const videoUrl = await poll()
      if (videoUrl) {
        updateNodeData(id, { videoUrl, fileName: file.name, error: null })
      } else {
        updateNodeData(id, { error: 'Failed' })
      }
      setIsUploading(false)
      setUploadStatus(null)
    } catch {
      updateNodeData(id, { error: 'Error' })
      setIsUploading(false)
      setUploadStatus(null)
    }
  }, [id, updateNodeData])

  return (
    <BaseNode id={id} title="Video Importer" icon={<Video size={18} />} showRunButton={false}>
      <div className="flex flex-col gap-4">
        {data.videoUrl ? (
          <div className="relative group/vid animate-in fade-in zoom-in-95 duration-500">
            <div className="aspect-video w-full rounded-[24px] overflow-hidden border border-white/10 shadow-xl bg-black/40">
              <video
                src={data.videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => updateNodeData(id, { videoUrl: null, fileName: null })}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white
                         flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-all hover:bg-krea-error"
            >
              ✕
            </button>
            <div className="mt-3 px-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest truncate max-w-[150px]">
                {data.fileName || 'Video Asset'}
              </span>
              <span className="text-[9px] font-mono text-krea-muted bg-white/5 px-2 py-0.5 rounded-full">
                VID
              </span>
            </div>
          </div>
        ) : (
          <label className={cn(
            "flex flex-col items-center justify-center h-48 rounded-[32px] border-2 border-dashed transition-all cursor-pointer nodrag group/upload",
            isUploading ? "border-red-400 bg-red-400/5" : "border-white/5 hover:border-white/20 hover:bg-white/5"
          )}>
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                   <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center" />
                   <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-red-400 animate-spin" />
                </div>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  {uploadStatus}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-300">
                   <Upload size={20} className="text-krea-muted group-hover/upload:text-white transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white mb-1 uppercase tracking-tighter">Select Video</p>
                  <p className="text-[10px] font-medium text-krea-muted uppercase tracking-[0.05em]">MP4, MOV, WEBM</p>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".mp4,.mov,.webm,.m4v"
              className="hidden"
              disabled={isUploading}
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        )}

        {data.error && (
          <div className="bg-krea-error/10 border border-krea-error/20 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-krea-error uppercase tracking-widest text-center">{data.error}</p>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="video_url"
        className="!bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      />
    </BaseNode>
  )
}

export default UploadVideoNode

// src/components/nodes/UploadImageNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import { cn } from '@/lib/utils'
import type { UploadImageFlowNode } from '@/types/nodes'

export function UploadImageNode({ id, data }: NodeProps<UploadImageFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const extractResultUrl = (resultItem: Record<string, unknown> | undefined): string | null => {
    if (!resultItem) return null
    const ssl = resultItem.ssl_url
    if (typeof ssl === 'string' && ssl.length > 0) return ssl
    const url = resultItem.url
    if (typeof url === 'string' && url.length > 0) return url
    return null
  }

  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true)
      setUploadStatus('Preparing...')
      updateNodeData(id, { error: null })

      const res = await fetch('/api/upload/params', {
        method: 'POST',
        body: JSON.stringify({ fileType: 'image', fileName: file.name }),
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
        setUploadStatus(`Uploading... ${Math.min(attempts + 1, 10)}`)
        const statusRes = await fetch(`https://api2.transloadit.com/assemblies/${assembly.assembly_id}`)
        const status = await statusRes.json()
        if (status.ok === 'ASSEMBLY_COMPLETED') {
          return extractResultUrl(status.results?.optimized?.[0]) ?? extractResultUrl(status.results?.[':original']?.[0])
        }
        if (attempts++ < 10) {
          await new Promise(r => setTimeout(r, 1000))
          return poll()
        }
        return null
      }

      const imageUrl = await poll()
      if (imageUrl) {
        updateNodeData(id, { imageUrl, fileName: file.name, error: null })
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
    <BaseNode id={id} title="Asset Importer" icon={<ImageIcon size={18} />} showRunButton={false}>
      <div className="flex flex-col gap-4">
        {data.imageUrl ? (
          <div className="relative group/img animate-in fade-in zoom-in-95 duration-500">
            <div className="aspect-video w-full rounded-[24px] overflow-hidden border border-white/10 shadow-xl bg-black/40">
              <img
                src={data.imageUrl}
                alt={data.fileName ?? 'uploaded'}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700"
              />
            </div>
            <button
              onClick={() => updateNodeData(id, { imageUrl: null, fileName: null })}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white
                         flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all hover:bg-krea-error"
            >
              ✕
            </button>
            <div className="mt-3 px-1 flex items-center justify-between">
              <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest truncate max-w-[150px]">
                {data.fileName || 'Image Asset'}
              </span>
              <span className="text-[9px] font-mono text-krea-muted bg-white/5 px-2 py-0.5 rounded-full">
                IMG
              </span>
            </div>
          </div>
        ) : (
          <label className={cn(
            "flex flex-col items-center justify-center h-48 rounded-[32px] border-2 border-dashed transition-all cursor-pointer nodrag group/upload",
            isUploading ? "border-krea-accent bg-krea-accent/5" : "border-white/5 hover:border-white/20 hover:bg-white/5"
          )}>
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                   <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center" />
                   <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-krea-accent animate-spin" />
                </div>
                <span className="text-[10px] font-bold text-krea-accent uppercase tracking-widest animate-pulse">
                  {uploadStatus}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-300">
                   <Upload size={20} className="text-krea-muted group-hover/upload:text-white transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white mb-1 uppercase tracking-tighter">Click to upload</p>
                  <p className="text-[10px] font-medium text-krea-muted uppercase tracking-[0.05em]">PNG, JPG or WEBP</p>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              disabled={isUploading}
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        )}

        {data.error ? (
          <div className="bg-krea-error/10 border border-krea-error/20 rounded-2xl p-3 animate-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-krea-error uppercase tracking-widest text-center">{data.error}</p>
          </div>
        ) : (
           <div className="px-1 opacity-40">
             <div className="h-px w-full bg-white/5 mb-3" />
             <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-krea-muted uppercase tracking-widest">Connect to input</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             </div>
           </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="image_url"
        className="!bg-blue-500"
      />
    </BaseNode>
  )
}

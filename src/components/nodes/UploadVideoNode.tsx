// src/components/nodes/UploadVideoNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Video, Loader2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadVideoFlowNode } from '@/types/nodes'

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
      setUploadStatus('Preparing upload...')
      updateNodeData(id, { error: null })

      const res = await fetch('/api/upload/params', {
        method: 'POST',
        body: JSON.stringify({ fileType: 'video', fileName: file.name }),
        headers: { 'Content-Type': 'application/json' },
      })
      const paramsPayload = await res.json()
      if (!res.ok) {
        updateNodeData(id, {
          error: paramsPayload.error ?? 'Failed to prepare upload params',
        })
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
        const uploadError =
          assembly?.error ??
          assembly?.message ??
          (Array.isArray(assembly?.errors) ? assembly.errors.join(', ') : null) ??
          `Transloadit upload failed (${uploadRes.status})`
        updateNodeData(id, { error: uploadError })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }
      if (!assembly?.assembly_id) {
        updateNodeData(id, {
          error: 'Upload failed: missing assembly id from Transloadit',
        })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }

      let attempts = 0
      const poll = async (): Promise<string | null> => {
        setUploadStatus(`Processing upload... (${Math.min(attempts + 1, 20)}/20)`)
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
        updateNodeData(id, {
          videoUrl,
          fileName: file.name,
          error: null,
        })
        setIsUploading(false)
        setUploadStatus(null)
      } else {
        updateNodeData(id, {
          error: 'Upload polling timed out or assembly did not complete',
        })
        setIsUploading(false)
        setUploadStatus(null)
      }
    } catch (err) {
      console.error('Upload failed', err)
      updateNodeData(id, {
        error: 'Upload failed. Check console/logs for details.',
      })
      setIsUploading(false)
      setUploadStatus(null)
    }
  }, [id, updateNodeData])

  return (
    <BaseNode id={id} title="Upload Video" icon={<Video size={14} />} showRunButton={false}>
      {data.videoUrl ? (
        <div className="relative">
          <video
            src={data.videoUrl}
            controls
            className="w-full rounded-lg border border-[#1f1f1f] max-h-32"
            onError={() =>
              updateNodeData(id, {
                error: 'Video URL could not be rendered in browser. Try re-uploading the file.',
              })
            }
          />
          <button
            onClick={() => updateNodeData(id, { videoUrl: null, fileName: null })}
            className="absolute top-1 right-1 bg-[#0a0a0a]/80 rounded p-0.5 text-[#6b7280] hover:text-red-400"
          >
            ✕
          </button>
          {data.fileName && (
            <p className="text-xs text-[#6b7280] mt-1 truncate">{data.fileName}</p>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed
                         border-[#1f1f1f] rounded-lg cursor-pointer hover:border-[#7c3aed]
                         transition-colors nodrag">
          {isUploading ? (
            <>
              <Loader2 size={20} className="text-[#7c3aed] mb-1 animate-spin" />
              <span className="text-xs text-[#9ca3af]">{uploadStatus ?? 'Uploading...'}</span>
            </>
          ) : (
            <>
              <Upload size={20} className="text-[#6b7280] mb-1" />
              <span className="text-xs text-[#6b7280]">mp4, mov, webm, m4v</span>
            </>
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
        <div className="mt-2 p-2 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/30">
          <p className="text-xs text-red-400">{data.error}</p>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="video_url"
        className="!bg-green-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
      />
    </BaseNode>
  )
}

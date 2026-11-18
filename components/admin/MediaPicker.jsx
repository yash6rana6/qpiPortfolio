'use client'

import { useCallback, useEffect, useState } from 'react'
import MediaUploader from './MediaUploader.jsx'
import { formatBytes, formatDuration, thumbUrl } from '../../lib/media.js'

/** Modal: choose an already-uploaded file (or upload a new one) for an event's poster / video. */
export default function MediaPicker({ kind = 'image', onSelect, onClose }) {
  const [items, setItems] = useState([])
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ type: kind })
      if (folder) qs.set('folder', folder)
      const res = await fetch(`/api/v1/admin/media?${qs}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Library could not be loaded')
      setItems(data.items)
      setFolders(data.folders)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [kind, folder])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose ${kind}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-xl font-black text-zinc-900">
            Choose {kind === 'video' ? 'a video' : 'an image'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="rounded-xl border border-orange-200 bg-orange-50/50 px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100"
            >
              {showUpload ? 'Hide upload' : '+ Upload new'}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100">
              Close
            </button>
          </div>
        </div>

        {showUpload && (
          <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <MediaUploader
              kind={kind}
              folders={folders.map((f) => f.name)}
              defaultFolder={folder}
              onUploaded={(item) => {
                setShowUpload(false)
                onSelect(item.url) // just uploaded: use it straight away
              }}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFolder('')}
            className={`rounded-full px-3 py-1 text-xs font-bold ${folder === '' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            All folders
          </button>
          {folders.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => setFolder(f.name)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${folder === f.name ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {f.name} ({f.count})
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p>}

        <div className="mt-4 min-h-[8rem] overflow-y-auto">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && !error && items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-orange-200 p-8 text-center text-sm font-medium text-zinc-400">
              Nothing here yet. Use “+ Upload new”.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {items.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => onSelect(m.url)}
                className="group overflow-hidden rounded-2xl border border-orange-100 bg-white text-left transition-all hover:border-[#FF6B5B] hover:shadow-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(m)} alt={m.name} loading="lazy" className="aspect-[3/2] w-full bg-zinc-100 object-cover" />
                <div className="p-2.5">
                  <p className="truncate text-xs font-bold text-zinc-800">{m.name}</p>
                  <p className="truncate text-[11px] text-zinc-400">
                    {m.folder} · {formatBytes(m.bytes)}
                    {m.duration ? ` · ${formatDuration(m.duration)}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

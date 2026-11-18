'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../components/AuthProvider.jsx'
import MediaUploader from '../../../components/admin/MediaUploader.jsx'
import { formatBytes, formatDuration, thumbUrl } from '../../../lib/media.js'

const TYPES = [
  ['', 'All'],
  ['image', 'Images'],
  ['video', 'Videos']
]

export default function MediaLibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [items, setItems] = useState([])
  const [folders, setFolders] = useState([])
  const [folder, setFolder] = useState('')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(null)
  const [copied, setCopied] = useState(null)

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams()
      if (folder) qs.set('folder', folder)
      if (type) qs.set('type', type)
      if (q.trim()) qs.set('q', q.trim())
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
  }, [folder, type, q])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/admin/media')
      return
    }
    if (user.role !== 'admin') return
    const t = setTimeout(load, q ? 250 : 0) // small debounce while typing in search
    return () => clearTimeout(t)
  }, [user, authLoading, router, load, q])

  if (authLoading || !user) return <main className="min-h-screen bg-[#FFFDF9]" />

  if (user.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-6 text-zinc-800">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-black text-zinc-900">This area is for organisers</h1>
          <Link href="/" className="mt-8 inline-block rounded-xl bg-[#FF6B5B] px-6 py-3 text-sm font-bold text-white">Back to QPIE</Link>
        </div>
      </main>
    )
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete “${item.name}” permanently? It is removed from Cloudinary too.`)) return
    try {
      const res = await fetch(`/api/v1/admin/media/${item._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'File could not be deleted')
      setItems((prev) => prev.filter((m) => m._id !== item._id))
      load() // refresh folder counts
    } catch (err) {
      setError(err.message)
    }
  }

  async function copyUrl(item) {
    try {
      await navigator.clipboard.writeText(item.url)
      setCopied(item._id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      window.prompt('Copy this URL:', item.url)
    }
  }

  const chip = (active) =>
    `rounded-full px-3 py-1 text-xs font-bold transition-colors ${active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`

  return (
    <main className="min-h-screen w-full bg-[#FFFDF9] px-6 py-12 text-zinc-800 md:px-16">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-xs font-semibold text-zinc-500 transition-colors hover:text-[#FF6B5B]">← Event dashboard</Link>
        <span className="text-xs font-medium text-zinc-500">{user.name} · organiser</span>
      </div>

      <div className="mt-6 border-b border-orange-100 pb-6">
        <h1 className="font-display text-4xl font-black text-zinc-900 md:text-5xl">Media library</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Images and videos stored on Cloudinary. Pick them as an event&apos;s poster or video from the event form.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="h-fit rounded-3xl border border-orange-100 bg-white p-8 shadow-xl shadow-orange-500/5">
          <h2 className="font-display text-xl font-black text-zinc-900">Upload</h2>
          <div className="mt-6">
            <MediaUploader folders={folders.map((f) => f.name)} defaultFolder={folder} onUploaded={() => load()} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map(([value, label]) => (
              <button key={value} onClick={() => setType(value)} className={chip(type === value)}>{label}</button>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search media by name"
              className="ml-auto w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-[#FF6B5B] md:w-56"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFolder('')} className={chip(folder === '')}>All folders</button>
            {folders.map((f) => (
              <button key={f.name} onClick={() => setFolder(f.name)} className={chip(folder === f.name)}>
                {f.name} ({f.count})
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-orange-200 p-12 text-center text-sm font-medium text-zinc-400">
              No files here yet. Upload your first one on the left.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((m) => (
              <div key={m._id} className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all hover:border-orange-300 hover:shadow-md">
                <div className="relative aspect-[3/2] bg-zinc-100">
                  {m.resourceType === 'video' && playing === m._id ? (
                    <video src={m.url} controls autoPlay className="h-full w-full bg-black object-contain" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl(m)} alt={m.name} loading="lazy" className="h-full w-full object-cover" />
                      {m.resourceType === 'video' && (
                        <button
                          onClick={() => setPlaying(m._id)}
                          aria-label={`Play ${m.name}`}
                          className="absolute inset-0 flex items-center justify-center bg-black/20 text-3xl text-white transition-colors hover:bg-black/40"
                        >
                          ▶
                        </button>
                      )}
                    </>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-700">
                    {m.resourceType}
                  </span>
                </div>

                <div className="space-y-1 p-4">
                  <p className="truncate font-display text-sm font-extrabold text-zinc-900">{m.name}</p>
                  <p className="truncate text-xs text-zinc-500">📁 {m.folder}</p>
                  <p className="text-xs text-zinc-400">
                    {[m.format?.toUpperCase(), formatBytes(m.bytes), m.width && m.height ? `${m.width}×${m.height}` : '', formatDuration(m.duration)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => copyUrl(m)} className="flex-1 rounded-xl border border-orange-200 bg-orange-50/50 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100">
                      {copied === m._id ? 'Copied ✓' : 'Copy URL'}
                    </button>
                    <button onClick={() => handleDelete(m)} className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

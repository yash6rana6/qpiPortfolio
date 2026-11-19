'use client'

import { useRef, useState } from 'react'
import { MAX_IMAGE_MB, MAX_VIDEO_MB, uploadMedia } from '../../lib/media.js'

const field =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-[#FF6B5B] focus:bg-white focus:ring-2 focus:ring-[#FF6B5B]/20'
const labelClass = 'text-xs font-semibold text-zinc-500'

/**
 * Upload form: file + name + folder. `kind` limits the file picker ('image' | 'video' | 'all').
 * `folders` = existing folder names (suggestions; typing a new name creates it).
 */
export default function MediaUploader({ folders = [], kind = 'all', defaultFolder = '', onUploaded }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [folder, setFolder] = useState(defaultFolder)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : 'image/*,video/*'

  function pick(e) {
    const f = e.target.files?.[0]
    setFile(f || null)
    setError('')
    // Suggest the file name (without extension) as the display name.
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return setError('Choose a file first')
    if (!name.trim()) return setError('Give the file a name')

    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const saved = await uploadMedia({ file, name: name.trim(), folder: folder.trim(), onProgress: setProgress })
      setFile(null)
      setName('')
      if (fileRef.current) fileRef.current.value = ''
      onUploaded?.(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="media-name" className={labelClass}>Name</label>
          <input id="media-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Neon Fest poster" maxLength={80} className={field} />
        </div>

        <div className="space-y-1">
          <label htmlFor="media-folder" className={labelClass}>Folder (pick one or type a new name)</label>
          <input
            id="media-folder"
            list="media-folders"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="e.g. concerts/posters"
            className={field}
          />
          <datalist id="media-folders">
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <p className="text-[11px] text-zinc-400">
            Album tip: use an event&apos;s exact title as the folder (e.g. &quot;Neon Fest 2026&quot;) and its files appear in that event&apos;s chapter of the public album.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="media-file" className={labelClass}>
          File — {kind !== 'video' && `image up to ${MAX_IMAGE_MB} MB`}
          {kind === 'all' && ' · '}
          {kind !== 'image' && `video up to ${MAX_VIDEO_MB} MB`}
        </label>
        <input
          id="media-file"
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={pick}
          className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-50 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-orange-600 hover:file:bg-orange-100"
        />
      </div>

      {busy && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-[#FF6B5B] transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[#FF6B5B] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#FF6B5B]/30 transition-all hover:bg-[#e85446] active:scale-95 disabled:opacity-50"
      >
        {busy ? `Uploading… ${progress}%` : 'Upload'}
      </button>
    </form>
  )
}

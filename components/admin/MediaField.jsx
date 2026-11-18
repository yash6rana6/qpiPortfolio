'use client'

import { useState } from 'react'
import MediaPicker from './MediaPicker.jsx'
import { optimizedImage } from '../../lib/media.js'

const field =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-[#FF6B5B] focus:bg-white focus:ring-2 focus:ring-[#FF6B5B]/20'
const labelClass = 'text-xs font-semibold text-zinc-500'

/** URL input + "Library" button (pick or upload on Cloudinary) + small preview. */
export default function MediaField({ id, label, kind, value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input id={id} placeholder="https://… or choose from library" value={value || ''} onChange={(e) => onChange(e.target.value)} className={field} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl border border-orange-200 bg-orange-50/50 px-4 text-xs font-bold text-orange-600 transition-all hover:bg-orange-100 active:scale-95"
        >
          Library
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-500 hover:bg-zinc-100"
            aria-label={`Clear ${label}`}
          >
            ✕
          </button>
        )}
      </div>

      {value && kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={optimizedImage(value, 400)} alt="Poster preview" className="mt-2 h-24 rounded-xl border border-zinc-200 object-cover" />
      )}
      {value && kind === 'video' && (
        <video src={value} controls preload="metadata" className="mt-2 h-32 rounded-xl border border-zinc-200 bg-black" />
      )}

      {open && (
        <MediaPicker
          kind={kind}
          onClose={() => setOpen(false)}
          onSelect={(url) => {
            onChange(url)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

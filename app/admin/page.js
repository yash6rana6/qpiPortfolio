'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'
import { toDateTimeLocal } from '../../lib/utils.js'

const EMPTY_FORM = {
  title: '',
  category: 'Concert',
  venue: '',
  city: '',
  date: '',
  endDate: '',
  description: '',
  posterImage: '',
  videoUrl: '',
  accentColor: 'pink',
  pricePerSeat: 0,
  totalSeats: 0,
  availableSeats: 0,
  isRecent: true,
  status: 'published'
}

const field =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:border-[#FF6B5B] focus:bg-white focus:ring-2 focus:ring-[#FF6B5B]/20'
const labelClass = 'text-xs font-semibold text-zinc-500'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/events', { cache: 'no-store' })
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      setError('Events could not be loaded. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/admin')
      return
    }
    if (user.role !== 'admin') return
    loadEvents()
  }, [user, authLoading, router, loadEvents])

  if (authLoading || !user) {
    return <main className="min-h-screen bg-[#FFFDF9]" />
  }

  if (user.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-6 text-zinc-800">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-black text-zinc-900">This area is for organisers</h1>
          <p className="mt-3 text-sm text-zinc-500">
            Your account doesn&apos;t have admin access. If that&apos;s wrong, ask an existing admin to upgrade it.
          </p>
          <Link href="/" className="mt-8 inline-block rounded-xl bg-[#FF6B5B] px-6 py-3 text-sm font-bold text-white">
            Back to QPIE
          </Link>
        </div>
      </main>
    )
  }

  function startEdit(event) {
    setEditingId(event._id)
    setForm({
      ...EMPTY_FORM,
      ...event,
      date: toDateTimeLocal(event.date),
      endDate: toDateTimeLocal(event.endDate)
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      pricePerSeat: Number(form.pricePerSeat) || 0,
      totalSeats: Number(form.totalSeats) || 0,
      availableSeats: Number(form.availableSeats) || 0,
      date: form.date ? new Date(form.date).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null
    }

    try {
      const url = editingId ? `/api/v1/events/${editingId}` : '/api/v1/events'
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const saved = await res.json()
      if (!res.ok) throw new Error(saved.error || 'Event could not be saved')

      setEvents((prev) =>
        editingId ? prev.map((ev) => (ev._id === editingId ? saved : ev)) : [saved, ...prev]
      )
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event? Existing bookings will keep their records.')) return

    try {
      const res = await fetch(`/api/v1/events/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Event could not be deleted')
      }
      setEvents((prev) => prev.filter((ev) => ev._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#FFFDF9] px-6 py-12 text-zinc-800 md:px-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs font-semibold text-zinc-500 transition-colors hover:text-[#FF6B5B]">
          ← Back to QPIE
        </Link>
        <span className="text-xs font-medium text-zinc-500">
          {user.name} · organiser
        </span>
      </div>

      <div className="mt-6 border-b border-orange-100 pb-6">
        <h1 className="font-display text-4xl font-black text-zinc-900 md:text-5xl">Event dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Everything you publish here goes live on the site and opens for booking.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <h2 className="font-display text-sm font-black text-zinc-400">
            Events ({events.length})
          </h2>

          {loading && <p className="text-sm text-zinc-400">Loading…</p>}

          {!loading && events.length === 0 && (
            <div className="rounded-2xl border border-dashed border-orange-200 p-12 text-center text-sm font-medium text-zinc-400">
              No events yet. Create your first one on the right.
            </div>
          )}

          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-orange-300 hover:shadow-md"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        event.accentColor === 'cyan'
                          ? 'rgba(41, 93, 243, 0.63)'
                          : event.accentColor === 'amber'
                          ? ' rgba(232, 57, 117, 0.95)'
                          : event.accentColor === 'lime'
                          ? 'rgb(180 255 238)'
                          : 'bg-[#FF6B5B]'
                      }`}
                    />
                    <p className="truncate font-display text-base font-extrabold text-zinc-900">
                      {event.title}
                    </p>
                  </div>
                  <p className="truncate text-xs font-medium text-zinc-500">{event.venue}</p>
                  <p className="text-xs text-zinc-400">
                    ₹{event.pricePerSeat} · {event.availableSeats}/{event.totalSeats} seats left
                    {event.status === 'draft' && ' · draft'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startEdit(event)}
                    className="rounded-xl border border-orange-200 bg-orange-50/50 px-4 py-2 text-xs font-bold text-orange-600 transition-all hover:bg-orange-100 active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-xl shadow-orange-500/5">
          <h2 className="font-display text-xl font-black text-zinc-900">
            {editingId ? 'Edit event' : 'Create event'}
          </h2>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="title" className={labelClass}>Title</label>
                <input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="category" className={labelClass}>Category</label>
                <input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="venue" className={labelClass}>Venue</label>
                <input id="venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="city" className={labelClass}>City</label>
                <input id="city" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Lucknow" className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="date" className={labelClass}>Starts</label>
                <input id="date" type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="endDate" className={labelClass}>Ends (optional — until then it shows as Live)</label>
                <input id="endDate" type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="price" className={labelClass}>Price per seat (₹)</label>
                <input id="price" type="number" min={0} value={form.pricePerSeat} onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="totalSeats" className={labelClass}>Total seats</label>
                <input
                  id="totalSeats"
                  type="number"
                  min={0}
                  value={form.totalSeats}
                  onChange={(e) => {
                    const total = e.target.value
                    setForm((f) => ({
                      ...f,
                      totalSeats: total,
                      // New event: seats on sale start equal to capacity.
                      availableSeats: editingId ? f.availableSeats : total
                    }))
                  }}
                  className={field}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="availableSeats" className={labelClass}>Seats still on sale</label>
                <input id="availableSeats" type="number" min={0} value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="accent" className={labelClass}>Accent colour</label>
                <select id="accent" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className={field}>
                  <option value="pink">Pink</option>
                  <option value="cyan">Cyan</option>
                  <option value="amber">Amber</option>
                  <option value="lime">Lime</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label htmlFor="poster" className={labelClass}>Poster image URL</label>
                <input id="poster" placeholder="https://…" value={form.posterImage} onChange={(e) => setForm({ ...form, posterImage: e.target.value })} className={field} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label htmlFor="video" className={labelClass}>Video URL</label>
                <input id="video" placeholder="https://…" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className={field} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                <input type="checkbox" checked={form.isRecent} onChange={(e) => setForm({ ...form, isRecent: e.target.checked })} className="h-4 w-4 accent-[#FF6B5B]" />
                Show in Recent Events
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                <input type="checkbox" checked={form.status === 'published'} onChange={(e) => setForm({ ...form, status: e.target.checked ? 'published' : 'draft' })} className="h-4 w-4 accent-[#FF6B5B]" />
                Published
              </label>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-[#FF6B5B] py-3.5 text-sm font-black text-white shadow-lg shadow-[#FF6B5B]/30 transition-all hover:bg-[#e85446] active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update event' : 'Publish event'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-zinc-200 bg-zinc-100 px-6 py-3.5 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

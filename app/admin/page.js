'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'
import MediaField from '../../components/admin/MediaField.jsx'
import { toDateTimeLocal } from '../../lib/utils.js'
import { SEATS_PER_ROW, SEAT_MAP_LIMIT, hasSeatMap } from '../../lib/seats.js'

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
  seating: 'seated',
  pricePerSeat: 0,
  totalSeats: 0,
  availableSeats: 0,
  isRecent: true,
  status: 'published'
}

const LIST_PAGE_SIZE = 8 // events shown per page in the dashboard list

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
  const [listPage, setListPage] = useState(1)
  const [original, setOriginal] = useState(null) // the event as it was when "Edit" was clicked
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    try {
      // fresh=1 (admin only) skips the public list cache, so seat counts here are exact
      const res = await fetch('/api/v1/events?fresh=1', { cache: 'no-store' })
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
    setOriginal(event)
    setForm({
      ...EMPTY_FORM,
      ...event,
      // Old events have no seating field: show what they actually do today.
      seating: event.seating || (hasSeatMap(event) ? 'seated' : 'general'),
      date: toDateTimeLocal(event.date),
      endDate: toDateTimeLocal(event.endDate)
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setOriginal(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    const totalNum = Number(form.totalSeats) || 0
    if (form.seating === 'seated' && (totalNum < 1 || totalNum > SEAT_MAP_LIMIT)) {
      setError(`A seated event needs between 1 and ${SEAT_MAP_LIMIT} seats. For a bigger crowd choose Unseated / General.`)
      return
    }
    setSaving(true)

    const payload = {
      ...form,
      pricePerSeat: Number(form.pricePerSeat) || 0,
      totalSeats: Number(form.totalSeats) || 0,
      availableSeats: Number(form.availableSeats) || 0,
      date: form.date ? new Date(form.date).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null
    }

    // The list on screen can be stale (seats sell while you edit). Only send seat numbers
    // you actually changed, so saving a typo fix can't overwrite the live seat count.
    if (editingId && original) {
      if (payload.totalSeats === Number(original.totalSeats)) delete payload.totalSeats
      if (payload.availableSeats === Number(original.availableSeats)) delete payload.availableSeats
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
      loadEvents() // pick up the fresh seat counts

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
    if (!window.confirm('Delete this event permanently? (Events with paid bookings cannot be deleted, so untick "Published" to hide those instead.)')) return

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

  // Pagination of the event list (deleting the last event on a page just moves back one page).
  const listPages = Math.max(1, Math.ceil(events.length / LIST_PAGE_SIZE))
  const currentPage = Math.min(listPage, listPages)
  const pageEvents = events.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE)

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
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/analytics" className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white">
            Sales &amp; bookings
          </Link>
          <Link href="/admin/media" className="rounded-xl bg-[#FF6B5B] px-5 py-2.5 text-sm font-bold text-white">
            Media library
          </Link>
          <Link href="/admin/scan" className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-bold text-zinc-800">
            Check-in scanner
          </Link>
        </div>
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
            {pageEvents.map((event) => (
              <div
                key={event._id}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-orange-300 hover:shadow-md"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        { pink: 'bg-pink-500', cyan: 'bg-cyan-500', amber: 'bg-amber-500', lime: 'bg-lime-500' }[event.accentColor] ||
                        'bg-[#FF6B5B]'
                      }`}
                    />
                    <p className="truncate font-display text-base font-extrabold text-zinc-900">
                      {event.title}
                    </p>
                  </div>
                  <p className="truncate text-xs font-medium text-zinc-500">{event.venue}</p>
                  <p className="text-xs text-zinc-400">
                    <span className="mr-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-600">
                      {(event.seating || (hasSeatMap(event) ? 'seated' : 'general')) === 'seated' ? 'Seated' : 'Unseated'}
                    </span>
                    ₹{event.pricePerSeat} · {event.availableSeats}/{event.totalSeats}{' '}
                    {(event.seating || (hasSeatMap(event) ? 'seated' : 'general')) === 'seated' ? 'seats' : 'tickets'} left
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

          {listPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setListPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-xs font-medium text-zinc-500">
                Page {currentPage} of {listPages}
              </span>
              <button
                type="button"
                onClick={() => setListPage(currentPage + 1)}
                disabled={currentPage >= listPages}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
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

              <div className="space-y-2 md:col-span-2">
                <p className={labelClass}>Seating type</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ['seated', 'Seated', 'Customer picks exact seats (A1, B4…) on a live seat map'],
                    ['general', 'Unseated / General', 'Customer only chooses how many tickets — no seat numbers']
                  ].map(([value, title, hint]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setForm({ ...form, seating: value })}
                      aria-pressed={form.seating === value}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                        form.seating === value
                          ? 'border-[#FF6B5B] bg-[#FF6B5B]/10 ring-2 ring-[#FF6B5B]/20'
                          : 'border-zinc-200 bg-zinc-50 hover:border-orange-300'
                      }`}
                    >
                      <span className="block text-sm font-extrabold text-zinc-900">{title}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
                    </button>
                  ))}
                </div>
                {form.seating === 'seated' && Number(form.totalSeats) > 0 && (
                  <p className="text-xs text-zinc-400">
                    Seat map: {SEATS_PER_ROW} seats per row → {Math.ceil(Number(form.totalSeats) / SEATS_PER_ROW)} rows
                    (max {SEAT_MAP_LIMIT} seats).
                  </p>
                )}
                {editingId && (
                  <p className="text-xs text-zinc-400">Seating type can&apos;t be changed once tickets are sold.</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="price" className={labelClass}>{form.seating === 'seated' ? 'Price per seat (₹)' : 'Price per ticket (₹)'}</label>
                <input id="price" type="number" min={0} value={form.pricePerSeat} onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })} className={field} />
              </div>

              <div className="space-y-1">
                <label htmlFor="totalSeats" className={labelClass}>{form.seating === 'seated' ? 'Total seats' : 'Total tickets (capacity)'}</label>
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
                <label htmlFor="availableSeats" className={labelClass}>{form.seating === 'seated' ? 'Seats still on sale' : 'Tickets still on sale'}</label>
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

              <div className="md:col-span-2">
                <MediaField id="poster" label="Poster image" kind="image" value={form.posterImage} onChange={(v) => setForm((f) => ({ ...f, posterImage: v }))} />
              </div>

              <div className="md:col-span-2">
                <MediaField id="video" label="Video" kind="video" value={form.videoUrl} onChange={(v) => setForm((f) => ({ ...f, videoUrl: v }))} />
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

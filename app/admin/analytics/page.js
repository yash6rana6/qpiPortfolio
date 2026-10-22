'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../components/AuthProvider.jsx'
import { formatNumber } from '../../../lib/utils.js'

const inr = (n) => `₹${formatNumber(Math.round(n || 0))}`
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const STATUS_BADGE = {
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-slate-200 text-slate-600',
  refunding: 'bg-sky-100 text-sky-700',
  failed: 'bg-rose-100 text-rose-700',
  created: 'bg-amber-100 text-amber-700',
  expired: 'bg-zinc-100 text-zinc-500',
  processing: 'bg-sky-100 text-sky-700'
}

const input = 'rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-[#FF6B5B]'

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-black text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdmin = user?.role === 'admin'

  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refunding, setRefunding] = useState(null)

  const [filters, setFilters] = useState({ event: '', status: 'active', q: '', checkedIn: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ items: [], total: 0, pages: 1 })
  const [listLoading, setListLoading] = useState(true)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v))
    return p
  }, [filters])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/analytics', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load analytics')
      setStats(data)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const loadList = useCallback(async () => {
    setListLoading(true)
    try {
      const p = new URLSearchParams(query)
      p.set('page', String(page))
      const res = await fetch(`/api/v1/admin/bookings?${p}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load bookings')
      setList(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setListLoading(false)
    }
  }, [query, page])

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login?next=/admin/analytics')
  }, [user, authLoading, router])

  useEffect(() => { if (isAdmin) loadStats() }, [isAdmin, loadStats])
  useEffect(() => { if (isAdmin) loadList() }, [isAdmin, loadList])

  function setFilter(key, value) {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function refund(b) {
    const ok = window.confirm(
      `Refund ₹${b.amount} to ${b.user?.name || 'the customer'} for ${b.bookingCode}?\n\nThis cancels the ticket, frees the seats and cannot be undone.`
    )
    if (!ok) return
    setRefunding(b._id)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/v1/admin/bookings/${b._id}/refund`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
      setNotice(`Refunded ₹${data.refundAmount} for ${b.bookingCode}.`)
      await Promise.all([loadList(), loadStats()])
    } catch (err) {
      setError(err.message)
    } finally {
      setRefunding(null)
    }
  }

  if (authLoading || !user) return <main className="min-h-screen bg-[#FFFDF9]" />
  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-black text-zinc-900">Organisers only</h1>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-[#FF6B5B] px-6 py-3 text-sm font-bold text-white">Back to QPIE</Link>
        </div>
      </main>
    )
  }

  const maxDaily = Math.max(1, ...(stats?.daily || []).map((d) => d.revenue))

  return (
    <main className="min-h-screen w-full bg-[#FFFDF9] px-6 py-12 text-zinc-800 md:px-16">
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <Link href="/admin" className="hover:text-[#FF6B5B]">← Dashboard</Link>
        <Link href="/admin/scan" className="hover:text-[#FF6B5B]">Open scanner →</Link>
      </div>
      <h1 className="mt-6 font-display text-4xl font-black text-zinc-900 md:text-5xl">Sales &amp; bookings</h1>

      {error && <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}

      {stats && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Revenue" value={inr(stats.totals.revenue)} sub="paid, minus refunds" />
            <Stat label="Seats sold" value={formatNumber(stats.totals.seatsSold)} sub={`${formatNumber(stats.totals.paidBookings)} bookings`} />
            <Stat label="Checked in" value={formatNumber(stats.totals.checkedIn)} sub="seats scanned at the gate" />
            <Stat label="Refunded" value={inr(stats.totals.refundedAmount)} sub={`${formatNumber(stats.totals.refundedBookings)} bookings`} />
          </div>

          {stats.daily.length > 0 && (
            <section className="mt-8 rounded-2xl border border-orange-100 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Revenue — last {stats.days} days</h2>
              <div className="mt-4 flex h-32 items-end gap-1.5">
                {stats.daily.map((d) => (
                  <div key={d.date} className="group relative flex-1" title={`${d.date}: ${inr(d.revenue)} · ${d.seats} seats`}>
                    <div className="w-full rounded-t bg-[#FF6B5B]" style={{ height: `${Math.max(4, (d.revenue / maxDaily) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>{stats.daily[0].date}</span>
                <span>{stats.daily[stats.daily.length - 1].date}</span>
              </div>
            </section>
          )}

          <section className="mt-8 overflow-x-auto rounded-2xl border border-orange-100 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-orange-100 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3 text-right">Seats sold</th>
                  <th className="px-4 py-3 text-right">Capacity</th>
                  <th className="px-4 py-3 text-right">Checked in</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Refunded</th>
                </tr>
              </thead>
              <tbody>
                {stats.events.map((e) => (
                  <tr key={e.eventId} className="border-b border-zinc-50 last:border-0">
                    <td className="px-4 py-3">
                      <button className="text-left font-semibold hover:text-[#FF6B5B]" onClick={() => setFilter('event', e.eventId)}>
                        {e.title}
                      </button>
                      <p className="text-xs text-zinc-400">{fmtDate(e.date)}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(e.seatsSold)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-500">
                      {e.totalSeats ? `${Math.round((e.seatsSold / e.totalSeats) * 100)}% of ${formatNumber(e.totalSeats)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(e.checkedIn)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{inr(e.revenue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-500">{e.refundedAmount ? inr(e.refundedAmount) : '—'}</td>
                  </tr>
                ))}
                {stats.events.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No events yet.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-black text-zinc-900">Bookings <span className="text-base font-semibold text-zinc-400">({formatNumber(list.total)})</span></h2>
          <a
            href={`/api/v1/admin/bookings/export?${query}`}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white"
          >
            Download CSV
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <select aria-label="Event" className={input} value={filters.event} onChange={(e) => setFilter('event', e.target.value)}>
            <option value="">All events</option>
            {(stats?.events || []).map((e) => <option key={e.eventId} value={e.eventId}>{e.title}</option>)}
          </select>
          <select aria-label="Status" className={input} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="active">Paid, refunded &amp; failed</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
            <option value="created">Payment pending</option>
            <option value="">Everything</option>
          </select>
          <select aria-label="Check-in" className={input} value={filters.checkedIn} onChange={(e) => setFilter('checkedIn', e.target.value)}>
            <option value="">Any entry status</option>
            <option value="yes">Checked in</option>
            <option value="no">Not yet in</option>
          </select>
          <input aria-label="From date" type="date" className={input} value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          <input aria-label="To date" type="date" className={input} value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          <input aria-label="Search" placeholder="Code, name or email" className={`${input} min-w-[200px] flex-1`} value={filters.q} onChange={(e) => setFilter('q', e.target.value)} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-orange-100 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-orange-100 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Booked</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={listLoading ? 'opacity-50' : ''}>
              {list.items.map((b) => (
                <tr key={b._id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{b.bookingCode || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{b.user?.name || '—'}</p>
                    <p className="text-xs text-zinc-400">{b.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">{b.event?.title || 'Event removed'}</td>
                  <td className="px-4 py-3 text-xs">{b.seatNumbers?.length ? b.seatNumbers.join(', ') : b.seats}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {inr(b.amount)}
                    {b.status === 'refunded' && b.refundAmount !== undefined && (
                      <p className="text-xs text-zinc-400">refunded {inr(b.refundAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_BADGE[b.status] || ''}`}>{b.status}</span>
                    {b.checkedIn && <span className="ml-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase text-white">in</span>}
                    {b.cancelledBy && <p className="mt-1 text-[10px] text-zinc-400">cancelled by {b.cancelledBy}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'paid' && (
                      <button
                        onClick={() => refund(b)}
                        disabled={refunding === b._id}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        {refunding === b._id ? 'Refunding…' : 'Refund'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!listLoading && list.items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-400">No bookings match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-200 px-4 py-2 font-semibold disabled:opacity-30">← Prev</button>
          <span className="text-zinc-500">Page {page} of {list.pages}</span>
          <button disabled={page >= list.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-200 px-4 py-2 font-semibold disabled:opacity-30">Next →</button>
        </div>
      </section>
    </main>
  )
}

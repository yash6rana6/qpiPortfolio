'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'
import Suggestions from '../../components/Suggestions.jsx'

const STATUS_STYLE = {
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-sm',
  created: 'border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-sm',
  processing: 'border-sky-500/30 bg-sky-500/10 text-sky-700 shadow-sm',
  refunded: 'border-slate-500/30 bg-slate-500/10 text-slate-600 shadow-sm',
  failed: 'border-rose-500/30 bg-rose-500/10 text-rose-700 shadow-sm'
}

const STATUS_LABEL = {
  paid: 'CONFIRMED',
  created: 'PAYMENT PENDING',
  processing: 'PROCESSING',
  refunded: 'REFUNDED',
  failed: 'PAYMENT FAILED'
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?next=/bookings')
      return
    }

    fetch('/api/v1/bookings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return <main className="min-h-screen bg-[#faf8f5]" />
  }

  const lastPaid = bookings.find((b) => b.status === 'paid')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fdfbf7] px-6 py-20 text-slate-800 md:px-16 font-sans">
      {/* Vibrant Light-Theme Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 left-10 h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-pink-300/45 to-rose-300/40 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/4 -right-20 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-indigo-200/50 via-sky-200/45 to-teal-100/40 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-amber-200/45 to-orange-200/35 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900"
        >
          ← Back to QPIE
        </Link>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-slate-900/10 pb-6">
          <div>
            <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              MY TICKETS
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Passes registered to <span className="font-semibold text-slate-800">{user.email}</span>
            </p>
          </div>
          <span className="font-mono text-xs font-bold tracking-widest text-rose-500 bg-rose-50 border border-rose-200 px-3 py-1">
            QPIE TICKET PASS
          </span>
        </div>

        <div className="mt-10 space-y-8">
          {loading && (
            <p className="text-sm font-medium tracking-wide text-slate-500">Retrieving passes…</p>
          )}

          {!loading && bookings.length === 0 && (
            <div className="border-2 border-dashed border-slate-300 bg-white/60 p-12 text-center backdrop-blur-xl shadow-lg shadow-slate-200/40">
              <p className="text-sm font-medium text-slate-500">You haven&apos;t booked a show yet.</p>
              <Link
                href="/events"
                className="mt-6 inline-block bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-pink-500/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Explore Events
              </Link>
            </div>
          )}

          {bookings.map((booking) => (
            <article
              key={booking._id}
              className="group relative border border-white/80 bg-white/70 shadow-[0_12px_40px_-15px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-200 hover:shadow-[0_20px_50px_-15px_rgba(15,23,42,0.14)] hover:bg-white/85"
            >
              {/* Colorful vibrant gradient bar at very top edge */}
              <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 via-purple-400 via-sky-400 to-emerald-400" />

              <div className="p-7 md:p-8">
                {/* Main Event Info */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-xl">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">
                      Admit Pass
                    </span>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                      {booking.event?.title || 'Event removed'}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      📍 {booking.event?.venue}
                    </p>
                  </div>

                  <span
                    className={`border px-3 py-1 text-[11px] font-black tracking-widest uppercase backdrop-blur-md ${
                      STATUS_STYLE[booking.status] || STATUS_STYLE.created
                    }`}
                  >
                    {STATUS_LABEL[booking.status] || booking.status}
                  </span>
                </div>

                {/* Perforated Ticket Stub Divider */}
                <div className="relative my-6 -mx-7 md:-mx-8 border-t-2 border-dashed border-slate-300/80">
                  {/* Left Ticket Notch */}
                  <div className="absolute -left-3.5 -top-3.5 h-7 w-7 bg-[#fdfbf7] border-r border-slate-300/70" />
                  {/* Right Ticket Notch */}
                  <div className="absolute -right-3.5 -top-3.5 h-7 w-7 bg-[#fdfbf7] border-l border-slate-300/70" />
                </div>

                {/* Bottom Stub / Meta details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Seats
                    </span>
                    <span className="text-sm font-extrabold uppercase text-slate-800">
                      {booking.seatNumbers?.length
                        ? booking.seatNumbers.join(', ')
                        : `${booking.seats} SEAT${booking.seats > 1 ? 'S' : ''}`}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount Paid
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 font-mono">
                      ₹{booking.amount}
                    </span>
                  </div>

                  <div className="col-span-2 md:text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ticket Code
                    </span>
                    <span className="font-mono text-xl font-black tracking-[0.25em] text-rose-500 drop-shadow-sm">
                      {booking.bookingCode || 'N/A'}
                    </span>
                  </div>
                </div>

                {booking.status === 'failed' && booking.failureReason && (
                  <p className="mt-5 border border-rose-300 bg-rose-50/80 p-3 text-xs font-semibold text-rose-700">
                    ⚠ {booking.failureReason}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {!loading && (
          <div className="mt-16 border-t-2 border-slate-900/10 pt-10">
            <Suggestions
              title={lastPaid ? 'Recommended for you' : 'Popular right now'}
              eventId={lastPaid?.event?._id}
              city={lastPaid?.event?.city}
              layout="grid"
            />
          </div>
        )}
      </div>
    </main>
  )
}
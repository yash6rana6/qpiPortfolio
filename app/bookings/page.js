'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'
import Suggestions from '../../components/Suggestions.jsx'

const STATUS_STYLE = {
  paid: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  created: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  processing: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  refunded: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  failed: 'border-red-400/30 bg-red-400/10 text-red-300'
}

const STATUS_LABEL = {
  paid: 'Confirmed',
  created: 'Payment pending',
  processing: 'Confirming payment',
  refunded: 'Refunded',
  failed: 'Payment failed'
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
    return <main className="min-h-screen bg-sand" />
  }

  const lastPaid = bookings.find((b) => b.status === 'paid')

  return (
    <main className="min-h-screen bg-sand px-6 py-24 text-ink md:px-16">
      <Link href="/" className="text-sm text-ink/50 transition-colors hover:text-ink">
        ← Back to QPIE
      </Link>

      <h1 className="mt-6 font-display text-4xl font-black tracking-tight md:text-5xl">My tickets</h1>
      <p className="mt-3 text-ink/50">Signed in as {user.email}</p>

      <div className="mt-12 max-w-3xl space-y-4">
        {loading && <p className="text-sm text-ink/40">Loading your bookings…</p>}

        {!loading && bookings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-coral/20 p-12 text-center">
            <p className="text-sm text-ink/50">You haven&apos;t booked a show yet.</p>
            <Link
              href="/events"
              className="mt-6 inline-block rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-glow-coral"
            >
              Browse shows
            </Link>
          </div>
        )}

        {bookings.map((booking) => (
          <article key={booking._id} className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {booking.event?.title || 'Event removed'}
                </h2>
                <p className="mt-1 text-sm text-ink/50">{booking.event?.venue}</p>
                <p className="mt-3 text-sm text-ink/70">
                  {booking.seatNumbers?.length ? booking.seatNumbers.join(', ') : `${booking.seats} seat${booking.seats > 1 ? 's' : ''}`} · ₹{booking.amount}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLE[booking.status] || STATUS_STYLE.created
                }`}
              >
                {STATUS_LABEL[booking.status] || booking.status}
              </span>
            </div>

            {booking.bookingCode && (
              <p className="mt-5 border-t border-coral/15 pt-4 font-display text-lg font-black tracking-[0.2em] text-coral">
                {booking.bookingCode}
              </p>
            )}

            {booking.status === 'failed' && booking.failureReason && (
              <p className="mt-4 text-sm text-red-300">{booking.failureReason}</p>
            )}
          </article>
        ))}
      </div>

      {!loading && (
        <div className="mt-12 max-w-3xl">
          <Suggestions
            title={lastPaid ? 'Recommended for you' : 'Popular right now'}
            eventId={lastPaid?.event?._id}
            city={lastPaid?.event?.city}
            layout="grid"
          />
        </div>
      )}
    </main>
  )
}

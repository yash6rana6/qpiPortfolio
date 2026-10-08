'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'

const STATUS_STYLE = {
  paid: 'border-palm/40 bg-palm/10 text-palm',
  created: 'border-mango/50 bg-mango/10 text-papaya',
  processing: 'border-mango/50 bg-mango/10 text-papaya',
  expired: 'border-ink/15 bg-ink/5 text-ink/50',
  failed: 'border-coral/40 bg-coral/10 text-coral',
  refunded: 'border-ocean/40 bg-ocean/10 text-ocean'
}

const STATUS_LABEL = {
  paid: 'Confirmed',
  created: 'Payment pending',
  processing: 'Confirming…',
  expired: 'Expired',
  failed: 'Refund in progress',
  refunded: 'Refunded'
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
              href="/bookshow"
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
                <p className="mt-1 text-sm text-ink/50">
                  {booking.event?.venue}
                  {booking.event?.city ? ` · ${booking.event.city}` : ''}
                </p>
                <p className="mt-3 text-sm text-ink/70">
                  {booking.seats} seat{booking.seats > 1 ? 's' : ''} · ₹{booking.amount}
                </p>
                {booking.seatIds?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {booking.seatIds.map((id) => (
                      <span key={id} className="rounded-md bg-coral/10 px-2 py-1 text-xs font-bold text-coral">
                        {id}
                      </span>
                    ))}
                  </div>
                )}
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

            {(booking.status === 'failed' || booking.status === 'refunded') && booking.failureReason && (
              <p className="mt-4 text-sm text-coral">{booking.failureReason}</p>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}

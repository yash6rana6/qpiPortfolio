'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-js')) return resolve(true)
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BookShowPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [seats, setSeats] = useState(1)
  const [status, setStatus] = useState('idle') // idle | processing | confirmed
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  async function loadEvents() {
    try {
      const res = await fetch('/api/v1/events', { cache: 'no-store' })
      const data = await res.json()
      const bookable = Array.isArray(data) ? data.filter((e) => e.pricePerSeat > 0) : []
      setEvents(bookable)
      setSelectedId((current) => current || bookable[0]?._id || null)
    } catch {
      setMessage('Events could not be loaded. Refresh to try again.')
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const selectedEvent = events.find((e) => e._id === selectedId) || null
  const maxSeats = Math.min(selectedEvent?.availableSeats ?? 1, 10)
  const totalAmount = (selectedEvent?.pricePerSeat || 0) * seats

  async function handlePay() {
    if (!user) {
      router.push('/login?next=/bookshow')
      return
    }
    if (!selectedEvent) return

    setStatus('processing')
    setMessage('')

    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      setStatus('idle')
      setMessage('The payment window could not load. Check your connection and try again.')
      return
    }

    try {
      // Server decides the amount from the event's own price.
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEvent._id, seats })
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error || 'Booking could not be started')

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'QPIE',
        description: `${seats} seat${seats > 1 ? 's' : ''} · ${order.eventTitle}`,
        prefill: { name: user.name, email: user.email, contact: user.phone || '' },
        theme: { color: '#FF2A85' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/v1/bookings/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            })
            const result = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(result.error || 'Payment could not be confirmed')

            setConfirmation(result)
            setStatus('confirmed')
            loadEvents()
          } catch (err) {
            setStatus('idle')
            setMessage(err.message)
          }
        },
        modal: {
          ondismiss: () => {
            setStatus('idle')
            setMessage('Payment was cancelled. Your seats are still available.')
          }
        }
      })

      razorpay.on('payment.failed', (response) => {
        setStatus('idle')
        setMessage(response?.error?.description || 'The payment did not go through.')
      })

      razorpay.open()
    } catch (err) {
      setStatus('idle')
      setMessage(err.message)
    }
  }

  if (status === 'confirmed' && confirmation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sand px-6 text-ink">
        <div className="w-full max-w-md text-center">
          <p className="font-display text-sm font-semibold text-ocean">Payment confirmed</p>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight">You&apos;re going.</h1>
          <p className="mt-4 text-sm text-ink/60">Show this code at the venue entrance.</p>
          <p className="mt-6 rounded-2xl border border-coral/15 bg-white px-6 py-5 font-display text-3xl font-black tracking-[0.2em] text-coral">
            {confirmation.bookingCode}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/bookings"
              className="rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral"
            >
              View my tickets
            </Link>
            <Link href="/bookshow" onClick={() => setStatus('idle')} className="text-sm text-ink/50 hover:text-ink">
              Book another show
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-sand px-6 py-24 text-ink md:px-16">
      <Link href="/" className="text-sm text-ink/50 transition-colors hover:text-ink">
        ← Back to QPIE
      </Link>

      <h1 className="mt-6 font-display text-4xl font-black tracking-tight md:text-5xl">Book My Show</h1>
      <p className="mt-3 text-ink/50">Pick a show, choose your seats, pay with Razorpay.</p>

      {!authLoading && !user && (
        <p className="mt-6 inline-block rounded-xl border border-ocean/30 bg-ocean/10 px-4 py-3 text-sm text-ocean">
          <Link href="/login?next=/bookshow" className="underline">Sign in</Link> to hold seats and get your ticket code.
        </p>
      )}

      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {loadingEvents && <p className="text-sm text-ink/40">Loading shows…</p>}

          {!loadingEvents && events.length === 0 && (
            <div className="rounded-2xl border border-dashed border-coral/20 p-12 text-center text-sm text-ink/40">
              No shows are on sale right now. Check back soon.
            </div>
          )}

          {events.map((event) => {
            const soldOut = event.availableSeats <= 0
            const selected = selectedId === event._id

            return (
              <button
                key={event._id}
                onClick={() => {
                  setSelectedId(event._id)
                  setSeats(1)
                }}
                disabled={soldOut}
                className={`glass-card w-full rounded-2xl border-l-4 p-6 text-left transition-transform duration-300 ease-spring hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
                  selected ? 'border-coral' : 'border-coral/10'
                }`}
              >
                <span className="text-xs text-ocean">{formatDate(event.date)}</span>
                <h2 className="mt-1 font-display text-xl font-semibold">{event.title}</h2>
                <p className="mt-1 text-sm text-ink/50">{event.venue}</p>
                <p className="mt-3 text-sm text-ink/80">
                  ₹{event.pricePerSeat} per seat · {soldOut ? 'Sold out' : `${event.availableSeats} left`}
                </p>
              </button>
            )
          })}
        </div>

        <div className="glass-card h-fit rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold">Your order</h2>

          {!selectedEvent ? (
            <p className="mt-6 text-sm text-ink/40">Choose a show to continue.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink/50">{selectedEvent.title}</p>

              <label htmlFor="seats" className="mt-6 block text-sm text-ink/60">Seats</label>
              <input
                id="seats"
                type="number"
                min={1}
                max={maxSeats}
                value={seats}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setSeats(Math.min(Math.max(1, Number.isFinite(next) ? next : 1), maxSeats))
                }}
                className="mt-2 w-full rounded-xl border border-coral/20 bg-white px-4 py-3 text-ink outline-none transition-colors focus:border-coral"
              />
              <p className="mt-2 text-xs text-ink/40">Up to {maxSeats} per booking.</p>

              <div className="mt-6 flex items-center justify-between border-t border-coral/15 pt-4">
                <span className="text-ink/60">Total</span>
                <span className="font-display text-xl font-semibold">₹{totalAmount}</span>
              </div>

              <button
                onClick={handlePay}
                disabled={status === 'processing' || selectedEvent.availableSeats <= 0}
                className="mt-6 w-full rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-50"
              >
                {status === 'processing' ? 'Opening payment…' : user ? 'Pay and book' : 'Sign in to book'}
              </button>
            </>
          )}

          {message && (
            <p role="alert" className="mt-4 text-sm text-red-300">{message}</p>
          )}
        </div>
      </div>
    </main>
  )
}

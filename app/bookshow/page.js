'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider.jsx'
import BookingHeader from '../../components/booking/BookingHeader.jsx'
import ShowDateCard from '../../components/booking/ShowDateCard.jsx'
import SeatPicker from '../../components/booking/SeatPicker.jsx'
import TicketCard from '../../components/booking/TicketCard.jsx'
import CheckoutBar from '../../components/booking/CheckoutBar.jsx'
import BookingConfirmed from '../../components/booking/BookingConfirmed.jsx'
import { startCheckout } from '../../lib/checkout.js'
import { useEvent, useSeats } from '../../lib/hooks.js'
import { hasSeatMap, MAX_SEATS_PER_BOOKING } from '../../lib/seats.js'

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="shrink-0 font-display text-2xl font-black uppercase tracking-tight text-ink">{children}</h2>
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  )
}

function BookShow() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const eventId = useSearchParams().get('event')

  const { event, loading: eventLoading, error, refetch: refetchEvent } = useEvent(eventId)
  const mapped = hasSeatMap(event)
  const { taken, loading: seatsLoading, refetch: refetchSeats } = useSeats(eventId, mapped)

  const [selected, setSelected] = useState([]) // seat names (seat-map events)
  const [qty, setQty] = useState(0) // plain count (very large events)
  const [status, setStatus] = useState('idle') // idle | processing | confirmed
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  // Seats I'm paying for are held by ME, so the live map lists them as taken. Don't treat that as "someone grabbed it".
  const mySeats = useRef(new Set())

  // Booking always starts from an event (events page -> event page -> here).
  useEffect(() => {
    if (!eventId) router.replace('/events')
  }, [eventId, router])

  useEffect(() => {
    if (eventLoading) return
    if (error || (event && event.pricePerSeat <= 0)) router.replace('/events')
  }, [eventLoading, error, event, router])

  // Someone else grabbed a seat I'd picked — drop it.
  useEffect(() => {
    setSelected((sel) => {
      const next = sel.filter((s) => !taken.includes(s) || mySeats.current.has(s))
      return next.length === sel.length ? sel : next
    })
  }, [taken])

  const max = Math.min(event?.availableSeats ?? 0, MAX_SEATS_PER_BOOKING)
  const count = mapped ? selected.length : qty
  const total = (event?.pricePerSeat || 0) * count

  function toggleSeat(seat) {
    setMessage('')
    setSelected((sel) => {
      if (sel.includes(seat)) return sel.filter((s) => s !== seat)
      return sel.length >= max ? sel : [...sel, seat]
    })
  }

  function handlePay() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/bookshow?event=${eventId}`)}`)
      return
    }
    if (!event || count < 1) return

    setStatus('processing')
    setMessage('')
    mySeats.current = new Set(mapped ? selected : [])

    startCheckout({
      eventId: event._id,
      seats: count,
      seatNumbers: mapped ? selected : undefined,
      user,
      onPaid: (result) => {
        mySeats.current = new Set()
        if (result.status !== 'paid' || !result.bookingCode) {
          router.push('/bookings') // the webhook is finishing it; the ticket shows up there
          return
        }
        setConfirmation(result)
        setStatus('confirmed')
        setSelected([])
        setQty(0)
        refetchEvent()
        refetchSeats()
      },
      onCancel: () => {
        setStatus('idle')
        setMessage('Payment was cancelled. Your seats are still available.')
        // The server frees my hold a moment after the window closes; keep my picks until then.
        setTimeout(() => {
          mySeats.current = new Set()
          refetchSeats()
        }, 2000)
      },
      onError: (msg) => {
        mySeats.current = new Set()
        setStatus('idle')
        setMessage(msg)
        refetchEvent()
        refetchSeats()
      }
    })
  }

  if (status === 'confirmed' && confirmation) {
    return (
      <BookingConfirmed
        code={confirmation.bookingCode}
        seats={confirmation.seatNumbers || []}
        eventId={eventId}
        city={event?.city}
        onAnother={() => router.push('/events')}
      />
    )
  }

  const soldOut = event && event.availableSeats <= 0

  return (
    <main className="min-h-screen bg-[#F8F6F2] pb-40 text-ink">
      <BookingHeader
        title={event?.title || 'Book tickets'}
        subtitle={[event?.venue, event?.city].filter(Boolean).join(', ')}
        backHref={event ? `/events/${event._id}` : '/events'}
      />

      <div className="mx-auto max-w-3xl px-5 pt-10 md:px-0">
        {!authLoading && !user && (
          <p className="mb-8 rounded-xl border border-ocean/30 bg-ocean/10 px-4 py-3 text-sm text-ocean">
            Sign in to hold seats and get your ticket code — you can still look around first.
          </p>
        )}

        {eventLoading && <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />}

        {event && (
          <div className="space-y-12">
            <section className="space-y-6">
              <SectionLabel>Your show</SectionLabel>
              <ShowDateCard event={event} />
            </section>

            <section className="space-y-6">
              <SectionLabel>{mapped ? 'Choose your seats' : 'Choose tickets'}</SectionLabel>

              {soldOut && <p className="rounded-xl bg-ink/5 px-4 py-3 text-sm font-semibold text-ink/60">This show is sold out.</p>}

              {mapped ? (
                seatsLoading ? (
                  <div className="h-72 animate-pulse rounded-2xl bg-ink/5" />
                ) : (
                  <SeatPicker total={event.totalSeats} taken={taken} selected={selected} max={max} onToggle={toggleSeat} />
                )
              ) : (
                <TicketCard event={event} qty={qty} max={max} onChange={setQty} />
              )}

              {max > 0 && (
                <p className="text-xs text-ink/40">
                  Up to {max} {mapped ? 'seats' : 'tickets'} per booking.
                </p>
              )}
            </section>
          </div>
        )}

        {message && count === 0 && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {message}
          </p>
        )}
      </div>

      <CheckoutBar
        qty={count}
        total={total}
        detail={mapped ? selected.join(', ') : ''}
        busy={status === 'processing'}
        signedIn={!!user}
        message={count > 0 ? message : ''}
        onPay={handlePay}
      />
    </main>
  )
}

export default function BookShowPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F8F6F2]" />}>
      <BookShow />
    </Suspense>
  )
}

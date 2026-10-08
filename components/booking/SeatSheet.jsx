'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { useAuth } from '../AuthProvider.jsx'
import { useSeatLive } from './useSeatLive.js'
import SeatMap from './SeatMap.jsx'
import AnimatedNumber from './AnimatedNumber.jsx'

const MAX_SEATS = 10
const rowLetter = (i) => String.fromCharCode(65 + i)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

/** Best run of N free seats in one row (never across the aisle), nearest the middle of the hall. */
function findBestSeats(layout, booked, held, n) {
  const { rows, seatsPerRow: cols } = layout
  const aisle = cols >= 8 ? Math.floor(cols / 2) : 0
  const targetRow = Math.floor(rows * 0.6)
  const centre = (cols + 1) / 2
  let best = null

  for (let r = 0; r < rows; r++) {
    for (let start = 1; start + n - 1 <= cols; start++) {
      if (aisle && start <= aisle && start + n - 1 > aisle) continue
      const ids = Array.from({ length: n }, (_, i) => `${rowLetter(r)}${start + i}`)
      if (ids.some((id) => booked.has(id) || held.has(id))) continue
      const score = Math.abs(r - targetRow) * 2 + Math.abs(start + (n - 1) / 2 - centre)
      if (!best || score < best.score) best = { ids, score }
    }
  }
  return best ? best.ids : null
}

function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function SeatSheet({ event, onClose }) {
  const { user } = useAuth()
  const router = useRouter()
  const { layout, booked, held, flash, live, error, refresh } = useSeatLive(event._id)

  const [seatCount, setSeatCount] = useState(2)
  const [selected, setSelected] = useState([])
  const [phase, setPhase] = useState('pick') // pick | paying | confirmed | lost | pending
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(() => new Set())
  const [holdLeft, setHoldLeft] = useState(0)
  const [holdTotal, setHoldTotal] = useState(300)
  const [confirmation, setConfirmation] = useState(null)

  const sheetRef = useRef(null)
  const backdropRef = useRef(null)
  const toastRef = useRef(null)
  const countdown = useRef(null)
  const paidRef = useRef(false)
  const ownHold = useRef(new Set()) 

  const price = layout?.pricePerSeat ?? event.pricePerSeat
  const total = selected.length * price
  const locked = phase !== 'pick'

  // ---------- open / close animation ----------
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    if (!reducedMotion()) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 })
      gsap.fromTo(sheetRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power4.out' })
    }
    return () => {
      document.body.style.overflow = ''
      clearInterval(countdown.current)
    }
  }, [])

  const close = useCallback(() => {
    if (phase === 'paying') return
    if (reducedMotion()) return onClose()
    gsap.to(sheetRef.current, { yPercent: 100, duration: 0.45, ease: 'power3.in' })
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.45, onComplete: onClose })
  }, [phase, onClose])

  // ---------- toast ----------
  useEffect(() => {
    if (!message || !toastRef.current || reducedMotion()) return
    gsap.fromTo(toastRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
  }, [message])

  // ---------- seat picking ----------
  const toggleSeat = useCallback(
    (id) => {
      if (phase !== 'pick') return
      setMessage('')
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id)
        const next = [...prev, id]
        return next.length > seatCount ? next.slice(next.length - seatCount) : next
      })
    },
    [phase, seatCount]
  )

  function changeCount(delta) {
    const next = Math.min(MAX_SEATS, Math.max(1, seatCount + delta))
    setSeatCount(next)
    setSelected((prev) => prev.slice(Math.max(0, prev.length - next)))
  }

  function pickBest() {
    if (!layout) return
    const ids = findBestSeats(layout, booked, held, seatCount)
    if (!ids) {
      setMessage(`No ${seatCount} seats together are free. Try fewer seats or pick manually.`)
      return
    }
    setMessage('')
    setSelected(ids)
  }

  // Drop picks that someone else just took while we were looking.
  useEffect(() => {
    if (phase !== 'pick') return
    const taken = selected.filter((id) => booked.has(id) || (held.has(id) && !ownHold.current.has(id)))
    if (taken.length) {
      setShake(new Set(taken))
      setSelected((prev) => prev.filter((id) => !taken.includes(id)))
      setMessage(`${taken.join(', ')} ${taken.length > 1 ? 'were' : 'was'} just taken by someone else — pick another.`)
      setTimeout(() => setShake(new Set()), 600)
    }
  }, [booked, held]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- hold countdown ----------
  function startCountdown(seconds) {
    clearInterval(countdown.current)
    setHoldTotal(seconds)
    setHoldLeft(seconds)
    countdown.current = setInterval(() => {
      setHoldLeft((s) => {
        if (s <= 1) {
          clearInterval(countdown.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // ---------- pay ----------
  async function verifyPayment(response, attempt = 0) {
    const res = await fetch('/api/v1/bookings/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    })
    const data = await res.json()

    if (res.status === 202 && attempt < 8) {
      await sleep(1500)
      return verifyPayment(response, attempt + 1)
    }
    if (res.ok) {
      clearInterval(countdown.current)
      setConfirmation(data)
      setPhase('confirmed')
      return
    }
    if (data.code === 'SEAT_LOST_REFUND') {
      clearInterval(countdown.current)
      setMessage(data.error)
      setPhase('lost')
      refresh()
      return
    }
    throw new Error(data.error || 'Payment could not be confirmed')
  }

  async function handlePay() {
    if (!user) {
      router.push('/login?next=/bookshow')
      return
    }
    if (selected.length !== seatCount) {
      setMessage(`Pick ${seatCount} seat${seatCount > 1 ? 's' : ''} to continue (${selected.length} selected).`)
      return
    }

    setPhase('paying')
    setMessage('')
    paidRef.current = false

    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      setPhase('pick')
      setMessage('The payment window could not load. Check your connection and try again.')
      return
    }

    let order
    try {
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event._id, seatIds: selected })
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'SEATS_TAKEN') {
          // Someone else won the race for these seats — not an error, just pick again.
          setShake(new Set(data.unavailable))
          setSelected((prev) => prev.filter((id) => !data.unavailable.includes(id)))
          setMessage(data.error)
          setPhase('pick')
          refresh()
          setTimeout(() => setShake(new Set()), 600)
          return
        }
        throw new Error(data.error || 'Booking could not be started')
      }
      order = data
    } catch (err) {
      setPhase('pick')
      setMessage(err.message)
      return
    }

    ownHold.current = new Set(order.seatIds)
    startCountdown(order.holdSeconds)

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'QPIE',
      description: `${order.seatIds.join(', ')} · ${order.eventTitle}`,
      prefill: { name: user.name, email: user.email, contact: user.phone || '' },
      theme: { color: '#FF6B5B' },
      handler: async (response) => {
        paidRef.current = true
        try {
          await verifyPayment(response)
        } catch {
          clearInterval(countdown.current)
          setPhase('pending')
          setMessage('We could not confirm your payment yet. If money was deducted, your ticket will appear in My tickets shortly.')
        }
      },
      modal: {
        ondismiss: () => {
          if (paidRef.current) return
          clearInterval(countdown.current)
          fetch('/api/v1/bookings/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.orderId })
          }).catch(() => {})
          setPhase('pick')
          setMessage('Payment cancelled — your seats were released.')
          setTimeout(() => (ownHold.current = new Set()), 4000)
        }
      }
    })

    rzp.on('payment.failed', (r) => setMessage(r?.error?.description || 'The payment did not go through. You can retry.'))
    rzp.open()
  }

  const ringPct = holdTotal ? holdLeft / holdTotal : 0

  return (
    <div className="fixed inset-0 z-[60]">
      <div ref={backdropRef} onClick={close} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />

      <div ref={sheetRef} className="absolute inset-x-0 bottom-0 top-6 flex flex-col overflow-hidden rounded-t-3xl bg-sand shadow-2xl sm:top-10">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-coral/15 px-5 py-4 sm:px-10">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-black tracking-tight sm:text-3xl">{event.title}</h2>
            <p className="mt-1 truncate text-xs text-ink/50 sm:text-sm">
              {event.venue} · {event.city} · {formatDate(event.date)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-coral/15 bg-white/60 px-3 py-1 text-xs font-medium text-ink/60 sm:flex">
              <span className={`h-2 w-2 rounded-full ${live ? 'live-dot bg-palm' : 'bg-mango'}`} />
              {live ? 'Live seats' : 'Reconnecting…'}
            </span>
            <button
              onClick={close}
              disabled={phase === 'paying'}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-ink/60 shadow-sm transition-transform hover:rotate-90 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10">
          {message && (
            <p
              ref={toastRef}
              role="alert"
              className="mx-auto mb-5 max-w-xl rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-center text-sm font-medium text-coral"
            >
              {message}
            </p>
          )}
          {layout?.degraded && (
            <p className="mx-auto mb-5 max-w-xl rounded-2xl border border-mango/40 bg-mango/10 px-4 py-2 text-center text-xs text-ink/60">
              Live holds are temporarily unavailable. You can still book — conflicts are checked when you pay.
            </p>
          )}

          {error && !layout && <p className="py-20 text-center text-sm text-ink/50">{error}</p>}
          {!layout && !error && <SeatSkeleton />}

          {layout && (
            <>
              <div className="mx-auto mb-8 flex max-w-xl flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-3 rounded-full border border-coral/15 bg-white px-2 py-1.5 shadow-sm">
                  <button
                    onClick={() => changeCount(-1)}
                    disabled={locked || seatCount <= 1}
                    className="h-9 w-9 rounded-full bg-sand text-lg font-bold text-ink transition-transform hover:scale-110 disabled:opacity-30"
                    aria-label="Fewer seats"
                  >
                    −
                  </button>
                  <span className="min-w-[5.5rem] text-center text-sm font-semibold">
                    {seatCount} seat{seatCount > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => changeCount(1)}
                    disabled={locked || seatCount >= MAX_SEATS}
                    className="h-9 w-9 rounded-full bg-sand text-lg font-bold text-ink transition-transform hover:scale-110 disabled:opacity-30"
                    aria-label="More seats"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={pickBest}
                  disabled={locked}
                  className="rounded-full border border-ocean/40 bg-ocean/10 px-5 py-2.5 text-sm font-semibold text-ocean transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-40"
                >
                  ✨ Best available
                </button>
              </div>

              <SeatMap
                eventId={event._id}
                layout={layout}
                booked={booked}
                held={held}
                selected={selected}
                flash={flash}
                shake={shake}
                locked={locked}
                onToggle={toggleSeat}
              />
            </>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-coral/15 bg-white/80 px-5 py-4 backdrop-blur-md sm:px-10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {selected.length === 0 && <span className="text-sm text-ink/40">Tap seats to select them</span>}
                {[...selected]
                  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                  .map((id) => (
                    <span key={id} className="rounded-md bg-coral/10 px-2 py-1 text-xs font-bold text-coral">
                      {id}
                    </span>
                  ))}
              </div>
              <p className="mt-1 font-display text-2xl font-black">
                <AnimatedNumber value={total} prefix="₹" />
                <span className="ml-2 text-xs font-medium text-ink/40">
                  {selected.length} × ₹{price}
                </span>
              </p>
            </div>

            <button
              onClick={handlePay}
              disabled={phase === 'paying' || selected.length === 0}
              className="flex items-center gap-3 rounded-full bg-coral px-8 py-3.5 text-sm font-bold text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {phase === 'paying' && holdLeft > 0 && (
                <svg width="26" height="26" viewBox="0 0 26 26" className="-ml-2 -rotate-90">
                  <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                  <circle
                    cx="13"
                    cy="13"
                    r="10"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 10}
                    strokeDashoffset={2 * Math.PI * 10 * (1 - ringPct)}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
              )}
              {phase === 'paying'
                ? holdLeft > 0
                  ? `Seats held ${mmss(holdLeft)}`
                  : 'Finishing payment…'
                : user
                ? 's & pay'
                : 'Sign in to book'}
            </button>
          </div>
        </div>
      </div>

      {phase === 'confirmed' && confirmation && (
        <ConfirmationOverlay confirmation={confirmation} event={event} total={total} onClose={onClose} />
      )}
      {(phase === 'lost' || phase === 'pending') && (
        <StatusOverlay phase={phase} message={message} onClose={() => (phase === 'lost' ? setPhase('pick') : onClose())} />
      )}
    </div>
  )
}

function SeatSkeleton() {
  return (
    <div className="mx-auto flex max-w-xl animate-pulse flex-col items-center gap-3 py-10">
      <div className="h-10 w-3/4 rounded-t-full bg-coral/10" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: 12 }, (_, j) => (
            <div key={j} className="h-7 w-7 rounded-lg bg-ink/5" />
          ))}
        </div>
      ))}
    </div>
  )
}

function ConfirmationOverlay({ confirmation, event, total, onClose }) {
  const root = useRef(null)

  useEffect(() => {
    if (reducedMotion() || !root.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.from('.ok-card', { scale: 0.7, opacity: 0, duration: 0.6, ease: 'back.out(1.8)' })
        .from('.ok-check', { strokeDashoffset: 60, duration: 0.6, ease: 'power2.out' }, '-=0.2')
        .from('.ok-code', { y: 20, opacity: 0, scale: 0.9, duration: 0.5, ease: 'power3.out' }, '-=0.2')
        .from('.ok-seat', { y: 14, opacity: 0, stagger: 0.07, duration: 0.35 }, '-=0.2')

      gsap.utils.toArray('.confetti').forEach((el) => {
        gsap.fromTo(
          el,
          { x: 0, y: 0, opacity: 1, rotation: 0 },
          {
            x: gsap.utils.random(-260, 260),
            y: gsap.utils.random(-320, -60),
            rotation: gsap.utils.random(-540, 540),
            opacity: 0,
            duration: gsap.utils.random(1.2, 2.2),
            ease: 'power2.out'
          }
        )
      })
    }, root)
    return () => ctx.revert()
  }, [])

  const colors = ['#FF6B5B', '#FFB627', '#00B4D8', '#1FAE8E', '#FF9F1C']

  return (
    <div ref={root} className="absolute inset-0 z-10 flex items-center justify-center bg-sand/95 px-6 backdrop-blur-md">
      <div className="pointer-events-none absolute left-1/2 top-1/2">
        {Array.from({ length: 36 }, (_, i) => (
          <span key={i} className="confetti absolute h-2.5 w-1.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
        ))}
      </div>

      <div className="ok-card w-full max-w-md text-center">
        <svg width="84" height="84" viewBox="0 0 84 84" className="mx-auto">
          <circle cx="42" cy="42" r="38" fill="#1FAE8E" opacity="0.15" />
          <path
            className="ok-check"
            d="M26 43 l11 11 l22 -24"
            fill="none"
            stroke="#1FAE8E"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
          />
        </svg>
        <p className="mt-4 font-display text-sm font-semibold text-palm">Payment confirmed</p>
        <h3 className="mt-2 font-display text-4xl font-black tracking-tight">You&apos;re going.</h3>
        <p className="mt-2 text-sm text-ink/60">{event.title}</p>

        <p className="ok-code mt-6 rounded-2xl border border-coral/15 bg-white px-6 py-5 font-display text-3xl font-black tracking-[0.2em] text-coral">
          {confirmation.bookingCode}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {(confirmation.seatIds || []).map((id) => (
            <span key={id} className="ok-seat rounded-lg bg-coral px-3 py-1.5 text-sm font-bold text-white shadow-glow-coral">
              {id}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink/50">Paid ₹{total.toLocaleString('en-IN')} · show this code at the venue entrance.</p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/bookings" className="rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral">
            View my tickets
          </Link>
          <button onClick={onClose} className="text-sm text-ink/50 hover:text-ink">
            Book another show
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusOverlay({ phase, message, onClose }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-sand/95 px-6 backdrop-blur-md">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl">{phase === 'lost' ? '💸' : '⏳'}</p>
        <h3 className="mt-4 font-display text-3xl font-black tracking-tight">
          {phase === 'lost' ? 'Someone was a moment faster' : 'Confirming your payment'}
        </h3>
        <p className="mt-3 text-sm text-ink/60">{message}</p>
        <div className="mt-8 flex flex-col gap-3">
          {phase === 'lost' ? (
            <button onClick={onClose} className="rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral">
              Pick other seats
            </button>
          ) : (
            <Link href="/bookings" className="rounded-full bg-coral py-3.5 text-sm font-semibold text-white shadow-glow-coral">
              Go to my tickets
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

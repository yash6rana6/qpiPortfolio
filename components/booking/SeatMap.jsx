'use client'

import { memo, useEffect, useRef } from 'react'
import gsap from 'gsap'

const rowLetter = (i) => String.fromCharCode(65 + i)

const STATE_CLASS = {
  available:
    'bg-white text-ink/60 ring-1 ring-ocean/40 hover:-translate-y-0.5 hover:bg-ocean/10 hover:ring-ocean hover:shadow-glow-ocean cursor-pointer',
  selected: 'bg-coral text-white ring-1 ring-coral shadow-glow-coral seat-pop cursor-pointer',
  held: 'bg-mango/30 text-ink/40 ring-1 ring-mango/70 seat-held cursor-not-allowed',
  booked: 'bg-ink/10 text-ink/20 cursor-not-allowed'
}

const Seat = memo(function Seat({ id, num, state, flashing, shaking, locked, price, onToggle }) {
  const disabled = state === 'booked' || state === 'held' || locked
  return (
    <button
      type="button"
      data-seat
      disabled={disabled && state !== 'selected'}
      onClick={() => onToggle(id)}
      title={state === 'booked' ? `${id} · sold` : state === 'held' ? `${id} · someone is paying for this` : `${id} · ₹${price}`}
      aria-label={`Seat ${id}, ${state}`}
      aria-pressed={state === 'selected'}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-semibold transition-all duration-200 ease-spring sm:h-8 sm:w-8 sm:rounded-lg sm:text-[11px] ${STATE_CLASS[state]} ${
        flashing ? 'seat-flash' : ''
      } ${shaking ? 'seat-shake' : ''} ${locked && state === 'selected' ? 'cursor-wait' : ''}`}
    >
      {state === 'booked' ? '' : num}
    </button>
  )
})

export default function SeatMap({ eventId, layout, booked, held, selected, flash, shake, locked, onToggle }) {
  const rootRef = useRef(null)
  const introFor = useRef(null)
  const { rows, seatsPerRow: cols, pricePerSeat } = layout
  const aisleAfter = cols >= 8 ? Math.floor(cols / 2) : 0
  const selectedSet = new Set(selected)

  // Seats ripple in from the centre, once per show.
  useEffect(() => {
    if (introFor.current === eventId || !rootRef.current) return
    introFor.current = eventId
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const seats = rootRef.current.querySelectorAll('[data-seat]')
    gsap.fromTo(
      seats,
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: 'back.out(2.2)',
        stagger: { amount: 0.8, grid: [rows, cols], from: 'center' },
        clearProps: 'transform,opacity'
      }
    )
  }, [eventId, rows, cols])

  const stateOf = (id) => {
    if (booked.has(id)) return 'booked'
    if (selectedSet.has(id)) return 'selected'
    if (held.has(id)) return 'held'
    return 'available'
  }

  return (
    <div ref={rootRef}>
      <div className="mx-auto mb-10 w-[min(560px,85%)]">
        <div
          className="h-12 rounded-t-[100%] border-t-4 border-coral/70 bg-gradient-to-b from-coral/25 to-transparent"
          style={{ boxShadow: '0 -22px 40px -12px rgba(255,107,91,0.55)' }}
        />
        <p className="mt-2 text-center text-[10px] font-semibold tracking-[0.45em] text-ink/40">SCREEN THIS WAY</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="mx-auto flex w-max flex-col gap-1.5 px-2 sm:gap-2">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 text-center text-[10px] font-bold text-ink/40 sm:w-5 sm:text-xs">{rowLetter(r)}</span>

              {Array.from({ length: cols }, (_, c) => {
                const id = `${rowLetter(r)}${c + 1}`
                return (
                  <div key={id} className={`flex ${aisleAfter && c + 1 === aisleAfter ? 'mr-4 sm:mr-8' : ''}`}>
                    <Seat
                      id={id}
                      num={c + 1}
                      state={stateOf(id)}
                      flashing={flash.has(id)}
                      shaking={shake.has(id)}
                      locked={locked}
                      price={pricePerSeat}
                      onToggle={onToggle}
                    />
                  </div>
                )
              })}

              <span className="w-4 text-center text-[10px] font-bold text-ink/40 sm:w-5 sm:text-xs">{rowLetter(r)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink/60">
        <Legend className="bg-white ring-1 ring-ocean/40" label="Available" />
        <Legend className="bg-coral" label="Your pick" />
        <Legend className="bg-mango/40 ring-1 ring-mango/70" label="Being paid for" />
        <Legend className="bg-ink/10" label="Sold" />
      </div>

      <style jsx global>{`
        @keyframes seat-pop {
          0% { transform: scale(0.6); }
          60% { transform: scale(1.22); }
          100% { transform: scale(1.06); }
        }
        @keyframes seat-flash {
          0% { box-shadow: 0 0 0 0 rgba(255, 182, 39, 0.9); }
          100% { box-shadow: 0 0 0 14px rgba(255, 182, 39, 0); }
        }
        @keyframes seat-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes seat-held {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .seat-pop { animation: seat-pop 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .seat-flash { animation: seat-flash 0.9s ease-out; }
        .seat-shake { animation: seat-shake 0.5s ease-in-out; box-shadow: 0 0 0 2px #ef4444 !important; }
        .seat-held { animation: seat-held 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

function Legend({ className, label }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded-md ${className}`} />
      {label}
    </span>
  )
}

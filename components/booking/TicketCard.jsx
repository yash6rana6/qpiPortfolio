'use client'

import { cn, formatPrice } from '../../lib/utils.js'

/** One ticket tier: price + ADD, which turns into a − 1 + stepper. */
export default function TicketCard({ event, qty, max, onChange, featured = true }) {
  const soldOut = event.availableSeats <= 0
  const low = !soldOut && event.availableSeats <= 20

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 md:p-6',
        featured ? 'border-coral/30 bg-gradient-to-b from-white to-sand-deep/40' : 'border-ink/10 bg-white'
      )}
    >
      <p className="font-display text-lg font-bold text-ink">General Admission</p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-display text-2xl font-black text-ink">{formatPrice(event.pricePerSeat)}</p>

        {soldOut ? (
          <span className="rounded-xl bg-ink/5 px-6 py-2.5 text-sm font-bold text-ink/40">SOLD OUT</span>
        ) : qty === 0 ? (
          <button
            onClick={() => onChange(1)}
            className="rounded-xl border border-ink bg-white px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Add
          </button>
        ) : (
          <div className="flex items-center overflow-hidden rounded-xl border border-ink">
            <button
              onClick={() => onChange(qty - 1)}
              aria-label="Remove one ticket"
              className="h-11 w-11 text-xl text-ink transition-colors hover:bg-ink hover:text-white"
            >
              −
            </button>
            <span className="w-10 text-center font-display text-lg font-bold" aria-live="polite">
              {qty}
            </span>
            <button
              onClick={() => onChange(qty + 1)}
              disabled={qty >= max}
              aria-label="Add one ticket"
              className="h-11 w-11 text-xl text-ink transition-colors hover:bg-ink hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              +
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-ink/10 pt-3 text-sm text-ink/60">
        <p>This ticket grants entry to one individual.</p>
        {low && <p className="mt-1 font-semibold text-coral">Only {event.availableSeats} left</p>}
      </div>
    </div>
  )
}

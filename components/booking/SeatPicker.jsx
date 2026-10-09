'use client'

import { cn } from '../../lib/utils.js'
import { SEATS_PER_ROW, seatRows } from '../../lib/seats.js'

const AISLE_AFTER = Math.floor(SEATS_PER_ROW / 2)

function Legend({ className, label }) {
  return (
    <span className="flex items-center gap-2 text-xs text-ink/60">
      <span className={cn('h-4 w-4 rounded-md', className)} />
      {label}
    </span>
  )
}

/**
 * Pick exact seats. `taken` = unavailable seat names, `selected` = this user's picks.
 * Row letters on the left, an aisle down the middle, stage bar on top.
 */
export default function SeatPicker({ total, taken, selected, max, onToggle }) {
  const rows = seatRows(total)
  const takenSet = new Set(taken)
  const selectedSet = new Set(selected)
  const atLimit = selected.length >= max

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 md:p-6">
      {/* stage */}
      <div className="mx-auto mb-6 w-4/5">
        <div className="h-2 rounded-full bg-gradient-to-r from-coral to-vice-pink shadow-glow-coral" />
        <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-ink/40">Stage</p>
      </div>

      <div className="max-h-[30rem] overflow-auto pb-2">
        <div className="mx-auto w-fit space-y-1.5">
          {rows.map((row, r) => (
            <div key={r} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-center text-[11px] font-bold text-ink/40">{row[0].replace(/\d+/, '')}</span>
              {row.map((seat, c) => {
                const isTaken = takenSet.has(seat)
                const isSelected = selectedSet.has(seat)
                const blocked = isTaken || (!isSelected && atLimit)

                return (
                  <span key={seat} className={cn('flex', c === AISLE_AFTER && 'ml-5')}>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => onToggle(seat)}
                      aria-label={`Seat ${seat}${isTaken ? ', unavailable' : isSelected ? ', selected' : ''}`}
                      aria-pressed={isSelected}
                      className={cn(
                        'h-8 w-8 rounded-lg border text-[10px] font-bold transition-all duration-200 md:h-9 md:w-9 md:text-xs',
                        isTaken && 'cursor-not-allowed border-ink/5 bg-ink/10 text-ink/25',
                        isSelected && 'scale-105 border-coral bg-coral text-white shadow-glow-coral',
                        !isTaken && !isSelected && 'border-ink/20 bg-white text-ink/70 hover:border-coral hover:text-coral',
                        !isTaken && !isSelected && atLimit && 'cursor-not-allowed opacity-40 hover:border-ink/20 hover:text-ink/70'
                      )}
                    >
                      {seat.replace(/^[A-Z]+/, '')}
                    </button>
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-5 border-t border-ink/10 pt-4">
        <Legend className="border border-ink/20 bg-white" label="Available" />
        <Legend className="bg-coral" label="Selected" />
        <Legend className="bg-ink/10" label="Unavailable" />
      </div>
    </div>
  )
}

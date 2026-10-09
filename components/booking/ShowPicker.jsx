'use client'

import { cn, dateKey, formatTime } from '../../lib/utils.js'

function parts(value) {
  const d = new Date(value)
  return {
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
  }
}

/**
 * "Select date & time": one chip per day, then a pill per show on that day.
 * events must be sorted by date (ascending).
 */
export default function ShowPicker({ events, selectedId, onSelect }) {
  const days = []
  for (const e of events) {
    const key = dateKey(e.date)
    const last = days[days.length - 1]
    if (last && last.key === key) last.events.push(e)
    else days.push({ key, events: [e] })
  }

  const selected = events.find((e) => e._id === selectedId)
  const activeKey = selected ? dateKey(selected.date) : days[0]?.key
  const activeDay = days.find((d) => d.key === activeKey)

  let lastMonth = null

  return (
    <div>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const first = day.events[0]
          const tba = day.key === 'tba'
          const p = tba ? null : parts(first.date)
          const showMonth = p && p.month !== lastMonth
          if (p) lastMonth = p.month
          const active = day.key === activeKey

          return (
            <div key={day.key} className="flex items-stretch gap-2">
              {showMonth && (
                <div className="flex w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5">
                  <span className="-rotate-90 text-xs font-bold tracking-widest text-ink/50">{p.month}</span>
                </div>
              )}
              <button
                onClick={() => onSelect(first._id)}
                className={cn(
                  'flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-3 transition-all',
                  active ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white text-ink hover:border-ink/40'
                )}
              >
                <span className="font-display text-2xl font-black leading-none">{tba ? 'TBA' : p.day}</span>
                {!tba && <span className="mt-1 text-xs">{p.weekday}</span>}
              </button>
            </div>
          )
        })}
      </div>

      {activeDay && (
        <div className="mt-5 flex flex-wrap gap-3">
          {activeDay.events.map((e) => {
            const active = e._id === selectedId
            return (
              <button
                key={e._id}
                onClick={() => onSelect(e._id)}
                className={cn(
                  'rounded-xl px-6 py-4 text-left transition-colors',
                  active ? 'bg-ink text-white' : 'border border-ink/10 bg-white text-ink hover:border-ink/40'
                )}
              >
                <span className="block font-display text-lg font-bold leading-none">
                  {formatTime(e.date) || 'Time TBA'}
                </span>
                <span className={cn('mt-1 block max-w-[12rem] truncate text-xs', active ? 'text-white/60' : 'text-ink/50')}>
                  {e.title}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

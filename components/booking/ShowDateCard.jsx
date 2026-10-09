import { formatTime } from '../../lib/utils.js'

/** The one show being booked — date block + time/venue (no other dates). */
export default function ShowDateCard({ event }) {
  const d = event.date ? new Date(event.date) : null
  const valid = d && !Number.isNaN(d.getTime())

  return (
    <div className="flex items-stretch gap-4">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-coral px-2 py-3 text-white shadow-glow-coral">
        {valid ? (
          <>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {d.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
            <span className="font-display text-4xl font-black leading-none">{d.getDate()}</span>
            <span className="mt-1 text-xs">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
          </>
        ) : (
          <span className="font-display text-xl font-black">TBA</span>
        )}
      </div>

      <div className="min-w-0 self-center">
        <p className="font-display text-2xl font-black leading-tight text-ink">
          {formatTime(event.date) || 'Time to be announced'}
        </p>
        <p className="mt-1 truncate text-sm text-ink/60">
          {[event.venue, event.city].filter(Boolean).join(', ') || 'Venue to be announced'}
        </p>
      </div>
    </div>
  )
}

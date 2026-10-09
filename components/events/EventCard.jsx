import Link from 'next/link'
import { cn, formatDate, formatTime, formatPrice, posterBackground } from '../../lib/utils.js'

export default function EventCard({ event, phase }) {
  const price = formatPrice(event.pricePerSeat)
  const soldOut = event.availableSeats <= 0

  return (
    <Link
      href={`/events/${event._id}`}
      className="group block overflow-hidden rounded-3xl bg-white shadow-sm transition-all duration-500 ease-spring hover:-translate-y-1.5 hover:shadow-xl"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-ink/5">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={posterBackground(event.posterImage)}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-2">
          {phase === 'live' && (
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
              <span className="live-dot h-2 w-2 rounded-full bg-vice-pink" />
              Live now
            </span>
          )}
          {soldOut && (
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
              Sold out
            </span>
          )}
        </div>

        {event.category && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur">
            {event.category}
          </span>
        )}
      </div>

      <div className="p-5">
        <p className={cn('text-xs font-bold uppercase tracking-wider', phase === 'live' ? 'text-vice-pink' : 'text-ocean')}>
          {[formatDate(event.date, { day: 'numeric', month: 'short' }), formatTime(event.date)].filter(Boolean).join(' · ') ||
            'Date to be announced'}
        </p>
        <h3 className="mt-2 line-clamp-2 font-display text-xl font-black leading-tight text-ink">{event.title}</h3>
        <p className="mt-1 truncate text-sm text-ink/50">
          {[event.venue, event.city].filter(Boolean).join(' · ') || 'Venue to be announced'}
        </p>
        {price && <p className="mt-3 text-sm font-semibold text-ink">From {price}</p>}
      </div>
    </Link>
  )
}

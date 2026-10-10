'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate, formatPrice, posterBackground } from '../lib/utils.js'

/**
 * Compact "you might also like" cards from /api/v1/events/suggestions.
 *   eventId - the show being looked at (results become "similar to this")
 *   city    - optional, favours shows in that city
 *   layout  - 'list' (narrow column) or 'grid' (full-width page)
 */
export default function Suggestions({ title = 'You might also like', eventId, city, limit = 3, layout = 'list' }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ limit: String(limit) })
    if (eventId) params.set('eventId', eventId)
    if (city) params.set('city', city)

    fetch(`/api/v1/events/suggestions?${params}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })

    return () => {
      cancelled = true
    }
  }, [eventId, city, limit])

  if (!items.length) return null

  const listClass = layout === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2.5'

  return (
    <section aria-label={title} className="text-left">
      <h2 className="font-display text-base font-black uppercase tracking-tight text-ink">{title}</h2>

      <div className={`mt-3 ${listClass}`}>
        {items.map((item) => (
          <Link
            key={item._id}
            href={`/events/${item._id}`}
            className="group flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              aria-hidden="true"
              className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center"
              style={posterBackground(item.posterImage)}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-wider text-ocean">{item.reason}</span>
                {item.badge && (
                  <span className="shrink-0 rounded-full bg-vice-pink/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-vice-pink">
                    {item.badge}
                  </span>
                )}
              </div>
              <h3 className="truncate font-display text-sm font-black leading-snug text-ink">{item.title}</h3>
              <p className="truncate text-xs text-ink/50">
                {[formatDate(item.date, { day: 'numeric', month: 'short' }) || 'Date TBA', item.city].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs font-semibold text-ink">
                From {formatPrice(item.pricePerSeat)} · {item.availableSeats} left
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

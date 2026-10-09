'use client'

import { useMemo, useState } from 'react'
import Navbar from '../../components/Navbar.jsx'
import Footer from '../../components/Footer.jsx'
import EventCard from '../../components/events/EventCard.jsx'
import CityPicker from '../../components/events/CityPicker.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { useEvents, useCity } from '../../lib/hooks.js'
import { eventPhase, citiesOf, matchesSearch, normalizeCity } from '../../lib/events.js'
import { cn } from '../../lib/utils.js'

const TABS = [
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' }
]

export default function EventsPage() {
  const { events, loading, error } = useEvents()
  const [city, setCity] = useCity()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState(null) // null = auto (live if any, else upcoming)

  const cities = useMemo(() => citiesOf(events), [events])

  const { live, upcoming } = useMemo(() => {
    const now = Date.now()
    const visible = events
      .filter((e) => !city || normalizeCity(e.city) === normalizeCity(city))
      .filter((e) => matchesSearch(e, query))
      .map((e) => ({ event: e, phase: eventPhase(e, now) }))
      .filter((x) => x.phase !== 'past')
      .sort((a, b) => new Date(a.event.date || 8.64e15) - new Date(b.event.date || 8.64e15))

    return {
      live: visible.filter((x) => x.phase === 'live'),
      upcoming: visible.filter((x) => x.phase === 'upcoming')
    }
  }, [events, city, query])

  const active = tab || (live.length ? 'live' : 'upcoming')
  const list = active === 'live' ? live : upcoming
  const counts = { live: live.length, upcoming: upcoming.length }

  return (
    <main className="min-h-screen bg-sand text-ink">
      <Navbar tone="solid" />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-coral">Discover</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
          Events in <span className="text-coral">{city || 'every city'}</span>
        </h1>

        <div className="mt-10 flex flex-col gap-3 md:flex-row">
          <CityPicker cities={cities} value={city} onChange={setCity} />
          <label className="relative flex-1">
            <span className="sr-only">Search events</span>
            <svg viewBox="0 0 24 24" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-coral" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, venues or categories"
              className="w-full rounded-2xl border border-ink/10 bg-white py-3.5 pl-12 pr-4 text-base outline-none transition-colors focus:border-coral"
            />
          </label>
        </div>

        <div className="mt-10 flex gap-2 border-b border-ink/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-5 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors',
                active === t.id ? 'border-coral text-ink' : 'border-transparent text-ink/40 hover:text-ink'
              )}
            >
              {t.id === 'live' && <span className="live-dot h-2 w-2 rounded-full bg-vice-pink" />}
              {t.label}
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="mt-10">
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-ink/5" />
              ))}
            </div>
          )}

          {!loading && error && <EmptyState title="Couldn't load events" message="Refresh the page to try again." />}

          {!loading && !error && list.length === 0 && (
            <EmptyState
              title={active === 'live' ? 'Nothing live right now' : 'No upcoming events'}
              message={
                city
                  ? `No ${active === 'live' ? 'live' : 'upcoming'} events in ${city}. Try another city or "All cities".`
                  : 'New shows are added regularly — check back soon.'
              }
            />
          )}

          {!loading && list.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map(({ event, phase }) => (
                <EventCard key={event._id} event={event} phase={phase} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

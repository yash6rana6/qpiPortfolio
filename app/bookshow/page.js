'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import CityPicker from '../../components/booking/CityPicker.jsx'
import SeatSheet from '../../components/booking/SeatSheet.jsx'

const ACCENT = { pink: '#FF2A85', cyan: '#00B4D8', amber: '#FFB627', lime: '#1FAE8E' }
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function formatDate(value) {
  if (!value) return 'Date to be announced'
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BookShowPage() {
  const [cities, setCities] = useState([])
  const [city, setCity] = useState('')
  const [events, setEvents] = useState([])
  const [loadingCities, setLoadingCities] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)

  const headerRef = useRef(null)
  const gridRef = useRef(null)

  // 1) cities
  useEffect(() => {
    fetch('/api/v1/cities')
      .then((r) => r.json())
      .then((list) => {
        const rows = Array.isArray(list) ? list : []
        setCities(rows)
        let remembered = ''
        try {
          remembered = localStorage.getItem('qpie_city') || ''
        } catch {}
        const pick = rows.find((c) => c.city === remembered) ? remembered : rows[0]?.city || ''
        setCity(pick)
      })
      .catch(() => setError('Cities could not be loaded. Refresh to try again.'))
      .finally(() => setLoadingCities(false))
  }, [])

  // 2) shows in the chosen city
  useEffect(() => {
    if (!city) return
    try {
      localStorage.setItem('qpie_city', city)
    } catch {}

    let cancelled = false
    setLoadingEvents(true)
    fetch(`/api/v1/events?city=${encodeURIComponent(city)}&upcoming=true`)
      .then((r) => r.json())
      .then((list) => {
        if (cancelled) return
        setEvents(Array.isArray(list) ? list.filter((e) => e.pricePerSeat > 0) : [])
      })
      .catch(() => !cancelled && setError('Shows could not be loaded. Refresh to try again.'))
      .finally(() => !cancelled && setLoadingEvents(false))

    return () => {
      cancelled = true
    }
  }, [city])

  // header intro
  useEffect(() => {
    if (reduced() || !headerRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.hdr-line', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power4.out' })
      gsap.from('.hdr-sub', { y: 14, opacity: 0, duration: 0.7, delay: 0.35, ease: 'power3.out' })
    }, headerRef)
    return () => ctx.revert()
  }, [])

  // cards stagger in whenever the city's shows change
  useEffect(() => {
    if (loadingEvents || !events.length || reduced() || !gridRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.show-card', { y: 50, opacity: 0, scale: 0.96, duration: 0.7, stagger: 0.09, ease: 'power4.out', clearProps: 'all' })
    }, gridRef)
    return () => ctx.revert()
  }, [events, loadingEvents])

  function tilt(e) {
    if (reduced()) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    gsap.to(el, { rotateY: px * 8, rotateX: -py * 8, transformPerspective: 800, duration: 0.35, ease: 'power2.out' })
  }
  function untilt(e) {
    gsap.to(e.currentTarget, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-sand px-6 py-24 text-ink md:px-16">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-coral/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-ocean/15 blur-3xl" />

      <div className="relative">
        <Link href="/" className="text-sm text-ink/50 transition-colors hover:text-ink">
          ← Back to QPIE
        </Link>

        <div ref={headerRef} className="mt-6">
          <h1 className="font-display text-5xl font-black tracking-tight md:text-7xl">
            <span className="block overflow-hidden"><span className="hdr-line block">Book</span></span>
            <span className="block overflow-hidden"><span className="hdr-line block text-coral">my show.</span></span>
          </h1>
          <p className="hdr-sub mt-4 max-w-xl text-ink/60">
            Pick your city, pick your show, pick your exact seats. Live seat map — nobody can take your seat once you hold it.
          </p>
        </div>

        <section className="mt-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">1 · Your city</p>
          {loadingCities && <div className="h-14 w-72 animate-pulse rounded-full bg-white/60" />}
          {!loadingCities && cities.length === 0 && !error && (
            <p className="text-sm text-ink/50">No shows are on sale right now. Check back soon.</p>
          )}
          {cities.length > 0 && <CityPicker cities={cities} value={city} onChange={setCity} />}
        </section>

        {error && <p role="alert" className="mt-6 text-sm text-coral">{error}</p>}

        {city && (
          <section className="mt-14">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">2 · Shows in {city}</p>

            {loadingEvents && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-96 animate-pulse rounded-3xl bg-white/60" />
                ))}
              </div>
            )}

            {!loadingEvents && events.length === 0 && (
              <div className="rounded-3xl border border-dashed border-coral/20 p-14 text-center text-sm text-ink/40">
                No upcoming shows in {city} yet.
              </div>
            )}

            <div ref={gridRef} className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {!loadingEvents &&
                events.map((event) => {
                  const soldOut = event.availableSeats <= 0
                  const accent = ACCENT[event.accentColor] || ACCENT.pink
                  return (
                    <article
                      key={event._id}
                      onMouseMove={tilt}
                      onMouseLeave={untilt}
                      className="show-card glass-card group relative overflow-hidden rounded-3xl"
                      style={{ boxShadow: `0 24px 60px -28px ${accent}` }}
                    >
                      <div className="relative h-48 overflow-hidden bg-ink/5">
                        {event.posterImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.posterImage}
                            alt=""
                            loading="lazy"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                            className="h-full w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-110"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                        <span
                          className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white"
                          style={{ background: accent }}
                        >
                          {event.category}
                        </span>
                        <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-ink">
                          ₹{event.pricePerSeat}
                        </span>
                      </div>

                      <div className="p-6">
                        <p className="text-xs font-semibold text-ocean">{formatDate(event.date)}</p>
                        <h2 className="mt-1 font-display text-2xl font-black tracking-tight">{event.title}</h2>
                        <p className="mt-1 text-sm text-ink/50">{event.venue}</p>
                        {event.description && <p className="mt-3 line-clamp-2 text-sm text-ink/60">{event.description}</p>}

                        <div className="mt-6 flex items-center justify-between">
                          <span className="text-xs text-ink/40">
                            {soldOut ? 'Sold out' : `${event.availableSeats} of ${event.totalSeats} seats left`}
                          </span>
                          <button
                            onClick={() => setActive(event)}
                            disabled={soldOut}
                            className="rounded-full bg-coral px-6 py-3 text-sm font-bold text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                          >
                            Select seats →
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
            </div>
          </section>
        )}
      </div>

      {active && (
        <SeatSheet
          key={active._id}
          event={active}
          onClose={() => {
            setActive(null)
            // refresh list counters (served from the 30s cache)
            fetch(`/api/v1/events?city=${encodeURIComponent(city)}&upcoming=true`)
              .then((r) => r.json())
              .then((list) => Array.isArray(list) && setEvents(list.filter((e) => e.pricePerSeat > 0)))
              .catch(() => {})
          }}
        />
      )}
    </main>
  )
}

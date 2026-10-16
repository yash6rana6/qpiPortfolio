'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from '../lib/motion.js'
import { useEvents } from '../lib/hooks.js'
import { formatDate, posterBackground } from '../lib/utils.js'

const ACCENT = {
  pink: { hex: '#FF6B5B', shadow: 'rgba(255, 107, 91, 0.35)' },   // coral
  cyan: { hex: '#00B4D8', shadow: 'rgba(0, 180, 216, 0.35)' },    // ocean
  amber: { hex: '#FFB627', shadow: 'rgba(255, 182, 39, 0.35)' },  // mango
  lime: { hex: '#1FAE8E', shadow: 'rgba(31, 174, 142, 0.35)' }    // palm
}

function DetailCard({ event, accent, slide }) {
  return (
    <div
      data-slide={slide}
      className="will-change-transform rounded-3xl p-8 md:p-12 shadow-2xl transition-shadow duration-500 hover:scale-[1.01]"
      style={{
        backgroundColor: accent.hex,
        boxShadow: `0 20px 50px ${accent.shadow}`
      }}
    >
      <span className="text-xs font-bold uppercase tracking-wider text-white/80">
        {formatDate(event.date)}
      </span>
      <h3 className="mt-3 font-display text-4xl font-black leading-[0.95] text-white drop-shadow-sm md:text-6xl">
        {event.title}
      </h3>
      <p className="mt-3 text-sm font-semibold text-white/80 md:text-base">{event.venue}</p>
      <p className="mt-6 text-base leading-relaxed text-white/90 md:text-lg">
        {event.description}
      </p>
      <Link href={`/events/${event._id}`} className="group mt-8 inline-flex items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-lg text-white transition-transform duration-300 group-hover:scale-110">
          ↗
        </span>
        <span className="rounded-xl bg-black px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-all duration-300 group-hover:bg-zinc-900">
          View event
        </span>
      </Link>
    </div>
  )
}

function OvalVideo({ event, accent, slide }) {
  return (
    <div
      data-slide={slide}
      className="will-change-transform overflow-hidden rounded-full ring-1 ring-white/10"
      style={{
        aspectRatio: '1 / 1',
        boxShadow: `0 25px 60px ${accent.shadow}`
      }}
    >
      {event.videoUrl ? (
        <video
          className="h-full w-full object-cover scale-105 transition-transform duration-700 hover:scale-100"
          src={event.videoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div className="h-full w-full bg-cover bg-center" style={posterBackground(event.posterImage)} />
      )}
    </div>
  )
}

// limit: how many to show (null = all). standalone: used as the /recent page (shows loading/empty text).
export default function RecentEvents({ limit = 3, standalone = false }) {
  const { events, loading } = useEvents({ recent: true, limit })
  const sectionRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    if (!sectionRef.current || !titleRef.current) return
    const ctx = gsap.context(() => {
      // 1. Center Title Smooth Fade In & Zoom
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 85%'
          }
        }
      )

      // 2. Ultra-Smooth Row Animations
      const rows = sectionRef.current.querySelectorAll('.zigzag-row')
      rows.forEach((row) => {
        const leftEl = row.querySelector('[data-slide="left"]')
        const rightEl = row.querySelector('[data-slide="right"]')

        if (leftEl) {
          gsap.fromTo(
            leftEl,
            { opacity: 0, x: -60, y: 30, scale: 0.95 },
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: 1.3,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: row,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        }

        if (rightEl) {
          gsap.fromTo(
            rightEl,
            { opacity: 0, x: 60, y: 30, scale: 0.95 },
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: 1.3,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: row,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
              }
            }
          )
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [events])

  if (events.length === 0) {
    if (!standalone) return null
    return (
      <section className="flex min-h-screen items-center justify-center bg-gradient-to-r from-slate-900 to-fuchsia-600 px-6 text-center">
        <p className="font-display text-2xl font-black uppercase text-white/80">
          {loading ? 'Loading events…' : 'No recent events yet'}
        </p>
      </section>
    )
  }

  return (
    <section id="recent-events" ref={sectionRef} className="relative z-10 bg-gradient-to-r from-slate-900 to-fuchsia-600 px-6 py-32 md:px-16 overflow-hidden">
      
      {/* Centered Massive Glow Heading */}
      <div className="mb-24 text-center">
        <h2
          ref={titleRef}
          className="select-none font-display text-[8vw] font-black tracking-tight text-white uppercase drop-shadow-lg md:text-[6vw]"
        >
          Recent <span className="text-white filter drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]">Events</span>
        </h2>
      </div>

      <div className="flex flex-col gap-28 max-w-7xl mx-auto">
        {events.map((event, i) => {
          const accent = ACCENT[event.accentColor] || ACCENT.lime
          const detailFirst = i % 2 === 0

          return (
            <div
              key={event._id}
              className="zigzag-row grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16"
            >
              {detailFirst ? (
                <>
                  <DetailCard event={event} accent={accent} slide="left" />
                  <OvalVideo event={event} accent={accent} slide="right" />
                </>
              ) : (
                <>
                  <div className="order-2 md:order-1">
                    <OvalVideo event={event} accent={accent} slide="left" />
                  </div>
                  <div className="order-1 md:order-2">
                    <DetailCard event={event} accent={accent} slide="right" />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {!standalone && (
        <div className="mt-20 text-center">
          <Link
            href="/recent"
            className="inline-block rounded-full bg-white px-8 py-3 text-sm font-bold uppercase tracking-widest text-slate-900 transition-transform duration-300 hover:-translate-y-0.5"
          >
            View all recent events
          </Link>
        </div>
      )}
    </section>
  )
}
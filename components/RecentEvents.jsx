'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Summer accents — same accentColor names stored in the DB, brighter hexes.
const ACCENT = {
  pink: { hex: '#FF6B5B', shadow: 'rgba(255, 107, 91, 0.35)' },   // coral
  cyan: { hex: '#00B4D8', shadow: 'rgba(0, 180, 216, 0.35)' },    // ocean
  amber: { hex: '#FFB627', shadow: 'rgba(255, 182, 39, 0.35)' },  // mango
  lime: { hex: '#1FAE8E', shadow: 'rgba(31, 174, 142, 0.35)' }    // palm
}

const FALLBACK_RECENT = [
  {
    _id: 'r1',
    title: 'Neon Vice Festival',
    date: '2026-11-14',
    venue: 'Crypto.com Arena, LA',
    description: 'A three-night electronic music takeover with a fully synced pink-and-violet light rig.',
    videoUrl: 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4',
    accentColor: 'pink'
  },
  {
    _id: 'r2',
    title: 'Sunburst Circuit Night',
    date: '2026-10-02',
    venue: 'Sahara Tent, Coachella',
    description: 'Late-night set with cyan strobe walls timed to the drop, streamed live to 40k viewers.',
    videoUrl: 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4',
    accentColor: 'cyan'
  },
]

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
      <span className="text-xs font-bold uppercase tracking-wider text-black/70">
        {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <h3 className="mt-3 font-display text-4xl font-black leading-[0.95] text-black md:text-6xl">
        {event.title}
      </h3>
      <p className="mt-3 text-sm font-semibold text-black/70 md:text-base">{event.venue}</p>
      <p className="mt-6 text-base leading-relaxed text-black/85 md:text-lg">
        {event.description}
      </p>
      <button className="group mt-8 inline-flex items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-lg text-white transition-transform duration-300 group-hover:scale-110">
          ↗
        </span>
        <span className="rounded-xl bg-black px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-all duration-300 group-hover:bg-zinc-900">
          View event
        </span>
      </button>
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
      <video
        className="h-full w-full object-cover scale-105 transition-transform duration-700 hover:scale-100"
        src={event.videoUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
  )
}

export default function RecentEvents() {
  const [events, setEvents] = useState(FALLBACK_RECENT)
  const sectionRef = useRef(null)
  const titleRef = useRef(null)

  useEffect(() => {
    fetch('/api/v1/events?recent=true')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setEvents(data.slice(0, 3))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
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

  return (
    <section id="recent-events" ref={sectionRef} className="relative z-10 bg-sand-deep px-6 py-32 md:px-16 overflow-hidden">
      
      {/* Centered Massive Glow Heading */}
      <div className="mb-24 text-center">
        <h2
          ref={titleRef}
          className="select-none font-display text-[8vw] font-black tracking-tight text-ink uppercase md:text-[6vw]"
        >
          Recent <span className="text-coral filter drop-shadow-[0_0_20px_rgba(255,107,91,0.35)]">Events</span>
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
    </section>
  )
}
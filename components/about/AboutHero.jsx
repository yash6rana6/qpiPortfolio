'use client'

import Link from 'next/link'
import MaskedLines from '../ui/MaskedLines.jsx'
import Reveal from '../ui/Reveal.jsx'
import Parallax from '../ui/Parallax.jsx'
import { CrawlAnchor } from '../ui/CrawlStage.jsx'
import { ABOUT_HERO_LINES } from '../../lib/siteConfig.js'

const CHIPS = [
  { label: 'Razorpay secured', pos: 'left-[4%] top-[58%]', tone: 'bg-coral text-white', speed: 0.45 },
  { label: 'Instant booking codes', pos: 'left-[44%] top-[14%]', tone: 'bg-white text-plum', speed: -0.3 },
  { label: 'For organizers', pos: 'left-[30%] top-[78%]', tone: 'bg-mango text-plum', speed: 0.25 }
]

export default function AboutHero() {
  return (
    <section className="relative px-6 pb-28 pt-36 md:px-16 md:pt-44">
      {/* floating chips — each drifts at its own speed */}
      {CHIPS.map((chip) => (
        <Parallax key={chip.label} speed={chip.speed} className={`pointer-events-none absolute hidden md:block ${chip.pos}`}>
          <span className={`inline-block -rotate-3 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider shadow-lg ${chip.tone}`}>
            {chip.label}
          </span>
        </Parallax>
      ))}

      <div className="mx-auto grid max-w-7xl items-end gap-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Reveal as="p" className="text-xs uppercase tracking-[0.4em] text-plum/60 md:text-sm">
            About QPIE
          </Reveal>
          <MaskedLines
            lines={ABOUT_HERO_LINES}
            className="mt-6 font-display text-[14vw] font-black uppercase leading-[0.88] tracking-tight md:text-[8.5vw]"
            lineClassName="text-plum"
          />
        </div>

        <div className="lg:col-span-4">
          <CrawlAnchor pad={14} dx={16} dy={16} radius={40} className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-lg leading-relaxed text-plum/80">
              QPIE is an event discovery and ticket booking platform. Browse live shows, pick your seats,
              pay securely and get your booking code in seconds.
            </p>
            <Link
              href="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-plum px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 ease-spring hover:-translate-y-0.5"
            >
              Explore events <span aria-hidden>↗</span>
            </Link>
          </CrawlAnchor>
        </div>
      </div>
    </section>
  )
}

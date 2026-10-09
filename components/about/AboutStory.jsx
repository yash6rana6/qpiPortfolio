'use client'

import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import CountUp from '../ui/CountUp.jsx'
import Marquee from '../ui/Marquee.jsx'
import { CrawlAnchor } from '../ui/CrawlStage.jsx'
import { useEvents } from '../../lib/hooks.js'
import { MARQUEE_ITEMS } from '../../lib/siteConfig.js'

function Stat({ value, label }) {
  return (
    <div className="px-2 py-4 text-center md:py-2">
      <CountUp value={value} className="block font-display text-6xl font-black text-plum md:text-7xl" />
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-plum/50">{label}</p>
    </div>
  )
}

export default function AboutStory() {
  // Live numbers straight from the DB — nothing hard-coded.
  const { events } = useEvents()
  const seats = events.reduce((sum, e) => sum + (e.totalSeats || 0), 0)
  const categories = new Set(events.map((e) => e.category).filter(Boolean)).size

  return (
    <>
      <div className="relative -rotate-1 scale-x-105 bg-coral py-4 font-display text-xl font-black uppercase tracking-wide text-white md:text-3xl">
        <Marquee items={MARQUEE_ITEMS} />
      </div>

      <section className="relative px-6 py-28 md:px-16 md:py-36">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-12">
          <SectionHeading
            className="lg:col-span-5"
            align="left"
            tone="plum"
            eyebrow="Why QPIE"
            title="Shows deserve better than ten open tabs"
          />

          <div className="space-y-6 lg:col-span-7 lg:pt-16">
            <Reveal as="p" className="text-xl leading-relaxed text-plum/80 md:text-2xl">
              Finding a good show, checking if seats are left, paying and keeping the ticket safe — it
              shouldn&apos;t take half an evening.
            </Reveal>
            <Reveal as="p" delay={0.1} className="text-lg leading-relaxed text-plum/80">
              QPIE puts discovery and booking in one place: organizers publish an event, fans pick their
              seats, and the ticket lands in their account the moment payment is verified.
            </Reveal>
          </div>
        </div>

        <CrawlAnchor
          as={Reveal}
          from="scale"
          pad={22}
          dx={-14}
          dy={14}
          radius={52}
          className="mx-auto mt-20 grid max-w-5xl rounded-[2rem] bg-white p-6 md:grid-cols-3 md:p-10"
        >
          <Stat value={events.length} label="Events live" />
          <Stat value={seats} label="Seats on offer" />
          <Stat value={categories} label="Categories" />
        </CrawlAnchor>
      </section>
    </>
  )
}

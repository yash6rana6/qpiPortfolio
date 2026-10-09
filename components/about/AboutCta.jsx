'use client'

import Link from 'next/link'
import Reveal from '../ui/Reveal.jsx'
import { CrawlAnchor } from '../ui/CrawlStage.jsx'

export default function AboutCta() {
  return (
    <section className="relative px-6 pb-28 pt-12 md:px-16">
      {/* the black shape ends here and becomes this block's background */}
      <CrawlAnchor pad={0} radius={40} className="mx-auto max-w-7xl px-8 py-24 text-center text-white md:py-32">
        <Reveal as="p" className="text-xs uppercase tracking-[0.4em] text-white/50 md:text-sm">
          Your next night out
        </Reveal>
        <Reveal
          as="h2"
          delay={0.08}
          className="mx-auto mt-4 max-w-4xl font-display text-5xl font-black uppercase leading-[0.95] md:text-8xl"
        >
          Ready to be in the crowd?
        </Reveal>
        <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/events"
            className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-plum shadow-lg transition-transform duration-300 ease-spring hover:-translate-y-0.5"
          >
            Explore events
          </Link>
          <Link
            href="/events"
            className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-plum"
          >
            See events
          </Link>
        </Reveal>
      </CrawlAnchor>
    </section>
  )
}

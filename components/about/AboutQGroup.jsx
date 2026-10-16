'use client'

import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import ParallaxImage from '../ui/ParallaxImage.jsx'
import { initials } from '../../lib/utils.js'
import { QGROUP } from '../../lib/siteConfig.js'

export default function AboutQGroup() {
  const { eyebrow, title, lines, cmd } = QGROUP

  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-vice-pink font-display text-6xl font-black text-white">
      {initials(cmd.name)}
    </div>
  )

  return (
    <section className="relative px-6 pb-8 md:px-16">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionHeading align="left" tone="plum" eyebrow={eyebrow} title={title} />
          <div className="mt-10 space-y-5">
            {lines.map((line, i) => (
              <Reveal key={i} as="p" delay={i * 0.1} className="text-lg leading-relaxed text-plum/80 md:text-xl">
                {line}
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="lg:col-span-5">
          <article className="mx-auto max-w-sm rounded-3xl bg-white p-3">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-plum/5">
              <ParallaxImage src={cmd.photo} alt={cmd.name} fallback={fallback} />
            </div>
            <div className="px-2 pb-2 pt-4">
              <h3 className="font-display text-xl font-black text-plum">{cmd.name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-plum/50">{cmd.role}</p>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  )
}

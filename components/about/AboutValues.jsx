'use client'

import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import { CrawlAnchor } from '../ui/CrawlStage.jsx'
import { VALUES } from '../../lib/siteConfig.js'
import { pad } from '../../lib/utils.js'

export default function AboutValues() {
  return (
    <section className="relative px-6 py-28 md:px-16 md:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading tone="plum" eyebrow="What we stand for" title="Built on three promises" />

        <CrawlAnchor
          as={Reveal}
          stagger={0.15}
          pad={24}
          radius={56}
          className="mt-20 grid gap-6 md:grid-cols-3"
        >
          {VALUES.map((v, i) => (
            <article key={v.id} className="rounded-3xl bg-white p-8 md:p-10">
              <span className="font-display text-sm font-black tracking-[0.3em] text-coral">{pad(i + 1)}</span>
              <h3 className="mt-6 font-display text-3xl font-black leading-tight text-plum">{v.title}</h3>
              <p className="mt-4 leading-relaxed text-plum/70">{v.body}</p>
            </article>
          ))}
        </CrawlAnchor>
      </div>
    </section>
  )
}

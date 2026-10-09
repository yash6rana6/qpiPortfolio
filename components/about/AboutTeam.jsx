'use client'

import SectionHeading from '../ui/SectionHeading.jsx'
import Reveal from '../ui/Reveal.jsx'
import TeamCard from './TeamCard.jsx'
import { CrawlAnchor } from '../ui/CrawlStage.jsx'
import { TEAM } from '../../lib/siteConfig.js'

export default function AboutTeam() {
  return (
    <section className="relative px-6 py-28 md:px-16 md:py-36">
      <div className="mx-auto max-w-6xl">
        <SectionHeading tone="plum" eyebrow="The people" title="Meet the team" />

        <CrawlAnchor
          as={Reveal}
          stagger={0.12}
          pad={24}
          radius={56}
          className="mt-20 grid grid-cols-2 gap-5 lg:grid-cols-4"
        >
          {TEAM.map((member, i) => (
            <div key={member.id} className={i % 2 === 1 ? 'lg:mt-12' : ''}>
              <TeamCard member={member} />
            </div>
          ))}
        </CrawlAnchor>
      </div>
    </section>
  )
}

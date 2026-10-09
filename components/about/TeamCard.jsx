'use client'

import ParallaxImage from '../ui/ParallaxImage.jsx'
import { initials } from '../../lib/utils.js'

export default function TeamCard({ member }) {
  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-vice-pink font-display text-6xl font-black text-white">
      {initials(member.name)}
    </div>
  )

  return (
    <article className="group rounded-3xl bg-white p-3">
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-plum/5">
        <ParallaxImage
          src={member.photo}
          alt={member.name}
          fallback={fallback}
          imgClassName="transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="px-2 pb-2 pt-4">
        <h3 className="font-display text-xl font-black text-plum">{member.name}</h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-plum/50">{member.role}</p>
      </div>
    </article>
  )
}

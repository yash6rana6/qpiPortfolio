'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** City chips with a pill that glides to the active one. */
export default function CityPicker({ cities, value, onChange }) {
  const wrap = useRef(null)
  const pill = useRef(null)
  const placed = useRef(false)

  useEffect(() => {
    const active = wrap.current?.querySelector(`[data-city="${CSS.escape(value || '')}"]`)
    if (!active || !pill.current) return
    const props = { x: active.offsetLeft, width: active.offsetWidth, opacity: 1 }

    if (!placed.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(pill.current, props)
      placed.current = true
    } else {
      gsap.to(pill.current, { ...props, duration: 0.55, ease: 'power4.out' })
    }
  }, [value, cities])

  useEffect(() => {
    if (!cities.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('[data-city]', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' })
    }, wrap)
    return () => ctx.revert()
  }, [cities.length])

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-2 md:mx-0 md:px-0">
      <div ref={wrap} className="relative inline-flex gap-1 rounded-full border border-coral/15 bg-white/60 p-1.5 backdrop-blur-md">
        <span ref={pill} className="absolute left-0 top-1.5 h-[calc(100%-12px)] rounded-full bg-coral opacity-0 shadow-glow-coral" />
        {cities.map(({ city, shows }) => (
          <button
            key={city}
            data-city={city}
            onClick={() => onChange(city)}
            className={`relative z-10 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
              value === city ? 'text-white' : 'text-ink/60 hover:text-ink'
            }`}
          >
            {city}
            <span className={`ml-2 text-xs ${value === city ? 'text-white/70' : 'text-ink/30'}`}>{shows}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

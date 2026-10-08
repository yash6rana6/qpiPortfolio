'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// A single wavy path, reused for both the faint background track and the
// coral line that "draws" itself in as the whole page scrolls.
const CURVE_PATH = 'M20 0 C 2 120, 38 220, 20 340 S 2 560, 20 680 S 38 900, 20 1020 S 2 1160, 20 1280'

export default function ScrollProgressLine() {
  const progressPathRef = useRef(null)
  const dotRef = useRef(null)

  useEffect(() => {
    const path = progressPathRef.current
    const dot = dotRef.current
    if (!path) return

    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: (self) => {
        gsap.set(path, { strokeDashoffset: length - length * self.progress })

        if (dot) {
          const point = path.getPointAtLength(length * self.progress)
          gsap.set(dot, { attr: { cx: point.x, cy: point.y } })
        }
      }
    })

    return () => trigger.kill()
  }, [])

  return (
    <div className="pointer-events-none fixed inset-y-0 right-3 z-[60] hidden w-10 md:block lg:right-6">
      <svg viewBox="0 0 40 1280" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        {/* Faint track showing the full path */}
        <path d={CURVE_PATH} stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Coral line that draws in as the page scrolls */}
        <path
          ref={progressPathRef}
          d={CURVE_PATH}
          stroke="#FF6B5B"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,107,91,0.55))' }}
        />

        {/* Dot marking the current scroll position on the curve */}
        <circle ref={dotRef} r="5" cx="20" cy="0" fill="#FF6B5B" style={{ filter: 'drop-shadow(0 0 8px rgba(255,107,91,0.85))' }} />
      </svg>
    </div>
  )
}

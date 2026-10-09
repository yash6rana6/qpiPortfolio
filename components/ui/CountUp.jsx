'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion.js'
import { formatNumber } from '../../lib/utils.js'

export default function CountUp({ value = 0, duration = 1.6, suffix = '', className }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value)
      return
    }

    const counter = { n: 0 }
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        n: value,
        duration,
        ease: 'power2.out',
        onUpdate: () => setShown(Math.round(counter.n)),
        scrollTrigger: { trigger: ref.current, start: 'top 92%', once: true }
      })
    }, ref)

    return () => ctx.revert()
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {formatNumber(shown)}
      {suffix}
    </span>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion.js'

const FROM = {
  up: { y: 60 },
  down: { y: -60 },
  left: { x: -80 },
  right: { x: 80 },
  scale: { scale: 0.9 },
  fade: {}
}

/**
 * Scroll-reveal wrapper. Animates the element itself, or — with `stagger` —
 * its direct children. Transforms are cleared after the animation so blend
 * modes / layout aren't left in a stacking context.
 */
export default function Reveal({
  as: Tag = 'div',
  from = 'up',
  delay = 0,
  duration = 1,
  stagger = 0,
  start = 'top 88%',
  className,
  children,
  ...rest
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      gsap.from(stagger ? el.children : el, {
        opacity: 0,
        ...FROM[from],
        duration,
        delay,
        stagger,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: el, start, once: true }
      })
    }, el)

    return () => ctx.revert()
  }, [from, delay, duration, stagger, start])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

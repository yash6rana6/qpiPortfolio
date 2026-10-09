'use client'

import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion.js'
import { cn } from '../../lib/utils.js'

/**
 * Headline whose lines slide up out of a mask.
 * lines: string | { text, className }[]   — lineClassName is applied to every line.
 */
export default function MaskedLines({
  as: Tag = 'h1',
  lines,
  className,
  lineClassName,
  delay = 0.1,
  stagger = 0.12
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('[data-line]'), {
        yPercent: 115,
        duration: 1.1,
        delay,
        stagger,
        ease: 'power4.out',
        clearProps: 'transform',
        scrollTrigger: { trigger: el, start: 'top 95%', once: true }
      })
    }, el)

    return () => ctx.revert()
  }, [delay, stagger])

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => {
        const item = typeof line === 'string' ? { text: line } : line
        return (
          <span key={i} className="block overflow-hidden py-[0.06em]">
            <span data-line className={cn('block', lineClassName, item.className)}>
              {item.text}
            </span>
          </span>
        )
      })}
    </Tag>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion.js'
import { cn } from '../../lib/utils.js'

/**
 * Moves its content vertically while it scrolls through the viewport.
 * speed ~0.1–0.5 (negative = opposite direction). Use for decor / cards —
 * not for text that uses blend modes (the moving layer isolates blending).
 */
export default function Parallax({ speed = 0.2, className, innerClassName, children, ...rest }) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner || prefersReducedMotion()) return

    const amount = speed * 200
    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        { y: -amount },
        {
          y: amount,
          ease: 'none',
          scrollTrigger: { trigger: outer, start: 'top bottom', end: 'bottom top', scrub: true }
        }
      )
    }, outer)

    return () => ctx.revert()
  }, [speed])

  return (
    <div ref={outerRef} className={className} {...rest}>
      <div ref={innerRef} className={cn('will-change-transform', innerClassName)}>
        {children}
      </div>
    </div>
  )
}

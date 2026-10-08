'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Counts smoothly to `value` whenever it changes. */
export default function AnimatedNumber({ value, prefix = '' }) {
  const ref = useRef(null)
  const current = useRef({ n: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = `${prefix}${value.toLocaleString('en-IN')}`
      current.current.n = value
      return
    }
    const tween = gsap.to(current.current, {
      n: value,
      duration: 0.6,
      ease: 'power3.out',
      onUpdate: () => {
        node.textContent = `${prefix}${Math.round(current.current.n).toLocaleString('en-IN')}`
      }
    })
    return () => tween.kill()
  }, [value, prefix])

  return <span ref={ref}>{prefix}0</span>
}

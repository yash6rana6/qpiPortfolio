'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion.js'
import { cn } from '../../lib/utils.js'

/** Image that drifts inside its frame on scroll. Renders `fallback` if the file is missing. */
export default function ParallaxImage({ src, alt = '', amount = 8, fallback = null, className, imgClassName }) {
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  const [failed, setFailed] = useState(false)

  // onError can fire before hydration — re-check once mounted.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) setFailed(true)
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    const img = imgRef.current
    if (!frame || !img || failed || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        { yPercent: -amount },
        {
          yPercent: amount,
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
        }
      )
    }, frame)

    return () => ctx.revert()
  }, [amount, failed])

  if (failed) return fallback

  return (
    <div ref={frameRef} className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className={cn('absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover', imgClassName)}
      />
    </div>
  )
}

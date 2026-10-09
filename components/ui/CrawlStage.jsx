'use client'

import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion.js'
import { cn, clamp } from '../../lib/utils.js'

const KEYS = ['x', 'y', 'width', 'height', 'borderRadius', 'rotation']

/**
 * Marks an element the black shape should crawl onto.
 * The plate hugs this element (+ pad) and sits BEHIND it, so give the anchor
 * (or its children) its own background where you don't want black showing.
 * Don't transform/parallax the anchor itself — its rect is measured.
 *   pad    – px the plate extends past the element
 *   radius – plate corner radius (px)
 *   dx/dy  – plate offset (px) for a hard-shadow look
 */
export function CrawlAnchor({
  as: Tag = 'div',
  pad = 24,
  radius = 48,
  rotate = 0,
  dx = 0,
  dy = 0,
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      data-crawl=""
      data-pad={pad}
      data-radius={radius}
      data-rotate={rotate}
      data-dx={dx}
      data-dy={dy}
      className={cn('relative', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Wrap the page sections. One black shape lives inside; as you scroll it
 * morphs/crawls from one [data-crawl] anchor to the next.
 * Every section inside needs `relative` so it paints above the shape.
 */
export default function CrawlStage({ children, className }) {
  const stageRef = useRef(null)
  const shapeRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    const shape = shapeRef.current
    if (!stage || !shape) return

    if (prefersReducedMotion()) {
      shape.style.display = 'none'
      return
    }

    const anchors = Array.from(stage.querySelectorAll('[data-crawl]'))
    if (!anchors.length) return

    // Position of an anchor in stage (document) coordinates.
    const measure = (el) => {
      const s = stage.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      const pad = Number(el.dataset.pad)
      return {
        x: r.left - s.left - pad + Number(el.dataset.dx),
        y: r.top - s.top - pad + Number(el.dataset.dy),
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        borderRadius: Number(el.dataset.radius),
        rotation: Number(el.dataset.rotate)
      }
    }
    const vars = (el) => Object.fromEntries(KEYS.map((k) => [k, () => measure(el)[k]]))

    const ctx = gsap.context(() => {
      const first = measure(anchors[0])
      gsap.set(shape, Object.fromEntries(KEYS.map((k) => [k, first[k]])))

      // anchor[i] centred in viewport -> anchor[i+1] centred = one scrubbed segment
      anchors.slice(0, -1).forEach((el, i) => {
        gsap.fromTo(shape, vars(el), {
          ...vars(anchors[i + 1]),
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: el,
            endTrigger: anchors[i + 1],
            start: 'center center',
            end: 'center center',
            scrub: 0.8,
            invalidateOnRefresh: true
          }
        })
      })

      // squash/skew with scroll velocity so it feels like it's crawling
      const skewTo = gsap.quickTo(shape, 'skewY', { duration: 0.6, ease: 'power3' })
      const settle = gsap.delayedCall(0.15, () => skewTo(0)).pause()
      ScrollTrigger.create({
        trigger: stage,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          skewTo(clamp(self.getVelocity() / -350, -6, 6))
          settle.restart(true)
        }
      })
    }, stage)

    // Images / fonts / data change heights — keep the anchors honest.
    let timer
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => ScrollTrigger.refresh(), 150)
    }
    const ro = new ResizeObserver(refresh)
    ro.observe(stage)
    window.addEventListener('load', refresh)

    return () => {
      clearTimeout(timer)
      ro.disconnect()
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={stageRef} className={cn('relative isolate overflow-x-clip bg-sand', className)}>
      <div
        ref={shapeRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 will-change-transform"
        style={{ background: 'linear-gradient(135deg, #FF6B5B 0%, #FF2A85 100%)' }}
      />
      {children}
    </div>
  )
}

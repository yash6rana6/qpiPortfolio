'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/motion.js'
import { cn } from '../lib/utils.js'

const DOTS = ['#00B4D8', '#FF6B5B', '#1FAE8E', '#3D1A5B']

function timeAgo(value) {
  const t = new Date(value).getTime()
  if (!t) return ''
  const m = Math.max(1, Math.round((Date.now() - t) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Soft colour blobs: the glass needs something to blur. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute -left-24 top-24 h-96 w-96 rounded-full bg-ocean/30 blur-3xl" />
      <span className="absolute -right-24 top-40 h-[28rem] w-[28rem] rounded-full bg-coral/25 blur-3xl" />
      <span className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-plum/15 blur-3xl" />
      <span className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-mango/25 blur-3xl" />
    </div>
  )
}

/** Shown when an article has no usable picture. */
function Placeholder({ index }) {
  const dot = DOTS[index % DOTS.length]
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${dot}33, #ffffff99 55%, ${dot}22)` }}
    >
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-ink/30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h13a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V5Z" />
        <path d="M19 9h1a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2" />
        <path d="M8 9h7M8 13h7M8 16h4" />
      </svg>
    </div>
  )
}

function NewsImage({ src, index, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <Placeholder index={index} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth < 80) setFailed(true) // tracking pixels / broken thumbnails
      }}
      className="h-full w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-105"
    />
  )
}

/** One story. `featured` = the wide first card. */
function NewsCard({ item, index, featured = false }) {
  const dot = DOTS[index % DOTS.length]

  const source = (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-md">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="truncate">{item.source || 'News'}</span>
    </span>
  )

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'news-glass news-lift group flex rounded-3xl',
        featured
          ? 'flex-col gap-5 p-3 md:h-[380px] md:flex-row md:gap-8 md:p-4'
          : 'h-[380px] w-[280px] shrink-0 snap-start flex-col p-3 md:w-[310px]'
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-2xl',
          featured ? 'h-56 md:h-full md:w-[55%]' : 'h-44'
        )}
      >
        <NewsImage src={item.image} index={index} alt={item.title} />
        <span className="absolute left-3 top-3 max-w-[85%]">{source}</span>
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col', featured ? 'px-2 pb-2 md:py-4 md:pr-4' : 'px-2 pb-2 pt-4')}>
        <p className="text-xs font-medium text-ink/50">
          {featured && <span className="mr-2 font-semibold uppercase tracking-[0.16em] text-ocean">Top story</span>}
          {item.publishedAt ? timeAgo(item.publishedAt) : ''}
        </p>

        <h3
          className={cn(
            'mt-2 line-clamp-3 font-display font-semibold text-ink',
            featured ? 'text-3xl leading-[1.15] tracking-tight md:text-4xl' : 'text-[19px] leading-snug'
          )}
        >
          {item.title}
        </h3>

        {featured && item.description && (
          <p className="mt-4 line-clamp-3 font-body text-base leading-relaxed text-ink/65">{item.description}</p>
        )}

        {featured ? (
          <span className="mt-auto inline-flex items-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-300 group-hover:bg-ocean">
            Read story
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        ) : (
          <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            Read story
            <span aria-hidden="true" className="text-ocean transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        )}
      </div>
    </a>
  )
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      <div className="news-glass h-[430px] animate-pulse rounded-3xl md:h-[380px]" />
      <div className="mt-8 flex gap-6 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="news-glass h-[380px] w-[280px] shrink-0 animate-pulse rounded-3xl md:w-[310px]" />
        ))}
      </div>
    </div>
  )
}

function Arrow({ dir, visible, onClick }) {
  return (
    <button
      type="button"
      aria-label={dir < 0 ? 'Previous stories' : 'Next stories'}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'news-glass absolute top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-ink md:flex',
        'transition-all duration-300 hover:scale-105 hover:bg-white/90',
        dir < 0 ? 'left-1' : 'right-1',
        !visible && 'pointer-events-none opacity-0'
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

export default function LucknowNews({ ready = true }) {
  const [items, setItems] = useState(null) // null = loading, [] = nothing to show
  const [edge, setEdge] = useState({ start: true, end: false })
  const rootRef = useRef(null)
  const scrollerRef = useRef(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/v1/news', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(Array.isArray(d.items) ? d.items : []))
      .catch((err) => {
        if (err.name !== 'AbortError') setItems([])
      })
    return () => ctrl.abort()
  }, [])

  // The Hero below is pinned by ScrollTrigger, which measured the page before this section grew:
  // re-measure whenever our height changes (data arrived, or nothing to show).
  useEffect(() => {
    if (items === null) return
    const t1 = requestAnimationFrame(() => ScrollTrigger.refresh())
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => {
      cancelAnimationFrame(t1)
      clearTimeout(t2)
    }
  }, [items])

  // Arrows only show in the direction you can still scroll.
  const syncEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const start = el.scrollLeft < 8
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    setEdge((p) => (p.start === start && p.end === end ? p : { start, end }))
  }, [])

  useEffect(() => {
    syncEdges()
    window.addEventListener('resize', syncEdges)
    return () => window.removeEventListener('resize', syncEdges)
  }, [items, syncEdges])

  // Entrance animation (waits for the preloader).
  useEffect(() => {
    if (!ready || !items?.length || !rootRef.current) return
    const targets = rootRef.current.querySelectorAll('[data-pop]')
    if (prefersReducedMotion()) {
      gsap.set([...targets, '[data-head]'], { opacity: 1 })
      return
    }
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-head]', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      gsap.fromTo(
        targets,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.15 }
      )
    }, rootRef)
    return () => ctx.revert()
  }, [ready, items])

  const scrollBy = useCallback((dir) => {
    scrollerRef.current?.scrollBy({ left: dir * 330, behavior: 'smooth' })
  }, [])

  if (items && items.length === 0) return null // no key / API down: hide quietly

  const [featured, ...rest] = items || []

  return (
    <section ref={rootRef} className="relative isolate overflow-hidden bg-sand pb-20 pt-28 md:pb-28 md:pt-36">
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        <header data-head className="mb-10 opacity-0">
          <span className="news-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-coral" />
            </span>
            Live · Lucknow
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink md:text-6xl">Lucknow Buzz</h2>
          <p className="mt-3 max-w-xl font-body text-base text-ink/60 md:text-lg">
            Concerts, melas, festivals and shows making news in Lucknow right now.
          </p>
        </header>

        {items === null ? (
          <Skeleton />
        ) : (
          <>
            <div data-pop className="opacity-0">
              <NewsCard item={featured} index={0} featured />
            </div>

            {rest.length > 0 && (
              <div className="relative mt-6">
                <Arrow dir={-1} visible={!edge.start} onClick={() => scrollBy(-1)} />
                <Arrow dir={1} visible={!edge.end} onClick={() => scrollBy(1)} />
                <div
                  ref={scrollerRef}
                  onScroll={syncEdges}
                  className="news-scroll -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-10 pt-4 md:-mx-12 md:px-12"
                >
                  {rest.map((item, i) => (
                    <div key={item.id || item.url} data-pop className="opacity-0">
                      <NewsCard item={item} index={i + 1} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
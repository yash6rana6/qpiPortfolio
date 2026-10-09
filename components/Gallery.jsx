'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from '../lib/motion.js'
import { useEvents } from '../lib/hooks.js'
import { cn, pad, formatDate, formatTime, formatPrice, posterBackground } from '../lib/utils.js'
import SectionHeading from './ui/SectionHeading.jsx'
import SmokeBackdrop from './ui/SmokeBackdrop.jsx'
import EmptyState from './ui/EmptyState.jsx'
import DrawnArrow from './ui/DrawnArrow.jsx'
import { ArrowIcon } from './ui/Icons.jsx'

const NAV_BTN =
  'group absolute z-50 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:border-coral hover:bg-coral hover:shadow-[0_0_20px_rgba(255,107,91,0.5)]'

export default function Gallery() {
  const { events: items, loading } = useEvents()
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef(null)
  const directionRef = useRef(1)

  const total = items.length
  const current = items[index] || items[0]
  const prevItem = total ? items[(index - 1 + total) % total] : null
  const nextItem = total ? items[(index + 1) % total] : null

  const goTo = useCallback(
    (nextIndex, dir) => {
      directionRef.current = dir
      setIndex(((nextIndex % total) + total) % total)
    },
    [total]
  )

  useEffect(() => {
    if (!cardRef.current || !current) return
    const dir = directionRef.current

    gsap.fromTo(
      cardRef.current,
      { opacity: 0, x: dir * 180, y: -40, rotationZ: dir * 12, rotationY: dir * -30, scale: 0.8 },
      { opacity: 1, x: 0, y: 0, rotationZ: 0, rotationY: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' }
    )
    setHovered(false)
  }, [index, current?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const price = current ? formatPrice(current.pricePerSeat) : ''

  return (
    <section id="gallery" className="relative z-10 overflow-hidden bg-[#050505] px-6 py-24 md:px-16">
      <SmokeBackdrop />

      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionHeading tone="dark" size="xl" eyebrow="Moments that matter" title="Gallery" />

        {loading && (
          <div className="mx-auto mt-20 aspect-[4/5] w-full max-w-[22rem] animate-pulse rounded-[2rem] bg-white/10 sm:aspect-[5/4] sm:max-w-[26rem]" />
        )}

        {!loading && !current && (
          <div className="mt-20">
            <EmptyState tone="dark" title="No events yet" message="New shows will appear here as soon as they're published." />
          </div>
        )}

        {current && (
          <>
            <div className="relative mt-24 flex items-center justify-center">
              {/* Title annotation (top left, outside the card) */}
              <div className="absolute -top-16 left-[2%] z-50 hidden md:block lg:left-[14%]">
                <div className={cn('transition-all duration-700', hovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}>
                  <span className="font-display text-3xl font-black uppercase tracking-wider text-white drop-shadow-md">
                    {current.title}
                  </span>
                  <div className="mt-1 h-1 w-full rounded-full bg-coral shadow-[0_0_10px_rgba(255,107,91,0.8)]" />
                  <DrawnArrow variant="top" animate={hovered} />
                </div>
              </div>

              {total > 1 && (
                <>
                  <div
                    className="absolute left-0 top-1/2 hidden h-[60%] w-1/5 -translate-x-1/3 -translate-y-1/2 rounded-[2rem] bg-cover bg-center opacity-30 blur-[6px] transition-all duration-500 lg:block"
                    style={posterBackground(prevItem?.posterImage)}
                  />
                  <div
                    className="absolute right-0 top-1/2 hidden h-[60%] w-1/5 -translate-y-1/2 translate-x-1/3 rounded-[2rem] bg-cover bg-center opacity-30 blur-[6px] transition-all duration-500 lg:block"
                    style={posterBackground(nextItem?.posterImage)}
                  />
                  <button onClick={() => goTo(index - 1, -1)} aria-label="Previous event" className={cn(NAV_BTN, 'left-0 md:left-4')}>
                    <ArrowIcon direction="left" />
                  </button>
                </>
              )}

              <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => window.matchMedia('(hover: none)').matches && setHovered((h) => !h)}
                style={{ perspective: '1400px' }}
                className="relative z-40 w-full max-w-[22rem] sm:max-w-[26rem]"
              >
                <div ref={cardRef} className="will-change-transform">
                  <div
                    className={cn(
                      'overflow-hidden rounded-[2rem] border border-white/20 bg-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-500 ease-out will-change-transform',
                      hovered
                        ? 'border-white/40 shadow-[0_50px_100px_rgba(220,20,60,0.5)] [transform:rotateX(5deg)_rotateY(-8deg)_scale(1.05)]'
                        : '[transform:rotateX(0deg)_rotateY(0deg)_scale(1)]'
                    )}
                  >
                    <div className="relative aspect-[4/5] w-full sm:aspect-[5/4]">
                      <div
                        className={cn('absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out', hovered ? 'opacity-100' : 'opacity-80')}
                        style={posterBackground(current.posterImage)}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                      {/* Real event details, revealed on hover / tap */}
                      <div
                        className={cn(
                          'absolute inset-0 z-10 flex flex-col justify-end gap-3 bg-gradient-to-t from-black via-black/90 to-black/50 p-5 transition-all duration-500 md:p-6',
                          hovered ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
                        )}
                      >
                        <span className="w-fit rounded-full bg-coral px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          {current.category}
                        </span>
                        <h3 className="font-display text-2xl font-black leading-tight text-white md:text-3xl">{current.title}</h3>

                        {current.description && (
                          <p className="line-clamp-3 text-sm leading-relaxed text-white/75">{current.description}</p>
                        )}

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <dt className="text-white/40">Date</dt>
                            <dd className="font-semibold text-white">
                              {[formatDate(current.date), formatTime(current.date)].filter(Boolean).join(' · ') || 'To be announced'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-white/40">Venue</dt>
                            <dd className="truncate font-semibold text-white">{current.venue || 'To be announced'}</dd>
                          </div>
                          {price && (
                            <div>
                              <dt className="text-white/40">Price</dt>
                              <dd className="font-semibold text-white">{price} / seat</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-white/40">Seats</dt>
                            <dd className="font-semibold text-white">
                              {current.availableSeats > 0 ? `${current.availableSeats} left` : 'Sold out'}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-1 flex gap-2">
                          <Link
                            href={`/events/${current._id}`}
                            className="flex-1 rounded-xl border border-white/30 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black"
                          >
                            View event
                          </Link>
                          {current.pricePerSeat > 0 && current.availableSeats > 0 && (
                            <Link
                              href={`/bookshow?event=${current._id}`}
                              className="flex-1 rounded-xl bg-coral py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5"
                            >
                              Book now
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-5 md:p-6">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                          {[current.category, formatDate(current.date)].filter(Boolean).join(' · ')}
                        </span>
                        <h3
                          className="font-display text-2xl font-bold leading-none text-white drop-shadow-lg transition-transform duration-500 md:text-4xl"
                          style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}
                        >
                          {current.title}
                        </h3>
                        {(current.venue || price) && (
                          <p className="text-xs text-white/70">{[current.venue, price && `from ${price}`].filter(Boolean).join(' · ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {total > 1 && (
                <button onClick={() => goTo(index + 1, 1)} aria-label="Next event" className={cn(NAV_BTN, 'right-0 md:right-4')}>
                  <ArrowIcon direction="right" />
                </button>
              )}
            </div>

            <div className="mt-16 flex flex-col items-center gap-4">
              <span className="font-display text-sm font-bold tracking-[0.3em] text-white">
                {pad(index + 1)} <span className="text-white/40">/ {pad(total)}</span>
              </span>
              <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10 shadow-inner">
                <div
                  className="h-full rounded-full bg-coral shadow-[0_0_10px_rgba(255,107,91,0.8)] transition-all duration-500 ease-out"
                  style={{ width: `${((index + 1) / total) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

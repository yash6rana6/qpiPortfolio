'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'

const FALLBACK_ITEMS = [
  {
    _id: '1',
    title: 'Arijit Singh',
    category: 'Live In Concert',
    venue: 'Indira Gandhi Stadium, Delhi',
    date: '2026-11-12',
    pricePerSeat: 1499,
    posterImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '2',
    title: 'Sahara Nights',
    category: 'Music Festival',
    venue: 'JLN Stadium, New Delhi',
    date: '2026-11-14',
    pricePerSeat: 1999,
    posterImage: 'https://images.unsplash.com/photo-1540039155732-d69282f9e6b4?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '3',
    title: 'Crypto Arena',
    category: 'Live Show',
    venue: 'Phoenix Marketcity, Mumbai',
    date: '2026-10-02',
    pricePerSeat: 1299,
    posterImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '4',
    title: 'Howling Abyss',
    category: 'Esports',
    venue: 'Hitex Arena, Hyderabad',
    date: '2026-09-20',
    pricePerSeat: 999,
    posterImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '5',
    title: 'St James',
    category: 'Installation',
    venue: 'NGMA, Bengaluru',
    date: '2026-12-05',
    pricePerSeat: 499,
    posterImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '6',
    title: 'Vice City Tour',
    category: 'Concert',
    venue: 'DY Patil Stadium, Mumbai',
    date: '2026-08-18',
    pricePerSeat: 1799,
    posterImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '7',
    title: 'Neon Circuit',
    category: 'Motorsport',
    venue: 'Buddh International Circuit',
    date: '2026-07-11',
    pricePerSeat: 2499,
    posterImage: 'https://images.unsplash.com/photo-1521111623912-70b8893d5de9?q=80&w=1600&auto=format&fit=crop'
  },
  {
    _id: '8',
    title: 'Amber Circuit',
    category: 'Esports',
    venue: 'Jio World Convention Centre',
    date: '2026-06-27',
    pricePerSeat: 899,
    posterImage: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1600&auto=format&fit=crop'
  }
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function ArrowIcon({ direction = 'right' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-5 w-5 ${direction === 'left' ? 'rotate-180' : ''}`}
    >
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 
 * Main Name Arrow (Top Left) - Slowed Down
 */
function DrawnArrow({ animate = false }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className="mt-2 h-16 w-24 text-coral drop-shadow-[0_0_10px_rgba(255,107,91,0.5)]"
    >
      <path
        d="M10 20 Q 50 -10, 80 50 T 90 90"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: animate ? 0 : 200,
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', // Slower draw
        }}
      />
      <path
        d="M70 85 L 90 90 L 95 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: animate ? 0 : 50,
          transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.7s', // Slower delay for arrowhead
        }}
      />
    </svg>
  )
}

/** 
 * Event Details Arrow (Bottom Right Corner - Outside) - Slowed Down & Pointing Up-Left
 */
function DrawnArrowCorner({ animate = false }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className="mb-2 mr-6 h-16 w-24 text-coral drop-shadow-[0_0_8px_rgba(255,107,91,0.5)]"
    >
      <path
        d="M90 90 Q 60 90, 20 20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: animate ? 0 : 200,
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)', // Slower draw
        }}
      />
      <path
        d="M20 45 L 20 20 L 45 20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: animate ? 0 : 50,
          transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.7s', // Slower delay
        }}
      />
    </svg>
  )
}

export default function Gallery() {
  const [items, setItems] = useState(FALLBACK_ITEMS)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef(null)
  const directionRef = useRef(1)

  useEffect(() => {
    fetch('/api/v1/events')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data)
          setIndex(0)
        }
      })
      .catch(() => {})
  }, [])

  const total = items.length
  const current = items[index]
  const prevItem = items[(index - 1 + total) % total]
  const nextItem = items[(index + 1) % total]

  const goTo = useCallback(
    (nextIndex, dir) => {
      directionRef.current = dir
      setIndex(((nextIndex % total) + total) % total)
    },
    [total]
  )

  const goNext = useCallback(() => goTo(index + 1, 1), [goTo, index])
  const goPrev = useCallback(() => goTo(index - 1, -1), [goTo, index])

  useEffect(() => {
    if (!cardRef.current) return
    const dir = directionRef.current

    gsap.fromTo(
      cardRef.current,
      { 
        opacity: 0, 
        x: dir * 180, 
        y: -40,
        rotationZ: dir * 12,
        rotationY: dir * -30,
        scale: 0.8 
      },
      { 
        opacity: 1, 
        x: 0, 
        y: 0,
        rotationZ: 0,
        rotationY: 0,
        scale: 1, 
        duration: 0.8, 
        ease: 'back.out(1.4)' 
      }
    )
  }, [index])

  useEffect(() => {
    setHovered(false)
  }, [index])

  if (!current) return null

  return (
    <section id="gallery" className="relative z-10 overflow-hidden bg-[#050505] px-6 py-32 md:px-16">
      
      {/* Red moving smoke behind the card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="smoke-blob animate-drift-a absolute -left-[10%] top-[10%] h-[600px] w-[600px]"
          style={{ background: 'radial-gradient(circle, rgba(220,20,60,0.5), transparent 65%)' }}
        />
        <div
          className="smoke-blob animate-drift-b absolute -right-[5%] top-[40%] h-[500px] w-[500px]"
          style={{ background: 'radial-gradient(circle, rgba(255,0,50,0.4), transparent 65%)' }}
        />
        <div
          className="smoke-blob animate-drift-c absolute bottom-[-10%] left-[20%] h-[700px] w-[700px]"
          style={{ background: 'radial-gradient(circle, rgba(180,0,0,0.45), transparent 65%)' }}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50 md:text-sm">Moments that matter</p>
          <h2 className="mt-3 font-display text-6xl font-black uppercase tracking-tight text-white md:text-8xl">
            Gallery
          </h2>
          <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-coral shadow-[0_0_15px_rgba(255,107,91,0.6)]" />
        </div>

        <div className="relative mt-32 flex items-center justify-center">
          
          {/* Main Hover Annotation (Top Left - OUTSIDE) */}
          <div className="absolute -top-16 left-[2%] z-50 hidden md:block lg:left-[10%]">
            <div className={`transition-all duration-700 ${hovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <span className="font-display text-3xl font-black uppercase tracking-wider text-white drop-shadow-md">
                {current.title}
              </span>
              <div className="mt-1 h-1 w-full rounded-full bg-coral shadow-[0_0_10px_rgba(255,107,91,0.8)]" />
              <DrawnArrow animate={hovered} />
            </div>
          </div>

          {/* Event Details Hover Annotation (Bottom Right - OUTSIDE) */}
          <div className="absolute -bottom-12 right-[2%] z-50 hidden md:flex flex-col items-end lg:right-[10%]">
            <div className={`flex flex-col items-end transition-all duration-700 ${hovered ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
              <DrawnArrowCorner animate={hovered} />
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-white drop-shadow-md">
                Event Details
              </span>
              <div className="mt-1 h-[2px] w-full rounded-full bg-coral shadow-[0_0_10px_rgba(255,107,91,0.8)]" />
            </div>
          </div>

          <div
            className="absolute left-0 top-1/2 hidden h-[70%] w-1/4 -translate-y-1/2 -translate-x-1/3 rounded-[2rem] bg-cover bg-center opacity-30 blur-[6px] lg:block transition-all duration-500"
            style={{ backgroundImage: `url(${prevItem.posterImage})` }}
          />
          <div
            className="absolute right-0 top-1/2 hidden h-[70%] w-1/4 -translate-y-1/2 translate-x-1/3 rounded-[2rem] bg-cover bg-center opacity-30 blur-[6px] lg:block transition-all duration-500"
            style={{ backgroundImage: `url(${nextItem.posterImage})` }}
          />

          <button
            onClick={goPrev}
            aria-label="Previous event"
            className="group absolute left-0 z-50 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:border-coral hover:bg-coral hover:shadow-[0_0_20px_rgba(255,107,91,0.5)] md:left-4"
          >
            <ArrowIcon direction="left" />
          </button>

          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ perspective: '1400px' }}
            className="relative z-40 w-full max-w-[34rem]"
          >
            <div ref={cardRef} className="will-change-transform">
              <div
                className={`overflow-hidden rounded-[2rem] border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-all duration-500 ease-out will-change-transform ${
                  hovered
                    ? '[transform:rotateX(5deg)_rotateY(-8deg)_scale(1.05)] shadow-[0_50px_100px_rgba(220,20,60,0.5)] border-white/40'
                    : '[transform:rotateX(0deg)_rotateY(0deg)_scale(1)]'
                }`}
              >
                <div className="relative aspect-[4/5] w-full sm:aspect-[16/11]">
                  
                  {/* Image is now CLEAR and completely visible. No mix-blend messing it up. */}
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out hover:scale-105 ${
                      hovered ? 'opacity-100' : 'opacity-80'
                    }`}
                    style={{ backgroundImage: `url(${current.posterImage})` }}
                  />
                  
                  {/* Subtle dark gradient at the bottom so the white text stays readable */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Normal Title Inside Card (Bottom Left) */}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-6 md:p-8">
                    <h3
                      className="font-display text-3xl font-bold leading-none text-white transition-transform duration-500 md:text-5xl drop-shadow-lg"
                      style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }}
                    >
                      {current.title}
                    </h3>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={goNext}
            aria-label="Next event"
            className="group absolute right-0 z-50 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition-all hover:scale-110 hover:border-coral hover:bg-coral hover:shadow-[0_0_20px_rgba(255,107,91,0.5)] md:right-4"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>

        <div className="mt-20 flex flex-col items-center gap-4">
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
      </div>
    </section>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// A mix of sticker shapes: rounded tags + star bursts, scattered with
// different rotations so they overlap into a loose pile, like a sticker sheet.
const STICKERS = [
  { id: 1, type: 'tag', label: 'LIVE BOOKING', color: '#FF2A85', rotate: -10, top: '4%', left: '2%', size: 'w-40' },
  { id: 2, type: 'star', label: '★', color: '#D6FF3F', rotate: 14, top: '0%', left: '20%', size: 'w-24' },
  { id: 3, type: 'tag', label: 'TEAM WORK\nDREAM WORK', color: '#00F0FF', rotate: 8, top: '10%', left: '30%', size: 'w-44' },
  { id: 4, type: 'star', label: '✦', color: '#FF7A00', rotate: -18, top: '2%', left: '48%', size: 'w-28' },
  { id: 5, type: 'tag', label: 'VERIFIED\nMETRICS', color: '#8B5CF6', rotate: -6, top: '14%', left: '58%', size: 'w-40' },
  { id: 6, type: 'oval', label: 'From where?', color: '#E4E4E7', rotate: 4, top: '0%', left: '76%', size: 'w-44' },
  { id: 7, type: 'star', label: '★', color: '#FF2A85', rotate: 20, top: '8%', left: '88%', size: 'w-24' },
  { id: 8, type: 'tag', label: 'RETARGETING\nENGINE', color: '#00E28A', rotate: 10, top: '18%', left: '10%', size: 'w-40' }
]

function StickerShape({ s }) {
  if (s.type === 'star') {
    return (
      <div
        className={`flex aspect-square ${s.size} items-center justify-center font-display text-4xl font-black text-black shadow-lg`}
        style={{
          backgroundColor: s.color,
          clipPath:
            'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        }}
      >
        {s.label}
      </div>
    )
  }
  if (s.type === 'oval') {
    return (
      <div
        className={`${s.size} rounded-full border border-black/20 px-6 py-5 text-center font-display text-sm font-bold leading-tight text-black shadow-lg`}
        style={{ backgroundColor: s.color }}
      >
        {s.label}
      </div>
    )
  }
  return (
    <div
      className={`${s.size} whitespace-pre-line rounded-md border border-black/20 px-4 py-3 text-center font-display text-sm font-black uppercase leading-tight text-white shadow-lg`}
      style={{ backgroundColor: s.color }}
    >
      {s.label}
    </div>
  )
}

export default function Footer() {
  const footerRef = useRef(null)
  const pileRef = useRef(null)
  const stickerRefs = useRef([])

  const [email, setEmail] = useState('')
  const [subscribeState, setSubscribeState] = useState('idle') // idle | saving | done | error
  const [subscribeMessage, setSubscribeMessage] = useState('')

  async function handleSubscribe(e) {
    e.preventDefault()
    setSubscribeState('saving')
    setSubscribeMessage('')

    try {
      const res = await fetch('/api/v1/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not go through. Try again.')

      setSubscribeState('done')
      setSubscribeMessage('You are on the list.')
      setEmail('')
    } catch (err) {
      setSubscribeState('error')
      setSubscribeMessage(err.message)
    }
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      stickerRefs.current.forEach((el, i) => {
        if (!el) return
        const finalRotate = STICKERS[i].rotate

        // Slower, smooth floating drop animation with soft bounce
        gsap.fromTo(
          el,
          {
            y: -700,
            x: gsap.utils.random(-60, 60),
            opacity: 0,
            rotate: gsap.utils.random(-90, 90)
          },
          {
            y: 0,
            x: 0,
            opacity: 1,
            rotate: finalRotate,
            duration: 2.2, // Slowed down from 1.1s for a buttery smooth drop
            delay: i * 0.12, // Slightly increased stagger for sequential feel
            ease: 'bounce.out(1.2, 0.4)', // Smooth realistic bounce
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 70%',
              toggleActions: 'play none none reverse'
            }
          }
        )
      })
    }, footerRef)

    return () => ctx.revert()
  }, [])

  return (
    <footer
      ref={footerRef}
      className="relative flex min-h-screen w-full flex-col overflow-hidden border-t border-black/10 px-6 py-10 md:px-14 md:py-14"
      style={{ background: 'linear-gradient(160deg, #FFB627 0%, #FF6B5B 100%)' }}
    >
      {/* Top row: heading + email signup */}
      <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
        <div className="max-w-xl">
          <h2 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl drop-shadow-md">
            QPIE Digital
            <br />
            is here
          </h2>
          <p className="mt-5 text-lg text-white/80 md:text-xl">
            Sign up to hear what&apos;s next before anyone else.
          </p>
        </div>

        <div className="w-full max-w-xl">
          <form onSubmit={handleSubscribe} className="flex items-stretch gap-3">
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-2xl bg-white px-6 py-5 text-base text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-white/70 transition-all"
            />
            <button
              type="submit"
              disabled={subscribeState === 'saving'}
              aria-label="Sign up"
              className="flex aspect-square items-center justify-center rounded-2xl bg-white px-6 text-xl text-ink transition-transform hover:-translate-y-0.5 hover:translate-x-0.5 active:scale-95 disabled:opacity-60"
            >
              ↗
            </button>
          </form>

          {subscribeMessage && (
            <p
              role="status"
              className={`mt-3 text-sm ${subscribeState === 'error' ? 'text-red-100' : 'text-white'}`}
            >
              {subscribeMessage}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-white/60">
            *By subscribing, you agree to receive personalized updates from QPIE in line with your
            interests, in accordance with our{' '}
            <a href="#" className="underline hover:text-white">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Sticker pile — drops in slowly from top on scroll */}
      <div ref={pileRef} className="relative mt-14 h-64 w-full flex-1 md:mt-20 md:h-80">
        {STICKERS.map((s, i) => (
          <div
            key={s.id}
            ref={(el) => (stickerRefs.current[i] = el)}
            className="absolute will-change-transform"
            style={{ top: s.top, left: s.left }}
          >
            <StickerShape s={s} />
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="relative z-10 mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/20 pt-6 text-sm text-white/70 md:flex-row md:items-center">
        <p>Proudly presented by QPIE Digital</p>
        <p className="hover:text-white transition-colors cursor-pointer">Follow us on Instagram</p>
        <p className="text-white/50">© 2026 QPIE. All rights reserved.</p>
      </div>
    </footer>
  )
}
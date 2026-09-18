'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function Preloader({ onComplete }) {
  const [percent, setPercent] = useState(0)
  const overlayRef = useRef(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const counter = { value: 0 }

    gsap.to(counter, {
      value: 100,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.round(counter.value)
        setPercent(val)

        // Dynamically increase Saturation (50% -> 100%) and Lightness (40% -> 50%) as counter increases
        if (overlayRef.current) {
          const saturation = 50 + (val * 0.5) // 50% to 100%
          const lightness = 40 + (val * 0.1)   // 40% to 50%
          overlayRef.current.style.backgroundColor = `hsl(50, ${saturation}%, ${lightness}%)`
          
          // Subtle glow effect buildup on the overlay
          overlayRef.current.style.boxShadow = `inset 0 0 ${val * 1.5}px rgba(255, 255, 255, 0.4)`
        }
      },
      onComplete: () => {
        if (doneRef.current) return
        doneRef.current = true

        gsap.to(overlayRef.current, {
          scale: 1.05,
          y: '-100%',
          duration: 1.1,
          ease: 'power4.inOut',
          delay: 0.15,
          onComplete
        })
      }
    })
  }, [onComplete])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center will-change-transform"
      style={{ backgroundColor: 'hsl(50, 50%, 40%)' }}
    >
      <span className="font-display text-[16vw] font-black leading-none tracking-tighter text-black tabular-nums select-none drop-shadow-md">
        {percent}%
      </span>
    </div>
  )
}
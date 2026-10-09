import { cn } from '../../lib/utils.js'

/** Infinite horizontal ticker (pure CSS — see .animate-marquee in globals.css). */
export default function Marquee({ items, duration = 28, className }) {
  const track = [...items, ...items]

  return (
    <div className={cn('overflow-hidden whitespace-nowrap', className)} aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-10" style={{ animationDuration: `${duration}s` }}>
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            {item}
            <span>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

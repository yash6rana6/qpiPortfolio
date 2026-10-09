const PATHS = {
  // hand-drawn arrow curling down-right (title annotation)
  top: {
    body: 'M10 20 Q 50 -10, 80 50 T 90 90',
    head: 'M70 85 L 90 90 L 95 70',
    className: 'mt-2 h-16 w-24 drop-shadow-[0_0_10px_rgba(255,107,91,0.5)]'
  },
  // arrow pointing up-left (event details annotation)
  corner: {
    body: 'M90 90 Q 60 90, 20 20',
    head: 'M20 45 L 20 20 L 45 20',
    className: 'mb-2 mr-6 h-16 w-24 drop-shadow-[0_0_8px_rgba(255,107,91,0.5)]'
  }
}

export default function DrawnArrow({ variant = 'top', animate = false }) {
  const p = PATHS[variant]
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }

  return (
    <svg viewBox="0 0 100 100" fill="none" className={`text-coral ${p.className}`}>
      <path
        d={p.body}
        {...stroke}
        style={{
          strokeDasharray: 200,
          strokeDashoffset: animate ? 0 : 200,
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
      <path
        d={p.head}
        {...stroke}
        style={{
          strokeDasharray: 50,
          strokeDashoffset: animate ? 0 : 50,
          transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.7s'
        }}
      />
    </svg>
  )
}

export function AlbumIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 17a3 3 0 0 1 3-3h11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12.5" cy="8.5" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function ArrowIcon({ direction = 'right', className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`${className} ${direction === 'left' ? 'rotate-180' : ''}`}>
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

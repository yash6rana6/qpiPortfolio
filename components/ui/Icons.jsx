export function ArrowIcon({ direction = 'right', className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`${className} ${direction === 'left' ? 'rotate-180' : ''}`}>
      <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

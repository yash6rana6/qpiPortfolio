import { cn } from '../../lib/utils.js'

export default function EmptyState({ title, message, tone = 'light', className }) {
  const dark = tone === 'dark'
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center rounded-3xl border px-8 py-12 text-center',
        dark ? 'border-white/15 bg-white/5 text-white' : 'border-ink/10 bg-white text-ink',
        className
      )}
    >
      <p className="font-display text-2xl font-bold">{title}</p>
      {message && <p className={cn('mt-2 text-sm', dark ? 'text-white/60' : 'text-ink/60')}>{message}</p>}
    </div>
  )
}

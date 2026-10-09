import { cn, formatPrice } from '../../lib/utils.js'

/** Fixed bottom bar: total + pay button. Slides up once a ticket is added. */
export default function CheckoutBar({ qty, total, detail, busy, signedIn, message, onPay }) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white shadow-[0_-10px_30px_rgba(43,27,18,0.08)] transition-transform duration-500 ease-spring',
        qty > 0 ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {message && (
        <p role="alert" className="bg-red-50 px-5 py-2 text-center text-sm text-red-600">
          {message}
        </p>
      )}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div>
          <p className="font-display text-2xl font-black text-ink">{formatPrice(total)}</p>
          <p className="max-w-[14rem] truncate text-xs text-ink/50 md:max-w-md">
            {qty} ticket{qty > 1 ? 's' : ''}
            {detail ? ` · ${detail}` : ''}
          </p>
        </div>
        <button
          onClick={onPay}
          disabled={busy}
          className="rounded-xl bg-coral px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-coral transition-transform duration-300 ease-spring hover:-translate-y-0.5 disabled:opacity-50"
        >
          {busy ? 'Opening payment…' : signedIn ? 'Pay and book' : 'Sign in to book'}
        </button>
      </div>
    </div>
  )
}

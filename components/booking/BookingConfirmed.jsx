import Link from 'next/link'

export default function BookingConfirmed({ code, seats = [], onAnother }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-6 text-ink">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-sm font-semibold text-ocean">Payment confirmed</p>
        <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-tight">You&apos;re going.</h1>
        <p className="mt-4 text-sm text-ink/60">Show this code at the venue entrance.</p>
        <p className="mt-6 rounded-2xl border border-coral/15 bg-white px-6 py-5 font-display text-3xl font-black tracking-[0.2em] text-coral">
          {code}
        </p>
        {seats.length > 0 && (
          <p className="mt-4 text-sm text-ink/60">
            Seats: <span className="font-semibold text-ink">{seats.join(', ')}</span>
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/bookings" className="rounded-xl bg-coral py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-coral">
            View my tickets
          </Link>
          <button onClick={onAnother} className="text-sm text-ink/50 hover:text-ink">
            Book another show
          </button>
        </div>
      </div>
    </main>
  )
}

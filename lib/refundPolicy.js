/**
 * Refund policy for tickets cancelled by the customer. PURE (no DB, no Next) so it can be unit-tested
 * and shown identically in the UI preview and at refund time.
 *
 * Tiers are checked top-down; the first whose `minHours` is <= hours left until the show starts wins.
 * Below the last tier (or once the show has started) a customer can no longer cancel.
 * Admins can always refund 100% by hand (see lib/refunds.js) — this policy only limits customers.
 *
 * Change the numbers here to change the policy everywhere.
 */
export const REFUND_TIERS = [
  { minHours: 48, percent: 100 },
  { minHours: 24, percent: 50 }
]

export const POLICY_TEXT =
  '100% refund up to 48 hours before the show, 50% refund from 48 to 24 hours before, ' +
  'no refund (and no cancellation) within 24 hours of the show.'

const HOUR = 60 * 60 * 1000

/**
 * @param {{status:string, amount:number, checkedIn?:boolean}} booking
 * @param {{date?:Date|string|null}|null} event
 * @returns {{allowed:boolean, percent:number, refundAmount:number, reason?:string, hoursLeft:number|null}}
 */
export function refundQuote(booking, event, now = new Date()) {
  const no = (reason, hoursLeft = null) => ({ allowed: false, percent: 0, refundAmount: 0, reason, hoursLeft })

  if (booking.status !== 'paid') return no('Only confirmed tickets can be cancelled.')
  if (booking.checkedIn) return no('This ticket was already used for entry.')

  const start = event?.date ? new Date(event.date) : null
  if (!start || Number.isNaN(start.getTime())) {
    // No start time on the event: nothing to measure against, so allow a full refund.
    return { allowed: true, percent: 100, refundAmount: round2(booking.amount), hoursLeft: null }
  }

  const hoursLeft = (start.getTime() - now.getTime()) / HOUR
  if (hoursLeft <= 0) return no('This show has already started.', hoursLeft)

  const tier = REFUND_TIERS.find((t) => hoursLeft >= t.minHours)
  if (!tier) return no('Cancellations close 24 hours before the show.', hoursLeft)

  return {
    allowed: true,
    percent: tier.percent,
    refundAmount: round2((booking.amount * tier.percent) / 100),
    hoursLeft
  }
}

const round2 = (n) => Math.round(n * 100) / 100

/** Razorpay wants integer paise. */
export const toPaise = (rupees) => Math.round(rupees * 100)

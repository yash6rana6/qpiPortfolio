import mongoose from 'mongoose'
import User from '../models/User'

const STATUSES = ['created', 'processing', 'paid', 'expired', 'failed', 'refunding', 'refunded']
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Query-string filters shared by the bookings list and the CSV export. */
export async function bookingFilterFrom(searchParams) {
  const filter = {}

  const event = searchParams.get('event')
  if (event && mongoose.isValidObjectId(event)) filter.event = event

  const status = searchParams.get('status')
  if (status === 'active') filter.status = { $in: ['paid', 'refunded', 'failed', 'refunding'] } // hides abandoned checkouts
  else if (STATUSES.includes(status)) filter.status = status

  const checked = searchParams.get('checkedIn')
  if (checked === 'yes') filter.checkedIn = true
  if (checked === 'no') filter.checkedIn = { $ne: true }

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (from || to) {
    filter.createdAt = {}
    if (from && !Number.isNaN(Date.parse(from))) filter.createdAt.$gte = new Date(from)
    if (to && !Number.isNaN(Date.parse(to))) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`)
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt
  }

  const q = (searchParams.get('q') || '').trim().slice(0, 60)
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(200).lean()
    filter.$or = [{ bookingCode: rx }, { user: { $in: users.map((u) => u._id) } }]
  }

  return filter
}

/**
 * Creates the first admin account and sample shows in 5 cities.
 * Safe to run again: shows are matched by title and refreshed, admin role confirmed.
 *   npm run seed
 */
require('dotenv').config({ path: '.env.local' })

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const { MONGODB_URI, SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in .env.local')
  process.exit(1)
}
if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
  console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required in .env.local')
  process.exit(1)
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    phone: String,
    passwordHash: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
)

const EventSchema = new mongoose.Schema(
  {
    title: String,
    category: String,
    city: String,
    description: String,
    venue: String,
    date: Date,
    posterImage: String,
    videoUrl: String,
    rows: Number,
    seatsPerRow: Number,
    totalSeats: Number,
    availableSeats: Number,
    pricePerSeat: Number,
    status: { type: String, default: 'published' },
    isRecent: { type: Boolean, default: false },
    accentColor: { type: String, default: 'pink' }
  },
  { timestamps: true }
)

const BookedSeatSchema = new mongoose.Schema(
  {
    event: mongoose.Schema.Types.ObjectId,
    seatId: String,
    booking: mongoose.Schema.Types.ObjectId,
    user: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
)
BookedSeatSchema.index({ event: 1, seatId: 1 }, { unique: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)
const BookedSeat = mongoose.models.BookedSeat || mongoose.model('BookedSeat', BookedSeatSchema)

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const POSTER = (id) => `https://images.pexels.com/videos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`
const VIDEO = 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4'

const SAMPLE_EVENTS = [
  { title: 'Neon Vice Festival', category: 'Music Festival', city: 'Delhi', venue: 'JLN Stadium', description: 'Three nights of electronic music under a fully synced pink-and-violet light rig.', date: days(40), poster: 12695733, rows: 12, seatsPerRow: 16, pricePerSeat: 1499, accentColor: 'pink' },
  { title: 'Sunburst Circuit Night', category: 'Live Show', city: 'Mumbai', venue: 'Phoenix Marketcity', description: 'A late-night set with cyan strobe walls timed to the drop, streamed live.', date: days(25), poster: 12695727, rows: 10, seatsPerRow: 14, pricePerSeat: 1999, accentColor: 'cyan' },
  { title: 'Amber Circuit Showdown', category: 'Esports', city: 'Hyderabad', venue: 'Hitex Arena', description: 'Regional finals with a stage lighting design built around the broadcast.', date: days(18), poster: 12695729, rows: 14, seatsPerRow: 20, pricePerSeat: 999, accentColor: 'amber' },
  { title: 'Midnight Comedy Club', category: 'Comedy', city: 'Delhi', venue: 'Siri Fort Auditorium', description: 'Five stand-ups, one stage, zero filter.', date: days(12), poster: 12695727, rows: 8, seatsPerRow: 12, pricePerSeat: 599, accentColor: 'lime' },
  { title: 'Lakeside Indie Evening', category: 'Concert', city: 'Bengaluru', venue: 'Palace Grounds', description: 'Indie bands at golden hour, food trucks and fairy lights.', date: days(30), poster: 12695729, rows: 10, seatsPerRow: 18, pricePerSeat: 799, accentColor: 'pink' },
  { title: 'Gomti Nights Live', category: 'Concert', city: 'Lucknow', venue: 'Ekana Sports City', description: 'A riverside evening of ghazals meets electronica.', date: days(22), poster: 12695733, rows: 9, seatsPerRow: 14, pricePerSeat: 499, accentColor: 'cyan' }
]

async function run() {
  await mongoose.connect(MONGODB_URI)
  await BookedSeat.syncIndexes() // unique (event, seatId) — the final double-booking guard

  const email = SEED_ADMIN_EMAIL.toLowerCase().trim()
  const existing = await User.findOne({ email })
  if (existing) {
    existing.role = 'admin'
    await existing.save()
    console.log(`Admin already existed, role confirmed: ${email}`)
  } else {
    await User.create({
      name: SEED_ADMIN_NAME || 'Admin',
      email,
      passwordHash: await bcrypt.hash(SEED_ADMIN_PASSWORD, 10),
      role: 'admin'
    })
    console.log(`Admin created: ${email}`)
  }

  for (const { poster, ...ev } of SAMPLE_EVENTS) {
    const total = ev.rows * ev.seatsPerRow
    const doc = await Event.findOneAndUpdate(
      { title: ev.title },
      {
        $set: { ...ev, totalSeats: total, posterImage: POSTER(poster), videoUrl: VIDEO, status: 'published', isRecent: true },
        $setOnInsert: { availableSeats: total }
      },
      { upsert: true, new: true }
    )
    // keep the counter honest if the layout changed on a re-seed
    const sold = await BookedSeat.countDocuments({ event: doc._id })
    await Event.updateOne({ _id: doc._id }, { $set: { availableSeats: total - sold } })
    console.log(`Show ready: ${ev.title} (${ev.city}, ${total} seats)`)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Creates the first admin account and a few sample events.
 * Run once after filling in .env.local:  npm run seed
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
    description: String,
    venue: String,
    city: String,
    date: Date,
    endDate: Date,
    posterImage: String,
    videoUrl: String,
    totalSeats: Number,
    availableSeats: Number,
    pricePerSeat: Number,
    status: { type: String, default: 'published' },
    isRecent: { type: Boolean, default: false },
    accentColor: { type: String, default: 'pink' }
  },
  { timestamps: true }
)

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)

const SAMPLE_EVENTS = [
  {
    title: 'Neon Vice Festival',
    category: 'Music Festival',
    venue: 'JLN Stadium, New Delhi',
    city: 'New Delhi',
    description: 'Three nights of electronic music under a fully synced pink-and-violet light rig.',
    date: new Date('2026-11-14'),
    posterImage: 'https://images.pexels.com/videos/12695733/pexels-photo-12695733.jpeg?auto=compress&cs=tinysrgb&w=900',
    videoUrl: 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4',
    totalSeats: 500,
    availableSeats: 500,
    pricePerSeat: 1499,
    isRecent: true,
    accentColor: 'pink'
  },
  {
    title: 'Sunburst Circuit Night',
    category: 'Live Show',
    venue: 'Phoenix Marketcity, Mumbai',
    city: 'Mumbai',
    description: 'A late-night set with cyan strobe walls timed to the drop, streamed live.',
    date: new Date('2026-10-02'),
    posterImage: 'https://images.pexels.com/videos/12695727/pexels-photo-12695727.jpeg?auto=compress&cs=tinysrgb&w=900',
    videoUrl: 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4',
    totalSeats: 300,
    availableSeats: 300,
    pricePerSeat: 1999,
    isRecent: true,
    accentColor: 'cyan'
  },
  {
    title: 'Amber Circuit Showdown',
    category: 'Esports',
    venue: 'Hitex Arena, Hyderabad',
    city: 'Hyderabad',
    description: 'Regional finals with a stage lighting design built around the broadcast.',
    date: new Date('2026-09-20'),
    posterImage: 'https://images.pexels.com/videos/12695729/pexels-photo-12695729.jpeg?auto=compress&cs=tinysrgb&w=900',
    videoUrl: 'https://videos.pexels.com/video-files/12695733/12695733-hd_1920_1080_24fps.mp4',
    totalSeats: 800,
    availableSeats: 800,
    pricePerSeat: 999,
    isRecent: true,
    accentColor: 'amber'
  }
]

async function run() {
  await mongoose.connect(MONGODB_URI)

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

  const eventCount = await Event.countDocuments()
  if (eventCount === 0) {
    await Event.insertMany(SAMPLE_EVENTS)
    console.log(`Inserted ${SAMPLE_EVENTS.length} sample events`)
  } else {
    console.log(`Skipped sample events — ${eventCount} already in the database`)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

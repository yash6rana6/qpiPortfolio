import mongoose from 'mongoose'

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: String,
    venue: String,
    city: { type: String, trim: true, index: true },
    date: Date,
    endDate: Date, // optional — an event is "live" from date until endDate (or end of that day)
    posterImage: String,
    videoUrl: String,
    // seated  -> customer picks exact seats on a live seat map (max SEAT_MAP_LIMIT seats)
    // general -> unseated / general admission: customer only picks how many tickets
    // (older events have no value: they follow the old rule, see hasSeatMap in lib/seats.js)
    seating: { type: String, enum: ['seated', 'general'] },
    totalSeats: { type: Number, default: 0, min: 0 },
    availableSeats: { type: Number, default: 0, min: 0 },
    pricePerSeat: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'published', index: true },
    isRecent: { type: Boolean, default: false, index: true },
    accentColor: { type: String, enum: ['pink', 'cyan', 'amber', 'lime'], default: 'pink' }
  },
  { timestamps: true }
)

export default mongoose.models.Event || mongoose.model('Event', EventSchema)

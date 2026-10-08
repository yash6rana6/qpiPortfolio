import mongoose from 'mongoose'

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, trim: true, index: true },
    description: String,
    venue: String,
    date: Date,
    posterImage: String,
    videoUrl: String,

    // Seat layout: rows A..Z x seatsPerRow. Seat ids look like "A1", "C12".
    rows: { type: Number, default: 10, min: 1, max: 26 },
    seatsPerRow: { type: Number, default: 10, min: 1, max: 40 },

    // Derived from the layout / bookings — display counters only.
    // The real truth for "is this seat free" is the BookedSeat collection.
    totalSeats: { type: Number, default: 0, min: 0 },
    availableSeats: { type: Number, default: 0, min: 0 },

    pricePerSeat: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'published', index: true },
    isRecent: { type: Boolean, default: false, index: true },
    accentColor: { type: String, enum: ['pink', 'cyan', 'amber', 'lime'], default: 'pink' }
  },
  { timestamps: true }
)

EventSchema.index({ city: 1, status: 1, date: 1 })

export default mongoose.models.Event || mongoose.model('Event', EventSchema)

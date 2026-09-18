import mongoose from 'mongoose'

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: String,
    venue: String,
    date: Date,
    posterImage: String,
    videoUrl: String,
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

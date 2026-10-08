import mongoose from 'mongoose'

/**
 * One document per SOLD seat. The unique index on (event, seatId) is the final,
 * database-level guarantee that a seat can never be sold twice — even if Redis
 * is flushed, restarted or buggy.
 */
const BookedSeatSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    seatId: { type: String, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
)

BookedSeatSchema.index({ event: 1, seatId: 1 }, { unique: true })

export default mongoose.models.BookedSeat || mongoose.model('BookedSeat', BookedSeatSchema)

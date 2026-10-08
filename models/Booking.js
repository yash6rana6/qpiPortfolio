import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },

    seats: { type: Number, required: true, min: 1 },
    seatIds: { type: [String], default: [] },
    // Snapshot at booking time — event price can change later, receipts shouldn't.
    pricePerSeat: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },

    // created    -> seats held, waiting for payment
    // processing -> payment verified, writing seats (short-lived lock)
    // paid       -> done, ticket issued
    // expired    -> hold ran out / user closed checkout (late payment is still honoured if seats are free)
    // failed     -> paid but seats were lost; refund queued
    // refunded   -> refund issued
    status: {
      type: String,
      enum: ['created', 'processing', 'paid', 'expired', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    bookingCode: { type: String, index: true, sparse: true },

    holdId: String,
    holdExpiresAt: Date,

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    refundId: String,
    failureReason: String
  },
  { timestamps: true }
)

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema)

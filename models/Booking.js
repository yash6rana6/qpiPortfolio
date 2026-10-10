import mongoose from 'mongoose'

const BookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },

    seats: { type: Number, required: true, min: 1 },
    seatNumbers: { type: [String], default: [] }, // chosen seats, e.g. ['A1','A2']
    // Snapshot at booking time — event price can change later, receipts shouldn't.
    pricePerSeat: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },

    // created    -> seats held (Redis), waiting for payment
    // processing -> payment verified, writing seats (short-lived claim)
    // paid       -> ticket issued
    // expired    -> hold ran out / checkout closed (a late payment is still honoured if the seats are free)
    // failed     -> paid but the seats were lost; refund queued
    // refunded   -> refund issued
    status: {
      type: String,
      enum: ['created', 'processing', 'paid', 'expired', 'failed', 'refunded'],
      default: 'created',
      index: true
    },
    bookingCode: { type: String, unique: true, sparse: true },

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

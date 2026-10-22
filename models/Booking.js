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
    // refunding  -> a cancel/refund is in flight (claimed so it can't run twice)
    // refunded   -> refund issued (also used for cancelled tickets; see cancelledBy)
    status: {
      type: String,
      enum: ['created', 'processing', 'paid', 'expired', 'failed', 'refunding', 'refunded'],
      default: 'created',
      index: true
    },
    bookingCode: { type: String, unique: true, sparse: true },

    // Set once this booking's seats were subtracted from Event.availableSeats (so a retry can't subtract twice).
    seatsCounted: { type: Boolean, default: false },

    holdId: String,
    holdExpiresAt: Date,

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    refundId: String,
    refundAmount: { type: Number, min: 0 }, // rupees actually refunded (can be < amount under the policy)
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ['user', 'admin'] },
    failureReason: String,

    // Entry scan at the venue (admin /admin/scan). One ticket code = one entry.
    checkedIn: { type: Boolean, default: false, index: true },
    checkedInAt: Date,
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    ticketEmailSentAt: Date
  },
  { timestamps: true }
)

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema)

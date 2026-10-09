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

    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    bookingCode: { type: String, index: true, sparse: true },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    failureReason: String
  },
  { timestamps: true }
)

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema)

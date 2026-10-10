import mongoose from 'mongoose'

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ['verify', 'reset'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // Mongo deletes the document automatically once this time passes (TTL index).
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
)

OtpSchema.index({ email: 1, purpose: 1 }, { unique: true })

export default mongoose.models.Otp || mongoose.model('Otp', OtpSchema)

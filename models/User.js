import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    // Optional: accounts created through Google sign-in have no password
    passwordHash: { type: String },
    googleId: { type: String, index: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
)

// Never leak the hash, even if someone forgets to .select()
UserSchema.methods.toPublic = function () {
  return { id: this._id.toString(), name: this.name, email: this.email, phone: this.phone, role: this.role, emailVerified: !!this.emailVerified }
}

export default mongoose.models.User || mongoose.model('User', UserSchema)

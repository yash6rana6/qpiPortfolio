import mongoose from 'mongoose'

/**
 * One uploaded file (image or video) that lives on Cloudinary.
 * The file itself is never stored here — only its name, folder and Cloudinary ids/URL.
 * `folder` is the sub-folder under CLOUDINARY_ROOT_FOLDER (e.g. "concerts/posters").
 */
const MediaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    folder: { type: String, required: true, index: true },
    publicId: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: ['image', 'video'], required: true, index: true },
    url: { type: String, required: true },
    format: String,
    bytes: { type: Number, min: 0 },
    width: Number,
    height: Number,
    duration: Number, // seconds (videos)
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
)

MediaSchema.index({ createdAt: -1 })

export default mongoose.models.Media || mongoose.model('Media', MediaSchema)

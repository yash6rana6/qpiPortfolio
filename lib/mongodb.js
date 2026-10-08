import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

let cached = global._mongoose
if (!cached) cached = global._mongoose = { conn: null, promise: null }

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing — set it in .env.local')
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        // 1k concurrent users: default pool is 100 max but cold-starts at 0 — keep a warm pool.
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000
      })
      .then((m) => m)
      .catch((err) => {
        // Don't cache a rejected promise, otherwise every later request
        // reuses the same failure until the process restarts.
        cached.promise = null
        throw err
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

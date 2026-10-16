import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { ApiError } from './api'
import { connectDB } from './mongodb'
import User from '../models/User'

export const TOKEN_COOKIE = 'qpie_token'
const TOKEN_TTL = '7d'

function secretKey() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is missing or too short — set a long random string in .env.local')
  }
  return new TextEncoder().encode(secret)
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey())
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload
  } catch {
    return null
  }
}

/**
 * Reads the session from an httpOnly cookie (web) or an
 * `Authorization: Bearer <token>` header (mobile app / any API client).
 */
export async function getSessionUser() {
  const cookieToken = cookies().get(TOKEN_COOKIE)?.value
  const authHeader = headers().get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  const token = cookieToken || bearerToken
  if (!token) return null

  return verifyToken(token)
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) throw new ApiError(401, 'Login required')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()

  // The token is valid for 7 days, so its `role` can be stale: a demoted or deleted admin would keep
  // access until it expires. The database is the source of truth for admin routes.
  await connectDB()
  const account = await User.findById(user.sub).select('role').lean()
  if (!account || account.role !== 'admin') throw new ApiError(403, 'Admin access only')

  return user
}

export function sessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds
  }
}

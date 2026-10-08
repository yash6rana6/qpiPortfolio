import { NextResponse } from 'next/server'

export class ApiError extends Error {
  /** `extra` is merged into the JSON body — e.g. { code, unavailable } for seat conflicts. */
  constructor(status, message, extra) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export function ok(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(err) {
  const status = err instanceof ApiError ? err.status : 500
  if (status >= 500) console.error('[api]', err)
  return NextResponse.json(
    {
      error: err instanceof ApiError ? err.message : 'Something went wrong',
      ...(err instanceof ApiError && err.extra ? err.extra : {})
    },
    { status }
  )
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    throw new ApiError(400, 'Invalid JSON body')
  }
}

export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`)
}

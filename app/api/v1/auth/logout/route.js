import { cookies } from 'next/headers'
import { TOKEN_COOKIE, sessionCookieOptions } from '../../../../../lib/auth'
import { ok, fail } from '../../../../../lib/api'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    cookies().set(TOKEN_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 })
    return ok({ ok: true })
  } catch (err) {
    return fail(err)
  }
}

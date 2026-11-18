import { getLucknowNews } from '../../../../lib/news'
import { ok, fail } from '../../../../lib/api'

export const dynamic = 'force-dynamic'

// Public — latest Lucknow event news (cached server-side for hours; see lib/news.js).
export async function GET() {
  try {
    const items = await getLucknowNews()
    const res = ok({ city: 'Lucknow', items })
    res.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
    return res
  } catch (err) {
    return fail(err)
  }
}

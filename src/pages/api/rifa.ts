import type { APIRoute } from 'astro'
import { store } from '../../lib/store'

export const prerender = false

// Rifa numbers that won in the latest 3 draws, as of the last GET /api/refresh.
export const GET: APIRoute = async () => {
  const rifa = store.getRifa()
  const body = rifa ?? { error: 'No rifa check has run yet. Run GET /api/refresh first.' }

  return new Response(JSON.stringify(body, null, 2), {
    status: rifa ? 200 : 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

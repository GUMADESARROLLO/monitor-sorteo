import type { APIRoute } from 'astro'
import { store } from '../../../../lib/store'

export const prerender = false

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Serves the winner lists loaded by the last GET /api/refresh (latest 3 draws only).
export const GET: APIRoute = async ({ params }) => {
  const param = params.number ?? ''
  if (param !== 'latest' && !/^\d+$/.test(param)) {
    return json({ error: 'Invalid draw number' }, 400)
  }

  const drawNumber = param === 'latest' ? store.getLastDrawNumber() : parseInt(param, 10)
  const list = drawNumber !== null ? store.getWinnersFor(drawNumber) : null
  if (!list) {
    return json({ error: `No winner list loaded for draw ${param}. Run GET /api/refresh first.` }, 404)
  }

  return json(list)
}

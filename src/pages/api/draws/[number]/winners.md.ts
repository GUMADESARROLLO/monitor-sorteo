import type { APIRoute } from 'astro'
import { store } from '../../../../lib/store'
import { winnersToMarkdown } from '../../../../lib/markdown'

export const prerender = false

// Markdown version of the winner list loaded by the last GET /api/refresh.
export const GET: APIRoute = async ({ params }) => {
  const param = params.number ?? ''
  const drawNumber = param === 'latest' ? store.getLastDrawNumber() : /^\d+$/.test(param) ? parseInt(param, 10) : null
  const list = drawNumber !== null ? store.getWinnersFor(drawNumber) : null

  if (!list) {
    return new Response(`No hay lista cargada para el sorteo ${param}. Ejecuta GET /api/refresh primero.\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new Response(winnersToMarkdown(list), {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}

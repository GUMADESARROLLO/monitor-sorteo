import type { APIRoute } from 'astro'
import { store } from '../../../lib/store'
import { scrapeLastThreeDraws } from '../../../lib/scraper'
import { startMonitor } from '../../../lib/monitor'
import type { LatestResponse } from '../../../lib/types'

startMonitor()

export const prerender = false

export const GET: APIRoute = async () => {
  if (store.isEmpty()) {
    try {
      const draws = await scrapeLastThreeDraws()
      store.update(draws)
    } catch {}
  }

  const body: LatestResponse = {
    updatedAt: store.getUpdatedAt() ?? new Date().toISOString(),
    draw: store.getLatest(),
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

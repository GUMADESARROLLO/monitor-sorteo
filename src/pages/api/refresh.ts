import type { APIRoute } from 'astro'
import { store } from '../../lib/store'
import { scrapeLastThreeDraws } from '../../lib/scraper'
import { startMonitor } from '../../lib/monitor'
import type { DrawsResponse } from '../../lib/types'

startMonitor()

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const draws = await scrapeLastThreeDraws()
    store.update(draws)
    console.log(`[API] Refresh — ${draws.length} draws updated`)

    const body: DrawsResponse = {
      updatedAt: store.getUpdatedAt()!,
      draws,
    }

    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Scrape failed', detail: err instanceof Error ? err.message : 'Unknown' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

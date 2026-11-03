import type { APIRoute } from 'astro'
import { store } from '../../lib/store'
import { scrapeLastThreeDraws } from '../../lib/scraper'
import { fetchWinnerLists } from '../../lib/officialList'
import { findRifaMatches } from '../../lib/rifa'
import { startMonitor } from '../../lib/monitor'
import type { RefreshResponse, RifaResult } from '../../lib/types'

startMonitor()

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const draws = await scrapeLastThreeDraws()
    store.update(draws)

    const winners = await fetchWinnerLists(draws.map((d) => d.drawNumber))
    store.updateWinners(winners)
    // A database failure shouldn't block the lottery results.
    let rifa: RifaResult
    try {
      rifa = { checkedAt: new Date().toISOString(), matches: await findRifaMatches(winners) }
    } catch (err) {
      console.error('[API] Rifa lookup failed:', err instanceof Error ? err.message : err)
      rifa = { checkedAt: new Date().toISOString(), matches: [], error: err instanceof Error ? err.message : 'Unknown' }
    }
    store.updateRifa(rifa)
    console.log(
      `[API] Refresh — ${draws.length} draws updated, ${winners.length} official lists parsed, ${rifa.matches.length} rifa matches`,
    )

    const body: RefreshResponse = {
      updatedAt: store.getUpdatedAt()!,
      draws,
      winners,
      rifa,
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

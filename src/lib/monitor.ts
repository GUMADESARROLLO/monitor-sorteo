import cron from 'node-cron'
import { store } from './store'
import { scrapeLastThreeDraws } from './scraper'

let started = false

const SCRAPE_INTERVAL = '*/15 * * * *'

function formatLog(draws: import('./types').Draw[]): void {
  if (draws.length === 0) return
  const d = draws[0]
  console.log(`[NUEVO SORTEO]
Sorteo: ${d.drawNumber}
Ganador: ${d.winnerNumber}
Fecha: ${d.date}
──────────────────────────────`)
}

async function run(): Promise<void> {
  try {
    const draws = await scrapeLastThreeDraws()
    const previous = store.getLastDrawNumber()
    store.update(draws)
    const current = store.getLastDrawNumber()

    if (previous !== null && current !== null && current !== previous) {
      formatLog(draws)
    } else if (previous === null) {
      console.log(`[MONITOR] Initial load: ${draws.length} draws cached`)
    }
  } catch (err) {
    console.error('[MONITOR] Scrape error:', err instanceof Error ? err.message : err)
  }
}

export function startMonitor(): void {
  if (started) return
  started = true
  cron.schedule(SCRAPE_INTERVAL, run)
  console.log(`[MONITOR] Started — interval: ${SCRAPE_INTERVAL}`)
  run()
}

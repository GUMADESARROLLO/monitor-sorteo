import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Draw } from './types'

// The site updates these two pages independently (e.g. /sorteo/ gets a new draw a day before /resultados/),
// so both are read and merged.
const RESULTADOS_URL = 'https://loterianacional.com.ni/resultados/'
const SORTEO_URL = 'https://loterianacional.com.ni/sorteo/'

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

function parsePrize(raw: string): string {
  return raw.replace(/^C\$\s*/, '').replace(/,/g, '').trim()
}

/** "3 de noviembre 2026" → "2026-11-03" */
function parseLongDate(raw: string): string {
  const m = raw.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+)?(\d{4})/i)
  const month = m ? MONTHS[m[2].toLowerCase()] : undefined
  if (!m || !month) return raw
  return new Date(Date.UTC(parseInt(m[3], 10), month - 1, parseInt(m[1], 10))).toISOString().split('T')[0]
}

function parseDate(raw: string): string {
  const parts = raw.split('/')
  if (parts.length !== 3) return raw
  const [day, month, year] = parts.map(Number)
  const iso = new Date(Date.UTC(year, month - 1, day))
  return iso.toISOString().split('T')[0]
}

async function fetchHtml(url: string, attempt = 1): Promise<string> {
  try {
    const res = await axios.get<string>(url, {
      timeout: 30_000, // the site often takes 15–20s to respond
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    return res.data
  } catch (err) {
    if (attempt >= 3) throw err
    const wait = attempt * 1000
    console.warn(`[SCRAPER] Attempt ${attempt} failed, retrying in ${wait}ms...`)
    await new Promise((r) => setTimeout(r, wait))
    return fetchHtml(url, attempt + 1)
  }
}

/** /sorteo/ — "Sorteos Anteriores": "No. 2303 … No. Ganador: 39079 … Premio Mayor: C$ 10,000,000 Efectuado: 3 de noviembre 2026" */
async function scrapeSorteoPage(): Promise<Draw[]> {
  const $ = cheerio.load(await fetchHtml(SORTEO_URL))
  const text = $('body').text().replace(/\s+/g, ' ')

  // The upcoming draw ("A efectuarse") has no winner, so it never matches; fields can't leak across draws.
  const pattern =
    /No\.\s*(\d{4})\s+Lista Oficial\s+No\.\s*Ganador:\s*(\d{5})(?:(?!No\.\s*\d{4}).)*?Premio Mayor:\s*(C\$\s*[\d,]+)(?:(?!No\.\s*\d{4}).)*?Efectuado:\s*(\d{1,2}\s+de\s+[a-záéíóú]+\s+(?:de\s+)?\d{4})/gi

  return [...text.matchAll(pattern)].map((m) => ({
    drawNumber: parseInt(m[1], 10),
    winnerNumber: m[2],
    prize: parsePrize(m[3]),
    date: parseLongDate(m[4]),
  }))
}

export async function scrapeLastThreeDraws(): Promise<Draw[]> {
  const results = await Promise.allSettled([scrapeResultadosPage(), scrapeSorteoPage()])
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failed.length === results.length) throw failed[0].reason
  for (const f of failed) console.warn('[SCRAPER] One source failed:', f.reason instanceof Error ? f.reason.message : f.reason)

  // First source wins on duplicates; either page may be the one that's ahead.
  const byNumber = new Map<number, Draw>()
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const d of r.value) if (!byNumber.has(d.drawNumber)) byNumber.set(d.drawNumber, d)
  }

  return [...byNumber.values()].sort((a, b) => b.drawNumber - a.drawNumber).slice(0, 3)
}

/** /resultados/ — one .ls-card per draw */
async function scrapeResultadosPage(): Promise<Draw[]> {
  const html = await fetchHtml(RESULTADOS_URL)
  const $ = cheerio.load(html)

  const draws: Draw[] = []

  $('.ls-card').each((_, card) => {
    const drawNumberText = $(card).find('.ls-numero').text().replace(/\D/g, '')

    const fields: Record<string, string> = {}
    $(card)
      .find('.ls-info > div')
      .each((_, line) => {
        const label = $(line).find('b').text().replace(':', '').trim().toLowerCase()
        const value = $(line).text().replace($(line).find('b').text(), '').trim()
        if (label) fields[label] = value
      })

    const winnerNumber = fields['ganador']
    if (!drawNumberText || !winnerNumber) return

    draws.push({
      drawNumber: parseInt(drawNumberText, 10),
      winnerNumber,
      prize: parsePrize(fields['premio'] ?? ''),
      date: parseDate(fields['fecha'] ?? ''),
    })
  })

  return draws
}

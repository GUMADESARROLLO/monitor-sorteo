import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Draw } from './types'

const TARGET_URL = 'https://www.loterianacional.com.ni/resultados/'

function parsePrize(raw: string): string {
  return raw.replace(/^C\$/, '').replace(/,/g, '').trim()
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
      timeout: 10_000,
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

export async function scrapeLastThreeDraws(): Promise<Draw[]> {
  const html = await fetchHtml(TARGET_URL)
  const $ = cheerio.load(html)

  const draws: Draw[] = []

  $('#tablepress-1 tbody tr').each((_, row) => {
    const cells = $(row).find('td .mtr-cell-content')
    if (cells.length < 4) return

    const drawNumberText = $(cells[0]).text().trim()
    const prizeRaw = $(cells[1]).text().trim()
    const winnerNumber = $(cells[2]).text().trim()
    const dateRaw = $(cells[4]).text().trim()

    if (!drawNumberText || !winnerNumber) return

    draws.push({
      drawNumber: parseInt(drawNumberText, 10),
      winnerNumber,
      prize: parsePrize(prizeRaw),
      date: parseDate(dateRaw),
    })
  })

  return draws.slice(0, 3)
}

import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Draw } from './types'

const TARGET_URL = 'https://loterianacional.com.ni/resultados/'

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

  draws.sort((a, b) => b.drawNumber - a.drawNumber)
  return draws.slice(0, 3)
}

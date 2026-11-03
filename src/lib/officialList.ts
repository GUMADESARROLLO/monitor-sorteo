import axios from 'axios'
import { getDocumentProxy } from 'unpdf'
import type { MainPrize, OfficialList, OfficialListRef, PrizeEntry } from './types'

const MEDIA_API = 'https://loterianacional.com.ni/wp-json/wp/v2/media'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Lista-2302.pdf, LISTA-2160.pdf, Lista-2157-Job.pdf, Lista-Informativa-Sorteo-2296.pdf
const LIST_FILE = /\/lista-(?:informativa-sorteo-)?(\d{4})(?:-[^/]*)?\.pdf$/i

interface MediaItem {
  date: string
  source_url: string
}

/** Official list PDFs for the given draws (newest upload wins). Draws without a published list are left out. */
export async function findOfficialLists(drawNumbers: number[]): Promise<OfficialListRef[]> {
  const wanted = new Set(drawNumbers)
  const byDraw = new Map<number, OfficialListRef>()

  // Most recent uploads only: enough to cover the latest draws.
  const res = await axios.get<MediaItem[]>(MEDIA_API, {
    timeout: 15_000,
    headers: { 'User-Agent': USER_AGENT },
    params: { search: 'Lista', mime_type: 'application/pdf', per_page: 30, orderby: 'date', order: 'desc', _fields: 'date,source_url' },
  })

  for (const item of res.data) {
    const match = item.source_url.match(LIST_FILE)
    if (!match) continue
    const drawNumber = parseInt(match[1], 10)
    if (!wanted.has(drawNumber)) continue
    const current = byDraw.get(drawNumber)
    if (!current || item.date > current.uploadedAt) {
      byDraw.set(drawNumber, { drawNumber, url: item.source_url, uploadedAt: item.date })
    }
  }

  return [...byDraw.values()].sort((a, b) => b.drawNumber - a.drawNumber)
}

/** Downloads and parses the official lists of the given draws. A list that fails or isn't published yet is skipped. */
export async function fetchWinnerLists(drawNumbers: number[]): Promise<OfficialList[]> {
  const refs = await findOfficialLists(drawNumbers)
  const results = await Promise.allSettled(refs.map((ref) => fetchOfficialList(ref)))

  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return [r.value]
    console.error(`[SCRAPER] Lista oficial ${refs[i].drawNumber} failed:`, r.reason instanceof Error ? r.reason.message : r.reason)
    return []
  })
}

interface TextItem {
  str: string
  x: number
  y: number
  cx: number
}

const NUMBER = /^\d{5}$/
// "C$3,000" (2026 lists) or "3000.00" (older lists)
const AMOUNT = /^(?:C\$\s?[\d,]+(?:\.\d{2})?|[\d,]+\.\d{2})$/
const AMOUNT_MILLIONS = /^C\$\s?(\d+)\s+MILLONES$/i
const BRANCH = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ .]+$/
const PLACE_LABEL = /^(\d+)\s*(?:do|er|ro|to|mo|vo|no)\s+Premio$/i
const COLUMN_TOLERANCE = 45
const LINE_TOLERANCE = 3
const MAX_AMOUNT_GAP = 80

function parseAmount(raw: string): string {
  const millions = raw.match(AMOUNT_MILLIONS)
  if (millions) return String(parseInt(millions[1], 10) * 1_000_000)
  return raw.replace(/^C\$\s?/, '').replace(/,/g, '').replace(/\.00$/, '')
}

/** Item below `y` in the same column as `cx` that matches `pattern` and sits above `floor` (nearest, or lowest). */
function below(items: TextItem[], cx: number, y: number, floor: number, pattern: RegExp, lowest = false): TextItem | undefined {
  return items
    .filter((i) => i.y < y && i.y > floor && Math.abs(i.cx - cx) < COLUMN_TOLERANCE && pattern.test(i.str))
    .sort((a, b) => (lowest ? a.y - b.y : b.y - a.y))[0]
}

function parseMainPrizes(header: TextItem[]): MainPrize[] {
  const labels = header
    .map((i) => {
      if (/^Premio Mayor$/i.test(i.str)) return { item: i, place: 1 }
      const m = i.str.match(PLACE_LABEL)
      return m ? { item: i, place: parseInt(m[1], 10) } : null
    })
    .filter((l): l is { item: TextItem; place: number } => l !== null)

  const prizes: MainPrize[] = []
  for (const { item: label, place } of labels) {
    // Stop at the next label stacked below in the same column (e.g. 2do Premio above 5to Premio).
    const floor = Math.max(
      -Infinity,
      ...labels
        .filter((l) => l.item !== label && l.item.y < label.y && Math.abs(l.item.cx - label.cx) < COLUMN_TOLERANCE)
        .map((l) => l.item.y),
    )

    const number = below(header, label.cx, label.y, floor, NUMBER)
    if (!number) continue
    const amount = below(header, label.cx, number.y, floor, new RegExp(`${AMOUNT.source}|${AMOUNT_MILLIONS.source}`, 'i'))
    // The branch closes the column; a sold Mayor also prints the seller's name above it.
    const branch = amount ? below(header, label.cx, amount.y, floor, BRANCH, true) : undefined

    prizes.push({
      place,
      number: number.str,
      prize: amount ? parseAmount(amount.str) : '',
      branch: branch && !/MILLONES|PREMIO/.test(branch.str) ? branch.str : null,
    })
  }

  return prizes.sort((a, b) => a.place - b.place)
}

/** Pairs each 5-digit number with the amount printed right after it on the same line. */
function parsePairs(items: TextItem[]): { entries: PrizeEntry[]; unpaired: TextItem[] } {
  const amounts = items.filter((i) => AMOUNT.test(i.str))
  const entries: PrizeEntry[] = []
  const unpaired: TextItem[] = []

  for (const item of items.filter((i) => NUMBER.test(i.str))) {
    const amount = amounts
      .filter((a) => Math.abs(a.y - item.y) < LINE_TOLERANCE && a.x > item.x && a.x - item.x < MAX_AMOUNT_GAP)
      .sort((a, b) => a.x - b.x)[0]
    if (amount) entries.push({ number: item.str, prize: parseAmount(amount.str) })
    else unpaired.push(item)
  }

  entries.sort((a, b) => a.number.localeCompare(b.number))
  return { entries, unpaired }
}

/**
 * Older lists (before mid-2026) have no main-prize header: the Premio Mayor is printed
 * without an amount next to a "PREMIO MAYOR" label, and its approximations sit inline.
 */
function parseLegacyMayor(items: TextItem[], entries: PrizeEntry[], unpaired: TextItem[]): MainPrize | null {
  if (unpaired.length === 0) return null

  // The Mayor is the unpaired number whose neighbours (±1..3) are listed as approximations.
  const listed = new Set(entries.map((e) => parseInt(e.number, 10)))
  const neighbours = (i: TextItem) => {
    const n = parseInt(i.str, 10)
    return [-3, -2, -1, 1, 2, 3].filter((d) => listed.has(n + d)).length
  }
  const label = items.find((i) => /^(?:PREMIO\s+)?MAYOR$/i.test(i.str))
  const distance = (i: TextItem) => (label ? Math.hypot(i.cx - label.cx, i.y - label.y) : 0)
  const number = [...unpaired].sort((a, b) => neighbours(b) - neighbours(a) || distance(a) - distance(b))[0]
  if (neighbours(number) === 0 && !label) return null

  const millions = items.map((i) => i.str.match(/(\d+)\s*MILLONES/i)).find(Boolean)
  const cordobas = items.map((i) => i.str.match(/([\d,]{9,})\s*Córdobas/i)).find(Boolean)
  const prize = millions
    ? String(parseInt(millions[1], 10) * 1_000_000)
    : cordobas
      ? cordobas[1].replace(/,/g, '')
      : ''

  return { place: 1, number: number.str, prize, branch: null }
}

function isApproximation(number: string, mayor: string): boolean {
  const diff = Math.abs(parseInt(number, 10) - parseInt(mayor, 10))
  return diff > 0 && diff <= 3
}

export async function parseOfficialList(data: Uint8Array, ref: Pick<OfficialListRef, 'drawNumber' | 'url'>): Promise<OfficialList> {
  const pdf = await getDocumentProxy(data)

  let header: TextItem[] = []
  const body: TextItem[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const { items } = await page.getTextContent()
    const pageItems: TextItem[] = items
      .filter((i): i is typeof i & { str: string; transform: number[]; width: number } => 'str' in i && i.str.trim() !== '')
      .map((i) => ({ str: i.str.trim(), x: i.transform[4], y: i.transform[5], cx: i.transform[4] + i.width / 2 }))

    if (p === 1) {
      // "OTROS PREMIOS DIRECTOS" separates the main-prize header from the full list.
      const divider = pageItems.find((i) => /^OTROS PREMIOS DIRECTOS/i.test(i.str))
      const cut = divider?.y ?? Infinity
      header = pageItems.filter((i) => i.y > cut)
      body.push(...pageItems.filter((i) => i.y <= cut))
    } else {
      body.push(...pageItems)
    }
  }

  const fromBody = parsePairs(body)

  if (header.length > 0) {
    return {
      drawNumber: ref.drawNumber,
      url: ref.url,
      mainPrizes: parseMainPrizes(header),
      approximations: parsePairs(header).entries,
      otherPrizes: fromBody.entries,
    }
  }

  const mayor = parseLegacyMayor(body, fromBody.entries, fromBody.unpaired)
  if (!mayor) {
    return { drawNumber: ref.drawNumber, url: ref.url, mainPrizes: [], approximations: [], otherPrizes: fromBody.entries }
  }

  // A neighbour of the Mayor can also win a regular prize; its highest amount is the approximation.
  const approximations = new Map<string, PrizeEntry>()
  for (const e of fromBody.entries) {
    if (!isApproximation(e.number, mayor.number)) continue
    const current = approximations.get(e.number)
    if (!current || parseInt(e.prize, 10) > parseInt(current.prize, 10)) approximations.set(e.number, e)
  }
  const approxEntries = new Set(approximations.values())

  return {
    drawNumber: ref.drawNumber,
    url: ref.url,
    mainPrizes: [mayor],
    approximations: [...approxEntries],
    otherPrizes: fromBody.entries.filter((e) => !approxEntries.has(e)),
  }
}

export async function fetchOfficialList(ref: Pick<OfficialListRef, 'drawNumber' | 'url'>): Promise<OfficialList> {
  const res = await axios.get<ArrayBuffer>(ref.url, {
    timeout: 30_000,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT },
  })
  return parseOfficialList(new Uint8Array(res.data), ref)
}

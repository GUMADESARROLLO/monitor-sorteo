import { formatPrize } from './formatters'
import type { OfficialList } from './types'

const PLACE_NAMES: Record<number, string> = {
  1: 'Premio Mayor',
  2: '2do Premio',
  3: '3er Premio',
  4: '4to Premio',
  5: '5to Premio',
  6: '6to Premio',
  7: '7mo Premio',
}

export function placeName(place: number): string {
  return PLACE_NAMES[place] ?? `${place}° Premio`
}

/** Renders an official list (parsed from its PDF) as Markdown, in the same order as the printed list. */
export function winnersToMarkdown(list: OfficialList): string {
  const lines: string[] = [`# Lista Oficial — Sorteo Nº ${list.drawNumber}`, '', `Fuente: ${list.url}`, '']

  lines.push('## Premios directos principales', '', '| Premio | Nº Ganador | Monto | Sucursal |', '|---|---|---|---|')
  for (const p of list.mainPrizes) {
    lines.push(`| ${placeName(p.place)} | **${p.number}** | ${formatPrize(p.prize)} | ${p.branch ?? '—'} |`)
  }

  if (list.approximations.length > 0) {
    lines.push('', '## Aproximaciones al Premio Mayor', '', '| Número | Premio |', '|---|---|')
    for (const a of list.approximations) lines.push(`| ${a.number} | ${formatPrize(a.prize)} |`)
  }

  // Remaining prizes grouped by amount, highest first.
  const byAmount = new Map<string, string[]>()
  for (const p of list.otherPrizes) byAmount.set(p.prize, [...(byAmount.get(p.prize) ?? []), p.number])
  const amounts = [...byAmount.keys()].sort((a, b) => parseInt(b, 10) - parseInt(a, 10))

  if (amounts.length > 0) {
    lines.push('', `## Otros premios directos (${list.otherPrizes.length})`)
    for (const amount of amounts) {
      const numbers = byAmount.get(amount)!
      lines.push('', `### ${formatPrize(amount)} — ${numbers.length} premios`, '', numbers.join(' · '))
    }
  }

  return lines.join('\n') + '\n'
}

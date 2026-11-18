import { getPool, sql } from './db'
import { placeName } from './markdown'
import type { OfficialList, RifaMatch } from './types'

const CHUNK_SIZE = 1000

interface RifaRow {
  NUMERO: string
  CLIENTE: string
  NOMBRE: string | null
  DIRECCION: string | null
  FACTURA: string | null
  TOTAL_FACTURA: number | null
}

interface WinningNumber {
  drawNumber: number
  number: string
  prize: string
  category: string
}

function winningNumbers(lists: OfficialList[]): WinningNumber[] {
  return lists.flatMap((list) => [
    ...list.mainPrizes.map((p) => ({ drawNumber: list.drawNumber, number: p.number, prize: p.prize, category: placeName(p.place) })),
    ...list.approximations.map((p) => ({ drawNumber: list.drawNumber, number: p.number, prize: p.prize, category: 'Aproximación' })),
    ...list.otherPrizes.map((p) => ({ drawNumber: list.drawNumber, number: p.number, prize: p.prize, category: 'Otro premio' })),
  ])
}

/** Looks up every winning number of the given draws in NUMEROS_RIFA and returns the ones assigned to a client. */
export async function findRifaMatches(lists: OfficialList[]): Promise<RifaMatch[]> {
  const winners = winningNumbers(lists)
  if (winners.length === 0) return []

  const pool = await getPool()
  const numbers = [...new Set(winners.map((w) => w.number))]
  const rows: RifaRow[] = []

  // PRODUCCION's compatibility level has no STRING_SPLIT; SQL Server allows up to 2100 parameters per query.
  for (let i = 0; i < numbers.length; i += CHUNK_SIZE) {
    const chunk = numbers.slice(i, i + CHUNK_SIZE)
    const request = pool.request()
    chunk.forEach((n, idx) => request.input(`n${idx}`, sql.Char(5), n))

    const result = await request.query<RifaRow>(`
      SELECT T0.NUMERO, T0.CLIENTE, T1.NOMBRE, T1.DIRECCION, T0.FACTURA, T2.TOTAL_FACTURA
      FROM PRODUCCION.dbo.NUMEROS_RIFA T0
      LEFT JOIN Softland.umk.CLIENTE T1 ON T1.CLIENTE = T0.CLIENTE
      OUTER APPLY (
        SELECT TOP 1 F.TOTAL_FACTURA
        FROM Softland.umk.FACTURA F
        WHERE F.FACTURA = T0.FACTURA AND F.TIPO_DOCUMENTO = 'F'
      ) T2
      WHERE T0.NUMERO IN (${chunk.map((_, idx) => `@n${idx}`).join(', ')})
        AND T0.CLIENTE IS NOT NULL AND T0.CLIENTE <> ''
    `)
    rows.push(...result.recordset)
  }

  const byNumber = new Map(rows.map((r) => [r.NUMERO.trim(), r]))
  const totals = await clientTotals(pool, [...new Set(rows.map((r) => r.CLIENTE))])

  return winners
    .filter((w) => byNumber.has(w.number))
    .map((w) => {
      const r = byNumber.get(w.number)!
      const t = totals.get(r.CLIENTE.trim())
      return {
        ...w,
        cliente: r.CLIENTE.trim(),
        nombre: r.NOMBRE?.trim() ?? null,
        direccion: r.DIRECCION?.trim() ?? null,
        factura: r.FACTURA?.trim() ?? null,
        montoFactura: r.TOTAL_FACTURA ?? null,
        facturasCliente: t?.FACTURAS ?? 0,
        montoCliente: t?.MONTO ?? 0,
        accionesCliente: t?.ACCIONES ?? 0,
      }
    })
    .sort((a, b) => b.drawNumber - a.drawNumber || parseInt(b.prize, 10) - parseInt(a.prize, 10))
}

interface ClientTotalsRow {
  CLIENTE: string
  FACTURAS: number
  MONTO: number | null
  ACCIONES: number
}

/** Per client, across the whole promotion: invoices that earned raffle numbers, their total amount and the numbers (acciones) earned. */
async function clientTotals(pool: sql.ConnectionPool, clients: string[]): Promise<Map<string, ClientTotalsRow>> {
  const out = new Map<string, ClientTotalsRow>()

  for (let i = 0; i < clients.length; i += CHUNK_SIZE) {
    const chunk = clients.slice(i, i + CHUNK_SIZE)
    const request = pool.request()
    chunk.forEach((c, idx) => request.input(`c${idx}`, sql.VarChar(20), c))

    // Aggregate per invoice first so an invoice with several numbers is summed only once.
    const result = await request.query<ClientTotalsRow>(`
      SELECT R.CLIENTE, COUNT(*) AS FACTURAS, SUM(T2.TOTAL_FACTURA) AS MONTO, SUM(R.NUMEROS) AS ACCIONES
      FROM (
        SELECT CLIENTE, FACTURA, COUNT(*) AS NUMEROS
        FROM PRODUCCION.dbo.NUMEROS_RIFA
        WHERE CLIENTE IN (${chunk.map((_, idx) => `@c${idx}`).join(', ')})
        GROUP BY CLIENTE, FACTURA
      ) R
      OUTER APPLY (
        SELECT TOP 1 F.TOTAL_FACTURA
        FROM Softland.umk.FACTURA F
        WHERE F.FACTURA = R.FACTURA AND F.TIPO_DOCUMENTO = 'F'
      ) T2
      GROUP BY R.CLIENTE
    `)
    for (const row of result.recordset) out.set(row.CLIENTE.trim(), row)
  }

  return out
}

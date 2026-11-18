export function formatPrize(prize: string): string {
  const n = parseInt(prize, 10)
  if (isNaN(n)) return `C$${prize}`
  return `C$ ${n.toLocaleString('es-NI')}`
}

export function formatAmount(amount: number): string {
  return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

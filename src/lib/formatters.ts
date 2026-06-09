export function formatPrize(prize: string): string {
  const n = parseInt(prize, 10)
  if (isNaN(n)) return `C$${prize}`
  return `C$ ${n.toLocaleString('es-NI')}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

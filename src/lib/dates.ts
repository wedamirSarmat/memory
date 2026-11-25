/** Lokales Datum als YYYY-MM-DD (keine UTC-Verschiebung) */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(s: string, n: number): string {
  const d = fromISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function today(): string {
  return toISODate(new Date())
}

export function yesterday(): string {
  return addDays(today(), -1)
}

const weekdayFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
const longFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** "Gestern", "Heute" oder "Mo., 23. Nov." */
export function relativeLabel(s: string): string {
  if (s === today()) return 'Heute'
  if (s === yesterday()) return 'Gestern'
  if (s === addDays(today(), -2)) return 'Vorgestern'
  return weekdayFmt.format(fromISODate(s))
}

export function longLabel(s: string): string {
  return longFmt.format(fromISODate(s))
}

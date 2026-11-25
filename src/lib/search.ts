import { normalize } from './db'

/** Levenshtein-Distanz (für "Meintest du …?") */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[b.length]!
}

/**
 * Bewertet, wie gut `query` zu `name` passt. 0 = kein Treffer, höher = besser.
 * Wortanfang > enthalten > alle Wörter enthalten > Tippfehler-tolerant.
 */
export function matchScore(query: string, name: string): number {
  const q = normalize(query)
  const n = normalize(name)
  if (!q) return 1
  if (n === q) return 100
  if (n.startsWith(q)) return 80
  if (n.split(' ').some(w => w.startsWith(q))) return 70
  if (n.includes(q)) return 50
  const words = q.split(' ')
  if (words.length > 1 && words.every(w => n.includes(w))) return 40
  // Tippfehler: Distanz zum ähnlichsten gleich langen Anfang
  if (q.length >= 4) {
    const d = levenshtein(q, n.slice(0, q.length))
    if (d <= 1) return 30
    if (d <= 2 && q.length >= 6) return 20
  }
  return 0
}

/** Findet einen sehr ähnlichen, aber nicht identischen Namen (Dubletten-Warnung) */
export function findSimilar<T extends { name: string, key: string }>(input: string, items: T[]): T | undefined {
  const k = normalize(input)
  if (k.length < 3) return undefined
  let best: T | undefined
  let bestD = Infinity
  for (const it of items) {
    if (it.key === k) return it
    const d = levenshtein(k, it.key)
    const limit = k.length <= 5 ? 1 : 2
    if (d <= limit && d < bestD) {
      best = it
      bestD = d
    }
  }
  return best
}

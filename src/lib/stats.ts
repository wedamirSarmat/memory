import { addDays } from './dates'
import type { Activity, DayEntry, Food } from './db'

/** Was ausgewertet wird */
export type Target = 'overall' | 'body' | 'mind' | 'sleep'
/** 0 = Befinden am Morgen danach (gleicher Eintrag), 1 = einen Tag später */
export type Lag = 0 | 1
export type FactorGroup = 'food' | 'tag' | 'activity' | 'habit'

/** Mindestanzahl Tage je Gruppe (mit / ohne), damit ein Vergleich gezeigt wird */
export const MIN_GROUP = 3
/** Ab so vielen Tagen werden Ergebnisse als belastbarer angesehen */
export const SOLID_DAYS = 21
/** Ab so vielen Tagen startet die Auswertung überhaupt */
export const MIN_DAYS = 7

export function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function variance(values: number[], m = mean(values)) {
  if (values.length < 2) return 0
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1)
}

export function targetValue(d: DayEntry, target: Target): number | null {
  switch (target) {
    case 'body': return d.feelingBody
    case 'mind': return d.feelingMind
    case 'sleep': return d.sleepScore
    default: {
      const v = [d.feelingBody, d.feelingMind].filter((x): x is number => x !== null)
      return v.length ? mean(v) : null
    }
  }
}

/** Ein Tag (Ursache) mit dem zugehörigen Zielwert (Wirkung, ggf. zeitversetzt) */
export interface Pair { cause: DayEntry, value: number }

export function buildPairs(days: DayEntry[], target: Target, lag: Lag): Pair[] {
  const byDate = new Map(days.map(d => [d.date, d]))
  const out: Pair[] = []
  for (const d of days) {
    const effect = lag === 0 ? d : byDate.get(addDays(d.date, lag))
    if (!effect) continue
    const v = targetValue(effect, target)
    if (v !== null) out.push({ cause: d, value: v })
  }
  return out
}

// ---------- Faktoren (mit / ohne) ----------

export interface Factor {
  id: string
  label: string
  group: FactorGroup
  /** true = trifft zu, false = trifft nicht zu, null = unbekannt (Tag wird ignoriert) */
  test: (d: DayEntry) => boolean | null
  /** Schlaf-Faktor: bei Ziel „Schlaf“ ausblenden (wäre zirkulär) */
  sleep?: boolean
}

/** „HH:MM“ → Minuten seit Mitternacht; Zeiten vor 5 Uhr zählen zum Vorabend */
export function timeToMinutes(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null
  return (h < 5 ? h + 24 : h) * 60 + m
}

export function movementMinutes(d: DayEntry) {
  return d.activities.reduce((s, a) => s + a.minutes, 0)
}

const nullable = <T>(v: T | null, fn: (v: T) => boolean) => (v === null ? null : fn(v))

export const HABIT_FACTORS: Factor[] = [
  { id: 'h:move', label: 'Bewegung', group: 'habit', test: d => d.activities.length > 0 },
  { id: 'h:move30', label: 'Mind. 30 Min. Bewegung', group: 'habit', test: d => movementMinutes(d) >= 30 },
  { id: 'h:hard', label: 'Hartes Training', group: 'habit', test: d => d.activities.some(a => a.intensity >= 90) },
  { id: 'h:meditation', label: 'Meditiert', group: 'habit', test: d => d.meditationMinutes > 0 },
  { id: 'h:alcohol', label: 'Alkohol', group: 'habit', test: d => d.alcoholDrinks > 0 },
  { id: 'h:alcohol3', label: '3+ alkoholische Getränke', group: 'habit', test: d => d.alcoholDrinks >= 3 },
  { id: 'h:caffeine', label: 'Koffein', group: 'habit', test: d => d.caffeineCups > 0 },
  { id: 'h:caffeine3', label: '3+ Tassen Koffein', group: 'habit', test: d => d.caffeineCups >= 3 },
  { id: 'h:water8', label: '8+ Gläser Wasser', group: 'habit', test: d => d.waterGlasses >= 8 },
  { id: 'h:outdoor60', label: 'Mind. 1 h draußen', group: 'habit', test: d => nullable(d.outdoorMinutes, v => v >= 60) },
  { id: 'h:screen4', label: 'Ab 4 h Bildschirmzeit', group: 'habit', test: d => nullable(d.screenTimeHours, v => v >= 4) },
  { id: 'h:lateMeal', label: 'Letzte Mahlzeit nach 20 Uhr', group: 'habit', test: d => nullable(timeToMinutes(d.lastMealTime), v => v > 20 * 60) },
  { id: 'h:stress', label: 'Hoher Stress (ab 60)', group: 'habit', test: d => nullable(d.stress, v => v >= 60) },
  { id: 'h:sleep7', label: 'Mind. 7 h Schlaf', group: 'habit', sleep: true, test: d => nullable(d.sleepHours, v => v >= 7) },
  { id: 'h:sleep80', label: 'Schlaf-Score ab 80', group: 'habit', sleep: true, test: d => nullable(d.sleepScore, v => v >= 80) },
]

/** Alle Faktoren, die in den ausgewerteten Tagen oft genug vorkommen */
export function buildFactors(pairs: Pair[], foods: Map<number, Food>, activities: Map<number, Activity>): Factor[] {
  const foodCount = new Map<number, number>()
  const tagCount = new Map<string, number>()
  const actCount = new Map<number, number>()
  for (const { cause } of pairs) {
    const foodIds = new Set(cause.meals.map(m => m.foodId))
    const tags = new Set<string>()
    for (const id of foodIds) {
      foodCount.set(id, (foodCount.get(id) ?? 0) + 1)
      foods.get(id)?.tags.forEach(t => tags.add(t))
    }
    for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    for (const id of new Set(cause.activities.map(a => a.activityId)))
      actCount.set(id, (actCount.get(id) ?? 0) + 1)
  }

  const out: Factor[] = []
  for (const [id, n] of foodCount) {
    const food = foods.get(id)
    if (!food || n < MIN_GROUP) continue
    out.push({ id: `f:${id}`, label: food.name, group: 'food', test: d => d.meals.some(m => m.foodId === id) })
  }
  for (const [tag, n] of tagCount) {
    if (n < MIN_GROUP) continue
    out.push({
      id: `t:${tag}`,
      label: tag,
      group: 'tag',
      test: d => d.meals.some(m => foods.get(m.foodId)?.tags.includes(tag) ?? false),
    })
  }
  for (const [id, n] of actCount) {
    const act = activities.get(id)
    if (!act || n < MIN_GROUP) continue
    out.push({ id: `a:${id}`, label: act.name, group: 'activity', test: d => d.activities.some(a => a.activityId === id) })
  }
  return [...out, ...HABIT_FACTORS]
}

/** 0 = unsicher, 1 = Tendenz, 2 = wahrscheinlich, 3 = deutlich */
export type Confidence = 0 | 1 | 2 | 3

export function confidenceFromT(t: number): Confidence {
  const a = Math.abs(t)
  if (a >= 3) return 3
  if (a >= 2) return 2
  if (a >= 1) return 1
  return 0
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  0: 'unsicher',
  1: 'Tendenz',
  2: 'wahrscheinlich',
  3: 'deutlich',
}

export interface Effect {
  factor: Factor
  nWith: number
  nWithout: number
  meanWith: number
  meanWithout: number
  /** Unterschied in Punkten (mit − ohne) */
  diff: number
  confidence: Confidence
}

/** Mit/Ohne-Vergleich (Welch-t als grobes Maß für die Verlässlichkeit) */
export function compare(pairs: Pair[], factor: Factor): Effect | null {
  const yes: number[] = []
  const no: number[] = []
  for (const p of pairs) {
    const r = factor.test(p.cause)
    if (r === true) yes.push(p.value)
    else if (r === false) no.push(p.value)
  }
  if (yes.length < MIN_GROUP || no.length < MIN_GROUP) return null
  const mY = mean(yes)
  const mN = mean(no)
  const diff = mY - mN
  const se = Math.sqrt(variance(yes, mY) / yes.length + variance(no, mN) / no.length)
  const t = se > 0 ? diff / se : (Math.abs(diff) > 0.5 ? 99 : 0)
  return {
    factor,
    nWith: yes.length,
    nWithout: no.length,
    meanWith: mY,
    meanWithout: mN,
    diff,
    confidence: confidenceFromT(t),
  }
}

const GROUP_ORDER: Record<FactorGroup, number> = { food: 0, activity: 1, habit: 2, tag: 3 }

export function computeEffects(pairs: Pair[], factors: Factor[], target: Target): Effect[] {
  return factors
    .filter(f => !(target === 'sleep' && f.sleep))
    .map(f => compare(pairs, f))
    .filter((e): e is Effect => e !== null)
    // Bei gleichem Effekt (z. B. Gericht und seine Tags) das konkrete Gericht zuerst
    .sort((a, b) => (Math.abs(b.diff - a.diff) > 0.01 ? b.diff - a.diff : GROUP_ORDER[a.factor.group] - GROUP_ORDER[b.factor.group]))
}

// ---------- Zusammenhänge (je mehr, desto …) ----------

export interface Metric {
  id: string
  label: string
  get: (d: DayEntry) => number | null
  sleep?: boolean
  /** Formulierung für „je mehr“ */
  more?: string
}

export const METRICS: Metric[] = [
  { id: 'sleepScore', label: 'Schlaf-Score', more: 'je höher', sleep: true, get: d => d.sleepScore },
  { id: 'sleepHours', label: 'Schlafdauer', more: 'je länger', sleep: true, get: d => d.sleepHours },
  { id: 'deepSleep', label: 'Tiefschlaf-Anteil', sleep: true, get: d => d.deepSleepPct },
  { id: 'stress', label: 'Stress', more: 'je höher', get: d => d.stress },
  { id: 'movement', label: 'Bewegung (Minuten)', get: d => movementMinutes(d) },
  { id: 'outdoor', label: 'Zeit draußen', more: 'je länger', get: d => d.outdoorMinutes },
  { id: 'meditation', label: 'Meditation (Minuten)', get: d => d.meditationMinutes },
  { id: 'screen', label: 'Bildschirmzeit', more: 'je länger', get: d => d.screenTimeHours },
  { id: 'caffeine', label: 'Koffein', get: d => d.caffeineCups },
  { id: 'alcohol', label: 'Alkohol', get: d => d.alcoholDrinks },
  { id: 'water', label: 'Wasser', get: d => d.waterGlasses },
  { id: 'lastMeal', label: 'Uhrzeit letzte Mahlzeit', more: 'je später', get: d => timeToMinutes(d.lastMealTime) },
]

export interface Correlation { metric: Metric, n: number, r: number, confidence: Confidence }

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length
  if (n < 3) return null
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx
    const dy = ys[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null
  return sxy / Math.sqrt(sxx * syy)
}

export function computeCorrelations(pairs: Pair[], target: Target): Correlation[] {
  const out: Correlation[] = []
  for (const metric of METRICS) {
    if (target === 'sleep' && metric.sleep) continue
    const xs: number[] = []
    const ys: number[] = []
    for (const p of pairs) {
      const x = metric.get(p.cause)
      if (x === null) continue
      xs.push(x)
      ys.push(p.value)
    }
    if (xs.length < MIN_DAYS) continue
    const r = pearson(xs, ys)
    if (r === null) continue
    const n = xs.length
    const t = Math.abs(r) >= 0.9999 ? 99 : r * Math.sqrt((n - 2) / (1 - r * r))
    out.push({ metric, n, r, confidence: confidenceFromT(t) })
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
}

// ---------- Verlauf ----------

export interface TrendPoint { date: string, body: number | null, mind: number | null }

/** Tageswerte im Zeitraum (inkl. Lücken als null) */
export function trendSeries(days: DayEntry[], from: string, to: string): TrendPoint[] {
  const byDate = new Map(days.map(d => [d.date, d]))
  const out: TrendPoint[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const e = byDate.get(d)
    out.push({ date: d, body: e?.feelingBody ?? null, mind: e?.feelingMind ?? null })
  }
  return out
}

/** Gleitender Durchschnitt über die letzten `window` Tage (ignoriert Lücken) */
export function rolling(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null)
    return slice.length >= Math.min(3, window) ? mean(slice) : null
  })
}

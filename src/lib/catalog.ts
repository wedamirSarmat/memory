import { addDays, today } from './dates'
import { type Activity, db, type DayEntry, type Food, normalize } from './db'

export type CatalogKind = 'food' | 'activity'

export interface UsageInfo {
  count: number
  /** Anzahl in den letzten 30 Tagen (gewichtet die Vorschläge) */
  recent: number
  lastDate: string | null
}

/** Zählt, wie oft jedes Lebensmittel / jede Aktivität vorkommt */
export function computeUsage(days: DayEntry[], kind: CatalogKind): Map<number, UsageInfo> {
  const map = new Map<number, UsageInfo>()
  const cutoffStr = addDays(today(), -30)

  for (const day of days) {
    const ids = new Set(kind === 'food'
      ? day.meals.map(m => m.foodId)
      : day.activities.map(a => a.activityId))
    for (const id of ids) {
      const u = map.get(id) ?? { count: 0, recent: 0, lastDate: null }
      u.count++
      if (day.date >= cutoffStr) u.recent++
      if (!u.lastDate || day.date > u.lastDate) u.lastDate = day.date
      map.set(id, u)
    }
  }
  return map
}

/** Sortierwert für Vorschläge: kürzlich häufig > insgesamt häufig */
export function suggestionRank(u: UsageInfo | undefined): number {
  if (!u) return 0
  return u.recent * 3 + u.count
}

function table(kind: CatalogKind) {
  return kind === 'food' ? db.foods : db.activities
}

export async function createItem(kind: CatalogKind, name: string, tags: string[] = []): Promise<number> {
  const key = normalize(name)
  const existing = await table(kind).where('key').equals(key).first()
  if (existing) return existing.id!
  const base = { name: name.trim(), key, createdAt: Date.now() }
  // Kopie: Vue-Proxies können nicht in IndexedDB gespeichert werden
  if (kind === 'food') return db.foods.add({ ...base, tags: [...tags] } as Food) as Promise<number>
  return db.activities.add(base as Activity) as Promise<number>
}

export async function updateItem(kind: CatalogKind, id: number, name: string, tags?: string[]) {
  const key = normalize(name)
  const clash = await table(kind).where('key').equals(key).first()
  if (clash && clash.id !== id) throw new Error(`„${clash.name}“ existiert bereits – nutze „Zusammenführen“.`)
  if (kind === 'food') await db.foods.update(id, { name: name.trim(), key, ...(tags ? { tags: [...tags] } : {}) })
  else await db.activities.update(id, { name: name.trim(), key })
}

/** Ersetzt `fromId` überall durch `intoId` und löscht `fromId` */
export async function mergeItems(kind: CatalogKind, fromId: number, intoId: number) {
  if (fromId === intoId) return
  await db.transaction('rw', db.days, db.foods, db.activities, async () => {
    const days = await db.days.toArray()
    for (const day of days) {
      let changed = false
      if (kind === 'food') {
        const seen = new Set<string>()
        const meals = []
        for (const m of day.meals) {
          const foodId = m.foodId === fromId ? intoId : m.foodId
          if (foodId !== m.foodId) changed = true
          const k = `${foodId}-${m.slot}`
          if (seen.has(k)) { changed = true; continue }
          seen.add(k)
          meals.push({ ...m, foodId })
        }
        if (changed) await db.days.update(day.id!, { meals })
      }
      else {
        const acts = day.activities.map((a) => {
          if (a.activityId !== fromId) return a
          changed = true
          return { ...a, activityId: intoId }
        })
        if (changed) await db.days.update(day.id!, { activities: acts })
      }
    }
    if (kind === 'food') {
      const [from, into] = await Promise.all([db.foods.get(fromId), db.foods.get(intoId)])
      if (from && into) {
        const tags = [...new Set([...into.tags, ...from.tags])]
        await db.foods.update(intoId, { tags })
      }
    }
    await table(kind).delete(fromId)
  })
}

export async function deleteItem(kind: CatalogKind, id: number) {
  await table(kind).delete(id)
}

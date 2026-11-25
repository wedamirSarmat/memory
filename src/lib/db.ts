import Dexie, { type EntityTable } from 'dexie'

/** Mahlzeit-Slot innerhalb des Tages */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_SLOTS: { value: MealSlot, label: string }[] = [
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lunch', label: 'Mittag' },
  { value: 'dinner', label: 'Abend' },
  { value: 'snack', label: 'Snack' },
]

export interface MealItem {
  foodId: number
  slot: MealSlot
}

export interface ActivityItem {
  activityId: number
  minutes: number
  /** 0–100 */
  intensity: number
}

/**
 * Ein Tageseintrag. `date` ist der beschriebene Tag (normalerweise "gestern").
 * Schlaf = die Nacht nach diesem Tag, Befinden = am Morgen danach.
 * Alle Prozentwerte 0–100, `null` = nicht angegeben.
 */
export interface DayEntry {
  id?: number
  date: string // YYYY-MM-DD
  meals: MealItem[]
  activities: ActivityItem[]

  sleepScore: number | null
  sleepHours: number | null
  deepSleepPct: number | null

  stress: number | null
  meditationMinutes: number

  alcoholDrinks: number
  caffeineCups: number
  waterGlasses: number
  screenTimeHours: number | null
  outdoorMinutes: number | null
  lastMealTime: string | null // HH:MM

  feelingBody: number | null
  feelingMind: number | null

  note: string
  createdAt: number
  updatedAt: number
}

export interface Food {
  id?: number
  name: string
  /** normalisierter Name für Dubletten-Erkennung */
  key: string
  tags: string[]
  createdAt: number
}

export interface Activity {
  id?: number
  name: string
  key: string
  createdAt: number
}

export interface Meta {
  key: string
  value: unknown
}

export const db = new Dexie('memory') as Dexie & {
  days: EntityTable<DayEntry, 'id'>
  foods: EntityTable<Food, 'id'>
  activities: EntityTable<Activity, 'id'>
  meta: EntityTable<Meta, 'key'>
}

db.version(1).stores({
  days: '++id, &date',
  foods: '++id, &key, *tags',
  activities: '++id, &key',
  meta: '&key',
})

db.on('populate', (tx) => {
  const now = Date.now()
  const defaults = ['Spazieren', 'Laufen', 'Radfahren', 'Krafttraining', 'Yoga', 'Schwimmen']
  tx.table('activities').bulkAdd(defaults.map(name => ({ name, key: normalize(name), createdAt: now })))
})

/** Kleinschreibung, Umlaute vereinheitlicht, Mehrfach-Leerzeichen entfernt */
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

export function emptyDay(date: string): DayEntry {
  const now = Date.now()
  return {
    date,
    meals: [],
    activities: [],
    sleepScore: null,
    sleepHours: null,
    deepSleepPct: null,
    stress: null,
    meditationMinutes: 0,
    alcoholDrinks: 0,
    caffeineCups: 0,
    waterGlasses: 0,
    screenTimeHours: null,
    outdoorMinutes: null,
    lastMealTime: null,
    feelingBody: null,
    feelingMind: null,
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

export const PRESET_TAGS = [
  'Gemüse',
  'Obst',
  'Vollkorn',
  'Weißmehl',
  'Gluten',
  'Laktose',
  'Zucker',
  'Süßes',
  'Fleisch',
  'Rotes Fleisch',
  'Fisch',
  'Ei',
  'Hülsenfrüchte',
  'Nüsse',
  'Vegetarisch',
  'Vegan',
  'Fertiggericht',
  'Fast Food',
  'Frittiert',
  'Fettig',
  'Scharf',
  'Rohkost',
]

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}

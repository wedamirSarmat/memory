import { createSharedComposable } from '@vueuse/core'
import { computed } from 'vue'
import { useLiveQuery } from './useLiveQuery'
import { computeUsage } from '@/lib/catalog'
import { type Activity, type DayEntry, db, type Food } from '@/lib/db'

/** Gemeinsamer, live aktualisierter Datenbestand für alle Ansichten */
export const useData = createSharedComposable(() => {
  const days = useLiveQuery<DayEntry[]>(() => db.days.orderBy('date').reverse().toArray(), [])
  const foods = useLiveQuery<Food[]>(() => db.foods.orderBy('key').toArray(), [])
  const activities = useLiveQuery<Activity[]>(() => db.activities.orderBy('key').toArray(), [])

  const foodUsage = computed(() => computeUsage(days.value, 'food'))
  const activityUsage = computed(() => computeUsage(days.value, 'activity'))

  const foodById = computed(() => new Map(foods.value.map(f => [f.id!, f])))
  const activityById = computed(() => new Map(activities.value.map(a => [a.id!, a])))

  const knownTags = computed(() => {
    const set = new Set<string>()
    for (const f of foods.value) f.tags.forEach(t => set.add(t))
    return [...set].sort((a, b) => a.localeCompare(b, 'de'))
  })

  return { days, foods, activities, foodUsage, activityUsage, foodById, activityById, knownTags }
})

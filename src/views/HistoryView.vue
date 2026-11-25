<script setup lang="ts">
import { BrainIcon, ChevronRightIcon, HeartPulseIcon, MoonIcon, PlusIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useData } from '@/composables/useData'
import { addDays, relativeLabel, yesterday } from '@/lib/dates'
import type { DayEntry } from '@/lib/db'

const { days, foodById } = useData()

type Row = { date: string, day?: DayEntry }

/** Alle Tage von gestern bis zum ältesten Eintrag, inkl. Lücken (max. 90 Tage Lücken) */
const rows = computed<Row[]>(() => {
  const byDate = new Map(days.value.map(d => [d.date, d]))
  const oldest = days.value.at(-1)?.date
  if (!oldest) return []
  const out: Row[] = []
  let d = yesterday()
  let gapBudget = 90
  while (d >= oldest) {
    const day = byDate.get(d)
    if (day) out.push({ date: d, day })
    else if (gapBudget-- > 0) out.push({ date: d })
    d = addDays(d, -1)
  }
  // Einträge in der Zukunft / heute (falls vorhanden) oben einsortieren
  for (const day of days.value) if (day.date > yesterday()) out.unshift({ date: day.date, day })
  return out
})

const stats = computed(() => {
  const n = days.value.length
  let streak = 0
  let d = yesterday()
  const set = new Set(days.value.map(x => x.date))
  while (set.has(d)) { streak++; d = addDays(d, -1) }
  return { n, streak }
})

function foodsPreview(day: DayEntry) {
  const names = [...new Set(day.meals.map(m => foodById.value.get(m.foodId)?.name).filter(Boolean))]
  if (!names.length) return 'Kein Essen eingetragen'
  return names.length > 4 ? `${names.slice(0, 4).join(', ')} +${names.length - 4}` : names.join(', ')
}

function tone(v: number | null) {
  if (v === null) return 'text-muted-foreground'
  if (v >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (v >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function dateParam(date: string) {
  return date === yesterday() ? undefined : date
}
</script>

<template>
  <div class="space-y-4 pt-2 pb-8">
    <header class="flex items-end justify-between">
      <div>
        <h1 class="text-xl font-semibold">
          Verlauf
        </h1>
        <p class="text-muted-foreground text-sm">
          {{ stats.n }} {{ stats.n === 1 ? 'Tag' : 'Tage' }} erfasst
        </p>
      </div>
      <div v-if="stats.streak > 1" class="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
        🔥 {{ stats.streak }} Tage in Folge
      </div>
    </header>

    <div v-if="!rows.length" class="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
      Noch keine Einträge.
      <RouterLink :to="{ name: 'entry' }" class="text-primary mt-2 block font-medium">
        Ersten Tag eintragen →
      </RouterLink>
    </div>

    <ul class="space-y-2">
      <li v-for="r in rows" :key="r.date">
        <RouterLink
          v-if="r.day"
          :to="{ name: 'entry', params: { date: dateParam(r.date) } }"
          class="bg-card ring-foreground/5 active:bg-muted flex items-center gap-3 rounded-2xl p-3.5 shadow-sm ring-1"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-medium">{{ relativeLabel(r.date) }}</span>
            </div>
            <div class="text-muted-foreground truncate text-xs">
              {{ foodsPreview(r.day) }}
            </div>
            <div class="mt-1.5 flex gap-3 text-xs font-semibold tabular-nums">
              <span class="flex items-center gap-1" :class="tone(r.day.feelingBody)">
                <HeartPulseIcon class="size-3.5" />{{ r.day.feelingBody ?? '–' }}
              </span>
              <span class="flex items-center gap-1" :class="tone(r.day.feelingMind)">
                <BrainIcon class="size-3.5" />{{ r.day.feelingMind ?? '–' }}
              </span>
              <span class="flex items-center gap-1" :class="tone(r.day.sleepScore)">
                <MoonIcon class="size-3.5" />{{ r.day.sleepScore ?? '–' }}
              </span>
            </div>
          </div>
          <ChevronRightIcon class="text-muted-foreground size-4 shrink-0" />
        </RouterLink>

        <RouterLink
          v-else
          :to="{ name: 'entry', params: { date: dateParam(r.date) } }"
          class="text-muted-foreground flex items-center justify-between rounded-2xl border border-dashed px-3.5 py-2.5 text-sm"
        >
          <span>{{ relativeLabel(r.date) }} – fehlt</span>
          <span class="text-primary flex items-center gap-1 text-xs font-medium"><PlusIcon class="size-3.5" /> nachtragen</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

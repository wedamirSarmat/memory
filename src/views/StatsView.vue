<script setup lang="ts">
import {
  ChartLineIcon,
  ChevronDownIcon,
  InfoIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import EffectRow from '@/components/EffectRow.vue'
import Segmented from '@/components/Segmented.vue'
import TrendChart from '@/components/TrendChart.vue'
import { useData } from '@/composables/useData'
import { addDays, yesterday } from '@/lib/dates'
import {
  buildFactors,
  buildPairs,
  computeCorrelations,
  computeEffects,
  CONFIDENCE_LABEL,
  type Correlation,
  type FactorGroup,
  type Lag,
  mean,
  MIN_DAYS,
  SOLID_DAYS,
  type Target,
  targetValue,
  trendSeries,
} from '@/lib/stats'

const { days, foodById, activityById } = useData()

const target = useStorage<Target>('stats-target', 'overall')
const lag = useStorage<Lag>('stats-lag', 0)
const range = useStorage<30 | 90 | 0>('stats-range', 30)

const TARGETS: { value: Target, label: string }[] = [
  { value: 'overall', label: 'Gesamt' },
  { value: 'body', label: 'Körper' },
  { value: 'mind', label: 'Mental' },
  { value: 'sleep', label: 'Schlaf' },
]
const lagOptions = computed<{ value: Lag, label: string }[]>(() => target.value === 'sleep'
  ? [{ value: 0, label: 'Nacht danach' }, { value: 1, label: 'Eine Nacht später' }]
  : [{ value: 0, label: 'Morgen danach' }, { value: 1, label: 'Einen Tag später' }])
const RANGES: { value: 30 | 90 | 0, label: string }[] = [
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
  { value: 0, label: 'Alles' },
]

/** Tage mit Befinden (Grundlage für den Fortschritt) */
const feelingDays = computed(() => days.value.filter(d => targetValue(d, 'overall') !== null).length)
const ready = computed(() => feelingDays.value >= MIN_DAYS)

const pairs = computed(() => buildPairs(days.value, target.value, lag.value))
const baseline = computed(() => mean(pairs.value.map(p => p.value)))
const factors = computed(() => buildFactors(pairs.value, foodById.value, activityById.value))
const effects = computed(() => computeEffects(pairs.value, factors.value, target.value))
const correlations = computed(() => computeCorrelations(pairs.value, target.value))

/** Mindest-Unterschied in Punkten, damit etwas als „gut“ / „schlecht“ gilt */
const MIN_DIFF = 3
const good = computed(() => effects.value.filter(e => e.diff >= MIN_DIFF && e.confidence >= 1))
const bad = computed(() => effects.value.filter(e => e.diff <= -MIN_DIFF && e.confidence >= 1).reverse())

const showAllGood = ref(false)
const showAllBad = ref(false)
const TOP = 5

// Alle Faktoren
const allOpen = ref(false)
const groupFilter = ref<FactorGroup | 'all'>('all')
const GROUPS: { value: FactorGroup | 'all', label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'food', label: 'Essen' },
  { value: 'tag', label: 'Tags' },
  { value: 'activity', label: 'Sport' },
  { value: 'habit', label: 'Gewohnh.' },
]
const allEffects = computed(() => effects.value.filter(e => groupFilter.value === 'all' || e.factor.group === groupFilter.value))

// Verlauf
const trend = computed(() => {
  const newest = days.value[0]?.date
  const oldest = days.value.at(-1)?.date
  if (!newest || !oldest) return []
  const to = newest > yesterday() ? newest : yesterday()
  const from = range.value === 0 ? oldest : addDays(to, -(range.value - 1))
  return trendSeries(days.value, from, to)
})
const smooth = computed(() => trend.value.length > 45)
const trendAvg = computed(() => {
  const b = trend.value.map(p => p.body).filter((v): v is number => v !== null)
  const m = trend.value.map(p => p.mind).filter((v): v is number => v !== null)
  return { body: b.length ? Math.round(mean(b)) : null, mind: m.length ? Math.round(mean(m)) : null }
})

const targetName = computed(() => ({ overall: 'Befinden', body: 'Körper', mind: 'Mental', sleep: 'Schlaf-Score' })[target.value])

function strength(r: number) {
  const a = Math.abs(r)
  if (a < 0.1) return 'kein'
  if (a < 0.3) return 'schwacher'
  if (a < 0.5) return 'mittlerer'
  return 'starker'
}
function corrText(c: Correlation) {
  if (Math.abs(c.r) < 0.1) return ''
  const dir = c.r > 0 ? 'besser' : 'schlechter'
  return `${c.metric.more ?? 'je mehr'}, desto ${dir}`
}
function corrWidth(r: number) {
  return `${Math.min(50, Math.abs(r) * 50)}%`
}
</script>

<template>
  <div class="space-y-4 pt-2 pb-8">
    <header>
      <h1 class="text-xl font-semibold">
        Statistik
      </h1>
      <p v-if="ready" class="text-muted-foreground text-sm">
        {{ pairs.length }} Tage ausgewertet · Ø {{ targetName }} {{ Math.round(baseline) }}
      </p>
    </header>

    <!-- Noch zu wenig Daten -->
    <section v-if="!ready" class="bg-card ring-foreground/5 space-y-4 rounded-2xl p-5 shadow-sm ring-1">
      <div class="flex items-center gap-3">
        <div class="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
          <ChartLineIcon class="size-5" />
        </div>
        <div>
          <div class="font-semibold">
            Daten sammeln …
          </div>
          <div class="text-muted-foreground text-sm">
            {{ feelingDays }} von {{ MIN_DAYS }} Tagen mit Befinden
          </div>
        </div>
      </div>
      <div class="bg-muted h-2.5 overflow-hidden rounded-full">
        <div class="bg-primary h-full rounded-full transition-all" :style="{ width: `${Math.min(100, (feelingDays / MIN_DAYS) * 100)}%` }" />
      </div>
      <p class="text-muted-foreground text-sm leading-relaxed">
        Ab {{ MIN_DAYS }} Tagen erscheinen hier erste Auswertungen: welche Lebensmittel, Tags und Gewohnheiten mit
        besserem oder schlechterem Befinden einhergehen. Nach etwa drei Wochen werden die Ergebnisse belastbarer.
      </p>
    </section>

    <template v-else>
      <!-- Auswahl -->
      <section class="space-y-2">
        <Segmented v-model="target" :options="TARGETS" />
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground shrink-0 text-xs font-medium">Wirkung</span>
          <Segmented v-model="lag" :options="lagOptions" class="flex-1" />
        </div>
      </section>

      <div
        v-if="feelingDays < SOLID_DAYS"
        class="flex gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200"
      >
        <InfoIcon class="mt-0.5 size-4 shrink-0" />
        <p>
          <span class="font-semibold">Vorläufig:</span> Bei {{ feelingDays }} Tagen ist vieles noch Zufall.
          Ab etwa {{ SOLID_DAYS }} Tagen werden die Ergebnisse verlässlicher.
        </p>
      </div>

      <!-- Verlauf -->
      <section class="bg-card ring-foreground/5 space-y-3 rounded-2xl p-4 shadow-sm ring-1">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">
            Verlauf
          </h2>
          <Segmented v-model="range" :options="RANGES" class="w-48" />
        </div>
        <div class="flex gap-4 text-xs">
          <span class="flex items-center gap-1.5"><span class="bg-series-body h-0.5 w-3.5 rounded-full" />Körper <b class="tabular-nums">Ø {{ trendAvg.body ?? '–' }}</b></span>
          <span class="flex items-center gap-1.5"><span class="bg-series-mind h-0.5 w-3.5 rounded-full" />Mental <b class="tabular-nums">Ø {{ trendAvg.mind ?? '–' }}</b></span>
          <span v-if="smooth" class="text-muted-foreground ml-auto">7-Tage-Schnitt</span>
        </div>
        <TrendChart :points="trend" :smooth="smooth" />
      </section>

      <!-- Tut gut -->
      <section class="bg-card ring-foreground/5 rounded-2xl p-4 shadow-sm ring-1">
        <h2 class="flex items-center gap-2 font-semibold">
          <ThumbsUpIcon class="size-4 text-emerald-600 dark:text-emerald-400" />
          Tut dir gut
        </h2>
        <p class="text-muted-foreground mt-0.5 text-xs">
          {{ targetName }} im Schnitt höher, wenn …
        </p>
        <ul v-if="good.length" class="mt-2 divide-y">
          <EffectRow v-for="e in (showAllGood ? good : good.slice(0, TOP))" :key="e.factor.id" :effect="e" />
        </ul>
        <p v-else class="text-muted-foreground mt-3 text-sm">
          Noch kein klares Muster.
        </p>
        <button v-if="good.length > TOP" type="button" class="text-primary mt-1 text-sm font-medium" @click="showAllGood = !showAllGood">
          {{ showAllGood ? 'Weniger zeigen' : `Alle ${good.length} zeigen` }}
        </button>
      </section>

      <!-- Tut nicht gut -->
      <section class="bg-card ring-foreground/5 rounded-2xl p-4 shadow-sm ring-1">
        <h2 class="flex items-center gap-2 font-semibold">
          <ThumbsDownIcon class="size-4 text-rose-600 dark:text-rose-400" />
          Tut dir eher nicht gut
        </h2>
        <p class="text-muted-foreground mt-0.5 text-xs">
          {{ targetName }} im Schnitt niedriger, wenn …
        </p>
        <ul v-if="bad.length" class="mt-2 divide-y">
          <EffectRow v-for="e in (showAllBad ? bad : bad.slice(0, TOP))" :key="e.factor.id" :effect="e" />
        </ul>
        <p v-else class="text-muted-foreground mt-3 text-sm">
          Noch kein klares Muster.
        </p>
        <button v-if="bad.length > TOP" type="button" class="text-primary mt-1 text-sm font-medium" @click="showAllBad = !showAllBad">
          {{ showAllBad ? 'Weniger zeigen' : `Alle ${bad.length} zeigen` }}
        </button>
      </section>

      <!-- Zusammenhänge -->
      <section v-if="correlations.length" class="bg-card ring-foreground/5 rounded-2xl p-4 shadow-sm ring-1">
        <h2 class="font-semibold">
          Zusammenhänge
        </h2>
        <p class="text-muted-foreground mt-0.5 text-xs">
          Wie Messwerte mit „{{ targetName }}“ zusammenhängen
        </p>
        <ul class="mt-2 divide-y">
          <li
            v-for="c in correlations"
            :key="c.metric.id"
            class="py-2.5"
            :class="c.confidence === 0 ? 'opacity-55' : ''"
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate text-sm font-medium">{{ c.metric.label }}</span>
              <span class="text-muted-foreground shrink-0 text-xs">{{ strength(c.r) }} Zusammenhang</span>
            </div>
            <div class="relative mt-1.5 h-1.5 rounded-full bg-muted">
              <div class="bg-foreground/25 absolute top-1/2 left-1/2 h-3 w-px -translate-y-1/2" />
              <div
                class="absolute inset-y-0 rounded-full"
                :class="c.r >= 0 ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-rose-500'"
                :style="{ width: corrWidth(c.r) }"
              />
            </div>
            <div class="text-muted-foreground mt-1 flex justify-between text-xs">
              <span>{{ corrText(c) }}</span>
              <span>{{ c.n }} Tage · {{ CONFIDENCE_LABEL[c.confidence] }}</span>
            </div>
          </li>
        </ul>
      </section>

      <!-- Alle Faktoren -->
      <section class="bg-card ring-foreground/5 rounded-2xl shadow-sm ring-1">
        <button type="button" class="flex w-full items-center justify-between p-4 text-left" @click="allOpen = !allOpen">
          <span>
            <span class="block font-semibold">Alle Faktoren</span>
            <span class="text-muted-foreground block text-xs">{{ effects.length }} Vergleiche, auch unsichere</span>
          </span>
          <ChevronDownIcon class="text-muted-foreground size-5 transition" :class="allOpen ? 'rotate-180' : ''" />
        </button>
        <div v-if="allOpen" class="space-y-2 px-4 pb-4">
          <Segmented v-model="groupFilter" :options="GROUPS" />
          <ul class="divide-y">
            <EffectRow v-for="e in allEffects" :key="e.factor.id" :effect="e" />
            <li v-if="!allEffects.length" class="text-muted-foreground py-4 text-center text-sm">
              Noch nichts, das oft genug vorkommt (mind. 3 Tage mit und 3 ohne).
            </li>
          </ul>
        </div>
      </section>

      <!-- Lesehilfe -->
      <section class="text-muted-foreground space-y-1.5 px-1 text-xs leading-relaxed">
        <p>
          <b class="text-foreground">So liest du das:</b> „+8“ heißt, an Tagen mit diesem Faktor lag dein
          {{ targetName }} im Schnitt 8 Punkte höher als an Tagen ohne. Die Punkte daneben zeigen, wie sicher das ist.
        </p>
        <p>
          „Einen Tag später“ prüft verzögerte Wirkungen, z. B. Essen am Montag → Befinden am Mittwochmorgen.
        </p>
        <p>
          Gemeinsam auftretende Dinge (z. B. Pizza und Bier) lassen sich hier nicht auseinanderhalten.
          Ein Zusammenhang ist ein Hinweis, kein Beweis.
        </p>
      </section>
    </template>
  </div>
</template>

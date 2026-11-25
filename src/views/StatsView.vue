<script setup lang="ts">
import { ChartLineIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useData } from '@/composables/useData'

const { days } = useData()

const GOAL = 21
const complete = computed(() => days.value.filter(d => d.feelingBody !== null && d.feelingMind !== null).length)
const progress = computed(() => Math.min(100, Math.round((complete.value / GOAL) * 100)))
</script>

<template>
  <div class="space-y-4 pt-2 pb-8">
    <h1 class="text-xl font-semibold">
      Statistik
    </h1>

    <section class="bg-card ring-foreground/5 space-y-4 rounded-2xl p-5 shadow-sm ring-1">
      <div class="flex items-center gap-3">
        <div class="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
          <ChartLineIcon class="size-5" />
        </div>
        <div>
          <div class="font-semibold">
            Daten sammeln …
          </div>
          <div class="text-muted-foreground text-sm">
            {{ complete }} von {{ GOAL }} vollständigen Tagen
          </div>
        </div>
      </div>
      <div class="bg-muted h-2.5 overflow-hidden rounded-full">
        <div class="bg-primary h-full rounded-full transition-all" :style="{ width: `${progress}%` }" />
      </div>
      <p class="text-muted-foreground text-sm leading-relaxed">
        Nach etwa drei Wochen zeigen sich erste Tendenzen: Welche Lebensmittel, Tags und Gewohnheiten gehen mit
        besserem oder schlechterem Befinden am nächsten Morgen einher. Die Auswertung kommt in der nächsten Ausbaustufe.
      </p>
    </section>
  </div>
</template>

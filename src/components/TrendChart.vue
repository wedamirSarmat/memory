<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { fromISODate, relativeLabel } from '@/lib/dates'
import { rolling, type TrendPoint } from '@/lib/stats'

const props = defineProps<{ points: TrendPoint[], smooth: boolean }>()

const wrap = ref<HTMLElement>()
const { width } = useElementSize(wrap)

const H = 176
const PAD = { top: 10, right: 10, bottom: 24, left: 28 }
const W = computed(() => Math.max(220, Math.round(width.value)))
const plotW = computed(() => W.value - PAD.left - PAD.right)
const plotH = H - PAD.top - PAD.bottom

const series = computed(() => {
  const body = props.points.map(p => p.body)
  const mind = props.points.map(p => p.mind)
  return props.smooth ? { body: rolling(body), mind: rolling(mind) } : { body, mind }
})

function x(i: number) {
  const n = props.points.length
  return PAD.left + (n <= 1 ? plotW.value / 2 : (i / (n - 1)) * plotW.value)
}
function y(v: number) {
  return PAD.top + (1 - v / 100) * plotH
}

/** Linie mit Unterbrechung bei fehlenden Tagen */
function path(values: (number | null)[]) {
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v === null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

const showDots = computed(() => !props.smooth && props.points.length <= 45)

const xTicks = computed(() => {
  const n = props.points.length
  if (!n) return []
  const idx = n < 3 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
  return [...new Set(idx)].map(i => ({
    i,
    label: fromISODate(props.points[i]!.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }),
  }))
})

// Hover / Antippen
const active = ref<number | null>(null)
watch(() => props.points, () => { active.value = null })

function locate(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = e.clientX - rect.left
  const n = props.points.length
  if (n < 1) return
  const i = Math.round(((px - PAD.left) / plotW.value) * (n - 1))
  active.value = Math.max(0, Math.min(n - 1, i))
}
function leave(e: PointerEvent) {
  if (e.pointerType === 'mouse') active.value = null
}

const tip = computed(() => {
  const i = active.value
  if (i === null) return null
  const p = props.points[i]
  if (!p) return null
  // Tooltip neben die Hilfslinie, auf die Seite mit mehr Platz
  const flip = x(i) > W.value / 2
  return {
    x: x(i),
    style: flip
      ? { left: `${x(i) - 8}px`, transform: 'translateX(-100%)' }
      : { left: `${x(i) + 8}px` },
    label: relativeLabel(p.date),
    body: series.value.body[i] ?? null,
    mind: series.value.mind[i] ?? null,
  }
})

const fmt = (v: number | null) => (v === null ? '–' : Math.round(v).toString())
</script>

<template>
  <div ref="wrap" class="relative select-none">
    <svg
      :width="W"
      :height="H"
      :viewBox="`0 0 ${W} ${H}`"
      class="block touch-pan-y"
      role="img"
      aria-label="Verlauf von Körper und Mental"
      @pointermove="locate"
      @pointerdown="locate"
      @pointerleave="leave"
    >
      <!-- Raster -->
      <g class="text-muted-foreground">
        <template v-for="v in [0, 50, 100]" :key="v">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(v)" :y2="y(v)" stroke="currentColor" stroke-opacity="0.18" stroke-width="1" />
          <text :x="PAD.left - 6" :y="y(v)" text-anchor="end" dominant-baseline="middle" fill="currentColor" font-size="10">{{ v }}</text>
        </template>
        <text
          v-for="t in xTicks"
          :key="t.i"
          :x="x(t.i)"
          :y="H - 6"
          :text-anchor="t.i === 0 ? 'start' : t.i === points.length - 1 ? 'end' : 'middle'"
          fill="currentColor"
          font-size="10"
        >{{ t.label }}</text>
      </g>

      <!-- Hilfslinie -->
      <line
        v-if="tip"
        :x1="tip.x"
        :x2="tip.x"
        :y1="PAD.top"
        :y2="PAD.top + plotH"
        class="text-foreground"
        stroke="currentColor"
        stroke-opacity="0.35"
        stroke-width="1"
      />

      <!-- Linien -->
      <path :d="path(series.body)" fill="none" stroke="var(--series-body)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <path :d="path(series.mind)" fill="none" stroke="var(--series-mind)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Punkte -->
      <g v-if="showDots">
        <template v-for="(v, i) in series.body" :key="`b${i}`">
          <circle v-if="v !== null" :cx="x(i)" :cy="y(v)" r="3" fill="var(--series-body)" stroke="var(--card)" stroke-width="1.5" />
        </template>
        <template v-for="(v, i) in series.mind" :key="`m${i}`">
          <circle v-if="v !== null" :cx="x(i)" :cy="y(v)" r="3" fill="var(--series-mind)" stroke="var(--card)" stroke-width="1.5" />
        </template>
      </g>

      <!-- Hervorhebung -->
      <g v-if="tip && active !== null">
        <circle v-if="tip.body !== null" :cx="tip.x" :cy="y(tip.body)" r="4.5" fill="var(--series-body)" stroke="var(--card)" stroke-width="2" />
        <circle v-if="tip.mind !== null" :cx="tip.x" :cy="y(tip.mind)" r="4.5" fill="var(--series-mind)" stroke="var(--card)" stroke-width="2" />
      </g>
    </svg>

    <div
      v-if="tip"
      class="bg-popover text-popover-foreground ring-foreground/10 pointer-events-none absolute top-0 z-10 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md ring-1"
      :style="tip.style"
    >
      <div class="font-medium whitespace-nowrap">
        {{ tip.label }}<span v-if="smooth" class="text-muted-foreground font-normal"> · 7-Tage-Schnitt</span>
      </div>
      <div class="mt-0.5 flex gap-3 tabular-nums">
        <span class="flex items-center gap-1"><span class="bg-series-body size-2 rounded-full" />Körper {{ fmt(tip.body) }}</span>
        <span class="flex items-center gap-1"><span class="bg-series-mind size-2 rounded-full" />Mental {{ fmt(tip.mind) }}</span>
      </div>
    </div>
  </div>
</template>

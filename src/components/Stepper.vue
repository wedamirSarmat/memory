<script setup lang="ts">
import { MinusIcon, PlusIcon } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label?: string
  hint?: string
  step?: number
  min?: number
  max?: number
  unit?: string
  /** Wert darf "nicht angegeben" (null) sein */
  nullable?: boolean
  format?: (v: number) => string
}>(), {
  step: 1,
  min: 0,
  max: 999,
})

const model = defineModel<number | null>({ required: true })

const display = computed(() => {
  if (model.value === null) return '–'
  const v = props.format ? props.format(model.value) : String(model.value).replace('.', ',')
  return props.unit ? `${v} ${props.unit}` : v
})

function round(v: number) {
  return Math.round(v * 100) / 100
}

function dec() {
  if (model.value === null) return
  const next = round(model.value - props.step)
  if (next < props.min) model.value = props.nullable ? null : props.min
  else model.value = next
}

function inc() {
  if (model.value === null) model.value = props.min
  else model.value = Math.min(props.max, round(model.value + props.step))
}
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div v-if="label" class="min-w-0">
      <div class="text-sm font-medium">
        {{ label }}
      </div>
      <div v-if="hint" class="text-muted-foreground text-xs">
        {{ hint }}
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        class="bg-muted hover:bg-muted/70 grid size-9 place-items-center rounded-full disabled:opacity-40"
        :disabled="model === null || (!nullable && model <= min)"
        :aria-label="`${label ?? 'Wert'} verringern`"
        @click="dec"
      >
        <MinusIcon class="size-4" />
      </button>
      <div
        class="min-w-18 text-center text-sm font-semibold tabular-nums"
        :class="model === null || model === 0 ? 'text-muted-foreground' : ''"
      >
        {{ display }}
      </div>
      <button
        type="button"
        class="bg-muted hover:bg-muted/70 grid size-9 place-items-center rounded-full disabled:opacity-40"
        :disabled="model !== null && model >= max"
        :aria-label="`${label ?? 'Wert'} erhöhen`"
        @click="inc"
      >
        <PlusIcon class="size-4" />
      </button>
    </div>
  </div>
</template>

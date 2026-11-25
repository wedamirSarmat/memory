<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  hint?: string
  lowLabel?: string
  highLabel?: string
  /** true = niedrige Werte sind gut (z. B. Stress) */
  invert?: boolean
  large?: boolean
}>(), {
  lowLabel: 'schlecht',
  highLabel: 'super',
})

const model = defineModel<number | null>({ required: true })

const isSet = computed(() => model.value !== null)

const sliderValue = computed({
  get: () => [model.value ?? 50],
  set: (v: number[] | undefined) => { model.value = v?.[0] ?? null },
})

const EMOJIS = ['😫', '🙁', '😐', '🙂', '😄']
const emoji = computed(() => {
  if (model.value === null) return '·'
  const v = props.invert ? 100 - model.value : model.value
  return EMOJIS[Math.min(4, Math.floor(v / 20))]
})
</script>

<template>
  <div class="space-y-2.5">
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0">
        <div :class="large ? 'text-base font-semibold' : 'text-sm font-medium'">
          {{ label }}
        </div>
        <div v-if="hint" class="text-muted-foreground text-xs">
          {{ hint }}
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="isSet"
          type="button"
          class="text-muted-foreground hover:text-foreground grid size-7 place-items-center rounded-full"
          aria-label="Wert zurücksetzen"
          @click="model = null"
        >
          <XIcon class="size-3.5" />
        </button>
        <div
          class="flex h-8 min-w-16 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-semibold tabular-nums transition-colors"
          :class="isSet ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
        >
          <span aria-hidden="true">{{ emoji }}</span>
          <span>{{ isSet ? model : '–' }}</span>
        </div>
      </div>
    </div>

    <SliderRoot
      v-model="sliderValue"
      :min="0"
      :max="100"
      :step="5"
      class="relative flex h-9 w-full touch-none items-center select-none"
      :aria-label="label"
    >
      <SliderTrack class="bg-muted relative h-2.5 grow overflow-hidden rounded-full">
        <SliderRange
          class="absolute h-full rounded-full transition-colors"
          :class="isSet ? 'bg-primary' : 'bg-transparent'"
        />
      </SliderTrack>
      <SliderThumb
        class="border-primary block size-7 rounded-full border-2 bg-white shadow-md transition-[box-shadow,opacity] outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        :class="isSet ? '' : 'border-muted-foreground/40 opacity-70'"
      />
    </SliderRoot>

    <div class="text-muted-foreground flex justify-between text-[11px]">
      <span>{{ lowLabel }}</span>
      <span>{{ highLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DumbbellIcon, RepeatIcon, TagIcon, UtensilsIcon } from '@lucide/vue'
import { CONFIDENCE_LABEL, type Effect, type FactorGroup } from '@/lib/stats'

defineProps<{ effect: Effect }>()

const GROUP_ICON = { food: UtensilsIcon, tag: TagIcon, activity: DumbbellIcon, habit: RepeatIcon }
const GROUP_LABEL: Record<FactorGroup, string> = { food: 'Lebensmittel', tag: 'Tag', activity: 'Aktivität', habit: 'Gewohnheit' }

/** Ab diesem Unterschied (Punkte) gilt etwas als spürbar */
const MIN_DIFF = 3

function signed(v: number) {
  const r = Math.round(v)
  return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : '±0'
}
function tone(e: Effect) {
  const r = Math.round(e.diff)
  if (!e.confidence) return 'text-muted-foreground'
  if (r >= MIN_DIFF) return 'text-emerald-600 dark:text-emerald-400'
  if (r <= -MIN_DIFF) return 'text-rose-600 dark:text-rose-400'
  return 'text-muted-foreground'
}
</script>

<template>
  <li class="flex items-center gap-3 py-2.5">
    <div class="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-lg" :title="GROUP_LABEL[effect.factor.group]">
      <component :is="GROUP_ICON[effect.factor.group]" class="size-4" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium">
        {{ effect.factor.label }}
      </div>
      <div class="text-muted-foreground truncate text-xs">
        an {{ effect.nWith }} {{ effect.nWith === 1 ? 'Tag' : 'Tagen' }} ·
        Ø {{ Math.round(effect.meanWith) }} statt {{ Math.round(effect.meanWithout) }}
      </div>
    </div>
    <div class="shrink-0 text-right">
      <div class="text-sm font-semibold tabular-nums" :class="tone(effect)">
        {{ signed(effect.diff) }}
      </div>
      <div class="text-muted-foreground flex items-center justify-end gap-1 text-[10px]">
        <span class="flex gap-0.5" aria-hidden="true">
          <span v-for="i in 3" :key="i" class="size-1.5 rounded-full" :class="i <= effect.confidence ? 'bg-foreground/60' : 'bg-foreground/15'" />
        </span>
        {{ CONFIDENCE_LABEL[effect.confidence] }}
      </div>
    </div>
  </li>
</template>

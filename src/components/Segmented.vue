<script setup lang="ts" generic="T extends string | number">
defineProps<{ options: { value: T, label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="bg-muted grid gap-1 rounded-xl p-1" :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="truncate rounded-lg px-1 py-1.5 text-xs font-medium transition"
      :class="model === o.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
      :aria-pressed="model === o.value"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>

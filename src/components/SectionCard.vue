<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  icon?: Component
  description?: string
}>()
</script>

<template>
  <section class="bg-card ring-foreground/5 rounded-2xl p-4 shadow-sm ring-1">
    <header class="mb-4 flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div v-if="icon" class="bg-primary/10 text-primary grid size-8 place-items-center rounded-xl">
          <component :is="icon" class="size-4" />
        </div>
        <div>
          <h2 class="text-[15px] leading-tight font-semibold">
            {{ title }}
          </h2>
          <p v-if="description" class="text-muted-foreground text-xs">
            {{ description }}
          </p>
        </div>
      </div>
      <slot name="action" />
    </header>
    <div class="space-y-5">
      <slot />
    </div>
  </section>
</template>

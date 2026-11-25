<script setup lang="ts">
import { ChartLineIcon, DatabaseIcon, HistoryIcon, PenLineIcon } from '@lucide/vue'
import { usePreferredDark } from '@vueuse/core'
import { onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import { requestPersistence } from '@/lib/backup'

const route = useRoute()
const dark = usePreferredDark()
watchEffect(() => document.documentElement.classList.toggle('dark', dark.value))

onMounted(() => { requestPersistence().catch(() => {}) })

const NAV = [
  { name: 'entry', label: 'Eintrag', icon: PenLineIcon },
  { name: 'history', label: 'Verlauf', icon: HistoryIcon },
  { name: 'stats', label: 'Statistik', icon: ChartLineIcon },
  { name: 'data', label: 'Daten', icon: DatabaseIcon },
] as const
</script>

<template>
  <div class="min-h-dvh">
    <main class="mx-auto max-w-md px-4 pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <RouterView />
    </main>

    <nav
      class="bg-background/85 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
      aria-label="Hauptnavigation"
    >
      <div class="mx-auto grid h-16 max-w-md grid-cols-4">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors"
          :class="route.name === item.name ? 'text-primary' : 'text-muted-foreground'"
        >
          <component :is="item.icon" class="size-5" :stroke-width="route.name === item.name ? 2.4 : 1.8" />
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>

    <Toaster position="top-center" :offset="{ top: 'calc(env(safe-area-inset-top) + 12px)' }" rich-colors />
  </div>
</template>

import { createRouter, createWebHashHistory } from 'vue-router'
import EntryView from '@/views/EntryView.vue'

export const router = createRouter({
  // Hash-Routing: funktioniert auf jedem statischen Hosting ohne Server-Konfiguration
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { name: 'entry' } },
    { path: '/eintrag/:date(\\d{4}-\\d{2}-\\d{2})?', name: 'entry', component: EntryView },
    { path: '/verlauf', name: 'history', component: () => import('@/views/HistoryView.vue') },
    { path: '/statistik', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/daten', name: 'data', component: () => import('@/views/DataView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

<script setup lang="ts">
import { DownloadIcon, ShieldCheckIcon, ShieldAlertIcon, UploadIcon } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import CatalogManager from '@/components/CatalogManager.vue'
import SectionCard from '@/components/SectionCard.vue'
import { Button } from '@/components/ui/button'
import { useData } from '@/composables/useData'
import { exportBackup, importBackup, requestPersistence } from '@/lib/backup'
import { getMeta } from '@/lib/db'

const { foods, activities, foodUsage, activityUsage, knownTags, days } = useData()

const tab = ref<'food' | 'activity' | 'backup'>('food')
const TABS = [
  { value: 'food', label: 'Lebensmittel' },
  { value: 'activity', label: 'Aktivitäten' },
  { value: 'backup', label: 'Backup' },
] as const

const persisted = ref<boolean | null>(null)
const lastExport = ref<number | undefined>()

onMounted(async () => {
  persisted.value = await navigator.storage?.persisted?.() ?? null
  lastExport.value = await getMeta<number>('lastExport')
})

async function doExport() {
  try {
    const r = await exportBackup()
    lastExport.value = Date.now()
    toast.success(r === 'shared' ? 'Backup geteilt' : 'Backup heruntergeladen')
  }
  catch (e) {
    if ((e as Error).name !== 'AbortError') toast.error(`Export fehlgeschlagen: ${(e as Error).message}`)
  }
}

const fileInput = ref<HTMLInputElement>()
async function onImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!window.confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return
  try {
    const r = await importBackup(file)
    toast.success(`Importiert: ${r.days} Tage, ${r.foods} Lebensmittel, ${r.activities} Aktivitäten`)
  }
  catch (err) {
    toast.error(`Import fehlgeschlagen: ${(err as Error).message}`)
  }
}

async function askPersist() {
  persisted.value = await requestPersistence()
  if (persisted.value) toast.success('Speicher ist jetzt dauerhaft geschützt')
  else toast.info('Der Browser hat abgelehnt. Am iPhone hilft: App zum Home-Bildschirm hinzufügen.')
}

const dateTimeFmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="space-y-4 pt-2 pb-8">
    <h1 class="text-xl font-semibold">
      Daten
    </h1>

    <div class="bg-muted grid grid-cols-3 gap-1 rounded-xl p-1">
      <button
        v-for="t in TABS"
        :key="t.value"
        type="button"
        class="rounded-lg py-2 text-sm font-medium transition"
        :class="tab === t.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
        @click="tab = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <CatalogManager v-if="tab === 'food'" kind="food" :items="foods" :usage="foodUsage" :known-tags="knownTags" />
    <CatalogManager v-else-if="tab === 'activity'" kind="activity" :items="activities" :usage="activityUsage" />

    <template v-else>
      <SectionCard :icon="DownloadIcon" title="Sicherung" description="Deine Daten liegen nur auf diesem Gerät.">
        <p class="text-muted-foreground text-sm">
          {{ days.length }} Tage · {{ foods.length }} Lebensmittel · {{ activities.length }} Aktivitäten
          <br>
          Letztes Backup:
          <span class="text-foreground font-medium">{{ lastExport ? dateTimeFmt.format(lastExport) : 'noch nie' }}</span>
        </p>
        <div class="grid grid-cols-2 gap-2">
          <Button size="lg" class="h-11" @click="doExport">
            <DownloadIcon /> Exportieren
          </Button>
          <Button size="lg" variant="outline" class="h-11" @click="fileInput?.click()">
            <UploadIcon /> Importieren
          </Button>
        </div>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onImport">
        <p class="text-muted-foreground text-xs">
          Tipp: Am iPhone „In Dateien sichern“ wählen, z. B. in iCloud Drive. Einmal pro Woche reicht.
        </p>
      </SectionCard>

      <SectionCard
        :icon="persisted ? ShieldCheckIcon : ShieldAlertIcon"
        title="Speicherschutz"
      >
        <p class="text-muted-foreground text-sm">
          <template v-if="persisted">
            Der Browser löscht deine Daten nicht automatisch.
          </template>
          <template v-else>
            Ohne Schutz darf der Browser die Daten bei Speichermangel löschen.
            Am iPhone: Teilen → „Zum Home-Bildschirm“ und die App von dort öffnen.
          </template>
        </p>
        <Button v-if="!persisted" variant="outline" @click="askPersist">
          Schutz anfordern
        </Button>
      </SectionCard>
    </template>
  </div>
</template>

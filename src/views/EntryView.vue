<script setup lang="ts">
import {
  BrainIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CoffeeIcon,
  CopyIcon,
  DumbbellIcon,
  HeartPulseIcon,
  MoonIcon,
  NotebookPenIcon,
  SaveIcon,
  Trash2Icon,
  UtensilsIcon,
  XIcon,
} from '@lucide/vue'
import { useActiveElement } from '@vueuse/core'
import { computed, ref, toRaw, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import ItemPicker from '@/components/ItemPicker.vue'
import ScoreSlider from '@/components/ScoreSlider.vue'
import SectionCard from '@/components/SectionCard.vue'
import Stepper from '@/components/Stepper.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/composables/useData'
import { addDays, longLabel, relativeLabel, today, yesterday } from '@/lib/dates'
import { db, type DayEntry, emptyDay, MEAL_SLOTS, type MealSlot } from '@/lib/db'

const route = useRoute()
const router = useRouter()
const { foods, activities, foodUsage, activityUsage, foodById, activityById, knownTags } = useData()

const date = computed(() => (route.params.date as string | undefined) || yesterday())
const canGoForward = computed(() => date.value < yesterday())

const form = ref<DayEntry>(emptyDay(date.value))
const snapshot = ref('')
const exists = computed(() => form.value.id !== undefined)
const dirty = computed(() => JSON.stringify(form.value) !== snapshot.value)
const loading = ref(true)

async function load(d: string) {
  loading.value = true
  const existing = await db.days.where('date').equals(d).first()
  form.value = existing ? structuredClone(existing) : emptyDay(d)
  snapshot.value = JSON.stringify(form.value)
  loading.value = false
}
watch(date, load, { immediate: true })

function confirmDiscard() {
  return !dirty.value || window.confirm('Ungespeicherte Änderungen verwerfen?')
}

onBeforeRouteLeave(() => confirmDiscard())

function goto(d: string) {
  if (d > today()) return
  if (!confirmDiscard()) return
  snapshot.value = JSON.stringify(form.value) // verhindert doppelte Nachfrage
  router.push({ name: 'entry', params: { date: d === yesterday() ? undefined : d } })
}

// ---------- Essen ----------
const slot = ref<MealSlot>('breakfast')

const mealsBySlot = computed(() => MEAL_SLOTS
  .map(s => ({ ...s, items: form.value.meals.filter(m => m.slot === s.value) }))
  .filter(s => s.items.length))

const foodsInSlot = computed(() => form.value.meals.filter(m => m.slot === slot.value).map(m => m.foodId))

function addFood(foodId: number) {
  if (form.value.meals.some(m => m.foodId === foodId && m.slot === slot.value)) return
  form.value.meals.push({ foodId, slot: slot.value })
}

function removeFood(foodId: number, s: MealSlot) {
  form.value.meals = form.value.meals.filter(m => !(m.foodId === foodId && m.slot === s))
}

async function copyMealsFromPrevious() {
  const prev = await db.days.where('date').below(date.value).reverse().first()
  if (!prev?.meals.length) {
    toast.info('Kein früherer Tag mit Essen gefunden.')
    return
  }
  let added = 0
  for (const m of prev.meals) {
    if (!form.value.meals.some(x => x.foodId === m.foodId && x.slot === m.slot)) {
      form.value.meals.push({ ...m })
      added++
    }
  }
  toast.success(`${added} Einträge von ${relativeLabel(prev.date)} übernommen`)
}

// ---------- Bewegung ----------
const INTENSITIES = [
  { value: 30, label: 'locker' },
  { value: 60, label: 'mittel' },
  { value: 90, label: 'hart' },
]

function addActivity(activityId: number) {
  form.value.activities.push({ activityId, minutes: 30, intensity: 60 })
}

function removeActivity(i: number) {
  form.value.activities.splice(i, 1)
}

// ---------- Meditation ----------
const meditated = computed({
  get: () => form.value.meditationMinutes > 0,
  set: (v: boolean) => { form.value.meditationMinutes = v ? (form.value.meditationMinutes || 10) : 0 },
})
const meditationMinutes = computed({
  get: () => form.value.meditationMinutes as number | null,
  set: (v: number | null) => { form.value.meditationMinutes = v ?? 0 },
})

// Stepper erwarten number|null – Zähler sind nie null
function counter(key: 'alcoholDrinks' | 'caffeineCups' | 'waterGlasses') {
  return computed({
    get: () => form.value[key] as number | null,
    set: (v: number | null) => { form.value[key] = v ?? 0 },
  })
}
const alcohol = counter('alcoholDrinks')
const caffeine = counter('caffeineCups')
const water = counter('waterGlasses')

function formatHours(v: number) {
  const h = Math.floor(v)
  const m = Math.round((v - h) * 60)
  return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`
}

// ---------- Speichern ----------
const saving = ref(false)

// Beim Tippen (Tastatur offen) die schwebende Speichern-Leiste ausblenden
const activeEl = useActiveElement()
const typing = computed(() => {
  const el = activeEl.value
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  return el.tagName === 'INPUT' && ['text', 'search'].includes((el as HTMLInputElement).type)
})

async function save() {
  saving.value = true
  try {
    const data = structuredClone(toRaw(form.value))
    data.updatedAt = Date.now()
    const id = await db.days.put(data)
    form.value.id = id
    form.value.updatedAt = data.updatedAt
    snapshot.value = JSON.stringify(form.value)
    if (form.value.feelingBody === null || form.value.feelingMind === null)
      toast.warning('Gespeichert, aber ohne Befinden zählt der Tag nicht für die Statistik.')
    else
      toast.success('Gespeichert ✓')
  }
  catch (e) {
    toast.error(`Speichern fehlgeschlagen: ${(e as Error).message}`)
  }
  finally {
    saving.value = false
  }
}

const deleteOpen = ref(false)
async function remove() {
  if (form.value.id === undefined) return
  await db.days.delete(form.value.id)
  toast.success('Eintrag gelöscht')
  await load(date.value)
}
</script>

<template>
  <div class="space-y-4 pb-28">
    <!-- Datum -->
    <header class="flex items-center justify-between gap-2 pt-2">
      <Button variant="ghost" size="icon-lg" aria-label="Vorheriger Tag" @click="goto(addDays(date, -1))">
        <ChevronLeftIcon class="size-5" />
      </Button>
      <div class="text-center">
        <div class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {{ exists ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }}
        </div>
        <h1 class="text-xl font-semibold">
          {{ relativeLabel(date) }}
        </h1>
        <div class="text-muted-foreground text-xs">
          {{ longLabel(date) }}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Nächster Tag"
        :disabled="!canGoForward"
        @click="goto(addDays(date, 1))"
      >
        <ChevronRightIcon class="size-5" />
      </Button>
    </header>

    <template v-if="!loading">
      <!-- Befinden zuerst: das ist die wichtigste Angabe -->
      <SectionCard :icon="HeartPulseIcon" title="Wie fühlst du dich heute Morgen?" description="Direkt nach dem Aufstehen">
        <ScoreSlider v-model="form.feelingBody" label="Körperlich" large low-label="kaputt" high-label="topfit" />
        <ScoreSlider v-model="form.feelingMind" label="Mental" large low-label="leer / gereizt" high-label="klar & motiviert" />
      </SectionCard>

      <!-- Essen -->
      <SectionCard :icon="UtensilsIcon" :title="`Essen ${relativeLabel(date) === 'Gestern' ? 'gestern' : 'an diesem Tag'}`">
        <template #action>
          <Button variant="ghost" size="sm" class="text-muted-foreground" @click="copyMealsFromPrevious">
            <CopyIcon /> Wie Vortag
          </Button>
        </template>

        <div v-if="mealsBySlot.length" class="space-y-3">
          <div v-for="s in mealsBySlot" :key="s.value">
            <div class="text-muted-foreground mb-1.5 text-xs font-medium">
              {{ s.label }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="m in s.items"
                :key="m.foodId"
                class="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium"
              >
                {{ foodById.get(m.foodId)?.name ?? '?' }}
                <button
                  type="button"
                  class="hover:bg-primary/15 grid size-6 place-items-center rounded-full"
                  :aria-label="`${foodById.get(m.foodId)?.name} entfernen`"
                  @click="removeFood(m.foodId, m.slot)"
                >
                  <XIcon class="size-3.5" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="bg-muted grid grid-cols-4 gap-1 rounded-xl p-1">
            <button
              v-for="s in MEAL_SLOTS"
              :key="s.value"
              type="button"
              class="rounded-lg py-1.5 text-xs font-medium transition"
              :class="slot === s.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'"
              @click="slot = s.value"
            >
              {{ s.label }}
            </button>
          </div>
          <ItemPicker
            kind="food"
            :items="foods"
            :usage="foodUsage"
            :exclude-ids="foodsInSlot"
            :known-tags="knownTags"
            placeholder="Gericht oder Lebensmittel …"
            @pick="addFood"
          />
        </div>

        <div class="border-t pt-4">
          <label class="text-sm font-medium" for="last-meal">Letzte Mahlzeit um</label>
          <div class="mt-1.5 flex items-center gap-2">
            <input
              id="last-meal"
              v-model="form.lastMealTime"
              type="time"
              class="border-input bg-background h-10 rounded-xl border px-3 text-base"
            >
            <Button v-if="form.lastMealTime" variant="ghost" size="sm" @click="form.lastMealTime = null">
              leeren
            </Button>
          </div>
        </div>
      </SectionCard>

      <!-- Schlaf -->
      <SectionCard :icon="MoonIcon" title="Schlaf letzte Nacht" description="Aus der Huawei-Health-App">
        <ScoreSlider v-model="form.sleepScore" label="Schlaf-Score" low-label="0" high-label="100" />
        <Stepper
          v-model="form.sleepHours"
          label="Schlafdauer"
          hint="Stunden:Minuten"
          :step="0.25"
          :min="2"
          :max="14"
          nullable
          unit="h"
          :format="formatHours"
        />
        <Stepper
          v-model="form.deepSleepPct"
          label="Tiefschlaf-Anteil"
          :step="1"
          :min="0"
          :max="60"
          nullable
          unit="%"
        />
      </SectionCard>

      <!-- Bewegung -->
      <SectionCard :icon="DumbbellIcon" title="Bewegung & Sport">
        <div v-if="form.activities.length" class="space-y-3">
          <div
            v-for="(a, i) in form.activities"
            :key="i"
            class="bg-muted/50 space-y-3 rounded-xl p-3"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ activityById.get(a.activityId)?.name ?? '?' }}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Aktivität entfernen" @click="removeActivity(i)">
                <XIcon />
              </Button>
            </div>
            <Stepper
              :model-value="a.minutes"
              label="Dauer"
              :step="5"
              :min="5"
              :max="600"
              unit="min"
              @update:model-value="v => a.minutes = v ?? 5"
            />
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="it in INTENSITIES"
                :key="it.value"
                type="button"
                class="rounded-lg border py-1.5 text-xs font-medium transition"
                :class="a.intensity === it.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'"
                @click="a.intensity = it.value"
              >
                {{ it.label }}
              </button>
            </div>
          </div>
        </div>
        <ItemPicker
          kind="activity"
          :items="activities"
          :usage="activityUsage"
          :exclude-ids="form.activities.map(a => a.activityId)"
          placeholder="Aktivität hinzufügen …"
          :max-chips="8"
          @pick="addActivity"
        />
        <Stepper
          v-model="form.outdoorMinutes"
          label="Zeit draußen"
          hint="Tageslicht, frische Luft"
          :step="15"
          :max="720"
          nullable
          unit="min"
        />
      </SectionCard>

      <!-- Kopf -->
      <SectionCard :icon="BrainIcon" title="Stress & Achtsamkeit">
        <ScoreSlider v-model="form.stress" label="Stresslevel am Tag" invert low-label="entspannt" high-label="sehr gestresst" />
        <div class="flex items-center justify-between">
          <label for="meditated" class="text-sm font-medium">Meditiert</label>
          <Switch id="meditated" v-model="meditated" class="data-[state=unchecked]:bg-muted-foreground/30" />
        </div>
        <Stepper
          v-if="meditated"
          v-model="meditationMinutes"
          label="Dauer"
          :step="5"
          :min="5"
          :max="180"
          unit="min"
        />
        <Stepper
          v-model="form.screenTimeHours"
          label="Bildschirmzeit (privat)"
          hint="Laut iPhone-Bildschirmzeit"
          :step="0.5"
          :max="16"
          nullable
          unit="h"
        />
      </SectionCard>

      <!-- Genussmittel -->
      <SectionCard :icon="CoffeeIcon" title="Getränke">
        <Stepper v-model="caffeine" label="Kaffee / Koffein" hint="Tassen" />
        <Stepper v-model="alcohol" label="Alkohol" hint="Gläser (Bier, Wein …)" />
        <Stepper v-model="water" label="Wasser" hint="Gläser à 0,25 l" :max="30" />
      </SectionCard>

      <!-- Notiz -->
      <SectionCard :icon="NotebookPenIcon" title="Notiz" description="Optional – Besonderheiten des Tages">
        <Textarea v-model="form.note" placeholder="z. B. Kopfschmerzen, Feier, Reise …" class="min-h-20 text-base" />
      </SectionCard>

      <div v-if="exists" class="flex justify-center pt-2">
        <Button variant="ghost" class="text-destructive" @click="deleteOpen = true">
          <Trash2Icon /> Eintrag löschen
        </Button>
      </div>
    </template>

    <!-- Speichern-Leiste -->
    <div v-show="!typing" class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3">
      <div class="mx-auto max-w-md">
        <Button
          size="lg"
          class="h-12 w-full rounded-2xl text-base shadow-lg transition disabled:opacity-100"
          :class="!dirty && exists ? 'bg-secondary text-muted-foreground' : ''"
          :disabled="saving || loading || (!dirty && exists)"
          @click="save"
        >
          <SaveIcon class="size-5" />
          {{ !dirty && exists ? 'Gespeichert' : 'Speichern' }}
        </Button>
      </div>
    </div>

    <AlertDialog v-model:open="deleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Eintrag für {{ longLabel(date) }} wird endgültig gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-white" @click="remove">
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { CombineIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import ItemDialog from '@/components/ItemDialog.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type CatalogKind, deleteItem, mergeItems, type UsageInfo } from '@/lib/catalog'
import { relativeLabel } from '@/lib/dates'
import { matchScore } from '@/lib/search'

interface Item { id?: number, name: string, key: string, tags?: string[], createdAt: number }

const props = defineProps<{
  kind: CatalogKind
  items: Item[]
  usage: Map<number, UsageInfo>
  knownTags?: string[]
}>()

const query = ref('')
const sortBy = ref<'usage' | 'name'>('usage')

const filtered = computed(() => {
  const q = query.value.trim()
  const list = props.items
    .filter(i => !q || matchScore(q, i.name) > 0 || i.tags?.some(t => matchScore(q, t) >= 50))
  return list.sort((a, b) => sortBy.value === 'name'
    ? a.name.localeCompare(b.name, 'de')
    : (props.usage.get(b.id!)?.count ?? 0) - (props.usage.get(a.id!)?.count ?? 0) || a.name.localeCompare(b.name, 'de'))
})

// Bearbeiten / Anlegen
const editOpen = ref(false)
const editing = ref<Item | null>(null)
function edit(item: Item | null) {
  editing.value = item
  editOpen.value = true
}

// Zusammenführen
const mergeOpen = ref(false)
const mergeFrom = ref<Item | null>(null)
const mergeQuery = ref('')
const mergeTargets = computed(() => {
  const q = mergeQuery.value.trim()
  return props.items
    .filter(i => i.id !== mergeFrom.value?.id && (!q || matchScore(q, i.name) > 0))
    .slice(0, 30)
})
function startMerge(item: Item) {
  mergeFrom.value = item
  mergeQuery.value = ''
  mergeOpen.value = true
}
async function doMerge(into: Item) {
  if (!mergeFrom.value) return
  const from = mergeFrom.value
  if (!window.confirm(`„${from.name}“ in „${into.name}“ zusammenführen? Alle Einträge werden umgeschrieben.`)) return
  await mergeItems(props.kind, from.id!, into.id!)
  mergeOpen.value = false
  toast.success(`„${from.name}“ → „${into.name}“ zusammengeführt`)
}

async function remove(item: Item) {
  const used = props.usage.get(item.id!)?.count ?? 0
  if (used > 0) {
    toast.error(`„${item.name}“ wird an ${used} Tagen verwendet. Nutze „Zusammenführen“.`)
    return
  }
  if (!window.confirm(`„${item.name}“ löschen?`)) return
  await deleteItem(props.kind, item.id!)
  toast.success('Gelöscht')
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-2">
      <div class="relative flex-1">
        <SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          v-model="query"
          type="search"
          :placeholder="kind === 'food' ? 'Lebensmittel oder Tag suchen …' : 'Aktivität suchen …'"
          class="border-input bg-background focus-visible:ring-ring/40 h-10 w-full rounded-xl border pr-3 pl-9 text-base outline-none focus-visible:ring-3"
        >
      </div>
      <Button size="icon-lg" class="size-10 rounded-xl" aria-label="Neu anlegen" @click="edit(null)">
        <PlusIcon class="size-5" />
      </Button>
    </div>

    <div class="text-muted-foreground flex items-center justify-between text-xs">
      <span>{{ filtered.length }} {{ filtered.length === 1 ? 'Eintrag' : 'Einträge' }}</span>
      <button type="button" class="font-medium" @click="sortBy = sortBy === 'usage' ? 'name' : 'usage'">
        Sortiert nach {{ sortBy === 'usage' ? 'Häufigkeit' : 'Name' }} ⇅
      </button>
    </div>

    <ul class="bg-card ring-foreground/5 divide-y overflow-hidden rounded-2xl shadow-sm ring-1">
      <li v-for="item in filtered" :key="item.id" class="flex items-center gap-2 py-2.5 pr-1.5 pl-3.5">
        <button type="button" class="min-w-0 flex-1 text-left" @click="edit(item)">
          <div class="truncate text-sm font-medium">
            {{ item.name }}
          </div>
          <div class="text-muted-foreground truncate text-xs">
            {{ usage.get(item.id!)?.count ?? 0 }}×
            <template v-if="usage.get(item.id!)?.lastDate">
              · zuletzt {{ relativeLabel(usage.get(item.id!)!.lastDate!) }}
            </template>
            <template v-if="item.tags?.length">
              · {{ item.tags.join(', ') }}
            </template>
          </div>
        </button>
        <Button variant="ghost" size="icon" aria-label="Bearbeiten" @click="edit(item)">
          <PencilIcon />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Zusammenführen" @click="startMerge(item)">
          <CombineIcon />
        </Button>
        <Button variant="ghost" size="icon" class="text-destructive" aria-label="Löschen" @click="remove(item)">
          <Trash2Icon />
        </Button>
      </li>
      <li v-if="!filtered.length" class="text-muted-foreground p-6 text-center text-sm">
        Nichts gefunden.
      </li>
    </ul>

    <ItemDialog v-model:open="editOpen" :kind="kind" :item="editing" :known-tags="knownTags" />

    <Dialog v-model:open="mergeOpen">
      <DialogContent class="top-[max(1rem,env(safe-area-inset-top))] max-h-[80dvh] translate-y-0 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>„{{ mergeFrom?.name }}“ zusammenführen mit …</DialogTitle>
          <DialogDescription>
            Für Dubletten wie „Haferflocken“ und „Haferflocken mit Milch“: Alle Einträge zeigen danach auf das Ziel.
          </DialogDescription>
        </DialogHeader>
        <input
          v-model="mergeQuery"
          type="search"
          placeholder="Ziel suchen …"
          class="border-input bg-background h-10 w-full rounded-xl border px-3 text-base outline-none"
        >
        <ul class="divide-y rounded-xl border">
          <li v-for="t in mergeTargets" :key="t.id">
            <button type="button" class="hover:bg-muted w-full px-3 py-2.5 text-left text-sm" @click="doMerge(t)">
              {{ t.name }}
              <span class="text-muted-foreground text-xs">({{ usage.get(t.id!)?.count ?? 0 }}×)</span>
            </button>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  </div>
</template>

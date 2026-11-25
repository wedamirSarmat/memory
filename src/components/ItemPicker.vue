<script setup lang="ts">
import { PlusIcon, SearchIcon, XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import ItemDialog from '@/components/ItemDialog.vue'
import { type CatalogKind, createItem, suggestionRank, type UsageInfo } from '@/lib/catalog'
import { normalize } from '@/lib/db'
import { findSimilar, matchScore } from '@/lib/search'

interface Item { id?: number, name: string, key: string, tags?: string[], createdAt: number }

const props = withDefaults(defineProps<{
  kind: CatalogKind
  items: Item[]
  usage: Map<number, UsageInfo>
  excludeIds?: number[]
  knownTags?: string[]
  placeholder?: string
  maxChips?: number
}>(), {
  excludeIds: () => [],
  maxChips: 10,
})

const emit = defineEmits<{ pick: [id: number] }>()

const query = ref('')
const inputEl = ref<HTMLInputElement>()
const dialogOpen = ref(false)

const available = computed(() => props.items.filter(i => !props.excludeIds.includes(i.id!)))

/** Vorschläge ohne Suchbegriff: häufig & kürzlich benutzt */
const chips = computed(() => {
  return [...available.value]
    .sort((a, b) =>
      suggestionRank(props.usage.get(b.id!)) - suggestionRank(props.usage.get(a.id!))
      || b.createdAt - a.createdAt)
    .slice(0, props.maxChips)
})

const results = computed(() => {
  const q = query.value.trim()
  if (!q) return []
  return available.value
    .map(i => ({ item: i, score: matchScore(q, i.name) + Math.min(10, suggestionRank(props.usage.get(i.id!))) }))
    .filter(r => r.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(r => r.item)
})

/** Exakt gleicher Name existiert schon (evtl. bereits ausgewählt) */
const exact = computed(() => {
  const k = normalize(query.value)
  return k ? props.items.find(i => i.key === k) : undefined
})

const similar = computed(() => {
  if (exact.value || !query.value.trim()) return undefined
  return findSimilar(query.value, props.items)
})

function pick(id: number) {
  emit('pick', id)
  query.value = ''
  // Fokus nur behalten, wenn per Enter aus dem Suchfeld gewählt wurde –
  // sonst ginge am iPhone bei jedem Chip-Tippen die Tastatur auf
  if (document.activeElement !== inputEl.value) inputEl.value?.blur()
}

async function create() {
  const name = query.value.trim()
  if (!name) return
  if (exact.value) {
    if (!props.excludeIds.includes(exact.value.id!)) pick(exact.value.id!)
    return
  }
  if (props.kind === 'food') {
    dialogOpen.value = true
  }
  else {
    pick(await createItem('activity', name))
  }
}

function onEnter() {
  if (results.value[0]) pick(results.value[0].id!)
  else create()
}
</script>

<template>
  <div class="space-y-3">
    <div class="relative">
      <SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        enterkeyhint="done"
        autocomplete="off"
        autocapitalize="sentences"
        :placeholder="placeholder ?? 'Suchen oder neu anlegen …'"
        class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-11 w-full rounded-xl border pr-10 pl-9 text-base outline-none focus-visible:ring-3"
        @keydown.enter.prevent="onEnter"
      >
      <button
        v-if="query"
        type="button"
        class="text-muted-foreground absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full"
        aria-label="Suche leeren"
        @click="query = ''"
      >
        <XIcon class="size-4" />
      </button>
    </div>

    <!-- Suchergebnisse -->
    <div v-if="query.trim()" class="divide-y overflow-hidden rounded-xl border">
      <button
        v-for="item in results"
        :key="item.id"
        type="button"
        class="hover:bg-muted active:bg-muted flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        @click="pick(item.id!)"
      >
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium">{{ item.name }}</span>
          <span v-if="item.tags?.length" class="text-muted-foreground block truncate text-xs">
            {{ item.tags.join(' · ') }}
          </span>
        </span>
        <span class="text-muted-foreground shrink-0 text-xs tabular-nums">
          {{ usage.get(item.id!)?.count ?? 0 }}×
        </span>
      </button>

      <button
        v-if="!exact || !excludeIds.includes(exact.id!)"
        type="button"
        class="text-primary hover:bg-primary/5 flex w-full items-start gap-2 px-3 py-2.5 text-left"
        @click="create"
      >
        <PlusIcon class="mt-0.5 size-4 shrink-0" />
        <span class="min-w-0 text-sm">
          <template v-if="exact">„{{ exact.name }}“ hinzufügen</template>
          <template v-else>
            „{{ query.trim() }}“ neu anlegen
            <span v-if="similar" class="text-muted-foreground block text-xs">
              Achtung, ähnlich wie „{{ similar.name }}“. Meintest du das?
            </span>
          </template>
        </span>
      </button>
      <div v-else class="text-muted-foreground px-3 py-2.5 text-sm">
        „{{ exact.name }}“ ist schon eingetragen.
      </div>
    </div>

    <!-- Häufig benutzt -->
    <div v-else-if="chips.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="item in chips"
        :key="item.id"
        type="button"
        class="bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-95 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition"
        @click="pick(item.id!)"
      >
        <PlusIcon class="text-muted-foreground size-3.5" />
        {{ item.name }}
      </button>
    </div>

    <ItemDialog
      v-if="kind === 'food'"
      v-model:open="dialogOpen"
      kind="food"
      :initial-name="query.trim()"
      :known-tags="knownTags"
      @saved="pick"
    />
  </div>
</template>

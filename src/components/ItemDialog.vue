<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type CatalogKind, createItem, updateItem } from '@/lib/catalog'
import { PRESET_TAGS } from '@/lib/db'

const props = defineProps<{
  kind: CatalogKind
  /** Beim Bearbeiten: vorhandener Eintrag */
  item?: { id?: number, name: string, tags?: string[] } | null
  initialName?: string
  /** Alle bereits benutzten Tags (für Vorschläge) */
  knownTags?: string[]
}>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [id: number] }>()

const name = ref('')
const tags = ref<string[]>([])
const customTag = ref('')

watch(open, (o) => {
  if (!o) return
  name.value = props.item?.name ?? props.initialName ?? ''
  tags.value = [...(props.item?.tags ?? [])]
  customTag.value = ''
})

const allTags = computed(() => {
  const set = new Set([...PRESET_TAGS, ...(props.knownTags ?? []), ...tags.value])
  return [...set]
})

const title = computed(() => {
  const what = props.kind === 'food' ? 'Lebensmittel / Gericht' : 'Aktivität'
  return props.item?.id ? `${what} bearbeiten` : `Neu: ${what}`
})

function toggleTag(t: string) {
  tags.value = tags.value.includes(t) ? tags.value.filter(x => x !== t) : [...tags.value, t]
}

function addCustomTag() {
  const t = customTag.value.trim()
  if (!t) return
  const existing = allTags.value.find(x => x.toLowerCase() === t.toLowerCase())
  const tag = existing ?? t.charAt(0).toUpperCase() + t.slice(1)
  if (!tags.value.includes(tag)) tags.value.push(tag)
  customTag.value = ''
}

async function save() {
  const n = name.value.trim()
  if (!n) return
  try {
    let id: number
    if (props.item?.id) {
      await updateItem(props.kind, props.item.id, n, props.kind === 'food' ? tags.value : undefined)
      id = props.item.id
    }
    else {
      id = await createItem(props.kind, n, tags.value)
    }
    emit('saved', id)
    open.value = false
  }
  catch (e) {
    toast.error((e as Error).message)
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="top-[max(1rem,env(safe-area-inset-top))] max-h-[85dvh] translate-y-0 overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="kind === 'food'">
          Tags helfen der Statistik: Einzelne Gerichte sind selten, „Gluten“ oder „Laktose“ dagegen oft.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="save">
        <div class="space-y-1.5">
          <Label for="item-name">Name</Label>
          <Input id="item-name" v-model="name" class="h-10" autocomplete="off" />
        </div>

        <div v-if="kind === 'food'" class="space-y-2">
          <Label>Tags</Label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="t in allTags"
              :key="t"
              type="button"
              class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="tags.includes(t)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground hover:text-foreground'"
              @click="toggleTag(t)"
            >
              {{ t }}
            </button>
          </div>
          <div class="flex gap-2">
            <Input
              v-model="customTag"
              placeholder="Eigener Tag …"
              class="h-9"
              @keydown.enter.prevent="addCustomTag"
            />
            <Button type="button" variant="outline" size="icon-lg" aria-label="Tag hinzufügen" @click="addCustomTag">
              <PlusIcon />
            </Button>
          </div>
        </div>

        <DialogFooter class="flex-row justify-end gap-2">
          <Button type="button" variant="ghost" @click="open = false">
            Abbrechen
          </Button>
          <Button type="submit" size="lg" :disabled="!name.trim()">
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

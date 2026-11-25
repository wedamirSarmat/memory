import { liveQuery } from 'dexie'
import { onScopeDispose, type Ref, shallowRef, watch, type WatchSource } from 'vue'

/**
 * Reaktive Dexie-Abfrage: aktualisiert sich automatisch, wenn sich die DB ändert.
 * Optional mit `deps`, bei deren Änderung die Abfrage neu gestartet wird.
 */
export function useLiveQuery<T>(querier: () => T | Promise<T>, initial: T, deps?: WatchSource[]): Ref<T> {
  const value = shallowRef(initial) as Ref<T>
  let sub: { unsubscribe: () => void } | undefined

  const start = () => {
    sub?.unsubscribe()
    sub = liveQuery(querier).subscribe({
      next: (v) => { value.value = v },
      error: (e) => { console.error('liveQuery', e) },
    })
  }

  if (deps?.length) watch(deps, start, { immediate: true })
  else start()

  onScopeDispose(() => sub?.unsubscribe())
  return value
}

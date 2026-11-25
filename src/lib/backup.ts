import { db, setMeta } from './db'
import { today } from './dates'

export interface BackupFile {
  app: 'memory'
  version: 1
  exportedAt: string
  days: unknown[]
  foods: unknown[]
  activities: unknown[]
}

export async function buildBackup(): Promise<BackupFile> {
  const [days, foods, activities] = await Promise.all([
    db.days.toArray(),
    db.foods.toArray(),
    db.activities.toArray(),
  ])
  return { app: 'memory', version: 1, exportedAt: new Date().toISOString(), days, foods, activities }
}

/**
 * Exportiert alle Daten als JSON. Auf dem iPhone öffnet sich das Teilen-Menü
 * (z. B. "In Dateien sichern"), sonst wird die Datei heruntergeladen.
 */
export async function exportBackup(): Promise<'shared' | 'downloaded'> {
  const data = await buildBackup()
  const json = JSON.stringify(data, null, 2)
  const filename = `memory-backup-${today()}.json`
  const file = new File([json], filename, { type: 'application/json' })

  let result: 'shared' | 'downloaded'
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Memory Backup' })
    result = 'shared'
  }
  else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    result = 'downloaded'
  }
  await setMeta('lastExport', Date.now())
  return result
}

export async function importBackup(file: File): Promise<{ days: number, foods: number, activities: number }> {
  const text = await file.text()
  const data = JSON.parse(text) as BackupFile
  if (data?.app !== 'memory' || !Array.isArray(data.days) || !Array.isArray(data.foods) || !Array.isArray(data.activities))
    throw new Error('Das ist keine gültige Memory-Sicherung.')

  await db.transaction('rw', db.days, db.foods, db.activities, async () => {
    await Promise.all([db.days.clear(), db.foods.clear(), db.activities.clear()])
    await db.foods.bulkAdd(data.foods as never[])
    await db.activities.bulkAdd(data.activities as never[])
    await db.days.bulkAdd(data.days as never[])
  })
  return { days: data.days.length, foods: data.foods.length, activities: data.activities.length }
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

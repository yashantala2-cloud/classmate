import { db } from '../db/db'
import type { BackupFile } from '../types'

export async function exportBackup(): Promise<BackupFile> {
  const [profile, classes, students, subjects, exams, marks] = await Promise.all([
    db.profile.get(1),
    db.classes.toArray(),
    db.students.toArray(),
    db.subjects.toArray(),
    db.exams.toArray(),
    db.marks.toArray(),
  ])
  return {
    version: 1,
    exportedAt: Date.now(),
    profile: profile ?? null,
    classes,
    students,
    subjects,
    exams,
    marks,
  }
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date(backup.exportedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `classmates-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Replaces all local data with the contents of a backup file. Destructive by design. */
export async function importBackup(backup: BackupFile): Promise<void> {
  if (backup.version !== 1) throw new Error('Unsupported backup file version')

  const tables = [db.profile, db.classes, db.students, db.subjects, db.exams, db.marks]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    if (backup.profile) await db.profile.put(backup.profile)
    await db.classes.bulkAdd(backup.classes)
    await db.students.bulkAdd(backup.students)
    await db.subjects.bulkAdd(backup.subjects)
    await db.exams.bulkAdd(backup.exams)
    await db.marks.bulkAdd(backup.marks)
  })
}

export async function clearAllData(): Promise<void> {
  const tables = [db.profile, db.classes, db.students, db.subjects, db.exams, db.marks]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
  })
}

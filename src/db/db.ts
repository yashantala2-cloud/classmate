import Dexie, { type Table } from 'dexie'
import type { Profile, SchoolClass, Student, Subject, Exam, MarkEntry } from '../types'

class ClassmateDB extends Dexie {
  profile!: Table<Profile, number>
  classes!: Table<SchoolClass, string>
  students!: Table<Student, string>
  subjects!: Table<Subject, string>
  exams!: Table<Exam, string>
  marks!: Table<MarkEntry, string>

  constructor() {
    super('classmate-db', { autoOpen: false })
    this.version(1).stores({
      profile: 'id',
      classes: 'id, name, createdAt',
      students: 'id, classId, rollNo, [classId+rollNo]',
      subjects: 'id, classId',
      exams: 'id, classId, subjectId, type, [subjectId+type]',
      marks: 'id, examId, rollNo, [examId+rollNo]',
    })
  }
}

export const db = new ClassmateDB()

const DB_NAME = 'classmate-db'

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    // Blocked means another tab still has the (incompatible) database open —
    // there's nothing destructive to finish here since deletion hasn't
    // happened, so it's safe to just give up waiting rather than hang.
    req.onblocked = () => resolve()
  })
}

/**
 * GitHub Pages user sites (*.github.io) share one origin across every
 * project hosted under that account, and IndexedDB is scoped to the origin,
 * not the path — so a same-named leftover database from anything else ever
 * served at this origin could in principle already exist with an
 * incompatible (newer) schema version, which permanently breaks every write
 * with no visible error. That is the ONLY condition this recovers from by
 * deleting local data: a real `VersionError` from actually trying to open.
 *
 * Everything else — a slow open, another tab holding the database open,
 * a transient failure — is left alone and simply surfaces to the caller.
 * A slow/blocked open is not evidence of corruption, and treating it as
 * such would delete a real user's data on nothing more than a slow device
 * or a flaky connection, which is far worse than leaving them to retry.
 */
export async function ensureCompatibleDatabase(): Promise<void> {
  try {
    await db.open()
    return
  } catch (err) {
    if (!(err instanceof Dexie.VersionError)) throw err
  }

  db.close()
  await deleteDatabase(DB_NAME)
  await db.open()
}

export function uid(): string {
  return crypto.randomUUID()
}

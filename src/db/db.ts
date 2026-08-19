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

/**
 * Opening or deleting an IndexedDB database can hang *indefinitely* — by
 * spec, not as a bug — when another tab/connection still has it open at an
 * older version: the browser just waits for that connection to close rather
 * than erroring. Racing any such call against a timeout turns that into "try
 * again" instead of a frozen app.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timed out')), timeoutMs)),
  ])
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

/**
 * GitHub Pages user sites (*.github.io) share one origin across every
 * project hosted under that account, and IndexedDB is scoped to the origin,
 * not the path — so a same-named leftover database from anything else ever
 * served at this origin could in principle already exist with an
 * incompatible schema, silently breaking every write with no visible error.
 * Try opening normally first; if that fails or hangs, wipe and recreate
 * rather than leaving the app stuck.
 */
export async function ensureCompatibleDatabase(): Promise<void> {
  const ATTEMPTS = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      await withTimeout(db.open(), 2500)
      return
    } catch (err) {
      lastError = err
      db.close()
      await withTimeout(deleteDatabase(DB_NAME), 2500).catch(() => {})
      // Re-opening immediately after a delete can transiently fail while the
      // browser finishes tearing down the old database — a short backoff
      // before the next attempt absorbs that instead of giving up on it.
      if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }

  console.error('ClassMates: could not open local database after retries', lastError)
  throw lastError
}

export function uid(): string {
  return crypto.randomUUID()
}

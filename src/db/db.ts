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
    super('classmate-db')
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
 * GitHub Pages user sites (*.github.io) share one origin across every
 * project hosted under that account, and IndexedDB is scoped to the origin,
 * not the path — so a same-named leftover database from anything else ever
 * served at this origin can already exist at a *higher* version than this
 * app defines. Dexie can only open a version >= what's on disk, so that
 * leftover silently breaks every write forever (profile save, roster save,
 * everything) with no visible error. Detect that specific case up front and
 * wipe the incompatible database rather than leaving the app permanently
 * stuck for anyone whose browser already has one.
 */
export async function ensureCompatibleDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = () => {
      req.result.close()
      resolve()
    }
    req.onupgradeneeded = () => {
      // First-ever open on this origin — let it create the schema normally.
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('database blocked by another open connection'))
  }).catch(async (err: unknown) => {
    const isVersionError = err instanceof DOMException && err.name === 'VersionError'
    if (!isVersionError) throw err

    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase(DB_NAME)
      del.onsuccess = () => resolve()
      del.onerror = () => reject(del.error)
      del.onblocked = () => resolve()
    })
  })
}

export function uid(): string {
  return crypto.randomUUID()
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { MarkEntry } from '../types'

// useLiveQuery returns `undefined` while the query is loading. db.profile.get(1)
// ALSO resolves to `undefined` once loaded if no profile row exists yet (fresh
// install) — normalize that case to `null` so callers can tell "still loading"
// apart from "loaded, no profile yet".
export function useProfile() {
  return useLiveQuery(async () => (await db.profile.get(1)) ?? null, [])
}

export function useActiveClass() {
  const profile = useProfile()
  return useLiveQuery(async () => {
    if (!profile?.activeClassId) return null
    return (await db.classes.get(profile.activeClassId)) ?? null
  }, [profile?.activeClassId])
}

export function useAllClasses() {
  return useLiveQuery(() => db.classes.orderBy('createdAt').toArray(), []) ?? []
}

/** Like useAllClasses, but stays `undefined` while loading instead of defaulting to
 * `[]` — for callers that must not treat "still loading" as "loaded, zero classes". */
export function useAllClassesLoaded() {
  return useLiveQuery(() => db.classes.orderBy('createdAt').toArray(), [])
}

export function useStudents(classId: string | null | undefined) {
  return (
    useLiveQuery(async () => {
      if (!classId) return []
      const list = await db.students.where('classId').equals(classId).toArray()
      return list.sort((a, b) => Number(a.rollNo) - Number(b.rollNo))
    }, [classId]) ?? []
  )
}

export function useSubjects(classId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!classId) return []
    return db.subjects.where('classId').equals(classId).toArray()
  }, [classId]) ?? []
}

export function useExams(classId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!classId) return []
    return db.exams.where('classId').equals(classId).toArray()
  }, [classId]) ?? []
}

export function useMarksForExam(examId: string | null | undefined) {
  return useLiveQuery(async () => {
    if (!examId) return new Map<string, MarkEntry>()
    const list = await db.marks.where('examId').equals(examId).toArray()
    return new Map(list.map((m) => [m.rollNo, m]))
  }, [examId]) ?? new Map<string, MarkEntry>()
}

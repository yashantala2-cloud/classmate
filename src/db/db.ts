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

export function uid(): string {
  return crypto.randomUUID()
}

export type ExamType = 'sessional1' | 'sessional2' | 'sessional3' | 'final'

export const EXAM_TYPES: ExamType[] = ['sessional1', 'sessional2', 'sessional3', 'final']

export const EXAM_LABELS: Record<ExamType, string> = {
  sessional1: 'Sessional 1',
  sessional2: 'Sessional 2',
  sessional3: 'Sessional 3',
  final: 'Final Exam',
}

export interface Profile {
  id: 1
  rollNo: string
  name: string
  activeClassId: string | null
}

export interface SchoolClass {
  id: string
  name: string
  createdAt: number
}

export interface Student {
  id: string
  classId: string
  rollNo: string
  name: string
}

export interface Subject {
  id: string
  classId: string
  name: string
  code: string
  /** Credit weight used only to determine Overall rank order across subjects; displayed marks are always unweighted. */
  credits: number
}

export interface Exam {
  id: string
  classId: string
  subjectId: string
  type: ExamType
  maxMarks: number
  createdAt: number
}

export interface MarkEntry {
  id: string
  examId: string
  rollNo: string
  marks: number | null
  absent: boolean
}

export interface BackupFile {
  version: 1
  exportedAt: number
  profile: Profile | null
  classes: SchoolClass[]
  students: Student[]
  subjects: Subject[]
  exams: Exam[]
  marks: MarkEntry[]
}

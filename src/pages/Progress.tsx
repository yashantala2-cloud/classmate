import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingUp, BookOpen, Code2, Network, Monitor, Calculator, FlaskConical } from 'lucide-react'
import { db } from '../db/db'
import { useActiveClass, useExams, useProfile, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type MarkEntry } from '../types'
import { classAverage } from '../lib/ranking'
import MiniTrendChart, { type TrendPoint } from '../components/MiniTrendChart'

const SUBJECT_ICONS = [Code2, Network, Monitor, BookOpen, Calculator, FlaskConical]
const TONES = ['blue', 'green', 'orange', 'purple'] as const

export default function Progress() {
  const profile = useProfile()
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const exams = useExams(activeClass?.id)

  const examIds = exams.map((e) => e.id)
  const marksByExam = useLiveQuery(async () => {
    const map = new Map<string, MarkEntry[]>()
    for (const examId of examIds) {
      map.set(examId, await db.marks.where('examId').equals(examId).toArray())
    }
    return map
  }, [examIds.join(',')])

  if (!activeClass) return <EmptyState text="Set up a class first." />
  if (subjects.length === 0) return <EmptyState text="Add a subject and upload marks to see progress." />
  if (!profile?.rollNo) return <EmptyState text="Set your roll number in Settings first." />

  return (
    <main className="screen">
      <section className="page-heading progress-heading">
        <div className="heading-icon blue">
          <TrendingUp size={24} />
        </div>
        <div>
          <h1>Your Progress</h1>
          <p>Marks as a % of max marks, across exams this semester.</p>
        </div>
      </section>

      <section className="progress-list">
        {subjects.map((subject, i) => {
          const subjectExams = exams.filter((e) => e.subjectId === subject.id)
          if (subjectExams.length === 0) return null

          const points: TrendPoint[] = EXAM_TYPES.map((type) => {
            const exam = subjectExams.find((e) => e.type === type)
            const label = EXAM_LABELS[type].replace('Sessional ', 'S').replace('Final Exam', 'Final')
            if (!exam) return { label, you: null, avg: null }

            const marks = marksByExam?.get(exam.id) ?? []
            const mine = marks.find((m) => m.rollNo === profile.rollNo)
            const you = mine && !mine.absent && mine.marks !== null ? (mine.marks / exam.maxMarks) * 100 : null
            const avgRaw = classAverage(marks)
            const avg = avgRaw !== null ? (avgRaw / exam.maxMarks) * 100 : null

            return { label, you, avg }
          })

          if (points.every((p) => p.you === null && p.avg === null)) return null

          const Icon = SUBJECT_ICONS[i % SUBJECT_ICONS.length]
          const tone = TONES[i % TONES.length]

          return (
            <article className="progress-card" key={subject.id}>
              <div className={`subject-icon ${tone}`}>
                <Icon size={25} />
              </div>
              <div className="subject-title">
                <b>{subject.name}</b>
                <span>
                  <i className="legend-you" /> Your Marks <i className="legend-avg" /> Class Average
                </span>
              </div>
              <button className={`details ${tone}`} type="button">
                <TrendingUp size={17} /> View details
              </button>
              <MiniTrendChart points={points} />
            </article>
          )
        })}
      </section>
    </main>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <main className="screen">
      <p className="help">{text}</p>
    </main>
  )
}

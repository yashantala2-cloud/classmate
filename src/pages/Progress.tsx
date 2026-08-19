import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useActiveClass, useExams, useProfile, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type MarkEntry } from '../types'
import { classAverage } from '../lib/ranking'
import MiniTrendChart, { TrendLegend, type TrendPoint } from '../components/MiniTrendChart'

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

  if (!activeClass) return <p className="text-ink-dim">Set up a class first.</p>
  if (subjects.length === 0) return <p className="text-ink-dim">Add a subject and upload marks to see progress.</p>
  if (!profile?.rollNo) return <p className="text-ink-dim">Set your roll number in Settings first.</p>

  const anyExams = exams.length > 0

  return (
    <div className="pt-2">
      <h1 className="text-xl font-display font-semibold text-navy-900 mb-1">Your Progress</h1>
      <p className="text-sm text-ink-dim mb-4">Marks as a % of max marks, across exams this semester.</p>

      {!anyExams && <p className="text-sm text-ink-dim mt-6">No marks uploaded yet.</p>}

      <div className="space-y-5">
        {subjects.map((subject) => {
          const subjectExams = exams.filter((e) => e.subjectId === subject.id)
          if (subjectExams.length === 0) return null

          const points: TrendPoint[] = EXAM_TYPES.map((type) => {
            const exam = subjectExams.find((e) => e.type === type)
            if (!exam) return { label: EXAM_LABELS[type].replace('Sessional ', 'S').replace('Final Exam', 'Final'), you: null, avg: null }

            const marks = marksByExam?.get(exam.id) ?? []
            const mine = marks.find((m) => m.rollNo === profile.rollNo)
            const you = mine && !mine.absent && mine.marks !== null ? (mine.marks / exam.maxMarks) * 100 : null
            const avgRaw = classAverage(marks)
            const avg = avgRaw !== null ? (avgRaw / exam.maxMarks) * 100 : null

            return {
              label: EXAM_LABELS[type].replace('Sessional ', 'S').replace('Final Exam', 'Final'),
              you,
              avg,
            }
          })

          if (points.every((p) => p.you === null && p.avg === null)) return null

          return (
            <div key={subject.id} className="border border-paper-line rounded-lg bg-white p-3.5">
              <p className="font-medium mb-2">{subject.name}</p>
              <MiniTrendChart points={points} />
            </div>
          )
        })}
      </div>

      {anyExams && (
        <div className="mt-4">
          <TrendLegend />
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, ChevronDown, Trophy, UserRound, Check } from 'lucide-react'
import { db } from '../db/db'
import { useActiveClass, useExams, useMarksForExam, useProfile, useStudents, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type ExamType } from '../types'
import { computeAggregateRanking, computeRanking, type RankRow } from '../lib/ranking'
import type { MarkEntry } from '../types'

const OVERALL = '__overall__'
const AVATAR_TONES = ['a0', 'a1', 'a2', 'a3', 'a4']

export default function Rankings() {
  const [params] = useSearchParams()
  const profile = useProfile()
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const exams = useExams(activeClass?.id)
  const students = useStudents(activeClass?.id)

  const [subjectId, setSubjectId] = useState(params.get('subjectId') ?? OVERALL)
  const [examType, setExamType] = useState<ExamType>((params.get('examType') as ExamType) ?? 'sessional1')

  const singleExam = exams.find((e) => e.subjectId === subjectId && e.type === examType)
  const singleMarks = useMarksForExam(subjectId !== OVERALL ? singleExam?.id : undefined)

  const overallExamIds = exams.filter((e) => e.type === examType).map((e) => e.id)
  const overallMarks = useLiveQuery(async () => {
    if (subjectId !== OVERALL) return new Map<string, Map<string, MarkEntry>>()
    const map = new Map<string, Map<string, MarkEntry>>()
    for (const examId of overallExamIds) {
      const list = await db.marks.where('examId').equals(examId).toArray()
      map.set(examId, new Map(list.map((m) => [m.rollNo, m])))
    }
    return map
  }, [subjectId, overallExamIds.join(',')]) ?? new Map<string, Map<string, MarkEntry>>()

  const examCredits = new Map(exams.map((e) => [e.id, subjects.find((s) => s.id === e.subjectId)?.credits ?? 1]))

  let rankRows: RankRow[] = []
  let title = ''
  if (subjectId === OVERALL) {
    rankRows = computeAggregateRanking(students, overallExamIds, overallMarks, examCredits)
    title = `Overall — ${EXAM_LABELS[examType]}`
  } else if (singleExam) {
    rankRows = computeRanking(students, singleMarks)
    title = `${subjects.find((s) => s.id === subjectId)?.name} — ${EXAM_LABELS[examType]}`
  }

  const myRow = rankRows.find((r) => r.rollNo === profile?.rollNo)

  if (!activeClass) return <EmptyState text="Set up a class first." />
  if (students.length === 0) return <EmptyState text="Add your class roster first." />

  return (
    <main className="screen">
      <section className="page-heading">
        <div className="heading-icon gold">
          <Trophy size={24} />
        </div>
        <h1>Ranking</h1>
      </section>

      <div style={{ position: 'relative' }}>
        <BarChart3 size={22} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="select"
          style={{ appearance: 'none', paddingLeft: 54, paddingRight: 46 }}
        >
          <option value={OVERALL}>Overall (all subjects)</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown size={22} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
      </div>

      {subjectId === OVERALL && (
        <p className="help" style={{ marginTop: 12 }}>
          Rank order is weighted by each subject's credits. Marks shown are always the actual total scored.
        </p>
      )}

      <div className="chips">
        {EXAM_TYPES.map((t) => (
          <button key={t} className={examType === t ? 'selected' : ''} onClick={() => setExamType(t)}>
            {EXAM_LABELS[t]}
          </button>
        ))}
      </div>

      {rankRows.length === 0 || rankRows.every((r) => r.marks === null) ? (
        <p className="help" style={{ marginTop: 20 }}>
          No marks uploaded yet for {title || 'this selection'}.
        </p>
      ) : (
        <>
          {myRow && myRow.rank !== null && (
            <section className="rank-summary">
              <div>
                <label>YOUR RANK</label>
                <strong>#{myRow.rank}</strong>
                <span>
                  <UserRound size={16} /> Out of {students.length} students
                </span>
              </div>
              <div className="divider" />
              <div>
                <label>YOUR MARKS</label>
                <strong>{myRow.marks}</strong>
                <span className="good">
                  <Check size={16} /> Keep it up!
                </span>
              </div>
              <Trophy className="summary-trophy" size={115} />
            </section>
          )}

          <section className="leaderboard">
            <div className="table-head">
              <b>RANK</b>
              <b>NAME</b>
              <b>ROLL</b>
              <b>MARKS</b>
            </div>
            {rankRows.map((r, i) => (
              <div key={r.rollNo} className={`student-row ${r.rollNo === profile?.rollNo ? 'me' : ''}`}>
                <span className={`rank ${r.rank !== null && r.rank <= 3 ? `medal m${r.rank}` : ''}`}>{r.rank ?? '—'}</span>
                <span className={`avatar ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>{r.name.charAt(0).toUpperCase()}</span>
                <span className="student-name">
                  <span className="student-name-text">{r.name}</span>
                  {r.rollNo === profile?.rollNo && <em className="you-badge">YOU</em>}
                </span>
                <span className="roll-cell">{r.rollNo}</span>
                <strong>{r.absent ? 'AB' : (r.marks ?? '—')}</strong>
              </div>
            ))}
          </section>
        </>
      )}
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

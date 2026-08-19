import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useActiveClass, useExams, useMarksForExam, useProfile, useStudents, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type ExamType } from '../types'
import { computeAggregateRanking, computeRanking, type RankRow } from '../lib/ranking'
import type { MarkEntry } from '../types'

const OVERALL = '__overall__'

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

  let rankRows: RankRow[] = []
  let title = ''
  if (subjectId === OVERALL) {
    rankRows = computeAggregateRanking(students, overallExamIds, overallMarks)
    title = `Overall — ${EXAM_LABELS[examType]}`
  } else if (singleExam) {
    rankRows = computeRanking(students, singleMarks)
    title = `${subjects.find((s) => s.id === subjectId)?.name} — ${EXAM_LABELS[examType]}`
  }

  const myRow = rankRows.find((r) => r.rollNo === profile?.rollNo)

  if (!activeClass) return <p className="text-ink-dim">Set up a class first.</p>
  if (students.length === 0) return <p className="text-ink-dim">Add your class roster first.</p>

  return (
    <div className="pt-2">
      <h1 className="text-xl font-display font-semibold text-navy-900 mb-4">Ranking</h1>

      <div className="flex gap-2 mb-3">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="flex-1 border border-paper-line rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-navy-700"
        >
          <option value={OVERALL}>Overall (all subjects)</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {EXAM_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setExamType(t)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              examType === t ? 'bg-navy-900 text-white border-navy-900' : 'border-paper-line text-ink-dim'
            }`}
          >
            {EXAM_LABELS[t]}
          </button>
        ))}
      </div>

      {rankRows.length === 0 || rankRows.every((r) => r.marks === null) ? (
        <p className="text-sm text-ink-dim mt-6">No marks uploaded yet for {title || 'this selection'}.</p>
      ) : (
        <>
          {myRow && myRow.rank !== null && (
            <div className="bg-navy-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gold-400 uppercase tracking-wide">Your rank</p>
                <p className="text-2xl font-display font-semibold">#{myRow.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gold-400 uppercase tracking-wide">Your marks</p>
                <p className="text-2xl font-display font-semibold">{myRow.marks}</p>
              </div>
            </div>
          )}

          <div className="border border-paper-line rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-[3rem_1fr_4rem_3.5rem] bg-paper-dim text-xs font-semibold uppercase tracking-wide text-ink-dim px-3 py-2">
              <span>Rank</span>
              <span>Name</span>
              <span>Roll</span>
              <span className="text-right">Marks</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {rankRows.map((r) => (
                <div
                  key={r.rollNo}
                  className={`grid grid-cols-[3rem_1fr_4rem_3.5rem] ledger-row items-center px-0 ${
                    r.rollNo === profile?.rollNo ? 'bg-gold-200/45' : ''
                  }`}
                >
                  <span className="px-3 py-2 text-sm font-medium text-ink-dim">{r.rank ?? '—'}</span>
                  <span className="px-2 py-2 text-sm truncate">{r.name}</span>
                  <span className="px-2 py-2 text-sm text-ink-faint">{r.rollNo}</span>
                  <span className="px-3 py-2 text-sm text-right font-medium">
                    {r.absent ? <span className="text-critical">AB</span> : r.marks ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

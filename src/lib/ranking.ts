import type { MarkEntry, Student } from '../types'

export interface RankRow {
  rollNo: string
  name: string
  marks: number | null
  absent: boolean
  rank: number | null
}

/** Dense-ranks students by marks descending. Absent/ungraded students sort last with no rank. */
export function computeRanking(students: Student[], marksByRoll: Map<string, MarkEntry>): RankRow[] {
  const rows: RankRow[] = students.map((s) => {
    const m = marksByRoll.get(s.rollNo)
    const absent = m?.absent ?? false
    const marks = !m || absent ? null : m.marks
    return { rollNo: s.rollNo, name: s.name, marks, absent, rank: null }
  })

  const graded = rows.filter((r) => r.marks !== null).sort((a, b) => b.marks! - a.marks!)
  let rank = 0
  let prevMarks: number | null = null
  let position = 0
  for (const row of graded) {
    position += 1
    if (row.marks !== prevMarks) {
      rank = position
      prevMarks = row.marks
    }
    row.rank = rank
  }

  const ungraded = rows.filter((r) => r.marks === null)
  return [...graded, ...ungraded]
}

/**
 * Sums marks per roll number across a set of exams (e.g. all subjects'
 * Sessional 1) to produce an Overall ranking. Rank order is determined by
 * credit-weighted marks (marks x each exam's subject credit) — a subject
 * worth more credits counts for more in the ranking — but the `marks` shown
 * on every row is always the plain, unweighted total actually scored.
 * `examCredits` maps examId to its subject's credit weight; missing entries
 * default to 1 (neutral — matches subjects created before credits existed).
 */
export function computeAggregateRanking(
  students: Student[],
  examIds: string[],
  marksByExamRoll: Map<string, Map<string, MarkEntry>>,
  examCredits: Map<string, number>,
): RankRow[] {
  const totals = new Map<string, { actual: number; weighted: number; anyPresent: boolean; allAbsent: boolean }>()
  for (const s of students) {
    totals.set(s.rollNo, { actual: 0, weighted: 0, anyPresent: false, allAbsent: true })
  }

  for (const examId of examIds) {
    const marksByRoll = marksByExamRoll.get(examId)
    if (!marksByRoll) continue
    const credit = examCredits.get(examId) ?? 1
    for (const s of students) {
      const entry = totals.get(s.rollNo)!
      const m = marksByRoll.get(s.rollNo)
      if (m && !m.absent && m.marks !== null) {
        entry.actual += m.marks
        entry.weighted += m.marks * credit
        entry.anyPresent = true
        entry.allAbsent = false
      }
    }
  }

  const rows: (RankRow & { weighted: number })[] = students.map((s) => {
    const entry = totals.get(s.rollNo)!
    return {
      rollNo: s.rollNo,
      name: s.name,
      marks: entry.anyPresent ? entry.actual : null,
      weighted: entry.weighted,
      absent: entry.allAbsent,
      rank: null,
    }
  })

  const graded = rows.filter((r) => r.marks !== null).sort((a, b) => b.weighted - a.weighted)
  let rank = 0
  let prevWeighted: number | null = null
  let position = 0
  for (const row of graded) {
    position += 1
    if (row.weighted !== prevWeighted) {
      rank = position
      prevWeighted = row.weighted
    }
    row.rank = rank
  }
  const ungraded = rows.filter((r) => r.marks === null)
  return [...graded, ...ungraded].map(({ weighted: _weighted, ...rest }) => rest)
}

export function classAverage(marks: MarkEntry[]): number | null {
  const graded = marks.filter((m) => !m.absent && m.marks !== null)
  if (graded.length === 0) return null
  const sum = graded.reduce((acc, m) => acc + (m.marks ?? 0), 0)
  return sum / graded.length
}

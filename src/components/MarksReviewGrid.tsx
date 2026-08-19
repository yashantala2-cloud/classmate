import { useState } from 'react'
import type { Student } from '../types'

export interface MarksRow {
  rollNo: string
  name: string
  marksRaw: string
  absent: boolean
}

export function buildMarksRows(students: Student[], parsed: Map<string, string>): MarksRow[] {
  return students.map((s) => {
    const raw = parsed.get(s.rollNo)
    const absent = raw?.toUpperCase() === 'AB'
    return { rollNo: s.rollNo, name: s.name, marksRaw: absent ? '' : raw ?? '', absent }
  })
}

/**
 * Editable roll-number + marks table, pre-filled from a best-effort PDF/OCR
 * parse against the known class roster. Every row must be confirmed before
 * saving since misreads directly affect everyone's rank.
 */
export default function MarksReviewGrid({
  initialRows,
  maxMarks,
  onConfirm,
}: {
  initialRows: MarksRow[]
  maxMarks: number | null
  onConfirm: (rows: MarksRow[]) => void
}) {
  const [rows, setRows] = useState<MarksRow[]>(initialRows)

  function update(index: number, patch: Partial<MarksRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const filledCount = rows.filter((r) => r.absent || r.marksRaw.trim() !== '').length
  const overMax = maxMarks != null && rows.some((r) => Number(r.marksRaw) > maxMarks)

  return (
    <div>
      <p className="text-sm text-ink-dim mb-3">
        Check every mark below — automatic reading makes mistakes, especially from photos. Mark absentees with AB.
      </p>

      <div className="border border-paper-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[4rem_1fr_5rem_3.5rem] bg-paper-dim text-xs font-semibold uppercase tracking-wide text-ink-dim px-3 py-2">
          <span>Roll</span>
          <span>Name</span>
          <span>Marks</span>
          <span>AB</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div
              key={row.rollNo}
              className={`grid grid-cols-[4rem_1fr_5rem_3.5rem] ledger-row items-center ${
                !row.absent && row.marksRaw.trim() === '' ? 'bg-gold-200/70' : ''
              }`}
            >
              <span className="px-3 py-2 text-sm text-ink-dim">{row.rollNo}</span>
              <span className="px-2 py-2 text-sm truncate">{row.name}</span>
              <input
                value={row.marksRaw}
                onChange={(e) => update(i, { marksRaw: e.target.value.replace(/[^\d.]/g, ''), absent: false })}
                disabled={row.absent}
                inputMode="decimal"
                className="px-2 py-2 text-sm bg-transparent outline-none focus:bg-gold-200/40 disabled:opacity-30 w-16"
              />
              <label className="flex items-center justify-center py-2">
                <input
                  type="checkbox"
                  checked={row.absent}
                  onChange={(e) => update(i, { absent: e.target.checked, marksRaw: e.target.checked ? '' : row.marksRaw })}
                  className="h-4 w-4 accent-maroon-700"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {overMax && (
        <p className="mt-2 text-sm text-critical">
          Some marks exceed the max marks ({maxMarks}) — double check those rows.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-dim">{filledCount} of {rows.length} filled</p>
        <button
          onClick={() => onConfirm(rows)}
          className="bg-navy-900 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          Confirm & save
        </button>
      </div>
    </div>
  )
}

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

const GRID_COLS = '3.5rem 1fr 4.5rem 3rem'

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
      <p className="help" style={{ marginBottom: 16 }}>
        Check every mark below — automatic reading makes mistakes, especially from photos. Mark absentees with AB.
      </p>

      <div className="review-table">
        <div className="review-table-head" style={{ gridTemplateColumns: GRID_COLS }}>
          <span>Roll</span>
          <span>Name</span>
          <span>Marks</span>
          <span>AB</span>
        </div>
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {rows.map((row, i) => (
            <div
              key={row.rollNo}
              className={`review-row ${!row.absent && row.marksRaw.trim() === '' ? 'needs-input' : ''}`}
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 15 }}>{row.rollNo}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15 }}>{row.name}</span>
              <input
                value={row.marksRaw}
                onChange={(e) => update(i, { marksRaw: e.target.value.replace(/[^\d.]/g, ''), absent: false })}
                disabled={row.absent}
                inputMode="decimal"
                style={{ opacity: row.absent ? 0.3 : 1 }}
              />
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  checked={row.absent}
                  onChange={(e) => update(i, { absent: e.target.checked, marksRaw: e.target.checked ? '' : row.marksRaw })}
                  style={{ width: 18, height: 18, accentColor: '#bf3037' }}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {overMax && (
        <p style={{ marginTop: 10, fontSize: 14, color: '#bf3037' }}>
          Some marks exceed the max marks ({maxMarks}) — double check those rows.
        </p>
      )}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p className="help">
          {filledCount} of {rows.length} filled
        </p>
        <button onClick={() => onConfirm(rows)} className="save" style={{ width: 'max-content' }}>
          Confirm & save
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'

export interface RosterRow {
  rollNo: string
  name: string
}

const GRID_COLS = '4.5rem 1fr 2.5rem'

/**
 * Editable roll-number + name table shown after parsing a roster PDF/Excel.
 * Nothing is saved until the student confirms — parsing is a best guess.
 */
export default function RosterReviewGrid({
  initialRows,
  onConfirm,
}: {
  initialRows: RosterRow[]
  onConfirm: (rows: RosterRow[]) => void
}) {
  const [rows, setRows] = useState<RosterRow[]>(initialRows)

  function update(index: number, field: keyof RosterRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }
  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }
  function addRow() {
    setRows((prev) => [...prev, { rollNo: '', name: '' }])
  }

  const validCount = rows.filter((r) => r.rollNo.trim() && r.name.trim()).length

  return (
    <div>
      <p className="help" style={{ marginBottom: 16 }}>
        Check every row below — automatic reading makes mistakes. Fix, add, or remove rows, then confirm.
      </p>

      <div className="review-table">
        <div className="review-table-head" style={{ gridTemplateColumns: GRID_COLS }}>
          <span>Roll No</span>
          <span>Name</span>
          <span />
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {rows.map((row, i) => (
            <div key={i} className="review-row" style={{ gridTemplateColumns: GRID_COLS }}>
              <input value={row.rollNo} onChange={(e) => update(i, 'rollNo', e.target.value)} inputMode="numeric" />
              <input value={row.name} onChange={(e) => update(i, 'name', e.target.value)} style={{ minWidth: 0 }} />
              <button
                onClick={() => remove(i)}
                aria-label="Remove row"
                style={{ border: 0, background: 'transparent', color: 'var(--muted)', display: 'grid', placeItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={addRow} className="btn-secondary" style={{ border: 'none', color: 'var(--navy)', marginTop: 10, width: 'max-content' }}>
        + Add row
      </button>

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="help">
          {validCount} of {rows.length} rows valid
        </p>
        <button
          onClick={() => onConfirm(rows.filter((r) => r.rollNo.trim() && r.name.trim()))}
          disabled={validCount === 0}
          className="save"
          style={{ width: 'max-content', opacity: validCount === 0 ? 0.4 : 1 }}
        >
          Confirm & save
        </button>
      </div>
    </div>
  )
}

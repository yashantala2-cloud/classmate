import { useState } from 'react'

export interface RosterRow {
  rollNo: string
  name: string
}

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
      <p className="text-sm text-ink-dim mb-3">
        Check every row below — automatic reading makes mistakes. Fix, add, or remove rows, then confirm.
      </p>

      <div className="border border-paper-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[4.5rem_1fr_2.5rem] bg-paper-dim text-xs font-semibold uppercase tracking-wide text-ink-dim px-3 py-2">
          <span>Roll No</span>
          <span>Name</span>
          <span />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_1fr_2.5rem] ledger-row items-center">
              <input
                value={row.rollNo}
                onChange={(e) => update(i, 'rollNo', e.target.value)}
                inputMode="numeric"
                className="px-3 py-2 text-sm bg-transparent outline-none focus:bg-gold-200/30"
              />
              <input
                value={row.name}
                onChange={(e) => update(i, 'name', e.target.value)}
                className="px-3 py-2 text-sm bg-transparent outline-none focus:bg-gold-200/30 min-w-0"
              />
              <button
                onClick={() => remove(i)}
                aria-label="Remove row"
                className="text-ink-faint hover:text-maroon-700 text-lg"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={addRow}
        className="mt-2 text-sm font-medium text-navy-800 hover:text-navy-700"
      >
        + Add row
      </button>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-ink-dim">{validCount} of {rows.length} rows valid</p>
        <button
          onClick={() => onConfirm(rows.filter((r) => r.rollNo.trim() && r.name.trim()))}
          disabled={validCount === 0}
          className="bg-navy-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-40"
        >
          Confirm & save
        </button>
      </div>
    </div>
  )
}

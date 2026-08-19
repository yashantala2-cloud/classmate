import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, uid } from '../db/db'
import { useAllClasses, useProfile } from '../hooks/useAppData'
import RosterReviewGrid, { type RosterRow } from '../components/RosterReviewGrid'
import { extractPdfRows, extractRollNamePairs } from '../lib/pdfParser'
import { extractRollNamePairsFromExcel } from '../lib/excelParser'

type Step = 'pick' | 'name' | 'upload' | 'review'

export default function ClassSetup() {
  const navigate = useNavigate()
  const profile = useProfile()
  const classes = useAllClasses()
  const fileInput = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(classes.length ? 'pick' : 'name')
  const [className, setClassName] = useState('')
  const [parsedRows, setParsedRows] = useState<RosterRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function selectClass(classId: string) {
    if (!profile) return
    await db.profile.put({ ...profile, activeClassId: classId })
    navigate('/')
  }

  async function handleFile(file: File) {
    setError(null)
    setBusy('Reading file…')
    try {
      let pairs: RosterRow[]
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const rows = await extractPdfRows(file)
        pairs = extractRollNamePairs(rows)
      } else {
        pairs = await extractRollNamePairsFromExcel(file)
      }
      if (pairs.length === 0) {
        setError("Couldn't find roll numbers and names automatically — you can still add rows by hand below.")
        pairs = [{ rollNo: '', name: '' }]
      }
      setParsedRows(pairs)
      setStep('review')
    } catch {
      setError('Could not read that file. Try a clearer PDF or an Excel sheet, or add students by hand.')
      setParsedRows([{ rollNo: '', name: '' }])
      setStep('review')
    } finally {
      setBusy(null)
    }
  }

  async function confirmRoster(rows: RosterRow[]) {
    setBusy('Saving…')
    const classId = uid()
    await db.classes.add({ id: classId, name: className.trim(), createdAt: Date.now() })
    await db.students.bulkAdd(
      rows.map((r) => ({ id: uid(), classId, rollNo: r.rollNo.trim(), name: r.name.trim() })),
    )
    const current = profile ?? { id: 1 as const, rollNo: '', name: '', activeClassId: null }
    await db.profile.put({ ...current, activeClassId: classId })
    setBusy(null)
    navigate('/')
  }

  return (
    <div className="pt-2">
      <h1 className="text-xl font-display font-semibold text-navy-900 mb-1">Class Setup</h1>

      {step === 'pick' && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-ink-dim mb-2">Choose a class or add a new one.</p>
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => selectClass(c.id)}
              className="w-full text-left border border-paper-line rounded-lg px-4 py-3.5 bg-white hover:border-navy-700 flex items-center justify-between"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-ink-faint">→</span>
            </button>
          ))}
          <button
            onClick={() => setStep('name')}
            className="w-full border-2 border-dashed border-paper-line rounded-lg px-4 py-3.5 text-navy-800 font-medium"
          >
            + Add a new class
          </button>
        </div>
      )}

      {step === 'name' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-dim">
            Name your class the way your department would recognize it, e.g. "IT 5 E".
          </p>
          <input
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. IT 5 E"
            autoFocus
            className="w-full border border-paper-line rounded-lg px-3.5 py-3 text-base outline-none focus:border-navy-700"
          />
          <button
            onClick={() => className.trim() && setStep('upload')}
            disabled={!className.trim()}
            className="w-full bg-navy-900 text-white font-medium py-3.5 rounded-lg disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-ink-dim">
            Upload your class roll number list — a PDF or Excel sheet with roll numbers and names.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
            className="w-full border-2 border-dashed border-navy-700/40 rounded-lg px-4 py-8 text-navy-800 font-medium flex flex-col items-center gap-2"
          >
            <span className="text-2xl">📄</span>
            {busy ?? 'Choose PDF or Excel file'}
          </button>
          <button
            onClick={() => {
              setParsedRows([{ rollNo: '', name: '' }])
              setStep('review')
            }}
            className="w-full text-navy-800 font-medium py-2 text-sm"
          >
            Or add students by hand instead
          </button>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div className="mt-4">
          {error && <p className="text-sm text-critical mb-3">{error}</p>}
          <RosterReviewGrid initialRows={parsedRows} onConfirm={confirmRoster} />
          {busy && <p className="text-sm text-ink-dim mt-2">{busy}</p>}
        </div>
      )}
    </div>
  )
}

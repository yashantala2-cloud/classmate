import { useRef, useState, type RefObject } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { GraduationCap, ArrowRight, FileText, Users } from 'lucide-react'
import { db, uid } from '../db/db'
import { useAllClassesLoaded, useProfile } from '../hooks/useAppData'
import RosterReviewGrid, { type RosterRow } from '../components/RosterReviewGrid'
import { extractPdfRows, extractRollNamePairs } from '../lib/pdfParser'
import { extractRollNamePairsFromExcel } from '../lib/excelParser'
import { MAX_CLASSES, type SchoolClass, type Profile } from '../types'

type Step = 'pick' | 'name' | 'upload' | 'review'

export default function ClassSetup() {
  const navigate = useNavigate()
  const profile = useProfile()
  const loadedClasses = useAllClassesLoaded()
  const fileInput = useRef<HTMLInputElement>(null)

  // Still loading from IndexedDB — must not decide pick-vs-name yet, since
  // `classes` briefly reads as empty for every user regardless of how many
  // classes actually exist, which would bypass both the picker and its
  // MAX_CLASSES limit for anyone who already had classes.
  if (loadedClasses === undefined) return null

  return <ClassSetupLoaded classes={loadedClasses} profile={profile} navigate={navigate} fileInput={fileInput} />
}

function ClassSetupLoaded({
  classes,
  profile,
  navigate,
  fileInput,
}: {
  classes: SchoolClass[]
  profile: Profile | null | undefined
  navigate: NavigateFunction
  fileInput: RefObject<HTMLInputElement | null>
}) {
  const [step, setStep] = useState<Step>(classes.length > 0 ? 'pick' : 'name')
  const [className, setClassName] = useState('')
  const [parsedRows, setParsedRows] = useState<RosterRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const atClassLimit = classes.length >= MAX_CLASSES

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
    if (atClassLimit) {
      setError(`You can have up to ${MAX_CLASSES} classes at a time.`)
      return
    }
    setBusy('Saving…')
    const classId = uid()
    await db.classes.add({ id: classId, name: className.trim(), createdAt: Date.now() })
    await db.students.bulkAdd(rows.map((r) => ({ id: uid(), classId, rollNo: r.rollNo.trim(), name: r.name.trim() })))
    const current = profile ?? { id: 1 as const, rollNo: '', name: '', activeClassId: null }
    await db.profile.put({ ...current, activeClassId: classId })
    setBusy(null)
    navigate('/')
  }

  return (
    <main className="screen">
      <section className="page-heading">
        <div className="heading-icon purple">
          <Users size={24} />
        </div>
        <h1>Class Setup</h1>
      </section>

      {step === 'pick' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <p className="help">Choose a class or add a new one.</p>
          {classes.map((c) => (
            <button key={c.id} onClick={() => selectClass(c.id)} className="class-card">
              <GraduationCap size={23} />
              <span>{c.name}</span>
              <ArrowRight size={19} />
            </button>
          ))}
          <button onClick={() => !atClassLimit && setStep('name')} className="add-class" disabled={atClassLimit}>
            + Add a new class
          </button>
          {atClassLimit && <p className="class-limit-note">You can have up to {MAX_CLASSES} classes at a time.</p>}
        </div>
      )}

      {step === 'name' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="help">Name your class the way your department would recognize it, e.g. "IT 5 E".</p>
          <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. IT 5 E" autoFocus className="field-input" />
          <button onClick={() => className.trim() && setStep('upload')} disabled={!className.trim()} className="continue">
            Continue
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="help">Upload your class roll number list — a PDF or Excel sheet with roll numbers and names.</p>
          <input ref={fileInput} type="file" accept=".pdf,.xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', border: '2px dashed var(--line)', color: 'var(--navy)', fontWeight: 600, fontSize: 17 }}
          >
            <FileText size={30} color="var(--purple)" />
            {busy ?? 'Choose PDF or Excel file'}
          </button>
          <button
            onClick={() => {
              setParsedRows([{ rollNo: '', name: '' }])
              setStep('review')
            }}
            className="btn-secondary"
            style={{ border: 'none', color: 'var(--navy)' }}
          >
            Or add students by hand instead
          </button>
          {error && <p style={{ color: '#bf3037', fontSize: 15 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          {error && <p style={{ color: '#bf3037', fontSize: 15, marginBottom: 12 }}>{error}</p>}
          <RosterReviewGrid initialRows={parsedRows} onConfirm={confirmRoster} />
          {busy && <p className="help" style={{ marginTop: 10 }}>{busy}</p>}
        </div>
      )}
    </main>
  )
}

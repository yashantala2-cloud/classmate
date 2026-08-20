import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CloudUpload, BookOpen, ChevronDown, FileText, Check, Hash, Camera } from 'lucide-react'
import { db, uid } from '../db/db'
import { useActiveClass, useStudents, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type ExamType } from '../types'
import { extractPdfTokens } from '../lib/pdfParser'
import { extractImageTokens, type OcrProgress } from '../lib/ocrParser'
import { extractExcelTokens } from '../lib/excelParser'
import { pairRollsWithMarks } from '../lib/tableExtract'
import MarksReviewGrid, { buildMarksRows, type MarksRow } from '../components/MarksReviewGrid'

type Step = 'setup' | 'source' | 'review'
const EXAM_ICON_TONES = ['', 'e1', 'e2', 'e3']

export default function UploadMarks() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const students = useStudents(activeClass?.id)
  const fileInput = useRef<HTMLInputElement>(null)

  const [subjectId, setSubjectId] = useState(params.get('subjectId') ?? '')
  const [examType, setExamType] = useState<ExamType>((params.get('examType') as ExamType) ?? 'sessional1')
  const [maxMarks, setMaxMarks] = useState('')
  const [step, setStep] = useState<Step>('setup')
  const [rows, setRows] = useState<MarksRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const expectedRolls = students.map((s) => s.rollNo)

  async function handleFile(file: File) {
    setError(null)
    setBusy('Reading file…')
    try {
      let tokens: string[]
      const lower = file.name.toLowerCase()
      if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
        tokens = await extractPdfTokens(file)
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
        tokens = await extractExcelTokens(file)
      } else {
        tokens = await extractImageTokens(file, (p: OcrProgress) =>
          setBusy(`Reading photo… ${Math.round(p.progress * 100)}%`),
        )
      }
      const parsed = pairRollsWithMarks(tokens, expectedRolls)
      setRows(buildMarksRows(students, parsed))
      setStep('review')
    } catch {
      setError('Could not read that file. Try a clearer photo/PDF, or fill marks in by hand below.')
      setRows(buildMarksRows(students, new Map()))
      setStep('review')
    } finally {
      setBusy(null)
    }
  }

  async function confirmMarks(finalRows: MarksRow[]) {
    if (!activeClass || !subjectId) return
    setBusy('Saving…')

    let exam = await db.exams.where({ subjectId, type: examType }).first()
    const examId = exam?.id ?? uid()
    if (!exam) {
      await db.exams.add({
        id: examId,
        classId: activeClass.id,
        subjectId,
        type: examType,
        maxMarks: Number(maxMarks) || 100,
        createdAt: Date.now(),
      })
    } else if (maxMarks) {
      await db.exams.update(examId, { maxMarks: Number(maxMarks) })
    }

    await db.marks.where('examId').equals(examId).delete()
    await db.marks.bulkAdd(
      finalRows
        .filter((r) => r.absent || r.marksRaw.trim() !== '')
        .map((r) => ({
          id: uid(),
          examId,
          rollNo: r.rollNo,
          marks: r.absent ? null : Number(r.marksRaw),
          absent: r.absent,
        })),
    )
    setBusy(null)
    navigate(`/rankings?subjectId=${subjectId}&examType=${examType}`)
  }

  if (!activeClass) return <EmptyState text="Set up a class first." />
  if (students.length === 0) return <EmptyState text="Add your class roster first, from Class Setup." />

  return (
    <main className="screen upload-screen">
      <section className="page-heading upload-heading">
        <div className="heading-icon purple">
          <CloudUpload size={25} />
        </div>
        <div>
          <h1>Upload Marks</h1>
          <p>Select the details below to upload marks for your class.</p>
        </div>
      </section>

      {step === 'setup' && (
        <>
          <label className="field-label">Subject</label>
          <div style={{ position: 'relative' }}>
            <BookOpen size={22} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="select subject-select"
              style={{ appearance: 'none', paddingLeft: 54, paddingRight: 46 }}
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={22} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          </div>

          <label className="field-label">Exam</label>
          <div className="exam-grid">
            {EXAM_TYPES.map((t, i) => (
              <button key={t} className={`exam-card ${examType === t ? 'selected' : ''}`} onClick={() => setExamType(t)}>
                <span className={`exam-icon ${EXAM_ICON_TONES[i]}`}>
                  <FileText size={22} />
                </span>
                <span>{EXAM_LABELS[t]}</span>
                {examType === t && <Check className="exam-check" size={22} />}
              </button>
            ))}
          </div>

          <label className="field-label">Max marks</label>
          <div className="input-wrap">
            <Hash size={23} />
            <input
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 30"
            />
          </div>
          <p className="help">Enter the maximum possible marks for this exam.</p>

          <button className="continue" disabled={!subjectId} onClick={() => subjectId && setStep('source')}>
            Continue
          </button>
        </>
      )}

      {step === 'source' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="help">Upload the marks sheet — a PDF, Excel file, or a clear photo of the printed sheet.</p>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', border: '2px dashed var(--line)', color: 'var(--navy)', fontWeight: 600, fontSize: 17 }}
          >
            <Camera size={30} color="var(--purple)" />
            {busy ?? 'Choose PDF, Excel, or photo'}
          </button>
          <button
            onClick={() => {
              setRows(buildMarksRows(students, new Map()))
              setStep('review')
            }}
            className="btn-secondary"
            style={{ border: 'none', color: 'var(--navy)' }}
          >
            Or enter marks by hand instead
          </button>
          {error && <p style={{ color: '#bf3037', fontSize: 15 }}>{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          {error && <p style={{ color: '#bf3037', fontSize: 15, marginBottom: 12 }}>{error}</p>}
          <MarksReviewGrid initialRows={rows} maxMarks={Number(maxMarks) || null} onConfirm={confirmMarks} />
          {busy && <p className="help" style={{ marginTop: 10 }}>{busy}</p>}
        </div>
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

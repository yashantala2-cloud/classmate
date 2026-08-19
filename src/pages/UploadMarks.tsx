import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db, uid } from '../db/db'
import { useActiveClass, useStudents, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES, type ExamType } from '../types'
import { extractPdfTokens } from '../lib/pdfParser'
import { extractImageTokens, type OcrProgress } from '../lib/ocrParser'
import { extractExcelTokens } from '../lib/excelParser'
import { pairRollsWithMarks } from '../lib/tableExtract'
import MarksReviewGrid, { buildMarksRows, type MarksRow } from '../components/MarksReviewGrid'

type Step = 'setup' | 'source' | 'review'

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

  if (!activeClass) return <p className="text-ink-dim">Set up a class first.</p>
  if (students.length === 0) return <p className="text-ink-dim">Add your class roster first, from Class Setup.</p>

  return (
    <div className="pt-2">
      <h1 className="text-xl font-display font-semibold text-navy-900 mb-4">Upload Marks</h1>

      {step === 'setup' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-dim mb-1.5">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full border border-paper-line rounded-lg px-3.5 py-3 text-base bg-white outline-none focus:border-navy-700"
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-dim mb-1.5">Exam</label>
            <div className="grid grid-cols-2 gap-2">
              {EXAM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setExamType(t)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border ${
                    examType === t ? 'bg-navy-900 text-white border-navy-900' : 'border-paper-line text-ink-dim'
                  }`}
                >
                  {EXAM_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-dim mb-1.5">Max marks</label>
            <input
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 30"
              className="w-full border border-paper-line rounded-lg px-3.5 py-3 text-base outline-none focus:border-navy-700"
            />
          </div>
          <button
            onClick={() => subjectId && setStep('source')}
            disabled={!subjectId}
            className="w-full bg-navy-900 text-white font-medium py-3.5 rounded-lg disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'source' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Upload the marks sheet — a PDF, Excel file, or a clear photo of the printed sheet.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
            className="w-full border-2 border-dashed border-navy-700/40 rounded-lg px-4 py-8 text-navy-800 font-medium flex flex-col items-center gap-2"
          >
            <span className="text-2xl">📷</span>
            {busy ?? 'Choose PDF, Excel, or photo'}
          </button>
          <button
            onClick={() => {
              setRows(buildMarksRows(students, new Map()))
              setStep('review')
            }}
            className="w-full text-navy-800 font-medium py-2 text-sm"
          >
            Or enter marks by hand instead
          </button>
          {error && <p className="text-sm text-critical">{error}</p>}
        </div>
      )}

      {step === 'review' && (
        <div>
          {error && <p className="text-sm text-critical mb-3">{error}</p>}
          <MarksReviewGrid initialRows={rows} maxMarks={Number(maxMarks) || null} onConfirm={confirmMarks} />
          {busy && <p className="text-sm text-ink-dim mt-2">{busy}</p>}
        </div>
      )}
    </div>
  )
}

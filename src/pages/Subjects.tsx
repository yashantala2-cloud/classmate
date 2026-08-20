import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, X } from 'lucide-react'
import { db, uid } from '../db/db'
import { useActiveClass, useExams, useSubjects } from '../hooks/useAppData'
import { EXAM_LABELS, EXAM_TYPES } from '../types'

export default function Subjects() {
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const exams = useExams(activeClass?.id)
  const navigate = useNavigate()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [credits, setCredits] = useState('1')

  async function addSubject() {
    if (!activeClass || !name.trim()) return
    const parsedCredits = Number(credits)
    await db.subjects.add({
      id: uid(),
      classId: activeClass.id,
      name: name.trim(),
      code: code.trim(),
      credits: Number.isFinite(parsedCredits) && parsedCredits > 0 ? parsedCredits : 1,
    })
    setName('')
    setCode('')
    setCredits('1')
    setAdding(false)
  }

  async function updateCredits(subjectId: string, value: string) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    await db.subjects.update(subjectId, { credits: parsed })
  }

  async function removeSubject(subjectId: string) {
    const examIds = exams.filter((e) => e.subjectId === subjectId).map((e) => e.id)
    await db.transaction('rw', db.subjects, db.exams, db.marks, async () => {
      await db.marks.where('examId').anyOf(examIds).delete()
      await db.exams.where('subjectId').equals(subjectId).delete()
      await db.subjects.delete(subjectId)
    })
  }

  if (!activeClass) {
    return (
      <main className="screen">
        <p className="help">Set up a class first.</p>
      </main>
    )
  }

  return (
    <main className="screen">
      <section className="page-heading" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div className="heading-icon purple">
            <BookOpen size={24} />
          </div>
          <h1>Subjects</h1>
        </div>
        <button onClick={() => setAdding(true)} className="btn-secondary" style={{ border: 'none', color: 'var(--navy)', width: 'max-content', fontSize: 16 }}>
          + Add subject
        </button>
      </section>

      {adding && (
        <div className="card" style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name, e.g. Full Stack Development" autoFocus className="field-input" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Subject code (optional)" className="field-input" />
          <div>
            <label className="field-block-label">Credits</label>
            <input
              value={credits}
              onChange={(e) => setCredits(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="1"
              className="field-input"
              style={{ width: 100 }}
            />
            <p className="help" style={{ marginTop: 6 }}>Weights this subject in the Overall ranking only.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addSubject} className="save">
              Save
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary" style={{ border: 'none', color: 'var(--muted)', width: 'max-content' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {subjects.length === 0 && !adding && <p className="help">No subjects yet. Add each subject you're taking this semester.</p>}

      <div style={{ display: 'grid', gap: 14 }}>
        {subjects.map((s) => {
          const subjectExams = exams.filter((e) => e.subjectId === s.id)
          return (
            <div key={s.id} className="subject-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 18 }}>{s.name}</p>
                  {s.code && <p className="help">{s.code}</p>}
                </div>
                <button onClick={() => removeSubject(s.id)} style={{ border: 0, background: 'transparent', color: 'var(--muted)' }} aria-label="Remove subject">
                  <X size={18} />
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 14, color: 'var(--muted)' }}>
                Credits
                <input
                  defaultValue={s.credits ?? 1}
                  onBlur={(e) => updateCredits(s.id, e.target.value)}
                  inputMode="decimal"
                  className="field-input"
                  style={{ width: 56, height: 36, padding: '0 10px', fontSize: 14 }}
                />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {EXAM_TYPES.map((type) => {
                  const exam = subjectExams.find((e) => e.type === type)
                  return (
                    <button key={type} onClick={() => navigate(`/upload?subjectId=${s.id}&examType=${type}`)} className={`exam-pill ${exam ? 'done' : ''}`}>
                      {EXAM_LABELS[type]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

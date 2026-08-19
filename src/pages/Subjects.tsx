import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  async function addSubject() {
    if (!activeClass || !name.trim()) return
    await db.subjects.add({ id: uid(), classId: activeClass.id, name: name.trim(), code: code.trim() })
    setName('')
    setCode('')
    setAdding(false)
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
    return <p className="text-ink-dim">Set up a class first.</p>
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-display font-semibold text-navy-900">Subjects</h1>
        <button onClick={() => setAdding(true)} className="text-sm font-medium text-navy-800">
          + Add subject
        </button>
      </div>

      {adding && (
        <div className="border border-paper-line rounded-lg p-3 bg-white mb-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subject name, e.g. Full Stack Development"
            autoFocus
            className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Subject code (optional)"
            className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700"
          />
          <div className="flex gap-2">
            <button onClick={addSubject} className="bg-navy-900 text-white text-sm font-medium px-4 py-2 rounded-md">
              Save
            </button>
            <button onClick={() => setAdding(false)} className="text-sm text-ink-dim px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {subjects.length === 0 && !adding && (
        <p className="text-sm text-ink-dim">No subjects yet. Add each subject you're taking this semester.</p>
      )}

      <div className="space-y-3">
        {subjects.map((s) => {
          const subjectExams = exams.filter((e) => e.subjectId === s.id)
          return (
            <div key={s.id} className="border border-paper-line rounded-lg bg-white p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.code && <p className="text-xs text-ink-faint">{s.code}</p>}
                </div>
                <button onClick={() => removeSubject(s.id)} className="text-ink-faint hover:text-maroon-700 text-sm">
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {EXAM_TYPES.map((type) => {
                  const exam = subjectExams.find((e) => e.type === type)
                  return (
                    <button
                      key={type}
                      onClick={() => navigate(`/upload?subjectId=${s.id}&examType=${type}`)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border ${
                        exam
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'border-paper-line text-ink-dim'
                      }`}
                    >
                      {EXAM_LABELS[type]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

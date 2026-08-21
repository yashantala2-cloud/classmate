import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Users } from 'lucide-react'
import { db, uid } from '../db/db'
import { useAllClasses } from '../hooks/useAppData'
import RosterReviewGrid, { type RosterRow } from '../components/RosterReviewGrid'

export default function ManageStudents() {
  const [params] = useSearchParams()
  const classId = params.get('classId')
  const classes = useAllClasses()
  const navigate = useNavigate()

  const targetClass = classes.find((c) => c.id === classId)

  // Undefined while loading — distinct from an empty roster — so the roster
  // grid isn't mounted (and its one-time initialRows locked in) before the
  // real student list has arrived.
  const students = useLiveQuery(async () => {
    if (!classId) return undefined
    const list = await db.students.where('classId').equals(classId).toArray()
    return list.sort((a, b) => Number(a.rollNo) - Number(b.rollNo))
  }, [classId])

  async function saveRoster(rows: RosterRow[]) {
    if (!classId) return
    await db.transaction('rw', db.students, async () => {
      await db.students.where('classId').equals(classId).delete()
      await db.students.bulkAdd(rows.map((r) => ({ id: uid(), classId, rollNo: r.rollNo.trim(), name: r.name.trim() })))
    })
    navigate('/settings')
  }

  if (!classId || !targetClass) {
    return (
      <main className="screen">
        <p className="help">Class not found.</p>
      </main>
    )
  }

  return (
    <main className="screen">
      <section className="page-heading progress-heading">
        <div className="heading-icon purple">
          <Users size={24} />
        </div>
        <div>
          <h1>Manage Students</h1>
          <p>{targetClass.name} — edit roll numbers and names, or add and remove students.</p>
        </div>
      </section>

      {students === undefined ? (
        <p className="help">Loading…</p>
      ) : (
        <RosterReviewGrid
          initialRows={students.map((s): RosterRow => ({ rollNo: s.rollNo, name: s.name }))}
          onConfirm={saveRoster}
          helpText="Edit roll numbers and names, remove students who've left, or add new ones. Marks already uploaded stay linked by roll number."
          confirmLabel="Save changes"
        />
      )}
    </main>
  )
}

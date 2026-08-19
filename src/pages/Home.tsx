import { Link } from 'react-router-dom'
import { useActiveClass, useExams, useProfile, useStudents, useSubjects } from '../hooks/useAppData'

export default function Home() {
  const profile = useProfile()
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const students = useStudents(activeClass?.id)
  const exams = useExams(activeClass?.id)

  return (
    <div className="pt-2">
      <h1 className="text-xl font-display font-semibold text-navy-900">
        {greeting()}, {profile?.name?.split(' ')[0] ?? 'there'}
      </h1>
      <p className="text-sm text-ink-dim mt-1">{activeClass?.name} · {students.length} students</p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <StatCard label="Subjects" value={subjects.length} />
        <StatCard label="Exams uploaded" value={exams.length} />
      </div>

      <div className="mt-6 space-y-2.5">
        <ActionRow to="/subjects" title="Manage subjects" desc="Add subjects and see which exams have marks" />
        <ActionRow to="/upload" title="Upload marks" desc="Add a sessional or final exam mark sheet" />
        <ActionRow to="/rankings" title="View ranking" desc="See where you stand, overall or per subject" />
        <ActionRow to="/progress" title="Track progress" desc="Your trend across sessionals and finals" />
      </div>

      {subjects.length === 0 && (
        <div className="mt-6 bg-gold-200/40 border border-gold-500/40 rounded-lg p-4">
          <p className="text-sm text-ink">
            Start by adding your subjects for this semester, then upload each exam's marks as they're published.
          </p>
          <Link to="/subjects" className="inline-block mt-2 text-sm font-semibold text-navy-800">
            Add your first subject →
          </Link>
        </div>
      )}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-paper-line rounded-lg bg-white p-3.5">
      <p className="text-2xl font-display font-semibold text-navy-900">{value}</p>
      <p className="text-xs text-ink-dim mt-0.5">{label}</p>
    </div>
  )
}

function ActionRow({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between border border-paper-line rounded-lg bg-white px-4 py-3.5 hover:border-navy-700"
    >
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-ink-dim mt-0.5">{desc}</p>
      </div>
      <span className="text-ink-faint">→</span>
    </Link>
  )
}

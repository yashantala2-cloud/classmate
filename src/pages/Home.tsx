import { Link } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  ArrowRight,
  Star,
  Target,
  CloudUpload,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import { useActiveClass, useExams, useProfile, useStudents, useSubjects } from '../hooks/useAppData'

export default function Home() {
  const profile = useProfile()
  const activeClass = useActiveClass()
  const subjects = useSubjects(activeClass?.id)
  const students = useStudents(activeClass?.id)
  const exams = useExams(activeClass?.id)

  return (
    <main className="screen">
      <section className="welcome">
        <h1>
          {greeting()}, {profile?.name?.split(' ')[0] ?? 'there'} <span>👋</span>
        </h1>
        <p>
          {activeClass?.name} <i /> {students.length} students
        </p>
      </section>

      <div className="stats">
        <StatCard icon={BookOpen} number={subjects.length} label="Subjects" tone="blue" to="/subjects" />
        <StatCard icon={FileText} number={exams.length} label="Exams uploaded" tone="green" to="/rankings" />
      </div>

      <section className="actions">
        <ActionCard to="/subjects" icon={BookOpen} title="Manage subjects" text="Add subjects and see which exams have marks" tone="purple" />
        <ActionCard to="/upload" icon={CloudUpload} title="Upload marks" text="Add a sessional or final exam mark sheet" tone="green" />
        <ActionCard to="/rankings" icon={Trophy} title="View ranking" text="See where you stand, overall or per subject" tone="orange" />
        <ActionCard to="/progress" icon={TrendingUp} title="Track progress" text="Your trend across sessionals and finals" tone="blue" />
      </section>

      <section className="motivation">
        <span className="motivation-icon">
          <Star size={23} fill="currentColor" />
        </span>
        <div>
          <b>Stay consistent!</b>
          <p>Keep uploading your marks and track your progress to stay ahead.</p>
        </div>
        <Target className="target" size={72} />
      </section>

      {subjects.length === 0 && (
        <section className="motivation" style={{ marginTop: 20, background: '#fff8e6', borderColor: '#f0dca0' }}>
          <div>
            <b>Get started</b>
            <p>Add your subjects for this semester, then upload each exam's marks as they're published.</p>
            <Link to="/subjects" style={{ color: 'var(--navy)', fontWeight: 700, display: 'inline-block', marginTop: 8 }}>
              Add your first subject →
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({
  icon: Icon,
  number,
  label,
  tone,
  to,
}: {
  icon: typeof BookOpen
  number: number
  label: string
  tone: 'blue' | 'green'
  to: string
}) {
  return (
    <Link to={to} className={`stat ${tone}`}>
      <span className="stat-icon">
        <Icon size={23} />
      </span>
      <span className="stat-content">
        <b>{number}</b>
        <span>{label}</span>
        <small>
          View all <ArrowRight size={13} />
        </small>
      </span>
    </Link>
  )
}

function ActionCard({
  to,
  icon: Icon,
  title,
  text,
  tone,
}: {
  to: string
  icon: typeof BookOpen
  title: string
  text: string
  tone: 'purple' | 'green' | 'orange' | 'blue'
}) {
  return (
    <Link to={to} className="action-card">
      <span className={`action-icon ${tone}`}>
        <Icon size={26} />
      </span>
      <span className="action-copy">
        <b>{title}</b>
        <span>{text}</span>
      </span>
      <ArrowRight className="action-arrow" size={24} />
    </Link>
  )
}

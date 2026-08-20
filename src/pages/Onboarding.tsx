import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Smartphone, CloudUpload } from 'lucide-react'
import { db } from '../db/db'

export default function Onboarding() {
  const navigate = useNavigate()
  const [rollNo, setRollNo] = useState('')
  const [name, setName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rollNo.trim() || !name.trim()) return
    await db.profile.put({ id: 1, rollNo: rollNo.trim(), name: name.trim(), activeClassId: null })
    navigate('/class-setup')
  }

  return (
    <main className="screen">
      <h1 style={{ font: '700 32px "Playfair Display", serif', letterSpacing: '-.6px', margin: '0 0 8px' }}>Welcome to ClassMates</h1>
      <p className="help" style={{ marginBottom: 24, fontSize: 17 }}>
        See where you stand in your class — upload the roll list and marks your department already publishes, and
        ClassMates works out the ranking.
      </p>

      <div className="privacy-box">
        <PrivacyLine icon={<Lock size={18} />} text="No login. No account. Nothing to sign up for." />
        <PrivacyLine icon={<Smartphone size={18} />} text="All data — rosters, marks, rankings — stays only on this device." />
        <PrivacyLine icon={<CloudUpload size={18} />} text="Cloud backup is opt-in, from Settings. Nothing leaves your phone unless you sign in and choose to sync." />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
        <div>
          <label className="field-block-label">Your Roll Number</label>
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="e.g. 42"
            required
            className="field-input"
          />
        </div>
        <div>
          <label className="field-block-label">Your Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears on the roll list" required className="field-input" />
        </div>
        <p className="help">This highlights your row in every ranking and tracks your progress across exams.</p>
        <button type="submit" className="continue" style={{ background: 'var(--navy)' }}>
          Continue
        </button>
      </form>
    </main>
  )
}

function PrivacyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="privacy-line">
      {icon}
      <span>{text}</span>
    </p>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="pt-4">
      <h1 className="text-2xl font-display font-semibold text-navy-900 mb-1">Welcome to ClassMates</h1>
      <p className="text-ink-dim mb-6">
        See where you stand in your class — upload the roll list and marks your department already publishes,
        and ClassMates works out the ranking.
      </p>

      <div className="bg-white border border-paper-line rounded-xl p-4 mb-6 space-y-2">
        <PrivacyLine icon="🔒" text="No login. No account. Nothing to sign up for." />
        <PrivacyLine icon="📱" text="All data — rosters, marks, rankings — stays only on this device." />
        <PrivacyLine icon="☁️" text="Cloud backup is opt-in, from Settings. Nothing leaves your phone unless you sign in and choose to sync." />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-dim mb-1.5">Your Roll Number</label>
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="e.g. 42"
            required
            className="w-full border border-paper-line rounded-lg px-3.5 py-3 text-base outline-none focus:border-navy-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-dim mb-1.5">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As it appears on the roll list"
            required
            className="w-full border border-paper-line rounded-lg px-3.5 py-3 text-base outline-none focus:border-navy-700"
          />
        </div>
        <p className="text-xs text-ink-faint">
          This highlights your row in every ranking and tracks your progress across exams.
        </p>
        <button
          type="submit"
          className="w-full bg-navy-900 text-white font-medium py-3.5 rounded-lg mt-2"
        >
          Continue
        </button>
      </form>
    </div>
  )
}

function PrivacyLine({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="text-sm text-ink flex items-start gap-2.5">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <span>{text}</span>
    </p>
  )
}

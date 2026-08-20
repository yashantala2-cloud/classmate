import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { useAllClasses, useProfile } from '../hooks/useAppData'
import { clearAllData, downloadBackup, exportBackup, importBackup } from '../lib/backup'
import CloudSyncPanel from '../components/CloudSyncPanel'
import type { BackupFile } from '../types'

export default function Settings() {
  const profile = useProfile()
  const classes = useAllClasses()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [rollNo, setRollNo] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)

  // profile loads async from IndexedDB — sync the form once it arrives.
  useEffect(() => {
    if (profile) {
      setRollNo(profile.rollNo)
      setName(profile.name)
    }
  }, [profile])

  async function saveProfile() {
    if (!profile) return
    await db.profile.put({ ...profile, rollNo: rollNo.trim(), name: name.trim() })
    setMessage('Saved.')
    setTimeout(() => setMessage(null), 1500)
  }

  async function switchClass(classId: string) {
    if (!profile) return
    await db.profile.put({ ...profile, activeClassId: classId })
  }

  async function handleExport() {
    downloadBackup(await exportBackup())
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    try {
      const parsed = JSON.parse(text) as BackupFile
      await importBackup(parsed)
      setMessage('Backup restored.')
      setTimeout(() => setMessage(null), 1500)
    } catch {
      setMessage('That file could not be read as a ClassMates backup.')
    }
  }

  async function handleClear() {
    await clearAllData()
    navigate('/onboarding')
  }

  return (
    <div className="pt-2 space-y-6">
      <div>
        <h1 className="text-xl font-display font-semibold text-navy-900 mb-3">Your Profile</h1>
        <div className="space-y-2.5 bg-white border border-paper-line rounded-lg p-3.5">
          <input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Roll number"
            className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700"
          />
          <button onClick={saveProfile} className="bg-navy-900 text-white text-sm font-medium px-4 py-2 rounded-md">
            Save
          </button>
          {message && <p className="text-xs text-good">{message}</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-navy-900 mb-3">Classes</h2>
        <div className="space-y-1.5">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => switchClass(c.id)}
              className={`w-full text-left border rounded-lg px-3.5 py-2.5 text-sm flex items-center justify-between ${
                profile?.activeClassId === c.id ? 'border-navy-800 bg-gold-200/30 font-medium' : 'border-paper-line bg-white'
              }`}
            >
              {c.name}
              {profile?.activeClassId === c.id && <span className="text-xs text-navy-800">Active</span>}
            </button>
          ))}
          <button
            onClick={() => navigate('/class-setup')}
            className="w-full text-left border-2 border-dashed border-paper-line rounded-lg px-3.5 py-2.5 text-sm text-navy-800"
          >
            + Add another class
          </button>
        </div>
      </div>

      <CloudSyncPanel />

      <div>
        <h2 className="font-display font-semibold text-navy-900 mb-3">Backup</h2>
        <p className="text-sm text-ink-dim mb-2.5">
          Everything lives only on this device. Export a backup file before switching phones, or to share your
          class's data with a classmate.
        </p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 border border-paper-line bg-white rounded-lg px-3.5 py-2.5 text-sm font-medium">
            Export backup
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="flex-1 border border-paper-line bg-white rounded-lg px-3.5 py-2.5 text-sm font-medium"
          >
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
          />
        </div>
      </div>

      <div>
        <h2 className="font-display font-semibold text-maroon-700 mb-3">Danger zone</h2>
        {!confirmingClear ? (
          <button
            onClick={() => setConfirmingClear(true)}
            className="w-full border border-maroon-700/40 text-maroon-700 rounded-lg px-3.5 py-2.5 text-sm font-medium"
          >
            Clear all data
          </button>
        ) : (
          <div className="border border-maroon-700/40 rounded-lg p-3.5 bg-maroon-700/5">
            <p className="text-sm text-ink mb-2.5">This deletes everything on this device permanently. Export a backup first if unsure.</p>
            <div className="flex gap-2">
              <button onClick={handleClear} className="bg-maroon-700 text-white text-sm font-medium px-4 py-2 rounded-md">
                Yes, delete everything
              </button>
              <button onClick={() => setConfirmingClear(false)} className="text-sm text-ink-dim px-3 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 pb-4 text-center">
        <p className="text-xs text-ink-faint">
          ClassMates works 100% offline. No account is required — cloud sync above is opt-in and off by default.
        </p>
        <a
          href="https://github.com/yashantala2-cloud/classmate"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-navy-800 font-medium mt-1 inline-block"
        >
          github.com/yashantala2-cloud/classmate
        </a>
      </div>
    </div>
  )
}

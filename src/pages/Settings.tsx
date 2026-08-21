import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserRound,
  ClipboardList,
  Save,
  Users,
  GraduationCap,
  CloudUpload,
  Download,
  AlertTriangle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Pencil,
  Check,
  X as XIcon,
} from 'lucide-react'
import { db } from '../db/db'
import { useAllClasses, useProfile } from '../hooks/useAppData'
import { clearAllData, downloadBackup, exportBackup, importBackup } from '../lib/backup'
import CloudSyncPanel from '../components/CloudSyncPanel'
import { MAX_CLASSES, type BackupFile } from '../types'

export default function Settings() {
  const profile = useProfile()
  const classes = useAllClasses()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)

  const [rollNo, setRollNo] = useState('')
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showClear, setShowClear] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [editingClassName, setEditingClassName] = useState('')
  const [pendingDeleteClass, setPendingDeleteClass] = useState<{ id: string; name: string } | null>(null)

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
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function switchClass(classId: string) {
    if (!profile) return
    await db.profile.put({ ...profile, activeClassId: classId })
  }

  function startEditingClass(classId: string, currentName: string) {
    setEditingClassId(classId)
    setEditingClassName(currentName)
  }

  async function saveClassName(classId: string) {
    const trimmed = editingClassName.trim()
    if (!trimmed) return
    await db.classes.update(classId, { name: trimmed })
    setEditingClassId(null)
  }

  async function deleteClass(classId: string) {
    const examIds = (await db.exams.where('classId').equals(classId).toArray()).map((e) => e.id)
    await db.transaction('rw', [db.classes, db.students, db.subjects, db.exams, db.marks, db.profile], async () => {
      await db.marks.where('examId').anyOf(examIds).delete()
      await db.exams.where('classId').equals(classId).delete()
      await db.subjects.where('classId').equals(classId).delete()
      await db.students.where('classId').equals(classId).delete()
      await db.classes.delete(classId)
      if (profile?.activeClassId === classId) {
        const nextActive = classes.find((c) => c.id !== classId)
        await db.profile.put({ ...profile, activeClassId: nextActive?.id ?? null })
      }
    })
    setPendingDeleteClass(null)
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

  const atClassLimit = classes.length >= MAX_CLASSES

  return (
    <main className="screen more-screen">
      <section className="page-heading">
        <div className="heading-icon blue">
          <UserRound size={24} />
        </div>
        <h1>Your Profile</h1>
      </section>

      <section className="profile-card">
        <div className="input-wrap">
          <ClipboardList size={21} />
          <input value={rollNo} onChange={(e) => setRollNo(e.target.value.replace(/[^\d]/g, ''))} placeholder="Roll number" />
        </div>
        <div className="input-wrap">
          <UserRound size={21} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        </div>
        <button className="save" onClick={saveProfile}>
          <Save size={19} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </section>

      <section className="settings-section">
        <div className="section-title">
          <Users size={24} />
          <h2>Classes</h2>
        </div>
        {classes.map((c) =>
          editingClassId === c.id ? (
            <div key={c.id} className="class-card editing">
              <GraduationCap size={23} />
              <input
                className="class-name-input"
                value={editingClassName}
                onChange={(e) => setEditingClassName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveClassName(c.id)}
                autoFocus
              />
              <button className="icon-btn" onClick={() => saveClassName(c.id)} aria-label="Save class name">
                <Check size={19} />
              </button>
              <button className="icon-btn" onClick={() => setEditingClassId(null)} aria-label="Cancel editing">
                <XIcon size={19} />
              </button>
            </div>
          ) : (
            <div key={c.id} className={`class-card ${profile?.activeClassId === c.id ? 'active' : ''}`}>
              <button className="class-card-main" onClick={() => switchClass(c.id)}>
                <GraduationCap size={23} />
                <span>{c.name}</span>
                {profile?.activeClassId === c.id && <b>Active</b>}
              </button>
              <button className="icon-btn" onClick={() => navigate(`/students?classId=${c.id}`)} aria-label={`Manage students in ${c.name}`}>
                <Users size={17} />
              </button>
              <button className="icon-btn" onClick={() => startEditingClass(c.id, c.name)} aria-label={`Edit ${c.name}`}>
                <Pencil size={17} />
              </button>
              <button className="icon-btn danger" onClick={() => setPendingDeleteClass({ id: c.id, name: c.name })} aria-label={`Delete ${c.name}`}>
                <Trash2 size={17} />
              </button>
            </div>
          ),
        )}
        <button onClick={() => !atClassLimit && navigate('/class-setup')} className="add-class" disabled={atClassLimit}>
          ＋ Add another class
        </button>
        {atClassLimit && <p className="class-limit-note">You can have up to {MAX_CLASSES} classes at a time.</p>}
      </section>

      <CloudSyncPanel />

      <section className="backup-card">
        <div className="section-title green-title">
          <CloudUpload size={24} />
          <h2>Backup</h2>
        </div>
        <p>Everything lives only on this device. Export a backup file before switching phones, or to share your class's data with a classmate.</p>
        <div className="backup-actions">
          <button onClick={handleExport}>
            <Download size={20} /> Export backup
          </button>
          <button onClick={() => fileInput.current?.click()}>
            <CloudUpload size={20} /> Import backup
          </button>
          <input ref={fileInput} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
        </div>
        {message && <p className="help" style={{ marginTop: 12 }}>{message}</p>}
      </section>

      <section className="danger-card">
        <div className="section-title danger-title">
          <AlertTriangle size={23} />
          <h2>Danger zone</h2>
        </div>
        <button className="clear" onClick={() => setShowClear(true)}>
          <Trash2 size={20} /> Clear all data
        </button>
      </section>

      <section className="app-info">
        <span className="shield">
          <ShieldCheck size={22} />
        </span>
        <div>
          <p>ClassMates works 100% offline. No account is required — cloud sync above is opt-in and off by default.</p>
          <a href="https://github.com/yashantala2-cloud/classmate" target="_blank" rel="noreferrer">
            github.com/yashantala2-cloud/classmate <ExternalLink size={15} />
          </a>
        </div>
      </section>

      {showClear && (
        <div className="modal-backdrop">
          <div className="modal">
            <AlertTriangle size={40} />
            <h3>Clear all data?</h3>
            <p>This will permanently delete classes, subjects, marks and progress. This action cannot be undone.</p>
            <div>
              <button onClick={() => setShowClear(false)}>Cancel</button>
              <button className="danger-btn" onClick={handleClear}>
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteClass && (
        <div className="modal-backdrop">
          <div className="modal">
            <AlertTriangle size={40} />
            <h3>Delete {pendingDeleteClass.name}?</h3>
            <p>This will permanently delete this class along with its students, subjects, exams and marks. This action cannot be undone.</p>
            <div>
              <button onClick={() => setPendingDeleteClass(null)}>Cancel</button>
              <button className="danger-btn" onClick={() => deleteClass(pendingDeleteClass.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

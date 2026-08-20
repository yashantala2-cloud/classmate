import { useState } from 'react'
import { CloudUpload, Mail } from 'lucide-react'
import { backupToCloud, getCloudSession, requestOtp, restoreFromCloud, signOutCloud, verifyOtp } from '../lib/cloudSync'

type Step = 'signed-out' | 'awaiting-code'

export default function CloudSyncPanel() {
  const [session, setSession] = useState(getCloudSession())
  const [step, setStep] = useState<Step>('signed-out')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function sendCode() {
    if (!email.trim()) return
    setError(null)
    setBusy('Sending code…')
    try {
      await requestOtp(email.trim())
      setStep('awaiting-code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code')
    } finally {
      setBusy(null)
    }
  }

  async function confirmCode() {
    if (!code.trim()) return
    setError(null)
    setBusy('Verifying…')
    try {
      await verifyOtp(email.trim(), code.trim())
      setSession(getCloudSession())
      setStep('signed-out')
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code')
    } finally {
      setBusy(null)
    }
  }

  async function handleSignOut() {
    await signOutCloud()
    setSession(null)
    setEmail('')
  }

  async function handleBackup() {
    setError(null)
    setBusy('Backing up…')
    try {
      await backupToCloud()
      setMessage('Backed up to cloud.')
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setBusy(null)
    }
  }

  async function handleRestore() {
    setError(null)
    setBusy('Restoring — this replaces everything on this device…')
    try {
      await restoreFromCloud()
      setMessage('Restored from cloud.')
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="backup-card">
      <div className="section-title">
        <CloudUpload size={24} />
        <h2>Cloud Sync</h2>
      </div>
      <p>
        Optional. Sign in to back up your own profile, classes, and marks so you can restore them on a new phone.
        Nothing syncs unless you sign in and choose to back up.
      </p>

      {session ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ fontSize: 15 }}>
            Signed in as <b>{session.email}</b>
          </p>
          <div className="backup-actions">
            <button onClick={handleBackup} disabled={!!busy}>
              Backup now
            </button>
            <button onClick={handleRestore} disabled={!!busy}>
              Restore
            </button>
          </div>
          <button onClick={handleSignOut} className="btn-secondary" style={{ border: 'none', color: 'var(--muted)', width: 'max-content' }}>
            Sign out
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {step === 'signed-out' && (
            <>
              <div className="input-wrap">
                <Mail size={21} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
              </div>
              <button onClick={sendCode} disabled={!!busy || !email.trim()} className="save" style={{ width: 'max-content', opacity: !email.trim() ? 0.5 : 1 }}>
                Send code
              </button>
            </>
          )}
          {step === 'awaiting-code' && (
            <>
              <p className="help">Enter the 6-digit code sent to {email}</p>
              <div className="input-wrap">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="123456"
                  style={{ letterSpacing: 4 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={confirmCode} disabled={!!busy || code.length !== 6} className="save" style={{ width: 'max-content', opacity: code.length !== 6 ? 0.5 : 1 }}>
                  Verify
                </button>
                <button onClick={() => setStep('signed-out')} className="btn-secondary" style={{ border: 'none', color: 'var(--muted)', width: 'max-content' }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {busy && <p className="help" style={{ marginTop: 12 }}>{busy}</p>}
      {message && <p style={{ marginTop: 12, fontSize: 14, color: 'var(--green)' }}>{message}</p>}
      {error && <p style={{ marginTop: 12, fontSize: 14, color: '#bf3037' }}>{error}</p>}
    </section>
  )
}

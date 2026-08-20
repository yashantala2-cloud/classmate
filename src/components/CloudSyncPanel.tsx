import { useState } from 'react'
import {
  backupToCloud,
  getCloudSession,
  requestOtp,
  restoreFromCloud,
  signOutCloud,
  verifyOtp,
} from '../lib/cloudSync'

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
    <div>
      <h2 className="font-display font-semibold text-navy-900 mb-3">Cloud Sync</h2>
      <p className="text-sm text-ink-dim mb-2.5">
        Optional. Sign in to back up your own profile, classes, and marks so you can restore them on a new phone.
        Nothing syncs unless you sign in and choose to back up.
      </p>

      {session ? (
        <div className="border border-paper-line rounded-lg bg-white p-3.5 space-y-2.5">
          <p className="text-sm">
            Signed in as <span className="font-medium">{session.email}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBackup}
              disabled={!!busy}
              className="flex-1 bg-navy-900 text-white text-sm font-medium px-3.5 py-2.5 rounded-lg disabled:opacity-50"
            >
              Backup now
            </button>
            <button
              onClick={handleRestore}
              disabled={!!busy}
              className="flex-1 border border-paper-line text-sm font-medium px-3.5 py-2.5 rounded-lg disabled:opacity-50"
            >
              Restore
            </button>
          </div>
          <button onClick={handleSignOut} className="text-sm text-ink-dim">
            Sign out
          </button>
        </div>
      ) : (
        <div className="border border-paper-line rounded-lg bg-white p-3.5 space-y-2.5">
          {step === 'signed-out' && (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700"
              />
              <button
                onClick={sendCode}
                disabled={!!busy || !email.trim()}
                className="bg-navy-900 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
              >
                Send code
              </button>
            </>
          )}
          {step === 'awaiting-code' && (
            <>
              <p className="text-sm text-ink-dim">Enter the 6-digit code sent to {email}</p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                className="w-full border border-paper-line rounded-md px-3 py-2 text-sm outline-none focus:border-navy-700 tracking-widest"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmCode}
                  disabled={!!busy || code.length !== 6}
                  className="bg-navy-900 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
                >
                  Verify
                </button>
                <button onClick={() => setStep('signed-out')} className="text-sm text-ink-dim px-3 py-2">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {busy && <p className="text-xs text-ink-dim mt-2">{busy}</p>}
      {message && <p className="text-xs text-good mt-2">{message}</p>}
      {error && <p className="text-xs text-critical mt-2">{error}</p>}
    </div>
  )
}

import type { BackupFile } from '../types'
import { exportBackup, importBackup } from './backup'

const API_BASE = 'https://classmate-api.athyln.workers.dev'
const SESSION_KEY = 'classmate-cloud-session'

export interface CloudSession {
  token: string
  email: string
}

export function getCloudSession(): CloudSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CloudSession
  } catch {
    return null
  }
}

function setCloudSession(session: CloudSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
}

async function apiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  return (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`
}

export async function requestOtp(email: string): Promise<void> {
  const res = await apiFetch('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) })
  if (!res.ok) throw new Error(await apiError(res))
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const res = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) })
  if (!res.ok) throw new Error(await apiError(res))
  const data = (await res.json()) as { token: string; email: string }
  setCloudSession({ token: data.token, email: data.email })
}

export async function signOutCloud(): Promise<void> {
  const session = getCloudSession()
  if (session) {
    await apiFetch('/auth/signout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => {})
  }
  setCloudSession(null)
}

export async function backupToCloud(): Promise<void> {
  const session = getCloudSession()
  if (!session) throw new Error('Not signed in')
  const backup = await exportBackup()
  const res = await apiFetch('/sync/backup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify(backup),
  })
  if (!res.ok) throw new Error(await apiError(res))
}

export async function restoreFromCloud(): Promise<void> {
  const session = getCloudSession()
  if (!session) throw new Error('Not signed in')
  const res = await apiFetch('/sync/backup', {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.token}` },
  })
  if (!res.ok) throw new Error(await apiError(res))
  const { data } = (await res.json()) as { data: BackupFile }
  await importBackup(data)
}

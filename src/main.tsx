import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { ensureCompatibleDatabase } from './db/db'

const root = createRoot(document.getElementById('root')!)

// Purely cosmetic — updates the loading message if opening is taking a
// while, but never cancels or races the real ensureCompatibleDatabase()
// call below, so a slow device or a flaky connection can never be mistaken
// for a failure and can never trigger any destructive recovery.
const slowHintTimer = setTimeout(() => {
  const el = document.getElementById('loading-message')
  if (el) el.textContent = 'Still working — if another tab has ClassMates open, try closing it.'
}, 5000)

ensureCompatibleDatabase()
  .then(() => {
    clearTimeout(slowHintTimer)
    root.render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    )
  })
  .catch((err) => {
    clearTimeout(slowHintTimer)
    console.error('ClassMates: failed to open local database', err)
    root.render(<StorageErrorScreen />)
  })

function StorageErrorScreen() {
  async function reset() {
    await indexedDB.deleteDatabase('classmate-db')
    location.reload()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f6ef', padding: '0 24px', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ maxWidth: 380, textAlign: 'center' }}>
        <p style={{ fontSize: 40, marginBottom: 10 }}>⚠️</p>
        <h1 style={{ font: '700 22px "Playfair Display", serif', color: '#0b2946', margin: '0 0 8px' }}>Couldn't open local storage</h1>
        <p style={{ fontSize: 15, color: '#657286', marginBottom: 20, lineHeight: 1.5 }}>
          Your browser wouldn't let ClassMates access its local storage — this can happen if another tab has the
          app open, or storage is restricted (e.g. private browsing). Close other tabs of this app and try again.
          Only reset local data if trying again doesn't help — that permanently deletes everything saved on this
          device.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => location.reload()} style={{ background: '#0b2946', color: '#fff', fontWeight: 600, padding: '12px 0', borderRadius: 12, border: 0 }}>
            Try again
          </button>
          <button onClick={reset} style={{ border: '1px solid #ef7777', color: '#bf3037', background: '#fff7f7', fontWeight: 600, padding: '12px 0', borderRadius: 12 }}>
            Reset local data & retry
          </button>
        </div>
      </div>
    </div>
  )
}

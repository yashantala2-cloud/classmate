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
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <h1 className="font-display text-xl font-semibold text-navy-900 mb-2">Couldn't open local storage</h1>
        <p className="text-sm text-ink-dim mb-5">
          Your browser wouldn't let ClassMates access its local storage — this can happen if another tab has the
          app open, or storage is restricted (e.g. private browsing). Close other tabs of this app and try again.
          Only reset local data if trying again doesn't help — that permanently deletes everything saved on this
          device.
        </p>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => location.reload()} className="bg-navy-900 text-white font-medium py-3 rounded-lg">
            Try again
          </button>
          <button onClick={reset} className="border border-maroon-700/40 text-maroon-700 font-medium py-3 rounded-lg">
            Reset local data & retry
          </button>
        </div>
      </div>
    </div>
  )
}

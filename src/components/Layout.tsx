import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useActiveClass, useProfile } from '../hooks/useAppData'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/rankings', label: 'Ranking', icon: TrophyIcon },
  { to: '/progress', label: 'Progress', icon: ChartIcon },
  { to: '/upload', label: 'Upload', icon: UploadIcon },
  { to: '/settings', label: 'More', icon: MenuIcon },
]

export default function Layout({ children }: { children: ReactNode }) {
  const profile = useProfile()
  const activeClass = useActiveClass()

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="safe-top bg-navy-900 text-gold-200 border-b-2 border-gold-500">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BadgeMark />
            <div>
              <p className="font-display text-lg leading-tight tracking-wide text-white">ClassMates</p>
              {activeClass && (
                <p className="text-[11px] uppercase tracking-widest text-gold-400">{activeClass.name}</p>
              )}
            </div>
          </div>
          {profile?.rollNo && (
            <div className="text-right">
              <p className="text-xs text-gold-400 uppercase tracking-wide">Roll No.</p>
              <p className="font-semibold text-white leading-tight">{profile.rollNo}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-24">{children}</main>

      <nav className="safe-bottom sticky bottom-0 bg-white border-t border-paper-line">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-navy-800' : 'text-ink-faint'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function BadgeMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="96" fill="#0B2540" />
      <path
        d="M256 122c-16 0-31 6-43 17l-98 60c-8 5-8 17 0 22l141 78 141-78c8-5 8-17 0-22l-98-60c-12-11-27-17-43-17z"
        fill="#F4E8C1"
      />
      <path
        d="M148 232v78c0 34 48 62 108 62s108-28 108-62v-78l-108 60-108-60z"
        fill="#F4E8C1"
        opacity="0.92"
      />
    </svg>
  )
}

function iconProps(active: boolean) {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: active ? 'currentColor' : 'currentColor',
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}
function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a3 3 0 0 0 3 5" />
      <path d="M16 5h3a3 3 0 0 1-3 5" />
      <path d="M10 15h4v3h-4z" />
      <path d="M7 21h10" />
      <path d="M9 21v-3h6v3" />
    </svg>
  )
}
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15l3-4 3 3 5-7" />
    </svg>
  )
}
function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 16V5" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}
function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

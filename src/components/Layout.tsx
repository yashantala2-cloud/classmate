import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Trophy, TrendingUp, Upload, MoreHorizontal } from 'lucide-react'
import { useActiveClass, useProfile } from '../hooks/useAppData'

const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/rankings', label: 'Ranking', Icon: Trophy },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
  { to: '/upload', label: 'Upload', Icon: Upload },
  { to: '/settings', label: 'More', Icon: MoreHorizontal },
]

export default function Layout({ children }: { children: ReactNode }) {
  const profile = useProfile()
  const activeClass = useActiveClass()

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <div className="brand">
            <div className="brand-logo">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
            </div>
            <div>
              <div className="brand-name">ClassMates</div>
              {activeClass && <div className="brand-class">{activeClass.name}</div>}
            </div>
          </div>
          {profile?.rollNo && (
            <div className="roll">
              <span>ROLL NO.</span>
              <strong>{profile.rollNo}</strong>
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {({ isActive }) => (
              <>
                <span className="nav-icon">
                  <Icon size={24} />
                </span>
                <span>{label}</span>
                {isActive && <i className="nav-dot" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

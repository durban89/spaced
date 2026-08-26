import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../auth'
import DueNotify from './DueNotify'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6" />
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v11h14V10" />
    </svg>
  )
}

function CardsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M12 4v16" />
      <path d="M2 8h20" />
    </svg>
  )
}

function ReviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.5" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  )
}

function LogoutIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/cards', icon: CardsIcon, label: 'Cards' },
  { to: '/review', icon: ReviewIcon, label: 'Review' },
  { to: '/stats', icon: StatsIcon, label: 'Stats' },
]

export default function Layout() {
  return (
    <div className="app-layout">
      <DueNotify />
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="nav-icon">
                  <item.icon active={isActive} />
                </span>
                <span className="nav-label">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button className="nav-item" onClick={() => logout()}>
          <span className="nav-icon"><LogoutIcon active={false} /></span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </div>
  )
}

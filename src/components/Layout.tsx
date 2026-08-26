import { NavLink, Outlet } from 'react-router-dom'
import DueNotify from './DueNotify'

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/cards', icon: '📚', label: 'Cards' },
  { to: '/review', icon: '🔄', label: 'Review' },
  { to: '/stats', icon: '📊', label: 'Stats' },
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
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

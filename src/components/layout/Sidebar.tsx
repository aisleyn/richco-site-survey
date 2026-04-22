import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

const navItems = [
  { label: 'Projects', href: '/staff/projects' },
  { label: 'Surveys', href: '/staff/surveys' },
  { label: 'Reports', href: '/staff/reports' },
  { label: 'Vendors', href: '/staff/vendors' },
  { label: 'Client Accounts', href: '/staff/accounts' },
  { label: 'Settings', href: '/staff/settings' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 bg-surface border-r border-white/10 p-6 min-h-screen">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/'))

          return (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                'block px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                isActive
                  ? 'bg-elevated text-white'
                  : 'text-secondary hover:bg-white/10 hover:text-white',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

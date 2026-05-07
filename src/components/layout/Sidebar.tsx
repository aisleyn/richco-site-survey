import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { getClientSubmissionCount } from '../../services/clientSubmissions'

const navItems = [
  { label: 'Projects', href: '/staff/projects' },
  { label: 'Surveys', href: '/staff/surveys' },
  { label: 'Flipbook', href: '/staff/reports' },
  { label: 'Clients', href: '/staff/vendors' },
  { label: 'Accounts', href: '/staff/accounts' },
  { label: 'Settings', href: '/staff/settings' },
]

export function Sidebar() {
  const location = useLocation()
  const [submissionCount, setSubmissionCount] = useState(0)

  useEffect(() => {
    getClientSubmissionCount()
      .then(setSubmissionCount)
      .catch(console.error)
  }, [])

  return (
    <aside className="w-64 bg-surface border-r border-white/10 p-6 min-h-screen">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/'))
          const isClientsLink = item.href === '/staff/vendors'

          return (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                'block px-4 py-2 rounded-lg font-medium transition-colors duration-200 relative',
                isActive
                  ? 'bg-elevated text-white'
                  : 'text-secondary hover:bg-white/10 hover:text-white',
              )}
            >
              {item.label}
              {isClientsLink && submissionCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

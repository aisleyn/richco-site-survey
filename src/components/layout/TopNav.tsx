import { useAuthStore } from '../../store/authStore'
import { Badge } from '../ui'
import { useNavigate, useLocation } from 'react-router-dom'
import clsx from 'clsx'

const staffNavItems = [
  { label: 'Projects', href: '/staff/projects' },
  { label: 'Surveys', href: '/staff/surveys' },
  { label: 'Reports', href: '/staff/reports' },
  { label: 'Vendors', href: '/staff/vendors' },
  { label: 'Accounts', href: '/staff/accounts' },
  { label: 'Settings', href: '/staff/settings' },
  { label: 'Client Portal', href: '/client' },
]

export function TopNav() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleLogoClick = () => {
    if (profile?.role === 'richco_staff') {
      navigate('/staff')
    } else {
      navigate('/client')
    }
  }

  const isStaff = profile?.role === 'richco_staff'
  const navItems = isStaff ? staffNavItems : []

  return (
    <nav className="bg-surface border-b border-white/10 sticky top-0 z-40">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
        >
          <img src="/richco-logo.png" alt="Richco" className="h-10 w-auto" />
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>Richco Site Survey</h1>
        </button>

        {/* Center: Navigation (staff only) */}
        {isStaff && (
          <div className="flex items-center gap-1 ml-8">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/'))
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm',
                    isActive
                      ? 'bg-elevated text-white'
                      : 'text-secondary hover:bg-white/10 hover:text-white',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Right: User menu */}
        <div className="flex items-center gap-6 ml-auto">
          {profile && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{profile.full_name || profile.email}</p>
                <Badge variant={profile.role === 'richco_staff' ? 'published' : 'default'}>
                  {profile.role === 'richco_staff' ? 'Staff' : 'Client'}
                </Badge>
              </div>
              {profile.role === 'client' && (
                <button
                  onClick={() => navigate('/client/profile')}
                  className="text-secondary hover:text-white transition-colors text-sm font-medium"
                >
                  Profile
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="text-secondary hover:text-white transition-colors text-sm font-medium"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

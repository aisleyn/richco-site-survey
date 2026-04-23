import { useAuthStore } from '../../store/authStore'
import { Badge } from '../ui'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import clsx from 'clsx'

const staffNavItems = [
  { label: 'Projects', href: '/staff/projects' },
  { label: 'Surveys', href: '/staff/surveys' },
  { label: 'Reports', href: '/staff/reports' },
  { label: 'Clients', href: '/staff/vendors' },
  { label: 'Accounts', href: '/staff/accounts' },
  { label: 'Settings', href: '/staff/settings' },
  { label: 'Client Portal', href: '/client' },
]

export function TopNav() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleNavClick = (href: string) => {
    navigate(href)
    setMobileMenuOpen(false)
  }

  const isStaff = profile?.role === 'richco_staff'
  const navItems = isStaff ? staffNavItems : []

  return (
    <nav className="bg-surface border-b border-white/10 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-1 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
        >
          <img src="/richco-logo.png" alt="Richco" className="h-6 xs:h-7 sm:h-10 w-auto" />
          <h1 className="hidden md:block text-base lg:text-lg font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>Richco Site Survey</h1>
        </button>

        {/* Center: Navigation (staff only, hidden on mobile) */}
        {isStaff && (
          <div className="hidden md:flex items-center gap-1 ml-8">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/'))
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={clsx(
                    'px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-xs lg:text-sm',
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

        {/* Right: User menu and mobile button */}
        <div className="flex items-center gap-3 sm:gap-6 ml-auto">
          {profile && (
            <>
              <div className="hidden xs:text-right sm:block">
                <p className="text-xs sm:text-sm font-medium text-white">{profile.full_name || profile.email}</p>
                <Badge variant={profile.role === 'richco_staff' ? 'published' : 'default'}>
                  {profile.role === 'richco_staff' ? 'Staff' : 'Client'}
                </Badge>
              </div>
              {profile.role === 'client' && (
                <button
                  onClick={() => {
                    navigate('/client/profile')
                    setMobileMenuOpen(false)
                  }}
                  className="hidden sm:block text-secondary hover:text-white transition-colors text-xs sm:text-sm font-medium"
                >
                  Profile
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="hidden sm:block text-secondary hover:text-white transition-colors text-xs sm:text-sm font-medium"
              >
                Sign Out
              </button>
            </>
          )}

          {/* Mobile menu button */}
          {isStaff && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isStaff && mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-elevated">
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href.split('/').slice(0, 3).join('/'))
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={clsx(
                    'block w-full text-left px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-secondary hover:bg-white/10 hover:text-white',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
            <div className="border-t border-white/10 pt-2 mt-2">
              {profile?.role === 'client' && (
                <button
                  onClick={() => handleNavClick('/client/profile')}
                  className="block w-full text-left px-4 py-2 rounded-lg font-medium text-secondary hover:bg-white/10 hover:text-white transition-colors text-sm"
                >
                  Profile
                </button>
              )}
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 rounded-lg font-medium text-secondary hover:bg-white/10 hover:text-white transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

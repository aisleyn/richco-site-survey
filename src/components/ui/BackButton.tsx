import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './Button'

interface BackButtonProps {
  label?: string
  className?: string
}

export function BackButton({ label = 'Back', className = '' }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const userType = pathSegments[0] // 'staff' or 'client'

    // Settings-related admin pages (staff only)
    const settingsRelatedPages = ['users', 'vendors', 'vendor-projects']
    const isSettingsRelated = settingsRelatedPages.includes(pathSegments[1])

    // Main pages have 2 segments: /staff/surveys, /staff/projects, /client/projects, etc.
    const isMainPage =
      pathSegments.length === 1 || // /staff or /client
      (pathSegments.length === 2 && !pathSegments[1].match(/^[a-f0-9-]{36}$/) && !isSettingsRelated) // /staff/surveys, /client/projects, etc.

    if (isMainPage) {
      // Main page: go to dashboard
      navigate(`/${userType}`)
    } else if (isSettingsRelated) {
      // Settings-related pages: go to settings (staff only)
      navigate('/staff/settings')
    } else {
      // Subpage: go to appropriate parent page
      let parentPath = ''

      if (pathSegments[1] === 'surveys' && pathSegments[2]) {
        // /staff/surveys/:surveyId → /staff/surveys
        parentPath = `/${userType}/surveys`
      } else if (pathSegments[1] === 'projects' && pathSegments[2]) {
        if (pathSegments[3]) {
          // /staff/projects/:projectId/... → /staff/projects/:projectId
          parentPath = `/${userType}/projects/${pathSegments[2]}`
        } else {
          // /staff/projects/:projectId → /staff/projects
          parentPath = `/${userType}/projects`
        }
      } else {
        // Fallback to dashboard
        parentPath = `/${userType}`
      }

      navigate(parentPath)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`gap-2 ${className}`}
      title="Go back to previous page"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

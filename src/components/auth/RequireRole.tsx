import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { UserRole } from '../../types'
import { Spinner } from '../ui'

interface RequireRoleProps {
  allowedRole: UserRole
  children: React.ReactNode
}

export function RequireRole({ allowedRole, children }: RequireRoleProps) {
  const { session, profile, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (profile && profile.role && profile.role !== allowedRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to access this page.</p>
          <p className="text-sm text-slate-500">Required role: {allowedRole}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

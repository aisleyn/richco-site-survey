import { Card, Button } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import { useNavigate, Link } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      alert('Failed to sign out')
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-secondary mt-2">Manage your account and preferences</p>
      </div>

      {/* Account Section */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-secondary uppercase">Email</label>
            <p className="text-sm text-white mt-1">{profile?.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-secondary uppercase block mb-2">Full Name</label>
            <p className="text-sm text-white">{profile?.full_name || 'Not set'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-secondary uppercase">Role</label>
            <p className="text-sm text-white mt-1 capitalize">
              {profile?.role === 'richco_staff' ? 'Staff' : 'Client'}
            </p>
          </div>
        </div>
      </Card>

      {/* User Management */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">User Management</h2>
        <p className="text-sm text-secondary mb-4">Manage client accounts, reset passwords, and assign vendors.</p>
        <Link to="/staff/users">
          <Button variant="secondary" size="sm">Manage Users</Button>
        </Link>
      </Card>

      {/* Sign Out */}
      <Card className="border-slate-700 bg-slate-800 py-3 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Sign Out?</h2>
            <p className="text-sm text-secondary mt-1">
              You'll need to log back in to continue.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Info */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Richco Site Survey</strong> • Version 1.0 • All systems operational
        </p>
      </Card>
    </div>
  )
}

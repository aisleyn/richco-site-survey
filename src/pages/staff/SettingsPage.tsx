import { useState } from 'react'
import { Card, Button, Input } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import { useNavigate, Link } from 'react-router-dom'

function getAuthToken(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (!projectId) return null
  const sbKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(sbKey)
  return raw ? JSON.parse(raw)?.access_token ?? null : null
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      alert('Failed to sign out')
    }
  }

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      setMessage({ type: 'error', text: 'Full name cannot be empty' })
      return
    }

    setIsSavingName(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${profile?.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ full_name: fullName }),
        }
      )

      if (!response.ok) {
        setMessage({ type: 'error', text: 'Failed to save name' })
        return
      }

      setMessage({ type: 'success', text: 'Name updated successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save name' })
    } finally {
      setIsSavingName(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-secondary mt-2">Manage your account and preferences</p>
      </div>

      {message && (
        <Card className={`p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </Card>
      )}

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
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button
                onClick={handleSaveName}
                variant="primary"
                isLoading={isSavingName}
                size="sm"
              >
                Save
              </Button>
            </div>
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
          <Button variant="primary">Manage Users</Button>
        </Link>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
        <p className="text-sm text-red-800 mb-4">
          Sign out from your account. You'll need to log back in to continue.
        </p>
        <Button
          variant="primary"
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700"
        >
          Sign Out
        </Button>
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

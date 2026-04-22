import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Button, Card, Input, Spinner } from '../../components/ui'

interface Vendor {
  id: string
  name: string
}

function getAuthToken(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (!projectId) return null
  const sbKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(sbKey)
  return raw ? JSON.parse(raw)?.access_token ?? null : null
}

export default function ProfilePage() {
  const { profile, session } = useAuthStore()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadVendor = async () => {
    if (!profile?.vendor_id) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors?id=eq.${profile.vendor_id}`,
        {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        }
      )
      const data = await response.json()
      setVendor(data.length > 0 ? data[0] : null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVendor()
  }, [profile?.vendor_id])

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

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      setMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setIsChanging(true)
    try {
      // First verify current password by attempting to sign in
      const verifyRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: profile?.email,
            password: currentPassword,
          }),
        }
      )

      if (!verifyRes.ok) {
        setMessage({ type: 'error', text: 'Current password is incorrect' })
        return
      }

      // Now change the password
      const token = getAuthToken()
      const changeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ password: newPassword }),
        }
      )

      if (!changeRes.ok) {
        const error = await changeRes.json()
        setMessage({ type: 'error', text: error.message || 'Failed to change password' })
        return
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setIsChanging(false)
    }
  }

  if (!session || !profile) {
    return <Spinner size="lg" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-secondary">Manage your account settings and preferences</p>
      </div>

      {message && (
        <Card className={`p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-secondary">Email</p>
            <p className="text-lg font-medium text-white">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm text-secondary block mb-2">Full Name</label>
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
        </div>
      </Card>

      {!isLoading && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Vendor Assignment</h2>
          {vendor ? (
            <div>
              <p className="text-sm text-secondary">Assigned Vendor</p>
              <p className="text-lg font-medium text-white">{vendor.name}</p>
            </div>
          ) : (
            <p className="text-secondary">Not assigned to a vendor yet. Contact your administrator.</p>
          )}
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            onClick={handleChangePassword}
            variant="primary"
            className="w-full"
            isLoading={isChanging}
          >
            Change Password
          </Button>
        </div>
      </Card>
    </div>
  )
}

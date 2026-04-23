import { useEffect, useState } from 'react'
import { Button, Card, Input, Spinner } from '../../components/ui'
import { useAuthStore } from '../../store/authStore'
import type { Profile } from '../../types'

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

export default function UserManagementPage() {
  const { profile: currentUser } = useAuthStore()
  const [staffUsers, setStaffUsers] = useState<Profile[]>([])
  const [clientUsers, setClientUsers] = useState<Profile[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [editingFullName, setEditingFullName] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedRole, setSelectedRole] = useState('client')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const [staffRes, clientRes, vendorsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?role=eq.richco_staff`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?role=eq.client`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, { headers }),
      ])

      const staffData = await staffRes.json()
      const clientData = await clientRes.json()
      const vendorsData = await vendorsRes.json()

      setStaffUsers(staffData || [])
      setClientUsers(clientData || [])
      setVendors(vendorsData || [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectUser = (user: Profile) => {
    setSelectedUser(user)
    setFullName(user.full_name || '')
    setNewPassword('')
    setSelectedVendor(user.vendor_id || '')
    setSelectedRole(user.role || 'client')
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return

    setIsUpdating(true)
    try {
      const response = await fetch('http://localhost:3002/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          new_password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(`Error: ${data.error}`)
        return
      }

      alert('Password reset successfully')
      setNewPassword('')
    } catch (err) {
      console.error('Failed to reset password', err)
      alert('Failed to reset password')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateVendor = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedUser.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ vendor_id: selectedVendor || null }),
        }
      )

      if (!response.ok) {
        alert('Failed to update vendor')
        return
      }

      alert('Vendor updated successfully')
      loadData()
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to update vendor', err)
      alert('Failed to update vendor')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateFullName = async () => {
    if (!selectedUser || !fullName.trim()) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedUser.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ full_name: fullName }),
        }
      )

      if (!response.ok) {
        alert('Failed to update name')
        return
      }

      loadData()
      alert('Name updated successfully')
    } catch (err) {
      console.error('Failed to update name', err)
      alert('Failed to update name')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleArchiveAccount = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedUser.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ archived: !selectedUser.archived }),
        }
      )

      if (!response.ok) {
        alert('Failed to update account')
        return
      }

      loadData()
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to update account', err)
      alert('Failed to update account')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedUser.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ role: selectedRole }),
        }
      )

      if (!response.ok) {
        alert('Failed to update role')
        return
      }

      alert('Role updated successfully')
      loadData()
    } catch (err) {
      console.error('Failed to update role', err)
      alert('Failed to update role')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedUser || !confirm('Are you sure you want to delete this account? This cannot be undone.')) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedUser.id}`,
        {
          method: 'DELETE',
          headers,
        }
      )

      if (!response.ok) {
        alert('Failed to delete account')
        return
      }

      alert('Account deleted successfully')
      loadData()
      setSelectedUser(null)
    } catch (err) {
      console.error('Failed to delete account', err)
      alert('Failed to delete account')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) return <Spinner size="lg" />

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <div className="space-y-2">
          {/* Current user section */}
          {currentUser && (
            <div className="mb-3 pb-3 border-b border-slate-200">
              <p className="text-xs font-semibold text-secondary mb-2 uppercase">Your Account</p>
              <button
                onClick={() => handleSelectUser(currentUser)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedUser?.id === currentUser.id
                    ? 'bg-brand-amber/10 border-brand-amber'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium text-white text-sm">{currentUser.email}</p>
                <p className="text-xs text-secondary">Staff</p>
              </button>
            </div>
          )}

          {/* Staff users */}
          {staffUsers.length > 0 && (
            <div className="mb-3 pb-3 border-b border-slate-200">
              <p className="text-xs font-semibold text-secondary mb-2 uppercase">Staff</p>
              {staffUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors mb-2 ${
                    selectedUser?.id === user.id
                      ? 'bg-brand-amber/10 border-brand-amber'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium text-white text-sm">{user.email}</p>
                  <p className="text-xs text-secondary">Staff Member</p>
                </button>
              ))}
            </div>
          )}

          {/* Client users */}
          {clientUsers.length > 0 && <p className="text-xs font-semibold text-secondary mb-2 uppercase">Clients</p>}
          {clientUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedUser?.id === user.id
                  ? 'bg-brand-amber/10 border-brand-amber'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="font-medium text-white text-sm">{user.email}</p>
              <p className="text-xs text-secondary">
                {vendors.find((v) => v.id === user.vendor_id)?.name || 'No vendor'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedUser ? (
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Edit User</h2>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-white mb-2">Email</p>
                <p className="text-secondary">{selectedUser.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Full Name</label>
                {editingFullName ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={selectedRole === 'richco_staff' ? "Staff member's full name" : "Client's full name"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <Button
                      onClick={handleUpdateFullName}
                      variant="primary"
                      isLoading={isUpdating}
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingFullName(false)}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : fullName ? (
                  <div className="flex items-center justify-between">
                    <p className="text-secondary">{fullName}</p>
                    <Button
                      onClick={() => setEditingFullName(true)}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={selectedRole === 'richco_staff' ? "Staff member's full name" : "Client's full name"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <Button
                      onClick={handleUpdateFullName}
                      variant="primary"
                      isLoading={isUpdating}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Reset Password</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="New password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    onClick={handleResetPassword}
                    variant="primary"
                    isLoading={isUpdating}
                    disabled={newPassword.length < 8}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {selectedRole !== 'richco_staff' && (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Assign Vendor</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedVendor}
                      onChange={(e) => setSelectedVendor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
                    >
                      <option value="">None</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleUpdateVendor}
                      variant="primary"
                      isLoading={isUpdating}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-white mb-2 block">User Role</label>
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
                  >
                    <option value="client">Client</option>
                    <option value="richco_staff">Staff</option>
                  </select>
                  <Button
                    onClick={handleUpdateRole}
                    variant="primary"
                    isLoading={isUpdating}
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Button
                  onClick={handleArchiveAccount}
                  variant={selectedUser.archived ? 'primary' : 'secondary'}
                  className="w-full"
                  isLoading={isUpdating}
                >
                  {selectedUser.archived ? 'Restore Account' : 'Archive Account'}
                </Button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 bg-red-700 hover:bg-red-500 text-white font-medium rounded-lg transition-colors duration-200 disabled:bg-red-600 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>

              <Button
                onClick={() => setSelectedUser(null)}
                variant="secondary"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-secondary text-lg">Select a user to manage</p>
          </Card>
        )}
      </div>
      </div>
    </div>
  )
}

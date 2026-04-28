import { useEffect, useState } from 'react'
import { Button, Card, Input, Spinner } from '../../components/ui'
import type { Profile } from '../../types'

interface ClientCreationResult {
  user_id: string
  email: string
  temp_password: string
}

function getAuthToken(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (!projectId) return null
  const sbKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(sbKey)
  return raw ? JSON.parse(raw)?.access_token ?? null : null
}

export default function AccountsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [staff, setStaff] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [createdClient, setCreatedClient] = useState<ClientCreationResult | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const token = getAuthToken()
      const headers = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const [clientsRes, staffRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?role=eq.client`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?role=eq.richco_staff`, { headers }),
      ])

      const clientsData = clientsRes.ok ? await clientsRes.json() : []
      const staffData = staffRes.ok ? await staffRes.json() : []

      setClients(Array.isArray(clientsData) ? clientsData : [])
      setStaff(Array.isArray(staffData) ? staffData : [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientEmail.trim()) return

    setIsCreating(true)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: newClientEmail,
            full_name: newClientName,
          }),
        }
      )

      const result = await response.json()
      console.log('Response:', response.status, result)

      if (!response.ok) {
        alert(`Error: ${result.error}`)
        return
      }

      setCreatedClient(result)
      setNewClientEmail('')
      setNewClientName('')
      loadClients()
    } catch (err) {
      console.error('Failed to create client', err)
      alert('Failed to create client account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClient = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this client account? This cannot be undone.')) return

    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ user_id: userId }),
        }
      )

      if (!response.ok) {
        const result = await response.json()
        alert(`Error: ${result.error}`)
        return
      }

      loadClients()
    } catch (err) {
      console.error('Failed to delete client', err)
      alert('Failed to delete client account')
    }
  }

  if (isLoading) return <Spinner size="lg" />

  const activeClients = clients.filter(c => !c.archived)
  const archivedClients = clients.filter(c => c.archived)
  const activeStaff = staff.filter(s => !s.archived)

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Accounts</h1>

      {/* Create New Client Account - Moved to Top */}
      <div>
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Create New Client Account</h2>
          <div className="space-y-4">
            <Input
              label="Client Email"
              type="email"
              placeholder="client@example.com"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
            />
            <Input
              label="Full Name (Optional)"
              type="text"
              placeholder="John Doe"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
            <Button
              onClick={handleCreateClient}
              variant="primary"
              className="w-full"
              isLoading={isCreating}
            >
              Create Account
            </Button>
          </div>
        </Card>

        {createdClient && (
          <Card className="p-6 mb-6 bg-green-50 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Account Created Successfully!</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-green-700">Email:</p>
                <p className="font-mono text-green-900 break-all">{createdClient.email}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">Temporary Password:</p>
                <p className="font-mono text-green-900 break-all">{createdClient.temp_password}</p>
              </div>
              <div className="bg-green-100 p-3 rounded text-sm text-green-800">
                <p className="font-semibold mb-2">Send this to the client:</p>
                <pre className="whitespace-pre-wrap break-words text-xs">
{`Email: ${createdClient.email}
Password: ${createdClient.temp_password}

Please log in and change your password on first login.`}
                </pre>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${createdClient.email}\nPassword: ${createdClient.temp_password}`
                  )
                  alert('Credentials copied to clipboard!')
                }}
                variant="primary"
                size="sm"
              >
                Copy Credentials
              </Button>
              <Button
                onClick={() => setCreatedClient(null)}
                variant="secondary"
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Active Clients */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Active Clients</h2>
        <div className="grid gap-4">
          {activeClients.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-secondary">No active client accounts</p>
            </Card>
          ) : (
            activeClients.map((client) => (
              <Card key={client.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 status-dot"></div>
                  <div>
                    <p className="font-semibold text-white">{client.email}</p>
                    <p className="text-sm text-secondary">{client.full_name || 'No name set'}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDeleteClient(client.id)}
                  variant="danger"
                  size="sm"
                >
                  Delete
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Active Staff */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Active Staff</h2>
        <div className="grid gap-4">
          {activeStaff.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-secondary">No active staff accounts</p>
            </Card>
          ) : (
            activeStaff.map((staffMember) => (
              <Card key={staffMember.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 status-dot"></div>
                  <div>
                    <p className="font-semibold text-white">{staffMember.email}</p>
                    <p className="text-sm text-secondary">{staffMember.full_name || 'No name set'}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>


      {/* Archived Clients - Expandable */}
      {archivedClients.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-lg font-bold text-secondary hover:text-white transition-colors flex items-center gap-2"
          >
            <span>{showArchived ? '▼' : '▶'}</span>
            Archived Clients ({archivedClients.length})
          </button>

          {showArchived && (
            <div className="grid gap-4 mt-4">
              {archivedClients.map((client) => (
                <Card key={client.id} className="p-4 flex items-center justify-between opacity-60">
                  <div>
                    <p className="font-semibold text-white">{client.email}</p>
                    <p className="text-sm text-secondary">{client.full_name || 'No name set'}</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteClient(client.id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

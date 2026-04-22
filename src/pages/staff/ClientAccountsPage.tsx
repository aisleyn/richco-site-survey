import { useEffect, useState } from 'react'
import { Button, Card, Input, Spinner } from '../../components/ui'
import type { Profile } from '../../types'

interface ClientCreationResult {
  user_id: string
  email: string
  temp_password: string
}

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

export default function ClientAccountsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [createdClient, setCreatedClient] = useState<ClientCreationResult | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
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

      const [clientsRes, vendorsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?role=eq.client`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, { headers }),
      ])

      const clientsData = clientsRes.ok ? await clientsRes.json() : []
      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : []

      setClients(Array.isArray(clientsData) ? clientsData : [])
      setVendors(Array.isArray(vendorsData) ? vendorsData : [])
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

  const handleAssignVendor = async () => {
    if (!selectedClientId || !selectedVendorId) return

    setIsAssigning(true)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      // Get vendor's first project
      const vendorProjectsResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects?vendor_id=eq.${selectedVendorId}&limit=1`,
        { headers }
      )
      const vendorProjects = await vendorProjectsResp.json()
      const assignedProjectId = vendorProjects.length > 0 ? vendorProjects[0].project_id : null

      // Update profile with vendor and project
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${selectedClientId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            vendor_id: selectedVendorId,
            project_id: assignedProjectId,
          }),
        }
      )

      if (!response.ok) {
        alert('Failed to assign vendor')
        return
      }

      alert('Vendor assigned successfully')
      setSelectedClientId('')
      setSelectedVendorId('')
      loadClients()
    } catch (err) {
      console.error('Failed to assign vendor', err)
      alert('Failed to assign vendor')
    } finally {
      setIsAssigning(false)
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Client Accounts</h1>

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

      {/* Create and Assign Sections */}
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

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Assign Client to Vendor</h2>
          <div className="space-y-4">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.email}
                </option>
              ))}
            </select>

            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
            >
              <option value="">Select vendor...</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>

            <Button
              onClick={handleAssignVendor}
              variant="primary"
              className="w-full"
              isLoading={isAssigning}
            >
              Assign Vendor
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

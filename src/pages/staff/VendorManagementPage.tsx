import { useEffect, useState } from 'react'
import { Button, Card, Input, Spinner } from '../../components/ui'

function getAuthToken(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (!projectId) return null
  const sbKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(sbKey)
  return raw ? JSON.parse(raw)?.access_token ?? null : null
}

interface Client {
  id: string
  name: string
  contact_email?: string
}

interface Project {
  id: string
  name: string
}

interface VendorProject {
  id: string
  vendor_id: string
  project_id: string
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [vendorProjects, setVendorProjects] = useState<VendorProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [selectedClientForProject, setSelectedClientForProject] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedClientToEdit, setSelectedClientToEdit] = useState<Client | null>(null)
  const [editingEmail, setEditingEmail] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

      const [clientsRes, projectsRes, clientProjectsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/projects`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects`, { headers }),
      ])

      const clientsData = clientsRes.ok ? await clientsRes.json() : []
      const projectsData = projectsRes.ok ? await projectsRes.json() : []
      const clientProjectsData = clientProjectsRes.ok ? await clientProjectsRes.json() : []

      setClients(Array.isArray(clientsData) ? clientsData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setVendorProjects(Array.isArray(clientProjectsData) ? clientProjectsData : [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClient = async () => {
    if (!newClientName.trim()) return

    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newClientName,
          contact_email: newClientEmail || null,
        }),
      })

      if (response.ok) {
        setNewClientName('')
        setNewClientEmail('')
        loadData()
      }
    } catch (err) {
      console.error('Failed to add client', err)
    }
  }

  const handleUpdateClientEmail = async () => {
    if (!selectedClientToEdit || !editingEmail.trim()) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors?id=eq.${selectedClientToEdit.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ contact_email: editingEmail }),
        }
      )

      if (response.ok) {
        setSelectedClientToEdit(null)
        loadData()
      }
    } catch (err) {
      console.error('Failed to update client email', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLinkClientToProject = async () => {
    if (!selectedClientForProject || !selectedProject) return

    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vendor_id: selectedClientForProject,
          project_id: selectedProject,
        }),
      })

      if (response.ok) {
        setSelectedClientForProject('')
        setSelectedProject('')
        loadData()
      }
    } catch (err) {
      console.error('Failed to link client to project', err)
    }
  }

  const handleRemoveClientProject = async (vpId: string) => {
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects?id=eq.${vpId}`, {
        method: 'DELETE',
        headers,
      })
      loadData()
    } catch (err) {
      console.error('Failed to remove client-project link', err)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client? This cannot be undone.')) {
      return
    }

    setDeletingId(clientId)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      // Delete vendor_projects associations first
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects?vendor_id=eq.${clientId}`, {
        method: 'DELETE',
        headers,
      })
      // Then delete the client
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors?id=eq.${clientId}`, {
        method: 'DELETE',
        headers,
      })
      setSelectedClientToEdit(null)
      loadData()
    } catch (err) {
      console.error('Failed to delete client', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) return <Spinner size="lg" />

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Client Management</h1>

      {/* Clients List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Clients</h2>
        <div className="grid gap-4">
          {clients.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-secondary">No clients yet</p>
            </Card>
          ) : (
            clients.map((client) => (
              <Card key={client.id} className="p-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedClientToEdit(client)
                    setEditingEmail(client.contact_email || '')
                  }}
                  className="flex-1 text-left flex items-center gap-3 cursor-pointer hover:opacity-80"
                >
                  <div className="w-3 h-3 rounded-full bg-green-500 status-dot"></div>
                  <div>
                    <p className="font-semibold text-white">{client.name}</p>
                    <p className="text-sm text-secondary">{client.contact_email || 'No email set'}</p>
                  </div>
                </button>
                <Button
                  onClick={() => handleDeleteClient(client.id)}
                  variant="danger"
                  size="sm"
                  isLoading={deletingId === client.id}
                >
                  Delete
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add and Edit Sections */}
      <div>
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add Client</h2>
          <div className="space-y-3">
            <Input
              placeholder="Client name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
            <Input
              placeholder="Contact email"
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
            />
            <Button onClick={handleAddClient} variant="primary" className="w-full">
              Add Client
            </Button>
          </div>
        </Card>

        {selectedClientToEdit && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Client Email</h2>
            <p className="text-sm text-secondary mb-4">Editing: <span className="font-medium">{selectedClientToEdit.name}</span></p>
            <div className="space-y-3">
              <Input
                placeholder="Contact email"
                type="email"
                value={editingEmail}
                onChange={(e) => setEditingEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateClientEmail}
                  variant="primary"
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Saving...' : 'Save Email'}
                </Button>
                <Button
                  onClick={() => setSelectedClientToEdit(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Link Client to Project</h2>
          <div className="space-y-4">
            <select
              value={selectedClientForProject}
              onChange={(e) => setSelectedClientForProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
            >
              <option value="">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
            >
              <option value="">Select project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <Button onClick={handleLinkClientToProject} variant="primary" className="w-full">
              Link Client to Project
            </Button>
          </div>

          {vendorProjects.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-white mb-3">Linked Projects</h3>
              <div className="space-y-2">
                {vendorProjects.map((vp) => {
                  const client = clients.find((v) => v.id === vp.vendor_id)
                  const project = projects.find((p) => p.id === vp.project_id)
                  return (
                    <div key={vp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-black text-sm">{client?.name}</p>
                        <p className="text-xs text-secondary">{project?.name}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveClientProject(vp.id)}
                        variant="danger"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Button, Card, Input, Spinner } from '../../components/ui'

function getAuthToken(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (!projectId) return null
  const sbKey = `sb-${projectId}-auth-token`
  const raw = localStorage.getItem(sbKey)
  return raw ? JSON.parse(raw)?.access_token ?? null : null
}

interface Vendor {
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

export default function VendorManagementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [vendorProjects, setVendorProjects] = useState<VendorProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorEmail, setNewVendorEmail] = useState('')
  const [selectedVendorForProject, setSelectedVendorForProject] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedVendorToEdit, setSelectedVendorToEdit] = useState<Vendor | null>(null)
  const [editingEmail, setEditingEmail] = useState('')
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

      const [vendorsRes, projectsRes, vendorProjectsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/projects`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects`, { headers }),
      ])

      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : []
      const projectsData = projectsRes.ok ? await projectsRes.json() : []
      const vendorProjectsData = vendorProjectsRes.ok ? await vendorProjectsRes.json() : []

      setVendors(Array.isArray(vendorsData) ? vendorsData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setVendorProjects(Array.isArray(vendorProjectsData) ? vendorProjectsData : [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVendor = async () => {
    if (!newVendorName.trim()) return

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
          name: newVendorName,
          contact_email: newVendorEmail || null,
        }),
      })

      if (response.ok) {
        setNewVendorName('')
        setNewVendorEmail('')
        loadData()
      }
    } catch (err) {
      console.error('Failed to add vendor', err)
    }
  }

  const handleUpdateVendorEmail = async () => {
    if (!selectedVendorToEdit || !editingEmail.trim()) return

    setIsUpdating(true)
    try {
      const token = getAuthToken()
      const headers: HeadersInit = {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors?id=eq.${selectedVendorToEdit.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ contact_email: editingEmail }),
        }
      )

      if (response.ok) {
        setSelectedVendorToEdit(null)
        loadData()
      }
    } catch (err) {
      console.error('Failed to update vendor email', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLinkVendorToProject = async () => {
    if (!selectedVendorForProject || !selectedProject) return

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
          vendor_id: selectedVendorForProject,
          project_id: selectedProject,
        }),
      })

      if (response.ok) {
        setSelectedVendorForProject('')
        setSelectedProject('')
        loadData()
      }
    } catch (err) {
      console.error('Failed to link vendor to project', err)
    }
  }

  const handleRemoveVendorProject = async (vpId: string) => {
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
      console.error('Failed to remove vendor-project link', err)
    }
  }

  if (isLoading) return <Spinner size="lg" />

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">Vendor Management</h1>

      {/* Vendors List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Vendors</h2>
        <div className="grid gap-4">
          {vendors.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-secondary">No vendors yet</p>
            </Card>
          ) : (
            vendors.map((vendor) => (
              <button
                key={vendor.id}
                onClick={() => {
                  setSelectedVendorToEdit(vendor)
                  setEditingEmail(vendor.contact_email || '')
                }}
                className="w-full text-left"
              >
                <Card className="p-4 flex items-center justify-between cursor-pointer hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 status-dot"></div>
                    <div>
                      <p className="font-semibold text-white">{vendor.name}</p>
                      <p className="text-sm text-secondary">{vendor.contact_email || 'No email set'}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Add and Edit Sections */}
      <div>
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add Vendor</h2>
          <div className="space-y-3">
            <Input
              placeholder="Vendor name"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
            />
            <Input
              placeholder="Contact email"
              type="email"
              value={newVendorEmail}
              onChange={(e) => setNewVendorEmail(e.target.value)}
            />
            <Button onClick={handleAddVendor} variant="primary" className="w-full">
              Add Vendor
            </Button>
          </div>
        </Card>

        {selectedVendorToEdit && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Vendor Email</h2>
            <p className="text-sm text-secondary mb-4">Editing: <span className="font-medium">{selectedVendorToEdit.name}</span></p>
            <div className="space-y-3">
              <Input
                placeholder="Contact email"
                type="email"
                value={editingEmail}
                onChange={(e) => setEditingEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateVendorEmail}
                  variant="primary"
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Saving...' : 'Save Email'}
                </Button>
                <Button
                  onClick={() => setSelectedVendorToEdit(null)}
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
          <h2 className="text-xl font-semibold text-white mb-4">Link Vendor to Project</h2>
          <div className="space-y-4">
            <select
              value={selectedVendorForProject}
              onChange={(e) => setSelectedVendorForProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black"
            >
              <option value="">Select vendor...</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
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

            <Button onClick={handleLinkVendorToProject} variant="primary" className="w-full">
              Link Vendor to Project
            </Button>
          </div>

          {vendorProjects.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-white mb-3">Linked Projects</h3>
              <div className="space-y-2">
                {vendorProjects.map((vp) => {
                  const vendor = vendors.find((v) => v.id === vp.vendor_id)
                  const project = projects.find((p) => p.id === vp.project_id)
                  return (
                    <div key={vp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-black text-sm">{vendor?.name}</p>
                        <p className="text-xs text-secondary">{project?.name}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveVendorProject(vp.id)}
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

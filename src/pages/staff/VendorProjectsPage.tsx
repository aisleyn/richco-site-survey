import { useEffect, useState } from 'react'
import { Button, Card, Spinner } from '../../components/ui'

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

export default function VendorProjectsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [vendorProjects, setVendorProjects] = useState<VendorProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedProject, setSelectedProject] = useState('')

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

      const [vendorsRes, projectsRes, vpRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendors`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/projects`, { headers }),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects`, { headers }),
      ])

      const vendorsData = await vendorsRes.json()
      const projectsData = await projectsRes.json()
      const vpData = await vpRes.json()

      setVendors(vendorsData || [])
      setProjects(projectsData || [])
      setVendorProjects(vpData || [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMapping = async () => {
    if (!selectedVendor || !selectedProject) return

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
          vendor_id: selectedVendor,
          project_id: selectedProject,
        }),
      })

      if (response.ok) {
        setSelectedVendor('')
        setSelectedProject('')
        loadData()
      }
    } catch (err) {
      console.error('Failed to add mapping', err)
    }
  }

  const handleRemoveMapping = async (vpId: string) => {
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
      console.error('Failed to remove mapping', err)
    }
  }

  if (isLoading) return <Spinner size="lg" />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-6">Vendor-Project Mapping</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Link Vendor to Project</h2>
          <div className="space-y-4">
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <Button onClick={handleAddMapping} variant="primary" className="w-full">
              Link Vendor to Project
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Vendor-Project Links</h2>
        <div className="grid gap-4">
          {vendorProjects.map((vp) => {
            const vendor = vendors.find((v) => v.id === vp.vendor_id)
            const project = projects.find((p) => p.id === vp.project_id)
            return (
              <Card key={vp.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{vendor?.name || 'Unknown'}</p>
                  <p className="text-sm text-secondary">{project?.name || 'Unknown'}</p>
                </div>
                <Button
                  onClick={() => handleRemoveMapping(vp.id)}
                  variant="danger"
                  size="sm"
                >
                  Remove
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

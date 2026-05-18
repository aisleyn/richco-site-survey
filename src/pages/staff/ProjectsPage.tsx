import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '../../lib/supabase'
import { getProjects, createProject, getClients } from '../../services/projects'
import type { Project, ProjectFormValues, Profile } from '../../types'
import { Card, Button, Input, Modal, EmptyState, SkeletonGrid, BackButton, Select } from '../../components/ui'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_id: z.string().min(1, 'Client is required'),
  project_type: z.enum(['maintenance', 'development']).default('maintenance'),
})

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [clientMap, setClientMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [projectsData, clientsData] = await Promise.all([
        getProjects(),
        getClients(),
      ])
      setProjects(projectsData)
      setClients(clientsData)

      const map = clientsData.reduce((acc, client) => {
        acc[client.id] = client.email
        return acc
      }, {} as Record<string, string>)
      setClientMap(map)

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      const newProject = await createProject(data)
      setProjects([newProject, ...projects])
      setIsModalOpen(false)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
      setProjects(projects.filter((p) => p.id !== projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const handleArchiveProject = async (e: React.MouseEvent, projectId: string, archived: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const projectId2 = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
      let token: string | null = null
      if (projectId2) {
        const sbKey = `sb-${projectId2}-auth-token`
        const raw = localStorage.getItem(sbKey)
        token = raw ? JSON.parse(raw)?.access_token ?? null : null
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ archived: !archived }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update project')
      }
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-10 bg-slate-200 rounded w-40 animate-pulse mb-2"></div>
          <div className="h-5 bg-slate-200 rounded w-64 animate-pulse"></div>
        </div>
        <SkeletonGrid count={3} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton label="Back to Dashboard" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Projects</h1>
          <p className="text-secondary mt-1 text-sm sm:text-base">Manage your client projects</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto sm:mt-1">
          New Project
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No projects yet"
          description="Create your first project to start managing site surveys"
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Active Projects */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Active Projects</h2>
            <div className="grid grid-cols-1 gap-4">
              {projects
                .filter((p) => !p.archived)
                .map((project) => (
                  <Link key={project.id} to={`/staff/projects/${project.id}`}>
                    <Card className="card-hover cursor-pointer">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-lg font-semibold text-white truncate">{project.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              project.project_type === 'development'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.project_type === 'development' ? 'Development' : 'Maintenance'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-secondary mt-1">
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Attached Client User: {project.client_id ? (clientMap[project.client_id] || 'unknown') : 'none'}
                          </p>
                        </div>
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center xs:gap-2 gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleArchiveProject(e, project.id, project.archived || false)}
                            className="text-amber-600 hover:text-amber-700 text-xs xs:text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-white/5"
                          >
                            Archive
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(e, project.id)}
                            className="text-red-600 hover:text-red-700 text-xs xs:text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-white/5"
                          >
                            Delete
                          </button>
                          <svg className="hidden xs:block w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
            {projects.filter((p) => !p.archived).length === 0 && (
              <p className="text-secondary text-center py-8">No active projects</p>
            )}
          </div>

          {/* Archived Projects */}
          {projects.some((p) => p.archived) && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Archived Projects</h2>
              <div className="grid grid-cols-1 gap-4 opacity-75">
                {projects
                  .filter((p) => p.archived)
                  .map((project) => (
                    <Link key={project.id} to={`/staff/projects/${project.id}`}>
                      <Card className="card-hover cursor-pointer bg-slate-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm sm:text-lg font-semibold text-white truncate">{project.name}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                project.project_type === 'development'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {project.project_type === 'development' ? 'Development' : 'Maintenance'}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-secondary mt-1">
                              Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Attached Client User: {project.client_id ? (clientMap[project.client_id] || 'unknown') : 'none'}
                            </p>
                          </div>
                          <div className="flex flex-col xs:flex-row items-stretch xs:items-center xs:gap-2 gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => handleArchiveProject(e, project.id, project.archived || false)}
                              className="text-blue-600 hover:text-blue-700 text-xs xs:text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-white/5"
                            >
                              Restore
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(e, project.id)}
                              className="text-red-600 hover:text-red-700 text-xs xs:text-sm font-medium transition-colors px-2 py-1 rounded hover:bg-white/5"
                            >
                              Delete
                            </button>
                            <svg className="hidden xs:block w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Project Name" error={errors.name?.message} {...register('name')} />
          <div>
            <Select
              label="Link Client"
              {...register('client_id')}
              options={[
                { value: '', label: 'Select a client...' },
                ...clients.map((client) => ({
                  value: client.id,
                  label: client.full_name || client.email,
                })),
              ]}
            />
            {errors.client_id?.message && (
              <p className="text-red-600 text-sm mt-1">{errors.client_id.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Project Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="maintenance"
                  {...register('project_type')}
                  className="w-4 h-4"
                />
                <span className="text-white">Maintenance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="development"
                  {...register('project_type')}
                  className="w-4 h-4"
                />
                <span className="text-white">Development</span>
              </label>
            </div>
          </div>
          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Create Project
          </Button>
        </form>
      </Modal>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '../../lib/supabase'
import { getProjects, createProject } from '../../services/projects'
import type { Project, Profile, ProjectFormValues } from '../../types'
import { Card, Button, Input, Select, Modal, EmptyState, SkeletonGrid } from '../../components/ui'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_id: z.string().min(1, 'Client is required'),
})

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Profile[]>([])
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
        supabase.from('profiles').select('*').eq('role', 'client'),
      ])
      setProjects(projectsData)
      setClients(clientsData.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-secondary mt-1">Manage your client projects</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
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
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                          <p className="text-sm text-secondary mt-1">
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleArchiveProject(e, project.id, project.archived || false)}
                            className="text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors"
                          >
                            Archive
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(e, project.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                            <p className="text-sm text-secondary mt-1">
                              Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleArchiveProject(e, project.id, project.archived || false)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(e, project.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <Select
            label="Client"
            options={clients.map((c) => ({
              value: c.id,
              label: c.full_name || c.email,
            }))}
            placeholder="Select a client"
            error={errors.client_id?.message}
            {...register('client_id')}
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Create Project
          </Button>
        </form>
      </Modal>
    </div>
  )
}

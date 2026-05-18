import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '../../lib/supabase'
import { getProjects, createProject, getClients, updateProject } from '../../services/projects'
import type { Project, ProjectFormValues, Profile } from '../../types'
import { Card, Button, Input, Modal, EmptyState, SkeletonGrid, BackButton, Select } from '../../components/ui'
import { CollapsibleActionMenu } from '../../components/project/CollapsibleActionMenu'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  client_id: z.string().min(1, 'Client is required'),
  project_type: z.enum(['new_project', 'in_development', 'maintenance']).default('new_project'),
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
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      client_id: '',
      project_type: 'new_project',
    },
  } as any)

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
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const newProject = await createProject(data as ProjectFormValues)
      setProjects([newProject, ...projects])
      setIsModalOpen(false)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return

    try {
      const msg = `[${new Date().toISOString()}] Starting delete for ${projectId}`
      console.log(msg)
      localStorage.setItem('debug-delete', msg)

      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) {
        const errMsg = `Delete error: ${JSON.stringify(error)}`
        console.error(errMsg)
        localStorage.setItem('debug-delete', errMsg)
        throw error
      }

      const msg2 = `[${new Date().toISOString()}] Delete succeeded`
      console.log(msg2)
      localStorage.setItem('debug-delete', msg2)

      setProjects(projects.filter((p) => p.id !== projectId))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const fullMsg = `[${new Date().toISOString()}] Delete error: ${errMsg}`
      console.error(fullMsg)
      localStorage.setItem('debug-delete', fullMsg)
      setError(errMsg)
    }
  }

  const handleArchiveProject = async (projectId: string, archived: boolean) => {
    try {
      const msg = `[${new Date().toISOString()}] Starting archive for ${projectId}`
      console.log(msg)
      localStorage.setItem('debug-archive', msg)

      await updateProject(projectId, { archived: !archived })

      const msg2 = `[${new Date().toISOString()}] Archive succeeded`
      console.log(msg2)
      localStorage.setItem('debug-archive', msg2)

      loadData()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const fullMsg = `[${new Date().toISOString()}] Archive error: ${errMsg}`
      console.error(fullMsg)
      localStorage.setItem('debug-archive', fullMsg)
      setError(errMsg)
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
                  <Link
                    key={project.id}
                    to={`/staff/projects/${project.id}`}
                  >
                    <Card className="card-hover cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-lg font-semibold text-white truncate">{project.name}</h3>
                          <p className="text-xs sm:text-sm text-secondary mt-1">
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            project.project_type === 'new_project' || project.project_type === 'in_development'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.project_type === 'new_project' ? 'New Project' :
                             project.project_type === 'in_development' ? 'In Development' : 'Maintenance'}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <CollapsibleActionMenu
                              actions={[
                                {
                                  label: 'Archive',
                                  onClick: () => handleArchiveProject(project.id, project.archived || false),
                                },
                                {
                                  label: 'Delete',
                                  variant: 'danger' as const,
                                  onClick: () => handleDeleteProject(project.id),
                                },
                              ]}
                            />
                          </div>
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
                    <Link
                      key={project.id}
                      to={`/staff/projects/${project.id}`}
                    >
                      <Card className="card-hover cursor-pointer bg-slate-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-lg font-semibold text-white truncate">{project.name}</h3>
                            <p className="text-xs sm:text-sm text-secondary mt-1">
                              Created {new Date(project.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              project.project_type === 'new_project' || project.project_type === 'in_development'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.project_type === 'new_project' ? 'New Project' :
                               project.project_type === 'in_development' ? 'In Development' : 'Maintenance'}
                            </span>
                            <div onClick={(e) => e.stopPropagation()}>
                              <CollapsibleActionMenu
                                actions={[
                                  {
                                    label: 'Restore',
                                    onClick: () => handleArchiveProject(project.id, project.archived || false),
                                  },
                                  {
                                    label: 'Delete',
                                    variant: 'danger' as const,
                                    onClick: () => handleDeleteProject(project.id),
                                  },
                                ]}
                              />
                            </div>
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
          <Input label="Project Name" error={errors.name?.message as string | undefined} {...register('name')} />
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
              <p className="text-red-600 text-sm mt-1">{errors.client_id?.message as string}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Project Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="new_project"
                  {...register('project_type')}
                  className="w-4 h-4"
                />
                <span className="text-white">New Project</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="in_development"
                  {...register('project_type')}
                  className="w-4 h-4"
                />
                <span className="text-white">In Development</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="maintenance"
                  {...register('project_type')}
                  className="w-4 h-4"
                />
                <span className="text-white">Maintenance</span>
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

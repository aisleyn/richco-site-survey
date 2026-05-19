import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { Spinner, Card } from '../../components/ui'
import { ProjectStatusTimeline } from '../../components/project/ProjectStatusTimeline'
import { BackButton } from '../../components/ui/BackButton'
import type { Project } from '../../types'

export default function ClientProjectsPage() {
  const { profile } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      loadProjects()
    } else {
      setIsLoading(false)
    }
  }, [profile])

  const loadProjects = async () => {
    if (!profile?.id) {
      setIsLoading(false)
      return
    }

    try {
      let allProjects: Project[] = []

      // Load projects directly assigned to client
      const { data: directProjects, error: directError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', profile.id)
        .eq('archived', false)

      if (directError) {
        console.error('Direct projects error:', directError)
      } else if (directProjects) {
        allProjects = [...(directProjects || [])]
      }

      // Load projects through vendor/company assignment if user has vendor_id
      if (profile.vendor_id) {
        const { data: vendorProjects, error: vendorError } = await supabase
          .from('vendor_projects')
          .select('project_id')
          .eq('vendor_id', profile.vendor_id)

        if (vendorError) {
          console.error('Vendor projects error:', vendorError)
        } else if (vendorProjects) {
          const projectIds = vendorProjects.map(vp => vp.project_id)
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .eq('archived', false)

          if (projectsError) {
            console.error('Projects error:', projectsError)
          } else if (projects) {
            // Deduplicate by id
            const existingIds = new Set(allProjects.map(p => p.id))
            allProjects = [
              ...allProjects,
              ...projects.filter(p => !existingIds.has(p.id)),
            ]
          }
        }
      }

      // Sort by created_at descending (newest first)
      allProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setProjects(allProjects)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  const getProjectBadgeClasses = (projectType: string) => {
    if (projectType === 'new_project' || projectType === 'in_development') {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getProjectLabel = (projectType: string) => {
    if (projectType === 'new_project') return 'New Project'
    if (projectType === 'in_development') return 'In Development'
    return 'Maintenance'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <BackButton label="Back" />

        <h1 className="text-3xl font-bold text-white mt-6 mb-8">Your Projects</h1>

        {projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-secondary">No projects assigned yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <Link key={project.id} to={`/client/projects/${project.id}`}>
                <Card className="p-6 hover:border-white/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{project.name}</h2>
                      <p className="text-sm text-secondary mt-1">{formatDate(project.created_at)}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${getProjectBadgeClasses(
                        project.project_type,
                      )}`}
                    >
                      {getProjectLabel(project.project_type)}
                    </span>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <ProjectStatusTimeline
                      projectType={project.project_type}
                      zoneStatuses={[]}
                      onStatusChange={() => {}}
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

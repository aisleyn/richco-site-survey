import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Spinner, EmptyState, Button } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { deleteProjectReports } from '../../services/reportPages'
import { useToast } from '../../components/ui/Toast'
import type { Project } from '../../types'

interface ReportProject extends Project {
  report_count: number
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<ReportProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const addToast = useToast()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Get report counts for each project
      const projectsWithReports = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { count } = await supabase
            .from('report_pages')
            .select('*', { count: 'exact' })
            .eq('project_id', project.id)

          return {
            ...project,
            report_count: count || 0,
          }
        }),
      )

      setProjects(projectsWithReports)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReports = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete all reports for this project? This cannot be undone.')) {
      return
    }

    setDeletingId(projectId)
    try {
      await deleteProjectReports(projectId)
      setProjects(
        projects.map((p) =>
          p.id === projectId ? { ...p, report_count: 0 } : p
        )
      )
      addToast({ type: 'success', message: 'Reports deleted successfully' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete reports' })
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">All Reports</h1>
        <p className="text-secondary mt-2 text-sm sm:text-base">Flipbook reports by project</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No projects yet"
          description="Create projects to generate reports"
          actionLabel="Create Project"
          onAction={() => (window.location.href = '/staff/projects')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="card-hover h-full flex flex-col">
              <Link
                to={`/staff/projects/${project.id}/flipbook`}
                className="flex-1 cursor-pointer hover:opacity-80"
              >
                <h3 className="text-base sm:text-lg font-semibold text-white">{project.name}</h3>
                <p className="text-xs sm:text-sm text-secondary mt-2">
                  {project.report_count} report{project.report_count !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
              {project.report_count > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteReports(project.id)}
                  isLoading={deletingId === project.id}
                  className="mt-4 w-full"
                >
                  Delete Reports
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

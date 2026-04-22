import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Spinner, EmptyState } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import type { Project } from '../../types'

interface ReportProject extends Project {
  report_count: number
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<ReportProject[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        <h1 className="text-3xl font-bold text-white">All Reports</h1>
        <p className="text-secondary mt-2">Flipbook reports by project</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/staff/projects/${project.id}/flipbook`}
            >
              <Card className="card-hover cursor-pointer h-full">
                <div>
                  <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  <p className="text-sm text-secondary mt-2">
                    {project.report_count} report{project.report_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-3">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

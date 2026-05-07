import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getReportPagesByProject } from '../../services/reportPages'
import { getProjects } from '../../services/projects'
import { Flipbook } from '../../components/flipbook'
import { Card, Spinner, BackButton } from '../../components/ui'
import type { ReportPage, Project } from '../../types'

export default function ClientFlipbookPage() {
  const { profile } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [pages, setPages] = useState<ReportPage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    if (!profile?.id) return
    try {
      const { data: projectsData, error: projectsError } = await getProjects()
        .then(data => ({ data, error: null }))
        .catch(error => ({ data: null, error }))

      if (!projectsError && projectsData) {
        // Filter projects where user is the client
        const clientProjects = projectsData.filter(p => p.client_id === profile.id && !p.archived)
        setProjects(clientProjects)

        if (clientProjects.length > 0) {
          const allPages: ReportPage[] = []
          for (const p of clientProjects) {
            try {
              const data = await getReportPagesByProject(p.id)
              allPages.push(...data)
            } catch (err) {
              console.error(`Failed to load reports for project ${p.id}:`, err)
            }
          }
          setPages(allPages)
        }
      }
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
    <div className="flex flex-col items-center min-h-screen px-4 sm:px-6">
      <div className="w-full max-w-6xl">
        <div className="mb-4">
          <BackButton label="Back to Dashboard" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">Project Reports</h1>

        {pages.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-secondary text-lg">No reports available yet. Check back soon!</p>
            </div>
          </Card>
        ) : (
          <Flipbook pages={pages} />
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getReportPagesByProject } from '../../services/reportPages'
import { getProjects } from '../../services/projects'
import { Flipbook } from '../../components/flipbook'
import { Card, Spinner, BackButton } from '../../components/ui'
import type { ReportPage } from '../../types'

export default function ClientFlipbookPage() {
  const { profile } = useAuthStore()
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
      let clientProjects: ReportPage[] = []

      // Load projects directly assigned to client
      const { data: projectsData, error: projectsError } = await getProjects()
        .then(data => ({ data, error: null }))
        .catch(error => ({ data: null, error }))

      if (!projectsError && projectsData) {
        const directProjects = projectsData.filter(p => p.client_id === profile.id && !p.archived)

        if (directProjects.length > 0) {
          for (const p of directProjects) {
            try {
              const data = await getReportPagesByProject(p.id)
              clientProjects.push(...data)
            } catch (err) {
              console.error(`Failed to load reports for project ${p.id}:`, err)
            }
          }
        }
      }

      // Load projects through vendor/company assignment
      if (profile.vendor_id && projectsData) {
        // Get vendor_projects links
        const { data: vendorProjectsData } = await supabase
          .from('vendor_projects')
          .select('project_id')
          .eq('vendor_id', profile.vendor_id)

        if (vendorProjectsData && vendorProjectsData.length > 0) {
          const vendorProjectIds = new Set(vendorProjectsData.map((vp: any) => vp.project_id))
          const linkedProjects = projectsData.filter(p => vendorProjectIds.has(p.id) && !p.archived)

          for (const p of linkedProjects) {
            try {
              const data = await getReportPagesByProject(p.id)
              clientProjects.push(...data)
            } catch (err) {
              console.error(`Failed to load reports for project ${p.id}:`, err)
            }
          }
        }
      }

      setPages(clientProjects)
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

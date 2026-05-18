import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getReportPagesByProject } from '../../services/reportPages'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSamplesByProject } from '../../services/samples'
import { Flipbook } from '../../components/flipbook'
import { Button, Spinner, Card, Badge } from '../../components/ui'
import { SampleCard } from '../../components/samples/SampleCard'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import type { ReportPage, Project, ProjectSubcategory, Sample } from '../../types'
import AnimatedBackground from '../../components/dashboard/AnimatedBackground'

export default function ClientDashboard() {
  const { profile } = useAuthStore()
  const [pages, setPages] = useState<ReportPage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectZones, setProjectZones] = useState<Map<string, ProjectSubcategory[]>>(new Map())
  const [projectSamples, setProjectSamples] = useState<Map<string, Sample[]>>(new Map())
  const [stats, setStats] = useState({
    activeProjects: 0,
    surveysFiled: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [profile])

  // Subscribe to realtime sample status changes
  useRealtimeNotifications(projects.map(p => p.id))

  const handleSampleStatusUpdated = (projectId: string, updatedSample: Sample) => {
    setProjectSamples(prev => {
      const newMap = new Map(prev)
      const samples = newMap.get(projectId) || []
      newMap.set(projectId, samples.map(s => s.id === updatedSample.id ? updatedSample : s))
      return newMap
    })
  }

  const loadData = async () => {
    if (!profile?.id) {
      console.log('No profile ID, skipping data load')
      setIsLoading(false)
      return
    }
    try {
      console.log('Profile data:', profile)
      console.log('Loading projects for client:', profile.id)
      let allProjects: Project[] = []

      // Load projects directly assigned to client
      const { data: directProjects, error: directError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', profile.id)
        .eq('archived', false)

      console.log('Direct projects query result:', { directProjects, directError })

      if (directError) {
        console.error('Direct projects error:', directError)
      } else if (directProjects) {
        console.log('Direct projects found:', directProjects.length)
        allProjects = [...(directProjects || [])]
      }

      // Load projects through vendor/company assignment if user has vendor_id
      console.log('Checking vendor_id:', profile.vendor_id, 'Type:', typeof profile.vendor_id)
      if (profile.vendor_id) {
        console.log('Loading projects for vendor:', profile.vendor_id)
        const { data: vendorProjects, error: vendorError } = await supabase
          .from('vendor_projects')
          .select('project_id')
          .eq('vendor_id', profile.vendor_id)

        console.log('Vendor projects query result:', { vendorProjects, vendorError })
        console.log('Vendor projects raw data:', vendorProjects)
        console.log('Vendor projects length:', vendorProjects?.length)

        if (vendorError) {
          console.error('Vendor projects error:', vendorError)
        } else if (vendorProjects && vendorProjects.length > 0) {
          console.log('Vendor projects found:', vendorProjects.length)
          // Fetch the actual project details
          const projectIds = vendorProjects.map((vp: any) => vp.project_id)
          console.log('Project IDs to fetch:', projectIds)

          const { data: vendorProjectDetails, error: detailsError } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .eq('archived', false)

          console.log('Vendor project details result:', { vendorProjectDetails, detailsError })

          if (vendorProjectDetails) {
            console.log('Vendor project details found:', vendorProjectDetails.length)
            // Merge with direct projects, avoiding duplicates
            const existingIds = new Set(allProjects.map(p => p.id))
            allProjects = [
              ...allProjects,
              ...vendorProjectDetails.filter(p => !existingIds.has(p.id))
            ]
          }
        } else {
          console.log('No vendor projects found for vendor:', profile.vendor_id)
        }
      } else {
        console.log('User has no vendor_id assigned')
      }

      console.log('All projects loaded:', allProjects)
      setProjects(allProjects)

      if (allProjects.length > 0) {
        const allPages: ReportPage[] = []
        const zonesMap = new Map<string, ProjectSubcategory[]>()
        const samplesMap = new Map<string, Sample[]>()

        for (const p of allProjects) {
          try {
            const data = await getReportPagesByProject(p.id)
            allPages.push(...data)
          } catch (err) {
            console.error(`Failed to load reports for project ${p.id}:`, err)
          }

          // Load zones for development projects
          if (p.project_type === 'development') {
            try {
              const zones = await getSubcategoriesByProject(p.id)
              zonesMap.set(p.id, zones)
            } catch (err) {
              console.error(`Failed to load zones for project ${p.id}:`, err)
            }

            // Load samples for development projects
            try {
              const samples = await getSamplesByProject(p.id)
              samplesMap.set(p.id, samples)
            } catch (err) {
              console.error(`Failed to load samples for project ${p.id}:`, err)
            }
          }
        }

        setPages(allPages)
        setProjectZones(zonesMap)
        setProjectSamples(samplesMap)
        setStats({
          activeProjects: allProjects.length,
          surveysFiled: allPages.length,
        })
      } else {
        setStats({
          activeProjects: 0,
          surveysFiled: 0,
        })
      }
    } catch (err) {
      console.error('Failed to load client data:', err)
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
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      {/* Scan line animation */}
      <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, rgba(239, 68, 68, 0.5), transparent)', animation: 'scan-line 8s linear infinite', zIndex: 5 }}></div>

      <div className="relative z-10">

        {/* Hero Section */}
        <div className="flex flex-col items-center px-6 pt-12">

          {/* Main content */}
          <div className="max-w-2xl w-full text-center">
            {/* Logo */}
            <img src="/richco-logo.png" alt="Richco" className="h-40 w-auto mx-auto mb-4" />

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-light tracking-tight text-white mb-6" style={{ fontFamily: '"Syne", sans-serif' }}>
              Your Site Surveys
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-secondary mb-12 font-medium leading-relaxed">
              Richco Site Surveys and Repair Requests
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link to="/client/submit" className="w-full sm:w-auto">
                <Button className="px-8 py-3 font-medium rounded-lg transition-colors">
                  Submit Repair Request
                </Button>
              </Link>
              {projects.length > 0 && (
                <Link to="/client/floor-plan" className="w-full sm:w-auto">
                  <Button className="px-8 py-3 font-medium rounded-lg transition-colors">
                    View Floor Plan Map
                  </Button>
                </Link>
              )}
            </div>

            {/* Floating stat nodes */}
            <div className="relative h-48 flex items-center justify-center">
              {/* Left node */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform -translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Active Projects</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.activeProjects}</p>
              </div>

              {/* Right node */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Reports Received</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.surveysFiled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Zones Section (Development Projects) */}
        {Array.from(projectZones.entries()).length > 0 && (
          <div className="py-16 px-6 border-t border-slate-700">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: '"Syne", sans-serif' }}>Project Zones</h2>
              <div className="space-y-8">
                {Array.from(projectZones.entries()).map(([projectId, zones]) => {
                  const project = projects.find(p => p.id === projectId)
                  return zones.length > 0 ? (
                    <div key={projectId}>
                      <h3 className="text-xl font-semibold text-white mb-4">{project?.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {zones.map(zone => {
                          const statusColor =
                            zone.status === 'approved' ? 'bg-green-100 text-green-800' :
                            zone.status === 'in_development' ? 'bg-amber-100 text-amber-800' :
                            zone.status === 'denied' ? 'bg-red-100 text-red-800' :
                            zone.status === 'on_hold' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'

                          return (
                            <Card key={zone.id} className="p-4">
                              <h4 className="text-lg font-semibold text-white mb-2">{zone.name}</h4>
                              <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${statusColor}`}>
                                {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pending Samples Section */}
        {Array.from(projectSamples.values()).some(samples => samples.some(s => s.status === 'pending')) && (
          <div className="py-16 px-6 border-t border-slate-700">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: '"Syne", sans-serif' }}>Pending Samples</h2>
              <div className="space-y-8">
                {Array.from(projectSamples.entries()).map(([projectId, samples]) => {
                  const project = projects.find(p => p.id === projectId)
                  const pendingSamples = samples.filter(s => s.status === 'pending')
                  return pendingSamples.length > 0 ? (
                    <div key={projectId}>
                      <h3 className="text-xl font-semibold text-white mb-4">{project?.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingSamples.map(sample => (
                          <SampleCard
                            key={sample.id}
                            sample={sample}
                            projectName={project?.name}
                            onStatusChange={(updated) => handleSampleStatusUpdated(projectId, updated)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reports Section */}
        {pages.length > 0 && (
          <div className="py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: '"Syne", sans-serif' }}>Project Reports</h2>
              <Flipbook pages={pages} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {pages.length === 0 && (
          <div className="py-20 px-6">
            <div className="max-w-2xl mx-auto bg-elevated border-2 border-white rounded-lg p-12 text-center">
              <p className="text-secondary text-lg">No reports available yet. Check back soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

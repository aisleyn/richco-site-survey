import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSamplesByProject } from '../../services/samples'
import { getWaypointsByProject } from '../../services/mapWaypoints'
import { Spinner, Card, Button } from '../../components/ui'
import { ProjectStatusTimeline } from '../../components/project/ProjectStatusTimeline'
import { SampleCard } from '../../components/samples/SampleCard'
import { BackButton } from '../../components/ui/BackButton'
import { InteractiveMap } from '../../components/map'
import type { Project, ProjectSubcategory, Sample, MapWaypoint } from '../../types'

export default function ClientProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { profile } = useAuthStore()
  const [project, setProject] = useState<Project | null>(null)
  const [zones, setZones] = useState<ProjectSubcategory[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    if (!projectId) {
      setIsLoading(false)
      return
    }

    try {
      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) {
        console.error('Project error:', projectError)
        setIsLoading(false)
        return
      }

      setProject(projectData)

      // Load waypoints
      try {
        const waypointData = await getWaypointsByProject(projectId)
        setWaypoints(waypointData)
      } catch (error) {
        console.error('Error loading waypoints:', error)
      }

      // Load zones and samples if project type is new_project or in_development
      if (projectData.project_type === 'new_project' || projectData.project_type === 'in_development') {
        try {
          const zonesData = await getSubcategoriesByProject(projectId)
          setZones(zonesData)
        } catch (error) {
          console.error('Error loading zones:', error)
        }

        try {
          const samplesData = await getSamplesByProject(projectId)
          setSamples(samplesData)
        } catch (error) {
          console.error('Error loading samples:', error)
        }
      }
    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSampleStatusUpdated = (updatedSample: Sample) => {
    setSamples(prev => prev.map(s => (s.id === updatedSample.id ? updatedSample : s)))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <BackButton />
          <Card className="p-8 text-center mt-6">
            <p className="text-secondary">Project not found.</p>
          </Card>
        </div>
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

  const pendingSampleCount = samples.filter(s => s.status === 'pending').length
  const isSamplesVisible = project.project_type === 'new_project' || project.project_type === 'in_development'

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <BackButton />

        <div className="mt-8 mb-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold text-white">{project.name}</h1>
            <span
              className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${getProjectBadgeClasses(
                project.project_type,
              )}`}
            >
              {getProjectLabel(project.project_type)}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <Card className="p-6 mb-8">
          <ProjectStatusTimeline
            projectType={project.project_type}
            zoneStatuses={zones.map(z => z.status)}
            onStatusChange={() => {}}
          />
        </Card>

        {/* Floor Plan Map */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Floor Plan Map</h2>
          {project.map_image_url ? (
            <div className="bg-slate-900 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <InteractiveMap
                imageUrl={project.map_image_url}
                waypoints={waypoints}
                isEditable={false}
              />
            </div>
          ) : (
            <p className="text-secondary text-center py-12">No floor plan map available for this project.</p>
          )}
        </Card>

        {/* Conditional Content */}
        {project.project_type === 'maintenance' ? (
          // Maintenance: Show Submit Repair Request button
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-4">Need a Repair?</h2>
            <p className="text-secondary mb-6">Submit a repair request for this project.</p>
            <Link to="/client/submit">
              <Button className="px-8 py-3 font-medium">Submit Repair Request</Button>
            </Link>
          </Card>
        ) : isSamplesVisible ? (
          // New Project / In Development: Show Samples
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Samples</h2>
              {pendingSampleCount > 0 && (
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                  {pendingSampleCount} pending
                </span>
              )}
            </div>

            {samples.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-secondary">No samples yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {samples.map(sample => (
                  <SampleCard key={sample.id} sample={sample} onStatusChange={handleSampleStatusUpdated} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

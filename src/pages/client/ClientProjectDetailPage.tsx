import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSamplesByProject } from '../../services/samples'
import { getSurveysByProject } from '../../services/surveys'
import { getWaypointsByProject } from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { Spinner, Card, Button, Badge } from '../../components/ui'
import { ProjectStatusTimeline } from '../../components/project/ProjectStatusTimeline'
import { SampleCard } from '../../components/samples/SampleCard'
import { BackButton } from '../../components/ui/BackButton'
import { PhaserMap } from '../../components/map/PhaserMap'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'
import type { Project, ProjectSubcategory, Sample, MapWaypoint, FloorPlanPage, Survey } from '../../types'

export default function ClientProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const phaserMapRef = useRef<PhaserMapHandle>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [zones, setZones] = useState<ProjectSubcategory[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [floorPlanPages, setFloorPlanPages] = useState<FloorPlanPage[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'surveys' | 'samples'>('map')
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

      // Load floor plan pages
      try {
        const floorPlanData = await getFloorPlanPagesByProject(projectId)
        setFloorPlanPages(floorPlanData)
        if (floorPlanData.length > 0) {
          setActivePageId(floorPlanData[0].id)
        }
      } catch (error) {
        console.error('Error loading floor plan pages:', error)
      }

      // Load surveys
      try {
        const surveyData = await getSurveysByProject(projectId)
        setSurveys(surveyData)
      } catch (error) {
        console.error('Error loading surveys:', error)
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

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 mb-6">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Floor Plan Map
            </button>
            {surveys.length > 0 && (
              <button
                onClick={() => setActiveTab('surveys')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'surveys'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Surveys ({surveys.length})
              </button>
            )}
            {isSamplesVisible && samples.length > 0 && (
              <button
                onClick={() => setActiveTab('samples')}
                className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === 'samples'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Samples ({samples.length})
              </button>
            )}
          </div>
        </div>

        {/* Map Tab */}
        {activeTab === 'map' && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Floor Plan Map</h2>
            {floorPlanPages.length > 0 || project.map_image_url ? (
              <>
                {floorPlanPages.length > 1 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {floorPlanPages.map((page, index) => (
                      <button
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          activePageId === page.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {page.label || `Page ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative h-80 sm:h-[600px] mb-4">
                  <PhaserMap
                    ref={phaserMapRef}
                    imageUrl={
                      floorPlanPages.find(p => p.id === activePageId)?.image_url || project.map_image_url || ''
                    }
                    waypoints={waypoints.filter(w => w.floor_plan_page_id === activePageId || (floorPlanPages.length === 0 && !w.floor_plan_page_id))}
                    isEditable={false}
                    isPlacingWaypoint={false}
                    isMovingWaypoint={false}
                    onWaypointClick={() => {}}
                    onWaypointAdd={() => {}}
                    onWaypointDrop={() => {}}
                    className="absolute inset-0 border border-slate-200 rounded-lg overflow-hidden"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => phaserMapRef.current?.resetView()}
                  className="flex items-center justify-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
                  </svg>
                  Reset View
                </Button>
              </>
            ) : (
              <p className="text-secondary text-center py-12">No floor plan map available for this project.</p>
            )}

            {project.project_type === 'maintenance' && (
              <div className="mt-8 border-t border-slate-700 pt-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-4">Need a Repair?</h2>
                <p className="text-secondary mb-6">Submit a repair request for this project.</p>
                <Link to="/client/submit">
                  <Button className="px-8 py-3 font-medium">Submit Repair Request</Button>
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Surveys Tab */}
        {activeTab === 'surveys' && (
          <div>
            {surveys.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-secondary">No surveys yet.</p>
              </Card>
            ) : (
              <div className="space-y-8">
                {zones.length > 0 ? (
                  zones.map(zone => {
                    const zoneSurveys = surveys.filter(s => s.subcategory_id === zone.id)
                    if (zoneSurveys.length === 0) return null
                    return (
                      <div key={zone.id}>
                        <h3 className="text-lg font-bold text-white mb-4">{zone.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {zoneSurveys.map(survey => (
                            <button
                              key={survey.id}
                              onClick={() => navigate(`/client/survey/${survey.id}`)}
                              className="text-left"
                            >
                              <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer h-full">
                                <div className="flex flex-col h-full">
                                  <h4 className="text-base font-semibold text-white mb-2">{survey.area_name}</h4>
                                  <p className="text-sm text-slate-400 mb-3">{new Date(survey.survey_date).toLocaleDateString()}</p>
                                  <div className="mt-auto flex items-center gap-2">
                                    <Badge variant={survey.status}>{survey.status}</Badge>
                                  </div>
                                </div>
                              </Card>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {surveys.map(survey => (
                      <button
                        key={survey.id}
                        onClick={() => navigate(`/client/survey/${survey.id}`)}
                        className="text-left"
                      >
                        <Card className="p-4 hover:bg-slate-700 transition-colors cursor-pointer h-full">
                          <div className="flex flex-col h-full">
                            <h4 className="text-base font-semibold text-white mb-2">{survey.area_name}</h4>
                            <p className="text-sm text-slate-400 mb-3">{new Date(survey.survey_date).toLocaleDateString()}</p>
                            <div className="mt-auto flex items-center gap-2">
                              <Badge variant={survey.status}>{survey.status}</Badge>
                            </div>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Samples Tab */}
        {activeTab === 'samples' && (
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
        )}
      </div>
    </div>
  )
}

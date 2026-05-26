import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSurveysByProject } from '../../services/surveys'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { getSamplesByProject } from '../../services/samples'
import type { Project, ProjectSubcategory, Survey, FloorPlanPage, Sample, ZoneStatus } from '../../types'
import { Card, Badge, Spinner, BackButton, Button } from '../../components/ui'
import { SampleCard } from '../../components/samples/SampleCard'
import { SampleCreateModal } from '../../components/samples/SampleCreateModal'
import { PdfUploadModal } from '../../components/map/PdfUploadModal'

const getZoneStatusBadgeVariant = (status: ZoneStatus): 'default' | 'in_progress' | 'completed' | 'needs_repair' | 'temporary_repair' => {
  switch (status) {
    case 'concept':
      return 'default'
    case 'in_development':
      return 'in_progress'
    case 'approved':
      return 'completed'
    case 'denied':
      return 'needs_repair'
    case 'on_hold':
      return 'temporary_repair'
    default:
      return 'default'
  }
}

export default function ZoneDetailPage() {
  const { projectId, zoneId } = useParams<{ projectId: string; zoneId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [zone, setZone] = useState<ProjectSubcategory | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [floorPlans, setFloorPlans] = useState<FloorPlanPage[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'surveys' | 'floors' | 'samples'>('surveys')
  const [isCreateSampleModalOpen, setIsCreateSampleModalOpen] = useState(false)
  const [isUploadFloorPlanOpen, setIsUploadFloorPlanOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId, zoneId])

  const loadData = async () => {
    if (!projectId || !zoneId) return
    try {
      const [p, subs, s, fp, sa] = await Promise.all([
        getProjectById(projectId),
        getSubcategoriesByProject(projectId),
        getSurveysByProject(projectId),
        getFloorPlanPagesByProject(projectId, zoneId),
        getSamplesByProject(projectId, zoneId),
      ])
      setProject(p)
      setZone(subs.find(sub => sub.id === zoneId) || null)
      setSurveys(s)
      setFloorPlans(fp)
      setSamples(sa)
    } catch (err) {
      console.error('Failed to load zone data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const zoneSurveys = surveys.filter(s => s.subcategory_id === zoneId)

  const handleSampleCreated = (newSample: Sample) => {
    setSamples([newSample, ...samples])
    setIsCreateSampleModalOpen(false)
  }

  const handleSampleStatusUpdated = (updatedSample: Sample) => {
    setSamples(samples.map(s => s.id === updatedSample.id ? updatedSample : s))
  }

  const handleFloorPlanCreated = (newFloorPlan: FloorPlanPage) => {
    setFloorPlans([...floorPlans, newFloorPlan])
    setIsUploadFloorPlanOpen(false)
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!project) return <div>Project not found</div>
  if (!zone) return <div>Zone not found</div>

  return (
    <div>
      <div className="mb-4">
        <BackButton label={`Back to ${project.name}`} />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{zone.name}</h1>
              <Badge variant={getZoneStatusBadgeVariant(zone.status)}>
                {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-secondary">Project: {project.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'surveys' && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/staff/projects/${projectId}/surveys/new?zone=${zoneId}`)}
              >
                New Survey
              </Button>
            )}
            {activeTab === 'floors' && (
              <Button
                variant="secondary"
                onClick={() => setIsUploadFloorPlanOpen(true)}
              >
                Upload Floor Plan
              </Button>
            )}
            {activeTab === 'samples' && (
              <Button
                variant="secondary"
                onClick={() => setIsCreateSampleModalOpen(true)}
              >
                Add Sample
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('surveys')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'surveys'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Surveys ({zoneSurveys.length})
          </button>
          <button
            onClick={() => setActiveTab('floors')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'floors'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Floor Plans ({floorPlans.length})
          </button>
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Surveys Tab */}
        {activeTab === 'surveys' && (
          <>
            {zoneSurveys.length === 0 ? (
              <Card>
                <p className="text-center text-secondary py-12">No surveys in this zone</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {zoneSurveys.map((survey) => (
                  <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
                    <Card className="card-hover cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                            <p className="text-sm text-secondary mt-1">
                              {new Date(survey.survey_date).toLocaleDateString()}
                            </p>
                          </div>
                          {survey.status === 'draft' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                        </div>
                        <Badge variant={survey.status}>
                          {survey.status === 'draft' ? 'Active' : survey.status === 'published' ? 'Completed' : 'Archived'}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Floor Plans Tab */}
        {activeTab === 'floors' && (
          <>
            {floorPlans.length === 0 ? (
              <Card>
                <p className="text-center text-secondary py-12">No floor plans uploaded for this zone</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {floorPlans.map((fp) => (
                  <Card key={fp.id} className="p-4">
                    <div className="aspect-video bg-slate-700 rounded mb-3 overflow-hidden flex items-center justify-center">
                      {fp.image_url ? (
                        <img
                          src={fp.image_url}
                          alt={fp.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-400">No image</div>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-sm">{fp.label}</h3>
                    <p className="text-secondary text-xs mt-1">Page {fp.page_number}</p>
                  </Card>
                ))}
              </div>
            )}
            <div>
              <Button
                variant="primary"
                onClick={() => navigate(`/staff/projects/${projectId}/map?zone=${zoneId}`)}
              >
                Open Interactive Map
              </Button>
            </div>
          </>
        )}

        {/* Samples Tab */}
        {activeTab === 'samples' && (
          <>
            {samples.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <p className="text-secondary mb-4">No samples added to this zone yet</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {samples.map(sample => (
                  <SampleCard
                    key={sample.id}
                    sample={sample}
                    onStatusChange={handleSampleStatusUpdated}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <SampleCreateModal
        isOpen={isCreateSampleModalOpen}
        projectId={projectId!}
        subcategoryId={zoneId}
        onCreated={handleSampleCreated}
        onClose={() => setIsCreateSampleModalOpen(false)}
      />

      <PdfUploadModal
        isOpen={isUploadFloorPlanOpen}
        projectId={projectId!}
        subcategoryId={zoneId}
        onFloorPlanCreated={handleFloorPlanCreated}
        onClose={() => setIsUploadFloorPlanOpen(false)}
      />
    </div>
  )
}

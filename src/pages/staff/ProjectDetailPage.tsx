import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getProjectById, updateProject } from '../../services/projects'
import { getSurveysByProject } from '../../services/surveys'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSamplesByProject } from '../../services/samples'
import type { Project, Survey, ProjectSubcategory, Sample } from '../../types'
import { Card, Button, Spinner, Badge, BackButton } from '../../components/ui'
import { SubcategoryModal } from '../../components/project/SubcategoryModal'
import { ZoneTileGrid } from '../../components/project/ZoneTileGrid'
import { ProjectStatusTimeline } from '../../components/project/ProjectStatusTimeline'
import { CollapsibleActionMenu } from '../../components/project/CollapsibleActionMenu'
import { SampleCard } from '../../components/samples/SampleCard'
import { SampleCreateModal } from '../../components/samples/SampleCreateModal'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeZoneId = searchParams.get('zone')

  const [project, setProject] = useState<Project | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [isCreateSampleModalOpen, setIsCreateSampleModalOpen] = useState(false)
  const [selectedProjectType, setSelectedProjectType] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['draft', 'published', 'archived'])
  )
  const [activeTab, setActiveTab] = useState<'overview' | 'samples' | 'surveys'>('surveys')

  // Adjust default tab based on project type
  const isDevelopment = project?.project_type === 'in_development'
  const isNewProject = project?.project_type === 'new_project'
  const showSamples = isNewProject || isDevelopment
  const defaultTab = isNewProject ? 'samples' : (isDevelopment ? 'overview' : 'surveys')
  const currentTab = (activeTab === 'overview' && !isDevelopment) ? defaultTab : activeTab

  const toggleCategory = (category: string) => {
    const newExpandedCategories = new Set(expandedCategories)
    if (newExpandedCategories.has(category)) {
      newExpandedCategories.delete(category)
    } else {
      newExpandedCategories.add(category)
    }
    setExpandedCategories(newExpandedCategories)
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Active'
      case 'published':
        return 'Temporarily Completed'
      case 'archived':
        return 'Archived'
      default:
        return status
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, s, sc, sa] = await Promise.all([
        getProjectById(projectId),
        getSurveysByProject(projectId),
        getSubcategoriesByProject(projectId),
        getSamplesByProject(projectId),
      ])
      setProject(p)
      setSurveys(s)
      setSubcategories(sc)
      setSamples(sa)
    } catch (err) {
      console.error('Failed to load project data:', err)
      setProject(null)
    } finally {
      setIsLoading(false)
    }
  }

  const visibleSurveys = activeZoneId
    ? surveys.filter((s) => s.subcategory_id === activeZoneId)
    : surveys

  const draftSurveys = visibleSurveys.filter((s) => s.status === 'draft')
  const publishedSurveys = visibleSurveys.filter((s) => s.status === 'published')
  const archivedSurveys = visibleSurveys.filter((s) => s.status === 'archived')

  const hasSubcategories = subcategories.length > 0
  const activeSubcategory = activeZoneId ? subcategories.find((z) => z.id === activeZoneId) : null

  const handleSampleCreated = (newSample: Sample) => {
    setSamples([newSample, ...samples])
    setIsCreateSampleModalOpen(false)
  }

  const handleSampleStatusUpdated = (updatedSample: Sample) => {
    setSamples(samples.map(s => s.id === updatedSample.id ? updatedSample : s))
  }

  const handleChangeProjectType = async (newType: string) => {
    if (!confirm(`Change project status to "${newType}"?`)) return

    try {
      const updated = await updateProject(projectId!, { project_type: newType as any })
      setProject(updated)
      setSelectedProjectType(null)
    } catch (err) {
      alert('Failed to update project status')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!project) return <div>Project not found</div>

  return (
    <div>
      <div className="mb-4">
        <BackButton label="Back to Projects" />
      </div>
      {/* Breadcrumb for zone view */}
      {hasSubcategories && activeZoneId && (
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
          <button onClick={() => setSearchParams({})} className="hover:text-white underline">
            {project.name}
          </button>
          <span>/</span>
          <span className="text-white font-medium">{activeSubcategory?.name}</span>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              <div className="relative">
                <button
                  onClick={() => setSelectedProjectType(selectedProjectType ? null : project.project_type)}
                  className="px-3 py-1 rounded text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                >
                  {project.project_type === 'new_project' ? 'New Project' :
                   project.project_type === 'in_development' ? 'In Development' : 'Maintenance'}
                </button>
                {selectedProjectType !== null && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded shadow-lg z-20 py-2">
                    {['new_project', 'in_development', 'maintenance'].map(type => (
                      <button
                        key={type}
                        onClick={() => handleChangeProjectType(type)}
                        className={`block w-full text-left px-4 py-2 hover:bg-slate-700 ${
                          project.project_type === type ? 'bg-slate-700' : ''
                        }`}
                      >
                        <span className="text-white text-sm">
                          {type === 'new_project' ? 'New Project' :
                           type === 'in_development' ? 'In Development' : 'Maintenance'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-secondary">Attached Client: {project.client_id ? 'Linked client' : 'No client linked'}</p>
          </div>
          <div className="flex items-center gap-3">
            {isNewProject ? (
              <Button
                variant="secondary"
                onClick={() => setIsCreateSampleModalOpen(true)}
              >
                New Sample
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => navigate(`/staff/projects/${projectId}/surveys/new`)}
              >
                New Survey
              </Button>
            )}
            <CollapsibleActionMenu
              actions={[
                {
                  label: 'Add Zone',
                  onClick: () => setIsSubcategoryModalOpen(true),
                },
                {
                  label: 'Floor Plan Map',
                  onClick: () => navigate(`/staff/projects/${projectId}/map`),
                },
                {
                  label: 'Client Requests',
                  onClick: () => navigate(`/staff/projects/${projectId}/submissions`),
                },
                {
                  label: 'View Flipbook',
                  onClick: () => navigate(`/staff/projects/${projectId}/flipbook`),
                },
              ]}
            />
          </div>
        </div>

        {/* Status Timeline */}
        <ProjectStatusTimeline
          projectType={project.project_type}
          zoneStatuses={subcategories.map(s => s.status)}
          onStatusChange={handleChangeProjectType}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700 mb-6">
        <div className="flex gap-0">
          {isDevelopment && (
            <button
              onClick={() => {
                setActiveTab('overview')
                setSearchParams({})
              }}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                currentTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Development
            </button>
          )}
          {showSamples && (
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                currentTab === 'samples'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Samples
            </button>
          )}
          {project.project_type !== 'new_project' && (
            <button
              onClick={() => setActiveTab('surveys')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                currentTab === 'surveys'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Surveys
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab (Development Zones) */}
        {isDevelopment && currentTab === 'overview' && (
          <>
            {hasSubcategories && !activeZoneId && (
              <ZoneTileGrid
                subcategories={subcategories}
                surveys={surveys}
                onSelectZone={(zoneId) => setSearchParams({ zone: zoneId })}
                projectType={project.project_type}
              />
            )}

            {activeZoneId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">{activeSubcategory?.name}</h2>
                  <button
                    onClick={() => setSearchParams({})}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ← Back to zones
                  </button>
                </div>

                {draftSurveys.length === 0 && publishedSurveys.length === 0 && archivedSurveys.length === 0 ? (
                  <Card>
                    <p className="text-center text-secondary py-12">No surveys in this zone</p>
                  </Card>
                ) : (
                  <>
                    {draftSurveys.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Active ({draftSurveys.length})</h3>
                        <div className="space-y-4">
                          {draftSurveys.map((survey) => (
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
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                  </div>
                                  <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                                </div>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {publishedSurveys.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Completed ({publishedSurveys.length})</h3>
                        <div className="space-y-4">
                          {publishedSurveys.map((survey) => (
                            <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
                              <Card className="card-hover cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                                    <p className="text-sm text-secondary mt-1">
                                      {new Date(survey.survey_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                                </div>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!activeZoneId && subcategories.length === 0 && (
              <Card>
                <p className="text-center text-secondary py-12">No zones yet</p>
              </Card>
            )}
          </>
        )}

        {/* Samples Tab */}
        {showSamples && currentTab === 'samples' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Samples</h2>
              <Button variant="primary" onClick={() => setIsCreateSampleModalOpen(true)}>
                Add Sample
              </Button>
            </div>

            {samples.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <p className="text-secondary mb-4">No samples yet</p>
                  <Button variant="primary" onClick={() => setIsCreateSampleModalOpen(true)}>
                    Create First Sample
                  </Button>
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

        {/* Surveys Tab */}
        {project.project_type !== 'new_project' && currentTab === 'surveys' && (
          <>
            <div>
              <button
                onClick={() => toggleCategory('draft')}
                className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
              >
                <span className="text-lg">{expandedCategories.has('draft') ? '▼' : '▶'}</span>
                Active ({draftSurveys.length})
              </button>
              {expandedCategories.has('draft') && (
                <div className="space-y-4">
                  {draftSurveys.length === 0 ? (
                    <Card>
                      <p className="text-center text-secondary py-12">No active surveys</p>
                    </Card>
                  ) : (
                    draftSurveys.map((survey) => (
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
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                            <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {publishedSurveys.length > 0 && (
              <div>
                <button
                  onClick={() => toggleCategory('published')}
                  className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
                >
                  <span className="text-lg">{expandedCategories.has('published') ? '▼' : '▶'}</span>
                  Temporarily Completed ({publishedSurveys.length})
                </button>
                {expandedCategories.has('published') && (
                  <div className="space-y-4">
                    {publishedSurveys.map((survey) => (
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
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            </div>
                            <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {archivedSurveys.length > 0 && (
              <div>
                <button
                  onClick={() => toggleCategory('archived')}
                  className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
                >
                  <span className="text-lg">{expandedCategories.has('archived') ? '▼' : '▶'}</span>
                  Permanently Completed ({archivedSurveys.length})
                </button>
                {expandedCategories.has('archived') && (
                  <div className="space-y-4">
                    {archivedSurveys.map((survey) => (
                      <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
                        <Card className="card-hover cursor-pointer opacity-75">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                              <p className="text-sm text-secondary mt-1">
                                {new Date(survey.survey_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sample Create Modal */}
      {showSamples && (
        <SampleCreateModal
          isOpen={isCreateSampleModalOpen}
          projectId={projectId!}
          onCreated={handleSampleCreated}
          onClose={() => setIsCreateSampleModalOpen(false)}
        />
      )}

      {/* Subcategory Modal */}
      <SubcategoryModal
        isOpen={isSubcategoryModalOpen}
        projectId={projectId!}
        subcategories={subcategories}
        onCreated={(sub) => setSubcategories([...subcategories, sub])}
        onDeleted={(id) => setSubcategories(subcategories.filter((s) => s.id !== id))}
        onClose={() => setIsSubcategoryModalOpen(false)}
        projectType={project.project_type}
      />
    </div>
  )
}

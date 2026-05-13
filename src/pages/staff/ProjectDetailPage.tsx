import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getSurveysByProject } from '../../services/surveys'
import { getSubcategoriesByProject } from '../../services/subcategories'
import type { Project, Survey, ProjectSubcategory } from '../../types'
import { Card, Button, Spinner, Badge, BackButton } from '../../components/ui'
import { SubcategoryModal } from '../../components/project/SubcategoryModal'
import { ZoneTileGrid } from '../../components/project/ZoneTileGrid'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeZoneId = searchParams.get('zone')

  const [project, setProject] = useState<Project | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['draft', 'published', 'archived'])
  )

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
      const [p, s, sc] = await Promise.all([
        getProjectById(projectId),
        getSurveysByProject(projectId),
        getSubcategoriesByProject(projectId),
      ])
      setProject(p)
      setSurveys(s)
      setSubcategories(sc)
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/staff/projects/${projectId}/map`}>
            <Button variant="secondary">Floor Plan Map</Button>
          </Link>
          <Link to={`/staff/projects/${projectId}/submissions`}>
            <Button variant="secondary">Client Requests</Button>
          </Link>
          <Link to={`/staff/projects/${projectId}/flipbook`}>
            <Button variant="secondary">View Flipbook</Button>
          </Link>
          <Link to={`/staff/projects/${projectId}/surveys/new`} state={{ subcategoryId: activeZoneId }}>
            <Button variant="primary">New Survey</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => setIsSubcategoryModalOpen(true)}
          >
            Subcategory
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Zone Tiles (if zones exist and no zone selected) */}
        {hasSubcategories && !activeZoneId && (
          <ZoneTileGrid
            subcategories={subcategories}
            surveys={surveys}
            onSelectZone={(zoneId) => setSearchParams({ zone: zoneId })}
          />
        )}

        {/* Active (Draft) Surveys */}
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

        {/* Temporarily Completed Surveys */}
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

        {/* Archived Surveys */}
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

        {/* No surveys at all */}
        {surveys.length === 0 && (
          <Card>
            <p className="text-center text-secondary py-12">No surveys yet</p>
          </Card>
        )}
      </div>

      {/* Subcategory Modal */}
      <SubcategoryModal
        isOpen={isSubcategoryModalOpen}
        projectId={projectId!}
        subcategories={subcategories}
        onCreated={(sub) => setSubcategories([...subcategories, sub])}
        onDeleted={(id) => setSubcategories(subcategories.filter((s) => s.id !== id))}
        onClose={() => setIsSubcategoryModalOpen(false)}
      />
    </div>
  )
}

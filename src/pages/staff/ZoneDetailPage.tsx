import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSurveysByProject } from '../../services/surveys'
import type { Project, ProjectSubcategory, Survey, ZoneStatus } from '../../types'
import { Card, Badge, Spinner, BackButton, Button } from '../../components/ui'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [projectId, zoneId])

  const loadData = async () => {
    if (!projectId || !zoneId) return
    try {
      const [p, subs, s] = await Promise.all([
        getProjectById(projectId),
        getSubcategoriesByProject(projectId),
        getSurveysByProject(projectId),
      ])
      setProject(p)
      setZone(subs.find(sub => sub.id === zoneId) || null)
      setSurveys(s)
    } catch (err) {
      console.error('Failed to load zone data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const zoneSurveys = surveys.filter(s => s.subcategory_id === zoneId)

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
              {(project.project_type === 'in_development' || project.project_type === 'new_project') && (
                <Badge variant={getZoneStatusBadgeVariant(zone.status)}>
                  {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-secondary">Project: {project.name}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/staff/projects/${projectId}/surveys/new?zone=${zoneId}`)}
          >
            New Survey
          </Button>
        </div>
      </div>

      {/* Surveys Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Surveys ({zoneSurveys.length})</h2>
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
      </div>
    </div>
  )
}

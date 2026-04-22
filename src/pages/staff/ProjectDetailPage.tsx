import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getSurveysByProject } from '../../services/surveys'
import type { Project, Survey } from '../../types'
import { Card, Button, Spinner, Badge } from '../../components/ui'

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, s] = await Promise.all([
        getProjectById(projectId),
        getSurveysByProject(projectId),
      ])
      setProject(p)
      setSurveys(s)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!project) return <div>Project not found</div>

  return (
    <div>
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
          <Link to={`/staff/projects/${projectId}/surveys/new`}>
            <Button variant="primary">New Survey</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {surveys.length === 0 ? (
          <Card>
            <p className="text-center text-secondary py-12">No surveys yet</p>
          </Card>
        ) : (
          surveys.map((survey) => (
            <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
              <Card className="card-hover cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                    <p className="text-sm text-secondary mt-1">
                      {new Date(survey.survey_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={survey.status}>{survey.status}</Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

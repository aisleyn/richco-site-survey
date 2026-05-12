import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Spinner, EmptyState, Badge, BackButton } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { getWaypointsByProject } from '../../services/mapWaypoints'
import { useToast } from '../../components/ui/Toast'
import type { Survey } from '../../types'

export default function ClientSurveysPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [projectName, setProjectName] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['draft', 'published', 'archived'])
  )
  const addToast = useToast()

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
        return 'Permanently Completed'
      default:
        return status
    }
  }

  useEffect(() => {
    if (projectId) {
      loadSurveys()
    }
  }, [projectId])

  const loadSurveys = async () => {
    if (!projectId) return

    try {
      console.log('Loading surveys for project:', projectId)

      // Get project name
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (!projectError && projectData) {
        setProjectName(projectData.name)
      }

      // Get all waypoints for this project to find linked surveys
      const waypoints = await getWaypointsByProject(projectId)
      const linkedSurveyIds = waypoints
        .filter(w => w.linked_survey_id)
        .map(w => w.linked_survey_id) as string[]

      console.log('Found waypoints with linked surveys:', linkedSurveyIds.length)

      // Fetch actual surveys by their linked IDs
      if (linkedSurveyIds.length > 0) {
        try {
          const { data: surveyData, error: surveyError } = await supabase
            .from('surveys')
            .select('*')
            .in('id', linkedSurveyIds)
            .order('created_at', { ascending: false })

          if (surveyError) throw surveyError

          console.log('Surveys loaded:', surveyData?.length || 0)
          setSurveys(surveyData || [])
        } catch (err) {
          console.error('Failed to load surveys:', err)
          addToast({ type: 'error', message: 'Failed to load surveys' })
          setSurveys([])
        }
      } else {
        console.log('No linked surveys found')
        setSurveys([])
      }
    } catch (err) {
      console.error('Failed to load surveys:', err)
      addToast({ type: 'error', message: 'Failed to load surveys' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSurveyClick = (surveyId: string) => {
    if (projectId) {
      navigate(`/client/surveys/${projectId}/detail/${surveyId}`)
    }
  }

  const draftSurveys = surveys.filter((s) => s.status === 'draft')
  const temporarySurveys = surveys.filter((s) => s.status === 'published')
  const permanentSurveys = surveys.filter((s) => s.status === 'archived')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton label="Back to Floor Plan" />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{projectName} - Surveys</h1>
        <p className="text-secondary mt-2 text-sm sm:text-base">
          {surveys.length} survey{surveys.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No surveys yet"
          description="Staff will create surveys for this project"
          actionLabel="Back to Floor Plan"
          onAction={() => navigate(-1)}
        />
      ) : (
        <div className="space-y-6">
          {/* Active */}
          <div>
            <button
              onClick={() => toggleCategory('draft')}
              className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
            >
              <span className="text-lg">{expandedCategories.has('draft') ? '▼' : '▶'}</span>
              Active ({draftSurveys.length})
            </button>
            {expandedCategories.has('draft') && (
              <>
                {draftSurveys.length === 0 ? (
                  <Card>
                    <p className="text-center text-secondary py-8">No active surveys</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {draftSurveys.map((survey) => (
                      <button
                        key={survey.id}
                        onClick={() => handleSurveyClick(survey.id)}
                        className="w-full text-left"
                      >
                        <Card className="card-hover cursor-pointer">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                            <p className="text-xs sm:text-sm text-secondary">
                              {new Date(survey.survey_date).toLocaleDateString()}
                            </p>
                            <Badge variant={survey.status}>{survey.status}</Badge>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Temporarily Completed */}
          <div>
            <button
              onClick={() => toggleCategory('published')}
              className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
            >
              <span className="text-lg">{expandedCategories.has('published') ? '▼' : '▶'}</span>
              Temporarily Completed ({temporarySurveys.length})
            </button>
            {expandedCategories.has('published') && (
              <>
                {temporarySurveys.length === 0 ? (
                  <Card>
                    <p className="text-center text-secondary py-8">No temporarily completed surveys</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {temporarySurveys.map((survey) => (
                      <button
                        key={survey.id}
                        onClick={() => handleSurveyClick(survey.id)}
                        className="w-full text-left"
                      >
                        <Card className="card-hover cursor-pointer">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1 flex items-center gap-2">
                              <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            </div>
                            <p className="text-xs sm:text-sm text-secondary">
                              {new Date(survey.survey_date).toLocaleDateString()}
                            </p>
                            <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Permanently Completed */}
          {permanentSurveys.length > 0 && (
            <div>
              <button
                onClick={() => toggleCategory('archived')}
                className="flex items-center gap-2 mb-3 text-white font-semibold hover:opacity-80 transition-opacity"
              >
                <span className="text-lg">{expandedCategories.has('archived') ? '▼' : '▶'}</span>
                Permanently Completed ({permanentSurveys.length})
              </button>
              {expandedCategories.has('archived') && (
                <div className="space-y-4">
                  {permanentSurveys.map((survey) => (
                    <button
                      key={survey.id}
                      onClick={() => handleSurveyClick(survey.id)}
                      className="w-full text-left"
                    >
                      <Card className="card-hover cursor-pointer opacity-75">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                          <p className="text-xs sm:text-sm text-secondary">
                            {new Date(survey.survey_date).toLocaleDateString()}
                          </p>
                          <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
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
    </div>
  )
}

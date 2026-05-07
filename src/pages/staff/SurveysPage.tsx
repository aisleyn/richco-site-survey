import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Spinner, EmptyState, Button, Badge, BackButton } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { deleteSurvey } from '../../services/surveys'
import { useToast } from '../../components/ui/Toast'
import type { Survey } from '../../types'

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
        return 'Archived'
      default:
        return status
    }
  }

  useEffect(() => {
    loadSurveys()
  }, [])

  const loadSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSurveys(data || [])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (surveyId: string) => {
    if (!window.confirm('Are you sure you want to delete this survey? This cannot be undone.')) {
      return
    }

    setDeletingId(surveyId)
    try {
      await deleteSurvey(surveyId)
      setSurveys(surveys.filter((s) => s.id !== surveyId))
      addToast({ type: 'success', message: 'Survey deleted successfully' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete survey' })
    } finally {
      setDeletingId(null)
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
        <BackButton label="Back to Dashboard" />
      </div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">All Surveys</h1>
          <p className="text-secondary mt-2 text-sm sm:text-base">
            {surveys.length} survey{surveys.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/staff/projects" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full sm:w-auto">Create Survey</Button>
        </Link>
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No surveys yet"
          description="Create surveys from individual projects"
          actionLabel="Go to Projects"
          onAction={() => (window.location.href = '/staff/projects')}
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
                      <Card key={survey.id} className="card-hover">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <Link to={`/staff/surveys/${survey.id}`} className="flex-1 cursor-pointer hover:opacity-80 flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          </Link>
                          <p className="text-xs sm:text-sm text-secondary">
                            {survey.project_name} • {new Date(survey.survey_date).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-3">
                            <Badge variant={survey.status}>{survey.status}</Badge>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(survey.id)}
                              isLoading={deletingId === survey.id}
                              className="w-full xs:w-auto"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
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
                      <Card key={survey.id} className="card-hover">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <Link to={`/staff/surveys/${survey.id}`} className="flex-1 cursor-pointer hover:opacity-80 flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          </Link>
                          <p className="text-xs sm:text-sm text-secondary">
                            {survey.project_name} • {new Date(survey.survey_date).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-3">
                            <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(survey.id)}
                              isLoading={deletingId === survey.id}
                              className="w-full xs:w-auto"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Archived */}
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
                    <Card key={survey.id} className="card-hover opacity-75">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <Link to={`/staff/surveys/${survey.id}`} className="flex-1 cursor-pointer hover:opacity-80">
                          <h3 className="text-base sm:text-lg font-semibold text-white">{survey.area_name}</h3>
                          <p className="text-xs sm:text-sm text-secondary mt-1">
                            {survey.project_name} • {new Date(survey.survey_date).toLocaleDateString()}
                          </p>
                        </Link>
                        <div className="flex items-center gap-3">
                          <Badge variant={survey.status}>{getStatusLabel(survey.status)}</Badge>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(survey.id)}
                            isLoading={deletingId === survey.id}
                            className="w-full xs:w-auto"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
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

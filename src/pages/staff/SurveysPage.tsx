import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Spinner, EmptyState, Button } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import type { Survey } from '../../types'

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">All Surveys</h1>
          <p className="text-secondary mt-2">
            {surveys.length} survey{surveys.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/staff/projects">
          <Button variant="primary">Create Survey</Button>
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
        <div className="space-y-4">
          {surveys.map((survey) => (
            <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
              <Card className="card-hover cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                    <p className="text-sm text-secondary mt-1">
                      {survey.project_name} • {new Date(survey.survey_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        survey.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {survey.status}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

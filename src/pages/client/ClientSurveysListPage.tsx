import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Card, Spinner, BackButton, Badge } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import type { Survey } from '../../types'

export default function ClientSurveysListPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const addToast = useToast()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      loadSurveys()
    }
  }, [profile])

  const loadSurveys = async () => {
    if (!profile?.id) return
    try {
      setIsLoading(true)

      // Get client's projects
      let allProjectIds: string[] = []

      // Direct projects
      const { data: directProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', profile.id)
        .eq('archived', false)

      if (directProjects) {
        allProjectIds.push(...directProjects.map(p => p.id))
      }

      // Vendor projects
      if (profile.vendor_id) {
        const { data: vendorProjects } = await supabase
          .from('vendor_projects')
          .select('project_id')
          .eq('vendor_id', profile.vendor_id)

        if (vendorProjects) {
          allProjectIds.push(...vendorProjects.map(vp => vp.project_id))
        }
      }

      // Deduplicate
      allProjectIds = [...new Set(allProjectIds)]

      if (allProjectIds.length === 0) {
        setSurveys([])
        return
      }

      // Get all surveys for these projects
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .in('project_id', allProjectIds)
        .order('survey_date', { ascending: false })

      if (error) throw error
      setSurveys(data || [])
    } catch (err) {
      console.error('Error loading surveys:', err)
      addToast({ type: 'error', message: 'Failed to load surveys' })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'published':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">All Surveys</h1>
          </div>

          {surveys.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-500">No surveys found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {surveys.map(survey => (
                <button
                  key={survey.id}
                  onClick={() => navigate(`/client/survey/${survey.id}`)}
                  className="w-full text-left cursor-pointer hover:shadow-lg transition"
                >
                  <Card className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-black truncate">{survey.area_name}</h3>
                        <Badge className={getStatusColor(survey.status)}>
                          {getStatusLabel(survey.status)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {survey.survey_date && (
                          <p>
                            <span className="font-medium">Date:</span> {format(new Date(survey.survey_date), 'MMM d, yyyy')}
                          </p>
                        )}
                        {survey.area_size_sqft && (
                          <p>
                            <span className="font-medium">Size:</span> {survey.area_size_sqft} sqft
                          </p>
                        )}
                        {survey.suggested_system && (
                          <p>
                            <span className="font-medium">System:</span> {survey.suggested_system}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Click to view</p>
                    </div>
                  </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

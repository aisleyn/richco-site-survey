import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSurveyById, getSurveyMedia, publishSurvey } from '../../services/surveys'
import { generateSurveyFromTemplate } from '../../lib/templateExport'
import type { Survey, SurveyMedia } from '../../types'
import { Card, CardHeader, CardTitle, Button, Badge, Spinner } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'

export default function SurveyDetailPage() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const addToast = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [media, setMedia] = useState<SurveyMedia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    loadData()
  }, [surveyId])

  const loadData = async () => {
    if (!surveyId) return
    try {
      const [s, m] = await Promise.all([
        getSurveyById(surveyId),
        getSurveyMedia(surveyId),
      ])
      setSurvey(s)
      setMedia(m)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!survey) return
    setIsPublishing(true)
    try {
      await publishSurvey(survey.id, survey.project_id)
      setSurvey({ ...survey, status: 'published' })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!survey) return
    setIsDownloading(true)
    try {
      const imageMedia = media.filter((m) => m.media_type === 'image').map((m) => m.file_url)
      const scanMedia = media.filter((m) => m.media_type === '3d_scan').map((m) => m.file_url)

      await generateSurveyFromTemplate({
        projectName: survey.project_name,
        areaName: survey.area_name,
        surveyDate: survey.survey_date,
        areaSize: survey.area_size_sqft?.toString() || 'N/A',
        surveyNotes: survey.survey_notes || 'N/A',
        recommendedSystem: survey.suggested_system || 'N/A',
        notes: survey.install_notes || 'N/A',
        images: imageMedia,
        scans: scanMedia,
        clientName: survey.client_name || 'N/A',
      })

      addToast({
        type: 'success',
        message: 'Report downloaded successfully',
      })
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to generate report',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!survey) return <div>Survey not found</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{survey.area_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={survey.status}>{survey.status}</Badge>
            <span className="text-secondary text-sm">
              {new Date(survey.survey_date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          {survey.status === 'draft' && (
            <>
              <Button variant="secondary" onClick={() => navigate(`/staff/surveys/${survey.id}/edit`)} className="w-full xs:w-auto">
                ✏️ Edit
              </Button>
              <Button variant="primary" onClick={handlePublish} isLoading={isPublishing} className="w-full xs:w-auto">
                Publish to Report
              </Button>
            </>
          )}
          {survey.status === 'published' && (
            <Button variant="primary" onClick={handleDownloadReport} isLoading={isDownloading} className="w-full xs:w-auto">
              📥 Download Report
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Details</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Area Size</label>
                <p className="text-white">{survey.area_size_sqft} sqft</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Survey Notes</label>
                <p className="text-white">{survey.survey_notes || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Suggested System</label>
                <p className="text-white">{survey.suggested_system || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Installation Notes</label>
                <p className="text-white">{survey.install_notes || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Media ({media.length})</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-3 gap-4">
                {media.map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {m.media_type === 'image' ? (
                      <img src={m.file_url} alt="survey" className="w-full h-32 object-cover" />
                    ) : m.media_type === 'video' ? (
                      <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 6H5v14h14V9h-6V6z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-secondary">Project</label>
                <p className="font-medium text-white">{survey.project_name}</p>
              </div>
              <div>
                <label className="text-secondary">Client</label>
                <p className="font-medium text-white">{survey.client_name}</p>
              </div>
              <div>
                <label className="text-secondary">Created</label>
                <p className="font-medium text-white">
                  {new Date(survey.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

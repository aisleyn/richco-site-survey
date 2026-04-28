import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getSurveyById, getSurveyMedia, publishSurvey, deleteSurvey } from '../../services/surveys'
import { getSurveyUpdates } from '../../services/surveyUpdates'
import { generateSurveyFromTemplate } from '../../lib/templateExport'
import type { Survey, SurveyMedia, SurveyUpdate, SurveyUpdateMedia } from '../../types'
import { Card, CardHeader, CardTitle, Button, Badge, Spinner, MediaPreviewModal } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'

export default function SurveyDetailPage() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const addToast = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [media, setMedia] = useState<SurveyMedia[]>([])
  const [surveyUpdates, setSurveyUpdates] = useState<(SurveyUpdate & { media: SurveyUpdateMedia[] })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ file_url: string; media_type: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [surveyId])

  const loadData = async () => {
    if (!surveyId) return
    try {
      const [s, m, updates] = await Promise.all([
        getSurveyById(surveyId),
        getSurveyMedia(surveyId),
        getSurveyUpdates(surveyId),
      ])
      setSurvey(s)
      setMedia(m)
      setSurveyUpdates(updates)
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
      const imageMedia = media.filter((m) => m.media_type === 'image' || m.media_type === 'pdf').map((m) => m.file_url)
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

  const handleDelete = async () => {
    if (!survey) return
    if (!window.confirm('Are you sure you want to delete this survey? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteSurvey(survey.id)
      addToast({ type: 'success', message: 'Survey deleted successfully' })
      navigate('/staff/surveys')
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete survey' })
      setIsDeleting(false)
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
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} className="w-full xs:w-auto">
            Delete
          </Button>
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
                  <div
                    key={m.id}
                    className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedMedia(m)}
                  >
                    {m.media_type === 'image' ? (
                      <img src={m.file_url} alt="survey" className="w-full h-32 object-cover" />
                    ) : m.media_type === 'video' ? (
                      <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                        </svg>
                      </div>
                    ) : m.media_type === 'pdf' ? (
                      <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
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

          {surveyUpdates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Updates</h2>
              {surveyUpdates.map((update) => (
                <Card key={update.id}>
                  <div className="mb-4 pb-4 border-b border-slate-200">
                    <p className="text-sm text-slate-500">
                      {format(new Date(update.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {update.update_notes && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Update Notes</label>
                        <p className="text-white">{update.update_notes}</p>
                      </div>
                    )}
                    {update.area_name && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Area Name</label>
                        <p className="text-white">{update.area_name}</p>
                      </div>
                    )}
                    {update.area_size_sqft && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Area Size</label>
                        <p className="text-white">{update.area_size_sqft} sqft</p>
                      </div>
                    )}
                    {update.suggested_system && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Suggested System</label>
                        <p className="text-white">{update.suggested_system}</p>
                      </div>
                    )}
                    {update.install_notes && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">Installation Notes</label>
                        <p className="text-white">{update.install_notes}</p>
                      </div>
                    )}
                    {update.media.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Media ({update.media.length})</label>
                        <div className="grid grid-cols-3 gap-4">
                          {update.media.map((m) => (
                            <div
                              key={m.id}
                              className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedMedia(m)}
                            >
                              {m.media_type === 'image' ? (
                                <img src={m.file_url} alt="update" className="w-full h-32 object-cover" />
                              ) : m.media_type === 'video' ? (
                                <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                                  </svg>
                                </div>
                              ) : m.media_type === 'pdf' ? (
                                <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
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
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
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

      <MediaPreviewModal
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  )
}

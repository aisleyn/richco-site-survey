import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { ReportPage, Survey, SurveyMedia, SurveyUpdate, SurveyUpdateMedia } from '../../types'
import { getSurveyById, getSurveyMedia } from '../../services/surveys'
import { getSurveyUpdates } from '../../services/surveyUpdates'
import { Spinner, MediaPreviewModal } from '../ui'

interface FlipbookPageProps {
  page: ReportPage
}

export function FlipbookPage({ page }: FlipbookPageProps) {
  const [surveys, setSurveys] = useState<Array<{ survey: Survey; media: SurveyMedia[]; updates: Array<SurveyUpdate & { media: SurveyUpdateMedia[] }> }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<{ file_url: string; media_type: string } | null>(null)

  useEffect(() => {
    loadPageSurveys()
  }, [page.id])

  const loadPageSurveys = async () => {
    try {
      console.log('Loading surveys for page:', page.id, 'with survey IDs:', page.survey_ids)

      if (!page.survey_ids || page.survey_ids.length === 0) {
        console.log('No survey IDs found for this page')
        setSurveys([])
        return
      }

      const surveyDataPromises = page.survey_ids.map(async (surveyId) => {
        try {
          const survey = await getSurveyById(surveyId)
          if (!survey) {
            console.warn(`Survey ${surveyId} not found, skipping`)
            return null
          }
          const media = await getSurveyMedia(surveyId)
          const updates = await getSurveyUpdates(surveyId)
          console.log(`Loaded survey ${surveyId}:`, survey)
          return { survey, media, updates }
        } catch (err) {
          console.error(`Failed to load survey ${surveyId}:`, err)
          throw err
        }
      })

      const surveyDataResults = await Promise.all(surveyDataPromises)
      const surveyData = surveyDataResults.filter((s) => s !== null)
      console.log('All surveys loaded:', surveyData)
      setSurveys(surveyData)
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('❌ Error loading page surveys:', err)
      console.error('Error details:', errorMsg)
      setError(`Error loading surveys: ${errorMsg}`)
      setSurveys([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded border border-red-200">
        <p className="text-red-700 font-semibold">Error loading surveys</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (surveys.length === 0) {
    return (
      <div className="p-8 bg-yellow-50 rounded border border-yellow-200">
        <p className="text-yellow-700 font-semibold">No surveys found</p>
        <p className="text-yellow-600 text-sm mt-1">This report page has no surveys. Check that surveys are linked to this page.</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-96">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-black mb-2">
          {page.month_tag} Report
        </h2>
        <p className="text-sm text-slate-600">
          Published {new Date(page.published_at).toLocaleDateString()}
        </p>
      </div>

      {/* Surveys */}
      <div className="space-y-8">
        {surveys.map(({ survey, media, updates }, idx) => (
          <div key={survey.id} className={idx > 0 ? 'pt-8 border-t border-slate-200' : ''}>
            {/* Check if this is an initial issue */}
            {!survey.suggested_system && !survey.install_notes ? (
              <>
                {/* Initial Issue Header */}
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <h3 className="text-lg font-bold text-blue-900">
                    🔍 Initial Issue: {survey.area_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-2">
                    {new Date(survey.survey_date).toLocaleDateString()}
                  </p>
                  {survey.survey_notes && (
                    <p className="text-sm text-black mt-3">{survey.survey_notes}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Regular Survey Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-black">
                    {survey.area_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date(survey.survey_date).toLocaleDateString()}
                    {survey.area_size_sqft && ` • ${survey.area_size_sqft} sqft`}
                  </p>
                </div>

                {/* Survey Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {survey.survey_notes && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">
                        Survey Notes
                      </label>
                      <p className="text-sm text-black mt-1">{survey.survey_notes}</p>
                    </div>
                  )}
                  {survey.suggested_system && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase">
                        Suggested System
                      </label>
                      <p className="text-sm text-white mt-1">{survey.suggested_system}</p>
                    </div>
                  )}
                  {survey.install_notes && (
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase">
                        Installation Notes
                      </label>
                      <p className="text-sm text-white mt-1">{survey.install_notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Media Gallery */}
            {media.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase mb-3 block">
                  Media ({media.length})
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {media.map((m) => (
                    <div
                      key={m.id}
                      className="bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedMedia(m)}
                    >
                      {m.media_type === 'image' ? (
                        <img
                          src={m.file_url}
                          alt={`${survey.area_name} media`}
                          className="w-full h-32 object-cover"
                        />
                      ) : m.media_type === 'video' ? (
                        <div className="w-full h-32 flex items-center justify-center bg-slate-200">
                          <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                          </svg>
                        </div>
                      ) : m.media_type === 'pdf' ? (
                        <div className="w-full h-32 flex items-center justify-center bg-slate-200">
                          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-slate-200">
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

            {/* Survey Updates */}
            {updates && updates.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-600 uppercase mb-4 block">
                  Surveys
                </label>
                <div className="space-y-6">
                  {updates.map((update) => (
                    <div key={update.id} className="bg-slate-50 rounded border border-slate-200 p-4">
                      <p className="text-xs text-slate-500 mb-4">
                        {format(new Date(update.updated_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      <div className="space-y-3">
                        {update.update_notes && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                              Update Notes
                            </label>
                            <p className="text-sm text-black mt-1">{update.update_notes}</p>
                          </div>
                        )}
                        {update.area_name && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                              Area Name
                            </label>
                            <p className="text-sm text-black mt-1">{update.area_name}</p>
                          </div>
                        )}
                        {update.area_size_sqft && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                              Area Size
                            </label>
                            <p className="text-sm text-black mt-1">{update.area_size_sqft} sqft</p>
                          </div>
                        )}
                        {update.suggested_system && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                              Suggested System
                            </label>
                            <p className="text-sm text-black mt-1">{update.suggested_system}</p>
                          </div>
                        )}
                        {update.install_notes && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase">
                              Installation Notes
                            </label>
                            <p className="text-sm text-black mt-1">{update.install_notes}</p>
                          </div>
                        )}
                        {update.media && update.media.length > 0 && (
                          <div>
                            <label className="text-xs font-semibold text-slate-600 uppercase mb-2 block">
                              Media ({update.media.length})
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                              {update.media.map((m) => (
                                <div
                                  key={m.id}
                                  className="bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedMedia(m)}
                                >
                                  {m.media_type === 'image' ? (
                                    <img
                                      src={m.file_url}
                                      alt="update media"
                                      className="w-full h-32 object-cover"
                                    />
                                  ) : m.media_type === 'video' ? (
                                    <div className="w-full h-32 flex items-center justify-center bg-slate-200">
                                      <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                                      </svg>
                                    </div>
                                  ) : m.media_type === 'pdf' ? (
                                    <div className="w-full h-32 flex items-center justify-center bg-slate-200">
                                      <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-full h-32 flex items-center justify-center bg-slate-200">
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Page Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Page {page.page_number}</span>
        <span>{new Date(page.published_at).toLocaleDateString()}</span>
      </div>

      <MediaPreviewModal
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { ReportPage, Survey, SurveyMedia } from '../../types'
import { getSurveyById, getSurveyMedia } from '../../services/surveys'
import { Spinner } from '../ui'

interface FlipbookPageProps {
  page: ReportPage
}

export function FlipbookPage({ page }: FlipbookPageProps) {
  const [surveys, setSurveys] = useState<Array<{ survey: Survey; media: SurveyMedia[] }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPageSurveys()
  }, [page.id])

  const loadPageSurveys = async () => {
    try {
      const surveyData = await Promise.all(
        page.survey_ids.map(async (surveyId) => ({
          survey: await getSurveyById(surveyId),
          media: await getSurveyMedia(surveyId),
        })),
      )
      setSurveys(surveyData)
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

  return (
    <div className="p-8 bg-white min-h-96">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-white mb-2">
          {page.month_tag} Report
        </h2>
        <p className="text-sm text-slate-600">
          Published {new Date(page.published_at).toLocaleDateString()}
        </p>
      </div>

      {/* Surveys */}
      <div className="space-y-8">
        {surveys.map(({ survey, media }, idx) => (
          <div key={survey.id} className={idx > 0 ? 'pt-8 border-t border-slate-200' : ''}>
            {/* Survey Header */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">
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
                  <p className="text-sm text-white mt-1">{survey.survey_notes}</p>
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
                      className="bg-slate-100 rounded border border-slate-200 overflow-hidden"
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
        ))}
      </div>

      {/* Page Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Page {page.page_number}</span>
        <span>{new Date(page.published_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

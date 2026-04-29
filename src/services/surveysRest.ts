import { apiFetch } from '../lib/api'
import type { Survey, SurveyMedia } from '../types'

export async function getSurveyById(id: string): Promise<Survey | null> {
  const data = await apiFetch<Survey[]>(`surveys?id=eq.${id}`)
  return data && data.length > 0 ? data[0] : null
}

export async function getSurveyMedia(surveyId: string): Promise<SurveyMedia[]> {
  const data = await apiFetch<SurveyMedia[]>(
    `survey_media?survey_id=eq.${surveyId}&order=uploaded_at.desc`
  )
  return data || []
}

export async function getSurveysByProject(projectId: string): Promise<Survey[]> {
  const data = await apiFetch<Survey[]>(
    `surveys?project_id=eq.${projectId}&order=created_at.desc`
  )
  return data || []
}

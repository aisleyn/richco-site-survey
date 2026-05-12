import { supabase } from '../lib/supabase'
import type { Survey, SurveyMedia, SurveyFormValues } from '../types'
import { MediaType } from '../types'
import { upsertReportPage } from './reportPages'

export async function getSurveysByProject(projectId: string): Promise<Survey[]> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  try {
    const response = await fetch(`/api/survey-detail/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch survey: ${response.status}`)
    }
    const { survey } = await response.json()
    return survey || null
  } catch (error) {
    console.error('Error fetching survey:', error)
    return null
  }
}

export async function getSurveyMedia(surveyId: string): Promise<SurveyMedia[]> {
  try {
    const response = await fetch(`/api/survey-detail/${surveyId}`)
    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`Failed to fetch survey media: ${response.status}`)
    }
    const { media } = await response.json()
    return media || []
  } catch (error) {
    console.error('Error fetching survey media:', error)
    return []
  }
}

export async function createSurvey(
  projectId: string,
  values: SurveyFormValues,
  userId: string,
): Promise<Survey> {
  const project = await supabase.from('projects').select('name').eq('id', projectId).single()

  const { data, error } = await supabase
    .from('surveys')
    .insert([
      {
        project_id: projectId,
        created_by: userId,
        project_name: project.data?.name || values.project_id,
        client_name: values.client_name,
        area_name: values.area_name,
        survey_date: values.survey_date,
        area_size_sqft: values.area_size_sqft,
        survey_notes: values.survey_notes,
        suggested_system: values.suggested_system,
        install_notes: values.install_notes,
        status: 'draft',
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Add survey to report page preview so it shows in flipbook immediately
  await upsertReportPage(projectId, data.id)

  return data
}

export async function updateSurvey(
  surveyId: string,
  values: Partial<SurveyFormValues>,
): Promise<Survey> {
  const { data, error } = await supabase
    .from('surveys')
    .update({
      area_name: values.area_name,
      survey_date: values.survey_date,
      area_size_sqft: values.area_size_sqft,
      survey_notes: values.survey_notes,
      suggested_system: values.suggested_system,
      install_notes: values.install_notes,
      client_name: values.client_name,
    })
    .eq('id', surveyId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addSurveyMedia(
  surveyId: string,
  mediaType: MediaType,
  fileUrl: string,
): Promise<SurveyMedia> {
  const { data, error } = await supabase
    .from('survey_media')
    .insert([
      {
        survey_id: surveyId,
        media_type: mediaType,
        file_url: fileUrl,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function publishSurvey(surveyId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'published' })
    .eq('id', surveyId)

  if (error) throw error

  await upsertReportPage(projectId, surveyId)
}

export async function archiveSurvey(surveyId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('surveys')
    .update({ status: 'archived' })
    .eq('id', surveyId)

  if (error) throw error

  await upsertReportPage(projectId, surveyId)
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  const { error: mediaError } = await supabase
    .from('survey_media')
    .delete()
    .eq('survey_id', surveyId)

  if (mediaError) throw mediaError

  const { error: surveyError } = await supabase
    .from('surveys')
    .delete()
    .eq('id', surveyId)

  if (surveyError) throw surveyError
}

import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { ReportPage } from '../types'

export async function getReportPagesByProject(projectId: string): Promise<ReportPage[]> {
  const { data, error } = await supabase
    .from('report_pages')
    .select('*')
    .eq('project_id', projectId)
    .order('page_number', { ascending: false })

  if (error) throw error
  return data || []
}

export async function upsertReportPage(projectId: string, surveyId: string): Promise<void> {
  const monthTag = format(new Date(), 'yyyy-MM')

  const { data: existing, error: selectError } = await supabase
    .from('report_pages')
    .select('*')
    .eq('project_id', projectId)
    .eq('month_tag', monthTag)
    .single()

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError
  }

  if (existing) {
    const updatedSurveyIds = [...new Set([...existing.survey_ids, surveyId])]

    const { error: updateError } = await supabase
      .from('report_pages')
      .update({ survey_ids: updatedSurveyIds })
      .eq('id', existing.id)

    if (updateError) throw updateError
  } else {
    const { data: pages } = await supabase
      .from('report_pages')
      .select('page_number')
      .eq('project_id', projectId)
      .order('page_number', { ascending: false })
      .limit(1)

    const nextPageNumber = (pages?.[0]?.page_number || 0) + 1

    const { error: insertError } = await supabase.from('report_pages').insert([
      {
        project_id: projectId,
        page_number: nextPageNumber,
        month_tag: monthTag,
        survey_ids: [surveyId],
      },
    ])

    if (insertError) throw insertError
  }
}

export async function deleteProjectReports(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('report_pages')
    .delete()
    .eq('project_id', projectId)

  if (error) throw error
}

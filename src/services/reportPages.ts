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

  console.log(`[ReportPages] Found ${data?.length || 0} pages for project ${projectId}`)

  // Check how many surveys exist and validate report page survey_ids
  const { data: surveys } = await supabase
    .from('surveys')
    .select('id')
    .eq('project_id', projectId)

  const totalSurveys = surveys?.length || 0
  const existingSurveyIds = new Set(surveys?.map(s => s.id) || [])

  // Clean up report pages with orphaned survey IDs
  const pagesToCleanup = data?.filter(page =>
    page.survey_ids?.some((id: string) => !existingSurveyIds.has(id))
  ) || []

  if (pagesToCleanup.length > 0) {
    console.log(`[ReportPages] Found ${pagesToCleanup.length} pages with orphaned survey IDs, cleaning up...`)

    const cleanedPages = data?.map(page => {
      if (!page.survey_ids) return page
      const validIds = page.survey_ids.filter((id: string) => existingSurveyIds.has(id))
      return { ...page, survey_ids: validIds }
    }) || []

    // Update pages with cleaned survey_ids or delete if empty
    for (const page of cleanedPages) {
      if (page.survey_ids && page.survey_ids.length > 0) {
        const { error: updateError } = await supabase
          .from('report_pages')
          .update({ survey_ids: page.survey_ids })
          .eq('id', page.id)
        if (updateError) console.error(`Failed to update page ${page.id}:`, updateError)
      } else {
        const { error: deleteError } = await supabase
          .from('report_pages')
          .delete()
          .eq('id', page.id)
        if (deleteError) console.error(`Failed to delete page ${page.id}:`, deleteError)
      }
    }

    // Return the cleaned version
    return cleanedPages.filter(p => p.survey_ids && p.survey_ids.length > 0)
  }

  const surveysCovered = data?.reduce((sum, page) => sum + (page.survey_ids?.length || 0), 0) || 0

  console.log(`[ReportPages] Total surveys: ${totalSurveys}, covered by pages: ${surveysCovered}`)

  // If surveys exist but not all have pages, regenerate
  if (totalSurveys > 0 && surveysCovered < totalSurveys) {
    console.log(`[ReportPages] Missing pages for ${totalSurveys - surveysCovered} surveys, regenerating...`)
    try {
      await regenerateReportPagesFromSurveys(projectId)
      // Fetch again after regeneration
      const { data: newData, error: newError } = await supabase
        .from('report_pages')
        .select('*')
        .eq('project_id', projectId)
        .order('page_number', { ascending: false })
      if (newError) throw newError
      console.log(`[ReportPages] After regeneration: ${newData?.length || 0} pages`)
      return newData || []
    } catch (err) {
      console.error('Failed to regenerate report pages:', err)
      return data || []
    }
  }

  return data || []
}

export async function upsertReportPage(projectId: string, surveyId: string): Promise<void> {
  const monthTag = format(new Date(), 'yyyy-MM')

  // Check if this survey already has a report page
  const { data: existing } = await supabase
    .from('report_pages')
    .select('id')
    .eq('project_id', projectId)
    .contains('survey_ids', [surveyId])
    .limit(1)

  if (existing && existing.length > 0) {
    // Page already exists for this survey
    return
  }

  // Get next sequential page number
  const { data: pages } = await supabase
    .from('report_pages')
    .select('page_number')
    .eq('project_id', projectId)
    .order('page_number', { ascending: false })
    .limit(1)

  const pageNumber = (pages?.[0]?.page_number || 0) + 1

  const { error: insertError } = await supabase.from('report_pages').insert([
    {
      project_id: projectId,
      page_number: pageNumber,
      month_tag: monthTag,
      survey_ids: [surveyId],
    },
  ])

  if (insertError) {
    console.error('Error creating report page:', insertError)
    // Don't throw - survey creation should succeed even if report page fails
  }
}

export async function deleteProjectReports(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('report_pages')
    .delete()
    .eq('project_id', projectId)

  if (error) throw error
}

export async function regenerateReportPagesFromSurveys(projectId: string): Promise<void> {
  console.log(`[ReportPages] Regenerating report pages for project ${projectId}...`)

  // Get ALL surveys with their IDs
  const { data: surveys, error: surveysError } = await supabase
    .from('surveys')
    .select('id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (surveysError) {
    console.error(`[ReportPages] Error fetching surveys:`, surveysError)
    throw surveysError
  }

  console.log(`[ReportPages] Found ${surveys?.length || 0} surveys:`, surveys?.map(s => s.id))

  if (!surveys || surveys.length === 0) {
    console.log(`[ReportPages] No surveys found`)
    return
  }

  // Check what pages already exist
  const { data: existingPages, error: pagesError } = await supabase
    .from('report_pages')
    .select('*')
    .eq('project_id', projectId)

  console.log(`[ReportPages] Found ${existingPages?.length || 0} existing pages`)

  if (pagesError) {
    console.error(`[ReportPages] Error fetching existing pages:`, pagesError)
  }

  const existingSurveyIds = new Set<string>()
  existingPages?.forEach(page => {
    console.log(`[ReportPages] Existing page has surveys:`, page.survey_ids)
    if (Array.isArray(page.survey_ids)) {
      page.survey_ids.forEach((id: string) => existingSurveyIds.add(id))
    }
  })

  // Find surveys without pages
  const surveysNeedingPages = surveys.filter(s => !existingSurveyIds.has(s.id))
  console.log(`[ReportPages] Surveys needing pages: ${surveysNeedingPages.length}`, surveysNeedingPages.map(s => s.id))

  if (surveysNeedingPages.length === 0) {
    console.log(`[ReportPages] All surveys have pages`)
    return
  }

  // Get the max page number for this project
  const { data: maxPage } = await supabase
    .from('report_pages')
    .select('page_number')
    .eq('project_id', projectId)
    .order('page_number', { ascending: false })
    .limit(1)

  // Create pages for surveys that don't have them
  let pageNumber = (maxPage?.[0]?.page_number || 0) + 1
  const newPages = surveysNeedingPages.map((survey) => ({
    project_id: projectId,
    page_number: pageNumber++,
    month_tag: format(new Date(survey.created_at), 'yyyy-MM'),
    survey_ids: [survey.id],
  }))

  console.log(`[ReportPages] Creating ${newPages.length} new pages...`)

  const { error: insertError, data: inserted } = await supabase
    .from('report_pages')
    .insert(newPages)
    .select()

  if (insertError) {
    console.error(`[ReportPages] Error inserting pages:`, insertError)
    throw insertError
  }

  console.log(`[ReportPages] Successfully created ${inserted?.length || 0} pages`)
}

export async function splitBundledReportPages(projectId: string): Promise<void> {
  // Migrate bundled report pages to individual pages (one survey per page)
  const { data: pages, error: selectError } = await supabase
    .from('report_pages')
    .select('*')
    .eq('project_id', projectId)

  if (selectError) throw selectError
  if (!pages || pages.length === 0) return

  // Find pages with multiple surveys
  const bundledPages = pages.filter((p: any) => p.survey_ids && p.survey_ids.length > 1)
  if (bundledPages.length === 0) return

  // Delete the bundled pages
  const bundledIds = bundledPages.map((p: any) => p.id)
  const { error: deleteError } = await supabase
    .from('report_pages')
    .delete()
    .in('id', bundledIds)

  if (deleteError) throw deleteError

  // Recreate them as individual pages
  let nextPageNumber = Math.max(...pages.map((p: any) => p.page_number || 0)) + 1

  // Batch all new pages for insertion
  const newPages = []
  for (const bundledPage of bundledPages) {
    for (const surveyId of bundledPage.survey_ids) {
      newPages.push({
        project_id: projectId,
        page_number: nextPageNumber,
        month_tag: bundledPage.month_tag,
        survey_ids: [surveyId],
        published_at: bundledPage.published_at,
      })
      nextPageNumber++
    }
  }

  if (newPages.length > 0) {
    const { error: insertError } = await supabase.from('report_pages').insert(newPages)
    if (insertError) throw insertError
  }
}

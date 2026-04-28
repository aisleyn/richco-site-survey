import { apiFetch } from '../lib/api'
import type { SurveyUpdate, SurveyUpdateMedia } from '../types'

export async function createSurveyUpdate(
  surveyId: string,
  waypointId: string,
  updateData: {
    update_notes?: string
    area_name?: string
    area_size_sqft?: number | null
    suggested_system?: string
    install_notes?: string
  },
  userId?: string,
): Promise<SurveyUpdate> {
  const payload = {
    survey_id: surveyId,
    waypoint_id: waypointId,
    update_notes: updateData.update_notes || null,
    area_name: updateData.area_name || null,
    area_size_sqft: updateData.area_size_sqft || null,
    suggested_system: updateData.suggested_system || null,
    install_notes: updateData.install_notes || null,
    updated_by: userId || null,
  }

  const data = await apiFetch<SurveyUpdate[]>(
    'survey_updates',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }
  )
  return data[0]
}

export async function addSurveyUpdateMedia(
  surveyUpdateId: string,
  mediaType: string,
  fileUrl: string,
): Promise<SurveyUpdateMedia> {
  const payload = {
    survey_update_id: surveyUpdateId,
    media_type: mediaType,
    file_url: fileUrl,
  }

  const data = await apiFetch<SurveyUpdateMedia[]>(
    'survey_update_media',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }
  )
  return data[0]
}

export async function getSurveyUpdates(
  surveyId: string,
): Promise<(SurveyUpdate & { media: SurveyUpdateMedia[] })[]> {
  const updates = await apiFetch<SurveyUpdate[]>(
    `survey_updates?survey_id=eq.${surveyId}&order=updated_at.asc`
  )

  if (!updates || updates.length === 0) return []

  // Fetch media for each update
  const updatesWithMedia = await Promise.all(
    updates.map(async (update) => {
      const media = await apiFetch<SurveyUpdateMedia[]>(
        `survey_update_media?survey_update_id=eq.${update.id}&order=uploaded_at.asc`
      )
      return {
        ...update,
        media: media || [],
      }
    })
  )

  return updatesWithMedia
}

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
    completion_date?: string
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
    completion_date: updateData.completion_date || null,
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

export async function updateSurveyUpdate(
  updateId: string,
  updateData: {
    update_notes?: string
    area_name?: string
    area_size_sqft?: number | null
    suggested_system?: string
    install_notes?: string
    waypoint_location_json?: any
  },
): Promise<SurveyUpdate> {
  const payload: any = {}

  if (updateData.update_notes !== undefined) payload.update_notes = updateData.update_notes
  if (updateData.area_name !== undefined) payload.area_name = updateData.area_name
  if (updateData.area_size_sqft !== undefined) payload.area_size_sqft = updateData.area_size_sqft
  if (updateData.suggested_system !== undefined) payload.suggested_system = updateData.suggested_system
  if (updateData.install_notes !== undefined) payload.install_notes = updateData.install_notes
  if (updateData.waypoint_location_json !== undefined) payload.waypoint_location_json = updateData.waypoint_location_json

  const data = await apiFetch<SurveyUpdate[]>(
    `survey_updates?id=eq.${updateId}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    }
  )
  return data[0]
}

export async function getSurveyUpdates(
  surveyId: string,
): Promise<(SurveyUpdate & { media: SurveyUpdateMedia[] })[]> {
  try {
    const response = await fetch(`/api/survey-detail/${surveyId}`)
    if (!response.ok) {
      if (response.status === 404) return []
      throw new Error(`Failed to fetch survey updates: ${response.status}`)
    }
    const { updates, updateMedia } = await response.json()

    if (!updates || updates.length === 0) return []

    // Map media back to updates
    const updatesWithMedia = updates.map((update: SurveyUpdate) => ({
      ...update,
      media: updateMedia?.filter((m: SurveyUpdateMedia) => m.survey_update_id === update.id) || [],
    }))

    return updatesWithMedia
  } catch (error) {
    console.error('Error fetching survey updates:', error)
    return []
  }
}

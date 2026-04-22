import { apiFetch } from '../lib/api'
import { uploadFile } from './storage'
import type { WaypointPhoto } from '../types'

export async function getWaypointPhotos(waypointId: string): Promise<WaypointPhoto[]> {
  const data = await apiFetch<WaypointPhoto[]>(
    `waypoint_photos?waypoint_id=eq.${waypointId}&order=submitted_at.desc`
  )
  return data || []
}

export async function getProjectPhotos(projectId: string): Promise<WaypointPhoto[]> {
  const data = await apiFetch<WaypointPhoto[]>(
    `waypoint_photos?project_id=eq.${projectId}&order=submitted_at.desc`
  )
  return data || []
}

export async function submitWaypointPhoto(
  waypointId: string,
  projectId: string,
  file: File,
  photoType: 'before' | 'after' | 'progress' | 'general',
  caption?: string
): Promise<WaypointPhoto> {
  const fileName = `${waypointId}/${Date.now()}-${file.name}`
  const uploadResult = await uploadFile('waypoint-photos', fileName, file)
  const fileUrl = uploadResult.signedUrl

  const data = await apiFetch<WaypointPhoto[]>(
    'waypoint_photos',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        waypoint_id: waypointId,
        project_id: projectId,
        file_url: fileUrl,
        photo_type: photoType,
        caption: caption || null,
      }),
    }
  )
  return data[0]
}

export async function deleteWaypointPhoto(photoId: string): Promise<void> {
  await apiFetch(`waypoint_photos?id=eq.${photoId}`, { method: 'DELETE' })
}

export async function updateWaypointPhotoCaption(
  photoId: string,
  caption: string
): Promise<WaypointPhoto> {
  const data = await apiFetch<WaypointPhoto[]>(
    `waypoint_photos?id=eq.${photoId}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ caption }),
    }
  )
  return data[0]
}

import { apiFetch } from '../lib/api'
import { addRepairHistoryEntry } from './waypointRepairHistory'
import type { MapWaypoint, WaypointStatus } from '../types'

export async function getWaypointsByProject(projectId: string): Promise<MapWaypoint[]> {
  const data = await apiFetch<MapWaypoint[]>(
    `map_waypoints?project_id=eq.${projectId}`
  )
  return data || []
}

export async function createWaypoint(
  projectId: string,
  areaName: string,
  xPercent: number,
  yPercent: number,
): Promise<MapWaypoint> {
  try {
    console.log('createWaypoint: creating new waypoint')
    const data = await apiFetch<MapWaypoint[]>(
      'map_waypoints',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          project_id: projectId,
          area_name: areaName,
          x_percent: xPercent,
          y_percent: yPercent,
          status: 'needs_repair',
        }),
      }
    )
    console.log('createWaypoint: API returned', data.length, 'items:', data)
    const waypoint = data[0]
    console.log('createWaypoint: returning waypoint:', waypoint?.id)
    return waypoint
  } catch (err) {
    console.error('createWaypoint error:', err)
    throw err
  }
}

export async function updateWaypoint(
  id: string,
  updates: Partial<MapWaypoint>,
): Promise<MapWaypoint> {
  const data = await apiFetch<MapWaypoint[]>(
    `map_waypoints?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(updates),
    }
  )
  return data[0]
}

export async function deleteWaypoint(id: string): Promise<void> {
  try {
    console.log('deleteWaypoint: deleting waypoint', id)

    // Delete waypoint-specific records (photos, notes, repair history)
    // Note: survey_updates will automatically have waypoint_id set to NULL via CASCADE
    const tablesToDelete = [
      'waypoint_photos',
      'waypoint_notes',
      'waypoint_repair_history',
    ]

    for (const table of tablesToDelete) {
      try {
        await apiFetch(`${table}?waypoint_id=eq.${id}`, { method: 'DELETE' })
      } catch (err) {
        // No records to delete, continue
      }
    }

    // Delete the waypoint (survey history is preserved, waypoint_id set to NULL by constraint)
    await apiFetch(`map_waypoints?id=eq.${id}`, { method: 'DELETE' })
    console.log('deleteWaypoint: successfully deleted waypoint', id)
  } catch (err) {
    console.error('deleteWaypoint error:', err)
    throw err
  }
}

export async function updateWaypointStatus(
  id: string,
  projectId: string,
  newStatus: WaypointStatus,
  userId?: string,
  surveyId?: string,
): Promise<MapWaypoint> {
  try {
    console.log('updateWaypointStatus: getting current status for', id)
    // Get current waypoint status efficiently
    const currentWaypoint = await apiFetch<MapWaypoint[]>(
      `map_waypoints?id=eq.${id}&select=id,status`
    )
    const oldStatus = currentWaypoint[0]?.status || null
    console.log('updateWaypointStatus: old status:', oldStatus, 'new status:', newStatus)

    // Update the status - this is the critical operation
    console.log('updateWaypointStatus: calling updateWaypoint')
    const data = await updateWaypoint(id, { status: newStatus })
    console.log('updateWaypointStatus: update succeeded, waypoint:', data)

    // Track status change in repair history
    try {
      await addRepairHistoryEntry(id, projectId, oldStatus, newStatus, userId, undefined, surveyId)
      console.log('updateWaypointStatus: repair history entry added')
    } catch (historyErr) {
      console.warn('updateWaypointStatus: failed to add repair history (non-blocking):', historyErr)
    }

    return data
  } catch (err) {
    console.error('updateWaypointStatus error:', err)
    throw err
  }
}

export async function updateWaypointNotes(
  id: string,
  notes: string,
): Promise<MapWaypoint> {
  return updateWaypoint(id, { repair_notes: notes })
}

export async function deleteWaypointByLinkedSurvey(surveyId: string): Promise<void> {
  try {
    console.log('deleteWaypointByLinkedSurvey: finding waypoint for survey', surveyId)
    // Find waypoint linked to this survey
    const waypoints = await apiFetch<MapWaypoint[]>(
      `map_waypoints?linked_survey_id=eq.${surveyId}`
    )
    if (waypoints && waypoints.length > 0) {
      const waypoint = waypoints[0]
      console.log('deleteWaypointByLinkedSurvey: found waypoint', waypoint.id, 'deleting it')
      await deleteWaypoint(waypoint.id)
    }
  } catch (err) {
    console.error('deleteWaypointByLinkedSurvey error:', err)
    throw err
  }
}

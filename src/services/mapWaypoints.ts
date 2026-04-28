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
    console.log('deleteWaypoint: deleting', id)
    await apiFetch(`map_waypoints?id=eq.${id}`, { method: 'DELETE' })
    console.log('deleteWaypoint: successfully deleted', id)
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
      await addRepairHistoryEntry(id, projectId, oldStatus, newStatus, userId)
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

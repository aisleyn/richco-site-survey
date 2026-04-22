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
  return data[0]
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
  await apiFetch(`map_waypoints?id=eq.${id}`, { method: 'DELETE' })
}

export async function updateWaypointStatus(
  id: string,
  projectId: string,
  newStatus: WaypointStatus,
  notes?: string,
): Promise<MapWaypoint> {
  const currentWaypoint = await apiFetch<MapWaypoint[]>(
    `map_waypoints?id=eq.${id}&select=status`
  )

  const data = await updateWaypoint(id, { status: newStatus })

  await addRepairHistoryEntry(
    id,
    projectId,
    currentWaypoint[0]?.status,
    newStatus,
    notes,
  )

  return data
}

export async function updateWaypointNotes(
  id: string,
  notes: string,
): Promise<MapWaypoint> {
  return updateWaypoint(id, { repair_notes: notes })
}

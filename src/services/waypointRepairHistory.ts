import { apiFetch } from '../lib/api'
import type { WaypointRepairHistory, WaypointStatus } from '../types'

export async function getWaypointHistory(
  waypointId: string
): Promise<WaypointRepairHistory[]> {
  const data = await apiFetch<WaypointRepairHistory[]>(
    `waypoint_repair_history?waypoint_id=eq.${waypointId}&order=changed_at.desc`
  )
  return data || []
}

export async function addRepairHistoryEntry(
  waypointId: string,
  projectId: string,
  oldStatus: WaypointStatus | null,
  newStatus: WaypointStatus,
  notes?: string
): Promise<WaypointRepairHistory> {
  const data = await apiFetch<WaypointRepairHistory[]>(
    'waypoint_repair_history',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        waypoint_id: waypointId,
        project_id: projectId,
        old_status: oldStatus,
        new_status: newStatus,
        notes: notes || null,
      }),
    }
  )
  return data[0]
}

export async function getProjectRepairHistory(
  projectId: string
): Promise<WaypointRepairHistory[]> {
  const data = await apiFetch<WaypointRepairHistory[]>(
    `waypoint_repair_history?project_id=eq.${projectId}&order=changed_at.desc`
  )
  return data || []
}

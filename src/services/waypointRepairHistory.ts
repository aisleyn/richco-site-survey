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
  _projectId: string,
  oldStatus: WaypointStatus | null,
  newStatus: WaypointStatus,
  userId?: string,
  notes?: string,
  surveyId?: string
): Promise<WaypointRepairHistory> {
  try {
    const payload = {
      waypoint_id: waypointId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId || 'unknown',
      notes: notes || null,
      survey_id: surveyId || null,
    }
    console.log('addRepairHistoryEntry: inserting with payload', payload)
    const data = await apiFetch<WaypointRepairHistory[]>(
      'waypoint_repair_history',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      }
    )
    console.log('addRepairHistoryEntry: insert succeeded, returned:', data)
    return data[0]
  } catch (err) {
    console.error('addRepairHistoryEntry: FAILED with error:', err)
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('Full error details:', errorMsg)
    throw err
  }
}

export async function getProjectRepairHistory(
  projectId: string
): Promise<WaypointRepairHistory[]> {
  const data = await apiFetch<WaypointRepairHistory[]>(
    `waypoint_repair_history?project_id=eq.${projectId}&order=changed_at.desc`
  )
  return data || []
}

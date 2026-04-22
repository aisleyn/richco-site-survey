import { apiFetch } from '../lib/api'
import type { ClientSubmission, ClientSubmissionMedia } from '../types'

export async function getClientSubmissionsByProject(
  projectId: string
): Promise<ClientSubmission[]> {
  const data = await apiFetch<ClientSubmission[]>(
    `client_submissions?project_id=eq.${projectId}&order=submitted_at.desc`
  )
  return data || []
}

export async function getSubmissionsByWaypoint(
  waypointId: string
): Promise<ClientSubmission[]> {
  const data = await apiFetch<ClientSubmission[]>(
    `client_submissions?waypoint_id=eq.${waypointId}&order=submitted_at.desc`
  )
  return data || []
}

export async function getClientSubmissionMedia(
  submissionId: string
): Promise<ClientSubmissionMedia[]> {
  const data = await apiFetch<ClientSubmissionMedia[]>(
    `client_submission_media?submission_id=eq.${submissionId}&order=created_at.desc`
  )
  return data || []
}

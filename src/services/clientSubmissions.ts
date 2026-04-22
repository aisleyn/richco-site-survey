import { supabase } from '../lib/supabase'
import type { ClientSubmission } from '../types'
import { sendClientSubmissionEmail } from './email'

export async function createClientSubmission(
  projectId: string,
  submittedBy: string,
  notes: string,
): Promise<ClientSubmission> {
  const { data, error } = await supabase
    .from('client_submissions')
    .insert([
      {
        project_id: projectId,
        submitted_by: submittedBy,
        notes,
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Send notification email to staff
  await notifyStaffOfSubmission(projectId, data)

  return data
}

export async function updateSubmissionWaypoint(
  submissionId: string,
  waypointId: string | null,
): Promise<ClientSubmission> {
  const { data, error } = await supabase
    .from('client_submissions')
    .update({ waypoint_id: waypointId })
    .eq('id', submissionId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function notifyStaffOfSubmission(projectId: string, submission: ClientSubmission): Promise<void> {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, client_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Failed to fetch project for email notification:', projectError)
      return
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', submission.submitted_by)
      .single()

    if (clientError || !client) {
      console.error('Failed to fetch client for email notification:', clientError)
      return
    }

    // Get staff contact for this project
    const { data: projectOwner, error: ownerError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', project.client_id)
      .single()

    if (ownerError || !projectOwner) {
      console.error('Failed to fetch project owner for email notification:', ownerError)
      return
    }

    // Send email to staff
    await sendClientSubmissionEmail(
      projectOwner.email,
      project.name,
      client.full_name || client.email,
      submission,
    )
  } catch (err) {
    // Log error but don't fail the submission if email fails
    console.error('Error sending staff notification email:', err)
  }
}

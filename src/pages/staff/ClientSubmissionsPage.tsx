import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { ClientSubmission } from '../../types'
import { Card, Badge, Spinner } from '../../components/ui'

interface SubmissionWithClient extends ClientSubmission {
  client_name: string
  client_email: string
}

export default function ClientSubmissionsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [submissions, setSubmissions] = useState<SubmissionWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadSubmissions()
  }, [projectId])

  const loadSubmissions = async () => {
    if (!projectId) return
    try {
      // Fetch submissions with client details
      const { data: submissionData, error } = await supabase
        .from('client_submissions')
        .select(
          `
          id,
          project_id,
          submitted_by,
          submitted_at,
          notes,
          waypoint_id,
          profiles!submitted_by(full_name, email)
        `,
        )
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const enriched = (submissionData || []).map((s: any) => ({
        id: s.id,
        project_id: s.project_id,
        submitted_by: s.submitted_by,
        submitted_at: s.submitted_at,
        notes: s.notes,
        waypoint_id: s.waypoint_id || null,
        client_name: s.profiles?.full_name || 'Unknown',
        client_email: s.profiles?.email || 'Unknown',
      }))

      setSubmissions(enriched)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Client Repair Requests</h1>
        <p className="text-secondary mt-2">
          {submissions.length} repair request{submissions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <p className="text-center text-secondary py-12">
            No repair requests yet. Clients can submit requests from their dashboard.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="card-hover">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {submission.client_name}
                    </h3>
                    <Badge variant="default">{submission.client_email}</Badge>
                  </div>

                  <p className="text-secondary mb-3 whitespace-pre-wrap">
                    {submission.notes}
                  </p>

                  <p className="text-xs text-slate-500">
                    Submitted {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>

                <Badge variant="in_progress">Pending Review</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

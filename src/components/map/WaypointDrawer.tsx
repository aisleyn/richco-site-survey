import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Badge, Button, Select, Spinner, Textarea, useToast } from '../ui'
import { getWaypointHistory } from '../../services/waypointRepairHistory'
import { getSurveyById, getSurveyMedia, getSurveysByProject } from '../../services/surveysRest'
import { getSubmissionsByWaypoint, getClientSubmissionMedia } from '../../services/clientSubmissionsRest'
import { updateWaypointNotes } from '../../services/mapWaypoints'
import { getWaypointNotes, createWaypointNote, formatNoteDate, type WaypointNote } from '../../services/waypointNotes'
import type { MapWaypoint, WaypointStatus, Survey, SurveyMedia, ClientSubmission, ClientSubmissionMedia, WaypointRepairHistory } from '../../types'

interface WaypointDrawerProps {
  waypoint: MapWaypoint | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (newStatus: WaypointStatus) => Promise<void>
  onSurveyLink: (surveyId: string | null) => Promise<void>
  onWaypointDelete?: (waypointId: string) => Promise<void>
  projectId: string
}

export function WaypointDrawer({
  waypoint,
  isOpen,
  onClose,
  onStatusChange,
  onSurveyLink,
  onWaypointDelete,
  projectId,
}: WaypointDrawerProps) {
  const { profile } = useAuthStore()
  const isStaff = profile?.role === 'richco_staff'
  const addToast = useToast()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [surveyMedia, setSurveyMedia] = useState<SurveyMedia[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([])
  const [submissionMediaMap, setSubmissionMediaMap] = useState<Map<string, ClientSubmissionMedia[]>>(new Map())
  const [repairHistory, setRepairHistory] = useState<WaypointRepairHistory[]>([])

  const [statusChanging, setStatusChanging] = useState(false)
  const [repairNotes, setRepairNotes] = useState(waypoint?.repair_notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [waypointNotes, setWaypointNotes] = useState<WaypointNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Load repair history
  useEffect(() => {
    if (!waypoint || !isOpen) return
    getWaypointHistory(waypoint.id).then(setRepairHistory).catch(() => {})
  }, [waypoint?.id, isOpen])

  // Load waypoint notes
  useEffect(() => {
    if (!waypoint || !isOpen) return
    getWaypointNotes(waypoint.id).then(setWaypointNotes).catch(() => {})
  }, [waypoint?.id, isOpen])

  // Load available surveys for linking
  useEffect(() => {
    if (!waypoint || !isOpen || !isStaff) return
    getSurveysByProject(projectId).then(setSurveys).catch(() => {})
  }, [waypoint, isOpen, projectId, isStaff])

  // Load linked survey details
  useEffect(() => {
    if (!waypoint?.linked_survey_id || !isOpen) return
    Promise.all([
      getSurveyById(waypoint.linked_survey_id),
      getSurveyMedia(waypoint.linked_survey_id),
    ])
      .then(([s, m]) => {
        setSurvey(s)
        setSurveyMedia(m)
      })
      .catch(() => {})
  }, [waypoint?.linked_survey_id, isOpen])

  // Load client submissions linked to this waypoint
  useEffect(() => {
    if (!waypoint || !isOpen) return
    getSubmissionsByWaypoint(waypoint.id)
      .then((all) => {
        setSubmissions(all)

        all.forEach((sub) => {
          getClientSubmissionMedia(sub.id)
            .then((media) => {
              setSubmissionMediaMap((prev) => new Map(prev).set(sub.id, media))
            })
            .catch(() => {})
        })
      })
      .catch(() => {})
  }, [waypoint?.id, isOpen])


  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatusChanging(true)
      await onStatusChange(newStatus as WaypointStatus)
    } finally {
      setStatusChanging(false)
    }
  }

  const handleSurveyLinkChange = async (surveyId: string) => {
    try {
      await onSurveyLink(surveyId || null)
    } catch (err) {
      console.error('Failed to link survey:', err)
    }
  }

  const handleSaveNotes = async () => {
    if (!waypoint) return
    try {
      await updateWaypointNotes(waypoint.id, repairNotes)
      setEditingNotes(false)
      addToast({ type: 'success', message: 'Notes saved' })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to save notes' })
    }
  }

  const handleDeleteWaypoint = async () => {
    if (!waypoint || !onWaypointDelete) return
    try {
      await onWaypointDelete(waypoint.id)
      addToast({ type: 'success', message: 'Waypoint removed' })
      onClose()
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to remove waypoint' })
    }
  }

  const handleAddNote = async () => {
    if (!waypoint || !profile || !newNote.trim()) return
    setIsAddingNote(true)
    try {
      const note = await createWaypointNote(
        waypoint.id,
        profile.id,
        profile.full_name || profile.email || 'Unknown User',
        profile.role,
        newNote
      )
      if (note) {
        setWaypointNotes([note, ...waypointNotes])
        setNewNote('')
        addToast({ type: 'success', message: 'Note added' })
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to add note' })
    } finally {
      setIsAddingNote(false)
    }
  }

  if (!isOpen || !waypoint) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 opacity-0 transition-opacity duration-250 pointer-events-none"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-24 h-[calc(100%-6rem)] w-[420px] bg-white shadow-xl overflow-y-auto transition-transform duration-250 ease-out"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-black">{waypoint.area_name}</h2>
            <Badge variant={waypoint.status} className="mt-1">
              {waypoint.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteWaypoint}
              className="px-3 py-1 bg-red-900 text-red-100 text-sm font-medium rounded hover:bg-red-800 transition-colors"
              aria-label="Remove waypoint"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Change Status (staff only) */}
          {isStaff && (
            <div>
              <Select
                label="Status"
                value={waypoint.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusChanging}
                options={[
                  { value: 'needs_repair', label: 'Needs Repair' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              {statusChanging && <Spinner size="sm" className="mt-2" />}
            </div>
          )}

          {/* Link to Survey (staff only) */}
          {isStaff && (
            <div>
              <Select
                label="Link to Survey"
                value={waypoint.linked_survey_id || ''}
                onChange={(e) => handleSurveyLinkChange(e.target.value)}
                options={[
                  { value: '', label: 'None' },
                  ...surveys.map((s) => ({ value: s.id, label: s.area_name })),
                ]}
              />
            </div>
          )}

          {/* Survey Detail Sheet */}
          {survey && waypoint.linked_survey_id && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Survey Details</p>
                <p className="text-sm text-white mt-1">{survey.survey_notes}</p>
              </div>

              {survey.area_size_sqft && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Area Size</p>
                  <p className="text-sm text-white">{survey.area_size_sqft} sqft</p>
                </div>
              )}

              {survey.suggested_system && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Suggested System</p>
                  <p className="text-sm text-white">{survey.suggested_system}</p>
                </div>
              )}

              {survey.install_notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Install Notes</p>
                  <p className="text-sm text-white">{survey.install_notes}</p>
                </div>
              )}

              {/* Survey Media Gallery */}
              {surveyMedia.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Media</p>
                  <div className="space-y-2">
                    {surveyMedia.map((media) => (
                      <div key={media.id}>
                        {media.media_type === 'image' ? (
                          <img src={media.file_url} alt="survey" className="w-full rounded h-40 object-cover" />
                        ) : media.media_type === 'video' ? (
                          <video src={media.file_url} controls className="w-full rounded" />
                        ) : (
                          <p className="text-xs text-slate-500">3D Scan</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client Submissions */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">
              Client Submissions <span className="text-slate-500">({submissions.length})</span>
            </p>
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No submissions for this project</p>
            ) : null}

            <div className="space-y-4">
              {submissions.map((sub) => {
                const media = submissionMediaMap.get(sub.id) || []
                return (
                  <div key={sub.id} className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}
                    </p>
                    {sub.notes && <p className="text-sm text-slate-700 mt-1">{sub.notes}</p>}

                    {media.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {media.map((m) => (
                          <div key={m.id}>
                            {m.media_type === 'image' ? (
                              <img src={m.file_url} alt="submission" className="w-full rounded h-32 object-cover" />
                            ) : m.media_type === 'video' ? (
                              <video src={m.file_url} controls className="w-full rounded" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Repair Notes (staff only) */}
          {isStaff && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Repair Notes</label>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    className="w-full"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingNotes(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingNotes(true)}
                  className="bg-slate-50 rounded p-3 cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200 min-h-20"
                >
                  <p className="text-sm text-slate-700">{repairNotes || <span className="text-slate-400 italic">Add notes...</span>}</p>
                </div>
              )}
            </div>
          )}

          {/* Waypoint Notes */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">Updates & Notes</p>

            {/* Add Note Form */}
            <div className="mb-4 space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an update or note..."
                rows={2}
                className="w-full"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || isAddingNote}
                isLoading={isAddingNote}
                className="w-full"
              >
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>

            {/* Notes List */}
            {waypointNotes.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {waypointNotes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded p-3 border border-slate-200">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-medium text-sm text-black">{note.user_name}</p>
                        <p className="text-xs text-slate-500">
                          {formatNoteDate(note.created_at)}
                          {note.user_role && ` • ${note.user_role}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-2">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No notes yet. Be the first to add one!</p>
            )}
          </div>

          {/* Repair History (staff only) */}
          {isStaff && repairHistory.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-3">History</p>
              <div className="space-y-2">
                {repairHistory.map((entry) => (
                  <div key={entry.id} className="text-xs bg-slate-50 rounded p-2 border border-slate-200">
                    <p className="font-medium text-white">
                      {entry.old_status} → {entry.new_status}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </p>
                    {entry.notes && <p className="text-slate-600 mt-1">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Remove Button */}
        <div className="border-t border-slate-200 p-4">
          <Button
            variant="secondary"
            onClick={handleDeleteWaypoint}
            className="w-full text-red-400 hover:bg-red-900/30"
          >
            🗑 Remove Waypoint
          </Button>
        </div>
      </div>
    </>
  )
}

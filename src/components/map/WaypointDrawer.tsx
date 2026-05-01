import { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Badge, Button, Input, Select, Spinner, Textarea, useToast, MediaPreviewModal } from '../ui'
import { WaypointSurveyUpdateModal } from './WaypointSurveyUpdateModal'
import { WaypointCompletionModal } from './WaypointCompletionModal'
import { getWaypointHistory } from '../../services/waypointRepairHistory'
import { getSurveyById, getSurveyMedia, getSurveysByProject } from '../../services/surveysRest'
import { getSubmissionsByWaypoint, getClientSubmissionMedia } from '../../services/clientSubmissionsRest'
import { getWaypointNotes, createWaypointNote, formatNoteDate, type WaypointNote } from '../../services/waypointNotes'
import type { MapWaypoint, WaypointStatus, Survey, SurveyMedia, ClientSubmission, ClientSubmissionMedia, WaypointRepairHistory } from '../../types'

interface WaypointDrawerProps {
  waypoint: MapWaypoint | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (newStatus: WaypointStatus, surveyId?: string) => Promise<void>
  onSurveyLink: (surveyId: string | null) => Promise<void>
  onWaypointDelete?: (waypointId: string) => Promise<void>
  onRenameWaypoint?: (newName: string) => Promise<void>
  projectId: string
}

export function WaypointDrawer({
  waypoint,
  isOpen,
  onClose,
  onStatusChange,
  onSurveyLink,
  onWaypointDelete,
  onRenameWaypoint,
  projectId,
}: WaypointDrawerProps) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const isStaff = profile?.role === 'richco_staff'
  const addToast = useToast()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [surveyMedia, setSurveyMedia] = useState<SurveyMedia[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [submissions, setSubmissions] = useState<ClientSubmission[]>([])
  const [submissionMediaMap, setSubmissionMediaMap] = useState<Map<string, ClientSubmissionMedia[]>>(new Map())

  const [statusChanging, setStatusChanging] = useState(false)
  const [waypointNotes, setWaypointNotes] = useState<WaypointNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(waypoint?.area_name || '')
  const [repairHistory, setRepairHistory] = useState<WaypointRepairHistory[]>([])
  const [pendingStatus, setPendingStatus] = useState<WaypointStatus | null>(null)
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ file_url: string; media_type: string } | null>(null)

  // Load waypoint notes
  useEffect(() => {
    if (!waypoint || !isOpen) return
    getWaypointNotes(waypoint.id).then(setWaypointNotes).catch(() => {})
  }, [waypoint?.id, isOpen])

  // Load repair history
  useEffect(() => {
    if (!waypoint || !isOpen) return
    getWaypointHistory(waypoint.id).then(setRepairHistory).catch(() => {})
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
    // Require survey for in_progress or completed status changes
    if (newStatus === 'in_progress' || newStatus === 'completed') {
      if (!waypoint?.linked_survey_id) {
        addToast({
          type: 'error',
          message: 'Please link a survey before marking as ' + newStatus.replace('_', ' '),
        })
        return
      }
      // Open modal to submit survey update
      setPendingStatus(newStatus as WaypointStatus)
      setIsSurveyModalOpen(true)
      return
    }

    // Otherwise proceed with direct status change (needs_repair doesn't require survey)
    await applyStatusChange(newStatus as WaypointStatus)
  }

  const applyStatusChange = async (newStatus: WaypointStatus) => {
    try {
      console.log('WaypointDrawer: status change requested, old:', waypoint?.status, 'new:', newStatus)
      setStatusChanging(true)
      await onStatusChange(newStatus, waypoint?.linked_survey_id || undefined)
      console.log('WaypointDrawer: status change completed')
      // Reload repair history to show the new status change
      if (waypoint) {
        console.log('WaypointDrawer: reloading repair history for waypoint:', waypoint.id)
        const history = await getWaypointHistory(waypoint.id)
        console.log('WaypointDrawer: reload returned', history.length, 'entries')
        setRepairHistory(history)
      }
    } catch (err) {
      console.error('WaypointDrawer: status change or history reload failed:', err)
    } finally {
      setStatusChanging(false)
    }
  }

  const handleSurveyUpdateSubmit = async () => {
    if (!pendingStatus) return
    setIsSurveyModalOpen(false)
    await applyStatusChange(pendingStatus)
    setPendingStatus(null)
  }

  const handleSurveyLinkChange = async (surveyId: string) => {
    try {
      await onSurveyLink(surveyId || null)
    } catch (err) {
      console.error('Failed to link survey:', err)
    }
  }

  const handleDeleteWaypoint = async () => {
    if (!waypoint || !onWaypointDelete) return
    try {
      console.log('Drawer: Deleting waypoint', waypoint.id)
      await onWaypointDelete(waypoint.id)
      console.log('Drawer: Waypoint delete completed')
      // Parent already shows success toast and closes drawer, so just wait
      onClose()
    } catch (err) {
      console.error('Drawer: Error deleting waypoint:', err)
      addToast({ type: 'error', message: 'Failed to remove waypoint' })
    }
  }

  const handleSaveRename = async () => {
    if (!waypoint || !nameValue.trim() || !onRenameWaypoint) return
    try {
      await onRenameWaypoint(nameValue)
      setEditingName(false)
      addToast({ type: 'success', message: 'Waypoint renamed' })
    } catch (err) {
      setNameValue(waypoint.area_name)
      addToast({ type: 'error', message: 'Failed to rename waypoint' })
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
            {editingName ? (
              <div className="flex gap-2 mb-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') handleSaveRename()
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setNameValue(waypoint.area_name)
                    }
                  }}
                />
                <Button size="sm" onClick={handleSaveRename}>Save</Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  setEditingName(false)
                  setNameValue(waypoint.area_name)
                }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-black">{waypoint.area_name}</h2>
                {isStaff && (
                  <button
                    onClick={() => {
                      setEditingName(true)
                      setNameValue(waypoint.area_name)
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                  >
                    Rename
                  </button>
                )}
              </div>
            )}
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

          {/* Link to Survey (staff only) - only show if no survey is linked */}
          {isStaff && !waypoint.linked_survey_id && (
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
                {/* Check if this is an initial issue (created without suggested_system or install_notes) */}
                {!survey.suggested_system && !survey.install_notes ? (
                  <>
                    <p className="text-sm font-bold text-black uppercase">🔍 Initial Issue: {survey.area_name}</p>
                    {survey.survey_notes && (
                      <p className="text-sm text-black mt-2">{survey.survey_notes}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-black uppercase">Survey Details</p>
                    <p className="text-sm text-black mt-1">{survey.survey_notes}</p>
                  </>
                )}
              </div>

              {survey.area_size_sqft && survey.suggested_system && (
                <div>
                  <p className="text-xs font-semibold text-black uppercase">Area Size</p>
                  <p className="text-sm text-black">{survey.area_size_sqft} sqft</p>
                </div>
              )}

              {survey.suggested_system && (
                <div>
                  <p className="text-xs font-semibold text-black uppercase">Suggested System</p>
                  <p className="text-sm text-black">{survey.suggested_system}</p>
                </div>
              )}

              {survey.install_notes && (
                <div>
                  <p className="text-xs font-semibold text-black uppercase">Installation Notes</p>
                  <p className="text-sm text-black">{survey.install_notes}</p>
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
                          <img
                            src={media.file_url}
                            alt="survey"
                            className="w-full rounded h-40 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedMedia(media)}
                          />
                        ) : media.media_type === 'video' ? (
                          <div
                            className="w-full rounded bg-black cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedMedia(media)}
                          >
                            <video src={media.file_url} className="w-full rounded" />
                          </div>
                        ) : media.media_type === 'pdf' ? (
                          <div
                            className="w-full h-40 rounded bg-slate-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedMedia(media)}
                          >
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-full h-40 rounded bg-slate-200 flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13 6H5v14h14V9h-6V6z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full mt-4"
                onClick={() => navigate(`/staff/surveys/${survey.id}`)}
              >
                View Full Survey
              </Button>
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
                              <img
                                src={m.file_url}
                                alt="submission"
                                className="w-full rounded h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedMedia(m)}
                              />
                            ) : m.media_type === 'video' ? (
                              <div
                                className="w-full rounded bg-black cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedMedia(m)}
                              >
                                <video src={m.file_url} className="w-full rounded" />
                              </div>
                            ) : m.media_type === 'pdf' ? (
                              <div
                                className="w-full h-32 rounded bg-slate-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedMedia(m)}
                              >
                                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                                </svg>
                              </div>
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

          {/* Comments */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">Comments</p>

            {/* Add Comment */}
            <div className="mb-4 space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a comment..."
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
                {isAddingNote ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>

            {/* Comments List */}
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
              <p className="text-sm text-slate-500 italic">No comments yet. Be the first to add one!</p>
            )}
          </div>

          {/* Date History Timeline */}
          <div>
            <p className="text-sm font-semibold text-black mb-3">📅 Date History</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Created date */}
              <div className="bg-blue-50 rounded p-3 border border-blue-200">
                <p className="text-xs text-slate-600 font-medium mb-1">CREATED</p>
                <p className="text-sm text-blue-800">
                  {waypoint.created_at ? (
                    (() => {
                      try {
                        return format(new Date(waypoint.created_at!), 'MMM d, yyyy h:mm a')
                      } catch (e) {
                        console.error('Date format error:', e)
                        return 'Date unavailable'
                      }
                    })()
                  ) : (
                    'Date not recorded'
                  )}
                </p>
              </div>

              {/* Status changes */}
              {repairHistory.length > 0 && (
                repairHistory.map((entry) => (
                  <div key={entry.id} className="bg-slate-50 rounded p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">
                      {(() => {
                        try {
                          return format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')
                        } catch (e) {
                          return formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })
                        }
                      })()}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{entry.old_status?.replace('_', ' ') || 'new'}</span>
                      {' → '}
                      <span className="font-medium">{entry.new_status.replace('_', ' ')}</span>
                    </p>
                    {entry.changed_by && (
                      <p className="text-xs text-slate-500 mt-1">by {entry.changed_by}</p>
                    )}
                    {entry.survey_id && (
                      <p className="text-xs text-blue-600 mt-2">
                        📋 Linked to survey
                      </p>
                    )}
                  </div>
                ))
              )}

              {repairHistory.length === 0 && (
                <p className="text-sm text-slate-500 italic">No status changes yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Remove Button */}
        <div className="border-t border-slate-200 p-4">
          <Button
            variant="danger"
            onClick={handleDeleteWaypoint}
            className="w-full"
          >
            🗑 Remove Waypoint
          </Button>
        </div>
      </div>

      {/* Survey Update Modal (In Progress Only) */}
      {survey && pendingStatus === 'in_progress' && isSurveyModalOpen && (
        <WaypointSurveyUpdateModal
          isOpen={true}
          survey={survey}
          waypoint={waypoint}
          pendingStatus={pendingStatus}
          projectId={projectId}
          onSubmit={handleSurveyUpdateSubmit}
          onClose={() => {
            setIsSurveyModalOpen(false)
            setPendingStatus(null)
          }}
        />
      )}

      {/* Completion Modal (Completed Only) */}
      {survey && pendingStatus === 'completed' && isSurveyModalOpen && (
        <WaypointCompletionModal
          isOpen={true}
          survey={survey}
          waypoint={waypoint}
          projectId={projectId}
          onSubmit={handleSurveyUpdateSubmit}
          onClose={() => {
            setIsSurveyModalOpen(false)
            setPendingStatus(null)
          }}
        />
      )}

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </>
  )
}

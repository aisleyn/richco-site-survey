import { useState, useEffect } from 'react'
import { Modal, Button, Textarea, Select } from '../ui'
import { getWaypointPhotos } from '../../services/waypointPhotos'
import { getWaypointHistory } from '../../services/waypointRepairHistory'
import { useAuthStore } from '../../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import type { MapWaypoint, WaypointPhoto, WaypointRepairHistory } from '../../types'
import { WaypointPhotoSubmission } from './WaypointPhotoSubmission'

interface WaypointDetailModalProps {
  isOpen: boolean
  onClose: () => void
  waypoint: MapWaypoint | null
  onStatusChange?: (status: string) => void
  onNotesChange?: (notes: string) => void
}

export function WaypointDetailModal({
  isOpen,
  onClose,
  waypoint,
  onStatusChange,
  onNotesChange,
}: WaypointDetailModalProps) {
  const profile = useAuthStore((state) => state.profile)
  const isStaff = profile?.role === 'richco_staff'

  const [photos, setPhotos] = useState<WaypointPhoto[]>([])
  const [history, setHistory] = useState<WaypointRepairHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!waypoint || !isOpen) return

    setNotes(waypoint.repair_notes || '')
    loadPhotos()
    loadHistory()
  }, [waypoint, isOpen])

  const loadPhotos = async () => {
    if (!waypoint) return
    try {
      const data = await getWaypointPhotos(waypoint.id)
      setPhotos(data)
    } catch (err) {
      console.error('Failed to load photos:', err)
    }
  }

  const loadHistory = async () => {
    if (!waypoint) return
    setIsLoadingHistory(true)
    try {
      const data = await getWaypointHistory(waypoint.id)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handlePhotoSubmitted = () => {
    loadPhotos()
  }

  const handleStatusChange = (newStatus: string) => {
    onStatusChange?.(newStatus)
  }

  const handleSaveNotes = () => {
    onNotesChange?.(notes)
    setEditingNotes(false)
  }

  if (!waypoint) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Waypoint: ${waypoint.area_name}`}
      size="lg"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Waypoint Info */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase">Status</label>
            {isStaff ? (
              <Select
                options={[
                  { value: 'needs_repair', label: 'Needs Repair' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
                value={waypoint.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mt-1"
              />
            ) : (
              <p className="text-sm font-medium text-white mt-1">
                {waypoint.status.replace('_', ' ')}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase">Repair Notes</label>
            {editingNotes && isStaff ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter repair notes..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveNotes}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(waypoint.repair_notes || '')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                {waypoint.repair_notes ? (
                  <p className="text-sm text-white">{waypoint.repair_notes}</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">No notes</p>
                )}
                {isStaff && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingNotes(true)}
                    className="mt-2"
                  >
                    Edit Notes
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Photos Section */}
        <div>
          <h3 className="font-semibold text-white mb-3">Evidence Photos ({photos.length})</h3>

          {photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <img
                    src={photo.file_url}
                    alt={photo.caption || photo.photo_type}
                    className="w-full h-32 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="text-xs">
                    <p className="font-medium text-white">
                      {photo.photo_type.replace('_', ' ')}
                    </p>
                    {photo.caption && (
                      <p className="text-slate-600">{photo.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No photos yet</p>
          )}

          {/* Photo Upload */}
          <WaypointPhotoSubmission
            waypointId={waypoint.id}
            projectId={waypoint.project_id}
            onPhotoSubmitted={handlePhotoSubmitted}
          />
        </div>

        {/* Repair History Timeline */}
        <div>
          <h3 className="font-semibold text-white mb-3">Repair History</h3>

          {isLoadingHistory ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : history.length > 0 ? (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-l-2 border-amber-200 pl-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                    </p>
                    <p className="text-sm text-white">
                      Status changed to <strong>{entry.new_status.replace('_', ' ')}</strong>
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-slate-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No repair history yet</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}

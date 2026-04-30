import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, Textarea, Card } from '../ui'
import { createSurvey, addSurveyMedia } from '../../services/surveys'
import { uploadFile } from '../../services/storage'
import { updateWaypoint } from '../../services/mapWaypoints'
import { useToast } from '../ui/Toast'
import { useAuthStore } from '../../store/authStore'
import type { SurveyFormValues } from '../../types'

interface WaypointInitialModalProps {
  isOpen: boolean
  waypointId: string
  waypointName: string
  projectId: string
  onClose: () => void
  onNameUpdate?: (newName: string) => void
  onSurveyLinked?: (surveyId: string) => void
}

export function WaypointInitialModal({
  isOpen,
  waypointId,
  waypointName,
  projectId,
  onClose,
  onNameUpdate,
  onSurveyLinked,
}: WaypointInitialModalProps) {
  const { profile } = useAuthStore()
  const addToast = useToast()
  const [issueName, setIssueName] = useState(waypointName)
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  console.log('WaypointInitialModal: rendering, isOpen=', isOpen, 'waypointId=', waypointId)
  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const imageFiles = selectedFiles.filter((f) => f.type.startsWith('image/'))

    if (imageFiles.length !== selectedFiles.length) {
      addToast({
        type: 'warning',
        message: 'Only image files are supported',
      })
    }

    // Append new files to existing files instead of replacing
    const updatedFiles = [...files, ...imageFiles]
    setFiles(updatedFiles)

    const newUrls = imageFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls([...previewUrls, ...newUrls])
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)
    URL.revokeObjectURL(previewUrls[index])
    setFiles(newFiles)
    setPreviewUrls(newUrls)
  }

  const handleSubmit = async () => {
    if (!notes.trim() && files.length === 0) {
      addToast({
        type: 'warning',
        message: 'Please add at least a note or photo',
      })
      return
    }

    if (!profile) {
      addToast({
        type: 'error',
        message: 'User not authenticated',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Update waypoint name if changed
      if (issueName !== waypointName) {
        await updateWaypoint(waypointId, { area_name: issueName })
        onNameUpdate?.(issueName)
      }

      // Create initial survey
      const surveyValues: SurveyFormValues = {
        project_id: projectId,
        client_name: '',
        area_name: issueName,
        survey_date: new Date().toISOString().split('T')[0],
        area_size_sqft: null,
        survey_notes: notes,
        suggested_system: '',
        install_notes: '',
        images: files,
        scans_3d: [],
        videos: [],
      }

      const survey = await createSurvey(projectId, surveyValues, profile.id)

      // Upload photos to survey
      if (files.length > 0) {
        for (const file of files) {
          const path = `${projectId}/${survey.id}/${Date.now()}-${file.name}`
          const uploaded = await uploadFile('survey-media', path, file)
          await addSurveyMedia(survey.id, 'image', uploaded.signedUrl)
        }
      }

      // Link survey to waypoint
      await updateWaypoint(waypointId, { linked_survey_id: survey.id })

      // Notify parent that survey was linked
      onSurveyLinked?.(survey.id)

      addToast({
        type: 'success',
        message: 'Initial issue survey created',
      })

      // Reset form
      setNotes('')
      setFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      onClose()
    } catch (err) {
      console.error('Initial survey creation error:', err)
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create initial survey',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()} onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}>
        <Card className="w-full max-w-2xl my-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Add Initial Issue Details</h2>
              <p className="text-slate-400 text-sm mt-1">{waypointName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Issue Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Issue Name
              </label>
              <input
                type="text"
                value={issueName}
                onChange={(e) => setIssueName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 bg-white text-black rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Floor Damage"
              />
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Issue Notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue, location details, or any observations..."
                rows={4}
              />
            </div>

            {/* Photos Section */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Photos (optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="initial-photo-input"
                />
                <label htmlFor="initial-photo-input" className="cursor-pointer block text-center">
                  {previewUrls.length > 0 ? (
                    <p className="text-sm font-medium text-white">
                      {files.length} photo(s) selected - Click to add more
                    </p>
                  ) : (
                    <div>
                      <p className="text-lg mb-1">📷</p>
                      <p className="text-sm font-medium text-white">Click to select photos</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Photo Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={url}
                        alt={`preview ${idx}`}
                        className="w-full h-20 object-cover rounded border border-slate-200"
                      />
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}

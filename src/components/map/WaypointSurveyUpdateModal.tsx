import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { createSurveyUpdate, addSurveyUpdateMedia } from '../../services/surveyUpdates'
import { uploadFile } from '../../services/storage'
import { useToast } from '../ui/Toast'
import { Card, Button, Input, Textarea, FileDropzone } from '../ui'
import type { Survey, MapWaypoint, WaypointStatus } from '../../types'

const surveyUpdateSchema = z.object({
  area_name: z.string().optional().default(''),
  area_size_sqft: z.coerce.number().positive().nullable().optional(),
  update_notes: z.string().optional().default(''),
  suggested_system: z.string().optional().default(''),
  install_notes: z.string().optional().default(''),
})

interface WaypointSurveyUpdateModalProps {
  isOpen: boolean
  survey: Survey
  waypoint: MapWaypoint
  pendingStatus: WaypointStatus
  projectId: string
  onSubmit: () => Promise<void>
  onClose: () => void
}

export function WaypointSurveyUpdateModal({
  isOpen,
  survey,
  waypoint,
  pendingStatus,
  projectId,
  onSubmit,
  onClose,
}: WaypointSurveyUpdateModalProps) {
  const { profile } = useAuthStore()
  const addToast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [scans3d, setScans3d] = useState<File[]>([])

  const { register, handleSubmit, formState: { errors: formErrors } } = useForm<any>({
    resolver: zodResolver(surveyUpdateSchema),
    defaultValues: {
      area_name: survey.area_name,
      area_size_sqft: survey.area_size_sqft,
      suggested_system: survey.suggested_system,
      install_notes: survey.install_notes,
    },
  })

  const getErrorMessage = (error: any): string | undefined => {
    if (!error) return undefined
    if (typeof error === 'string') return error
    if (error.message) return error.message
    return undefined
  }

  const handleFormSubmit = async (data: any) => {
    if (!profile) {
      addToast({ type: 'error', message: 'User not authenticated' })
      return
    }

    setIsSubmitting(true)
    try {
      // Create the survey update
      const update = await createSurveyUpdate(
        survey.id,
        waypoint.id,
        {
          update_notes: data.update_notes,
          area_name: data.area_name,
          area_size_sqft: data.area_size_sqft,
          suggested_system: data.suggested_system,
          install_notes: data.install_notes,
        },
        profile.id
      )

      // Upload media files
      const getMediaType = (file: File): string => {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          return 'pdf'
        }
        return 'image'
      }

      const mediaFiles = [
        ...images.map((f) => ({ file: f, type: getMediaType(f) })),
        ...scans3d.map((f) => ({ file: f, type: f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : '3d_scan' })),
        ...videos.map((f) => ({ file: f, type: f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video' })),
      ]

      for (const { file, type } of mediaFiles) {
        const path = `${projectId}/${survey.id}/update-${update.id}/${Date.now()}-${file.name}`
        const uploaded = await uploadFile('survey-media', path, file)
        await addSurveyUpdateMedia(update.id, type, uploaded.signedUrl)
      }

      addToast({ type: 'success', message: 'Survey update submitted' })
      await onSubmit()
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit survey update',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const statusLabel = pendingStatus === 'in_progress' ? 'In Progress' : 'Completed'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="w-full max-w-2xl my-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Update Survey</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" onKeyDown={(e) => e.stopPropagation()}>
            <Input
              label="Area Name / Room Number"
              error={getErrorMessage(formErrors.area_name)}
              {...register('area_name')}
            />

            <Input
              label="Area Size (sqft)"
              type="number"
              step="0.01"
              error={getErrorMessage(formErrors.area_size_sqft)}
              {...register('area_size_sqft')}
            />

            <Textarea
              label="Update Notes"
              placeholder="Any changes or notes from this update..."
              {...register('update_notes')}
            />

            <Input
              label="Suggested System"
              {...register('suggested_system')}
            />

            <Textarea
              label="Installation Notes"
              {...register('install_notes')}
            />

            <FileDropzone
              accept=""
              multiple={true}
              onFilesSelected={setImages}
              label="Images (optional)"
              previewMode="thumbnails"
            />

            <FileDropzone
              accept=""
              multiple={true}
              onFilesSelected={setVideos}
              label="Videos (optional)"
              previewMode="list"
            />

            <FileDropzone
              accept=""
              multiple={false}
              onFilesSelected={setScans3d}
              label="3D Scan File (optional)"
              previewMode="list"
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:flex-1"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : `Submit & Set ${statusLabel}`}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}

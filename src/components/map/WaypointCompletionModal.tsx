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
import type { Survey, MapWaypoint } from '../../types'

const completionSchema = z.object({
  explanation: z.string().min(1, 'Completion explanation is required'),
  completion_date: z.string().min(1, 'Completion date is required'),
})

interface WaypointCompletionModalProps {
  isOpen: boolean
  survey: Survey
  waypoint: MapWaypoint
  projectId: string
  onSubmit: () => Promise<void>
  onClose: () => void
}

export function WaypointCompletionModal({
  isOpen,
  survey,
  waypoint,
  projectId,
  onSubmit,
  onClose,
}: WaypointCompletionModalProps) {
  const { profile } = useAuthStore()
  const addToast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])

  const today = new Date().toISOString().split('T')[0]
  // Completion modal - shows only completion-specific fields
  const { register, handleSubmit, formState: { errors: formErrors } } = useForm<any>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      completion_date: today,
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
      // Create the survey update for completion
      const update = await createSurveyUpdate(
        survey.id,
        waypoint.id,
        {
          update_notes: data.explanation,
          completion_date: data.completion_date,
        },
        profile.id
      )

      // Upload image files
      const mediaFiles = images.map((f) => ({ file: f, type: 'image' }))

      for (const { file } of mediaFiles) {
        const path = `${projectId}/${survey.id}/update-${update.id}/${Date.now()}-${file.name}`
        const uploaded = await uploadFile('survey-media', path, file)
        await addSurveyUpdateMedia(update.id, 'image', uploaded.signedUrl)
      }

      addToast({ type: 'success', message: 'Completion submitted' })
      await onSubmit()
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit completion',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="w-full max-w-2xl my-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Mark as Completed</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" onKeyDown={(e) => e.stopPropagation()}>
            <Textarea
              label="Completion Explanation"
              placeholder="Describe what was completed and any relevant details..."
              error={getErrorMessage(formErrors.explanation)}
              {...register('explanation')}
            />

            <Input
              label="Date Completed"
              type="date"
              error={getErrorMessage(formErrors.completion_date)}
              {...register('completion_date')}
            />

            <FileDropzone
              accept="image/*"
              multiple={true}
              onFilesSelected={setImages}
              label="Completion Photos (optional)"
              previewMode="thumbnails"
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:flex-1"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Complete'}
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

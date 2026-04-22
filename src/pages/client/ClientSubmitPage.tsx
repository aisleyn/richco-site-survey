import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '../../store/authStore'
import { uploadFile } from '../../services/storage'
import { createClientSubmission, updateSubmissionWaypoint } from '../../services/clientSubmissions'
import { createWaypoint } from '../../services/mapWaypoints'
import { getProjectById } from '../../services/projects'
import { MediaType } from '../../types'
import { supabase } from '../../lib/supabase'
import { Card, Button, Textarea, FileDropzone, useToast } from '../../components/ui'
import { PhaserMap } from '../../components/map/PhaserMap'
import type { ClientSubmission } from '../../types'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'

const submitSchema = z.object({
  notes: z.string().min(1, 'Please describe the repair needed'),
})

export default function ClientSubmitPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const addToast = useToast()
  const phaserMapRef = useRef<PhaserMapHandle>(null)

  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submission, setSubmission] = useState<ClientSubmission | null>(null)
  const [isShowingMapModal, setIsShowingMapModal] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<{ notes: string }>({
    resolver: zodResolver(submitSchema),
  })

  const handleAddWaypoint = async (x: number, y: number) => {
    if (!submission || !profile?.project_id) return
    try {
      const newWaypoint = await createWaypoint(
        profile.project_id,
        'Client Report',
        x,
        y
      )
      await updateSubmissionWaypoint(submission.id, newWaypoint.id)
      addToast({
        type: 'success',
        message: 'Location marked!',
      })
      setIsPlacingWaypoint(false)
      setIsShowingMapModal(false)
      setTimeout(() => navigate('/client'), 500)
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to mark location',
      })
    }
  }

  const onSubmit = async (data: { notes: string }) => {
    if (!profile?.project_id) {
      setError('Project not assigned')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const newSubmission = await createClientSubmission(
        profile.project_id,
        profile.id,
        data.notes,
      )
      setSubmission(newSubmission)

      const mediaFiles = [
        ...images.map((f) => ({ file: f, type: MediaType.IMAGE })),
        ...videos.map((f) => ({ file: f, type: MediaType.VIDEO })),
      ]

      for (const { file, type } of mediaFiles) {
        const path = `${profile.project_id}/${newSubmission.id}/${Date.now()}-${file.name}`
        const uploaded = await uploadFile('client-submission-media', path, file)

        await supabase.from('client_submission_media').insert([
          {
            submission_id: newSubmission.id,
            media_type: type,
            file_url: uploaded.signedUrl,
          },
        ])
      }

      const project = await getProjectById(profile.project_id)
      if (project.map_image_url) {
        setMapImageUrl(project.map_image_url)
        setIsPlacingWaypoint(true)
        setIsShowingMapModal(true)
      } else {
        navigate('/client')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Submit Repair Request</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Textarea
            label="Describe the repair needed"
            placeholder="What needs to be repaired or fixed?"
            error={errors.notes?.message}
            {...register('notes')}
            rows={6}
          />

          <FileDropzone
            accept="image/*"
            multiple={true}
            onFilesSelected={setImages}
            label="Photos (optional)"
            previewMode="thumbnails"
          />

          <FileDropzone
            accept="video/*"
            multiple={true}
            onFilesSelected={setVideos}
            label="Videos (optional)"
            previewMode="list"
          />

          <div className="flex gap-4 pt-6">
            <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
              Submit Request
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/client')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Waypoint Placement Modal */}
      {isShowingMapModal && mapImageUrl && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => {
              setIsShowingMapModal(false)
              navigate('/client')
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-96 flex flex-col">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-lg font-semibold text-white">
                  {isPlacingWaypoint ? 'Click on the floor plan to mark the location' : 'Location marked!'}
                </h2>
                <p className="text-sm text-secondary mt-1">
                  {isPlacingWaypoint
                    ? 'Click where the repair is needed on the floor plan'
                    : 'Your report has been submitted and location marked.'}
                </p>
              </div>

              {isPlacingWaypoint ? (
                <div className="flex-1 overflow-hidden">
                  <PhaserMap
                    ref={phaserMapRef}
                    imageUrl={mapImageUrl}
                    waypoints={[]}
                    isEditable={true}
                    isPlacingWaypoint={isPlacingWaypoint}
                    isMovingWaypoint={false}
                    onWaypointAdd={handleAddWaypoint}
                    onWaypointClick={() => {}}
                    onWaypointDrop={() => {}}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-secondary">Redirecting to dashboard...</p>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 p-4 flex justify-end gap-2">
                {isPlacingWaypoint && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsShowingMapModal(false)
                      navigate('/client')
                    }}
                  >
                    Skip Location Marking
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

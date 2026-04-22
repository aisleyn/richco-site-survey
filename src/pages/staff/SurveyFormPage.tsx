import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '../../store/authStore'
import { getProjectById } from '../../services/projects'
import { createSurvey, addSurveyMedia } from '../../services/surveys'
import { uploadFile } from '../../services/storage'
import { MediaType } from '../../types'
import type { Project } from '../../types'
import { Card, Button, Input, Textarea, FileDropzone, Spinner } from '../../components/ui'

const surveySchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  area_name: z.string().min(1, 'Area name is required'),
  survey_date: z.string().min(1, 'Survey date is required'),
  area_size_sqft: z.coerce.number().positive().nullable().optional(),
  survey_notes: z.string().optional().default(''),
  suggested_system: z.string().optional().default(''),
  install_notes: z.string().optional().default(''),
  client_name: z.string().optional().default(''),
  images: z.any().optional(),
  scans_3d: z.any().optional(),
  videos: z.any().optional(),
})

export default function SurveyFormPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { profile } = useAuthStore()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(!!projectId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [scans3d, setScans3d] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])

  const { register, handleSubmit, formState: { errors: formErrors } } = useForm<any>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      project_id: projectId || '',
    },
  })

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return
    try {
      const p = await getProjectById(projectId)
      setProject(p)
    } catch (err) {
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: any) => {
    if (!profile) {
      setError('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const projectId = data.project_id
      const surveyData = {
        ...data,
        project_id: projectId,
        client_name: project?.name || '',
        images,
        scans_3d: scans3d,
        videos,
      }

      const survey = await createSurvey(projectId, surveyData, profile.id)

      const mediaFiles = [
        ...images.map((f) => ({ file: f, type: MediaType.IMAGE })),
        ...scans3d.map((f) => ({ file: f, type: MediaType.SCAN_3D })),
        ...videos.map((f) => ({ file: f, type: MediaType.VIDEO })),
      ]

      for (const { file, type } of mediaFiles) {
        const path = `${projectId}/${survey.id}/${Date.now()}-${file.name}`
        const uploaded = await uploadFile('survey-media', path, file)
        await addSurveyMedia(survey.id, type, uploaded.signedUrl)
      }

      navigate(`/staff/surveys/${survey.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create survey')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getErrorMessage = (error: any): string | undefined => {
    if (!error) return undefined
    if (typeof error === 'string') return error
    if (error.message) return error.message
    return undefined
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
      <h1 className="text-3xl font-bold text-white mb-8">Create Site Survey</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!projectId && (
            <Input label="Project" placeholder="Select a project" disabled {...register('project_id')} />
          )}

          <Input label="Area Name / Room Number" error={getErrorMessage(formErrors.area_name)} {...register('area_name')} />

          <Input
            label="Survey Date"
            type="date"
            error={getErrorMessage(formErrors.survey_date)}
            {...register('survey_date')}
          />

          <Input
            label="Area Size (sqft)"
            type="number"
            step="0.01"
            error={getErrorMessage(formErrors.area_size_sqft)}
            {...register('area_size_sqft')}
          />

          <Textarea label="Survey Notes" {...register('survey_notes')} />

          <Input label="Suggested System" {...register('suggested_system')} />

          <Textarea label="Installation Notes" {...register('install_notes')} />

          <FileDropzone
            accept="image/*"
            multiple={true}
            onFilesSelected={setImages}
            label="Images of Area"
            previewMode="thumbnails"
            error={images.length === 0 ? 'At least one image is required' : undefined}
          />

          <FileDropzone
            accept=".obj,.glb,.ply,.zip,.e57,.rcp,.pts,.las"
            multiple={false}
            onFilesSelected={setScans3d}
            label="3D Scan File (optional)"
            previewMode="list"
          />

          <FileDropzone
            accept="video/*"
            multiple={true}
            onFilesSelected={setVideos}
            label="Videos of Area (optional)"
            previewMode="list"
          />

          <div className="flex gap-4 pt-6">
            <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
              Save Draft
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

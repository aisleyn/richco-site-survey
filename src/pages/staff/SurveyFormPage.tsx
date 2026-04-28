import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '../../store/authStore'
import { getProjectById, getProjects } from '../../services/projects'
import { createSurvey, addSurveyMedia, getSurveyById, updateSurvey } from '../../services/surveys'
import { uploadFile } from '../../services/storage'
import { MediaType } from '../../types'
import type { Project, Survey } from '../../types'
import { Card, Button, Input, Textarea, FileDropzone, Spinner, Select } from '../../components/ui'

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
  const { projectId, surveyId } = useParams<{ projectId?: string; surveyId?: string }>()
  const { profile } = useAuthStore()
  const [project, setProject] = useState<Project | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(!!projectId || !!surveyId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [scans3d, setScans3d] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])

  const { register, handleSubmit, formState: { errors: formErrors } } = useForm<any>({
    resolver: zodResolver(surveySchema),
    defaultValues: survey
      ? {
          project_id: survey.project_id,
          area_name: survey.area_name,
          survey_date: survey.survey_date,
          area_size_sqft: survey.area_size_sqft,
          survey_notes: survey.survey_notes,
          suggested_system: survey.suggested_system,
          install_notes: survey.install_notes,
          client_name: survey.client_name,
        }
      : {
          project_id: projectId || '',
        },
  })

  useEffect(() => {
    if (projectId || surveyId) {
      loadData()
    } else {
      // Load available projects when no projectId is provided
      loadProjects()
    }
  }, [projectId, surveyId])

  const loadProjects = async () => {
    try {
      const allProjects = await getProjects()
      setProjects(allProjects)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async () => {
    try {
      if (surveyId) {
        const s = await getSurveyById(surveyId)
        setSurvey(s)
        const p = await getProjectById(s.project_id)
        setProject(p)
      } else if (projectId) {
        const p = await getProjectById(projectId)
        setProject(p)
      }
    } catch (err) {
      setError('Failed to load data')
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
      const projId = survey?.project_id || data.project_id
      const surveyData = {
        ...data,
        project_id: projId,
        client_name: project?.name || '',
      }

      let surveyResult: Survey
      if (survey) {
        await updateSurvey(survey.id, surveyData)
        surveyResult = { ...survey, ...surveyData }
      } else {
        surveyResult = await createSurvey(projId, surveyData, profile.id)
      }

      const isPdf = (file: File): boolean => {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      }

      const mediaFiles = [
        ...images.map((f) => ({ file: f, type: (isPdf(f) ? MediaType.PDF : MediaType.IMAGE) as any })),
        ...scans3d.map((f) => ({ file: f, type: (isPdf(f) ? MediaType.PDF : MediaType.SCAN_3D) as any })),
        ...videos.map((f) => ({ file: f, type: (isPdf(f) ? MediaType.PDF : MediaType.VIDEO) as any })),
      ]

      for (const { file, type } of mediaFiles) {
        const path = `${projId}/${surveyResult.id}/${Date.now()}-${file.name}`
        const uploaded = await uploadFile('survey-media', path, file)
        await addSurveyMedia(surveyResult.id, type, uploaded.signedUrl)
      }

      navigate(`/staff/surveys/${surveyResult.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${survey ? 'update' : 'create'} survey`)
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
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">
        {survey ? 'Edit Survey' : 'Create Site Survey'}
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!projectId && (
            <Select
              label="Project"
              options={[
                { value: '', label: 'Select a project...' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              error={getErrorMessage(formErrors.project_id)}
              {...register('project_id')}
            />
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
            accept=""
            multiple={true}
            onFilesSelected={setImages}
            label="Images of Area"
            previewMode="thumbnails"
            error={images.length === 0 ? 'At least one image is required' : undefined}
          />

          <FileDropzone
            accept=""
            multiple={false}
            onFilesSelected={setScans3d}
            label="3D Scan File (optional)"
            previewMode="list"
          />

          <FileDropzone
            accept=""
            multiple={true}
            onFilesSelected={setVideos}
            label="Videos of Area (optional)"
            previewMode="list"
          />

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button type="submit" variant="primary" className="w-full sm:flex-1" isLoading={isSubmitting}>
              {survey ? 'Save Changes' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                if (survey) {
                  navigate(`/staff/surveys/${survey.id}`)
                } else {
                  navigate(-1)
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

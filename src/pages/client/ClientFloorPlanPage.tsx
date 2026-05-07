import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getProjectById } from '../../services/projects'
import { getWaypointsByProject, createWaypoint } from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { PhaserMap } from '../../components/map/PhaserMap'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'
import { Card, Spinner, BackButton, Button, Textarea, Modal } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { createClientSubmission, updateSubmissionWaypoint } from '../../services/clientSubmissions'
import { submitWaypointPhoto } from '../../services/waypointPhotos'
import { getSurveyById, getSurveyMedia } from '../../services/surveys'
import { getSurveyUpdates } from '../../services/surveyUpdates'
import { useForm } from 'react-hook-form'
import type { Survey, SurveyMedia, SurveyUpdate } from '../../types'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { Project, MapWaypoint, FloorPlanPage } from '../../types'

const submitSchema = z.object({
  notes: z.string().min(1, 'Please describe the repair needed'),
})

export default function ClientFloorPlanPage() {
  const { profile } = useAuthStore()
  const addToast = useToast()
  const phaserMapRef = useRef<PhaserMapHandle>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [floorPlanPages, setFloorPlanPages] = useState<FloorPlanPage[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWaypoint, setSelectedWaypoint] = useState<MapWaypoint | null>(null)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [newWaypointCoords, setNewWaypointCoords] = useState<{ x: number; y: number } | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [surveyUpdates, setSurveyUpdates] = useState<SurveyUpdate[]>([])
  const [surveyMedia, setSurveyMedia] = useState<SurveyMedia[]>([])
  const [isSurveyLoading, setIsSurveyLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ notes: string }>({
    resolver: zodResolver(submitSchema),
  })

  useEffect(() => {
    if (profile?.id) {
      loadProjects()
    }
  }, [profile])

  useEffect(() => {
    if (currentProjectId) {
      loadProjectData(currentProjectId)
    }
  }, [currentProjectId])

  const loadProjects = async () => {
    if (!profile?.id) return
    try {
      let allProjects: Project[] = []

      // Load projects directly assigned to client
      const { data: directProjects, error: directError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', profile.id)
        .eq('archived', false)

      if (!directError && directProjects) {
        allProjects = [...directProjects]
      }

      // Load projects through vendor/company assignment
      if (profile.vendor_id) {
        const { data: vendorProjects, error: vendorError } = await supabase
          .from('vendor_projects')
          .select('project_id')
          .eq('vendor_id', profile.vendor_id)

        if (!vendorError && vendorProjects && vendorProjects.length > 0) {
          const projectIds = vendorProjects.map((vp: any) => vp.project_id)
          const { data: vendorProjectDetails } = await supabase
            .from('projects')
            .select('*')
            .in('id', projectIds)
            .eq('archived', false)

          if (vendorProjectDetails) {
            const existingIds = new Set(allProjects.map(p => p.id))
            allProjects = [
              ...allProjects,
              ...vendorProjectDetails.filter(p => !existingIds.has(p.id))
            ]
          }
        }
      }

      if (allProjects.length > 0) {
        setProjects(allProjects)
        setCurrentProjectId(allProjects[0].id)
      } else {
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
      setIsLoading(false)
    }
  }

  const loadProjectData = async (projectId: string) => {
    try {
      const [p, wp, pages] = await Promise.all([
        getProjectById(projectId),
        getWaypointsByProject(projectId).catch(() => []),
        getFloorPlanPagesByProject(projectId).catch(() => []),
      ])
      setProject(p)
      setWaypoints(wp)
      setFloorPlanPages(pages)
      if (pages.length > 0) {
        setActivePageId(pages[0].id)
      }
    } catch (err) {
      console.error('Failed to load project data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const activePage = floorPlanPages.find(p => p.id === activePageId)

  const handleWaypointClick = async (waypoint: MapWaypoint) => {
    setSelectedWaypoint(waypoint)

    // Check if waypoint has a linked survey
    if (waypoint.linked_survey_id) {
      setIsSurveyLoading(true)
      try {
        const survey = await getSurveyById(waypoint.linked_survey_id)
        if (survey) {
          const media = await getSurveyMedia(waypoint.linked_survey_id)
          const updates = await getSurveyUpdates(waypoint.linked_survey_id)

          setSelectedSurvey(survey)
          setSurveyMedia(media)
          setSurveyUpdates(updates)
          setIsSurveyModalOpen(true)
        } else {
          setIsSubmitModalOpen(true)
        }
      } catch (err) {
        console.error('Failed to load survey:', err)
        setIsSubmitModalOpen(true)
      } finally {
        setIsSurveyLoading(false)
      }
    } else {
      setIsSubmitModalOpen(true)
    }
  }

  const onSubmitRepairRequest = async (data: { notes: string }) => {
    if (!profile?.id || !currentProjectId) return

    setIsSubmitting(true)
    try {
      if (newWaypointCoords) {
        // Create new waypoint first
        const newWaypoint = await createWaypoint(
          currentProjectId,
          `Repair ${Date.now()}`,
          newWaypointCoords.x,
          newWaypointCoords.y,
          activePageId || undefined,
        )

        // Create client submission
        const submission = await createClientSubmission(
          currentProjectId,
          profile.id,
          data.notes,
        )

        // Link waypoint to submission
        await updateSubmissionWaypoint(submission.id, newWaypoint.id)

        // Upload photos if any
        if (selectedPhotos.length > 0) {
          for (const photo of selectedPhotos) {
            try {
              await submitWaypointPhoto(
                newWaypoint.id,
                currentProjectId,
                photo,
                'general',
              )
            } catch (photoErr) {
              console.error('Failed to upload photo:', photoErr)
            }
          }
        }

        // Reload waypoints to show new one
        if (currentProjectId) {
          const updated = await getWaypointsByProject(currentProjectId)
          setWaypoints(updated)
        }

        addToast({
          type: 'success',
          message: 'Repair request submitted successfully!',
        })
      } else if (selectedWaypoint) {
        // Submitting for existing waypoint
        await createClientSubmission(
          currentProjectId,
          profile.id,
          data.notes,
        )

        // Upload photos if any
        if (selectedPhotos.length > 0) {
          for (const photo of selectedPhotos) {
            try {
              await submitWaypointPhoto(
                selectedWaypoint.id,
                currentProjectId,
                photo,
                'general',
              )
            } catch (photoErr) {
              console.error('Failed to upload photo:', photoErr)
            }
          }
        }

        addToast({
          type: 'success',
          message: 'Repair request submitted successfully!',
        })
      }

      setIsSubmitModalOpen(false)
      setSelectedWaypoint(null)
      setNewWaypointCoords(null)
      setSelectedPhotos([])
      reset()
    } catch (err) {
      console.error('Failed to submit repair request:', err)
      addToast({
        type: 'error',
        message: 'Failed to submit repair request',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartAddRepair = () => {
    setIsPlacingWaypoint(true)
    addToast({
      type: 'info',
      message: 'Click on the floor plan to place a repair marker',
    })
  }

  const handleWaypointAdd = (xPercent: number, yPercent: number) => {
    setNewWaypointCoords({ x: xPercent, y: yPercent })
    setIsPlacingWaypoint(false)
    setIsSubmitModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project || floorPlanPages.length === 0) {
    return (
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="mb-4">
            <BackButton label="Back to Dashboard" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">Floor Plan Map</h1>
          <Card>
            <div className="text-center py-12">
              <p className="text-secondary text-lg">Floor plan not yet available. Check back soon!</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton label="Back to Dashboard" />
      </div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.name} — Floor Plan Map</h1>
            <p className="text-secondary mt-2 text-sm sm:text-base">
              {waypoints.length} repair location{waypoints.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {floorPlanPages.length > 0 && (
        <div className="space-y-4">
          {floorPlanPages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {floorPlanPages.map((page) => (
                <Button
                  key={page.id}
                  variant={activePageId === page.id ? 'primary' : 'secondary'}
                  onClick={() => setActivePageId(page.id)}
                  className="text-sm"
                >
                  {page.label || `Floor Plan ${page.page_number}`}
                </Button>
              ))}
            </div>
          )}

          {projects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <Button
                  key={p.id}
                  onClick={() => setCurrentProjectId(p.id)}
                  variant={currentProjectId === p.id ? 'primary' : 'secondary'}
                  className="text-sm"
                >
                  {p.name}
                </Button>
              ))}
            </div>
          )}

          {activePage && (
            <>
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={handleStartAddRepair}
                  variant={isPlacingWaypoint ? 'primary' : 'secondary'}
                  size="sm"
                  className="text-sm"
                >
                  {isPlacingWaypoint ? 'Click to place marker...' : 'Add Repair Request'}
                </Button>
                {isPlacingWaypoint && (
                  <Button
                    onClick={() => setIsPlacingWaypoint(false)}
                    variant="secondary"
                    size="sm"
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex gap-4" style={{ height: '600px' }}>
                <div className="flex-1">
                  <PhaserMap
                    ref={phaserMapRef}
                    imageUrl={activePage.image_url}
                    waypoints={waypoints.filter(wp => wp.floor_plan_page_id === activePageId)}
                    isEditable={false}
                    isPlacingWaypoint={isPlacingWaypoint}
                    isMovingWaypoint={false}
                    onWaypointClick={handleWaypointClick}
                    onWaypointAdd={handleWaypointAdd}
                    onWaypointDrop={() => {}}
                  />
                </div>

                {waypoints.length > 0 && (
                  <div className="w-64 flex flex-col">
                    <Card className="flex-1 overflow-y-auto bg-white text-black">
                      <div className="space-y-2 p-4">
                        {waypoints
                          .filter(wp => wp.floor_plan_page_id === activePageId)
                          .map((wp) => (
                            <button
                              key={wp.id}
                              onClick={() => handleWaypointClick(wp)}
                              className="w-full text-left p-3 bg-[#e8e8e8] hover:bg-slate-300 rounded-lg border border-slate-300 transition cursor-pointer text-black"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-black text-sm truncate">{wp.area_name}</p>
                                  <p className="text-xs text-slate-600 mt-1 truncate">
                                    {wp.status.replace('_', ' ')}
                                  </p>
                                </div>
                                <span
                                  className="inline-block w-3 h-3 rounded-full flex-shrink-0 mt-1"
                                  style={{
                                    backgroundColor:
                                      wp.status === 'needs_repair'
                                        ? '#ef4444'
                                        : wp.status === 'in_progress'
                                          ? '#fbbf24'
                                          : wp.status === 'temporary_repair'
                                            ? '#3b82f6'
                                            : '#10b981',
                                  }}
                                />
                              </div>
                            </button>
                          ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Submit Repair Request Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false)
          setSelectedWaypoint(null)
          setNewWaypointCoords(null)
          setIsPlacingWaypoint(false)
          setSelectedPhotos([])
          reset()
        }}
        title={selectedWaypoint ? `Submit Repair Request for ${selectedWaypoint.area_name}` : newWaypointCoords ? 'Submit New Repair Request' : 'Submit Repair Request'}
      >
        <form onSubmit={handleSubmit(onSubmitRepairRequest)} className="space-y-4">
          <Textarea
            label="Describe the repair needed"
            placeholder="What needs to be repaired or fixed?"
            error={errors.notes?.message}
            {...register('notes')}
            rows={6}
          />

          <div>
            <label className="block text-sm font-medium text-white mb-3">
              📸 Add Photos (Optional)
            </label>

            {/* Hidden file input */}
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              capture="environment"
              onChange={(e) => setSelectedPhotos(Array.from(e.target.files || []))}
              className="hidden"
            />

            {/* Upload button */}
            <label
              htmlFor="photo-upload"
              className="block w-full p-4 sm:p-3 border-2 border-dashed border-white/30 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer text-center"
            >
              <p className="text-white font-medium text-base sm:text-sm">
                {selectedPhotos.length === 0 ? 'Tap to take or choose photos' : `${selectedPhotos.length} photo${selectedPhotos.length !== 1 ? 's' : ''} selected - Tap to add more`}
              </p>
              <p className="text-secondary text-xs sm:text-xs mt-1">
                Camera or gallery
              </p>
            </label>

            {/* Photo previews */}
            {selectedPhotos.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-secondary mb-2">
                  Tap photo to remove
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {selectedPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/20 cursor-pointer hover:opacity-75 transition-opacity"
                    >
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index))}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <span className="text-white text-2xl">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSubmitting}
            >
              Submit Request
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setIsSubmitModalOpen(false)
                setSelectedWaypoint(null)
                setNewWaypointCoords(null)
                setSelectedPhotos([])
                setIsPlacingWaypoint(false)
                reset()
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Survey Details Modal */}
      <Modal
        isOpen={isSurveyModalOpen}
        onClose={() => {
          setIsSurveyModalOpen(false)
          setSelectedSurvey(null)
          setSurveyUpdates([])
          setSurveyMedia([])
        }}
        title={selectedSurvey ? `Repair Report - ${selectedSurvey.area_name}` : 'Repair Report'}
      >
        {isSurveyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : selectedSurvey ? (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Survey Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-secondary mb-1">Survey Date</p>
                <p className="text-white font-medium">
                  {new Date(selectedSurvey.survey_date).toLocaleDateString()}
                </p>
              </div>

              {selectedSurvey.area_size_sqft && (
                <div>
                  <p className="text-xs text-secondary mb-1">Area Size</p>
                  <p className="text-white font-medium">{selectedSurvey.area_size_sqft} sqft</p>
                </div>
              )}

              {selectedSurvey.suggested_system && (
                <div>
                  <p className="text-xs text-secondary mb-1">Suggested System</p>
                  <p className="text-white font-medium">{selectedSurvey.suggested_system}</p>
                </div>
              )}

              {selectedSurvey.survey_notes && (
                <div>
                  <p className="text-xs text-secondary mb-1">Survey Notes</p>
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedSurvey.survey_notes}</p>
                </div>
              )}

              {selectedSurvey.install_notes && (
                <div>
                  <p className="text-xs text-secondary mb-1">Installation Notes</p>
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedSurvey.install_notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-secondary mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  selectedSurvey.status === 'published'
                    ? 'bg-blue-500/20 text-blue-300'
                    : selectedSurvey.status === 'archived'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-slate-500/20 text-slate-300'
                }`}>
                  {selectedSurvey.status}
                </span>
              </div>
            </div>

            {/* Survey Updates */}
            {surveyUpdates.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Updates</h3>
                <div className="space-y-3">
                  {surveyUpdates.map((update) => (
                    <div key={update.id} className="bg-white/5 rounded-lg p-3 text-sm">
                      <p className="text-xs text-secondary mb-1">
                        {new Date(update.updated_at).toLocaleDateString()}
                      </p>
                      {update.update_notes && (
                        <p className="text-white whitespace-pre-wrap">{update.update_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media */}
            {surveyMedia.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Photos</h3>
                <div className="grid grid-cols-2 gap-2">
                  {surveyMedia.map((media) => (
                    <a
                      key={media.id}
                      href={media.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-white/10 hover:opacity-75 transition-opacity"
                    >
                      <img
                        src={media.file_url}
                        alt="Survey photo"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="border-t border-white/10 pt-4 flex gap-2">
              <Button
                onClick={() => {
                  setIsSurveyModalOpen(false)
                  setIsSubmitModalOpen(true)
                }}
                variant="primary"
                className="flex-1"
              >
                Submit Repair Request
              </Button>
              <Button
                onClick={() => {
                  setIsSurveyModalOpen(false)
                  setSelectedSurvey(null)
                }}
                variant="secondary"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

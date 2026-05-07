import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getProjectById } from '../../services/projects'
import { getWaypointsByProject } from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { PhaserMap } from '../../components/map/PhaserMap'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'
import { Card, Spinner, BackButton, Button, Textarea, Modal } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import { createClientSubmission } from '../../services/clientSubmissions'
import { useForm } from 'react-hook-form'
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

  const handleWaypointClick = (waypoint: MapWaypoint) => {
    setSelectedWaypoint(waypoint)
    setIsSubmitModalOpen(true)
  }

  const onSubmitRepairRequest = async (data: { notes: string }) => {
    if (!profile?.id || !currentProjectId || !selectedWaypoint) return

    setIsSubmitting(true)
    try {
      await createClientSubmission(
        currentProjectId,
        profile.id,
        data.notes,
      )

      addToast({
        type: 'success',
        message: 'Repair request submitted successfully!',
      })

      setIsSubmitModalOpen(false)
      setSelectedWaypoint(null)
      reset()
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to submit repair request',
      })
    } finally {
      setIsSubmitting(false)
    }
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
            <div style={{ height: '600px' }}>
              <PhaserMap
                ref={phaserMapRef}
                imageUrl={activePage.image_url}
                waypoints={waypoints.filter(wp => wp.floor_plan_page_id === activePageId)}
                isEditable={false}
                isPlacingWaypoint={false}
                isMovingWaypoint={false}
                onWaypointClick={handleWaypointClick}
                onWaypointAdd={() => {}}
                onWaypointDrop={() => {}}
              />
            </div>
          )}
        </div>
      )}

      {waypoints.length > 0 && floorPlanPages.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Repair Locations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {waypoints
              .filter(wp => wp.floor_plan_page_id === activePageId)
              .map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => handleWaypointClick(wp)}
                  className="text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">{wp.area_name}</p>
                      <p className="text-xs text-secondary mt-1">
                        {wp.status.replace('_', ' ')}
                      </p>
                    </div>
                    <span
                      className="inline-block w-3 h-3 rounded-full mt-1"
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
      )}

      {/* Submit Repair Request Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false)
          setSelectedWaypoint(null)
          reset()
        }}
        title={selectedWaypoint ? `Submit Repair Request for ${selectedWaypoint.area_name}` : 'Submit Repair Request'}
      >
        <form onSubmit={handleSubmit(onSubmitRepairRequest)} className="space-y-4">
          <Textarea
            label="Describe the repair needed"
            placeholder="What needs to be repaired or fixed?"
            error={errors.notes?.message}
            {...register('notes')}
            rows={6}
          />

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
                reset()
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

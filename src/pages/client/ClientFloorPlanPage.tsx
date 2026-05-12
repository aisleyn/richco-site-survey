import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { getProjectById } from '../../services/projects'
import { getWaypointsByProject, createWaypoint } from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { PhaserMap } from '../../components/map/PhaserMap'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'
import { ClientWaypointDrawer } from '../../components/map/ClientWaypointDrawer'
import { Card, Spinner, BackButton, Button, Modal, Input, Textarea } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import type { Project, MapWaypoint, FloorPlanPage } from '../../types'

export default function ClientFloorPlanPage() {
  const navigate = useNavigate()
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
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [newWaypointCoords, setNewWaypointCoords] = useState<{ x: number; y: number } | null>(null)
  const [selectedWaypoint, setSelectedWaypoint] = useState<MapWaypoint | null>(null)

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
  }

  const handleStartAddRepair = () => {
    setIsPlacingWaypoint(!isPlacingWaypoint)
  }

  const handleWaypointAdd = (xPercent: number, yPercent: number) => {
    setNewWaypointCoords({ x: xPercent, y: yPercent })
    setIsPlacingWaypoint(false)
    setIsSubmitModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsSubmitModalOpen(false)
    setNewWaypointCoords(null)
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

      {isSubmitModalOpen && newWaypointCoords && (
        <Modal
          title="Add Repair Location"
          onClose={handleCloseModal}
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Location has been marked on the floor plan. Staff will review and create a survey for this repair.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedWaypoint && (
        <ClientWaypointDrawer
          waypoint={selectedWaypoint}
          onClose={() => setSelectedWaypoint(null)}
        />
      )}
    </div>
  )
}

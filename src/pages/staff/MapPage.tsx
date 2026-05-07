import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import {
  getWaypointsByProject,
  createWaypoint,
  updateWaypoint,
  updateWaypointStatus,
  deleteWaypoint,
} from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject } from '../../services/floorPlanPages'
import { publishSurvey, archiveSurvey } from '../../services/surveys'
import { useAuthStore } from '../../store/authStore'
import { PhaserMap } from '../../components/map/PhaserMap'
import { PdfUploadModal } from '../../components/map/PdfUploadModal'
import { WaypointDrawer } from '../../components/map/WaypointDrawer'
import { WaypointInitialModal } from '../../components/map/WaypointInitialModal'
import { StatusLegend } from '../../components/map/StatusLegend'
import { Card, Button, Spinner, Input, BackButton } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import type { Project, MapWaypoint, FloorPlanPage, WaypointStatus } from '../../types'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'needs_repair':
      return 'Needs Repair'
    case 'in_progress':
      return 'In Progress'
    case 'temporary_repair':
      return 'Temporarily Completed'
    case 'permanent_repair':
      return 'Permanently Completed'
    case 'completed':
      return 'Completed'
    default:
      return status.replace('_', ' ')
  }
}

export default function MapPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const addToast = useToast()
  const profile = useAuthStore((state) => state.profile)
  const [project, setProject] = useState<Project | null>(null)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [floorPlanPages, setFloorPlanPages] = useState<FloorPlanPage[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedWaypoint, setSelectedWaypoint] = useState<MapWaypoint | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingAreaName, setEditingAreaName] = useState<string | null>(null)
  const [newWaypoint, setNewWaypoint] = useState<MapWaypoint | null>(null)
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [isMovingWaypoint, setIsMovingWaypoint] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<WaypointStatus[]>([
    'needs_repair',
    'in_progress',
    'temporary_repair',
    'permanent_repair',
  ])
  const [expandedCategories, setExpandedCategories] = useState<Set<WaypointStatus>>(
    new Set(['needs_repair', 'in_progress', 'temporary_repair', 'permanent_repair'])
  )
  const phaserMapRef = useRef<PhaserMapHandle>(null)

  useEffect(() => {
    // Version check for debugging Azure deployment
    console.log('[MapPage] Version: e64d434 - Completion modal fix')
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, wp, pages] = await Promise.all([
        getProjectById(projectId),
        getWaypointsByProject(projectId).catch(() => []),
        getFloorPlanPagesByProject(projectId).catch(() => []),
      ])
      setProject(p)
      setWaypoints(wp)
      setFloorPlanPages(pages)
      // Set active page to first page if exists
      if (pages.length > 0) {
        setActivePageId(pages[0].id)
      }
    } catch (err) {
      console.error('Error loading map data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWaypoint = async (x: number, y: number) => {
    if (!projectId || !activePageId) return
    try {
      console.log('MapPage: handleAddWaypoint, creating waypoint')
      const createdWaypoint = await createWaypoint(projectId, `Area ${waypoints.length + 1}`, x, y, activePageId)
      console.log('MapPage: handleAddWaypoint received new waypoint:', createdWaypoint?.id)

      // Use function-based setState to ensure we get the latest state
      // This fixes the issue where deleted waypoints reappear
      setWaypoints((prev) => {
        console.log('MapPage: handleAddWaypoint setting waypoints, current count:', prev.length)
        const updated = [...prev, createdWaypoint]
        console.log('MapPage: handleAddWaypoint new waypoints count:', updated.length, 'ids:', updated.map(w => w.id))
        return updated
      })

      // Show initial details modal for new waypoint
      setNewWaypoint(createdWaypoint)
      setIsInitialModalOpen(true)
    } catch (err) {
      console.error('MapPage: handleAddWaypoint error:', err)
      addToast({
        type: 'error',
        message: 'Failed to create waypoint',
      })
    }
  }

  const handleUpdateWaypoint = async (waypoint: MapWaypoint) => {
    // Keep track of old waypoint in case we need to rollback
    const oldWaypoint = waypoints.find((w) => w.id === waypoint.id)

    try {
      // Update optimistically
      setWaypoints(waypoints.map((w) => (w.id === waypoint.id ? waypoint : w)))

      // Confirm with API
      const updated = await updateWaypoint(waypoint.id, {
        area_name: waypoint.area_name,
        status: waypoint.status,
        x_percent: waypoint.x_percent,
        y_percent: waypoint.y_percent,
      })

      // Make sure the returned data is stored
      setWaypoints(waypoints.map((w) => (w.id === updated.id ? updated : w)))
      addToast({
        type: 'success',
        message: 'Waypoint saved',
      })
    } catch (err) {
      // Rollback on failure
      if (oldWaypoint) {
        setWaypoints(waypoints.map((w) => (w.id === waypoint.id ? oldWaypoint : w)))
      }
      addToast({
        type: 'error',
        message: 'Failed to update waypoint',
      })
    }
  }


  const handleWaypointClick = async (waypoint: MapWaypoint) => {
    // Auto-switch to the waypoint's page if it belongs to a different page
    if (waypoint.floor_plan_page_id && waypoint.floor_plan_page_id !== activePageId) {
      setActivePageId(waypoint.floor_plan_page_id)
    }

    // Reload waypoint from database to get latest linked_survey_id
    try {
      const allWaypoints = await getWaypointsByProject(projectId!)
      const fresh = allWaypoints.find((w) => w.id === waypoint.id)
      if (fresh) {
        setSelectedWaypoint(fresh)
      } else {
        setSelectedWaypoint(waypoint)
      }
    } catch (err) {
      console.error('Failed to refresh waypoint:', err)
      setSelectedWaypoint(waypoint)
    }
    setIsDetailModalOpen(true)
  }

  const handleStatusChange = async (newStatus: string, surveyId?: string) => {
    if (!selectedWaypoint) return
    try {
      console.log('MapPage: changing status from', selectedWaypoint.status, 'to', newStatus)
      const updated = await updateWaypointStatus(
        selectedWaypoint.id,
        selectedWaypoint.project_id,
        newStatus as any,
        profile?.id,
        surveyId,
      )
      console.log('MapPage: status update succeeded, updated waypoint:', updated)

      // If changing to temporary_repair or permanent_repair, also update survey status
      if (surveyId && (newStatus === 'temporary_repair' || newStatus === 'permanent_repair')) {
        try {
          if (newStatus === 'temporary_repair') {
            console.log('MapPage: publishing survey', surveyId)
            await publishSurvey(surveyId, selectedWaypoint.project_id)
          } else if (newStatus === 'permanent_repair') {
            console.log('MapPage: archiving survey', surveyId)
            await archiveSurvey(surveyId, selectedWaypoint.project_id)
          }
        } catch (err) {
          console.warn('MapPage: failed to update survey status:', err)
        }
      }

      setWaypoints(waypoints.map((w) => (w.id === updated.id ? updated : w)))
      setSelectedWaypoint(updated)
      addToast({
        type: 'success',
        message: 'Status updated',
      })
    } catch (err) {
      console.error('MapPage: status update failed:', err)
      addToast({
        type: 'error',
        message: `Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  const handleSurveyLink = async (surveyId: string | null) => {
    if (!selectedWaypoint) return
    try {
      const updated = await updateWaypoint(selectedWaypoint.id, {
        linked_survey_id: surveyId,
      })
      setWaypoints(waypoints.map((w) => (w.id === updated.id ? updated : w)))
      setSelectedWaypoint(updated)
      addToast({
        type: 'success',
        message: 'Survey linked',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to link survey',
      })
    }
  }

  const handleWaypointDelete = async (waypointId: string) => {
    try {
      console.log('MapPage: Starting waypoint deletion for:', waypointId)

      // Delete from API first - fail fast if delete fails
      await deleteWaypoint(waypointId)
      console.log('MapPage: API delete succeeded for', waypointId)

      // Update state with waypoint removed
      setWaypoints((prev) => {
        const updated = prev.filter((w) => w.id !== waypointId)
        console.log('MapPage: Updated waypoints array, count:', updated.length)
        return updated
      })
      setSelectedWaypoint(null)
      setIsDetailModalOpen(false)
      addToast({
        type: 'success',
        message: 'Waypoint removed',
      })
    } catch (err) {
      console.error('MapPage: Error deleting waypoint:', err)
      addToast({
        type: 'error',
        message: `Failed to remove waypoint: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  const handleRenameWaypoint = async (newName: string) => {
    if (!selectedWaypoint || !newName.trim()) return
    try {
      console.log('MapPage: renaming waypoint to', newName)
      const updated = await updateWaypoint(selectedWaypoint.id, { area_name: newName })
      console.log('MapPage: rename succeeded')
      setWaypoints(waypoints.map((w) => (w.id === updated.id ? updated : w)))
      setSelectedWaypoint(updated)
      addToast({
        type: 'success',
        message: 'Waypoint renamed',
      })
    } catch (err) {
      console.error('MapPage: rename failed:', err)
      addToast({
        type: 'error',
        message: `Failed to rename: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  const handlePdfUploadSuccess = async (pages: FloorPlanPage[]) => {
    if (pages.length > 0) {
      setFloorPlanPages(pages)
      setActivePageId(pages[0].id)
      setIsPdfModalOpen(false)
      addToast({
        type: 'success',
        message: `Floor plan uploaded successfully (${pages.length} page${pages.length !== 1 ? 's' : ''})`,
      })
    }
  }

  const handleAreaNameChange = async (waypointId: string, newName: string) => {
    if (editingAreaName !== waypointId) {
      setEditingAreaName(waypointId)
      return
    }

    try {
      const waypoint = waypoints.find((w) => w.id === waypointId)
      if (!waypoint) return

      await updateWaypoint(waypointId, { area_name: newName })
      setWaypoints(
        waypoints.map((w) => (w.id === waypointId ? { ...w, area_name: newName } : w)),
      )
      setEditingAreaName(null)
      addToast({
        type: 'success',
        message: 'Area name updated',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to update area name',
      })
    }
  }

  const handleStatusToggle = (status: WaypointStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const filteredWaypoints = waypoints.filter((wp) => selectedStatuses.includes(wp.status))

  const groupAndSortWaypoints = (wps: MapWaypoint[]) => {
    const statusOrder: WaypointStatus[] = ['needs_repair', 'in_progress', 'temporary_repair', 'permanent_repair']
    const grouped = new Map<WaypointStatus, MapWaypoint[]>()

    statusOrder.forEach((status) => {
      grouped.set(status, [])
    })

    wps.forEach((wp) => {
      if (grouped.has(wp.status)) {
        grouped.get(wp.status)!.push(wp)
      }
    })

    // Sort each group by created_at descending (newest first)
    grouped.forEach((items) => {
      items.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })
    })

    return grouped
  }

  const groupedWaypoints = groupAndSortWaypoints(filteredWaypoints)

  const toggleCategory = (status: WaypointStatus) => {
    const newExpandedCategories = new Set(expandedCategories)
    if (newExpandedCategories.has(status)) {
      newExpandedCategories.delete(status)
    } else {
      newExpandedCategories.add(status)
    }
    setExpandedCategories(newExpandedCategories)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return <div>Project not found</div>
  }

  console.log('MapPage: rendering, newWaypoint=', newWaypoint?.id, 'isInitialModalOpen=', isInitialModalOpen)

  return (
    <div>
      <div className="mb-4">
        <BackButton label="Back to Project" />
      </div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.name} — Floor Plan Map</h1>
            <p className="text-secondary mt-2 text-sm sm:text-base">
              {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsPdfModalOpen(true)}
            className="w-full sm:w-auto"
          >
            📄 Upload Floor Plan
          </Button>
        </div>
      </div>

      {floorPlanPages.length === 0 && !project.map_image_url ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary mb-4">No floor plan uploaded for this project</p>
            <p className="text-sm text-slate-500 mb-6">
              Upload a PDF or image to get started with waypoints
            </p>
            <Button
              variant="primary"
              onClick={() => setIsPdfModalOpen(true)}
            >
              Upload Floor Plan
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isPlacingWaypoint ? 'primary' : 'secondary'}
              onClick={() => setIsPlacingWaypoint(!isPlacingWaypoint)}
              className="flex-1 xs:flex-none"
            >
              {isPlacingWaypoint ? '✓ Placing Waypoint' : '+ Place Waypoint'}
            </Button>
            <Button
              variant={isMovingWaypoint ? 'primary' : 'secondary'}
              onClick={() => setIsMovingWaypoint(!isMovingWaypoint)}
              className="flex-1 xs:flex-none"
            >
              {isMovingWaypoint ? '✓ Moving Waypoint' : '↔ Move Waypoint'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => phaserMapRef.current?.resetView()}
              className="flex-1 xs:flex-none flex items-center justify-center gap-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
              </svg>
              Reset View
            </Button>
          </div>

          {floorPlanPages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {floorPlanPages.map((page) => (
                <Button
                  key={page.id}
                  variant={activePageId === page.id ? 'primary' : 'secondary'}
                  onClick={() => setActivePageId(page.id)}
                  className="text-sm"
                >
                  Page {page.page_number}
                </Button>
              ))}
            </div>
          )}

          <div className="relative">
            {floorPlanPages.length > 0 && (
              <StatusLegend selectedStatuses={selectedStatuses} onStatusToggle={handleStatusToggle} />
            )}
            <PhaserMap
              ref={phaserMapRef}
              imageUrl={floorPlanPages.find(p => p.id === activePageId)?.image_url || project.map_image_url || ''}
              waypoints={filteredWaypoints.filter(w => w.floor_plan_page_id === activePageId || (floorPlanPages.length === 0 && !w.floor_plan_page_id))}
              isEditable={true}
              isPlacingWaypoint={isPlacingWaypoint}
              isMovingWaypoint={isMovingWaypoint}
              onWaypointClick={handleWaypointClick}
              onWaypointAdd={handleAddWaypoint}
              onWaypointDrop={(id, x, y) => {
                const wp = waypoints.find((w) => w.id === id)
                if (wp && (wp.x_percent !== x || wp.y_percent !== y)) {
                  handleUpdateWaypoint({ ...wp, x_percent: x, y_percent: y })
                }
              }}
              className="h-80 sm:h-[600px] border border-slate-200 rounded-lg overflow-hidden"
            />
          </div>
        </div>
      )}

      {/* Waypoints List */}
      {filteredWaypoints.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Waypoints {selectedStatuses.length < 4 && `(${filteredWaypoints.length})`}</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.from(groupedWaypoints.entries()).map(([status, wps]) => (
              wps.length > 0 && (
                <div key={status}>
                  <button
                    onClick={() => toggleCategory(status)}
                    className="w-full text-left mb-2 flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          status === 'needs_repair'
                            ? '#ef4444'
                            : status === 'in_progress'
                              ? '#fbbf24'
                              : status === 'temporary_repair'
                                ? '#3b82f6'
                                : '#10b981',
                      }}
                    />
                    <h3 className="text-sm font-semibold text-white flex-1">
                      {getStatusLabel(status)} ({wps.length})
                    </h3>
                    <span className="text-white text-xs">{expandedCategories.has(status) ? '▼' : '▶'}</span>
                  </button>
                  {expandedCategories.has(status) && (
                    <div className="space-y-2 pl-4">
                      {wps.map((wp) => (
                      <div
                        key={wp.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                        onClick={() => handleWaypointClick(wp)}
                      >
                        <div className="flex-1">
                          {editingAreaName === wp.id ? (
                            <Input
                              value={wp.area_name}
                              onChange={(e) => {
                                const newName = e.target.value
                                setWaypoints(
                                  waypoints.map((w) =>
                                    w.id === wp.id ? { ...w, area_name: newName } : w,
                                  ),
                                )
                              }}
                              onBlur={() => handleAreaNameChange(wp.id, wp.area_name)}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter') {
                                  handleAreaNameChange(wp.id, wp.area_name)
                                }
                              }}
                              autoFocus
                              className="max-w-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-black">{wp.area_name}</p>
                                {floorPlanPages.length > 0 && wp.floor_plan_page_id && (
                                  <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded">
                                    P{floorPlanPages.find(p => p.id === wp.floor_plan_page_id)?.page_number || '?'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-secondary">
                                ({wp.x_percent.toFixed(1)}%, {wp.y_percent.toFixed(1)}%)
                              </p>
                            </>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleWaypointDelete(wp.id)
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          aria-label="Delete waypoint"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        projectId={project.id}
        onSuccess={handlePdfUploadSuccess}
      />

      {/* Waypoint Drawer */}
      <WaypointDrawer
        waypoint={selectedWaypoint}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedWaypoint(null)
        }}
        onStatusChange={handleStatusChange}
        onSurveyLink={handleSurveyLink}
        onWaypointDelete={handleWaypointDelete}
        onRenameWaypoint={handleRenameWaypoint}
        projectId={projectId!}
      />

      {/* Initial Waypoint Details Modal */}
      {newWaypoint && (
        <WaypointInitialModal
          isOpen={isInitialModalOpen}
          waypointId={newWaypoint.id}
          waypointName={newWaypoint.area_name}
          projectId={projectId!}
          onNameUpdate={(newName) => {
            setNewWaypoint({ ...newWaypoint, area_name: newName })
            setWaypoints((prev) =>
              prev.map((w) => (w.id === newWaypoint.id ? { ...w, area_name: newName } : w))
            )
          }}
          onSurveyLinked={(surveyId) => {
            // Auto-link the survey to the waypoint
            const waypointId = newWaypoint.id
            setNewWaypoint({ ...newWaypoint, linked_survey_id: surveyId })
            setWaypoints((prev) =>
              prev.map((w) => (w.id === waypointId ? { ...w, linked_survey_id: surveyId } : w))
            )
            // Update selected waypoint if it's the same one
            if (selectedWaypoint?.id === waypointId) {
              setSelectedWaypoint({ ...selectedWaypoint, linked_survey_id: surveyId })
            }
          }}
          onClose={() => {
            setIsInitialModalOpen(false)
            setNewWaypoint(null)
          }}
        />
      )}
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import {
  getWaypointsByProject,
  createWaypoint,
  updateWaypoint,
  updateWaypointStatus,
  deleteWaypoint,
} from '../../services/mapWaypoints'
import { getFloorPlanPagesByProject, updateFloorPlanPage, deleteAllFloorPlanPages } from '../../services/floorPlanPages'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { publishSurvey, archiveSurvey } from '../../services/surveys'
import { useAuthStore } from '../../store/authStore'
import { PhaserMap } from '../../components/map/PhaserMap'
import { PdfUploadModal } from '../../components/map/PdfUploadModal'
import { FloorPlanRenameModal } from '../../components/map/FloorPlanRenameModal'
import { WaypointDrawer } from '../../components/map/WaypointDrawer'
import { WaypointInitialModal } from '../../components/map/WaypointInitialModal'
import { StatusLegend } from '../../components/map/StatusLegend'
import { Card, Button, Spinner, Input, BackButton } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import type { Project, MapWaypoint, FloorPlanPage, WaypointStatus, ProjectSubcategory } from '../../types'
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
  const [searchParams] = useSearchParams()
  const zoneFilter = searchParams.get('zone')
  const addToast = useToast()
  const profile = useAuthStore((state) => state.profile)
  const [project, setProject] = useState<Project | null>(null)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [floorPlanPages, setFloorPlanPages] = useState<FloorPlanPage[]>([])
  const [subcategories, setSubcategories] = useState<ProjectSubcategory[]>([])
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
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const phaserMapRef = useRef<PhaserMapHandle>(null)

  useEffect(() => {
    // Version check for debugging Azure deployment
    console.log('[MapPage] Version: e64d434 - Completion modal fix')
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, wp, pages, subs] = await Promise.all([
        getProjectById(projectId),
        getWaypointsByProject(projectId).catch(() => []),
        getFloorPlanPagesByProject(projectId).catch(() => []),
        getSubcategoriesByProject(projectId).catch(() => []),
      ])
      setProject(p)
      setWaypoints(wp)
      setFloorPlanPages(pages)
      setSubcategories(subs)
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
      setFloorPlanPages(prev => [...prev, ...pages])
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

  const handleRenameFloorPlan = async (newLabel: string) => {
    if (!renamingPageId) return
    try {
      const updated = await updateFloorPlanPage(renamingPageId, newLabel)
      setFloorPlanPages(
        floorPlanPages.map((p) => (p.id === renamingPageId ? updated : p))
      )
      setRenamingPageId(null)
      addToast({
        type: 'success',
        message: 'Floor plan renamed',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to rename floor plan',
      })
    }
  }

  const handleRemoveAllFloorPlans = async () => {
    if (!confirm('Remove all floor plan pages? This cannot be undone.')) return
    if (!projectId) return
    try {
      await deleteAllFloorPlanPages(projectId)
      setFloorPlanPages([])
      setActivePageId(null)
      addToast({
        type: 'success',
        message: 'All floor plan pages removed',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to remove floor plan pages',
      })
    }
  }

  const handleStatusToggle = (status: WaypointStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const filteredWaypoints = waypoints.filter((wp) =>
    selectedStatuses.includes(wp.status) &&
    (!zoneFilter || wp.subcategory_id === zoneFilter)
  )

  const filteredFloorPlans = zoneFilter
    ? floorPlanPages.filter((fp) => fp.subcategory_id === zoneFilter)
    : floorPlanPages

  const activeZone = zoneFilter ? subcategories.find((s) => s.id === zoneFilter) : null

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="primary"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              📄 Upload Floor Plan
            </Button>
            {floorPlanPages.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleRemoveAllFloorPlans}
                className="flex-1 sm:flex-initial text-red-400 hover:text-red-300"
              >
                🗑️ Remove All Pages
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeZone && (
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
          <span className="text-white font-medium">{activeZone.name}</span>
          <span>•</span>
          <span>{filteredWaypoints.length} waypoints</span>
        </div>
      )}

      {filteredFloorPlans.length === 0 && !project.map_image_url ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary mb-4">No floor plan uploaded{activeZone ? ' for this zone' : ' for this project'}</p>
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

          {filteredFloorPlans.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {filteredFloorPlans.map((page) => (
                  <Button
                    key={page.id}
                    variant={activePageId === page.id ? 'primary' : 'secondary'}
                    onClick={() => setActivePageId(page.id)}
                    onDoubleClick={() => {
                      setRenamingPageId(page.id)
                      setIsRenameModalOpen(true)
                    }}
                    className="text-sm"
                    title="Double-click to rename"
                  >
                    {page.label}
                  </Button>
                ))}
              </div>
              {filteredFloorPlans.length > 1 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-white mb-2">All Floor Plans</p>
                  <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
                    {filteredFloorPlans.map((page) => (
                      <div
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={`flex-shrink-0 cursor-pointer rounded border-2 transition-all ${
                          activePageId === page.id
                            ? 'border-blue-500 ring-2 ring-blue-400'
                            : 'border-slate-400 hover:border-slate-300'
                        }`}
                        title={page.label}
                      >
                        <img
                          src={page.image_url}
                          alt={page.label}
                          className="h-24 w-32 object-cover rounded"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" font-size="10" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative h-80 sm:h-[600px]">
            {filteredFloorPlans.length > 0 && (
              <StatusLegend selectedStatuses={selectedStatuses} onStatusToggle={handleStatusToggle} />
            )}
            <PhaserMap
              ref={phaserMapRef}
              imageUrl={filteredFloorPlans.find(p => p.id === activePageId)?.image_url || project.map_image_url || ''}
              waypoints={filteredWaypoints.filter(w => w.floor_plan_page_id === activePageId || (filteredFloorPlans.length === 0 && !w.floor_plan_page_id))}
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
              className="absolute inset-0 border border-slate-200 rounded-lg overflow-hidden"
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

      {/* Floor Plan Rename Modal */}
      {renamingPageId && (
        <FloorPlanRenameModal
          isOpen={isRenameModalOpen}
          onClose={() => {
            setIsRenameModalOpen(false)
            setRenamingPageId(null)
          }}
          currentLabel={floorPlanPages.find(p => p.id === renamingPageId)?.label || ''}
          pageNumber={floorPlanPages.find(p => p.id === renamingPageId)?.page_number || 0}
          onSave={handleRenameFloorPlan}
        />
      )}

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
          subcategories={subcategories}
          defaultSubcategoryId={null}
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

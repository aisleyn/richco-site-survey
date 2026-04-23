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
import { PhaserMap } from '../../components/map/PhaserMap'
import { PdfUploadModal } from '../../components/map/PdfUploadModal'
import { WaypointDrawer } from '../../components/map/WaypointDrawer'
import { Card, Button, Spinner, Input } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'
import type { Project, MapWaypoint } from '../../types'
import type { PhaserMapHandle } from '../../components/map/PhaserMap'

export default function MapPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const addToast = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedWaypoint, setSelectedWaypoint] = useState<MapWaypoint | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingAreaName, setEditingAreaName] = useState<string | null>(null)
  const [isPlacingWaypoint, setIsPlacingWaypoint] = useState(false)
  const [isMovingWaypoint, setIsMovingWaypoint] = useState(false)
  const phaserMapRef = useRef<PhaserMapHandle>(null)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, wp] = await Promise.all([
        getProjectById(projectId),
        getWaypointsByProject(projectId).catch(() => []),
      ])
      setProject(p)
      setWaypoints(wp)
    } catch (err) {
      console.error('Error loading map data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWaypoint = async (x: number, y: number) => {
    if (!projectId) return
    try {
      const newWaypoint = await createWaypoint(projectId, `Area ${waypoints.length + 1}`, x, y)
      setWaypoints([...waypoints, newWaypoint])
      addToast({
        type: 'success',
        message: 'Waypoint created',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to create waypoint',
      })
    }
  }

  const handleUpdateWaypoint = async (waypoint: MapWaypoint) => {
    try {
      await updateWaypoint(waypoint.id, {
        area_name: waypoint.area_name,
        status: waypoint.status,
        x_percent: waypoint.x_percent,
        y_percent: waypoint.y_percent,
      })
      setWaypoints(waypoints.map((w) => (w.id === waypoint.id ? waypoint : w)))
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to update waypoint',
      })
    }
  }


  const handleWaypointClick = (waypoint: MapWaypoint) => {
    setSelectedWaypoint(waypoint)
    setIsDetailModalOpen(true)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedWaypoint) return
    try {
      const updated = await updateWaypointStatus(
        selectedWaypoint.id,
        selectedWaypoint.project_id,
        newStatus as any,
      )
      setWaypoints(waypoints.map((w) => (w.id === updated.id ? updated : w)))
      setSelectedWaypoint(updated)
      addToast({
        type: 'success',
        message: 'Status updated',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to update status',
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
      await deleteWaypoint(waypointId)
      setWaypoints(waypoints.filter((w) => w.id !== waypointId))
      setSelectedWaypoint(null)
      setIsDetailModalOpen(false)
      addToast({
        type: 'success',
        message: 'Waypoint removed',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to remove waypoint',
      })
    }
  }

  const handlePdfUploadSuccess = async (imageUrl: string) => {
    if (project) {
      setProject({ ...project, map_image_url: imageUrl })
      setIsPdfModalOpen(false)
      addToast({
        type: 'success',
        message: 'Floor plan uploaded successfully',
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

  return (
    <div>
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

      {!project.map_image_url ? (
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
              className="flex-1 xs:flex-none"
            >
              🏠 Reset View
            </Button>
          </div>

          <PhaserMap
            ref={phaserMapRef}
            imageUrl={project.map_image_url}
            waypoints={waypoints}
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
      )}

      {/* Waypoints List */}
      {waypoints.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Waypoints</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {waypoints.map((wp) => (
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
                      <p className="font-medium text-black">{wp.area_name}</p>
                      <p className="text-xs text-secondary">
                        {wp.status.replace('_', ' ')} • ({wp.x_percent.toFixed(1)}%, {wp.y_percent.toFixed(1)}%)
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        wp.status === 'needs_repair'
                          ? '#ef4444'
                          : wp.status === 'in_progress'
                            ? '#fbbf24'
                            : '#10b981',
                    }}
                  />
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
              </div>
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
        projectId={projectId!}
      />
    </div>
  )
}

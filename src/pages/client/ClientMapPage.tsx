import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getWaypointsByProject } from '../../services/mapWaypoints'
import { InteractiveMap } from '../../components/map'
import { WaypointDetailModal } from '../../components/map/WaypointDetailModal'
import { Card, Spinner } from '../../components/ui'
import type { Project, MapWaypoint } from '../../types'

export default function ClientMapPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWaypoint, setSelectedWaypoint] = useState<MapWaypoint | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, wp] = await Promise.all([
        getProjectById(projectId),
        getWaypointsByProject(projectId),
      ])
      setProject(p)
      setWaypoints(wp)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWaypointClick = (waypoint: MapWaypoint) => {
    setSelectedWaypoint(waypoint)
    setIsDetailModalOpen(true)
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
        <h1 className="text-3xl font-bold text-white">{project.name} — Site Map</h1>
        <p className="text-secondary mt-2">
          {waypoints.length} repair location{waypoints.length !== 1 ? 's' : ''}
        </p>
      </div>

      {!project.map_image_url ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary mb-4">Floor plan not yet available</p>
            <p className="text-sm text-slate-500">
              Please check back later when the map is ready
            </p>
          </div>
        </Card>
      ) : (
        <InteractiveMap
          imageUrl={project.map_image_url}
          waypoints={waypoints}
          isEditable={false}
          onWaypointClick={handleWaypointClick}
        />
      )}

      {/* Repair Locations Summary */}
      {waypoints.length > 0 && (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Repair Locations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waypoints.map((wp) => (
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
                            : '#10b981',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Waypoint Detail Modal */}
      <WaypointDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedWaypoint(null)
        }}
        waypoint={selectedWaypoint}
      />
    </div>
  )
}

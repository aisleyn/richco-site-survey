import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Spinner, Button } from '../ui'
import type { MapWaypoint, WaypointStatus } from '../../types'
import './InteractiveMap.css'

interface InteractiveMapProps {
  imageUrl: string | null
  waypoints: MapWaypoint[]
  isEditable?: boolean
  onWaypointAdd?: (x: number, y: number) => void
  onWaypointUpdate?: (waypoint: MapWaypoint) => void
  onWaypointDelete?: (id: string) => void
  onWaypointClick?: (waypoint: MapWaypoint) => void
}

export function InteractiveMap({
  imageUrl,
  waypoints,
  isEditable = false,
  onWaypointAdd,
  onWaypointUpdate,
  onWaypointDelete,
  onWaypointClick,
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const imageOverlay = useRef<L.ImageOverlay | null>(null)
  const markersGroup = useRef<L.FeatureGroup | null>(null)
  const [isLoading, setIsLoading] = useState(!imageUrl)
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState({
    needs_repair: true,
    in_progress: true,
    completed: true,
  })

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !imageUrl) return

    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [100, 100],
    ]

    map.current = L.map(mapContainer.current, {
      crs: L.CRS.Simple,
      minZoom: 1,
      maxZoom: 4,
      zoom: 1,
      center: [50, 50],
    })

    // Add image overlay
    imageOverlay.current = L.imageOverlay(imageUrl, bounds).addTo(map.current)
    map.current.fitBounds(bounds)

    // Create markers group
    markersGroup.current = L.featureGroup().addTo(map.current)

    setIsLoading(false)

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [imageUrl])

  // Add/update markers
  useEffect(() => {
    if (!markersGroup.current) return

    markersGroup.current.clearLayers()

    waypoints.forEach((waypoint) => {
      if (!visibleLayers[waypoint.status]) return

      const marker = createWaypointMarker(waypoint, isEditable, {
        onUpdate: onWaypointUpdate,
        onDelete: onWaypointDelete,
        onClick: onWaypointClick,
      })

      markersGroup.current?.addLayer(marker)
    })
  }, [waypoints, visibleLayers, isEditable, onWaypointUpdate, onWaypointDelete])

  // Map click handler for adding waypoints
  useEffect(() => {
    if (!map.current || !isEditable || !isAddingWaypoint) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      const x = (lng / 100) * 100
      const y = (lat / 100) * 100

      onWaypointAdd?.(x, y)
      setIsAddingWaypoint(false)
    }

    map.current.on('click', handleMapClick)

    return () => {
      map.current?.off('click', handleMapClick)
    }
  }, [isAddingWaypoint, isEditable, onWaypointAdd])

  const toggleLayer = (status: WaypointStatus) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [status]: !prev[status],
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No floor plan image uploaded</p>
          {isEditable && (
            <Button variant="secondary">Upload Floor Plan</Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 bg-surface p-4 rounded-lg border border-white/10">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleLayers.needs_repair}
              onChange={() => toggleLayer('needs_repair')}
              className="rounded"
            />
            <span className="text-sm font-medium text-white">
              <span className="inline-block w-3 h-3 bg-status-error rounded-full mr-2"></span>
              Needs Repair
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleLayers.in_progress}
              onChange={() => toggleLayer('in_progress')}
              className="rounded"
            />
            <span className="text-sm font-medium text-white">
              <span className="inline-block w-3 h-3 bg-status-warning rounded-full mr-2"></span>
              In Progress
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleLayers.completed}
              onChange={() => toggleLayer('completed')}
              className="rounded"
            />
            <span className="text-sm font-medium text-white">
              <span className="inline-block w-3 h-3 bg-status-success rounded-full mr-2"></span>
              Completed
            </span>
          </label>
        </div>

        {isEditable && (
          <Button
            variant={isAddingWaypoint ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsAddingWaypoint(!isAddingWaypoint)}
          >
            {isAddingWaypoint ? '✓ Click to add waypoint' : '+ Place Waypoint'}
          </Button>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="map-container border border-white/10 rounded-lg overflow-hidden"
        style={{ height: '600px' }}
      />

      {isAddingWaypoint && (
        <div className="bg-slate-900 border border-white/20 p-3 rounded-lg text-sm text-white">
          Click on the map to place a waypoint
        </div>
      )}
    </div>
  )
}

function createWaypointMarker(
  waypoint: MapWaypoint,
  isEditable: boolean,
  handlers: {
    onUpdate?: (waypoint: MapWaypoint) => void
    onDelete?: (id: string) => void
    onClick?: (waypoint: MapWaypoint) => void
  },
): L.Marker {
  const statusColors = {
    needs_repair: '#FF3B3B',
    in_progress: '#FFB020',
    completed: '#00E676',
  }

  const latlng = L.latLng((waypoint.y_percent / 100) * 100, (waypoint.x_percent / 100) * 100)

  // Create HTML marker with ripple animation
  const html = `
    <div style="width: 24px; height: 24px; position: relative; cursor: pointer;">
      <div class="ripple-1" style="position: absolute; border: 2px solid ${statusColors[waypoint.status]}; border-radius: 50%; left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>
      <div class="ripple-2" style="position: absolute; border: 2px solid ${statusColors[waypoint.status]}; border-radius: 50%; left: 50%; top: 50%; transform: translate(-50%, -50%);"></div>
      <div style="position: absolute; width: 12px; height: 12px; background: ${statusColors[waypoint.status]}; border-radius: 50%; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 10;"></div>
    </div>
  `

  const icon = L.divIcon({
    html,
    className: 'leaflet-waypoint-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })

  const marker = L.marker(latlng, {
    icon,
    draggable: isEditable,
  })

  const popupContent = `
    <div style="min-width: 200px; color: white; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
      <h4 style="margin: 0 0 8px 0; font-weight: 600;">${waypoint.area_name}</h4>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #888;">
        Status: <strong>${waypoint.status.replace('_', ' ')}</strong>
      </p>
      ${isEditable ? `
        <div style="margin-top: 8px; display: flex; gap: 4px;">
          <button onclick="console.log('edit')" style="flex: 1; padding: 4px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; background: rgba(255,255,255,0.06); color: white; cursor: pointer;">Edit</button>
          <button onclick="console.log('delete')" style="flex: 1; padding: 4px; font-size: 12px; border: 1px solid rgba(255,59,59,0.2); border-radius: 4px; background: rgba(255,59,59,0.1); color: #FF3B3B; cursor: pointer;">Delete</button>
        </div>
      ` : ''}
    </div>
  `

  marker.bindPopup(popupContent)

  marker.on('click', () => {
    handlers.onClick?.(waypoint)
  })

  if (isEditable && handlers.onUpdate) {
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      const x = (pos.lng / 100) * 100
      const y = (pos.lat / 100) * 100

      handlers.onUpdate?.({
        ...waypoint,
        x_percent: parseFloat(x.toFixed(2)),
        y_percent: parseFloat(y.toFixed(2)),
      })
    })
  }

  return marker
}

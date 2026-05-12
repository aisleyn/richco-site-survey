import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge } from '../ui'
import type { MapWaypoint } from '../../types'

interface ClientWaypointDrawerProps {
  waypoint: MapWaypoint | null
  onClose: () => void
}

export function ClientWaypointDrawer({ waypoint, onClose }: ClientWaypointDrawerProps) {
  const navigate = useNavigate()

  if (!waypoint) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="ml-auto relative w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>

          {/* Waypoint info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-black mb-2">{waypoint.area_name}</h2>
              <Badge
                className={
                  waypoint.status === 'needs_repair'
                    ? 'bg-red-100 text-red-800'
                    : waypoint.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : waypoint.status === 'temporary_repair'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                }
              >
                {waypoint.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* View Survey button */}
            {waypoint.linked_survey_id && (
              <Button
                onClick={() => {
                  navigate(`/client/survey/${waypoint.linked_survey_id}`)
                  onClose()
                }}
                className="w-full"
              >
                View Survey
              </Button>
            )}

            {!waypoint.linked_survey_id && (
              <p className="text-sm text-gray-500 italic">
                No survey linked yet. Staff will create one based on this repair request.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

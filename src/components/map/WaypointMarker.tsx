import { useState } from 'react'
import { Button, Input, Card } from '../ui'
import type { MapWaypoint, WaypointStatus } from '../../types'

interface WaypointMarkerProps {
  waypoint: MapWaypoint
  onUpdate: (waypoint: MapWaypoint) => void
  onDelete: (id: string) => void
}

export function WaypointMarker({ waypoint, onUpdate, onDelete }: WaypointMarkerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    area_name: waypoint.area_name,
    status: waypoint.status,
  })

  const handleSave = () => {
    onUpdate({
      ...waypoint,
      area_name: formData.area_name,
      status: formData.status as WaypointStatus,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Edit Waypoint</h3>

        <Input
          label="Area Name"
          value={formData.area_name}
          onChange={(e) => setFormData({ ...formData, area_name: e.target.value })}
          className="mb-4"
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as WaypointStatus })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-white focus:outline-none focus:ring-2 focus:ring-brand-amber"
          >
            <option value="needs_repair">Needs Repair</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSave} className="flex-1">
            Save
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="text-sm">
      <h4 className="font-semibold">{waypoint.area_name}</h4>
      <p className="text-slate-600 text-xs mt-1">
        {waypoint.status.replace('_', ' ')}
      </p>
      <div className="flex gap-2 mt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="flex-1"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(waypoint.id)}
          className="flex-1 text-red-600"
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

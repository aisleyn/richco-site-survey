import { useState } from 'react'
import type { WaypointStatus } from '../../types'

interface StatusLegendProps {
  selectedStatuses: WaypointStatus[]
  onStatusToggle: (status: WaypointStatus) => void
}

const STATUS_CONFIG: Record<WaypointStatus, { label: string; color: string }> = {
  needs_repair: { label: 'Needs Repair', color: '#ef4444' },
  in_progress: { label: 'In Progress', color: '#fbbf24' },
  temporary_repair: { label: 'Temporarily Completed', color: '#3b82f6' },
  permanent_repair: { label: 'Permanently Completed', color: '#10b981' },
  completed: { label: 'Completed', color: '#10b981' },
}

export function StatusLegend({ selectedStatuses, onStatusToggle }: StatusLegendProps) {
  const [isOpen, setIsOpen] = useState(true)
  const statuses: WaypointStatus[] = ['needs_repair', 'in_progress', 'temporary_repair', 'permanent_repair']

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border-2 border-slate-300 p-4 min-w-max">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Waypoint Status</h3>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-500 hover:text-slate-700 text-lg"
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </div>

        {isOpen && (
          <div className="space-y-2">
            {statuses.map((status) => {
              const config = STATUS_CONFIG[status]
              const isSelected = selectedStatuses.includes(status)
              return (
                <button
                  key={status}
                  onClick={() => onStatusToggle(status)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                    isSelected
                      ? 'bg-slate-100 border border-slate-300'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-75'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-slate-700 flex-1 text-left">{config.label}</span>
                  <span className="text-xs text-slate-500">{isSelected ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-200">
          <button
            onClick={() => {
              statuses.forEach((status) => onStatusToggle(status))
            }}
            className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
          >
            {selectedStatuses.length === statuses.length && statuses.length > 0 ? 'Hide All' : 'Show All'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { Card } from '../ui'
import type { ProjectSubcategory, Survey, ProjectType, ZoneStatus } from '../../types'

interface ZoneTileGridProps {
  subcategories: ProjectSubcategory[]
  surveys: Survey[]
  onSelectZone: (id: string) => void
  projectType?: ProjectType
}

export function ZoneTileGrid({ subcategories, surveys, onSelectZone, projectType }: ZoneTileGridProps) {
  const getSurveyCount = (zoneId: string) => {
    return surveys.filter(s => s.subcategory_id === zoneId).length
  }

  const hasDraftSurveys = (zoneId: string) => {
    return surveys.some(s => s.subcategory_id === zoneId && s.status === 'draft')
  }

  const getStatusColor = (status: ZoneStatus): string => {
    const colors: Record<ZoneStatus, string> = {
      concept: 'bg-gray-100 text-gray-800 border-gray-300',
      in_development: 'bg-amber-100 text-amber-800 border-amber-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      denied: 'bg-red-100 text-red-800 border-red-300',
      on_hold: 'bg-blue-100 text-blue-800 border-blue-300',
    }
    return colors[status]
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      {subcategories.map(zone => {
        const count = getSurveyCount(zone.id)
        const hasDraft = hasDraftSurveys(zone.id)

        return (
          <button
            key={zone.id}
            onClick={() => onSelectZone(zone.id)}
            className="text-left"
          >
            <Card className="p-4 cursor-pointer hover:bg-slate-600 transition-colors flex flex-col items-center justify-center min-h-[120px] relative">
              {hasDraft && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              )}
              <h3 className="text-white font-semibold text-center mb-2">{zone.name}</h3>
              {projectType === 'development' && (
                <div className={`px-2 py-1 rounded text-xs font-medium border mb-2 ${getStatusColor(zone.status)}`}>
                  {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
                </div>
              )}
              <p className="text-slate-300 text-sm text-center">
                {count} {count === 1 ? 'survey' : 'surveys'}
              </p>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

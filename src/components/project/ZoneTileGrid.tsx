import { Card } from '../ui'
import type { ProjectSubcategory, Survey } from '../../types'

interface ZoneTileGridProps {
  subcategories: ProjectSubcategory[]
  surveys: Survey[]
  onSelectZone: (id: string) => void
}

export function ZoneTileGrid({ subcategories, surveys, onSelectZone }: ZoneTileGridProps) {
  const getSurveyCount = (zoneId: string) => {
    return surveys.filter(s => s.subcategory_id === zoneId).length
  }

  const hasDraftSurveys = (zoneId: string) => {
    return surveys.some(s => s.subcategory_id === zoneId && s.status === 'draft')
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

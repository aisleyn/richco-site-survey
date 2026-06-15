import { Link } from 'react-router-dom'
import { Card } from '../ui'
import type { ProjectSubcategory, Survey, ProjectType } from '../../types'

interface ZoneListProps {
  projectId: string
  subcategories: ProjectSubcategory[]
  surveys: Survey[]
  projectType?: ProjectType
}

export function ZoneList({
  projectId,
  subcategories,
  surveys,
  projectType,
}: ZoneListProps) {
  const getZoneSurveyCount = (zoneId: string) => {
    return surveys.filter(s => s.subcategory_id === zoneId).length
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      concept: 'bg-gray-100 text-gray-800 border-gray-300',
      in_development: 'bg-amber-100 text-amber-800 border-amber-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      denied: 'bg-red-100 text-red-800 border-red-300',
      on_hold: 'bg-blue-100 text-blue-800 border-blue-300',
    }
    return colors[status] || 'bg-slate-600 text-slate-300'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subcategories.map(zone => {
        const surveyCount = getZoneSurveyCount(zone.id)

        return (
          <Link key={zone.id} to={`/staff/projects/${projectId}/zones/${zone.id}`}>
            <Card className="p-4 cursor-pointer hover:bg-slate-600 transition-colors h-full">
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-white">{zone.name}</h3>
                    {(projectType === 'in_development' || projectType === 'new_project') && (
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(zone.status)}`}>
                        {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-secondary">
                    {surveyCount} {surveyCount === 1 ? 'survey' : 'surveys'}
                  </p>
                </div>
                <div className="text-slate-400 mt-3 text-right text-lg">→</div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

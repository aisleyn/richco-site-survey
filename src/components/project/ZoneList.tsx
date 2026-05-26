import { Link } from 'react-router-dom'
import { Card } from '../ui'
import type { ProjectSubcategory, Survey, FloorPlanPage, Sample, ProjectType } from '../../types'

interface ZoneListProps {
  projectId: string
  subcategories: ProjectSubcategory[]
  surveys: Survey[]
  floorPlans: FloorPlanPage[]
  samples: Sample[]
  projectType?: ProjectType
}

export function ZoneList({
  projectId,
  subcategories,
  surveys,
  floorPlans,
  samples,
  projectType,
}: ZoneListProps) {
  const getZoneSurveyCount = (zoneId: string) => {
    return surveys.filter(s => s.subcategory_id === zoneId).length
  }

  const getZoneFloorPlanCount = (zoneId: string) => {
    return floorPlans.filter(fp => fp.subcategory_id === zoneId).length
  }

  const getZoneSampleCount = (zoneId: string) => {
    return samples.filter(s => s.subcategory_id === zoneId).length
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
    <div className="space-y-3">
      {subcategories.map(zone => {
        const surveyCount = getZoneSurveyCount(zone.id)
        const floorPlanCount = getZoneFloorPlanCount(zone.id)
        const sampleCount = getZoneSampleCount(zone.id)

        return (
          <Link key={zone.id} to={`/staff/projects/${projectId}/zones/${zone.id}`}>
            <Card className="p-4 cursor-pointer hover:bg-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{zone.name}</h3>
                    {(projectType === 'in_development' || projectType === 'new_project') && (
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(zone.status)}`}>
                        {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-secondary">
                    <span>{surveyCount} {surveyCount === 1 ? 'survey' : 'surveys'}</span>
                    {floorPlanCount > 0 && <span>{floorPlanCount} {floorPlanCount === 1 ? 'floor plan' : 'floor plans'}</span>}
                    {sampleCount > 0 && <span>{sampleCount} {sampleCount === 1 ? 'sample' : 'samples'}</span>}
                  </div>
                </div>
                <div className="text-slate-400">→</div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

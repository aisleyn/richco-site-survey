import type { ProjectType, ZoneStatus } from '../../types'

interface ProjectStatusTimelineProps {
  projectType: ProjectType
  zoneStatuses?: ZoneStatus[]
  onStatusChange?: (newType: ProjectType) => void
}

export function ProjectStatusTimeline({ projectType, zoneStatuses = [], onStatusChange }: ProjectStatusTimelineProps) {
  const stages = ['Concept', 'In Development', 'Completed', 'Maintenance'] as const
  const stageKeys: ZoneStatus[] = ['concept', 'in_development', 'approved', 'on_hold']

  // Determine current stage based on project type
  let currentStageIndex = 0
  if (projectType === 'new_project') {
    // New projects start at Concept
    currentStageIndex = 0
  } else if (projectType === 'in_development') {
    // In development projects find current stage based on zone statuses
    currentStageIndex = Math.max(
      1,
      stageKeys.findIndex(s => zoneStatuses.some(zs => zs === s))
    )
  } else {
    // Maintenance projects are at Maintenance stage
    currentStageIndex = 3
  }

  const stageTypeMap: Record<number, ProjectType> = {
    0: 'new_project',
    1: 'in_development',
    3: 'maintenance',
  }

  const handleStageClick = (idx: number) => {
    const nextType = stageTypeMap[idx]
    if (nextType && nextType !== projectType && onStatusChange) {
      if (confirm(`Change project status to "${stages[idx]}"?`)) {
        onStatusChange(nextType)
      }
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {stages.map((stage, idx) => {
          const isPast = idx < currentStageIndex
          const isCurrent = idx === currentStageIndex
          const isClickable = idx > currentStageIndex && stageTypeMap[idx]

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => handleStageClick(idx)}
                disabled={!isClickable}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer disabled:cursor-default"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 transition-colors ${
                  isPast ? 'bg-green-600 border-green-500' :
                  isCurrent ? 'bg-white border-white' :
                  isClickable ? 'bg-slate-600 border-slate-500 hover:bg-slate-500' :
                  'bg-slate-600 border-slate-500'
                }`}>
                  {isPast && <span className="text-slate-800 text-xs font-semibold">✓</span>}
                  {isCurrent && <span className="text-slate-800 text-xs font-semibold">●</span>}
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${
                  isPast ? 'text-green-400' :
                  isCurrent ? 'text-white' :
                  isClickable ? 'text-slate-400 hover:text-slate-300' :
                  'text-slate-500'
                }`}>{stage}</span>
              </button>
              {idx < stages.length - 1 && (
                <div className="flex-1 flex items-center px-1 h-3">
                  <div className={`w-full h-1 ${
                    isPast ? 'bg-green-600' : 'bg-slate-600'
                  }`}></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

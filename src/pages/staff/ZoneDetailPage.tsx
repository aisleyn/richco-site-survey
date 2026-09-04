import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { getProjectById } from '../../services/projects'
import { getSubcategoriesByProject } from '../../services/subcategories'
import { getSurveysByProject } from '../../services/surveys'
import { getRoomsByZone, createRoom, deleteRoom } from '../../services/rooms'
import { useToast } from '../../components/ui/Toast'
import type { Project, ProjectSubcategory, Survey, ProjectRoom, ZoneStatus } from '../../types'
import { Card, Badge, Spinner, BackButton, Button, Input } from '../../components/ui'

const getZoneStatusBadgeVariant = (status: ZoneStatus): 'default' | 'in_progress' | 'completed' | 'needs_repair' | 'temporary_repair' => {
  switch (status) {
    case 'concept':
      return 'default'
    case 'in_development':
      return 'in_progress'
    case 'approved':
      return 'completed'
    case 'denied':
      return 'needs_repair'
    case 'on_hold':
      return 'temporary_repair'
    default:
      return 'default'
  }
}

export default function ZoneDetailPage() {
  const { projectId, zoneId } = useParams<{ projectId: string; zoneId: string }>()
  const navigate = useNavigate()
  const addToast = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [zone, setZone] = useState<ProjectSubcategory | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [rooms, setRooms] = useState<ProjectRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isDeletingRoom, setIsDeletingRoom] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId, zoneId])

  const loadData = async () => {
    if (!projectId || !zoneId) return
    try {
      const [p, subs, s, r] = await Promise.all([
        getProjectById(projectId),
        getSubcategoriesByProject(projectId),
        getSurveysByProject(projectId),
        getRoomsByZone(zoneId),
      ])
      setProject(p)
      setZone(subs.find(sub => sub.id === zoneId) || null)
      setSurveys(s)
      setRooms(r)
    } catch (err) {
      console.error('Failed to load zone data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const zoneSurveys = surveys.filter(s => s.subcategory_id === zoneId)
  const zoneOnlySurveys = zoneSurveys.filter(s => !s.room_id)
  const roomSurveys = zoneSurveys.filter(s => s.room_id)

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !projectId || !zoneId) {
      addToast({ type: 'warning', message: 'Please enter a room name' })
      return
    }

    setIsCreatingRoom(true)
    try {
      const newRoom = await createRoom(projectId as string, zoneId as string, newRoomName, '', 0)
      setRooms([...rooms, newRoom])
      setNewRoomName('')
      setShowCreateRoomForm(false)
      addToast({ type: 'success', message: 'Room created successfully' })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to create room' })
      console.error('Failed to create room:', err)
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure? This will unlink surveys from this room.')) return

    setIsDeletingRoom(roomId)
    try {
      await deleteRoom(roomId)
      setRooms(rooms.filter(r => r.id !== roomId))
      addToast({ type: 'success', message: 'Room deleted' })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete room' })
      console.error('Failed to delete room:', err)
    } finally {
      setIsDeletingRoom(null)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!project) return <div>Project not found</div>
  if (!zone) return <div>Zone not found</div>

  return (
    <div>
      <div className="mb-4">
        <BackButton label={`Back to ${project.name}`} />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{zone.name}</h1>
              {(project.project_type === 'in_development' || project.project_type === 'new_project') && (
                <Badge variant={getZoneStatusBadgeVariant(zone.status)}>
                  {zone.status.replace('_', ' ').charAt(0).toUpperCase() + zone.status.replace('_', ' ').slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-secondary">Project: {project.name}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/staff/projects/${projectId}/surveys/new?zone=${zoneId}`)}
          >
            New Survey
          </Button>
        </div>
      </div>

      {/* Rooms Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Rooms ({rooms.length})</h2>
          {!showCreateRoomForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateRoomForm(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} /> Add Room
            </Button>
          )}
        </div>

        {showCreateRoomForm && (
          <Card className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Room Name</label>
                <Input
                  placeholder="e.g., Control Room, Mechanical Room"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateRoom()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleCreateRoom} isLoading={isCreatingRoom}>
                  Create Room
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateRoomForm(false)
                    setNewRoomName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {rooms.length === 0 ? (
          <Card>
            <p className="text-center text-secondary py-12">
              No rooms in this zone. {!showCreateRoomForm && 'Click "Add Room" to create one.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => {
              const roomSurveysCount = roomSurveys.filter(s => s.room_id === room.id).length
              return (
                <Card key={room.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                      <p className="text-sm text-secondary mt-1">
                        {roomSurveysCount} survey{roomSurveysCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteRoom(room.id)}
                      isLoading={isDeletingRoom === room.id}
                      className="flex items-center gap-2"
                    >
                      <X size={16} /> Delete
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Surveys by Room Section */}
      {rooms.length > 0 && roomSurveys.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Surveys by Room ({roomSurveys.length})</h2>
          <div className="space-y-8">
            {rooms.map((room) => {
              const surveysInRoom = roomSurveys.filter(s => s.room_id === room.id)
              if (surveysInRoom.length === 0) return null

              return (
                <div key={room.id}>
                  <h3 className="text-lg font-semibold text-white mb-4">{room.name}</h3>
                  <div className="space-y-3 ml-4 border-l-2 border-slate-600 pl-4">
                    {surveysInRoom.map((survey) => (
                      <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
                        <Card className="card-hover cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div>
                                <h4 className="text-base font-semibold text-white">{survey.area_name}</h4>
                                <p className="text-sm text-secondary mt-1">
                                  {new Date(survey.survey_date).toLocaleDateString()}
                                </p>
                              </div>
                              {survey.status === 'draft' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                            </div>
                            <Badge variant={survey.status}>
                              {survey.status === 'draft' ? 'Active' : survey.status === 'published' ? 'Completed' : 'Archived'}
                            </Badge>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Zone-only Surveys Section */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          Surveys {rooms.length > 0 ? 'without a Room' : ''} ({zoneOnlySurveys.length})
        </h2>
        {zoneOnlySurveys.length === 0 ? (
          <Card>
            <p className="text-center text-secondary py-12">No surveys in this zone</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {zoneOnlySurveys.map((survey) => (
              <Link key={survey.id} to={`/staff/surveys/${survey.id}`}>
                <Card className="card-hover cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{survey.area_name}</h3>
                        <p className="text-sm text-secondary mt-1">
                          {new Date(survey.survey_date).toLocaleDateString()}
                        </p>
                      </div>
                      {survey.status === 'draft' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                    </div>
                    <Badge variant={survey.status}>
                      {survey.status === 'draft' ? 'Active' : survey.status === 'published' ? 'Completed' : 'Archived'}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

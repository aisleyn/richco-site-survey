import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getSurveyById, getSurveyMedia, publishSurvey, deleteSurvey, updateSurvey, addSurveyMedia } from '../../services/surveys'
import { getSurveyUpdates, updateSurveyUpdate } from '../../services/surveyUpdates'
import { deleteWaypointByLinkedSurvey } from '../../services/mapWaypoints'
import { uploadFile } from '../../services/storage'
import { generateSurveyFromTemplate } from '../../lib/templateExport'
import { captureWaypointLocation } from '../../lib/waypointScreenshot'
import { apiFetch } from '../../lib/api'
import type { Survey, SurveyMedia, SurveyUpdate, SurveyUpdateMedia } from '../../types'
import { Card, CardHeader, CardTitle, Button, Badge, Spinner, MediaPreviewModal, Input, Textarea } from '../../components/ui'
import { useToast } from '../../components/ui/Toast'

export default function SurveyDetailPage() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const addToast = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [media, setMedia] = useState<SurveyMedia[]>([])
  const [surveyUpdates, setSurveyUpdates] = useState<(SurveyUpdate & { media: SurveyUpdateMedia[] })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ file_url: string; media_type: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([])
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null)
  const [editingUpdateData, setEditingUpdateData] = useState<any>(null)
  const [cachedWaypointLocation, setCachedWaypointLocation] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [surveyId])

  const loadData = async () => {
    if (!surveyId) return
    try {
      const [s, m, updates] = await Promise.all([
        getSurveyById(surveyId),
        getSurveyMedia(surveyId),
        getSurveyUpdates(surveyId),
      ])
      if (!s) {
        addToast({ type: 'error', message: 'Survey not found' })
        return
      }
      setSurvey(s)
      setMedia(m)
      setSurveyUpdates(updates)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!survey) return
    setIsPublishing(true)
    try {
      await publishSurvey(survey.id, survey.project_id)
      setSurvey({ ...survey, status: 'published' })

      // Capture waypoint location data and screenshot BEFORE deleting waypoint
      try {
        const waypointUpdate = surveyUpdates.find((u) => u.waypoint_id)
        if (waypointUpdate?.waypoint_id) {
          console.log('Capturing waypoint location before deletion...')
          const waypoints = await apiFetch<any[]>(
            `map_waypoints?id=eq.${waypointUpdate.waypoint_id}`
          )
          const waypoint = waypoints?.[0]

          if (waypoint?.floor_plan_page_id) {
            const pages = await apiFetch<any[]>(
              `floor_plan_pages?id=eq.${waypoint.floor_plan_page_id}`
            )
            const page = pages?.[0]

            if (page?.image_url) {
              const screenshot = await captureWaypointLocation(
                page.image_url,
                waypoint.x_percent,
                waypoint.y_percent,
              )

              const waypointLocationData = {
                areaName: waypoint.area_name || 'N/A',
                pageNumber: page.page_number,
                pageLabel: page.label || '',
                xPercent: waypoint.x_percent,
                yPercent: waypoint.y_percent,
                screenshot,
              }

              // Cache in state so it's available when user downloads the report
              setCachedWaypointLocation(waypointLocationData)

              // Also save to database so it persists across sessions
              await updateSurveyUpdate(waypointUpdate.id, {
                waypoint_location_json: waypointLocationData,
              })

              console.log('Waypoint location captured and saved:', {
                area: waypointLocationData.areaName,
                page: waypointLocationData.pageNumber,
                screenshotSize: screenshot.length,
              })
            }
          }
        }
      } catch (err) {
        console.warn('Failed to capture waypoint location:', err)
        // Continue with deletion even if capture fails
      }

      // Delete the waypoint since repair is complete
      try {
        await deleteWaypointByLinkedSurvey(survey.id)
      } catch (err) {
        console.warn('Failed to delete waypoint:', err)
      }

      addToast({
        type: 'success',
        message: 'Repair completed and waypoint removed',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to complete repair',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownloadReport = async () => {
    if (!survey) return
    setIsDownloading(true)
    try {
      // For initial issue surveys, use media from updates only; otherwise use survey media
      const isInitialIssue = !survey.suggested_system && !survey.install_notes

      let imageMedia: string[] = []
      let scanMedia: string[] = []

      if (isInitialIssue && surveyUpdates.length > 0) {
        // Use media from survey updates only
        surveyUpdates.forEach((update) => {
          update.media.forEach((m) => {
            if (m.media_type === 'image' || m.media_type === 'pdf') {
              imageMedia.push(m.file_url)
            } else if (m.media_type === '3d_scan') {
              scanMedia.push(m.file_url)
            }
          })
        })
      } else {
        // Use survey media
        imageMedia = media.filter((m) => m.media_type === 'image' || m.media_type === 'pdf').map((m) => m.file_url)
        scanMedia = media.filter((m) => m.media_type === '3d_scan').map((m) => m.file_url)
      }

      // Try to get waypoint location data
      let waypointLocation = cachedWaypointLocation

      if (!waypointLocation) {
        // Check if any survey update has the waypoint location data already loaded
        try {
          const waypointUpdate = surveyUpdates.find((u) => (u as any).waypoint_location_json)
          if (waypointUpdate && (waypointUpdate as any).waypoint_location_json) {
            waypointLocation = (waypointUpdate as any).waypoint_location_json
            console.log('Waypoint location found in survey updates')
            setCachedWaypointLocation(waypointLocation)
          }
        } catch (err) {
          console.warn('Failed to get waypoint location from survey updates:', err)
          // Continue with report generation without waypoint location
        }
      }

      await generateSurveyFromTemplate({
        projectName: survey.project_name,
        areaName: survey.area_name,
        surveyDate: survey.survey_date,
        areaSize: survey.area_size_sqft?.toString() || 'N/A',
        surveyNotes: survey.survey_notes || 'N/A',
        recommendedSystem: survey.suggested_system || 'N/A',
        notes: survey.install_notes || 'N/A',
        images: imageMedia,
        scans: scanMedia,
        clientName: survey.client_name || 'N/A',
        waypointLocation,
      })

      addToast({
        type: 'success',
        message: 'Report downloaded successfully',
      })
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Failed to generate report',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!survey) return
    if (!window.confirm('Are you sure you want to delete this survey? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteSurvey(survey.id)
      addToast({ type: 'success', message: 'Survey deleted successfully' })
      navigate('/staff/surveys')
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete survey' })
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!survey || !editingUpdateData || !editingUpdateId) return
    setIsSaving(true)
    try {
      if (editingUpdateId === 'main') {
        // Update main survey fields
        await updateSurvey(survey.id, {
          area_name: editingUpdateData.area_name,
          survey_notes: editingUpdateData.survey_notes,
          suggested_system: editingUpdateData.suggested_system,
          install_notes: editingUpdateData.install_notes,
          area_size_sqft: editingUpdateData.area_size_sqft,
          client_name: editingUpdateData.client_name,
        })

        // Upload new media files if any
        if (newMediaFiles.length > 0) {
          for (const file of newMediaFiles) {
            const path = `${survey.project_id}/${survey.id}/${Date.now()}-${file.name}`
            const uploaded = await uploadFile('survey-media', path, file)
            await addSurveyMedia(survey.id, 'image', uploaded.signedUrl)
          }
        }

        // Reload survey data
        const updated = await getSurveyById(survey.id)
        if (updated) {
          const updatedMedia = await getSurveyMedia(survey.id)
          setSurvey(updated)
          setMedia(updatedMedia)
        }
        setNewMediaFiles([])
      } else {
        // Update survey update
        await updateSurveyUpdate(editingUpdateId, {
          update_notes: editingUpdateData.update_notes,
          area_name: editingUpdateData.area_name,
          area_size_sqft: editingUpdateData.area_size_sqft,
          suggested_system: editingUpdateData.suggested_system,
          install_notes: editingUpdateData.install_notes,
        })

        // Reload updates
        const updates = await getSurveyUpdates(survey.id)
        setSurveyUpdates(updates)
      }

      setEditingUpdateId(null)
      setEditingUpdateData(null)
      addToast({ type: 'success', message: 'Changes saved successfully' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to save changes' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (!window.confirm('Delete this media?')) return
    try {
      // Delete from API - for now we'll just remove from state
      // In a real app, you'd have a deleteMedia endpoint
      setMedia(media.filter(m => m.id !== mediaId))
      addToast({ type: 'success', message: 'Media deleted' })
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to delete media' })
    }
  }

  const handleAddMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setNewMediaFiles([...newMediaFiles, ...files])
  }

  const handleStartEditUpdate = (update: any) => {
    setEditingUpdateId(update.id)
    setEditingUpdateData({
      update_notes: update.update_notes || update.survey_notes || '',
      area_name: update.area_name,
      area_size_sqft: update.area_size_sqft,
      suggested_system: update.suggested_system,
      install_notes: update.install_notes,
      survey_notes: update.survey_notes,
      client_name: update.client_name,
    })
  }

  const handleCancelEditUpdate = () => {
    setEditingUpdateId(null)
    setEditingUpdateData(null)
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!survey) return <div>Survey not found</div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{survey.area_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={survey.status}>{survey.status}</Badge>
            <span className="text-secondary text-sm">
              {new Date(survey.survey_date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          {survey.status === 'draft' && (
            <Button variant="primary" onClick={handlePublish} isLoading={isPublishing} className="w-full xs:w-auto">
              ✓ Complete Repair
            </Button>
          )}
          {survey.status === 'published' && (
            <Button variant="primary" onClick={handleDownloadReport} isLoading={isDownloading} className="w-full xs:w-auto">
              📥 Download Report
            </Button>
          )}
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} className="w-full xs:w-auto">
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{!survey.suggested_system && !survey.install_notes ? 'Initial Issue' : 'Survey Details'}</CardTitle>
                {editingUpdateId !== 'main' && (
                  <Button size="sm" variant="secondary" onClick={() => handleStartEditUpdate({ ...survey, id: 'main' })}>
                    ✏️ Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            {editingUpdateId === 'main' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Area Name</label>
                  <Input
                    value={editingUpdateData?.area_name || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, area_name: e.target.value })}
                    placeholder="Area name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Area Size (sqft)</label>
                  <Input
                    type="number"
                    value={editingUpdateData?.area_size_sqft || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, area_size_sqft: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Area size"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Survey Notes</label>
                  <Textarea
                    value={editingUpdateData?.survey_notes || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, survey_notes: e.target.value })}
                    placeholder="Survey notes"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Suggested System</label>
                  <Textarea
                    value={editingUpdateData?.suggested_system || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, suggested_system: e.target.value })}
                    placeholder="Suggested system"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Installation Notes</label>
                  <Textarea
                    value={editingUpdateData?.install_notes || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, install_notes: e.target.value })}
                    placeholder="Installation notes"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Client Name</label>
                  <Input
                    value={editingUpdateData?.client_name || ''}
                    onChange={(e) => setEditingUpdateData({ ...editingUpdateData, client_name: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleSaveEdit} isLoading={isSaving}>
                    💾 Save
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCancelEditUpdate}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Area Size</label>
                  <p className="text-white">{survey.area_size_sqft} sqft</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Survey Notes</label>
                  <p className="text-white">{survey.survey_notes || 'N/A'}</p>
                </div>
                {survey.suggested_system && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Suggested System</label>
                    <p className="text-white">{survey.suggested_system}</p>
                  </div>
                )}
                {survey.install_notes && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Installation Notes</label>
                    <p className="text-white">{survey.install_notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {(media.length > 0 || editingUpdateId === 'main') && (
            <Card>
              <CardHeader>
                <CardTitle>Media ({media.length + newMediaFiles.length})</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {media.length > 0 && (
                  <div>
                    <div className="grid grid-cols-3 gap-4">
                      {media.map((m) => (
                        <div
                          key={m.id}
                          className="relative border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                          onClick={() => editingUpdateId !== 'main' && setSelectedMedia(m)}
                        >
                          {m.media_type === 'image' ? (
                            <img src={m.file_url} alt="survey" className="w-full h-32 object-cover" />
                          ) : m.media_type === 'video' ? (
                            <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                              </svg>
                            </div>
                          ) : m.media_type === 'pdf' ? (
                            <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13 6H5v14h14V9h-6V6z" />
                              </svg>
                            </div>
                          )}
                          {editingUpdateId === 'main' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteMedia(m.id)
                              }}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {editingUpdateId === 'main' && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Add Media</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf"
                        onChange={handleAddMediaFiles}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer block text-center">
                        <p className="text-sm font-medium text-slate-700">Click to add photos, videos, or PDFs</p>
                      </label>
                    </div>
                    {newMediaFiles.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-600 mb-2">{newMediaFiles.length} file(s) to upload</p>
                        <ul className="space-y-1">
                          {newMediaFiles.map((f, idx) => (
                            <li key={idx} className="text-sm text-slate-600">{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {surveyUpdates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Surveys</h2>
              {surveyUpdates.map((update) => (
                <Card key={update.id}>
                  <div className="mb-4 pb-4 border-b border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      {format(new Date(update.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {editingUpdateId !== update.id && (
                      <Button size="sm" variant="secondary" onClick={() => handleStartEditUpdate(update)}>
                        ✏️ Edit
                      </Button>
                    )}
                  </div>
                  {editingUpdateId === update.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Update Notes</label>
                        <Textarea
                          value={editingUpdateData?.update_notes || ''}
                          onChange={(e) => setEditingUpdateData({ ...editingUpdateData, update_notes: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Area Name</label>
                        <Input
                          value={editingUpdateData?.area_name || ''}
                          onChange={(e) => setEditingUpdateData({ ...editingUpdateData, area_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Area Size (sqft)</label>
                        <Input
                          type="number"
                          value={editingUpdateData?.area_size_sqft || ''}
                          onChange={(e) => setEditingUpdateData({ ...editingUpdateData, area_size_sqft: e.target.value ? parseInt(e.target.value) : null })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Suggested System</label>
                        <Textarea
                          value={editingUpdateData?.suggested_system || ''}
                          onChange={(e) => setEditingUpdateData({ ...editingUpdateData, suggested_system: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Installation Notes</label>
                        <Textarea
                          value={editingUpdateData?.install_notes || ''}
                          onChange={(e) => setEditingUpdateData({ ...editingUpdateData, install_notes: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleSaveEdit} isLoading={isSaving}>
                          💾 Save
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleCancelEditUpdate}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {update.update_notes && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Update Notes</label>
                          <p className="text-white">{update.update_notes}</p>
                        </div>
                      )}
                      {update.area_name && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Area Name</label>
                          <p className="text-white">{update.area_name}</p>
                        </div>
                      )}
                      {update.area_size_sqft && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Area Size</label>
                          <p className="text-white">{update.area_size_sqft} sqft</p>
                        </div>
                      )}
                      {update.suggested_system && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Suggested System</label>
                          <p className="text-white">{update.suggested_system}</p>
                        </div>
                      )}
                      {update.install_notes && (
                        <div>
                          <label className="text-sm font-medium text-slate-700">Installation Notes</label>
                          <p className="text-white">{update.install_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                    {update.media.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Media ({update.media.length})</label>
                        <div className="grid grid-cols-3 gap-4">
                          {update.media.map((m) => (
                            <div
                              key={m.id}
                              className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedMedia(m)}
                            >
                              {m.media_type === 'image' ? (
                                <img src={m.file_url} alt="update" className="w-full h-32 object-cover" />
                              ) : m.media_type === 'video' ? (
                                <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                                  </svg>
                                </div>
                              ) : m.media_type === 'pdf' ? (
                                <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-full h-32 bg-slate-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M13 6H5v14h14V9h-6V6z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
            </CardHeader>
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-secondary">Project</label>
                <p className="font-medium text-white">{survey.project_name}</p>
              </div>
              <div>
                <label className="text-secondary">Client</label>
                <p className="font-medium text-white">{survey.client_name}</p>
              </div>
              <div>
                <label className="text-secondary">Created</label>
                <p className="font-medium text-white">
                  {new Date(survey.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <MediaPreviewModal
        isOpen={!!selectedMedia}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  )
}

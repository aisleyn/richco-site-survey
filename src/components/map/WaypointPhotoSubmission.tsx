import { useState } from 'react'
import { Button, Select, Textarea } from '../ui'
import { submitWaypointPhoto } from '../../services/waypointPhotos'
import { useToast } from '../ui/Toast'
import type { WaypointPhotoType } from '../../types'

interface WaypointPhotoSubmissionProps {
  waypointId: string
  projectId: string
  onPhotoSubmitted?: () => void
}

export function WaypointPhotoSubmission({
  waypointId,
  projectId,
  onPhotoSubmitted,
}: WaypointPhotoSubmissionProps) {
  const addToast = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [photoType, setPhotoType] = useState<WaypointPhotoType>('general')
  const [caption, setCaption] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const imageFiles = selectedFiles.filter((f) => f.type.startsWith('image/'))

    if (imageFiles.length !== selectedFiles.length) {
      addToast({
        type: 'warning',
        message: 'Only image files are supported',
      })
    }

    setFiles(imageFiles)

    // Create preview URLs
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)

    URL.revokeObjectURL(previewUrls[index])
    setFiles(newFiles)
    setPreviewUrls(newUrls)
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      addToast({
        type: 'warning',
        message: 'Please select at least one photo',
      })
      return
    }

    setIsSubmitting(true)

    try {
      for (const file of files) {
        await submitWaypointPhoto(waypointId, projectId, file, photoType, caption || undefined)
      }

      addToast({
        type: 'success',
        message: `Uploaded ${files.length} photo(s)`,
      })

      // Reset form
      setFiles([])
      setCaption('')
      setPhotoType('general')
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])

      onPhotoSubmitted?.()
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload photos',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
      <h4 className="text-sm font-semibold text-white">Submit Photos</h4>

      {/* File Input */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="photo-input"
        />
        <label htmlFor="photo-input" className="cursor-pointer block text-center">
          {previewUrls.length > 0 ? (
            <p className="text-sm font-medium text-white">
              {files.length} file(s) selected - Click to add more
            </p>
          ) : (
            <div>
              <p className="text-lg mb-1">📷</p>
              <p className="text-sm font-medium text-white">Click to select photos</p>
            </div>
          )}
        </label>
      </div>

      {/* Previews */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previewUrls.map((url, idx) => (
            <div key={idx} className="relative">
              <img
                src={url}
                alt={`preview ${idx}`}
                className="w-full h-20 object-cover rounded border border-slate-200"
              />
              <button
                onClick={() => handleRemoveFile(idx)}
                className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-800"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photo Type */}
      <Select
        label="Photo Type"
        options={[
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'progress', label: 'Progress' },
          { value: 'general', label: 'General' },
        ]}
        value={photoType}
        onChange={(e) => setPhotoType(e.target.value as WaypointPhotoType)}
      />

      {/* Caption */}
      <Textarea
        label="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a description for these photos..."
        rows={2}
      />

      {/* Submit Button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={handleSubmit}
        disabled={files.length === 0 || isSubmitting}
        isLoading={isSubmitting}
      >
        {isSubmitting ? 'Uploading...' : 'Submit Photos'}
      </Button>
    </div>
  )
}

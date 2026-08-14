import { useState } from 'react'
import { Card, Button } from '../ui'
import { MediaPreviewModal } from '../ui/MediaPreviewModal'
import { updateSampleStatus, deleteSample } from '../../services/samples'
import { sendSampleStatusEmail } from '../../services/email'
import type { Sample } from '../../types'
import { useToast } from '../ui/Toast'
import { Trash2, FileIcon } from 'lucide-react'

interface SampleCardProps {
  sample: Sample
  onStatusChange?: (sample: Sample) => void
  onDeleted?: (sampleId: string) => void
  showDeleteButton?: boolean
}

interface SampleCardPropsWithHandlers extends SampleCardProps {
  projectName?: string
  staffEmail?: string
}

export function SampleCard({
  sample,
  onStatusChange,
  onDeleted,
  projectName,
  staffEmail,
  showDeleteButton = true
}: SampleCardPropsWithHandlers) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const toast = useToast()

  // Detect file type by looking at filename before query params
  const getFileExtension = (url: string | null | undefined): string => {
    if (!url) return ''
    // Remove query params and get the last path segment
    const pathOnly = url.split('?')[0]
    const filename = pathOnly.split('/').pop() || ''
    return filename.toLowerCase()
  }

  const filename = getFileExtension(sample.image_url)
  const isPdf = filename.endsWith('.pdf')
  const isImage = sample.image_url && !isPdf

  // Debug logging
  console.log('[SampleCard]', {
    title: sample.title,
    filename,
    isPdf,
    isImage,
    imageUrl: sample.image_url?.substring(0, 100),
  })

  const handleStatusChange = async (newStatus: 'approved' | 'denied') => {
    setIsUpdating(true)
    try {
      const updated = await updateSampleStatus(sample.id, newStatus)
      onStatusChange?.(updated)

      // Send email to staff if email provided
      if (staffEmail && projectName) {
        try {
          await sendSampleStatusEmail(staffEmail, projectName, sample.title, newStatus)
        } catch (emailErr) {
          console.error('Failed to send email:', emailErr)
        }
      }

      toast({
        message: `Sample ${newStatus}`,
        type: newStatus === 'approved' ? 'success' : 'info',
      })
    } catch (err) {
      console.error(err)
      toast({ message: 'Failed to update sample', type: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSample(sample.id)
      onDeleted?.(sample.id)
      toast({
        message: 'Sample removed',
        type: 'success',
      })
    } catch (err) {
      console.error(err)
      toast({ message: 'Failed to remove sample', type: 'error' })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const statusColor =
    sample.status === 'approved'
      ? 'bg-green-100 text-green-800'
      : sample.status === 'denied'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800'

  return (
    <>
      <Card className="flex flex-col h-full">
        {sample.image_url && (
          <div className="relative group cursor-pointer overflow-hidden rounded-t bg-slate-900">
            {isImage ? (
              <img
                src={sample.image_url}
                alt={sample.title}
                onClick={() => setPreviewOpen(true)}
                className="w-full h-40 object-cover group-hover:opacity-75 transition-opacity"
              />
            ) : isPdf ? (
              <div
                onClick={() => setPreviewOpen(true)}
                className="w-full h-40 bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors"
              >
                <div className="text-center">
                  <FileIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">PDF Document</p>
                  <p className="text-xs text-slate-500 mt-1">Click to preview</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
        <div className="flex-1 p-4 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">{sample.title}</h3>
          <div className={`inline-block px-2 py-1 rounded text-xs font-medium w-fit mb-3 ${statusColor}`}>
            {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
          </div>
          {sample.product_details && (
            <p className="text-sm text-slate-300 mb-2 line-clamp-2">{sample.product_details}</p>
          )}
          <div className="mt-auto space-y-2">
            {sample.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusChange('approved')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleStatusChange('denied')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Deny
                </Button>
              </div>
            )}
            {showDeleteButton && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded">
          <Card className="max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Remove Sample?</h3>
            <p className="text-slate-300 mb-4">
              Are you sure you want to remove "{sample.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {sample.image_url && (
        <MediaPreviewModal
          isOpen={previewOpen}
          media={{
            file_url: sample.image_url,
            media_type: isPdf ? 'pdf' : 'image',
          }}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  )
}

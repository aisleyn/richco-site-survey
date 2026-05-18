import { useState } from 'react'
import { Card, Button } from '../ui'
import { updateSampleStatus } from '../../services/samples'
import { sendSampleStatusEmail } from '../../services/email'
import type { Sample } from '../../types'
import { useToast } from '../ui/Toast'
import { useAuthStore } from '../../store/authStore'

interface SampleCardProps {
  sample: Sample
  onStatusChange?: (sample: Sample) => void
}

interface SampleCardPropsWithHandlers extends SampleCardProps {
  projectName?: string
  staffEmail?: string
}

export function SampleCard({ sample, onStatusChange, projectName, staffEmail }: SampleCardPropsWithHandlers) {
  const [isUpdating, setIsUpdating] = useState(false)
  const toast = useToast()

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

  const statusColor =
    sample.status === 'approved'
      ? 'bg-green-100 text-green-800'
      : sample.status === 'denied'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800'

  return (
    <Card className="flex flex-col h-full">
      {sample.image_url && (
        <img
          src={sample.image_url}
          alt={sample.title}
          className="w-full h-40 object-cover rounded-t"
        />
      )}
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-white mb-2">{sample.title}</h3>
        <div className={`inline-block px-2 py-1 rounded text-xs font-medium w-fit mb-3 ${statusColor}`}>
          {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
        </div>
        {sample.product_details && (
          <p className="text-sm text-slate-300 mb-2 line-clamp-2">{sample.product_details}</p>
        )}
        {sample.pending === 'pending' && (
          <div className="mt-auto flex gap-2">
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
      </div>
    </Card>
  )
}

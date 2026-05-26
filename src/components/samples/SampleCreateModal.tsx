import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal, Button, Input, Textarea } from '../ui'
import { createSample } from '../../services/samples'
import { uploadFile } from '../../services/storage'
import { upsertSampleReportPage } from '../../services/reportPages'
import { sendSampleCreatedEmail } from '../../services/email'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../ui/Toast'
import type { Sample } from '../../types'
import { getProjectById } from '../../services/projects'

interface SampleCreateModalProps {
  isOpen: boolean
  projectId: string
  subcategoryId?: string
  onCreated: (sample: Sample) => void
  onClose: () => void
}

export function SampleCreateModal({ isOpen, projectId, subcategoryId, onCreated, onClose }: SampleCreateModalProps) {
  const { profile } = useAuthStore()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      product_details: '',
      process_details: '',
      proposal: '',
    },
  })

  const onSubmit = async (data: any) => {
    if (!selectedFile) {
      toast({ message: 'Please upload an image', type: 'error' })
      return
    }

    setIsLoading(true)
    try {
      const uploadedFile = await uploadFile('sample-media', `${projectId}/${Date.now()}-${selectedFile.name}`, selectedFile)

      const newSample = await createSample(projectId, {
        title: data.title,
        image_url: uploadedFile.signedUrl,
        product_details: data.product_details,
        process_details: data.process_details,
        proposal: data.proposal,
      }, profile?.id || '', subcategoryId)

      await upsertSampleReportPage(projectId, newSample.id)

      // Send email to client about new sample
      try {
        const project = await getProjectById(projectId)
        const clientProfile = await fetch(`/api/profiles/${project.client_id}`)
          .then(r => r.json())
          .catch(() => null)

        if (clientProfile?.email) {
          await sendSampleCreatedEmail(clientProfile.email, project.name, data.title)
        }
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr)
        // Don't fail the sample creation if email fails
      }

      onCreated(newSample)
      reset()
      setSelectedFile(null)
      toast({ message: 'Sample created', type: 'success' })
    } catch (err) {
      console.error(err)
      toast({ message: 'Failed to create sample', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Sample" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Sample Title"
          placeholder="e.g., Polished Concrete Finish"
          error={errors.title?.message}
          {...register('title', { required: 'Title is required' })}
        />

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Sample Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && <p className="text-sm text-slate-400 mt-1">Selected: {selectedFile.name}</p>}
        </div>

        <Textarea
          label="Product Details"
          placeholder="Describe the product..."
          {...register('product_details')}
        />

        <Textarea
          label="Process Details"
          placeholder="Describe the installation process..."
          {...register('process_details')}
        />

        <Textarea
          label="Proposal"
          placeholder="What are you proposing to the client?"
          {...register('proposal')}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
            disabled={!selectedFile || isLoading}
          >
            Create Sample
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}

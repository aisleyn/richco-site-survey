import { useState } from 'react'
import { Modal, Button } from '../ui'
import { uploadFile, getPublicUrl } from '../../services/storage'
import { supabase } from '../../lib/supabase'
import { pdfjsLib } from '../../lib/pdf'

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: (imageUrl: string) => void
}

export function PdfUploadModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: PdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/'))) {
      setFile(selectedFile)
      setError(null)
    } else {
      setError('Please select a valid PDF or image file')
      setFile(null)
    }
  }

  const convertPdfToImage = async () => {
    if (!file) return

    setIsConverting(true)
    setError(null)

    try {
      let imageBlob: Blob

      if (file.type.startsWith('image/')) {
        // If it's already an image, use it directly
        imageBlob = file
      } else {
        // Convert PDF to image
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
        const page = await pdf.getPage(1)

        const scale = 2
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        if (!context) throw new Error('Failed to create canvas context')

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: context,
          viewport,
        }).promise

        // Convert canvas to blob
        imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png', 0.95)
        })
      }

      // Upload to storage
      const fileName = `${projectId}/floor-plan-${Date.now()}.png`
      const uploadResult = await uploadFile('floor-plans', fileName, imageBlob as File)
      // Use public URL that never expires instead of signed URL
      const imageUrl = getPublicUrl('floor-plans', uploadResult.path)

      // Update project with new map image URL
      await supabase
        .from('projects')
        .update({ map_image_url: imageUrl })
        .eq('id', projectId)

      onSuccess?.(imageUrl)
      setFile(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Floor Plan">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-input"
          />
          <label htmlFor="pdf-input" className="cursor-pointer block text-center">
            {file ? (
              <div className="text-sm">
                <p className="font-medium text-white">📄 {file.name}</p>
                <p className="text-slate-600 mt-1">Click to change file</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl mb-2">📄</p>
                <p className="font-medium text-white">Select a PDF file</p>
                <p className="text-sm text-slate-600 mt-1">Click or drag to upload floor plan</p>
              </div>
            )}
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={convertPdfToImage}
            disabled={!file || isConverting}
            isLoading={isConverting}
          >
            {isConverting ? 'Converting...' : 'Upload & Convert'}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          PDF will be converted to image, or image will be uploaded directly as the map background
        </p>
      </div>
    </Modal>
  )
}

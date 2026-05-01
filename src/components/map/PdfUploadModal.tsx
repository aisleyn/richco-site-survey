import { useState } from 'react'
import { Modal, Button } from '../ui'
import { uploadFile } from '../../services/storage'
import { createFloorPlanPage } from '../../services/floorPlanPages'
import { pdfjsLib } from '../../lib/pdf'
import type { FloorPlanPage } from '../../types'

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess?: (pages: FloorPlanPage[]) => void
}

export function PdfUploadModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: PdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
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
    setProgress(null)

    try {
      const pages: FloorPlanPage[] = []

      if (file.type.startsWith('image/')) {
        // Single image file - create one floor plan page
        setProgress({ current: 1, total: 1 })

        const fileName = `${projectId}/floor-plan-${Date.now()}.png`
        const uploadResult = await uploadFile('floor-plans', fileName, file)

        const page = await createFloorPlanPage(projectId, 1, '', uploadResult.signedUrl)
        pages.push(page)
      } else {
        // Multi-page PDF
        try {
          const arrayBuffer = await file.arrayBuffer()
          console.log('[PdfUpload] Loading PDF, file size:', arrayBuffer.byteLength, 'bytes')

          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
          const numPages = pdf.numPages
          console.log('[PdfUpload] PDF loaded successfully with', numPages, 'pages')

          if (numPages <= 0) {
            throw new Error('PDF has no pages')
          }

          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
              console.log('[PdfUpload] Processing page', pageNum, 'of', numPages)
              setProgress({ current: pageNum, total: numPages })

              const pdfPage = await pdf.getPage(pageNum)
              console.log('[PdfUpload] Got page', pageNum, 'from PDF')

              // Reduce scale to 1.5 for better memory usage on multi-page PDFs
              const scale = 1.5
              const viewport = pdfPage.getViewport({ scale })
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')

              if (!context) throw new Error('Failed to create canvas context')

              canvas.width = viewport.width
              canvas.height = viewport.height
              console.log('[PdfUpload] Canvas created:', canvas.width, 'x', canvas.height)

              // Clear and fill canvas with white background
              context.fillStyle = 'white'
              context.fillRect(0, 0, canvas.width, canvas.height)

              await pdfPage.render({
                canvasContext: context,
                viewport,
              }).promise
              console.log('[PdfUpload] Page', pageNum, 'rendered to canvas')

              // Convert canvas to data URL and then to Blob
              const dataUrl = canvas.toDataURL('image/png')
              const response = await fetch(dataUrl)
              const imageBlob = await response.blob()
              console.log('[PdfUpload] Page', pageNum, 'converted to blob, size:', imageBlob.size, 'bytes')

              // Create proper File object from blob
              const timestamp = Date.now()
              const fileName = `floor-plan-page-${pageNum}-${timestamp}.png`
              const imageFile = new File([imageBlob], fileName, { type: 'image/png' })

              // Upload with project ID prefix
              const uploadPath = `${projectId}/${fileName}`
              console.log('[PdfUpload] Uploading page', pageNum, 'to:', uploadPath)
              const uploadResult = await uploadFile('floor-plans', uploadPath, imageFile)
              console.log('[PdfUpload] Upload result for page', pageNum, ':', uploadResult.signedUrl ? '✓ has URL' : '✗ no URL')

              // Create floor plan page record
              const page = await createFloorPlanPage(projectId, pageNum, `Page ${pageNum}`, uploadResult.signedUrl)
              console.log('[PdfUpload] Created floor plan page record for page', pageNum, 'with id:', page.id)
              pages.push(page)
            } catch (err) {
              console.error('[PdfUpload] Error processing page', pageNum, ':', err)
              throw new Error(`Failed to process page ${pageNum}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            }
          }
        } catch (err) {
          console.error('[PdfUpload] PDF processing failed:', err)
          throw err
        }
      }

      console.log('[PdfUpload] Upload complete:', pages.length, 'pages created')
      onSuccess?.(pages)
      setFile(null)
      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload'
      console.error('[PdfUpload] Final error:', errorMsg)
      setError(errorMsg)
    } finally {
      setIsConverting(false)
      setProgress(null)
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

        {progress && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              Uploading page {progress.current} of {progress.total}...
            </p>
          </div>
        )}

        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-input"
            disabled={isConverting}
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
                <p className="font-medium text-white">Select a PDF or image file</p>
                <p className="text-sm text-slate-600 mt-1">Click or drag to upload (multi-page PDFs supported)</p>
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
            {isConverting ? 'Converting...' : 'Upload'}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          PDFs with multiple pages will create one floor plan per page. Each page will have separate waypoints.
        </p>
      </div>
    </Modal>
  )
}

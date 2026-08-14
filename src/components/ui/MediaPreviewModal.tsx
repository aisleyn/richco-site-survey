import { useState, useEffect, useRef } from 'react'
import { X, Download, FileIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { pdfjsLib } from '../../lib/pdf'

interface MediaPreviewModalProps {
  isOpen: boolean
  media: {
    file_url: string
    media_type: string
  } | null
  onClose: () => void
}

export function MediaPreviewModal({ isOpen, media, onClose }: MediaPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)

  const isImage = media?.media_type === 'image'
  const isVideo = media?.media_type === 'video'
  const is3dScan = media?.media_type === '3d_scan'
  const isPdf = media?.media_type === 'pdf'

  // Debug logging
  if (isOpen) {
    console.log('[MediaPreviewModal] Opened with:', {
      isOpen,
      media_type: media?.media_type,
      file_url: media?.file_url?.substring(0, 100),
      isPdf,
      isImage,
    })
  }

  useEffect(() => {
    if (!isPdf || !isOpen || !media) {
      console.log('[MediaPreviewModal PDF effect] Skipping - isPdf:', isPdf, 'isOpen:', isOpen, 'media:', !!media)
      return
    }

    console.log('[MediaPreviewModal PDF effect] Starting PDF load...')

    const loadPdf = async () => {
      try {
        setIsLoadingPdf(true)
        setCurrentPage(1)

        console.log('[MediaPreviewModal PDF effect] Loading from:', media!.file_url)
        const pdfDoc = await pdfjsLib.getDocument(media!.file_url).promise
        console.log('[MediaPreviewModal PDF effect] Loaded successfully, pages:', pdfDoc.numPages)

        pdfDocRef.current = pdfDoc
        setTotalPages(pdfDoc.numPages)

        if (canvasRef.current) {
          console.log('[MediaPreviewModal PDF effect] Rendering page 1...')
          renderPage(pdfDoc, 1)
        }
      } catch (err) {
        console.error('[MediaPreviewModal PDF effect] Error loading PDF:', err)
      } finally {
        setIsLoadingPdf(false)
      }
    }

    loadPdf()
  }, [isPdf, isOpen, media?.file_url])

  const renderPage = async (pdfDoc: any, pageNum: number) => {
    try {
      const canvas = canvasRef.current
      console.log('[PDF renderPage] Starting render for page', pageNum, 'canvas:', !!canvas)
      if (!canvas) {
        console.error('[PDF renderPage] No canvas ref!')
        return
      }

      const page = await pdfDoc.getPage(pageNum)
      console.log('[PDF renderPage] Got page object')

      const viewport = page.getViewport({ scale: 2 })
      console.log('[PDF renderPage] Viewport:', viewport.width, 'x', viewport.height)

      canvas.width = viewport.width
      canvas.height = viewport.height
      console.log('[PDF renderPage] Canvas set to:', canvas.width, 'x', canvas.height)

      const context = canvas.getContext('2d')
      if (!context) {
        console.error('[PDF renderPage] No 2D context!')
        return
      }

      console.log('[PDF renderPage] Starting render operation...')
      await page.render({
        canvasContext: context,
        viewport,
      }).promise
      console.log('[PDF renderPage] Render complete!')
    } catch (err) {
      console.error('[PDF renderPage] Error rendering PDF page:', err)
    }
  }

  const handlePrevPage = async () => {
    if (currentPage > 1 && pdfDocRef.current) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      await renderPage(pdfDocRef.current, newPage)
    }
  }

  const handleNextPage = async () => {
    if (currentPage < totalPages && pdfDocRef.current) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      await renderPage(pdfDocRef.current, newPage)
    }
  }

  const handlePageJump = async (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages && pdfDocRef.current) {
      setCurrentPage(pageNum)
      await renderPage(pdfDocRef.current, pageNum)
    }
  }

  if (!isOpen || !media) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-51"
          aria-label="Close"
        >
          <X size={32} />
        </button>

        <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[90vh] w-full flex flex-col">
          {isImage && (
            <img
              src={media.file_url}
              alt="Media preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
          {isVideo && (
            <video
              src={media.file_url}
              controls
              autoPlay
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
          {is3dScan && (
            <div className="bg-slate-900 rounded-lg p-8 flex flex-col items-center justify-center max-h-[80vh]">
              <FileIcon size={64} className="text-slate-400 mb-4" />
              <p className="text-white text-lg font-semibold mb-2">3D Scan File</p>
              <p className="text-slate-400 text-sm mb-6">3D scan files cannot be previewed in the browser</p>
              <a
                href={media.file_url}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-amber text-black rounded-lg font-medium hover:bg-amber-400 transition-colors"
              >
                <Download size={20} />
                Download File
              </a>
            </div>
          )}
          {isPdf && (
            <div className="flex flex-col bg-slate-900 rounded-lg overflow-hidden">
              {isLoadingPdf ? (
                <div className="w-full h-[80vh] flex items-center justify-center">
                  <p className="text-white">Loading PDF...</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full max-h-[70vh] border border-slate-700 rounded"
                    />
                  </div>

                  {totalPages > 1 && (
                    <div className="bg-slate-800 px-4 py-3 flex items-center justify-between border-t border-slate-700">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={20} />
                        Previous
                      </button>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const pageNum = parseInt(e.target.value) || 1
                            handlePageJump(pageNum)
                          }}
                          className="w-16 px-2 py-1 bg-slate-700 text-white text-center rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-300 text-sm">
                          of {totalPages}
                        </span>
                      </div>

                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight size={20} />
                      </button>

                      <a
                        href={media.file_url}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-amber text-black rounded font-medium hover:bg-amber-400 transition-colors"
                      >
                        <Download size={20} />
                        Download
                      </a>
                    </div>
                  )}

                  {totalPages === 1 && (
                    <div className="bg-slate-800 px-4 py-3 flex items-center justify-end gap-2 border-t border-slate-700">
                      <a
                        href={media.file_url}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-amber text-black rounded font-medium hover:bg-amber-400 transition-colors"
                      >
                        <Download size={20} />
                        Download
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

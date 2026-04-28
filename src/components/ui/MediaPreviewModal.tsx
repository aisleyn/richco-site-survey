import { X, Download, FileIcon } from 'lucide-react'

interface MediaPreviewModalProps {
  isOpen: boolean
  media: {
    file_url: string
    media_type: string
  } | null
  onClose: () => void
}

export function MediaPreviewModal({ isOpen, media, onClose }: MediaPreviewModalProps) {
  if (!isOpen || !media) return null

  const isImage = media.media_type === 'image'
  const isVideo = media.media_type === 'video'
  const is3dScan = media.media_type === '3d_scan'
  const isPdf = media.media_type === 'pdf'

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

        <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[90vh] w-full">
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
            <iframe
              src={`${media.file_url}#toolbar=1`}
              className="w-full h-[80vh] rounded-lg"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </>
  )
}

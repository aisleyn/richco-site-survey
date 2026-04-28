import { useCallback, useState, useRef } from 'react'
import clsx from 'clsx'

interface FileDropzoneProps {
  accept: string
  multiple: boolean
  onFilesSelected: (files: File[]) => void
  className?: string
  previewMode?: 'thumbnails' | 'list'
  label?: string
  error?: string
}

export function FileDropzone({
  accept,
  multiple,
  onFilesSelected,
  className,
  previewMode = 'thumbnails',
  label,
  error,
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handleDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setIsDragActive(true)
      } else if (e.type === 'dragleave') {
        setIsDragActive(false)
      }
    },
    [],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      handleFiles(droppedFiles)
    },
    [],
  )

  const handleFiles = (newFiles: File[]) => {
    const allFiles = multiple ? [...files, ...newFiles] : newFiles
    setFiles(allFiles)
    onFilesSelected(allFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files || [])
    handleFiles(inputFiles)
  }

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onFilesSelected(updated)
  }

  const handleZoneClick = () => {
    fileInputRef.current?.click()
  }

  const isImage = (file: File) => file.type.startsWith('image/')
  const isVideo = (file: File) => file.type.startsWith('video/')

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-white mb-2">{label}</label>}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors duration-200 cursor-pointer',
          isDragActive ? 'border-white bg-white' : 'border-slate-300 bg-slate-50 hover:bg-slate-100',
          error && 'border-red-300 bg-red-50',
          className,
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <label className="flex flex-col items-center justify-center cursor-pointer">
          <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-sm font-medium text-white">Drag files here or click to browse</p>
          <p className="text-xs text-slate-500 mt-1">
            {multiple ? 'Multiple files allowed' : 'Single file only'}
          </p>
        </label>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4">
          {previewMode === 'thumbnails' && (
            <div className="grid grid-cols-4 gap-3">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  {isImage(file) ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded border border-slate-200"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        URL.revokeObjectURL(img.src)
                      }}
                    />
                  ) : isVideo(file) ? (
                    <div className="w-full h-24 bg-slate-200 rounded border border-slate-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm12 8l-7 4v-8l7 4z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-slate-200 rounded border border-slate-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 6H5v14h14V9h-6V6z" />
                      </svg>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded transition-opacity flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {previewMode === 'list' && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 6H5v14h14V9h-6V6z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

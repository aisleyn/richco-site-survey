import * as pdfjsLib from 'pdfjs-dist'

// Use local worker file served from public folder
// This works on localhost and Azure Static Web Apps
if (typeof window !== 'undefined') {
  const workerSrc = '/pdf.worker.min.mjs'
  console.log('[PDF] Initializing PDF.js worker from:', window.location.origin + workerSrc)
  console.log('[PDF] Current environment:', window.location.hostname)
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
    console.log('[PDF] Worker initialized successfully at:', workerSrc)
  } catch (err) {
    console.error('[PDF] Failed to initialize worker:', err)
  }
}

export { pdfjsLib }

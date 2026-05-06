import * as pdfjsLib from 'pdfjs-dist'

// Use local PDF.js worker from public directory
if (typeof window !== 'undefined') {
  const workerSrc = '/pdf.worker.min.js'
  console.log('[PDF] Initializing PDF.js worker from local:', workerSrc)
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
    console.log('[PDF] Worker initialized successfully from local')
  } catch (err) {
    console.error('[PDF] Failed to initialize worker:', err)
  }
}

export { pdfjsLib }

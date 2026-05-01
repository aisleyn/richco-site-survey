import * as pdfjsLib from 'pdfjs-dist'

// Use CDN-hosted PDF.js worker
if (typeof window !== 'undefined') {
  const workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js'
  console.log('[PDF] Initializing PDF.js worker from CDN:', workerSrc)
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
    console.log('[PDF] Worker initialized successfully from CDN')
  } catch (err) {
    console.error('[PDF] Failed to initialize worker:', err)
  }
}

export { pdfjsLib }

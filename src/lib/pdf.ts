import * as pdfjsLib from 'pdfjs-dist'

// Use local worker file instead of CDN for better mobile reliability
// The worker file is served from public/ directory
if (typeof window !== 'undefined') {
  // Determine the correct path based on deployment environment
  const workerPath = new URL('/pdf.worker.min.mjs', import.meta.url).href
  console.log('[PDF] Setting worker path:', workerPath)
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
}

export { pdfjsLib }

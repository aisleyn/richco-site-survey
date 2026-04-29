import * as pdfjsLib from 'pdfjs-dist'

// Use local worker file instead of CDN for better mobile reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export { pdfjsLib }

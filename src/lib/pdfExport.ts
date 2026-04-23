import jsPDF from 'jspdf'

interface SurveyData {
  projectName: string
  areaName: string
  surveyDate: string
  areaSize: string
  surveyNotes: string
  recommendedSystem: string
  notes: string
  images: string[]
  scans: string[]
}

export async function generateSurveyPDF(surveyData: SurveyData) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  try {
    // Page 1: Title Page
    await addTitlePage(pdf, surveyData, pageWidth, pageHeight)

    // Page 2: Images and Details
    pdf.addPage()
    await addImagesPage(pdf, surveyData, pageWidth, pageHeight)

    // Page 3: Scans and Details
    pdf.addPage()
    await addScansPage(pdf, surveyData, pageWidth, pageHeight)

    // Page 4: Customer Review
    pdf.addPage()
    addCustomerReviewPage(pdf, pageWidth, pageHeight)

    // Download
    pdf.save(`${surveyData.projectName}_${surveyData.areaName}_Report.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

async function addTitlePage(
  pdf: jsPDF,
  data: SurveyData,
  pageWidth: number,
  pageHeight: number,
) {
  const templateImg = new Image()
  templateImg.src = '/sitesurvey (1).png'

  await new Promise((resolve) => {
    templateImg.onload = resolve
  })

  pdf.addImage(
    templateImg,
    'PNG',
    0,
    0,
    pageWidth,
    pageHeight,
  )

  // Add text overlays
  pdf.setFontSize(24)
  pdf.text(data.projectName, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' })
  pdf.text(data.areaName, pageWidth / 2, pageHeight / 2 + 35, { align: 'center' })
}

async function addImagesPage(
  pdf: jsPDF,
  data: SurveyData,
  pageWidth: number,
  pageHeight: number,
) {
  const templateImg = new Image()
  templateImg.src = '/sitesurvey (2).png'

  await new Promise((resolve) => {
    templateImg.onload = resolve
  })

  pdf.addImage(templateImg, 'PNG', 0, 0, pageWidth, pageHeight)

  // Add images to the left side
  if (data.images.length > 0) {
    const imgWidth = 50
    const imgHeight = 50
    const imgX = 15
    const imgY = 35

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = data.images[0]

    await new Promise((resolve) => {
      img.onload = resolve
    })

    try {
      pdf.addImage(img, 'JPEG', imgX, imgY, imgWidth, imgHeight)
    } catch (e) {
      console.warn('Could not add image to PDF')
    }
  }

  // Add text data on the right side
  const textX = pageWidth / 2 + 5

  pdf.setFontSize(9)
  pdf.text(`${data.areaName}`, textX + 3, 25)
  pdf.text(`${new Date(data.surveyDate).toLocaleDateString()}`, textX + 3, 33)
  pdf.text(`${data.areaSize}`, textX + 3, 42)

  // Survey Notes box
  const noteStartY = 50
  const noteBoxHeight = 60
  pdf.setFontSize(8)
  const surveyNoteLines = pdf.splitTextToSize(data.surveyNotes, pageWidth / 2 - 10)
  pdf.text(surveyNoteLines, textX + 3, noteStartY + 3, { maxWidth: pageWidth / 2 - 10 })

  // Recommended System
  const recSysY = noteStartY + noteBoxHeight + 5
  pdf.setFontSize(9)
  pdf.text(`${data.recommendedSystem}`, textX + 3, recSysY + 5)

  // Notes
  const notesY = recSysY + 15
  const notesLines = pdf.splitTextToSize(data.notes, pageWidth / 2 - 10)
  pdf.setFontSize(8)
  pdf.text(notesLines, textX + 3, notesY + 3, { maxWidth: pageWidth / 2 - 10 })
}

async function addScansPage(
  pdf: jsPDF,
  data: SurveyData,
  pageWidth: number,
  pageHeight: number,
) {
  const templateImg = new Image()
  templateImg.src = '/sitesurvey (3).png'

  await new Promise((resolve) => {
    templateImg.onload = resolve
  })

  pdf.addImage(templateImg, 'PNG', 0, 0, pageWidth, pageHeight)

  // Add scans to the left side
  if (data.scans.length > 0) {
    const scanWidth = 50
    const scanHeight = 50
    const scanX = 15
    const scanY = 35

    const scan = new Image()
    scan.crossOrigin = 'anonymous'
    scan.src = data.scans[0]

    await new Promise((resolve) => {
      scan.onload = resolve
    })

    try {
      pdf.addImage(scan, 'JPEG', scanX, scanY, scanWidth, scanHeight)
    } catch (e) {
      console.warn('Could not add scan to PDF')
    }
  }

  // Add text data on the right side (same as images page for consistency)
  const textX = pageWidth / 2 + 5

  pdf.setFontSize(9)
  pdf.text(`${data.areaName}`, textX + 3, 25)
  pdf.text(`${new Date(data.surveyDate).toLocaleDateString()}`, textX + 3, 33)
  pdf.text(`${data.areaSize}`, textX + 3, 42)

  const noteStartY = 50
  const noteBoxHeight = 60
  pdf.setFontSize(8)
  const surveyNoteLines = pdf.splitTextToSize(data.surveyNotes, pageWidth / 2 - 10)
  pdf.text(surveyNoteLines, textX + 3, noteStartY + 3, { maxWidth: pageWidth / 2 - 10 })

  const recSysY = noteStartY + noteBoxHeight + 5
  pdf.setFontSize(9)
  pdf.text(`${data.recommendedSystem}`, textX + 3, recSysY + 5)

  const notesY = recSysY + 15
  const notesLines = pdf.splitTextToSize(data.notes, pageWidth / 2 - 10)
  pdf.setFontSize(8)
  pdf.text(notesLines, textX + 3, notesY + 3, { maxWidth: pageWidth / 2 - 10 })
}

function addCustomerReviewPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
) {
  const templateImg = new Image()
  templateImg.src = '/sitesurvey (4).png'

  pdf.addImage(templateImg, 'PNG', 0, 0, pageWidth, pageHeight)

  // Customer review page is mostly blank for signature/notes - no data to add
}

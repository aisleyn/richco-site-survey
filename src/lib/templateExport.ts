import { saveAs } from 'file-saver'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ImageModule from 'docxtemplater-image-module-free'

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
  clientName: string
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to fetch image:', url, error)
    return ''
  }
}

export async function generateSurveyFromTemplate(surveyData: SurveyData) {
  try {
    // Fetch template from public folder
    const templateResponse = await fetch('/Survey_Report_Template.docx')
    const templateBlob = await templateResponse.arrayBuffer()

    // Load and prepare images
    const imagePromises = surveyData.images.map((url) => fetchImageAsBase64(url))
    const scanPromises = surveyData.scans.map((url) => fetchImageAsBase64(url))

    const [imageData, scanData] = await Promise.all([
      Promise.all(imagePromises),
      Promise.all(scanPromises),
    ])

    // Prepare data for template
    const templateData = {
      'Item.Client': surveyData.clientName,
      'Item.Area Name/ Room Number': surveyData.areaName,
      'Item.Area Size (Sqft)': surveyData.areaSize,
      'Item.Survey Date': surveyData.surveyDate,
      'Item.Survey Notes': surveyData.surveyNotes,
      'Item.Suggested System': surveyData.recommendedSystem,
      'Item.Notes Regarding Install': surveyData.notes,
      'Item.Images of Area': imageData.map((data) => ({
        data,
        width: 200,
        height: 150,
      })),
      'Item.Scans of Area': scanData.map((data) => ({
        data,
        width: 200,
        height: 150,
      })),
    }

    // Initialize and configure docxtemplater
    const zip = new PizZip(templateBlob)
    const doc = new Docxtemplater(zip, {
      modules: [
        new ImageModule({
          centered: false,
          fileType: 'docx',
        }),
      ],
    })

    // Set data and render
    doc.setData(templateData)
    doc.render()

    // Generate output
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    // Download
    saveAs(output, `${surveyData.projectName}_${surveyData.areaName}_Report.docx`)
  } catch (error) {
    console.error('Error generating report from template:', error)
    throw error
  }
}

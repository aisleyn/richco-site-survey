import { saveAs } from 'file-saver'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

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

function cleanupXmlPlaceholders(xmlString: string): string {
  // Merge split placeholders by removing XML tags between {{ and }}
  return xmlString.replace(/<\/w:t><\/w:r>[\s\n]*<w:r[^>]*>[\s\n]*<w:t[^>]*>/g, '')
    .replace(/<\/w:t><\/w:r>[\s\n]*<w:r[^>]*>[\s\n]*<w:rPr[^>]*>[\s\S]*?<\/w:rPr>[\s\n]*<w:t[^>]*>/g, '')
}

export async function generateSurveyFromTemplate(surveyData: SurveyData) {
  try {
    // Fetch template from public folder
    const templateResponse = await fetch('/Survey_Report_Template.docx')
    const templateBlob = await templateResponse.arrayBuffer()

    // Load the zip and process document XML
    const zip = new PizZip(templateBlob)
    let docXml = zip.files['word/document.xml'].asText()

    // Clean up split placeholders
    docXml = cleanupXmlPlaceholders(docXml)

    // Update the document in the zip
    zip.file('word/document.xml', docXml)

    // Initialize docxtemplater without image module (will handle manually if needed)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    // Prepare data for template with exact placeholder names
    const templateData = {
      'Item.Name': surveyData.clientName,
      'Item.Client': surveyData.clientName,
      'Item.Area Name/ Room Number': surveyData.areaName,
      'Item.Area Size (Sqft)': surveyData.areaSize,
      'Item.Survey Date': new Date(surveyData.surveyDate).toLocaleDateString(),
      'Item.Survey Notes': surveyData.surveyNotes,
      'Item.Suggested System': surveyData.recommendedSystem,
      'Item.Notes Regarding Install': surveyData.notes,
    }

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

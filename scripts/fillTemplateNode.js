import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function replacePlaceholders(xml, data) {
  let result = xml
  const placeholders = {
    'Item.Name': data.areaName || 'N/A',
    'Item.Client': data.clientName || 'N/A',
    'Item.Area Name/ Room Number': data.areaName || 'N/A',
    'Item.Area Size (Sqft)': data.areaSize || 'N/A',
    'Item.Survey Date': data.surveyDate || 'N/A',
    'Item.Survey Notes': data.surveyNotes || 'N/A',
    'Item.Suggested System': data.recommendedSystem || 'N/A',
    'Item.Notes Regarding Install': data.notes || 'N/A',
  }

  for (const [placeholder, value] of Object.entries(placeholders)) {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    result = result.replace(regex, String(value))
  }

  return result
}


export async function fillTemplate(templatePath, outputPath, surveyData) {
  try {
    console.error('[fillTemplate] Starting template fill process')
    console.error(`[fillTemplate] Template: ${templatePath}`)
    console.error(`[fillTemplate] Output: ${outputPath}`)

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    const zip = new AdmZip(templatePath)
    let documentXml = zip.readAsText('word/document.xml')
    console.error(`[fillTemplate] Loaded document.xml, size: ${documentXml.length} bytes`)

    // Replace text placeholders
    const originalSize = documentXml.length
    documentXml = replacePlaceholders(documentXml, surveyData)
    console.error(`[fillTemplate] Text replacement: ${originalSize} -> ${documentXml.length} bytes`)

    // Update the document.xml
    zip.updateFile('word/document.xml', Buffer.from(documentXml, 'utf8'))

    // Write output
    zip.writeZip(outputPath)
    console.error(`[fillTemplate] Document written to: ${outputPath}`)

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output file was not created: ${outputPath}`)
    }

    const fileSize = fs.statSync(outputPath).size
    console.error(`[fillTemplate] Output file size: ${fileSize} bytes`)

    return true
  } catch (error) {
    console.error(`[fillTemplate] Error: ${error.message}`)
    console.error(`[fillTemplate] Stack: ${error.stack}`)
    throw error
  }
}

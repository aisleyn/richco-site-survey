import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function fetchImage(url) {
  try {
    const response = await fetch(url, { timeout: 10000 })
    if (response.ok) {
      return await response.buffer()
    }
  } catch (err) {
    console.error(`Failed to fetch image: ${err.message}`)
  }
  return null
}

function replacePlaceholders(xml, data) {
  let result = xml

  // Define replacements
  const replacements = {
    '{{Item.Name}}': data.areaName || 'N/A',
    '{{Item.Client}}': data.clientName || 'N/A',
    '{{Item.Area Name/ Room Number}}': data.areaName || 'N/A',
    '{{Item.Area Size (Sqft)}}': data.areaSize || 'N/A',
    '{{Item.Survey Date}}': data.surveyDate || 'N/A',
    '{{Item.Survey Notes}}': data.surveyNotes || 'N/A',
    '{{Item.Suggested System}}': data.recommendedSystem || 'N/A',
    '{{Item.Notes Regarding Install}}': data.notes || 'N/A',
    'Item.Name': data.areaName || 'N/A',
    'Item.Client': data.clientName || 'N/A',
    'Item.Area Name/ Room Number': data.areaName || 'N/A',
    'Item.Area Size (Sqft)': data.areaSize || 'N/A',
    'Item.Survey Date': data.surveyDate || 'N/A',
    'Item.Survey Notes': data.surveyNotes || 'N/A',
    'Item.Suggested System': data.recommendedSystem || 'N/A',
    'Item.Notes Regarding Install': data.notes || 'N/A',
  }

  for (const [placeholder, value] of Object.entries(replacements)) {
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

    // Read the template DOCX
    const zip = new AdmZip(templatePath)

    // Find and modify document.xml
    let documentXml = zip.readAsText('word/document.xml')
    console.error(`[fillTemplate] Loaded document.xml, size: ${documentXml.length}`)

    // Replace placeholders in document content
    documentXml = replacePlaceholders(documentXml, surveyData)

    // Update the document.xml in the archive
    zip.updateFile('word/document.xml', Buffer.from(documentXml, 'utf8'))

    // Write the output file
    zip.writeZip(outputPath)
    console.error(`[fillTemplate] Document written to: ${outputPath}`)

    // Verify file was created
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

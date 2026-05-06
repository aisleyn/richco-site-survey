import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function replacePlaceholdersInParagraph(paragraph, placeholders) {
  let result = paragraph
  let replacedCount = 0

  for (const [placeholder, value] of Object.entries(placeholders)) {
    if (!value) continue

    // Try various placeholder formats
    const formats = [
      placeholder,
      `{{${placeholder}}}`,
      `{{ ${placeholder} }}`,
      placeholder.replace(/\./g, '\\.'),
    ]

    for (const format of formats) {
      const regex = new RegExp(format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      if (regex.test(result)) {
        result = result.replace(regex, String(value))
        replacedCount++
        console.error(`[replace] Found and replaced "${placeholder}" in paragraph`)
        break
      }
    }
  }

  return result
}

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

  console.error('[replacePlaceholders] Placeholder values:')
  for (const [key, value] of Object.entries(placeholders)) {
    console.error(`  ${key}: ${String(value).substring(0, 50)}`)
  }

  // Split by paragraphs and process each
  const paragraphs = result.split(/<w:p>/)
  const newParagraphs = ['']

  for (let i = 1; i < paragraphs.length; i++) {
    let paragraph = '<w:p>' + paragraphs[i]
    const originalPara = paragraph

    // Try to replace placeholders in this paragraph
    paragraph = replacePlaceholdersInParagraph(paragraph, placeholders)

    if (paragraph !== originalPara) {
      console.error(`[replacePlaceholders] Modified paragraph ${i}`)
    }

    newParagraphs.push(paragraph)
  }

  result = newParagraphs.join('')

  // Also try direct replacement for any missed placeholders
  console.error('[replacePlaceholders] Trying direct replacement for uncaught placeholders...')
  for (const [placeholder, value] of Object.entries(placeholders)) {
    const beforeCount = (result.match(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
    const afterCount = (result.match(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    if (beforeCount > afterCount) {
      console.error(`[replacePlaceholders] Direct replacement: "${placeholder}" (was ${beforeCount}, now ${afterCount})`)
    }
  }

  return result
}

export async function fillTemplate(templatePath, outputPath, surveyData) {
  try {
    console.error('[fillTemplate] Starting template fill process')
    console.error(`[fillTemplate] Template: ${templatePath}`)
    console.error(`[fillTemplate] Output: ${outputPath}`)
    console.error('[fillTemplate] Survey data:', {
      projectName: surveyData.projectName,
      areaName: surveyData.areaName,
      clientName: surveyData.clientName,
      surveyDate: surveyData.surveyDate,
      areaSize: surveyData.areaSize,
      surveyNotes: surveyData.surveyNotes?.substring(0, 50),
      recommendedSystem: surveyData.recommendedSystem,
      notes: surveyData.notes?.substring(0, 50),
      imagesCount: (surveyData.images || []).length,
      scansCount: (surveyData.scans || []).length,
    })

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    const zip = new AdmZip(templatePath)
    let documentXml = zip.readAsText('word/document.xml')
    console.error(`[fillTemplate] Loaded document.xml, size: ${documentXml.length} bytes`)

    // Find all placeholders in the document
    const allPlaceholders = documentXml.match(/Item\.[A-Za-z0-9 \/\.]+/g) || []
    console.error(`[fillTemplate] Found ${allPlaceholders.length} placeholder references in document:`)
    const uniquePlaceholders = [...new Set(allPlaceholders)]
    uniquePlaceholders.forEach(p => console.error(`  - ${p}`))

    // Replace text placeholders
    const originalSize = documentXml.length
    documentXml = replacePlaceholders(documentXml, surveyData)
    const newSize = documentXml.length
    console.error(`[fillTemplate] Text replacement: ${originalSize} -> ${newSize} bytes (change: ${newSize - originalSize})`)

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

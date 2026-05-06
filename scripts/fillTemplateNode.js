import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function replacePlaceholdersInRuns(paragraph, placeholder, value) {
  // Get all text runs in the paragraph
  const runMatches = paragraph.match(/<w:r>[\s\S]*?<\/w:r>/g) || []
  let fullText = ''

  // Reconstruct full text from all runs
  for (const run of runMatches) {
    const textMatches = run.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
    for (const textMatch of textMatches) {
      const text = textMatch.replace(/<w:t[^>]*>|<\/w:t>/g, '')
      fullText += text
    }
  }

  if (!fullText.includes(placeholder)) {
    return paragraph
  }

  // Replace in the full text
  const newText = fullText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))

  // Now replace back into the paragraph, putting all text in the first run
  let result = paragraph
  let replaced = false

  for (const run of runMatches) {
    if (!replaced && run.includes(placeholder.substring(0, 10))) {
      // Replace placeholder in first matching run
      const textRunMatch = run.match(/<w:t[^>]*>[^<]*<\/w:t>/)
      if (textRunMatch) {
        const newRun = run.replace(/<w:t[^>]*>[^<]*<\/w:t>/, `<w:t>${newText}</w:t>`)
        result = result.replace(run, newRun)
        replaced = true
      }
    } else if (replaced) {
      // Remove other runs that contained placeholder text
      if (run.match(/<w:t[^>]*>[^<]*<\/w:t>/) && result.includes(run)) {
        result = result.replace(run, '<w:r></w:r>')
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

  // Split by paragraphs
  const paragraphs = result.split(/<w:p>/)
  const newParagraphs = [''] // Keep the part before first paragraph

  for (let i = 1; i < paragraphs.length; i++) {
    let paragraph = '<w:p>' + paragraphs[i]

    // Try to replace placeholders in this paragraph
    for (const [placeholder, value] of Object.entries(placeholders)) {
      paragraph = replacePlaceholdersInRuns(paragraph, placeholder, value)
      // Also try simple replacement as fallback
      paragraph = paragraph.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
    }

    newParagraphs.push(paragraph)
  }

  result = newParagraphs.join('')

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
    })

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    // Read the template DOCX
    const zip = new AdmZip(templatePath)

    // Find and modify document.xml
    let documentXml = zip.readAsText('word/document.xml')
    console.error(`[fillTemplate] Loaded document.xml, size: ${documentXml.length}`)

    // Replace placeholders in document content
    const originalXml = documentXml
    documentXml = replacePlaceholders(documentXml, surveyData)

    if (documentXml === originalXml) {
      console.error('[fillTemplate] WARNING: No replacements were made!')
    } else {
      console.error('[fillTemplate] Replacements completed')
    }

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

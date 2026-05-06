import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function fetchImageAsBuffer(url) {
  try {
    console.error(`[fetchImage] Fetching: ${url.substring(0, 80)}...`)
    const response = await fetch(url, { timeout: 10000 })
    if (!response.ok) {
      console.error(`[fetchImage] HTTP ${response.status}`)
      return null
    }
    const buffer = await response.buffer()
    console.error(`[fetchImage] Success, size: ${buffer.length} bytes`)
    return buffer
  } catch (err) {
    console.error(`[fetchImage] Error: ${err.message}`)
    return null
  }
}

function getImageExtension(url) {
  if (url.toLowerCase().includes('.png')) return 'png'
  if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) return 'jpg'
  if (url.toLowerCase().includes('.gif')) return 'gif'
  if (url.toLowerCase().includes('.webp')) return 'webp'
  return 'jpg' // default
}

function replacePlaceholdersInRuns(paragraph, placeholder, value) {
  const runMatches = paragraph.match(/<w:r>[\s\S]*?<\/w:r>/g) || []
  let fullText = ''

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

  const newText = fullText.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
  let result = paragraph
  let replaced = false

  for (const run of runMatches) {
    if (!replaced && run.includes(placeholder.substring(0, 10))) {
      const textRunMatch = run.match(/<w:t[^>]*>[^<]*<\/w:t>/)
      if (textRunMatch) {
        const newRun = run.replace(/<w:t[^>]*>[^<]*<\/w:t>/, `<w:t>${newText}</w:t>`)
        result = result.replace(run, newRun)
        replaced = true
      }
    } else if (replaced) {
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

  const paragraphs = result.split(/<w:p>/)
  const newParagraphs = ['']

  for (let i = 1; i < paragraphs.length; i++) {
    let paragraph = '<w:p>' + paragraphs[i]

    for (const [placeholder, value] of Object.entries(placeholders)) {
      paragraph = replacePlaceholdersInRuns(paragraph, placeholder, value)
      paragraph = paragraph.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value))
    }

    newParagraphs.push(paragraph)
  }

  result = newParagraphs.join('')
  return result
}

async function addImagesToDocument(zip, documentXml, surveyData) {
  console.error('[addImages] Starting to add images to document')

  const images = [...(surveyData.images || []), ...(surveyData.scans || [])]
  console.error(`[addImages] Total images to add: ${images.length}`)

  if (images.length === 0) {
    console.error('[addImages] No images to add')
    return documentXml
  }

  // Get the media folder
  let mediaFolder = zip.getEntry('word/media/')
  if (!mediaFolder) {
    zip.addFile('word/media/', '')
  }

  // Get existing relationships
  let relsXml = ''
  try {
    relsXml = zip.readAsText('word/_rels/document.xml.rels')
  } catch (err) {
    console.error('[addImages] Could not read document.xml.rels')
    return documentXml
  }

  let maxRelId = 1
  const relIdMatches = relsXml.match(/Id="rId(\d+)"/g) || []
  for (const match of relIdMatches) {
    const num = parseInt(match.replace(/\D/g, ''))
    if (num > maxRelId) maxRelId = num
  }

  let result = documentXml
  let imageCount = 0

  // Add images after the last paragraph
  for (const imageUrl of images) {
    if (!imageUrl) continue

    const imageData = await fetchImageAsBuffer(imageUrl)
    if (!imageData) {
      console.error(`[addImages] Skipping image: ${imageUrl.substring(0, 50)}`)
      continue
    }

    const ext = getImageExtension(imageUrl)
    const imageId = `image${++imageCount}`
    const fileName = `${imageId}.${ext}`
    const relId = `rId${++maxRelId}`

    // Add image to media folder
    zip.addFile(`word/media/${fileName}`, imageData)
    console.error(`[addImages] Added ${fileName}`)

    // Add relationship
    const relEntry = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`
    relsXml = relsXml.replace('</Relationships>', `  ${relEntry}\n</Relationships>`)

    // Add image to document - insert before closing document tag
    const imageWidth = 5 // inches
    const imageHeight = 4 // inches
    const emuWidth = Math.round(imageWidth * 914400)
    const emuHeight = Math.round(imageHeight * 914400)

    const imagePara = `<w:p>
      <w:r>
        <w:drawing>
          <wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="column"><wp:align>center</wp:align></wp:positionH>
            <wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>
            <wp:extent cx="${emuWidth}" cy="${emuHeight}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:wrapNone/>
            <wp:docPr id="${imageCount}" name="Image ${imageCount}"/>
            <wp:cNvGraphicFramePr/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="${imageCount}" name="Image ${imageCount}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuWidth}" cy="${emuHeight}"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>
      </w:r>
    </w:p>`

    result = result.replace('</w:document>', `${imagePara}\n</w:document>`)
  }

  // Update relationships file
  if (imageCount > 0) {
    zip.updateFile('word/_rels/document.xml.rels', Buffer.from(relsXml, 'utf8'))
  }

  console.error(`[addImages] Added ${imageCount} images total`)
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
    console.error(`[fillTemplate] Loaded document.xml, size: ${documentXml.length}`)

    // Replace text placeholders
    documentXml = replacePlaceholders(documentXml, surveyData)

    // Add images to document
    documentXml = await addImagesToDocument(zip, documentXml, surveyData)

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

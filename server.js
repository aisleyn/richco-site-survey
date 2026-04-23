import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3002

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.post('/api/fill-template', async (req, res) => {
  try {
    const { surveyData } = req.body

    if (!surveyData) {
      return res.status(400).json({ error: 'surveyData required' })
    }

    console.log('Received request to fill template:', surveyData.projectName)

    // Create a temporary directory for the output
    const tmpDir = os.tmpdir()
    const outputFileName = `report-${Date.now()}.docx`
    const outputPath = path.join(tmpDir, outputFileName)

    // Paths
    const templatePath = path.join(__dirname, 'public', 'Survey_Report_Template.docx')
    const scriptPath = path.join(__dirname, 'scripts', 'fill_template.py')

    console.log('Template path:', templatePath)
    console.log('Script path:', scriptPath)
    console.log('Output path:', outputPath)

    // Verify template exists
    if (!fs.existsSync(templatePath)) {
      console.error('Template not found at:', templatePath)
      return res.status(404).json({ error: 'Template not found' })
    }

    console.log('Starting Python process...')
    // Call Python script
    const python = spawn('python3', [scriptPath, templatePath, outputPath, JSON.stringify(surveyData)])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
      console.log('Python stdout:', data.toString())
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      console.error('Python stderr:', data.toString())
    })

    python.on('error', (err) => {
      console.error('Failed to spawn Python:', err)
      res.status(500).json({ error: `Failed to spawn Python: ${err.message}` })
    })

    python.on('close', (code) => {
      console.log('Python process closed with code:', code)

      if (code !== 0) {
        console.error('Python error:', stderr)
        return res.status(500).json({ error: `Template generation failed: ${stderr}` })
      }

      try {
        // Read the generated file
        const fileContent = fs.readFileSync(outputPath)

        // Clean up temp file
        fs.unlinkSync(outputPath)

        // Send file as response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        res.setHeader('Content-Disposition', `attachment; filename="${surveyData.projectName}_${surveyData.areaName}_Report.docx"`)
        res.send(fileContent)
      } catch (err) {
        console.error('File read error:', err)
        res.status(500).json({ error: 'Failed to read generated file' })
      }
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

const server = app.listen(PORT, () => {
  console.log(`Template server running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  console.error('Server error:', err)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

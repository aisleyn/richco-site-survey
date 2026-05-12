import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import dotenv from 'dotenv'
import { spawn, spawnSync } from 'child_process'
import { fillTemplate } from './scripts/fillTemplateNode.js'

// Load environment variables from .env file
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002

// Log to file as well as console
const logFile = path.join(__dirname, 'template-server.log')
const logStream = fs.createWriteStream(logFile, { flags: 'a' })

function log(msg) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${msg}\n`
  process.stderr.write(line)
  logStream.write(line)
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Import Supabase admin client
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

function fillTemplateWithPython(templatePath, outputPath, surveyData, logger) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scripts', 'fill_template.py')

    if (!fs.existsSync(scriptPath)) {
      reject(new Error('Python script not found'))
      return
    }

    const args = [scriptPath, templatePath, outputPath]
    const python = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    const surveyDataJson = JSON.stringify(surveyData)
    logger('[Python] Survey data size:', surveyDataJson.length, 'bytes')

    python.stdin.write(surveyDataJson)
    python.stdin.end()

    python.stdout.on('data', (data) => {
      stdout += data.toString()
      logger('[Python] stdout:', data.toString())
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      logger('[Python] stderr:', data.toString())
    })

    python.on('error', (err) => {
      logger('[Python] Failed to spawn:', err.message)
      reject(err)
    })

    python.on('close', (code) => {
      logger('[Python] Exit code:', code)
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`))
      } else {
        resolve()
      }
    })
  })
}

app.post('/api/fill-template', async (req, res) => {
  const tmpOutputPath = path.join(os.tmpdir(), `report-${Date.now()}.docx`)

  try {
    const { surveyData } = req.body

    if (!surveyData) {
      return res.status(400).json({ error: 'surveyData required' })
    }

    log('Received request to fill template:', surveyData.projectName)

    const templatePath = path.join(__dirname, 'public', 'Survey_Report_Template.docx')
    log('Template path:', templatePath)
    log('Output path:', tmpOutputPath)

    // Verify template exists
    if (!fs.existsSync(templatePath)) {
      log('Template not found at:', templatePath)
      return res.status(404).json({ error: 'Template not found' })
    }

    // Try Python first (if available), fall back to Node.js
    let usedPython = false

    try {
      log('Attempting to use Python for template fill...')
      const pythonCheck = spawnSync('python3', ['-c', 'import docx'], { encoding: 'utf-8' })

      if (pythonCheck.status === 0) {
        log('Python and docx module available, using Python script')
        await fillTemplateWithPython(templatePath, tmpOutputPath, surveyData, log)
        usedPython = true
      } else {
        log('Python docx module not available, using Node.js fallback')
      }
    } catch (pythonErr) {
      log('Python not available, using Node.js fallback:', pythonErr.message)
    }

    // Fall back to Node.js if Python didn't work
    if (!usedPython) {
      log('Starting template fill with Node.js...')
      await fillTemplate(templatePath, tmpOutputPath, surveyData)
    }

    try {
      // Check if output file exists
      if (!fs.existsSync(tmpOutputPath)) {
        log('ERROR: Output file does not exist:', tmpOutputPath)
        return res.status(500).json({ error: `Output file not created: ${tmpOutputPath}` })
      }

      // Read the generated file
      const fileContent = fs.readFileSync(tmpOutputPath)
      log('Output file size:', fileContent.length, 'bytes')

      if (fileContent.length === 0) {
        log('ERROR: Output file is empty')
        return res.status(500).json({ error: 'Generated file is empty' })
      }

      // Send file as response
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename="${surveyData.projectName}_${surveyData.areaName}_Report.docx"`)
      log('Sending response with file')
      res.send(fileContent)
    } catch (err) {
      log('File read/send error:', err.message)
      log('Full error:', err)
      res.status(500).json({ error: `Failed to send file: ${err.message}` })
    }
  } catch (error) {
    log('Template fill error:', error.message)
    log('Full error:', error)
    res.status(500).json({ error: `Template generation failed: ${error.message}` })
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tmpOutputPath)) {
        fs.unlinkSync(tmpOutputPath)
        log('Temp file cleaned up')
      }
    } catch (err) {
      log('Warning: Could not clean up temp file:', err.message)
    }
  }
})

app.post('/api/reset-password', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env' })
  }

  try {
    const { user_id, new_password } = req.body

    if (!user_id || !new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'user_id and password (min 8 chars) required' })
    }

    log('Resetting password for user:', user_id)

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    })

    if (error) {
      log('Password reset error:', error.message)
      return res.status(400).json({ error: error.message })
    }

    log('Password reset successfully for user:', user_id)
    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    log('Password reset exception:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/delete-user-by-email', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    log('Deleting user with email:', email)

    // List all users and find by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      log('Error listing users:', listError.message)
      return res.status(400).json({ error: listError.message })
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (error) {
      log('Error deleting user:', error.message)
      return res.status(400).json({ error: error.message })
    }

    log('User deleted successfully:', email)
    res.json({ success: true, message: `User ${email} deleted successfully` })
  } catch (error) {
    log('Delete user exception:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get surveys by linked waypoint IDs (for clients with RLS restrictions)
app.post('/api/surveys-by-ids', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' })
  }

  try {
    const { surveyIds } = req.body

    if (!surveyIds || !Array.isArray(surveyIds) || surveyIds.length === 0) {
      return res.status(400).json({ error: 'surveyIds array required' })
    }

    log('Fetching surveys:', surveyIds.length, 'IDs')

    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .in('id', surveyIds)
      .order('created_at', { ascending: false })

    if (error) {
      log('Error fetching surveys:', error.message)
      return res.status(400).json({ error: error.message })
    }

    log('Surveys fetched:', data?.length || 0)
    res.json({ surveys: data || [] })
  } catch (error) {
    log('Surveys fetch exception:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single survey with all related data (bypass RLS for clients)
app.get('/api/survey-detail/:surveyId', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' })
  }

  try {
    const { surveyId } = req.params

    if (!surveyId) {
      return res.status(400).json({ error: 'surveyId required' })
    }

    log('Fetching survey detail:', surveyId)

    // Fetch survey
    const { data: survey, error: surveyError } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single()

    if (surveyError) {
      log('Error fetching survey:', surveyError.message)
      return res.status(404).json({ error: 'Survey not found' })
    }

    // Fetch survey updates
    const { data: updates, error: updatesError } = await supabaseAdmin
      .from('survey_updates')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true })

    if (updatesError) {
      log('Error fetching survey updates:', updatesError.message)
      return res.status(400).json({ error: updatesError.message })
    }

    // Fetch media for survey
    const { data: media, error: mediaError } = await supabaseAdmin
      .from('survey_media')
      .select('*')
      .eq('survey_id', surveyId)
      .order('uploaded_at', { ascending: true })

    if (mediaError) {
      log('Error fetching survey media:', mediaError.message)
      return res.status(400).json({ error: mediaError.message })
    }

    // Fetch update media
    const updateIds = (updates || []).map(u => u.id)
    let updateMedia = []
    if (updateIds.length > 0) {
      const { data: uMedia, error: uMediaError } = await supabaseAdmin
        .from('survey_update_media')
        .select('*')
        .in('survey_update_id', updateIds)
        .order('uploaded_at', { ascending: true })

      if (uMediaError) {
        log('Error fetching survey update media:', uMediaError.message)
        return res.status(400).json({ error: uMediaError.message })
      }
      updateMedia = uMedia || []
    }

    log('Survey detail fetched successfully')
    res.json({
      survey,
      updates,
      media,
      updateMedia,
    })
  } catch (error) {
    log('Survey detail fetch exception:', error)
    res.status(500).json({ error: error.message })
  }
})

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')))

// SPA fallback: serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const server = app.listen(PORT, () => {
  log(`Template server running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  log('Server error:', JSON.stringify(err, null, 2))
  if (err.code === 'EADDRINUSE') {
    log(`Port ${PORT} is already in use. Try killing the process or using a different port.`)
  }
})

process.on('uncaughtException', (err) => {
  log('Uncaught exception:', err)
})

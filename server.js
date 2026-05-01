import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3002

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

app.post('/api/fill-template', async (req, res) => {
  try {
    const { surveyData } = req.body

    if (!surveyData) {
      return res.status(400).json({ error: 'surveyData required' })
    }

    log('Received request to fill template:', surveyData.projectName)

    // Create a temporary directory for the output
    const tmpDir = os.tmpdir()
    const outputFileName = `report-${Date.now()}.docx`
    const outputPath = path.join(tmpDir, outputFileName)

    // Paths
    const templatePath = path.join(__dirname, 'public', 'Survey_Report_Template.docx')
    const scriptPath = path.join(__dirname, 'scripts', 'fill_template.py')

    log('Template path:', templatePath)
    log('Script path:', scriptPath)
    log('Output path:', outputPath)

    // Verify template exists
    if (!fs.existsSync(templatePath)) {
      log('Template not found at:', templatePath)
      return res.status(404).json({ error: 'Template not found' })
    }

    log('Starting Python process...')

    // Call Python script with template and output paths only
    // Data will be passed via stdin to avoid CLI arg size issues
    const args = [scriptPath, templatePath, outputPath]
    log('Spawning Python with args:', args)

    const python = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    // Send survey data to Python via stdin as soon as process starts
    const surveyDataJson = JSON.stringify(surveyData)
    log('Survey data size:', surveyDataJson.length, 'bytes')

    python.stdin.write(surveyDataJson)
    python.stdin.end()

    python.stdout.on('data', (data) => {
      stdout += data.toString()
      log('Python stdout:', data.toString())
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
      log('Python stderr:', data.toString())
    })

    python.on('error', (err) => {
      log('Failed to spawn Python:', err.message)
      log('Error code:', err.code)
      log('Error details:', err)
      res.status(500).json({ error: `Failed to spawn Python: ${err.message}` })
    })

    python.on('close', (code) => {
      log('Python process closed with code:', code)
      log('Python stdout:', stdout)
      log('Python stderr:', stderr)

      if (code !== 0) {
        log('Python error - exit code:', code)
        log('Error output:', stderr)
        return res.status(500).json({ error: `Template generation failed: ${stderr}` })
      }

      try {
        // Check if output file exists
        if (!fs.existsSync(outputPath)) {
          log('ERROR: Output file does not exist:', outputPath)
          return res.status(500).json({ error: `Output file not created: ${outputPath}` })
        }

        // Read the generated file
        const fileContent = fs.readFileSync(outputPath)
        log('Output file size:', fileContent.length, 'bytes')

        if (fileContent.length === 0) {
          log('ERROR: Output file is empty')
          return res.status(500).json({ error: 'Generated file is empty' })
        }

        // Clean up temp file
        fs.unlinkSync(outputPath)
        log('Output file cleaned up')

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
    })
  } catch (error) {
    log('Error:', error)
    res.status(500).json({ error: error.message })
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

interface WaypointHistoryEntry {
  status: string
  date: string
  notes: string | null
}

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
  pdfs?: string[]
  clientName: string
  waypointLocation?: {
    areaName: string
    pageNumber: number
    pageLabel: string
    xPercent: number
    yPercent: number
    screenshot: string
  }
  waypointHistory?: WaypointHistoryEntry[]
}

export async function generateSurveyFromTemplate(surveyData: SurveyData) {
  try {
    // On localhost, use port 3002; on production/Azure, use current origin
    const templateUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3002'
      : window.location.origin
    const response = await fetch(`${templateUrl}/api/fill-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyData }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate report')
    }

    // Get the file blob
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${surveyData.projectName}_${surveyData.areaName}_Report.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating report from template:', error)
    throw error
  }
}

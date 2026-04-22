import { supabase } from '../lib/supabase'
import type { ClientSubmission } from '../types'

export async function sendClientSubmissionEmail(
  staffEmail: string,
  projectName: string,
  clientName: string,
  submission: ClientSubmission,
): Promise<void> {
  // Call Supabase edge function to send email via Resend
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: staffEmail,
      subject: `New Repair Request: ${projectName}`,
      html: generateSubmissionEmailHTML(projectName, clientName, submission),
    },
  })

  if (error) throw new Error(`Failed to send email: ${error.message}`)
}

function generateSubmissionEmailHTML(
  projectName: string,
  clientName: string,
  submission: ClientSubmission,
): string {
  const submittedDate = new Date(submission.submitted_at).toLocaleDateString()

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f7f8fa;
    }
    .header {
      background-color: #ffffff;
      padding: 30px 20px;
      border-radius: 8px 8px 0 0;
      border-bottom: 3px solid #F59E0B;
    }
    .header h1 {
      margin: 0;
      color: #1e293b;
      font-size: 24px;
    }
    .content {
      background-color: #ffffff;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .detail {
      margin: 16px 0;
      padding: 12px;
      background-color: #f0f1f4;
      border-radius: 6px;
      border-left: 4px solid #F59E0B;
    }
    .detail-label {
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .detail-value {
      color: #1e293b;
      font-size: 14px;
    }
    .notes {
      margin-top: 20px;
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .notes-label {
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .notes-content {
      color: #1e293b;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .button {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #F59E0B;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 New Repair Request</h1>
    </div>
    <div class="content">
      <p>A client has submitted a new repair request for your project.</p>

      <div class="detail">
        <div class="detail-label">Project</div>
        <div class="detail-value">${projectName}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Client</div>
        <div class="detail-value">${clientName}</div>
      </div>

      <div class="detail">
        <div class="detail-label">Submitted</div>
        <div class="detail-value">${submittedDate}</div>
      </div>

      <div class="notes">
        <div class="notes-label">Repair Request Notes</div>
        <div class="notes-content">${submission.notes || '(No notes provided)'}</div>
      </div>

      <a href="https://richco-site-survey.vercel.app/staff" class="button">
        View in Dashboard
      </a>

      <div class="footer">
        <p>© 2026 Richco Site Survey. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

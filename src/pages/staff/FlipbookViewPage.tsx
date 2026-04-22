import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProjectById } from '../../services/projects'
import { getReportPagesByProject } from '../../services/reportPages'
import { Flipbook } from '../../components/flipbook'
import type { Project, ReportPage } from '../../types'
import { Button, Spinner, Card } from '../../components/ui'

export default function FlipbookViewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [pages, setPages] = useState<ReportPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, reportPages] = await Promise.all([
        getProjectById(projectId),
        getReportPagesByProject(projectId),
      ])
      setProject(p)
      setPages(reportPages)

      // Generate shareable URL (in real app, would create signed token)
      const baseUrl = window.location.origin
      setShareUrl(`${baseUrl}/#/client?projectId=${projectId}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{project.name} — Flipbook View</h1>
          <p className="text-secondary mt-1">Preview how clients will see this report</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowShareModal(true)}
          >
            Share Link
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(`/staff/projects/${projectId}`)}
          >
            Back
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <Card>
          <p className="text-center text-secondary py-12">
            No published reports yet. Create surveys and publish them to see them here.
          </p>
        </Card>
      ) : (
        <Flipbook pages={pages} />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Share Flipbook</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-secondary"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-secondary mb-4">
              Share this link with your client to let them view the report:
            </p>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4">
              <code className="text-xs text-white break-all">{shareUrl}</code>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                alert('Link copied to clipboard!')
              }}
            >
              Copy Link
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}

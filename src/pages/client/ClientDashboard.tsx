import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { getReportPagesByProject } from '../../services/reportPages'
import { Flipbook } from '../../components/flipbook'
import { Button, Spinner } from '../../components/ui'
import type { ReportPage } from '../../types'
import AnimatedBackground from '../../components/dashboard/AnimatedBackground'

export default function ClientDashboard() {
  const { profile } = useAuthStore()
  const [pages, setPages] = useState<ReportPage[]>([])
  const [stats, setStats] = useState({
    activeProjects: 0,
    surveysFiled: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const isStaff = profile?.role === 'richco_staff'

  useEffect(() => {
    if (profile?.project_id || isStaff) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [profile, isStaff])

  const loadData = async () => {
    if (!profile?.project_id) return
    try {
      const data = await getReportPagesByProject(profile.project_id)
      setPages(data)
      setStats({
        activeProjects: 1,
        surveysFiled: data.length,
      })
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

  if (!profile?.project_id && !isStaff) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-light text-white mb-4" style={{ fontFamily: '"Syne", sans-serif' }}>Access Restricted</h1>
            <p className="text-secondary mb-8">Your account does not have access to a project yet. Please contact support.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      {/* Scan line animation */}
      <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, rgba(239, 68, 68, 0.5), transparent)', animation: 'scan-line 8s linear infinite', zIndex: 5 }}></div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-8">

          {/* Main content */}
          <div className="max-w-2xl w-full text-center">
            {/* Logo */}
            <img src="/richco-logo.png" alt="Richco" className="h-40 w-auto mx-auto mb-8" />

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-light tracking-tight text-white mb-6" style={{ fontFamily: '"Syne", sans-serif' }}>
              Your Site Surveys
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-secondary mb-12 font-medium leading-relaxed">
              Richco Site Surveys and Client Repair Requests
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/client/submit" className="w-full sm:w-auto">
                <Button className="w-full px-8 py-3 bg-white text-black hover:bg-gray-100 font-medium rounded-lg transition-colors">
                  Submit Repair Request
                </Button>
              </Link>
            </div>

            {/* Floating stat nodes */}
            <div className="relative h-48 flex items-center justify-center">
              {/* Left node */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform -translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Active Projects</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.activeProjects}</p>
              </div>

              {/* Right node */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Reports Received</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.surveysFiled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        {pages.length > 0 && (
          <div className="py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: '"Syne", sans-serif' }}>Project Reports</h2>
              <Flipbook pages={pages} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {pages.length === 0 && (
          <div className="py-20 px-6">
            <div className="max-w-2xl mx-auto bg-elevated border-2 border-white rounded-lg p-12 text-center">
              <p className="text-secondary text-lg">No reports available yet. Check back soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

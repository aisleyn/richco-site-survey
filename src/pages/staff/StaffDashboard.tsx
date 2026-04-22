import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapIcon, FileTextIcon, InboxIcon } from 'lucide-react'
import { Button } from '../../components/ui'
import { getProjects } from '../../services/projects'
import { getSurveysByProject } from '../../services/surveys'
import { getSubmissionsByWaypoint } from '../../services/clientSubmissionsRest'
import AnimatedBackground from '../../components/dashboard/AnimatedBackground'

interface DashboardStats {
  activeProjects: number
  openRepairs: number
  surveysThisMonth: number
  completed: number
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    openRepairs: 0,
    surveysThisMonth: 0,
    completed: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const projects = await getProjects()
        const thisMonth = new Date()
        thisMonth.setDate(1)

        let totalSurveys = 0
        let surveyCount = 0
        let completed = 0
        let openRepairs = 0

        for (const project of projects) {
          const surveys = await getSurveysByProject(project.id)
          totalSurveys += surveys.length

          const thisMonthSurveys = surveys.filter(s => new Date(s.created_at) >= thisMonth)
          surveyCount += thisMonthSurveys.length

          const completedSurveys = surveys.filter(s => s.status === 'published')
          completed += completedSurveys.length
        }

        // Count client submissions (repair requests) from all projects
        for (const project of projects) {
          const surveys = await getSurveysByProject(project.id)
          for (const survey of surveys) {
            try {
              const submissions = await getSubmissionsByWaypoint(survey.id)
              openRepairs += submissions.length
            } catch (e) {
              // Continue if survey has no submissions
            }
          }
        }

        setStats({
          activeProjects: projects.length,
          openRepairs: openRepairs,
          surveysThisMonth: surveyCount,
          completed: completed,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      {/* Scan line animation */}
      <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, rgba(239, 68, 68, 0.5), transparent)', animation: 'scan-line 8s linear infinite', zIndex: 5 }}></div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-8">

          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            {/* Left curves */}
            <path d="M 100 200 Q 300 300 600 400" stroke="url(#lineGradient)" strokeWidth="1" fill="none" />
            <path d="M 150 600 Q 350 400 600 500" stroke="url(#lineGradient)" strokeWidth="1" fill="none" />
            {/* Right curves */}
            <path d="M 1400 250 Q 1100 350 600 400" stroke="url(#lineGradient)" strokeWidth="1" fill="none" />
            <path d="M 1350 650 Q 1050 450 600 500" stroke="url(#lineGradient)" strokeWidth="1" fill="none" />
          </svg>

          {/* Main content */}
          <div className="max-w-2xl w-full text-center">
            {/* Logo */}
            <img src="/richco-logo.png" alt="Richco" className="h-40 w-auto mx-auto mb-8" />

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-light tracking-tight text-white mb-6" style={{ fontFamily: '"Syne", sans-serif' }}>
              Richco Site Survey
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-secondary mb-12 font-medium leading-relaxed">
              Richco Site Surveys and Client Repair Requests
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/staff/projects" className="w-full sm:w-auto">
                <Button className="w-full px-8 py-3 bg-white text-black hover:bg-gray-100 font-medium rounded-lg transition-colors">
                  Open Dashboard
                </Button>
              </Link>
              <Link to="/client" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full px-8 py-3 border border-white text-white hover:bg-white/10 font-medium rounded-lg transition-colors">
                  Client Portal
                </Button>
              </Link>
            </div>

            {/* Floating stat nodes */}
            <div className="relative h-80 flex items-center justify-center">
              {/* Left nodes */}
              <div className="absolute left-0 top-10 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform -translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Active Projects</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.activeProjects}</p>
              </div>

              <div className="absolute left-0 bottom-0 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform -translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Open Repairs</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.openRepairs}</p>
              </div>

              {/* Right nodes */}
              <div className="absolute right-0 top-10 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Surveys This Month</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.surveysThisMonth}</p>
              </div>

              <div className="absolute right-0 bottom-0 bg-elevated border-2 border-white rounded-lg px-6 py-4 text-left transform translate-x-1/3 hover:border-white/80 transition-colors">
                <p className="text-white text-sm font-medium uppercase tracking-wider">Completed</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Field Map Card */}
              <Link to="/staff/projects" className="group">
                <div className="bg-elevated border-2 border-white rounded-lg p-8 hover:border-white/80 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <div className="mb-4">
                    <MapIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: '"Syne", sans-serif' }}>Field Map</h3>
                  <p className="text-secondary text-sm mb-6">Interactive site maps and waypoint management</p>
                  <span className="text-white text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">View Maps →</span>
                </div>
              </Link>

              {/* Survey Reports Card */}
              <Link to="/staff/reports" className="group">
                <div className="bg-elevated border-2 border-white rounded-lg p-8 hover:border-white/80 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <div className="mb-4">
                    <FileTextIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: '"Syne", sans-serif' }}>Survey Reports</h3>
                  <p className="text-secondary text-sm mb-6">Generated reports and documentation</p>
                  <span className="text-white text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">View Reports →</span>
                </div>
              </Link>

              {/* Client Submissions Card */}
              <Link to="/staff/projects" className="group">
                <div className="bg-elevated border-2 border-white rounded-lg p-8 hover:border-white/80 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <div className="mb-4">
                    <InboxIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: '"Syne", sans-serif' }}>Client Submissions</h3>
                  <p className="text-secondary text-sm mb-6">Repair requests and project submissions</p>
                  <span className="text-white text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">View Submissions →</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { TopNav } from './TopNav'
import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-base" style={{ background: 'linear-gradient(135deg, #080808 0%, #080808 100%), radial-gradient(ellipse 800px 600px at 20% 30%, rgba(76, 110, 100, 0.15) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(71, 85, 105, 0.12) 0%, transparent 65%)', backgroundAttachment: 'fixed' }}>
      <TopNav />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { onAuthStateChange } from './services/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import { router } from './router'

function App() {
  const { initializeAuth, setProfile } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth()
      } catch (err) {
        console.error('Auth initialization error:', err)
      }
    }

    init()

    const unsubscribe = onAuthStateChange((_session, profile) => {
      if (profile) {
        setProfile(profile)
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

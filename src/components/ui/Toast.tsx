import { useEffect, useState, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

export function Toast({ message, type = 'info', duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const typeStyles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
    warning: '⚠',
  }

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 max-w-sm p-4 rounded-lg border animate-slide-up',
        typeStyles[type],
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icons[type]}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-auto text-current opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Toast context for global notifications
interface ToastMessage extends ToastProps {
  id: string
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (props: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (props: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { ...props, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context.addToast
}

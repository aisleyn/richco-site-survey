import { useState, useRef, useEffect } from 'react'

interface ActionItem {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

interface CollapsibleActionMenuProps {
  actions: ActionItem[]
  className?: string
}

export function CollapsibleActionMenu({ actions, className }: CollapsibleActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        console.log('Click outside detected, closing menu')
        localStorage.setItem('debug-menu-close', `Click outside at ${new Date().toISOString()}`)
        setIsOpen(false)
      }
    }

    if (isOpen) {
      console.log('Menu opened, adding click outside listener')
      localStorage.setItem('debug-menu-open', `Menu opened at ${new Date().toISOString()}`)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getButtonClass = (variant?: string) => {
    const baseClass = 'w-full px-4 py-2 rounded text-sm font-medium transition-colors text-left flex items-center gap-2'
    switch (variant) {
      case 'primary':
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`
      case 'danger':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700`
      default:
        return `${baseClass} bg-slate-700 text-white hover:bg-slate-600`
    }
  }

  return (
    <div ref={menuRef} className={`relative ${className || ''}`}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Menu button clicked, isOpen:', isOpen)
          localStorage.setItem('debug-menu-button', `Menu clicked, isOpen was ${isOpen}`)
          setIsOpen(!isOpen)
        }}
        className="flex items-center justify-center p-2 text-white hover:opacity-80 transition-opacity"
        title="Actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded shadow-xl z-10">
          <div className="p-2 space-y-1">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  console.log('Action clicked:', action.label)
                  localStorage.setItem('debug-menu', `Action clicked: ${action.label}`)
                  e.stopPropagation()
                  action.onClick()
                  setIsOpen(false)
                }}
                className={getButtonClass(action.variant)}
              >
                {action.icon && <span>{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

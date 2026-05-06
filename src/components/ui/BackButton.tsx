import { useNavigate } from 'react-router-dom'
import { Button } from './Button'

interface BackButtonProps {
  label?: string
  className?: string
}

export function BackButton({ label = 'Back', className = '' }: BackButtonProps) {
  const navigate = useNavigate()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className={`gap-2 ${className}`}
      title="Go back to previous page"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

import { Card, Button } from './index'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <div className="text-center py-12">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-600 mb-6 max-w-xs mx-auto">{description}</p>
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  )
}

import clsx from 'clsx'

type BadgeVariant = 'draft' | 'published' | 'needs_repair' | 'in_progress' | 'completed' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variantClasses = {
    draft: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    published: 'bg-green-50 text-green-800 border border-green-200',
    needs_repair: 'bg-red-900 text-red-100 border border-red-700',
    in_progress: 'bg-amber-50 text-amber-800 border border-amber-200',
    completed: 'bg-green-50 text-green-800 border border-green-200',
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
  }

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

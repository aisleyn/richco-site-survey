import { forwardRef } from 'react'
import clsx from 'clsx'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 border border-slate-200 rounded-lg text-black placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent',
          'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
          'resize-vertical',
          error && 'border-red-300 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
})

Textarea.displayName = 'Textarea'

import { forwardRef } from 'react'
import clsx from 'clsx'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <select
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 border border-slate-200 rounded-lg text-white bg-black',
            'focus:outline-none focus:ring-2 focus:ring-brand-amber focus:border-transparent',
            'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
            error && 'border-red-300 focus:ring-red-500',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'

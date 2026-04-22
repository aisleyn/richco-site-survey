import { forwardRef } from 'react'
import clsx from 'clsx'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, children, className, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200'

    const variantClasses = {
      primary: 'bg-white hover:bg-gray-100 text-black disabled:bg-gray-300 disabled:text-gray-500',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:bg-white/5 disabled:text-white/40',
      ghost: 'text-white hover:bg-white/10 disabled:text-white/40',
      danger: 'bg-red-700 hover:bg-red-600 text-white disabled:bg-red-600 disabled:text-red-300',
    }

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

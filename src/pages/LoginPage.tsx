import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuthStore } from '../store/authStore'
import { Button, Input, Card } from '../components/ui'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    try {
      const result = await signIn(data.email, data.password)
      const route = result.profile?.role === 'client' ? '/client' : '/staff'
      navigate(route)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #080808 0%, #080808 100%), radial-gradient(ellipse 800px 600px at 20% 30%, rgba(76, 110, 100, 0.15) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(71, 85, 105, 0.12) 0%, transparent 65%)', backgroundAttachment: 'fixed' }}>
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/richco-logo.png" alt="Richco" className="h-24 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: '"Syne", sans-serif' }}>Richco Site Survey</h1>
          <p className="text-secondary">Sign in to your account</p>
        </div>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary uppercase">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-secondary text-center">
            Demo credentials: Use any email with password at least 8 characters for testing
          </p>
        </div>
      </Card>
    </div>
  )
}

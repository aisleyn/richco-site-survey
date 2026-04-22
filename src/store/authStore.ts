import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '../types'
import { signIn, signOut, getSession } from '../services/auth'

interface AuthStore {
  session: { user: { id: string; email: string } } | null
  profile: Profile | null
  isLoading: boolean
  error: string | null

  signIn: (email: string, password: string) => Promise<{ session: { user: { id: string; email: string } } | null; profile: Profile | null }>
  signOut: () => Promise<void>
  initializeAuth: () => Promise<void>
  setProfile: (profile: Profile) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      isLoading: true,
      error: null,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const result = await signIn(email, password)
          set({ session: result.session, profile: result.profile, isLoading: false })
          return result
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign in failed'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      signOut: async () => {
        set({ isLoading: true, error: null })
        try {
          await signOut()
          set({ session: null, profile: null, isLoading: false })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign out failed'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true })
        try {
          const { session, profile } = await getSession()
          set({ session, profile, isLoading: false })
        } catch (err) {
          set({ session: null, profile: null, isLoading: false })
        }
      },

      setProfile: (profile: Profile) => {
        set({ profile })
      },

      clearAuth: () => {
        set({ session: null, profile: null, error: null })
      },
    }),
    {
      name: 'richco-auth-store',
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
      }),
    },
  ),
)

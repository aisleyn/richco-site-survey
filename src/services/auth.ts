import type { Profile } from '../types'

export async function signIn(
  email: string,
  password: string,
): Promise<{ session: { user: { id: string; email: string } } | null; profile: Profile | null }> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error_description || data.message || 'Auth failed')
  }

  if (!data.user) {
    throw new Error('No user returned from auth')
  }

  // Store auth token for subsequent API calls
  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (projectId && data.access_token) {
    const sbKey = `sb-${projectId}-auth-token`
    localStorage.setItem(sbKey, JSON.stringify({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_at: Date.now() + (data.expires_in * 1000),
      refresh_token: data.refresh_token,
      user: data.user,
    }))
  }

  let profile = await getProfileById(data.user.id)

  if (!profile) {
    // Try one more time with a fresh fetch before creating default
    await new Promise(resolve => setTimeout(resolve, 100))
    profile = await getProfileById(data.user.id)
  }

  if (!profile) {
    profile = await createDefaultProfile(data.user.id, email)
  }

  if (profile?.archived) {
    throw new Error('This account has been archived. Please contact your administrator.')
  }

  return {
    session: {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    },
    profile,
  }
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('auth-token')
}

export async function getSession(): Promise<{ session: { user: { id: string; email: string } } | null; profile: Profile | null }> {
  return { session: null, profile: null }
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
    let token: string | null = null

    if (projectId) {
      const sbKey = `sb-${projectId}-auth-token`
      const raw = localStorage.getItem(sbKey)
      token = raw ? JSON.parse(raw)?.access_token ?? null : null
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    )
    const data = await response.json()
    return data.length > 0 ? data[0] : null
  } catch (err) {
    return null
  }
}

export async function assignVendorToClient(userId: string, vendorId: string): Promise<Profile | null> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
    let token: string | null = null

    if (projectId) {
      const sbKey = `sb-${projectId}-auth-token`
      const raw = localStorage.getItem(sbKey)
      token = raw ? JSON.parse(raw)?.access_token ?? null : null
    }

    // Get vendor's first project (default assignment)
    const vendorProjectsResp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/vendor_projects?vendor_id=eq.${vendorId}&limit=1`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    )
    const vendorProjects = await vendorProjectsResp.json()
    const assignedProjectId = vendorProjects.length > 0 ? vendorProjects[0].project_id : null

    // Update profile with vendor and project
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          vendor_id: vendorId,
          project_id: assignedProjectId,
        }),
      }
    )
    const data = await response.json()
    return data.length > 0 ? data[0] : null
  } catch (err) {
    return null
  }
}

export function onAuthStateChange(
  _callback: (session: { user: { id: string; email: string } } | null, profile: Profile | null) => void,
) {
  return () => {}
}

async function createDefaultProfile(userId: string, email: string): Promise<Profile | null> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
    let token: string | null = null

    if (projectId) {
      const sbKey = `sb-${projectId}-auth-token`
      const raw = localStorage.getItem(sbKey)
      token = raw ? JSON.parse(raw)?.access_token ?? null : null
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles`,
      {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: userId,
          email,
          role: 'client',
          full_name: email.split('@')[0],
        }),
      }
    )
    const data = await response.json()
    return data.length > 0 ? data[0] : data
  } catch (err) {
    return null
  }
}

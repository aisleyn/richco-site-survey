export function getAuthHeaders(): HeadersInit {
  // Try Supabase SDK key first
  let token: string | null = null

  const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  if (projectId) {
    const sbKey = `sb-${projectId}-auth-token`
    const raw = localStorage.getItem(sbKey)
    token = raw ? JSON.parse(raw)?.access_token ?? null : null
  }

  // Fallback to Zustand store if no token found
  if (!token) {
    const raw = localStorage.getItem('richco-auth-store')
    token = raw ? JSON.parse(raw)?.state?.session?.access_token ?? null : null
  }

  return {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function supabaseRestUrl(path: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${path}`
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  }

  console.log('apiFetch:', {
    path,
    method: options.method || 'GET',
    hasAuthToken: !!(headers as Record<string, string>).Authorization,
  })

  const response = await fetch(supabaseRestUrl(path), {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('apiFetch error:', { status: response.status, error })
    throw new Error(error.message || `API error: ${response.status}`)
  }

  return response.json()
}

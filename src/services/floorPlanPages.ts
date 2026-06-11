import { apiFetch } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import type { FloorPlanPage } from '../types'

export async function getFloorPlanPagesByProject(projectId: string, zoneId?: string): Promise<FloorPlanPage[]> {
  try {
    // For clients, use the RLS bypass endpoint
    const profile = useAuthStore.getState().profile
    if (profile?.role === 'client') {
      const response = await fetch(`/api/floor-plan-pages/${projectId}`)
      if (!response.ok) {
        console.warn('Floor plan pages RLS bypass failed, falling back to direct query')
      } else {
        let data = await response.json()
        if (zoneId) {
          data = data.filter((p: any) => p.subcategory_id === zoneId)
        }
        return data || []
      }
    }
  } catch (err) {
    console.warn('Error using floor plan RLS bypass:', err)
  }

  // Fallback to direct Supabase query
  let query = `floor_plan_pages?project_id=eq.${projectId}&order=page_number.asc`
  if (zoneId) {
    query += `&subcategory_id=eq.${zoneId}`
  }
  const data = await apiFetch<FloorPlanPage[]>(query)
  return data || []
}

export async function createFloorPlanPage(
  projectId: string,
  pageNumber: number,
  label: string,
  imageUrl: string,
  subcategoryId?: string,
): Promise<FloorPlanPage> {
  const body: any = {
    project_id: projectId,
    page_number: pageNumber,
    label: label || `Page ${pageNumber}`,
    image_url: imageUrl,
  }
  if (subcategoryId) {
    body.subcategory_id = subcategoryId
  }
  const data = await apiFetch<FloorPlanPage[]>(
    'floor_plan_pages',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body),
    }
  )
  return data[0]
}

export async function updateFloorPlanPage(
  id: string,
  label: string,
): Promise<FloorPlanPage> {
  const data = await apiFetch<FloorPlanPage[]>(
    `floor_plan_pages?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ label }),
    }
  )
  return data[0]
}

export async function deleteFloorPlanPage(id: string): Promise<void> {
  await apiFetch(`floor_plan_pages?id=eq.${id}`, { method: 'DELETE' })
}

export async function deleteAllFloorPlanPages(projectId: string): Promise<void> {
  await apiFetch(`floor_plan_pages?project_id=eq.${projectId}`, { method: 'DELETE' })
}

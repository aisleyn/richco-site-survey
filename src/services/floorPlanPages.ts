import { apiFetch } from '../lib/api'
import type { FloorPlanPage } from '../types'

export async function getFloorPlanPagesByProject(projectId: string, zoneId?: string): Promise<FloorPlanPage[]> {
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

import { apiFetch } from '../lib/api'
import type { FloorPlanPage } from '../types'

export async function getFloorPlanPagesByProject(projectId: string): Promise<FloorPlanPage[]> {
  const data = await apiFetch<FloorPlanPage[]>(
    `floor_plan_pages?project_id=eq.${projectId}&order=page_number.asc`
  )
  return data || []
}

export async function createFloorPlanPage(
  projectId: string,
  pageNumber: number,
  label: string,
  imageUrl: string,
): Promise<FloorPlanPage> {
  const data = await apiFetch<FloorPlanPage[]>(
    'floor_plan_pages',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        project_id: projectId,
        page_number: pageNumber,
        label: label || `Page ${pageNumber}`,
        image_url: imageUrl,
      }),
    }
  )
  return data[0]
}

export async function deleteFloorPlanPage(id: string): Promise<void> {
  await apiFetch(`floor_plan_pages?id=eq.${id}`, { method: 'DELETE' })
}

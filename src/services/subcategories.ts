import { apiFetch } from '../lib/api'
import type { ProjectSubcategory } from '../types'

export async function getSubcategoriesByProject(projectId: string): Promise<ProjectSubcategory[]> {
  return await apiFetch<ProjectSubcategory[]>(
    `project_subcategories?project_id=eq.${projectId}&order=created_at.asc`,
  ) || []
}

export async function createSubcategory(projectId: string, name: string): Promise<ProjectSubcategory> {
  const data = await apiFetch<ProjectSubcategory[]>('project_subcategories', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ project_id: projectId, name }),
  })
  return data[0]
}

export async function deleteSubcategory(id: string): Promise<void> {
  await apiFetch(`project_subcategories?id=eq.${id}`, { method: 'DELETE' })
}

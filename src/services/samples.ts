import { apiFetch } from '../lib/api'
import type { Sample, SampleStatus } from '../types'

export async function getSamplesByProject(projectId: string): Promise<Sample[]> {
  const data = await apiFetch<Sample[]>(
    `samples?project_id=eq.${projectId}&order=created_at.desc`
  )
  return data || []
}

export async function getSampleById(sampleId: string): Promise<Sample> {
  const data = await apiFetch<Sample[]>(
    `samples?id=eq.${sampleId}`
  )
  return data[0]
}

interface SampleFormData {
  title: string
  image_url: string | null
  product_details: string | null
  process_details: string | null
  proposal: string | null
}

export async function createSample(
  projectId: string,
  data: SampleFormData,
  userId: string,
): Promise<Sample> {
  const result = await apiFetch<Sample[]>(
    'samples',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        project_id: projectId,
        title: data.title,
        image_url: data.image_url,
        product_details: data.product_details,
        process_details: data.process_details,
        proposal: data.proposal,
        created_by: userId,
      }),
    }
  )
  return result[0]
}

export async function updateSampleStatus(
  sampleId: string,
  status: SampleStatus,
): Promise<Sample> {
  const data = await apiFetch<Sample[]>(
    `samples?id=eq.${sampleId}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status }),
    }
  )
  return data[0]
}

export async function deleteSample(sampleId: string): Promise<void> {
  await apiFetch(`samples?id=eq.${sampleId}`, { method: 'DELETE' })
}

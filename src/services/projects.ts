import { supabase } from '../lib/supabase'
import type { Project, ProjectFormValues } from '../types'

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getProjectById(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProject(values: ProjectFormValues): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        name: values.name,
        client_id: 'f8c5ffd1-202b-4ade-94db-088494aa1ad5',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

import { supabase } from '../lib/supabase'
import type { ProjectRoom } from '../types'

/**
 * Get all rooms for a specific zone (subcategory)
 */
export async function getRoomsByZone(subcategoryId: string): Promise<ProjectRoom[]> {
  const { data, error } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('room_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getRoomsByZone] Error:', error)
    throw error
  }

  return data || []
}

/**
 * Get all rooms for a specific project
 */
export async function getRoomsByProject(projectId: string): Promise<ProjectRoom[]> {
  const { data, error } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('room_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[getRoomsByProject] Error:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single room by ID
 */
export async function getRoomById(roomId: string): Promise<ProjectRoom | null> {
  const { data, error } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected if room doesn't exist)
    console.error('[getRoomById] Error:', error)
    throw error
  }

  return data || null
}

/**
 * Create a new room within a zone
 */
export async function createRoom(
  projectId: string,
  subcategoryId: string,
  name: string,
  description?: string,
  roomOrder?: number
): Promise<ProjectRoom> {
  const { data, error } = await supabase
    .from('project_rooms')
    .insert({
      project_id: projectId,
      subcategory_id: subcategoryId,
      name: name.trim(),
      description: description?.trim() || null,
      room_order: roomOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[createRoom] Error:', error)
    throw error
  }

  return data
}

/**
 * Update a room
 */
export async function updateRoom(
  roomId: string,
  updates: Partial<Omit<ProjectRoom, 'id' | 'project_id' | 'subcategory_id' | 'created_at'>>
): Promise<ProjectRoom> {
  const { data, error } = await supabase
    .from('project_rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single()

  if (error) {
    console.error('[updateRoom] Error:', error)
    throw error
  }

  return data
}

/**
 * Delete a room
 * Note: Surveys/pages/samples/waypoints linked to this room will have room_id set to NULL
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('project_rooms')
    .delete()
    .eq('id', roomId)

  if (error) {
    console.error('[deleteRoom] Error:', error)
    throw error
  }
}

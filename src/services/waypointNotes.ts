import { supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'

export interface WaypointNote {
  id: string
  waypoint_id: string
  user_id: string
  user_name?: string
  user_role?: string
  content: string
  created_at: string
}

export async function getWaypointNotes(waypointId: string): Promise<WaypointNote[]> {
  const { data, error } = await supabase
    .from('waypoint_notes')
    .select('*')
    .eq('waypoint_id', waypointId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching waypoint notes:', error)
    return []
  }
  return data || []
}

export async function createWaypointNote(
  waypointId: string,
  userId: string,
  userName: string,
  userRole: string,
  content: string,
): Promise<WaypointNote | null> {
  const { data, error } = await supabase
    .from('waypoint_notes')
    .insert([
      {
        waypoint_id: waypointId,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        content,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error creating waypoint note:', error)
    return null
  }
  return data
}

export function formatNoteDate(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

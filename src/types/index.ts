// Types as string unions instead of enums (better tree-shaking)
export type UserRole = 'richco_staff' | 'client'
export type MediaType = 'image' | 'video' | '3d_scan' | 'pdf'
export type SurveyStatus = 'draft' | 'published'
export type WaypointStatus = 'needs_repair' | 'in_progress' | 'completed'
export type WaypointPhotoType = 'before' | 'after' | 'progress' | 'general'

export const UserRole = {
  STAFF: 'richco_staff' as const,
  CLIENT: 'client' as const,
}

export const MediaType = {
  IMAGE: 'image' as const,
  VIDEO: 'video' as const,
  SCAN_3D: '3d_scan' as const,
  PDF: 'pdf' as const,
}

export const SurveyStatus = {
  DRAFT: 'draft' as const,
  PUBLISHED: 'published' as const,
}

export const WaypointStatus = {
  NEEDS_REPAIR: 'needs_repair' as const,
  IN_PROGRESS: 'in_progress' as const,
  COMPLETED: 'completed' as const,
}

// Database Models
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  vendor_id: string | null
  project_id: string | null
  created_at: string
  archived?: boolean
}

export interface Project {
  id: string
  name: string
  client_id: string | null
  map_image_url: string | null
  created_at: string
  archived?: boolean
}

export interface Survey {
  id: string
  project_id: string
  created_by: string
  created_at: string
  project_name: string
  client_name: string
  area_name: string
  survey_date: string
  area_size_sqft: number | null
  survey_notes: string | null
  suggested_system: string | null
  install_notes: string | null
  status: SurveyStatus
}

export interface SurveyMedia {
  id: string
  survey_id: string
  media_type: MediaType
  file_url: string
  uploaded_at: string
}

export interface ReportPage {
  id: string
  project_id: string
  page_number: number
  published_at: string
  month_tag: string
  survey_ids: string[]
  staff_notes: string | null
}

export interface ClientSubmission {
  id: string
  project_id: string
  submitted_by: string
  submitted_at: string
  notes: string
  waypoint_id: string | null
}

export interface ClientSubmissionMedia {
  id: string
  submission_id: string
  media_type: MediaType
  file_url: string
}

export interface MapWaypoint {
  id: string
  project_id: string
  area_name: string
  x_percent: number
  y_percent: number
  status: WaypointStatus
  linked_survey_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  repair_notes: string | null
}

export interface WaypointRepairHistory {
  id: string
  waypoint_id: string
  project_id: string
  old_status: WaypointStatus | null
  new_status: WaypointStatus
  changed_by: string
  changed_at: string
  notes: string | null
  survey_id: string | null
}

export interface WaypointPhoto {
  id: string
  waypoint_id: string
  project_id: string
  submitted_by: string
  file_url: string
  caption: string | null
  photo_type: WaypointPhotoType
  submitted_at: string
}

export interface SurveyUpdate {
  id: string
  survey_id: string
  waypoint_id: string | null
  update_notes: string | null
  area_name: string | null
  area_size_sqft: number | null
  suggested_system: string | null
  install_notes: string | null
  updated_by: string | null
  updated_at: string
}

export interface SurveyUpdateMedia {
  id: string
  survey_update_id: string
  media_type: string
  file_url: string
  uploaded_at: string
}

// Form Types
export interface SurveyFormValues {
  project_id: string
  client_name: string
  area_name: string
  survey_date: string
  area_size_sqft: number | null
  survey_notes: string
  suggested_system: string
  install_notes: string
  images: File[]
  scans_3d: File[]
  videos: File[]
}

export interface ProjectFormValues {
  name: string
}

export interface ClientSubmissionFormValues {
  area_name: string
  notes: string
  images: File[]
  videos: File[]
}

// Auth Types
export interface AuthSession {
  user: {
    id: string
    email: string
  }
}

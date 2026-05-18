-- ============================================================
-- 016_add_project_type_and_zone_status.sql
-- Adds project_type to projects and status to project_subcategories
-- ============================================================

-- Add project_type to projects
ALTER TABLE public.projects
  ADD COLUMN project_type TEXT NOT NULL DEFAULT 'maintenance'
  CHECK (project_type IN ('maintenance', 'development'));

-- All existing projects become maintenance (DEFAULT handles this)
UPDATE public.projects SET project_type = 'maintenance' WHERE project_type IS NULL;

-- Add status to project_subcategories (zone status for development projects)
ALTER TABLE public.project_subcategories
  ADD COLUMN status TEXT NOT NULL DEFAULT 'concept'
  CHECK (status IN ('concept', 'in_development', 'approved', 'denied', 'on_hold'));

-- Add waypoint_type to map_waypoints
ALTER TABLE public.map_waypoints
  ADD COLUMN waypoint_type TEXT NOT NULL DEFAULT 'repair'
  CHECK (waypoint_type IN ('repair', 'new_work'));

-- Add work_completed field for development waypoints
ALTER TABLE public.map_waypoints
  ADD COLUMN work_completed TEXT;

-- ============================================================
-- 021_add_project_completed_at.sql
-- Adds completed_at field to track project completion date
-- ============================================================

-- Add completed_at column to projects
ALTER TABLE public.projects
  ADD COLUMN completed_at TIMESTAMPTZ;

-- Update CHECK constraint to reflect full set of valid types
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_project_type_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_project_type_check
    CHECK (project_type IN ('new_project', 'in_development', 'maintenance', 'completed'));

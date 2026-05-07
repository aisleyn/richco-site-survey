-- ============================================================
-- FIX FLOOR PLAN PAGES RLS POLICY
-- Update to use client_id from projects table instead of
-- deprecated current_client_project_id() function
-- ============================================================

-- Drop old policy that uses removed function
DROP POLICY IF EXISTS "client_read_floor_plan_pages" ON public.floor_plan_pages;

-- Create new policy that uses client_id
CREATE POLICY "client_read_floor_plan_pages"
  ON public.floor_plan_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = floor_plan_pages.project_id
        AND p.client_id = auth.uid()
    )
  );

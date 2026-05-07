-- ============================================================
-- FIX CLIENT PROJECT LINKING - Remove vendor system,
-- use direct client_id linking in projects table
-- ============================================================

-- Drop old policies that use project_id from profiles
DROP POLICY IF EXISTS "client_read_own_project" ON public.projects;
DROP POLICY IF EXISTS "client_read_published_surveys" ON public.surveys;
DROP POLICY IF EXISTS "client_read_survey_media" ON public.survey_media;
DROP POLICY IF EXISTS "client_read_report_pages" ON public.report_pages;
DROP POLICY IF EXISTS "client_insert_submission" ON public.client_submissions;
DROP POLICY IF EXISTS "client_read_own_submissions" ON public.client_submissions;
DROP POLICY IF EXISTS "client_read_waypoints" ON public.map_waypoints;

-- Drop old helper function
DROP FUNCTION IF EXISTS public.current_client_project_id();

-- ============================================================
-- NEW POLICIES: Use client_id from projects table
-- ============================================================

-- Clients: read projects where they are the client_id
CREATE POLICY "client_read_own_projects"
  ON public.projects FOR SELECT
  USING (client_id = auth.uid());

-- Clients: read published surveys for their projects
CREATE POLICY "client_read_surveys"
  ON public.surveys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = surveys.project_id
        AND p.client_id = auth.uid()
    )
    AND status = 'published'
  );

-- Clients: read media for surveys on their projects
CREATE POLICY "client_read_media"
  ON public.survey_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      JOIN public.projects p ON s.project_id = p.id
      WHERE s.id = survey_media.survey_id
        AND p.client_id = auth.uid()
        AND s.status = 'published'
    )
  );

-- Clients: read report pages for their projects
CREATE POLICY "client_read_reports"
  ON public.report_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = report_pages.project_id
        AND p.client_id = auth.uid()
    )
  );

-- Clients: submit requests to their projects
CREATE POLICY "client_insert_requests"
  ON public.client_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.client_id = auth.uid()
    )
  );

-- Clients: read their own submissions
CREATE POLICY "client_read_requests"
  ON public.client_submissions FOR SELECT
  USING (submitted_by = auth.uid());

-- Clients: read waypoints for their projects
CREATE POLICY "client_read_project_waypoints"
  ON public.map_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = map_waypoints.project_id
        AND p.client_id = auth.uid()
    )
  );

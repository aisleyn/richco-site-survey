-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_submission_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_waypoints         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get caller's role from profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- HELPER FUNCTION: get caller's assigned project_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_client_project_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT project_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- PROFILES
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_profiles"
  ON public.profiles FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Users can always read and update their own profile
CREATE POLICY "own_profile_read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "own_profile_update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- PROJECTS
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_projects"
  ON public.projects FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read only their assigned project
CREATE POLICY "client_read_own_project"
  ON public.projects FOR SELECT
  USING (id = public.current_client_project_id());

-- ============================================================
-- SURVEYS
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_surveys"
  ON public.surveys FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read published surveys for their project only
CREATE POLICY "client_read_published_surveys"
  ON public.surveys FOR SELECT
  USING (
    project_id = public.current_client_project_id()
    AND status = 'published'
  );

-- ============================================================
-- SURVEY MEDIA
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_survey_media"
  ON public.survey_media FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read media for published surveys on their project
CREATE POLICY "client_read_survey_media"
  ON public.survey_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_media.survey_id
        AND s.project_id = public.current_client_project_id()
        AND s.status = 'published'
    )
  );

-- ============================================================
-- REPORT PAGES
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_report_pages"
  ON public.report_pages FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read report pages for their project
CREATE POLICY "client_read_report_pages"
  ON public.report_pages FOR SELECT
  USING (project_id = public.current_client_project_id());

-- ============================================================
-- CLIENT SUBMISSIONS
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_client_submissions"
  ON public.client_submissions FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: insert and read their own submissions for their project
CREATE POLICY "client_insert_submission"
  ON public.client_submissions FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND project_id = public.current_client_project_id()
  );

CREATE POLICY "client_read_own_submissions"
  ON public.client_submissions FOR SELECT
  USING (submitted_by = auth.uid());

-- ============================================================
-- CLIENT SUBMISSION MEDIA
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_submission_media"
  ON public.client_submission_media FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: insert/read media for their own submissions
CREATE POLICY "client_insert_submission_media"
  ON public.client_submission_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_submissions cs
      WHERE cs.id = client_submission_media.submission_id
        AND cs.submitted_by = auth.uid()
    )
  );

CREATE POLICY "client_read_submission_media"
  ON public.client_submission_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_submissions cs
      WHERE cs.id = client_submission_media.submission_id
        AND cs.submitted_by = auth.uid()
    )
  );

-- ============================================================
-- MAP WAYPOINTS
-- ============================================================

-- Staff: full access
CREATE POLICY "staff_all_waypoints"
  ON public.map_waypoints FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read waypoints for their project
CREATE POLICY "client_read_waypoints"
  ON public.map_waypoints FOR SELECT
  USING (project_id = public.current_client_project_id());

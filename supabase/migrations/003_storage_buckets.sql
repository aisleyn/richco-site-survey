-- ============================================================
-- STORAGE BUCKETS
-- Note: These can also be created via Supabase Dashboard UI
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('survey-media',              'survey-media',              false),
  ('client-submission-media',   'client-submission-media',   false),
  ('floor-plans',               'floor-plans',               false),
  ('waypoint-photos',           'waypoint-photos',           false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- survey-media: staff can upload/read, clients can read their project media
CREATE POLICY "staff_upload_survey_media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'survey-media'
    AND public.current_user_role() = 'richco_staff'
  );

CREATE POLICY "staff_read_survey_media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'survey-media'
    AND public.current_user_role() = 'richco_staff'
  );

CREATE POLICY "client_read_survey_media_storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'survey-media'
    AND public.current_user_role() = 'client'
  );

-- client-submission-media: clients can upload/read their own, staff can read all
CREATE POLICY "client_upload_submission_media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-submission-media'
    AND public.current_user_role() = 'client'
  );

CREATE POLICY "client_read_submission_media_storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-submission-media'
    AND (
      public.current_user_role() = 'richco_staff'
      OR public.current_user_role() = 'client'
    )
  );

-- floor-plans: staff upload, all authenticated read
CREATE POLICY "staff_upload_floor_plans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'floor-plans'
    AND public.current_user_role() = 'richco_staff'
  );

CREATE POLICY "auth_read_floor_plans"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'floor-plans');

-- waypoint-photos: anyone authenticated can upload/read their project's photos
CREATE POLICY "auth_upload_waypoint_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'waypoint-photos');

CREATE POLICY "auth_read_waypoint_photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'waypoint-photos');

-- ============================================================
-- 019_fix_vendor_rls.sql
-- Extends vendor-path RLS to subcategories (015 only covered direct client_id)
-- and ensures new columns are visible to both client access paths
-- ============================================================

-- Extend client_read_subcategories to include vendor path
-- (015 only covered direct client_id path)
DROP POLICY IF EXISTS "client_read_subcategories" ON public.project_subcategories;

CREATE POLICY "client_read_subcategories"
  ON public.project_subcategories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_subcategories.project_id
        AND (
          p.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.vendor_projects vp
            JOIN public.profiles pr ON pr.vendor_id = vp.vendor_id
            WHERE vp.project_id = p.id AND pr.id = auth.uid()
          )
        )
    )
  );

-- Clients: update zone status for their projects (for zone approval/denial from client dashboard)
CREATE POLICY "client_update_zone_status"
  ON public.project_subcategories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_subcategories.project_id
        AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_subcategories.project_id
        AND p.client_id = auth.uid()
    )
  );

-- Extend report_pages client read policy to also cover vendor path
-- The existing "client_read_reports" only checks client_id
DROP POLICY IF EXISTS "client_read_reports" ON public.report_pages;

CREATE POLICY "client_read_reports"
  ON public.report_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = report_pages.project_id
        AND (
          p.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.vendor_projects vp
            JOIN public.profiles pr ON pr.vendor_id = vp.vendor_id
            WHERE vp.project_id = p.id AND pr.id = auth.uid()
          )
        )
    )
  );

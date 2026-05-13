-- ============================================================
-- 015_add_subcategories.sql
-- Adds project_subcategories table and subcategory_id FK
-- to surveys and map_waypoints for zone/queue organization
-- ============================================================

CREATE TABLE public.project_subcategories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, name)
);

-- Add subcategory_id to surveys
ALTER TABLE public.surveys
  ADD COLUMN subcategory_id UUID
    REFERENCES public.project_subcategories(id)
    ON DELETE SET NULL;

-- Add subcategory_id to map_waypoints
ALTER TABLE public.map_waypoints
  ADD COLUMN subcategory_id UUID
    REFERENCES public.project_subcategories(id)
    ON DELETE SET NULL;

-- Enable RLS on project_subcategories
ALTER TABLE public.project_subcategories ENABLE ROW LEVEL SECURITY;

-- Staff: full access to all subcategories
CREATE POLICY "staff_all_subcategories"
  ON public.project_subcategories FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read subcategories for their assigned project
CREATE POLICY "client_read_subcategories"
  ON public.project_subcategories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_subcategories.project_id
        AND p.client_id = auth.uid()
    )
  );

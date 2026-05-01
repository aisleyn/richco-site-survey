-- Create floor_plan_pages table
CREATE TABLE public.floor_plan_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add floor_plan_page_id to map_waypoints
ALTER TABLE public.map_waypoints
  ADD COLUMN floor_plan_page_id UUID REFERENCES public.floor_plan_pages(id) ON DELETE SET NULL;

-- Enable RLS on floor_plan_pages
ALTER TABLE public.floor_plan_pages ENABLE ROW LEVEL SECURITY;

-- Staff: full access
CREATE POLICY "staff_all_floor_plan_pages"
  ON public.floor_plan_pages FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read pages for their project
CREATE POLICY "client_read_floor_plan_pages"
  ON public.floor_plan_pages FOR SELECT
  USING (project_id = public.current_client_project_id());

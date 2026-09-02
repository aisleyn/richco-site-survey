-- ============================================================
-- 024_add_project_rooms.sql
-- Adds room hierarchy within zones for in_development projects
-- ============================================================

CREATE TABLE public.project_rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subcategory_id  UUID NOT NULL REFERENCES public.project_subcategories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'concept'
    CHECK (status IN ('concept', 'in_development', 'approved', 'denied', 'on_hold')),
  room_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subcategory_id, name)
);

-- Indexes for common queries
CREATE INDEX idx_project_rooms_project_id ON public.project_rooms(project_id);
CREATE INDEX idx_project_rooms_subcategory_id ON public.project_rooms(subcategory_id);
CREATE INDEX idx_project_rooms_project_subcategory ON public.project_rooms(project_id, subcategory_id, room_order);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_project_rooms_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_rooms_updated_at_trigger
  BEFORE UPDATE ON public.project_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_project_rooms_updated_at();

-- Enable RLS
ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;

-- Staff: full access
CREATE POLICY "staff_all_rooms"
  ON public.project_rooms FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read rooms for their assigned project
CREATE POLICY "client_read_rooms"
  ON public.project_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_rooms.project_id
        AND p.client_id = auth.uid()
    )
  );

-- ============================================================
-- MAP WAYPOINTS ENHANCEMENTS
-- ============================================================

-- Add timestamps and creator tracking to waypoints
ALTER TABLE public.map_waypoints
  ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN repair_notes TEXT;

-- ============================================================
-- WAYPOINT REPAIR HISTORY
-- Tracks all status changes with dates and user information
-- ============================================================

CREATE TABLE public.waypoint_repair_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waypoint_id       UUID NOT NULL REFERENCES public.map_waypoints(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  old_status        waypoint_status,
  new_status        waypoint_status NOT NULL,
  changed_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT
);

-- Create index for quick lookups
CREATE INDEX idx_waypoint_repair_history_waypoint_id ON public.waypoint_repair_history(waypoint_id);
CREATE INDEX idx_waypoint_repair_history_project_id ON public.waypoint_repair_history(project_id);

-- ============================================================
-- WAYPOINT PHOTOS
-- Stores evidence photos tied to specific waypoints
-- ============================================================

CREATE TABLE public.waypoint_photos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  waypoint_id       UUID NOT NULL REFERENCES public.map_waypoints(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url          TEXT NOT NULL,
  caption           TEXT,
  photo_type        TEXT DEFAULT 'general', -- 'before', 'after', 'progress', 'general'
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX idx_waypoint_photos_waypoint_id ON public.waypoint_photos(waypoint_id);
CREATE INDEX idx_waypoint_photos_project_id ON public.waypoint_photos(project_id);

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

-- Enable RLS
ALTER TABLE public.waypoint_repair_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waypoint_photos ENABLE ROW LEVEL SECURITY;

-- Staff can see all repair history for their projects
CREATE POLICY "Staff can view waypoint repair history" ON public.waypoint_repair_history
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

-- Clients can see repair history for their project
CREATE POLICY "Clients can view own project repair history" ON public.waypoint_repair_history
  FOR SELECT
  TO authenticated
  USING (
    project_id = (SELECT project_id FROM public.profiles WHERE id = auth.uid())
  );

-- Staff can insert repair history
CREATE POLICY "Staff can insert repair history" ON public.waypoint_repair_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
    AND changed_by = auth.uid()
  );

-- Staff can see all waypoint photos
CREATE POLICY "Staff can view waypoint photos" ON public.waypoint_photos
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

-- Clients can see photos for their project
CREATE POLICY "Clients can view own project photos" ON public.waypoint_photos
  FOR SELECT
  TO authenticated
  USING (
    project_id = (SELECT project_id FROM public.profiles WHERE id = auth.uid())
  );

-- Anyone can insert their own waypoint photos
CREATE POLICY "Users can insert waypoint photos" ON public.waypoint_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND project_id = (SELECT project_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- FUNCTION: Update waypoint updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_waypoint_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_map_waypoints_updated_at
  BEFORE UPDATE ON public.map_waypoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waypoint_updated_at();

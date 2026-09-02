-- ============================================================
-- 025_add_room_linkage.sql
-- Adds optional room_id foreign keys to surveys, floor_plan_pages,
-- samples, and map_waypoints for room-level organization
-- ============================================================

-- Add room_id to surveys (optional)
ALTER TABLE public.surveys
  ADD COLUMN room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

-- Add room_id to floor_plan_pages (optional)
ALTER TABLE public.floor_plan_pages
  ADD COLUMN room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

-- Add room_id to samples (optional)
ALTER TABLE public.samples
  ADD COLUMN room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

-- Add room_id to map_waypoints (optional)
ALTER TABLE public.map_waypoints
  ADD COLUMN room_id UUID REFERENCES public.project_rooms(id) ON DELETE SET NULL;

-- Indexes for efficient room filtering
CREATE INDEX idx_surveys_room_id ON public.surveys(project_id, room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_surveys_room_subcategory ON public.surveys(project_id, subcategory_id, room_id);

CREATE INDEX idx_floor_plan_pages_room_id ON public.floor_plan_pages(project_id, room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_floor_plan_pages_room_subcategory ON public.floor_plan_pages(project_id, subcategory_id, room_id);

CREATE INDEX idx_samples_room_id ON public.samples(project_id, room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_samples_room_subcategory ON public.samples(project_id, subcategory_id, room_id);

CREATE INDEX idx_map_waypoints_room_id ON public.map_waypoints(project_id, room_id) WHERE room_id IS NOT NULL;
CREATE INDEX idx_map_waypoints_room_subcategory ON public.map_waypoints(project_id, subcategory_id, room_id);

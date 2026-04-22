-- ============================================================
-- WAYPOINT-SUBMISSION LINKING
-- ============================================================

-- Add waypoint_id column to client_submissions for linking reports to map locations
ALTER TABLE public.client_submissions
  ADD COLUMN waypoint_id UUID REFERENCES public.map_waypoints(id) ON DELETE SET NULL;

-- Create index for efficient lookups (e.g., finding all submissions for a waypoint)
CREATE INDEX idx_client_submissions_waypoint_id ON public.client_submissions(waypoint_id);

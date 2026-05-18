-- ============================================================
-- 017_add_samples.sql
-- Adds samples table for development project concept phase
-- ============================================================

CREATE TABLE public.samples (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  image_url       TEXT,
  product_details TEXT,
  process_details TEXT,
  proposal        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for project lookups
CREATE INDEX idx_samples_project_id ON public.samples(project_id);
CREATE INDEX idx_samples_status ON public.samples(status);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_samples_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER samples_updated_at_trigger
  BEFORE UPDATE ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.update_samples_updated_at();

-- Enable RLS
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;

-- Staff: full access
CREATE POLICY "staff_all_samples"
  ON public.samples FOR ALL
  USING (public.current_user_role() = 'richco_staff')
  WITH CHECK (public.current_user_role() = 'richco_staff');

-- Clients: read samples for their directly-assigned projects
CREATE POLICY "client_read_direct_samples"
  ON public.samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = samples.project_id
        AND p.client_id = auth.uid()
    )
  );

-- Clients: read samples for vendor-assigned projects
CREATE POLICY "client_read_vendor_samples"
  ON public.samples FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_projects vp
      JOIN public.profiles pr ON pr.vendor_id = vp.vendor_id
      WHERE vp.project_id = samples.project_id
        AND pr.id = auth.uid()
    )
  );

-- Clients: update status on samples for their projects (approve/deny)
CREATE POLICY "client_update_sample_status"
  ON public.samples FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = samples.project_id
        AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = samples.project_id
        AND p.client_id = auth.uid()
    )
  );

-- Add samples table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.samples;

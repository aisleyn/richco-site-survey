-- ============================================================
-- VENDORS TABLE
-- ============================================================

CREATE TABLE public.vendors (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENDOR_PROJECTS JUNCTION TABLE (many-to-many)
-- ============================================================

CREATE TABLE public.vendor_projects (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id  UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, project_id)
);

-- ============================================================
-- ADD vendor_id TO PROFILES
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- ============================================================
-- UPDATE RLS FOR VENDOR MANAGEMENT
-- ============================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_projects ENABLE ROW LEVEL SECURITY;

-- Staff can view all vendors
CREATE POLICY vendors_view_all ON public.vendors
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

-- Staff can manage vendors
CREATE POLICY vendors_insert ON public.vendors
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

CREATE POLICY vendors_update ON public.vendors
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

CREATE POLICY vendors_delete ON public.vendors
  FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

-- Staff can manage vendor-project mappings
CREATE POLICY vendor_projects_all ON public.vendor_projects
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'richco_staff'
  );

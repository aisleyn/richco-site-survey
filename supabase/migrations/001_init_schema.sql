-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('richco_staff', 'client');
CREATE TYPE media_type AS ENUM ('image', 'video', '3d_scan');
CREATE TYPE survey_status AS ENUM ('draft', 'published');
CREATE TYPE waypoint_status AS ENUM ('needs_repair', 'in_progress', 'completed');

-- ============================================================
-- PROFILES
-- Extends auth.users. Row is auto-created via trigger on signup.
-- ============================================================

CREATE TABLE public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT,
  role           user_role NOT NULL DEFAULT 'client',
  project_id     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE public.projects (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  client_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  map_image_url  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from profiles → projects
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- ============================================================
-- SURVEYS
-- ============================================================

CREATE TABLE public.surveys (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_name        TEXT NOT NULL,
  client_name         TEXT NOT NULL,
  area_name           TEXT NOT NULL,
  survey_date         DATE NOT NULL,
  area_size_sqft      NUMERIC(10, 2),
  survey_notes        TEXT,
  suggested_system    TEXT,
  install_notes       TEXT,
  status              survey_status NOT NULL DEFAULT 'draft'
);

-- ============================================================
-- SURVEY MEDIA
-- ============================================================

CREATE TABLE public.survey_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id    UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  media_type   media_type NOT NULL,
  file_url     TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORT PAGES
-- ============================================================

CREATE TABLE public.report_pages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_number  INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_tag    TEXT NOT NULL,
  survey_ids   UUID[] NOT NULL DEFAULT '{}',
  staff_notes  TEXT,
  UNIQUE (project_id, month_tag)
);

-- ============================================================
-- CLIENT SUBMISSIONS
-- ============================================================

CREATE TABLE public.client_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);

-- ============================================================
-- CLIENT SUBMISSION MEDIA
-- ============================================================

CREATE TABLE public.client_submission_media (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id  UUID NOT NULL REFERENCES public.client_submissions(id) ON DELETE CASCADE,
  media_type     media_type NOT NULL,
  file_url       TEXT NOT NULL
);

-- ============================================================
-- MAP WAYPOINTS
-- ============================================================

CREATE TABLE public.map_waypoints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  area_name         TEXT NOT NULL,
  x_percent         NUMERIC(5, 2) NOT NULL,
  y_percent         NUMERIC(5, 2) NOT NULL,
  status            waypoint_status NOT NULL DEFAULT 'needs_repair',
  linked_survey_id  UUID REFERENCES public.surveys(id) ON DELETE SET NULL
);

-- ============================================================
-- TRIGGER: auto-create profile row on new auth.users signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

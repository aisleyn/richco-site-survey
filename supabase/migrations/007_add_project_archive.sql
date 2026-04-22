-- Add archived column to projects table
ALTER TABLE public.projects
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering archived projects
CREATE INDEX projects_archived_idx ON public.projects(archived);

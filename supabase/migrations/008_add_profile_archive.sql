-- Add archived column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering archived profiles
CREATE INDEX profiles_archived_idx ON public.profiles(archived);

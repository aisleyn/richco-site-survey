-- ============================================================
-- 018_add_flipbook_chapters.sql
-- Adds chapter break support to report_pages
-- Also adds sample_id linking for samples-as-flipbook-entries
-- ============================================================

ALTER TABLE public.report_pages
  ADD COLUMN is_chapter_break BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN chapter_label    TEXT,
  ADD COLUMN sample_id        UUID REFERENCES public.samples(id) ON DELETE SET NULL;

-- Index for fast chapter break queries
CREATE INDEX idx_report_pages_chapter ON public.report_pages(project_id, is_chapter_break)
  WHERE is_chapter_break = TRUE;

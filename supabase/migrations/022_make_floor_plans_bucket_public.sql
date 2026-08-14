-- ============================================================
-- MAKE ALL MEDIA BUCKETS PUBLIC
-- Set all media buckets to public so images are always
-- accessible without signed URL expiration issues:
-- - floor-plans: Floor plan PDFs converted to images
-- - waypoint-photos: Before/after/progress photos from surveys
-- - survey-media: Survey photos and media
-- - client-submission-media: Client submission photos
-- - sample-media: Sample images and PDF documents
-- ============================================================

UPDATE storage.buckets
SET public = true
WHERE id IN ('floor-plans', 'waypoint-photos', 'survey-media', 'client-submission-media', 'sample-media');

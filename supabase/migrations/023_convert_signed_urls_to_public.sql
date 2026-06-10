-- ============================================================
-- CONVERT EXPIRED SIGNED URLS TO PUBLIC URLS
-- Replace old signed URL format with public URL format so
-- images display even after signed URLs expire (7 days)
-- ============================================================

-- Waypoint photos: convert signed URLs to public URLs
UPDATE public.waypoint_photos
SET file_url = regexp_replace(
  file_url,
  'storage/v1/object/sign/([^/]+)/(.+)\?.*',
  'storage/v1/object/public/\1/\2'
)
WHERE file_url LIKE '%storage/v1/object/sign%';

-- Client submission media: convert signed URLs to public URLs
UPDATE public.client_submission_media
SET file_url = regexp_replace(
  file_url,
  'storage/v1/object/sign/([^/]+)/(.+)\?.*',
  'storage/v1/object/public/\1/\2'
)
WHERE file_url LIKE '%storage/v1/object/sign%';

-- Note: Floor plan pages were already updated in a previous migration
-- but we'll update them too in case any exist with signed URLs
UPDATE public.floor_plan_pages
SET image_url = regexp_replace(
  image_url,
  'storage/v1/object/sign/([^/]+)/(.+)\?.*',
  'storage/v1/object/public/\1/\2'
)
WHERE image_url LIKE '%storage/v1/object/sign%';

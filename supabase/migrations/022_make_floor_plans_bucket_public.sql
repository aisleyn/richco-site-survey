-- ============================================================
-- MAKE FLOOR-PLANS BUCKET PUBLIC
-- Set existing floor-plans bucket to public so images are
-- always accessible without signed URL expiration issues
-- ============================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'floor-plans';

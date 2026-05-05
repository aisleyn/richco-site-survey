-- Add 'archived' status to survey_status enum
ALTER TYPE survey_status ADD VALUE IF NOT EXISTS 'archived';

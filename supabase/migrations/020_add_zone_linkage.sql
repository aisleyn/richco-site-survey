-- Add zone linkage to floor_plan_pages and samples tables
ALTER TABLE floor_plan_pages ADD COLUMN subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE SET NULL;
ALTER TABLE samples ADD COLUMN subcategory_id UUID REFERENCES project_subcategories(id) ON DELETE SET NULL;

-- Add index for zone filtering queries
CREATE INDEX idx_floor_plan_pages_subcategory ON floor_plan_pages(project_id, subcategory_id);
CREATE INDEX idx_samples_subcategory ON samples(project_id, subcategory_id);

-- Rename columns in the domains table to better reflect that we are not performing real availability checks.
-- We now treat these as generated suggestions only.

ALTER TABLE domains RENAME COLUMN available TO suggested;
ALTER TABLE domains RENAME COLUMN checked_at TO generated_at;

-- Drop old index and create new one with better name
DROP INDEX IF EXISTS idx_domains_available_checked;
CREATE INDEX IF NOT EXISTS idx_domains_suggested_generated 
  ON domains(suggested, generated_at DESC);

-- Also rename the meta key for consistency
UPDATE meta SET key = 'last_generated' WHERE key = 'last_refresh';

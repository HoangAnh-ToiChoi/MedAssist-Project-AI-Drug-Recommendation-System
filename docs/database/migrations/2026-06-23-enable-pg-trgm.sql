-- Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for trigram similarity search on drugs table name and generic_name columns
CREATE INDEX IF NOT EXISTS idx_drugs_name_trgm ON drugs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_generic_name_trgm ON drugs USING gin (generic_name gin_trgm_ops);

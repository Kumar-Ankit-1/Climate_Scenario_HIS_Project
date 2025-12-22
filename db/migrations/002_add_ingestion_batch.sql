-- Migration: Add ingestion_batch column
-- Created: 2025-12-22

ALTER TABLE scenario_observations 
ADD COLUMN IF NOT EXISTS ingestion_batch TEXT;

CREATE INDEX IF NOT EXISTS idx_obs_ingestion_batch
  ON scenario_observations (ingestion_batch);

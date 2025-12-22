-- Core table for scenario data
CREATE TABLE IF NOT EXISTS scenario_observations (
  id BIGSERIAL PRIMARY KEY,

  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,

  model TEXT NOT NULL,
  scenario TEXT NOT NULL,
  region TEXT NOT NULL,

  variable TEXT NOT NULL,
  unit TEXT,

  year INTEGER NOT NULL,
  value DOUBLE PRECISION,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT now()
);

-- Variable sematics derived from classified_variables.json
CREATE TABLE IF NOT EXISTS variable_semantics (
  variable TEXT PRIMARY KEY,
  description TEXT,

  sector TEXT NOT NULL,
  industry TEXT,
  subsector TEXT,

  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),

  rationale TEXT,

  source TEXT DEFAULT 'llm',
  reviewed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);


-- Indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_obs_core
  ON scenario_observations (provider, dataset, model, scenario, region);

CREATE INDEX IF NOT EXISTS idx_obs_variable
  ON scenario_observations (variable);

CREATE INDEX IF NOT EXISTS idx_obs_year
  ON scenario_observations (year);

CREATE INDEX IF NOT EXISTS idx_obs_metadata
  ON scenario_observations USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_variable_semantics_sector
  ON variable_semantics (sector);

CREATE INDEX IF NOT EXISTS idx_variable_semantics_industry
  ON variable_semantics (industry);

CREATE INDEX IF NOT EXISTS idx_variable_semantics_confidence
  ON variable_semantics (confidence);

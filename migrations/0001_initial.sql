-- Initial schema for nnole pointless domain explorer

CREATE TABLE domains (
  domain TEXT PRIMARY KEY,
  suggested INTEGER NOT NULL,      -- 1 = we suggested it, 0 = not (legacy)
  generated_at INTEGER NOT NULL    -- unix timestamp in milliseconds
);

CREATE INDEX idx_domains_suggested_generated 
  ON domains(suggested, generated_at DESC);

-- Simple key-value for tracking suggestion generation
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed a starting last_generated so first visitor triggers an initial batch
INSERT INTO meta (key, value) VALUES ('last_generated', '0');

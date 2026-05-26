-- Initial schema for nnole pointless domain explorer

CREATE TABLE domains (
  domain TEXT PRIMARY KEY,
  available INTEGER NOT NULL,   -- 1 = available, 0 = taken/registered
  checked_at INTEGER NOT NULL   -- unix timestamp in milliseconds
);

CREATE INDEX idx_domains_available_checked 
  ON domains(available, checked_at DESC);

-- Simple key-value for tracking last refresh time etc.
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed a starting last_refresh so first visitor triggers an initial batch
INSERT INTO meta (key, value) VALUES ('last_refresh', '0');

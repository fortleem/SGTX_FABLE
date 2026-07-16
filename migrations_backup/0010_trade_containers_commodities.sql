-- Migration 0010: Trade Containers & Container Commodities
-- Supports multi-container trade requests with per-container commodity details,
-- pallet configuration, packaging specs, and exporter quote alternatives.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Trade Containers — one row per container in a trade request
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trade_containers (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT NOT NULL,
  container_index INTEGER NOT NULL DEFAULT 1,
  container_type TEXT NOT NULL DEFAULT '40ft_HC',
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  port_of_discharge TEXT,
  port_of_loading TEXT,
  palletized INTEGER NOT NULL DEFAULT 1,
  pallet_size TEXT DEFAULT '120x100',
  cloned_from_container_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trade_containers_trade ON trade_containers(trade_request_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Trade Container Commodities — one row per commodity in a container
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trade_container_commodities (
  id TEXT PRIMARY KEY,
  trade_container_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  commodity_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  hs_code TEXT,
  product_specification TEXT,
  packaging TEXT NOT NULL DEFAULT 'boxes',
  packaging_custom TEXT,
  num_pallets INTEGER NOT NULL DEFAULT 1,
  quantity REAL,
  unit TEXT DEFAULT 'KG',
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tcc_container ON trade_container_commodities(trade_container_id);
CREATE INDEX IF NOT EXISTS idx_tcc_trade ON trade_container_commodities(trade_request_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Exporter Quote Alternatives — alternative destination pricing
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exporter_quote_alternatives (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  price_per_unit REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eqa_quote ON exporter_quote_alternatives(exporter_quote_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Add port_of_loading to exporter_quotes if not present
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE exporter_quotes ADD COLUMN port_of_loading TEXT;
ALTER TABLE exporter_quotes ADD COLUMN recommended_destinations TEXT;

-- Migration 0020: Part 3 Phase 2 — Seller Quote, Packing & Logistics Orchestration
-- Adds columns and tables needed for the full seller quote workflow per blueprint v6.3
-- Uses safe ADD COLUMN pattern (SQLite ignores duplicate column errors with try/catch in wrangler)

-- ═══════════════════════════════════════════════════════════════════
-- 1. Extend exporter_quotes with Phase 2 fields
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE exporter_quotes ADD COLUMN loading_country TEXT;
ALTER TABLE exporter_quotes ADD COLUMN loading_port TEXT;
ALTER TABLE exporter_quotes ADD COLUMN exw_justification TEXT;
ALTER TABLE exporter_quotes ADD COLUMN exw_deviation_pct REAL;
ALTER TABLE exporter_quotes ADD COLUMN logistics_breakdown TEXT;
ALTER TABLE exporter_quotes ADD COLUMN logistics_mode TEXT DEFAULT 'MANUAL';
ALTER TABLE exporter_quotes ADD COLUMN sgtx_fee_rate REAL;
ALTER TABLE exporter_quotes ADD COLUMN sgtx_fee_amount REAL;
ALTER TABLE exporter_quotes ADD COLUMN total_trade_value REAL;
ALTER TABLE exporter_quotes ADD COLUMN final_quoted_price REAL;
ALTER TABLE exporter_quotes ADD COLUMN multi_shipment_response TEXT;
ALTER TABLE exporter_quotes ADD COLUMN alternative_ports TEXT;
ALTER TABLE exporter_quotes ADD COLUMN packing_plan_id TEXT;
ALTER TABLE exporter_quotes ADD COLUMN submitted_at TEXT;
ALTER TABLE exporter_quotes ADD COLUMN updated_at TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Extend fee_calculations for trade-level fee computation
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE fee_calculations ADD COLUMN trade_request_id TEXT;
ALTER TABLE fee_calculations ADD COLUMN exporter_quote_id TEXT;
ALTER TABLE fee_calculations ADD COLUMN exporter_tenant_id TEXT;
ALTER TABLE fee_calculations ADD COLUMN commodity_hs6 TEXT;
ALTER TABLE fee_calculations ADD COLUMN seller_country TEXT;
ALTER TABLE fee_calculations ADD COLUMN buyer_country TEXT;
ALTER TABLE fee_calculations ADD COLUMN trade_value REAL;
ALTER TABLE fee_calculations ADD COLUMN base_rate REAL;
ALTER TABLE fee_calculations ADD COLUMN country_adjustment REAL DEFAULT 0;
ALTER TABLE fee_calculations ADD COLUMN seasonality_adjustment REAL DEFAULT 0;
ALTER TABLE fee_calculations ADD COLUMN perishability_adjustment REAL DEFAULT 0;
ALTER TABLE fee_calculations ADD COLUMN geopolitics_adjustment REAL DEFAULT 0;
ALTER TABLE fee_calculations ADD COLUMN volume_discount REAL DEFAULT 0;
ALTER TABLE fee_calculations ADD COLUMN final_rate REAL;
ALTER TABLE fee_calculations ADD COLUMN fee_amount REAL;
ALTER TABLE fee_calculations ADD COLUMN model_version TEXT DEFAULT 'xgboost-v1.0';
ALTER TABLE fee_calculations ADD COLUMN created_at TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Extend exporter_quote_alternatives with transit time
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE exporter_quote_alternatives ADD COLUMN transit_days INTEGER;
ALTER TABLE exporter_quote_alternatives ADD COLUMN additional_logistics_cost REAL DEFAULT 0;
ALTER TABLE exporter_quote_alternatives ADD COLUMN additional_logistics_currency TEXT DEFAULT 'USD';

-- ═══════════════════════════════════════════════════════════════════
-- 4. Extend packing_plans with columns not already present
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE packing_plans ADD COLUMN locked_by TEXT;
ALTER TABLE packing_plans ADD COLUMN loom_hash TEXT;
ALTER TABLE packing_plans ADD COLUMN loading_instructions TEXT;
ALTER TABLE packing_plans ADD COLUMN carbon_footprint_kg REAL;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Create EXW price watch table for ±10% deviation alerts
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exw_price_watch (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  locked_price REAL NOT NULL,
  current_market_price REAL,
  deviation_pct REAL,
  alert_triggered INTEGER DEFAULT 0,
  alert_type TEXT,
  seller_action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

-- ═══════════════════════════════════════════════════════════════════
-- 6. Create logistics cost lines table (per-Incoterm breakdown)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS quote_logistics_lines (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  cost_type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_mandatory INTEGER DEFAULT 0,
  is_disabled INTEGER DEFAULT 0,
  provider_quote_id TEXT,
  notes TEXT,
  shipment_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 7. Create seller multi-shipment response table
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seller_shipment_responses (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  shipment_number INTEGER NOT NULL,
  buyer_requested_date TEXT,
  seller_proposed_date TEXT,
  buyer_requested_port TEXT,
  seller_proposed_port TEXT,
  buyer_requested_count INTEGER,
  seller_proposed_count INTEGER,
  logistics_cost REAL DEFAULT 0,
  logistics_currency TEXT DEFAULT 'USD',
  response_type TEXT DEFAULT 'ACCEPT',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 8. Create market price feeds table (for EXW chart)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS market_price_feeds (
  id TEXT PRIMARY KEY,
  commodity_type TEXT NOT NULL,
  hs_code TEXT,
  price_usd REAL NOT NULL,
  source TEXT DEFAULT 'FAO',
  recorded_date TEXT NOT NULL,
  country TEXT,
  unit TEXT DEFAULT 'PER_TON',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 9. Seed market price data (30 days for key commodities)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO market_price_feeds (id, commodity_type, hs_code, price_usd, source, recorded_date, country, unit) VALUES
  ('mpf-001', 'Fresh Fruits', '0805', 850, 'FAO', date('now', '-30 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-002', 'Fresh Fruits', '0805', 855, 'FAO', date('now', '-27 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-003', 'Fresh Fruits', '0805', 862, 'FAO', date('now', '-24 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-004', 'Fresh Fruits', '0805', 870, 'FAO', date('now', '-21 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-005', 'Fresh Fruits', '0805', 858, 'FAO', date('now', '-18 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-006', 'Fresh Fruits', '0805', 845, 'FAO', date('now', '-15 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-007', 'Fresh Fruits', '0805', 865, 'FAO', date('now', '-12 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-008', 'Fresh Fruits', '0805', 878, 'FAO', date('now', '-9 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-009', 'Fresh Fruits', '0805', 882, 'FAO', date('now', '-6 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-010', 'Fresh Fruits', '0805', 875, 'FAO', date('now', '-3 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-011', 'Fresh Fruits', '0805', 880, 'FAO', date('now'), 'GLOBAL', 'PER_TON'),
  ('mpf-012', 'Textiles', '5208', 2200, 'USDA', date('now', '-30 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-013', 'Textiles', '5208', 2180, 'USDA', date('now', '-24 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-014', 'Textiles', '5208', 2220, 'USDA', date('now', '-18 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-015', 'Textiles', '5208', 2250, 'USDA', date('now', '-12 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-016', 'Textiles', '5208', 2230, 'USDA', date('now', '-6 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-017', 'Textiles', '5208', 2240, 'USDA', date('now'), 'GLOBAL', 'PER_TON'),
  ('mpf-018', 'Grains & Cereals', '1001', 320, 'FAO', date('now', '-30 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-019', 'Grains & Cereals', '1001', 315, 'FAO', date('now', '-24 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-020', 'Grains & Cereals', '1001', 325, 'FAO', date('now', '-18 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-021', 'Grains & Cereals', '1001', 330, 'FAO', date('now', '-12 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-022', 'Grains & Cereals', '1001', 328, 'FAO', date('now', '-6 days'), 'GLOBAL', 'PER_TON'),
  ('mpf-023', 'Grains & Cereals', '1001', 335, 'FAO', date('now'), 'GLOBAL', 'PER_TON');

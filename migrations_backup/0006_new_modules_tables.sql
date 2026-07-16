-- ============================================================
-- SGTX PLATFORM v6.2 — Schema Migration 0006
-- Only adds truly NEW tables and columns not in prior migrations
-- ============================================================

-- ============================================================
-- ADD MISSING COLUMNS to marketplace_partners (created in 0001 with minimal schema)
-- ============================================================
ALTER TABLE marketplace_partners ADD COLUMN partner_type TEXT DEFAULT 'REFERRAL';
ALTER TABLE marketplace_partners ADD COLUMN contact_email TEXT;
ALTER TABLE marketplace_partners ADD COLUMN country TEXT DEFAULT 'GLOBAL';
ALTER TABLE marketplace_partners ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE marketplace_partners ADD COLUMN revenue_share_pct REAL DEFAULT 15;
ALTER TABLE marketplace_partners ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- ============================================================
-- KYB/KYC VERIFICATIONS (Part 16) — NEW
-- ============================================================
CREATE TABLE IF NOT EXISTS kyb_verifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    jurisdiction TEXT,
    tier INTEGER DEFAULT 1,
    checks TEXT,
    overall_status TEXT DEFAULT 'PENDING',
    trust_score INTEGER,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    checks TEXT,
    overall_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- ADD MISSING COLUMNS to geocoded_locations (created in 0001 with minimal schema)
-- ============================================================
ALTER TABLE geocoded_locations ADD COLUMN name TEXT;
ALTER TABLE geocoded_locations ADD COLUMN location_type TEXT DEFAULT 'warehouse';
ALTER TABLE geocoded_locations ADD COLUMN country_code TEXT;
ALTER TABLE geocoded_locations ADD COLUMN address TEXT;
ALTER TABLE geocoded_locations ADD COLUMN port_code TEXT;
ALTER TABLE geocoded_locations ADD COLUMN operating_hours TEXT;
ALTER TABLE geocoded_locations ADD COLUMN capacity_info TEXT;
ALTER TABLE geocoded_locations ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- ============================================================
-- TRUCKING ROUTES — NEW
-- ============================================================
CREATE TABLE IF NOT EXISTS trucking_routes (
    id TEXT PRIMARY KEY,
    origin_location_id TEXT,
    destination_location_id TEXT,
    distance_km REAL,
    estimated_time_min INTEGER,
    cost_estimate_usd REAL,
    route_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Add missing columns to trucking_gps_traces (created in 0001 with minimal schema)
ALTER TABLE trucking_gps_traces ADD COLUMN driver_id TEXT;
ALTER TABLE trucking_gps_traces ADD COLUMN vehicle_id TEXT;
ALTER TABLE trucking_gps_traces ADD COLUMN latitude REAL;
ALTER TABLE trucking_gps_traces ADD COLUMN longitude REAL;
ALTER TABLE trucking_gps_traces ADD COLUMN speed_kmh REAL DEFAULT 0;
ALTER TABLE trucking_gps_traces ADD COLUMN heading REAL DEFAULT 0;
ALTER TABLE trucking_gps_traces ADD COLUMN recorded_at TEXT DEFAULT (datetime('now'));

-- ============================================================
-- COMMODITIES — ADD MISSING
-- ============================================================
CREATE TABLE IF NOT EXISTS commodity_specifications (
    id TEXT PRIMARY KEY,
    hs_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    description TEXT,
    storage_requirements TEXT,
    shelf_life_days INTEGER,
    temperature_range TEXT,
    humidity_range TEXT,
    packing_guidance TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commodity_compatibility_rules (
    id TEXT PRIMARY KEY,
    hs_code_a TEXT NOT NULL,
    hs_code_b TEXT NOT NULL,
    compatibility TEXT DEFAULT 'COMPATIBLE',
    reason TEXT,
    conditions TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- ADD MISSING COLUMNS to shipment_barcodes (created in 0001 with different schema)
-- ============================================================
ALTER TABLE shipment_barcodes ADD COLUMN shipment_id TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN ustn TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN barcode_value TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN pallet_id TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN lot_number TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN hs_code TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN generated_by TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN governor_decision_id TEXT;

-- ============================================================
-- BARCODE SCAN EVENTS — NEW
-- ============================================================
CREATE TABLE IF NOT EXISTS barcode_scan_events (
    id TEXT PRIMARY KEY,
    barcode_id TEXT,
    scanned_by TEXT,
    scan_location TEXT,
    scan_device TEXT DEFAULT 'mobile',
    scanned_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SANCTIONS SCREENINGS — NEW
-- ============================================================
CREATE TABLE IF NOT EXISTS sanctions_screenings (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT,
    entity_name TEXT,
    screening_type TEXT DEFAULT 'STANDARD',
    result TEXT DEFAULT 'CLEAR',
    match_score REAL,
    matched_lists TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- ADD MISSING COLUMNS to ai_inference_records (created in 0001)
-- ============================================================
ALTER TABLE ai_inference_records ADD COLUMN agent_id TEXT;
ALTER TABLE ai_inference_records ADD COLUMN cost_usd REAL DEFAULT 0;
ALTER TABLE ai_inference_records ADD COLUMN decision_type TEXT;
ALTER TABLE ai_inference_records ADD COLUMN governor_decision_id TEXT;

-- inspections table already fully defined in migration 0003

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kyb_verifications_tenant ON kyb_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_employee ON kyc_verifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_type ON geocoded_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_commodity_specs_hs ON commodity_specifications(hs_code);
CREATE INDEX IF NOT EXISTS idx_sanctions_entity ON sanctions_screenings(entity_gtid);

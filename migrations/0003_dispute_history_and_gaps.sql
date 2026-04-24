-- ============================================================
-- SGTX v6.1 — Migration 0003: Dispute History Tracking + Gap Fixes
-- Per Blueprint v6.2 Phase 10 & Part 6 Portal Requirements
-- ============================================================

-- ─── PERSISTENT DISPUTE HISTORY TABLE ─────────────────────
-- Tracks cumulative dispute stats per entity (importer/exporter)
-- Used by government, regulatory, admin, and the parties themselves
CREATE TABLE IF NOT EXISTS dispute_history (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT NOT NULL UNIQUE,
    entity_name TEXT,
    entity_type TEXT, -- IMPORTER, EXPORTER, LOGISTICS, etc.
    total_disputes INTEGER DEFAULT 0,
    disputes_as_filer INTEGER DEFAULT 0,
    disputes_as_respondent INTEGER DEFAULT 0,
    -- By type breakdown
    quality_disputes INTEGER DEFAULT 0,
    delivery_disputes INTEGER DEFAULT 0,
    payment_disputes INTEGER DEFAULT 0,
    documentation_disputes INTEGER DEFAULT 0,
    commission_disputes INTEGER DEFAULT 0,
    contract_breach_disputes INTEGER DEFAULT 0,
    -- Outcome tracking
    disputes_won INTEGER DEFAULT 0,
    disputes_lost INTEGER DEFAULT 0,
    disputes_settled INTEGER DEFAULT 0,
    disputes_pending INTEGER DEFAULT 0,
    -- Risk scoring
    risk_score REAL DEFAULT 0, -- 0-100, higher = more risky
    -- Timestamps
    last_dispute_at TEXT,
    first_dispute_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dispute_history_gtid ON dispute_history(entity_gtid);
CREATE INDEX IF NOT EXISTS idx_dispute_history_risk ON dispute_history(risk_score DESC);

-- ─── ADD respondent_gtid TO disputes TABLE ─────────────────
-- Blueprint Phase 10 requires tracking both filing and respondent party
ALTER TABLE disputes ADD COLUMN respondent_gtid TEXT;

-- ─── ADD severity + triage fields per Phase 10 Step 10.2 ───
ALTER TABLE disputes ADD COLUMN severity INTEGER DEFAULT 0;
ALTER TABLE disputes ADD COLUMN triage_category TEXT;
ALTER TABLE disputes ADD COLUMN resolution_path TEXT; -- MEDIATION, ARBITRATION, etc.

-- ─── ADD predicted_outcome and ai_settlement per Phase 10 ──
ALTER TABLE disputes ADD COLUMN ai_settlement_proposal TEXT; -- JSON
ALTER TABLE disputes ADD COLUMN predicted_outcome TEXT; -- JSON

-- ─── ADD dispute_recommendations.recommendation_type ────────
ALTER TABLE dispute_recommendations ADD COLUMN recommendation_type TEXT DEFAULT 'TRIAGE';
-- Types: TRIAGE, OUTCOME_PREDICTION, SETTLEMENT_PROPOSAL, EVIDENCE_SUMMARY, COMMISSION_RELEASE

-- ─── ADD dispute_recommendations.evidence_package ───────────
ALTER TABLE dispute_recommendations ADD COLUMN evidence_package TEXT; -- JSON

-- ─── INSPECTIONS TABLE (QC Portal - Blueprint 6.2.4) ───────
CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    inspector_tenant_id TEXT REFERENCES tenants(id),
    inspection_type TEXT NOT NULL DEFAULT 'PRE_SHIPMENT',
    priority_pallets TEXT, -- JSON array of pallet numbers AI recommends
    product_details TEXT, -- JSON
    status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
    result TEXT, -- PASS, FAIL, CONDITIONAL
    findings TEXT, -- JSON
    ai_summary TEXT,
    annotated_images TEXT, -- JSON array of image paths
    report_document_id TEXT,
    governor_decision_id TEXT,
    scheduled_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inspections_ustn ON inspections(shipment_ustn);
CREATE INDEX IF NOT EXISTS idx_inspections_tenant ON inspections(inspector_tenant_id);

-- ─── SERVICE CATALOG TABLE (Logistics Portal - Blueprint 6.2.3) ───
CREATE TABLE IF NOT EXISTS service_catalog (
    id TEXT PRIMARY KEY,
    provider_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    service_type TEXT NOT NULL, -- FREIGHT_FORWARDING, TRUCKING, CUSTOMS_BROKERAGE, SHIPPING_LINE, WAREHOUSING
    service_name TEXT NOT NULL,
    description TEXT,
    coverage_areas TEXT, -- JSON array
    contract_rates TEXT, -- JSON
    incoterms_supported TEXT, -- JSON array
    certifications TEXT, -- JSON array
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ─── PACKING PLANS TABLE (Phase 2 - Blueprint 6.2.2) ───────
CREATE TABLE IF NOT EXISTS packing_plans (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    trade_request_id TEXT REFERENCES trade_requests(id),
    pallet_details TEXT NOT NULL, -- JSON array
    container_type TEXT DEFAULT '40HC_REEFER',
    total_pallets INTEGER DEFAULT 0,
    total_weight_kg REAL DEFAULT 0,
    visual_layout TEXT, -- JSON for 3D viewer
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','LOCKED','AMENDED')),
    governor_decision_id TEXT,
    locked_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Migration 0013: SGTX Blueprint v6.3 — Part 3 + Part 6 Full Alignment
-- Part 3: Contracting, Negotiation & SGTX Fee Collection (Steps 3.1-3.10)
-- Part 6: Settlement & Payment Orchestration (Steps 6.1-6.8)
-- Creates missing tables: negotiation_amendments, logistics_addenda, release_confirmations, contract_shipments
-- Adds missing columns to contracts, settlement_confirmations

-- ═══════════════════════════════════════════════════════════════════
-- PART 3: Missing columns on contracts table
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE contracts ADD COLUMN sgtx_fee_rate REAL;
ALTER TABLE contracts ADD COLUMN sgtx_fee_amount REAL;
ALTER TABLE contracts ADD COLUMN commission_collection_model TEXT DEFAULT 'UPFRONT';
ALTER TABLE contracts ADD COLUMN mutual_confirmation_at TEXT;
ALTER TABLE contracts ADD COLUMN mutual_confirmation_snapshot TEXT;
ALTER TABLE contracts ADD COLUMN sgtx_witness_signature TEXT;
ALTER TABLE contracts ADD COLUMN own_contract_pdf_hash TEXT;
ALTER TABLE contracts ADD COLUMN own_contract_uploaded INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN clause_forge_confidence REAL;

-- ═══════════════════════════════════════════════════════════════════
-- PART 3 Step 3.2: negotiation_amendments
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS negotiation_amendments (
  id TEXT PRIMARY KEY,
  negotiation_session_id TEXT NOT NULL,
  trade_request_id TEXT,
  proposed_by_gtid TEXT NOT NULL,
  amendment_type TEXT DEFAULT 'GENERAL',
  amendments TEXT NOT NULL,
  reason TEXT,
  round_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING',
  response_note TEXT,
  responded_by_gtid TEXT,
  responded_at TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_neg_amend_session ON negotiation_amendments(negotiation_session_id);
CREATE INDEX IF NOT EXISTS idx_neg_amend_trade ON negotiation_amendments(trade_request_id);

-- ═══════════════════════════════════════════════════════════════════
-- PART 3 Step 3.7: logistics_addenda
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS logistics_addenda (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  contract_shipment_id TEXT,
  provider_gtid TEXT NOT NULL,
  provider_tenant_id TEXT,
  service_type TEXT NOT NULL,
  addendum_content TEXT,
  ustn_placeholder TEXT,
  penalty_clause TEXT,
  signed_at TEXT,
  signature_hash TEXT,
  status TEXT DEFAULT 'PENDING',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logistics_addenda_contract ON logistics_addenda(contract_id);
CREATE INDEX IF NOT EXISTS idx_logistics_addenda_provider ON logistics_addenda(provider_gtid);

-- ═══════════════════════════════════════════════════════════════════
-- PART 3 Step 3.9: release_confirmations
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS release_confirmations (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  commission_lock_id TEXT NOT NULL,
  contract_id TEXT,
  release_token TEXT NOT NULL UNIQUE,
  provider_gtid TEXT,
  sent_at TEXT,
  acknowledged_at TEXT,
  acknowledged_by_gtid TEXT,
  method TEXT DEFAULT 'API',
  status TEXT DEFAULT 'SENT',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_release_conf_ustn ON release_confirmations(ustn);
CREATE INDEX IF NOT EXISTS idx_release_conf_token ON release_confirmations(release_token);

-- ═══════════════════════════════════════════════════════════════════
-- PART 3 Step 3.8.2 / 3.10: contract_shipments
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contract_shipments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  shipment_number INTEGER NOT NULL,
  scheduled_delivery_date TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  port_of_loading TEXT,
  containers_count INTEGER DEFAULT 1,
  total_price REAL NOT NULL,
  sgtx_fee_amount REAL,
  sgtx_fee_paid INTEGER DEFAULT 0,
  commission_lock_id TEXT,
  ustn TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  mutual_confirmation_at TEXT,
  locked_at TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contract_shipments_contract ON contract_shipments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_shipments_ustn ON contract_shipments(ustn);

-- ═══════════════════════════════════════════════════════════════════
-- PART 6: settlement_confirmations — add reconciliation_confidence
-- (other columns already exist from prior migrations)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE settlement_confirmations ADD COLUMN reconciliation_confidence REAL;

-- fee_calculations: add safety_buffer_pct and net_fee (gross_amount, fee_breakdown, safety_buffer_applied already exist)
ALTER TABLE fee_calculations ADD COLUMN safety_buffer_pct REAL DEFAULT 0.005;
ALTER TABLE fee_calculations ADD COLUMN net_fee REAL;

-- psp_health_logs: add success_rate and error_details (latency_ms already exists)
ALTER TABLE psp_health_logs ADD COLUMN success_rate REAL;
ALTER TABLE psp_health_logs ADD COLUMN error_details TEXT;

-- payment_attempts: add gross_amount and net_amount (most columns already exist)
ALTER TABLE payment_attempts ADD COLUMN gross_amount REAL;
ALTER TABLE payment_attempts ADD COLUMN net_amount REAL;
ALTER TABLE payment_attempts ADD COLUMN settled_at TEXT;

-- Migration 0009: Full Blueprint v6.3 Schema Alignment
-- Adds missing tables and columns to align with SGTX Blueprint DDL

-- ═══════════════════════════════════════════════════════════════════
-- 1. Fix smart_inbox_items - add blueprint columns
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE smart_inbox_items ADD COLUMN item_id TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN category TEXT DEFAULT 'GENERAL';
ALTER TABLE smart_inbox_items ADD COLUMN priority_score INTEGER DEFAULT 50;
ALTER TABLE smart_inbox_items ADD COLUMN description TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN deadline TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN action_link TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN snoozed_until TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN dismissed INTEGER DEFAULT 0;
ALTER TABLE smart_inbox_items ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE smart_inbox_items ADD COLUMN ustn TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Create inbox_history table
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inbox_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  ustn TEXT,
  action_taken TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inbox_history_employee ON inbox_history(employee_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Create inbox_preferences table
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inbox_preferences (
  employee_id TEXT PRIMARY KEY,
  min_score INTEGER DEFAULT 30,
  muted_categories TEXT DEFAULT '[]',
  preferred_language TEXT DEFAULT 'en'
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Create trade_event_timeline table
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trade_event_timeline (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  event_type TEXT DEFAULT 'SYSTEM',
  event_text TEXT NOT NULL,
  event_data TEXT DEFAULT '{}',
  actor_gtid TEXT,
  phase TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trade_event_timeline_ustn ON trade_event_timeline(ustn);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Add missing columns to negotiation_sessions
-- Already has: messages, current_offer, counter_offers, negotiator_config, ai_settlement_proposal, closed_at
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE negotiation_sessions ADD COLUMN bot_decision_log TEXT DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════════════
-- 6. Add missing columns to settlement_instructions
-- Already has: id, ustn, instruction_type, payload, status, psp_reference, governor_decision_id, payer/payee, amount, currency, payment_rail, etc.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE settlement_instructions ADD COLUMN fx_path TEXT;
ALTER TABLE settlement_instructions ADD COLUMN netting_circle_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN reconciliation_status TEXT DEFAULT 'PENDING';

-- ═══════════════════════════════════════════════════════════════════
-- 7. Add rate_limit_tier to marketplace_partners (status already exists)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE marketplace_partners ADD COLUMN rate_limit_tier TEXT DEFAULT 'STANDARD';

-- ═══════════════════════════════════════════════════════════════════
-- 8. Enhance financing_requests for Phase 4 (tenor_days & credit_intelligence already exist)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE financing_requests ADD COLUMN monte_carlo_default_prob REAL;

-- ═══════════════════════════════════════════════════════════════════
-- 9. Enhance disputes table for Phase 10 (dispute_type, mediation_log already exist)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE disputes ADD COLUMN arbitration_status TEXT;
ALTER TABLE disputes ADD COLUMN evidence_package_id TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 10. Create financing_offers table for Phase 4 bidding
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financing_offers (
  id TEXT PRIMARY KEY,
  financing_request_id TEXT NOT NULL,
  financier_tenant_id TEXT NOT NULL,
  amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  tenor_days INTEGER,
  conditions TEXT DEFAULT '{}',
  status TEXT DEFAULT 'PENDING',
  bid_encrypted INTEGER DEFAULT 1,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_financing_offers_request ON financing_offers(financing_request_id);

-- ═══════════════════════════════════════════════════════════════════
-- 11. Create financing_agreements table for Phase 4
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financing_agreements (
  id TEXT PRIMARY KEY,
  financing_request_id TEXT NOT NULL,
  financing_offer_id TEXT NOT NULL,
  contract_id TEXT,
  amount REAL NOT NULL,
  disbursement_status TEXT DEFAULT 'PENDING',
  repayment_schedule TEXT DEFAULT '[]',
  governor_decision_id TEXT,
  signed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_financing_agreements_request ON financing_agreements(financing_request_id);

-- ═══════════════════════════════════════════════════════════════════
-- 12. Create payment_attempts table for Phase 9
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  commission_lock_id TEXT,
  psp_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'INITIATED',
  psp_reference TEXT,
  webhook_verified INTEGER DEFAULT 0,
  gross_up_amount REAL DEFAULT 0,
  fee_amount REAL DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_commission ON payment_attempts(commission_lock_id);

-- ═══════════════════════════════════════════════════════════════════
-- 13. Onboarding wizard enhancements (Part 2.7)
-- Already has: sandbox_active. Need sandbox_data and skipped_steps
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE tenant_onboarding_state ADD COLUMN sandbox_data TEXT DEFAULT '{}';
ALTER TABLE tenant_onboarding_state ADD COLUMN skipped_steps TEXT DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════════════
-- 14. Create iot_sensor_readings table for Phase 5
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS iot_sensor_readings (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  sensor_id TEXT,
  value REAL,
  unit TEXT,
  latitude REAL,
  longitude REAL,
  confidence REAL DEFAULT 1.0,
  consensus_group TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_iot_sensor_ustn ON iot_sensor_readings(ustn);

-- ═══════════════════════════════════════════════════════════════════
-- 15. Create documents table for Phase 5
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  shipment_ustn TEXT,
  document_type TEXT NOT NULL,
  filename TEXT,
  file_hash TEXT,
  ai_validation_status TEXT DEFAULT 'PENDING',
  ai_validation_result TEXT,
  verified_at TEXT,
  status TEXT DEFAULT 'UPLOADED',
  uploaded_by TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_ustn ON documents(shipment_ustn);

-- ═══════════════════════════════════════════════════════════════════
-- 16. Enhance distressed_cargo_listings for Phase 7
-- Already has: listing_expiry, ai_price_recommendation
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE distressed_cargo_listings ADD COLUMN condition_score REAL;
ALTER TABLE distressed_cargo_listings ADD COLUMN triage_path TEXT;
ALTER TABLE distressed_cargo_listings ADD COLUMN pallet_ids TEXT DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════════════
-- 17. Add Governor decision enhancements (tenant_message already exists)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE governor_decisions ADD COLUMN plain_language_explanation TEXT;
ALTER TABLE governor_decisions ADD COLUMN decision_panel_data TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 18. Create onboarding_sandbox_data for sandbox isolation
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS onboarding_sandbox_data (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sandbox_data_tenant ON onboarding_sandbox_data(tenant_id);

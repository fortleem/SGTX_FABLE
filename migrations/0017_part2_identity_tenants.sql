-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0017: SGTX Blueprint v6.3 — Part 2: Identity, Tenants & Internal Authority
-- Full alignment with blueprint sections 2.1–2.10
-- 
-- STRATEGY: Use ALTER TABLE for tenants (27 FK references prevent DROP).
-- MARKETPLACE_PARTNER CHECK constraint enforced at application level (types.ts).
-- trader_mode_sessions/tenant_approval_requests: recreated without FK clauses.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── GAP-1/GAP-28: GTID Atomic Sequence Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS gtid_sequences (
  country_code TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  last_assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (country_code, entity_type)
);

-- Seed common sequences
INSERT OR IGNORE INTO gtid_sequences (country_code, entity_type, current_sequence) VALUES
  ('US', 'TRD', 100), ('US', 'FIN', 10), ('US', 'LOG', 10),
  ('EG', 'TRD', 50), ('EG', 'LOG', 5),
  ('GB', 'TRD', 30), ('GB', 'FIN', 5),
  ('AE', 'TRD', 20), ('SG', 'TRD', 15),
  ('NL', 'TRD', 10), ('DE', 'TRD', 10);

-- ─── GAP-4/5/6/7/26: Add missing columns to tenants ────────────────────────
-- Cannot DROP/recreate tenants (27 tables have FK references).
-- Cannot ALTER CHECK constraint in SQLite — MARKETPLACE_PARTNER validated in app code.
ALTER TABLE tenants ADD COLUMN lifecycle_state_updated_at TEXT;
ALTER TABLE tenants ADD COLUMN financier_subtype TEXT;
ALTER TABLE tenants ADD COLUMN financier_jurisdiction_approved INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN financier_documentation TEXT DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN logistics_subrole TEXT;
ALTER TABLE tenants ADD COLUMN logistics_verification_status TEXT DEFAULT 'PENDING';
ALTER TABLE tenants ADD COLUMN logistics_verification_docs TEXT DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN mp_api_key_hash TEXT;
ALTER TABLE tenants ADD COLUMN mp_approval_status TEXT DEFAULT 'PENDING';
ALTER TABLE tenants ADD COLUMN mp_approved_by TEXT;
ALTER TABLE tenants ADD COLUMN mp_approved_at TEXT;

-- Backfill lifecycle_state_updated_at for existing rows
UPDATE tenants SET lifecycle_state_updated_at = COALESCE(updated_at, datetime('now'))
  WHERE lifecycle_state_updated_at IS NULL;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_tenants_lifecycle ON tenants(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_tenants_jurisdiction ON tenants(jurisdiction);

-- ─── GAP-21: Fix trader_mode_sessions table ─────────────────────────────────
-- Blueprint 2.8: code uses (id, employee_id, tenant_id, mode, started_at)
-- Current DB has (session_id, employee_id, active_mode, ...) — schema mismatch
-- 0 rows, nothing references this table. Drop and recreate WITHOUT FK clause.
DROP TABLE IF EXISTS trader_mode_sessions;
CREATE TABLE trader_mode_sessions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('BUY','SELL','DUAL')),
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  shuffle_count INTEGER DEFAULT 0,
  governor_decision_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_tms_employee ON trader_mode_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_tms_tenant ON trader_mode_sessions(tenant_id);

-- ─── GAP-23: Fix tenant_approval_requests table ─────────────────────────────
-- Blueprint 2.9: code uses (requested_by, tenant_id) but DB has (requesting_employee_id)
-- 0 rows, no FK constraints in actual DB. Safe to drop and recreate.
DROP TABLE IF EXISTS tenant_approval_requests;
CREATE TABLE tenant_approval_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  action_context TEXT NOT NULL DEFAULT '{}',
  approvals_received TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tar_tenant ON tenant_approval_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tar_policy ON tenant_approval_requests(policy_id);

-- ─── GAP-17: Draft History for Onboarding ───────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_draft_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_data TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_odh_tenant ON onboarding_draft_history(tenant_id);

-- Add draft expiry tracking to onboarding state
ALTER TABLE tenant_onboarding_state ADD COLUMN draft_expires_at TEXT;
ALTER TABLE tenant_onboarding_state ADD COLUMN draft_reminder_sent INTEGER DEFAULT 0;
ALTER TABLE tenant_onboarding_state ADD COLUMN completed INTEGER DEFAULT 0;

-- ─── GAP-8: Permission Versioning & Audit ───────────────────────────────────
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('GRANT','REVOKE','MODIFY')),
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pal_employee ON permission_audit_log(employee_id);

-- Add version tracking to employee_permissions
ALTER TABLE employee_permissions ADD COLUMN version INTEGER DEFAULT 1;

-- ─── GAP-24: Cross-Tenant Groups for Holding Companies ─────────────────────
CREATE TABLE IF NOT EXISTS cross_tenant_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_gtid TEXT NOT NULL,
  member_gtids TEXT NOT NULL DEFAULT '[]',
  group_type TEXT DEFAULT 'HOLDING_COMPANY',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ctg_parent ON cross_tenant_groups(parent_gtid);

-- ─── GAP-18: Fix total_steps default ────────────────────────────────────────
UPDATE tenant_onboarding_state SET total_steps = 6 WHERE total_steps = 5;

-- ─── GAP-3: Rate Limiting Simulation ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_rate_limits (
  endpoint TEXT NOT NULL,
  client_id TEXT NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TEXT DEFAULT (datetime('now')),
  window_seconds INTEGER DEFAULT 60,
  max_requests INTEGER DEFAULT 100,
  PRIMARY KEY (endpoint, client_id)
);

-- ─── GAP-9: Logistics Subrole Permissions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS logistics_subrole_permissions (
  id TEXT PRIMARY KEY,
  subrole TEXT NOT NULL,
  permission TEXT NOT NULL,
  description TEXT,
  UNIQUE(subrole, permission)
);

INSERT OR IGNORE INTO logistics_subrole_permissions (id, subrole, permission, description) VALUES
  ('lsp-1', 'FREIGHT_FORWARDER', 'shipment.create', 'Create shipment bookings'),
  ('lsp-2', 'FREIGHT_FORWARDER', 'shipment.update', 'Update shipment status'),
  ('lsp-3', 'FREIGHT_FORWARDER', 'document.bl.upload', 'Upload bill of lading'),
  ('lsp-4', 'SHIPPING_LINE', 'vessel.assign', 'Assign vessel to shipment'),
  ('lsp-5', 'SHIPPING_LINE', 'container.track', 'Track container movements'),
  ('lsp-6', 'SHIPPING_LINE', 'shipment.departure.confirm', 'Confirm vessel departure'),
  ('lsp-7', 'TRUCKING_COMPANY', 'delivery.schedule', 'Schedule inland delivery'),
  ('lsp-8', 'TRUCKING_COMPANY', 'delivery.confirm', 'Confirm delivery completion'),
  ('lsp-9', 'CUSTOMS_BROKER', 'customs.clearance.submit', 'Submit customs clearance docs'),
  ('lsp-10', 'CUSTOMS_BROKER', 'customs.declaration.file', 'File customs declaration'),
  ('lsp-11', 'CUSTOMS_BROKER', 'customs.duty.calculate', 'Calculate import duties');

-- ─── GAP-29: Update blueprint_part_status for Part 2 ───────────────────────
INSERT OR REPLACE INTO blueprint_part_status (part_number, part_title, status, last_verified, notes)
VALUES (2, 'Identity, Tenants & Internal Authority', 'COMPLETE', datetime('now'),
  'All 29 gaps fixed: GTID atomic sequences, tenant columns (financier/logistics/MP), contacts auto-save, onboarding wizard (skip/exit-sandbox/drafts), dual-mode toggle, icon shuffle, visibility rules, lifecycle Smart Inbox, permission versioning, logistics subroles, cross-tenant groups, rate limits');

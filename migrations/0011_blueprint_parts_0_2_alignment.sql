-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0011: SGTX Blueprint v6.3 Parts 0-2 Full Alignment
-- Part 0: Executive Summary & Core Governance Philosophy
-- Part 1: Constitutional & Governance Layer
-- Part 2: Identity, Tenancy & Onboarding
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Part 2.8: Tenant Lifecycle States ──────────────────────────────────────
ALTER TABLE tenants ADD COLUMN lifecycle_state TEXT DEFAULT 'REGISTERED';
ALTER TABLE tenants ADD COLUMN emergency_mode INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN emergency_contact_email TEXT;
ALTER TABLE tenants ADD COLUMN emergency_contact_phone TEXT;

-- ─── Part 2.8: Tenant Lifecycle History ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_lifecycle_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT,
  governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tlh_tenant ON tenant_lifecycle_history(tenant_id);

-- ─── Part 2.5: Contacts Enrichment ─────────────────────────────────────────
ALTER TABLE tenant_contacts ADD COLUMN trust_snapshot TEXT DEFAULT '{}';
ALTER TABLE tenant_contacts ADD COLUMN relationship_health_score REAL;
ALTER TABLE tenant_contacts ADD COLUMN smart_labels TEXT DEFAULT '[]';
ALTER TABLE tenant_contacts ADD COLUMN indirect_connections TEXT DEFAULT '{}';
ALTER TABLE tenant_contacts ADD COLUMN last_ai_update TEXT;

-- ─── Part 2.3: Data Scopes — only truly missing columns ────────────────────
ALTER TABLE data_scopes ADD COLUMN hidden_cost_components TEXT DEFAULT '[]';
ALTER TABLE data_scopes ADD COLUMN allow_role_switching INTEGER DEFAULT 1;

-- ─── Part 1.5: Governor Decision Enrichment ─────────────────────────────────
ALTER TABLE governor_decisions ADD COLUMN escalated_from TEXT;
ALTER TABLE governor_decisions ADD COLUMN escalation_reason TEXT;
ALTER TABLE governor_decisions ADD COLUMN ai_authority_level TEXT DEFAULT 'A4';

-- ─── Part 1.2: AI Inference Records Enrichment ─────────────────────────────
ALTER TABLE ai_inference_records ADD COLUMN fallback_used INTEGER DEFAULT 0;
ALTER TABLE ai_inference_records ADD COLUMN fallback_provider TEXT;
ALTER TABLE ai_inference_records ADD COLUMN request_context TEXT DEFAULT '{}';

-- ─── Part 2.3: Employee active_trader_mode_context ──────────────────────────
ALTER TABLE employees ADD COLUMN active_trader_mode_context TEXT DEFAULT 'DUAL';

-- ─── Part 0.5: Commission Container Release Control ─────────────────────────
CREATE TABLE IF NOT EXISTS container_release_authorizations (
  id TEXT PRIMARY KEY,
  shipment_ustn TEXT NOT NULL,
  container_id TEXT,
  commission_lock_id TEXT REFERENCES commission_locks(lock_id),
  release_authorized INTEGER DEFAULT 0,
  authorized_by TEXT,
  authorization_governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  released_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cra_ustn ON container_release_authorizations(shipment_ustn);
CREATE INDEX IF NOT EXISTS idx_cra_commission ON container_release_authorizations(commission_lock_id);

-- ─── Part 0.6: USTN Registry ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ustn_registry (
  ustn TEXT PRIMARY KEY,
  trade_request_id TEXT REFERENCES trade_requests(id),
  importer_gtid_suffix TEXT NOT NULL,
  exporter_gtid_suffix TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Part 1.6: WasmEdge Execution Gate Log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_gate_log (
  id TEXT PRIMARY KEY,
  governor_decision_id TEXT NOT NULL REFERENCES governor_decisions(decision_id),
  wasm_module TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_verdict TEXT NOT NULL,
  execution_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Part 2.7: Onboarding Sandbox Data ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_sandbox_data (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL,
  resource_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Part 1.3: Platform Governance Multisig ─────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_governance_proposals (
  id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_by TEXT NOT NULL,
  required_signatures INTEGER DEFAULT 3,
  total_signers INTEGER DEFAULT 5,
  current_signatures INTEGER DEFAULT 0,
  signers TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_lifecycle ON tenants(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_tenants_kyb ON tenants(kyb_status);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_ep_employee ON employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_gov_type ON governor_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_gov_actor ON governor_decisions(actor_gtid);
CREATE INDEX IF NOT EXISTS idx_ai_authority ON ai_inference_records(authority_level);
CREATE INDEX IF NOT EXISTS idx_tc_contact ON tenant_contacts(contact_gtid);
CREATE INDEX IF NOT EXISTS idx_ustn_trade ON ustn_registry(trade_request_id);

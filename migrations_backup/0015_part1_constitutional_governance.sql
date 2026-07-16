-- ============================================================
-- SGTX Platform v6.3 — Migration 0015: Part 1 Constitutional & Governance Layer
-- Blueprint Part 1: Constitutional Layer, Governor Service, Replay Protection,
--                   ExecutionGate, Linked Decision Hashes, AI Provider Routing,
--                   Jurisdiction Versioning, Disclaimer Acceptance
-- Fixes: GAP-1 through GAP-16 identified in Part 1 gap analysis
-- ============================================================

-- ─── GAP-12: Replay Protection (Part 1.5.2) ──────────────────────────────────
-- Nonce table to prevent governor decision replay attacks
-- Each request must include a unique nonce; used nonces are recorded and rejected on reuse
CREATE TABLE IF NOT EXISTS governor_nonces (
    nonce TEXT PRIMARY KEY,
    actor_gtid TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    used_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    request_timestamp TEXT NOT NULL,
    ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_governor_nonces_actor ON governor_nonces(actor_gtid);
CREATE INDEX IF NOT EXISTS idx_governor_nonces_expires ON governor_nonces(expires_at);

-- ─── GAP-11: Linked Decision Hash Chain (Part 1.5.1) ──────────────────────────
-- Add previous_decision_hash to governor_decisions to form a chain
-- Each new decision's loom_hash incorporates the previous decision's hash
ALTER TABLE governor_decisions ADD COLUMN previous_decision_hash TEXT;

-- ─── GAP-9: Decision Panel Data Population (Part 1.5) ─────────────────────────
-- decision_panel_data column already exists, but we need to ensure it's populated
-- No schema change needed — fix is in evaluateGovernor code

-- ─── GAP-3: AI Provider Selection (Part 1.2) ──────────────────────────────────
-- Track which provider was selected and why for each governor decision
ALTER TABLE governor_decisions ADD COLUMN ai_provider_used TEXT;
ALTER TABLE governor_decisions ADD COLUMN ai_provider_fallback INTEGER DEFAULT 0;

-- ─── GAP-8: Jurisdiction Versioning (Part 1.4) ────────────────────────────────
-- Add version tracking to jurisdictions for sanctioned list updates
ALTER TABLE jurisdictions ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE jurisdictions ADD COLUMN updated_by TEXT;
ALTER TABLE jurisdictions ADD COLUMN change_reason TEXT;

-- ─── GAP-7: Sanctions List Update Tracking (Part 1.4) ─────────────────────────
-- Track sanctions list refresh history
CREATE TABLE IF NOT EXISTS sanctions_update_log (
    id TEXT PRIMARY KEY,
    list_source TEXT NOT NULL,
    entries_added INTEGER DEFAULT 0,
    entries_removed INTEGER DEFAULT 0,
    entries_total INTEGER DEFAULT 0,
    update_method TEXT DEFAULT 'MANUAL' CHECK(update_method IN ('MANUAL', 'API_FETCH', 'SCHEDULED')),
    updated_by TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ─── GAP-5/6: Proposal Rejection & Execution (Part 1.3) ──────────────────────
-- Add executed_at and rejection tracking to governance proposals
ALTER TABLE platform_governance_proposals ADD COLUMN rejected_by TEXT;
ALTER TABLE platform_governance_proposals ADD COLUMN rejection_reason TEXT;
ALTER TABLE platform_governance_proposals ADD COLUMN executed_at TEXT;
ALTER TABLE platform_governance_proposals ADD COLUMN execution_result TEXT;

-- ─── GAP-16: Disclaimer Acceptance Tracking (Part 1.7) ────────────────────────
-- Track which tenants have accepted the legal disclaimer
CREATE TABLE IF NOT EXISTS disclaimer_acceptances (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT,
    disclaimer_id TEXT NOT NULL,
    disclaimer_version TEXT NOT NULL,
    accepted_at TEXT DEFAULT (datetime('now')),
    ip_hash TEXT,
    user_agent TEXT,
    FOREIGN KEY (disclaimer_id) REFERENCES legal_disclaimers(id)
);

CREATE INDEX IF NOT EXISTS idx_disclaimer_acceptances_tenant ON disclaimer_acceptances(tenant_id);

-- ─── GAP-15: Update Legal Disclaimer with exact blueprint language (Part 1.7) ─
UPDATE legal_disclaimers SET disclaimer_text = 
'SGTX Platform is a sovereign, AI-governed, non-custodial execution engine for global trade — NOT a marketplace. '
|| 'No irreversible action occurs without Governor approval (Constitutional Principle G1). '
|| 'AI systems may block or delay actions but never execute autonomously (Constitutional Principle G2). '
|| 'SGTX never holds, controls, or custodies user funds — only issues verifiable instructions and locks SGTX fees (Constitutional Principle G3). '
|| 'Every action is cryptographically signed (Ed25519/HMAC), Loom-hashed, and attributable to a specific actor (Constitutional Principle G4). '
|| 'Commission rates are clamped between 0.1% and 2.5% of transaction value. '
|| 'Containers are NOT released until SGTX fee payment is confirmed. '
|| 'Legal Entity: SGTX Platform Inc., Jurisdiction: New Jersey, USA. '
|| 'Liability is capped at total SGTX fees paid in the last 12 months. '
|| 'By using this platform, you acknowledge these terms and the governance framework described herein.',
version = '6.3.1',
effective_date = datetime('now')
WHERE id = (SELECT id FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1);

-- ─── Update Part 1 blueprint status ───────────────────────────────────────────
INSERT OR REPLACE INTO blueprint_part_status (part_number, part_title, status, endpoints_total, endpoints_implemented, governor_gates_total, governor_gates_implemented, tables_required, tables_created, notes) VALUES
(1, 'Constitutional & Governance Layer', 'COMPLETE', 18, 18, 8, 8, 12, 12, 'G1-G4 enforced, Governor 7-step flow, replay protection, linked hashes, ExecutionGate, AI authority A0-A5, multisig 3/5, jurisdiction supremacy, legal disclaimer');

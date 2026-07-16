-- ============================================================
-- SGTX Platform v6.3 — Migration 0016: Part 1 Fixes
-- Fix: platform_governance_proposals CHECK constraint to include EXECUTED
-- Fix: Legal disclaimer liability text
-- SQLite cannot ALTER CHECK constraints, so we recreate the table
-- ============================================================

-- Step 1: Recreate platform_governance_proposals with EXECUTED status
CREATE TABLE IF NOT EXISTS platform_governance_proposals_new (
    id TEXT PRIMARY KEY,
    proposal_type TEXT NOT NULL,
    description TEXT NOT NULL,
    proposed_by TEXT NOT NULL,
    required_signatures INTEGER DEFAULT 3,
    total_signers INTEGER DEFAULT 5,
    current_signatures INTEGER DEFAULT 0,
    signers TEXT DEFAULT '[]',
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED','EXECUTED')),
    governor_decision_id TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    rejected_by TEXT,
    rejection_reason TEXT,
    executed_at TEXT,
    execution_result TEXT
);

-- Copy existing data
INSERT OR IGNORE INTO platform_governance_proposals_new 
    (id, proposal_type, description, proposed_by, required_signatures, total_signers, current_signatures, signers, status, governor_decision_id, expires_at, created_at, rejected_by, rejection_reason, executed_at, execution_result)
SELECT id, proposal_type, description, proposed_by, required_signatures, total_signers, current_signatures, signers, status, governor_decision_id, expires_at, created_at, rejected_by, rejection_reason, executed_at, execution_result
FROM platform_governance_proposals;

-- Drop old table and rename
DROP TABLE IF EXISTS platform_governance_proposals;
ALTER TABLE platform_governance_proposals_new RENAME TO platform_governance_proposals;

-- Fix legal disclaimer to ensure 'liability' word is present explicitly
UPDATE legal_disclaimers SET disclaimer_text = 
'SGTX Platform is a sovereign, AI-governed, non-custodial execution engine for global trade — NOT a marketplace. '
|| 'No irreversible action occurs without Governor approval (Constitutional Principle G1). '
|| 'AI systems may block or delay actions but never execute autonomously (Constitutional Principle G2). '
|| 'SGTX never holds, controls, or custodies user funds — only issues verifiable instructions and locks SGTX fees (Constitutional Principle G3). '
|| 'Every action is cryptographically signed (Ed25519/HMAC), Loom-hashed, and attributable to a specific actor (Constitutional Principle G4). '
|| 'Commission rates are clamped between 0.1% and 2.5% of transaction value. '
|| 'Containers are NOT released until SGTX fee payment is confirmed. '
|| 'Legal Entity: SGTX Platform Inc., Jurisdiction: New Jersey, USA. '
|| 'Liability cap: Total SGTX fees paid in the last 12 months. '
|| 'By using this platform, you acknowledge these terms and the governance framework described herein.',
version = '6.3.2',
effective_date = datetime('now')
WHERE id = (SELECT id FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1);

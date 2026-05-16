-- Migration 0021: Part 3 Phase 4 — Universal Trade Finance (Complete Blueprint Alignment)
-- Adds: financier_preferences, financing_repayments, financier_historical_data, financing_annexes
-- Extends: financing_requests, financing_offers, financing_agreements

-- ═══════════════════════════════════════════════════════════
-- 1. FINANCIER PREFERENCES (Step 4.3)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financier_preferences (
    id TEXT PRIMARY KEY,
    financier_tenant_id TEXT NOT NULL,
    accepted_borrower_countries TEXT DEFAULT '[]',   -- JSON array of country codes
    min_trust_score INTEGER DEFAULT 0,                -- 0-100
    min_trade_value REAL DEFAULT 0,                    -- Minimum trade value USD
    max_financed_amount REAL DEFAULT 10000000,         -- Maximum single loan
    preferred_financing_types TEXT DEFAULT '[]',       -- JSON array: PRE_SHIPMENT, POST_SHIPMENT, INVOICE, STRUCTURED
    preferred_settlement_methods TEXT DEFAULT '[]',    -- JSON array: BANK_TRANSFER, STABLECOIN_USDC, STABLECOIN_USDT, DEFI
    excluded_hs_codes TEXT DEFAULT '[]',               -- JSON array of HS code prefixes to exclude
    geographic_restrictions TEXT DEFAULT '[]',          -- JSON array of blocked regions
    min_apr REAL DEFAULT 0,                            -- Minimum acceptable APR
    max_tenor_days INTEGER DEFAULT 365,                -- Maximum tenor
    auto_rfq_enabled INTEGER DEFAULT 1,                -- Auto-respond to matching RFQs
    confidentiality_signed INTEGER DEFAULT 0,          -- G4U3a: Has signed blanket confidentiality
    confidentiality_signed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fin_pref_tenant ON financier_preferences(financier_tenant_id);

-- ═══════════════════════════════════════════════════════════
-- 2. FINANCING REPAYMENTS (Step 4.9)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financing_repayments (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL,
    financier_tenant_id TEXT NOT NULL,
    borrower_tenant_id TEXT NOT NULL,
    repayment_amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    repayment_method TEXT,                            -- BANK_TRANSFER, STABLECOIN, DEFI
    repayment_reference TEXT,                         -- External reference/tx hash
    scheduled_date TEXT,
    actual_date TEXT,
    days_late INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','LATE','DEFAULTED')),
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_repay_agreement ON financing_repayments(financing_agreement_id);
CREATE INDEX IF NOT EXISTS idx_repay_borrower ON financing_repayments(borrower_tenant_id);

-- ═══════════════════════════════════════════════════════════
-- 3. FINANCIER HISTORICAL DATA (Step 4.10)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financier_historical_data (
    id TEXT PRIMARY KEY,
    financier_tenant_id TEXT NOT NULL,
    borrower_tenant_id TEXT NOT NULL,
    borrower_name TEXT,
    borrower_gtid TEXT,
    borrower_jurisdiction TEXT,
    borrower_trust_score INTEGER DEFAULT 0,
    total_financed_amount REAL DEFAULT 0,
    total_repaid_amount REAL DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    on_time_repayments INTEGER DEFAULT 0,
    late_repayments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    avg_days_to_repay REAL DEFAULT 0,
    credit_score_trend TEXT DEFAULT '[]',              -- JSON array of {date, score} snapshots
    last_financing_date TEXT,
    first_financing_date TEXT,
    repayment_performance_pct REAL DEFAULT 100,       -- 0-100%
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_finhist_pair ON financier_historical_data(financier_tenant_id, borrower_tenant_id);

-- ═══════════════════════════════════════════════════════════
-- 4. FINANCING ANNEXES (Step 4.7 — Witness Clause docs)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financing_annexes (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL,
    annex_type TEXT NOT NULL,                          -- WITNESS_CLAUSE, COLLATERAL_SCHEDULE, REPAYMENT_SCHEDULE, RISK_SUMMARY
    title TEXT,
    content TEXT,                                      -- Full clause text or JSON
    sgtx_witness_hash TEXT,                           -- SHA-256 of clause content
    signed_by TEXT,                                    -- GTID of signer
    signed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_annex_agreement ON financing_annexes(financing_agreement_id);

-- ═══════════════════════════════════════════════════════════
-- 5. EXTEND financing_requests (Step 4.1)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE financing_requests ADD COLUMN shipment_id TEXT;
ALTER TABLE financing_requests ADD COLUMN trade_value REAL;
ALTER TABLE financing_requests ADD COLUMN requested_amount REAL;
ALTER TABLE financing_requests ADD COLUMN preferred_settlement_method TEXT DEFAULT 'BANK_TRANSFER';
ALTER TABLE financing_requests ADD COLUMN preferred_currency TEXT DEFAULT 'USD';
ALTER TABLE financing_requests ADD COLUMN collateral_type TEXT DEFAULT 'GOODS';
ALTER TABLE financing_requests ADD COLUMN special_instructions TEXT;
ALTER TABLE financing_requests ADD COLUMN ai_max_ltv REAL;
ALTER TABLE financing_requests ADD COLUMN ai_credit_score REAL;
ALTER TABLE financing_requests ADD COLUMN ai_default_probability REAL;
ALTER TABLE financing_requests ADD COLUMN rfq_broadcast_at TEXT;
ALTER TABLE financing_requests ADD COLUMN rfq_matched_financiers INTEGER DEFAULT 0;
ALTER TABLE financing_requests ADD COLUMN co_financing_enabled INTEGER DEFAULT 0;
ALTER TABLE financing_requests ADD COLUMN total_bid_amount REAL DEFAULT 0;
ALTER TABLE financing_requests ADD COLUMN blended_apr REAL;
ALTER TABLE financing_requests ADD COLUMN ustn TEXT;

-- ═══════════════════════════════════════════════════════════
-- 6. EXTEND financing_offers (Step 4.6)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE financing_offers ADD COLUMN settlement_method TEXT;
ALTER TABLE financing_offers ADD COLUMN collateral_details TEXT;
ALTER TABLE financing_offers ADD COLUMN co_finance_pct REAL;
ALTER TABLE financing_offers ADD COLUMN accepted_at TEXT;
ALTER TABLE financing_offers ADD COLUMN rejected_reason TEXT;

-- ═══════════════════════════════════════════════════════════
-- 7. EXTEND financing_agreements (Step 4.7, 4.8)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE financing_agreements ADD COLUMN apr REAL;
ALTER TABLE financing_agreements ADD COLUMN tenor_days INTEGER;
ALTER TABLE financing_agreements ADD COLUMN repayment_schedule TEXT;
ALTER TABLE financing_agreements ADD COLUMN collateral_terms TEXT;
ALTER TABLE financing_agreements ADD COLUMN sgtx_witness_signature TEXT;
ALTER TABLE financing_agreements ADD COLUMN borrower_signature_at TEXT;
ALTER TABLE financing_agreements ADD COLUMN financier_signature_at TEXT;
ALTER TABLE financing_agreements ADD COLUMN sgtx_signature_at TEXT;
ALTER TABLE financing_agreements ADD COLUMN financing_fee_rate REAL DEFAULT 0.0025;
ALTER TABLE financing_agreements ADD COLUMN financing_fee_amount REAL;
ALTER TABLE financing_agreements ADD COLUMN net_disbursed REAL;
ALTER TABLE financing_agreements ADD COLUMN disbursed_at TEXT;
ALTER TABLE financing_agreements ADD COLUMN repaid_at TEXT;
ALTER TABLE financing_agreements ADD COLUMN total_repaid REAL DEFAULT 0;
ALTER TABLE financing_agreements ADD COLUMN witness_clause_hash TEXT;

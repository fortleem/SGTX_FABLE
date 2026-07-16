-- Migration 0024: Blueprint v6.3 Full Gap Closure
-- Phase 5 (Physical Execution), Phase 7/8 (Distressed), Phase 10 (Disputes)
-- QC AQL Enforcement, Micro-contracts, Provider Tracking enhancements

-- ═══════════════════════════════════════════════════════════════════
-- 1. Phase 5: Loading Windows & Booking AI Extraction
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS loading_windows (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  shipment_id TEXT,
  ustn TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  port_code TEXT,
  port_name TEXT,
  warehouse_address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','MISSED')),
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_ai_extractions (
  id TEXT PRIMARY KEY,
  booking_confirmation_id TEXT,
  document_url TEXT,
  model_used TEXT DEFAULT 'HF_DONUT',
  extracted_fields TEXT, -- JSON: vessel, voyage, ETD, ETA, container_number, seal_number
  confidence_score REAL,
  human_verified INTEGER DEFAULT 0,
  verified_by TEXT,
  verification_notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Phase 5: Provider Invoice Comparison
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_comparisons (
  id TEXT PRIMARY KEY,
  provider_invoice_id TEXT,
  original_quote_id TEXT,
  ustn TEXT NOT NULL,
  discrepancies TEXT, -- JSON array of {field, quoted_value, invoiced_value, variance_pct}
  total_variance_amount REAL DEFAULT 0,
  total_variance_pct REAL DEFAULT 0,
  ai_recommendation TEXT CHECK(ai_recommendation IN ('APPROVE','FLAG','REJECT','ESCALATE')),
  approval_status TEXT DEFAULT 'PENDING' CHECK(approval_status IN ('PENDING','APPROVED','DISPUTED','ESCALATED')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Phase 7: MicroUSTN & Micro-Contracts (Part 3.7.7-3.7.8)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS micro_ustns (
  id TEXT PRIMARY KEY,
  parent_ustn TEXT NOT NULL,
  micro_ustn TEXT NOT NULL UNIQUE,
  portion_percentage REAL NOT NULL,
  portion_value REAL,
  currency TEXT DEFAULT 'USD',
  reason TEXT CHECK(reason IN ('PARTIAL_DISTRESS','PARTIAL_REJECT','SPLIT_DELIVERY','QUALITY_ISSUE')),
  status TEXT DEFAULT 'CREATED' CHECK(status IN ('CREATED','ACTIVE','SETTLED','CANCELLED')),
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS micro_contracts (
  id TEXT PRIMARY KEY,
  micro_ustn TEXT NOT NULL,
  parent_contract_id TEXT,
  buyer_tenant_id TEXT,
  seller_tenant_id TEXT,
  terms TEXT, -- JSON
  sgtx_fee_rate REAL,
  sgtx_fee_amount REAL,
  country_factor REAL DEFAULT 1.0,
  status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SIGNED','ACTIVE','SETTLED','CANCELLED')),
  signed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Phase 7: AI Condition Assessment & Dynamic Pricing
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS condition_assessments (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  ustn TEXT,
  model_used TEXT DEFAULT 'HF_VIT',
  images_analyzed INTEGER DEFAULT 0,
  condition_score REAL, -- 0-100
  condition_grade TEXT CHECK(condition_grade IN ('A','B','C','D','F')),
  defects_found TEXT, -- JSON array of {type, severity, confidence, bounding_box}
  environmental_factors TEXT, -- JSON: humidity, temperature, exposure_hours
  recommendation TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dynamic_pricing_runs (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  model_used TEXT DEFAULT 'XGBOOST',
  input_features TEXT, -- JSON: condition_score, hs_code, origin, market_price, days_in_port, etc.
  suggested_price REAL,
  price_floor REAL,
  price_ceiling REAL,
  currency TEXT DEFAULT 'USD',
  confidence REAL,
  market_comparison TEXT, -- JSON: percentile, similar_sales
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Phase 7: Outreach Mode & Privacy (Part 3.7.9)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  seller_tenant_id TEXT NOT NULL,
  mode TEXT DEFAULT 'STANDARD' CHECK(mode IN ('STANDARD','ACCELERATED')),
  privacy_notice_acknowledged INTEGER DEFAULT 0,
  privacy_notice_acknowledged_at TEXT,
  recipients TEXT, -- JSON array of GTIDs
  sent_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  offer_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 6. Phase 10: FeeLock Freeze & Dispute Evidence (Part 3.10.7)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feelock_freezes (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  dispute_id TEXT NOT NULL,
  lock_type TEXT DEFAULT 'FULL' CHECK(lock_type IN ('FULL','PARTIAL')),
  frozen_amount REAL,
  currency TEXT DEFAULT 'USD',
  frozen_by TEXT NOT NULL, -- governor or multisig
  freeze_reason TEXT,
  multisig_signatures TEXT, -- JSON array of signer IDs
  status TEXT DEFAULT 'FROZEN' CHECK(status IN ('FROZEN','RELEASED','PARTIALLY_RELEASED','FORFEITED')),
  released_at TEXT,
  released_by TEXT,
  release_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dispute_evidence_items (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  evidence_package_id TEXT,
  item_type TEXT CHECK(item_type IN ('DOCUMENT','QC_REPORT','QC_OVERRIDE','COMMUNICATION','TIMELINE','FINANCIAL','GOVERNOR_DECISION','BARCODE_SCAN','IOT_DATA','WITNESS')),
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  source_hash TEXT, -- SHA256 for authenticity
  ai_relevance_score REAL, -- 0-100
  auto_compiled INTEGER DEFAULT 0,
  is_authenticated INTEGER DEFAULT 0,
  authentication_method TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 7. Phase 10: Document Authenticity Check (Part 3.10.8)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_authenticity_checks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  dispute_id TEXT,
  check_type TEXT CHECK(check_type IN ('HASH_VERIFY','METADATA_ANALYSIS','AI_FORGERY_DETECT','BLOCKCHAIN_VERIFY','CROSS_REFERENCE')),
  result TEXT CHECK(result IN ('AUTHENTIC','SUSPICIOUS','TAMPERED','INCONCLUSIVE')),
  confidence REAL,
  details TEXT, -- JSON: specific findings
  model_used TEXT,
  checked_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 8. Phase 10: Arbitration Escalation (Part 3.10.9)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS arbitration_cases (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  ustn TEXT NOT NULL,
  arbitration_body TEXT, -- e.g. 'ICC', 'LCIA', 'SIAC', 'CIETAC'
  case_reference TEXT,
  jurisdiction TEXT,
  governing_law TEXT,
  claimant_gtid TEXT,
  respondent_gtid TEXT,
  claim_amount REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'FILED' CHECK(status IN ('FILED','ACCEPTED','HEARING','DELIBERATION','AWARDED','ENFORCING','CLOSED')),
  award_amount REAL,
  award_in_favor_of TEXT,
  award_date TEXT,
  sgtx_evidence_package_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 9. QC: AQL Enforcement & Override Accountability (Part 6.2.4)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS aql_sampling_plans (
  id TEXT PRIMARY KEY,
  qc_job_id TEXT NOT NULL,
  inspection_level TEXT DEFAULT 'GENERAL_II' CHECK(inspection_level IN ('SPECIAL_S1','SPECIAL_S2','SPECIAL_S3','SPECIAL_S4','GENERAL_I','GENERAL_II','GENERAL_III')),
  lot_size INTEGER NOT NULL,
  sample_size INTEGER NOT NULL,
  aql_major REAL DEFAULT 2.5,
  aql_minor REAL DEFAULT 4.0,
  aql_critical REAL DEFAULT 0,
  accept_major INTEGER NOT NULL,
  reject_major INTEGER NOT NULL,
  accept_minor INTEGER NOT NULL,
  reject_minor INTEGER NOT NULL,
  major_found INTEGER DEFAULT 0,
  minor_found INTEGER DEFAULT 0,
  critical_found INTEGER DEFAULT 0,
  result TEXT CHECK(result IN ('PASS','FAIL','PENDING')),
  calculated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qc_override_log (
  id TEXT PRIMARY KEY,
  qc_job_id TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  ai_finding TEXT NOT NULL, -- original AI finding
  ai_severity TEXT,
  override_action TEXT CHECK(override_action IN ('DOWNGRADE','DISMISS','RECLASSIFY','ACCEPT')),
  override_reason TEXT NOT NULL, -- minimum 10 chars enforced at API level
  override_evidence_url TEXT,
  flagged_for_dispute INTEGER DEFAULT 1,
  reviewed_by_supervisor INTEGER DEFAULT 0,
  supervisor_id TEXT,
  supervisor_decision TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 10. Add indexes for performance
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_loading_windows_ustn ON loading_windows(ustn);
CREATE INDEX IF NOT EXISTS idx_loading_windows_contract ON loading_windows(contract_id);
CREATE INDEX IF NOT EXISTS idx_micro_ustns_parent ON micro_ustns(parent_ustn);
CREATE INDEX IF NOT EXISTS idx_micro_contracts_micro_ustn ON micro_contracts(micro_ustn);
CREATE INDEX IF NOT EXISTS idx_condition_assessments_listing ON condition_assessments(listing_id);
CREATE INDEX IF NOT EXISTS idx_feelock_freezes_ustn ON feelock_freezes(ustn);
CREATE INDEX IF NOT EXISTS idx_feelock_freezes_dispute ON feelock_freezes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_items_dispute ON dispute_evidence_items(dispute_id);
CREATE INDEX IF NOT EXISTS idx_arbitration_cases_dispute ON arbitration_cases(dispute_id);
CREATE INDEX IF NOT EXISTS idx_aql_sampling_plans_job ON aql_sampling_plans(qc_job_id);
CREATE INDEX IF NOT EXISTS idx_qc_override_log_job ON qc_override_log(qc_job_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_listing ON outreach_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS idx_invoice_comparisons_ustn ON invoice_comparisons(ustn);

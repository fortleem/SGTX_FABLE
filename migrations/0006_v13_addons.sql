-- v13.1 Blueprint: Add-Ons 9-28 + GRiRE + SGTX Brain (SQLite/D1 dialect, TEXT PKs, no hard FKs per platform convention)

-- Add-On 9: Demurrage & Detention
CREATE TABLE IF NOT EXISTS demurrage_tracking (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, container_number TEXT NOT NULL,
  carrier_gtid TEXT, port_unlocode TEXT, container_type TEXT,
  free_time_days INTEGER DEFAULT 5, release_date TEXT, gate_out_date TEXT,
  actual_days_used INTEGER, excess_days INTEGER DEFAULT 0,
  demurrage_amount REAL DEFAULT 0, detention_amount REAL DEFAULT 0, total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD', status TEXT DEFAULT 'FREE_TIME',
  demurrage_breakdown TEXT, settled INTEGER DEFAULT 0, settled_at TEXT,
  governor_decision_id TEXT, created_at TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS carrier_demurrage_tariffs (
  id TEXT PRIMARY KEY, carrier_gtid TEXT NOT NULL, port_unlocode TEXT NOT NULL,
  container_type TEXT NOT NULL, free_time_days INTEGER NOT NULL,
  demurrage_rates TEXT, detention_rates TEXT, currency TEXT DEFAULT 'USD',
  valid_from TEXT, valid_to TEXT, is_active INTEGER DEFAULT 1, source TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS port_free_time (
  id TEXT PRIMARY KEY, port_unlocode TEXT NOT NULL, container_type TEXT NOT NULL,
  free_time_days INTEGER NOT NULL, extension_days INTEGER DEFAULT 0,
  extension_policy TEXT, carrier_specific INTEGER DEFAULT 0, last_updated TEXT
);
CREATE TABLE IF NOT EXISTS demurrage_alerts (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, alert_type TEXT NOT NULL, message TEXT,
  sent_to TEXT, sent_at TEXT, acknowledged INTEGER DEFAULT 0, acknowledged_at TEXT,
  governor_decision_id TEXT, created_at TEXT
);

-- Add-On 10: Broker Liability & Insurance
CREATE TABLE IF NOT EXISTS broker_liability_insurance (
  id TEXT PRIMARY KEY, broker_gtid TEXT NOT NULL, insurer TEXT, policy_number TEXT,
  coverage_amount REAL, currency TEXT DEFAULT 'EGP', valid_from TEXT, valid_to TEXT,
  certificate_url TEXT, verified INTEGER DEFAULT 0, verified_at TEXT,
  status TEXT DEFAULT 'ACTIVE', created_at TEXT
);
CREATE TABLE IF NOT EXISTS broker_declaration_errors (
  id TEXT PRIMARY KEY, broker_gtid TEXT NOT NULL, ustn TEXT, error_type TEXT,
  error_description TEXT, penalty_amount REAL, currency TEXT DEFAULT 'EGP',
  resolved INTEGER DEFAULT 0, resolved_at TEXT, governor_decision_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS broker_performance (
  id TEXT PRIMARY KEY, broker_gtid TEXT NOT NULL, total_declarations INTEGER DEFAULT 0,
  accepted_declarations INTEGER DEFAULT 0, rejected_declarations INTEGER DEFAULT 0,
  error_rate REAL, average_processing_time_hours REAL, last_assessment TEXT, rating REAL, created_at TEXT
);

-- Add-On 11: Customs Valuation Intelligence
CREATE TABLE IF NOT EXISTS customs_valuations (
  id TEXT PRIMARY KEY, ustn TEXT, hs_code TEXT NOT NULL, declared_value REAL,
  market_value_estimate REAL, duty_estimate REAL, duty_rate REAL, variance_pct REAL,
  risk_flag TEXT DEFAULT 'NONE', method TEXT DEFAULT 'TRANSACTION_VALUE',
  currency TEXT DEFAULT 'USD', ai_confidence REAL, explanation TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS valuation_disputes (
  id TEXT PRIMARY KEY, valuation_id TEXT, ustn TEXT, filed_by_gtid TEXT,
  dispute_reason TEXT, evidence TEXT, status TEXT DEFAULT 'OPEN',
  resolution TEXT, resolved_at TEXT, created_at TEXT
);

-- Add-On 12: Cold Chain Quality
CREATE TABLE IF NOT EXISTS cold_chain_requirements (
  id TEXT PRIMARY KEY, hs_code TEXT NOT NULL, commodity TEXT, temp_min_c REAL, temp_max_c REAL,
  humidity_pct REAL, ventilation TEXT, max_excursion_minutes INTEGER, shelf_life_days INTEGER,
  pti_required INTEGER DEFAULT 1, source TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS pti_certificates (
  id TEXT PRIMARY KEY, container_number TEXT NOT NULL, ustn TEXT, inspector_gtid TEXT,
  test_date TEXT, set_point_c REAL, result TEXT DEFAULT 'PASS', certificate_url TEXT,
  valid_to TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS cold_chain_readings (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, container_number TEXT, reading_time TEXT,
  temperature_c REAL, humidity_pct REAL, source TEXT DEFAULT 'IOT', created_at TEXT
);
CREATE TABLE IF NOT EXISTS cold_chain_anomalies (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, anomaly_type TEXT, severity TEXT DEFAULT 'MEDIUM',
  detected_at TEXT, reading_id TEXT, excursion_minutes INTEGER, resolved INTEGER DEFAULT 0,
  ai_analysis TEXT, created_at TEXT
);

-- Add-On 13: Inspection Agency Accreditation
CREATE TABLE IF NOT EXISTS accreditation_bodies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, jurisdiction TEXT, standard TEXT, website TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS inspection_accreditations (
  id TEXT PRIMARY KEY, agency_gtid TEXT NOT NULL, body_id TEXT, standard TEXT,
  scope TEXT, certificate_number TEXT, valid_from TEXT, valid_to TEXT,
  status TEXT DEFAULT 'ACTIVE', verified INTEGER DEFAULT 0, created_at TEXT
);

-- Add-On 14: Currency Risk
CREATE TABLE IF NOT EXISTS fx_rates (
  id TEXT PRIMARY KEY, base_currency TEXT NOT NULL, quote_currency TEXT NOT NULL,
  rate REAL NOT NULL, rate_date TEXT, source TEXT DEFAULT 'CBE', created_at TEXT
);
CREATE TABLE IF NOT EXISTS currency_exposures (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, tenant_id TEXT, exposure_currency TEXT,
  base_currency TEXT DEFAULT 'USD', exposure_amount REAL, hedged_amount REAL DEFAULT 0,
  var_estimate REAL, recommendation TEXT, created_at TEXT
);

-- Add-On 15: Government API Sandbox
CREATE TABLE IF NOT EXISTS gov_api_sandbox_tests (
  id TEXT PRIMARY KEY, api_name TEXT NOT NULL, test_type TEXT, request_payload TEXT,
  response_payload TEXT, status TEXT DEFAULT 'PENDING', latency_ms INTEGER,
  passed INTEGER, run_by TEXT, created_at TEXT
);

-- Add-On 16: FTA Preference
CREATE TABLE IF NOT EXISTS fta_agreements (
  id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT, member_countries TEXT,
  preference_scheme TEXT, certificate_type TEXT, in_force INTEGER DEFAULT 1, created_at TEXT
);
CREATE TABLE IF NOT EXISTS fta_claims (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, fta_code TEXT, hs_code TEXT,
  origin_country TEXT, destination_country TEXT, mfn_rate REAL, preference_rate REAL,
  savings_estimate REAL, certificate_status TEXT DEFAULT 'REQUIRED',
  status TEXT DEFAULT 'CLAIMED', governor_decision_id TEXT, created_at TEXT
);

-- Add-On 17: Piracy & Security Risk
CREATE TABLE IF NOT EXISTS security_corridors (
  id TEXT PRIMARY KEY, corridor_code TEXT NOT NULL, name TEXT, risk_level TEXT DEFAULT 'LOW',
  risk_score REAL, war_risk_premium_pct REAL DEFAULT 0, advisory TEXT, last_updated TEXT
);
CREATE TABLE IF NOT EXISTS security_incidents (
  id TEXT PRIMARY KEY, corridor_code TEXT, incident_type TEXT, severity TEXT,
  location TEXT, description TEXT, incident_date TEXT, source TEXT, created_at TEXT
);

-- Add-On 18: Trade Compliance Calendar
CREATE TABLE IF NOT EXISTS compliance_events (
  id TEXT PRIMARY KEY, tenant_id TEXT, ustn TEXT, event_type TEXT NOT NULL,
  title TEXT, description TEXT, due_date TEXT NOT NULL, jurisdiction TEXT,
  severity TEXT DEFAULT 'MEDIUM', completed INTEGER DEFAULT 0, completed_at TEXT,
  recurring TEXT, created_at TEXT
);

-- Add-On 19: Cargo Insurance
CREATE TABLE IF NOT EXISTS cargo_insurance_policies (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, provider_gtid TEXT, policy_number TEXT,
  coverage_type TEXT DEFAULT 'ICC_A', insured_value REAL, premium REAL, premium_rate_pct REAL,
  currency TEXT DEFAULT 'USD', valid_from TEXT, valid_to TEXT, certificate_url TEXT,
  status TEXT DEFAULT 'ISSUED', governor_decision_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS insurance_claims (
  id TEXT PRIMARY KEY, policy_id TEXT NOT NULL, ustn TEXT, claim_type TEXT,
  claimed_amount REAL, evidence TEXT, surveyor_gtid TEXT, status TEXT DEFAULT 'SUBMITTED',
  settled_amount REAL, settled_at TEXT, created_at TEXT
);

-- Add-On 20: Trade Finance Documentation
CREATE TABLE IF NOT EXISTS trade_finance_documents (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, doc_type TEXT NOT NULL, reference_number TEXT,
  issuer_gtid TEXT, beneficiary_gtid TEXT, amount REAL, currency TEXT DEFAULT 'USD',
  content TEXT, doc_hash TEXT, signatures TEXT, status TEXT DEFAULT 'DRAFT',
  signed_at TEXT, created_at TEXT
);

-- Add-On 21: Back-to-Back LC
CREATE TABLE IF NOT EXISTS back_to_back_lcs (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, master_lc_id TEXT, baby_lc_id TEXT,
  intermediary_gtid TEXT, master_amount REAL, baby_amount REAL, margin REAL,
  currency TEXT DEFAULT 'USD', issuing_bank_gtid TEXT, status TEXT DEFAULT 'STRUCTURED',
  governor_decision_id TEXT, created_at TEXT
);

-- Add-On 22: Force Majeure
CREATE TABLE IF NOT EXISTS force_majeure_events (
  id TEXT PRIMARY KEY, event_type TEXT NOT NULL, region TEXT, description TEXT,
  declared_by TEXT, start_date TEXT, end_date TEXT, active INTEGER DEFAULT 1,
  affected_corridors TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS force_majeure_claims (
  id TEXT PRIMARY KEY, event_id TEXT, ustn TEXT NOT NULL, contract_id TEXT,
  filed_by_gtid TEXT, claim_basis TEXT, evidence TEXT, extension_days_requested INTEGER,
  status TEXT DEFAULT 'FILED', resolution TEXT, governor_decision_id TEXT, created_at TEXT
);

-- Add-On 23: Shipper's Declaration & Export Docs
CREATE TABLE IF NOT EXISTS export_declarations (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, declaration_type TEXT DEFAULT 'EXPORT',
  exporter_gtid TEXT, hs_codes TEXT, goods_description TEXT, ead_mrn TEXT,
  licence_required INTEGER DEFAULT 0, licence_status TEXT, customs_office TEXT,
  status TEXT DEFAULT 'DRAFT', submitted_at TEXT, accepted_at TEXT, created_at TEXT
);

-- Add-On 24: Port & Terminal Integration
CREATE TABLE IF NOT EXISTS terminal_events (
  id TEXT PRIMARY KEY, ustn TEXT, container_number TEXT NOT NULL, terminal_code TEXT,
  event_type TEXT NOT NULL, event_time TEXT, gate_number TEXT, truck_plate TEXT,
  pre_advice_ref TEXT, source TEXT DEFAULT 'API', created_at TEXT
);

-- Add-On 25: Payment Guarantee Confirmation
CREATE TABLE IF NOT EXISTS payment_guarantees (
  id TEXT PRIMARY KEY, ustn TEXT NOT NULL, guarantor_bank_gtid TEXT, beneficiary_gtid TEXT,
  guarantee_type TEXT DEFAULT 'PAYMENT', amount REAL, currency TEXT DEFAULT 'USD',
  reference_number TEXT, confirmed INTEGER DEFAULT 0, confirmed_at TEXT,
  valid_to TEXT, status TEXT DEFAULT 'REQUESTED', created_at TEXT
);

-- Add-On 26: Demurrage Dispute Resolution
CREATE TABLE IF NOT EXISTS demurrage_disputes (
  id TEXT PRIMARY KEY, tracking_id TEXT, ustn TEXT NOT NULL, filed_by_gtid TEXT,
  disputed_amount REAL, dispute_basis TEXT, evidence TEXT, carrier_response TEXT,
  status TEXT DEFAULT 'OPEN', resolution_amount REAL, resolved_at TEXT, created_at TEXT
);

-- Add-On 28: GRiRE (Global Regulatory Intelligence & Requirements Engine)
CREATE TABLE IF NOT EXISTS country_regulatory_profiles (
  id TEXT PRIMARY KEY, country_code TEXT NOT NULL, profile_version INTEGER DEFAULT 1,
  regulatory_body TEXT, customs_authority TEXT, import_licence_required INTEGER,
  export_licence_required INTEGER, bond_required INTEGER, bond_factor_default REAL,
  bond_aeo_factor REAL, single_window TEXT, standard_free_time_days INTEGER,
  required_documents TEXT, cold_chain_authority TEXT, fta_memberships TEXT,
  confidence REAL DEFAULT 1.0, source_refs TEXT, last_updated TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS regulatory_sources (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL, url TEXT,
  country_code TEXT, coverage TEXT, is_active INTEGER DEFAULT 1, last_scraped TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS regulatory_changes (
  id TEXT PRIMARY KEY, country_code TEXT, change_type TEXT, summary TEXT,
  source_id TEXT, effective_date TEXT, confidence REAL, requires_review INTEGER DEFAULT 0,
  reviewed INTEGER DEFAULT 0, ai_summary TEXT, created_at TEXT
);

-- SGTX Brain (Directive 10): AI consensus orchestration + knowledge memory
CREATE TABLE IF NOT EXISTS brain_consensus_log (
  id TEXT PRIMARY KEY, task_type TEXT NOT NULL, prompt_hash TEXT, question TEXT,
  providers_queried TEXT, providers_responded TEXT, responses TEXT,
  consensus_verdict TEXT, consensus_confidence REAL, agreement_ratio REAL,
  latency_ms INTEGER, advisory_only INTEGER DEFAULT 1, ustn TEXT, tenant_id TEXT,
  governor_decision_id TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS brain_knowledge (
  id TEXT PRIMARY KEY, domain TEXT NOT NULL, topic TEXT NOT NULL, insight TEXT NOT NULL,
  source TEXT DEFAULT 'CONSENSUS', confidence REAL DEFAULT 0.5, usage_count INTEGER DEFAULT 0,
  last_used_at TEXT, verified INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demurrage_tracking_ustn ON demurrage_tracking(ustn);
CREATE INDEX IF NOT EXISTS idx_demurrage_alerts_ustn ON demurrage_alerts(ustn);
CREATE INDEX IF NOT EXISTS idx_broker_ins_broker ON broker_liability_insurance(broker_gtid);
CREATE INDEX IF NOT EXISTS idx_valuations_ustn ON customs_valuations(ustn);
CREATE INDEX IF NOT EXISTS idx_cc_readings_ustn ON cold_chain_readings(ustn);
CREATE INDEX IF NOT EXISTS idx_fx_rates_pair ON fx_rates(base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS idx_fta_claims_ustn ON fta_claims(ustn);
CREATE INDEX IF NOT EXISTS idx_compliance_due ON compliance_events(due_date);
CREATE INDEX IF NOT EXISTS idx_ins_policies_ustn ON cargo_insurance_policies(ustn);
CREATE INDEX IF NOT EXISTS idx_tf_docs_ustn ON trade_finance_documents(ustn);
CREATE INDEX IF NOT EXISTS idx_term_events_container ON terminal_events(container_number);
CREATE INDEX IF NOT EXISTS idx_crp_country ON country_regulatory_profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_brain_log_task ON brain_consensus_log(task_type);
CREATE INDEX IF NOT EXISTS idx_brain_knowledge_domain ON brain_knowledge(domain, topic);

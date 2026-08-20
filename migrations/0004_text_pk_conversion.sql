-- Migration 0004: convert INTEGER PKs to TEXT for UUID-based phase engine

CREATE TABLE trade_requests__new (
    id TEXT PRIMARY KEY,
    buyer_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    seller_tenant_id INTEGER REFERENCES tenants(id),
    raw_description TEXT,
    parsed_specs TEXT NOT NULL DEFAULT '{}',
    incoterm TEXT NOT NULL,
    multi_shipment_schedule TEXT,
    status TEXT DEFAULT 'INITIATED',
    marketplace_auto_attributed INTEGER DEFAULT 0,
    marketplace_partner_id INTEGER,
    created_by INTEGER NOT NULL REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
, assigned_exporter_id TEXT, draft_data TEXT, draft_expires_at TEXT, exporter_tenant_id TEXT, governor_decision_id TEXT, importer_tenant_id TEXT, seller_company_name TEXT, seller_gtid TEXT, specifications TEXT, transport_mode TEXT DEFAULT 'SEA_CARGO');
INSERT INTO trade_requests__new ("id", "buyer_tenant_id", "seller_tenant_id", "raw_description", "parsed_specs", "incoterm", "multi_shipment_schedule", "status", "marketplace_auto_attributed", "marketplace_partner_id", "created_by", "created_at", "updated_at", "assigned_exporter_id", "draft_data", "draft_expires_at", "exporter_tenant_id", "governor_decision_id", "importer_tenant_id", "seller_company_name", "seller_gtid", "specifications", "transport_mode") SELECT CAST("id" AS TEXT), "buyer_tenant_id", "seller_tenant_id", "raw_description", "parsed_specs", "incoterm", "multi_shipment_schedule", "status", "marketplace_auto_attributed", "marketplace_partner_id", "created_by", "created_at", "updated_at", "assigned_exporter_id", "draft_data", "draft_expires_at", "exporter_tenant_id", "governor_decision_id", "importer_tenant_id", "seller_company_name", "seller_gtid", "specifications", "transport_mode" FROM trade_requests;
DROP TABLE trade_requests;
ALTER TABLE trade_requests__new RENAME TO trade_requests;

CREATE TABLE employees__new (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    role_id INTEGER,
    role TEXT DEFAULT 'ADMIN',
    status TEXT DEFAULT 'ACTIVE',
    kyc_status TEXT DEFAULT 'PENDING',
    kyc_tier INTEGER DEFAULT 0,
    mfa_enabled INTEGER DEFAULT 0,
    active_trader_mode_context TEXT CHECK(active_trader_mode_context IN ('BUY','SELL','DUAL')),
    default_trader_mode TEXT DEFAULT 'DUAL' CHECK(default_trader_mode IN ('BUY','SELL','DUAL')),
    allow_role_switching INTEGER DEFAULT 1,
    preferred_language TEXT DEFAULT 'en',
    voice_stress_consent INTEGER DEFAULT 0,
    support_pin_hash TEXT,
    defi_risk_acknowledged_at TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')), invitation_expires_at TEXT, invitation_token TEXT,
    UNIQUE(tenant_id, email)
);
INSERT INTO employees__new ("id", "tenant_id", "email", "full_name", "password_hash", "role_id", "role", "status", "kyc_status", "kyc_tier", "mfa_enabled", "active_trader_mode_context", "default_trader_mode", "allow_role_switching", "preferred_language", "voice_stress_consent", "support_pin_hash", "defi_risk_acknowledged_at", "last_login_at", "created_at", "invitation_expires_at", "invitation_token") SELECT CAST("id" AS TEXT), "tenant_id", "email", "full_name", "password_hash", "role_id", "role", "status", "kyc_status", "kyc_tier", "mfa_enabled", "active_trader_mode_context", "default_trader_mode", "allow_role_switching", "preferred_language", "voice_stress_consent", "support_pin_hash", "defi_risk_acknowledged_at", "last_login_at", "created_at", "invitation_expires_at", "invitation_token" FROM employees;
DROP TABLE employees;
ALTER TABLE employees__new RENAME TO employees;

CREATE TABLE financing_requests__new (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    requester_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    tenor_days INTEGER NOT NULL,
    financing_type TEXT NOT NULL,
    preferred_settlement_method TEXT,
    credit_intelligence TEXT,
    status TEXT DEFAULT 'REQUESTED',
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_credit_score REAL, ai_default_probability REAL, ai_max_ltv REAL, collateral TEXT, collateral_type TEXT DEFAULT 'GOODS', contract_id TEXT, monte_carlo_default_prob REAL, preferred_currency TEXT DEFAULT 'USD', requested_amount REAL, shipment_id TEXT, special_instructions TEXT, trade_value REAL);
INSERT INTO financing_requests__new ("id", "ustn", "requester_tenant_id", "amount", "currency", "tenor_days", "financing_type", "preferred_settlement_method", "credit_intelligence", "status", "governor_decision_id", "created_at", "ai_credit_score", "ai_default_probability", "ai_max_ltv", "collateral", "collateral_type", "contract_id", "monte_carlo_default_prob", "preferred_currency", "requested_amount", "shipment_id", "special_instructions", "trade_value") SELECT CAST("id" AS TEXT), "ustn", "requester_tenant_id", "amount", "currency", "tenor_days", "financing_type", "preferred_settlement_method", "credit_intelligence", "status", "governor_decision_id", "created_at", "ai_credit_score", "ai_default_probability", "ai_max_ltv", "collateral", "collateral_type", "contract_id", "monte_carlo_default_prob", "preferred_currency", "requested_amount", "shipment_id", "special_instructions", "trade_value" FROM financing_requests;
DROP TABLE financing_requests;
ALTER TABLE financing_requests__new RENAME TO financing_requests;

CREATE TABLE financing_offers__new (
    id TEXT PRIMARY KEY,
    financing_request_id INTEGER NOT NULL REFERENCES financing_requests(id),
    financier_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount_offered REAL NOT NULL,
    apr REAL NOT NULL,
    bid_encrypted INTEGER DEFAULT 1,
    reserve_proof TEXT,
    settlement_method TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at TEXT DEFAULT (datetime('now'))
, all_in_cost REAL, amount REAL, co_finance_pct REAL, collateral_details TEXT, collateral_required TEXT, conditions TEXT DEFAULT '{}', created_at TEXT, effective_apr REAL, interest_rate REAL, tenor_days INTEGER);
INSERT INTO financing_offers__new ("id", "financing_request_id", "financier_tenant_id", "amount_offered", "apr", "bid_encrypted", "reserve_proof", "settlement_method", "status", "submitted_at", "all_in_cost", "amount", "co_finance_pct", "collateral_details", "collateral_required", "conditions", "created_at", "effective_apr", "interest_rate", "tenor_days") SELECT CAST("id" AS TEXT), "financing_request_id", "financier_tenant_id", "amount_offered", "apr", "bid_encrypted", "reserve_proof", "settlement_method", "status", "submitted_at", "all_in_cost", "amount", "co_finance_pct", "collateral_details", "collateral_required", "conditions", "created_at", "effective_apr", "interest_rate", "tenor_days" FROM financing_offers;
DROP TABLE financing_offers;
ALTER TABLE financing_offers__new RENAME TO financing_offers;

CREATE TABLE financing_agreements__new (
    id TEXT PRIMARY KEY,
    financing_request_id INTEGER NOT NULL REFERENCES financing_requests(id),
    financier_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    apr REAL NOT NULL,
    tenor_days INTEGER NOT NULL,
    sgtx_financing_fee REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'PENDING_SIGNATURES',
    ltv_ratio REAL,
    margin_call_issued INTEGER DEFAULT 0,
    disbursed_at TEXT,
    repaid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, collateral_terms TEXT, cryptographic_hash TEXT, disbursement_status TEXT DEFAULT 'PENDING', financing_fee_amount REAL, financing_fee_rate REAL DEFAULT 0.0025, financing_offer_id TEXT, net_disbursed REAL, repayment_schedule TEXT, sgtx_witness_signature TEXT, winning_offer_id TEXT, witness_clause_hash TEXT);
INSERT INTO financing_agreements__new ("id", "financing_request_id", "financier_tenant_id", "amount", "apr", "tenor_days", "sgtx_financing_fee", "status", "ltv_ratio", "margin_call_issued", "disbursed_at", "repaid_at", "created_at", "collateral_terms", "cryptographic_hash", "disbursement_status", "financing_fee_amount", "financing_fee_rate", "financing_offer_id", "net_disbursed", "repayment_schedule", "sgtx_witness_signature", "winning_offer_id", "witness_clause_hash") SELECT CAST("id" AS TEXT), "financing_request_id", "financier_tenant_id", "amount", "apr", "tenor_days", "sgtx_financing_fee", "status", "ltv_ratio", "margin_call_issued", "disbursed_at", "repaid_at", "created_at", "collateral_terms", "cryptographic_hash", "disbursement_status", "financing_fee_amount", "financing_fee_rate", "financing_offer_id", "net_disbursed", "repayment_schedule", "sgtx_witness_signature", "winning_offer_id", "witness_clause_hash" FROM financing_agreements;
DROP TABLE financing_agreements;
ALTER TABLE financing_agreements__new RENAME TO financing_agreements;

CREATE TABLE shipment_milestones__new (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    milestone TEXT NOT NULL,
    confirmed_at TEXT NOT NULL,
    confirmed_by INTEGER REFERENCES employees(id),
    confirmation_method TEXT DEFAULT 'manual',
    governor_decision_id INTEGER,
    scanned_barcode_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, evidence TEXT, evidence_hash TEXT, location TEXT, milestone_type TEXT, shipment_ustn TEXT);
INSERT INTO shipment_milestones__new ("id", "ustn", "milestone", "confirmed_at", "confirmed_by", "confirmation_method", "governor_decision_id", "scanned_barcode_id", "created_at", "evidence", "evidence_hash", "location", "milestone_type", "shipment_ustn") SELECT CAST("id" AS TEXT), "ustn", "milestone", "confirmed_at", "confirmed_by", "confirmation_method", "governor_decision_id", "scanned_barcode_id", "created_at", "evidence", "evidence_hash", "location", "milestone_type", "shipment_ustn" FROM shipment_milestones;
DROP TABLE shipment_milestones;
ALTER TABLE shipment_milestones__new RENAME TO shipment_milestones;

CREATE TABLE packing_plans__new (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    plan_data TEXT NOT NULL DEFAULT '{}',
    loading_guide TEXT,
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_recommendation TEXT, container_type TEXT, exporter_quote_id TEXT, pallet_details TEXT, status TEXT, total_pallets INTEGER, total_weight_kg REAL DEFAULT 0, trade_request_id TEXT, utilization_pct REAL, visual_layout TEXT, volume_cbm REAL, weight_kg REAL);
INSERT INTO packing_plans__new ("id", "ustn", "plan_data", "loading_guide", "locked_at", "governor_decision_id", "created_at", "ai_recommendation", "container_type", "exporter_quote_id", "pallet_details", "status", "total_pallets", "total_weight_kg", "trade_request_id", "utilization_pct", "visual_layout", "volume_cbm", "weight_kg") SELECT CAST("id" AS TEXT), "ustn", "plan_data", "loading_guide", "locked_at", "governor_decision_id", "created_at", "ai_recommendation", "container_type", "exporter_quote_id", "pallet_details", "status", "total_pallets", "total_weight_kg", "trade_request_id", "utilization_pct", "visual_layout", "volume_cbm", "weight_kg" FROM packing_plans;
DROP TABLE packing_plans;
ALTER TABLE packing_plans__new RENAME TO packing_plans;

CREATE TABLE documents__new (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    doc_type TEXT NOT NULL,
    doc_subtype TEXT,
    title TEXT NOT NULL,
    r2_key TEXT,
    file_hash TEXT,
    mime_type TEXT,
    file_size_bytes INTEGER,
    status TEXT DEFAULT 'UPLOADED',
    verified_by INTEGER REFERENCES employees(id),
    verified_at TEXT,
    ai_verified INTEGER DEFAULT 0,
    ai_confidence REAL,
    redacted_for_anonymous INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now'))
, ai_validation_result TEXT, ai_validation_status TEXT, document_type TEXT, filename TEXT, governor_decision_id TEXT, requirement_id TEXT, sha256_hash TEXT, shipment_ustn TEXT, storage_path TEXT, tenant_id TEXT, trade_request_id TEXT, uploaded_at TEXT, uploaded_by TEXT, verification_status TEXT);
INSERT INTO documents__new ("id", "ustn", "doc_type", "doc_subtype", "title", "r2_key", "file_hash", "mime_type", "file_size_bytes", "status", "verified_by", "verified_at", "ai_verified", "ai_confidence", "redacted_for_anonymous", "created_by", "created_at", "ai_validation_result", "ai_validation_status", "document_type", "filename", "governor_decision_id", "requirement_id", "sha256_hash", "shipment_ustn", "storage_path", "tenant_id", "trade_request_id", "uploaded_at", "uploaded_by", "verification_status") SELECT CAST("id" AS TEXT), "ustn", "doc_type", "doc_subtype", "title", "r2_key", "file_hash", "mime_type", "file_size_bytes", "status", "verified_by", "verified_at", "ai_verified", "ai_confidence", "redacted_for_anonymous", "created_by", "created_at", "ai_validation_result", "ai_validation_status", "document_type", "filename", "governor_decision_id", "requirement_id", "sha256_hash", "shipment_ustn", "storage_path", "tenant_id", "trade_request_id", "uploaded_at", "uploaded_by", "verification_status" FROM documents;
DROP TABLE documents;
ALTER TABLE documents__new RENAME TO documents;

CREATE TABLE disputes__new (
    id TEXT PRIMARY KEY,
    trade_request_id INTEGER REFERENCES trade_requests(id),
    contract_shipment_id INTEGER REFERENCES contract_shipments(id),
    financing_agreement_id INTEGER,
    ustn TEXT,
    filing_party_gtid TEXT NOT NULL,
    dispute_category TEXT NOT NULL CHECK(dispute_category IN ('QUALITY','DELAY','NON_PAYMENT','DOCUMENTATION_FRAUD','COLD_CHAIN','WEIGHT_SHORTAGE','SERVICE_QUALITY','FINANCING','SGTX_FEE','OTHER')),
    description TEXT,
    status TEXT DEFAULT 'FILED',
    mediation_log TEXT DEFAULT '[]',
    arbitration_case_id TEXT,
    resolution_contract_id INTEGER,
    ai_settlement_proposal TEXT,
    predicted_outcome TEXT,
    governor_decision_id INTEGER,
    filed_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
, category TEXT, created_at TEXT, dispute_type TEXT, evidence_ids TEXT, evidence_links TEXT, filed_by_tenant_id TEXT, remedy_sought TEXT, respondent_gtid TEXT, severity INTEGER DEFAULT 0);
INSERT INTO disputes__new ("id", "trade_request_id", "contract_shipment_id", "financing_agreement_id", "ustn", "filing_party_gtid", "dispute_category", "description", "status", "mediation_log", "arbitration_case_id", "resolution_contract_id", "ai_settlement_proposal", "predicted_outcome", "governor_decision_id", "filed_at", "resolved_at", "category", "created_at", "dispute_type", "evidence_ids", "evidence_links", "filed_by_tenant_id", "remedy_sought", "respondent_gtid", "severity") SELECT CAST("id" AS TEXT), "trade_request_id", "contract_shipment_id", "financing_agreement_id", "ustn", "filing_party_gtid", "dispute_category", "description", "status", "mediation_log", "arbitration_case_id", "resolution_contract_id", "ai_settlement_proposal", "predicted_outcome", "governor_decision_id", "filed_at", "resolved_at", "category", "created_at", "dispute_type", "evidence_ids", "evidence_links", "filed_by_tenant_id", "remedy_sought", "respondent_gtid", "severity" FROM disputes;
DROP TABLE disputes;
ALTER TABLE disputes__new RENAME TO disputes;

CREATE TABLE distressed_cargo_listings__new (
    id TEXT PRIMARY KEY,
    original_shipment_ustn TEXT REFERENCES shipments(ustn),
    micro_ustn TEXT,
    parent_ustn TEXT,
    seller_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    product_details TEXT DEFAULT '{}',
    quantity REAL NOT NULL,
    condition_score INTEGER,
    price_expectation REAL,
    floor_price REAL,
    listing_expiry TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    triage_path TEXT,
    privacy_notice_acknowledged INTEGER DEFAULT 0,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_price_recommendation TEXT, condition TEXT, current_location TEXT, exporter_tenant_id TEXT, pallet_ids TEXT DEFAULT '[]', price_currency TEXT DEFAULT 'USD', unit TEXT);
INSERT INTO distressed_cargo_listings__new ("id", "original_shipment_ustn", "micro_ustn", "parent_ustn", "seller_tenant_id", "product_details", "quantity", "condition_score", "price_expectation", "floor_price", "listing_expiry", "status", "triage_path", "privacy_notice_acknowledged", "governor_decision_id", "created_at", "ai_price_recommendation", "condition", "current_location", "exporter_tenant_id", "pallet_ids", "price_currency", "unit") SELECT CAST("id" AS TEXT), "original_shipment_ustn", "micro_ustn", "parent_ustn", "seller_tenant_id", "product_details", "quantity", "condition_score", "price_expectation", "floor_price", "listing_expiry", "status", "triage_path", "privacy_notice_acknowledged", "governor_decision_id", "created_at", "ai_price_recommendation", "condition", "current_location", "exporter_tenant_id", "pallet_ids", "price_currency", "unit" FROM distressed_cargo_listings;
DROP TABLE distressed_cargo_listings;
ALTER TABLE distressed_cargo_listings__new RENAME TO distressed_cargo_listings;

CREATE TABLE distressed_cargo_offers__new (
    id TEXT PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES distressed_cargo_listings(id),
    buyer_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id INTEGER,
    submitted_at TEXT DEFAULT (datetime('now'))
, created_at TEXT, currency TEXT DEFAULT 'USD', message TEXT, offer_amount REAL);
INSERT INTO distressed_cargo_offers__new ("id", "listing_id", "buyer_tenant_id", "amount", "status", "governor_decision_id", "submitted_at", "created_at", "currency", "message", "offer_amount") SELECT CAST("id" AS TEXT), "listing_id", "buyer_tenant_id", "amount", "status", "governor_decision_id", "submitted_at", "created_at", "currency", "message", "offer_amount" FROM distressed_cargo_offers;
DROP TABLE distressed_cargo_offers;
ALTER TABLE distressed_cargo_offers__new RENAME TO distressed_cargo_offers;

CREATE TABLE evidence_packages__new (
    id TEXT PRIMARY KEY,
    dispute_id INTEGER NOT NULL REFERENCES disputes(id),
    package TEXT NOT NULL DEFAULT '{}',
    loom_hash TEXT NOT NULL,
    verification_token TEXT UNIQUE,
    compiled_at TEXT DEFAULT (datetime('now'))
, ai_summary TEXT, auto_compiled TEXT, compiled_by TEXT DEFAULT 'AI_EVIDENCE_COMPILER', item_count TEXT, ustn TEXT);
INSERT INTO evidence_packages__new ("id", "dispute_id", "package", "loom_hash", "verification_token", "compiled_at", "ai_summary", "auto_compiled", "compiled_by", "item_count", "ustn") SELECT CAST("id" AS TEXT), "dispute_id", "package", "loom_hash", "verification_token", "compiled_at", "ai_summary", "auto_compiled", "compiled_by", "item_count", "ustn" FROM evidence_packages;
DROP TABLE evidence_packages;
ALTER TABLE evidence_packages__new RENAME TO evidence_packages;


-- ============================================================
-- SGTX v6.1 — Additional Tables (v6.0 Additions)
-- ============================================================

-- DeFi Protocols
CREATE TABLE IF NOT EXISTS defi_protocols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    chain TEXT NOT NULL,
    protocol_type TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    audit_reference TEXT,
    is_active INTEGER DEFAULT 1,
    risk_score REAL
);

CREATE TABLE IF NOT EXISTS defi_tranche_positions (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL REFERENCES financing_agreements(id),
    amount_stablecoin REAL NOT NULL,
    stablecoin TEXT NOT NULL,
    chain TEXT DEFAULT 'POLYGON',
    contract_address TEXT NOT NULL,
    deposit_tx_hash TEXT,
    withdrawal_tx_hash TEXT,
    depeg_alert_triggered INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT DEFAULT (datetime('now'))
);

-- v6.0 Advanced Tables
CREATE TABLE IF NOT EXISTS product_domain_ontologies (
    domain_id TEXT PRIMARY KEY,
    domain_name TEXT NOT NULL UNIQUE,
    parent_domain_id TEXT,
    domain_description TEXT,
    extraction_schema TEXT NOT NULL,
    hf_prompt_template TEXT NOT NULL,
    ui_component_mapping TEXT,
    required_certifications TEXT,
    default_incoterm_suggestion TEXT,
    risk_indicators TEXT,
    active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_mesh_sessions (
    session_id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    governor_decision_id TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS living_quotes (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT NOT NULL REFERENCES exporter_quotes(id),
    dynamic_pricing_enabled INTEGER DEFAULT 1,
    primary_route TEXT,
    contingency_route TEXT,
    last_price_update TEXT,
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_options (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    route_type TEXT NOT NULL,
    route_data TEXT,
    risk_score REAL,
    carbon_footprint_tons REAL,
    is_contingency INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS carrier_performance_profiles (
    carrier_id TEXT PRIMARY KEY,
    carrier_name TEXT NOT NULL,
    on_time_pct REAL,
    dispute_rate REAL,
    esg_score REAL,
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS pricing_anomalies (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    predicted_price REAL,
    actual_price REAL,
    deviation_pct REAL,
    flagged INTEGER DEFAULT 0,
    reviewed_by TEXT,
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS negotiation_threads (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    auto_negotiation_enabled INTEGER DEFAULT 0,
    auto_accept_threshold REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS contract_genesis_sessions (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    clause_confidence_scores TEXT,
    risk_scores TEXT,
    harmonization_strategy TEXT,
    shipment_schedule TEXT,
    smart_clause_pseudocode TEXT,
    compliance_requirements TEXT,
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_clauses (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    clause_type TEXT NOT NULL,
    clause_text TEXT NOT NULL,
    confidence_score REAL,
    risk_score REAL,
    requires_human_review INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS clause_risk_scores (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    risk_category TEXT NOT NULL,
    risk_score REAL,
    mitigation_suggestions TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS credit_assessments (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT NOT NULL REFERENCES financing_requests(id),
    credit_score REAL NOT NULL,
    signal_count INTEGER DEFAULT 0,
    recommended_structure TEXT,
    governor_decision_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_signals (
    id TEXT PRIMARY KEY,
    credit_assessment_id TEXT NOT NULL REFERENCES credit_assessments(id),
    signal_category TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    signal_value TEXT,
    weight REAL
);

CREATE TABLE IF NOT EXISTS liquidity_auctions (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT NOT NULL REFERENCES financing_requests(id),
    bid_window_start TEXT,
    bid_window_end TEXT,
    qualified_bidders INTEGER DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS defi_protocol_configs (
    id TEXT PRIMARY KEY,
    protocol_name TEXT NOT NULL,
    chain TEXT NOT NULL,
    risk_score REAL,
    audit_reference TEXT,
    is_active INTEGER DEFAULT 1,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS milestone_finance_triggers (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    milestone TEXT NOT NULL,
    trigger_action TEXT NOT NULL,
    oracle_integration TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS blockchain_verifications (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    contract_address TEXT,
    transaction_hash TEXT,
    verification_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS tokenized_trade_assets (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    token_standard TEXT NOT NULL,
    token_address TEXT,
    pricing_model TEXT,
    secondary_market_enabled INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS autonomous_milestones (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT NOT NULL REFERENCES shipments(ustn),
    milestone TEXT NOT NULL,
    consensus_threshold REAL NOT NULL,
    source_count INTEGER DEFAULT 0,
    auto_confirmed INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS sensor_consensus (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES autonomous_milestones(id),
    source_type TEXT NOT NULL,
    source_value TEXT,
    weight REAL,
    consensus_met INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exporter_capability_profiles (
    id TEXT PRIMARY KEY,
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    commodity_portfolio TEXT,
    production_capacity TEXT,
    export_history TEXT,
    certifications TEXT,
    target_markets TEXT,
    preferred_payment_terms TEXT,
    verified INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS provider_invoices (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    provider_quote_id TEXT REFERENCES provider_quotes(id),
    provider_gtid TEXT NOT NULL,
    invoice_amount REAL,
    extracted_amount REAL,
    discrepancy_flagged INTEGER DEFAULT 0,
    document_id TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS sanctions_proximity (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT NOT NULL,
    sanctioned_entity_gtid TEXT,
    proximity_hops INTEGER NOT NULL,
    relationship_path TEXT,
    risk_score REAL,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shell_detection (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT NOT NULL,
    detection_signals TEXT,
    confidence REAL,
    reviewed INTEGER DEFAULT 0,
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS fraud_detection (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT NOT NULL,
    fraud_type TEXT NOT NULL,
    graph_cycle_detected INTEGER DEFAULT 0,
    confidence REAL,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_triggers (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_data TEXT,
    severity TEXT,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS model_drift_records (
    id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    baseline_value REAL,
    current_value REAL,
    drift_score REAL,
    threshold_exceeded INTEGER DEFAULT 0,
    retraining_triggered INTEGER DEFAULT 0,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policy_suggestions (
    id TEXT PRIMARY KEY,
    suggested_by TEXT DEFAULT 'AI_POLICY_TUNER',
    rego_diff TEXT NOT NULL,
    rationale TEXT NOT NULL,
    supporting_data TEXT,
    status TEXT DEFAULT 'PENDING_REVIEW',
    reviewed_by TEXT,
    applied_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- AUTH SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    token_hash TEXT NOT NULL,
    active_portal TEXT DEFAULT 'dashboard',
    trader_mode TEXT DEFAULT 'DUAL',
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ebl_capability_matrix (
    carrier_id TEXT PRIMARY KEY,
    carrier_name TEXT NOT NULL,
    supported_platforms TEXT,
    supported_routes TEXT,
    last_verified TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS shipment_ebls (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT NOT NULL REFERENCES shipments(ustn),
    platform TEXT NOT NULL,
    platform_reference TEXT NOT NULL,
    issue_date TEXT,
    current_holder_gtid TEXT,
    status TEXT DEFAULT 'ISSUED',
    events TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS communication_channels (
    id TEXT PRIMARY KEY,
    connection_request_id TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    governor_monitoring_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connection_confirmations (
    id TEXT PRIMARY KEY,
    communication_channel_id TEXT NOT NULL REFERENCES communication_channels(id),
    importer_opt_in INTEGER NOT NULL,
    exporter_opt_in INTEGER NOT NULL,
    mutual_interest_confirmed INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id TEXT PRIMARY KEY,
    payment_attempt_id TEXT NOT NULL REFERENCES payment_attempts(id),
    webhook_signature TEXT NOT NULL,
    signature_verified INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS fee_calculations (
    id TEXT PRIMARY KEY,
    payment_attempt_id TEXT REFERENCES payment_attempts(id),
    net_commission REAL,
    gross_amount REAL,
    fee_breakdown TEXT,
    safety_buffer_applied INTEGER DEFAULT 1,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS fx_snapshots (
    id TEXT PRIMARY KEY,
    payment_attempt_id TEXT REFERENCES payment_attempts(id),
    contract_locked_rate REAL,
    current_rate REAL,
    deviation_pct REAL,
    within_tolerance INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS partner_lead_attributions (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    marketplace_partner_id TEXT REFERENCES marketplace_partners(id),
    attribution_type TEXT NOT NULL,
    revenue_share_pct REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS dynamic_field_extractions (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    field_name TEXT NOT NULL,
    extraction_confidence REAL,
    requires_confirmation INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS hs_code_classifications (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    hs_code_6digit TEXT,
    hs_code_8digit TEXT,
    confidence REAL,
    dual_use_flag INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS commodity_compatibility_warnings (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    conflicting_commodities TEXT,
    warning_type TEXT,
    message TEXT,
    overridden_by TEXT,
    override_reason TEXT
);

CREATE TABLE IF NOT EXISTS quote_selected_services (
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    provider_quote_id TEXT REFERENCES provider_quotes(id),
    service_type TEXT NOT NULL,
    selected_cost REAL,
    PRIMARY KEY(exporter_quote_id, service_type)
);

CREATE TABLE IF NOT EXISTS jurisdiction_conflicts (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    jurisdiction_a TEXT NOT NULL,
    jurisdiction_b TEXT NOT NULL,
    conflict_description TEXT,
    resolution_strategy TEXT,
    confidence REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS smart_clause_executions (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    clause_id TEXT,
    solidity_pseudocode TEXT,
    deployment_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS signature_sequences (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    sequence_config TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS shipment_schedules (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    shipment_number INTEGER NOT NULL,
    ustn TEXT,
    scheduled_loading_date TEXT,
    scheduled_delivery_date TEXT,
    contingency_plan TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS individual_financiers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    accreditation_status TEXT NOT NULL,
    investment_capacity REAL,
    preferred_instruments TEXT,
    risk_tolerance REAL,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS trade_composer_interactions (
    interaction_id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    session_id TEXT,
    turn_number INTEGER NOT NULL,
    user_message TEXT,
    agent_responses TEXT,
    suggested_actions TEXT,
    user_selected_action TEXT,
    context_delta TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

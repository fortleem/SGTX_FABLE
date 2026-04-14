-- ============================================================
-- SGTX PLATFORM v6.1 — D1 SQLite Schema
-- Sovereign, AI-Governed, Non-Custodial Global Trade Execution
-- ============================================================

-- ============================================================
-- IDENTITY LAYER
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    gtid TEXT UNIQUE NOT NULL,
    legal_name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('CORPORATE','FINANCIAL','LOGISTICS','QUALITY_CONTROL','REGULATORY','GOVERNMENT')),
    kyb_status TEXT DEFAULT 'PENDING' CHECK(kyb_status IN ('PENDING','SUBMITTED','VERIFIED','REJECTED','EXPIRED')),
    kyb_tier INTEGER DEFAULT 1,
    cryptographic_hash TEXT NOT NULL,
    public_key_pem TEXT,
    certificate_pem TEXT,
    immutable_since TEXT,
    risk_score REAL,
    sanctions_cleared INTEGER DEFAULT 0,
    aml_last_screened TEXT,
    default_trader_mode TEXT DEFAULT 'DUAL' CHECK(default_trader_mode IN ('BUY','SELL','DUAL')),
    icon_shuffle_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id TEXT,
    kyc_status TEXT DEFAULT 'PENDING',
    kyc_tier INTEGER DEFAULT 1,
    status TEXT DEFAULT 'INVITED' CHECK(status IN ('INVITED','PENDING_APPROVAL','ACTIVE','SUSPENDED','DEACTIVATED')),
    invitation_token TEXT,
    invitation_expires_at TEXT,
    approved_by TEXT,
    mfa_enabled INTEGER DEFAULT 0,
    default_trader_mode TEXT DEFAULT 'DUAL',
    icon_shuffle_permission INTEGER DEFAULT 1,
    password_hash TEXT,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL, -- JSON array
    allowed_trader_modes TEXT DEFAULT '["BUY","SELL","DUAL"]',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS employee_permissions (
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    grant_type TEXT NOT NULL CHECK(grant_type IN ('ALLOW','DENY')),
    trader_mode_context TEXT DEFAULT '["BUY","SELL","DUAL"]',
    granted_at TEXT DEFAULT (datetime('now')),
    granted_by TEXT,
    expires_at TEXT,
    PRIMARY KEY(employee_id, permission)
);

CREATE TABLE IF NOT EXISTS data_scopes (
    employee_id TEXT PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    country_access TEXT, -- JSON array
    document_types TEXT, -- JSON array
    max_transaction_value REAL,
    custom_filters TEXT, -- JSON
    trader_mode_filters TEXT -- JSON
);

CREATE TABLE IF NOT EXISTS tenant_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    ai_extracted TEXT, -- JSON
    verified_at TEXT,
    verified_by TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    visible_in_modes TEXT DEFAULT '["BUY","SELL","DUAL"]'
);

CREATE TABLE IF NOT EXISTS trust_scores (
    gtid TEXT PRIMARY KEY,
    score REAL NOT NULL,
    model_version TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    components TEXT, -- JSON
    buy_mode_score REAL,
    sell_mode_score REAL
);

CREATE TABLE IF NOT EXISTS trader_mode_sessions (
    session_id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    active_mode TEXT NOT NULL CHECK(active_mode IN ('BUY','SELL','DUAL')),
    shuffle_count INTEGER DEFAULT 0,
    last_shuffle_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

-- ============================================================
-- CORPORATE GRAPH
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_nodes (
    id TEXT PRIMARY KEY,
    gtid TEXT,
    entity_type TEXT NOT NULL,
    external_id TEXT,
    properties TEXT -- JSON
);

CREATE TABLE IF NOT EXISTS relationship_edges (
    from_id TEXT NOT NULL REFERENCES entity_nodes(id) ON DELETE CASCADE,
    to_id TEXT NOT NULL REFERENCES entity_nodes(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    weight REAL,
    properties TEXT, -- JSON
    PRIMARY KEY(from_id, to_id, relationship)
);

CREATE TABLE IF NOT EXISTS beneficial_owners (
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    individual_id TEXT NOT NULL REFERENCES entity_nodes(id) ON DELETE CASCADE,
    ownership_percentage REAL,
    verified_at TEXT,
    ubo_declaration_path TEXT,
    PRIMARY KEY(tenant_id, individual_id)
);

-- ============================================================
-- GOVERNANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS governor_decisions (
    decision_id TEXT PRIMARY KEY,
    decision_type TEXT NOT NULL,
    actor_gtid TEXT NOT NULL,
    actor_employee_id TEXT,
    verdict TEXT NOT NULL CHECK(verdict IN ('ALLOW','DENY','CONDITIONAL','ESCALATE','PENDING')),
    conditions TEXT, -- JSON
    policy_version TEXT NOT NULL,
    rule_refs TEXT, -- JSON array
    explainability TEXT,
    confidence REAL,
    loom_hash TEXT NOT NULL,
    cryptographic_signature TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_governor_decisions_actor ON governor_decisions(actor_gtid);
CREATE INDEX IF NOT EXISTS idx_governor_decisions_type ON governor_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_governor_decisions_created ON governor_decisions(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    before_data TEXT, -- JSON
    after_data TEXT, -- JSON
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_inference_records (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    authority_level TEXT NOT NULL CHECK(authority_level IN ('A0','A1','A2','A3','A4')),
    action_context TEXT NOT NULL, -- JSON
    decision TEXT NOT NULL, -- JSON
    confidence REAL,
    shap_values TEXT, -- JSON
    explanation TEXT,
    loom_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loom_logs (
    id TEXT PRIMARY KEY,
    governor_decision_id TEXT NOT NULL REFERENCES governor_decisions(decision_id),
    loom_hash TEXT NOT NULL,
    agent_reasoning TEXT, -- JSON
    deterministic_replay_enabled INTEGER DEFAULT 1,
    logged_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TRADE CORE
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_requests (
    id TEXT PRIMARY KEY,
    importer_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    exporter_tenant_id TEXT,
    raw_description TEXT,
    parsed_specs TEXT NOT NULL, -- JSON
    specifications TEXT, -- JSON
    parsing_confidence REAL,
    dual_use_flag INTEGER DEFAULT 0,
    dual_use_category TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','MATCHING','PENDING_EXPORTER_RESPONSE','QUOTED','NEGOTIATING','CONTRACTED','FINANCING','IN_EXECUTION','COMPLETED','CANCELLED','DISPUTED')),
    match_results TEXT, -- JSON
    assigned_exporter_id TEXT,
    governor_decision_id TEXT NOT NULL REFERENCES governor_decisions(decision_id),
    created_by TEXT NOT NULL REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_channels (
    channel_id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    importer_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    partner_source TEXT,
    channel_status TEXT DEFAULT 'ACTIVE',
    current_phase INTEGER DEFAULT 1,
    jurisdiction_rules_snapshot TEXT NOT NULL, -- JSON
    incoterm_rules_snapshot TEXT, -- JSON
    domain_ontology_snapshot TEXT, -- JSON
    match_score_at_creation REAL,
    sustainability_score_at_creation REAL,
    creation_governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exporter_quotes (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    exporter_tenant_id TEXT NOT NULL,
    exw_price REAL NOT NULL,
    exw_currency TEXT NOT NULL,
    exw_locked_at TEXT NOT NULL,
    incoterm TEXT NOT NULL,
    validity_days INTEGER DEFAULT 15,
    status TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider_quotes (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    provider_gtid TEXT NOT NULL,
    provider_type TEXT,
    is_bundle INTEGER DEFAULT 0,
    bundle_breakdown TEXT, -- JSON
    total_cost REAL,
    contract_reference TEXT,
    is_contract_rate INTEGER DEFAULT 0,
    route_details TEXT, -- JSON
    ai_benchmark_deviation REAL,
    status TEXT,
    governor_decision_id TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS negotiation_sessions (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    messages TEXT DEFAULT '[]', -- JSON
    current_offer TEXT, -- JSON
    counter_offers TEXT DEFAULT '[]', -- JSON
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT NOT NULL,
    started_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    contract_type TEXT NOT NULL DEFAULT 'SINGLE_SHIPMENT',
    incoterm TEXT NOT NULL,
    incoterm_rules TEXT NOT NULL, -- JSON
    clauses TEXT NOT NULL, -- JSON
    multi_shipment_schedule TEXT, -- JSON
    governing_law TEXT NOT NULL,
    dispute_resolution TEXT NOT NULL,
    special_requests TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_SIGNATURES','LOCKED','ACTIVE','COMPLETED','DISPUTED','TERMINATED')),
    cryptographic_hash TEXT,
    importer_signature TEXT,
    exporter_signature TEXT,
    signed_at TEXT,
    locked_at TEXT,
    commission_lock_id TEXT,
    commission_responsibility TEXT, -- JSON
    commission_allocation TEXT, -- JSON
    marketplace_partner_id TEXT,
    exporter_commission_pct REAL,
    importer_commission_pct REAL,
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commission_locks (
    lock_id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    trade_id TEXT NOT NULL REFERENCES trade_requests(id),
    commission_rate_pct REAL NOT NULL,
    commission_usd REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PARTIALLY_RELEASED','FULLY_RELEASED','DISPUTED','CANCELLED')),
    release_conditions TEXT NOT NULL, -- JSON
    released_pct REAL DEFAULT 0,
    kv_version INTEGER,
    responsible_tenant_id TEXT,
    governor_decision_id TEXT NOT NULL,
    locked_at TEXT DEFAULT (datetime('now')),
    fully_released_at TEXT
);

CREATE TABLE IF NOT EXISTS commission_payment_requests (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    party_type TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    amount REAL,
    currency TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'PENDING',
    payment_reference TEXT,
    paid_at TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS commission_calculations (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL,
    contract_id TEXT,
    effective_margin_pct REAL,
    base_rate_pct REAL,
    country_boost_pct REAL,
    seasonality_pct REAL,
    geopolitical_risk_pct REAL,
    volume_discount_pct REAL,
    perishability_surcharge_pct REAL,
    anomaly_correction_pct REAL,
    final_rate_pct REAL,
    commission_usd REAL,
    explanation TEXT,
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SHIPMENT & MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    ustn TEXT UNIQUE NOT NULL,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    contract_sequence_number INTEGER DEFAULT 1,
    booking_number TEXT,
    loading_date TEXT,
    loading_time_slot TEXT,
    status TEXT DEFAULT 'CREATED' CHECK(status IN ('CREATED','GATED_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_IMPORT','DELIVERED','DISPUTED','DISTRESSED')),
    current_milestone TEXT,
    origin_port TEXT,
    destination_port TEXT,
    vessel_name TEXT,
    imo_number TEXT,
    transport_legs TEXT, -- JSON
    ai_predictions TEXT, -- JSON
    carbon_footprint_tons REAL,
    esg_score REAL,
    ais_last_position TEXT, -- JSON
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipment_milestones (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    milestone TEXT NOT NULL,
    confirmed_at TEXT NOT NULL,
    confirmed_by TEXT,
    confirmation_method TEXT,
    ai_verdict TEXT, -- JSON
    evidence_hash TEXT,
    commission_release TEXT, -- JSON
    scanned_barcode_id TEXT,
    governor_decision_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shipment_milestones_confirmed ON shipment_milestones(confirmed_at);

CREATE TABLE IF NOT EXISTS shipment_barcodes (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    barcode_type TEXT NOT NULL,
    barcode_data TEXT NOT NULL,
    pallet_number INTEGER,
    sscc TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS iot_sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    sensor_type TEXT NOT NULL,
    value TEXT NOT NULL, -- JSON
    unit TEXT,
    anomaly_flag INTEGER DEFAULT 0,
    recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disruption_predictions (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    prediction_type TEXT NOT NULL,
    probability REAL NOT NULL,
    affected_route TEXT,
    predicted_delay_days INTEGER,
    data_sources TEXT, -- JSON array
    recommendation TEXT,
    ai_model_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider_status_updates (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    submitting_provider_gtid TEXT NOT NULL,
    actual_service_provider_gtid TEXT,
    milestone TEXT NOT NULL,
    status_data TEXT, -- JSON
    confirmed_at TEXT DEFAULT (datetime('now')),
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS carbon_footprint_calculations (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL REFERENCES shipments(id),
    route_distance_nm REAL,
    vessel_type TEXT,
    cargo_weight_mt REAL,
    total_co2e_tons REAL,
    calculation_method TEXT DEFAULT 'IMO_EEXI_2023',
    calculated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shipment_document_requirements (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    document_type TEXT NOT NULL,
    responsible_party_type TEXT,
    responsible_tenant_id TEXT,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    requirement_id TEXT,
    trade_request_id TEXT,
    shipment_ustn TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    uploaded_by_provider_gtid TEXT,
    document_type TEXT NOT NULL,
    filename TEXT,
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    previous_version_id TEXT,
    uploaded_by TEXT NOT NULL,
    metadata TEXT, -- JSON
    ai_extracted TEXT, -- JSON
    verification_status TEXT DEFAULT 'PENDING',
    verified_at TEXT,
    governor_decision_id TEXT,
    uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_documents (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    document_type TEXT NOT NULL,
    draft_data TEXT NOT NULL, -- JSON
    status TEXT DEFAULT 'DRAFT',
    finalized_document_id TEXT,
    finalized_at TEXT
);

-- ============================================================
-- FINANCING & SETTLEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS financing_requests (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id),
    requester_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    tenor_days INTEGER NOT NULL,
    financing_type TEXT NOT NULL,
    collateral TEXT, -- JSON
    credit_intelligence TEXT, -- JSON
    status TEXT DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','BIDDING','AWARDED','ACTIVE','REPAID','DEFAULTED')),
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financing_offers (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT NOT NULL REFERENCES financing_requests(id),
    financier_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    effective_apr REAL NOT NULL,
    all_in_cost REAL,
    collateral_required TEXT, -- JSON
    conditions TEXT, -- JSON
    bid_encrypted INTEGER DEFAULT 1,
    bid_opened_at TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financing_agreements (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT NOT NULL REFERENCES financing_requests(id),
    winning_offer_id TEXT NOT NULL REFERENCES financing_offers(id),
    annex_clauses TEXT, -- JSON
    financier_signature TEXT,
    requester_signature TEXT,
    commission_lock_id TEXT,
    defi_contract_address TEXT,
    defi_transaction_hash TEXT,
    stablecoin TEXT,
    cryptographic_hash TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settlement_instructions (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    instruction_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    status TEXT DEFAULT 'PENDING',
    psp_reference TEXT,
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settlement_confirmations (
    id TEXT PRIMARY KEY,
    instruction_id TEXT NOT NULL REFERENCES settlement_instructions(id),
    proof_hash TEXT NOT NULL,
    amount_confirmed REAL,
    currency_confirmed TEXT,
    fx_rate_applied REAL,
    psp_name TEXT,
    webhook_received_at TEXT,
    verified_by_ai INTEGER DEFAULT 0,
    ai_verdict TEXT, -- JSON
    governor_decision_id TEXT NOT NULL,
    confirmed_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- PAYMENT ORCHESTRATION
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_aggregators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    country_codes TEXT NOT NULL, -- JSON array
    supported_currencies TEXT, -- JSON array
    supports_split INTEGER DEFAULT 1,
    api_endpoint TEXT,
    uptime_score REAL,
    last_health_check TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS payment_attempts (
    id TEXT PRIMARY KEY,
    commission_lock_id TEXT NOT NULL REFERENCES commission_locks(lock_id),
    aggregator_id TEXT NOT NULL REFERENCES payment_aggregators(id),
    buyer_country TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount_local REAL NOT NULL,
    currency_local TEXT NOT NULL,
    amount_usd REAL,
    fx_rate REAL,
    commission_amount_usd REAL NOT NULL,
    exporter_amount REAL,
    fee_responsibility TEXT, -- JSON
    psp_fee_usd REAL,
    wire_fee_usd REAL,
    status TEXT DEFAULT 'INITIATED',
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    psp_transaction_id TEXT,
    split_executed_at TEXT,
    commission_settled_at TEXT,
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commission_receipts (
    id TEXT PRIMARY KEY,
    payment_attempt_id TEXT NOT NULL REFERENCES payment_attempts(id),
    amount_usd REAL NOT NULL,
    received_at TEXT NOT NULL,
    bank_reference TEXT,
    reconciled INTEGER DEFAULT 0,
    reconciled_at TEXT
);

-- ============================================================
-- DISTRESSED CARGO & BUYER SEARCH
-- ============================================================
CREATE TABLE IF NOT EXISTS distressed_cargo_listings (
    id TEXT PRIMARY KEY,
    original_shipment_ustn TEXT REFERENCES shipments(ustn),
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    product_details TEXT NOT NULL, -- JSON
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    current_location TEXT NOT NULL,
    condition TEXT NOT NULL,
    price_expectation REAL,
    price_currency TEXT DEFAULT 'USD',
    listing_expiry TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    ai_price_recommendation TEXT, -- JSON
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_distressed_active ON distressed_cargo_listings(status) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS distressed_cargo_offers (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES distressed_cargo_listings(id),
    buyer_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    ai_risk_flag TEXT, -- JSON
    governor_decision_id TEXT NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyer_search_requests (
    id TEXT PRIMARY KEY,
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    product_details TEXT NOT NULL, -- JSON
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    target_regions TEXT, -- JSON array
    preferred_payment_methods TEXT, -- JSON array
    min_buyer_trust_score REAL,
    listing_expiry TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    ai_match_results TEXT, -- JSON
    governor_decision_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_buyer_search_active ON buyer_search_requests(status) WHERE status = 'ACTIVE';

-- ============================================================
-- ESG, JURISDICTION, COMPLIANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS jurisdictions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sanctions_level TEXT NOT NULL,
    regulatory_body TEXT,
    last_updated TEXT DEFAULT (datetime('now')),
    kyc_tier_required INTEGER DEFAULT 2,
    registry_api_endpoint TEXT,
    customs_api_endpoint TEXT,
    cbdc_status TEXT DEFAULT 'NONE',
    psp_partners TEXT, -- JSON
    reporting_requirements TEXT -- JSON
);

CREATE TABLE IF NOT EXISTS esg_assessments (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    esg_score REAL NOT NULL,
    environmental_score REAL,
    social_score REAL,
    governance_score REAL,
    carbon_intensity REAL,
    green_certifications TEXT, -- JSON array
    model_version TEXT,
    assessed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_gtid TEXT,
    details TEXT NOT NULL, -- JSON
    severity TEXT NOT NULL,
    sar_drafted INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_checks (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT,
    check_type TEXT NOT NULL,
    result TEXT NOT NULL,
    flags TEXT, -- JSON array
    governor_decision_id TEXT,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sanctions_cache (
    id TEXT PRIMARY KEY,
    list_source TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_type TEXT,
    country_code TEXT,
    list_updated_at TEXT,
    cached_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    filing_party_gtid TEXT NOT NULL,
    dispute_type TEXT NOT NULL,
    description TEXT,
    evidence_links TEXT, -- JSON array
    status TEXT DEFAULT 'FILED',
    mediation_log TEXT DEFAULT '[]', -- JSON
    arbitration_case_id TEXT,
    resolution_contract_id TEXT,
    governor_decision_id TEXT NOT NULL,
    filed_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS dispute_recommendations (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL REFERENCES disputes(id),
    ai_prediction TEXT,
    suggested_settlement TEXT, -- JSON
    confidence REAL,
    shap_values TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- MARKETPLACE & CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_partners (
    id TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    commission_split_percent REAL,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tenant_contacts (
    tenant_id TEXT REFERENCES tenants(id),
    contact_gtid TEXT,
    relationship_type TEXT,
    trade_count INTEGER DEFAULT 0,
    total_value REAL DEFAULT 0,
    first_interaction TEXT,
    last_interaction TEXT,
    is_favorite INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    PRIMARY KEY(tenant_id, contact_gtid)
);

-- ============================================================
-- COMMISSION AI & OPTIMIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS commodity_profit_margins (
    id TEXT PRIMARY KEY,
    hs_code TEXT NOT NULL,
    origin_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    estimated_margin_pct REAL,
    confidence REAL,
    model_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS country_commodity_factors (
    origin_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    hs_code TEXT NOT NULL,
    profit_boost_pct REAL,
    last_calculated TEXT,
    model_version TEXT,
    PRIMARY KEY(origin_country, destination_country, hs_code)
);

CREATE TABLE IF NOT EXISTS seasonal_adjustments (
    commodity_category TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    adjustment_pct REAL,
    valid_from_year INTEGER,
    PRIMARY KEY(commodity_category, week_number)
);

CREATE TABLE IF NOT EXISTS fee_optimisation_runs (
    id TEXT PRIMARY KEY,
    current_rates TEXT NOT NULL, -- JSON
    proposed_rates TEXT NOT NULL, -- JSON
    expected_revenue REAL,
    expected_volume INTEGER,
    confidence REAL,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- LOCATION & TRUCKING
-- ============================================================
CREATE TABLE IF NOT EXISTS geocoded_locations (
    id TEXT PRIMARY KEY,
    address_text TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    place_id TEXT
);

CREATE TABLE IF NOT EXISTS trucking_gps_traces (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    anonymized_trace TEXT, -- JSON
    actual_distance_km REAL,
    actual_duration_min INTEGER
);

CREATE TABLE IF NOT EXISTS route_correction_factors (
    origin_geohash TEXT,
    destination_geohash TEXT,
    time_of_day_bucket INTEGER,
    day_of_week INTEGER,
    distance_multiplier REAL DEFAULT 1.0,
    time_multiplier REAL DEFAULT 1.0,
    PRIMARY KEY(origin_geohash, destination_geohash, time_of_day_bucket, day_of_week)
);

-- ============================================================
-- LEGAL & SOVEREIGN
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_disclaimers (
    id TEXT PRIMARY KEY,
    disclaimer_text TEXT NOT NULL,
    version TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    displayed_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sovereign_nodes (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL UNIQUE,
    node_endpoint TEXT NOT NULL,
    data_residency_policy TEXT, -- JSON
    regulatory_framework TEXT, -- JSON array
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- KYB/KYC SUPPORT
-- ============================================================
CREATE TABLE IF NOT EXISTS government_registries (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    registry_name TEXT NOT NULL,
    api_endpoint TEXT,
    api_type TEXT,
    data_fields TEXT, -- JSON array
    update_frequency TEXT,
    last_synced TEXT
);

CREATE TABLE IF NOT EXISTS pep_cache (
    id TEXT PRIMARY KEY,
    individual_name TEXT NOT NULL,
    position TEXT,
    country_code TEXT,
    list_source TEXT NOT NULL,
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS tenant_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    public_key_pem TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    certificate_pem TEXT,
    key_usage TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT
);

-- ============================================================
-- ADDITIONAL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON trust_scores(score);
CREATE INDEX IF NOT EXISTS idx_entity_nodes_external ON entity_nodes(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_active ON payment_attempts(status) WHERE status IN ('INITIATED','PROCESSING');
CREATE INDEX IF NOT EXISTS idx_commission_receipts_pending ON commission_receipts(reconciled) WHERE reconciled = 0;

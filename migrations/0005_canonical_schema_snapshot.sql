-- Migration 0005: canonical schema snapshot (post E2E reconciliation, 36/36 pass)
-- Supersedes ad-hoc fixes: TEXT PKs for UUID engine, relaxed NOT NULLs, FK strips

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    employee_id INTEGER REFERENCES employees(id),
    ustn TEXT,
    action TEXT NOT NULL,
    description TEXT,
    activity_type TEXT DEFAULT 'INFO' CHECK(activity_type IN ('SUCCESS','INFO','WARNING','CRITICAL')),
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "agent_mesh_sessions" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  employee_id TEXT,
  session_type TEXT,
  agents_activated TEXT DEFAULT '[]',
  status TEXT DEFAULT 'ACTIVE',
  loom_entries TEXT DEFAULT '[]',
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS "ai_agents" (
    id TEXT PRIMARY KEY,
    agent_name TEXT UNIQUE,
    authority_level TEXT CHECK(authority_level IN ('A0','A1','A2','A3','A4')),
    preferred_api TEXT DEFAULT 'groq', -- groq, huggingface_local, hybrid
    description TEXT,
    phase_integration TEXT, -- JSON array of phases
    model_name TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "ai_inference_records" (
    id TEXT PRIMARY KEY,
    agent_name TEXT,
    authority_level TEXT CHECK(authority_level IN ('A0','A1','A2','A3','A4')),
    action_context TEXT, -- JSON
    decision TEXT, -- JSON
    confidence REAL,
    shap_values TEXT, -- JSON
    explanation TEXT,
    loom_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, agent_id INTEGER, cost_usd REAL, decision_type TEXT, fallback_provider TEXT, fallback_used TEXT, governor_decision_id INTEGER, input_summary TEXT, latency_ms REAL, model_name TEXT, model_provider TEXT, output_summary TEXT, request_context TEXT, tokens_used TEXT);

CREATE TABLE IF NOT EXISTS "ai_model_versions" (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES ai_agents(id),
    model_name TEXT,
    version TEXT,
    metrics TEXT, -- JSON: accuracy, latency, etc.
    drift_score REAL,
    deployed_at TEXT DEFAULT (datetime('now')),
    retired_at TEXT
);

CREATE TABLE IF NOT EXISTS "ai_notes_suggestions" (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  tenant_id TEXT,
  trade_context TEXT,
  suggestions TEXT,
  ai_provider TEXT DEFAULT 'groq',
  accepted_suggestions TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "ai_product_spec_templates" (
  id TEXT PRIMARY KEY,
  commodity_type TEXT,
  product_name TEXT,
  hs_code TEXT,
  spec_fields TEXT,
  ai_provider TEXT DEFAULT 'groq',
  cache_ttl_hours INTEGER DEFAULT 168,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anonymous_trade_declassification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anonymous_ustn TEXT NOT NULL,
    requestor_gtid TEXT NOT NULL,
    approver_gtids TEXT,
    reason TEXT NOT NULL,
    redacted_data_hash TEXT,
    governor_decision_id INTEGER,
    loom_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "anonymous_trade_mappings" (
    id TEXT PRIMARY KEY,
    real_ustn TEXT REFERENCES shipments(ustn),
    anonymous_ustn TEXT UNIQUE,
    buyer_gtid TEXT,
    seller_gtid TEXT,
    created_by INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    revoke_reason TEXT,
    revoked_by INTEGER REFERENCES employees(id)
, authorized_viewers TEXT, redacted_fields TEXT);

CREATE TABLE IF NOT EXISTS anonymous_trades (
  id TEXT PRIMARY KEY, ustn TEXT, requestor_tenant_id TEXT,
  anonymity_level TEXT DEFAULT 'FULL', anonymity_revoked INTEGER DEFAULT 0,
  revoked_by TEXT, revoke_reason TEXT, revoked_at TEXT, data_hash TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    key_hash TEXT UNIQUE NOT NULL,
    label TEXT,
    scopes TEXT DEFAULT '[]',
    last_used_at TEXT,
    expires_at TEXT,
    revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "aql_sampling_plans" (
  id TEXT PRIMARY KEY,
  qc_job_id TEXT,
  inspection_level TEXT DEFAULT 'GENERAL_II' CHECK(inspection_level IN ('SPECIAL_S1','SPECIAL_S2','SPECIAL_S3','SPECIAL_S4','GENERAL_I','GENERAL_II','GENERAL_III')),
  lot_size INTEGER,
  sample_size INTEGER,
  aql_major REAL DEFAULT 2.5,
  aql_minor REAL DEFAULT 4.0,
  aql_critical REAL DEFAULT 0,
  accept_major INTEGER,
  reject_major INTEGER,
  accept_minor INTEGER,
  reject_minor INTEGER,
  major_found INTEGER DEFAULT 0,
  minor_found INTEGER DEFAULT 0,
  critical_found INTEGER DEFAULT 0,
  result TEXT CHECK(result IN ('PASS','FAIL','PENDING')),
  calculated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "arbitration_cases" (
  id TEXT PRIMARY KEY,
  dispute_id TEXT,
  ustn TEXT,
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

CREATE TABLE IF NOT EXISTS "audit_log" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    record_id INTEGER,
    action TEXT,
    before_data TEXT,
    after_data TEXT,
    changed_by INTEGER REFERENCES employees(id),
    changed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "auth_sessions" (
    id TEXT PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    tenant_id INTEGER REFERENCES tenants(id),
    token_hash TEXT UNIQUE,
    device_fingerprint TEXT,
    ip_address TEXT,
    user_agent TEXT,
    risk_score REAL DEFAULT 0,
    expires_at TEXT,
    last_activity TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
, active_portal TEXT, trader_mode TEXT);

CREATE TABLE IF NOT EXISTS auto_reconciliation_results (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    reconciliation_confidence REAL,
    mismatch_details TEXT,
    requires_human_review INTEGER DEFAULT 0,
    reviewed_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, expected_amount REAL, payment_attempt_id INTEGER, received_amount REAL, reconciled_by TEXT, result_status TEXT, variance TEXT, variance_pct REAL);

CREATE TABLE IF NOT EXISTS "autonomous_milestones" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    milestone TEXT,
    consensus_threshold REAL,
    source_count INTEGER DEFAULT 0,
    auto_confirmed INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "autonomous_recovery_actions" (
    id TEXT PRIMARY KEY,
    disruption_id TEXT,
    action_type TEXT,
    cost_estimate REAL,
    auto_execute_threshold REAL,
    requires_approval INTEGER DEFAULT 1,
    approved_at TEXT,
    executed_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS barcode_scan_events (
    id TEXT PRIMARY KEY,
    barcode_id TEXT,
    scanned_by TEXT,
    scan_location TEXT,
    scan_device TEXT DEFAULT 'mobile',
    scanned_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "barcodes" (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  barcode_type TEXT,
  barcode_value TEXT,
  printed TEXT,
  metadata TEXT,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS blockchain_verifications (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    contract_address TEXT,
    transaction_hash TEXT,
    verification_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
, block_number TEXT, chain TEXT, created_at DATETIME, data_hash TEXT, entity_id INTEGER, entity_type TEXT, status TEXT, tx_hash TEXT, verification_type TEXT);

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

CREATE TABLE IF NOT EXISTS "buyer_search_requests" (
    id TEXT PRIMARY KEY,
    exporter_tenant_id TEXT REFERENCES tenants(id),
    product_details TEXT, -- JSON
    quantity REAL,
    unit TEXT,
    target_regions TEXT, -- JSON array
    preferred_payment_methods TEXT, -- JSON array
    min_buyer_trust_score REAL,
    listing_expiry TEXT,
    status TEXT DEFAULT 'ACTIVE',
    ai_match_results TEXT, -- JSON
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "carbon_calculations" (
    id TEXT PRIMARY KEY,
    ustn TEXT,
    route_km REAL,
    transport_mode TEXT DEFAULT 'SEA',
    co2_kg REAL,
    methodology TEXT DEFAULT 'GLEC_FRAMEWORK',
    offset_credits REAL DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, co2_tons TEXT, distance_km TEXT, emission_factor TEXT, offset_available INTEGER DEFAULT 0, weight_tons TEXT);

CREATE TABLE IF NOT EXISTS "carbon_footprint_calculations" (
    id TEXT PRIMARY KEY,
    shipment_id TEXT REFERENCES shipments(id),
    route_distance_nm REAL,
    vessel_type TEXT,
    cargo_weight_mt REAL,
    total_co2e_tons REAL,
    calculation_method TEXT DEFAULT 'IMO_EEXI_2023',
    calculated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "carrier_performance_profiles" (
    id TEXT PRIMARY KEY,
    carrier_tenant_id TEXT,
    carrier_name TEXT,
    service_type TEXT DEFAULT 'OCEAN',
    risk_score REAL DEFAULT 80,
    ontime_pct REAL DEFAULT 95,
    dispute_rate REAL DEFAULT 0,
    avg_delay_hours REAL DEFAULT 0,
    routes_served TEXT DEFAULT '[]',
    last_updated TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
, carrier_id INTEGER, esg_score REAL, last_risk_update TEXT, on_time_pct REAL);

CREATE TABLE IF NOT EXISTS causal_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    entity_type TEXT,
    factor TEXT,
    contribution REAL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cbr_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT REFERENCES shipments(ustn),
    provider_gtid TEXT REFERENCES tenants(gtid),
    service_type TEXT NOT NULL CHECK(service_type IN ('CERTIFICATION','PHYSICAL_HANDLING','STORAGE','AUDIT')),
    status TEXT DEFAULT 'ASSIGNED',
    declaration_ref TEXT,
    nafeza_submission_id TEXT,
    submitted_at TEXT,
    confirmed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clarification_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER REFERENCES service_quotations(id),
    requester_gtid TEXT,
    questions TEXT DEFAULT '{}',
    answers TEXT,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS "clause_risk_scores" (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    risk_category TEXT,
    risk_score REAL,
    mitigation_suggestions TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS clearance_items (
  id TEXT PRIMARY KEY, ustn TEXT, importer_tenant_id TEXT, jurisdiction TEXT,
  risk_score INTEGER DEFAULT 0, document_readiness TEXT DEFAULT 'PARTIAL',
  declaration_status TEXT DEFAULT 'PENDING', status TEXT DEFAULT 'PENDING',
  cleared_by TEXT, cleared_at TEXT, hold_reason TEXT, rejection_reason TEXT,
  inspection_required INTEGER DEFAULT 0, notes TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS collateral_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financing_agreement_id INTEGER NOT NULL REFERENCES financing_agreements(id),
    current_ltv REAL,
    collateral_value REAL,
    loan_balance REAL,
    margin_call_threshold REAL,
    status TEXT DEFAULT 'HEALTHY',
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "commission_calculations" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT,
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
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "commission_lock_events" (
    id TEXT PRIMARY KEY,
    lock_id TEXT,
    event_type TEXT,
    old_status TEXT,
    new_status TEXT,
    release_pct REAL DEFAULT 0,
    trigger_milestone TEXT,
    actor_gtid TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, commission_lock_id INTEGER, event_data TEXT);

CREATE TABLE IF NOT EXISTS "commission_locks" (
    lock_id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    trade_id TEXT REFERENCES trade_requests(id),
    commission_rate_pct REAL,
    commission_usd REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PARTIALLY_RELEASED','FULLY_RELEASED','DISPUTED','CANCELLED')),
    release_conditions TEXT, 
    released_pct REAL DEFAULT 0,
    kv_version INTEGER,
    responsible_tenant_id TEXT,
    governor_decision_id TEXT,
    locked_at TEXT DEFAULT (datetime('now')),
    fully_released_at TEXT
);

CREATE TABLE IF NOT EXISTS commission_settlement_records (
    id TEXT PRIMARY KEY,
    commission_lock_id TEXT,
    settlement_method TEXT,
    gross_amount REAL,
    net_amount REAL,
    fee_amount REAL,
    psp_name TEXT,
    settled_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "commission_singularity_calculations" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    contract_id TEXT REFERENCES contracts(id),
    original_rate_pct REAL,
    proposed_discount_pct REAL,
    final_rate_pct REAL,
    qualification_reason TEXT, 
    multisig_approval TEXT, 
    status TEXT DEFAULT 'PROPOSED',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, adjustments TEXT, base_rate REAL, commission_usd REAL, explanation TEXT, final_rate REAL, payer TEXT, policy_bounds_check INTEGER DEFAULT 1, trade_id TEXT, trade_value_usd REAL);

CREATE TABLE IF NOT EXISTS commodity_compatibility_warnings (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    conflicting_commodities TEXT, -- JSON array
    warning_type TEXT,
    message TEXT,
    overridden_by TEXT,
    override_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "commodity_market_prices" (
    id TEXT PRIMARY KEY,
    commodity_name TEXT,
    hs_code TEXT,
    origin_country TEXT,
    destination_country TEXT,
    price_per_kg REAL,
    currency TEXT DEFAULT 'USD',
    source TEXT DEFAULT 'FAO',
    recorded_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, confidence TEXT, price_date REAL, price_usd_per_kg REAL);

CREATE TABLE IF NOT EXISTS "commodity_profit_margins" (
    id TEXT PRIMARY KEY,
    hs_code TEXT,
    origin_country TEXT,
    destination_country TEXT,
    estimated_margin_pct REAL,
    confidence REAL,
    model_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, valid_from TEXT, valid_until TEXT);

CREATE TABLE IF NOT EXISTS "commodity_specifications" (
    id TEXT PRIMARY KEY,
    hs_code TEXT,
    name TEXT,
    category TEXT DEFAULT 'GENERAL',
    description TEXT,
    storage_requirements TEXT,
    shelf_life_days INTEGER,
    temperature_range TEXT,
    humidity_range TEXT,
    packing_guidance TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "compliance_checks" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT,
    check_type TEXT,
    result TEXT,
    flags TEXT, -- JSON array
    governor_decision_id TEXT,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "compliance_events" (
    id TEXT PRIMARY KEY,
    event_type TEXT,
    entity_gtid TEXT,
    details TEXT, -- JSON
    severity TEXT,
    sar_drafted INTEGER DEFAULT 0,
    resolved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "computer_vision_jobs" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT,
    image_path TEXT,
    model_version TEXT,
    detected_objects TEXT,
    confidence REAL,
    requires_human_review INTEGER DEFAULT 0,
    reviewed_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "condition_assessments" (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
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

CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    purpose TEXT NOT NULL,
    version TEXT NOT NULL,
    granted INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    withdrawal_timestamp TEXT,
    loom_hash TEXT
);

CREATE TABLE IF NOT EXISTS consolidation_plans (
  id TEXT PRIMARY KEY, forwarder_tenant_id TEXT, bundle_shipments TEXT DEFAULT '[]',
  container_type TEXT DEFAULT '40HC', combined_cbm REAL DEFAULT 0,
  fill_rate_pct REAL DEFAULT 0, status TEXT DEFAULT 'DRAFT', created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS constitutional_policies (
  id TEXT PRIMARY KEY, policy_code TEXT, rego_source TEXT, description TEXT,
  version TEXT DEFAULT '1.0', status TEXT DEFAULT 'ACTIVE', updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "container_loading_plans" (
    id TEXT PRIMARY KEY,
    packing_plan_id TEXT REFERENCES packing_plans(id),
    container_number TEXT,
    container_type TEXT DEFAULT '40HC_REEFER',
    pallet_ids TEXT, -- JSON array of pallet IDs
    visual_layout TEXT, -- JSON 3D layout
    cargo_weight_kg REAL,
    utilization_pct REAL,
    created_at TEXT DEFAULT (datetime('now'))
, ar_visualization_data TEXT, governor_decision_id INTEGER, loading_instructions TEXT, max_payload_kg REAL, pallet_sequence TEXT, seal_number TEXT, utilized_volume_pct REAL);

CREATE TABLE IF NOT EXISTS "container_operations_log" (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  operation_type TEXT,
  source_container_index INTEGER,
  target_container_indices TEXT,
  fields_applied TEXT,
  pattern_incremented TEXT,
  actor_gtid TEXT,
  actor_employee_id TEXT,
  undone INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "container_release_authorizations" (
  id TEXT PRIMARY KEY,
  shipment_ustn TEXT,
  container_id TEXT,
  commission_lock_id TEXT REFERENCES commission_locks(lock_id),
  release_authorized INTEGER DEFAULT 0,
  authorized_by TEXT,
  authorization_governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  released_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "contract_clauses" (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    clause_type TEXT,
    clause_text TEXT,
    confidence_score REAL,
    risk_score REAL,
    requires_human_review INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "contract_genesis_sessions" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    clause_confidence_scores TEXT,
    risk_scores TEXT,
    harmonization_strategy TEXT,
    shipment_schedule TEXT,
    smart_clause_pseudocode TEXT,
    compliance_requirements TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "contract_negotiations" (
  id TEXT PRIMARY KEY,
  trade_request_id INTEGER,
  initiated_by TEXT,
  negotiation_type TEXT,
  proposed_terms TEXT,
  reason TEXT,
  status TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS contract_rates (
  id TEXT PRIMARY KEY, shipping_line_tenant_id TEXT, customer_tenant_id TEXT,
  route_origin TEXT, route_destination TEXT, container_type TEXT DEFAULT '40HC',
  rate_per_teu REAL DEFAULT 0, currency TEXT DEFAULT 'USD',
  valid_from TEXT, valid_to TEXT, min_volume_teu INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE', created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "contract_shipments" (
    id TEXT PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    shipment_number INTEGER,
    scheduled_delivery_date TEXT,
    port_of_discharge TEXT,
    containers_count INTEGER,
    total_price REAL,
    sgtx_fee_amount REAL,
    fee_lock_id INTEGER,
    ustn TEXT UNIQUE,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TEXT DEFAULT (datetime('now'))
, port_of_loading TEXT, commission_lock_id TEXT, locked_at DATETIME, mutual_confirmation_at DATETIME, sgtx_fee_paid TEXT);

CREATE TABLE IF NOT EXISTS "contracts" (
    id TEXT PRIMARY KEY,
    trade_request_id INTEGER REFERENCES trade_requests(id),
    ustn TEXT REFERENCES shipments(ustn),
    contract_type TEXT DEFAULT 'SINGLE_SHIPMENT',
    incoterm TEXT,
    clauses TEXT DEFAULT '{}',
    governing_law TEXT,
    dispute_resolution TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_SIGNATURES','LOCKED','ACTIVE','COMPLETED','DISPUTED','TERMINATED','ACTIVE_MASTER')),
    cryptographic_hash TEXT,
    buyer_signature TEXT,
    seller_signature TEXT,
    sgtx_fee_rate REAL DEFAULT 0.015,
    sgtx_fee_amount REAL DEFAULT 0,
    fee_lock_id INTEGER,
    pqc_signature TEXT,
    signed_at TEXT,
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_validation_status TEXT, clause_forge_confidence REAL, commission_allocation TEXT, commission_collection_model TEXT DEFAULT 'UPFRONT', commission_responsibility TEXT, document_url TEXT, exporter_commission_pct REAL, importer_commission_pct REAL, incoterm_rules TEXT, multi_shipment_schedule TEXT, own_contract_pdf_hash TEXT, own_contract_uploaded INTEGER DEFAULT 0, sgtx_witness_signature TEXT, updated_at TEXT, uploaded_by_tenant_id TEXT, commission_lock_id TEXT, importer_signature TEXT, mutual_confirmation_at DATETIME, mutual_confirmation_snapshot TEXT);

CREATE TABLE IF NOT EXISTS "country_commodity_factors" (
    origin_country TEXT,
    destination_country TEXT,
    hs_code TEXT,
    profit_boost_pct REAL,
    last_calculated TEXT,
    model_version TEXT,
    PRIMARY KEY(origin_country, destination_country, hs_code)
);

CREATE TABLE IF NOT EXISTS "credit_assessments" (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT REFERENCES financing_requests(id),
    credit_score REAL,
    signal_count INTEGER DEFAULT 0,
    recommended_structure TEXT,
    governor_decision_id TEXT
, assessment_type TEXT, behavioral_score REAL, corporate_risk_score REAL, default_probability TEXT, entity_gtid TEXT, entity_name TEXT, feature_importance TEXT, macro_economic_score REAL, market_health_score REAL, model_version TEXT, overall_score REAL, recommended_limit_usd TEXT, shipment_score REAL, trade_performance_score REAL);

CREATE TABLE IF NOT EXISTS "credit_signals" (
    id TEXT PRIMARY KEY,
    credit_assessment_id TEXT REFERENCES credit_assessments(id),
    signal_category TEXT,
    signal_name TEXT,
    signal_value TEXT,
    weight REAL
);

CREATE TABLE IF NOT EXISTS "cross_tenant_groups" (
  id TEXT PRIMARY KEY,
  name TEXT,
  parent_gtid TEXT,
  member_gtids TEXT DEFAULT '[]',
  group_type TEXT DEFAULT 'HOLDING_COMPANY',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS data_scopes (
    employee_id INTEGER PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    hidden_cost_components TEXT,
    max_transaction_value REAL,
    allow_role_switching INTEGER DEFAULT 1,
    custom_filters TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, country_access TEXT, document_types TEXT);

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    request_type TEXT NOT NULL CHECK(request_type IN ('ACCESS','ERASURE','RECTIFICATION','RESTRICTION','PORTABILITY','OBJECTION')),
    status TEXT DEFAULT 'PENDING',
    details TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "defi_financing_transactions" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    chain TEXT,
    protocol TEXT,
    transaction_type TEXT,
    amount REAL,
    stablecoin TEXT,
    tx_hash TEXT,
    block_number INTEGER,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "defi_protocol_configs" (
    id TEXT PRIMARY KEY,
    protocol_name TEXT,
    chain TEXT,
    risk_score REAL,
    audit_reference TEXT,
    is_active INTEGER DEFAULT 1,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "defi_protocols" (
    id TEXT PRIMARY KEY,
    protocol_name TEXT,
    chain TEXT, -- Polygon, Ethereum, etc.
    tvl REAL,
    apy_range TEXT, -- JSON {min, max}
    risk_score REAL,
    audit_status TEXT,
    supported_stablecoins TEXT, -- JSON array
    contract_addresses TEXT, -- JSON
    active INTEGER DEFAULT 1,
    last_health_check TEXT
);

CREATE TABLE IF NOT EXISTS "defi_tranche_positions" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    amount_stablecoin REAL,
    stablecoin TEXT,
    chain TEXT DEFAULT 'POLYGON',
    contract_address TEXT,
    deposit_tx_hash TEXT,
    withdrawal_tx_hash TEXT,
    depeg_alert_triggered INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT DEFAULT (datetime('now'))
, amount TEXT, financing_request_id TEXT, governor_decision_id TEXT, health_factor REAL DEFAULT 1.5, protocol_id TEXT, token TEXT DEFAULT 'USDC');

CREATE TABLE IF NOT EXISTS device_registry (
    id TEXT PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_state TEXT DEFAULT 'NEW' CHECK(device_state IN ('NEW','TRUSTED','ELEVATED_RISK','BLOCKED','REVOKED')),
    risk_score REAL DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "digital_twin_snapshots" (
    id TEXT PRIMARY KEY,
    ustn TEXT,
    simulation_params TEXT,
    predicted_eta TEXT,
    shelf_life_days REAL,
    temperature_forecast TEXT,
    risk_assessment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "disclaimer_acceptances" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    employee_id TEXT,
    disclaimer_id TEXT,
    disclaimer_version TEXT,
    accepted_at TEXT DEFAULT (datetime('now')),
    ip_hash TEXT,
    user_agent TEXT,
    FOREIGN KEY (disclaimer_id) REFERENCES legal_disclaimers(id)
);

CREATE TABLE IF NOT EXISTS dispatch_plans (
  id TEXT PRIMARY KEY, lsp_tenant_id TEXT, driver_name TEXT, vehicle_id TEXT,
  route_json TEXT DEFAULT '[]', planned_date TEXT, status TEXT DEFAULT 'PLANNED',
  pickups_count INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "dispute_evidence_items" (
  id TEXT PRIMARY KEY,
  dispute_id TEXT,
  evidence_package_id TEXT,
  item_type TEXT CHECK(item_type IN ('DOCUMENT','QC_REPORT','QC_OVERRIDE','COMMUNICATION','TIMELINE','FINANCIAL','GOVERNOR_DECISION','BARCODE_SCAN','IOT_DATA','WITNESS')),
  title TEXT,
  description TEXT,
  source_url TEXT,
  source_hash TEXT, -- SHA256 for authenticity
  ai_relevance_score REAL, -- 0-100
  auto_compiled INTEGER DEFAULT 0,
  is_authenticated INTEGER DEFAULT 0,
  authentication_method TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dispute_experts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_id INTEGER NOT NULL REFERENCES disputes(id),
    expert_gtid TEXT,
    expert_type TEXT,
    invitation_token TEXT UNIQUE,
    opinion TEXT,
    posted_at TEXT,
    status TEXT DEFAULT 'INVITED'
);

CREATE TABLE IF NOT EXISTS "dispute_history" (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT UNIQUE,
    entity_name TEXT,
    entity_type TEXT, -- IMPORTER, EXPORTER, LOGISTICS, etc.
    total_disputes INTEGER DEFAULT 0,
    disputes_as_filer INTEGER DEFAULT 0,
    disputes_as_respondent INTEGER DEFAULT 0,
    -- By type breakdown
    quality_disputes INTEGER DEFAULT 0,
    delivery_disputes INTEGER DEFAULT 0,
    payment_disputes INTEGER DEFAULT 0,
    documentation_disputes INTEGER DEFAULT 0,
    commission_disputes INTEGER DEFAULT 0,
    contract_breach_disputes INTEGER DEFAULT 0,
    -- Outcome tracking
    disputes_won INTEGER DEFAULT 0,
    disputes_lost INTEGER DEFAULT 0,
    disputes_settled INTEGER DEFAULT 0,
    disputes_pending INTEGER DEFAULT 0,
    -- Risk scoring
    risk_score REAL DEFAULT 0, -- 0-100, higher = more risky
    -- Timestamps
    last_dispute_at TEXT,
    first_dispute_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "dispute_recommendations" (
    id TEXT PRIMARY KEY,
    dispute_id TEXT REFERENCES disputes(id),
    ai_prediction TEXT,
    suggested_settlement TEXT, -- JSON
    confidence REAL,
    shap_values TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
, evidence_package TEXT, recommendation_type TEXT);

CREATE TABLE IF NOT EXISTS "disputes" (
    id TEXT PRIMARY KEY,
    trade_request_id INTEGER REFERENCES trade_requests(id),
    contract_shipment_id INTEGER REFERENCES contract_shipments(id),
    financing_agreement_id INTEGER,
    ustn TEXT,
    filing_party_gtid TEXT,
    dispute_category TEXT CHECK(dispute_category IN ('QUALITY','DELAY','NON_PAYMENT','DOCUMENTATION_FRAUD','COLD_CHAIN','WEIGHT_SHORTAGE','SERVICE_QUALITY','FINANCING','SGTX_FEE','OTHER')),
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
, category TEXT, created_at TEXT, dispute_type TEXT, evidence_ids TEXT, evidence_links TEXT, filed_by_tenant_id TEXT, remedy_sought TEXT, respondent_gtid TEXT, severity INTEGER DEFAULT 0, arbitration_body TEXT, arbitration_status TEXT, evidence_package_id TEXT, resolution_path TEXT, triage_category TEXT, updated_at DATETIME);

CREATE TABLE IF NOT EXISTS "disruption_predictions" (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    prediction_type TEXT,
    probability REAL,
    affected_route TEXT,
    predicted_delay_days INTEGER,
    data_sources TEXT, -- JSON array
    recommendation TEXT,
    ai_model_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "distressed_cargo_listings" (
    id TEXT PRIMARY KEY,
    original_shipment_ustn TEXT REFERENCES shipments(ustn),
    micro_ustn TEXT,
    parent_ustn TEXT,
    seller_tenant_id INTEGER REFERENCES tenants(id),
    product_details TEXT DEFAULT '{}',
    quantity REAL,
    condition_score INTEGER,
    price_expectation REAL,
    floor_price REAL,
    listing_expiry TEXT,
    status TEXT DEFAULT 'ACTIVE',
    triage_path TEXT,
    privacy_notice_acknowledged INTEGER DEFAULT 0,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_price_recommendation TEXT, condition TEXT, current_location TEXT, exporter_tenant_id TEXT, pallet_ids TEXT DEFAULT '[]', price_currency TEXT DEFAULT 'USD', unit TEXT);

CREATE TABLE IF NOT EXISTS "distressed_cargo_offers" (
    id TEXT PRIMARY KEY,
    listing_id INTEGER REFERENCES distressed_cargo_listings(id),
    buyer_tenant_id INTEGER REFERENCES tenants(id),
    amount REAL,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id INTEGER,
    submitted_at TEXT DEFAULT (datetime('now'))
, created_at TEXT, currency TEXT DEFAULT 'USD', message TEXT, offer_amount REAL);

CREATE TABLE IF NOT EXISTS "distressed_contact_notifications" (
    id TEXT PRIMARY KEY,
    distressed_listing_id TEXT,
    distressed_ustn TEXT,
    recipient_gtid TEXT,
    recipient_name TEXT,
    message_hash TEXT,
    status TEXT DEFAULT 'SENT',
    sent_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "distressed_outreach_notifications" (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    sender_tenant_id TEXT,
    recipient_gtid TEXT,
    outreach_mode TEXT DEFAULT 'STANDARD',
    message_content TEXT,
    delivery_status TEXT DEFAULT 'SENT',
    read_at TEXT,
    response_type TEXT,
    privacy_notice_acknowledged INTEGER DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, co_branded INTEGER DEFAULT 0, distressed_ustn TEXT, message_template TEXT, privacy_notice_accepted TEXT, status TEXT);

CREATE TABLE IF NOT EXISTS distressed_trades (
  id TEXT PRIMARY KEY, ustn TEXT, seller_tenant_id TEXT, condition_description TEXT,
  pallet_ids TEXT DEFAULT '[]', photos_json TEXT DEFAULT '[]',
  ai_condition_score REAL, ai_suggested_price_min REAL, ai_suggested_price_max REAL,
  status TEXT DEFAULT 'DECLARED', buyer_tenant_id TEXT, offer_amount REAL,
  micro_ustn TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "document_authenticity_checks" (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  dispute_id TEXT,
  check_type TEXT CHECK(check_type IN ('HASH_VERIFY','METADATA_ANALYSIS','AI_FORGERY_DETECT','BLOCKCHAIN_VERIFY','CROSS_REFERENCE')),
  result TEXT CHECK(result IN ('AUTHENTIC','SUSPICIOUS','TAMPERED','INCONCLUSIVE')),
  confidence REAL,
  details TEXT, -- JSON: specific findings
  model_used TEXT,
  checked_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_type TEXT NOT NULL,
    name TEXT NOT NULL,
    jurisdiction TEXT,
    template_text TEXT NOT NULL,
    required_fields TEXT DEFAULT '[]',
    version INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_verifications (
  id TEXT PRIMARY KEY, ustn TEXT, document_type TEXT, submitter_tenant_id TEXT,
  ai_status TEXT DEFAULT 'PENDING', extracted_fields TEXT DEFAULT '{}',
  discrepancies TEXT DEFAULT '[]', status TEXT DEFAULT 'PENDING',
  verified_by TEXT, verification_notes TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "documents" (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    doc_type TEXT,
    doc_subtype TEXT,
    title TEXT,
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
, ai_validation_result TEXT, ai_validation_status TEXT, document_type TEXT, filename TEXT, governor_decision_id TEXT, requirement_id TEXT, sha256_hash TEXT, shipment_ustn TEXT, storage_path TEXT, tenant_id TEXT, trade_request_id TEXT, uploaded_at TEXT, uploaded_by TEXT, verification_status TEXT, digital_signature TEXT, signed_at DATETIME, signed_by TEXT);

CREATE TABLE IF NOT EXISTS "drivers" (
  id TEXT PRIMARY KEY,
  logistics_tenant_id TEXT,
  full_name TEXT,
  phone TEXT,
  license_number TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  status TEXT DEFAULT 'PENDING',
  onboarded_via TEXT DEFAULT 'PORTAL',
  last_location TEXT,
  last_location_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "dynamic_pricing_runs" (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
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

CREATE TABLE IF NOT EXISTS "ebl_capability_matrix" (
    carrier_id TEXT PRIMARY KEY,
    carrier_name TEXT,
    supported_platforms TEXT,
    supported_routes TEXT,
    last_verified TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS electronic_bls (
  id TEXT PRIMARY KEY, ustn TEXT, booking_id TEXT, shipper TEXT, consignee TEXT, notify_party TEXT,
  vessel_name TEXT, voyage_number TEXT, port_of_loading TEXT, port_of_discharge TEXT,
  container_numbers TEXT DEFAULT '[]', description_of_goods TEXT,
  gross_weight_kg REAL DEFAULT 0, measurement_cbm REAL DEFAULT 0,
  freight_terms TEXT DEFAULT 'PREPAID', status TEXT DEFAULT 'DRAFT',
  issuer_tenant_id TEXT, loom_hash TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "employee_permissions" (
    id TEXT PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    permission TEXT,
    granted_by INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')), grant_type TEXT CHECK(grant_type IN ('ALLOW','DENY')), granted_at TEXT, trader_mode_context TEXT,
    UNIQUE(employee_id, permission)
);

CREATE TABLE IF NOT EXISTS "employees" (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
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
    created_at TEXT DEFAULT (datetime('now')), invitation_expires_at TEXT, invitation_token TEXT, approved_by TEXT, operating_mode_override TEXT,
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS "esg_assessments" (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT,
    assessment_type TEXT,
    esg_score REAL,
    environmental_score REAL,
    social_score REAL,
    governance_score REAL,
    carbon_intensity REAL,
    green_certifications TEXT, -- JSON array
    model_version TEXT,
    assessed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "evidence_packages" (
    id TEXT PRIMARY KEY,
    dispute_id INTEGER REFERENCES disputes(id),
    package TEXT DEFAULT '{}',
    loom_hash TEXT,
    verification_token TEXT UNIQUE,
    compiled_at TEXT DEFAULT (datetime('now'))
, ai_summary TEXT, auto_compiled TEXT, compiled_by TEXT DEFAULT 'AI_EVIDENCE_COMPILER', item_count TEXT, ustn TEXT);

CREATE TABLE IF NOT EXISTS "execution_gate_log" (
  id TEXT PRIMARY KEY,
  governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  wasm_module TEXT,
  input_hash TEXT,
  output_verdict TEXT,
  execution_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "exporter_quote_alternatives" (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT,
  trade_request_id TEXT,
  destination_country TEXT,
  port_of_discharge TEXT,
  price_per_unit REAL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
, additional_logistics_cost REAL, additional_logistics_currency TEXT, transit_days TEXT);

CREATE TABLE IF NOT EXISTS "exporter_quotes" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    exporter_tenant_id TEXT,
    exw_price REAL,
    exw_currency TEXT,
    exw_locked_at TEXT,
    incoterm TEXT,
    validity_days INTEGER DEFAULT 15,
    status TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, exw_deviation_pct REAL, exw_justification TEXT, loading_country TEXT, loading_port TEXT, port_of_loading TEXT, recommended_destinations TEXT, updated_at TEXT, alternative_ports TEXT, final_quoted_price REAL, logistics_breakdown TEXT, logistics_mode TEXT, logistics_total TEXT, multi_shipment_response TEXT, sgtx_fee_amount REAL, sgtx_fee_rate REAL, submitted_at DATETIME, total_trade_value TEXT);

CREATE TABLE IF NOT EXISTS "express_mode_logs" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  employee_id TEXT,
  raw_text TEXT,
  source TEXT DEFAULT 'text',
  language TEXT DEFAULT 'en',
  parsed_result TEXT,
  confidence_overall REAL,
  field_confidences TEXT,
  ai_provider TEXT DEFAULT 'huggingface',
  ai_model TEXT,
  processing_time_ms INTEGER,
  human_confirmed INTEGER DEFAULT 0,
  human_corrections TEXT,
  loom_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "exw_price_watch" (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT,
  trade_request_id TEXT,
  locked_price REAL,
  current_market_price REAL,
  deviation_pct REAL,
  alert_triggered INTEGER DEFAULT 0,
  alert_type TEXT,
  seller_action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS fee_calculations (
    id TEXT PRIMARY KEY,
    payment_attempt_id TEXT REFERENCES payment_attempts(id),
    net_commission REAL,
    gross_amount REAL,
    fee_breakdown TEXT,
    safety_buffer_applied INTEGER DEFAULT 1,
    governor_decision_id TEXT
, base_rate REAL, buyer_country TEXT, commodity_hs6 TEXT, country_adjustment TEXT, created_at DATETIME, exporter_quote_id INTEGER, exporter_tenant_id INTEGER, fee_amount REAL, final_rate REAL, geopolitics_adjustment TEXT, model_version TEXT, net_fee TEXT, perishability_adjustment TEXT, safety_buffer_pct REAL, seasonality_adjustment TEXT, seller_country TEXT, trade_request_id INTEGER, trade_value REAL, volume_discount TEXT);

CREATE TABLE IF NOT EXISTS fee_locks (
    lock_id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER REFERENCES contracts(id),
    contract_shipment_id INTEGER REFERENCES contract_shipments(id),
    financing_agreement_id INTEGER,
    fee_rate_pct REAL NOT NULL,
    fee_usd REAL NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','DISPUTED','CANCELLED')),
    kv_version INTEGER,
    governor_decision_id INTEGER,
    locked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "fee_optimisation_runs" (
    id TEXT PRIMARY KEY,
    current_rates TEXT, -- JSON
    proposed_rates TEXT, -- JSON
    expected_revenue REAL,
    expected_volume INTEGER,
    confidence REAL,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fee_payment_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER REFERENCES contracts(id),
    contract_shipment_id INTEGER REFERENCES contract_shipments(id),
    financing_agreement_id INTEGER,
    party_type TEXT NOT NULL CHECK(party_type IN ('seller','buyer','borrower','government')),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'PENDING',
    due_date TEXT,
    late_fee_accrued REAL DEFAULT 0,
    deferred INTEGER DEFAULT 0,
    deferred_status TEXT,
    psp_transaction_id TEXT,
    paid_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "feelock_freezes" (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  dispute_id TEXT,
  lock_type TEXT DEFAULT 'FULL' CHECK(lock_type IN ('FULL','PARTIAL')),
  frozen_amount REAL,
  currency TEXT DEFAULT 'USD',
  frozen_by TEXT, -- governor or multisig
  freeze_reason TEXT,
  multisig_signatures TEXT, -- JSON array of signer IDs
  status TEXT DEFAULT 'FROZEN' CHECK(status IN ('FROZEN','RELEASED','PARTIALLY_RELEASED','FORFEITED')),
  released_at TEXT,
  released_by TEXT,
  release_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "financier_historical_data" (
    id TEXT PRIMARY KEY,
    financier_tenant_id TEXT,
    borrower_tenant_id TEXT,
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

CREATE TABLE IF NOT EXISTS financier_preferences (
    financier_tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id),
    accepted_borrower_countries TEXT,
    min_borrower_trust_score REAL,
    min_trade_value REAL,
    max_financed_amount REAL,
    preferred_financing_types TEXT,
    preferred_settlement_methods TEXT,
    excluded_commodities TEXT,
    risk_appetite TEXT,
    exposure_limits TEXT,
    defi_opted_in INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
, auto_rfq_enabled TEXT, confidentiality_signed TEXT, confidentiality_signed_at TEXT, created_at TEXT, excluded_hs_codes TEXT, geographic_restrictions TEXT, id TEXT, max_tenor_days TEXT, min_apr TEXT, min_trust_score TEXT);

CREATE TABLE IF NOT EXISTS "financing_agreements" (
    id TEXT PRIMARY KEY,
    financing_request_id INTEGER REFERENCES financing_requests(id),
    financier_tenant_id INTEGER REFERENCES tenants(id),
    amount REAL,
    apr REAL,
    tenor_days INTEGER,
    sgtx_financing_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING_SIGNATURES',
    ltv_ratio REAL,
    margin_call_issued INTEGER DEFAULT 0,
    disbursed_at TEXT,
    repaid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, collateral_terms TEXT, cryptographic_hash TEXT, disbursement_status TEXT DEFAULT 'PENDING', financing_fee_amount REAL, financing_fee_rate REAL DEFAULT 0.0025, financing_offer_id TEXT, net_disbursed REAL, repayment_schedule TEXT, sgtx_witness_signature TEXT, winning_offer_id TEXT, witness_clause_hash TEXT, borrower_signature_at DATETIME, financier_signature_at DATETIME, sgtx_signature_at DATETIME, total_repaid TEXT);

CREATE TABLE IF NOT EXISTS "financing_annexes" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    annex_type TEXT,                          -- WITNESS_CLAUSE, COLLATERAL_SCHEDULE, REPAYMENT_SCHEDULE, RISK_SUMMARY
    title TEXT,
    content TEXT,                                      -- Full clause text or JSON
    sgtx_witness_hash TEXT,                           -- SHA-256 of clause content
    signed_by TEXT,                                    -- GTID of signer
    signed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "financing_offers" (
    id TEXT PRIMARY KEY,
    financing_request_id INTEGER REFERENCES financing_requests(id),
    financier_tenant_id INTEGER REFERENCES tenants(id),
    amount_offered REAL,
    apr REAL,
    bid_encrypted INTEGER DEFAULT 1,
    reserve_proof TEXT,
    settlement_method TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at TEXT DEFAULT (datetime('now'))
, all_in_cost REAL, amount REAL, co_finance_pct REAL, collateral_details TEXT, collateral_required TEXT, conditions TEXT DEFAULT '{}', created_at TEXT, effective_apr REAL, interest_rate REAL, tenor_days INTEGER, accepted_at DATETIME, rejected_reason TEXT);

CREATE TABLE IF NOT EXISTS "financing_repayments" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    financier_tenant_id TEXT,
    borrower_tenant_id TEXT,
    repayment_amount REAL,
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

CREATE TABLE IF NOT EXISTS "financing_requests" (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    requester_tenant_id INTEGER REFERENCES tenants(id),
    amount REAL,
    currency TEXT DEFAULT 'USD',
    tenor_days INTEGER,
    financing_type TEXT,
    preferred_settlement_method TEXT,
    credit_intelligence TEXT,
    status TEXT DEFAULT 'REQUESTED',
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_credit_score REAL, ai_default_probability REAL, ai_max_ltv REAL, collateral TEXT, collateral_type TEXT DEFAULT 'GOODS', contract_id TEXT, monte_carlo_default_prob REAL, preferred_currency TEXT DEFAULT 'USD', requested_amount REAL, shipment_id TEXT, special_instructions TEXT, trade_value REAL, blended_apr TEXT, co_financing_enabled TEXT, rfq_broadcast_at DATETIME, rfq_matched_financiers TEXT, total_bid_amount REAL, updated_at DATETIME, winning_bid_id TEXT);

CREATE TABLE IF NOT EXISTS "fraud_detection" (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT,
    fraud_type TEXT,
    graph_cycle_detected INTEGER DEFAULT 0,
    confidence REAL,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS freight_invoices (
  id TEXT PRIMARY KEY, booking_id TEXT, ustn TEXT, issuer_tenant_id TEXT, payer_tenant_id TEXT,
  amount REAL DEFAULT 0, currency TEXT DEFAULT 'USD', payment_terms TEXT DEFAULT 'NET30',
  due_date TEXT, line_items TEXT DEFAULT '[]', status TEXT DEFAULT 'ISSUED',
  paid_at TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "fx_conversion_paths" (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    path_steps TEXT DEFAULT '[]',
    total_cost REAL,
    total_slippage REAL,
    selected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
, from_currency TEXT, recommended INTEGER DEFAULT 0, to_currency TEXT, total_cost_pct REAL);

CREATE TABLE IF NOT EXISTS "fx_optimization_paths" (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    currency_path TEXT,
    predicted_slippage REAL,
    actual_slippage REAL,
    savings_usd REAL,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "fx_rate_cache" (
    id TEXT PRIMARY KEY,
    base_currency TEXT,
    target_currency TEXT,
    rate REAL,
    source TEXT DEFAULT 'ECB',
    fetched_at TEXT DEFAULT (datetime('now'))
, from_currency TEXT, to_currency TEXT, volatility_24h TEXT);

CREATE TABLE IF NOT EXISTS "geocoded_locations" (
    id TEXT PRIMARY KEY,
    address_text TEXT,
    latitude REAL,
    longitude REAL,
    place_id TEXT
, address TEXT, capacity_info TEXT, country_code TEXT, created_at DATETIME, location_type TEXT, name TEXT, operating_hours TEXT, port_code TEXT);

CREATE TABLE IF NOT EXISTS "gov_compliance_checks" (
  id TEXT PRIMARY KEY,
  trade_request_id INTEGER,
  ustn TEXT,
  rule_id INTEGER,
  tenant_id INTEGER,
  check_result TEXT,
  details TEXT,
  remediation TEXT,
  checked_by TEXT
);

CREATE TABLE IF NOT EXISTS "gov_permits" (
  id TEXT PRIMARY KEY,
  permit_type TEXT,
  trade_request_id INTEGER,
  ustn TEXT,
  applicant_tenant_id INTEGER,
  reviewing_agency TEXT,
  country_code TEXT,
  commodity_type TEXT,
  hs_code TEXT,
  status TEXT,
  priority TEXT,
  submitted_at DATETIME,
  attachments TEXT,
  metadata TEXT,
  created_at DATETIME,
  updated_at DATETIME
, approved_at DATETIME, auto_approved TEXT, conditions TEXT, issued_at DATETIME, issued_by TEXT, permit_number TEXT, reviewed_at DATETIME, reviewer_name TEXT, reviewer_notes TEXT, valid_until TEXT);

CREATE TABLE IF NOT EXISTS "government_profiles" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    jurisdiction TEXT,
    agency_type TEXT, -- CUSTOMS, PORT_AUTHORITY, TRADE_MINISTRY, REGULATORY
    enabled_modules TEXT DEFAULT '[]', -- JSON array
    anonymous_trade_enabled INTEGER DEFAULT 0,
    allowed_commodities TEXT, -- JSON array (null = all)
    risk_thresholds TEXT, -- JSON
    api_endpoints TEXT, -- JSON
    onboarding_status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "governor_decisions" (
    decision_id TEXT PRIMARY KEY,
    decision_type TEXT,
    actor_gtid TEXT,
    verdict TEXT CHECK(verdict IN ('ALLOW','DENY','CONDITIONAL','ESCALATE','PENDING')),
    tenant_message TEXT,
    loom_hash TEXT,
    cryptographic_signature TEXT,
    pqc_signature TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, actor_employee_id TEXT, ai_authority_level TEXT DEFAULT 'A4', ai_provider_fallback INTEGER DEFAULT 0, ai_provider_used TEXT, conditions TEXT, confidence REAL, decision_panel_data TEXT, explainability TEXT, plain_language_explanation TEXT, policy_version TEXT, previous_decision_hash TEXT, rule_refs TEXT, escalated_from TEXT, escalation_reason TEXT);

CREATE TABLE IF NOT EXISTS "governor_nonces" (
    nonce TEXT PRIMARY KEY,
    actor_gtid TEXT,
    decision_type TEXT,
    used_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    request_timestamp TEXT,
    ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS "gtid_sequences" (
  country_code TEXT,
  entity_type TEXT,
  current_sequence INTEGER DEFAULT 0,
  last_assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (country_code, entity_type)
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

CREATE TABLE IF NOT EXISTS "inbox_history" (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  item_id TEXT,
  ustn TEXT,
  action_taken TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    ustn TEXT,
    category TEXT,
    priority_score INTEGER DEFAULT 50,
    title TEXT NOT NULL,
    description TEXT,
    action_link TEXT,
    action_type TEXT,
    priority_level TEXT DEFAULT 'MEDIUM' CHECK(priority_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    icon TEXT DEFAULT 'info',
    snoozed_until TEXT,
    dismissed INTEGER DEFAULT 0,
    read INTEGER DEFAULT 0,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, action_at DATETIME, action_taken TEXT, status TEXT);

CREATE TABLE IF NOT EXISTS inbox_preferences (
    employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
    min_score INTEGER DEFAULT 30,
    muted_categories TEXT DEFAULT '[]',
    preferred_language TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS "incidents" (
    id TEXT PRIMARY KEY,
    incident_type TEXT,
    severity TEXT CHECK(severity IN ('P1','P2','P3','P4')),
    title TEXT,
    description TEXT,
    affected_services TEXT, -- JSON array
    root_cause TEXT,
    resolution TEXT,
    post_mortem TEXT, -- JSON
    status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
    opened_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    closed_at TEXT
);

CREATE TABLE IF NOT EXISTS "individual_financiers" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    accreditation_status TEXT,
    investment_capacity REAL,
    preferred_instruments TEXT,
    risk_tolerance REAL,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "inspection_logs" (
    id TEXT PRIMARY KEY,
    qc_job_id INTEGER REFERENCES qc_jobs(id),
    pallet_id TEXT,
    ai_defect TEXT,
    ai_confidence REAL,
    inspector_override INTEGER DEFAULT 0,
    inspector_override_reason TEXT,
    final_classification TEXT,
    photo_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, ai_analysis TEXT, content TEXT, data TEXT, inspector_employee_id TEXT, inspector_id TEXT, job_id TEXT, log_type TEXT, recorded_at TEXT);

CREATE TABLE IF NOT EXISTS inspection_queue (
  id TEXT PRIMARY KEY, ustn TEXT, inspector_tenant_id TEXT, requester_tenant_id TEXT,
  inspection_location TEXT, sampling_plan TEXT DEFAULT 'General II',
  commodity_type TEXT, commodity_quantity REAL DEFAULT 0, priority INTEGER DEFAULT 50,
  scheduled_date TEXT, status TEXT DEFAULT 'PENDING', accepted_at TEXT, started_at TEXT,
  completed_at TEXT, verdict TEXT, report_json TEXT, defect_count INTEGER DEFAULT 0,
  sample_size INTEGER DEFAULT 0, action_plan TEXT, action_plan_deadline TEXT,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "inspections" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    inspector_tenant_id TEXT REFERENCES tenants(id),
    inspection_type TEXT DEFAULT 'PRE_SHIPMENT',
    priority_pallets TEXT, -- JSON array of pallet numbers AI recommends
    product_details TEXT, -- JSON
    status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','FAILED','CANCELLED')),
    result TEXT, -- PASS, FAIL, CONDITIONAL
    findings TEXT, -- JSON
    ai_summary TEXT,
    annotated_images TEXT, -- JSON array of image paths
    report_document_id TEXT,
    governor_decision_id TEXT,
    scheduled_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, ai_recommendation TEXT, commodity_hs_code TEXT, contract_id INTEGER, inspector_employee_id INTEGER, location TEXT, qc_tenant_id INTEGER, requested_by TEXT, sampling_protocol TEXT, scheduled_date DATETIME, shipment_id INTEGER, trade_request_id INTEGER, certificate_issued_at DATETIME, certificate_number TEXT, updated_at DATETIME);

CREATE TABLE IF NOT EXISTS "integration_connector_logs" (
    id TEXT PRIMARY KEY,
    connector_name TEXT,
    request_url TEXT,
    method TEXT,
    status_code INTEGER,
    latency_ms INTEGER,
    success INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, connector_type TEXT, direction TEXT, executed_at TEXT, government_tenant_id TEXT, payload TEXT, response TEXT, status TEXT);

CREATE TABLE IF NOT EXISTS integration_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_name TEXT NOT NULL,
    status TEXT DEFAULT 'OPERATIONAL' CHECK(status IN ('OPERATIONAL','DEGRADED','OUTAGE')),
    latency_p95_ms REAL,
    error_rate REAL,
    last_checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "invoice_comparisons" (
  id TEXT PRIMARY KEY,
  provider_invoice_id TEXT,
  original_quote_id TEXT,
  ustn TEXT,
  discrepancies TEXT, -- JSON array of {field, quoted_value, invoiced_value, variance_pct}
  total_variance_amount REAL DEFAULT 0,
  total_variance_pct REAL DEFAULT 0,
  ai_recommendation TEXT CHECK(ai_recommendation IN ('APPROVE','FLAG','REJECT','ESCALATE')),
  approval_status TEXT DEFAULT 'PENDING' CHECK(approval_status IN ('PENDING','APPROVED','DISPUTED','ESCALATED')),
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "iot_sensor_readings" (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  sensor_type TEXT,
  sensor_id TEXT,
  value REAL,
  unit TEXT,
  latitude REAL,
  longitude REAL,
  confidence REAL DEFAULT 1.0,
  consensus_group TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
, anomaly_flag TEXT);

CREATE TABLE IF NOT EXISTS "jurisdiction_conflicts" (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    jurisdiction_a TEXT,
    jurisdiction_b TEXT,
    conflict_description TEXT,
    resolution_strategy TEXT,
    confidence REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS jurisdiction_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT NOT NULL,
    module_name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    config TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(country_code, module_name)
);

CREATE TABLE IF NOT EXISTS jurisdictions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sanctions_level TEXT NOT NULL,
    defi_allowed INTEGER DEFAULT 0,
    distressed_sale_allowed TEXT,
    distressed_country_factor REAL DEFAULT 1.0,
    distressed_sgtx_fee_factor REAL DEFAULT 1.0,
    kyc_tier_required INTEGER DEFAULT 2,
    deferred_fees_allowed TEXT,
    private_lending_allowed INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kyb_verifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    jurisdiction TEXT,
    tier INTEGER DEFAULT 1,
    checks TEXT,
    overall_status TEXT DEFAULT 'PENDING',
    trust_score INTEGER,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    checks TEXT,
    overall_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, ai_confidence TEXT, document_type TEXT, verification_result TEXT, verified_at DATETIME);

CREATE TABLE IF NOT EXISTS "lab_bookings" (
  id TEXT PRIMARY KEY,
  trade_request_id INTEGER,
  exporter_quote_id INTEGER,
  tenant_id INTEGER,
  laboratory_id INTEGER,
  ustn TEXT,
  commodity_type TEXT,
  product_name TEXT,
  test_types TEXT,
  sample_count INTEGER,
  priority TEXT,
  requested_date TEXT,
  estimated_completion TEXT,
  cost_estimate TEXT,
  cost_currency TEXT,
  notes TEXT,
  status TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS lab_certificates (
  id TEXT PRIMARY KEY, testing_job_id TEXT, certificate_type TEXT DEFAULT 'PHYTO',
  certificate_number TEXT, status TEXT DEFAULT 'PENDING_ISSUE',
  issued_at TEXT, valid_until TEXT, loom_hash TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lab_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT REFERENCES shipments(ustn),
    provider_gtid TEXT REFERENCES tenants(gtid),
    test_type TEXT NOT NULL,
    test_standard TEXT,
    status TEXT DEFAULT 'ASSIGNED',
    result TEXT,
    result_value TEXT,
    certificate_url TEXT,
    tested_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lab_testing_jobs (
  id TEXT PRIMARY KEY, ustn TEXT, lab_tenant_id TEXT, requester_tenant_id TEXT,
  sample_tracking_number TEXT, commodity_type TEXT, test_panel TEXT DEFAULT '[]',
  due_date TEXT, status TEXT DEFAULT 'PENDING', received_at TEXT, started_at TEXT,
  completed_at TEXT, results_json TEXT, overall_verdict TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "liquidity_auctions" (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT REFERENCES financing_requests(id),
    bid_window_start TEXT,
    bid_window_end TEXT,
    qualified_bidders INTEGER DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "liquidity_predictions" (
    id TEXT PRIMARY KEY,
    trade_id TEXT,
    prediction_horizon_days INTEGER,
    predicted_liquidity_need REAL,
    confidence REAL,
    model_version TEXT DEFAULT 'lightgbm-v1.0',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "living_quotes" (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    dynamic_pricing_enabled INTEGER DEFAULT 1,
    primary_route TEXT,
    contingency_route TEXT,
    last_price_update TEXT,
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "loading_windows" (
  id TEXT PRIMARY KEY,
  contract_id TEXT,
  shipment_id TEXT,
  ustn TEXT,
  window_start TEXT,
  window_end TEXT,
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

CREATE TABLE IF NOT EXISTS "logistics_addenda" (
  id TEXT PRIMARY KEY,
  contract_id TEXT,
  contract_shipment_id TEXT,
  provider_gtid TEXT,
  provider_tenant_id TEXT,
  service_type TEXT,
  addendum_content TEXT,
  ustn_placeholder TEXT,
  penalty_clause TEXT,
  signed_at TEXT,
  signature_hash TEXT,
  status TEXT DEFAULT 'PENDING',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logistics_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    mode TEXT NOT NULL CHECK(mode IN ('MANUAL','RFQ_LSP','DIRECT_SHIP')),
    service_type TEXT NOT NULL CHECK(service_type IN ('TRUCKING','OCEAN_FREIGHT','AIR_FREIGHT','WAREHOUSING','FORWARDING','LAB_TEST','QC_INSPECTION','BROKER_CERTIFICATION','BROKER_PHYSICAL','BROKER_STORAGE','BROKER_AUDIT')),
    provider_gtid TEXT REFERENCES tenants(gtid),
    manual_details TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "logistics_quotes" (
  id TEXT PRIMARY KEY,
  rfq_id INTEGER,
  lsp_tenant_id INTEGER,
  total_amount REAL,
  currency TEXT,
  breakdown TEXT,
  transit_days TEXT,
  valid_until TEXT,
  notes TEXT,
  status TEXT,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS "logistics_rfq_responses" (
  id TEXT PRIMARY KEY,
  rfq_id TEXT REFERENCES logistics_rfqs(id),
  logistics_tenant_id TEXT,
  total_price REAL,
  currency TEXT DEFAULT 'USD',
  transit_time_days INTEGER,
  services_included TEXT,
  conditions TEXT,
  valid_until TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
, provider_id INTEGER, provider_name TEXT, cost_breakdown TEXT, notes TEXT, transit_days TEXT, updated_at DATETIME);

CREATE TABLE IF NOT EXISTS "logistics_rfqs" (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  contract_id TEXT,
  requester_tenant_id TEXT,
  origin_port TEXT,
  destination_port TEXT,
  commodity_type TEXT,
  weight_kg REAL,
  volume_cbm REAL,
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  required_services TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'OPEN',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, clarification_request TEXT, decline_reason TEXT);

CREATE TABLE IF NOT EXISTS "logistics_service_catalog" (
  id TEXT PRIMARY KEY,
  logistics_tenant_id TEXT,
  service_type TEXT,
  service_name TEXT,
  description TEXT,
  base_rate REAL,
  rate_currency TEXT DEFAULT 'USD',
  rate_unit TEXT DEFAULT 'PER_CONTAINER',
  origin_regions TEXT,
  destination_regions TEXT,
  transit_time_days_min INTEGER,
  transit_time_days_max INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loom_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    decision_id INTEGER REFERENCES governor_decisions(decision_id),
    event_type TEXT NOT NULL,
    event_data TEXT,
    sequence_num INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "loom_logs" (
    id TEXT PRIMARY KEY,
    governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
    loom_hash TEXT,
    agent_reasoning TEXT, -- JSON
    deterministic_replay_enabled INTEGER DEFAULT 1,
    logged_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "maintenance_windows" (
    id TEXT PRIMARY KEY,
    title TEXT,
    affected_services TEXT, -- JSON array
    scheduled_start TEXT,
    scheduled_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "margin_calls" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    trigger_type TEXT, -- LTV_BREACH, COLLATERAL_DROP, PRICE_MOVE
    current_ltv REAL,
    required_ltv REAL,
    shortfall_amount REAL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RESOLVED','LIQUIDATED')),
    resolution TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_leads (
  id TEXT PRIMARY KEY, partner_tenant_id TEXT, raw_text TEXT,
  parsed_specs TEXT DEFAULT '{}', viability_score REAL DEFAULT 0,
  status TEXT DEFAULT 'NEW', created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "marketplace_partners" (
    id TEXT PRIMARY KEY,
    partner_name TEXT,
    api_key_hash TEXT,
    commission_split_percent REAL,
    active INTEGER DEFAULT 1
, agreement_effective_date DATETIME, api_key_created_at DATETIME, api_key_encrypted TEXT, contact_email TEXT, country TEXT, created_at DATETIME, ip_whitelist TEXT, partner_type TEXT, revenue_share_pct REAL, sandbox_enabled TEXT, status TEXT, tenant_id INTEGER, webhook_endpoints TEXT, total_attributed_trades TEXT, total_commission_earned TEXT, total_leads TEXT);

CREATE TABLE IF NOT EXISTS "micro_contracts" (
    id TEXT PRIMARY KEY,
    parent_contract_id INTEGER REFERENCES contracts(id),
    distressed_listing_id INTEGER REFERENCES distressed_cargo_listings(id),
    micro_ustn TEXT UNIQUE,
    buyer_gtid TEXT,
    seller_gtid TEXT,
    agreed_price REAL,
    sgtx_fee_rate REAL DEFAULT 0.015,
    sgtx_fee_amount REAL,
    fee_lock_id INTEGER,
    status TEXT DEFAULT 'PENDING_SIGNATURES',
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, buyer_tenant_id TEXT, country_factor REAL DEFAULT 1.0, seller_tenant_id TEXT, terms TEXT);

CREATE TABLE IF NOT EXISTS "micro_ustns" (
  id TEXT PRIMARY KEY,
  parent_ustn TEXT,
  micro_ustn TEXT UNIQUE,
  portion_percentage REAL,
  portion_value REAL,
  currency TEXT DEFAULT 'USD',
  reason TEXT CHECK(reason IN ('PARTIAL_DISTRESS','PARTIAL_REJECT','SPLIT_DELIVERY','QUALITY_ISSUE')),
  status TEXT DEFAULT 'CREATED' CHECK(status IN ('CREATED','ACTIVE','SETTLED','CANCELLED')),
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "milestone_finance_triggers" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    milestone TEXT,
    trigger_action TEXT,
    oracle_integration TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS milestone_payment_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    milestone_name TEXT NOT NULL,
    percentage REAL NOT NULL,
    amount REAL NOT NULL,
    pre_approved INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 0,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "model_drift_records" (
    id TEXT PRIMARY KEY,
    model_name TEXT,
    metric_name TEXT,
    baseline_value REAL,
    current_value REAL,
    drift_score REAL,
    threshold_exceeded INTEGER DEFAULT 0,
    retraining_triggered INTEGER DEFAULT 0,
    detected_at TEXT DEFAULT (datetime('now'))
, agent_id INTEGER, baseline_metrics TEXT, created_at DATETIME, current_metrics TEXT, drift_type TEXT, governor_decision_id INTEGER, model_version_id INTEGER, recommendation TEXT);

CREATE TABLE IF NOT EXISTS multi_agency_workflows (
  id TEXT PRIMARY KEY, ustn TEXT, agency TEXT, responsible_officer TEXT,
  deadline TEXT, status TEXT DEFAULT 'PENDING', approved_by TEXT, approved_at TEXT,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS multisig_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multisig_request_id INTEGER NOT NULL REFERENCES multisig_requests(id),
    approver_gtid TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('APPROVE','DENY','ABSTAIN')),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS multisig_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requester_gtid TEXT NOT NULL,
    required_approvals INTEGER DEFAULT 3,
    total_signers INTEGER DEFAULT 5,
    status TEXT DEFAULT 'PENDING',
    resolution_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS "negotiation_amendments" (
  id TEXT PRIMARY KEY,
  negotiation_session_id TEXT,
  trade_request_id TEXT,
  proposed_by_gtid TEXT,
  amendment_type TEXT DEFAULT 'GENERAL',
  amendments TEXT,
  reason TEXT,
  round_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING',
  response_note TEXT,
  responded_by_gtid TEXT,
  responded_at TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "negotiation_bot_configs" (
    id TEXT PRIMARY KEY,
    negotiation_session_id TEXT,
    tenant_id TEXT,
    role TEXT DEFAULT 'IMPORTER',
    max_rounds INTEGER DEFAULT 5,
    target_params TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    paused_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, commission_split_preference TEXT, max_price REAL, min_price REAL, strategy REAL, trade_request_id INTEGER);

CREATE TABLE IF NOT EXISTS "negotiation_sessions" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    messages TEXT DEFAULT '[]', -- JSON
    current_offer TEXT, -- JSON
    counter_offers TEXT DEFAULT '[]', -- JSON
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
);

CREATE TABLE IF NOT EXISTS negotiation_threads (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    auto_negotiation_enabled INTEGER DEFAULT 0,
    auto_accept_threshold REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "netting_circles" (
    id TEXT PRIMARY KEY,
    circle_id TEXT UNIQUE,
    member_gtids TEXT,
    netted_amount REAL,
    cryptographic_signatures TEXT,
    atomic_settlement_hash TEXT,
    status TEXT DEFAULT 'PROPOSED',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    type TEXT NOT NULL CHECK(type IN ('INBOX','EMAIL','PUSH','SMS')),
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "onboarding_draft_history" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  step_number INTEGER,
  step_data TEXT DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS onboarding_sandbox_data (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL,
  resource_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "opa_policy_log" (
  id TEXT PRIMARY KEY,
  policy_name TEXT,
  policy_version TEXT,
  rule_evaluated TEXT,
  input_context TEXT,
  result TEXT,
  evaluation_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
, change_type TEXT, changed_by TEXT, compiled_wasm TEXT, governor_decision_id INTEGER, policy_content TEXT, status TEXT, version TEXT);

CREATE TABLE IF NOT EXISTS "outreach_campaigns" (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  seller_tenant_id TEXT,
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

CREATE TABLE IF NOT EXISTS "packing_plans" (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    plan_data TEXT DEFAULT '{}',
    loading_guide TEXT,
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, ai_recommendation TEXT, container_type TEXT, exporter_quote_id TEXT, pallet_details TEXT, status TEXT, total_pallets INTEGER, total_weight_kg REAL DEFAULT 0, trade_request_id TEXT, utilization_pct REAL, visual_layout TEXT, volume_cbm REAL, weight_kg REAL, locked TEXT, locked_by TEXT, loom_hash TEXT);

CREATE TABLE IF NOT EXISTS "pallet_details" (
    id TEXT PRIMARY KEY,
    packing_plan_id INTEGER REFERENCES packing_plans(id),
    sscc TEXT UNIQUE,
    lot_number TEXT,
    product_hs_code TEXT,
    cartons_per_pallet INTEGER,
    layer_patterns TEXT,
    total_cartons INTEGER,
    gross_weight_kg REAL,
    cold_treatment_cert_ref TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
, carton_count INTEGER, commodity_description TEXT, dimensions_cm TEXT, hs_code TEXT, net_weight_kg REAL, pallet_number INTEGER);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  id TEXT PRIMARY KEY, partner_tenant_id TEXT, name TEXT, key_hash TEXT, prefix TEXT,
  permissions TEXT DEFAULT '["read"]', status TEXT DEFAULT 'ACTIVE',
  last_used_at TEXT, created_at TEXT, updated_at TEXT
, expires_at TEXT, ip_whitelist TEXT, is_active TEXT, key_prefix TEXT, marketplace_partner_id TEXT, rate_limit_per_hour TEXT, revoked_at DATETIME);

CREATE TABLE IF NOT EXISTS "partner_intents" (
    id TEXT PRIMARY KEY,
    marketplace_partner_id TEXT REFERENCES marketplace_partners(id),
    raw_text TEXT,
    parsed_specs TEXT, -- JSON
    viability_score INTEGER,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED','CONDITIONAL')),
    rejection_reason TEXT,
    trade_request_id TEXT, -- linked when converted
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "partner_lead_attributions" (
    id TEXT PRIMARY KEY,
    marketplace_partner_id TEXT REFERENCES marketplace_partners(id),
    importer_tenant_id TEXT REFERENCES tenants(id),
    exporter_tenant_id TEXT REFERENCES tenants(id),
    trade_request_id TEXT REFERENCES trade_requests(id),
    attribution_type TEXT DEFAULT 'AUTOMATIC', -- AUTOMATIC, MANUAL, DISPUTED
    revenue_share_pct REAL,
    commission_earned REAL,
    status TEXT DEFAULT 'ACTIVE',
    disputed_at TEXT,
    dispute_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, attribution_date DATETIME, buyer_tenant_id INTEGER, destination_country TEXT, origin_country TEXT, parsed_specs TEXT, partner_commission_pct REAL, raw_intent_text TEXT, seller_tenant_id INTEGER, viability_score REAL, resolution_notes TEXT, resolved_at DATETIME);

CREATE TABLE IF NOT EXISTS "partner_revenue_disputes" (
  id TEXT PRIMARY KEY,
  marketplace_partner_id INTEGER,
  lead_attribution_id INTEGER,
  trade_ustn TEXT,
  disputed_amount REAL,
  reason TEXT,
  ai_recommendation TEXT,
  status TEXT,
  governor_decision_id INTEGER,
  filed_at DATETIME
, resolution TEXT, resolved_at DATETIME);

CREATE TABLE IF NOT EXISTS "partner_sandbox_leads" (
    id TEXT PRIMARY KEY,
    partner_id TEXT REFERENCES marketplace_partners(id),
    raw_text TEXT,
    parsed_specs TEXT, -- JSON
    viability_score INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS partner_webhooks (
  id TEXT PRIMARY KEY, partner_tenant_id TEXT, url TEXT, events TEXT DEFAULT '[]',
  secret TEXT, status TEXT DEFAULT 'ACTIVE', last_triggered_at TEXT, created_at TEXT, updated_at TEXT
, is_active TEXT, marketplace_partner_id TEXT, secret_hash TEXT);

CREATE TABLE IF NOT EXISTS "payment_aggregators" (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    country_codes TEXT, -- JSON array
    supported_currencies TEXT, -- JSON array
    supports_split INTEGER DEFAULT 1,
    api_endpoint TEXT,
    uptime_score REAL,
    last_health_check TEXT,
    is_active INTEGER DEFAULT 1
, api_type TEXT, avg_settlement_hours TEXT, created_at DATETIME, fee_structure TEXT, onboarding_status TEXT, supported_methods TEXT, updated_at DATETIME);

CREATE TABLE IF NOT EXISTS "payment_attempts" (
  id TEXT PRIMARY KEY,
  commission_lock_id TEXT,
  psp_id TEXT,
  amount REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'INITIATED',
  psp_reference TEXT,
  webhook_verified INTEGER DEFAULT 0,
  gross_up_amount REAL DEFAULT 0,
  fee_amount REAL DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
, aggregator_id TEXT, amount_local REAL, amount_usd REAL, buyer_country TEXT, commission_amount_usd REAL, currency_local TEXT, exporter_amount REAL, fx_rate REAL, gross_amount REAL, net_amount REAL, payment_method TEXT, psp_fee_usd TEXT, psp_transaction_id TEXT, settled_at DATETIME, updated_at DATETIME);

CREATE TABLE IF NOT EXISTS "payment_verification_events" (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    verification_source TEXT,
    external_reference TEXT,
    extracted_ustn TEXT,
    payment_type TEXT,
    verified_amount REAL,
    verified_currency TEXT,
    verified_at TEXT,
    raw_payload TEXT,
    governor_decision_id TEXT,
    match_status TEXT DEFAULT 'MATCHED'
);

CREATE TABLE IF NOT EXISTS platform_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER REFERENCES employees(id),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "platform_config_versions" (
    id TEXT PRIMARY KEY,
    version_number INTEGER,
    manifest TEXT, -- JSON: full config snapshot
    changed_by TEXT,
    change_description TEXT,
    rollback_from TEXT,
    multisig_approval TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "platform_governance_proposals" (
  id TEXT PRIMARY KEY,
  proposal_type TEXT,
  description TEXT,
  proposed_by TEXT,
  required_signatures INTEGER DEFAULT 3,
  total_signers INTEGER DEFAULT 5,
  current_signatures INTEGER DEFAULT 0,
  signers TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
, executed_at DATETIME, execution_result TEXT, rejected_by TEXT, rejection_reason TEXT);

CREATE TABLE IF NOT EXISTS "policy_suggestions" (
    id TEXT PRIMARY KEY,
    source TEXT, -- RIA, AI_POLICY_TUNER, ADMIN
    category TEXT, -- JURISDICTION, SANCTIONS, COMMISSION, COMPLIANCE
    title TEXT,
    description TEXT,
    proposed_change TEXT, -- JSON
    current_value TEXT, -- JSON
    impact_assessment TEXT, -- JSON
    auto_approved INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','AUTO_APPROVED')),
    approved_by TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
, rationale TEXT, rego_diff TEXT, suggested_by TEXT, supporting_data TEXT, applied_at DATETIME, reviewed_by TEXT);

CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unlocode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT REFERENCES jurisdictions(code),
    latitude REAL,
    longitude REAL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "predictive_escrows" (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    trigger_hierarchy TEXT,
    primary_condition TEXT,
    escrow_amount REAL,
    escrow_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "predictive_health_metrics" (
    id TEXT PRIMARY KEY,
    service_name TEXT,
    metric_type TEXT,
    current_value REAL,
    predicted_value REAL,
    anomaly_score REAL DEFAULT 0,
    prediction_horizon_hours INTEGER DEFAULT 24,
    recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, metric_name TEXT, predicted_status TEXT, prediction_confidence TEXT, time_horizon_hours TEXT);

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

CREATE TABLE IF NOT EXISTS "provider_invoices" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    provider_quote_id TEXT REFERENCES provider_quotes(id),
    provider_gtid TEXT,
    invoice_amount REAL,
    extracted_amount REAL,
    discrepancy_flagged INTEGER DEFAULT 0,
    document_id TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS "provider_quotes" (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    provider_gtid TEXT,
    provider_type TEXT,
    is_bundle INTEGER DEFAULT 0,
    bundle_breakdown TEXT, 
    total_cost REAL,
    contract_reference TEXT,
    is_contract_rate INTEGER DEFAULT 0,
    route_details TEXT, 
    ai_benchmark_deviation REAL,
    status TEXT,
    governor_decision_id TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
, created_at TEXT, currency TEXT, destination_port TEXT, origin_port TEXT, price TEXT, provider_tenant_id TEXT, service_type TEXT, trade_request_id TEXT, transit_days TEXT);

CREATE TABLE IF NOT EXISTS psp_configurations (
  id TEXT PRIMARY KEY, name TEXT, provider_type TEXT, countries TEXT DEFAULT '[]',
  priority INTEGER DEFAULT 99, status TEXT DEFAULT 'ACTIVE', fallback_to TEXT,
  config_json TEXT DEFAULT '{}', created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "psp_fallback_chains" (
    id TEXT PRIMARY KEY,
    country_code TEXT,
    currency TEXT,
    chain TEXT, -- JSON array of aggregator_ids in priority order
    auto_fallback_enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "psp_health_logs" (
    id TEXT PRIMARY KEY,
    aggregator_id TEXT REFERENCES payment_aggregators(id),
    health_score REAL,
    latency_ms INTEGER,
    success_rate REAL,
    error_rate REAL,
    status TEXT DEFAULT 'HEALTHY' CHECK(status IN ('HEALTHY','DEGRADED','DOWN')),
    checked_at TEXT DEFAULT (datetime('now'))
, error_count TEXT, error_details TEXT);

CREATE TABLE IF NOT EXISTS "qc_jobs" (
    id TEXT PRIMARY KEY,
    ustn TEXT REFERENCES shipments(ustn),
    provider_gtid TEXT REFERENCES tenants(gtid),
    inspection_date TEXT,
    sampling_plan TEXT DEFAULT '{}',
    status TEXT DEFAULT 'ASSIGNED',
    verdict TEXT CHECK(verdict IN ('PASS','FAIL','CONDITIONAL')),
    conditional_pass_status TEXT,
    action_plan TEXT,
    action_plan_deadline TEXT,
    action_plan_completed_at TEXT,
    report_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, assigned_at TEXT, exporter_tenant_id TEXT, governor_decision_id TEXT, inspection_points TEXT, inspection_type TEXT DEFAULT 'PRE_SHIPMENT', qc_provider_tenant_id TEXT, quality_specs TEXT, shipment_ustn TEXT, trade_request_id TEXT, ai_defects TEXT, report_data TEXT, report_id TEXT);

CREATE TABLE IF NOT EXISTS "qc_override_log" (
  id TEXT PRIMARY KEY,
  qc_job_id TEXT,
  inspector_id TEXT,
  ai_finding TEXT, -- original AI finding
  ai_severity TEXT,
  override_action TEXT CHECK(override_action IN ('DOWNGRADE','DISMISS','RECLASSIFY','ACCEPT')),
  override_reason TEXT, -- minimum 10 chars enforced at API level
  override_evidence_url TEXT,
  flagged_for_dispute INTEGER DEFAULT 1,
  reviewed_by_supervisor INTEGER DEFAULT 0,
  supervisor_id TEXT,
  supervisor_decision TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "quote_logistics_lines" (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT,
  trade_request_id TEXT,
  cost_type TEXT,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_mandatory INTEGER DEFAULT 0,
  is_disabled INTEGER DEFAULT 0,
  provider_quote_id TEXT,
  notes TEXT,
  shipment_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "regulatory_compliance" (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT,
    jurisdiction TEXT,
    requirement TEXT,
    satisfied INTEGER DEFAULT 0,
    evidence_ref TEXT,
    governor_decision_id TEXT,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reinspection_requests (
  id TEXT PRIMARY KEY, original_inspection_id TEXT, inspector_tenant_id TEXT,
  requester_tenant_id TEXT, reason TEXT, status TEXT DEFAULT 'PENDING',
  decline_reason TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "release_confirmations" (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  commission_lock_id TEXT,
  contract_id TEXT,
  release_token TEXT UNIQUE,
  provider_gtid TEXT,
  sent_at TEXT,
  acknowledged_at TEXT,
  acknowledged_by_gtid TEXT,
  method TEXT DEFAULT 'API',
  status TEXT DEFAULT 'SENT',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revenue_attributions (
  id TEXT PRIMARY KEY, partner_tenant_id TEXT, ustn TEXT,
  attributed_revenue REAL DEFAULT 0, trade_value REAL DEFAULT 0,
  commission_pct REAL DEFAULT 0, status TEXT DEFAULT 'CONFIRMED',
  disputed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "roles" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT,
    permissions TEXT DEFAULT '[]',
    allowed_trader_modes TEXT DEFAULT '["BUY","SELL","DUAL"]',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS "route_options" (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    route_type TEXT,
    route_data TEXT,
    risk_score REAL,
    carbon_footprint_tons REAL,
    is_contingency INTEGER DEFAULT 0,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "sanctions_cache" (
    id TEXT PRIMARY KEY,
    list_source TEXT,
    entity_name TEXT,
    entity_type TEXT,
    country_code TEXT,
    list_updated_at TEXT,
    cached_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sanctions_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    entity_type TEXT,
    list_source TEXT,
    listing_date TEXT,
    sanctions_program TEXT,
    active INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "sanctions_proximity" (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT,
    sanctioned_entity_gtid TEXT,
    proximity_hops INTEGER,
    relationship_path TEXT,
    risk_score REAL,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "sanctions_update_log" (
    id TEXT PRIMARY KEY,
    list_source TEXT,
    entries_added INTEGER DEFAULT 0,
    entries_removed INTEGER DEFAULT 0,
    entries_total INTEGER DEFAULT 0,
    update_method TEXT DEFAULT 'MANUAL' CHECK(update_method IN ('MANUAL', 'API_FETCH', 'SCHEDULED')),
    updated_by TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    contact_gtid TEXT NOT NULL,
    contact_label TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, contact_gtid)
);

CREATE TABLE IF NOT EXISTS "seasonal_adjustments" (
    id TEXT PRIMARY KEY,
    commodity_hs_code TEXT,
    month INTEGER,
    adjustment_factor REAL DEFAULT 1.0,
    source TEXT DEFAULT 'AI_MODEL',
    created_at TEXT DEFAULT (datetime('now'))
, adjustment_pct REAL, commodity_category TEXT, valid_from_year TEXT, week_number TEXT);

CREATE TABLE IF NOT EXISTS secondary_market_listings (
  id TEXT PRIMARY KEY, agreement_id TEXT, seller_tenant_id TEXT,
  remaining_principal REAL DEFAULT 0, fair_value REAL DEFAULT 0,
  asking_price REAL DEFAULT 0, currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'ACTIVE', created_at TEXT, updated_at TEXT
, ai_suggested_price REAL, face_value REAL, financing_agreement_id TEXT, token_address TEXT, buyer_tenant_id TEXT, sold_at DATETIME);

CREATE TABLE IF NOT EXISTS "secondary_market_prices" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    suggested_price REAL,
    rationale TEXT,
    buyer_gtid TEXT,
    status TEXT DEFAULT 'LISTED',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "seller_shipment_responses" (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT,
  trade_request_id TEXT,
  shipment_number INTEGER,
  buyer_requested_date TEXT,
  seller_proposed_date TEXT,
  buyer_requested_port TEXT,
  seller_proposed_port TEXT,
  buyer_requested_count INTEGER,
  seller_proposed_count INTEGER,
  logistics_cost REAL DEFAULT 0,
  logistics_currency TEXT DEFAULT 'USD',
  response_type TEXT DEFAULT 'ACCEPT',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "sensor_consensus" (
    id TEXT PRIMARY KEY,
    milestone_id TEXT REFERENCES autonomous_milestones(id),
    source_type TEXT,
    source_value TEXT,
    weight REAL,
    consensus_met INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "sensor_data_logs" (
    id TEXT PRIMARY KEY,
    milestone_id TEXT,
    sensor_source TEXT,
    data_hash TEXT,
    loom_hash TEXT,
    raw_data TEXT,
    logged_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT REFERENCES shipments(ustn),
    provider_gtid TEXT REFERENCES tenants(gtid),
    service_type TEXT NOT NULL,
    fee REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'PENDING',
    accepted_at TEXT,
    invoice_uuid TEXT,
    validity_period_hours INTEGER DEFAULT 48,
    is_anonymous INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_risk_events (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES auth_sessions(id),
    employee_id INTEGER REFERENCES employees(id),
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'LOW',
    details TEXT DEFAULT '{}',
    loom_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    token TEXT UNIQUE NOT NULL,
    portal_context TEXT DEFAULT 'UCC',
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "settlement_confirmations" (
    id TEXT PRIMARY KEY,
    instruction_id TEXT REFERENCES settlement_instructions(id),
    proof_hash TEXT,
    amount_confirmed REAL,
    currency_confirmed TEXT,
    fx_rate_applied REAL,
    psp_name TEXT,
    webhook_received_at TEXT,
    verified_by_ai INTEGER DEFAULT 0,
    ai_verdict TEXT, -- JSON
    governor_decision_id TEXT,
    confirmed_at TEXT DEFAULT (datetime('now'))
, reconciliation_confidence TEXT);

CREATE TABLE IF NOT EXISTS "settlement_instructions" (
    id TEXT PRIMARY KEY,
    ustn TEXT,
    instruction_type TEXT,
    payload TEXT, 
    status TEXT DEFAULT 'PENDING',
    psp_reference TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, amount REAL DEFAULT 0, currency TEXT DEFAULT 'USD', loom_hash TEXT, payee_tenant_id TEXT, payer_tenant_id TEXT, payment_rail TEXT, remittance_info TEXT, approved_at DATETIME, executed_at DATETIME, fx_path TEXT, psp_id TEXT, reconciled_at DATETIME, reconciliation_status TEXT, voice_approved TEXT);

CREATE TABLE IF NOT EXISTS "settlement_path_executions" (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    bridge_contracts TEXT,
    verification_hashes TEXT,
    execution_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "shell_detection" (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT,
    detection_signals TEXT,
    confidence REAL,
    reviewed INTEGER DEFAULT 0,
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS ship_bookings (
  id TEXT PRIMARY KEY, ustn TEXT, trade_request_id TEXT, seller_tenant_id TEXT, buyer_tenant_id TEXT,
  shipping_line_tenant_id TEXT, container_type TEXT DEFAULT '40HC', container_count INTEGER DEFAULT 1,
  sailing_window_start TEXT, sailing_window_end TEXT, origin_port TEXT, destination_port TEXT,
  commodity_hs_chapter TEXT, volume_cbm REAL DEFAULT 0, status TEXT DEFAULT 'PENDING',
  vessel_name TEXT, voyage_number TEXT, departure_date TEXT, arrival_date TEXT,
  freight_rate REAL DEFAULT 0, quote_valid_until TEXT, decline_reason TEXT, addons TEXT DEFAULT '[]',
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ship_quote_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT REFERENCES shipments(ustn),
    seller_gtid TEXT,
    base_service_type TEXT DEFAULT 'OCEAN_FREIGHT',
    origin_port TEXT,
    destination_port TEXT,
    container_details TEXT,
    add_on_services TEXT,
    target_lines TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ship_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES ship_quote_requests(id),
    shipper_line_gtid TEXT,
    base_fee REAL,
    add_on_fees TEXT DEFAULT '{}',
    total_fee REAL,
    validity_period_hours INTEGER,
    selected INTEGER DEFAULT 0,
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "shipment_barcodes" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT,
    barcode_type TEXT,
    barcode_data TEXT,
    pallet_number INTEGER,
    sscc TEXT UNIQUE
, barcode_value TEXT, created_at TEXT, generated_by TEXT, governor_decision_id TEXT, hs_code TEXT, location TEXT, lot_number TEXT, pallet_id TEXT, scanned_at TEXT, scanned_by TEXT, shipment_id TEXT, ustn TEXT);

CREATE TABLE IF NOT EXISTS "shipment_document_requirements" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    document_type TEXT,
    responsible_party_type TEXT,
    responsible_tenant_id TEXT,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "shipment_ebls" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    platform TEXT,
    platform_reference TEXT,
    issue_date TEXT,
    current_holder_gtid TEXT,
    status TEXT DEFAULT 'ISSUED',
    events TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "shipment_milestones" (
    id TEXT PRIMARY KEY,
    ustn TEXT,
    milestone TEXT,
    confirmed_at TEXT,
    confirmed_by INTEGER,
    confirmation_method TEXT DEFAULT 'manual',
    governor_decision_id INTEGER,
    scanned_barcode_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
, evidence TEXT, evidence_hash TEXT, location TEXT, milestone_type TEXT, shipment_ustn TEXT);

CREATE TABLE IF NOT EXISTS "shipment_schedules" (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    shipment_number INTEGER,
    ustn TEXT,
    scheduled_loading_date TEXT,
    scheduled_delivery_date TEXT,
    contingency_plan TEXT,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "shipments" (
    id TEXT PRIMARY KEY,
    ustn TEXT UNIQUE,
    trade_request_id INTEGER REFERENCES trade_requests(id),
    contract_id INTEGER,
    exporter_gtid TEXT REFERENCES tenants(gtid),
    importer_gtid TEXT REFERENCES tenants(gtid),
    status TEXT DEFAULT 'INITIATED' CHECK(status IN ('INITIATED','STAGE1_PENDING','STAGE1_SETTLED','CUSTOMS_SUBMITTED','BOOKED','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_IMPORT','DELIVERED','SETTLED','COMPLETED','DISPUTED','DISTRESSED','CANCELLED')),
    incoterm TEXT,
    commodity_hs_code TEXT,
    product_description TEXT,
    quantity REAL,
    unit TEXT,
    total_value REAL,
    currency TEXT DEFAULT 'USD',
    gnn_risk TEXT,
    causal_analysis TEXT,
    container_numbers TEXT,
    vessel_name TEXT,
    voyage_number TEXT,
    origin_port TEXT,
    destination_port TEXT,
    etd TEXT,
    eta TEXT,
    actual_departure TEXT,
    actual_arrival TEXT,
    risk_score INTEGER,
    health_score REAL,
    carbon_footprint_kg_co2e REAL,
    is_anonymous INTEGER DEFAULT 0,
    anonymous_ustn TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
, booking_number TEXT, contract_sequence_number INTEGER DEFAULT 1, governor_decision_id TEXT, imo_number TEXT, loading_date TEXT, loading_time_slot TEXT, transport_legs TEXT, current_milestone TEXT);

CREATE TABLE IF NOT EXISTS "signature_sequences" (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    sequence_config TEXT,
    current_step INTEGER DEFAULT 0,
    governor_decision_id TEXT
, role TEXT, signature_hash TEXT, signed_at TEXT, signer_gtid TEXT);

CREATE TABLE IF NOT EXISTS smart_clause_executions (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    clause_id TEXT,
    solidity_pseudocode TEXT,
    deployment_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS "smart_container_decisions" (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT,
    decision_type TEXT,
    decision_data TEXT,
    safety_parameters TEXT,
    executed INTEGER DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "smart_inbox" (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER,
  type TEXT,
  title TEXT,
  body TEXT,
  priority TEXT,
  status TEXT,
  reference_id INTEGER,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS "smart_inbox_items" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    employee_id TEXT,
    item_type TEXT DEFAULT 'GENERAL',
    priority INTEGER DEFAULT 50,
    title TEXT,
    body TEXT,
    action_url TEXT,
    action_label TEXT,
    related_ustn TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    status TEXT DEFAULT 'UNREAD',
    dismissed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, action_link TEXT, category TEXT, deadline TEXT, description TEXT, dismissed INTEGER DEFAULT 0, item_id INTEGER, priority_score REAL, updated_at DATETIME, ustn TEXT, snoozed_until TEXT);

CREATE TABLE IF NOT EXISTS special_rates (
  id TEXT PRIMARY KEY, seller_gtid TEXT, buyer_gtid TEXT, rate_pct REAL DEFAULT 1.5,
  effective_from TEXT, effective_to TEXT, reason TEXT,
  status TEXT DEFAULT 'PENDING_MULTISIG', created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "stablecoin_health" (
    id TEXT PRIMARY KEY,
    symbol TEXT,
    chain TEXT,
    peg_deviation REAL,
    reserves_ratio REAL,
    risk_score REAL,
    alert_triggered INTEGER DEFAULT 0,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "stuck_trade_recovery" (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT,
    ustn TEXT,
    current_phase INTEGER,
    stuck_since TEXT,
    escalation_level INTEGER DEFAULT 0,
    last_reminder_sent TEXT,
    sla_hours INTEGER DEFAULT 72,
    recovery_action TEXT,
    resolved_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, days_stuck TEXT, detected_at DATETIME, reason TEXT, resolution_status TEXT, sla_deadline TEXT, status TEXT, stuck_status TEXT, tenant_id INTEGER, last_reminder_at DATETIME, resolution_notes TEXT);

CREATE TABLE IF NOT EXISTS "tenant_approval_groups" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    employee_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tenant_approval_policies" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER REFERENCES tenants(id),
    action TEXT,
    condition_json TEXT,
    required_approvals TEXT,
    quorum INTEGER,
    approval_mode TEXT DEFAULT 'parallel',
    enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "tenant_approval_requests" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  policy_id TEXT,
  requested_by TEXT,
  action_context TEXT DEFAULT '{}',
  approvals_received TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tenant_business_units" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER REFERENCES tenants(id),
    parent_bu_id INTEGER REFERENCES tenant_business_units(id),
    name TEXT,
    administrator_employee_id INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now'))
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
    is_blocked INTEGER DEFAULT 0, auto_saved INTEGER DEFAULT 0, contact_tenant_id INTEGER, created_at DATETIME, id TEXT, notes TEXT, owner_tenant_id INTEGER, relationship_health_score REAL, smart_labels TEXT, tags TEXT, trust_snapshot TEXT,
    PRIMARY KEY(tenant_id, contact_gtid)
);

CREATE TABLE IF NOT EXISTS "tenant_cost_centers" (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT,
    tenant_id TEXT,
    code TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tenant_data_exports" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    export_type TEXT DEFAULT 'RECONCILIATION',
    date_from TEXT,
    date_to TEXT,
    ustn_filter TEXT,
    format TEXT DEFAULT 'PDF',
    file_path TEXT,
    cryptographic_hash TEXT,
    status TEXT DEFAULT 'GENERATING',
    generated_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, date_range TEXT, requested_at TEXT, requested_by TEXT, checksum TEXT, completed_at DATETIME, signature TEXT);

CREATE TABLE IF NOT EXISTS "tenant_departments" (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tenant_lifecycle_history" (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    from_state TEXT,
    to_state TEXT,
    reason TEXT,
    governor_decision_id TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "tenant_onboarding_state" (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 6,
    step_data TEXT DEFAULT '{}',
    sandbox_active INTEGER DEFAULT 0,
    skipped_steps TEXT DEFAULT '[]',
    completed_steps TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
, completed INTEGER DEFAULT 0, draft_expires_at TEXT, completed_at DATETIME, draft_reminder_sent TEXT, sandbox_data TEXT, sandbox_reset_at DATETIME);

CREATE TABLE IF NOT EXISTS "tenants" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gtid TEXT UNIQUE,
    legal_name TEXT,
    legal_name_ar TEXT,
    type TEXT CHECK(type IN ('TRD','LSP','SHIP','LAB','QC','FIN','GOV','MP','CBR','CORPORATE','REGULATORY')),
    financier_subtype TEXT CHECK(financier_subtype IN ('BANK','PRIVATE')),
    lsp_subtype TEXT CHECK(lsp_subtype IN ('TRUCKING','FORWARDER','WAREHOUSING')),
    jurisdiction TEXT,
    tax_id TEXT,
    commercial_register TEXT,
    kyb_status TEXT DEFAULT 'PENDING',
    kyb_tier INTEGER DEFAULT 1,
    trust_score REAL DEFAULT 50.0,
    risk_score REAL DEFAULT 0.0,
    sanctions_cleared INTEGER DEFAULT 0,
    lifecycle_state TEXT DEFAULT 'REGISTERED',
    lifecycle_state_updated_at TEXT DEFAULT (datetime('now')),
    default_trader_mode TEXT DEFAULT 'DUAL' CHECK(default_trader_mode IN ('BUY','SELL','DUAL')),
    operating_mode TEXT DEFAULT 'SIMPLE',
    sandbox_mode INTEGER DEFAULT 1,
    onboarding_completed INTEGER DEFAULT 0,
    cryptographic_hash TEXT,
    anonymous_rfq_opt_out INTEGER DEFAULT 0,
    anonymous_trade_enabled INTEGER DEFAULT 0,
    external_api_key TEXT,
    branding TEXT DEFAULT '{}',
    qes_certificate_ref TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
, logistics_subrole TEXT);

CREATE TABLE IF NOT EXISTS "tokenized_trade_assets" (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    token_standard TEXT,
    token_address TEXT,
    pricing_model TEXT,
    secondary_market_enabled INTEGER DEFAULT 0,
    governor_decision_id TEXT
, chain TEXT, contract_id INTEGER, created_at DATETIME, current_value REAL, face_value REAL, status TEXT, token_type TEXT, trade_request_id INTEGER, owner_tenant_id TEXT);

CREATE TABLE IF NOT EXISTS "trade_channels" (
    channel_id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    importer_tenant_id TEXT REFERENCES tenants(id),
    exporter_tenant_id TEXT REFERENCES tenants(id),
    partner_source TEXT,
    channel_status TEXT DEFAULT 'ACTIVE',
    current_phase INTEGER DEFAULT 1,
    jurisdiction_rules_snapshot TEXT, 
    incoterm_rules_snapshot TEXT, 
    domain_ontology_snapshot TEXT, 
    match_score_at_creation REAL,
    sustainability_score_at_creation REAL,
    creation_governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "trade_composer_interactions" (
    interaction_id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    session_id TEXT,
    turn_number INTEGER,
    user_message TEXT,
    agent_responses TEXT,
    suggested_actions TEXT,
    user_selected_action TEXT,
    context_delta TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "trade_container_commodities" (
  id TEXT PRIMARY KEY,
  trade_container_id TEXT,
  trade_request_id TEXT,
  commodity_type TEXT,
  product_name TEXT,
  hs_code TEXT,
  product_specification TEXT,
  packaging TEXT DEFAULT 'boxes',
  packaging_custom TEXT,
  num_pallets INTEGER DEFAULT 1,
  quantity REAL,
  unit TEXT DEFAULT 'KG',
  sort_order INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
, dynamic_specification TEXT, gross_weight_per_unit REAL, net_weight_per_unit REAL, packaging_description TEXT, quantity_type TEXT DEFAULT 'WEIGHT', spec_confidence TEXT, tare_weight_per_unit REAL DEFAULT 0, total_gross_weight REAL, total_net_weight REAL, total_units INTEGER, weight_unit TEXT DEFAULT 'KG');

CREATE TABLE IF NOT EXISTS "trade_containers" (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  container_index INTEGER DEFAULT 1,
  container_type TEXT DEFAULT '40ft_HC',
  origin_country TEXT,
  destination_country TEXT,
  port_of_discharge TEXT,
  port_of_loading TEXT,
  palletized INTEGER DEFAULT 1,
  pallet_size TEXT DEFAULT '120x100',
  cloned_from_container_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
, clone_generation TEXT, clone_source_id TEXT, destination_override TEXT, port_of_discharge_unlocode TEXT, port_of_loading_unlocode TEXT, transport_mode TEXT DEFAULT 'SEA_CARGO');

CREATE TABLE IF NOT EXISTS "trade_documents" (
  id TEXT PRIMARY KEY,
  trade_request_id INTEGER,
  ustn TEXT,
  document_type TEXT,
  document_number TEXT,
  status TEXT,
  uploaded_by TEXT,
  file_url TEXT,
  file_hash TEXT,
  created_at DATETIME
, signed_at DATETIME, signed_by TEXT);

CREATE TABLE IF NOT EXISTS "trade_event_timeline" (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  event_type TEXT DEFAULT 'SYSTEM',
  event_text TEXT,
  event_data TEXT DEFAULT '{}',
  actor_gtid TEXT,
  phase TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "trade_requests" (
    id TEXT PRIMARY KEY,
    buyer_tenant_id INTEGER REFERENCES tenants(id),
    seller_tenant_id INTEGER REFERENCES tenants(id),
    raw_description TEXT,
    parsed_specs TEXT DEFAULT '{}',
    incoterm TEXT,
    multi_shipment_schedule TEXT,
    status TEXT DEFAULT 'INITIATED',
    marketplace_auto_attributed INTEGER DEFAULT 0,
    marketplace_partner_id INTEGER,
    created_by INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
, assigned_exporter_id TEXT, draft_data TEXT, draft_expires_at TEXT, exporter_tenant_id TEXT, governor_decision_id TEXT, importer_tenant_id TEXT, seller_company_name TEXT, seller_gtid TEXT, specifications TEXT, transport_mode TEXT DEFAULT 'SEA_CARGO', agent_session_id TEXT, express_mode_confidence TEXT, express_mode_raw_text TEXT, express_mode_used TEXT, quote_deadline TEXT);

CREATE TABLE IF NOT EXISTS "trader_mode_sessions" (
    id TEXT PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    tenant_id INTEGER REFERENCES tenants(id),
    mode TEXT CHECK(mode IN ('BUY','SELL')),
    switched_at TEXT DEFAULT (datetime('now')),
    previous_mode TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, started_at TEXT);

CREATE TABLE IF NOT EXISTS trucking_gps_traces (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    anonymized_trace TEXT, -- JSON
    actual_distance_km REAL,
    actual_duration_min INTEGER
, driver_id INTEGER, heading TEXT, latitude REAL, longitude REAL, recorded_at DATETIME, shipment_id INTEGER, speed_kmh TEXT, vehicle_id INTEGER);

CREATE TABLE IF NOT EXISTS "trust_scores" (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    score REAL DEFAULT 50.0,
    score_components TEXT DEFAULT '{}',
    calculated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
, buy_mode_score TEXT, components TEXT, gtid TEXT, model_version TEXT, sell_mode_score REAL, updated_at TEXT);

CREATE TABLE IF NOT EXISTS user_preferences (
    employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
    default_landing TEXT DEFAULT 'UCC',
    quick_actions TEXT,
    ai_assistant_enabled INTEGER DEFAULT 1,
    voice_commands_enabled INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    dashboard_cards TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "ustn_registry" (
  ustn TEXT PRIMARY KEY,
  trade_request_id TEXT REFERENCES trade_requests(id),
  importer_gtid_suffix TEXT,
  exporter_gtid_suffix TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vessel_schedules (
  id TEXT PRIMARY KEY, vessel_name TEXT, voyage_number TEXT, shipping_line_tenant_id TEXT,
  route_ports TEXT DEFAULT '[]', departure_date TEXT, arrival_date TEXT,
  status TEXT DEFAULT 'SCHEDULED', capacity_teu INTEGER DEFAULT 0, available_teu INTEGER DEFAULT 0,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS voice_transcripts (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    ustn TEXT,
    trade_request_id TEXT,
    raw_audio_hash TEXT,
    transcribed_text TEXT,
    extracted_intent TEXT,
    language TEXT DEFAULT 'en',
    model_version TEXT DEFAULT 'vosk-0.22',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouse_operations (
  id TEXT PRIMARY KEY, warehouse_tenant_id TEXT, ustn TEXT, operation_type TEXT,
  pallet_count INTEGER DEFAULT 0, temperature_zone TEXT DEFAULT 'Ambient',
  status TEXT DEFAULT 'PENDING', vehicle_id TEXT, created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS "webhook_delivery_logs" (
    id TEXT PRIMARY KEY,
    partner_id TEXT REFERENCES marketplace_partners(id),
    endpoint_url TEXT,
    event_type TEXT,
    payload TEXT, -- JSON
    response_status INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    success INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
, delivered_at DATETIME, response_time_ms REAL, webhook_id INTEGER);

CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cbr_jobs_ustn ON cbr_jobs(ustn);
CREATE INDEX IF NOT EXISTS idx_clearance_jurisdiction ON clearance_items(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_consent_employee ON consent_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_ebl_issuer ON electronic_bls(issuer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_payment_status ON fee_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_inbox_employee ON inbox_items(employee_id, priority_score);
CREATE INDEX IF NOT EXISTS idx_inbox_tenant ON inbox_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_inspector ON inspection_queue(inspector_tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_lab ON lab_testing_jobs(lab_tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_ustn ON lab_jobs(ustn);
CREATE INDEX IF NOT EXISTS idx_loom_sequence ON loom_chain(sequence_num);
CREATE INDEX IF NOT EXISTS idx_milestone_payment_contract ON milestone_payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_ship_bookings_line ON ship_bookings(shipping_line_tenant_id);
CREATE INDEX IF NOT EXISTS idx_vessel_line ON vessel_schedules(shipping_line_tenant_id);

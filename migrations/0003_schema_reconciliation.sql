-- Migration 0003: full schema reconciliation (auto-generated from git-history DDL)
-- Restores tables and columns referenced by src/ but dropped by migration consolidation

CREATE TABLE IF NOT EXISTS agent_mesh_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT,
  session_type TEXT NOT NULL,
  agents_activated TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  loom_entries TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_agents (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL UNIQUE,
    authority_level TEXT NOT NULL CHECK(authority_level IN ('A0','A1','A2','A3','A4')),
    preferred_api TEXT DEFAULT 'groq', -- groq, huggingface_local, hybrid
    description TEXT,
    phase_integration TEXT, -- JSON array of phases
    model_name TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS ai_model_versions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES ai_agents(id),
    model_name TEXT NOT NULL,
    version TEXT NOT NULL,
    metrics TEXT, -- JSON: accuracy, latency, etc.
    drift_score REAL,
    deployed_at TEXT DEFAULT (datetime('now')),
    retired_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_notes_suggestions (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  tenant_id TEXT NOT NULL,
  trade_context TEXT NOT NULL,
  suggestions TEXT NOT NULL,
  ai_provider TEXT DEFAULT 'groq',
  accepted_suggestions TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_product_spec_templates (
  id TEXT PRIMARY KEY,
  commodity_type TEXT NOT NULL,
  product_name TEXT,
  hs_code TEXT,
  spec_fields TEXT NOT NULL,
  ai_provider TEXT DEFAULT 'groq',
  cache_ttl_hours INTEGER DEFAULT 168,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS auto_reconciliation_results (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    reconciliation_confidence REAL,
    mismatch_details TEXT,
    requires_human_review INTEGER DEFAULT 0,
    reviewed_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS autonomous_recovery_actions (
    id TEXT PRIMARY KEY,
    disruption_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS blockchain_verifications (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    contract_address TEXT,
    transaction_hash TEXT,
    verification_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
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

CREATE TABLE IF NOT EXISTS carbon_calculations (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL,
    route_km REAL,
    transport_mode TEXT DEFAULT 'SEA',
    co2_kg REAL NOT NULL,
    methodology TEXT DEFAULT 'GLEC_FRAMEWORK',
    offset_credits REAL DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS carrier_performance_profiles (
    id TEXT PRIMARY KEY,
    carrier_tenant_id TEXT,
    carrier_name TEXT NOT NULL,
    service_type TEXT DEFAULT 'OCEAN',
    risk_score REAL DEFAULT 80,
    ontime_pct REAL DEFAULT 95,
    dispute_rate REAL DEFAULT 0,
    avg_delay_hours REAL DEFAULT 0,
    routes_served TEXT DEFAULT '[]',
    last_updated TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clause_risk_scores (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    risk_category TEXT NOT NULL,
    risk_score REAL,
    mitigation_suggestions TEXT,
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

CREATE TABLE IF NOT EXISTS commission_lock_events (
    id TEXT PRIMARY KEY,
    lock_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    release_pct REAL DEFAULT 0,
    trigger_milestone TEXT,
    actor_gtid TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS commodity_market_prices (
    id TEXT PRIMARY KEY,
    commodity_name TEXT NOT NULL,
    hs_code TEXT,
    origin_country TEXT,
    destination_country TEXT,
    price_per_kg REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    source TEXT DEFAULT 'FAO',
    recorded_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS commodity_specifications (
    id TEXT PRIMARY KEY,
    hs_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    description TEXT,
    storage_requirements TEXT,
    shelf_life_days INTEGER,
    temperature_range TEXT,
    humidity_range TEXT,
    packing_guidance TEXT,
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

CREATE TABLE IF NOT EXISTS computer_vision_jobs (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT,
    image_path TEXT NOT NULL,
    model_version TEXT NOT NULL,
    detected_objects TEXT,
    confidence REAL,
    requires_human_review INTEGER DEFAULT 0,
    reviewed_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS container_loading_plans (
    id TEXT PRIMARY KEY,
    packing_plan_id TEXT NOT NULL REFERENCES packing_plans(id),
    container_number TEXT,
    container_type TEXT DEFAULT '40HC_REEFER',
    pallet_ids TEXT NOT NULL, -- JSON array of pallet IDs
    visual_layout TEXT, -- JSON 3D layout
    cargo_weight_kg REAL,
    utilization_pct REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS container_operations_log (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  operation_type TEXT NOT NULL,
  source_container_index INTEGER,
  target_container_indices TEXT,
  fields_applied TEXT,
  pattern_incremented TEXT,
  actor_gtid TEXT,
  actor_employee_id TEXT,
  undone INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS country_commodity_factors (
    origin_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    hs_code TEXT NOT NULL,
    profit_boost_pct REAL,
    last_calculated TEXT,
    model_version TEXT,
    PRIMARY KEY(origin_country, destination_country, hs_code)
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

CREATE TABLE IF NOT EXISTS cross_tenant_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_gtid TEXT NOT NULL,
  member_gtids TEXT NOT NULL DEFAULT '[]',
  group_type TEXT DEFAULT 'HOLDING_COMPANY',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS defi_financing_transactions (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    chain TEXT NOT NULL,
    protocol TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL,
    stablecoin TEXT,
    tx_hash TEXT,
    block_number INTEGER,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS defi_protocols (
    id TEXT PRIMARY KEY,
    protocol_name TEXT NOT NULL,
    chain TEXT NOT NULL, -- Polygon, Ethereum, etc.
    tvl REAL,
    apy_range TEXT, -- JSON {min, max}
    risk_score REAL,
    audit_status TEXT,
    supported_stablecoins TEXT, -- JSON array
    contract_addresses TEXT, -- JSON
    active INTEGER DEFAULT 1,
    last_health_check TEXT
);

CREATE TABLE IF NOT EXISTS digital_twin_snapshots (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL,
    simulation_params TEXT,
    predicted_eta TEXT,
    shelf_life_days REAL,
    temperature_forecast TEXT,
    risk_assessment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS dispute_history (
    id TEXT PRIMARY KEY,
    entity_gtid TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS dispute_recommendations (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL REFERENCES disputes(id),
    ai_prediction TEXT,
    suggested_settlement TEXT, -- JSON
    confidence REAL,
    shap_values TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS distressed_outreach_notifications (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    sender_tenant_id TEXT NOT NULL,
    recipient_gtid TEXT NOT NULL,
    outreach_mode TEXT DEFAULT 'STANDARD',
    message_content TEXT,
    delivery_status TEXT DEFAULT 'SENT',
    read_at TEXT,
    response_type TEXT,
    privacy_notice_acknowledged INTEGER DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  logistics_tenant_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS ebl_capability_matrix (
    carrier_id TEXT PRIMARY KEY,
    carrier_name TEXT NOT NULL,
    supported_platforms TEXT,
    supported_routes TEXT,
    last_verified TEXT,
    is_active INTEGER DEFAULT 1
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

CREATE TABLE IF NOT EXISTS execution_gate_log (
  id TEXT PRIMARY KEY,
  governor_decision_id TEXT NOT NULL REFERENCES governor_decisions(decision_id),
  wasm_module TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_verdict TEXT NOT NULL,
  execution_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exporter_quote_alternatives (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  price_per_unit REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS express_mode_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT,
  raw_text TEXT NOT NULL,
  source TEXT DEFAULT 'text',
  language TEXT DEFAULT 'en',
  parsed_result TEXT NOT NULL,
  confidence_overall REAL,
  field_confidences TEXT,
  ai_provider TEXT DEFAULT 'huggingface',
  ai_model TEXT,
  processing_time_ms INTEGER,
  human_confirmed INTEGER DEFAULT 0,
  human_corrections TEXT,
  loom_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exw_price_watch (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  locked_price REAL NOT NULL,
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

CREATE TABLE IF NOT EXISTS fraud_detection (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT NOT NULL,
    fraud_type TEXT NOT NULL,
    graph_cycle_detected INTEGER DEFAULT 0,
    confidence REAL,
    detected_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fx_conversion_paths (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    path_steps TEXT NOT NULL DEFAULT '[]',
    total_cost REAL,
    total_slippage REAL,
    selected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fx_rate_cache (
    id TEXT PRIMARY KEY,
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    source TEXT DEFAULT 'ECB',
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geocoded_locations (
    id TEXT PRIMARY KEY,
    address_text TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    place_id TEXT
);

CREATE TABLE IF NOT EXISTS government_profiles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    jurisdiction TEXT NOT NULL,
    agency_type TEXT NOT NULL, -- CUSTOMS, PORT_AUTHORITY, TRADE_MINISTRY, REGULATORY
    enabled_modules TEXT NOT NULL DEFAULT '[]', -- JSON array
    anonymous_trade_enabled INTEGER DEFAULT 0,
    allowed_commodities TEXT, -- JSON array (null = all)
    risk_thresholds TEXT, -- JSON
    api_endpoints TEXT, -- JSON
    onboarding_status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS governor_nonces (
    nonce TEXT PRIMARY KEY,
    actor_gtid TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    used_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    request_timestamp TEXT NOT NULL,
    ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS gtid_sequences (
  country_code TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS inbox_history (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  ustn TEXT,
  action_taken TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('P1','P2','P3','P4')),
    title TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS individual_financiers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    accreditation_status TEXT NOT NULL,
    investment_capacity REAL,
    preferred_instruments TEXT,
    risk_tolerance REAL,
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    inspector_tenant_id TEXT REFERENCES tenants(id),
    inspection_type TEXT NOT NULL DEFAULT 'PRE_SHIPMENT',
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
);

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

CREATE TABLE IF NOT EXISTS iot_sensor_readings (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  sensor_id TEXT,
  value REAL,
  unit TEXT,
  latitude REAL,
  longitude REAL,
  confidence REAL DEFAULT 1.0,
  consensus_group TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
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
);

CREATE TABLE IF NOT EXISTS liquidity_predictions (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL,
    prediction_horizon_days INTEGER NOT NULL,
    predicted_liquidity_need REAL,
    confidence REAL,
    model_version TEXT DEFAULT 'lightgbm-v1.0',
    governor_decision_id TEXT,
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

CREATE TABLE IF NOT EXISTS logistics_addenda (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  contract_shipment_id TEXT,
  provider_gtid TEXT NOT NULL,
  provider_tenant_id TEXT,
  service_type TEXT NOT NULL,
  addendum_content TEXT,
  ustn_placeholder TEXT,
  penalty_clause TEXT,
  signed_at TEXT,
  signature_hash TEXT,
  status TEXT DEFAULT 'PENDING',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logistics_rfq_responses (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL REFERENCES logistics_rfqs(id),
  logistics_tenant_id TEXT NOT NULL,
  total_price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  transit_time_days INTEGER,
  services_included TEXT,
  conditions TEXT,
  valid_until TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logistics_rfqs (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  contract_id TEXT,
  requester_tenant_id TEXT NOT NULL,
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
);

CREATE TABLE IF NOT EXISTS logistics_service_catalog (
  id TEXT PRIMARY KEY,
  logistics_tenant_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS loom_logs (
    id TEXT PRIMARY KEY,
    governor_decision_id TEXT NOT NULL REFERENCES governor_decisions(decision_id),
    loom_hash TEXT NOT NULL,
    agent_reasoning TEXT, -- JSON
    deterministic_replay_enabled INTEGER DEFAULT 1,
    logged_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_windows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    affected_services TEXT, -- JSON array
    scheduled_start TEXT NOT NULL,
    scheduled_end TEXT NOT NULL,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS margin_calls (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL REFERENCES financing_agreements(id),
    trigger_type TEXT NOT NULL, -- LTV_BREACH, COLLATERAL_DROP, PRICE_MOVE
    current_ltv REAL,
    required_ltv REAL,
    shortfall_amount REAL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RESOLVED','LIQUIDATED')),
    resolution TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_partners (
    id TEXT PRIMARY KEY,
    partner_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    commission_split_percent REAL,
    active INTEGER DEFAULT 1
);

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

CREATE TABLE IF NOT EXISTS milestone_finance_triggers (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    milestone TEXT NOT NULL,
    trigger_action TEXT NOT NULL,
    oracle_integration TEXT,
    governor_decision_id TEXT
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

CREATE TABLE IF NOT EXISTS negotiation_amendments (
  id TEXT PRIMARY KEY,
  negotiation_session_id TEXT NOT NULL,
  trade_request_id TEXT,
  proposed_by_gtid TEXT NOT NULL,
  amendment_type TEXT DEFAULT 'GENERAL',
  amendments TEXT NOT NULL,
  reason TEXT,
  round_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING',
  response_note TEXT,
  responded_by_gtid TEXT,
  responded_at TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS negotiation_bot_configs (
    id TEXT PRIMARY KEY,
    negotiation_session_id TEXT,
    tenant_id TEXT NOT NULL,
    role TEXT DEFAULT 'IMPORTER',
    max_rounds INTEGER DEFAULT 5,
    target_params TEXT NOT NULL DEFAULT '{}',
    active INTEGER DEFAULT 1,
    paused_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS negotiation_threads (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    auto_negotiation_enabled INTEGER DEFAULT 0,
    auto_accept_threshold REAL,
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS netting_circles (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL UNIQUE,
    member_gtids TEXT NOT NULL,
    netted_amount REAL,
    cryptographic_signatures TEXT,
    atomic_settlement_hash TEXT,
    status TEXT DEFAULT 'PROPOSED',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS onboarding_draft_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_data TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS opa_policy_log (
  id TEXT PRIMARY KEY,
  policy_name TEXT NOT NULL,
  policy_version TEXT,
  rule_evaluated TEXT,
  input_context TEXT,
  result TEXT,
  evaluation_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS partner_intents (
    id TEXT PRIMARY KEY,
    marketplace_partner_id TEXT NOT NULL REFERENCES marketplace_partners(id),
    raw_text TEXT NOT NULL,
    parsed_specs TEXT, -- JSON
    viability_score INTEGER,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED','CONDITIONAL')),
    rejection_reason TEXT,
    trade_request_id TEXT, -- linked when converted
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partner_lead_attributions (
    id TEXT PRIMARY KEY,
    marketplace_partner_id TEXT NOT NULL REFERENCES marketplace_partners(id),
    importer_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    trade_request_id TEXT REFERENCES trade_requests(id),
    attribution_type TEXT DEFAULT 'AUTOMATIC', -- AUTOMATIC, MANUAL, DISPUTED
    revenue_share_pct REAL,
    commission_earned REAL,
    status TEXT DEFAULT 'ACTIVE',
    disputed_at TEXT,
    dispute_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partner_sandbox_leads (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES marketplace_partners(id),
    raw_text TEXT,
    parsed_specs TEXT, -- JSON
    viability_score INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

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

CREATE TABLE IF NOT EXISTS payment_verification_events (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    verification_source TEXT NOT NULL,
    external_reference TEXT NOT NULL,
    extracted_ustn TEXT,
    payment_type TEXT,
    verified_amount REAL,
    verified_currency TEXT,
    verified_at TEXT NOT NULL,
    raw_payload TEXT,
    governor_decision_id TEXT,
    match_status TEXT DEFAULT 'MATCHED'
);

CREATE TABLE IF NOT EXISTS platform_config_versions (
    id TEXT PRIMARY KEY,
    version_number INTEGER NOT NULL,
    manifest TEXT NOT NULL, -- JSON: full config snapshot
    changed_by TEXT,
    change_description TEXT,
    rollback_from TEXT,
    multisig_approval TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS policy_suggestions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL, -- RIA, AI_POLICY_TUNER, ADMIN
    category TEXT NOT NULL, -- JURISDICTION, SANCTIONS, COMMISSION, COMPLIANCE
    title TEXT NOT NULL,
    description TEXT,
    proposed_change TEXT NOT NULL, -- JSON
    current_value TEXT, -- JSON
    impact_assessment TEXT, -- JSON
    auto_approved INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','AUTO_APPROVED')),
    approved_by TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS predictive_escrows (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    trigger_hierarchy TEXT NOT NULL,
    primary_condition TEXT,
    escrow_amount REAL,
    escrow_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS predictive_health_metrics (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    current_value REAL,
    predicted_value REAL,
    anomaly_score REAL DEFAULT 0,
    prediction_horizon_hours INTEGER DEFAULT 24,
    recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS psp_fallback_chains (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    currency TEXT NOT NULL,
    chain TEXT NOT NULL, -- JSON array of aggregator_ids in priority order
    auto_fallback_enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS psp_health_logs (
    id TEXT PRIMARY KEY,
    aggregator_id TEXT NOT NULL REFERENCES payment_aggregators(id),
    health_score REAL NOT NULL,
    latency_ms INTEGER,
    success_rate REAL,
    error_rate REAL,
    status TEXT DEFAULT 'HEALTHY' CHECK(status IN ('HEALTHY','DEGRADED','DOWN')),
    checked_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS quote_logistics_lines (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  cost_type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_mandatory INTEGER DEFAULT 0,
  is_disabled INTEGER DEFAULT 0,
  provider_quote_id TEXT,
  notes TEXT,
  shipment_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regulatory_compliance (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT,
    jurisdiction TEXT NOT NULL,
    requirement TEXT NOT NULL,
    satisfied INTEGER DEFAULT 0,
    evidence_ref TEXT,
    governor_decision_id TEXT,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS release_confirmations (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  commission_lock_id TEXT NOT NULL,
  contract_id TEXT,
  release_token TEXT NOT NULL UNIQUE,
  provider_gtid TEXT,
  sent_at TEXT,
  acknowledged_at TEXT,
  acknowledged_by_gtid TEXT,
  method TEXT DEFAULT 'API',
  status TEXT DEFAULT 'SENT',
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS sanctions_cache (
    id TEXT PRIMARY KEY,
    list_source TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_type TEXT,
    country_code TEXT,
    list_updated_at TEXT,
    cached_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS seasonal_adjustments (
    id TEXT PRIMARY KEY,
    commodity_hs_code TEXT NOT NULL,
    month INTEGER NOT NULL,
    adjustment_factor REAL DEFAULT 1.0,
    source TEXT DEFAULT 'AI_MODEL',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS secondary_market_prices (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL,
    suggested_price REAL,
    rationale TEXT,
    buyer_gtid TEXT,
    status TEXT DEFAULT 'LISTED',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seller_shipment_responses (
  id TEXT PRIMARY KEY,
  exporter_quote_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  shipment_number INTEGER NOT NULL,
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

CREATE TABLE IF NOT EXISTS sensor_consensus (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES autonomous_milestones(id),
    source_type TEXT NOT NULL,
    source_value TEXT,
    weight REAL,
    consensus_met INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sensor_data_logs (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL,
    sensor_source TEXT NOT NULL,
    data_hash TEXT NOT NULL,
    loom_hash TEXT NOT NULL,
    raw_data TEXT,
    logged_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS settlement_path_executions (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT NOT NULL,
    bridge_contracts TEXT,
    verification_hashes TEXT,
    execution_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shell_detection (
    id TEXT PRIMARY KEY,
    tenant_gtid TEXT NOT NULL,
    detection_signals TEXT,
    confidence REAL,
    reviewed INTEGER DEFAULT 0,
    reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS shipment_document_requirements (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    document_type TEXT NOT NULL,
    responsible_party_type TEXT,
    responsible_tenant_id TEXT,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
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

CREATE TABLE IF NOT EXISTS smart_clause_executions (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    clause_id TEXT,
    solidity_pseudocode TEXT,
    deployment_status TEXT DEFAULT 'PENDING',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS smart_container_decisions (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    decision_data TEXT,
    safety_parameters TEXT,
    executed INTEGER DEFAULT 0,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smart_inbox_items (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    employee_id TEXT,
    item_type TEXT NOT NULL DEFAULT 'GENERAL',
    priority INTEGER DEFAULT 50,
    title TEXT NOT NULL,
    body TEXT,
    action_url TEXT,
    action_label TEXT,
    related_ustn TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    status TEXT DEFAULT 'UNREAD',
    dismissed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stablecoin_health (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    chain TEXT NOT NULL,
    peg_deviation REAL,
    reserves_ratio REAL,
    risk_score REAL,
    alert_triggered INTEGER DEFAULT 0,
    checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stuck_trade_recovery (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT,
    ustn TEXT,
    current_phase INTEGER,
    stuck_since TEXT NOT NULL,
    escalation_level INTEGER DEFAULT 0,
    last_reminder_sent TEXT,
    sla_hours INTEGER DEFAULT 72,
    recovery_action TEXT,
    resolved_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  action_context TEXT NOT NULL DEFAULT '{}',
  approvals_received TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  resolved_at TEXT,
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
    is_blocked INTEGER DEFAULT 0,
    PRIMARY KEY(tenant_id, contact_gtid)
);

CREATE TABLE IF NOT EXISTS tenant_cost_centers (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_departments (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS trucking_gps_traces (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    anonymized_trace TEXT, -- JSON
    actual_distance_km REAL,
    actual_duration_min INTEGER
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

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES marketplace_partners(id),
    endpoint_url TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT, -- JSON
    response_status INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    success INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE anonymous_trade_mappings ADD COLUMN authorized_viewers TEXT;
ALTER TABLE anonymous_trade_mappings ADD COLUMN redacted_fields TEXT;
ALTER TABLE commission_singularity_calculations ADD COLUMN adjustments TEXT;
ALTER TABLE commission_singularity_calculations ADD COLUMN base_rate REAL;
ALTER TABLE commission_singularity_calculations ADD COLUMN commission_usd REAL;
ALTER TABLE commission_singularity_calculations ADD COLUMN explanation TEXT;
ALTER TABLE commission_singularity_calculations ADD COLUMN final_rate REAL;
ALTER TABLE commission_singularity_calculations ADD COLUMN payer TEXT;
ALTER TABLE commission_singularity_calculations ADD COLUMN policy_bounds_check INTEGER DEFAULT 1;
ALTER TABLE commission_singularity_calculations ADD COLUMN trade_id TEXT;
ALTER TABLE commission_singularity_calculations ADD COLUMN trade_value_usd REAL;
ALTER TABLE contract_shipments ADD COLUMN port_of_loading TEXT;
ALTER TABLE contracts ADD COLUMN ai_validation_status TEXT;
ALTER TABLE contracts ADD COLUMN clause_forge_confidence REAL;
ALTER TABLE contracts ADD COLUMN commission_allocation TEXT;
ALTER TABLE contracts ADD COLUMN commission_collection_model TEXT DEFAULT 'UPFRONT';
ALTER TABLE contracts ADD COLUMN commission_responsibility TEXT;
ALTER TABLE contracts ADD COLUMN document_url TEXT;
ALTER TABLE contracts ADD COLUMN exporter_commission_pct REAL;
ALTER TABLE contracts ADD COLUMN importer_commission_pct REAL;
ALTER TABLE contracts ADD COLUMN incoterm_rules TEXT;
ALTER TABLE contracts ADD COLUMN multi_shipment_schedule TEXT;
ALTER TABLE contracts ADD COLUMN own_contract_pdf_hash TEXT;
ALTER TABLE contracts ADD COLUMN own_contract_uploaded INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN sgtx_witness_signature TEXT;
ALTER TABLE contracts ADD COLUMN updated_at TEXT;
ALTER TABLE contracts ADD COLUMN uploaded_by_tenant_id TEXT;
ALTER TABLE data_scopes ADD COLUMN country_access TEXT;
ALTER TABLE data_scopes ADD COLUMN document_types TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN amount TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN financing_request_id TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN governor_decision_id TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN health_factor REAL DEFAULT 1.5;
ALTER TABLE defi_tranche_positions ADD COLUMN protocol_id TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN token TEXT DEFAULT 'USDC';
ALTER TABLE disputes ADD COLUMN category TEXT;
ALTER TABLE disputes ADD COLUMN created_at TEXT;
ALTER TABLE disputes ADD COLUMN dispute_type TEXT;
ALTER TABLE disputes ADD COLUMN evidence_ids TEXT;
ALTER TABLE disputes ADD COLUMN evidence_links TEXT;
ALTER TABLE disputes ADD COLUMN filed_by_tenant_id TEXT;
ALTER TABLE disputes ADD COLUMN remedy_sought TEXT;
ALTER TABLE disputes ADD COLUMN respondent_gtid TEXT;
ALTER TABLE disputes ADD COLUMN severity INTEGER DEFAULT 0;
ALTER TABLE distressed_cargo_listings ADD COLUMN ai_price_recommendation TEXT;
ALTER TABLE distressed_cargo_listings ADD COLUMN condition TEXT;
ALTER TABLE distressed_cargo_listings ADD COLUMN current_location TEXT;
ALTER TABLE distressed_cargo_listings ADD COLUMN exporter_tenant_id TEXT;
ALTER TABLE distressed_cargo_listings ADD COLUMN pallet_ids TEXT DEFAULT '[]';
ALTER TABLE distressed_cargo_listings ADD COLUMN price_currency TEXT DEFAULT 'USD';
ALTER TABLE distressed_cargo_listings ADD COLUMN unit TEXT;
ALTER TABLE distressed_cargo_offers ADD COLUMN created_at TEXT;
ALTER TABLE distressed_cargo_offers ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE distressed_cargo_offers ADD COLUMN message TEXT;
ALTER TABLE distressed_cargo_offers ADD COLUMN offer_amount REAL;
ALTER TABLE documents ADD COLUMN ai_validation_result TEXT;
ALTER TABLE documents ADD COLUMN ai_validation_status TEXT;
ALTER TABLE documents ADD COLUMN document_type TEXT;
ALTER TABLE documents ADD COLUMN filename TEXT;
ALTER TABLE documents ADD COLUMN governor_decision_id TEXT;
ALTER TABLE documents ADD COLUMN requirement_id TEXT;
ALTER TABLE documents ADD COLUMN sha256_hash TEXT;
ALTER TABLE documents ADD COLUMN shipment_ustn TEXT;
ALTER TABLE documents ADD COLUMN storage_path TEXT;
ALTER TABLE documents ADD COLUMN tenant_id TEXT;
ALTER TABLE documents ADD COLUMN trade_request_id TEXT;
ALTER TABLE documents ADD COLUMN uploaded_at TEXT;
ALTER TABLE documents ADD COLUMN uploaded_by TEXT;
ALTER TABLE documents ADD COLUMN verification_status TEXT;
ALTER TABLE employee_permissions ADD COLUMN grant_type TEXT CHECK(grant_type IN ('ALLOW','DENY'));
ALTER TABLE employee_permissions ADD COLUMN granted_at TEXT;
ALTER TABLE employee_permissions ADD COLUMN trader_mode_context TEXT;
ALTER TABLE employees ADD COLUMN invitation_expires_at TEXT;
ALTER TABLE employees ADD COLUMN invitation_token TEXT;
ALTER TABLE evidence_packages ADD COLUMN ai_summary TEXT;
ALTER TABLE evidence_packages ADD COLUMN auto_compiled TEXT;
ALTER TABLE evidence_packages ADD COLUMN compiled_by TEXT DEFAULT 'AI_EVIDENCE_COMPILER';
ALTER TABLE evidence_packages ADD COLUMN item_count TEXT;
ALTER TABLE evidence_packages ADD COLUMN ustn TEXT;
ALTER TABLE exporter_quotes ADD COLUMN exw_deviation_pct REAL;
ALTER TABLE exporter_quotes ADD COLUMN exw_justification TEXT;
ALTER TABLE exporter_quotes ADD COLUMN loading_country TEXT;
ALTER TABLE exporter_quotes ADD COLUMN loading_port TEXT;
ALTER TABLE exporter_quotes ADD COLUMN port_of_loading TEXT;
ALTER TABLE exporter_quotes ADD COLUMN recommended_destinations TEXT;
ALTER TABLE exporter_quotes ADD COLUMN updated_at TEXT;
ALTER TABLE financier_preferences ADD COLUMN auto_rfq_enabled TEXT;
ALTER TABLE financier_preferences ADD COLUMN confidentiality_signed TEXT;
ALTER TABLE financier_preferences ADD COLUMN confidentiality_signed_at TEXT;
ALTER TABLE financier_preferences ADD COLUMN created_at TEXT;
ALTER TABLE financier_preferences ADD COLUMN excluded_hs_codes TEXT;
ALTER TABLE financier_preferences ADD COLUMN geographic_restrictions TEXT;
ALTER TABLE financier_preferences ADD COLUMN id TEXT;
ALTER TABLE financier_preferences ADD COLUMN max_tenor_days TEXT;
ALTER TABLE financier_preferences ADD COLUMN min_apr TEXT;
ALTER TABLE financier_preferences ADD COLUMN min_trust_score TEXT;
ALTER TABLE financing_agreements ADD COLUMN collateral_terms TEXT;
ALTER TABLE financing_agreements ADD COLUMN cryptographic_hash TEXT;
ALTER TABLE financing_agreements ADD COLUMN disbursement_status TEXT DEFAULT 'PENDING';
ALTER TABLE financing_agreements ADD COLUMN financing_fee_amount REAL;
ALTER TABLE financing_agreements ADD COLUMN financing_fee_rate REAL DEFAULT 0.0025;
ALTER TABLE financing_agreements ADD COLUMN financing_offer_id TEXT;
ALTER TABLE financing_agreements ADD COLUMN net_disbursed REAL;
ALTER TABLE financing_agreements ADD COLUMN repayment_schedule TEXT;
ALTER TABLE financing_agreements ADD COLUMN sgtx_witness_signature TEXT;
ALTER TABLE financing_agreements ADD COLUMN winning_offer_id TEXT;
ALTER TABLE financing_agreements ADD COLUMN witness_clause_hash TEXT;
ALTER TABLE financing_offers ADD COLUMN all_in_cost REAL;
ALTER TABLE financing_offers ADD COLUMN amount REAL;
ALTER TABLE financing_offers ADD COLUMN co_finance_pct REAL;
ALTER TABLE financing_offers ADD COLUMN collateral_details TEXT;
ALTER TABLE financing_offers ADD COLUMN collateral_required TEXT;
ALTER TABLE financing_offers ADD COLUMN conditions TEXT DEFAULT '{}';
ALTER TABLE financing_offers ADD COLUMN created_at TEXT;
ALTER TABLE financing_offers ADD COLUMN effective_apr REAL;
ALTER TABLE financing_offers ADD COLUMN interest_rate REAL;
ALTER TABLE financing_offers ADD COLUMN tenor_days INTEGER;
ALTER TABLE financing_requests ADD COLUMN ai_credit_score REAL;
ALTER TABLE financing_requests ADD COLUMN ai_default_probability REAL;
ALTER TABLE financing_requests ADD COLUMN ai_max_ltv REAL;
ALTER TABLE financing_requests ADD COLUMN collateral TEXT;
ALTER TABLE financing_requests ADD COLUMN collateral_type TEXT DEFAULT 'GOODS';
ALTER TABLE financing_requests ADD COLUMN contract_id TEXT;
ALTER TABLE financing_requests ADD COLUMN monte_carlo_default_prob REAL;
ALTER TABLE financing_requests ADD COLUMN preferred_currency TEXT DEFAULT 'USD';
ALTER TABLE financing_requests ADD COLUMN requested_amount REAL;
ALTER TABLE financing_requests ADD COLUMN shipment_id TEXT;
ALTER TABLE financing_requests ADD COLUMN special_instructions TEXT;
ALTER TABLE financing_requests ADD COLUMN trade_value REAL;
ALTER TABLE governor_decisions ADD COLUMN actor_employee_id TEXT;
ALTER TABLE governor_decisions ADD COLUMN ai_authority_level TEXT DEFAULT 'A4';
ALTER TABLE governor_decisions ADD COLUMN ai_provider_fallback INTEGER DEFAULT 0;
ALTER TABLE governor_decisions ADD COLUMN ai_provider_used TEXT;
ALTER TABLE governor_decisions ADD COLUMN conditions TEXT;
ALTER TABLE governor_decisions ADD COLUMN confidence REAL;
ALTER TABLE governor_decisions ADD COLUMN decision_panel_data TEXT;
ALTER TABLE governor_decisions ADD COLUMN explainability TEXT;
ALTER TABLE governor_decisions ADD COLUMN plain_language_explanation TEXT;
ALTER TABLE governor_decisions ADD COLUMN policy_version TEXT;
ALTER TABLE governor_decisions ADD COLUMN previous_decision_hash TEXT;
ALTER TABLE governor_decisions ADD COLUMN rule_refs TEXT;
ALTER TABLE inspection_logs ADD COLUMN ai_analysis TEXT;
ALTER TABLE inspection_logs ADD COLUMN content TEXT;
ALTER TABLE inspection_logs ADD COLUMN data TEXT;
ALTER TABLE inspection_logs ADD COLUMN inspector_employee_id TEXT;
ALTER TABLE inspection_logs ADD COLUMN inspector_id TEXT;
ALTER TABLE inspection_logs ADD COLUMN job_id TEXT;
ALTER TABLE inspection_logs ADD COLUMN log_type TEXT;
ALTER TABLE inspection_logs ADD COLUMN recorded_at TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN connector_type TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN direction TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN executed_at TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN government_tenant_id TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN payload TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN response TEXT;
ALTER TABLE integration_connector_logs ADD COLUMN status TEXT;
ALTER TABLE micro_contracts ADD COLUMN buyer_tenant_id TEXT;
ALTER TABLE micro_contracts ADD COLUMN country_factor REAL DEFAULT 1.0;
ALTER TABLE micro_contracts ADD COLUMN seller_tenant_id TEXT;
ALTER TABLE micro_contracts ADD COLUMN terms TEXT;
ALTER TABLE packing_plans ADD COLUMN ai_recommendation TEXT;
ALTER TABLE packing_plans ADD COLUMN container_type TEXT;
ALTER TABLE packing_plans ADD COLUMN exporter_quote_id TEXT;
ALTER TABLE packing_plans ADD COLUMN pallet_details TEXT;
ALTER TABLE packing_plans ADD COLUMN status TEXT;
ALTER TABLE packing_plans ADD COLUMN total_pallets INTEGER;
ALTER TABLE packing_plans ADD COLUMN total_weight_kg REAL DEFAULT 0;
ALTER TABLE packing_plans ADD COLUMN trade_request_id TEXT;
ALTER TABLE packing_plans ADD COLUMN utilization_pct REAL;
ALTER TABLE packing_plans ADD COLUMN visual_layout TEXT;
ALTER TABLE packing_plans ADD COLUMN volume_cbm REAL;
ALTER TABLE packing_plans ADD COLUMN weight_kg REAL;
ALTER TABLE pallet_details ADD COLUMN carton_count INTEGER;
ALTER TABLE pallet_details ADD COLUMN commodity_description TEXT;
ALTER TABLE pallet_details ADD COLUMN dimensions_cm TEXT;
ALTER TABLE pallet_details ADD COLUMN hs_code TEXT;
ALTER TABLE pallet_details ADD COLUMN net_weight_kg REAL;
ALTER TABLE pallet_details ADD COLUMN pallet_number INTEGER;
ALTER TABLE partner_api_keys ADD COLUMN expires_at TEXT;
ALTER TABLE partner_api_keys ADD COLUMN ip_whitelist TEXT;
ALTER TABLE partner_api_keys ADD COLUMN is_active TEXT;
ALTER TABLE partner_api_keys ADD COLUMN key_prefix TEXT;
ALTER TABLE partner_api_keys ADD COLUMN marketplace_partner_id TEXT;
ALTER TABLE partner_api_keys ADD COLUMN rate_limit_per_hour TEXT;
ALTER TABLE partner_webhooks ADD COLUMN is_active TEXT;
ALTER TABLE partner_webhooks ADD COLUMN marketplace_partner_id TEXT;
ALTER TABLE partner_webhooks ADD COLUMN secret_hash TEXT;
ALTER TABLE payment_attempts ADD COLUMN aggregator_id TEXT;
ALTER TABLE payment_attempts ADD COLUMN amount_local REAL;
ALTER TABLE payment_attempts ADD COLUMN amount_usd REAL;
ALTER TABLE payment_attempts ADD COLUMN buyer_country TEXT;
ALTER TABLE payment_attempts ADD COLUMN commission_amount_usd REAL;
ALTER TABLE payment_attempts ADD COLUMN currency_local TEXT;
ALTER TABLE payment_attempts ADD COLUMN exporter_amount REAL;
ALTER TABLE payment_attempts ADD COLUMN fx_rate REAL;
ALTER TABLE payment_attempts ADD COLUMN gross_amount REAL;
ALTER TABLE payment_attempts ADD COLUMN net_amount REAL;
ALTER TABLE payment_attempts ADD COLUMN payment_method TEXT;
ALTER TABLE payment_attempts ADD COLUMN psp_fee_usd TEXT;
ALTER TABLE provider_quotes ADD COLUMN created_at TEXT;
ALTER TABLE provider_quotes ADD COLUMN currency TEXT;
ALTER TABLE provider_quotes ADD COLUMN destination_port TEXT;
ALTER TABLE provider_quotes ADD COLUMN origin_port TEXT;
ALTER TABLE provider_quotes ADD COLUMN price TEXT;
ALTER TABLE provider_quotes ADD COLUMN provider_tenant_id TEXT;
ALTER TABLE provider_quotes ADD COLUMN service_type TEXT;
ALTER TABLE provider_quotes ADD COLUMN trade_request_id TEXT;
ALTER TABLE provider_quotes ADD COLUMN transit_days TEXT;
ALTER TABLE qc_jobs ADD COLUMN assigned_at TEXT;
ALTER TABLE qc_jobs ADD COLUMN exporter_tenant_id TEXT;
ALTER TABLE qc_jobs ADD COLUMN governor_decision_id TEXT;
ALTER TABLE qc_jobs ADD COLUMN inspection_points TEXT;
ALTER TABLE qc_jobs ADD COLUMN inspection_type TEXT DEFAULT 'PRE_SHIPMENT';
ALTER TABLE qc_jobs ADD COLUMN qc_provider_tenant_id TEXT;
ALTER TABLE qc_jobs ADD COLUMN quality_specs TEXT;
ALTER TABLE qc_jobs ADD COLUMN shipment_ustn TEXT;
ALTER TABLE qc_jobs ADD COLUMN trade_request_id TEXT;
ALTER TABLE secondary_market_listings ADD COLUMN ai_suggested_price REAL;
ALTER TABLE secondary_market_listings ADD COLUMN face_value REAL;
ALTER TABLE secondary_market_listings ADD COLUMN financing_agreement_id TEXT;
ALTER TABLE secondary_market_listings ADD COLUMN token_address TEXT;
ALTER TABLE settlement_instructions ADD COLUMN amount REAL DEFAULT 0;
ALTER TABLE settlement_instructions ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE settlement_instructions ADD COLUMN loom_hash TEXT;
ALTER TABLE settlement_instructions ADD COLUMN payee_tenant_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN payer_tenant_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN payment_rail TEXT;
ALTER TABLE settlement_instructions ADD COLUMN remittance_info TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN barcode_value TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN created_at TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN generated_by TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN governor_decision_id TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN hs_code TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN location TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN lot_number TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN pallet_id TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN scanned_at TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN scanned_by TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN shipment_id TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN ustn TEXT;
ALTER TABLE shipment_milestones ADD COLUMN evidence TEXT;
ALTER TABLE shipment_milestones ADD COLUMN evidence_hash TEXT;
ALTER TABLE shipment_milestones ADD COLUMN location TEXT;
ALTER TABLE shipment_milestones ADD COLUMN milestone_type TEXT;
ALTER TABLE shipment_milestones ADD COLUMN shipment_ustn TEXT;
ALTER TABLE shipments ADD COLUMN booking_number TEXT;
ALTER TABLE shipments ADD COLUMN contract_sequence_number INTEGER DEFAULT 1;
ALTER TABLE shipments ADD COLUMN governor_decision_id TEXT;
ALTER TABLE shipments ADD COLUMN imo_number TEXT;
ALTER TABLE shipments ADD COLUMN loading_date TEXT;
ALTER TABLE shipments ADD COLUMN loading_time_slot TEXT;
ALTER TABLE shipments ADD COLUMN transport_legs TEXT;
ALTER TABLE signature_sequences ADD COLUMN role TEXT;
ALTER TABLE signature_sequences ADD COLUMN signature_hash TEXT;
ALTER TABLE signature_sequences ADD COLUMN signed_at TEXT;
ALTER TABLE signature_sequences ADD COLUMN signer_gtid TEXT;
ALTER TABLE tenant_data_exports ADD COLUMN date_range TEXT;
ALTER TABLE tenant_data_exports ADD COLUMN requested_at TEXT;
ALTER TABLE tenant_data_exports ADD COLUMN requested_by TEXT;
ALTER TABLE tenant_onboarding_state ADD COLUMN completed INTEGER DEFAULT 0;
ALTER TABLE tenant_onboarding_state ADD COLUMN draft_expires_at TEXT;
ALTER TABLE tenants ADD COLUMN logistics_subrole TEXT;
ALTER TABLE trade_container_commodities ADD COLUMN dynamic_specification TEXT;
ALTER TABLE trade_container_commodities ADD COLUMN gross_weight_per_unit REAL;
ALTER TABLE trade_container_commodities ADD COLUMN net_weight_per_unit REAL;
ALTER TABLE trade_container_commodities ADD COLUMN packaging_description TEXT;
ALTER TABLE trade_container_commodities ADD COLUMN quantity_type TEXT DEFAULT 'WEIGHT';
ALTER TABLE trade_container_commodities ADD COLUMN spec_confidence TEXT;
ALTER TABLE trade_container_commodities ADD COLUMN tare_weight_per_unit REAL DEFAULT 0;
ALTER TABLE trade_container_commodities ADD COLUMN total_gross_weight REAL;
ALTER TABLE trade_container_commodities ADD COLUMN total_net_weight REAL;
ALTER TABLE trade_container_commodities ADD COLUMN total_units INTEGER;
ALTER TABLE trade_container_commodities ADD COLUMN weight_unit TEXT DEFAULT 'KG';
ALTER TABLE trade_containers ADD COLUMN clone_generation TEXT;
ALTER TABLE trade_containers ADD COLUMN clone_source_id TEXT;
ALTER TABLE trade_containers ADD COLUMN destination_override TEXT;
ALTER TABLE trade_containers ADD COLUMN port_of_discharge_unlocode TEXT;
ALTER TABLE trade_containers ADD COLUMN port_of_loading_unlocode TEXT;
ALTER TABLE trade_containers ADD COLUMN transport_mode TEXT DEFAULT 'SEA_CARGO';
ALTER TABLE trade_requests ADD COLUMN assigned_exporter_id TEXT;
ALTER TABLE trade_requests ADD COLUMN draft_data TEXT;
ALTER TABLE trade_requests ADD COLUMN draft_expires_at TEXT;
ALTER TABLE trade_requests ADD COLUMN exporter_tenant_id TEXT;
ALTER TABLE trade_requests ADD COLUMN governor_decision_id TEXT;
ALTER TABLE trade_requests ADD COLUMN importer_tenant_id TEXT;
ALTER TABLE trade_requests ADD COLUMN seller_company_name TEXT;
ALTER TABLE trade_requests ADD COLUMN seller_gtid TEXT;
ALTER TABLE trade_requests ADD COLUMN specifications TEXT;
ALTER TABLE trade_requests ADD COLUMN transport_mode TEXT DEFAULT 'SEA_CARGO';
ALTER TABLE trader_mode_sessions ADD COLUMN started_at TEXT;
ALTER TABLE trust_scores ADD COLUMN buy_mode_score TEXT;
ALTER TABLE trust_scores ADD COLUMN components TEXT;
ALTER TABLE trust_scores ADD COLUMN gtid TEXT;
ALTER TABLE trust_scores ADD COLUMN model_version TEXT;
ALTER TABLE trust_scores ADD COLUMN sell_mode_score REAL;
ALTER TABLE trust_scores ADD COLUMN updated_at TEXT;

-- Synthesized tables (no historical DDL; columns from code INSERTs)
CREATE TABLE IF NOT EXISTS barcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ustn TEXT,
  barcode_type TEXT,
  barcode_value TEXT,
  printed TEXT,
  metadata TEXT,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS contract_negotiations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_request_id INTEGER,
  initiated_by TEXT,
  negotiation_type TEXT,
  proposed_terms TEXT,
  reason TEXT,
  status TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS gov_compliance_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_request_id INTEGER,
  ustn TEXT,
  rule_id INTEGER,
  tenant_id INTEGER,
  check_result TEXT,
  details TEXT,
  remediation TEXT,
  checked_by TEXT
);

CREATE TABLE IF NOT EXISTS gov_permits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS lab_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS logistics_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS partner_revenue_disputes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marketplace_partner_id INTEGER,
  lead_attribution_id INTEGER,
  trade_ustn TEXT,
  disputed_amount REAL,
  reason TEXT,
  ai_recommendation TEXT,
  status TEXT,
  governor_decision_id INTEGER,
  filed_at DATETIME
);

CREATE TABLE IF NOT EXISTS smart_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER,
  type TEXT,
  title TEXT,
  body TEXT,
  priority TEXT,
  status TEXT,
  reference_id INTEGER,
  created_at DATETIME
);

CREATE TABLE IF NOT EXISTS trade_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_request_id INTEGER,
  ustn TEXT,
  document_type TEXT,
  document_number TEXT,
  status TEXT,
  uploaded_by TEXT,
  file_url TEXT,
  file_hash TEXT,
  created_at DATETIME
);


-- Pass 2: residual column gaps
ALTER TABLE ai_inference_records ADD COLUMN agent_id INTEGER;
ALTER TABLE ai_inference_records ADD COLUMN cost_usd REAL;
ALTER TABLE ai_inference_records ADD COLUMN decision_type TEXT;
ALTER TABLE ai_inference_records ADD COLUMN fallback_provider TEXT;
ALTER TABLE ai_inference_records ADD COLUMN fallback_used TEXT;
ALTER TABLE ai_inference_records ADD COLUMN governor_decision_id INTEGER;
ALTER TABLE ai_inference_records ADD COLUMN input_summary TEXT;
ALTER TABLE ai_inference_records ADD COLUMN latency_ms REAL;
ALTER TABLE ai_inference_records ADD COLUMN model_name TEXT;
ALTER TABLE ai_inference_records ADD COLUMN model_provider TEXT;
ALTER TABLE ai_inference_records ADD COLUMN output_summary TEXT;
ALTER TABLE ai_inference_records ADD COLUMN request_context TEXT;
ALTER TABLE ai_inference_records ADD COLUMN tokens_used TEXT;
ALTER TABLE auto_reconciliation_results ADD COLUMN expected_amount REAL;
ALTER TABLE auto_reconciliation_results ADD COLUMN payment_attempt_id INTEGER;
ALTER TABLE auto_reconciliation_results ADD COLUMN received_amount REAL;
ALTER TABLE auto_reconciliation_results ADD COLUMN reconciled_by TEXT;
ALTER TABLE auto_reconciliation_results ADD COLUMN result_status TEXT;
ALTER TABLE auto_reconciliation_results ADD COLUMN variance TEXT;
ALTER TABLE auto_reconciliation_results ADD COLUMN variance_pct REAL;
ALTER TABLE blockchain_verifications ADD COLUMN block_number TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN chain TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN created_at DATETIME;
ALTER TABLE blockchain_verifications ADD COLUMN data_hash TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN entity_id INTEGER;
ALTER TABLE blockchain_verifications ADD COLUMN entity_type TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN status TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN tx_hash TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN verification_type TEXT;
ALTER TABLE carbon_calculations ADD COLUMN co2_tons TEXT;
ALTER TABLE carbon_calculations ADD COLUMN distance_km TEXT;
ALTER TABLE carbon_calculations ADD COLUMN emission_factor TEXT;
ALTER TABLE carbon_calculations ADD COLUMN offset_available INTEGER DEFAULT 0;
ALTER TABLE carbon_calculations ADD COLUMN weight_tons TEXT;
ALTER TABLE carrier_performance_profiles ADD COLUMN carrier_id INTEGER;
ALTER TABLE carrier_performance_profiles ADD COLUMN esg_score REAL;
ALTER TABLE carrier_performance_profiles ADD COLUMN last_risk_update TEXT;
ALTER TABLE carrier_performance_profiles ADD COLUMN on_time_pct REAL;
ALTER TABLE commission_lock_events ADD COLUMN commission_lock_id INTEGER;
ALTER TABLE commission_lock_events ADD COLUMN event_data TEXT;
ALTER TABLE commodity_market_prices ADD COLUMN confidence TEXT;
ALTER TABLE commodity_market_prices ADD COLUMN price_date REAL;
ALTER TABLE commodity_market_prices ADD COLUMN price_usd_per_kg REAL;
ALTER TABLE commodity_profit_margins ADD COLUMN valid_from TEXT;
ALTER TABLE commodity_profit_margins ADD COLUMN valid_until TEXT;
ALTER TABLE container_loading_plans ADD COLUMN ar_visualization_data TEXT;
ALTER TABLE container_loading_plans ADD COLUMN governor_decision_id INTEGER;
ALTER TABLE container_loading_plans ADD COLUMN loading_instructions TEXT;
ALTER TABLE container_loading_plans ADD COLUMN max_payload_kg REAL;
ALTER TABLE container_loading_plans ADD COLUMN pallet_sequence TEXT;
ALTER TABLE container_loading_plans ADD COLUMN seal_number TEXT;
ALTER TABLE container_loading_plans ADD COLUMN utilized_volume_pct REAL;
ALTER TABLE credit_assessments ADD COLUMN assessment_type TEXT;
ALTER TABLE credit_assessments ADD COLUMN behavioral_score REAL;
ALTER TABLE credit_assessments ADD COLUMN corporate_risk_score REAL;
ALTER TABLE credit_assessments ADD COLUMN default_probability TEXT;
ALTER TABLE credit_assessments ADD COLUMN entity_gtid TEXT;
ALTER TABLE credit_assessments ADD COLUMN entity_name TEXT;
ALTER TABLE credit_assessments ADD COLUMN feature_importance TEXT;
ALTER TABLE credit_assessments ADD COLUMN macro_economic_score REAL;
ALTER TABLE credit_assessments ADD COLUMN market_health_score REAL;
ALTER TABLE credit_assessments ADD COLUMN model_version TEXT;
ALTER TABLE credit_assessments ADD COLUMN overall_score REAL;
ALTER TABLE credit_assessments ADD COLUMN recommended_limit_usd TEXT;
ALTER TABLE credit_assessments ADD COLUMN shipment_score REAL;
ALTER TABLE credit_assessments ADD COLUMN trade_performance_score REAL;
ALTER TABLE dispute_recommendations ADD COLUMN evidence_package TEXT;
ALTER TABLE dispute_recommendations ADD COLUMN recommendation_type TEXT;
ALTER TABLE distressed_outreach_notifications ADD COLUMN co_branded INTEGER DEFAULT 0;
ALTER TABLE distressed_outreach_notifications ADD COLUMN distressed_ustn TEXT;
ALTER TABLE distressed_outreach_notifications ADD COLUMN message_template TEXT;
ALTER TABLE distressed_outreach_notifications ADD COLUMN privacy_notice_accepted TEXT;
ALTER TABLE distressed_outreach_notifications ADD COLUMN status TEXT;
ALTER TABLE exporter_quote_alternatives ADD COLUMN additional_logistics_cost REAL;
ALTER TABLE exporter_quote_alternatives ADD COLUMN additional_logistics_currency TEXT;
ALTER TABLE exporter_quote_alternatives ADD COLUMN transit_days TEXT;
ALTER TABLE fee_calculations ADD COLUMN base_rate REAL;
ALTER TABLE fee_calculations ADD COLUMN buyer_country TEXT;
ALTER TABLE fee_calculations ADD COLUMN commodity_hs6 TEXT;
ALTER TABLE fee_calculations ADD COLUMN country_adjustment TEXT;
ALTER TABLE fee_calculations ADD COLUMN created_at DATETIME;
ALTER TABLE fee_calculations ADD COLUMN exporter_quote_id INTEGER;
ALTER TABLE fee_calculations ADD COLUMN exporter_tenant_id INTEGER;
ALTER TABLE fee_calculations ADD COLUMN fee_amount REAL;
ALTER TABLE fee_calculations ADD COLUMN final_rate REAL;
ALTER TABLE fee_calculations ADD COLUMN geopolitics_adjustment TEXT;
ALTER TABLE fee_calculations ADD COLUMN model_version TEXT;
ALTER TABLE fee_calculations ADD COLUMN net_fee TEXT;
ALTER TABLE fee_calculations ADD COLUMN perishability_adjustment TEXT;
ALTER TABLE fee_calculations ADD COLUMN safety_buffer_pct REAL;
ALTER TABLE fee_calculations ADD COLUMN seasonality_adjustment TEXT;
ALTER TABLE fee_calculations ADD COLUMN seller_country TEXT;
ALTER TABLE fee_calculations ADD COLUMN trade_request_id INTEGER;
ALTER TABLE fee_calculations ADD COLUMN trade_value REAL;
ALTER TABLE fee_calculations ADD COLUMN volume_discount TEXT;
ALTER TABLE fx_conversion_paths ADD COLUMN from_currency TEXT;
ALTER TABLE fx_conversion_paths ADD COLUMN recommended INTEGER DEFAULT 0;
ALTER TABLE fx_conversion_paths ADD COLUMN to_currency TEXT;
ALTER TABLE fx_conversion_paths ADD COLUMN total_cost_pct REAL;
ALTER TABLE fx_rate_cache ADD COLUMN from_currency TEXT;
ALTER TABLE fx_rate_cache ADD COLUMN to_currency TEXT;
ALTER TABLE fx_rate_cache ADD COLUMN volatility_24h TEXT;
ALTER TABLE geocoded_locations ADD COLUMN address TEXT;
ALTER TABLE geocoded_locations ADD COLUMN capacity_info TEXT;
ALTER TABLE geocoded_locations ADD COLUMN country_code TEXT;
ALTER TABLE geocoded_locations ADD COLUMN created_at DATETIME;
ALTER TABLE geocoded_locations ADD COLUMN location_type TEXT;
ALTER TABLE geocoded_locations ADD COLUMN name TEXT;
ALTER TABLE geocoded_locations ADD COLUMN operating_hours TEXT;
ALTER TABLE geocoded_locations ADD COLUMN port_code TEXT;
ALTER TABLE inspections ADD COLUMN ai_recommendation TEXT;
ALTER TABLE inspections ADD COLUMN commodity_hs_code TEXT;
ALTER TABLE inspections ADD COLUMN contract_id INTEGER;
ALTER TABLE inspections ADD COLUMN inspector_employee_id INTEGER;
ALTER TABLE inspections ADD COLUMN location TEXT;
ALTER TABLE inspections ADD COLUMN qc_tenant_id INTEGER;
ALTER TABLE inspections ADD COLUMN requested_by TEXT;
ALTER TABLE inspections ADD COLUMN sampling_protocol TEXT;
ALTER TABLE inspections ADD COLUMN scheduled_date DATETIME;
ALTER TABLE inspections ADD COLUMN shipment_id INTEGER;
ALTER TABLE inspections ADD COLUMN trade_request_id INTEGER;
ALTER TABLE iot_sensor_readings ADD COLUMN anomaly_flag TEXT;
ALTER TABLE kyc_verifications ADD COLUMN ai_confidence TEXT;
ALTER TABLE kyc_verifications ADD COLUMN document_type TEXT;
ALTER TABLE kyc_verifications ADD COLUMN verification_result TEXT;
ALTER TABLE kyc_verifications ADD COLUMN verified_at DATETIME;
ALTER TABLE logistics_rfq_responses ADD COLUMN provider_id INTEGER;
ALTER TABLE logistics_rfq_responses ADD COLUMN provider_name TEXT;
ALTER TABLE marketplace_partners ADD COLUMN agreement_effective_date DATETIME;
ALTER TABLE marketplace_partners ADD COLUMN api_key_created_at DATETIME;
ALTER TABLE marketplace_partners ADD COLUMN api_key_encrypted TEXT;
ALTER TABLE marketplace_partners ADD COLUMN contact_email TEXT;
ALTER TABLE marketplace_partners ADD COLUMN country TEXT;
ALTER TABLE marketplace_partners ADD COLUMN created_at DATETIME;
ALTER TABLE marketplace_partners ADD COLUMN ip_whitelist TEXT;
ALTER TABLE marketplace_partners ADD COLUMN partner_type TEXT;
ALTER TABLE marketplace_partners ADD COLUMN revenue_share_pct REAL;
ALTER TABLE marketplace_partners ADD COLUMN sandbox_enabled TEXT;
ALTER TABLE marketplace_partners ADD COLUMN status TEXT;
ALTER TABLE marketplace_partners ADD COLUMN tenant_id INTEGER;
ALTER TABLE marketplace_partners ADD COLUMN webhook_endpoints TEXT;
ALTER TABLE model_drift_records ADD COLUMN agent_id INTEGER;
ALTER TABLE model_drift_records ADD COLUMN baseline_metrics TEXT;
ALTER TABLE model_drift_records ADD COLUMN created_at DATETIME;
ALTER TABLE model_drift_records ADD COLUMN current_metrics TEXT;
ALTER TABLE model_drift_records ADD COLUMN drift_type TEXT;
ALTER TABLE model_drift_records ADD COLUMN governor_decision_id INTEGER;
ALTER TABLE model_drift_records ADD COLUMN model_version_id INTEGER;
ALTER TABLE model_drift_records ADD COLUMN recommendation TEXT;
ALTER TABLE negotiation_bot_configs ADD COLUMN commission_split_preference TEXT;
ALTER TABLE negotiation_bot_configs ADD COLUMN max_price REAL;
ALTER TABLE negotiation_bot_configs ADD COLUMN min_price REAL;
ALTER TABLE negotiation_bot_configs ADD COLUMN strategy REAL;
ALTER TABLE negotiation_bot_configs ADD COLUMN trade_request_id INTEGER;
ALTER TABLE opa_policy_log ADD COLUMN change_type TEXT;
ALTER TABLE opa_policy_log ADD COLUMN changed_by TEXT;
ALTER TABLE opa_policy_log ADD COLUMN compiled_wasm TEXT;
ALTER TABLE opa_policy_log ADD COLUMN governor_decision_id INTEGER;
ALTER TABLE opa_policy_log ADD COLUMN policy_content TEXT;
ALTER TABLE opa_policy_log ADD COLUMN status TEXT;
ALTER TABLE opa_policy_log ADD COLUMN version TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN attribution_date DATETIME;
ALTER TABLE partner_lead_attributions ADD COLUMN buyer_tenant_id INTEGER;
ALTER TABLE partner_lead_attributions ADD COLUMN destination_country TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN origin_country TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN parsed_specs TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN partner_commission_pct REAL;
ALTER TABLE partner_lead_attributions ADD COLUMN raw_intent_text TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN seller_tenant_id INTEGER;
ALTER TABLE partner_lead_attributions ADD COLUMN viability_score REAL;
ALTER TABLE payment_aggregators ADD COLUMN api_type TEXT;
ALTER TABLE payment_aggregators ADD COLUMN avg_settlement_hours TEXT;
ALTER TABLE payment_aggregators ADD COLUMN created_at DATETIME;
ALTER TABLE payment_aggregators ADD COLUMN fee_structure TEXT;
ALTER TABLE payment_aggregators ADD COLUMN onboarding_status TEXT;
ALTER TABLE payment_aggregators ADD COLUMN supported_methods TEXT;
ALTER TABLE policy_suggestions ADD COLUMN rationale TEXT;
ALTER TABLE policy_suggestions ADD COLUMN rego_diff TEXT;
ALTER TABLE policy_suggestions ADD COLUMN suggested_by TEXT;
ALTER TABLE policy_suggestions ADD COLUMN supporting_data TEXT;
ALTER TABLE predictive_health_metrics ADD COLUMN metric_name TEXT;
ALTER TABLE predictive_health_metrics ADD COLUMN predicted_status TEXT;
ALTER TABLE predictive_health_metrics ADD COLUMN prediction_confidence TEXT;
ALTER TABLE predictive_health_metrics ADD COLUMN time_horizon_hours TEXT;
ALTER TABLE psp_health_logs ADD COLUMN error_count TEXT;
ALTER TABLE psp_health_logs ADD COLUMN error_details TEXT;
ALTER TABLE seasonal_adjustments ADD COLUMN adjustment_pct REAL;
ALTER TABLE seasonal_adjustments ADD COLUMN commodity_category TEXT;
ALTER TABLE seasonal_adjustments ADD COLUMN valid_from_year TEXT;
ALTER TABLE seasonal_adjustments ADD COLUMN week_number TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN action_link TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN category TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN deadline TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN description TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN dismissed INTEGER DEFAULT 0;
ALTER TABLE smart_inbox_items ADD COLUMN item_id INTEGER;
ALTER TABLE smart_inbox_items ADD COLUMN priority_score REAL;
ALTER TABLE smart_inbox_items ADD COLUMN updated_at DATETIME;
ALTER TABLE smart_inbox_items ADD COLUMN ustn TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN days_stuck TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN detected_at DATETIME;
ALTER TABLE stuck_trade_recovery ADD COLUMN reason TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN resolution_status TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN sla_deadline TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN status TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN stuck_status TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN tenant_id INTEGER;
ALTER TABLE tenant_contacts ADD COLUMN auto_saved INTEGER DEFAULT 0;
ALTER TABLE tenant_contacts ADD COLUMN contact_tenant_id INTEGER;
ALTER TABLE tenant_contacts ADD COLUMN created_at DATETIME;
ALTER TABLE tenant_contacts ADD COLUMN id TEXT;
ALTER TABLE tenant_contacts ADD COLUMN notes TEXT;
ALTER TABLE tenant_contacts ADD COLUMN owner_tenant_id INTEGER;
ALTER TABLE tenant_contacts ADD COLUMN relationship_health_score REAL;
ALTER TABLE tenant_contacts ADD COLUMN smart_labels TEXT;
ALTER TABLE tenant_contacts ADD COLUMN tags TEXT;
ALTER TABLE tenant_contacts ADD COLUMN trust_snapshot TEXT;
ALTER TABLE tokenized_trade_assets ADD COLUMN chain TEXT;
ALTER TABLE tokenized_trade_assets ADD COLUMN contract_id INTEGER;
ALTER TABLE tokenized_trade_assets ADD COLUMN created_at DATETIME;
ALTER TABLE tokenized_trade_assets ADD COLUMN current_value REAL;
ALTER TABLE tokenized_trade_assets ADD COLUMN face_value REAL;
ALTER TABLE tokenized_trade_assets ADD COLUMN status TEXT;
ALTER TABLE tokenized_trade_assets ADD COLUMN token_type TEXT;
ALTER TABLE tokenized_trade_assets ADD COLUMN trade_request_id INTEGER;
ALTER TABLE trucking_gps_traces ADD COLUMN driver_id INTEGER;
ALTER TABLE trucking_gps_traces ADD COLUMN heading TEXT;
ALTER TABLE trucking_gps_traces ADD COLUMN latitude REAL;
ALTER TABLE trucking_gps_traces ADD COLUMN longitude REAL;
ALTER TABLE trucking_gps_traces ADD COLUMN recorded_at DATETIME;
ALTER TABLE trucking_gps_traces ADD COLUMN shipment_id INTEGER;
ALTER TABLE trucking_gps_traces ADD COLUMN speed_kmh TEXT;
ALTER TABLE trucking_gps_traces ADD COLUMN vehicle_id INTEGER;
ALTER TABLE webhook_delivery_logs ADD COLUMN delivered_at DATETIME;
ALTER TABLE webhook_delivery_logs ADD COLUMN response_time_ms REAL;
ALTER TABLE webhook_delivery_logs ADD COLUMN webhook_id INTEGER;

-- Pass 3: UPDATE-referenced columns
ALTER TABLE auth_sessions ADD COLUMN active_portal TEXT;
ALTER TABLE auth_sessions ADD COLUMN trader_mode TEXT;
ALTER TABLE contract_shipments ADD COLUMN commission_lock_id TEXT;
ALTER TABLE contract_shipments ADD COLUMN locked_at DATETIME;
ALTER TABLE contract_shipments ADD COLUMN mutual_confirmation_at DATETIME;
ALTER TABLE contract_shipments ADD COLUMN sgtx_fee_paid TEXT;
ALTER TABLE contracts ADD COLUMN commission_lock_id TEXT;
ALTER TABLE contracts ADD COLUMN importer_signature TEXT;
ALTER TABLE contracts ADD COLUMN mutual_confirmation_at DATETIME;
ALTER TABLE contracts ADD COLUMN mutual_confirmation_snapshot TEXT;
ALTER TABLE disputes ADD COLUMN arbitration_body TEXT;
ALTER TABLE disputes ADD COLUMN arbitration_status TEXT;
ALTER TABLE disputes ADD COLUMN evidence_package_id TEXT;
ALTER TABLE disputes ADD COLUMN resolution_path TEXT;
ALTER TABLE disputes ADD COLUMN triage_category TEXT;
ALTER TABLE disputes ADD COLUMN updated_at DATETIME;
ALTER TABLE documents ADD COLUMN digital_signature TEXT;
ALTER TABLE documents ADD COLUMN signed_at DATETIME;
ALTER TABLE documents ADD COLUMN signed_by TEXT;
ALTER TABLE employees ADD COLUMN approved_by TEXT;
ALTER TABLE employees ADD COLUMN operating_mode_override TEXT;
ALTER TABLE exporter_quotes ADD COLUMN alternative_ports TEXT;
ALTER TABLE exporter_quotes ADD COLUMN final_quoted_price REAL;
ALTER TABLE exporter_quotes ADD COLUMN logistics_breakdown TEXT;
ALTER TABLE exporter_quotes ADD COLUMN logistics_mode TEXT;
ALTER TABLE exporter_quotes ADD COLUMN logistics_total TEXT;
ALTER TABLE exporter_quotes ADD COLUMN multi_shipment_response TEXT;
ALTER TABLE exporter_quotes ADD COLUMN sgtx_fee_amount REAL;
ALTER TABLE exporter_quotes ADD COLUMN sgtx_fee_rate REAL;
ALTER TABLE exporter_quotes ADD COLUMN submitted_at DATETIME;
ALTER TABLE exporter_quotes ADD COLUMN total_trade_value TEXT;
ALTER TABLE financing_agreements ADD COLUMN borrower_signature_at DATETIME;
ALTER TABLE financing_agreements ADD COLUMN financier_signature_at DATETIME;
ALTER TABLE financing_agreements ADD COLUMN sgtx_signature_at DATETIME;
ALTER TABLE financing_agreements ADD COLUMN total_repaid TEXT;
ALTER TABLE financing_offers ADD COLUMN accepted_at DATETIME;
ALTER TABLE financing_offers ADD COLUMN rejected_reason TEXT;
ALTER TABLE financing_requests ADD COLUMN blended_apr TEXT;
ALTER TABLE financing_requests ADD COLUMN co_financing_enabled TEXT;
ALTER TABLE financing_requests ADD COLUMN rfq_broadcast_at DATETIME;
ALTER TABLE financing_requests ADD COLUMN rfq_matched_financiers TEXT;
ALTER TABLE financing_requests ADD COLUMN total_bid_amount REAL;
ALTER TABLE financing_requests ADD COLUMN updated_at DATETIME;
ALTER TABLE financing_requests ADD COLUMN winning_bid_id TEXT;
ALTER TABLE gov_permits ADD COLUMN approved_at DATETIME;
ALTER TABLE gov_permits ADD COLUMN auto_approved TEXT;
ALTER TABLE gov_permits ADD COLUMN conditions TEXT;
ALTER TABLE gov_permits ADD COLUMN issued_at DATETIME;
ALTER TABLE gov_permits ADD COLUMN issued_by TEXT;
ALTER TABLE gov_permits ADD COLUMN permit_number TEXT;
ALTER TABLE gov_permits ADD COLUMN reviewed_at DATETIME;
ALTER TABLE gov_permits ADD COLUMN reviewer_name TEXT;
ALTER TABLE gov_permits ADD COLUMN reviewer_notes TEXT;
ALTER TABLE gov_permits ADD COLUMN valid_until TEXT;
ALTER TABLE governor_decisions ADD COLUMN escalated_from TEXT;
ALTER TABLE governor_decisions ADD COLUMN escalation_reason TEXT;
ALTER TABLE inbox_items ADD COLUMN action_at DATETIME;
ALTER TABLE inbox_items ADD COLUMN action_taken TEXT;
ALTER TABLE inbox_items ADD COLUMN status TEXT;
ALTER TABLE inspections ADD COLUMN certificate_issued_at DATETIME;
ALTER TABLE inspections ADD COLUMN certificate_number TEXT;
ALTER TABLE inspections ADD COLUMN updated_at DATETIME;
ALTER TABLE logistics_rfq_responses ADD COLUMN cost_breakdown TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN notes TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN transit_days TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN updated_at DATETIME;
ALTER TABLE logistics_rfqs ADD COLUMN clarification_request TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN decline_reason TEXT;
ALTER TABLE marketplace_partners ADD COLUMN total_attributed_trades TEXT;
ALTER TABLE marketplace_partners ADD COLUMN total_commission_earned TEXT;
ALTER TABLE marketplace_partners ADD COLUMN total_leads TEXT;
ALTER TABLE packing_plans ADD COLUMN locked TEXT;
ALTER TABLE packing_plans ADD COLUMN locked_by TEXT;
ALTER TABLE packing_plans ADD COLUMN loom_hash TEXT;
ALTER TABLE partner_api_keys ADD COLUMN revoked_at DATETIME;
ALTER TABLE partner_lead_attributions ADD COLUMN resolution_notes TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN resolved_at DATETIME;
ALTER TABLE partner_revenue_disputes ADD COLUMN resolution TEXT;
ALTER TABLE partner_revenue_disputes ADD COLUMN resolved_at DATETIME;
ALTER TABLE payment_aggregators ADD COLUMN updated_at DATETIME;
ALTER TABLE payment_attempts ADD COLUMN psp_transaction_id TEXT;
ALTER TABLE payment_attempts ADD COLUMN settled_at DATETIME;
ALTER TABLE payment_attempts ADD COLUMN updated_at DATETIME;
ALTER TABLE platform_governance_proposals ADD COLUMN executed_at DATETIME;
ALTER TABLE platform_governance_proposals ADD COLUMN execution_result TEXT;
ALTER TABLE platform_governance_proposals ADD COLUMN rejected_by TEXT;
ALTER TABLE platform_governance_proposals ADD COLUMN rejection_reason TEXT;
ALTER TABLE policy_suggestions ADD COLUMN applied_at DATETIME;
ALTER TABLE policy_suggestions ADD COLUMN reviewed_by TEXT;
ALTER TABLE qc_jobs ADD COLUMN ai_defects TEXT;
ALTER TABLE qc_jobs ADD COLUMN report_data TEXT;
ALTER TABLE qc_jobs ADD COLUMN report_id TEXT;
ALTER TABLE secondary_market_listings ADD COLUMN buyer_tenant_id TEXT;
ALTER TABLE secondary_market_listings ADD COLUMN sold_at DATETIME;
ALTER TABLE settlement_confirmations ADD COLUMN reconciliation_confidence TEXT;
ALTER TABLE settlement_instructions ADD COLUMN approved_at DATETIME;
ALTER TABLE settlement_instructions ADD COLUMN executed_at DATETIME;
ALTER TABLE settlement_instructions ADD COLUMN fx_path TEXT;
ALTER TABLE settlement_instructions ADD COLUMN psp_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN reconciled_at DATETIME;
ALTER TABLE settlement_instructions ADD COLUMN reconciliation_status TEXT;
ALTER TABLE settlement_instructions ADD COLUMN voice_approved TEXT;
ALTER TABLE shipments ADD COLUMN current_milestone TEXT;
ALTER TABLE smart_inbox_items ADD COLUMN snoozed_until TEXT;
ALTER TABLE stuck_trade_recovery ADD COLUMN last_reminder_at DATETIME;
ALTER TABLE stuck_trade_recovery ADD COLUMN resolution_notes TEXT;
ALTER TABLE tenant_data_exports ADD COLUMN checksum TEXT;
ALTER TABLE tenant_data_exports ADD COLUMN completed_at DATETIME;
ALTER TABLE tenant_data_exports ADD COLUMN signature TEXT;
ALTER TABLE tenant_onboarding_state ADD COLUMN completed_at DATETIME;
ALTER TABLE tenant_onboarding_state ADD COLUMN draft_reminder_sent TEXT;
ALTER TABLE tenant_onboarding_state ADD COLUMN sandbox_data TEXT;
ALTER TABLE tenant_onboarding_state ADD COLUMN sandbox_reset_at DATETIME;
ALTER TABLE tokenized_trade_assets ADD COLUMN owner_tenant_id TEXT;
ALTER TABLE trade_documents ADD COLUMN signed_at DATETIME;
ALTER TABLE trade_documents ADD COLUMN signed_by TEXT;
ALTER TABLE trade_requests ADD COLUMN agent_session_id TEXT;
ALTER TABLE trade_requests ADD COLUMN express_mode_confidence TEXT;
ALTER TABLE trade_requests ADD COLUMN express_mode_raw_text TEXT;
ALTER TABLE trade_requests ADD COLUMN express_mode_used TEXT;
ALTER TABLE trade_requests ADD COLUMN quote_deadline TEXT;

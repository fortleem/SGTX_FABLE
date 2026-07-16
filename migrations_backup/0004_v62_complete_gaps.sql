-- ============================================================
-- SGTX v6.2 — Migration 0004: Complete Blueprint Gap Implementation
-- Adds ALL missing tables from Blueprint v6.2 PART 5 DDL
-- Plus portal upgrade tables (logistics, QC, drivers, etc.)
-- ============================================================

-- ═══ PORTAL UPGRADES (logistics, QC, drivers, performance) ═══

CREATE TABLE IF NOT EXISTS dispute_evidence (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id),
  evidence_type TEXT NOT NULL,
  description TEXT,
  file_reference TEXT,
  sha256_hash TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS logistics_performance (
  id TEXT PRIMARY KEY,
  logistics_tenant_id TEXT NOT NULL,
  period TEXT NOT NULL,
  shipments_completed INTEGER DEFAULT 0,
  on_time_delivery_rate REAL DEFAULT 0,
  damage_rate REAL DEFAULT 0,
  avg_transit_time_days REAL DEFAULT 0,
  customer_satisfaction REAL DEFAULT 0,
  esg_score REAL DEFAULT 0,
  carbon_per_teu REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_health (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'HEALTHY',
  response_time_ms INTEGER,
  error_rate REAL DEFAULT 0,
  cpu_usage REAL,
  memory_usage REAL,
  last_check_at TEXT DEFAULT (datetime('now')),
  details TEXT
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

-- ═══ PHASE 2: PACKING & CONTAINER LOADING ═══

CREATE TABLE IF NOT EXISTS pallet_details (
    id TEXT PRIMARY KEY,
    packing_plan_id TEXT,
    pallet_number INTEGER NOT NULL,
    commodity_description TEXT,
    hs_code TEXT,
    carton_count INTEGER,
    gross_weight_kg REAL,
    net_weight_kg REAL,
    dimensions_cm TEXT,
    barcode_sscc TEXT,
    special_handling TEXT,
    photos TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS container_loading_plans (
    id TEXT PRIMARY KEY,
    packing_plan_id TEXT,
    container_number TEXT,
    container_type TEXT DEFAULT '40HC_REEFER',
    seal_number TEXT,
    max_payload_kg REAL,
    utilized_volume_pct REAL,
    pallet_sequence TEXT NOT NULL,
    loading_instructions TEXT,
    ar_visualization_data TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ═══ PHASE 5: AUTONOMOUS OPERATIONS ═══

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

CREATE TABLE IF NOT EXISTS milestone_commission_triggers (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL,
    commission_lock_id TEXT,
    release_percentage REAL NOT NULL,
    source_verification_count INTEGER DEFAULT 0,
    triggered_at TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

-- ═══ VOICE TRANSCRIPTS ═══

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

-- ═══ SETTLEMENT ADVANCED ═══

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

CREATE TABLE IF NOT EXISTS value_streams (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL,
    stream_config TEXT NOT NULL,
    milestone_consensus REAL DEFAULT 1.0,
    status TEXT DEFAULT 'ACTIVE',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fx_optimization_paths (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT NOT NULL,
    currency_path TEXT NOT NULL,
    predicted_slippage REAL,
    actual_slippage REAL,
    savings_usd REAL,
    governor_decision_id TEXT,
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

CREATE TABLE IF NOT EXISTS commission_singularity_calculations (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL,
    base_rate REAL,
    adjustments TEXT,
    final_rate REAL,
    policy_bounds_check INTEGER DEFAULT 1,
    explanation TEXT,
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

-- ═══ PAYMENT VERIFICATION ═══

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

-- ═══ DISTRESSED CONTACT NOTIFICATIONS ═══

CREATE TABLE IF NOT EXISTS distressed_contact_notifications (
    id TEXT PRIMARY KEY,
    distressed_listing_id TEXT,
    distressed_ustn TEXT,
    recipient_gtid TEXT NOT NULL,
    recipient_name TEXT,
    message_hash TEXT,
    status TEXT DEFAULT 'SENT',
    sent_at TEXT DEFAULT (datetime('now'))
);

-- ═══ EVIDENCE PACKAGES ═══

CREATE TABLE IF NOT EXISTS evidence_packages (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    package TEXT NOT NULL,
    loom_hash TEXT NOT NULL,
    ai_summary TEXT,
    compiled_by TEXT DEFAULT 'AI_EVIDENCE_COMPILER',
    compiled_at TEXT DEFAULT (datetime('now'))
);

-- ═══ DIGITAL TWIN & PSP MONITORING ═══

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

CREATE TABLE IF NOT EXISTS psp_health_logs (
    id TEXT PRIMARY KEY,
    aggregator_id TEXT NOT NULL,
    health_score REAL,
    latency_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    checked_at TEXT DEFAULT (datetime('now'))
);

-- ═══ SECONDARY MARKET ═══

CREATE TABLE IF NOT EXISTS secondary_market_prices (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT NOT NULL,
    suggested_price REAL,
    rationale TEXT,
    buyer_gtid TEXT,
    status TEXT DEFAULT 'LISTED',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ═══ FINANCING ADVANCED ═══

CREATE TABLE IF NOT EXISTS commission_locks_phase4 (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT,
    commission_amount REAL,
    status TEXT DEFAULT 'ACTIVE',
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

-- ═══ REGULATORY COMPLIANCE ═══

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

CREATE TABLE IF NOT EXISTS jurisdiction_compliance (
    id TEXT PRIMARY KEY,
    jurisdiction_code TEXT NOT NULL,
    compliance_type TEXT NOT NULL,
    requirement_description TEXT,
    enforcement_date TEXT,
    penalty_description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ═══ CREDIT ASSESSMENTS (standalone — replaces v6.1 version) ═══
-- Already exists from 0003 if it had it, but CREATE IF NOT EXISTS is safe

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_pallet_details_plan ON pallet_details(packing_plan_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_employee ON voice_transcripts(employee_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_dispute ON evidence_packages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_ustn ON digital_twin_snapshots(ustn);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_tenant ON logistics_service_catalog(logistics_tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfq_status ON logistics_rfqs(status);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(logistics_tenant_id);

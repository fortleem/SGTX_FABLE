-- SGTX Platform v6.3 Full Blueprint Alignment Migration
-- Fixes missing columns causing 500 errors + adds v6.3 tables

-- ═══════════════════════════════════════════════════════════
-- FIX: Missing columns on existing tables (causing 500 errors)
-- ═══════════════════════════════════════════════════════════

-- Fix ai_inference_records (missing latency_ms)
ALTER TABLE ai_inference_records ADD COLUMN latency_ms INTEGER DEFAULT 0;
ALTER TABLE ai_inference_records ADD COLUMN tokens_used INTEGER DEFAULT 0;
ALTER TABLE ai_inference_records ADD COLUMN model_provider TEXT DEFAULT 'groq';

-- Fix auto_reconciliation_results (missing result_status)
ALTER TABLE auto_reconciliation_results ADD COLUMN result_status TEXT DEFAULT 'PENDING';

-- Fix defi_protocols (missing columns for stats)
ALTER TABLE defi_protocols ADD COLUMN tvl REAL DEFAULT 0;
ALTER TABLE defi_protocols ADD COLUMN active INTEGER DEFAULT 1;
ALTER TABLE defi_protocols ADD COLUMN protocol_name TEXT;
ALTER TABLE defi_protocols ADD COLUMN apy_range TEXT DEFAULT '{"min":3,"max":12}';
ALTER TABLE defi_protocols ADD COLUMN audit_status TEXT DEFAULT 'PENDING';
ALTER TABLE defi_protocols ADD COLUMN supported_stablecoins TEXT DEFAULT '["USDC","USDT"]';
ALTER TABLE defi_protocols ADD COLUMN contract_addresses TEXT DEFAULT '{}';
ALTER TABLE defi_protocols ADD COLUMN last_health_check TEXT;

-- Fix blockchain_verifications (missing columns for route)
ALTER TABLE blockchain_verifications ADD COLUMN entity_type TEXT DEFAULT 'contract';
ALTER TABLE blockchain_verifications ADD COLUMN entity_id TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN chain TEXT DEFAULT 'Polygon';
ALTER TABLE blockchain_verifications ADD COLUMN tx_hash TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN block_number INTEGER;
ALTER TABLE blockchain_verifications ADD COLUMN verification_type TEXT DEFAULT 'HASH_ANCHOR';
ALTER TABLE blockchain_verifications ADD COLUMN data_hash TEXT;
ALTER TABLE blockchain_verifications ADD COLUMN status TEXT DEFAULT 'CONFIRMED';
ALTER TABLE blockchain_verifications ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- Fix tokenized_trade_assets (missing columns)
ALTER TABLE tokenized_trade_assets ADD COLUMN token_id TEXT;
ALTER TABLE tokenized_trade_assets ADD COLUMN contract_value REAL DEFAULT 0;
ALTER TABLE tokenized_trade_assets ADD COLUMN current_value REAL DEFAULT 0;
ALTER TABLE tokenized_trade_assets ADD COLUMN milestone_progress REAL DEFAULT 0;
ALTER TABLE tokenized_trade_assets ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE tokenized_trade_assets ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- Fix margin_calls (missing margin_call_type)
ALTER TABLE margin_calls ADD COLUMN margin_call_type TEXT DEFAULT 'LTV_BREACH';

-- Fix secondary_market_listings (missing listing_type, token_id)
ALTER TABLE secondary_market_listings ADD COLUMN listing_type TEXT DEFAULT 'INVOICE_TOKEN';
ALTER TABLE secondary_market_listings ADD COLUMN token_id TEXT;

-- Fix tenants (missing v6.3 columns)
ALTER TABLE tenants ADD COLUMN operating_mode TEXT DEFAULT 'SIMPLE';
ALTER TABLE tenants ADD COLUMN onboarding_completed INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN sandbox_mode INTEGER DEFAULT 0;

-- Fix employees (missing v6.3 columns)
ALTER TABLE employees ADD COLUMN operating_mode_override TEXT;
ALTER TABLE employees ADD COLUMN voice_stress_consent INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN biometric_consent INTEGER DEFAULT 0;

-- Fix trade_requests (missing draft columns)
ALTER TABLE trade_requests ADD COLUMN draft_data TEXT;
ALTER TABLE trade_requests ADD COLUMN draft_expires_at TEXT;
ALTER TABLE trade_requests ADD COLUMN prefer_previous_logistics INTEGER DEFAULT 0;
ALTER TABLE trade_requests ADD COLUMN container_advisor_suggestion TEXT;

-- Fix contracts (missing v6.3 columns)
ALTER TABLE contracts ADD COLUMN risk_simulation_runs INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN ai_clause_verification TEXT;
ALTER TABLE contracts ADD COLUMN voice_amendment_requests TEXT;

-- Fix shipments (missing v6.3 fields)
ALTER TABLE shipments ADD COLUMN loading_window_start TEXT;
ALTER TABLE shipments ADD COLUMN loading_window_end TEXT;
ALTER TABLE shipments ADD COLUMN stuck_trade_status TEXT;
ALTER TABLE shipments ADD COLUMN stuck_trade_escalation_level INTEGER DEFAULT 0;

-- Fix governor_decisions (missing tenant_message for v6.3)
ALTER TABLE governor_decisions ADD COLUMN tenant_message TEXT;
ALTER TABLE governor_decisions ADD COLUMN tenant_message_language TEXT DEFAULT 'en';

-- Fix settlement_instructions (missing v6.3 columns)
ALTER TABLE settlement_instructions ADD COLUMN payer_tenant_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN payee_tenant_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN amount REAL DEFAULT 0;
ALTER TABLE settlement_instructions ADD COLUMN currency TEXT DEFAULT 'USD';
ALTER TABLE settlement_instructions ADD COLUMN payment_rail TEXT;
ALTER TABLE settlement_instructions ADD COLUMN psp_id TEXT;
ALTER TABLE settlement_instructions ADD COLUMN remittance_info TEXT;
ALTER TABLE settlement_instructions ADD COLUMN approved_at TEXT;
ALTER TABLE settlement_instructions ADD COLUMN executed_at TEXT;
ALTER TABLE settlement_instructions ADD COLUMN reconciled_at TEXT;
ALTER TABLE settlement_instructions ADD COLUMN voice_approved INTEGER DEFAULT 0;
ALTER TABLE settlement_instructions ADD COLUMN loom_hash TEXT;

-- Fix evidence_packages (missing v6.3 columns)
ALTER TABLE evidence_packages ADD COLUMN ustn TEXT;
ALTER TABLE evidence_packages ADD COLUMN package_type TEXT DEFAULT 'DISPUTE';
ALTER TABLE evidence_packages ADD COLUMN contents TEXT DEFAULT '{}';
ALTER TABLE evidence_packages ADD COLUMN qc_overrides_flagged TEXT DEFAULT '[]';
ALTER TABLE evidence_packages ADD COLUMN document_authenticity_flags TEXT DEFAULT '[]';
ALTER TABLE evidence_packages ADD COLUMN pdf_path TEXT;
ALTER TABLE evidence_packages ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- Fix commission_calculations (add missing v6.3 columns)
ALTER TABLE commission_calculations ADD COLUMN ustn TEXT;
ALTER TABLE commission_calculations ADD COLUMN base_rate REAL DEFAULT 0.0103;
ALTER TABLE commission_calculations ADD COLUMN country_boost REAL DEFAULT 0;
ALTER TABLE commission_calculations ADD COLUMN volume_discount REAL DEFAULT 0;
ALTER TABLE commission_calculations ADD COLUMN loyalty_discount REAL DEFAULT 0;
ALTER TABLE commission_calculations ADD COLUMN distressed_country_factor REAL DEFAULT 1.0;
ALTER TABLE commission_calculations ADD COLUMN final_rate REAL DEFAULT 0.0103;
ALTER TABLE commission_calculations ADD COLUMN commission_amount REAL DEFAULT 0;
ALTER TABLE commission_calculations ADD COLUMN importer_share_pct REAL DEFAULT 0;
ALTER TABLE commission_calculations ADD COLUMN exporter_share_pct REAL DEFAULT 100;

-- ═══════════════════════════════════════════════════════════
-- NEW v6.3 TABLES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_onboarding_state (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 5,
    step_data TEXT DEFAULT '{}',
    sandbox_active INTEGER DEFAULT 0,
    sandbox_reset_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_business_units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    parent_bu_id TEXT,
    name TEXT NOT NULL,
    administrator_employee_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_departments (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_cost_centers (
    id TEXT PRIMARY KEY,
    business_unit_id TEXT,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    employee_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    action TEXT NOT NULL,
    condition_json TEXT NOT NULL DEFAULT '{}',
    required_approvals TEXT NOT NULL DEFAULT '[]',
    quorum INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_requests (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    requesting_employee_id TEXT NOT NULL,
    action_context TEXT NOT NULL DEFAULT '{}',
    approvals_received TEXT DEFAULT '[]',
    status TEXT DEFAULT 'PENDING',
    resolved_at TEXT,
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

CREATE TABLE IF NOT EXISTS tenant_data_exports (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS seasonal_adjustments (
    id TEXT PRIMARY KEY,
    commodity_hs_code TEXT NOT NULL,
    month INTEGER NOT NULL,
    adjustment_factor REAL DEFAULT 1.0,
    source TEXT DEFAULT 'AI_MODEL',
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS cbdc_rails (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    cbdc_name TEXT NOT NULL,
    status TEXT DEFAULT 'PILOT',
    transaction_types TEXT DEFAULT '["B2B"]',
    fee_structure TEXT DEFAULT '{}',
    max_transaction_limit REAL,
    api_endpoint TEXT,
    launch_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS netting_circle_participants (
    id TEXT PRIMARY KEY,
    netting_circle_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    gross_amount REAL NOT NULL,
    net_amount REAL,
    direction TEXT DEFAULT 'OWES',
    approved INTEGER DEFAULT 0,
    signature TEXT,
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

CREATE TABLE IF NOT EXISTS fx_conversion_paths (
    id TEXT PRIMARY KEY,
    settlement_instruction_id TEXT,
    path_steps TEXT NOT NULL DEFAULT '[]',
    total_cost REAL,
    total_slippage REAL,
    selected INTEGER DEFAULT 0,
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

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_inbox_tenant_status ON smart_inbox_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_employee ON smart_inbox_items(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_priority ON smart_inbox_items(tenant_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON tenant_onboarding_state(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bu_tenant ON tenant_business_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stuck_trade ON stuck_trade_recovery(trade_request_id);
CREATE INDEX IF NOT EXISTS idx_export_tenant ON tenant_data_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_hs ON commodity_market_prices(hs_code, recorded_date);
CREATE INDEX IF NOT EXISTS idx_carbon_ustn ON carbon_calculations(ustn);
CREATE INDEX IF NOT EXISTS idx_fx_cache ON fx_rate_cache(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_outreach_listing ON distressed_outreach_notifications(listing_id);

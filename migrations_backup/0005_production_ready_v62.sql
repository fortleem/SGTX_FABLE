-- ============================================================
-- SGTX PLATFORM v6.2 PRODUCTION-READY — Schema Upgrade
-- Adds all missing tables/columns from the final blueprint
-- ============================================================

-- 1. Add missing columns to tenants
ALTER TABLE tenants ADD COLUMN logistics_roles TEXT DEFAULT '[]'; -- JSON array of logistics_role enums
ALTER TABLE tenants ADD COLUMN contact_email TEXT;
ALTER TABLE tenants ADD COLUMN serviceable_routes TEXT; -- JSON
ALTER TABLE tenants ADD COLUMN metadata TEXT; -- JSON (logistics_roles detail, provider profiles)

-- 2. Add missing columns to employees
ALTER TABLE employees ADD COLUMN preferred_language TEXT DEFAULT 'en';

-- 3. Add missing columns to trade_requests
ALTER TABLE trade_requests ADD COLUMN marketplace_auto_attributed INTEGER DEFAULT 0;
ALTER TABLE trade_requests ADD COLUMN marketplace_partner_id TEXT;
ALTER TABLE trade_requests ADD COLUMN embedding TEXT; -- simulated vector

-- 4. Add missing columns to exporter_quotes
ALTER TABLE exporter_quotes ADD COLUMN total_quote_amount REAL;
ALTER TABLE exporter_quotes ADD COLUMN logistics_total REAL;
ALTER TABLE exporter_quotes ADD COLUMN commission_amount REAL;

-- 5. Add missing columns to provider_quotes
ALTER TABLE provider_quotes ADD COLUMN bundle_score REAL;
ALTER TABLE provider_quotes ADD COLUMN visibility TEXT DEFAULT 'FULL';
ALTER TABLE provider_quotes ADD COLUMN service_type TEXT;
ALTER TABLE provider_quotes ADD COLUMN match_score REAL;

-- 6. Add missing columns to negotiation_sessions
ALTER TABLE negotiation_sessions ADD COLUMN negotiator_config TEXT; -- JSON
ALTER TABLE negotiation_sessions ADD COLUMN ai_settlement_proposal TEXT; -- JSON

-- 7. Add missing columns to contracts
ALTER TABLE contracts ADD COLUMN risk_simulation_result TEXT; -- JSON

-- 8. Add missing columns to commission_locks
ALTER TABLE commission_locks ADD COLUMN disputed_amount REAL;
ALTER TABLE commission_locks ADD COLUMN frozen_amount REAL;

-- 9. Add missing columns to shipments
ALTER TABLE shipments ADD COLUMN digital_twin_enabled INTEGER DEFAULT 0;
ALTER TABLE shipments ADD COLUMN shelf_life_remaining_days REAL;
ALTER TABLE shipments ADD COLUMN shipping_line TEXT;
ALTER TABLE shipments ADD COLUMN container_numbers TEXT; -- JSON array
ALTER TABLE shipments ADD COLUMN bl_number TEXT;
ALTER TABLE shipments ADD COLUMN etd TEXT;
ALTER TABLE shipments ADD COLUMN eta TEXT;

-- 10. Add missing columns to jurisdictions
ALTER TABLE jurisdictions ADD COLUMN distressed_sale_allowed INTEGER DEFAULT 1;
ALTER TABLE jurisdictions ADD COLUMN distressed_restrictions TEXT;
ALTER TABLE jurisdictions ADD COLUMN distressed_country_factor REAL DEFAULT 1.0;

-- ============================================================
-- PACKING & CONTAINERISATION (Part 5 Section 6)
-- ============================================================
CREATE TABLE IF NOT EXISTS packing_plans (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT REFERENCES trade_requests(id),
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    shipment_ustn TEXT,
    plan_data TEXT NOT NULL, -- JSON: full OR-Tools output
    loading_guide TEXT, -- Groq-generated natural language instructions
    container_type TEXT,
    pallet_type TEXT DEFAULT 'EUR',
    total_pallets INTEGER,
    total_containers INTEGER,
    locked INTEGER DEFAULT 0,
    governor_decision_id TEXT,
    locked_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pallet_details (
    id TEXT PRIMARY KEY,
    packing_plan_id TEXT NOT NULL REFERENCES packing_plans(id),
    container_id TEXT,
    sscc TEXT UNIQUE NOT NULL,
    lot_number TEXT,
    product_name TEXT,
    product_hs_code TEXT,
    cartons_per_layer INTEGER,
    layers INTEGER,
    cartons_per_pallet INTEGER NOT NULL,
    gross_weight_kg REAL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','LOADED','DAMAGED','DELIVERED')),
    position_in_container TEXT, -- JSON {x,y,z}
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

-- ============================================================
-- MARKETPLACE PARTNER PORTAL (Part 6.2.9)
-- ============================================================
ALTER TABLE marketplace_partners ADD COLUMN tenant_id TEXT;
ALTER TABLE marketplace_partners ADD COLUMN api_key_encrypted TEXT;
ALTER TABLE marketplace_partners ADD COLUMN api_key_created_at TEXT;
ALTER TABLE marketplace_partners ADD COLUMN api_key_last_used TEXT;
ALTER TABLE marketplace_partners ADD COLUMN ip_whitelist TEXT; -- JSON array
ALTER TABLE marketplace_partners ADD COLUMN sandbox_enabled INTEGER DEFAULT 1;
ALTER TABLE marketplace_partners ADD COLUMN webhook_endpoints TEXT; -- JSON array
ALTER TABLE marketplace_partners ADD COLUMN agreement_pdf_path TEXT;
ALTER TABLE marketplace_partners ADD COLUMN agreement_effective_date TEXT;
ALTER TABLE marketplace_partners ADD COLUMN agreement_expiry_date TEXT;
ALTER TABLE marketplace_partners ADD COLUMN total_leads INTEGER DEFAULT 0;
ALTER TABLE marketplace_partners ADD COLUMN total_attributed_trades INTEGER DEFAULT 0;
ALTER TABLE marketplace_partners ADD COLUMN total_commission_earned REAL DEFAULT 0;

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

CREATE TABLE IF NOT EXISTS partner_sandbox_leads (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES marketplace_partners(id),
    raw_text TEXT,
    parsed_specs TEXT, -- JSON
    viability_score INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
);

-- ============================================================
-- QC INSPECTION (Part 6.2.4)
-- ============================================================
CREATE TABLE IF NOT EXISTS qc_jobs (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    trade_request_id TEXT REFERENCES trade_requests(id),
    qc_provider_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    exporter_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    inspection_type TEXT DEFAULT 'PRE_SHIPMENT',
    quality_specs TEXT, -- JSON: dynamic specs from contract
    inspection_points TEXT, -- JSON: AI-recommended points
    status TEXT DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','FAILED','DISPUTED')),
    report_id TEXT,
    report_data TEXT, -- JSON
    ai_defects TEXT, -- JSON: AI-detected defects
    sampling_plan TEXT, -- JSON: AQL sampling
    verdict TEXT, -- PASS, FAIL, CONDITIONAL
    governor_decision_id TEXT,
    assigned_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS inspection_logs (
    id TEXT PRIMARY KEY,
    qc_job_id TEXT NOT NULL REFERENCES qc_jobs(id),
    inspector_employee_id TEXT,
    log_type TEXT NOT NULL, -- SCAN, DEFECT, PHOTO, VOICE, SEAL_CHECK
    data TEXT NOT NULL, -- JSON
    ai_analysis TEXT, -- JSON
    recorded_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- GOVERNMENT PORTAL (Part 6.2.6)
-- ============================================================
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

CREATE TABLE IF NOT EXISTS anonymous_trade_mappings (
    id TEXT PRIMARY KEY,
    anonymous_ustn TEXT NOT NULL UNIQUE,
    real_ustn TEXT NOT NULL,
    authorized_viewers TEXT NOT NULL, -- JSON array of tenant_ids
    redacted_fields TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integration_connector_logs (
    id TEXT PRIMARY KEY,
    government_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    connector_type TEXT NOT NULL, -- CUSTOMS_DECLARATION, PHYTO_CERT, ORIGIN_CERT, VESSEL_ARRIVAL, etc.
    direction TEXT NOT NULL, -- INBOUND, OUTBOUND
    payload TEXT, -- JSON
    response TEXT, -- JSON
    status TEXT DEFAULT 'SUCCESS',
    error_message TEXT,
    executed_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- ADMIN PORTAL ENHANCEMENTS (Part 6.2.7)
-- ============================================================
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

-- ============================================================
-- PSP HEALTH MONITORING (Part 10)
-- ============================================================
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

CREATE TABLE IF NOT EXISTS psp_fallback_chains (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    currency TEXT NOT NULL,
    chain TEXT NOT NULL, -- JSON array of aggregator_ids in priority order
    auto_fallback_enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- AI INTELLIGENCE (Part 11)
-- ============================================================
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

-- ============================================================
-- DeFi & CRYPTO (Part 9)
-- ============================================================
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

CREATE TABLE IF NOT EXISTS secondary_market_listings (
    id TEXT PRIMARY KEY,
    financing_agreement_id TEXT REFERENCES financing_agreements(id),
    seller_tenant_id TEXT NOT NULL REFERENCES tenants(id),
    token_address TEXT,
    face_value REAL NOT NULL,
    asking_price REAL NOT NULL,
    ai_suggested_price REAL,
    status TEXT DEFAULT 'LISTED',
    buyer_tenant_id TEXT,
    sold_at TEXT,
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

-- ============================================================
-- COMMODITY & PACKING SPECS (Part 19)
-- ============================================================
CREATE TABLE IF NOT EXISTS commodity_packing_rules (
    id TEXT PRIMARY KEY,
    hs_code_prefix TEXT NOT NULL,
    commodity_name TEXT NOT NULL,
    max_stacking_layers INTEGER,
    recommended_pallet_type TEXT DEFAULT 'EUR',
    temperature_range TEXT, -- JSON {min, max}
    humidity_range TEXT, -- JSON {min, max}
    ethylene_sensitivity TEXT, -- LOW, MEDIUM, HIGH
    compatibility_group TEXT,
    ventilation_required INTEGER DEFAULT 0,
    source TEXT DEFAULT 'ITC_FAO',
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

-- ============================================================
-- CASH FLOW & FINANCIAL PROJECTIONS (Part 6.2.2 Addition)
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_flow_projections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    projection_date TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('INFLOW','OUTFLOW')),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    source TEXT, -- trade_id, commission, financing, etc.
    confidence REAL,
    actual_amount REAL,
    settled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- POLICY SUGGESTIONS (Part 8 & 13)
-- ============================================================
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

-- ============================================================
-- COMMISSION SINGULARITY (Part 7.5.2)
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_singularity_calculations (
    id TEXT PRIMARY KEY,
    trade_request_id TEXT NOT NULL REFERENCES trade_requests(id),
    contract_id TEXT REFERENCES contracts(id),
    original_rate_pct REAL NOT NULL,
    proposed_discount_pct REAL NOT NULL,
    final_rate_pct REAL NOT NULL,
    qualification_reason TEXT, -- JSON
    multisig_approval TEXT, -- JSON
    status TEXT DEFAULT 'PROPOSED',
    governor_decision_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- QUOTE SELECTED SERVICES (Part 3 Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_selected_services (
    id TEXT PRIMARY KEY,
    exporter_quote_id TEXT REFERENCES exporter_quotes(id),
    provider_quote_id TEXT REFERENCES provider_quotes(id),
    service_type TEXT NOT NULL,
    selected_cost REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TENANT CONTACTS ENHANCEMENTS
-- ============================================================
ALTER TABLE tenant_contacts ADD COLUMN notes TEXT;
ALTER TABLE tenant_contacts ADD COLUMN auto_saved INTEGER DEFAULT 0;
ALTER TABLE tenant_contacts ADD COLUMN performance_metrics TEXT; -- JSON

-- ============================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES (from earlier migrations)
-- ============================================================
-- packing_plans was created in 0003 without these columns; add them now
ALTER TABLE packing_plans ADD COLUMN shipment_ustn TEXT;
ALTER TABLE packing_plans ADD COLUMN plan_data TEXT;
ALTER TABLE packing_plans ADD COLUMN loading_guide TEXT;
ALTER TABLE packing_plans ADD COLUMN pallet_type TEXT DEFAULT 'EUR';
ALTER TABLE packing_plans ADD COLUMN total_containers INTEGER;
ALTER TABLE packing_plans ADD COLUMN locked INTEGER DEFAULT 0;

-- partner_lead_attributions was created in 0002 without these columns
ALTER TABLE partner_lead_attributions ADD COLUMN importer_tenant_id TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN exporter_tenant_id TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN commission_earned REAL;
ALTER TABLE partner_lead_attributions ADD COLUMN status TEXT DEFAULT 'ACTIVE';
ALTER TABLE partner_lead_attributions ADD COLUMN disputed_at TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN dispute_reason TEXT;
ALTER TABLE partner_lead_attributions ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_packing_plans_ustn ON packing_plans(shipment_ustn);
CREATE INDEX IF NOT EXISTS idx_pallet_details_plan ON pallet_details(packing_plan_id);
CREATE INDEX IF NOT EXISTS idx_qc_jobs_status ON qc_jobs(status);
CREATE INDEX IF NOT EXISTS idx_partner_intents_partner ON partner_intents(marketplace_partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_attributions_pair ON partner_lead_attributions(importer_tenant_id, exporter_tenant_id);
CREATE INDEX IF NOT EXISTS idx_psp_health_aggregator ON psp_health_logs(aggregator_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_cash_flow_tenant ON cash_flow_projections(tenant_id, projection_date);
CREATE INDEX IF NOT EXISTS idx_policy_suggestions_status ON policy_suggestions(status);

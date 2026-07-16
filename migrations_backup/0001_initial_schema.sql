-- SGTX Platform v11.0 - Initial Schema (D1/SQLite compatible)
-- Non-custodial, AI-governed sovereign trade execution operating system

-- ============================================================
-- SECTION 1: IDENTITY & TENANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gtid TEXT UNIQUE NOT NULL,
    legal_name TEXT NOT NULL,
    legal_name_ar TEXT,
    type TEXT NOT NULL CHECK(type IN ('TRD','LSP','SHIP','LAB','QC','FIN','GOV','MP','CBR')),
    financier_subtype TEXT CHECK(financier_subtype IN ('BANK','PRIVATE')),
    lsp_subtype TEXT CHECK(lsp_subtype IN ('TRUCKING','FORWARDER','WAREHOUSING')),
    jurisdiction TEXT NOT NULL,
    tax_id TEXT,
    commercial_register TEXT,
    kyb_tier INTEGER DEFAULT 1,
    trust_score REAL DEFAULT 50.0,
    sanctions_cleared INTEGER DEFAULT 0,
    lifecycle_state TEXT DEFAULT 'REGISTERED',
    default_trader_mode TEXT DEFAULT 'DUAL' CHECK(default_trader_mode IN ('BUY','SELL','DUAL')),
    anonymous_rfq_opt_out INTEGER DEFAULT 0,
    anonymous_trade_enabled INTEGER DEFAULT 0,
    external_api_key TEXT,
    branding TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id INTEGER,
    status TEXT DEFAULT 'INVITED',
    mfa_enabled INTEGER DEFAULT 0,
    active_trader_mode_context TEXT CHECK(active_trader_mode_context IN ('BUY','SELL','DUAL')),
    allow_role_switching INTEGER DEFAULT 1,
    preferred_language TEXT DEFAULT 'en',
    voice_stress_consent INTEGER DEFAULT 0,
    support_pin_hash TEXT,
    defi_risk_acknowledged_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    allowed_trader_modes TEXT DEFAULT '["BUY","SELL","DUAL"]',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS data_scopes (
    employee_id INTEGER PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    hidden_cost_components TEXT,
    max_transaction_value REAL,
    allow_role_switching INTEGER DEFAULT 1,
    custom_filters TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_business_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    parent_bu_id INTEGER REFERENCES tenant_business_units(id),
    name TEXT NOT NULL,
    administrator_employee_id INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_approval_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    action TEXT NOT NULL,
    condition_json TEXT NOT NULL,
    required_approvals TEXT NOT NULL,
    quorum INTEGER NOT NULL,
    approval_mode TEXT DEFAULT 'parallel',
    enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tenant_lifecycle_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    reason TEXT,
    governor_decision_id INTEGER,
    changed_by INTEGER REFERENCES employees(id),
    changed_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 2: SESSIONS & API KEYS
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    token TEXT UNIQUE NOT NULL,
    portal_context TEXT DEFAULT 'UCC',
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
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

-- ============================================================
-- SECTION 3: TRADE CORE & SHIPMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS trade_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT UNIQUE NOT NULL,
    trade_request_id INTEGER REFERENCES trade_requests(id),
    contract_id INTEGER,
    exporter_gtid TEXT REFERENCES tenants(gtid),
    importer_gtid TEXT REFERENCES tenants(gtid),
    status TEXT DEFAULT 'INITIATED' CHECK(status IN ('INITIATED','STAGE1_PENDING','STAGE1_SETTLED','CUSTOMS_SUBMITTED','BOOKED','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_IMPORT','DELIVERED','SETTLED','COMPLETED','DISPUTED','DISTRESSED','CANCELLED')),
    incoterm TEXT NOT NULL,
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
);

CREATE TABLE IF NOT EXISTS shipment_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT NOT NULL REFERENCES shipments(ustn),
    milestone TEXT NOT NULL,
    confirmed_at TEXT NOT NULL,
    confirmed_by INTEGER REFERENCES employees(id),
    confirmation_method TEXT DEFAULT 'manual',
    governor_decision_id INTEGER,
    scanned_barcode_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packing_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ustn TEXT REFERENCES shipments(ustn),
    plan_data TEXT NOT NULL DEFAULT '{}',
    loading_guide TEXT,
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pallet_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packing_plan_id INTEGER REFERENCES packing_plans(id),
    sscc TEXT UNIQUE NOT NULL,
    lot_number TEXT,
    product_hs_code TEXT,
    cartons_per_pallet INTEGER NOT NULL,
    layer_patterns TEXT,
    total_cartons INTEGER NOT NULL,
    gross_weight_kg REAL,
    cold_treatment_cert_ref TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 4: CONTRACTS, FEES & PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_request_id INTEGER NOT NULL REFERENCES trade_requests(id),
    ustn TEXT REFERENCES shipments(ustn),
    contract_type TEXT DEFAULT 'SINGLE_SHIPMENT',
    incoterm TEXT NOT NULL,
    clauses TEXT NOT NULL DEFAULT '{}',
    governing_law TEXT NOT NULL,
    dispute_resolution TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_SIGNATURES','LOCKED','ACTIVE','COMPLETED','DISPUTED','TERMINATED','ACTIVE_MASTER')),
    cryptographic_hash TEXT,
    buyer_signature TEXT,
    seller_signature TEXT,
    sgtx_fee_rate REAL NOT NULL DEFAULT 0.015,
    sgtx_fee_amount REAL NOT NULL DEFAULT 0,
    fee_lock_id INTEGER,
    pqc_signature TEXT,
    signed_at TEXT,
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES contracts(id),
    shipment_number INTEGER NOT NULL,
    scheduled_delivery_date TEXT NOT NULL,
    port_of_discharge TEXT NOT NULL,
    containers_count INTEGER NOT NULL,
    total_price REAL NOT NULL,
    sgtx_fee_amount REAL,
    fee_lock_id INTEGER,
    ustn TEXT UNIQUE,
    status TEXT DEFAULT 'SCHEDULED',
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

-- ============================================================
-- SECTION 5: LOGISTICS (Three Modes: A=Manual, B=RFQ_LSP, C=DIRECT_SHIP)
-- ============================================================

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

-- ============================================================
-- SECTION 6: QC INSPECTION & LABORATORY
-- ============================================================

CREATE TABLE IF NOT EXISTS qc_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS inspection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qc_job_id INTEGER REFERENCES qc_jobs(id),
    pallet_id TEXT,
    ai_defect TEXT,
    ai_confidence REAL,
    inspector_override INTEGER DEFAULT 0,
    inspector_override_reason TEXT,
    final_classification TEXT,
    photo_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

-- ============================================================
-- SECTION 7: CUSTOMS BROKER (CBR) SERVICES
-- ============================================================

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

-- ============================================================
-- SECTION 8: FINANCING & CO-FINANCING
-- ============================================================

CREATE TABLE IF NOT EXISTS financing_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS financing_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financing_request_id INTEGER NOT NULL REFERENCES financing_requests(id),
    financier_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount_offered REAL NOT NULL,
    apr REAL NOT NULL,
    bid_encrypted INTEGER DEFAULT 1,
    reserve_proof TEXT,
    settlement_method TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financing_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- ============================================================
-- SECTION 9: DISTRESSED CARGO
-- ============================================================

CREATE TABLE IF NOT EXISTS distressed_cargo_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS distressed_cargo_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES distressed_cargo_listings(id),
    buyer_tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    governor_decision_id INTEGER,
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS micro_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_contract_id INTEGER REFERENCES contracts(id),
    distressed_listing_id INTEGER REFERENCES distressed_cargo_listings(id),
    micro_ustn TEXT UNIQUE NOT NULL,
    buyer_gtid TEXT NOT NULL,
    seller_gtid TEXT NOT NULL,
    agreed_price REAL,
    sgtx_fee_rate REAL DEFAULT 0.015,
    sgtx_fee_amount REAL,
    fee_lock_id INTEGER,
    status TEXT DEFAULT 'PENDING_SIGNATURES',
    locked_at TEXT,
    governor_decision_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 10: DISPUTES & EVIDENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS evidence_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_id INTEGER NOT NULL REFERENCES disputes(id),
    package TEXT NOT NULL DEFAULT '{}',
    loom_hash TEXT NOT NULL,
    verification_token TEXT UNIQUE,
    compiled_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS causal_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    entity_type TEXT,
    factor TEXT,
    contribution REAL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 11: DOCUMENTS & STORAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- ============================================================
-- SECTION 12: GOVERNANCE, AUDIT & LOOM
-- ============================================================

CREATE TABLE IF NOT EXISTS governor_decisions (
    decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
    decision_type TEXT NOT NULL,
    actor_gtid TEXT NOT NULL,
    verdict TEXT NOT NULL CHECK(verdict IN ('ALLOW','DENY','CONDITIONAL','ESCALATE','PENDING')),
    tenant_message TEXT,
    loom_hash TEXT NOT NULL,
    cryptographic_signature TEXT NOT NULL,
    pqc_signature TEXT,
    created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    before_data TEXT,
    after_data TEXT,
    changed_by INTEGER REFERENCES employees(id),
    changed_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 13: SMART INBOX & NOTIFICATIONS
-- ============================================================

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
);

CREATE TABLE IF NOT EXISTS inbox_preferences (
    employee_id INTEGER PRIMARY KEY REFERENCES employees(id),
    min_score INTEGER DEFAULT 30,
    muted_categories TEXT DEFAULT '[]',
    preferred_language TEXT DEFAULT 'en'
);

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

-- ============================================================
-- SECTION 14: JURISDICTIONS, PORTS & COMPLIANCE
-- ============================================================

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

CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unlocode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT REFERENCES jurisdictions(code),
    latitude REAL,
    longitude REAL,
    is_active INTEGER DEFAULT 1
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

-- ============================================================
-- SECTION 15: ANONYMOUS TRADES
-- ============================================================

CREATE TABLE IF NOT EXISTS anonymous_trade_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    real_ustn TEXT NOT NULL REFERENCES shipments(ustn),
    anonymous_ustn TEXT UNIQUE NOT NULL,
    buyer_gtid TEXT NOT NULL,
    seller_gtid TEXT NOT NULL,
    created_by INTEGER REFERENCES employees(id),
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    revoke_reason TEXT,
    revoked_by INTEGER REFERENCES employees(id)
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

-- ============================================================
-- SECTION 16: MULTISIG (Admin/Governance)
-- ============================================================

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

CREATE TABLE IF NOT EXISTS multisig_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multisig_request_id INTEGER NOT NULL REFERENCES multisig_requests(id),
    approver_gtid TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('APPROVE','DENY','ABSTAIN')),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 17: CONFIGURATION & SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER REFERENCES employees(id),
    updated_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS integration_connector_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_name TEXT NOT NULL,
    request_url TEXT,
    method TEXT,
    status_code INTEGER,
    latency_ms INTEGER,
    success INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integration_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_name TEXT NOT NULL,
    status TEXT DEFAULT 'OPERATIONAL' CHECK(status IN ('OPERATIONAL','DEGRADED','OUTAGE')),
    latency_p95_ms REAL,
    error_rate REAL,
    last_checked_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 18: CONSENT & PDPL COMPLIANCE
-- ============================================================

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

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    request_type TEXT NOT NULL CHECK(request_type IN ('ACCESS','ERASURE','RECTIFICATION','RESTRICTION','PORTABILITY','OBJECTION')),
    status TEXT DEFAULT 'PENDING',
    details TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SECTION 19: USER PREFERENCES & PORTAL CONFIG
-- ============================================================

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

CREATE TABLE IF NOT EXISTS saved_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    contact_gtid TEXT NOT NULL,
    contact_label TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, contact_gtid)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenants_gtid ON tenants(gtid);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_ustn ON shipments(ustn);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_exporter ON shipments(exporter_gtid);
CREATE INDEX IF NOT EXISTS idx_shipments_importer ON shipments(importer_gtid);
CREATE INDEX IF NOT EXISTS idx_trade_requests_buyer ON trade_requests(buyer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_trade_requests_seller ON trade_requests(seller_tenant_id);
CREATE INDEX IF NOT EXISTS idx_trade_requests_status ON trade_requests(status);
CREATE INDEX IF NOT EXISTS idx_contracts_trade ON contracts(trade_request_id);
CREATE INDEX IF NOT EXISTS idx_contracts_ustn ON contracts(ustn);
CREATE INDEX IF NOT EXISTS idx_fee_payment_status ON fee_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_financing_requests_status ON financing_requests(status);
CREATE INDEX IF NOT EXISTS idx_financing_offers_req ON financing_offers(financing_request_id);
CREATE INDEX IF NOT EXISTS idx_financing_agreements_req ON financing_agreements(financing_request_id);
CREATE INDEX IF NOT EXISTS idx_governor_decisions_created ON governor_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_loom_sequence ON loom_chain(sequence_num);
CREATE INDEX IF NOT EXISTS idx_inbox_employee ON inbox_items(employee_id, priority_score);
CREATE INDEX IF NOT EXISTS idx_inbox_tenant ON inbox_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_ustn ON documents(ustn);
CREATE INDEX IF NOT EXISTS idx_disputes_ustn ON disputes(ustn);
CREATE INDEX IF NOT EXISTS idx_qc_jobs_ustn ON qc_jobs(ustn);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_ustn ON lab_jobs(ustn);
CREATE INDEX IF NOT EXISTS idx_cbr_jobs_ustn ON cbr_jobs(ustn);
CREATE INDEX IF NOT EXISTS idx_distressed_active ON distressed_cargo_listings(status);
CREATE INDEX IF NOT EXISTS idx_distressed_seller ON distressed_cargo_listings(seller_tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_employee ON consent_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_milestone_payment_contract ON milestone_payment_schedules(contract_id);

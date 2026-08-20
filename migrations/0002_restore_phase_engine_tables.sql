-- 0002: restore phase-engine tables dropped by consolidation

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

CREATE TABLE IF NOT EXISTS container_release_authorizations (
  id TEXT PRIMARY KEY,
  shipment_ustn TEXT NOT NULL,
  container_id TEXT,
  commission_lock_id TEXT REFERENCES commission_locks(lock_id),
  release_authorized INTEGER DEFAULT 0,
  authorized_by TEXT,
  authorization_governor_decision_id TEXT REFERENCES governor_decisions(decision_id),
  released_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS liquidity_auctions (
    id TEXT PRIMARY KEY,
    financing_request_id TEXT NOT NULL REFERENCES financing_requests(id),
    bid_window_start TEXT,
    bid_window_end TEXT,
    qualified_bidders INTEGER DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    governor_decision_id TEXT
);

CREATE TABLE IF NOT EXISTS onboarding_sandbox_data (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL,
  resource_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY,
  commission_lock_id TEXT,
  psp_id TEXT,
  amount REAL NOT NULL,
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

CREATE TABLE IF NOT EXISTS shipment_barcodes (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT REFERENCES shipments(ustn),
    barcode_type TEXT NOT NULL,
    barcode_data TEXT NOT NULL,
    pallet_number INTEGER,
    sscc TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS signature_sequences (
    id TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES contracts(id),
    sequence_config TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    governor_decision_id TEXT
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

CREATE TABLE IF NOT EXISTS trade_container_commodities (
  id TEXT PRIMARY KEY,
  trade_container_id TEXT NOT NULL,
  trade_request_id TEXT NOT NULL,
  commodity_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  hs_code TEXT,
  product_specification TEXT,
  packaging TEXT NOT NULL DEFAULT 'boxes',
  packaging_custom TEXT,
  num_pallets INTEGER NOT NULL DEFAULT 1,
  quantity REAL,
  unit TEXT DEFAULT 'KG',
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_containers (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT NOT NULL,
  container_index INTEGER NOT NULL DEFAULT 1,
  container_type TEXT NOT NULL DEFAULT '40ft_HC',
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  port_of_discharge TEXT,
  port_of_loading TEXT,
  palletized INTEGER NOT NULL DEFAULT 1,
  pallet_size TEXT DEFAULT '120x100',
  cloned_from_container_id TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_event_timeline (
  id TEXT PRIMARY KEY,
  ustn TEXT NOT NULL,
  event_type TEXT DEFAULT 'SYSTEM',
  event_text TEXT NOT NULL,
  event_data TEXT DEFAULT '{}',
  actor_gtid TEXT,
  phase TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ustn_registry (
  ustn TEXT PRIMARY KEY,
  trade_request_id TEXT REFERENCES trade_requests(id),
  importer_gtid_suffix TEXT NOT NULL,
  exporter_gtid_suffix TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);


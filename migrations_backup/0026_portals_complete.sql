-- ═══════════════════════════════════════════════════════════════════════════════
-- SGTX Platform v11.2 — Complete Portal Database Tables
-- Migration 0026: All portal tables for Shipping Line, Logistics, Lab, QC, Gov, Admin, Marketplace
-- ═══════════════════════════════════════════════════════════════════════════════

-- SHIPPING LINE PORTAL
CREATE TABLE IF NOT EXISTS ship_bookings (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  trade_request_id TEXT,
  seller_tenant_id TEXT,
  buyer_tenant_id TEXT,
  shipping_line_tenant_id TEXT,
  container_type TEXT DEFAULT '40HC',
  container_count INTEGER DEFAULT 1,
  sailing_window_start TEXT,
  sailing_window_end TEXT,
  origin_port TEXT,
  destination_port TEXT,
  commodity_hs_chapter TEXT,
  volume_cbm REAL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  vessel_name TEXT,
  voyage_number TEXT,
  departure_date TEXT,
  arrival_date TEXT,
  freight_rate REAL DEFAULT 0,
  quote_valid_until TEXT,
  decline_reason TEXT,
  addons TEXT DEFAULT '[]',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS electronic_bls (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  booking_id TEXT,
  shipper TEXT,
  consignee TEXT,
  notify_party TEXT,
  vessel_name TEXT,
  voyage_number TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,
  container_numbers TEXT DEFAULT '[]',
  description_of_goods TEXT,
  gross_weight_kg REAL DEFAULT 0,
  measurement_cbm REAL DEFAULT 0,
  freight_terms TEXT DEFAULT 'PREPAID',
  status TEXT DEFAULT 'DRAFT',
  issuer_tenant_id TEXT,
  loom_hash TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS vessel_schedules (
  id TEXT PRIMARY KEY,
  vessel_name TEXT,
  voyage_number TEXT,
  shipping_line_tenant_id TEXT,
  route_ports TEXT DEFAULT '[]',
  departure_date TEXT,
  arrival_date TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  capacity_teu INTEGER DEFAULT 0,
  available_teu INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS freight_invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  ustn TEXT,
  issuer_tenant_id TEXT,
  payer_tenant_id TEXT,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payment_terms TEXT DEFAULT 'NET30',
  due_date TEXT,
  line_items TEXT DEFAULT '[]',
  status TEXT DEFAULT 'ISSUED',
  paid_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contract_rates (
  id TEXT PRIMARY KEY,
  shipping_line_tenant_id TEXT,
  customer_tenant_id TEXT,
  route_origin TEXT,
  route_destination TEXT,
  container_type TEXT DEFAULT '40HC',
  rate_per_teu REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  valid_from TEXT,
  valid_to TEXT,
  min_volume_teu INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT,
  updated_at TEXT
);

-- LOGISTICS PORTAL — Add columns to existing tables
ALTER TABLE logistics_rfqs ADD COLUMN target_lsp_tenant_id TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN broadcast INTEGER DEFAULT 0;
ALTER TABLE logistics_rfqs ADD COLUMN ustn TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN service_type TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN route_origin TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN route_destination TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN commodity_hs_chapter TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN loading_window_start TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN loading_window_end TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN incoterm TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN decline_reason TEXT;
ALTER TABLE logistics_rfqs ADD COLUMN clarification_request TEXT;

-- Logistics Quotes (if not exists already — add missing columns)
CREATE TABLE IF NOT EXISTS logistics_quotes (
  id TEXT PRIMARY KEY,
  rfq_id TEXT,
  lsp_tenant_id TEXT,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  breakdown TEXT DEFAULT '{}',
  transit_days INTEGER DEFAULT 0,
  valid_until TEXT,
  notes TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  accepted_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS dispatch_plans (
  id TEXT PRIMARY KEY,
  lsp_tenant_id TEXT,
  driver_name TEXT,
  vehicle_id TEXT,
  route_json TEXT DEFAULT '[]',
  planned_date TEXT,
  status TEXT DEFAULT 'PLANNED',
  pickups_count INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS warehouse_operations (
  id TEXT PRIMARY KEY,
  warehouse_tenant_id TEXT,
  ustn TEXT,
  operation_type TEXT,
  pallet_count INTEGER DEFAULT 0,
  temperature_zone TEXT DEFAULT 'Ambient',
  status TEXT DEFAULT 'PENDING',
  vehicle_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS consolidation_plans (
  id TEXT PRIMARY KEY,
  forwarder_tenant_id TEXT,
  bundle_shipments TEXT DEFAULT '[]',
  container_type TEXT DEFAULT '40HC',
  combined_cbm REAL DEFAULT 0,
  fill_rate_pct REAL DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  created_at TEXT,
  updated_at TEXT
);

-- LABORATORY PORTAL
CREATE TABLE IF NOT EXISTS lab_testing_jobs (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  lab_tenant_id TEXT,
  requester_tenant_id TEXT,
  sample_tracking_number TEXT,
  commodity_type TEXT,
  test_panel TEXT DEFAULT '[]',
  due_date TEXT,
  status TEXT DEFAULT 'PENDING',
  received_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  results_json TEXT,
  overall_verdict TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lab_certificates (
  id TEXT PRIMARY KEY,
  testing_job_id TEXT,
  certificate_type TEXT DEFAULT 'PHYTO',
  certificate_number TEXT,
  status TEXT DEFAULT 'PENDING_ISSUE',
  issued_at TEXT,
  valid_until TEXT,
  loom_hash TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- QC PORTAL
CREATE TABLE IF NOT EXISTS inspection_queue (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  inspector_tenant_id TEXT,
  requester_tenant_id TEXT,
  inspection_location TEXT,
  sampling_plan TEXT DEFAULT 'General II',
  commodity_type TEXT,
  commodity_quantity REAL DEFAULT 0,
  priority INTEGER DEFAULT 50,
  scheduled_date TEXT,
  status TEXT DEFAULT 'PENDING',
  accepted_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  verdict TEXT,
  report_json TEXT,
  defect_count INTEGER DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  action_plan TEXT,
  action_plan_deadline TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS reinspection_requests (
  id TEXT PRIMARY KEY,
  original_inspection_id TEXT,
  inspector_tenant_id TEXT,
  requester_tenant_id TEXT,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  decline_reason TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- GOVERNMENT PORTAL
CREATE TABLE IF NOT EXISTS clearance_items (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  importer_tenant_id TEXT,
  jurisdiction TEXT,
  risk_score INTEGER DEFAULT 0,
  document_readiness TEXT DEFAULT 'PARTIAL',
  declaration_status TEXT DEFAULT 'PENDING',
  status TEXT DEFAULT 'PENDING',
  cleared_by TEXT,
  cleared_at TEXT,
  hold_reason TEXT,
  rejection_reason TEXT,
  inspection_required INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS document_verifications (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  document_type TEXT,
  submitter_tenant_id TEXT,
  ai_status TEXT DEFAULT 'PENDING',
  extracted_fields TEXT DEFAULT '{}',
  discrepancies TEXT DEFAULT '[]',
  status TEXT DEFAULT 'PENDING',
  verified_by TEXT,
  verification_notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS multi_agency_workflows (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  agency TEXT,
  responsible_officer TEXT,
  deadline TEXT,
  status TEXT DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS anonymous_trades (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  requestor_tenant_id TEXT,
  anonymity_level TEXT DEFAULT 'FULL',
  anonymity_revoked INTEGER DEFAULT 0,
  revoked_by TEXT,
  revoke_reason TEXT,
  revoked_at TEXT,
  data_hash TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- ADMIN PORTAL
CREATE TABLE IF NOT EXISTS constitutional_policies (
  id TEXT PRIMARY KEY,
  policy_code TEXT,
  rego_source TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'ACTIVE',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS psp_configurations (
  id TEXT PRIMARY KEY,
  name TEXT,
  provider_type TEXT,
  countries TEXT DEFAULT '[]',
  priority INTEGER DEFAULT 99,
  status TEXT DEFAULT 'ACTIVE',
  fallback_to TEXT,
  config_json TEXT DEFAULT '{}',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS special_rates (
  id TEXT PRIMARY KEY,
  seller_gtid TEXT,
  buyer_gtid TEXT,
  rate_pct REAL DEFAULT 1.5,
  effective_from TEXT,
  effective_to TEXT,
  reason TEXT,
  status TEXT DEFAULT 'PENDING_MULTISIG',
  created_at TEXT,
  updated_at TEXT
);

-- MARKETPLACE PARTNER PORTAL
CREATE TABLE IF NOT EXISTS marketplace_leads (
  id TEXT PRIMARY KEY,
  partner_tenant_id TEXT,
  raw_text TEXT,
  parsed_specs TEXT DEFAULT '{}',
  viability_score REAL DEFAULT 0,
  status TEXT DEFAULT 'NEW',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS partner_webhooks (
  id TEXT PRIMARY KEY,
  partner_tenant_id TEXT,
  url TEXT,
  events TEXT DEFAULT '[]',
  secret TEXT,
  status TEXT DEFAULT 'ACTIVE',
  last_triggered_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS revenue_attributions (
  id TEXT PRIMARY KEY,
  partner_tenant_id TEXT,
  ustn TEXT,
  attributed_revenue REAL DEFAULT 0,
  trade_value REAL DEFAULT 0,
  commission_pct REAL DEFAULT 0,
  status TEXT DEFAULT 'CONFIRMED',
  disputed INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  id TEXT PRIMARY KEY,
  partner_tenant_id TEXT,
  name TEXT,
  key_hash TEXT,
  prefix TEXT,
  permissions TEXT DEFAULT '["read"]',
  status TEXT DEFAULT 'ACTIVE',
  last_used_at TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- FINANCIER PORTAL
CREATE TABLE IF NOT EXISTS secondary_market_listings (
  id TEXT PRIMARY KEY,
  agreement_id TEXT,
  seller_tenant_id TEXT,
  remaining_principal REAL DEFAULT 0,
  fair_value REAL DEFAULT 0,
  asking_price REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT,
  updated_at TEXT
);

-- DISTRESSED TRADES
CREATE TABLE IF NOT EXISTS distressed_trades (
  id TEXT PRIMARY KEY,
  ustn TEXT,
  seller_tenant_id TEXT,
  condition_description TEXT,
  pallet_ids TEXT DEFAULT '[]',
  photos_json TEXT DEFAULT '[]',
  ai_condition_score REAL,
  ai_suggested_price_min REAL,
  ai_suggested_price_max REAL,
  status TEXT DEFAULT 'DECLARED',
  buyer_tenant_id TEXT,
  offer_amount REAL,
  micro_ustn TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- DISPUTES — Add missing columns to existing table
ALTER TABLE disputes ADD COLUMN filed_by_tenant_id TEXT;
ALTER TABLE disputes ADD COLUMN remedy_sought TEXT;
ALTER TABLE disputes ADD COLUMN evidence_ids TEXT DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN arbitration_body TEXT;
ALTER TABLE disputes ADD COLUMN settlement_amount REAL;
ALTER TABLE disputes ADD COLUMN loom_hash TEXT;

-- INBOX ITEMS — Add missing columns to existing table
ALTER TABLE inbox_items ADD COLUMN portal TEXT DEFAULT 'ALL';
ALTER TABLE inbox_items ADD COLUMN mode TEXT;
ALTER TABLE inbox_items ADD COLUMN urgency_score INTEGER DEFAULT 50;
ALTER TABLE inbox_items ADD COLUMN status TEXT DEFAULT 'PENDING';
ALTER TABLE inbox_items ADD COLUMN action_taken TEXT;
ALTER TABLE inbox_items ADD COLUMN action_at TEXT;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_ship_bookings_line ON ship_bookings(shipping_line_tenant_id);
CREATE INDEX IF NOT EXISTS idx_ship_bookings_status ON ship_bookings(status);
CREATE INDEX IF NOT EXISTS idx_ebl_issuer ON electronic_bls(issuer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_vessel_line ON vessel_schedules(shipping_line_tenant_id);
CREATE INDEX IF NOT EXISTS idx_logistics_rfqs_lsp ON logistics_rfqs(target_lsp_tenant_id);
CREATE INDEX IF NOT EXISTS idx_logistics_rfqs_status ON logistics_rfqs(status);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_lab ON lab_testing_jobs(lab_tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_jobs_status ON lab_testing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_inspection_inspector ON inspection_queue(inspector_tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_status ON inspection_queue(status);
CREATE INDEX IF NOT EXISTS idx_clearance_jurisdiction ON clearance_items(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_clearance_status ON clearance_items(status);
CREATE INDEX IF NOT EXISTS idx_disputes_ustn ON disputes(ustn);
CREATE INDEX IF NOT EXISTS idx_distressed_seller ON distressed_trades(seller_tenant_id);

-- SEED DATA for testing

-- Shipping Line Tenant
INSERT OR IGNORE INTO tenants (id, gtid, legal_name, type, country, kyb_status, created_at)
VALUES ('tenant-ship-001', 'GTID-SHIP-001', 'Mediterranean Shipping Co', 'LOGISTICS', 'CH', 'VERIFIED', datetime('now'));

-- Sample Ship Bookings
INSERT OR IGNORE INTO ship_bookings (id, ustn, seller_tenant_id, buyer_tenant_id, shipping_line_tenant_id,
  container_type, container_count, sailing_window_start, sailing_window_end, origin_port, destination_port,
  commodity_hs_chapter, volume_cbm, status, created_at)
VALUES
  ('SB-001', 'USTN-2025-001', 'tenant-001', 'tenant-002', 'tenant-ship-001', '40HC', 2,
   '2025-07-01', '2025-07-10', 'Alexandria', 'Felixstowe', '08', 64.0, 'PENDING', datetime('now')),
  ('SB-002', 'USTN-2025-002', 'tenant-001', 'tenant-003', 'tenant-ship-001', '20GP', 1,
   '2025-07-05', '2025-07-15', 'Port Said', 'Rotterdam', '03', 28.0, 'CONFIRMED', datetime('now'));

-- Sample eBLs
INSERT OR IGNORE INTO electronic_bls (id, ustn, booking_id, shipper, consignee, vessel_name,
  voyage_number, port_of_loading, port_of_discharge, status, issuer_tenant_id, loom_hash, created_at)
VALUES
  ('EBL-001', 'USTN-2025-002', 'SB-002', 'Nile Fresh Exports', 'UK Premium Foods', 'MSC Gulsun',
   'FE25-042', 'Port Said', 'Rotterdam', 'ISSUED', 'tenant-ship-001', 'loom-ebl-001', datetime('now'));

-- Sample Vessel Schedules
INSERT OR IGNORE INTO vessel_schedules (id, vessel_name, voyage_number, shipping_line_tenant_id,
  route_ports, departure_date, arrival_date, status, capacity_teu, available_teu, created_at)
VALUES
  ('VS-001', 'MSC Gulsun', 'FE25-042', 'tenant-ship-001',
   '["Alexandria","Port Said","Piraeus","Rotterdam","Felixstowe"]',
   '2025-07-05', '2025-07-18', 'SCHEDULED', 23756, 1200, datetime('now')),
  ('VS-002', 'MSC Oscar', 'FE25-043', 'tenant-ship-001',
   '["Damietta","Gioia Tauro","Valencia","Hamburg"]',
   '2025-07-12', '2025-07-24', 'SCHEDULED', 19224, 800, datetime('now'));

-- Sample Logistics RFQs
INSERT OR IGNORE INTO logistics_rfqs (id, requester_tenant_id, target_lsp_tenant_id, broadcast, ustn,
  service_type, route_origin, route_destination, commodity_hs_chapter, volume_cbm,
  loading_window_start, loading_window_end, incoterm, status, created_at)
VALUES
  ('RFQ-001', 'tenant-001', 'tenant-004', 0, 'USTN-2025-001', 'TRUCKING',
   'Cairo Warehouse', 'Alexandria Port', '08', 64.0, '2025-07-01', '2025-07-03', 'CFR', 'PENDING', datetime('now')),
  ('RFQ-002', 'tenant-001', '', 1, 'USTN-2025-003', 'FULL_SERVICE',
   'Aswan', 'Port Said', '07', 32.0, '2025-07-10', '2025-07-12', 'CIF', 'PENDING', datetime('now'));

-- Sample Lab Testing Jobs  
INSERT OR IGNORE INTO lab_testing_jobs (id, ustn, lab_tenant_id, requester_tenant_id,
  sample_tracking_number, commodity_type, test_panel, due_date, status, created_at)
VALUES
  ('LTJ-001', 'USTN-2025-001', 'tenant-lab-001', 'tenant-001', 'STN-2025-0042',
   'Fresh Oranges', '["Pesticide Residue","Microbiology","Heavy Metals"]', '2025-07-05', 'PENDING', datetime('now')),
  ('LTJ-002', 'USTN-2025-002', 'tenant-lab-001', 'tenant-001', 'STN-2025-0043',
   'Frozen Seafood', '["Microbiology","Heavy Metals","Histamine"]', '2025-07-08', 'IN_PROGRESS', datetime('now'));

-- Sample Inspection Queue
INSERT OR IGNORE INTO inspection_queue (id, ustn, inspector_tenant_id, requester_tenant_id,
  inspection_location, sampling_plan, commodity_type, commodity_quantity, priority,
  scheduled_date, status, created_at)
VALUES
  ('IQ-001', 'USTN-2025-001', 'tenant-qc-001', 'tenant-001', 'Alexandria Port Warehouse',
   'General II', 'Fresh Oranges', 5000, 80, '2025-07-02', 'PENDING', datetime('now')),
  ('IQ-002', 'USTN-2025-002', 'tenant-qc-001', 'tenant-001', 'Port Said Cold Store',
   'Tightened', 'Frozen Seafood', 2000, 90, '2025-07-04', 'ACCEPTED', datetime('now'));

-- Sample Clearance Items
INSERT OR IGNORE INTO clearance_items (id, ustn, importer_tenant_id, jurisdiction, risk_score,
  document_readiness, declaration_status, status, created_at)
VALUES
  ('CL-001', 'USTN-2025-001', 'tenant-002', 'GB', 25, 'COMPLETE', 'SUBMITTED', 'PENDING', datetime('now')),
  ('CL-002', 'USTN-2025-002', 'tenant-003', 'NL', 65, 'PARTIAL', 'PENDING', 'PENDING', datetime('now'));

-- Sample Document Verifications
INSERT OR IGNORE INTO document_verifications (id, ustn, document_type, submitter_tenant_id,
  ai_status, extracted_fields, discrepancies, status, created_at)
VALUES
  ('DV-001', 'USTN-2025-001', 'Phytosanitary Certificate', 'tenant-001', 'VERIFIED',
   '{"cert_number":"PHY-2025-001","origin":"Egypt","commodity":"Citrus"}', '[]', 'PENDING', datetime('now')),
  ('DV-002', 'USTN-2025-002', 'Health Certificate', 'tenant-001', 'AI_FLAGGED',
   '{"cert_number":"HC-2025-002","origin":"Egypt"}',
   '["Expiry date mismatch","Missing batch reference"]', 'AI_FLAGGED', datetime('now'));

-- Sample Multi-Agency Workflows
INSERT OR IGNORE INTO multi_agency_workflows (id, ustn, agency, responsible_officer, deadline, status, created_at)
VALUES
  ('MAW-001', 'USTN-2025-001', 'Customs', 'Officer Ahmed', '2025-07-10', 'PENDING', datetime('now')),
  ('MAW-002', 'USTN-2025-001', 'Agriculture', 'Dr. Sarah', '2025-07-10', 'PENDING', datetime('now')),
  ('MAW-003', 'USTN-2025-002', 'Port Health', 'Inspector Lee', '2025-07-12', 'PENDING', datetime('now'));

-- Admin seed data
INSERT OR IGNORE INTO constitutional_policies (id, policy_code, rego_source, description, version, status, updated_at)
VALUES
  ('POL-001', 'G1U1', 'package sgtx.g1u1\ndefault allow = true', 'Agent mesh session initialization', '1.0', 'ACTIVE', datetime('now')),
  ('POL-002', 'G2U18', 'package sgtx.g2u18\ndefault allow = false\nallow { input.mandatory_costs_present }', 'Mandatory logistics costs per incoterm', '2.1', 'ACTIVE', datetime('now')),
  ('POL-003', 'G3U7', 'package sgtx.g3u7\ndefault allow = false\nallow { input.fee_paid }', 'SGTX fee payment per shipment', '1.3', 'ACTIVE', datetime('now'));

INSERT OR IGNORE INTO psp_configurations (id, name, provider_type, countries, priority, status, fallback_to, config_json, created_at)
VALUES
  ('PSP-001', 'Stripe', 'CARD_BANK', '["US","GB","EU","AE"]', 1, 'ACTIVE', 'PSP-002', '{"api_version":"2024-01"}', datetime('now')),
  ('PSP-002', 'Wise', 'BANK_TRANSFER', '["GB","EU","EG","AE"]', 2, 'ACTIVE', 'PSP-003', '{}', datetime('now')),
  ('PSP-003', 'Payoneer', 'BANK_TRANSFER', '["EG","VN","IN","CN"]', 3, 'DEGRADED', '', '{}', datetime('now'));

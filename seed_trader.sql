-- ═══════════════════════════════════════════════════════════
-- SGTX Trader Portal: Full Demo Seed Data
-- Creates complete trade lifecycle for tenant-001 (buyer) and tenant-002 (seller)
-- ═══════════════════════════════════════════════════════════

-- ── Contacts ──────────────────────────────────────────────
INSERT OR IGNORE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, trade_count, total_value, is_favorite, first_interaction, last_interaction, notes)
VALUES
  ('tenant-001', 'SGTX-VN-TRD-000002-C3D4', 'TRADE_PARTNER', 5, 450000.00, 1, '2026-01-15', '2026-05-20', 'Primary textile supplier'),
  ('tenant-001', 'SGTX-SG-FIN-000001-E5F6', 'FINANCIER', 2, 200000.00, 0, '2026-02-10', '2026-04-15', 'Trade finance provider'),
  ('tenant-001', 'SGTX-DE-LOG-000001-I9J0', 'LOGISTICS', 3, 0, 0, '2026-03-01', '2026-05-18', 'Hamburg logistics partner'),
  ('tenant-002', 'SGTX-EG-TRD-000001-A1B2', 'TRADE_PARTNER', 5, 450000.00, 1, '2026-01-15', '2026-05-20', 'Egyptian buyer'),
  ('tenant-002', 'SGTX-GB-QC-000001-K1L2', 'QC_PROVIDER', 4, 0, 0, '2026-01-20', '2026-05-10', 'UK quality inspector');

-- ── Smart Inbox Items ─────────────────────────────────────
INSERT OR IGNORE INTO smart_inbox_items (id, tenant_id, item_type, category, priority_score, title, body, related_ustn, status, created_at, updated_at, dismissed)
VALUES
  ('inb-demo-001', 'tenant-001', 'TRADE', 'TRADE', 85, 'Quote received from Saigon Textiles', 'Seller has submitted a landed cost quote for your textile order. Review and accept or negotiate.', NULL, 'UNREAD', datetime('now', '-2 hours'), datetime('now', '-2 hours'), 0),
  ('inb-demo-002', 'tenant-001', 'DOCUMENT', 'DOCUMENT', 72, 'Certificate of Origin missing', 'The Certificate of Origin for your recent trade is required for customs clearance. Upload or request from seller.', NULL, 'UNREAD', datetime('now', '-5 hours'), datetime('now', '-5 hours'), 0),
  ('inb-demo-003', 'tenant-001', 'FINANCE', 'FINANCE', 60, 'Financing bid available', 'Asia Trade Finance has submitted a financing bid at 4.2% APR for your cotton import.', NULL, 'UNREAD', datetime('now', '-1 day'), datetime('now', '-1 day'), 0),
  ('inb-demo-004', 'tenant-001', 'COMPLIANCE', 'COMPLIANCE', 90, 'Sanctions screening alert', 'Governor has flagged a compliance review for trade partner. Action required within 24 hours.', NULL, 'UNREAD', datetime('now', '-30 minutes'), datetime('now', '-30 minutes'), 0),
  ('inb-demo-005', 'tenant-001', 'LOGISTICS', 'LOGISTICS', 45, 'Shipment ETD updated', 'Hamburg Logistics has updated the estimated departure date to June 15, 2026.', NULL, 'UNREAD', datetime('now', '-3 hours'), datetime('now', '-3 hours'), 0),
  ('inb-demo-006', 'tenant-001', 'QC', 'QC', 55, 'QC inspection completed', 'Pre-shipment inspection completed with PASS verdict. Review detailed report.', NULL, 'UNREAD', datetime('now', '-8 hours'), datetime('now', '-8 hours'), 0),
  ('inb-demo-007', 'tenant-002', 'TRADE', 'TRADE', 80, 'New trade request from Cairo Imports', 'Cairo Imports Co. has submitted a new trade request for 20,000kg oranges. Review and respond.', NULL, 'UNREAD', datetime('now', '-1 hour'), datetime('now', '-1 hour'), 0),
  ('inb-demo-008', 'tenant-002', 'DOCUMENT', 'DOCUMENT', 65, 'Packing list requires signature', 'Sign the packing list for your shipment before departure.', NULL, 'UNREAD', datetime('now', '-4 hours'), datetime('now', '-4 hours'), 0);

-- ── Governor decisions for existing trade requests ────────
-- These are already seeded (68 exist), use existing ones

-- ── Contracts for trade 228efb6e (QUOTED status) ─────────
INSERT OR IGNORE INTO contracts (id, trade_request_id, contract_type, incoterm, incoterm_rules, clauses, governing_law, dispute_resolution, status, governor_decision_id, created_at, updated_at)
SELECT 
  'ctr-demo-001',
  '228efb6e-e53e-4b68-9288-c4fbbde49085',
  'SINGLE_SHIPMENT',
  'FOB',
  '{"place_of_delivery": "Ho Chi Minh Port", "risk_transfer": "Ship rail"}',
  '{"payment_terms": "LC 60 days", "quality_clause": "Per AQL 2.5", "force_majeure": "Standard ICC"}',
  'Singapore',
  'SGTX Mediation → Singapore ICC Arbitration',
  'DRAFT',
  (SELECT decision_id FROM governor_decisions WHERE decision_type = 'trade.request.create' LIMIT 1),
  datetime('now', '-3 days'),
  datetime('now', '-3 days');

-- ── Exporter Quotes ──────────────────────────────────────
INSERT OR IGNORE INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status, total_quote_amount, logistics_total, sgtx_fee_amount, total_trade_value, final_quoted_price, governor_decision_id, created_at, updated_at, submitted_at)
SELECT
  'eq-demo-001',
  '228efb6e-e53e-4b68-9288-c4fbbde49085',
  'tenant-002',
  1.85,
  'USD',
  datetime('now', '-4 days'),
  'FOB',
  14,
  'SUBMITTED',
  50600.00,
  9000.00,
  1470.00,
  50600.00,
  50600.00,
  (SELECT decision_id FROM governor_decisions WHERE decision_type = 'trade.request.create' LIMIT 1),
  datetime('now', '-2 days'),
  datetime('now', '-2 days'),
  datetime('now', '-2 days');

-- ── Shipments ─────────────────────────────────────────────
INSERT OR IGNORE INTO shipments (id, ustn, contract_id, booking_number, status, current_milestone, origin_port, destination_port, vessel_name, shipping_line, container_numbers, etd, eta, container_type, total_weight_kg, governor_decision_id, created_at, updated_at)
SELECT
  'shp-demo-001',
  'SGTX-EG-VN-20260501123456-AB12CD34',
  'ctr-demo-001',
  'BK-2026-HCM-00451',
  'IN_TRANSIT',
  'DEPARTED',
  'Ho Chi Minh City',
  'Alexandria',
  'MSC Positano',
  'MSC',
  'MSCU1234567',
  '2026-05-15',
  '2026-06-10',
  '40RF',
  20000.0,
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-10 days'),
  datetime('now', '-1 day');

INSERT OR IGNORE INTO shipments (id, ustn, contract_id, booking_number, status, current_milestone, origin_port, destination_port, vessel_name, shipping_line, container_numbers, etd, eta, container_type, total_weight_kg, governor_decision_id, created_at, updated_at)
SELECT
  'shp-demo-002',
  'SGTX-EG-VN-20260510094500-EF56GH78',
  'ctr-demo-001',
  'BK-2026-HCM-00452',
  'CREATED',
  'BOOKED',
  'Ho Chi Minh City',
  'Port Said',
  NULL,
  'Maersk',
  'MAEU9876543',
  '2026-06-01',
  '2026-06-25',
  '20RF',
  10000.0,
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-3 days'),
  datetime('now', '-3 days');

-- ── Shipment Milestones ───────────────────────────────────
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, governor_decision_id)
SELECT 'ms-demo-001', 'SGTX-EG-VN-20260501123456-AB12CD34', 'BOOKED', datetime('now', '-10 days'), 'tenant-002', 'SYSTEM', (SELECT decision_id FROM governor_decisions LIMIT 1);
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, governor_decision_id)
SELECT 'ms-demo-002', 'SGTX-EG-VN-20260501123456-AB12CD34', 'GATED_IN', datetime('now', '-8 days'), 'tenant-002', 'BARCODE_SCAN', (SELECT decision_id FROM governor_decisions LIMIT 1);
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, governor_decision_id)
SELECT 'ms-demo-003', 'SGTX-EG-VN-20260501123456-AB12CD34', 'LOADED', datetime('now', '-7 days'), 'tenant-005', 'SYSTEM', (SELECT decision_id FROM governor_decisions LIMIT 1);
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, governor_decision_id)
SELECT 'ms-demo-004', 'SGTX-EG-VN-20260501123456-AB12CD34', 'DEPARTED', datetime('now', '-6 days'), 'tenant-005', 'AIS_TRACK', (SELECT decision_id FROM governor_decisions LIMIT 1);

-- ── Shipment Barcodes ─────────────────────────────────────
INSERT OR IGNORE INTO shipment_barcodes (id, shipment_ustn, barcode_type, barcode_data, pallet_number, sscc)
VALUES
  ('bc-demo-001', 'SGTX-EG-VN-20260501123456-AB12CD34', 'SSCC', '003760012345678901', 1, '003760012345678901'),
  ('bc-demo-002', 'SGTX-EG-VN-20260501123456-AB12CD34', 'SSCC', '003760012345678902', 2, '003760012345678902'),
  ('bc-demo-003', 'SGTX-EG-VN-20260501123456-AB12CD34', 'SSCC', '003760012345678903', 3, '003760012345678903');

-- ── Documents ─────────────────────────────────────────────
INSERT OR IGNORE INTO documents (id, trade_request_id, shipment_ustn, tenant_id, document_type, filename, storage_path, sha256_hash, uploaded_by, verification_status, uploaded_at)
VALUES
  ('doc-demo-001', '228efb6e-e53e-4b68-9288-c4fbbde49085', 'SGTX-EG-VN-20260501123456-AB12CD34', 'tenant-002', 'COMMERCIAL_INVOICE', 'invoice_HCM_2026.pdf', '/docs/inv-001.pdf', 'sha256-abc123', 'tenant-002', 'VERIFIED', datetime('now', '-7 days')),
  ('doc-demo-002', '228efb6e-e53e-4b68-9288-c4fbbde49085', 'SGTX-EG-VN-20260501123456-AB12CD34', 'tenant-002', 'PACKING_LIST', 'packing_list_HCM.pdf', '/docs/pl-001.pdf', 'sha256-def456', 'tenant-002', 'PENDING', datetime('now', '-6 days')),
  ('doc-demo-003', '228efb6e-e53e-4b68-9288-c4fbbde49085', 'SGTX-EG-VN-20260501123456-AB12CD34', 'tenant-001', 'CERTIFICATE_OF_ORIGIN', 'coo_eg.pdf', '/docs/coo-001.pdf', 'sha256-ghi789', 'tenant-001', 'PENDING', datetime('now', '-5 days'));

-- ── QC Jobs ───────────────────────────────────────────────
INSERT OR IGNORE INTO qc_jobs (id, shipment_ustn, trade_request_id, qc_provider_tenant_id, exporter_tenant_id, inspection_type, status, governor_decision_id, assigned_at, completed_at, verdict)
SELECT
  'qcj-demo-001',
  'SGTX-EG-VN-20260501123456-AB12CD34',
  '228efb6e-e53e-4b68-9288-c4fbbde49085',
  'tenant-006',
  'tenant-002',
  'PRE_SHIPMENT',
  'COMPLETED',
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-12 days'),
  datetime('now', '-9 days'),
  'PASS';

INSERT OR IGNORE INTO qc_jobs (id, shipment_ustn, trade_request_id, qc_provider_tenant_id, exporter_tenant_id, inspection_type, status, governor_decision_id, assigned_at)
SELECT
  'qcj-demo-002',
  'SGTX-EG-VN-20260510094500-EF56GH78',
  '228efb6e-e53e-4b68-9288-c4fbbde49085',
  'tenant-006',
  'tenant-002',
  'LOADING',
  'ASSIGNED',
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-2 days');

-- ── Financing Requests ────────────────────────────────────
INSERT OR IGNORE INTO financing_requests (id, contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, status, requested_amount, trade_value, ai_credit_score, ai_max_ltv, governor_decision_id, created_at, ustn)
SELECT
  'fin-demo-001',
  'ctr-demo-001',
  'tenant-001',
  35000.00,
  'USD',
  60,
  'POST_SHIPMENT',
  'BIDDING',
  35000.00,
  50600.00,
  78.5,
  0.80,
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-5 days'),
  'SGTX-EG-VN-20260501123456-AB12CD34';

-- ── Financing Offers (bids from financier) ────────────────
INSERT OR IGNORE INTO financing_offers (id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost, status, amount, interest_rate, tenor_days, submitted_at)
VALUES
  ('fo-demo-001', 'fin-demo-001', 'tenant-003', 4.2, 1470.00, 'SUBMITTED', 35000.00, 4.2, 60, datetime('now', '-3 days')),
  ('fo-demo-002', 'fin-demo-001', 'tenant-003', 3.8, 1330.00, 'SUBMITTED', 30000.00, 3.8, 45, datetime('now', '-2 days'));

-- ── Distressed Cargo Listing ──────────────────────────────
INSERT OR IGNORE INTO distressed_cargo_listings (id, original_shipment_ustn, exporter_tenant_id, product_details, quantity, unit, current_location, condition, price_expectation, price_currency, listing_expiry, status, governor_decision_id, created_at, condition_score)
SELECT
  'dsl-demo-001',
  'SGTX-EG-VN-20260501123456-AB12CD34',
  'tenant-002',
  '{"commodity_type": "Fresh Oranges", "product": "Valencia Oranges Grade B", "market_value": 28000, "description": "Minor shelf-life concern due to transit delay"}',
  5000,
  'KG',
  'Alexandria Port, Egypt',
  'QUALITY_DEGRADATION',
  18000.00,
  'USD',
  datetime('now', '+14 days'),
  'ACTIVE',
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-2 days'),
  6.5;

-- ── Disputes ──────────────────────────────────────────────
INSERT OR IGNORE INTO disputes (id, trade_request_id, filing_party_gtid, respondent_gtid, dispute_type, description, status, severity, governor_decision_id, filed_at)
SELECT
  'dsp-demo-001',
  'e5850085-c2f5-4b69-93f4-9d5a043da4b5',
  'SGTX-EG-TRD-000001-A1B2',
  'SGTX-VN-TRD-000002-C3D4',
  'QUALITY',
  'Received cargo does not meet Grade A specifications as agreed in contract. Multiple cartons show bruising above acceptable limit.',
  'FILED',
  5,
  (SELECT decision_id FROM governor_decisions LIMIT 1),
  datetime('now', '-1 day');

-- ── EXW Price Watch ───────────────────────────────────────
INSERT OR IGNORE INTO exw_price_watch (id, exporter_quote_id, trade_request_id, locked_price, current_market_price, deviation_pct, created_at)
VALUES
  ('epw-demo-001', 'eq-demo-001', '228efb6e-e53e-4b68-9288-c4fbbde49085', 1.85, 1.92, 3.78, datetime('now', '-1 day'));

-- ── Cash Flow Projections ─────────────────────────────────
INSERT OR IGNORE INTO cash_flow_projections (id, tenant_id, projection_date, direction, amount, currency, source, confidence, created_at)
VALUES
  ('cfp-001', 'tenant-001', '2026-06-01', 'OUTFLOW', 50600.00, 'USD', 'TRADE_PAYMENT', 0.92, datetime('now')),
  ('cfp-002', 'tenant-001', '2026-06-15', 'OUTFLOW', 35000.00, 'USD', 'FINANCING_REPAYMENT', 0.85, datetime('now')),
  ('cfp-003', 'tenant-002', '2026-06-01', 'INFLOW', 50600.00, 'USD', 'TRADE_RECEIPT', 0.92, datetime('now')),
  ('cfp-004', 'tenant-002', '2026-06-10', 'OUTFLOW', 1470.00, 'USD', 'SGTX_FEE', 0.95, datetime('now'));

-- ── Packing Plans ─────────────────────────────────────────
INSERT OR IGNORE INTO packing_plans (id, exporter_quote_id, trade_request_id, pallet_details, total_weight_kg, container_type, status, created_at)
VALUES
  ('pp-demo-001', 'eq-demo-001', '228efb6e-e53e-4b68-9288-c4fbbde49085', '{"packaging_type": "MESH_BAGS", "pack_weight_kg": 15, "packs_per_pallet": 80, "pallets_per_container": 20}', 20000, '40RF', 'LOCKED', datetime('now', '-5 days'));

-- ── Logistics RFQs ────────────────────────────────────────
INSERT OR IGNORE INTO logistics_rfqs (id, trade_request_id, contract_id, requester_tenant_id, origin_port, destination_port, commodity_type, weight_kg, container_type, container_count, status, created_at, updated_at)
VALUES
  ('lrfq-demo-001', '228efb6e-e53e-4b68-9288-c4fbbde49085', 'ctr-demo-001', 'tenant-002', 'Ho Chi Minh City', 'Alexandria', 'Fresh Produce', 20000, '40RF', 1, 'AWARDED', datetime('now', '-7 days'), datetime('now', '-5 days'));

-- Update trade_requests to have proper seller references
UPDATE trade_requests SET exporter_tenant_id = 'tenant-002', seller_gtid = 'SGTX-VN-TRD-000002-C3D4', seller_company_name = 'Saigon Textiles'
WHERE id = '228efb6e-e53e-4b68-9288-c4fbbde49085';

-- ============================================================
-- SGTX PLATFORM v6.1 — Complete Seed Data (Blueprint v6.1)
-- ============================================================

-- Jurisdictions (Part 23: Global Coverage & Settlement Matrix — 14 primary + blocked + high-risk)
INSERT OR IGNORE INTO jurisdictions (code, name, sanctions_level, regulatory_body, kyc_tier_required, cbdc_status, psp_partners, reporting_requirements) VALUES
('US', 'United States', 'NONE', 'OFAC/FinCEN', 2, 'RESEARCH', '["Stripe","Mercury","Wise"]', '{"ctr_threshold":10000,"sar_required":true}'),
('DE', 'Germany', 'NONE', 'BaFin', 2, 'PILOT', '["Stripe","Adyen","SEPA"]', '{"vat_report":true}'),
('AE', 'United Arab Emirates', 'NONE', 'CBUAE', 2, 'PILOT', '["Payoneer","Network Intl"]', '{"ubo_required":true}'),
('CN', 'China', 'NONE', 'SAFE/PBOC', 3, 'ACTIVE', '["Alipay","UnionPay"]', '{"safe_reporting":true}'),
('GB', 'United Kingdom', 'NONE', 'FCA', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"hmrc_report":true}'),
('EG', 'Egypt', 'NONE', 'CBE', 2, 'NONE', '["Fawry","Payoneer"]', '{"cbe_notification":true}'),
('IN', 'India', 'NONE', 'RBI', 2, 'PILOT', '["RazorpayX","UPI"]', '{"rbi_report":true}'),
('BR', 'Brazil', 'NONE', 'BCB', 2, 'ACTIVE', '["PIX","Stripe"]', '{"bacen_report":true}'),
('NG', 'Nigeria', 'NONE', 'CBN', 3, 'ACTIVE', '["Flutterwave","Paystack"]', '{"cbn_report":true}'),
('KE', 'Kenya', 'NONE', 'CBK', 2, 'NONE', '["M-Pesa","Flutterwave"]', '{"cbk_report":true}'),
('SA', 'Saudi Arabia', 'NONE', 'SAMA', 2, 'PILOT', '["STC Pay","Payoneer"]', '{"zatca_report":true}'),
('SG', 'Singapore', 'NONE', 'MAS', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"mas_report":true}'),
('ZA', 'South Africa', 'NONE', 'SARB', 2, 'RESEARCH', '["Payfast","Flutterwave"]', '{"sarb_report":true}'),
('TR', 'Turkey', 'NONE', 'BRSA', 2, 'RESEARCH', '["Iyzico","Stripe"]', '{"bddk_report":true}'),
('ID', 'Indonesia', 'NONE', 'OJK/BI', 2, 'RESEARCH', '["GoPay","Xendit"]', '{"ojk_report":true}'),
('VN', 'Vietnam', 'NONE', 'SBV', 2, 'NONE', '["VNPay","Payoneer"]', '{"sbv_report":true}'),
('JP', 'Japan', 'NONE', 'FSA', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"fsa_report":true}'),
('AU', 'Australia', 'NONE', 'ASIC', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"austrac_report":true}'),
('CH', 'Switzerland', 'NONE', 'FINMA', 2, 'NONE', '["Stripe","Adyen"]', '{"finma_report":true}'),
('HK', 'Hong Kong', 'NONE', 'HKMA', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"hkma_report":true}'),
-- Blocked (auto-blocked per blueprint G-1.4)
('KP', 'North Korea', 'BLOCKED', 'N/A', 4, 'NONE', '[]', '{}'),
('IR', 'Iran', 'BLOCKED', 'CBI', 4, 'NONE', '[]', '{}'),
('SY', 'Syria', 'BLOCKED', 'CBS', 4, 'NONE', '[]', '{}'),
('CU', 'Cuba', 'BLOCKED', 'BCC', 4, 'NONE', '[]', '{}'),
('RU', 'Russia', 'BLOCKED', 'CBR', 4, 'NONE', '[]', '{}'),
('BY', 'Belarus', 'BLOCKED', 'NBRB', 4, 'NONE', '[]', '{}'),
-- High-risk (bank-only + enhanced DD)
('IQ', 'Iraq', 'HIGH_RISK', 'CBI', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('AF', 'Afghanistan', 'HIGH_RISK', 'DAB', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('YE', 'Yemen', 'HIGH_RISK', 'CBY', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('LB', 'Lebanon', 'HIGH_RISK', 'BDL', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('PK', 'Pakistan', 'HIGH_RISK', 'SBP', 3, 'NONE', '["Bank only","JazzCash"]', '{"enhanced_dd":true}');

-- Payment Aggregators (Part 10: PSP Priority by region)
INSERT OR IGNORE INTO payment_aggregators (id, name, country_codes, supported_currencies, supports_split, uptime_score, is_active) VALUES
('psp-stripe', 'Stripe', '["US","GB","DE","SG","JP","BR","AU","CH","HK"]', '["USD","GBP","EUR","SGD","JPY","BRL","AUD","CHF"]', 1, 0.9995, 1),
('psp-adyen', 'Adyen', '["DE","GB","SG","AE","JP","FR","NL","HK","AU"]', '["EUR","GBP","SGD","AED","JPY","AUD","HKD"]', 1, 0.9990, 1),
('psp-fawry', 'Fawry', '["EG"]', '["EGP","USD"]', 1, 0.9950, 1),
('psp-payoneer', 'Payoneer', '["AE","EG","VN","SA","NG","TR"]', '["USD","AED","EGP","VND","SAR","TRY"]', 1, 0.9970, 1),
('psp-flutterwave', 'Flutterwave', '["NG","KE","ZA","GH"]', '["NGN","KES","ZAR","GHS","USD"]', 1, 0.9940, 1),
('psp-razorpay', 'RazorpayX', '["IN"]', '["INR","USD"]', 1, 0.9980, 1),
('psp-mpesa', 'M-Pesa', '["KE","TZ","MZ"]', '["KES","TZS"]', 0, 0.9930, 1),
('psp-mercury', 'Mercury', '["US"]', '["USD"]', 1, 0.9990, 1);

-- Legal Disclaimer (Part 8)
INSERT OR IGNORE INTO legal_disclaimers (id, disclaimer_text, version, effective_date) VALUES
('ld-001', 'SGTX is a non-custodial platform headquartered in New Jersey, USA. We do NOT hold funds, process payments, or act as a financial institution. Users bear 100% compliance responsibility. Maximum liability is limited to commissions paid in the last 12 months.', '1.0', '2026-04-13');

-- ============================================================
-- DEMO TENANTS (all 5 per login page + 2 additional)
-- ============================================================
INSERT OR IGNORE INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier, cryptographic_hash, risk_score, sanctions_cleared, default_trader_mode) VALUES
('t-001', 'SGTX-EG-TRD-000001-A1B2', 'Cairo Imports Co.', 'EG', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo1', 25.50, 1, 'BUY'),
('t-002', 'SGTX-VN-TRD-000002-C3D4', 'Saigon Textiles Export JSC', 'VN', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo2', 15.30, 1, 'SELL'),
('t-003', 'SGTX-SG-FIN-000003-E5F6', 'Asia Trade Finance Pte Ltd', 'SG', 'FINANCIAL', 'VERIFIED', 3, 'sha256:demo3', 10.00, 1, 'DUAL'),
('t-004', 'SGTX-DE-LOG-000004-G7H8', 'Hamburg Logistics GmbH', 'DE', 'LOGISTICS', 'VERIFIED', 2, 'sha256:demo4', 12.00, 1, 'DUAL'),
('t-005', 'SGTX-US-TRD-000005-I9J0', 'SGTX Platform Inc.', 'US', 'CORPORATE', 'VERIFIED', 3, 'sha256:platform', 5.00, 1, 'DUAL'),
('t-006', 'SGTX-AE-TRD-000006-K1L2', 'Dubai Fresh Produce LLC', 'AE', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo6', 18.00, 1, 'BUY'),
('t-007', 'SGTX-GB-QC-000007-M3N4', 'London QC Services Ltd', 'GB', 'QUALITY_CONTROL', 'VERIFIED', 2, 'sha256:demo7', 8.50, 1, 'DUAL');

-- Demo Employees (password: password123 → sha256:ef92b778bafe...)
INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, kyc_status, status, mfa_enabled, password_hash, role_id) VALUES
('e-001', 't-001', 'ahmed@cairoimports.eg', 'Ahmed Hassan', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-001'),
('e-002', 't-002', 'nguyen@saigontex.vn', 'Nguyen Van Minh', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-002'),
('e-003', 't-003', 'chen@asiafinance.sg', 'Sarah Chen', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-003'),
('e-004', 't-004', 'muller@hamburg-log.de', 'Klaus Muller', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-004'),
('e-005', 't-005', 'admin@sgtx.us', 'SGTX Admin', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-005'),
('e-006', 't-006', 'omar@dubaifresh.ae', 'Omar Al-Rashid', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-006'),
('e-007', 't-007', 'james@londonqc.co.uk', 'James Powell', 'VERIFIED', 'ACTIVE', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'r-007');

-- Demo Roles (per blueprint Part 2: Human Authority Hierarchy)
INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions) VALUES
('r-001', 't-001', 'TENANT_ADMIN', '["*"]'),
('r-002', 't-002', 'TENANT_ADMIN', '["*"]'),
('r-003', 't-003', 'TENANT_ADMIN', '["*"]'),
('r-004', 't-004', 'TENANT_ADMIN', '["*"]'),
('r-005', 't-005', 'PLATFORM_ADMIN', '["*"]'),
('r-006', 't-006', 'TENANT_ADMIN', '["*"]'),
('r-007', 't-007', 'TENANT_ADMIN', '["*"]');

-- Trust Scores (Part 11: AI Intelligence Layer)
INSERT OR IGNORE INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score) VALUES
('SGTX-EG-TRD-000001-A1B2', 82.00, 'xgboost-v1.0', '{"payment_history":88,"delivery_record":79,"dispute_rate":85,"document_accuracy":76}', 82.00, 0),
('SGTX-VN-TRD-000002-C3D4', 91.00, 'xgboost-v1.0', '{"payment_history":93,"delivery_record":92,"dispute_rate":88,"document_accuracy":91}', 0, 91.00),
('SGTX-SG-FIN-000003-E5F6', 95.00, 'xgboost-v1.0', '{"regulatory_compliance":98,"capital_adequacy":94,"response_time":93}', 0, 0),
('SGTX-DE-LOG-000004-G7H8', 88.00, 'xgboost-v1.0', '{"on_time_delivery":90,"damage_rate":92,"communication":82}', 0, 0),
('SGTX-US-TRD-000005-I9J0', 99.00, 'xgboost-v1.0', '{"platform_operator":100,"compliance":99,"governance":98}', 99.00, 99.00),
('SGTX-AE-TRD-000006-K1L2', 79.00, 'xgboost-v1.0', '{"payment_history":75,"delivery_record":82,"dispute_rate":80}', 79.00, 0),
('SGTX-GB-QC-000007-M3N4', 92.00, 'xgboost-v1.0', '{"inspection_accuracy":95,"report_quality":90,"turnaround":91}', 0, 0);

-- Tenant Contacts / Network (Part 18: auto-populated from trades)
INSERT OR IGNORE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, trade_count, total_value, first_interaction, last_interaction, is_favorite) VALUES
('t-001', 'SGTX-VN-TRD-000002-C3D4', 'EXPORTER', 12, 1250000.00, '2025-01-15', '2026-04-10', 1),
('t-001', 'SGTX-DE-LOG-000004-G7H8', 'LOGISTICS', 8, 0, '2025-03-01', '2026-04-08', 0),
('t-001', 'SGTX-SG-FIN-000003-E5F6', 'FINANCIER', 4, 580000.00, '2025-06-01', '2026-04-05', 0),
('t-002', 'SGTX-EG-TRD-000001-A1B2', 'IMPORTER', 12, 1250000.00, '2025-01-15', '2026-04-10', 1),
('t-002', 'SGTX-AE-TRD-000006-K1L2', 'IMPORTER', 3, 450000.00, '2025-09-20', '2026-03-15', 0),
('t-006', 'SGTX-VN-TRD-000002-C3D4', 'EXPORTER', 3, 450000.00, '2025-09-20', '2026-03-15', 0);

-- ============================================================
-- SAMPLE TRADE WORKFLOW (complete pipeline demo)
-- ============================================================

-- Governor Decisions for seed data
INSERT OR IGNORE INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, conditions, policy_version, confidence, loom_hash, cryptographic_signature, created_at) VALUES
('gov-seed-001', 'trade.request.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-001', 'sig:seed-001', '2026-04-13 10:00:00'),
('gov-seed-002', 'quote.submit', 'SGTX-VN-TRD-000002-C3D4', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-002', 'sig:seed-002', '2026-04-13 12:00:00'),
('gov-seed-003', 'contract.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-003', 'sig:seed-003', '2026-04-13 14:00:00'),
('gov-seed-004', 'contract.lock', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-004', 'sig:seed-004', '2026-04-13 15:00:00'),
('gov-seed-005', 'commission.calculate', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-005', 'sig:seed-005', '2026-04-13 15:00:01'),
('gov-seed-006', 'shipment.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-006', 'sig:seed-006', '2026-04-14 08:00:00'),
('gov-seed-007', 'shipment.milestone.confirm', 'SGTX-DE-LOG-000004-G7H8', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-007', 'sig:seed-007', '2026-04-15 10:00:00'),
('gov-seed-008', 'financing.request', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-008', 'sig:seed-008', '2026-04-14 09:00:00'),
('gov-seed-009', 'settlement.execute', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', '[]', 'v6.1', 0.95, 'sha256:seed-loom-009', 'sig:seed-009', '2026-04-16 12:00:00');

-- Loom Logs for governor decisions
INSERT OR IGNORE INTO loom_logs (id, governor_decision_id, loom_hash, agent_reasoning, logged_at) VALUES
('loom-seed-001', 'gov-seed-001', 'sha256:seed-loom-001', '{"policy":"trade.request.create","result":"ALLOW"}', '2026-04-13 10:00:00'),
('loom-seed-002', 'gov-seed-002', 'sha256:seed-loom-002', '{"policy":"quote.submit","result":"ALLOW"}', '2026-04-13 12:00:00'),
('loom-seed-003', 'gov-seed-003', 'sha256:seed-loom-003', '{"policy":"contract.create","result":"ALLOW"}', '2026-04-13 14:00:00'),
('loom-seed-004', 'gov-seed-004', 'sha256:seed-loom-004', '{"policy":"contract.lock","result":"ALLOW"}', '2026-04-13 15:00:00'),
('loom-seed-005', 'gov-seed-005', 'sha256:seed-loom-005', '{"policy":"commission.calculate","result":"ALLOW"}', '2026-04-13 15:00:01'),
('loom-seed-006', 'gov-seed-006', 'sha256:seed-loom-006', '{"policy":"shipment.create","result":"ALLOW"}', '2026-04-14 08:00:00'),
('loom-seed-007', 'gov-seed-007', 'sha256:seed-loom-007', '{"policy":"shipment.milestone.confirm","result":"ALLOW"}', '2026-04-15 10:00:00');

-- Trade Request (Phase 1: Organic cotton yarn VN→EG)
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, exporter_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, governor_decision_id, created_by, created_at, updated_at) VALUES
('trade-001', 't-001', 't-002', 't-002', 'Organic cotton yarn 32s, GOTS certified, 5000kg', '{"hs_code":"520512","incoterm":"CFR","description":"Organic cotton yarn 32s, GOTS certified, 5000kg","qc_preference":"THIRD_PARTY","quantity":5000,"unit":"KG","certifications":["GOTS"]}', '{"product":"Organic cotton yarn 32s","certifications":["GOTS"],"quantity":5000,"unit":"KG"}', 'CONTRACTED', 'gov-seed-001', 'e-001', '2026-04-13 10:00:00', '2026-04-13 15:00:00');

-- Trade Channel
INSERT OR IGNORE INTO trade_channels (channel_id, trade_request_id, importer_tenant_id, exporter_tenant_id, jurisdiction_rules_snapshot, current_phase, creation_governor_decision_id) VALUES
('ch-001', 'trade-001', 't-001', 't-002', '{"importer":"EG","exporter":"VN","strictest":"NONE"}', 5, 'gov-seed-001');

-- Exporter Quote (Phase 2: EXW price lock)
INSERT OR IGNORE INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status, governor_decision_id, created_at) VALUES
('quote-001', 'trade-001', 't-002', 35000.00, 'USD', '2026-04-13 12:00:00', 'CFR', 15, 'ACCEPTED', 'gov-seed-002', '2026-04-13 12:00:00');

-- Contract (Phase 3: with commission lock)
INSERT OR IGNORE INTO contracts (id, trade_request_id, contract_type, incoterm, incoterm_rules, clauses, governing_law, dispute_resolution, status, commission_responsibility, commission_allocation, commission_lock_id, importer_signature, exporter_signature, signed_at, locked_at, governor_decision_id, created_at) VALUES
('contract-001', 'trade-001', 'SINGLE_SHIPMENT', 'CFR', '{"version":"Incoterms 2020"}', '[{"id":"cl-1","text":"Force Majeure per ICC 2020"},{"id":"cl-2","text":"Payment within 30 days of delivery"}]', 'English Law', 'ICC Arbitration', 'LOCKED', '{"default_payer":"EXPORTER"}', '{"importer":50,"exporter":50}', 'lock-001', 'sig-ahmed-001', 'sig-nguyen-001', '2026-04-13 14:30:00', '2026-04-13 15:00:00', 'gov-seed-003', '2026-04-13 14:00:00');

-- Commission Lock (Phase 3: ACTIVE after contract lock)
INSERT OR IGNORE INTO commission_locks (lock_id, contract_id, trade_id, commission_rate_pct, commission_usd, currency, status, release_conditions, released_pct, responsible_tenant_id, governor_decision_id, locked_at) VALUES
('lock-001', 'contract-001', 'trade-001', 0.012, 522.00, 'USD', 'PARTIALLY_RELEASED', '{"milestones":["LOADED","DEPARTED","ARRIVED","DELIVERED"],"release_per_milestone":25}', 50, 't-002', 'gov-seed-004', '2026-04-13 15:00:00');

-- Commission Calculation
INSERT OR IGNORE INTO commission_calculations (id, trade_request_id, effective_margin_pct, base_rate_pct, country_boost_pct, seasonality_pct, geopolitical_risk_pct, volume_discount_pct, perishability_surcharge_pct, anomaly_correction_pct, final_rate_pct, commission_usd, explanation, governor_decision_id, created_at) VALUES
('calc-001', 'trade-001', 20.0, 0.009, 0.003, 0.0, 0.001, 0.001, 0.0, 0.0, 0.012, 522.00, 'Commission: 1.20% of $43,500 (VN→EG corridor)', 'gov-seed-005', '2026-04-13 15:00:01');

-- Shipment (Phase 5: USTN tracking)
INSERT OR IGNORE INTO shipments (id, ustn, contract_id, contract_sequence_number, origin_port, destination_port, vessel_name, imo_number, status, current_milestone, governor_decision_id, created_at) VALUES
('ship-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'contract-001', 1, 'VNSGN', 'EGALY', 'MV Saigon Express', 'IMO9876543', 'IN_TRANSIT', 'DEPARTED', 'gov-seed-006', '2026-04-14 08:00:00');

-- Shipment Barcodes (Phase 21: GS1-128 per pallet)
INSERT OR IGNORE INTO shipment_barcodes (id, shipment_ustn, barcode_type, barcode_data, pallet_number, sscc) VALUES
('bc-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'GS1-128', '{"ustn":"SGTX-EG-20260414080000-AB12CD34-V1","pallet":1,"commodity":"520512"}', 1, '00031234567890123456'),
('bc-002', 'SGTX-EG-20260414080000-AB12CD34-V1', 'GS1-128', '{"ustn":"SGTX-EG-20260414080000-AB12CD34-V1","pallet":2,"commodity":"520512"}', 2, '00031234567890123457'),
('bc-003', 'SGTX-EG-20260414080000-AB12CD34-V1', 'QR', '{"ustn":"SGTX-EG-20260414080000-AB12CD34-V1","pallet":3,"commodity":"520512"}', 3, '00031234567890123458'),
('bc-004', 'SGTX-EG-20260414080000-AB12CD34-V1', 'GS1-128', '{"ustn":"SGTX-EG-20260414080000-AB12CD34-V1","pallet":4,"commodity":"520512"}', 4, '00031234567890123459');

-- Document Requirements (Phase 5: auto-generated)
INSERT OR IGNORE INTO shipment_document_requirements (id, shipment_ustn, document_type, status) VALUES
('docreq-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'COMMERCIAL_INVOICE', 'UPLOADED'),
('docreq-002', 'SGTX-EG-20260414080000-AB12CD34-V1', 'PACKING_LIST', 'UPLOADED'),
('docreq-003', 'SGTX-EG-20260414080000-AB12CD34-V1', 'BILL_OF_LADING', 'UPLOADED'),
('docreq-004', 'SGTX-EG-20260414080000-AB12CD34-V1', 'CERTIFICATE_OF_ORIGIN', 'PENDING'),
('docreq-005', 'SGTX-EG-20260414080000-AB12CD34-V1', 'CUSTOMS_DECLARATION', 'PENDING');

-- Shipment Milestones (confirmed milestones)
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, governor_decision_id) VALUES
('ms-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'GATE_IN', '2026-04-14 09:00:00', 'e-004', 'MANUAL', 'gov-seed-007'),
('ms-002', 'SGTX-EG-20260414080000-AB12CD34-V1', 'LOADED', '2026-04-14 16:00:00', 'e-004', 'BARCODE_SCAN', 'gov-seed-007'),
('ms-003', 'SGTX-EG-20260414080000-AB12CD34-V1', 'DEPARTED', '2026-04-15 06:00:00', 'e-004', 'AIS_SIGNAL', 'gov-seed-007');

-- Financing Request (Phase 4: post-contract)
INSERT OR IGNORE INTO financing_requests (id, contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, collateral, status, governor_decision_id, created_at) VALUES
('fin-001', 'contract-001', 't-001', 30000.00, 'USD', 60, 'LC', '{"type":"trade_receivable","value":43500}', 'BIDDING', 'gov-seed-008', '2026-04-14 09:00:00');

-- Financing Offer (blind bid from financier)
INSERT OR IGNORE INTO financing_offers (id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost, conditions, bid_encrypted, status, submitted_at) VALUES
('fo-001', 'fin-001', 't-003', 8.50, 9.25, '{"min_trust_score":70,"insurance_required":true}', 1, 'SUBMITTED', '2026-04-14 14:00:00');

-- Settlement Instruction (Phase 6)
INSERT OR IGNORE INTO settlement_instructions (id, ustn, instruction_type, payload, status, governor_decision_id, created_at) VALUES
('settle-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'PRINCIPAL_PAYMENT', '{"amount":43500,"currency":"USD","beneficiary":"t-002","method":"SWIFT"}', 'PENDING', 'gov-seed-009', '2026-04-16 12:00:00');

-- ESG Assessment
INSERT OR IGNORE INTO esg_assessments (id, entity_gtid, assessment_type, esg_score, environmental_score, social_score, governance_score, carbon_intensity, model_version) VALUES
('esg-001', 'SGTX-DE-LOG-000004-G7H8', 'CARRIER', 78.5, 72.0, 85.0, 78.5, '125.4 gCO2/tkm', 'lightgbm-v1.0'),
('esg-002', 'SGTX-VN-TRD-000002-C3D4', 'FULL', 81.0, 79.0, 82.0, 82.0, NULL, 'lightgbm-v1.0'),
('esg-003', 'SGTX-EG-TRD-000001-A1B2', 'FULL', 74.0, 70.0, 78.0, 74.0, NULL, 'lightgbm-v1.0');

-- Compliance Events
INSERT OR IGNORE INTO compliance_events (id, event_type, entity_gtid, details, severity, resolved, created_at) VALUES
('ce-001', 'SANCTIONS_SCREENING', 'SGTX-EG-TRD-000001-A1B2', '{"result":"CLEAR","lists_checked":["OFAC","EU","UN"]}', 'LOW', 1, '2026-04-13 10:05:00'),
('ce-002', 'KYB_VERIFICATION', 'SGTX-VN-TRD-000002-C3D4', '{"result":"VERIFIED","registry":"Vietnam Business Registry"}', 'LOW', 1, '2026-04-13 10:10:00'),
('ce-003', 'AML_SCREENING', 'SGTX-AE-TRD-000006-K1L2', '{"result":"REVIEW","trigger":"High-value corridor AE-VN"}', 'MEDIUM', 0, '2026-04-14 08:30:00');

-- Compliance Checks
INSERT OR IGNORE INTO compliance_checks (id, check_type, result, flags, checked_at) VALUES
('cc-001', 'SANCTIONS', 'PASS', '["OFAC","EU","UN"]', '2026-04-13 10:05:00'),
('cc-002', 'PEP', 'PASS', '[]', '2026-04-13 10:10:00'),
('cc-003', 'AML', 'REVIEW', '["high_value_corridor"]', '2026-04-14 08:30:00');

-- Audit Log entries
INSERT OR IGNORE INTO audit_log (table_name, record_id, action, before_data, after_data, changed_by, changed_at) VALUES
('tenants', 't-001', 'REGISTER', NULL, '{"gtid":"SGTX-EG-TRD-000001-A1B2"}', 'system', '2026-04-13 09:00:00'),
('trade_requests', 'trade-001', 'CREATE', NULL, '{"status":"PENDING_EXPORTER_RESPONSE"}', 'e-001', '2026-04-13 10:00:00'),
('exporter_quotes', 'quote-001', 'CREATE', NULL, '{"exw_price":35000,"incoterm":"CFR"}', 'e-002', '2026-04-13 12:00:00'),
('contracts', 'contract-001', 'CREATE', NULL, '{"status":"DRAFT","incoterm":"CFR"}', 'e-001', '2026-04-13 14:00:00'),
('contracts', 'contract-001', 'LOCK', '{"status":"DRAFT"}', '{"status":"LOCKED","commission_lock_id":"lock-001"}', 'e-001', '2026-04-13 15:00:00'),
('shipments', 'ship-001', 'CREATE', NULL, '{"ustn":"SGTX-EG-20260414080000-AB12CD34-V1"}', 'e-001', '2026-04-14 08:00:00'),
('shipment_milestones', 'ms-001', 'CREATE', NULL, '{"milestone":"GATE_IN"}', 'e-004', '2026-04-14 09:00:00'),
('shipment_milestones', 'ms-002', 'CREATE', NULL, '{"milestone":"LOADED"}', 'e-004', '2026-04-14 16:00:00'),
('shipment_milestones', 'ms-003', 'CREATE', NULL, '{"milestone":"DEPARTED"}', 'e-004', '2026-04-15 06:00:00');

-- Payment Attempt
INSERT OR IGNORE INTO payment_attempts (id, commission_lock_id, aggregator_id, buyer_country, payment_method, amount_local, currency_local, amount_usd, fx_rate, commission_amount_usd, exporter_amount, psp_fee_usd, status, governor_decision_id, created_at) VALUES
('pay-001', 'lock-001', 'psp-fawry', 'EG', 'BANK_TRANSFER', 43500.00, 'USD', 43500.00, 1.0, 522.00, 42978.00, 8.70, 'COMPLETED', 'gov-seed-009', '2026-04-16 14:00:00');

-- Disruption Prediction
INSERT OR IGNORE INTO disruption_predictions (id, ustn, prediction_type, probability, affected_route, predicted_delay_days, recommendation, ai_model_version, created_at) VALUES
('dp-001', 'SGTX-EG-20260414080000-AB12CD34-V1', 'PORT_CONGESTION', 0.35, 'EGALY', 2, 'Monitor Suez Canal traffic. Alternative: Port Said routing.', 'gdacs-v1.0', '2026-04-15 08:00:00');

-- Marketplace Partner
INSERT OR IGNORE INTO marketplace_partners (id, partner_name, api_key_hash, commission_split_percent, active) VALUES
('mp-001', 'TradeWind B2B', 'sha256:tradewind-key', 0.5, 1);

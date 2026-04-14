-- ============================================================
-- SGTX PLATFORM v6.1 — Seed Data
-- ============================================================

-- Jurisdictions (Global Coverage Matrix)
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
('KP', 'North Korea', 'BLOCKED', 'N/A', 4, 'NONE', '[]', '{}'),
('IR', 'Iran', 'BLOCKED', 'CBI', 4, 'NONE', '[]', '{}'),
('SY', 'Syria', 'BLOCKED', 'CBS', 4, 'NONE', '[]', '{}'),
('CU', 'Cuba', 'BLOCKED', 'BCC', 4, 'NONE', '[]', '{}'),
('RU', 'Russia', 'BLOCKED', 'CBR', 4, 'NONE', '[]', '{}'),
('BY', 'Belarus', 'BLOCKED', 'NBRB', 4, 'NONE', '[]', '{}'),
('IQ', 'Iraq', 'HIGH_RISK', 'CBI', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('AF', 'Afghanistan', 'HIGH_RISK', 'DAB', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('YE', 'Yemen', 'HIGH_RISK', 'CBY', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('LB', 'Lebanon', 'HIGH_RISK', 'BDL', 3, 'NONE', '["Bank only"]', '{"enhanced_dd":true}'),
('PK', 'Pakistan', 'HIGH_RISK', 'SBP', 3, 'NONE', '["Bank only","JazzCash"]', '{"enhanced_dd":true}'),
('VN', 'Vietnam', 'NONE', 'SBV', 2, 'NONE', '["VNPay","Payoneer"]', '{"sbv_report":true}'),
('JP', 'Japan', 'NONE', 'FSA', 2, 'RESEARCH', '["Stripe","Adyen"]', '{"fsa_report":true}');

-- Payment Aggregators
INSERT OR IGNORE INTO payment_aggregators (id, name, country_codes, supported_currencies, supports_split, uptime_score, is_active) VALUES
('psp-stripe', 'Stripe', '["US","GB","DE","SG","JP","BR","AU"]', '["USD","GBP","EUR","SGD","JPY","BRL"]', 1, 0.9995, 1),
('psp-adyen', 'Adyen', '["DE","GB","SG","AE","JP","FR","NL"]', '["EUR","GBP","SGD","AED","JPY"]', 1, 0.9990, 1),
('psp-fawry', 'Fawry', '["EG"]', '["EGP","USD"]', 1, 0.9950, 1),
('psp-payoneer', 'Payoneer', '["AE","EG","VN","SA","NG"]', '["USD","AED","EGP","VND"]', 1, 0.9970, 1),
('psp-flutterwave', 'Flutterwave', '["NG","KE","ZA","GH"]', '["NGN","KES","ZAR","GHS","USD"]', 1, 0.9940, 1),
('psp-razorpay', 'RazorpayX', '["IN"]', '["INR","USD"]', 1, 0.9980, 1),
('psp-mpesa', 'M-Pesa', '["KE","TZ","MZ"]', '["KES","TZS"]', 0, 0.9930, 1),
('psp-mercury', 'Mercury', '["US"]', '["USD"]', 1, 0.9990, 1);

-- Legal Disclaimer (displayed every login & contract lock)
INSERT OR IGNORE INTO legal_disclaimers (id, disclaimer_text, version, effective_date) VALUES
('ld-001', 'SGTX is a non-custodial platform headquartered in New Jersey, USA. We do NOT hold funds, process payments, or act as a financial institution. Users bear 100% compliance responsibility. Maximum liability is limited to commissions paid in the last 12 months.', '1.0', '2026-04-13');

-- Demo Tenants
INSERT OR IGNORE INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier, cryptographic_hash, risk_score, sanctions_cleared) VALUES
('t-001', 'SGTX-EG-TRD-000001-A1B2', 'Cairo Imports Co.', 'EG', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo1', 25.50, 1),
('t-002', 'SGTX-VN-TRD-000002-C3D4', 'Saigon Textiles Export JSC', 'VN', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo2', 15.30, 1),
('t-003', 'SGTX-SG-FIN-000003-E5F6', 'Asia Trade Finance Pte Ltd', 'SG', 'FINANCIAL', 'VERIFIED', 3, 'sha256:demo3', 10.00, 1),
('t-004', 'SGTX-DE-LOG-000004-G7H8', 'Hamburg Logistics GmbH', 'DE', 'LOGISTICS', 'VERIFIED', 2, 'sha256:demo4', 12.00, 1),
('t-005', 'SGTX-US-TRD-000005-I9J0', 'SGTX Platform Inc.', 'US', 'CORPORATE', 'VERIFIED', 3, 'sha256:platform', 5.00, 1),
('t-006', 'SGTX-AE-TRD-000006-K1L2', 'Dubai Fresh Produce LLC', 'AE', 'CORPORATE', 'VERIFIED', 2, 'sha256:demo6', 18.00, 1),
('t-007', 'SGTX-GB-QC-000007-M3N4', 'London QC Services Ltd', 'GB', 'QUALITY_CONTROL', 'VERIFIED', 2, 'sha256:demo7', 8.50, 1);

-- Demo Employees (password: demo123 -> hash placeholder)
INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, kyc_status, status, mfa_enabled, password_hash) VALUES
('e-001', 't-001', 'ahmed@cairoimports.com', 'Ahmed Hassan', 'VERIFIED', 'ACTIVE', 1, '$demo$ahmed'),
('e-002', 't-002', 'nguyen@saigontextiles.vn', 'Nguyen Van Minh', 'VERIFIED', 'ACTIVE', 1, '$demo$nguyen'),
('e-003', 't-003', 'sarah@asiatradefinance.sg', 'Sarah Chen', 'VERIFIED', 'ACTIVE', 1, '$demo$sarah'),
('e-004', 't-004', 'klaus@hamburglogistics.de', 'Klaus Weber', 'VERIFIED', 'ACTIVE', 1, '$demo$klaus'),
('e-005', 't-005', 'admin@sgtx.io', 'SGTX Admin', 'VERIFIED', 'ACTIVE', 1, '$demo$admin'),
('e-006', 't-006', 'omar@dubaifresh.ae', 'Omar Al-Rashid', 'VERIFIED', 'ACTIVE', 1, '$demo$omar'),
('e-007', 't-007', 'james@londonqc.co.uk', 'James Powell', 'VERIFIED', 'ACTIVE', 1, '$demo$james');

-- Trust Scores
INSERT OR IGNORE INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score) VALUES
('SGTX-EG-TRD-000001-A1B2', 82.00, 'xgboost-v1.0', '{"payment_history":88,"delivery_record":79,"dispute_rate":85,"document_accuracy":76}', 82.00, 0),
('SGTX-VN-TRD-000002-C3D4', 91.00, 'xgboost-v1.0', '{"payment_history":93,"delivery_record":92,"dispute_rate":88,"document_accuracy":91}', 0, 91.00),
('SGTX-SG-FIN-000003-E5F6', 95.00, 'xgboost-v1.0', '{"regulatory_compliance":98,"capital_adequacy":94,"response_time":93}', 0, 0),
('SGTX-DE-LOG-000004-G7H8', 88.00, 'xgboost-v1.0', '{"on_time_delivery":90,"damage_rate":92,"communication":82}', 0, 0),
('SGTX-AE-TRD-000006-K1L2', 79.00, 'xgboost-v1.0', '{"payment_history":75,"delivery_record":82,"dispute_rate":80}', 79.00, 0);

-- Demo Roles
INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions) VALUES
('r-001', 't-001', 'Trade Manager', '["trade.request.create","quote.submit","contract.sign","shipment.milestone.confirm"]'),
('r-002', 't-002', 'Export Manager', '["quote.submit","contract.sign","shipment.milestone.confirm","document.upload"]'),
('r-003', 't-003', 'Finance Analyst', '["financing.request.create","financing.offer.submit","settlement.confirm"]'),
('r-004', 't-004', 'Logistics Coordinator', '["shipment.milestone.confirm","document.upload","provider.status.update"]'),
('r-005', 't-005', 'Platform Admin', '["*"]');

-- Tenant Contacts (Network)
INSERT OR IGNORE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, trade_count, total_value, first_interaction, last_interaction, is_favorite) VALUES
('t-001', 'SGTX-VN-TRD-000002-C3D4', 'EXPORTER', 12, 1250000.00, '2025-01-15', '2026-04-10', 1),
('t-001', 'SGTX-DE-LOG-000004-G7H8', 'LOGISTICS', 8, 0, '2025-03-01', '2026-04-08', 0),
('t-002', 'SGTX-EG-TRD-000001-A1B2', 'IMPORTER', 12, 1250000.00, '2025-01-15', '2026-04-10', 1),
('t-006', 'SGTX-VN-TRD-000002-C3D4', 'EXPORTER', 3, 450000.00, '2025-09-20', '2026-03-15', 0);

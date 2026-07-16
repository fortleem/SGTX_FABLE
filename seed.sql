-- SGTX Platform Seed Data - Demo/Pilot Environment
-- Egyptian agricultural export focus (Phase 1 per blueprint)

-- Jurisdictions
INSERT OR IGNORE INTO jurisdictions (code, name, sanctions_level, defi_allowed, distressed_sale_allowed, kyc_tier_required, deferred_fees_allowed, private_lending_allowed) VALUES
('EG', 'Egypt', 'LOW', 0, 'ALLOWED', 2, '["IMPORT_DUTIES","VAT"]', 0),
('DE', 'Germany', 'LOW', 1, 'ALLOWED', 2, '["IMPORT_DUTIES"]', 1),
('AE', 'United Arab Emirates', 'LOW', 1, 'ALLOWED', 2, '[]', 1),
('VN', 'Vietnam', 'LOW', 1, 'ALLOWED', 2, '[]', 1),
('NG', 'Nigeria', 'MEDIUM', 0, 'CONDITIONAL', 3, '["IMPORT_DUTIES","VAT"]', 1),
('US', 'United States', 'LOW', 0, 'ALLOWED', 2, '[]', 1);

-- Ports
INSERT OR IGNORE INTO ports (unlocode, name, country_code, latitude, longitude) VALUES
('EGALY', 'Alexandria Port', 'EG', 31.2000, 29.9167),
('EGDAM', 'Damietta Port', 'EG', 31.4167, 31.8167),
('EGPSD', 'Port Said', 'EG', 31.2567, 32.3017),
('EGSOK', 'Sokhna Port', 'EG', 29.6500, 32.3500),
('DEHAM', 'Hamburg Port', 'DE', 53.5511, 9.9937),
('DEBRV', 'Bremerhaven', 'DE', 53.5500, 8.5833),
('AEDXB', 'Jebel Ali Port', 'AE', 25.0000, 55.0500),
('VNSGN', 'Ho Chi Minh City', 'VN', 10.7667, 106.7167);

-- Demo Tenants (with kyb_status, onboarding_completed, sandbox_mode)
INSERT OR IGNORE INTO tenants (gtid, legal_name, legal_name_ar, type, jurisdiction, trust_score, sanctions_cleared, lifecycle_state, default_trader_mode, kyb_tier, kyb_status, onboarding_completed, sandbox_mode) VALUES
('SGTX-EG-TRD-002139-7F3A', 'Nile Foods Export Co.', 'شركة نايل فودز للتصدير', 'TRD', 'EG', 92.5, 1, 'ACTIVE', 'SELL', 2, 'VERIFIED', 1, 0),
('SGTX-DE-TRD-001234-5B6C', 'European Importer GmbH', NULL, 'TRD', 'DE', 88.3, 1, 'ACTIVE', 'BUY', 2, 'VERIFIED', 1, 0),
('SGTX-EG-TRD-003456-8A2B', 'Pharaoh AgriTrade', 'فرعون أجري تريد', 'TRD', 'EG', 85.0, 1, 'ACTIVE', 'DUAL', 2, 'VERIFIED', 1, 0),
('SGTX-AE-TRD-007890-3C1D', 'Dubai Fresh Imports LLC', NULL, 'TRD', 'AE', 90.1, 1, 'ACTIVE', 'BUY', 2, 'VERIFIED', 1, 0),
('SGTX-VN-TRD-005678-9E4F', 'Mekong Fresh Co.', NULL, 'TRD', 'VN', 78.4, 1, 'ACTIVE', 'SELL', 2, 'VERIFIED', 1, 0),
('SGTX-EG-LSP-001100-1A2B', 'Nile Logistics Solutions', 'نايل لوجيستكس', 'LSP', 'EG', 87.0, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-SHIP-002200-3C4D', 'Med Shipping Lines', NULL, 'SHIP', 'EG', 82.5, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-LAB-003300-5E6F', 'Cairo Labs International', 'معامل القاهرة الدولية', 'LAB', 'EG', 94.0, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-QC-004400-7A8B', 'QualityCheck Egypt', NULL, 'QC', 'EG', 89.0, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-CBR-005500-9C0D', 'Delta Customs Brokers', 'دلتا للوساطة الجمركية', 'CBR', 'EG', 86.5, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-FIN-006600-1E2F', 'National Bank of Egypt Trade Finance', 'البنك الأهلي المصري - تمويل التجارة', 'FIN', 'EG', 95.0, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-AE-FIN-007700-3A4B', 'Gulf Private Capital Ltd', NULL, 'FIN', 'AE', 75.0, 1, 'ACTIVE', NULL, 2, 'VERIFIED', 1, 0),
('SGTX-EG-GOV-008800-5C6D', 'Egyptian Customs Authority', 'مصلحة الجمارك المصرية', 'GOV', 'EG', 100.0, 1, 'ACTIVE', NULL, 3, 'VERIFIED', 1, 0),
('SGTX-EG-GOV-009900-7E8F', 'Ministry of Agriculture Egypt', 'وزارة الزراعة المصرية', 'GOV', 'EG', 100.0, 1, 'ACTIVE', NULL, 3, 'VERIFIED', 1, 0),
('SGTX-ADM-000001-0A1B', 'SGTX Platform Governance Authority', NULL, 'TRD', 'EG', 100.0, 1, 'ACTIVE', 'DUAL', 3, 'VERIFIED', 1, 0);

-- Update financier subtype
UPDATE tenants SET financier_subtype = 'BANK' WHERE gtid = 'SGTX-EG-FIN-006600-1E2F';
UPDATE tenants SET financier_subtype = 'PRIVATE' WHERE gtid = 'SGTX-AE-FIN-007700-3A4B';
UPDATE tenants SET lsp_subtype = 'FORWARDER' WHERE gtid = 'SGTX-EG-LSP-001100-1A2B';

-- Demo Employees (password: demo123 for all, admin123 for admin)
-- demo123 hash: sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791
-- admin123 hash: sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT OR IGNORE INTO employees (tenant_id, email, full_name, password_hash, role, status, active_trader_mode_context, default_trader_mode, allow_role_switching) VALUES
(1, 'ahmed@nilefoods.com', 'Ahmed Hassan', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', 'SELL', 'SELL', 1),
(1, 'mona@nilefoods.com', 'Mona El-Sayed', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'VIEWER', 'ACTIVE', 'SELL', 'SELL', 0),
(2, 'hans@euimport.com', 'Hans Mueller', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', 'BUY', 'BUY', 1),
(3, 'khaled@pharaohagri.com', 'Khaled Mahmoud', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', 'DUAL', 'DUAL', 1),
(4, 'omar@dubaifresh.com', 'Omar Al-Rashid', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', 'BUY', 'BUY', 0),
(5, 'linh@mekongfresh.com', 'Linh Nguyen', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', 'SELL', 'SELL', 1),
(6, 'yasser@nilelogistics.com', 'Yasser Ibrahim', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(7, 'captain@medshipping.com', 'Captain Adel Soliman', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(8, 'dr.samir@cairolabs.com', 'Dr. Samir Naguib', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(9, 'noha@qualitycheck.com', 'Noha Fathy', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(10, 'mohamed@deltabrokers.com', 'Mohamed Adel', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(11, 'fatma@nbe.com.eg', 'Fatma El-Shazly', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(12, 'rashid@gulfcapital.com', 'Rashid Al-Mansoori', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(13, 'general.ibrahim@customs.gov.eg', 'General Ibrahim Fawzy', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(14, 'dr.heba@agri.gov.eg', 'Dr. Heba Salem', 'sha256:d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN', 'ACTIVE', NULL, NULL, 0),
(15, 'admin@sgtx.io', 'SGTX Admin', 'sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'PLATFORM_ADMIN', 'ACTIVE', 'DUAL', 'DUAL', 1);

-- Roles
INSERT OR IGNORE INTO roles (tenant_id, name, permissions) VALUES
(1, 'Admin', '["trade.create","trade.manage","contract.sign","finance.request","documents.upload","company.manage","employees.manage"]'),
(1, 'Viewer', '["trade.view","documents.view"]'),
(2, 'Admin', '["trade.create","trade.manage","contract.sign","documents.view","company.manage"]'),
(11, 'Loan Officer', '["financing.view","financing.bid","financing.manage","portfolio.view","margin_call.issue"]'),
(13, 'Senior Officer', '["trade.monitor","clearance.approve","clearance.override","documents.verify","audit.view","compliance.view","anonymous_trade.declassification"]'),
(15, 'Platform Admin', '["*"]');

-- Platform Configuration
INSERT OR IGNORE INTO platform_config (config_key, config_value, description) VALUES
('platform.name', 'SGTX Platform', 'Platform display name'),
('platform.version', '11.0', 'Blueprint version'),
('fee.default_rate', '0.015', 'Default SGTX fee rate (1.5%)'),
('fee.financing_rate', '0.0025', 'Financing facilitation fee (0.25%)'),
('fee.currency', 'USD', 'Default fee currency'),
('governor.auto_clearance_threshold', '30', 'Risk score below which auto-clearance applies'),
('shipment.health_weights', '{"compliance":0.20,"documentation":0.20,"logistics":0.15,"payment":0.15,"risk":0.20,"timeline":0.10}', 'Trade Health Score component weights'),
('auth.session_ttl_minutes', '900', 'Session TTL in minutes (15 hours)'),
('auth.jwt_ttl_minutes', '15', 'JWT TTL in minutes');

-- Jurisdiction Matrix
INSERT OR IGNORE INTO jurisdiction_matrix (country_code, module_name, enabled, config) VALUES
('EG', 'auto_clearance', 1, '{"threshold":30}'),
('EG', 'multi_agency_workflow', 1, '{"agencies":["customs","agriculture","health"]}'),
('EG', 'anonymous_trade', 1, '{}'),
('EG', 'nafeza_integration', 1, '{"api_url":"https://nafeza.gov.eg/api/v1"}'),
('EG', 'defi_financing', 0, '{"reason":"Law No. 194 of 2020"}'),
('EG', 'private_lending', 0, '{"reason":"Law No. 194 of 2020"}'),
('DE', 'auto_clearance', 1, '{"threshold":25}'),
('AE', 'defi_financing', 1, '{}'),
('AE', 'private_lending', 1, '{}'),
('VN', 'defi_financing', 1, '{}');

-- Document Templates
INSERT OR IGNORE INTO document_templates (template_type, name, jurisdiction, template_text, required_fields) VALUES
('COMMERCIAL_INVOICE', 'Commercial Invoice', NULL, 'COMMERCIAL INVOICE\n\nSeller: {{seller_name}}\nBuyer: {{buyer_name}}\nDate: {{date}}\n\nDescription: {{description}}\nQuantity: {{quantity}}\nUnit Price: {{unit_price}}\nTotal: {{total_amount}}\n\nIncoterm: {{incoterm}}\nPayment Terms: {{payment_terms}}', '["seller_name","buyer_name","description","quantity","unit_price","total_amount","incoterm"]'),
('PACKING_LIST', 'Packing List', NULL, 'PACKING LIST\n\nShipper: {{shipper_name}}\nConsignee: {{consignee_name}}\n\nItem | Description | Quantity | Net Weight | Gross Weight\n{{items}}', '["shipper_name","consignee_name","items"]'),
('CERTIFICATE_OF_ORIGIN', 'Certificate of Origin', NULL, 'CERTIFICATE OF ORIGIN\n\nCountry of Origin: {{country}}\nExporter: {{exporter_name}}\nImporter: {{importer_name}}\nHS Code: {{hs_code}}\n\nThis is to certify that the goods described above originate from {{country}}.', '["country","exporter_name","hs_code"]'),
('BILL_OF_LADING', 'Bill of Lading', NULL, 'BILL OF LADING\n\nVessel: {{vessel}}\nVoyage: {{voyage}}\nPort of Loading: {{loading_port}}\nPort of Discharge: {{discharge_port}}\n\nContainer: {{container}}\nDescription: {{description}}\nGross Weight: {{weight}}', '["vessel","loading_port","discharge_port","container","description"]');

-- ═══════════════════════════════════════════════════════════════════
-- TRADE REQUESTS — Full workflow seed data for seller portal demo
-- Nile Foods (tenant 1) as seller, European Importer (tenant 2) / Dubai Fresh (tenant 4) as buyers
-- ═══════════════════════════════════════════════════════════════════

-- Trade 1: PENDING_EXPORTER_RESPONSE — New incoming request for seller
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, created_by, created_at, updated_at) VALUES
('TRD-SELL-001', 2, 1, 'Valencia Oranges, 40RF, Grade A, 24MT', '{"commodity":"Valencia Oranges","grade":"A","variety":"Valencia","caliber":"72-88mm"}', '{"moisture":"<14%","brix":">=11","defects":"<5%"}', 'PENDING_EXPORTER_RESPONSE', 'Valencia Oranges', 28800, 24, 'MT', 1, '40RF', 'EGALY', 'DEHAM', 'CFR', 'hans@euimport.com', datetime('now','-2 days'), datetime('now','-2 days'));

-- Trade 2: PENDING_EXPORTER_RESPONSE — Another incoming request
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, created_by, created_at, updated_at) VALUES
('TRD-SELL-002', 4, 1, 'Medjool Dates, Premium, 20MT', '{"commodity":"Medjool Dates","grade":"Premium","size":"Large"}', '{"moisture":"<22%","sugar":">=65%","defects":"<2%"}', 'PENDING_EXPORTER_RESPONSE', 'Medjool Dates', 64000, 20, 'MT', 1, '40RF', 'EGALY', 'AEDXB', 'FOB', 'omar@dubaifresh.com', datetime('now','-1 day'), datetime('now','-1 day'));

-- Trade 3: PENDING_EXPORTER_RESPONSE — Third request, multi-container
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, created_by, created_at, updated_at) VALUES
('TRD-SELL-003', 2, 1, 'Egyptian Strawberries, Class I, 3x40RF', '{"commodity":"Strawberries","class":"I","variety":"Festival"}', '{"size":"28-32mm","color":"75% red min","firmness":"firm"}', 'PENDING_EXPORTER_RESPONSE', 'Strawberries', 96000, 72, 'MT', 3, '40RF', 'EGDAM', 'DEBRV', 'CIF', 'hans@euimport.com', datetime('now','-6 hours'), datetime('now','-6 hours'));

-- Trade 4: ACCEPTED / PRICING — Seller accepted, needs EXW price lock
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, created_by, created_at, updated_at) VALUES
('TRD-SELL-004', 2, 1, 'Navel Oranges, Export Grade, 2x40RF', '{"commodity":"Navel Oranges","grade":"Export","caliber":"64-80mm"}', '{"brix":">=10","acid":"<=1.2%","juice":">=35%"}', 'ACCEPTED', 'Navel Oranges', 48000, 48, 'MT', 2, '40RF', 'EGALY', 'DEHAM', 'CFR', NULL, NULL, 'hans@euimport.com', datetime('now','-5 days'), datetime('now','-3 days'));

-- Trade 5: PRICING — EXW price being set
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, created_by, created_at, updated_at) VALUES
('TRD-SELL-005', 4, 1, 'Egyptian Table Grapes, Flame Seedless, 40RF', '{"commodity":"Table Grapes","variety":"Flame Seedless","grade":"Extra"}', '{"berry_size":">=18mm","color":"deep_red","brix":">=16"}', 'PRICING', 'Table Grapes', 52000, 22, 'MT', 1, '40RF', 'EGALY', 'AEDXB', 'EXW', 2200, 48400, 'omar@dubaifresh.com', datetime('now','-7 days'), datetime('now','-2 days'));

-- Trade 6: QUOTED — Quote submitted, awaiting buyer response
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, exw_locked, logistics_cost, sgtx_fee, quote_deadline, created_by, created_at, updated_at) VALUES
('TRD-SELL-006', 2, 1, 'Fresh Green Beans, Fine, 2x40RF', '{"commodity":"Green Beans","grade":"Fine","type":"Bobby"}', '{"length":"12-14cm","color":"dark_green","moisture":"<90%"}', 'QUOTED', 'Green Beans', 76000, 44, 'MT', 2, '40RF', 'EGALY', 'DEHAM', 'CFR', 1500, 66000, 1, 8500, 1140, datetime('now','+48 hours'), 'ahmed@nilefoods.com', datetime('now','-10 days'), datetime('now','-1 day'));

-- Trade 7: CONTRACTED — Contract signed, in packing/containerisation phase
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, exw_locked, packing_locked, logistics_cost, sgtx_fee, created_by, created_at, updated_at) VALUES
('TRD-SELL-007', 2, 1, 'Pomegranate, Wonderful variety, 40RF', '{"commodity":"Pomegranate","variety":"Wonderful","size":"Large"}', '{"weight":"350-500g","color":"deep_red","arils":"ruby_red","brix":">=15"}', 'CONTRACTED', 'Pomegranate', 42000, 22, 'MT', 1, '40RF', 'EGALY', 'DEHAM', 'CFR', 1800, 39600, 1, 0, 3200, 630, 'ahmed@nilefoods.com', datetime('now','-15 days'), datetime('now','-3 days'));

-- Trade 8: CONTRACTED — In logistics/doc finalisation phase (packing locked)
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, exw_locked, packing_locked, logistics_cost, sgtx_fee, created_by, created_at, updated_at) VALUES
('TRD-SELL-008', 4, 1, 'Fresh Artichokes, Egyptian, 2x40RF', '{"commodity":"Artichokes","variety":"Egyptian Globe","grade":"Class I"}', '{"head_size":">=8cm","color":"green","freshness":"max_2_days_post_harvest"}', 'CONTRACTED', 'Artichokes', 58000, 40, 'MT', 2, '40RF', 'EGDAM', 'AEDXB', 'CIF', 1300, 52000, 1, 1, 5200, 870, 'ahmed@nilefoods.com', datetime('now','-20 days'), datetime('now','-5 days'));

-- Trade 9: IN_TRANSIT — Shipped, tracking active
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, exw_locked, packing_locked, logistics_cost, sgtx_fee, created_by, created_at, updated_at) VALUES
('TRD-SELL-009', 2, 1, 'Egyptian Jasmine Rice, Long Grain, 40ST', '{"commodity":"Jasmine Rice","type":"Long Grain","origin":"Dakahlia"}', '{"moisture":"<14%","broken":"<5%","purity":">=95%"}', 'IN_TRANSIT', 'Jasmine Rice', 32000, 24, 'MT', 1, '40ST', 'EGDAM', 'DEHAM', 'CFR', 1200, 28800, 1, 1, 2800, 480, 'ahmed@nilefoods.com', datetime('now','-25 days'), datetime('now','-8 days'));

-- Trade 10: COMPLETED — Fully delivered trade
INSERT OR IGNORE INTO trade_requests (id, importer_tenant_id, assigned_exporter_id, raw_description, parsed_specs, specifications, status, commodity, total_value, quantity, weight_unit, container_count, container_type, origin_port, destination_port, incoterm, exw_price_per_ton, exw_total, exw_locked, packing_locked, logistics_cost, sgtx_fee, created_by, created_at, updated_at) VALUES
('TRD-SELL-010', 4, 1, 'Egyptian Cotton, Extra Long Staple, 40ST', '{"commodity":"Egyptian Cotton","type":"ELS Giza 96","length":"36mm+"}', '{"grade":"Good+","staple":"36mm+","micronaire":"3.5-4.9","strength":">=32"}', 'COMPLETED', 'Egyptian Cotton', 120000, 20, 'MT', 1, '40ST', 'EGALY', 'AEDXB', 'FOB', 5500, 110000, 1, 1, 8500, 1800, 'ahmed@nilefoods.com', datetime('now','-45 days'), datetime('now','-15 days'));

-- Exporter Quotes for trades that have been quoted
INSERT OR IGNORE INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status) VALUES
('EQ-006', 'TRD-SELL-006', 1, 1500, 'USD', datetime('now','-1 day'), 'CFR', 7, 'SUBMITTED'),
('EQ-007', 'TRD-SELL-007', 1, 1800, 'USD', datetime('now','-5 days'), 'CFR', 14, 'ACCEPTED'),
('EQ-008', 'TRD-SELL-008', 1, 1300, 'USD', datetime('now','-10 days'), 'CIF', 14, 'ACCEPTED'),
('EQ-009', 'TRD-SELL-009', 1, 1200, 'USD', datetime('now','-15 days'), 'CFR', 14, 'ACCEPTED'),
('EQ-010', 'TRD-SELL-010', 1, 5500, 'USD', datetime('now','-40 days'), 'FOB', 14, 'ACCEPTED');

-- Contracts for contracted/shipped trades
INSERT OR IGNORE INTO contracts (id, trade_request_id, contract_type, incoterm, status, commission_responsibility, created_at, updated_at) VALUES
('CTR-007', 'TRD-SELL-007', 'SINGLE_SHIPMENT', 'CFR', 'ACTIVE', '{"default_payer":"IMPORTER"}', datetime('now','-10 days'), datetime('now','-3 days')),
('CTR-008', 'TRD-SELL-008', 'SINGLE_SHIPMENT', 'CIF', 'ACTIVE', '{"default_payer":"IMPORTER"}', datetime('now','-15 days'), datetime('now','-5 days')),
('CTR-009', 'TRD-SELL-009', 'SINGLE_SHIPMENT', 'CFR', 'ACTIVE', '{"default_payer":"IMPORTER"}', datetime('now','-22 days'), datetime('now','-8 days')),
('CTR-010', 'TRD-SELL-010', 'SINGLE_SHIPMENT', 'FOB', 'COMPLETED', '{"default_payer":"IMPORTER"}', datetime('now','-40 days'), datetime('now','-15 days'));

-- Shipments for in-transit and completed trades
INSERT OR IGNORE INTO shipments (id, ustn, contract_id, origin_port, destination_port, vessel_name, imo_number, status, departure_date, eta, created_at) VALUES
('SHP-009', 'SGTX-EG-26-F3A-9', 'CTR-009', 'EGDAM', 'DEHAM', 'MSC OSCAR', '9703318', 'IN_TRANSIT', datetime('now','-8 days'), datetime('now','+6 days'), datetime('now','-8 days')),
('SHP-010', 'SGTX-EG-26-F3A-10', 'CTR-010', 'EGALY', 'AEDXB', 'EVER GIVEN', '9811000', 'DELIVERED', datetime('now','-35 days'), datetime('now','-20 days'), datetime('now','-35 days'));

-- Smart Inbox items for seller
INSERT OR IGNORE INTO inbox_items (id, tenant_id, category, title, message, priority_score, action_type, action_page, reference_id, status, created_at) VALUES
('INB-S001', 1, 'TRADE', 'New Trade Request: Valencia Oranges', 'European Importer GmbH has requested 24 MT Valencia Oranges (CFR Hamburg). Respond within 48 hours.', 95, 'REVIEW_REQUEST', 'pending-requests', 'TRD-SELL-001', 'UNREAD', datetime('now','-2 days')),
('INB-S002', 1, 'TRADE', 'New Trade Request: Medjool Dates', 'Dubai Fresh Imports has requested 20 MT Medjool Dates (FOB Alexandria). Premium grade required.', 90, 'REVIEW_REQUEST', 'pending-requests', 'TRD-SELL-002', 'UNREAD', datetime('now','-1 day')),
('INB-S003', 1, 'TRADE', 'Urgent: Strawberries 3×40RF Request', 'European Importer requests 72 MT Strawberries (CIF Bremerhaven). Multi-container — 3×40RF.', 98, 'REVIEW_REQUEST', 'pending-requests', 'TRD-SELL-003', 'UNREAD', datetime('now','-6 hours')),
('INB-S004', 1, 'COMPLIANCE', 'EXW Price Lock Required: Navel Oranges', 'Trade TRD-SELL-004 accepted. Set your EXW price to proceed with quote building.', 85, 'SET_PRICE', 'exw-price-lock', 'TRD-SELL-004', 'UNREAD', datetime('now','-3 days')),
('INB-S005', 1, 'DOCUMENT', 'Packing Plan: Pomegranate — Action Required', 'Contract CTR-007 for Pomegranate needs packing plan. Lock required before shipping.', 80, 'PACK', 'containerisation', 'TRD-SELL-007', 'UNREAD', datetime('now','-2 days')),
('INB-S006', 1, 'DOCUMENT', 'Document Finalisation: Artichokes', 'Contract CTR-008 — 4 of 6 documents are ready. Phytosanitary and Fumigation certificates pending.', 75, 'SIGN_DOCS', 'doc-finalisation', 'TRD-SELL-008', 'READ', datetime('now','-4 days')),
('INB-S007', 1, 'LOGISTICS', 'Vessel Tracking: MSC OSCAR — Jasmine Rice', 'Shipment SHP-009 is in transit. ETA Hamburg: ' || datetime('now','+6 days'), 60, 'TRACK', 'shipments-vault', 'SHP-009', 'READ', datetime('now','-5 days')),
('INB-S008', 1, 'FINANCE', 'Payment Received: Egyptian Cotton', 'Full payment of $120,000 received for Trade TRD-SELL-010. Settlement complete.', 40, 'VIEW', 'cash-position', 'TRD-SELL-010', 'READ', datetime('now','-14 days'));

-- Laboratories for Lab Selection tab
INSERT OR IGNORE INTO laboratories (id, name, country_code, city, accreditation, price_tier, rating, turnaround_days, rush_available, sgtx_verified, specialisations, testing_capabilities, contact_email, website, created_at) VALUES
('LAB-001', 'SGS Egypt', 'EG', 'Cairo', 'ISO 17025:2017', 'PREMIUM', 4.8, 5, 1, 1, '["Fresh Produce","Grains","Spices","Seafood"]', '["Pesticide Residue","Microbiological","Heavy Metals","Aflatoxin","Moisture"]', 'egypt@sgs.com', 'https://www.sgs.com/egypt', datetime('now','-180 days')),
('LAB-002', 'Bureau Veritas Egypt', 'EG', 'Alexandria', 'ISO 17025:2017', 'PREMIUM', 4.6, 4, 1, 1, '["Fresh Produce","Textiles","Chemicals"]', '["Physical Analysis","Chemical Analysis","Microbiological","Shelf Life"]', 'alex@bureauveritas.com', 'https://www.bureauveritas.com', datetime('now','-180 days')),
('LAB-003', 'Central Lab for Food Safety', 'EG', 'Cairo', 'EGAC Accredited', 'STANDARD', 4.2, 7, 0, 1, '["Fresh Produce","Dairy","Meat","Processed Foods"]', '["Microbiological","Chemical Residues","Nutritional Analysis","Shelf Life"]', 'clfs@gov.eg', NULL, datetime('now','-180 days')),
('LAB-004', 'Al-Azhar University Lab', 'EG', 'Cairo', 'University Accredited', 'BUDGET', 3.9, 10, 0, 0, '["Grains","Spices","Tea"]', '["Aflatoxin","Moisture","Pesticide Residue","Heavy Metals"]', 'lab@azhar.edu.eg', NULL, datetime('now','-180 days')),
('LAB-005', 'Eurofins Scientific Egypt', 'EG', 'Cairo', 'ISO 17025:2017 + ISO 22000', 'PREMIUM', 4.9, 3, 1, 1, '["Fresh Produce","Coffee","Cocoa","Nuts","Seafood"]', '["Pesticide Residue","Mycotoxins","Allergens","GMO","Nutritional","Microbiological","Heavy Metals"]', 'cairo@eurofins.com', 'https://www.eurofins.com', datetime('now','-180 days'));

-- Lab Test Types
INSERT OR IGNORE INTO lab_test_types (id, name, category, description, typical_duration_days, typical_cost_usd, is_mandatory) VALUES
('LTT-001', 'Pesticide Residue Analysis', 'SAFETY', 'Multi-residue analysis for 400+ pesticides per EU MRL limits', 5, 350, 1),
('LTT-002', 'Microbiological Testing', 'SAFETY', 'E.coli, Salmonella, Listeria, Total Plate Count, Yeast & Mold', 3, 200, 1),
('LTT-003', 'Heavy Metal Analysis', 'SAFETY', 'Lead, Cadmium, Mercury, Arsenic per Codex/EU limits', 4, 250, 1),
('LTT-004', 'Aflatoxin Analysis', 'SAFETY', 'Aflatoxin B1, B2, G1, G2 and total aflatoxin', 3, 180, 0),
('LTT-005', 'Moisture Content', 'QUALITY', 'Karl Fischer / Oven drying moisture determination', 1, 60, 0),
('LTT-006', 'Brix / Sugar Content', 'QUALITY', 'Refractometer brix measurement for fruits', 1, 50, 0),
('LTT-007', 'Shelf Life Study', 'QUALITY', 'Accelerated shelf life testing under controlled conditions', 14, 800, 0),
('LTT-008', 'Phytosanitary Compliance', 'REGULATORY', 'Plant health inspection per ISPM-15 and destination country requirements', 2, 150, 1),
('LTT-009', 'Nutritional Analysis', 'LABELING', 'Full nutritional panel per Codex/EU/FDA requirements', 7, 400, 0),
('LTT-010', 'Fumigation Certificate', 'REGULATORY', 'Methyl bromide or phosphine fumigation verification', 1, 120, 0);

-- Packing Plans for contracted trades
INSERT OR IGNORE INTO packing_plans (id, trade_request_id, container_type, gross_weight_kg, net_weight_kg, pallet_count, pallet_weight_kg, packaging_weight_kg, stacking_layers, locked, locked_at, loom_hash, created_at) VALUES
('PP-008', 'TRD-SELL-008', '40RF', 24000, 22500, 20, 25, 500, 5, 1, datetime('now','-8 days'), 'loom:pp008:a1b2c3d4e5f6', datetime('now','-10 days')),
('PP-009', 'TRD-SELL-009', '40ST', 25000, 23500, 24, 22, 472, 6, 1, datetime('now','-12 days'), 'loom:pp009:f6e5d4c3b2a1', datetime('now','-14 days')),
('PP-010', 'TRD-SELL-010', '40ST', 21000, 20000, 20, 25, 500, 4, 1, datetime('now','-38 days'), 'loom:pp010:9a8b7c6d5e4f', datetime('now','-40 days'));

-- Initial Loom Chain (genesis block)
INSERT OR IGNORE INTO loom_chain (previous_hash, current_hash, event_type, event_data, sequence_num) VALUES
('0000000000000000000000000000000000000000000000000000000000000000', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0', 'GENESIS', '{"platform":"SGTX","version":"11.0","timestamp":"2026-06-10T00:00:00Z"}', 0);

-- Financier Preferences
INSERT OR IGNORE INTO financier_preferences (financier_tenant_id, accepted_borrower_countries, min_borrower_trust_score, min_trade_value, max_financed_amount, preferred_financing_types, preferred_settlement_methods) VALUES
(11, '["EG"]', 70.0, 10000.0, 500000.0, '["PRE_SHIPMENT","POST_SHIPMENT"]', '["BANK_TRANSFER"]'),
(12, '["EG","VN","AE"]', 60.0, 5000.0, 200000.0, '["PRE_SHIPMENT","INVOICE_FACTORING"]', '["BANK_TRANSFER","DEFI"]');

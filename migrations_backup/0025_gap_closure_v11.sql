-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 0025: Blueprint v11 Gap Closure
-- Covers:
--   1. Laboratory Selection (Blueprint 12C.2 tab 7)
--   2. Government Permit Issuance (Blueprint 6.2.6)
--   3. Government Compliance Monitor (Blueprint 6.2.6)
--   4. Enhanced Logistics RFQ provider tracking
--   5. Weight Unit Preferences
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. LABORATORY / TESTING LAB DIRECTORY
-- Blueprint 12C.2 Tab 7: Laboratory Selection
-- Seller must choose an accredited lab for pre-shipment testing
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laboratories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  city TEXT,
  address TEXT,
  accreditation TEXT,                    -- e.g. 'ISO/IEC 17025', 'NABL', 'CNAS', 'SASO'
  accreditation_expiry TEXT,             -- ISO date
  specialisations TEXT,                  -- JSON array of commodity categories they handle
  testing_capabilities TEXT,             -- JSON array: ['chemical', 'physical', 'microbiological', 'residue']
  turnaround_days INTEGER DEFAULT 5,    -- typical turnaround in business days
  rush_available INTEGER DEFAULT 0,     -- boolean: 1 = offers rush service
  rush_surcharge_pct REAL DEFAULT 50,   -- % surcharge for rush
  rating REAL DEFAULT 4.0,              -- 1-5 star rating
  total_reviews INTEGER DEFAULT 0,
  price_tier TEXT DEFAULT 'STANDARD',   -- BUDGET | STANDARD | PREMIUM
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  sgtx_verified INTEGER DEFAULT 0,      -- 1 = SGTX-verified partner
  status TEXT DEFAULT 'ACTIVE',         -- ACTIVE | SUSPENDED | DEACTIVATED
  metadata TEXT,                        -- JSON for extra fields
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_labs_country ON laboratories(country_code);
CREATE INDEX IF NOT EXISTS idx_labs_status ON laboratories(status);

-- ─────────────────────────────────────────────────────────
-- 2. LAB BOOKINGS (seller books a lab for a trade)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_bookings (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  exporter_quote_id TEXT,
  tenant_id TEXT NOT NULL,
  laboratory_id TEXT NOT NULL,
  ustn TEXT,
  commodity_type TEXT,
  product_name TEXT,
  test_types TEXT,                       -- JSON array: ['chemical_composition', 'moisture', 'aflatoxin', etc.]
  sample_count INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'STANDARD',      -- STANDARD | RUSH | EXPRESS
  requested_date TEXT,                   -- preferred date
  confirmed_date TEXT,                   -- lab-confirmed date
  estimated_completion TEXT,
  actual_completion TEXT,
  status TEXT DEFAULT 'PENDING',         -- PENDING | CONFIRMED | SAMPLE_RECEIVED | IN_PROGRESS | COMPLETED | CANCELLED
  results_summary TEXT,                  -- JSON: test results summary
  certificate_url TEXT,                  -- URL to lab certificate
  cost_estimate REAL,
  cost_currency TEXT DEFAULT 'USD',
  cost_actual REAL,
  notes TEXT,
  governor_decision_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_lab_bookings_tenant ON lab_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_trade ON lab_bookings(trade_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_status ON lab_bookings(status);

-- ─────────────────────────────────────────────────────────
-- 3. LAB TEST TYPES (reference table)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_test_types (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,                -- 'CHEMICAL' | 'PHYSICAL' | 'MICROBIOLOGICAL' | 'RESIDUE' | 'IDENTITY' | 'REGULATORY'
  name TEXT NOT NULL,
  description TEXT,
  applicable_commodities TEXT,           -- JSON array of commodity categories
  typical_duration_days INTEGER DEFAULT 3,
  typical_cost_usd REAL,
  is_mandatory INTEGER DEFAULT 0,       -- 1 = mandatory for certain trade corridors
  regulatory_references TEXT,           -- JSON array of regulation citations
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────
-- 4. GOVERNMENT PERMITS
-- Blueprint 6.2.6: Permit Issuance
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gov_permits (
  id TEXT PRIMARY KEY,
  permit_type TEXT NOT NULL,             -- 'IMPORT_LICENSE' | 'EXPORT_LICENSE' | 'PHYTOSANITARY' | 'HEALTH_CERTIFICATE' | 'ORIGIN_CERTIFICATE' | 'FUMIGATION' | 'HALAL' | 'ORGANIC' | 'SPECIAL_HANDLING'
  trade_request_id TEXT,
  ustn TEXT,
  applicant_tenant_id TEXT NOT NULL,
  reviewing_agency TEXT,                 -- e.g. 'APHIS', 'FDA', 'NAFEZA', 'GACC'
  country_code TEXT NOT NULL,
  commodity_type TEXT,
  hs_code TEXT,
  status TEXT DEFAULT 'DRAFT',           -- DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | EXPIRED | REVOKED
  priority TEXT DEFAULT 'NORMAL',        -- NORMAL | EXPEDITED | URGENT
  submitted_at TEXT,
  reviewed_at TEXT,
  approved_at TEXT,
  expires_at TEXT,
  permit_number TEXT,                    -- official permit/license number
  conditions TEXT,                       -- JSON array of approval conditions
  rejection_reason TEXT,
  attachments TEXT,                      -- JSON array of document URLs
  fee_amount REAL,
  fee_currency TEXT DEFAULT 'USD',
  fee_paid INTEGER DEFAULT 0,
  reviewer_name TEXT,
  reviewer_notes TEXT,
  auto_approved INTEGER DEFAULT 0,       -- 1 = auto-cleared by SGTX recommendation
  governor_decision_id TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gov_permits_applicant ON gov_permits(applicant_tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_permits_trade ON gov_permits(trade_request_id);
CREATE INDEX IF NOT EXISTS idx_gov_permits_status ON gov_permits(status);
CREATE INDEX IF NOT EXISTS idx_gov_permits_country ON gov_permits(country_code);

-- ─────────────────────────────────────────────────────────
-- 5. GOVERNMENT COMPLIANCE RULES
-- Blueprint 6.2.6: Compliance Monitor
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gov_compliance_rules (
  id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,        -- e.g. 'EG-IMPORT-PHYTO-001'
  country_code TEXT NOT NULL,
  rule_type TEXT NOT NULL,               -- 'DOCUMENT_REQUIREMENT' | 'THRESHOLD_CHECK' | 'EMBARGO' | 'QUOTA' | 'LABELING' | 'TESTING' | 'CERTIFICATION'
  title TEXT NOT NULL,
  description TEXT,
  commodity_categories TEXT,             -- JSON array of affected categories
  hs_code_pattern TEXT,                  -- regex or prefix for matching HS codes
  severity TEXT DEFAULT 'REQUIRED',      -- REQUIRED | RECOMMENDED | ADVISORY
  enforcement_action TEXT DEFAULT 'BLOCK', -- BLOCK | WARN | LOG
  parameters TEXT,                       -- JSON: thresholds, limits, etc.
  effective_from TEXT,
  effective_until TEXT,
  regulation_reference TEXT,             -- legal citation
  last_updated_by TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_country ON gov_compliance_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON gov_compliance_rules(rule_type);

-- ─────────────────────────────────────────────────────────
-- 6. COMPLIANCE CHECK RESULTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gov_compliance_checks (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  ustn TEXT,
  rule_id TEXT NOT NULL,
  tenant_id TEXT,
  check_result TEXT NOT NULL,            -- 'PASS' | 'FAIL' | 'WARNING' | 'PENDING' | 'EXEMPTED'
  details TEXT,                          -- JSON: detailed findings
  remediation TEXT,                      -- suggested fix
  checked_at TEXT DEFAULT (datetime('now')),
  checked_by TEXT,                       -- 'SYSTEM' | employee_id
  resolved_at TEXT,
  resolution_notes TEXT,
  FOREIGN KEY (rule_id) REFERENCES gov_compliance_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_trade ON gov_compliance_checks(trade_request_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_result ON gov_compliance_checks(check_result);

-- ─────────────────────────────────────────────────────────
-- 7. LOGISTICS PROVIDER PROFILES (for Mode B RFQ selection)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logistics_providers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,                        -- if provider is also a tenant
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,           -- 'FREIGHT_FORWARDER' | 'SHIPPING_LINE' | 'TRUCKING' | 'CUSTOMS_BROKER' | 'MULTIMODAL'
  country_code TEXT,
  coverage_regions TEXT,                 -- JSON array of region codes
  coverage_ports TEXT,                   -- JSON array of port codes
  services TEXT,                         -- JSON array: ['FCL', 'LCL', 'AIR', 'ROAD', 'RAIL', 'CUSTOMS', 'INSURANCE']
  rating REAL DEFAULT 4.0,
  total_shipments INTEGER DEFAULT 0,
  on_time_pct REAL DEFAULT 95.0,
  avg_response_hours REAL DEFAULT 24,
  certifications TEXT,                   -- JSON array: ['AEO', 'FIATA', 'IATA', 'C-TPAT']
  insurance_coverage REAL,              -- max coverage USD
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  sgtx_verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logistics_providers_type ON logistics_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_logistics_providers_status ON logistics_providers(status);

-- 8. Enhance existing logistics_rfq_responses with additional columns
-- (table already exists from migration 0020, adding missing columns)
ALTER TABLE logistics_rfq_responses ADD COLUMN provider_id TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN provider_name TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN cost_breakdown TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN transit_days INTEGER;
ALTER TABLE logistics_rfq_responses ADD COLUMN notes TEXT;
ALTER TABLE logistics_rfq_responses ADD COLUMN updated_at TEXT;

-- ─────────────────────────────────────────────────────────
-- 9. SEED: Reference Laboratory Data
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO laboratories (id, name, country_code, city, accreditation, specialisations, testing_capabilities, turnaround_days, rating, price_tier, sgtx_verified, contact_email) VALUES
('lab-001', 'SGS Egypt', 'EG', 'Cairo', 'ISO/IEC 17025', '["Fresh Produce","Grains & Cereals","Spices"]', '["chemical","physical","microbiological","residue"]', 5, 4.8, 'PREMIUM', 1, 'cairo@sgs.com'),
('lab-002', 'Bureau Veritas Vietnam', 'VN', 'Ho Chi Minh City', 'ISO/IEC 17025', '["Fresh Produce","Coffee & Cocoa","Seafood"]', '["chemical","physical","microbiological"]', 4, 4.6, 'PREMIUM', 1, 'hcmc@bureauveritas.com'),
('lab-003', 'Intertek Shanghai', 'CN', 'Shanghai', 'CNAS', '["Textiles","Electronics","Processed Foods","Tea"]', '["chemical","physical","identity","regulatory"]', 3, 4.5, 'PREMIUM', 1, 'shanghai@intertek.com'),
('lab-004', 'TÜV SÜD Mumbai', 'IN', 'Mumbai', 'NABL', '["Spices","Grains & Cereals","Cotton","Tea"]', '["chemical","physical","microbiological","residue"]', 5, 4.4, 'STANDARD', 1, 'mumbai@tuvsud.com'),
('lab-005', 'Eurofins São Paulo', 'BR', 'São Paulo', 'ISO/IEC 17025', '["Coffee & Cocoa","Sugar","Fresh Produce","Grains & Cereals"]', '["chemical","physical","microbiological","residue"]', 4, 4.7, 'PREMIUM', 1, 'saopaulo@eurofins.com'),
('lab-006', 'QIMA Bangkok', 'TH', 'Bangkok', 'ISO/IEC 17025', '["Fresh Produce","Seafood","Rubber","Rice"]', '["chemical","physical","microbiological"]', 3, 4.3, 'STANDARD', 1, 'bangkok@qima.com'),
('lab-007', 'Control Union Jakarta', 'ID', 'Jakarta', 'ISO/IEC 17025', '["Palm Oil","Coffee & Cocoa","Rubber","Spices"]', '["chemical","physical","identity"]', 6, 4.2, 'STANDARD', 1, 'jakarta@controlunion.com'),
('lab-008', 'DEKRA Hamburg', 'DE', 'Hamburg', 'DAkkS', '["Automotive Parts","Machinery","Chemicals","Metals"]', '["chemical","physical","regulatory","identity"]', 4, 4.6, 'PREMIUM', 1, 'hamburg@dekra.com'),
('lab-009', 'Underwriters Labs Chicago', 'US', 'Chicago', 'A2LA', '["Electronics","Machinery","Building Materials","Chemicals"]', '["physical","regulatory","identity"]', 5, 4.5, 'PREMIUM', 1, 'chicago@ul.com'),
('lab-010', 'ALS Istanbul', 'TR', 'Istanbul', 'TURKAK', '["Textiles","Metals","Fresh Produce","Grains & Cereals"]', '["chemical","physical","microbiological"]', 4, 4.1, 'STANDARD', 0, 'istanbul@alsglobal.com'),
('lab-011', 'Al-Qimma Labs', 'SA', 'Jeddah', 'SASO/GAC', '["Fresh Produce","Processed Foods","Halal Certification"]', '["chemical","microbiological","identity","regulatory"]', 3, 4.0, 'STANDARD', 1, 'jeddah@alqimma-labs.sa'),
('lab-012', 'AsiaInspection Shenzhen', 'CN', 'Shenzhen', 'CNAS', '["Electronics","Textiles","Toys","Ceramics"]', '["physical","chemical","regulatory"]', 2, 4.4, 'BUDGET', 1, 'shenzhen@asiainspection.com');

-- ─────────────────────────────────────────────────────────
-- 10. SEED: Lab Test Types
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO lab_test_types (id, category, name, description, applicable_commodities, typical_duration_days, typical_cost_usd, is_mandatory) VALUES
('ltt-001', 'CHEMICAL', 'Heavy Metals Analysis', 'Lead, cadmium, mercury, arsenic content', '["Fresh Produce","Grains & Cereals","Seafood","Spices"]', 3, 250, 1),
('ltt-002', 'CHEMICAL', 'Pesticide Residue Screening', 'Multi-residue pesticide panel (400+ compounds)', '["Fresh Produce","Grains & Cereals","Tea","Coffee & Cocoa"]', 5, 450, 1),
('ltt-003', 'CHEMICAL', 'Mycotoxin Panel', 'Aflatoxin B1/B2/G1/G2, Ochratoxin A, DON', '["Grains & Cereals","Spices","Coffee & Cocoa","Nuts & Seeds"]', 3, 350, 1),
('ltt-004', 'MICROBIOLOGICAL', 'Standard Micro Panel', 'Total plate count, E.coli, Salmonella, Listeria', '["Fresh Produce","Seafood","Processed Foods","Dairy"]', 5, 300, 1),
('ltt-005', 'PHYSICAL', 'Moisture Content', 'Karl Fischer / oven drying moisture analysis', '["Grains & Cereals","Coffee & Cocoa","Spices","Sugar"]', 1, 80, 0),
('ltt-006', 'PHYSICAL', 'Size & Grade Verification', 'Dimensional and grade classification per standard', '["Fresh Produce","Grains & Cereals","Nuts & Seeds"]', 1, 120, 0),
('ltt-007', 'IDENTITY', 'Species Authentication', 'DNA/PCR species verification', '["Seafood","Meat","Coffee & Cocoa","Spices"]', 4, 500, 0),
('ltt-008', 'REGULATORY', 'EU MRL Compliance Check', 'Maximum Residue Level compliance per EU standards', '["Fresh Produce","Grains & Cereals","Spices"]', 5, 600, 1),
('ltt-009', 'REGULATORY', 'FDA Import Alert Screening', 'Check against FDA detention-without-physical-examination list', '["Fresh Produce","Seafood","Spices","Processed Foods"]', 2, 200, 0),
('ltt-010', 'CHEMICAL', 'Nutritional Analysis', 'Proximate analysis, vitamins, minerals', '["Processed Foods","Dairy","Grains & Cereals"]', 5, 400, 0),
('ltt-011', 'MICROBIOLOGICAL', 'Shelf Life Study', 'Accelerated and real-time stability testing', '["Fresh Produce","Processed Foods","Dairy","Seafood"]', 14, 800, 0),
('ltt-012', 'REGULATORY', 'Halal Certification Testing', 'Alcohol, pork DNA, non-halal ingredient screening', '["Processed Foods","Meat","Dairy","Spices"]', 3, 350, 0);

-- ─────────────────────────────────────────────────────────
-- 11. SEED: Logistics Providers (for Mode B RFQ)
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO logistics_providers (id, name, provider_type, country_code, coverage_regions, services, rating, total_shipments, on_time_pct, avg_response_hours, sgtx_verified) VALUES
('lp-001', 'Maersk Line', 'SHIPPING_LINE', 'DK', '["GLOBAL"]', '["FCL","LCL"]', 4.7, 12500, 94.2, 12, 1),
('lp-002', 'MSC Mediterranean', 'SHIPPING_LINE', 'CH', '["GLOBAL"]', '["FCL","LCL"]', 4.5, 11200, 93.8, 18, 1),
('lp-003', 'CMA CGM', 'SHIPPING_LINE', 'FR', '["GLOBAL"]', '["FCL","LCL","AIR"]', 4.6, 9800, 94.5, 14, 1),
('lp-004', 'DHL Global Forwarding', 'FREIGHT_FORWARDER', 'DE', '["GLOBAL"]', '["FCL","LCL","AIR","ROAD","CUSTOMS","INSURANCE"]', 4.8, 15600, 96.1, 8, 1),
('lp-005', 'Kuehne + Nagel', 'FREIGHT_FORWARDER', 'CH', '["GLOBAL"]', '["FCL","LCL","AIR","ROAD","RAIL","CUSTOMS","INSURANCE"]', 4.7, 13200, 95.7, 10, 1),
('lp-006', 'DB Schenker', 'FREIGHT_FORWARDER', 'DE', '["EU","ME","ASIA"]', '["FCL","LCL","AIR","ROAD","RAIL","CUSTOMS"]', 4.5, 8900, 94.8, 16, 1),
('lp-007', 'Bolloré Logistics', 'FREIGHT_FORWARDER', 'FR', '["AFRICA","EU","ME"]', '["FCL","LCL","ROAD","CUSTOMS"]', 4.3, 6200, 92.5, 20, 1),
('lp-008', 'Al Futtaim Logistics', 'FREIGHT_FORWARDER', 'AE', '["ME","ASIA","AFRICA"]', '["FCL","LCL","ROAD","CUSTOMS","INSURANCE"]', 4.4, 4800, 93.2, 14, 1),
('lp-009', 'Nile Cargo Egypt', 'TRUCKING', 'EG', '["EG","ME"]', '["ROAD","CUSTOMS"]', 4.1, 3200, 91.0, 6, 0),
('lp-010', 'Transglobal Express', 'MULTIMODAL', 'GB', '["EU","GLOBAL"]', '["FCL","LCL","AIR","ROAD","CUSTOMS","INSURANCE"]', 4.6, 7800, 95.2, 12, 1);

-- ─────────────────────────────────────────────────────────
-- 12. SEED: Government Compliance Rules
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO gov_compliance_rules (id, rule_code, country_code, rule_type, title, description, commodity_categories, severity, enforcement_action, parameters) VALUES
('gcr-001', 'EG-IMPORT-PHYTO-001', 'EG', 'DOCUMENT_REQUIREMENT', 'Phytosanitary Certificate Required', 'All plant-origin imports require phytosanitary certificate from origin country', '["Fresh Produce","Grains & Cereals","Spices","Coffee & Cocoa","Nuts & Seeds"]', 'REQUIRED', 'BLOCK', '{"document_type":"PHYTOSANITARY","issuer":"origin_country_authority"}'),
('gcr-002', 'EG-IMPORT-HEALTH-001', 'EG', 'DOCUMENT_REQUIREMENT', 'Health Certificate for Food', 'Processed foods require health certificate', '["Processed Foods","Dairy","Meat","Seafood"]', 'REQUIRED', 'BLOCK', '{"document_type":"HEALTH_CERTIFICATE"}'),
('gcr-003', 'US-IMPORT-FDA-001', 'US', 'REGULATORY', 'FDA Prior Notice', 'All food imports require FDA prior notice filing (min 15 days)', '["Fresh Produce","Processed Foods","Seafood","Dairy","Meat","Spices"]', 'REQUIRED', 'BLOCK', '{"min_days_before_arrival":15,"filing_system":"FDA_PNSI"}'),
('gcr-004', 'US-IMPORT-APHIS-001', 'US', 'DOCUMENT_REQUIREMENT', 'USDA/APHIS Import Permit', 'Plant products require USDA/APHIS import permit', '["Fresh Produce","Grains & Cereals"]', 'REQUIRED', 'BLOCK', '{"document_type":"APHIS_PERMIT"}'),
('gcr-005', 'EU-IMPORT-MRL-001', 'DE', 'THRESHOLD_CHECK', 'EU Maximum Residue Levels', 'Pesticide residues must comply with EU MRL regulation EC 396/2005', '["Fresh Produce","Grains & Cereals","Spices"]', 'REQUIRED', 'BLOCK', '{"reference":"EC_396_2005","lab_test_required":"ltt-008"}'),
('gcr-006', 'SA-IMPORT-HALAL-001', 'SA', 'CERTIFICATION', 'Halal Certification Required', 'All food imports to Saudi Arabia must have valid Halal certificate', '["Processed Foods","Meat","Dairy","Seafood"]', 'REQUIRED', 'BLOCK', '{"certificate_type":"HALAL","accepted_bodies":["JAKIM","MUI","ESMA","SFDA"]}'),
('gcr-007', 'CN-IMPORT-GACC-001', 'CN', 'DOCUMENT_REQUIREMENT', 'GACC Registration', 'Foreign food facilities must be GACC-registered for China import', '["Fresh Produce","Processed Foods","Meat","Seafood","Dairy"]', 'REQUIRED', 'BLOCK', '{"registration_system":"GACC_CIFER"}'),
('gcr-008', 'IN-IMPORT-FSSAI-001', 'IN', 'THRESHOLD_CHECK', 'FSSAI Standards Compliance', 'All food imports must meet FSSAI standards', '["Fresh Produce","Processed Foods","Spices","Dairy"]', 'REQUIRED', 'BLOCK', '{"reference":"FSSAI_2011"}'),
('gcr-009', 'VN-EXPORT-QUARANTINE-001', 'VN', 'DOCUMENT_REQUIREMENT', 'Plant Quarantine Certificate', 'All plant product exports require quarantine certificate', '["Fresh Produce","Coffee & Cocoa","Spices"]', 'REQUIRED', 'BLOCK', '{"document_type":"QUARANTINE_CERTIFICATE","issuer":"PPSD_VIETNAM"}'),
('gcr-010', 'GLOBAL-WEIGHT-SOLAS-001', 'XX', 'THRESHOLD_CHECK', 'SOLAS VGM Requirement', 'All container shipments must have Verified Gross Mass declaration', '["ALL"]', 'REQUIRED', 'BLOCK', '{"reference":"SOLAS_VI_A_2"}');

-- ─────────────────────────────────────────────────────────
-- 13. SEED: Sample Government Permits
-- ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO gov_permits (id, permit_type, trade_request_id, ustn, applicant_tenant_id, reviewing_agency, country_code, commodity_type, status, priority, submitted_at, permit_number) VALUES
('gp-001', 'PHYTOSANITARY', NULL, 'USTN-2024-DEMO-001', 'tenant-demo-importer', 'APHIS', 'US', 'Fresh Produce', 'APPROVED', 'NORMAL', '2024-01-10T09:00:00Z', 'PHYTO-2024-00142'),
('gp-002', 'IMPORT_LICENSE', NULL, 'USTN-2024-DEMO-002', 'tenant-demo-importer', 'NAFEZA', 'EG', 'Grains & Cereals', 'UNDER_REVIEW', 'EXPEDITED', '2024-01-12T14:00:00Z', NULL),
('gp-003', 'HALAL', NULL, 'USTN-2024-DEMO-003', 'tenant-demo-importer', 'SFDA', 'SA', 'Processed Foods', 'APPROVED', 'NORMAL', '2024-01-08T10:00:00Z', 'HALAL-SA-2024-0089'),
('gp-004', 'HEALTH_CERTIFICATE', NULL, NULL, 'tenant-demo-exporter', 'MOH-VN', 'VN', 'Seafood', 'SUBMITTED', 'URGENT', '2024-01-15T08:00:00Z', NULL),
('gp-005', 'ORIGIN_CERTIFICATE', NULL, NULL, 'tenant-demo-exporter', 'VCCI', 'VN', 'Coffee & Cocoa', 'APPROVED', 'NORMAL', '2024-01-05T11:00:00Z', 'CO-VN-2024-01205');

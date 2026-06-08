-- ═══════════════════════════════════════════════════════════════════
-- SGTX Platform v6.3 — End-to-End Mock Data for Full Workflow Testing
-- Creates complete trade flows: Trade Request → Contract → Shipment → Inspection → Financing → Settlement
-- Commodity: Fresh & Frozen Fruits/Vegetables (Produce Focus)
-- ═══════════════════════════════════════════════════════════════════
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

-- ═══════════════════════════════════════════════════════════════════
-- 1. GOVERNOR DECISIONS (required FK for trade_requests, shipments, etc.)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, conditions, policy_version, rule_refs, explainability, confidence, loom_hash, cryptographic_signature, created_at)
VALUES
  ('gov-dec-trade-001', 'trade.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G1U1"]', 'Trade request allowed: KYB tier 3, trust score 85.5', 0.98, 'loom:sha256:mock001', 'sig:ed25519:mock001', datetime('now', '-20 days')),
  ('gov-dec-trade-002', 'trade.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G1U1"]', 'Trade request allowed: repeat buyer, produce commodity', 0.99, 'loom:sha256:mock002', 'sig:ed25519:mock002', datetime('now', '-18 days')),
  ('gov-dec-trade-003', 'trade.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G1U1"]', 'Trade request allowed: frozen vegetables shipment', 0.97, 'loom:sha256:mock003', 'sig:ed25519:mock003', datetime('now', '-15 days')),
  ('gov-dec-trade-004', 'trade.create', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G1U1"]', 'Trade request allowed: citrus fruit export', 0.96, 'loom:sha256:mock004', 'sig:ed25519:mock004', datetime('now', '-10 days')),
  ('gov-dec-trade-005', 'trade.create', 'SGTX-VN-TRD-000002-C3D4', 'CONDITIONAL', '["Requires phytosanitary certificate"]', '6.3.0', '["G1U1","G1U3"]', 'Conditional: tropical fruit requires phytosanitary docs', 0.85, 'loom:sha256:mock005', 'sig:ed25519:mock005', datetime('now', '-8 days')),
  ('gov-dec-ship-001', 'shipment.create', 'SGTX-DE-LOG-000001-I9J0', 'ALLOW', NULL, '6.3.0', '["G5U1"]', 'Shipment allowed: reefer container confirmed', 0.99, 'loom:sha256:ship001', 'sig:ed25519:ship001', datetime('now', '-14 days')),
  ('gov-dec-ship-002', 'shipment.create', 'SGTX-DE-LOG-000001-I9J0', 'ALLOW', NULL, '6.3.0', '["G5U1"]', 'Shipment allowed: cold chain verified', 0.98, 'loom:sha256:ship002', 'sig:ed25519:ship002', datetime('now', '-12 days')),
  ('gov-dec-ship-003', 'shipment.create', 'SGTX-DE-LOG-000001-I9J0', 'ALLOW', NULL, '6.3.0', '["G5U1"]', 'Shipment allowed: standard dry container', 0.99, 'loom:sha256:ship003', 'sig:ed25519:ship003', datetime('now', '-9 days')),
  ('gov-dec-fin-001', 'financing.request', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G4"]', 'Financing allowed: contract locked, amount within limits', 0.95, 'loom:sha256:fin001', 'sig:ed25519:fin001', datetime('now', '-10 days')),
  ('gov-dec-fin-002', 'financing.request', 'SGTX-EG-TRD-000001-A1B2', 'ALLOW', NULL, '6.3.0', '["G4"]', 'Financing allowed: pre-export facility', 0.93, 'loom:sha256:fin002', 'sig:ed25519:fin002', datetime('now', '-8 days')),
  ('gov-dec-fin-003', 'financing.bid', 'SGTX-SG-FIN-000001-E5F6', 'ALLOW', NULL, '6.3.0', '["G4"]', 'Bid allowed: financier verified tier 4', 0.99, 'loom:sha256:fin003', 'sig:ed25519:fin003', datetime('now', '-9 days')),
  ('gov-dec-insp-001', 'inspection.schedule', 'SGTX-GB-QC-000001-K1L2', 'ALLOW', NULL, '6.3.0', '["G6"]', 'Inspection allowed: QC provider verified', 0.99, 'loom:sha256:insp001', 'sig:ed25519:insp001', datetime('now', '-13 days')),
  ('gov-dec-insp-002', 'inspection.schedule', 'SGTX-GB-QC-000001-K1L2', 'ALLOW', NULL, '6.3.0', '["G6"]', 'Inspection allowed: produce cold chain check', 0.98, 'loom:sha256:insp002', 'sig:ed25519:insp002', datetime('now', '-11 days')),
  ('gov-dec-insp-003', 'inspection.schedule', 'SGTX-GB-QC-000001-K1L2', 'ALLOW', NULL, '6.3.0', '["G6"]', 'Inspection allowed: pre-shipment', 0.97, 'loom:sha256:insp003', 'sig:ed25519:insp003', datetime('now', '-7 days')),
  ('gov-dec-insp-004', 'inspection.schedule', 'SGTX-GB-QC-000001-K1L2', 'ALLOW', NULL, '6.3.0', '["G6"]', 'Inspection scheduled: frozen vegetables batch', 0.96, 'loom:sha256:insp004', 'sig:ed25519:insp004', datetime('now', '-5 days')),
  ('gov-dec-clear-001', 'customs.clearance', 'SGTX-EG-GOV-000001-G7H8', 'ALLOW', NULL, '6.3.0', '["G8"]', 'Customs clearance: docs verified', 0.99, 'loom:sha256:clear001', 'sig:ed25519:clear001', datetime('now', '-6 days')),
  ('gov-dec-clear-002', 'customs.clearance', 'SGTX-EG-GOV-000001-G7H8', 'CONDITIONAL', '["Requires fumigation certificate"]', '6.3.0', '["G8","G8U2"]', 'Conditional: fresh produce requires fumigation cert', 0.80, 'loom:sha256:clear002', 'sig:ed25519:clear002', datetime('now', '-4 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 2. TRADE REQUESTS (5 produce trades at various stages)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO trade_requests (id, importer_tenant_id, raw_description, parsed_specs, specifications, parsing_confidence, status, assigned_exporter_id, governor_decision_id, created_by, created_at, updated_at)
VALUES
  ('trade-mock-001', 'tenant-001', 'Need 20 MT of fresh Egyptian mangoes (Kent variety), Grade A, for export to Singapore. Cold chain required, max transit 14 days.',
   '{"commodity":"Fresh Mangoes","variety":"Kent","quantity":20,"unit":"MT","grade":"A","origin":"EG","destination":"SG","cold_chain":true,"max_transit_days":14}',
   '{"hs_code":"0804.50","temperature_range":{"min":10,"max":13},"packaging":"4kg cartons","certifications":["GlobalGAP","HACCP"]}',
   0.95, 'CONTRACTED', 'tenant-002', 'gov-dec-trade-001', 'emp-001', datetime('now', '-20 days'), datetime('now', '-14 days')),

  ('trade-mock-002', 'tenant-001', '500 cases of frozen mixed vegetables (broccoli, carrots, peas) from Vietnam. -18°C reefer container. CIF Alexandria.',
   '{"commodity":"Frozen Mixed Vegetables","items":["broccoli","carrots","peas"],"quantity":500,"unit":"cases","origin":"VN","destination":"EG","temperature":-18,"incoterm":"CIF"}',
   '{"hs_code":"0710.80","packaging":"10kg retail packs in master cartons","certifications":["ISO22000","Halal"]}',
   0.92, 'FINANCING', 'tenant-002', 'gov-dec-trade-002', 'emp-001', datetime('now', '-18 days'), datetime('now', '-10 days')),

  ('trade-mock-003', 'tenant-001', '100 MT fresh Valencia oranges for UK market. Gap treatment required. FOB Alexandria.',
   '{"commodity":"Fresh Oranges","variety":"Valencia","quantity":100,"unit":"MT","origin":"EG","destination":"GB","gap_treatment":true,"incoterm":"FOB"}',
   '{"hs_code":"0805.10","temperature_range":{"min":4,"max":7},"packaging":"15kg open-top cartons","certifications":["GlobalGAP","GRASP"]}',
   0.94, 'IN_EXECUTION', 'tenant-002', 'gov-dec-trade-003', 'emp-001', datetime('now', '-15 days'), datetime('now', '-9 days')),

  ('trade-mock-004', 'tenant-001', '50 MT frozen strawberries IQF, Grade A, Vietnam origin, for UAE re-export hub.',
   '{"commodity":"Frozen Strawberries IQF","quantity":50,"unit":"MT","grade":"A","origin":"VN","destination":"AE","incoterm":"CFR"}',
   '{"hs_code":"0811.10","temperature":-20,"packaging":"10kg PE bags in cartons","certifications":["BRC","FSSC22000"]}',
   0.91, 'QUOTED', 'tenant-002', 'gov-dec-trade-004', 'emp-002', datetime('now', '-10 days'), datetime('now', '-8 days')),

  ('trade-mock-005', 'tenant-001', '30 MT fresh dragon fruit (white flesh) from Vietnam. Air freight, max 5 day transit.',
   '{"commodity":"Fresh Dragon Fruit","variety":"White Flesh","quantity":30,"unit":"MT","origin":"VN","destination":"EG","transport":"AIR","max_transit_days":5}',
   '{"hs_code":"0810.90","temperature_range":{"min":5,"max":10},"packaging":"5kg gift boxes","certifications":["VietGAP","Phytosanitary"]}',
   0.88, 'PENDING_EXPORTER_RESPONSE', NULL, 'gov-dec-trade-005', 'emp-001', datetime('now', '-8 days'), datetime('now', '-8 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 3. EXPORTER QUOTES (for trades that progressed past matching)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status, total_quote_amount, logistics_total, commission_amount, sgtx_fee_rate, sgtx_fee_amount, total_trade_value, exw_justification, created_at)
VALUES
  ('quote-mock-001', 'trade-mock-001', 'tenant-002', 1850.00, 'USD', datetime('now', '-19 days'), 'CIF', 7, 'ACCEPTED', 37000.00, 4200.00, 555.00, 0.015, 555.00, 37000.00, 'Kent mangoes from Ismailia farms, GlobalGAP certified. Cold chain: precooling + reefer.', datetime('now', '-19 days')),
  ('quote-mock-002', 'trade-mock-002', 'tenant-002', 2400.00, 'USD', datetime('now', '-17 days'), 'CIF', 7, 'ACCEPTED', 120000.00, 8500.00, 1800.00, 0.015, 1800.00, 120000.00, 'IQF frozen mixed veg from Binh Duong facility. -18°C reefer guaranteed.', datetime('now', '-17 days')),
  ('quote-mock-003', 'trade-mock-003', 'tenant-002', 950.00, 'USD', datetime('now', '-14 days'), 'FOB', 5, 'ACCEPTED', 95000.00, 3200.00, 1425.00, 0.015, 1425.00, 95000.00, 'Valencia oranges from Nile Delta. GAP treated, export-ready.', datetime('now', '-14 days')),
  ('quote-mock-004', 'trade-mock-004', 'tenant-002', 3200.00, 'USD', datetime('now', '-9 days'), 'CFR', 7, 'SUBMITTED', 160000.00, 6800.00, 2400.00, 0.015, 2400.00, 160000.00, 'IQF strawberries from Da Lat highland farms. BRC Grade A.', datetime('now', '-9 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 4. CONTRACTS (for trades that reached contracting phase)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO contracts (id, trade_request_id, contract_type, incoterm, incoterm_rules, clauses, governing_law, dispute_resolution, status, cryptographic_hash, importer_signature, exporter_signature, signed_at, locked_at, commission_lock_id, governor_decision_id, created_at)
VALUES
  ('contract-mock-001', 'trade-mock-001', 'SINGLE_SHIPMENT', 'CIF', '{"delivery_point":"Singapore Port","risk_transfer":"on board vessel","freight":"seller","insurance":"seller"}',
   '{"payment_terms":"LC at sight","quality_clause":"GlobalGAP Grade A, max 5% defects","cold_chain_clause":"Unbroken cold chain 10-13C, data logger required","penalty_clause":"2% per day delay, max 10%"}',
   'Singapore', 'ICC_ARBITRATION', 'LOCKED', 'sha256:contract001hash', 'sig:ahmed_hassan', 'sig:nguyen_van_minh', datetime('now', '-16 days'), datetime('now', '-15 days'), 'cl-mock-001', 'gov-dec-trade-001', datetime('now', '-17 days')),

  ('contract-mock-002', 'trade-mock-002', 'SINGLE_SHIPMENT', 'CIF', '{"delivery_point":"Alexandria Port","risk_transfer":"on board vessel","freight":"seller","insurance":"seller"}',
   '{"payment_terms":"60 days deferred","quality_clause":"ISO22000, Halal certified","cold_chain_clause":"Maintained at -18C throughout","penalty_clause":"1.5% per day delay"}',
   'England', 'LCIA_ARBITRATION', 'LOCKED', 'sha256:contract002hash', 'sig:ahmed_hassan', 'sig:nguyen_van_minh', datetime('now', '-12 days'), datetime('now', '-11 days'), 'cl-mock-002', 'gov-dec-trade-002', datetime('now', '-13 days')),

  ('contract-mock-003', 'trade-mock-003', 'SINGLE_SHIPMENT', 'FOB', '{"delivery_point":"Alexandria Port","risk_transfer":"on board vessel","freight":"buyer","insurance":"buyer"}',
   '{"payment_terms":"TT 30% advance, 70% against BL","quality_clause":"GRASP certified, min 70mm diameter","cold_chain_clause":"Pre-cooling to 5C before loading","penalty_clause":"Replacement or 5% discount"}',
   'Egypt', 'CRCICA_ARBITRATION', 'ACTIVE', 'sha256:contract003hash', 'sig:ahmed_hassan', 'sig:nguyen_van_minh', datetime('now', '-10 days'), datetime('now', '-9 days'), 'cl-mock-003', 'gov-dec-trade-003', datetime('now', '-11 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 5. COMMISSION LOCKS
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO commission_locks (lock_id, contract_id, trade_id, commission_rate_pct, commission_usd, currency, status, release_conditions, released_pct, governor_decision_id, locked_at)
VALUES
  ('cl-mock-001', 'contract-mock-001', 'trade-mock-001', 1.5, 555.00, 'USD', 'ACTIVE', '{"conditions":["delivery_confirmed","inspection_passed"]}', 0, 'gov-dec-trade-001', datetime('now', '-15 days')),
  ('cl-mock-002', 'contract-mock-002', 'trade-mock-002', 1.5, 1800.00, 'USD', 'ACTIVE', '{"conditions":["delivery_confirmed","inspection_passed"]}', 0, 'gov-dec-trade-002', datetime('now', '-11 days')),
  ('cl-mock-003', 'contract-mock-003', 'trade-mock-003', 1.5, 1425.00, 'USD', 'ACTIVE', '{"conditions":["delivery_confirmed","inspection_passed"]}', 0, 'gov-dec-trade-003', datetime('now', '-9 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 6. SHIPMENTS (3 active shipments at different stages)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO shipments (id, ustn, contract_id, booking_number, loading_date, status, current_milestone, origin_port, destination_port, vessel_name, imo_number, transport_legs, ai_predictions, carbon_footprint_tons, esg_score, governor_decision_id, created_at, updated_at)
VALUES
  ('ship-mock-001', 'SGTX-CIRO-SGPR-240101-001', 'contract-mock-001', 'BK-HAM-2024-0891',
   datetime('now', '-12 days'), 'IN_TRANSIT', 'IN_TRANSIT',
   'Alexandria (EGALX)', 'Singapore (SGSIN)', 'MSC Rosaria', '9839287',
   '[{"leg":1,"from":"Alexandria","to":"Singapore","mode":"SEA","carrier":"MSC","vessel":"MSC Rosaria","eta":"' || datetime('now', '+5 days') || '"}]',
   '{"eta_confidence":0.92,"delay_probability":0.08,"temperature_risk":"LOW"}',
   2.8, 78.5, 'gov-dec-ship-001', datetime('now', '-14 days'), datetime('now', '-2 days')),

  ('ship-mock-002', 'SGTX-SGVN-EGAL-240102-002', 'contract-mock-002', 'BK-HAM-2024-0923',
   datetime('now', '-8 days'), 'DEPARTED', 'DEPARTED',
   'Ho Chi Minh (VNSGN)', 'Alexandria (EGALX)', 'Evergreen Ever Ace', '9811000',
   '[{"leg":1,"from":"Ho Chi Minh","to":"Alexandria","mode":"SEA","carrier":"Evergreen","vessel":"Ever Ace","eta":"' || datetime('now', '+12 days') || '"}]',
   '{"eta_confidence":0.88,"delay_probability":0.15,"temperature_risk":"MEDIUM"}',
   4.2, 72.0, 'gov-dec-ship-002', datetime('now', '-12 days'), datetime('now', '-3 days')),

  ('ship-mock-003', 'SGTX-EGAL-GBFX-240103-003', 'contract-mock-003', 'BK-HAM-2024-0945',
   datetime('now', '-5 days'), 'LOADED', 'LOADED',
   'Alexandria (EGALX)', 'Felixstowe (GBFXT)', 'CMA CGM Antoine', '9706891',
   '[{"leg":1,"from":"Alexandria","to":"Felixstowe","mode":"SEA","carrier":"CMA CGM","vessel":"Antoine","eta":"' || datetime('now', '+9 days') || '"}]',
   '{"eta_confidence":0.94,"delay_probability":0.05,"temperature_risk":"LOW"}',
   1.9, 82.0, 'gov-dec-ship-003', datetime('now', '-9 days'), datetime('now', '-1 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 7. SHIPMENT MILESTONES (progression history)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method)
VALUES
  -- Ship 1: Alexandria → Singapore (mangoes) — IN_TRANSIT
  ('sm-001-1', 'SGTX-CIRO-SGPR-240101-001', 'BOOKED', datetime('now', '-14 days'), 'emp-007', 'SYSTEM'),
  ('sm-001-2', 'SGTX-CIRO-SGPR-240101-001', 'GATED_IN', datetime('now', '-12 days'), 'emp-007', 'GPS_GEOFENCE'),
  ('sm-001-3', 'SGTX-CIRO-SGPR-240101-001', 'LOADED', datetime('now', '-11 days'), 'emp-007', 'IOT_WEIGHT_SENSOR'),
  ('sm-001-4', 'SGTX-CIRO-SGPR-240101-001', 'DEPARTED', datetime('now', '-10 days'), 'emp-007', 'AIS_SIGNAL'),
  ('sm-001-5', 'SGTX-CIRO-SGPR-240101-001', 'IN_TRANSIT', datetime('now', '-9 days'), 'SYSTEM', 'AIS_TRACKING'),
  -- Ship 2: HCMC → Alexandria (frozen veg) — DEPARTED
  ('sm-002-1', 'SGTX-SGVN-EGAL-240102-002', 'BOOKED', datetime('now', '-12 days'), 'emp-007', 'SYSTEM'),
  ('sm-002-2', 'SGTX-SGVN-EGAL-240102-002', 'GATED_IN', datetime('now', '-9 days'), 'emp-007', 'GPS_GEOFENCE'),
  ('sm-002-3', 'SGTX-SGVN-EGAL-240102-002', 'LOADED', datetime('now', '-8 days'), 'emp-007', 'IOT_WEIGHT_SENSOR'),
  ('sm-002-4', 'SGTX-SGVN-EGAL-240102-002', 'DEPARTED', datetime('now', '-7 days'), 'emp-007', 'AIS_SIGNAL'),
  -- Ship 3: Alexandria → Felixstowe (oranges) — LOADED
  ('sm-003-1', 'SGTX-EGAL-GBFX-240103-003', 'BOOKED', datetime('now', '-9 days'), 'emp-007', 'SYSTEM'),
  ('sm-003-2', 'SGTX-EGAL-GBFX-240103-003', 'GATED_IN', datetime('now', '-6 days'), 'emp-007', 'GPS_GEOFENCE'),
  ('sm-003-3', 'SGTX-EGAL-GBFX-240103-003', 'LOADED', datetime('now', '-5 days'), 'emp-007', 'IOT_WEIGHT_SENSOR');

-- ═══════════════════════════════════════════════════════════════════
-- 8. INSPECTIONS (QC jobs for London QC Services - tenant-006)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO inspections (id, shipment_ustn, inspector_tenant_id, inspection_type, priority_pallets, product_details, status, result, findings, ai_summary, governor_decision_id, scheduled_at, completed_at, created_at)
VALUES
  ('insp-mock-001', 'SGTX-CIRO-SGPR-240101-001', 'tenant-006', 'PRE_SHIPMENT',
   '["P001","P005","P012","P018"]',
   '{"commodity":"Fresh Mangoes Kent","lot_size":2000,"sample_size":125,"aql":2.5}',
   'COMPLETED', 'PASS',
   '{"defects_found":3,"defect_types":["minor_bruise","skin_blemish"],"accept_number":7,"reject_number":8,"actual_defects":3,"verdict":"ACCEPT"}',
   'Pre-shipment inspection of Kent mangoes: 2000 unit lot, AQL 2.5 Level II. 125 units sampled, 3 minor defects found (bruising). Well within acceptance criteria. Cold chain verified at 11.2°C average. PASS.',
   'gov-dec-insp-001', datetime('now', '-13 days'), datetime('now', '-12 days'), datetime('now', '-13 days')),

  ('insp-mock-002', 'SGTX-SGVN-EGAL-240102-002', 'tenant-006', 'PRE_SHIPMENT',
   '["P001","P003","P008"]',
   '{"commodity":"Frozen Mixed Vegetables","lot_size":500,"sample_size":80,"aql":2.5,"temperature_check":true}',
   'COMPLETED', 'PASS',
   '{"defects_found":2,"defect_types":["packaging_damage"],"accept_number":5,"reject_number":6,"actual_defects":2,"temperature_readings":[-18.2,-17.9,-18.5,-18.1],"verdict":"ACCEPT"}',
   'Frozen vegetables inspection: 500 cases sampled at AQL 2.5. Core temperature verified at -18.2°C (compliant). 2 minor packaging damages found. PASS. Cold chain integrity confirmed.',
   'gov-dec-insp-002', datetime('now', '-11 days'), datetime('now', '-10 days'), datetime('now', '-11 days')),

  ('insp-mock-003', 'SGTX-EGAL-GBFX-240103-003', 'tenant-006', 'PRE_SHIPMENT',
   '["P002","P007","P015","P022","P030"]',
   '{"commodity":"Fresh Valencia Oranges","lot_size":5000,"sample_size":200,"aql":2.5,"size_check":true}',
   'IN_PROGRESS', NULL, NULL, NULL,
   'gov-dec-insp-003', datetime('now', '-7 days'), NULL, datetime('now', '-7 days')),

  ('insp-mock-004', 'SGTX-SGVN-EGAL-240102-002', 'tenant-006', 'LOADING_SUPERVISION',
   '[]',
   '{"commodity":"Frozen Mixed Vegetables","container_type":"40RF","reefer_setpoint":-18}',
   'SCHEDULED', NULL, NULL, NULL,
   'gov-dec-insp-004', datetime('now', '-5 days'), NULL, datetime('now', '-5 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 9. FINANCING REQUESTS (Trade Finance for produce deals)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO financing_requests (id, contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, collateral, credit_intelligence, status, governor_decision_id, created_at)
VALUES
  ('fin-req-001', 'contract-mock-001', 'tenant-001', 37000.00, 'USD', 45, 'PRE_EXPORT',
   '{"type":"CARGO_IN_TRANSIT","description":"20 MT Kent Mangoes CIF Singapore","insured_value":42000}',
   '{"credit_score":"A-","payment_history":"12 trades, 0 defaults","debt_ratio":0.35,"recommendation":"LOW_RISK"}',
   'AWARDED', 'gov-dec-fin-001', datetime('now', '-10 days')),

  ('fin-req-002', 'contract-mock-002', 'tenant-002', 120000.00, 'USD', 60, 'RECEIVABLES',
   '{"type":"ACCOUNTS_RECEIVABLE","description":"500 cases frozen vegetables, LC confirmed","lc_number":"LC-2024-EG-0891"}',
   '{"credit_score":"BBB+","payment_history":"8 trades, 0 defaults","debt_ratio":0.28,"recommendation":"MODERATE_RISK"}',
   'BIDDING', 'gov-dec-fin-002', datetime('now', '-8 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 10. FINANCING OFFERS (Bids from Asia Trade Finance - tenant-003)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO financing_offers (id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost, collateral_required, conditions, bid_encrypted, status, submitted_at)
VALUES
  ('fin-offer-001', 'fin-req-001', 'tenant-003', 6.5, 2405.00, '{"type":"CARGO_LIEN","percentage":80}', '{"disbursement":"T+1","repayment":"Upon delivery confirmation"}', 0, 'AWARDED', datetime('now', '-9 days')),
  ('fin-offer-002', 'fin-req-002', 'tenant-003', 7.8, 9360.00, '{"type":"LC_ASSIGNMENT","lc_ref":"LC-2024-EG-0891"}', '{"disbursement":"T+2","repayment":"LC maturity date"}', 1, 'SUBMITTED', datetime('now', '-7 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 11. FINANCING AGREEMENTS (Awarded deal)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO financing_agreements (id, financing_request_id, winning_offer_id, cryptographic_hash, status, created_at)
VALUES
  ('fin-agree-001', 'fin-req-001', 'fin-offer-001', 'sha256:finagreement001', 'ACTIVE', datetime('now', '-9 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 12. SETTLEMENT INSTRUCTIONS (Payment split for completed phases)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO settlement_instructions (id, ustn, instruction_type, payload, status, psp_reference, governor_decision_id, payer_tenant_id, payee_tenant_id, amount, currency, payment_rail, psp_id, created_at)
VALUES
  ('settle-001', 'SGTX-CIRO-SGPR-240101-001', 'FULL_PAYMENT', '{"buyer_amount":37000,"seller_amount":36445,"commission":555,"split":"auto"}', 'PENDING', NULL, 'gov-dec-ship-001', 'tenant-001', 'tenant-002', 37000.00, 'USD', 'SWIFT_GPI', 'psp-003', datetime('now', '-5 days')),
  ('settle-002', 'SGTX-SGVN-EGAL-240102-002', 'FULL_PAYMENT', '{"buyer_amount":120000,"seller_amount":118200,"commission":1800,"split":"auto"}', 'PENDING', 'REF-WISE-2024-0923', 'gov-dec-ship-002', 'tenant-001', 'tenant-002', 120000.00, 'USD', 'WISE', 'psp-002', datetime('now', '-3 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 13. CUSTOMS CLEARANCE DATA (for Government portal)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, conditions, policy_version, rule_refs, explainability, confidence, loom_hash, cryptographic_signature, created_at)
VALUES
  ('gov-dec-clear-003', 'customs.clearance', 'SGTX-EG-GOV-000001-G7H8', 'ALLOW', NULL, '6.3.0', '["G8"]', 'Auto-clearance: all docs verified, low-risk commodity', 0.99, 'loom:sha256:clear003', 'sig:ed25519:clear003', datetime('now', '-3 days')),
  ('gov-dec-clear-004', 'customs.clearance', 'SGTX-EG-GOV-000001-G7H8', 'DENY', '["Missing phytosanitary certificate for tropical fruit"]', '6.3.0', '["G8","G8U3"]', 'DENIED: Phytosanitary certificate required for fresh tropical fruit import. Regulation 2024/EG/PHYTO-003 applies.', 0.95, 'loom:sha256:clear004', 'sig:ed25519:clear004', datetime('now', '-2 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 14. SMART INBOX ITEMS (for Smart Inbox testing)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO smart_inbox_items (id, tenant_id, employee_id, item_type, category, priority_score, title, description, action_url, action_label, related_ustn, status, dismissed, created_at)
VALUES
  ('inbox-m-001', 'tenant-001', 'emp-001', 'TRADE', 'TRADE', 85, 'New quote received for Dragon Fruit', 'Saigon Textiles submitted a quote for 30 MT fresh dragon fruit. Review and accept/reject within 48h.', '/trade/trade-mock-005', 'Review Quote', NULL, 'UNREAD', 0, datetime('now', '-1 days')),
  ('inbox-m-002', 'tenant-001', 'emp-001', 'SHIPMENT', 'SHIPMENT', 72, 'Mango shipment approaching Singapore', 'SGTX-CIRO-SGPR-240101-001 is 5 days from destination. Prepare receiving docs.', '/shipment/SGTX-CIRO-SGPR-240101-001', 'Track Shipment', 'SGTX-CIRO-SGPR-240101-001', 'UNREAD', 0, datetime('now', '-6 hours')),
  ('inbox-m-003', 'tenant-001', 'emp-001', 'FINANCE', 'FINANCE', 90, 'Settlement pending confirmation', 'Settlement #settle-001 ($37,000) awaiting your confirmation for mango shipment.', '/settlement/settle-001', 'Confirm Payment', 'SGTX-CIRO-SGPR-240101-001', 'UNREAD', 0, datetime('now', '-2 hours')),
  ('inbox-m-004', 'tenant-002', 'emp-003', 'TRADE', 'TRADE', 88, 'New RFQ: Dragon Fruit 30MT', 'Cairo Imports requesting quote for 30 MT fresh dragon fruit. Respond within 72h.', '/trade/trade-mock-005', 'Submit Quote', NULL, 'UNREAD', 0, datetime('now', '-1 days')),
  ('inbox-m-005', 'tenant-002', 'emp-003', 'SHIPMENT', 'SHIPMENT', 60, 'Frozen vegetables departed HCMC', 'Container loaded and vessel departed. ETA Alexandria: 12 days.', '/shipment/SGTX-SGVN-EGAL-240102-002', 'View Details', 'SGTX-SGVN-EGAL-240102-002', 'READ', 0, datetime('now', '-3 days')),
  ('inbox-m-006', 'tenant-003', 'emp-005', 'FINANCE', 'FINANCE', 82, 'New financing opportunity', 'Frozen vegetables deal (120K USD, 60 days) open for bidding. 1 bid placed.', '/financing/fin-req-002', 'Place Bid', NULL, 'UNREAD', 0, datetime('now', '-7 days')),
  ('inbox-m-007', 'tenant-003', 'emp-005', 'FINANCE', 'FINANCE', 55, 'Mango deal financing active', 'Your awarded financing ($37K, 45 days) is active. Monitor repayment schedule.', '/financing/fin-agree-001', 'Monitor', NULL, 'READ', 0, datetime('now', '-9 days')),
  ('inbox-m-008', 'tenant-005', 'emp-007', 'LOGISTICS', 'LOGISTICS', 75, 'Booking confirmed: Oranges to UK', 'BK-HAM-2024-0945 confirmed on CMA CGM Antoine. Vessel departs in 2 days.', '/shipment/SGTX-EGAL-GBFX-240103-003', 'View Booking', 'SGTX-EGAL-GBFX-240103-003', 'UNREAD', 0, datetime('now', '-5 days')),
  ('inbox-m-009', 'tenant-006', 'emp-008', 'INSPECTION', 'INSPECTION', 92, 'Inspection in progress: Oranges', 'Valencia oranges inspection (5000 unit lot) assigned. Complete by deadline.', '/inspection/insp-mock-003', 'Start Inspection', 'SGTX-EGAL-GBFX-240103-003', 'UNREAD', 0, datetime('now', '-7 days')),
  ('inbox-m-010', 'tenant-006', 'emp-008', 'INSPECTION', 'INSPECTION', 78, 'New assignment: Loading supervision', 'Frozen vegetables loading supervision scheduled. Container 40RF.', '/inspection/insp-mock-004', 'Accept', 'SGTX-SGVN-EGAL-240102-002', 'UNREAD', 0, datetime('now', '-5 days')),
  ('inbox-m-011', 'tenant-004', 'emp-006', 'GOVERNMENT', 'GOVERNMENT', 88, 'Clearance required: Mango shipment', 'Fresh mango shipment SGTX-CIRO-SGPR-240101-001 approaching — customs docs pending review.', '/clearance/SGTX-CIRO-SGPR-240101-001', 'Review Docs', 'SGTX-CIRO-SGPR-240101-001', 'UNREAD', 0, datetime('now', '-2 days')),
  ('inbox-m-012', 'tenant-004', 'emp-006', 'GOVERNMENT', 'GOVERNMENT', 65, 'DENIED: Dragon fruit import cert missing', 'Phytosanitary certificate required for tropical fruit. Applicant notified.', '/clearance/gov-dec-clear-004', 'View Decision', NULL, 'READ', 0, datetime('now', '-2 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 15. (Cold chain readings handled by shipment_milestones and IoT — skip if table missing)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 16. DISPUTES (one active dispute for testing)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO disputes (id, trade_request_id, filing_party_gtid, respondent_gtid, dispute_type, description, severity, status, triage_category, resolution_path, governor_decision_id, filed_at)
VALUES
  ('dispute-mock-001', 'trade-mock-001', 'SGTX-EG-TRD-000001-A1B2', 'SGTX-VN-TRD-000002-C3D4', 'QUALITY',
   'Mango shipment received with 12% bruising exceeding 5% contract threshold. Temperature logger shows spike to 15C during loading.',
   3, 'IN_MEDIATION', 'QUALITY', 'MEDIATION', 'gov-dec-clear-001', datetime('now', '-1 days'));

-- Done. Full end-to-end mock data seeded.
-- Tenants involved: tenant-001 (Cairo Imports/BUY), tenant-002 (Saigon Textiles/SELL),
-- tenant-003 (Asia Trade Finance), tenant-004 (Egyptian Customs), tenant-005 (Hamburg Logistics), tenant-006 (London QC)

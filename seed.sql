-- Seed data for SGTX Platform v6.3 — Blueprint Parts 0-2 Aligned
-- Creates base tenants, employees, and essential reference data
-- Uses proper GTID format with CRC32 checksums, lifecycle states, etc.
PRAGMA foreign_keys = OFF;

-- ═══════════════════════════════════════════════════════════════════
-- 1. Seed Tenants (with lifecycle_state, proper GTIDs)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier, cryptographic_hash, risk_score, sanctions_cleared, operating_mode, default_trader_mode, lifecycle_state, sandbox_mode, onboarding_completed, created_at, updated_at)
VALUES
  ('tenant-001', 'SGTX-EG-TRD-000001-A1B2', 'Cairo Trading Co.', 'EG', 'CORPORATE', 'VERIFIED', 3, 'sha256:imp001', 15.5, 1, 'ADVANCED', 'BUY', 'VERIFIED', 0, 1, datetime('now'), datetime('now')),
  ('tenant-002', 'SGTX-VN-TRD-000002-C3D4', 'Vietnam Exports Ltd.', 'VN', 'CORPORATE', 'VERIFIED', 3, 'sha256:exp001', 12.3, 1, 'ADVANCED', 'SELL', 'VERIFIED', 0, 1, datetime('now'), datetime('now')),
  ('tenant-003', 'SGTX-GB-FIN-000001-E5F6', 'Global Finance Bank', 'GB', 'FINANCIAL', 'VERIFIED', 4, 'sha256:fin001', 8.1, 1, 'ENTERPRISE', 'DUAL', 'VERIFIED', 0, 1, datetime('now'), datetime('now')),
  ('tenant-004', 'SGTX-EG-GOV-000001-G7H8', 'Egyptian Customs Authority', 'EG', 'GOVERNMENT', 'VERIFIED', 4, 'sha256:gov001', 5.0, 1, 'ENTERPRISE', 'DUAL', 'VERIFIED', 0, 1, datetime('now'), datetime('now')),
  ('tenant-005', 'SGTX-CH-LOG-000001-I9J0', 'Mediterranean Shipping Co.', 'CH', 'LOGISTICS', 'VERIFIED', 3, 'sha256:log001', 10.0, 1, 'SIMPLE', 'DUAL', 'VERIFIED', 0, 1, datetime('now'), datetime('now')),
  ('tenant-006', 'SGTX-CH-QC-000001-K1L2', 'SGS Inspection Services', 'CH', 'QUALITY_CONTROL', 'VERIFIED', 3, 'sha256:qc001', 7.5, 1, 'SIMPLE', 'DUAL', 'VERIFIED', 0, 1, datetime('now'), datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 2. Seed Lifecycle History
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, changed_at)
VALUES
  ('tlh-001', 'tenant-001', 'NONE', 'REGISTERED', 'Tenant registration', datetime('now', '-30 days')),
  ('tlh-002', 'tenant-001', 'REGISTERED', 'ONBOARDING', 'Started onboarding', datetime('now', '-29 days')),
  ('tlh-003', 'tenant-001', 'ONBOARDING', 'KYB_PENDING', 'KYB submitted', datetime('now', '-28 days')),
  ('tlh-004', 'tenant-001', 'KYB_PENDING', 'VERIFIED', 'KYB approved tier 3', datetime('now', '-25 days')),
  ('tlh-005', 'tenant-002', 'NONE', 'REGISTERED', 'Tenant registration', datetime('now', '-30 days')),
  ('tlh-006', 'tenant-002', 'REGISTERED', 'VERIFIED', 'Fast-track verification', datetime('now', '-28 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 3. Seed Roles
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions, created_at)
VALUES
  ('role-admin-001', 'tenant-001', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-admin-002', 'tenant-002', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-admin-003', 'tenant-003', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-trader-001', 'tenant-001', 'Trader', '["trade.create","trade.view","contract.sign","shipment.milestone.confirm"]', datetime('now')),
  ('role-trader-002', 'tenant-002', 'Trader', '["trade.create","trade.view","contract.sign","quote.submit","packing.plan"]', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 4. Seed Employees (with active_trader_mode_context, kyc_tier)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, role_id, kyc_status, kyc_tier, status, default_trader_mode, active_trader_mode_context, mfa_enabled, password_hash, created_at)
VALUES
  -- Passwords: emp-001=Admin123!, emp-002=Trade456!, emp-003=Export789!, emp-004=Sell321!, emp-005=Finance000!
  ('emp-001', 'tenant-001', 'ahmed@cairotrading.eg', 'Ahmed Hassan', 'role-admin-001', 'VERIFIED', 3, 'ACTIVE', 'BUY', 'BUY', 1, 'sha256:3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', datetime('now')),
  ('emp-002', 'tenant-001', 'fatima@cairotrading.eg', 'Fatima Al-Rashid', 'role-trader-001', 'VERIFIED', 2, 'ACTIVE', 'BUY', 'BUY', 0, 'sha256:b8368aec041b0cf86d2b3e5bf8f78fb61c2505f3811f9d44330d5cbf0c7353a0', datetime('now')),
  ('emp-003', 'tenant-002', 'nguyen@vnexports.vn', 'Nguyen Van Minh', 'role-admin-002', 'VERIFIED', 3, 'ACTIVE', 'SELL', 'SELL', 1, 'sha256:81744ae472f04ebe1a8ebaf82b1b461f9ea23e3e9c5486f73f552ad32319693f', datetime('now')),
  ('emp-004', 'tenant-002', 'tran@vnexports.vn', 'Tran Thi Lan', 'role-trader-002', 'VERIFIED', 2, 'ACTIVE', 'SELL', 'SELL', 0, 'sha256:2ef8d032b480343dbaa0f930caeebbcd6a4e5f32892846e21caba777de09f4f6', datetime('now')),
  ('emp-005', 'tenant-003', 'james@globalfinance.gb', 'James Richardson', 'role-admin-003', 'VERIFIED', 4, 'ACTIVE', 'DUAL', 'DUAL', 1, 'sha256:c5273983a35239ebefd4218daeaf8b045c72f207d666b14e1cda9d6795b4a81e', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 5. Seed Employee Permissions (Part 2.3: OPA-style)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO employee_permissions (employee_id, permission, grant_type, trader_mode_context, granted_by, granted_at)
VALUES
  ('emp-001', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now')),
  ('emp-002', 'trade.create', 'ALLOW', '["BUY"]', 'emp-001', datetime('now')),
  ('emp-002', 'trade.view', 'ALLOW', '["BUY","SELL"]', 'emp-001', datetime('now')),
  ('emp-002', 'contract.sign', 'ALLOW', '["BUY"]', 'emp-001', datetime('now')),
  ('emp-002', 'shipment.milestone.confirm', 'ALLOW', '["BUY"]', 'emp-001', datetime('now')),
  ('emp-003', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now')),
  ('emp-004', 'trade.create', 'ALLOW', '["SELL"]', 'emp-003', datetime('now')),
  ('emp-004', 'quote.submit', 'ALLOW', '["SELL"]', 'emp-003', datetime('now')),
  ('emp-005', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 6. Seed Data Scopes (Part 2.3)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO data_scopes (employee_id, country_access, document_types, max_transaction_value, custom_filters, hidden_cost_components, allow_role_switching)
VALUES
  ('emp-001', '["*"]', '["*"]', NULL, '{}', '[]', 1),
  ('emp-002', '["EG","VN","GB","CH"]', '["INVOICE","BL","PACKING_LIST"]', 500000, '{}', '[]', 0),
  ('emp-003', '["*"]', '["*"]', NULL, '{}', '[]', 1),
  ('emp-004', '["VN","EG","AE"]', '["INVOICE","CERTIFICATE_OF_ORIGIN","PACKING_LIST"]', 300000, '{}', '[]', 0),
  ('emp-005', '["*"]', '["*"]', NULL, '{}', '["PLATFORM_FEE"]', 1);

-- ═══════════════════════════════════════════════════════════════════
-- 7. Seed Trust Scores (gtid is PK, no id/tenant_id columns)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score, updated_at)
VALUES
  ('SGTX-EG-TRD-000001-A1B2', 85.5, 'xgboost-v1.0', '{"kyb":90,"trade_history":82,"dispute_record":95,"payment_history":88,"delivery_record":80,"document_accuracy":85}', 87.0, 72.0, datetime('now')),
  ('SGTX-VN-TRD-000002-C3D4', 91.2, 'xgboost-v1.0', '{"kyb":95,"trade_history":90,"dispute_record":98,"payment_history":92,"delivery_record":85,"document_accuracy":88}', 75.0, 93.0, datetime('now')),
  ('SGTX-GB-FIN-000001-E5F6', 96.0, 'xgboost-v1.0', '{"kyb":99,"trade_history":95,"dispute_record":100,"payment_history":98,"delivery_record":90,"document_accuracy":95}', 96.0, 96.0, datetime('now')),
  ('SGTX-EG-GOV-000001-G7H8', 99.0, 'xgboost-v1.0', '{"kyb":100,"trade_history":0,"dispute_record":100,"payment_history":0}', 99.0, 99.0, datetime('now')),
  ('SGTX-CH-LOG-000001-I9J0', 88.0, 'xgboost-v1.0', '{"kyb":92,"trade_history":85,"dispute_record":97,"payment_history":80,"delivery_record":92}', 88.0, 88.0, datetime('now')),
  ('SGTX-CH-QC-000001-K1L2', 93.0, 'xgboost-v1.0', '{"kyb":95,"trade_history":88,"dispute_record":100,"payment_history":92}', 93.0, 93.0, datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 8. Seed Jurisdictions (code is PK)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO jurisdictions (code, name, sanctions_level, kyc_tier_required, cbdc_status, psp_partners, distressed_sale_allowed, distressed_country_factor)
VALUES
  ('EG', 'Egypt', 'NONE', 2, 'PILOT', '["STRIPE","FLUTTERWAVE","FAWRY"]', 1, 0.85),
  ('VN', 'Vietnam', 'NONE', 2, 'NONE', '["STRIPE","VNPAY"]', 1, 0.80),
  ('GB', 'United Kingdom', 'NONE', 1, 'PILOT', '["STRIPE","WISE","SWIFT_GPI"]', 1, 1.0),
  ('CH', 'Switzerland', 'NONE', 1, 'NONE', '["STRIPE","SWIFT_GPI","SIX"]', 1, 1.0),
  ('AE', 'United Arab Emirates', 'NONE', 1, 'ACTIVE', '["STRIPE","NOON_PAY","SWIFT_GPI"]', 1, 1.0),
  ('NG', 'Nigeria', 'NONE', 2, 'ACTIVE', '["FLUTTERWAVE","PAYSTACK"]', 1, 0.75),
  ('KE', 'Kenya', 'NONE', 2, 'NONE', '["FLUTTERWAVE","MPESA"]', 1, 0.70),
  ('US', 'United States', 'NONE', 1, 'NONE', '["STRIPE","SWIFT_GPI","FEDWIRE"]', 1, 1.0),
  ('CN', 'China', 'NONE', 3, 'ACTIVE', '["ALIPAY","WECHAT_PAY","SWIFT_GPI"]', 1, 0.90),
  ('BR', 'Brazil', 'NONE', 2, 'PILOT', '["PIX","STRIPE","SWIFT_GPI"]', 1, 0.85);

-- ═══════════════════════════════════════════════════════════════════
-- 9. Seed Tenant Contacts (with enrichment fields)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, trade_count, total_value, first_interaction, last_interaction, is_favorite, is_blocked, auto_saved, trust_snapshot, relationship_health_score, smart_labels)
VALUES
  ('tenant-001', 'SGTX-VN-TRD-000002-C3D4', 'TRADE_PARTNER', 12, 2450000.00, datetime('now', '-180 days'), datetime('now', '-2 days'), 1, 0, 0, '{"score":91.2,"trend":"STABLE"}', 0.92, '["RELIABLE","AGRICULTURAL","HIGH_VOLUME"]'),
  ('tenant-001', 'SGTX-GB-FIN-000001-E5F6', 'FINANCIER', 5, 1800000.00, datetime('now', '-120 days'), datetime('now', '-5 days'), 0, 0, 1, '{"score":96.0,"trend":"IMPROVING"}', 0.95, '["PREFERRED_LENDER","UK_BASED"]'),
  ('tenant-002', 'SGTX-EG-TRD-000001-A1B2', 'TRADE_PARTNER', 12, 2450000.00, datetime('now', '-180 days'), datetime('now', '-2 days'), 1, 0, 0, '{"score":85.5,"trend":"IMPROVING"}', 0.88, '["REPEAT_BUYER","EGYPT"]'),
  ('tenant-002', 'SGTX-CH-LOG-000001-I9J0', 'LOGISTICS_PROVIDER', 8, 320000.00, datetime('now', '-150 days'), datetime('now', '-7 days'), 0, 0, 1, '{"score":88.0}', 0.85, '["MSC","CONTAINER_SHIPPING"]');

-- ═══════════════════════════════════════════════════════════════════
-- 10. Seed Payment Aggregators
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO payment_aggregators (id, name, country_codes, supported_currencies, api_endpoint, uptime_score, is_active, api_type, fee_structure, avg_settlement_hours)
VALUES
  ('psp-001', 'Stripe Connect', 'US,GB,EU,EG,AE', 'USD,GBP,EUR,EGP,AED', 'https://api.stripe.com', 99.95, 1, 'REST', '{"percentage":2.9,"fixed":0.30}', 2),
  ('psp-002', 'Flutterwave', 'NG,GH,KE,EG,ZA', 'NGN,GHS,KES,EGP,ZAR', 'https://api.flutterwave.com', 99.2, 1, 'REST', '{"percentage":1.4,"fixed":0}', 24),
  ('psp-003', 'SWIFT GPI', 'GLOBAL', 'USD,EUR,GBP,JPY,CHF', 'https://swift.com/gpi', 99.99, 1, 'ISO20022', '{"fixed":25}', 4);

-- ═══════════════════════════════════════════════════════════════════
-- 11. Seed DeFi Protocols
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO defi_protocols (id, protocol_name, chain, tvl, apy_range, audit_status, supported_stablecoins, active)
VALUES
  ('defi-001', 'Aave V3', 'Polygon', 5000000000, '{"min":3.2,"max":8.5}', 'CERTIFIED', '["USDC","USDT","DAI"]', 1),
  ('defi-002', 'Compound V3', 'Ethereum', 3000000000, '{"min":2.8,"max":6.2}', 'CERTIFIED', '["USDC","USDT"]', 1),
  ('defi-003', 'Maple Finance', 'Ethereum', 800000000, '{"min":6.0,"max":12.0}', 'CERTIFIED', '["USDC"]', 1);

-- ═══════════════════════════════════════════════════════════════════
-- 12. Seed Tenant Onboarding States
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_onboarding_state (id, tenant_id, current_step, total_steps, sandbox_active, completed_at, created_at, updated_at)
VALUES
  ('onb-001', 'tenant-001', 6, 6, 0, datetime('now', '-25 days'), datetime('now', '-30 days'), datetime('now', '-25 days')),
  ('onb-002', 'tenant-002', 6, 6, 0, datetime('now', '-28 days'), datetime('now', '-30 days'), datetime('now', '-28 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 13. Seed Marketplace Partners
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO marketplace_partners (id, partner_name, api_key_hash, commission_split_percent, status, partner_type, contact_email, country, created_at)
VALUES
  ('mp-001', 'TradeFlow Connect', 'hash-mp-001', 15.0, 'ACTIVE', 'REFERRAL', 'api@tradeflow.io', 'AE', datetime('now')),
  ('mp-002', 'AgriConnect Platform', 'hash-mp-002', 12.5, 'ACTIVE', 'MARKETPLACE', 'partners@agriconnect.com', 'KE', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 14. Seed Platform Governance Proposals (Part 1.3 — multisig)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO platform_governance_proposals (id, proposal_type, description, proposed_by, required_signatures, total_signers, current_signatures, signers, status, expires_at, created_at)
VALUES
  ('pgp-001', 'POLICY_UPDATE', 'Increase commission ceiling from 2.5% to 3.0% for high-risk jurisdictions', 'SGTX-EG-TRD-000001-A1B2', 3, 5, 2, '["SGTX-EG-TRD-000001-A1B2","SGTX-GB-FIN-000001-E5F6"]', 'PENDING', datetime('now', '+5 days'), datetime('now', '-2 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 15. Seed Legal Disclaimer
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO legal_disclaimers (id, disclaimer_text, version, effective_date, displayed_count)
VALUES
  ('ld-001', 'SGTX Platform is a non-custodial trade facilitation infrastructure. All financial transactions are governed by the constitutional AI Governor. No irreversible action occurs without Governor approval (Part 0.3). Commission rates are clamped between 0.1% and 2.5% (Part 0.5). All actions are Loom-hashed for immutable auditability.', '6.3.0', datetime('now'), 0);

PRAGMA foreign_keys = ON;

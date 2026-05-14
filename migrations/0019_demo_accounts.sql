-- Migration 0019: Fix Demo Accounts
-- Ensures all 6 demo accounts on the login page are functional
-- Password for all demo accounts: password123
-- SHA256 hash: sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f

-- ═══════════════════════════════════════════════════════════════════
-- 1. Update existing tenant names to match demo login page
-- ═══════════════════════════════════════════════════════════════════
UPDATE tenants SET legal_name = 'Cairo Imports Co.', updated_at = datetime('now') WHERE id = 'tenant-001';
UPDATE tenants SET legal_name = 'Saigon Textiles', updated_at = datetime('now') WHERE id = 'tenant-002';
UPDATE tenants SET legal_name = 'Asia Trade Finance', jurisdiction = 'SG', updated_at = datetime('now') WHERE id = 'tenant-003';
UPDATE tenants SET legal_name = 'Hamburg Logistics', jurisdiction = 'DE', type = 'LOGISTICS', updated_at = datetime('now') WHERE id = 'tenant-005';
UPDATE tenants SET legal_name = 'London QC Services', jurisdiction = 'GB', updated_at = datetime('now') WHERE id = 'tenant-006';

-- Update GTIDs to match new jurisdictions
UPDATE tenants SET gtid = 'SGTX-SG-FIN-000001-E5F6' WHERE id = 'tenant-003';
UPDATE tenants SET gtid = 'SGTX-DE-LOG-000001-I9J0' WHERE id = 'tenant-005';
UPDATE tenants SET gtid = 'SGTX-GB-QC-000001-K1L2' WHERE id = 'tenant-006';

-- ═══════════════════════════════════════════════════════════════════
-- 2. Add SGTX Platform Admin tenant (tenant-007)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier, cryptographic_hash, risk_score, sanctions_cleared, operating_mode, default_trader_mode, lifecycle_state, sandbox_mode, onboarding_completed, created_at, updated_at)
VALUES ('tenant-007', 'SGTX-US-TRD-000007-M3N4', 'SGTX Platform', 'US', 'CORPORATE', 'VERIFIED', 4, 'sha256:admin007', 5.0, 1, 'ENTERPRISE', 'DUAL', 'VERIFIED', 0, 1, datetime('now'), datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 3. Add missing roles for tenants 004-007
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions, created_at)
VALUES
  ('role-admin-004', 'tenant-004', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-admin-005', 'tenant-005', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-admin-006', 'tenant-006', 'TENANT_ADMIN', '["*"]', datetime('now')),
  ('role-admin-007', 'tenant-007', 'TENANT_ADMIN', '["*"]', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 4. Fix existing employee emails and password hashes
-- ═══════════════════════════════════════════════════════════════════
-- All demo accounts use password: password123
-- SHA256: sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f

UPDATE employees SET 
  email = 'ahmed@cairoimports.eg', 
  full_name = 'Ahmed Hassan',
  password_hash = 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE id = 'emp-001';

UPDATE employees SET 
  password_hash = 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE id = 'emp-002';

UPDATE employees SET 
  email = 'nguyen@saigontex.vn',
  full_name = 'Nguyen Van Minh',
  password_hash = 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE id = 'emp-003';

UPDATE employees SET 
  password_hash = 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE id = 'emp-004';

UPDATE employees SET 
  email = 'chen@asiafinance.sg',
  full_name = 'Chen Wei',
  password_hash = 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f'
WHERE id = 'emp-005';

-- ═══════════════════════════════════════════════════════════════════
-- 5. Add missing employees for Government, Logistics, QC, Admin
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, role_id, kyc_status, kyc_tier, status, default_trader_mode, active_trader_mode_context, mfa_enabled, password_hash, created_at)
VALUES
  ('emp-006', 'tenant-005', 'muller@hamburg-log.de', 'Klaus Müller', 'role-admin-005', 'VERIFIED', 3, 'ACTIVE', 'DUAL', 'DUAL', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', datetime('now')),
  ('emp-007', 'tenant-006', 'james@londonqc.co.uk', 'James Crawford', 'role-admin-006', 'VERIFIED', 3, 'ACTIVE', 'DUAL', 'DUAL', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', datetime('now')),
  ('emp-008', 'tenant-007', 'admin@sgtx.us', 'SGTX Admin', 'role-admin-007', 'VERIFIED', 4, 'ACTIVE', 'DUAL', 'DUAL', 1, 'sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 6. Add employee permissions for new employees
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO employee_permissions (employee_id, permission, grant_type, trader_mode_context, granted_by, granted_at)
VALUES
  ('emp-006', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now')),
  ('emp-007', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now')),
  ('emp-008', '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 7. Add data scopes for new employees
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO data_scopes (employee_id, country_access, document_types, max_transaction_value, custom_filters, hidden_cost_components, allow_role_switching)
VALUES
  ('emp-006', '["*"]', '["*"]', NULL, '{}', '[]', 1),
  ('emp-007', '["*"]', '["*"]', NULL, '{}', '[]', 1),
  ('emp-008', '["*"]', '["*"]', NULL, '{}', '[]', 1);

-- ═══════════════════════════════════════════════════════════════════
-- 8. Add trust scores for updated/new GTIDs
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score, updated_at)
VALUES
  ('SGTX-SG-FIN-000001-E5F6', 96.0, 'xgboost-v1.0', '{"kyb":99,"trade_history":95,"dispute_record":100,"payment_history":98,"delivery_record":90,"document_accuracy":95}', 96.0, 96.0, datetime('now')),
  ('SGTX-DE-LOG-000001-I9J0', 88.0, 'xgboost-v1.0', '{"kyb":92,"trade_history":85,"dispute_record":97,"payment_history":80,"delivery_record":92}', 88.0, 88.0, datetime('now')),
  ('SGTX-GB-QC-000001-K1L2', 93.0, 'xgboost-v1.0', '{"kyb":95,"trade_history":88,"dispute_record":100,"payment_history":92}', 93.0, 93.0, datetime('now')),
  ('SGTX-US-TRD-000007-M3N4', 99.0, 'xgboost-v1.0', '{"kyb":100,"trade_history":100,"dispute_record":100,"payment_history":100}', 99.0, 99.0, datetime('now'));

-- ═══════════════════════════════════════════════════════════════════
-- 9. Add onboarding states for new tenants
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_onboarding_state (id, tenant_id, current_step, total_steps, sandbox_active, completed_at, created_at, updated_at)
VALUES
  ('onb-005', 'tenant-005', 6, 6, 0, datetime('now', '-20 days'), datetime('now', '-25 days'), datetime('now', '-20 days')),
  ('onb-006', 'tenant-006', 6, 6, 0, datetime('now', '-18 days'), datetime('now', '-22 days'), datetime('now', '-18 days')),
  ('onb-007', 'tenant-007', 6, 6, 0, datetime('now', '-30 days'), datetime('now', '-30 days'), datetime('now', '-30 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 10. Add lifecycle history for new tenants
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, changed_at)
VALUES
  ('tlh-010', 'tenant-005', 'NONE', 'REGISTERED', 'Tenant registration', datetime('now', '-25 days')),
  ('tlh-011', 'tenant-005', 'REGISTERED', 'VERIFIED', 'KYB approved', datetime('now', '-20 days')),
  ('tlh-012', 'tenant-006', 'NONE', 'REGISTERED', 'Tenant registration', datetime('now', '-22 days')),
  ('tlh-013', 'tenant-006', 'REGISTERED', 'VERIFIED', 'KYB approved', datetime('now', '-18 days')),
  ('tlh-014', 'tenant-007', 'NONE', 'REGISTERED', 'Platform admin registration', datetime('now', '-30 days')),
  ('tlh-015', 'tenant-007', 'REGISTERED', 'VERIFIED', 'Platform admin verified', datetime('now', '-30 days'));

-- ═══════════════════════════════════════════════════════════════════
-- 11. Add jurisdiction entries for SG, DE if missing
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO jurisdictions (code, name, sanctions_level, kyc_tier_required, cbdc_status, psp_partners, distressed_sale_allowed, distressed_country_factor)
VALUES
  ('SG', 'Singapore', 'NONE', 1, 'PILOT', '["STRIPE","WISE","SWIFT_GPI","DBS_PAYLAH"]', 1, 1.0),
  ('DE', 'Germany', 'NONE', 1, 'NONE', '["STRIPE","SWIFT_GPI","SEPA"]', 1, 1.0);

-- ═══════════════════════════════════════════════════════════════════
-- 12. Add tenant contacts for new demo tenants
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, trade_count, total_value, first_interaction, last_interaction, is_favorite, is_blocked, auto_saved, trust_snapshot)
VALUES
  ('tenant-005', 'SGTX-EG-TRD-000001-A1B2', 'LOGISTICS_CLIENT', 8, 320000.00, datetime('now', '-150 days'), datetime('now', '-7 days'), 0, 0, 1, '{"score":85.5}'),
  ('tenant-005', 'SGTX-VN-TRD-000002-C3D4', 'LOGISTICS_CLIENT', 6, 240000.00, datetime('now', '-120 days'), datetime('now', '-10 days'), 0, 0, 1, '{"score":91.2}'),
  ('tenant-006', 'SGTX-VN-TRD-000002-C3D4', 'QC_CLIENT', 4, 80000.00, datetime('now', '-100 days'), datetime('now', '-14 days'), 0, 0, 1, '{"score":91.2}'),
  ('tenant-007', 'SGTX-EG-TRD-000001-A1B2', 'PLATFORM_ADMIN', 0, 0, datetime('now', '-30 days'), datetime('now'), 0, 0, 1, '{"score":85.5}');

-- Fix payment_aggregators missing columns used by routes
ALTER TABLE payment_aggregators ADD COLUMN api_type TEXT DEFAULT 'REST';
ALTER TABLE payment_aggregators ADD COLUMN supported_methods TEXT DEFAULT '["BANK_TRANSFER"]';
ALTER TABLE payment_aggregators ADD COLUMN fee_structure TEXT DEFAULT '{"percentage":1.5,"fixed":0.30}';
ALTER TABLE payment_aggregators ADD COLUMN avg_settlement_hours REAL DEFAULT 24;
ALTER TABLE payment_aggregators ADD COLUMN onboarding_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE payment_aggregators ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

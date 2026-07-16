-- Migration 0012: SGTX Blueprint v6.3 Full Alignment
-- Fixes all schema gaps between route files and actual table schemas
-- Covers Parts 0-2, Phases 1-10, and all supporting modules

-- 1. commission_singularity_calculations — phases.ts commission/calculate
ALTER TABLE commission_singularity_calculations ADD COLUMN trade_value_usd REAL;
ALTER TABLE commission_singularity_calculations ADD COLUMN commission_usd REAL;
ALTER TABLE commission_singularity_calculations ADD COLUMN payer TEXT;

-- 2. defi_tranche_positions — phases.ts finance/defi/deploy
ALTER TABLE defi_tranche_positions ADD COLUMN financing_request_id TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN protocol_id TEXT;
ALTER TABLE defi_tranche_positions ADD COLUMN token TEXT DEFAULT 'USDC';
ALTER TABLE defi_tranche_positions ADD COLUMN health_factor REAL DEFAULT 1.5;
ALTER TABLE defi_tranche_positions ADD COLUMN governor_decision_id TEXT;

-- 3. packing_plans — phases.ts packing/optimise
ALTER TABLE packing_plans ADD COLUMN utilization_pct REAL;
ALTER TABLE packing_plans ADD COLUMN weight_kg REAL;
ALTER TABLE packing_plans ADD COLUMN volume_cbm REAL;
ALTER TABLE packing_plans ADD COLUMN ai_recommendation TEXT;

-- 4. financing_offers — phases.ts finance/bid
ALTER TABLE financing_offers ADD COLUMN amount REAL;
ALTER TABLE financing_offers ADD COLUMN interest_rate REAL;
ALTER TABLE financing_offers ADD COLUMN tenor_days INTEGER;

-- 5. financing_agreements — phases.ts finance/award
ALTER TABLE financing_agreements ADD COLUMN financing_offer_id TEXT;
ALTER TABLE financing_agreements ADD COLUMN amount REAL;
ALTER TABLE financing_agreements ADD COLUMN disbursement_status TEXT DEFAULT 'PENDING';

-- 6. distressed_cargo_offers — phases.ts distressed/offer
ALTER TABLE distressed_cargo_offers ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
ALTER TABLE distressed_cargo_offers ADD COLUMN offer_amount REAL;

-- 7. documents — phases.ts shipment/document/upload
ALTER TABLE documents ADD COLUMN ai_validation_status TEXT;
ALTER TABLE documents ADD COLUMN ai_validation_result TEXT;
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'PENDING';
ALTER TABLE documents ADD COLUMN file_hash TEXT;

-- 8. shipment_milestones — phases.ts shipment/milestone/confirm
ALTER TABLE shipment_milestones ADD COLUMN shipment_ustn TEXT;
ALTER TABLE shipment_milestones ADD COLUMN milestone_type TEXT;
ALTER TABLE shipment_milestones ADD COLUMN evidence TEXT;
ALTER TABLE shipment_milestones ADD COLUMN location TEXT;

-- 9. shipment_barcodes — phases.ts shipment/barcode/scan
ALTER TABLE shipment_barcodes ADD COLUMN scanned_by TEXT;
ALTER TABLE shipment_barcodes ADD COLUMN scanned_at TEXT;

-- 10. payment_attempts — phases.ts payment/commission/reconcile
ALTER TABLE payment_attempts ADD COLUMN webhook_verified INTEGER DEFAULT 0;
ALTER TABLE payment_attempts ADD COLUMN completed_at TEXT;

-- NOTE: disputes.evidence_package_id, arbitration_case_id, arbitration_status
-- already exist from earlier migrations — no ALTER needed

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_commission_sing_trade ON commission_singularity_calculations(trade_id);
CREATE INDEX IF NOT EXISTS idx_defi_tranche_request ON defi_tranche_positions(financing_request_id);
CREATE INDEX IF NOT EXISTS idx_milestones_shipment_ustn ON shipment_milestones(shipment_ustn);
CREATE INDEX IF NOT EXISTS idx_docs_ai_status ON documents(ai_validation_status);

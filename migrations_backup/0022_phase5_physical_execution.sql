-- Migration 0022: Part 3 Phase 5 — Physical Execution Gaps
-- Adds: QC override accountability, cold chain predictions, demurrage/detention, document AI validation

-- ═══════════════════════════════════════════════════════════
-- 1. QC Override Accountability (Step 5.4.6, G5UA7)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE inspection_logs ADD COLUMN ai_overridden INTEGER DEFAULT 0;
ALTER TABLE inspection_logs ADD COLUMN inspector_notes TEXT;
ALTER TABLE inspection_logs ADD COLUMN ai_original_verdict TEXT;
ALTER TABLE inspection_logs ADD COLUMN ai_original_confidence REAL;
ALTER TABLE inspection_logs ADD COLUMN override_reason TEXT;

-- ═══════════════════════════════════════════════════════════
-- 2. Cold Chain Predictions (Step 5.4.4)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cold_chain_predictions (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL,
    sensor_reading_count INTEGER DEFAULT 0,
    avg_temperature REAL,
    max_temperature REAL,
    min_temperature REAL,
    excursion_count INTEGER DEFAULT 0,
    total_excursion_minutes INTEGER DEFAULT 0,
    predicted_shelf_life_days REAL,
    original_shelf_life_days REAL,
    shelf_life_reduction_pct REAL DEFAULT 0,
    quality_score REAL DEFAULT 100,
    risk_level TEXT DEFAULT 'LOW' CHECK(risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    ai_model TEXT DEFAULT 'LSTM-ColdChain-v1',
    recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coldchain_ustn ON cold_chain_predictions(ustn);

-- ═══════════════════════════════════════════════════════════
-- 3. Demurrage/Detention Predictions (Step 5.4.7)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS demurrage_predictions (
    id TEXT PRIMARY KEY,
    ustn TEXT NOT NULL,
    prediction_type TEXT NOT NULL CHECK(prediction_type IN ('DEMURRAGE','DETENTION','BOTH')),
    probability REAL NOT NULL,
    predicted_days INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0,
    factors TEXT,                          -- JSON: {vessel_eta_delay, port_congestion, customs_duration, trucking_availability}
    recommendation TEXT,
    ai_model TEXT DEFAULT 'XGBoost-Demurrage-v1',
    notified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_demurrage_ustn ON demurrage_predictions(ustn);

-- ═══════════════════════════════════════════════════════════
-- 4. Document Validation Results (Step 5.3, G5UA1)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS document_validations (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    shipment_ustn TEXT,
    validation_type TEXT DEFAULT 'AI_EXTRACTION',
    extracted_data TEXT,                   -- JSON: AI-extracted fields
    expected_data TEXT,                    -- JSON: Contract/packing plan expected
    discrepancies TEXT,                    -- JSON: Array of {field, extracted, expected, deviation_pct}
    discrepancy_count INTEGER DEFAULT 0,
    max_deviation_pct REAL DEFAULT 0,
    validation_status TEXT DEFAULT 'PENDING' CHECK(validation_status IN ('PENDING','PASSED','FLAGGED','REJECTED')),
    ai_model TEXT DEFAULT 'HF-Donut-v1',
    ai_confidence REAL,
    governor_decision_id TEXT,
    validated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_docval_document ON document_validations(document_id);
CREATE INDEX IF NOT EXISTS idx_docval_ustn ON document_validations(shipment_ustn);

-- ═══════════════════════════════════════════════════════════
-- 5. Booking Confirmations (Step 5.2)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS booking_confirmations (
    id TEXT PRIMARY KEY,
    shipment_ustn TEXT NOT NULL,
    document_id TEXT,
    vessel_name TEXT,
    imo_number TEXT,
    voyage_number TEXT,
    etd TEXT,
    eta TEXT,
    container_numbers TEXT,               -- JSON array
    terminal TEXT,
    port TEXT,
    extraction_status TEXT DEFAULT 'PENDING' CHECK(extraction_status IN ('PENDING','EXTRACTED','VALIDATED','MISMATCH')),
    mismatches TEXT,                       -- JSON array of mismatch details
    ai_model TEXT DEFAULT 'HF-Donut-v1',
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_booking_ustn ON booking_confirmations(shipment_ustn);

-- ═══════════════════════════════════════════════════════════
-- 6. Extend shipments with additional Phase 5 fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE shipments ADD COLUMN voyage_number TEXT;
ALTER TABLE shipments ADD COLUMN terminal TEXT;
ALTER TABLE shipments ADD COLUMN temperature_set_point REAL;
ALTER TABLE shipments ADD COLUMN container_type TEXT DEFAULT 'DRY';
ALTER TABLE shipments ADD COLUMN pallet_count INTEGER DEFAULT 0;
ALTER TABLE shipments ADD COLUMN total_weight_kg REAL;
ALTER TABLE shipments ADD COLUMN fees_lock_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE shipments ADD COLUMN final_delivery_confirmed_at TEXT;

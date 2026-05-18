-- Migration 0023: Part 3 Phase 1 — New Blueprint Modifications
-- AI Dynamic Product Specification, Express Mode, Clone/Bulk, Global Notes AI
-- Governor Gates G1U1-G1U11 fully wired
-- =================================================================

-- 1. Express Mode intent parsing log
CREATE TABLE IF NOT EXISTS express_mode_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT,
  raw_text TEXT NOT NULL,
  source TEXT DEFAULT 'text',
  language TEXT DEFAULT 'en',
  parsed_result TEXT NOT NULL,
  confidence_overall REAL,
  field_confidences TEXT,
  ai_provider TEXT DEFAULT 'huggingface',
  ai_model TEXT,
  processing_time_ms INTEGER,
  human_confirmed INTEGER DEFAULT 0,
  human_corrections TEXT,
  loom_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_express_mode_tenant ON express_mode_logs(tenant_id);

-- 2. Clone/Bulk operation audit log
CREATE TABLE IF NOT EXISTS container_operations_log (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  operation_type TEXT NOT NULL,
  source_container_index INTEGER,
  target_container_indices TEXT,
  fields_applied TEXT,
  pattern_incremented TEXT,
  actor_gtid TEXT,
  actor_employee_id TEXT,
  undone INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_container_ops_trade ON container_operations_log(trade_request_id);

-- 3. AI Product Specification templates (cached per commodity/product)
CREATE TABLE IF NOT EXISTS ai_product_spec_templates (
  id TEXT PRIMARY KEY,
  commodity_type TEXT NOT NULL,
  product_name TEXT,
  hs_code TEXT,
  spec_fields TEXT NOT NULL,
  ai_provider TEXT DEFAULT 'groq',
  cache_ttl_hours INTEGER DEFAULT 168,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_spec_template_lookup ON ai_product_spec_templates(commodity_type, product_name);
CREATE INDEX IF NOT EXISTS idx_ai_spec_template_hs ON ai_product_spec_templates(hs_code);

-- 4. AI Notes suggestions log
CREATE TABLE IF NOT EXISTS ai_notes_suggestions (
  id TEXT PRIMARY KEY,
  trade_request_id TEXT,
  tenant_id TEXT NOT NULL,
  trade_context TEXT NOT NULL,
  suggestions TEXT NOT NULL,
  ai_provider TEXT DEFAULT 'groq',
  accepted_suggestions TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Agent mesh sessions (G1U1: session initialisation)
CREATE TABLE IF NOT EXISTS agent_mesh_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  employee_id TEXT,
  session_type TEXT NOT NULL,
  agents_activated TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  loom_entries TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_mesh_tenant ON agent_mesh_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_mesh_status ON agent_mesh_sessions(status);

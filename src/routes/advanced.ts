// SGTX Platform v6.2 — Advanced Routes (Complete Blueprint Gap Implementation)
// All routes aligned with actual D1 schema from migrations
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const advanced = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// IoT SENSOR READINGS (Phase 5 — Blueprint 4005)
// Schema: id, ustn, sensor_type, value, unit, latitude, longitude, device_id, battery_pct, signal_strength, anomaly_flag, recorded_at
// ═══════════════════════════════════════════════════════════

advanced.get('/iot-readings', async (c) => {
  const ustn = c.req.query('ustn');
  const sensorType = c.req.query('sensor_type');
  let sql = 'SELECT * FROM iot_sensor_readings';
  const conds: string[] = [];
  const binds: any[] = [];
  if (ustn) { conds.push('ustn = ?'); binds.push(ustn); }
  if (sensorType) { conds.push('sensor_type = ?'); binds.push(sensorType); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY recorded_at DESC LIMIT 200';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

advanced.post('/iot-readings', async (c) => {
  const body = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'iot.record', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: body.ustn, sensor_type: body.sensor_type, value: body.value },
  });

  await c.env.DB.prepare(`
    INSERT INTO iot_sensor_readings (ustn, sensor_type, value, unit, anomaly_flag, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(body.ustn, body.sensor_type, String(body.value), body.unit || 'celsius',
    body.anomaly_flag ? 1 : 0, body.recorded_at || isoNow()).run();

  let alert = null;
  if (body.sensor_type === 'TEMPERATURE' && body.value > 8) {
    alert = { type: 'TEMPERATURE_BREACH', message: `Temperature ${body.value}°C exceeds cold-chain limit`, severity: 'HIGH' };
  } else if (body.sensor_type === 'HUMIDITY' && body.value > 90) {
    alert = { type: 'HUMIDITY_BREACH', message: `Humidity ${body.value}% exceeds threshold`, severity: 'MEDIUM' };
  }
  return c.json({ data: { alert, governor_decision: gov }, message: 'IoT reading recorded' }, 201);
});

advanced.get('/iot-readings/:ustn/stats', async (c) => {
  const ustn = c.req.param('ustn');
  const total = await c.env.DB.prepare('SELECT COUNT(*) as c FROM iot_sensor_readings WHERE ustn = ?').bind(ustn).first();
  const anomalies = await c.env.DB.prepare('SELECT COUNT(*) as c FROM iot_sensor_readings WHERE ustn = ? AND anomaly_flag = 1').bind(ustn).first();
  const tempAvg = await c.env.DB.prepare("SELECT AVG(value) as avg, MIN(value) as min, MAX(value) as max FROM iot_sensor_readings WHERE ustn = ? AND sensor_type = 'TEMPERATURE'").bind(ustn).first();
  const humAvg = await c.env.DB.prepare("SELECT AVG(value) as avg, MIN(value) as min, MAX(value) as max FROM iot_sensor_readings WHERE ustn = ? AND sensor_type = 'HUMIDITY'").bind(ustn).first();
  return c.json({
    data: {
      total_readings: (total as any)?.c || 0,
      anomaly_count: (anomalies as any)?.c || 0,
      temperature: tempAvg || {},
      humidity: humAvg || {},
    }
  });
});

// ═══════════════════════════════════════════════════════════
// eBL MANAGEMENT (Phase 5)
// ebl_capability_matrix: carrier_id PK, carrier_name, supported_platforms, supported_routes, last_verified, is_active
// shipment_ebls: id, shipment_ustn, platform, platform_reference, issue_date, current_holder_gtid, status, events, created_at
// ═══════════════════════════════════════════════════════════

advanced.get('/ebl-capability', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM ebl_capability_matrix WHERE is_active = 1 ORDER BY carrier_name ASC').all();
  return c.json({ data: results });
});

advanced.post('/ebl-capability', async (c) => {
  const body = await c.req.json();
  const id = body.carrier_id || uuid();
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO ebl_capability_matrix (carrier_id, carrier_name, supported_platforms, supported_routes, last_verified, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(id, body.carrier_name, JSON.stringify(body.supported_platforms || []),
    JSON.stringify(body.supported_routes || []), isoNow()).run();
  return c.json({ data: { carrier_id: id }, message: 'eBL capability registered' }, 201);
});

advanced.get('/ebls', async (c) => {
  const ustn = c.req.query('ustn');
  let sql = `SELECT se.*, ecm.carrier_name FROM shipment_ebls se LEFT JOIN ebl_capability_matrix ecm ON se.platform = ecm.carrier_name`;
  if (ustn) sql += ` WHERE se.shipment_ustn = '${ustn}'`;
  sql += ' ORDER BY se.created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/ebls', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'ebl.issue', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: body.shipment_ustn, platform: body.platform },
  });

  await c.env.DB.prepare(`
    INSERT INTO shipment_ebls (id, shipment_ustn, platform, platform_reference, issue_date, current_holder_gtid, status, events)
    VALUES (?, ?, ?, ?, ?, ?, 'ISSUED', ?)
  `).bind(id, body.shipment_ustn, body.platform || 'essDOCS',
    body.platform_reference || `EBL-${uuid().slice(0, 8)}`,
    isoNow(), body.current_holder_gtid || null,
    JSON.stringify(body.events || [{ type: 'ISSUED', at: isoNow() }])).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'eBL issued' }, 201);
});

advanced.patch('/ebls/:id/transfer', async (c) => {
  const body = await c.req.json();
  const ebl = await c.env.DB.prepare('SELECT * FROM shipment_ebls WHERE id = ?').bind(c.req.param('id')).first();
  if (!ebl) return c.json({ error: 'eBL not found' }, 404);
  const events = JSON.parse((ebl.events as string) || '[]');
  events.push({ type: 'TRANSFERRED', to: body.transferred_to, at: isoNow() });
  await c.env.DB.prepare("UPDATE shipment_ebls SET status = 'TRANSFERRED', current_holder_gtid = ?, events = ? WHERE id = ?")
    .bind(body.transferred_to, JSON.stringify(events), c.req.param('id')).run();
  return c.json({ message: 'eBL transferred' });
});

// ═══════════════════════════════════════════════════════════
// COMMODITY COMPATIBILITY WARNINGS (Phase 1)
// Schema: id, trade_request_id, conflicting_commodities, warning_type, message, overridden_by, override_reason
// ═══════════════════════════════════════════════════════════

advanced.get('/commodity-warnings', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  let sql = 'SELECT * FROM commodity_compatibility_warnings';
  if (tradeId) sql += ` WHERE trade_request_id = '${tradeId}'`;
  sql += ' ORDER BY id DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/commodity-warnings', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO commodity_compatibility_warnings (id, trade_request_id, conflicting_commodities, warning_type, message)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id, JSON.stringify(body.conflicting_commodities || []),
    body.warning_type || 'INCOMPATIBLE', body.message || null).run();
  return c.json({ data: { id }, message: 'Commodity warning created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// HS CODE CLASSIFICATION (Phase 1)
// Schema: id, trade_request_id, hs_code_6digit, hs_code_8digit, confidence, dual_use_flag, governor_decision_id
// ═══════════════════════════════════════════════════════════

advanced.get('/hs-codes', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  let sql = 'SELECT * FROM hs_code_classifications';
  if (tradeId) sql += ` WHERE trade_request_id = '${tradeId}'`;
  sql += ' ORDER BY id DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/hs-codes', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO hs_code_classifications (id, trade_request_id, hs_code_6digit, hs_code_8digit, confidence, dual_use_flag, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id || null, body.hs_code_6digit || null,
    body.hs_code_8digit || null, body.confidence || 0.85,
    body.dual_use_flag ? 1 : 0, body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'HS code classification stored' }, 201);
});

// ═══════════════════════════════════════════════════════════
// CARRIER PERFORMANCE PROFILES (Phase 5)
// Schema: carrier_id PK, carrier_name, on_time_pct, dispute_rate, esg_score, last_updated
// ═══════════════════════════════════════════════════════════

advanced.get('/carrier-profiles', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM carrier_performance_profiles ORDER BY carrier_name ASC').all();
  return c.json({ data: results });
});

advanced.post('/carrier-profiles', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO carrier_performance_profiles (carrier_id, carrier_name, on_time_pct, dispute_rate, esg_score, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(body.carrier_id || uuid(), body.carrier_name, body.on_time_pct || 0,
    body.dispute_rate || 0, body.esg_score || 50, isoNow()).run();
  return c.json({ message: 'Carrier profile updated' }, 201);
});

// ═══════════════════════════════════════════════════════════
// PROVIDER INVOICES (Phase 2)
// Schema: id, shipment_ustn, provider_quote_id, provider_gtid, invoice_amount, extracted_amount, discrepancy_flagged, document_id, status
// ═══════════════════════════════════════════════════════════

advanced.get('/provider-invoices', async (c) => {
  const gtid = c.req.query('provider_gtid');
  let sql = 'SELECT pi.*, t.legal_name as provider_name FROM provider_invoices pi LEFT JOIN tenants t ON pi.provider_gtid = t.gtid';
  if (gtid) sql += ` WHERE pi.provider_gtid = '${gtid}'`;
  sql += ' ORDER BY pi.id DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/provider-invoices', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO provider_invoices (id, shipment_ustn, provider_quote_id, provider_gtid, invoice_amount, extracted_amount, discrepancy_flagged, document_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).bind(id, body.shipment_ustn || null, body.provider_quote_id || null,
    body.provider_gtid, body.invoice_amount || 0, body.extracted_amount || 0,
    body.discrepancy_flagged ? 1 : 0, body.document_id || null).run();
  return c.json({ data: { id }, message: 'Provider invoice created' }, 201);
});

advanced.patch('/provider-invoices/:id/status', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE provider_invoices SET status = ? WHERE id = ?')
    .bind(body.status, c.req.param('id')).run();
  return c.json({ message: 'Invoice status updated' });
});

// ═══════════════════════════════════════════════════════════
// SANCTIONS PROXIMITY (Phase 7)
// Schema: id, tenant_gtid, sanctioned_entity_gtid, proximity_hops, relationship_path, risk_score, detected_at
// ═══════════════════════════════════════════════════════════

advanced.get('/sanctions-proximity', async (c) => {
  const gtid = c.req.query('tenant_gtid');
  let sql = 'SELECT * FROM sanctions_proximity';
  if (gtid) sql += ` WHERE tenant_gtid = '${gtid}'`;
  sql += ' ORDER BY risk_score DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/sanctions-proximity', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'sanctions.proximity', actor_gtid: body.actor_gtid || 'system',
    action_context: { target_gtid: body.tenant_gtid, proximity_score: body.risk_score },
  });

  await c.env.DB.prepare(`
    INSERT INTO sanctions_proximity (id, tenant_gtid, sanctioned_entity_gtid, proximity_hops, relationship_path, risk_score)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.tenant_gtid, body.sanctioned_entity_gtid || null,
    body.proximity_hops || 1, JSON.stringify(body.relationship_path || []),
    body.risk_score || 0).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Sanctions proximity check recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SHELL DETECTION (Phase 7)
// Schema: id, tenant_gtid, detection_signals, confidence, reviewed, reviewed_at
// ═══════════════════════════════════════════════════════════

advanced.get('/shell-detection', async (c) => {
  const gtid = c.req.query('tenant_gtid');
  let sql = 'SELECT * FROM shell_detection';
  if (gtid) sql += ` WHERE tenant_gtid = '${gtid}'`;
  sql += ' ORDER BY id DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/shell-detection', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'shell.detect', actor_gtid: body.actor_gtid || 'system',
    action_context: { target_gtid: body.tenant_gtid, shell_score: body.confidence },
  });

  await c.env.DB.prepare(`
    INSERT INTO shell_detection (id, tenant_gtid, detection_signals, confidence, reviewed)
    VALUES (?, ?, ?, ?, 0)
  `).bind(id, body.tenant_gtid, JSON.stringify(body.detection_signals || []),
    body.confidence || 0).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Shell detection check recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// FRAUD DETECTION (Phase 7)
// Schema: id, tenant_gtid, fraud_type, graph_cycle_detected, confidence, detected_at
// ═══════════════════════════════════════════════════════════

advanced.get('/fraud-detection', async (c) => {
  const gtid = c.req.query('tenant_gtid');
  let sql = 'SELECT * FROM fraud_detection';
  if (gtid) sql += ` WHERE tenant_gtid = '${gtid}'`;
  sql += ' ORDER BY detected_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/fraud-detection', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'fraud.detect', actor_gtid: body.actor_gtid || 'system',
    action_context: { target_gtid: body.tenant_gtid, fraud_score: body.confidence, fraud_type: body.fraud_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO fraud_detection (id, tenant_gtid, fraud_type, graph_cycle_detected, confidence)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, body.tenant_gtid, body.fraud_type,
    body.graph_cycle_detected ? 1 : 0, body.confidence || 0).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Fraud detection recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// MODEL DRIFT RECORDS (Phase AI)
// Schema: id, model_name, metric_name, baseline_value, current_value, drift_score, threshold_exceeded, retraining_triggered, detected_at
// ═══════════════════════════════════════════════════════════

advanced.get('/model-drift', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM model_drift_records ORDER BY detected_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

advanced.post('/model-drift', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'model.drift.record', actor_gtid: body.actor_gtid || 'system',
    action_context: { model_name: body.model_name, drift_score: body.drift_score },
  });

  await c.env.DB.prepare(`
    INSERT INTO model_drift_records (id, model_name, metric_name, baseline_value, current_value, drift_score, threshold_exceeded, retraining_triggered)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.model_name, body.metric_name || 'accuracy',
    body.baseline_value || 0, body.current_value || 0, body.drift_score || 0,
    body.threshold_exceeded ? 1 : 0, body.retraining_triggered ? 1 : 0).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Model drift recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// POLICY SUGGESTIONS (Phase Gov)
// Schema: id, suggested_by, rego_diff, rationale, supporting_data, status, reviewed_by, applied_at, created_at
// ═══════════════════════════════════════════════════════════

advanced.get('/policy-suggestions', async (c) => {
  const status = c.req.query('status');
  let sql = 'SELECT * FROM policy_suggestions';
  if (status) sql += ` WHERE status = '${status}'`;
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/policy-suggestions', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO policy_suggestions (id, suggested_by, rego_diff, rationale, supporting_data, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING_REVIEW')
  `).bind(id, body.suggested_by || 'AI_POLICY_TUNER', body.rego_diff || body.suggested_change || '',
    body.rationale || '', JSON.stringify(body.supporting_data || {})).run();
  return c.json({ data: { id }, message: 'Policy suggestion proposed' }, 201);
});

advanced.patch('/policy-suggestions/:id/review', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE policy_suggestions SET status = ?, reviewed_by = ?, applied_at = ? WHERE id = ?')
    .bind(body.status, body.reviewed_by || null, body.status === 'APPLIED' ? isoNow() : null, c.req.param('id')).run();
  return c.json({ message: 'Policy suggestion reviewed' });
});

// ═══════════════════════════════════════════════════════════
// FEE OPTIMIZATION RUNS (Phase 6)
// Schema: id, current_rates, proposed_rates, expected_revenue, expected_volume, confidence, status, created_at
// ═══════════════════════════════════════════════════════════

advanced.get('/fee-optimization', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM fee_optimisation_runs ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

advanced.post('/fee-optimization', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'fee.optimize', actor_gtid: body.actor_gtid || 'system',
    action_context: { optimization_type: body.optimization_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO fee_optimisation_runs (id, current_rates, proposed_rates, expected_revenue, expected_volume, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
  `).bind(id, JSON.stringify(body.current_rates || {}), JSON.stringify(body.proposed_rates || {}),
    body.expected_revenue || 0, body.expected_volume || 0, body.confidence || 0.8).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Fee optimization completed' }, 201);
});

// ═══════════════════════════════════════════════════════════
// LIVING QUOTES (Phase 2)
// Schema: id, exporter_quote_id FK, dynamic_pricing_enabled, primary_route, contingency_route, last_price_update, status, governor_decision_id FK
// ═══════════════════════════════════════════════════════════

advanced.get('/living-quotes', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT lq.*, eq.exw_price, eq.trade_request_id, t.legal_name as exporter_name
    FROM living_quotes lq
    LEFT JOIN exporter_quotes eq ON lq.exporter_quote_id = eq.id
    LEFT JOIN tenants t ON eq.exporter_tenant_id = t.id
    WHERE lq.status = 'ACTIVE'
    ORDER BY lq.last_price_update DESC LIMIT 100
  `).all();
  return c.json({ data: results });
});

advanced.post('/living-quotes', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'quote.submit', actor_gtid: body.actor_gtid || 'system',
    action_context: { exporter_quote_id: body.exporter_quote_id },
  });

  await c.env.DB.prepare(`
    INSERT INTO living_quotes (id, exporter_quote_id, dynamic_pricing_enabled, primary_route, contingency_route, last_price_update, status, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).bind(id, body.exporter_quote_id, body.dynamic_pricing_enabled !== false ? 1 : 0,
    body.primary_route || null, body.contingency_route || null,
    isoNow(), gov.decision_id).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'Living quote created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// TRADE COMPOSER INTERACTIONS (Phase 1)
// Schema: interaction_id PK, trade_request_id, session_id, turn_number, user_message, agent_responses, suggested_actions, user_selected_action, context_delta, created_at
// ═══════════════════════════════════════════════════════════

advanced.get('/trade-composer', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  let sql = 'SELECT * FROM trade_composer_interactions';
  if (tradeId) sql += ` WHERE trade_request_id = '${tradeId}'`;
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/trade-composer', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // AI-powered trade description parsing simulation
  const parsed = {
    commodity: body.extracted_commodity || 'Auto-detected',
    quantity: body.extracted_quantity || null,
    origin: body.extracted_origin || null,
    destination: body.extracted_destination || null,
  };

  await c.env.DB.prepare(`
    INSERT INTO trade_composer_interactions (interaction_id, trade_request_id, session_id, turn_number, user_message, agent_responses, suggested_actions, context_delta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id || null, body.session_id || uuid(),
    body.turn_number || 1, body.raw_input || body.user_message || '',
    JSON.stringify({ parsed_fields: parsed, confidence: body.ai_confidence || 0.8 }),
    JSON.stringify(body.suggested_actions || ['Create Trade Request']),
    JSON.stringify(body.context_delta || {})).run();

  return c.json({ data: { interaction_id: id, parsed_fields: parsed }, message: 'Trade composer interaction stored' }, 201);
});

// ═══════════════════════════════════════════════════════════
// TOKENIZED TRADE ASSETS (Phase 4)
// Schema: id, financing_agreement_id FK, token_standard, token_address, pricing_model, secondary_market_enabled, governor_decision_id
// ═══════════════════════════════════════════════════════════

advanced.get('/tokenized-assets', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tokenized_trade_assets ORDER BY id DESC LIMIT 100').all();
  return c.json({ data: results });
});

advanced.post('/tokenized-assets', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'defi.transaction', actor_gtid: body.actor_gtid || 'system',
    action_context: { token_standard: body.token_standard },
  });

  await c.env.DB.prepare(`
    INSERT INTO tokenized_trade_assets (id, financing_agreement_id, token_standard, token_address, pricing_model, secondary_market_enabled, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.financing_agreement_id || null, body.token_standard || 'ERC-721',
    body.token_address || `0x${uuid().replace(/-/g, '')}`,
    body.pricing_model || 'FACE_VALUE', body.secondary_market_enabled ? 1 : 0,
    gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Trade asset tokenized' }, 201);
});

// ═══════════════════════════════════════════════════════════
// BLOCKCHAIN VERIFICATIONS (Phase 4)
// Schema: id, financing_agreement_id FK, contract_address, transaction_hash, verification_status, governor_decision_id
// ═══════════════════════════════════════════════════════════

advanced.get('/blockchain-verifications', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM blockchain_verifications ORDER BY id DESC LIMIT 100').all();
  return c.json({ data: results });
});

advanced.post('/blockchain-verifications', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO blockchain_verifications (id, financing_agreement_id, contract_address, transaction_hash, verification_status, governor_decision_id)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, body.financing_agreement_id || null, body.contract_address || null,
    body.transaction_hash || `0x${uuid().replace(/-/g, '')}`,
    body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Blockchain verification recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// INDIVIDUAL FINANCIERS (Phase 4)
// Schema: id, tenant_id FK, accreditation_status, investment_capacity, preferred_instruments, risk_tolerance, active
// ═══════════════════════════════════════════════════════════

advanced.get('/individual-financiers', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT if2.*, t.legal_name as tenant_name FROM individual_financiers if2 LEFT JOIN tenants t ON if2.tenant_id = t.id WHERE if2.active = 1 ORDER BY if2.id DESC').all();
  return c.json({ data: results });
});

advanced.post('/individual-financiers', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO individual_financiers (id, tenant_id, accreditation_status, investment_capacity, preferred_instruments, risk_tolerance, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(id, body.tenant_id, body.accreditation_status || 'PENDING',
    body.investment_capacity || 0, JSON.stringify(body.preferred_instruments || []),
    body.risk_tolerance || 0.5).run();
  return c.json({ data: { id }, message: 'Individual financier registered' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SHIPMENT SCHEDULES (Phase 5)
// Schema: id, contract_id FK, shipment_number, ustn, scheduled_loading_date, scheduled_delivery_date, contingency_plan, governor_decision_id
// ═══════════════════════════════════════════════════════════

advanced.get('/shipment-schedules', async (c) => {
  const contractId = c.req.query('contract_id');
  let sql = 'SELECT ss.*, s.status as shipment_status FROM shipment_schedules ss LEFT JOIN shipments s ON ss.ustn = s.ustn';
  if (contractId) sql += ` WHERE ss.contract_id = '${contractId}'`;
  sql += ' ORDER BY ss.scheduled_loading_date ASC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/shipment-schedules', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO shipment_schedules (id, contract_id, shipment_number, ustn, scheduled_loading_date, scheduled_delivery_date, contingency_plan, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.contract_id, body.shipment_number || 1, body.ustn || null,
    body.scheduled_loading_date, body.scheduled_delivery_date || null,
    JSON.stringify(body.contingency_plan || {}), body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Shipment schedule created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SMART CLAUSE EXECUTIONS (Phase 3)
// Schema: id, contract_id FK, clause_id, solidity_pseudocode, deployment_status, governor_decision_id
// ═══════════════════════════════════════════════════════════

advanced.get('/smart-clauses', async (c) => {
  const contractId = c.req.query('contract_id');
  let sql = 'SELECT * FROM smart_clause_executions';
  if (contractId) sql += ` WHERE contract_id = '${contractId}'`;
  sql += ' ORDER BY id DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

advanced.post('/smart-clauses', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'contract.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { contract_id: body.contract_id, clause_id: body.clause_id },
  });

  await c.env.DB.prepare(`
    INSERT INTO smart_clause_executions (id, contract_id, clause_id, solidity_pseudocode, deployment_status, governor_decision_id)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, body.contract_id, body.clause_id || null,
    body.solidity_pseudocode || body.trigger_condition || null,
    gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Smart clause execution created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// ADVANCED STATS
// ═══════════════════════════════════════════════════════════

advanced.get('/advanced-stats', async (c) => {
  const tables = [
    'iot_sensor_readings', 'shipment_ebls', 'commodity_compatibility_warnings',
    'hs_code_classifications', 'carrier_performance_profiles', 'provider_invoices',
    'sanctions_proximity', 'shell_detection', 'fraud_detection',
    'model_drift_records', 'policy_suggestions', 'fee_optimisation_runs',
    'living_quotes', 'trade_composer_interactions', 'tokenized_trade_assets',
    'blockchain_verifications', 'individual_financiers', 'shipment_schedules',
    'smart_clause_executions',
  ];
  const queries = tables.map(t => c.env.DB.prepare(`SELECT COUNT(*) as c FROM ${t}`).first());
  const results = await Promise.allSettled(queries);
  const val = (i: number) => {
    const r = results[i];
    return r.status === 'fulfilled' && r.value ? (r.value as any).c || 0 : 0;
  };

  return c.json({
    data: {
      iot_readings: val(0), ebls: val(1), commodity_warnings: val(2), hs_codes: val(3),
      carrier_profiles: val(4), provider_invoices: val(5), sanctions_proximity: val(6),
      shell_detection: val(7), fraud_detection: val(8), model_drift: val(9),
      policy_suggestions: val(10), fee_optimization: val(11), living_quotes: val(12),
      trade_composer: val(13), tokenized_assets: val(14), blockchain_verifications: val(15),
      individual_financiers: val(16), shipment_schedules: val(17), smart_clauses: val(18),
    }
  });
});

export default advanced;

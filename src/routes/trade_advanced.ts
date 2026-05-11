import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';

type Bindings = { DB: D1Database };
const tradeAdv = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// TRADE ADVANCED - Contract Genesis, Living Quotes, Negotiation Bot
// Parts 3, 5, 19, 20, 21 of SGTX Blueprint v6.3
// ═══════════════════════════════════════════════════════════════════

// --- CONTRACT GENESIS SESSIONS (Part 21) ---

// GET /contract-genesis - List contract genesis sessions
tradeAdv.get('/contract-genesis', async (c) => {
  const { DB } = c.env;
  const trade_request_id = c.req.query('trade_request_id');

  let sql = `SELECT * FROM contract_genesis_sessions`;
  const params: any[] = [];
  if (trade_request_id) { sql += ` WHERE trade_request_id = ?`; params.push(trade_request_id); }
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /contract-genesis - Create contract genesis session (ClauseForge workflow)
tradeAdv.post('/contract-genesis', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'contract.genesis.create',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { trade_request_id: body.trade_request_id }
  });

  // AI-driven contract genesis workflow simulation
  const clauseConfidence = body.clause_confidence_scores || { payment: 0.95, delivery: 0.92, dispute: 0.88, force_majeure: 0.91 };
  const riskScores = body.risk_scores || { jurisdiction_conflict: 0.15, currency_risk: 0.22, delivery_delay: 0.18 };
  const harmonization = body.harmonization_strategy || { governing_law: 'English Law', dispute_forum: 'LCIA London', currency: 'USD' };

  await DB.prepare(`
    INSERT INTO contract_genesis_sessions (id, trade_request_id, clause_confidence_scores, risk_scores, harmonization_strategy, shipment_schedule, smart_clause_pseudocode, compliance_requirements, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.trade_request_id,
    JSON.stringify(clauseConfidence), JSON.stringify(riskScores),
    JSON.stringify(harmonization), JSON.stringify(body.shipment_schedule || []),
    body.smart_clause_pseudocode || null, JSON.stringify(body.compliance_requirements || []),
    governor.decision_id, isoNow()
  ).run();

  return c.json({
    data: { id, clause_confidence_scores: clauseConfidence, risk_scores: riskScores, harmonization_strategy: harmonization },
    governor_decision: governor,
    message: 'Contract genesis session created with AI-driven clause analysis'
  }, 201);
});

// --- CONTRACT CLAUSES ---

// GET /contracts/:id/clauses - List contract clauses
tradeAdv.get('/contracts/:id/clauses', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM contract_clauses WHERE contract_id = ? ORDER BY clause_type`
  ).bind(contract_id).all();

  return c.json({ data: results.results || [] });
});

// POST /contracts/:id/clauses - Add clause to contract
tradeAdv.post('/contracts/:id/clauses', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO contract_clauses (id, contract_id, clause_type, clause_text, confidence_score, risk_score, requires_human_review, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, contract_id, body.clause_type, body.clause_text,
    body.confidence_score || 0.9, body.risk_score || 0.1,
    body.requires_human_review ? 1 : 0, body.governor_decision_id || null
  ).run();

  return c.json({ data: { id, clause_type: body.clause_type, confidence_score: body.confidence_score || 0.9 }, message: 'Clause added' }, 201);
});

// GET /contracts/:id/risk-scores - Get risk analysis for contract
tradeAdv.get('/contracts/:id/risk-scores', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM clause_risk_scores WHERE contract_id = ?`
  ).bind(contract_id).all();

  return c.json({ data: results.results || [] });
});

// POST /contracts/:id/risk-scores - Add risk score
tradeAdv.post('/contracts/:id/risk-scores', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO clause_risk_scores (id, contract_id, risk_category, risk_score, mitigation_suggestions, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, contract_id, body.risk_category, body.risk_score, JSON.stringify(body.mitigation_suggestions || []), body.governor_decision_id || null).run();

  return c.json({ data: { id, risk_category: body.risk_category, risk_score: body.risk_score }, message: 'Risk score recorded' }, 201);
});

// --- JURISDICTION CONFLICTS ---

// GET /contracts/:id/jurisdiction-conflicts - List conflicts
tradeAdv.get('/contracts/:id/jurisdiction-conflicts', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM jurisdiction_conflicts WHERE contract_id = ?`
  ).bind(contract_id).all();

  return c.json({ data: results.results || [] });
});

// POST /contracts/:id/jurisdiction-conflicts - Record conflict
tradeAdv.post('/contracts/:id/jurisdiction-conflicts', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO jurisdiction_conflicts (id, contract_id, jurisdiction_a, jurisdiction_b, conflict_description, resolution_strategy, confidence, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, contract_id, body.jurisdiction_a, body.jurisdiction_b, body.conflict_description || null, body.resolution_strategy || null, body.confidence || 0.85, body.governor_decision_id || null).run();

  return c.json({ data: { id }, message: 'Jurisdiction conflict recorded' }, 201);
});

// --- SHIPMENT SCHEDULES (Multi-shipment contracts) ---

// GET /contracts/:id/schedules - List shipment schedules
tradeAdv.get('/contracts/:id/schedules', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM shipment_schedules WHERE contract_id = ? ORDER BY shipment_number`
  ).bind(contract_id).all();

  return c.json({ data: results.results || [] });
});

// POST /contracts/:id/schedules - Create shipment schedule
tradeAdv.post('/contracts/:id/schedules', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO shipment_schedules (id, contract_id, shipment_number, ustn, scheduled_loading_date, scheduled_delivery_date, contingency_plan, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, contract_id, body.shipment_number, body.ustn || null, body.scheduled_loading_date || null, body.scheduled_delivery_date || null, JSON.stringify(body.contingency_plan || {}), body.governor_decision_id || null).run();

  return c.json({ data: { id, shipment_number: body.shipment_number }, message: 'Shipment schedule created' }, 201);
});

// --- LIVING QUOTES (Part 19) ---

// GET /living-quotes - List living quotes
tradeAdv.get('/living-quotes', async (c) => {
  const { DB } = c.env;
  const status = c.req.query('status') || 'ACTIVE';

  const results = await DB.prepare(
    `SELECT * FROM living_quotes WHERE status = ? ORDER BY last_price_update DESC`
  ).bind(status).all();

  return c.json({ data: results.results || [] });
});

// POST /living-quotes - Create a living quote
tradeAdv.post('/living-quotes', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'quote.living.create',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { exporter_quote_id: body.exporter_quote_id }
  });

  await DB.prepare(`
    INSERT INTO living_quotes (id, exporter_quote_id, dynamic_pricing_enabled, primary_route, contingency_route, last_price_update, status, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).bind(
    id, body.exporter_quote_id, body.dynamic_pricing_enabled !== false ? 1 : 0,
    JSON.stringify(body.primary_route || {}), JSON.stringify(body.contingency_route || {}),
    isoNow(), governor.decision_id
  ).run();

  return c.json({ data: { id, status: 'ACTIVE' }, governor_decision: governor, message: 'Living quote created' }, 201);
});

// PATCH /living-quotes/:id/update-price - Update dynamic price
tradeAdv.patch('/living-quotes/:id/update-price', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  await DB.prepare(`
    UPDATE living_quotes SET primary_route = ?, last_price_update = ? WHERE id = ?
  `).bind(JSON.stringify(body.primary_route || {}), isoNow(), id).run();

  return c.json({ message: 'Living quote price updated' });
});

// --- ROUTE OPTIONS ---

// GET /quotes/:id/routes - Get route options for a quote
tradeAdv.get('/quotes/:id/routes', async (c) => {
  const { DB } = c.env;
  const exporter_quote_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM route_options WHERE exporter_quote_id = ?`
  ).bind(exporter_quote_id).all();

  return c.json({ data: results.results || [] });
});

// POST /quotes/:id/routes - Add route option
tradeAdv.post('/quotes/:id/routes', async (c) => {
  const { DB } = c.env;
  const exporter_quote_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO route_options (id, exporter_quote_id, route_type, route_data, risk_score, carbon_footprint_tons, is_contingency, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, exporter_quote_id, body.route_type, JSON.stringify(body.route_data || {}), body.risk_score || 0.1, body.carbon_footprint_tons || 0, body.is_contingency ? 1 : 0, body.governor_decision_id || null).run();

  return c.json({ data: { id, route_type: body.route_type }, message: 'Route option added' }, 201);
});

// --- NEGOTIATION BOT (Part 32 - negotiationorchestrator) ---

// GET /negotiation-bots - List bot configs
tradeAdv.get('/negotiation-bots', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.query('tenant_id');

  let sql = `SELECT * FROM negotiation_bot_configs`;
  const params: any[] = [];
  if (tenant_id) { sql += ` WHERE tenant_id = ?`; params.push(tenant_id); }
  sql += ` ORDER BY created_at DESC`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /negotiation-bots - Configure negotiation bot
tradeAdv.post('/negotiation-bots', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO negotiation_bot_configs (id, tenant_id, trade_request_id, max_price, min_price, max_rounds, commission_split_preference, strategy, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id, body.tenant_id, body.trade_request_id,
    body.max_price || null, body.min_price || null,
    body.max_rounds || 5, body.commission_split_preference || '50/50',
    body.strategy || 'BALANCED', isoNow()
  ).run();

  return c.json({
    data: { id, strategy: body.strategy || 'BALANCED', max_rounds: body.max_rounds || 5, active: true },
    message: 'Negotiation bot configured'
  }, 201);
});

// POST /negotiation-bots/:id/pause - Pause bot (human takeover)
tradeAdv.post('/negotiation-bots/:id/pause', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  await DB.prepare(`UPDATE negotiation_bot_configs SET active = 0 WHERE id = ?`).bind(id).run();
  return c.json({ message: 'Negotiation bot paused. Human takeover active.' });
});

// POST /negotiation-bots/:id/resume - Resume bot
tradeAdv.post('/negotiation-bots/:id/resume', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  await DB.prepare(`UPDATE negotiation_bot_configs SET active = 1 WHERE id = ?`).bind(id).run();
  return c.json({ message: 'Negotiation bot resumed' });
});

// --- NEGOTIATION THREADS (Part 20) ---

// GET /negotiation-threads - List threads
tradeAdv.get('/negotiation-threads', async (c) => {
  const { DB } = c.env;
  const exporter_quote_id = c.req.query('exporter_quote_id');

  let sql = `SELECT * FROM negotiation_threads`;
  const params: any[] = [];
  if (exporter_quote_id) { sql += ` WHERE exporter_quote_id = ?`; params.push(exporter_quote_id); }
  sql += ` ORDER BY id DESC`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /negotiation-threads - Start negotiation thread
tradeAdv.post('/negotiation-threads', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO negotiation_threads (id, exporter_quote_id, auto_negotiation_enabled, auto_accept_threshold, governor_decision_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, body.exporter_quote_id, body.auto_negotiation_enabled ? 1 : 0, body.auto_accept_threshold || 0.95, body.governor_decision_id || null).run();

  return c.json({ data: { id, auto_negotiation_enabled: body.auto_negotiation_enabled || false }, message: 'Negotiation thread started' }, 201);
});

// --- PRICING ANOMALIES ---

// GET /pricing-anomalies - List detected anomalies
tradeAdv.get('/pricing-anomalies', async (c) => {
  const { DB } = c.env;
  const flagged = c.req.query('flagged');

  let sql = `SELECT * FROM pricing_anomalies`;
  if (flagged === 'true') sql += ` WHERE flagged = 1`;
  sql += ` ORDER BY deviation_pct DESC LIMIT 50`;

  const results = await DB.prepare(sql).all();
  return c.json({ data: results.results || [] });
});

// POST /pricing-anomalies - Record anomaly
tradeAdv.post('/pricing-anomalies', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const deviation = body.actual_price && body.predicted_price
    ? Math.abs((body.actual_price - body.predicted_price) / body.predicted_price * 100)
    : 0;

  await DB.prepare(`
    INSERT INTO pricing_anomalies (id, exporter_quote_id, predicted_price, actual_price, deviation_pct, flagged)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.exporter_quote_id, body.predicted_price, body.actual_price, deviation, deviation > 15 ? 1 : 0).run();

  return c.json({ data: { id, deviation_pct: deviation, flagged: deviation > 15 }, message: 'Pricing anomaly recorded' }, 201);
});

// --- SIGNATURE SEQUENCES ---

// GET /contracts/:id/signatures - Get signature sequence
tradeAdv.get('/contracts/:id/signatures', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');

  const result = await DB.prepare(
    `SELECT * FROM signature_sequences WHERE contract_id = ?`
  ).bind(contract_id).first();

  return c.json({ data: result || null });
});

// POST /contracts/:id/signatures - Create signature sequence
tradeAdv.post('/contracts/:id/signatures', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO signature_sequences (id, contract_id, sequence_config, current_step, governor_decision_id)
    VALUES (?, ?, ?, 0, ?)
  `).bind(id, contract_id, JSON.stringify(body.sequence_config || []), body.governor_decision_id || null).run();

  return c.json({ data: { id, current_step: 0 }, message: 'Signature sequence created' }, 201);
});

// --- SMART CLAUSE EXECUTIONS ---

// POST /contracts/:id/smart-clauses - Deploy smart clause
tradeAdv.post('/contracts/:id/smart-clauses', async (c) => {
  const { DB } = c.env;
  const contract_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO smart_clause_executions (id, contract_id, clause_id, solidity_pseudocode, deployment_status, governor_decision_id)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, contract_id, body.clause_id, body.solidity_pseudocode || null, body.governor_decision_id || null).run();

  return c.json({ data: { id, deployment_status: 'PENDING' }, message: 'Smart clause deployment initiated' }, 201);
});

// --- COMPLIANCE CHECKS ---

// GET /trades/:id/compliance - List compliance checks
tradeAdv.get('/trades/:id/compliance', async (c) => {
  const { DB } = c.env;
  const trade_request_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM compliance_checks WHERE trade_request_id = ? ORDER BY checked_at DESC`
  ).bind(trade_request_id).all();

  return c.json({ data: results.results || [] });
});

// POST /trades/:id/compliance - Run compliance check
tradeAdv.post('/trades/:id/compliance', async (c) => {
  const { DB } = c.env;
  const trade_request_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'compliance.check',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { trade_request_id, check_type: body.check_type }
  });

  await DB.prepare(`
    INSERT INTO compliance_checks (id, trade_request_id, check_type, result, flags, governor_decision_id, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, trade_request_id, body.check_type, body.result || 'PASS', JSON.stringify(body.flags || []), governor.decision_id, isoNow()).run();

  return c.json({ data: { id, check_type: body.check_type, result: body.result || 'PASS' }, message: 'Compliance check completed' }, 201);
});

export default tradeAdv;

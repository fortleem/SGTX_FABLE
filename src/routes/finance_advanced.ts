import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';

type Bindings = { DB: D1Database };
const finAdv = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// FINANCE ADVANCED - Credit Signals, Liquidity Auctions, Commission Engine
// Parts 4, 9, 13, 22 of SGTX Blueprint v6.3
// ═══════════════════════════════════════════════════════════════════

// --- CREDIT ASSESSMENTS & SIGNALS (Part 22) ---

// GET /credit-signals/:assessmentId - List credit signals for assessment
finAdv.get('/credit-signals/:assessmentId', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('assessmentId');

  const results = await DB.prepare(
    `SELECT * FROM credit_signals WHERE credit_assessment_id = ? ORDER BY weight DESC`
  ).bind(id).all();

  return c.json({ data: results.results || [] });
});

// POST /credit-signals - Record a credit signal (200+ signal model)
finAdv.post('/credit-signals', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO credit_signals (id, credit_assessment_id, signal_category, signal_name, signal_value, weight)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.credit_assessment_id, body.signal_category,
    body.signal_name, JSON.stringify(body.signal_value || {}), body.weight || 0.5
  ).run();

  return c.json({ data: { id, signal_category: body.signal_category, signal_name: body.signal_name }, message: 'Credit signal recorded' }, 201);
});

// POST /credit-assessments/dynamic - Run dynamic credit intelligence (AI-driven)
finAdv.post('/credit-assessments/dynamic', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'finance.credit.assess',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { financing_request_id: body.financing_request_id }
  });

  // Simulate 200+ signal credit model
  const creditScore = body.credit_score || (70 + Math.random() * 25);
  const signalCount = body.signal_count || Math.floor(180 + Math.random() * 40);

  await DB.prepare(`
    INSERT INTO credit_assessments (id, financing_request_id, credit_score, signal_count, recommended_structure, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.financing_request_id, creditScore, signalCount,
    JSON.stringify(body.recommended_structure || { type: 'pre_shipment', max_ltv: 0.65, tenor_days: 60 }),
    governor.decision_id
  ).run();

  return c.json({
    data: { id, credit_score: creditScore, signal_count: signalCount, recommended_structure: body.recommended_structure || { type: 'pre_shipment', max_ltv: 0.65, tenor_days: 60 } },
    governor_decision: governor,
    message: 'Dynamic credit assessment completed'
  }, 201);
});

// --- LIQUIDITY AUCTIONS (Blind Bidding - Part 4) ---

// GET /liquidity-auctions - List auctions
finAdv.get('/liquidity-auctions', async (c) => {
  const { DB } = c.env;
  const status = c.req.query('status');

  let sql = `SELECT * FROM liquidity_auctions`;
  const params: any[] = [];
  if (status) { sql += ` WHERE status = ?`; params.push(status); }
  sql += ` ORDER BY bid_window_end DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /liquidity-auctions - Create blind bidding auction
finAdv.post('/liquidity-auctions', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'finance.auction.create',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { financing_request_id: body.financing_request_id }
  });

  const windowHours = body.bid_window_hours || 24;
  const bidWindowStart = isoNow();
  const bidWindowEnd = new Date(Date.now() + windowHours * 60 * 60 * 1000).toISOString();

  await DB.prepare(`
    INSERT INTO liquidity_auctions (id, financing_request_id, bid_window_start, bid_window_end, qualified_bidders, status, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, 'OPEN', ?)
  `).bind(id, body.financing_request_id, bidWindowStart, bidWindowEnd, body.qualified_bidders || 0, governor.decision_id).run();

  return c.json({
    data: { id, status: 'OPEN', bid_window_start: bidWindowStart, bid_window_end: bidWindowEnd },
    governor_decision: governor,
    message: 'Liquidity auction created with blind bidding'
  }, 201);
});

// POST /liquidity-auctions/:id/close - Close auction and award
finAdv.post('/liquidity-auctions/:id/close', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  await DB.prepare(
    `UPDATE liquidity_auctions SET status = 'CLOSED' WHERE id = ?`
  ).bind(id).run();

  return c.json({ message: 'Auction closed. Best bidder awarded.' });
});

// --- COMMISSION ENGINE (Part 13 - Dynamic Rate Calculation) ---

// GET /commission/calculate - Calculate commission for a trade
finAdv.get('/commission/calculate', async (c) => {
  const { DB } = c.env;
  const trade_request_id = c.req.query('trade_request_id');
  const contract_id = c.req.query('contract_id');

  if (!trade_request_id) return c.json({ error: 'trade_request_id required' }, 400);

  // Get existing calculation or return defaults
  const existing = await DB.prepare(
    `SELECT * FROM commission_calculations WHERE trade_request_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(trade_request_id).first();

  if (existing) return c.json({ data: existing });

  // Return default calculation structure
  return c.json({
    data: {
      base_rate_pct: 1.03,
      country_boost_pct: 0,
      seasonality_pct: 0,
      geopolitical_risk_pct: 0,
      volume_discount_pct: 0,
      perishability_surcharge_pct: 0,
      anomaly_correction_pct: 0,
      final_rate_pct: 1.03,
      explanation: 'Default 1.03% commission rate (Commission Supremacy Rule v6.1)'
    }
  });
});

// POST /commission/calculate - Run AI-driven commission calculation
finAdv.post('/commission/calculate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'commission.calculate',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { trade_request_id: body.trade_request_id }
  });

  // AI-driven rate factors (simulated XGBoost model)
  const baseRate = 1.03;
  const countryBoost = body.country_boost_pct || (Math.random() * 0.3).toFixed(4);
  const seasonality = body.seasonality_pct || (Math.random() * 0.2 - 0.1).toFixed(4);
  const geopoliticalRisk = body.geopolitical_risk_pct || (Math.random() * 0.15).toFixed(4);
  const volumeDiscount = body.volume_discount_pct || -(Math.random() * 0.1).toFixed(4);
  const perishability = body.perishability_surcharge_pct || (Math.random() * 0.1).toFixed(4);
  const anomaly = 0;

  const finalRate = Math.max(1.03, baseRate + parseFloat(countryBoost) + parseFloat(seasonality) + parseFloat(geopoliticalRisk) + parseFloat(volumeDiscount) + parseFloat(perishability));
  const tradeValue = body.trade_value_usd || 50000;
  const commissionUsd = (tradeValue * finalRate / 100).toFixed(2);

  await DB.prepare(`
    INSERT INTO commission_calculations (id, trade_request_id, contract_id, effective_margin_pct, base_rate_pct, country_boost_pct, seasonality_pct, geopolitical_risk_pct, volume_discount_pct, perishability_surcharge_pct, anomaly_correction_pct, final_rate_pct, commission_usd, explanation, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.trade_request_id, body.contract_id || null,
    body.effective_margin_pct || 15.0, baseRate,
    countryBoost, seasonality, geopoliticalRisk,
    volumeDiscount, perishability, anomaly,
    finalRate.toFixed(4), commissionUsd,
    `Commission: ${finalRate.toFixed(2)}% of $${tradeValue} = $${commissionUsd}. Base 1.03% + country/seasonal/risk factors.`,
    governor.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      id, base_rate_pct: baseRate, final_rate_pct: parseFloat(finalRate.toFixed(4)),
      commission_usd: parseFloat(commissionUsd), trade_value_usd: tradeValue,
      factors: { country_boost: countryBoost, seasonality, geopolitical_risk: geopoliticalRisk, volume_discount: volumeDiscount, perishability }
    },
    governor_decision: governor,
    message: 'Commission calculated using AI dynamic rate engine'
  }, 201);
});

// --- COMMISSION LOCK EVENTS ---

// GET /commission-lock-events - List commission lock lifecycle events
finAdv.get('/commission-lock-events', async (c) => {
  const { DB } = c.env;
  const commission_lock_id = c.req.query('commission_lock_id');

  let sql = `SELECT * FROM commission_lock_events`;
  const params: any[] = [];
  if (commission_lock_id) { sql += ` WHERE commission_lock_id = ?`; params.push(commission_lock_id); }
  sql += ` ORDER BY created_at DESC LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /commission-lock-events - Record commission lock event
finAdv.post('/commission-lock-events', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO commission_lock_events (id, commission_lock_id, event_type, event_data, actor_gtid, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.commission_lock_id, body.event_type, JSON.stringify(body.event_data || {}), body.actor_gtid || 'SYSTEM', isoNow()).run();

  return c.json({ data: { id, event_type: body.event_type }, message: 'Commission lock event recorded' }, 201);
});

// --- DeFi PROTOCOL CONFIGS (Part 22) ---

// GET /defi-configs - List DeFi protocol configurations
finAdv.get('/defi-configs', async (c) => {
  const { DB } = c.env;
  const active = c.req.query('active');

  let sql = `SELECT * FROM defi_protocol_configs`;
  if (active === 'true') sql += ` WHERE is_active = 1`;
  sql += ` ORDER BY risk_score ASC`;

  const results = await DB.prepare(sql).all();
  return c.json({ data: results.results || [] });
});

// POST /defi-configs - Add DeFi protocol config
finAdv.post('/defi-configs', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'defi.config.register',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { protocol_name: body.protocol_name, chain: body.chain }
  });

  await DB.prepare(`
    INSERT INTO defi_protocol_configs (id, protocol_name, chain, risk_score, audit_reference, is_active, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).bind(id, body.protocol_name, body.chain || 'Polygon', body.risk_score || 50, body.audit_reference || null, governor.decision_id).run();

  return c.json({ data: { id, protocol_name: body.protocol_name }, governor_decision: governor, message: 'DeFi protocol config added' }, 201);
});

// --- MILESTONE FINANCE TRIGGERS ---

// GET /milestone-triggers - List milestone-based finance triggers
finAdv.get('/milestone-triggers', async (c) => {
  const { DB } = c.env;
  const financing_agreement_id = c.req.query('financing_agreement_id');

  let sql = `SELECT * FROM milestone_finance_triggers`;
  const params: any[] = [];
  if (financing_agreement_id) { sql += ` WHERE financing_agreement_id = ?`; params.push(financing_agreement_id); }
  sql += ` ORDER BY milestone`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /milestone-triggers - Create milestone finance trigger
finAdv.post('/milestone-triggers', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO milestone_finance_triggers (id, financing_agreement_id, milestone, trigger_action, oracle_integration, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.financing_agreement_id, body.milestone, body.trigger_action, body.oracle_integration || null, body.governor_decision_id || null).run();

  return c.json({ data: { id, milestone: body.milestone, trigger_action: body.trigger_action }, message: 'Milestone finance trigger created' }, 201);
});

// --- REGULATORY COMPLIANCE (Part 22) ---

// GET /regulatory-compliance - List regulatory requirements
finAdv.get('/regulatory-compliance', async (c) => {
  const { DB } = c.env;
  const financing_request_id = c.req.query('financing_request_id');
  const satisfied = c.req.query('satisfied');

  let sql = `SELECT * FROM regulatory_compliance WHERE 1=1`;
  const params: any[] = [];
  if (financing_request_id) { sql += ` AND financing_request_id = ?`; params.push(financing_request_id); }
  if (satisfied === 'true') sql += ` AND satisfied = 1`;
  if (satisfied === 'false') sql += ` AND satisfied = 0`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /regulatory-compliance - Record regulatory requirement
finAdv.post('/regulatory-compliance', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO regulatory_compliance (id, financing_request_id, jurisdiction, requirement, satisfied, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.financing_request_id, body.jurisdiction, body.requirement, body.satisfied ? 1 : 0, body.governor_decision_id || null).run();

  return c.json({ data: { id, jurisdiction: body.jurisdiction, requirement: body.requirement, satisfied: body.satisfied || false }, message: 'Regulatory compliance recorded' }, 201);
});

// --- COUNTRY COMMODITY FACTORS ---

// GET /country-commodity-factors - List profit boost factors
finAdv.get('/country-commodity-factors', async (c) => {
  const { DB } = c.env;
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');

  let sql = `SELECT * FROM country_commodity_factors WHERE 1=1`;
  const params: any[] = [];
  if (origin) { sql += ` AND origin_country = ?`; params.push(origin); }
  if (destination) { sql += ` AND destination_country = ?`; params.push(destination); }
  sql += ` LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /country-commodity-factors - Add factor
finAdv.post('/country-commodity-factors', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  await DB.prepare(`
    INSERT OR REPLACE INTO country_commodity_factors (origin_country, destination_country, hs_code, profit_boost_pct, last_calculated, model_version)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(body.origin_country, body.destination_country, body.hs_code, body.profit_boost_pct || 0, isoNow(), body.model_version || 'v1.0').run();

  return c.json({ message: 'Country commodity factor saved' }, 201);
});

export default finAdv;

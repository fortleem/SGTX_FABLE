import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';

type Bindings = { DB: D1Database };
const commodityIntel = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// COMMODITY INTELLIGENCE - Market Prices, Seasonal Adjustments,
// Carrier Performance, Predictive Health, Carbon, FX Oracle
// Parts 13, 15, 19, 28 of SGTX Blueprint v6.3
// ═══════════════════════════════════════════════════════════════════

// --- COMMODITY MARKET PRICES ---

// GET /commodity-prices - List market prices
commodityIntel.get('/commodity-prices', async (c) => {
  const { DB } = c.env;
  const hs_code = c.req.query('hs_code');
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');

  let sql = `SELECT * FROM commodity_market_prices WHERE 1=1`;
  const params: any[] = [];
  if (hs_code) { sql += ` AND hs_code = ?`; params.push(hs_code); }
  if (origin) { sql += ` AND origin_country = ?`; params.push(origin); }
  if (destination) { sql += ` AND destination_country = ?`; params.push(destination); }
  sql += ` ORDER BY price_date DESC LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /commodity-prices - Record market price (scraped from FAO/public sources)
commodityIntel.post('/commodity-prices', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO commodity_market_prices (id, hs_code, commodity_name, origin_country, destination_country, price_usd_per_kg, price_date, source, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.hs_code, body.commodity_name || null,
    body.origin_country, body.destination_country || null,
    body.price_usd_per_kg, body.price_date || isoNow().split('T')[0],
    body.source || 'FAO_INDEX', body.confidence || 0.85, isoNow()
  ).run();

  return c.json({ data: { id, hs_code: body.hs_code, price_usd_per_kg: body.price_usd_per_kg }, message: 'Market price recorded' }, 201);
});

// GET /commodity-prices/trend - Get price trend for a commodity corridor
commodityIntel.get('/commodity-prices/trend', async (c) => {
  const { DB } = c.env;
  const hs_code = c.req.query('hs_code');
  const origin = c.req.query('origin');
  const days = parseInt(c.req.query('days') || '30');

  if (!hs_code || !origin) return c.json({ error: 'hs_code and origin required' }, 400);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const results = await DB.prepare(`
    SELECT price_date, price_usd_per_kg, source FROM commodity_market_prices 
    WHERE hs_code = ? AND origin_country = ? AND price_date >= ?
    ORDER BY price_date ASC
  `).bind(hs_code, origin, cutoff).all();

  const prices = results.results || [];
  const avgPrice = prices.length > 0 ? prices.reduce((sum: number, p: any) => sum + p.price_usd_per_kg, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices.map((p: any) => p.price_usd_per_kg)) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices.map((p: any) => p.price_usd_per_kg)) : 0;

  return c.json({
    data: {
      hs_code, origin, days,
      data_points: prices.length,
      average_price: avgPrice.toFixed(4),
      min_price: minPrice,
      max_price: maxPrice,
      ai_recommended_range: { min: (avgPrice * 0.95).toFixed(4), max: (avgPrice * 1.05).toFixed(4) },
      prices
    }
  });
});

// --- SEASONAL ADJUSTMENTS (Part 13) ---

// GET /seasonal-adjustments - List seasonal adjustment factors
commodityIntel.get('/seasonal-adjustments', async (c) => {
  const { DB } = c.env;
  const category = c.req.query('category');
  const week = c.req.query('week');

  let sql = `SELECT * FROM seasonal_adjustments WHERE 1=1`;
  const params: any[] = [];
  if (category) { sql += ` AND commodity_category = ?`; params.push(category); }
  if (week) { sql += ` AND week_number = ?`; params.push(parseInt(week)); }
  sql += ` ORDER BY commodity_category, week_number`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /seasonal-adjustments - Record seasonal factor
commodityIntel.post('/seasonal-adjustments', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  await DB.prepare(`
    INSERT OR REPLACE INTO seasonal_adjustments (commodity_category, week_number, adjustment_pct, valid_from_year)
    VALUES (?, ?, ?, ?)
  `).bind(body.commodity_category, body.week_number, body.adjustment_pct, body.valid_from_year || new Date().getFullYear()).run();

  return c.json({ message: 'Seasonal adjustment saved' }, 201);
});

// --- CARRIER PERFORMANCE PROFILES (Part 15) ---

// GET /carrier-performance - List carrier profiles
commodityIntel.get('/carrier-performance', async (c) => {
  const { DB } = c.env;
  const min_risk = c.req.query('min_risk');

  let sql = `SELECT * FROM carrier_performance_profiles`;
  const params: any[] = [];
  if (min_risk) { sql += ` WHERE risk_score >= ?`; params.push(parseInt(min_risk)); }
  sql += ` ORDER BY on_time_pct DESC`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /carrier-performance - Create/update carrier profile
commodityIntel.post('/carrier-performance', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  await DB.prepare(`
    INSERT OR REPLACE INTO carrier_performance_profiles (carrier_id, carrier_name, on_time_pct, dispute_rate, esg_score, risk_score, last_risk_update, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.carrier_id, body.carrier_name,
    body.on_time_pct || 95.0, body.dispute_rate || 0.02,
    body.esg_score || 75.0, body.risk_score || 50,
    isoNow(), isoNow()
  ).run();

  return c.json({ message: 'Carrier performance profile saved' }, 201);
});

// POST /carrier-performance/:id/risk-update - Update carrier risk score
commodityIntel.post('/carrier-performance/:id/risk-update', async (c) => {
  const { DB } = c.env;
  const carrier_id = c.req.param('id');
  const body = await c.req.json();

  await DB.prepare(`
    UPDATE carrier_performance_profiles SET risk_score = ?, last_risk_update = ?, last_updated = ? WHERE carrier_id = ?
  `).bind(body.risk_score, isoNow(), isoNow(), carrier_id).run();

  return c.json({ message: 'Carrier risk score updated', risk_score: body.risk_score });
});

// --- PREDICTIVE HEALTH METRICS ---

// GET /predictive-health - List predictive health metrics
commodityIntel.get('/predictive-health', async (c) => {
  const { DB } = c.env;
  const service_name = c.req.query('service');
  const status = c.req.query('status');

  let sql = `SELECT * FROM predictive_health_metrics WHERE 1=1`;
  const params: any[] = [];
  if (service_name) { sql += ` AND service_name = ?`; params.push(service_name); }
  if (status) { sql += ` AND predicted_status = ?`; params.push(status); }
  sql += ` ORDER BY prediction_confidence DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /predictive-health - Record health prediction
commodityIntel.post('/predictive-health', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO predictive_health_metrics (id, service_name, metric_name, current_value, predicted_value, predicted_status, prediction_confidence, time_horizon_hours, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.service_name, body.metric_name,
    body.current_value, body.predicted_value,
    body.predicted_status || 'HEALTHY',
    body.prediction_confidence || 0.85,
    body.time_horizon_hours || 24, isoNow()
  ).run();

  return c.json({ data: { id, service_name: body.service_name, predicted_status: body.predicted_status || 'HEALTHY' }, message: 'Health prediction recorded' }, 201);
});

// --- CARBON CALCULATIONS (Phase 5 - ESG) ---

// GET /carbon-calculations - List carbon footprint calculations
commodityIntel.get('/carbon-calculations', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.query('ustn');

  let sql = `SELECT * FROM carbon_calculations WHERE 1=1`;
  const params: any[] = [];
  if (ustn) { sql += ` AND ustn = ?`; params.push(ustn); }
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /carbon-calculations - Calculate carbon footprint for shipment
commodityIntel.post('/carbon-calculations', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  // Simplified carbon calculation model
  const distanceKm = body.distance_km || 5000;
  const containerCount = body.container_count || 1;
  const transportMode = body.transport_mode || 'OCEAN';

  // Emission factors (gCO2/ton-km)
  const factors: Record<string, number> = { OCEAN: 8, ROAD: 62, RAIL: 22, AIR: 602 };
  const factor = factors[transportMode] || 8;
  const weightTons = body.weight_tons || 20;
  const co2Tons = (factor * weightTons * distanceKm / 1000000).toFixed(4);

  await DB.prepare(`
    INSERT INTO carbon_calculations (id, ustn, transport_mode, distance_km, weight_tons, emission_factor, co2_tons, offset_available, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.ustn, transportMode, distanceKm, weightTons, factor, co2Tons, body.offset_available ? 1 : 0, isoNow()).run();

  return c.json({
    data: { id, ustn: body.ustn, transport_mode: transportMode, co2_tons: parseFloat(co2Tons), distance_km: distanceKm, emission_factor: factor },
    message: 'Carbon footprint calculated'
  }, 201);
});

// --- FX ORACLE SERVICE (Part 28 - fxoracleservice) ---

// GET /fx/rate-cache - List cached FX rates
commodityIntel.get('/fx/rate-cache', async (c) => {
  const { DB } = c.env;
  const from_currency = c.req.query('from');
  const to_currency = c.req.query('to');

  let sql = `SELECT * FROM fx_rate_cache WHERE 1=1`;
  const params: any[] = [];
  if (from_currency) { sql += ` AND from_currency = ?`; params.push(from_currency); }
  if (to_currency) { sql += ` AND to_currency = ?`; params.push(to_currency); }
  sql += ` ORDER BY fetched_at DESC LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /fx/rate-cache - Cache an FX rate (multi-source aggregation)
commodityIntel.post('/fx/rate-cache', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO fx_rate_cache (id, from_currency, to_currency, rate, source, volatility_24h, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.from_currency, body.to_currency, body.rate, body.source || 'ECB', body.volatility_24h || 0, isoNow()).run();

  return c.json({ data: { id, from_currency: body.from_currency, to_currency: body.to_currency, rate: body.rate }, message: 'FX rate cached' }, 201);
});

// GET /fx/conversion-paths - List optimal conversion paths
commodityIntel.get('/fx/conversion-paths', async (c) => {
  const { DB } = c.env;
  const from_currency = c.req.query('from');
  const to_currency = c.req.query('to');

  let sql = `SELECT * FROM fx_conversion_paths WHERE 1=1`;
  const params: any[] = [];
  if (from_currency) { sql += ` AND from_currency = ?`; params.push(from_currency); }
  if (to_currency) { sql += ` AND to_currency = ?`; params.push(to_currency); }

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /fx/conversion-paths - Record optimal path
commodityIntel.post('/fx/conversion-paths', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO fx_conversion_paths (id, from_currency, to_currency, path_steps, total_cost_pct, recommended, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.from_currency, body.to_currency, JSON.stringify(body.path_steps || []), body.total_cost_pct || 0, body.recommended ? 1 : 0, isoNow()).run();

  return c.json({ data: { id }, message: 'FX conversion path saved' }, 201);
});

// --- DISTRESSED OUTREACH NOTIFICATIONS (Phase 8) ---

// GET /distressed-outreach - List outreach notifications
commodityIntel.get('/distressed-outreach', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.query('ustn');

  let sql = `SELECT * FROM distressed_outreach_notifications WHERE 1=1`;
  const params: any[] = [];
  if (ustn) { sql += ` AND distressed_ustn = ?`; params.push(ustn); }
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /distressed-outreach - Send outreach notification (privacy-first)
commodityIntel.post('/distressed-outreach', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const governor = await evaluateGovernor(DB, {
    decision_type: 'distressed.outreach.send',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { distressed_ustn: body.distressed_ustn, recipient_gtid: body.recipient_gtid }
  });

  await DB.prepare(`
    INSERT INTO distressed_outreach_notifications (id, distressed_ustn, recipient_gtid, outreach_mode, message_template, privacy_notice_accepted, co_branded, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', ?, ?)
  `).bind(
    id, body.distressed_ustn, body.recipient_gtid,
    body.outreach_mode || 'STANDARD', body.message_template || null,
    body.privacy_notice_accepted ? 1 : 0, body.co_branded !== false ? 1 : 0,
    governor.decision_id, isoNow()
  ).run();

  return c.json({
    data: { id, distressed_ustn: body.distressed_ustn, recipient_gtid: body.recipient_gtid, status: 'SENT' },
    governor_decision: governor,
    message: 'Distressed cargo outreach notification sent (privacy-first, co-branded)'
  }, 201);
});

// --- COMMODITY PROFIT MARGINS ---

// GET /commodity-margins - List estimated profit margins
commodityIntel.get('/commodity-margins', async (c) => {
  const { DB } = c.env;
  const hs_code = c.req.query('hs_code');
  const origin = c.req.query('origin');

  let sql = `SELECT * FROM commodity_profit_margins WHERE 1=1`;
  const params: any[] = [];
  if (hs_code) { sql += ` AND hs_code = ?`; params.push(hs_code); }
  if (origin) { sql += ` AND origin_country = ?`; params.push(origin); }
  sql += ` ORDER BY estimated_margin_pct DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /commodity-margins - Record profit margin estimate
commodityIntel.post('/commodity-margins', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO commodity_profit_margins (id, hs_code, origin_country, destination_country, estimated_margin_pct, confidence, model_version, valid_from, valid_until, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.hs_code, body.origin_country, body.destination_country,
    body.estimated_margin_pct, body.confidence || 0.75,
    body.model_version || 'xgboost-v1', body.valid_from || isoNow(),
    body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isoNow()
  ).run();

  return c.json({ data: { id, hs_code: body.hs_code, estimated_margin_pct: body.estimated_margin_pct }, message: 'Profit margin estimate recorded' }, 201);
});

export default commodityIntel;

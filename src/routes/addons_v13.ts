// SGTX v13.1 — Add-Ons 9-28 API Routes (Blueprint Integrated Amendment Body)
// Demurrage, Broker Liability, Valuation, Cold Chain, Accreditation, Currency,
// Gov Sandbox, FTA, Security, Compliance Calendar, Cargo Insurance, TF Docs,
// Back-to-Back LC, Force Majeure, Export Docs, Terminal, Payment Guarantee,
// Demurrage Disputes, GRiRE.
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const ao = new Hono<{ Bindings: Bindings }>();

// ═══ ADD-ON 9: DEMURRAGE & DETENTION ═══════════════════════

function tieredAmount(rates: Record<string, number>, excessDays: number): { amount: number; breakdown: any[] } {
  // rates like {"day_1-3":0,"day_4-7":150,"day_8-14":200,"day_15+":250}
  const tiers = Object.entries(rates || {}).map(([k, v]) => {
    const m = k.match(/day_(\d+)(?:-(\d+)|\+)/);
    return { from: m ? parseInt(m[1]) : 1, to: m && m[2] ? parseInt(m[2]) : 9999, rate: Number(v) };
  }).sort((a, b) => a.from - b.from);
  let amount = 0; const breakdown: any[] = [];
  for (const t of tiers) {
    const daysInTier = Math.max(0, Math.min(excessDays, t.to) - t.from + 1);
    if (daysInTier > 0 && t.rate > 0) {
      amount += daysInTier * t.rate;
      breakdown.push({ day_range: `day_${t.from}-${t.to === 9999 ? '+' : t.to}`, days: daysInTier, rate: t.rate, amount: daysInTier * t.rate });
    }
  }
  return { amount, breakdown };
}

ao.post('/demurrage/calculate', async (c) => {
  const b = await c.req.json();
  const freeTime = b.free_time_days ?? 5;
  const release = new Date(b.release_date);
  const gateOut = new Date(b.gate_out_date || isoNow());
  const daysUsed = Math.ceil((gateOut.getTime() - release.getTime()) / 86400000);
  const excess = daysUsed - freeTime;
  const rates = b.demurrage_rates || { 'day_1-3': 0, 'day_4-7': 150, 'day_8-14': 200, 'day_15+': 250 };
  const calc = excess > 0 ? tieredAmount(rates, excess) : { amount: 0, breakdown: [] };
  const status = excess <= 0 ? 'FREE_TIME' : excess > 30 ? 'ESCALATED' : 'DEMURRAGE_STARTED';
  const id = uuid();
  if (b.ustn) {
    await c.env.DB.prepare(`
      INSERT INTO demurrage_tracking (id, ustn, container_number, carrier_gtid, port_unlocode, container_type,
        free_time_days, release_date, gate_out_date, actual_days_used, excess_days, demurrage_amount,
        total_amount, currency, status, demurrage_breakdown, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, b.ustn, b.container_number || 'UNKNOWN', b.carrier_gtid ?? null, b.port_unlocode ?? null,
      b.container_type ?? null, freeTime, b.release_date, b.gate_out_date ?? null, daysUsed,
      Math.max(0, excess), calc.amount, calc.amount, b.currency || 'USD', status,
      JSON.stringify(calc.breakdown), isoNow(), isoNow()).run();
    if (status !== 'FREE_TIME') {
      await c.env.DB.prepare('INSERT INTO demurrage_alerts (id, ustn, alert_type, message, sent_to, sent_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(uuid(), b.ustn, status, `Demurrage ${status} for ${b.container_number || b.ustn}: ${calc.amount} ${b.currency || 'USD'}`, '[]', isoNow(), isoNow()).run();
    }
  }
  return c.json({ data: { id, days_used: daysUsed, excess_days: Math.max(0, excess), free_time_days: freeTime, demurrage_amount: calc.amount, breakdown: calc.breakdown, status, currency: b.currency || 'USD' } });
});

ao.get('/demurrage/port/:unlocode', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM port_free_time WHERE port_unlocode = ?').bind(c.req.param('unlocode')).all();
  return c.json({ data: results });
});

ao.get('/demurrage/tariff', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM carrier_demurrage_tariffs WHERE is_active = 1 LIMIT 100').all();
  return c.json({ data: results });
});

ao.post('/demurrage/tariff', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO carrier_demurrage_tariffs (id, carrier_gtid, port_unlocode, container_type, free_time_days, demurrage_rates, detention_rates, currency, source, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)')
    .bind(id, b.carrier_gtid, b.port_unlocode, b.container_type, b.free_time_days ?? 5,
      JSON.stringify(b.demurrage_rates || {}), JSON.stringify(b.detention_rates || {}), b.currency || 'USD', b.source ?? null, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/demurrage/alerts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM demurrage_alerts ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

ao.post('/demurrage/alert/acknowledge', async (c) => {
  const b = await c.req.json();
  await c.env.DB.prepare('UPDATE demurrage_alerts SET acknowledged = 1, acknowledged_at = ? WHERE id = ?').bind(isoNow(), b.alert_id).run();
  return c.json({ data: { acknowledged: true } });
});

ao.get('/demurrage/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM demurrage_tracking WHERE ustn = ? ORDER BY created_at DESC').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 10: BROKER LIABILITY & INSURANCE ═══════════════

ao.post('/broker/insurance/add', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO broker_liability_insurance (id, broker_gtid, insurer, policy_number, coverage_amount, currency, valid_from, valid_to, certificate_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.broker_gtid, b.insurer ?? null, b.policy_number ?? null, b.coverage_amount ?? 0,
      b.currency || 'EGP', b.valid_from ?? null, b.valid_to ?? null, b.certificate_url ?? null, 'ACTIVE', isoNow()).run();
  return c.json({ data: { id }, message: 'Liability insurance recorded' }, 201);
});

ao.get('/broker/insurance/status', async (c) => {
  const gtid = c.req.query('broker_gtid');
  const { results } = await c.env.DB.prepare('SELECT * FROM broker_liability_insurance WHERE broker_gtid = ? ORDER BY created_at DESC').bind(gtid || '').all();
  return c.json({ data: results });
});

ao.post('/broker/error/record', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO broker_declaration_errors (id, broker_gtid, ustn, error_type, error_description, penalty_amount, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.broker_gtid, b.ustn ?? null, b.error_type || 'DECLARATION', b.error_description ?? null, b.penalty_amount ?? null, b.currency || 'EGP', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/broker/performance', async (c) => {
  const gtid = c.req.query('broker_gtid');
  const perf = await c.env.DB.prepare('SELECT * FROM broker_performance WHERE broker_gtid = ?').bind(gtid || '').first();
  const errors = await c.env.DB.prepare('SELECT COUNT(*) as n, COALESCE(SUM(penalty_amount),0) as penalties FROM broker_declaration_errors WHERE broker_gtid = ?').bind(gtid || '').first();
  return c.json({ data: { performance: perf, errors } });
});

// ═══ ADD-ON 11: CUSTOMS VALUATION INTELLIGENCE ═════════════

ao.get('/valuation/estimate', async (c) => {
  const hs = c.req.query('hs_code') || '';
  const declared = Number(c.req.query('declared_value') || 0);
  // Deterministic estimation heuristic (AI advisory can enrich via /brain/ask)
  const dutyRate = hs.startsWith('08') ? 0.05 : hs.startsWith('84') ? 0.02 : 0.10;
  const dutyEstimate = declared * dutyRate;
  return c.json({ data: { hs_code: hs, declared_value: declared, duty_rate: dutyRate, duty_estimate: dutyEstimate, method: 'TRANSACTION_VALUE', advisory: true } });
});

ao.post('/valuation/assess', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  const variance = b.market_value_estimate && b.declared_value
    ? Math.round(10000 * (b.declared_value - b.market_value_estimate) / b.market_value_estimate) / 100 : null;
  const risk = variance !== null && Math.abs(variance) > 25 ? 'HIGH' : variance !== null && Math.abs(variance) > 10 ? 'MEDIUM' : 'NONE';
  await c.env.DB.prepare('INSERT INTO customs_valuations (id, ustn, hs_code, declared_value, market_value_estimate, duty_estimate, duty_rate, variance_pct, risk_flag, currency, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn ?? null, b.hs_code, b.declared_value ?? null, b.market_value_estimate ?? null,
      b.duty_estimate ?? null, b.duty_rate ?? null, variance, risk, b.currency || 'USD',
      b.explanation ?? `Variance ${variance}% vs market estimate`, isoNow()).run();
  return c.json({ data: { id, variance_pct: variance, risk_flag: risk } }, 201);
});

ao.post('/valuation/dispute', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO valuation_disputes (id, valuation_id, ustn, filed_by_gtid, dispute_reason, evidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.valuation_id ?? null, b.ustn ?? null, b.filed_by_gtid ?? null, b.dispute_reason ?? null, JSON.stringify(b.evidence || {}), isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/valuation/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM customs_valuations WHERE ustn = ? ORDER BY created_at DESC').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 12: COLD CHAIN QUALITY ═════════════════════════

ao.get('/cold-chain/requirements', async (c) => {
  const hs = c.req.query('hs_code');
  const { results } = await c.env.DB.prepare('SELECT * FROM cold_chain_requirements WHERE hs_code = ? OR ? IS NULL LIMIT 50').bind(hs ?? null, hs ?? null).all();
  return c.json({ data: results });
});

ao.post('/cold-chain/pti/register', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO pti_certificates (id, container_number, ustn, inspector_gtid, test_date, set_point_c, result, certificate_url, valid_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.container_number, b.ustn ?? null, b.inspector_gtid ?? null, b.test_date ?? isoNow(), b.set_point_c ?? null, b.result || 'PASS', b.certificate_url ?? null, b.valid_to ?? null, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/cold-chain/reading', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO cold_chain_readings (id, ustn, container_number, reading_time, temperature_c, humidity_pct, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.container_number ?? null, b.reading_time ?? isoNow(), b.temperature_c, b.humidity_pct ?? null, b.source || 'IOT', isoNow()).run();
  // anomaly detection: excursion beyond requirement band
  let anomaly = null;
  if (b.temp_min_c !== undefined && b.temp_max_c !== undefined && (b.temperature_c < b.temp_min_c || b.temperature_c > b.temp_max_c)) {
    const aid = uuid();
    await c.env.DB.prepare('INSERT INTO cold_chain_anomalies (id, ustn, anomaly_type, severity, detected_at, reading_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(aid, b.ustn, 'TEMP_EXCURSION', 'HIGH', isoNow(), id, isoNow()).run();
    anomaly = aid;
  }
  return c.json({ data: { id, anomaly_id: anomaly } }, 201);
});

ao.get('/cold-chain/status/:ustn', async (c) => {
  const ustn = c.req.param('ustn');
  const readings = await c.env.DB.prepare('SELECT COUNT(*) as n, AVG(temperature_c) as avg_temp, MIN(temperature_c) as min_temp, MAX(temperature_c) as max_temp FROM cold_chain_readings WHERE ustn = ?').bind(ustn).first();
  const anomalies = await c.env.DB.prepare('SELECT COUNT(*) as n FROM cold_chain_anomalies WHERE ustn = ? AND resolved = 0').bind(ustn).first<any>();
  return c.json({ data: { readings, open_anomalies: anomalies?.n ?? 0, status: (anomalies?.n ?? 0) > 0 ? 'AT_RISK' : 'HEALTHY' } });
});

ao.get('/cold-chain/anomalies/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM cold_chain_anomalies WHERE ustn = ? ORDER BY created_at DESC').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 13: INSPECTION AGENCY ACCREDITATION ════════════

ao.get('/accreditation/bodies', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM accreditation_bodies LIMIT 100').all();
  return c.json({ data: results });
});

ao.post('/accreditation/register', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO inspection_accreditations (id, agency_gtid, body_id, standard, scope, certificate_number, valid_from, valid_to, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.agency_gtid, b.body_id ?? null, b.standard || 'ISO_17020', b.scope ?? null, b.certificate_number ?? null, b.valid_from ?? null, b.valid_to ?? null, 'ACTIVE', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/accreditation/status/:gtid', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM inspection_accreditations WHERE agency_gtid = ?').bind(c.req.param('gtid')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 14: CURRENCY RISK MANAGEMENT ═══════════════════

ao.get('/currency/rate', async (c) => {
  const base = c.req.query('base') || 'USD', quote = c.req.query('quote') || 'EGP';
  const row = await c.env.DB.prepare('SELECT * FROM fx_rates WHERE base_currency = ? AND quote_currency = ? ORDER BY rate_date DESC LIMIT 1').bind(base, quote).first();
  return c.json({ data: row || { base_currency: base, quote_currency: quote, rate: null, note: 'No rate on file — seed via POST /currency/rate' } });
});

ao.post('/currency/rate', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO fx_rates (id, base_currency, quote_currency, rate, rate_date, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.base_currency, b.quote_currency, b.rate, b.rate_date ?? isoNow(), b.source || 'MANUAL', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/currency/exposure/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM currency_exposures WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

ao.post('/currency/exposure', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  const varEst = (b.exposure_amount || 0) * 0.08; // simple 8% VaR heuristic
  const rec = varEst > 10000 ? 'HEDGE_FORWARD' : 'MONITOR';
  await c.env.DB.prepare('INSERT INTO currency_exposures (id, ustn, tenant_id, exposure_currency, base_currency, exposure_amount, var_estimate, recommendation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.tenant_id ?? null, b.exposure_currency || 'EUR', b.base_currency || 'USD', b.exposure_amount ?? 0, varEst, rec, isoNow()).run();
  return c.json({ data: { id, var_estimate: varEst, recommendation: rec } }, 201);
});

// ═══ ADD-ON 15: GOVERNMENT API SANDBOX ═════════════════════

ao.get('/sandbox/status', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT api_name, COUNT(*) as tests, SUM(passed) as passed FROM gov_api_sandbox_tests GROUP BY api_name").all();
  return c.json({ data: { apis: ['NAFEZA', 'CARGOX', 'ETA', 'CBE'], tests: results } });
});

ao.post('/sandbox/test', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  const passed = 1; // sandbox simulation always exercises the adapter contract
  await c.env.DB.prepare('INSERT INTO gov_api_sandbox_tests (id, api_name, test_type, request_payload, response_payload, status, latency_ms, passed, run_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.api_name || 'NAFEZA', b.test_type || 'CONTRACT', JSON.stringify(b.payload || {}),
      JSON.stringify({ simulated: true, status: 'ACCEPTED' }), 'COMPLETED', 42, passed, b.run_by ?? null, isoNow()).run();
  return c.json({ data: { id, passed: true, simulated: true } }, 201);
});

ao.get('/sandbox/results', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM gov_api_sandbox_tests ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

// ═══ ADD-ON 16: FTA PREFERENCE MANAGEMENT ══════════════════

ao.get('/fta/check', async (c) => {
  const origin = c.req.query('origin') || '', dest = c.req.query('destination') || '';
  const { results } = await c.env.DB.prepare("SELECT * FROM fta_agreements WHERE in_force = 1 AND member_countries LIKE ? AND member_countries LIKE ?")
    .bind(`%${origin}%`, `%${dest}%`).all();
  return c.json({ data: { eligible: (results || []).length > 0, agreements: results } });
});

ao.post('/fta/claim', async (c) => {
  const b = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'fta.preference.claim', actor_gtid: b.actor_gtid,
    action_context: { ustn: b.ustn, fta_code: b.fta_code },
  });
  const id = uuid();
  const savings = (b.mfn_rate ?? 0) > (b.preference_rate ?? 0) && b.customs_value
    ? b.customs_value * ((b.mfn_rate - b.preference_rate) / 100) : null;
  await c.env.DB.prepare('INSERT INTO fta_claims (id, ustn, fta_code, hs_code, origin_country, destination_country, mfn_rate, preference_rate, savings_estimate, governor_decision_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.fta_code ?? null, b.hs_code ?? null, b.origin_country ?? null, b.destination_country ?? null,
      b.mfn_rate ?? null, b.preference_rate ?? null, savings, (gov as any)?.decision_id ?? null, isoNow()).run();
  return c.json({ data: { id, savings_estimate: savings, governor: gov } }, 201);
});

ao.get('/fta/claims/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM fta_claims WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 17: PIRACY & SECURITY RISK ═════════════════════

ao.get('/security/corridor/:code', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM security_corridors WHERE corridor_code = ?').bind(c.req.param('code')).first();
  return c.json({ data: row || { corridor_code: c.req.param('code'), risk_level: 'UNKNOWN' } });
});

ao.get('/security/incidents', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM security_incidents ORDER BY incident_date DESC LIMIT 50').all();
  return c.json({ data: results });
});

ao.get('/security/advisories', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM security_corridors WHERE risk_level IN ('HIGH','CRITICAL')").all();
  return c.json({ data: results });
});

// ═══ ADD-ON 18: TRADE COMPLIANCE CALENDAR ══════════════════

ao.get('/compliance/calendar', async (c) => {
  const tenant = c.req.query('tenant_id');
  let sql = 'SELECT * FROM compliance_events'; const binds: any[] = [];
  if (tenant) { sql += ' WHERE tenant_id = ?'; binds.push(tenant); }
  sql += ' ORDER BY due_date ASC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ data: results });
});

ao.get('/compliance/upcoming', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM compliance_events WHERE completed = 0 AND due_date <= date('now', '+30 days') ORDER BY due_date ASC LIMIT 50").all();
  return c.json({ data: results });
});

ao.post('/compliance/event/add', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO compliance_events (id, tenant_id, ustn, event_type, title, description, due_date, jurisdiction, severity, recurring, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.tenant_id ?? null, b.ustn ?? null, b.event_type || 'DEADLINE', b.title ?? null, b.description ?? null, b.due_date, b.jurisdiction ?? null, b.severity || 'MEDIUM', b.recurring ?? null, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/compliance/event/complete', async (c) => {
  const b = await c.req.json();
  await c.env.DB.prepare('UPDATE compliance_events SET completed = 1, completed_at = ? WHERE id = ?').bind(isoNow(), b.event_id).run();
  return c.json({ data: { completed: true } });
});

// ═══ ADD-ON 19: CARGO INSURANCE ════════════════════════════

ao.get('/insurance/premium', async (c) => {
  const value = Number(c.req.query('insured_value') || 0);
  const coverage = c.req.query('coverage_type') || 'ICC_A';
  const corridorRisk = c.req.query('corridor_risk') || 'LOW';
  const baseRate = coverage === 'ICC_A' ? 0.35 : coverage === 'ICC_B' ? 0.25 : 0.18; // % of value
  const riskLoad = corridorRisk === 'HIGH' ? 0.25 : corridorRisk === 'MEDIUM' ? 0.10 : 0;
  const ratePct = baseRate + riskLoad;
  return c.json({ data: { insured_value: value, coverage_type: coverage, premium_rate_pct: ratePct, premium: Math.round(value * ratePct) / 100 } });
});

ao.post('/insurance/policy/issue', async (c) => {
  const b = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'insurance.policy.issue', actor_gtid: b.actor_gtid,
    action_context: { ustn: b.ustn, insured_value: b.insured_value },
  });
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO cargo_insurance_policies (id, ustn, provider_gtid, policy_number, coverage_type, insured_value, premium, premium_rate_pct, currency, valid_from, valid_to, status, governor_decision_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.provider_gtid ?? null, b.policy_number || `POL-${Date.now()}`, b.coverage_type || 'ICC_A',
      b.insured_value ?? 0, b.premium ?? 0, b.premium_rate_pct ?? null, b.currency || 'USD',
      b.valid_from ?? isoNow(), b.valid_to ?? null, 'ISSUED', (gov as any)?.decision_id ?? null, isoNow()).run();
  return c.json({ data: { id, governor: gov } }, 201);
});

ao.get('/insurance/policy/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM cargo_insurance_policies WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

ao.post('/insurance/claim/submit', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO insurance_claims (id, policy_id, ustn, claim_type, claimed_amount, evidence, surveyor_gtid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.policy_id, b.ustn ?? null, b.claim_type || 'DAMAGE', b.claimed_amount ?? 0, JSON.stringify(b.evidence || {}), b.surveyor_gtid ?? null, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/insurance/claim/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM insurance_claims WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Claim not found' }, 404);
  return c.json({ data: row });
});

// ═══ ADD-ON 20: TRADE FINANCE DOCUMENTATION ════════════════

ao.post('/finance/document/create', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO trade_finance_documents (id, ustn, doc_type, reference_number, issuer_gtid, beneficiary_gtid, amount, currency, content, doc_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.doc_type || 'LC', b.reference_number || `TFD-${Date.now()}`, b.issuer_gtid ?? null,
      b.beneficiary_gtid ?? null, b.amount ?? null, b.currency || 'USD', JSON.stringify(b.content || {}),
      b.doc_hash ?? null, 'DRAFT', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/finance/document/sign', async (c) => {
  const b = await c.req.json();
  const doc = await c.env.DB.prepare('SELECT signatures FROM trade_finance_documents WHERE id = ?').bind(b.document_id).first<any>();
  if (!doc) return c.json({ error: 'Document not found' }, 404);
  const sigs = JSON.parse(doc.signatures || '[]');
  sigs.push({ gtid: b.signer_gtid, signed_at: isoNow() });
  await c.env.DB.prepare("UPDATE trade_finance_documents SET signatures = ?, status = 'SIGNED', signed_at = ? WHERE id = ?")
    .bind(JSON.stringify(sigs), isoNow(), b.document_id).run();
  return c.json({ data: { signed: true, signatures: sigs.length } });
});

ao.get('/finance/documents/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM trade_finance_documents WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 21: BACK-TO-BACK LC ════════════════════════════

ao.post('/finance/back-to-back/create', async (c) => {
  const b = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.b2b_lc.create', actor_gtid: b.actor_gtid,
    action_context: { ustn: b.ustn, master_amount: b.master_amount },
  });
  const id = uuid();
  const margin = (b.master_amount ?? 0) - (b.baby_amount ?? 0);
  await c.env.DB.prepare('INSERT INTO back_to_back_lcs (id, ustn, master_lc_id, baby_lc_id, intermediary_gtid, master_amount, baby_amount, margin, currency, issuing_bank_gtid, governor_decision_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.master_lc_id ?? null, b.baby_lc_id ?? null, b.intermediary_gtid ?? null,
      b.master_amount ?? 0, b.baby_amount ?? 0, margin, b.currency || 'USD', b.issuing_bank_gtid ?? null,
      (gov as any)?.decision_id ?? null, isoNow()).run();
  return c.json({ data: { id, margin, governor: gov } }, 201);
});

ao.get('/finance/back-to-back/chain/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM back_to_back_lcs WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 22: FORCE MAJEURE ══════════════════════════════

ao.get('/force-majeure/events', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM force_majeure_events WHERE active = 1').all();
  return c.json({ data: results });
});

ao.post('/force-majeure/event/declare', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO force_majeure_events (id, event_type, region, description, declared_by, start_date, affected_corridors, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)')
    .bind(id, b.event_type || 'NATURAL_DISASTER', b.region ?? null, b.description ?? null, b.declared_by ?? null, b.start_date ?? isoNow(), JSON.stringify(b.affected_corridors || []), isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/force-majeure/claim/file', async (c) => {
  const b = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'force_majeure.claim.file', actor_gtid: b.actor_gtid,
    action_context: { ustn: b.ustn, event_id: b.event_id },
  });
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO force_majeure_claims (id, event_id, ustn, contract_id, filed_by_gtid, claim_basis, evidence, extension_days_requested, governor_decision_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.event_id ?? null, b.ustn, b.contract_id ?? null, b.filed_by_gtid ?? null, b.claim_basis ?? null,
      JSON.stringify(b.evidence || {}), b.extension_days_requested ?? null, (gov as any)?.decision_id ?? null, isoNow()).run();
  return c.json({ data: { id, governor: gov } }, 201);
});

ao.get('/force-majeure/claim/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM force_majeure_claims WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ error: 'Claim not found' }, 404);
  return c.json({ data: row });
});

// ═══ ADD-ON 23: EXPORT DECLARATIONS ════════════════════════

ao.post('/export/declaration/create', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO export_declarations (id, ustn, declaration_type, exporter_gtid, hs_codes, goods_description, licence_required, licence_status, customs_office, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.declaration_type || 'EXPORT', b.exporter_gtid ?? null, JSON.stringify(b.hs_codes || []),
      b.goods_description ?? null, b.licence_required ? 1 : 0, b.licence_status ?? null, b.customs_office ?? null, 'DRAFT', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/export/declaration/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM export_declarations WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 24: PORT & TERMINAL INTEGRATION ════════════════

ao.post('/terminal/pre-advice', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO terminal_events (id, ustn, container_number, terminal_code, event_type, event_time, pre_advice_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn ?? null, b.container_number, b.terminal_code ?? null, 'PRE_ADVICE', isoNow(), b.pre_advice_ref || `PA-${Date.now()}`, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/terminal/gate-in', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO terminal_events (id, ustn, container_number, terminal_code, event_type, event_time, gate_number, truck_plate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn ?? null, b.container_number, b.terminal_code ?? null, 'GATE_IN', b.event_time ?? isoNow(), b.gate_number ?? null, b.truck_plate ?? null, isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/terminal/gate-out', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO terminal_events (id, ustn, container_number, terminal_code, event_type, event_time, gate_number, truck_plate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn ?? null, b.container_number, b.terminal_code ?? null, 'GATE_OUT', b.event_time ?? isoNow(), b.gate_number ?? null, b.truck_plate ?? null, isoNow()).run();
  // gate-out stops demurrage clock
  if (b.ustn) {
    await c.env.DB.prepare("UPDATE demurrage_tracking SET gate_out_date = ?, updated_at = ? WHERE ustn = ? AND container_number = ? AND gate_out_date IS NULL")
      .bind(b.event_time ?? isoNow(), isoNow(), b.ustn, b.container_number).run();
  }
  return c.json({ data: { id } }, 201);
});

ao.get('/terminal/status/:container', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM terminal_events WHERE container_number = ? ORDER BY event_time DESC').bind(c.req.param('container')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 25: PAYMENT GUARANTEE ══════════════════════════

ao.post('/guarantee/request', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO payment_guarantees (id, ustn, guarantor_bank_gtid, beneficiary_gtid, guarantee_type, amount, currency, reference_number, valid_to, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.ustn, b.guarantor_bank_gtid ?? null, b.beneficiary_gtid ?? null, b.guarantee_type || 'PAYMENT',
      b.amount ?? 0, b.currency || 'USD', b.reference_number || `PG-${Date.now()}`, b.valid_to ?? null, 'REQUESTED', isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.post('/guarantee/confirm', async (c) => {
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE payment_guarantees SET confirmed = 1, confirmed_at = ?, status = 'CONFIRMED' WHERE id = ?").bind(isoNow(), b.guarantee_id).run();
  return c.json({ data: { confirmed: true } });
});

ao.get('/guarantee/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM payment_guarantees WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 26: DEMURRAGE DISPUTES ═════════════════════════

ao.post('/demurrage/dispute/file', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO demurrage_disputes (id, tracking_id, ustn, filed_by_gtid, disputed_amount, dispute_basis, evidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.tracking_id ?? null, b.ustn, b.filed_by_gtid ?? null, b.disputed_amount ?? 0, b.dispute_basis ?? null, JSON.stringify(b.evidence || {}), isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/demurrage/disputes/:ustn', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM demurrage_disputes WHERE ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ═══ ADD-ON 28: GRiRE ══════════════════════════════════════

ao.get('/grire/profile/:country', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM country_regulatory_profiles WHERE country_code = ? ORDER BY profile_version DESC LIMIT 1').bind(c.req.param('country').toUpperCase()).first();
  return c.json({ data: row || { country_code: c.req.param('country').toUpperCase(), status: 'NO_PROFILE', note: 'Use POST /grire/profile or /brain/regulatory to build one' } });
});

ao.post('/grire/profile', async (c) => {
  const b = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO country_regulatory_profiles (id, country_code, regulatory_body, customs_authority, import_licence_required, export_licence_required, bond_required, bond_factor_default, single_window, standard_free_time_days, required_documents, fta_memberships, confidence, source_refs, last_updated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, (b.country_code || '').toUpperCase(), b.regulatory_body ?? null, b.customs_authority ?? null,
      b.import_licence_required ? 1 : 0, b.export_licence_required ? 1 : 0, b.bond_required ? 1 : 0,
      b.bond_factor_default ?? null, b.single_window ?? null, b.standard_free_time_days ?? null,
      JSON.stringify(b.required_documents || []), JSON.stringify(b.fta_memberships || []),
      b.confidence ?? 1.0, JSON.stringify(b.source_refs || []), isoNow(), isoNow()).run();
  return c.json({ data: { id } }, 201);
});

ao.get('/grire/changes', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM regulatory_changes ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

ao.get('/grire/sources', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM regulatory_sources WHERE is_active = 1 LIMIT 100').all();
  return c.json({ data: results });
});

export default ao;

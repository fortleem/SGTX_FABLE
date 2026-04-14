// SGTX Platform — Governor, Compliance, Jurisdiction, Marketplace API Routes
import { Hono } from 'hono';
import { uuid, isoNow, checkJurisdiction, strictestJurisdiction } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const governance = new Hono<{ Bindings: Bindings }>();

// ─── GOVERNOR DECISIONS ────────────────────────────────
governance.get('/governor/decisions', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const type = c.req.query('type');
  let sql = 'SELECT * FROM governor_decisions';
  if (type) sql += ` WHERE decision_type = '${type}'`;
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results, count: results.length });
});

governance.get('/governor/decisions/:id', async (c) => {
  const dec = await c.env.DB.prepare('SELECT * FROM governor_decisions WHERE decision_id = ?').bind(c.req.param('id')).first();
  if (!dec) return c.json({ error: 'Decision not found' }, 404);
  const loomLog = await c.env.DB.prepare('SELECT * FROM loom_logs WHERE governor_decision_id = ?').bind(dec.decision_id).first();
  return c.json({ data: { ...dec, loom_log: loomLog } });
});

// Manual governor evaluation endpoint
governance.post('/governor/evaluate', async (c) => {
  const body = await c.req.json();
  const result = await evaluateGovernor(c.env.DB, {
    decision_type: body.decision_type,
    actor_gtid: body.actor_gtid,
    actor_employee_id: body.actor_employee_id,
    action_context: body.action_context || {},
    jurisdictions: body.jurisdictions,
    ai_authority_level: body.ai_authority_level,
  });
  return c.json({ data: result });
});

// ─── AUDIT LOG ─────────────────────────────────────────
governance.get('/audit', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const table = c.req.query('table');
  let sql = 'SELECT * FROM audit_log';
  if (table) sql += ` WHERE table_name = '${table}'`;
  sql += ` ORDER BY changed_at DESC LIMIT ${limit}`;
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ─── AI INFERENCE RECORDS ──────────────────────────────
governance.get('/ai-records', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM ai_inference_records ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

governance.post('/ai-records', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const loom = `sha256:${uuid()}`;
  await c.env.DB.prepare(`
    INSERT INTO ai_inference_records (id, agent_name, authority_level, action_context, decision, confidence, explanation, loom_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.agent_name, body.authority_level || 'A2', JSON.stringify(body.action_context), JSON.stringify(body.decision), body.confidence || 0.85, body.explanation || null, loom).run();
  return c.json({ data: { id }, message: 'AI inference recorded' }, 201);
});

// ─── JURISDICTIONS ─────────────────────────────────────
governance.get('/jurisdictions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM jurisdictions ORDER BY code ASC').all();
  return c.json({ data: results, count: results.length });
});

governance.get('/jurisdictions/:code', async (c) => {
  const j = await c.env.DB.prepare('SELECT * FROM jurisdictions WHERE code = ?').bind(c.req.param('code')).first();
  if (!j) return c.json({ error: 'Jurisdiction not found' }, 404);
  const runtimeCheck = checkJurisdiction(c.req.param('code'));
  return c.json({ data: { ...j, psp_partners: JSON.parse((j.psp_partners as string) || '[]'), runtime_check: runtimeCheck } });
});

// Jurisdiction supremacy check endpoint
governance.post('/jurisdictions/check', async (c) => {
  const body = await c.req.json();
  const result = strictestJurisdiction(...(body.jurisdictions || []));
  return c.json({ data: result });
});

// ─── COMPLIANCE ────────────────────────────────────────
governance.get('/compliance/events', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM compliance_events ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

governance.post('/compliance/events', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO compliance_events (id, event_type, entity_gtid, details, severity)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, body.event_type, body.entity_gtid || null, JSON.stringify(body.details), body.severity || 'LOW').run();
  return c.json({ data: { id }, message: 'Compliance event recorded' }, 201);
});

governance.get('/compliance/checks', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM compliance_checks ORDER BY checked_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

// ─── SANCTIONS ─────────────────────────────────────────
governance.get('/sanctions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM sanctions_cache ORDER BY cached_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

governance.post('/sanctions/screen', async (c) => {
  const body = await c.req.json();
  // Screen entity against sanctions lists
  const { results } = await c.env.DB.prepare('SELECT * FROM sanctions_cache WHERE entity_name LIKE ? OR country_code = ?').bind(`%${body.entity_name}%`, body.country_code || '').all();
  const matched = results.length > 0;

  if (matched) {
    await c.env.DB.prepare(`
      INSERT INTO compliance_events (id, event_type, entity_gtid, details, severity)
      VALUES (?, 'SANCTIONS_MATCH', ?, ?, 'CRITICAL')
    `).bind(uuid(), body.entity_gtid || null, JSON.stringify({ matches: results, screened_name: body.entity_name })).run();
  }

  return c.json({ data: { matched, matches: results, screening_time: isoNow() } });
});

// ─── ESG ASSESSMENTS ──────────────────────────────────
governance.get('/esg', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT e.*, t.legal_name FROM esg_assessments e JOIN tenants t ON e.entity_gtid = t.gtid ORDER BY e.assessed_at DESC').all();
  return c.json({ data: results });
});

governance.post('/esg', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO esg_assessments (id, entity_gtid, assessment_type, esg_score, environmental_score, social_score, governance_score, carbon_intensity, model_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.entity_gtid, body.assessment_type || 'FULL', body.esg_score, body.environmental_score || null, body.social_score || null, body.governance_score || null, body.carbon_intensity || null, body.model_version || 'lightgbm-v1.0').run();
  return c.json({ data: { id }, message: 'ESG assessment recorded' }, 201);
});

// ─── MARKETPLACE API (Part 17) ────────────────────────
governance.get('/partner/suppliers/match', async (c) => {
  const product = c.req.query('product');
  const region = c.req.query('region');
  const { results } = await c.env.DB.prepare(`
    SELECT t.gtid, t.legal_name, t.jurisdiction, ts.score as trust_score
    FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid
    WHERE t.type = 'CORPORATE' AND t.kyb_status = 'VERIFIED'
    ORDER BY ts.score DESC LIMIT 20
  `).all();
  return c.json({ data: results, query: { product, region } });
});

governance.post('/partner/trade/initiate', async (c) => {
  const body = await c.req.json();
  // Validate partner API key
  const partner = await c.env.DB.prepare('SELECT * FROM marketplace_partners WHERE api_key_hash = ? AND active = 1').bind(body.api_key_hash || '').first();

  return c.json({
    data: {
      accepted: true,
      instructions: 'Use POST /api/v1/trades to create a trade request with partner attribution',
      partner: partner ? { id: partner.id, name: partner.partner_name } : null,
    }
  });
});

// ─── LEGAL DISCLAIMERS ────────────────────────────────
governance.get('/legal/disclaimer', async (c) => {
  const disclaimer = await c.env.DB.prepare('SELECT * FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1').first();
  if (disclaimer) {
    await c.env.DB.prepare('UPDATE legal_disclaimers SET displayed_count = displayed_count + 1 WHERE id = ?').bind(disclaimer.id).run();
  }
  return c.json({ data: disclaimer });
});

// ─── COMMISSION CALCULATIONS ──────────────────────────
governance.get('/commissions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM commission_calculations ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

// ─── LOOM LOGS ─────────────────────────────────────────
governance.get('/loom', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM loom_logs ORDER BY logged_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

export default governance;

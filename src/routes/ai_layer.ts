// SGTX Platform v6.2 — AI Layer & Model Governance Routes (Part 11-14)
// AI agents, model versions, drift monitoring, inference, ESG, carbon, observability
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const ai = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// AI AGENT MANAGEMENT (Part 11)
// ═══════════════════════════════════════════════════════════

ai.get('/ai/agents', async (c) => {
  const authority = c.req.query('authority_level');
  let sql = 'SELECT * FROM ai_agents';
  if (authority) sql += ` WHERE authority_level = '${authority}'`;
  sql += ' ORDER BY authority_level ASC, agent_name ASC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

ai.post('/ai/agents', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'ai.agent.register', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { agent_name: body.agent_name, authority_level: body.authority_level },
  });

  await c.env.DB.prepare(`
    INSERT INTO ai_agents (id, agent_name, authority_level, preferred_api, description, phase_integration, model_name, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(
    id, body.agent_name, body.authority_level || 'A1',
    body.preferred_api || 'groq', body.description || '',
    JSON.stringify(body.phase_integration || []), body.model_name || 'mixtral-8x7b',
    isoNow()
  ).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'AI agent registered' }, 201);
});

ai.get('/ai/agents/:id', async (c) => {
  const agent = await c.env.DB.prepare('SELECT * FROM ai_agents WHERE id = ?').bind(c.req.param('id')).first();
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  // Get model versions
  const { results: versions } = await c.env.DB.prepare(
    'SELECT * FROM ai_model_versions WHERE agent_id = ? ORDER BY deployed_at DESC'
  ).bind(c.req.param('id')).all();

  return c.json({ data: { ...agent, model_versions: versions } });
});

ai.patch('/ai/agents/:id', async (c) => {
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (body.active !== undefined) { sets.push('active = ?'); vals.push(body.active ? 1 : 0); }
  if (body.model_name) { sets.push('model_name = ?'); vals.push(body.model_name); }
  if (body.preferred_api) { sets.push('preferred_api = ?'); vals.push(body.preferred_api); }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE ai_agents SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return c.json({ message: 'Agent updated' });
});

// ═══════════════════════════════════════════════════════════
// MODEL VERSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

ai.get('/ai/models', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT amv.*, aa.agent_name, aa.authority_level
    FROM ai_model_versions amv
    JOIN ai_agents aa ON amv.agent_id = aa.id
    ORDER BY amv.deployed_at DESC LIMIT 100
  `).all();
  return c.json({ data: results });
});

ai.post('/ai/models/deploy', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'ai.model.deploy', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { agent_id: body.agent_id, model_name: body.model_name, version: body.version },
  });

  // Retire previous version
  await c.env.DB.prepare('UPDATE ai_model_versions SET retired_at = ? WHERE agent_id = ? AND retired_at IS NULL')
    .bind(isoNow(), body.agent_id).run();

  await c.env.DB.prepare(`
    INSERT INTO ai_model_versions (id, agent_id, model_name, version, metrics, drift_score, deployed_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).bind(
    id, body.agent_id, body.model_name, body.version || '1.0.0',
    JSON.stringify(body.metrics || { accuracy: 0.92, latency_ms: 150 }), isoNow()
  ).run();

  // Update agent's current model
  await c.env.DB.prepare('UPDATE ai_agents SET model_name = ? WHERE id = ?')
    .bind(body.model_name, body.agent_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Model deployed' }, 201);
});

// ═══════════════════════════════════════════════════════════
// MODEL DRIFT MONITORING (Part 13)
// ═══════════════════════════════════════════════════════════

ai.get('/ai/drift', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM model_drift_records ORDER BY created_at DESC LIMIT 100'
  ).all();
  return c.json({ data: results });
});

ai.post('/ai/drift/check', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Simulate drift detection
  const driftScore = body.drift_score || Math.random() * 0.5;
  const threshold = 0.3;
  const driftDetected = driftScore > threshold;

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'model.drift.detected', actor_gtid: body.actor_gtid || 'ai-monitor',
    action_context: { agent_id: body.agent_id, drift_score: driftScore },
  });

  await c.env.DB.prepare(`
    INSERT INTO model_drift_records (id, agent_id, model_version_id, drift_score, drift_type, baseline_metrics, current_metrics, recommendation, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.agent_id || null, body.model_version_id || null,
    driftScore, body.drift_type || 'DATA_DRIFT',
    JSON.stringify(body.baseline_metrics || { accuracy: 0.95 }),
    JSON.stringify(body.current_metrics || { accuracy: 0.95 - driftScore * 0.2 }),
    driftDetected ? 'RETRAIN_RECOMMENDED' : 'WITHIN_TOLERANCE',
    gov.decision_id, isoNow()
  ).run();

  // Update model version drift score
  if (body.model_version_id) {
    await c.env.DB.prepare('UPDATE ai_model_versions SET drift_score = ? WHERE id = ?')
      .bind(driftScore, body.model_version_id).run();
  }

  return c.json({
    data: {
      drift_id: id, drift_score: driftScore, threshold,
      drift_detected: driftDetected,
      recommendation: driftDetected ? 'RETRAIN_RECOMMENDED' : 'WITHIN_TOLERANCE',
      governor_decision: gov,
    },
    message: driftDetected ? 'Model drift detected — retraining recommended' : 'Model within acceptable drift tolerance'
  }, 201);
});

// ═══════════════════════════════════════════════════════════
// AI INFERENCE TRACKING
// ═══════════════════════════════════════════════════════════

ai.get('/ai/inferences', async (c) => {
  const agentId = c.req.query('agent_id');
  const modelName = c.req.query('model');
  let sql = 'SELECT * FROM ai_inference_records';
  const conds: string[] = [];
  if (agentId) conds.push(`agent_id = '${agentId}'`);
  if (modelName) conds.push(`model_name = '${modelName}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

ai.post('/ai/inferences', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const latencyMs = body.latency_ms || Math.round(50 + Math.random() * 300);

  await c.env.DB.prepare(`
    INSERT INTO ai_inference_records (id, agent_id, model_name, input_summary, output_summary, latency_ms, tokens_used, cost_usd, confidence, decision_type, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.agent_id || null, body.model_name || 'mixtral-8x7b',
    body.input_summary || 'Inference request', body.output_summary || 'Result generated',
    latencyMs, body.tokens_used || Math.round(100 + Math.random() * 500),
    body.cost_usd || 0.001, body.confidence || 0.85,
    body.decision_type || 'general', body.governor_decision_id || null, isoNow()
  ).run();

  return c.json({ data: { id, latency_ms: latencyMs }, message: 'Inference recorded' }, 201);
});

// AI inference stats
ai.get('/ai/stats', async (c) => {
  const totalInferences = await c.env.DB.prepare('SELECT COUNT(*) as c, COALESCE(SUM(cost_usd), 0) as total_cost, AVG(latency_ms) as avg_latency FROM ai_inference_records').first();
  const activeAgents = await c.env.DB.prepare('SELECT COUNT(*) as c FROM ai_agents WHERE active = 1').first();
  const driftAlerts = await c.env.DB.prepare('SELECT COUNT(*) as c FROM model_drift_records WHERE drift_score > 0.3').first();
  const modelVersions = await c.env.DB.prepare('SELECT COUNT(*) as c FROM ai_model_versions WHERE retired_at IS NULL').first();

  return c.json({
    data: {
      total_inferences: (totalInferences as any)?.c || 0,
      total_cost_usd: ((totalInferences as any)?.total_cost || 0).toFixed(4),
      avg_latency_ms: Math.round((totalInferences as any)?.avg_latency || 0),
      active_agents: (activeAgents as any)?.c || 0,
      drift_alerts: (driftAlerts as any)?.c || 0,
      deployed_models: (modelVersions as any)?.c || 0,
      authority_levels: ['A0 (Advisory)', 'A1 (Pre-approved simple)', 'A2 (Multi-factor)', 'A3 (Human-in-loop)', 'A4 (Full autonomous)'],
    }
  });
});

// ═══════════════════════════════════════════════════════════
// OBSERVABILITY & AUDIT (Part 14)
// ═══════════════════════════════════════════════════════════

// Platform-wide audit trail
ai.get('/audit/trail', async (c) => {
  const tableName = c.req.query('table');
  const recordId = c.req.query('record_id');
  const action = c.req.query('action');
  let sql = 'SELECT * FROM audit_log';
  const conds: string[] = [];
  if (tableName) conds.push(`table_name = '${tableName}'`);
  if (recordId) conds.push(`record_id = '${recordId}'`);
  if (action) conds.push(`action = '${action}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY changed_at DESC LIMIT 200';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// Platform incidents
ai.get('/incidents', async (c) => {
  const status = c.req.query('status');
  let sql = 'SELECT * FROM incidents';
  if (status) sql += ` WHERE status = '${status}'`;
  sql += ' ORDER BY opened_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

ai.post('/incidents', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  await c.env.DB.prepare(`
    INSERT INTO incidents (id, incident_type, severity, title, description, affected_services, status, opened_at)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `).bind(
    id, body.incident_type || 'SYSTEM', body.severity || 'P3',
    body.title, body.description || null,
    JSON.stringify(body.affected_services || []), isoNow()
  ).run();

  return c.json({ data: { id }, message: 'Incident created' }, 201);
});

ai.patch('/incidents/:id', async (c) => {
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (body.status) { sets.push('status = ?'); vals.push(body.status); }
  if (body.root_cause) { sets.push('root_cause = ?'); vals.push(body.root_cause); }
  if (body.resolution) { sets.push('resolution = ?'); vals.push(body.resolution); }
  if (body.status === 'RESOLVED') { sets.push('resolved_at = ?'); vals.push(isoNow()); }
  if (body.status === 'CLOSED') { sets.push('closed_at = ?'); vals.push(isoNow()); }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return c.json({ message: 'Incident updated' });
});

// Maintenance windows
ai.get('/maintenance', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM maintenance_windows ORDER BY scheduled_start DESC LIMIT 20'
  ).all();
  return c.json({ data: results });
});

ai.post('/maintenance', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO maintenance_windows (id, title, affected_services, scheduled_start, scheduled_end, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?)
  `).bind(
    id, body.title, JSON.stringify(body.affected_services || []),
    body.scheduled_start, body.scheduled_end, isoNow()
  ).run();
  return c.json({ data: { id }, message: 'Maintenance window scheduled' }, 201);
});

// ═══════════════════════════════════════════════════════════
// PLATFORM CONFIG VERSIONING (Part 6.2.7)
// ═══════════════════════════════════════════════════════════

ai.get('/config/versions', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM platform_config_versions ORDER BY version_number DESC LIMIT 50'
  ).all();
  return c.json({ data: results });
});

ai.post('/config/versions', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Get next version number
  const latest = await c.env.DB.prepare('SELECT MAX(version_number) as max_v FROM platform_config_versions').first();
  const nextVersion = ((latest as any)?.max_v || 0) + 1;

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'admin.config.update', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { version: nextVersion, change_description: body.change_description },
  });

  await c.env.DB.prepare(`
    INSERT INTO platform_config_versions (id, version_number, manifest, changed_by, change_description, multisig_approval, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, nextVersion, JSON.stringify(body.manifest || {}),
    body.changed_by || 'admin', body.change_description || 'Configuration update',
    JSON.stringify(body.multisig_approval || {}), isoNow()
  ).run();

  return c.json({ data: { id, version_number: nextVersion, governor_decision: gov }, message: `Config version ${nextVersion} created` }, 201);
});

// Config rollback
ai.post('/config/rollback', async (c) => {
  const body = await c.req.json();
  const targetVersion = body.target_version;

  const target = await c.env.DB.prepare('SELECT * FROM platform_config_versions WHERE version_number = ?').bind(targetVersion).first();
  if (!target) return c.json({ error: 'Target version not found' }, 404);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'admin.config.rollback', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { target_version: targetVersion, requires_multisig: true },
  });

  // Create new version as rollback
  const latest = await c.env.DB.prepare('SELECT MAX(version_number) as max_v FROM platform_config_versions').first();
  const newVersion = ((latest as any)?.max_v || 0) + 1;
  const rollbackId = uuid();

  await c.env.DB.prepare(`
    INSERT INTO platform_config_versions (id, version_number, manifest, changed_by, change_description, rollback_from, multisig_approval, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    rollbackId, newVersion, target.manifest as string,
    body.changed_by || 'admin', `Rollback to version ${targetVersion}`,
    String(targetVersion), JSON.stringify(body.multisig_approval || { required: 2, received: 0 }),
    isoNow()
  ).run();

  return c.json({
    data: { id: rollbackId, version_number: newVersion, rolled_back_to: targetVersion, governor_decision: gov },
    message: `Configuration rolled back to version ${targetVersion}`
  });
});

export default ai;

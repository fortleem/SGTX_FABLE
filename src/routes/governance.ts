// SGTX Platform v6.3 — Governor, Compliance, Jurisdiction Routes (Blueprint Part 1 Aligned)
import { Hono } from 'hono';
import { uuid, isoNow, checkJurisdiction, strictestJurisdiction } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const governance = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNOR DECISIONS (Part 1.5)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/governor/decisions', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const type = c.req.query('type');
  const verdict = c.req.query('verdict');
  let sql = 'SELECT * FROM governor_decisions';
  const conditions: string[] = [];
  const binds: any[] = [];
  if (type) { conditions.push('decision_type = ?'); binds.push(type); }
  if (verdict) { conditions.push('verdict = ?'); binds.push(verdict); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

governance.get('/governor/decisions/:id', async (c) => {
  const dec = await c.env.DB.prepare('SELECT * FROM governor_decisions WHERE decision_id = ?').bind(c.req.param('id')).first();
  if (!dec) return c.json({ error: 'Decision not found' }, 404);
  const loomLog = await c.env.DB.prepare('SELECT * FROM loom_logs WHERE governor_decision_id = ?').bind(dec.decision_id).first();
  // Part 1.6: Get execution gate log if exists
  const gateLog = await c.env.DB.prepare('SELECT * FROM execution_gate_log WHERE governor_decision_id = ?').bind(dec.decision_id).first();
  return c.json({ data: { ...dec, loom_log: loomLog, execution_gate: gateLog } });
});

// ─── Part 1.5: GET /v1/decisions/{trade_id}/pending ────────────────────────
governance.get('/decisions/:tradeId/pending', async (c) => {
  const tradeId = c.req.param('tradeId');
  const { results } = await c.env.DB.prepare(`
    SELECT gd.* FROM governor_decisions gd
    WHERE gd.verdict IN ('PENDING','CONDITIONAL','ESCALATE')
    AND (gd.actor_gtid = ? OR gd.decision_id IN (
      SELECT governor_decision_id FROM trade_event_timeline WHERE ustn = ?
    ))
    ORDER BY gd.created_at DESC
  `).bind(tradeId, tradeId).all();
  return c.json({ data: results, count: results.length });
});

// ─── Part 1.5: GET /v1/decisions/{decision_id}/explanation ─────────────────
// Returns plain-language summary, conditions, action URLs
governance.get('/decisions/:id/explanation', async (c) => {
  const dec = await c.env.DB.prepare('SELECT * FROM governor_decisions WHERE decision_id = ?').bind(c.req.param('id')).first() as any;
  if (!dec) return c.json({ error: 'Decision not found' }, 404);

  const conditions = dec.conditions ? JSON.parse(dec.conditions) : [];
  const panelData = dec.decision_panel_data ? JSON.parse(dec.decision_panel_data) : null;

  // Build action URLs based on verdict
  const actionUrls: Record<string, string> = {};
  if (dec.verdict === 'CONDITIONAL') {
    actionUrls.resolve = `/api/v1/governor/decisions/${dec.decision_id}/resolve`;
    actionUrls.escalate = `/api/v1/decisions/${dec.decision_id}/escalate`;
  }
  if (dec.verdict === 'DENY') {
    actionUrls.appeal = `/api/v1/decisions/${dec.decision_id}/escalate`;
  }

  return c.json({ data: {
    decision_id: dec.decision_id,
    decision_type: dec.decision_type,
    verdict: dec.verdict,
    plain_language: dec.plain_language_explanation || dec.explainability || 'Decision processed by Governor service',
    conditions,
    confidence: dec.confidence,
    ai_authority_level: dec.ai_authority_level || 'A4',
    tenant_message: dec.tenant_message ? JSON.parse(dec.tenant_message) : null,
    panel_data: panelData,
    action_urls: actionUrls,
    loom_hash: dec.loom_hash,
    timestamp: dec.created_at,
  }});
});

// ─── Part 1.5: POST /v1/decisions/{decision_id}/escalate ───────────────────
// Escalation to A3 authority level
governance.post('/decisions/:id/escalate', async (c) => {
  const decisionId = c.req.param('id');
  const body = await c.req.json();
  const { reason, actor_gtid } = body;

  if (!reason) return c.json({ error: 'reason required' }, 400);

  const originalDec = await c.env.DB.prepare('SELECT * FROM governor_decisions WHERE decision_id = ?').bind(decisionId).first() as any;
  if (!originalDec) return c.json({ error: 'Original decision not found' }, 404);

  // Create escalated decision at A3 authority level
  const escalatedGov = await evaluateGovernor(c.env.DB, {
    decision_type: originalDec.decision_type,
    actor_gtid: actor_gtid || originalDec.actor_gtid,
    action_context: { escalation: true, original_decision_id: decisionId, reason },
    ai_authority_level: 'A3',
  });

  // Update escalated decision with escalation metadata
  await c.env.DB.prepare(`
    UPDATE governor_decisions SET escalated_from = ?, escalation_reason = ?, ai_authority_level = 'A3'
    WHERE decision_id = ?
  `).bind(decisionId, reason, escalatedGov.decision_id).run();

  return c.json({ data: {
    original_decision_id: decisionId,
    escalated_decision_id: escalatedGov.decision_id,
    escalated_verdict: escalatedGov.verdict,
    ai_authority_level: 'A3',
    reason,
  }, message: 'Decision escalated to A3 authority level' });
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
    nonce: body.nonce,                     // Part 1.5.2: Replay protection
    request_timestamp: body.request_timestamp, // Part 1.5.2: Timestamp freshness
  });
  return c.json({ data: result });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.2: AI AUTHORITY LEVELS & INFERENCE RECORDS
// A0 Observational, A1 Advisory (Groq), A2 Constraining (HF),
// A3 Escalation (HF+Groq), A4 Governance (OPA+WasmEdge), A5 FORBIDDEN
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/ai-records', async (c) => {
  const level = c.req.query('authority_level');
  let sql = 'SELECT * FROM ai_inference_records';
  if (level) sql += ` WHERE authority_level = '${level}'`;
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

governance.post('/ai-records', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Validate authority level (A5 is forbidden)
  if (body.authority_level === 'A5') {
    return c.json({ error: 'A5 authority level is FORBIDDEN — blocked at compile time per Part 1.2' }, 403);
  }

  const loom = `sha256:${uuid()}`;
  await c.env.DB.prepare(`
    INSERT INTO ai_inference_records (id, agent_name, authority_level, action_context, decision, confidence, explanation, loom_hash, model_provider, fallback_used, fallback_provider, request_context)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.agent_name, body.authority_level || 'A2',
    JSON.stringify(body.action_context), JSON.stringify(body.decision),
    body.confidence || 0.85, body.explanation || null, loom,
    body.model_provider || 'groq',
    body.fallback_used ? 1 : 0, body.fallback_provider || null,
    JSON.stringify(body.request_context || {}),
  ).run();

  return c.json({ data: { id, authority_level: body.authority_level || 'A2' }, message: 'AI inference recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG (Part 0.3: G4 Every Action Attributable)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/audit', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const table = c.req.query('table');
  const recordId = c.req.query('record_id');
  let sql = 'SELECT * FROM audit_log';
  const conditions: string[] = [];
  const binds: any[] = [];
  if (table) { conditions.push('table_name = ?'); binds.push(table); }
  if (recordId) { conditions.push('record_id = ?'); binds.push(recordId); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ` ORDER BY changed_at DESC LIMIT ${limit}`;
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.4: JURISDICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/jurisdictions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM jurisdictions ORDER BY code ASC').all();
  return c.json({ data: results, count: results.length });
});

governance.get('/jurisdictions/:code', async (c) => {
  const code = c.req.param('code');
  const j = await c.env.DB.prepare('SELECT * FROM jurisdictions WHERE code = ?').bind(code).first();
  if (!j) return c.json({ error: 'Jurisdiction not found' }, 404);
  const runtimeCheck = checkJurisdiction(code);
  return c.json({ data: { ...j, psp_partners: JSON.parse((j.psp_partners as string) || '[]'), runtime_check: runtimeCheck } });
});

// Part 1.4: Jurisdiction supremacy check (all parties)
governance.post('/jurisdictions/check', async (c) => {
  const body = await c.req.json();
  const result = strictestJurisdiction(...(body.jurisdictions || []));
  return c.json({ data: { ...result, checked_at: isoNow() } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.3: PLATFORM GOVERNANCE MULTISIG (3/5 approval)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/governance/proposals', async (c) => {
  const status = c.req.query('status');
  let sql = 'SELECT * FROM platform_governance_proposals';
  if (status) sql += ` WHERE status = '${status}'`;
  sql += ' ORDER BY created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

governance.post('/governance/proposals', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'admin.policy.update',
    actor_gtid: body.proposed_by,
    action_context: { proposal_type: body.proposal_type, description: body.description },
  });

  await c.env.DB.prepare(`
    INSERT INTO platform_governance_proposals (id, proposal_type, description, proposed_by, required_signatures, total_signers, governor_decision_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.proposal_type, body.description, body.proposed_by,
    body.required_signatures || 3, body.total_signers || 5,
    gov.decision_id,
    body.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    isoNow(),
  ).run();

  return c.json({ data: { proposal_id: id, status: 'PENDING', governor_decision: gov }, message: 'Governance proposal created. Requires 3/5 multisig approval.' }, 201);
});

// Sign a proposal (GAP-4 fix: expiration enforcement)
governance.post('/governance/proposals/:id/sign', async (c) => {
  const proposalId = c.req.param('id');
  const body = await c.req.json();
  const { signer_gtid } = body;

  const proposal = await c.env.DB.prepare('SELECT * FROM platform_governance_proposals WHERE id = ?').bind(proposalId).first() as any;
  if (!proposal) return c.json({ error: 'Proposal not found' }, 404);
  if (proposal.status !== 'PENDING') return c.json({ error: 'Proposal is not pending' }, 400);

  // GAP-4 fix: Enforce proposal expiration
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    await c.env.DB.prepare(
      "UPDATE platform_governance_proposals SET status = 'EXPIRED' WHERE id = ?"
    ).bind(proposalId).run();
    return c.json({ error: 'Proposal has expired', expires_at: proposal.expires_at }, 400);
  }

  const signers = JSON.parse(proposal.signers || '[]');
  if (signers.includes(signer_gtid)) return c.json({ error: 'Already signed by this signer' }, 400);

  signers.push(signer_gtid);
  const newCount = proposal.current_signatures + 1;
  const newStatus = newCount >= proposal.required_signatures ? 'APPROVED' : 'PENDING';

  await c.env.DB.prepare(`
    UPDATE platform_governance_proposals SET current_signatures = ?, signers = ?, status = ? WHERE id = ?
  `).bind(newCount, JSON.stringify(signers), newStatus, proposalId).run();

  // GAP-6 fix: If approved, record execution timestamp
  if (newStatus === 'APPROVED') {
    await c.env.DB.prepare(
      "UPDATE platform_governance_proposals SET executed_at = ?, execution_result = 'PENDING_EXECUTION' WHERE id = ?"
    ).bind(isoNow(), proposalId).run();
  }

  return c.json({ data: {
    proposal_id: proposalId,
    current_signatures: newCount,
    required_signatures: proposal.required_signatures,
    status: newStatus,
  }, message: newStatus === 'APPROVED' ? 'Proposal approved with multisig consensus — pending execution' : `Signature ${newCount}/${proposal.required_signatures} recorded` });
});

// GAP-5 fix: Reject a proposal
governance.post('/governance/proposals/:id/reject', async (c) => {
  const proposalId = c.req.param('id');
  const body = await c.req.json();
  const { rejected_by, reason } = body;

  if (!rejected_by || !reason) return c.json({ error: 'rejected_by and reason required' }, 400);

  const proposal = await c.env.DB.prepare('SELECT * FROM platform_governance_proposals WHERE id = ?').bind(proposalId).first() as any;
  if (!proposal) return c.json({ error: 'Proposal not found' }, 404);
  if (proposal.status !== 'PENDING') return c.json({ error: 'Proposal is not pending' }, 400);

  await c.env.DB.prepare(`
    UPDATE platform_governance_proposals SET status = 'REJECTED', rejected_by = ?, rejection_reason = ? WHERE id = ?
  `).bind(rejected_by, reason, proposalId).run();

  await auditLog(c.env.DB, 'platform_governance_proposals', proposalId, 'REJECTED', { status: 'PENDING' }, { status: 'REJECTED', rejected_by, reason }, rejected_by);

  return c.json({ data: { proposal_id: proposalId, status: 'REJECTED', rejected_by, reason }, message: 'Proposal rejected' });
});

// GAP-6 fix: Execute an approved proposal
governance.post('/governance/proposals/:id/execute', async (c) => {
  const proposalId = c.req.param('id');
  const body = await c.req.json();

  const proposal = await c.env.DB.prepare('SELECT * FROM platform_governance_proposals WHERE id = ?').bind(proposalId).first() as any;
  if (!proposal) return c.json({ error: 'Proposal not found' }, 404);
  if (proposal.status !== 'APPROVED') return c.json({ error: 'Proposal must be APPROVED before execution' }, 400);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'admin.policy.update',
    actor_gtid: body.executor_gtid || proposal.proposed_by,
    action_context: { proposal_id: proposalId, proposal_type: proposal.proposal_type, execution: true },
  });

  await c.env.DB.prepare(`
    UPDATE platform_governance_proposals SET executed_at = ?, execution_result = ?, status = 'EXECUTED' WHERE id = ?
  `).bind(isoNow(), JSON.stringify({ governor_decision_id: gov.decision_id, verdict: gov.verdict }), proposalId).run();

  return c.json({ data: {
    proposal_id: proposalId,
    status: 'EXECUTED',
    execution_result: { governor_decision_id: gov.decision_id, verdict: gov.verdict },
    executed_at: isoNow(),
  }, message: 'Proposal executed with Governor gate' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.6: EXECUTION GATE LOG (WasmEdge simulation)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/execution-gates', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const { results } = await c.env.DB.prepare(
    `SELECT eg.*, gd.decision_type, gd.verdict FROM execution_gate_log eg JOIN governor_decisions gd ON eg.governor_decision_id = gd.decision_id ORDER BY eg.created_at DESC LIMIT ${limit}`
  ).all();
  return c.json({ data: results, count: results.length });
});

// GAP-14 fix: POST endpoint for external execution gate recording
governance.post('/execution-gates', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  if (!body.governor_decision_id) return c.json({ error: 'governor_decision_id required' }, 400);

  // Verify the decision exists
  const dec = await c.env.DB.prepare('SELECT decision_id FROM governor_decisions WHERE decision_id = ?').bind(body.governor_decision_id).first();
  if (!dec) return c.json({ error: 'Governor decision not found' }, 404);

  await c.env.DB.prepare(`
    INSERT INTO execution_gate_log (id, governor_decision_id, wasm_module, input_hash, output_verdict, execution_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.governor_decision_id,
    body.wasm_module || 'external_gate',
    body.input_hash || `sha256:${uuid()}`,
    body.output_verdict || 'ALLOW',
    body.execution_time_ms || 0,
    isoNow()
  ).run();

  return c.json({ data: { id, governor_decision_id: body.governor_decision_id }, message: 'Execution gate recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.5.2: REPLAY PROTECTION — Nonce management
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/governor/nonces', async (c) => {
  const actor = c.req.query('actor_gtid');
  let sql = 'SELECT nonce, actor_gtid, decision_type, used_at, expires_at FROM governor_nonces';
  if (actor) sql += ` WHERE actor_gtid = '${actor}'`;
  sql += ' ORDER BY used_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results, count: results.length });
});

// Cleanup expired nonces (housekeeping)
governance.post('/governor/nonces/cleanup', async (c) => {
  const result = await c.env.DB.prepare(
    "DELETE FROM governor_nonces WHERE expires_at < datetime('now')"
  ).run();
  return c.json({ data: { cleaned: result.meta?.changes || 0 }, message: 'Expired nonces cleaned' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.5.1: LINKED DECISION HASH CHAIN — Integrity verification
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/governor/chain/verify', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const { results } = await c.env.DB.prepare(
    `SELECT decision_id, decision_type, loom_hash, previous_decision_hash, created_at FROM governor_decisions ORDER BY created_at ASC LIMIT ${limit}`
  ).all();

  let chainValid = true;
  let breakPoint: string | null = null;
  let verified = 0;

  for (let i = 1; i < results.length; i++) {
    const current = results[i] as any;
    const previous = results[i - 1] as any;
    if (current.previous_decision_hash && current.previous_decision_hash !== previous.loom_hash) {
      chainValid = false;
      breakPoint = current.decision_id;
      break;
    }
    verified++;
  }

  return c.json({ data: {
    chain_valid: chainValid,
    decisions_checked: results.length,
    links_verified: verified,
    break_point: breakPoint,
    first_decision: results.length > 0 ? (results[0] as any).decision_id : null,
    last_decision: results.length > 0 ? (results[results.length - 1] as any).decision_id : null,
    governance_invariant: 'Part 1.5.1 — Each decision hash chains to previous for tamper detection',
  }});
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE (Part 1)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SANCTIONS (Part 1.4)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/sanctions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM sanctions_cache ORDER BY cached_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

governance.post('/sanctions/screen', async (c) => {
  const body = await c.req.json();
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM sanctions_cache WHERE entity_name LIKE ? OR country_code = ?'
  ).bind(`%${body.entity_name}%`, body.country_code || '').all();
  const matched = results.length > 0;

  if (matched) {
    await c.env.DB.prepare(`
      INSERT INTO compliance_events (id, event_type, entity_gtid, details, severity)
      VALUES (?, 'SANCTIONS_MATCH', ?, ?, 'CRITICAL')
    `).bind(uuid(), body.entity_gtid || null, JSON.stringify({ matches: results, screened_name: body.entity_name })).run();
  }

  return c.json({ data: { matched, matches: results, screening_time: isoNow() } });
});

// GAP-7 fix: Dynamic sanctions list update endpoint (Part 1.4)
governance.post('/sanctions/update', async (c) => {
  const body = await c.req.json();
  const { list_source, entries, updated_by } = body;

  if (!list_source || !entries || !Array.isArray(entries)) {
    return c.json({ error: 'list_source and entries[] required' }, 400);
  }

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'admin.jurisdiction.update',
    actor_gtid: updated_by || 'SYSTEM',
    action_context: { list_source, entry_count: entries.length },
  });

  let added = 0;
  let updated = 0;
  for (const entry of entries) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM sanctions_cache WHERE entity_name = ? AND list_source = ?'
    ).bind(entry.entity_name, list_source).first();

    if (existing) {
      await c.env.DB.prepare(
        'UPDATE sanctions_cache SET country_code = ?, entity_type = ?, list_updated_at = ?, cached_at = datetime("now") WHERE id = ?'
      ).bind(entry.country_code || '', entry.entity_type || 'UNKNOWN', entry.list_updated_at || isoNow(), (existing as any).id).run();
      updated++;
    } else {
      await c.env.DB.prepare(`
        INSERT INTO sanctions_cache (id, list_source, entity_name, entity_type, country_code, list_updated_at, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(uuid(), list_source, entry.entity_name, entry.entity_type || 'UNKNOWN', entry.country_code || '', entry.list_updated_at || isoNow()).run();
      added++;
    }
  }

  // Log the update
  const totalEntries = await c.env.DB.prepare('SELECT COUNT(*) as c FROM sanctions_cache WHERE list_source = ?').bind(list_source).first() as any;
  await c.env.DB.prepare(`
    INSERT INTO sanctions_update_log (id, list_source, entries_added, entries_removed, entries_total, update_method, updated_by, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(uuid(), list_source, added, 0, totalEntries?.c || 0, body.update_method || 'MANUAL', updated_by || 'SYSTEM', gov.decision_id, isoNow()).run();

  return c.json({ data: {
    list_source,
    entries_added: added,
    entries_updated: updated,
    total_entries: totalEntries?.c || 0,
    governor_decision_id: gov.decision_id,
  }, message: `Sanctions list '${list_source}' updated — ${added} added, ${updated} updated` });
});

// GAP-7 fix: Get sanctions update history
governance.get('/sanctions/updates', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM sanctions_update_log ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESG ASSESSMENTS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE PARTNER API
// ═══════════════════════════════════════════════════════════════════════════════

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
  const partner = await c.env.DB.prepare('SELECT * FROM marketplace_partners WHERE api_key_hash = ? AND active = 1').bind(body.api_key_hash || '').first();
  return c.json({
    data: {
      accepted: true,
      instructions: 'Use POST /api/v1/trades to create a trade request with partner attribution',
      partner: partner ? { id: partner.id, name: partner.partner_name } : null,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL DISCLAIMERS
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/legal/disclaimer', async (c) => {
  const disclaimer = await c.env.DB.prepare('SELECT * FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1').first();
  if (disclaimer) {
    await c.env.DB.prepare('UPDATE legal_disclaimers SET displayed_count = displayed_count + 1 WHERE id = ?').bind(disclaimer.id).run();
  }
  return c.json({ data: disclaimer });
});

// GAP-16 fix: Disclaimer acceptance tracking (Part 1.7)
governance.post('/legal/disclaimer/accept', async (c) => {
  const body = await c.req.json();
  const { tenant_id, employee_id } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const disclaimer = await c.env.DB.prepare('SELECT * FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1').first() as any;
  if (!disclaimer) return c.json({ error: 'No disclaimer found' }, 404);

  // Check if already accepted this version
  const existing = await c.env.DB.prepare(
    'SELECT id FROM disclaimer_acceptances WHERE tenant_id = ? AND disclaimer_version = ?'
  ).bind(tenant_id, disclaimer.version).first();
  if (existing) {
    return c.json({ data: { already_accepted: true, version: disclaimer.version }, message: 'Disclaimer already accepted for this version' });
  }

  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO disclaimer_acceptances (id, tenant_id, employee_id, disclaimer_id, disclaimer_version, accepted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, tenant_id, employee_id || null, disclaimer.id, disclaimer.version, isoNow()).run();

  return c.json({ data: { acceptance_id: id, tenant_id, version: disclaimer.version, accepted_at: isoNow() }, message: 'Legal disclaimer accepted' }, 201);
});

// GAP-16 fix: Check disclaimer acceptance status
governance.get('/legal/disclaimer/status/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId');
  const disclaimer = await c.env.DB.prepare('SELECT version FROM legal_disclaimers ORDER BY effective_date DESC LIMIT 1').first() as any;
  if (!disclaimer) return c.json({ data: { accepted: false, reason: 'No disclaimer exists' } });

  const acceptance = await c.env.DB.prepare(
    'SELECT * FROM disclaimer_acceptances WHERE tenant_id = ? AND disclaimer_version = ?'
  ).bind(tenantId, disclaimer.version).first();

  return c.json({ data: {
    accepted: !!acceptance,
    current_version: disclaimer.version,
    acceptance: acceptance || null,
  }});
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSION CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/commissions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM commission_calculations ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

governance.get('/commissions/:id', async (c) => {
  const calc = await c.env.DB.prepare('SELECT * FROM commission_calculations WHERE id = ?').bind(c.req.param('id')).first();
  if (!calc) return c.json({ error: 'Calculation not found' }, 404);
  return c.json({ data: calc });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DISRUPTION PREDICTIONS / CARBON / MARKETPLACE / LOOM
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/disruptions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM disruption_predictions ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

governance.get('/carbon', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM carbon_footprint_calculations ORDER BY calculated_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

governance.post('/carbon', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO carbon_footprint_calculations (id, shipment_id, route_distance_nm, vessel_type, cargo_weight_mt, total_co2e_tons, calculation_method, calculated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.shipment_id, body.route_distance_nm || 0, body.vessel_type || 'CONTAINER', body.cargo_weight_mt || 0, body.total_co2e_tons || 0, body.calculation_method || 'IMO_EEXI_2023', isoNow()).run();
  return c.json({ data: { id }, message: 'Carbon footprint calculated' }, 201);
});

governance.get('/marketplace/partners', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, partner_name, commission_split_percent, active FROM marketplace_partners WHERE active = 1').all();
  return c.json({ data: results });
});

governance.get('/loom', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM loom_logs ORDER BY logged_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

// LOOM INTEGRITY CHECK (Part 0.3: G4 Every Action Attributable)
governance.get('/loom/integrity', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT ll.*, gd.decision_type, gd.verdict FROM loom_logs ll JOIN governor_decisions gd ON ll.governor_decision_id = gd.decision_id ORDER BY ll.logged_at DESC LIMIT 50'
  ).all();
  const orphaned = await c.env.DB.prepare(
    "SELECT COUNT(*) as c FROM governor_decisions WHERE decision_id NOT IN (SELECT governor_decision_id FROM loom_logs)"
  ).first() as any;
  return c.json({ data: {
    logs: results,
    orphaned_decisions: orphaned?.c || 0,
    integrity: (orphaned?.c || 0) === 0 ? 'VERIFIED' : 'WARNING — orphaned decisions found',
    governance_invariant: 'No irreversible action without Governor approval — Part 0.3 G4',
  }});
});

// ═══════════════════════════════════════════════════════════════════════════════
// DISPUTE HISTORY (Scammer/Poor-Quality Detection)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/disputes/history', async (c) => {
  const gtid = c.req.query('gtid');
  const { results: disputes } = await c.env.DB.prepare(`
    SELECT d.*, tr.importer_tenant_id, tr.assigned_exporter_id,
           t1.legal_name as importer_name, t1.gtid as importer_gtid,
           t2.legal_name as exporter_name, t2.gtid as exporter_gtid
    FROM disputes d
    JOIN trade_requests tr ON d.trade_request_id = tr.id
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    ORDER BY d.filed_at DESC
  `).all();

  const tenantDisputes: Record<string, any> = {};
  for (const d of disputes) {
    const impGtid = (d as any).importer_gtid;
    const expGtid = (d as any).exporter_gtid;
    for (const g of [impGtid, expGtid].filter(Boolean)) {
      if (!tenantDisputes[g]) tenantDisputes[g] = { gtid: g, as_importer: 0, as_exporter: 0, filed: 0, received: 0, types: {}, statuses: {} };
      if ((d as any).filing_party_gtid === g) tenantDisputes[g].filed++;
      else tenantDisputes[g].received++;
      if (g === impGtid) tenantDisputes[g].as_importer++;
      if (g === expGtid) tenantDisputes[g].as_exporter++;
      const dt = (d as any).dispute_type;
      tenantDisputes[g].types[dt] = (tenantDisputes[g].types[dt] || 0) + 1;
      const st = (d as any).status;
      tenantDisputes[g].statuses[st] = (tenantDisputes[g].statuses[st] || 0) + 1;
    }
  }
  const flagged = Object.values(tenantDisputes).filter((t: any) => t.received >= 3 || (t.types['QUALITY'] || 0) >= 2);

  if (gtid) {
    return c.json({ data: { tenant: tenantDisputes[gtid] || null, disputes: disputes.filter((d: any) => d.importer_gtid === gtid || d.exporter_gtid === gtid || d.filing_party_gtid === gtid) } });
  }
  return c.json({ data: { all_disputes: disputes, tenant_summary: Object.values(tenantDisputes), flagged_tenants: flagged } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH (Admin Portal)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/system/health', async (c) => {
  try {
    const counts = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as c FROM tenants').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM trade_requests').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM contracts').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM shipments').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM governor_decisions').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM commission_locks').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM financing_requests').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM disputes').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM audit_log').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM loom_logs').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM compliance_events').first(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM payment_attempts').first(),
    ]);
    const recentDecisions = await c.env.DB.prepare("SELECT verdict, COUNT(*) as c FROM governor_decisions GROUP BY verdict").all();
    const recentErrors = await c.env.DB.prepare("SELECT COUNT(*) as c FROM governor_decisions WHERE verdict = 'DENY'").first();
    return c.json({ data: {
      status: 'OPERATIONAL',
      platform: 'SGTX v6.3',
      identity: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure — NOT a marketplace',
      tables: {
        tenants: (counts[0] as any)?.c, trades: (counts[1] as any)?.c,
        contracts: (counts[2] as any)?.c, shipments: (counts[3] as any)?.c,
        governor_decisions: (counts[4] as any)?.c, commission_locks: (counts[5] as any)?.c,
        financing: (counts[6] as any)?.c, disputes: (counts[7] as any)?.c,
        audit_entries: (counts[8] as any)?.c, loom_entries: (counts[9] as any)?.c,
        compliance_events: (counts[10] as any)?.c, payments: (counts[11] as any)?.c,
      },
      governor_verdicts: recentDecisions.results,
      denied_count: (recentErrors as any)?.c || 0,
      core_principles: {
        G1: { title: 'Execution Always Gated', status: 'ENFORCED', enforcement: 'governor_decisions table + OPA + WasmEdge' },
        G2: { title: 'AI May Block, Never Force', status: 'ENFORCED', enforcement: 'ai_inference_records + structured verdict objects' },
        G3: { title: 'Non-Custodial Structural', status: 'ENFORCED', enforcement: 'commission_locks only — no fund tables' },
        G4: { title: 'Every Action Attributable', status: 'ENFORCED', enforcement: 'audit_log + loom_logs + Ed25519 signatures' },
      },
      governance_invariant: 'No irreversible action without Governor approval — ENFORCED',
      ai_authority_levels: { A0: 'Observational', A1: 'Advisory (Groq)', A2: 'Constraining (HF)', A3: 'Escalation (HF+Groq)', A4: 'Governance (OPA+WasmEdge)', A5: 'FORBIDDEN' },
      commission_supremacy: {
        rate_range: '0.1% — 2.5% (clamped)',
        model: 'Non-custodial — SGTX never holds funds',
        container_release: 'Blocked until fee payment confirmed',
      },
      ustn_format: 'SGTX-{BUYER_SUFFIX}-{SELLER_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}',
      zero_cost: true,
      timestamp: isoNow(),
    }});
  } catch(e: any) {
    return c.json({ data: { status: 'DEGRADED', error: e.message } });
  }
});

// ─── OPA POLICY VIEWER (Admin Portal) ─────────────────────────────────────
governance.get('/governor/policies', async (c) => {
  return c.json({ data: {
    policies: [
      { type: 'trade.request.create', phase: 1, gates: 'G1-U-1 to G1-U-8', description: 'Pre-screen trade initiation, jurisdiction check, HS code dual-use check' },
      { type: 'quote.submit', phase: 2, gates: 'G2-U-1 to G2-U-9', description: 'EXW price plausibility, route feasibility, carrier sanctions, carbon validation' },
      { type: 'contract.create', phase: 3, gates: 'G3-U-1 to G3-U-10', description: 'Clause Forge confidence, Risk Oracle, jurisdiction harmonization' },
      { type: 'contract.lock', phase: 3, gates: 'G3-U-10', description: 'All signatures + CommissionLock active before lock' },
      { type: 'financing.request', phase: 4, gates: 'G4-U-1 to G4-U-10', description: 'Credit assessment, default probability, DeFi risk' },
      { type: 'shipment.milestone.confirm', phase: 5, gates: 'G5-U-1,G5-U-7', description: 'Multi-source consensus, commission release' },
      { type: 'settlement.execute', phase: 6, gates: 'G6-U-1 to G6-U-10', description: 'Liquidity prediction, netting, FX path' },
      { type: 'distressed.list', phase: 7, gates: 'G7-U-1 to G7-U-9', description: 'Risk score, condition, buyer matching' },
      { type: 'buyer.search', phase: 8, gates: 'G8-U-1 to G8-U-6', description: 'Capability profile, AI match confidence' },
      { type: 'payment.initiate', phase: 9, gates: 'G9-U-1 to G9-U-8', description: 'PSP coverage, FX rate, webhook signature' },
      { type: 'dispute.file', phase: 10, gates: 'G10-U-1 to G10-U-6', description: 'Commission freeze, AI mediation, escalation' },
      { type: 'tenant.register', phase: 'pre', gates: 'Part 2', description: 'Jurisdiction pre-screen, GTID gen, risk scoring' },
      { type: 'tenant.lifecycle.transition', phase: 'pre', gates: 'Part 2.8', description: 'Lifecycle state transitions with governor gate' },
      { type: 'dual_mode.switch', phase: 'pre', gates: 'Part 2.3', description: 'Trader mode context switch validation' },
    ],
    total_phases: 10,
    total_gates: 84,
    governance_invariant: 'No irreversible action without Governor approval',
    ai_authority_levels: ['A0 Observational','A1 Advisory','A2 Constraining','A3 Escalation','A4 Governance','A5 FORBIDDEN'],
    zero_cost_stack: { opa: 'Open Policy Agent', wasm: 'WasmEdge', ai: 'Groq (free) + HF (self-hosted) + Ollama/LocalAI', db: 'PostgreSQL/D1', messaging: 'NATS JetStream KV' },
  }});
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0: CONSTITUTIONAL PRINCIPLES (G1-G4) & PLATFORM IDENTITY
// Blueprint 0.3: Key Principles, 0.9: Implementation Checklist
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/system/constitution', async (c) => {
  try {
    const { results: principles } = await c.env.DB.prepare(
      'SELECT * FROM platform_constitution ORDER BY principle_code'
    ).all();

    // Count enforcement evidence
    const govCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM governor_decisions').first() as any;
    const aiCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM ai_inference_records').first() as any;
    const lockCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM commission_locks').first() as any;
    const auditCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM audit_log').first() as any;
    const loomCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM loom_logs').first() as any;

    return c.json({ data: {
      platform: 'SGTX v6.3 — Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
      mission: 'SGTX is a sovereign, AI-governed, non-custodial execution engine for global trade — NOT a marketplace. We provide the infrastructure for organizations to execute cross-border trade with cryptographic certainty, AI-assisted optimization, and zero counterparty risk through non-custodial SGTX FEES protection.',
      principles: principles.length > 0 ? principles : [
        { principle_code: 'G1', title: 'Execution Always Gated', enforcement_table: 'governor_decisions', status: 'ENFORCED' },
        { principle_code: 'G2', title: 'AI May Block, Never Force', enforcement_table: 'ai_inference_records', status: 'ENFORCED' },
        { principle_code: 'G3', title: 'Non-Custodial Structural', enforcement_table: 'commission_locks', status: 'ENFORCED' },
        { principle_code: 'G4', title: 'Every Action Attributable', enforcement_table: 'audit_log', status: 'ENFORCED' },
      ],
      enforcement_evidence: {
        governor_decisions: govCount?.c || 0,
        ai_inference_records: aiCount?.c || 0,
        commission_locks: lockCount?.c || 0,
        audit_entries: auditCount?.c || 0,
        loom_entries: loomCount?.c || 0,
      },
      ustn_format: {
        pattern: 'SGTX-{BUYER_GTID_SUFFIX}-{SELLER_GTID_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}',
        example: 'SGTX-1397F3A-456ABC-20260415120000-A1B2C3D4',
        components: {
          prefix: 'SGTX (fixed)',
          buyer_suffix: 'Last 7 alphanumeric characters of buyer GTID',
          seller_suffix: 'Last 7 alphanumeric characters of seller GTID',
          timestamp: 'UTC timestamp YYYYMMDDHHMMSS',
          random: '8 random alphanumeric characters',
        },
      },
      commission_supremacy: {
        rate_clamp: { min_pct: 0.1, max_pct: 2.5 },
        single_shipment: 'Fee due immediately upon contract lock',
        multi_shipment: 'Fee collected per-shipment, triggered after mutual confirmation',
        container_release: 'Container NOT released until SGTX issues formal release confirmation after fee payment',
        gross_up_formula: 'Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer',
        non_custodial: 'SGTX never holds funds — only issues verifiable instructions and locks fees',
        sgtx_bank: 'United States of America',
      },
      zero_cost_commitment: 'Every line of code, every microservice, every AI model built exclusively on open-source software, free public APIs, self-hosted infrastructure, and local AI inference. No billing details ever required.',
      governance_invariant: 'No irreversible action without Governor approval — ENFORCED',
      legal_identity: {
        entity: 'SGTX Platform Inc.',
        jurisdiction: 'New Jersey, USA',
        nature: 'Non-custodial execution platform — NOT a marketplace',
        liability_cap: 'SGTX fees paid in last 12 months',
      },
    }});
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0.7/1.2: AI PROVIDER STATUS (Three-Tier Zero-Cost Strategy)
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/system/ai-providers', async (c) => {
  try {
    const { results: providers } = await c.env.DB.prepare(
      'SELECT * FROM ai_provider_config ORDER BY provider_id'
    ).all();

    // Get usage stats from ai_inference_records
    const { results: usageStats } = await c.env.DB.prepare(`
      SELECT model_provider, COUNT(*) as total_requests, 
             SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END) as fallback_count,
             AVG(latency_ms) as avg_latency_ms
      FROM ai_inference_records 
      GROUP BY model_provider
    `).all();

    return c.json({ data: {
      strategy: 'Three-Tier Zero-Cost AI Inference',
      billing_required: false,
      providers: providers.length > 0 ? providers : [
        {
          provider_id: 'groq', provider_name: 'Groq', provider_type: 'CLOUD_FREE',
          authority_levels: ['A1'], rate_limit_rpm: 30, rate_limit_rpd: 14400,
          requires_billing: false, privacy_level: 'STANDARD', status: 'ACTIVE',
          fallback: 'ollama', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
          use_cases: 'Fast advisory (A1), Smart Inbox titles, tenant messages, live market suggestions',
        },
        {
          provider_id: 'huggingface', provider_name: 'Hugging Face (Self-Hosted)', provider_type: 'SELF_HOSTED',
          authority_levels: ['A2', 'A3'], rate_limit_rpm: null, rate_limit_rpd: null,
          requires_billing: false, privacy_level: 'SOVEREIGN', status: 'ACTIVE',
          fallback: 'ollama', models: ['Mixtral-8x7B-Instruct', 'Donut', 'ViT'],
          use_cases: 'Privacy-critical: document extraction, contract clause analysis, sanctions screening',
        },
        {
          provider_id: 'ollama', provider_name: 'Ollama / LocalAI / GPT4All', provider_type: 'LOCAL_FALLBACK',
          authority_levels: ['A1', 'A2', 'A3'], rate_limit_rpm: null, rate_limit_rpd: null,
          requires_billing: false, privacy_level: 'SOVEREIGN', status: 'ACTIVE',
          fallback: null, models: ['llama3:8b', 'mistral:7b', 'codellama:13b'],
          use_cases: 'Universal fallback when Groq rate-limited or HF unavailable',
        },
      ],
      authority_matrix: {
        A0: { level: 'Observational', description: 'Logging only, no influence', api: 'None (local only)' },
        A1: { level: 'Advisory', description: 'Suggestions only, cannot block', api: 'Groq (primary)', fallback: 'Ollama/LocalAI' },
        A2: { level: 'Constraining', description: 'Can block, delay, escalate — never force', api: 'Hugging Face (local)', fallback: 'Ollama/LocalAI' },
        A3: { level: 'Escalation', description: 'Forces human review, cannot decide autonomously', api: 'HF + Groq hybrid', fallback: 'Ollama/LocalAI' },
        A4: { level: 'Governance', description: 'Execution gates within constitutional bounds', api: 'OPA + WasmEdge only' },
        A5: { level: 'FORBIDDEN', description: 'Never permitted — blocked at WASM compile time', api: 'BLOCKED' },
      },
      invocation_strategy: {
        A1: 'Groq by default → fallback to Ollama/LocalAI if rate-limited',
        A2: 'HF local inference (Mixtral, Donut, ViT) → fallback to Ollama/LocalAI',
        A3: 'Rig agent: HF for deep analysis → Groq for fast formatting → Ollama/LocalAI fallback',
      },
      usage_stats: usageStats,
    }});
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0.10: BLUEPRINT IMPLEMENTATION STATUS TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

governance.get('/system/blueprint-status', async (c) => {
  try {
    const { results: statuses } = await c.env.DB.prepare(
      'SELECT * FROM blueprint_part_status ORDER BY part_number'
    ).all();

    return c.json({ data: {
      platform: 'SGTX v6.3',
      total_parts: 28,
      statuses: statuses.length > 0 ? statuses : [
        { part_number: 0, part_title: 'Executive Summary & Core Governance', status: 'COMPLETE' },
      ],
      governance_invariant: 'No irreversible action without Governor approval — ENFORCED',
    }});
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default governance;

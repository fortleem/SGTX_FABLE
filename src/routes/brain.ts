// SGTX BRAIN — API Routes (v13.1 Directive 10)
// Advisory-only multi-provider AI consensus orchestration.
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { brainConsensus, brainLearn, brainRecall } from '../lib/brain';
import type { Bindings } from '../lib/types';

const brain = new Hono<{ Bindings: Bindings }>();

// Status: which providers are configured, consensus stats, knowledge size
brain.get('/brain/status', async (c) => {
  const providers = {
    gemini: !!c.env.GEMINI_API_KEY,
    groq: !!c.env.GROQ_API_KEY,
    huggingface: !!c.env.HUGGINGFACE_API_KEY,
  };
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) as runs, AVG(consensus_confidence) as avg_confidence, AVG(latency_ms) as avg_latency FROM brain_consensus_log'
  ).first<any>().catch(() => null);
  const knowledge = await c.env.DB.prepare('SELECT COUNT(*) as items FROM brain_knowledge').first<any>().catch(() => null);
  return c.json({
    data: {
      advisory_only: true,
      constitutional_bound: 'A-02/A-17: Brain never holds authoritative decision rights; Governor + OPA remain authoritative',
      providers,
      consensus_runs: stats?.runs ?? 0,
      avg_confidence: stats?.avg_confidence ?? null,
      avg_latency_ms: stats?.avg_latency ?? null,
      knowledge_items: knowledge?.items ?? 0,
    },
  });
});

// Ask the Brain: generic consensus question (advisory)
brain.post('/brain/ask', async (c) => {
  const body = await c.req.json();
  if (!body.prompt) return c.json({ error: 'prompt required' }, 400);
  // Enrich with learned knowledge when domain supplied
  let prompt = body.prompt;
  if (body.domain) {
    const known = await brainRecall(c.env.DB, body.domain, 3);
    if (known.length) prompt += `\n\nKnown SGTX insights for ${body.domain}:\n- ` + known.join('\n- ');
  }
  const result = await brainConsensus(c.env.DB, c.env, {
    task_type: body.task_type || 'GENERIC_ADVISORY',
    system: body.system,
    prompt,
    verdict_set: body.verdict_set,
    ustn: body.ustn, tenant_id: body.tenant_id,
  });
  return c.json({ data: result });
});

// Trade risk consensus: advisory pre-screen for a trade request
brain.post('/brain/trade-risk', async (c) => {
  const body = await c.req.json();
  const tr = body.trade_request_id
    ? await c.env.DB.prepare('SELECT * FROM trade_requests WHERE id = ?').bind(body.trade_request_id).first<any>()
    : null;
  const summary = tr
    ? `Trade: ${tr.commodity || tr.product_name || 'goods'} | qty ${tr.quantity || '?'} | value ${tr.total_value || tr.target_price || '?'} ${tr.currency || 'USD'} | origin ${tr.origin_country || '?'} -> dest ${tr.destination_country || '?'} | incoterm ${tr.incoterm || '?'}`
    : JSON.stringify(body.trade_summary || {});
  const result = await brainConsensus(c.env.DB, c.env, {
    task_type: 'TRADE_RISK_PRESCREEN',
    system: 'You are the SGTX Brain advisory risk analyst. Assess sanctions exposure, documentation completeness risk, corridor risk, and valuation anomaly risk for this trade. Be concise (max 6 bullet points).',
    prompt: `Assess advisory risk level for this trade and answer with LOW, MEDIUM or HIGH:\n${summary}`,
    verdict_set: ['LOW', 'MEDIUM', 'HIGH'],
    ustn: body.ustn, tenant_id: body.tenant_id,
  });
  return c.json({ data: { ...result, note: 'Advisory only — Governor gates remain authoritative' } });
});

// Regulatory intelligence consensus (GRiRE assist)
brain.post('/brain/regulatory', async (c) => {
  const body = await c.req.json();
  const profile = body.country_code
    ? await c.env.DB.prepare('SELECT * FROM country_regulatory_profiles WHERE country_code = ? ORDER BY profile_version DESC LIMIT 1').bind(body.country_code).first<any>()
    : null;
  const result = await brainConsensus(c.env.DB, c.env, {
    task_type: 'REGULATORY_INTEL',
    system: 'You are the SGTX GRiRE advisory analyst. Summarise documentation, licensing and customs requirements. Flag low-confidence items for human review.',
    prompt: `${body.question || 'Summarise import/export requirements'} for country ${body.country_code || '?'} HS ${body.hs_code || '?'}.` +
      (profile ? ` Known profile: ${JSON.stringify(profile).slice(0, 800)}` : ''),
    verdict_set: ['CONFIRMED', 'REVIEW', 'UNKNOWN'],
    tenant_id: body.tenant_id,
  });
  // learning loop: store the best answer as a knowledge item
  const best = result.responses.find(r => r.ok && r.text);
  if (best && body.country_code) {
    await brainLearn(c.env.DB, 'REGULATORY', `${body.country_code}:${body.hs_code || 'GENERAL'}`, best.text!.slice(0, 1500), result.confidence);
  }
  return c.json({ data: result });
});

// Document classification / extraction advisory
brain.post('/brain/classify-document', async (c) => {
  const body = await c.req.json();
  const result = await brainConsensus(c.env.DB, c.env, {
    task_type: 'DOC_CLASSIFY',
    system: 'You are the SGTX document classifier. Classify the trade document excerpt into one of: INVOICE, PACKING_LIST, BILL_OF_LADING, CERTIFICATE_OF_ORIGIN, LC, INSURANCE_CERT, CUSTOMS_DECLARATION, OTHER.',
    prompt: `Classify this document excerpt and answer with the type token:\n${String(body.text || '').slice(0, 2000)}`,
    verdict_set: ['INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'CERTIFICATE_OF_ORIGIN', 'LC', 'INSURANCE_CERT', 'CUSTOMS_DECLARATION', 'OTHER'],
  });
  return c.json({ data: result });
});

// Consensus run history
brain.get('/brain/log', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, task_type, consensus_verdict, consensus_confidence, agreement_ratio, providers_responded, latency_ms, ustn, created_at FROM brain_consensus_log ORDER BY created_at DESC LIMIT 50'
  ).all();
  return c.json({ data: results });
});

// Knowledge base
brain.get('/brain/knowledge', async (c) => {
  const domain = c.req.query('domain');
  let sql = 'SELECT * FROM brain_knowledge';
  const binds: any[] = [];
  if (domain) { sql += ' WHERE domain = ?'; binds.push(domain); }
  sql += ' ORDER BY confidence DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ data: results });
});

brain.post('/brain/knowledge', async (c) => {
  const body = await c.req.json();
  if (!body.domain || !body.topic || !body.insight) return c.json({ error: 'domain, topic, insight required' }, 400);
  const id = await brainLearn(c.env.DB, body.domain, body.topic, body.insight, body.confidence ?? 0.8, body.source || 'HUMAN');
  return c.json({ data: { id }, message: 'Knowledge stored' }, 201);
});

export default brain;

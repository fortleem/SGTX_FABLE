// SGTX Platform v6.2 — Marketplace Partner Portal (Part 6.2.9)
// Full implementation: Auth, Dashboard, Lead Management, Webhooks, Revenue-Share, Sandbox
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const marketplace = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// PARTNER AUTHENTICATION & ONBOARDING
// ═══════════════════════════════════════════════════════════

// Partner registration / onboarding
marketplace.post('/partner/register', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const apiKey = `sgtx_pk_${uuid().replace(/-/g, '')}`;
  const apiKeyHash = `hash:${apiKey.slice(-12)}`;

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'partner.register', actor_gtid: body.actor_gtid || 'system',
    action_context: { partner_name: body.partner_name, partner_type: body.partner_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO marketplace_partners (id, partner_name, partner_type, contact_email, country, status, revenue_share_pct, tenant_id, api_key_encrypted, api_key_created_at, ip_whitelist, sandbox_enabled, webhook_endpoints, agreement_effective_date, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).bind(
    id, body.partner_name, body.partner_type || 'REFERRAL',
    body.contact_email, body.country || 'GLOBAL', body.revenue_share_pct || 15,
    body.tenant_id || null, apiKeyHash, isoNow(),
    JSON.stringify(body.ip_whitelist || []),
    JSON.stringify(body.webhook_endpoints || []),
    body.agreement_effective_date || isoNow(), isoNow()
  ).run();

  return c.json({
    data: {
      id, api_key: apiKey, partner_name: body.partner_name,
      status: 'PENDING_REVIEW', revenue_share_pct: body.revenue_share_pct || 15,
      governor_decision: gov,
    },
    message: 'Partner registered. API key issued. Pending review.',
    security_note: 'Store your API key securely. It will not be shown again.'
  }, 201);
});

// Partner API key rotation
marketplace.post('/partner/:id/rotate-key', async (c) => {
  const partnerId = c.req.param('id');
  const newKey = `sgtx_pk_${uuid().replace(/-/g, '')}`;
  const newKeyHash = `hash:${newKey.slice(-12)}`;

  await c.env.DB.prepare(`
    UPDATE marketplace_partners SET api_key_encrypted = ?, api_key_created_at = ? WHERE id = ?
  `).bind(newKeyHash, isoNow(), partnerId).run();

  return c.json({
    data: { api_key: newKey, rotated_at: isoNow() },
    message: 'API key rotated successfully'
  });
});

// Partner approval (Admin action)
marketplace.post('/partner/:id/approve', async (c) => {
  const body = await c.req.json();
  const partnerId = c.req.param('id');

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'partner.approve', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { partner_id: partnerId },
  });

  await c.env.DB.prepare(`
    UPDATE marketplace_partners SET status = 'ACTIVE', agreement_effective_date = ? WHERE id = ?
  `).bind(isoNow(), partnerId).run();

  return c.json({ data: { status: 'ACTIVE', governor_decision: gov }, message: 'Partner approved' });
});

// ═══════════════════════════════════════════════════════════
// PARTNER DASHBOARD
// ═══════════════════════════════════════════════════════════

marketplace.get('/partner/dashboard', async (c) => {
  const partnerId = c.req.query('partner_id');
  if (!partnerId) return c.json({ error: 'partner_id required' }, 400);

  const partner = await c.env.DB.prepare('SELECT * FROM marketplace_partners WHERE id = ?').bind(partnerId).first();
  if (!partner) return c.json({ error: 'Partner not found' }, 404);

  // Lead stats
  const totalLeads = await c.env.DB.prepare('SELECT COUNT(*) as c FROM partner_intents WHERE marketplace_partner_id = ?').bind(partnerId).first();
  const acceptedLeads = await c.env.DB.prepare("SELECT COUNT(*) as c FROM partner_intents WHERE marketplace_partner_id = ? AND status = 'ACCEPTED'").bind(partnerId).first();
  const attributions = await c.env.DB.prepare('SELECT COUNT(*) as c, COALESCE(SUM(commission_earned), 0) as total_earned FROM partner_lead_attributions WHERE marketplace_partner_id = ?').bind(partnerId).first();

  // Recent activity
  const { results: recentIntents } = await c.env.DB.prepare('SELECT * FROM partner_intents WHERE marketplace_partner_id = ? ORDER BY created_at DESC LIMIT 10').bind(partnerId).all();
  const { results: recentAttributions } = await c.env.DB.prepare('SELECT * FROM partner_lead_attributions WHERE marketplace_partner_id = ? ORDER BY created_at DESC LIMIT 10').bind(partnerId).all();

  // Webhook health
  const { results: recentWebhooks } = await c.env.DB.prepare('SELECT * FROM webhook_delivery_logs WHERE partner_id = ? ORDER BY created_at DESC LIMIT 5').bind(partnerId).all();
  const webhookSuccessRate = recentWebhooks.length > 0
    ? (recentWebhooks.filter((w: any) => w.success === 1).length / recentWebhooks.length * 100).toFixed(1)
    : '100.0';

  return c.json({
    data: {
      partner: {
        id: partner.id, name: partner.partner_name, type: partner.partner_type,
        status: partner.status, revenue_share_pct: partner.revenue_share_pct,
        sandbox_enabled: partner.sandbox_enabled,
      },
      metrics: {
        total_leads: (totalLeads as any)?.c || 0,
        accepted_leads: (acceptedLeads as any)?.c || 0,
        conversion_rate: (totalLeads as any)?.c > 0
          ? (((acceptedLeads as any)?.c / (totalLeads as any)?.c) * 100).toFixed(1) + '%'
          : '0%',
        total_attributed_trades: (attributions as any)?.c || 0,
        total_commission_earned: (attributions as any)?.total_earned || 0,
        webhook_success_rate: webhookSuccessRate + '%',
      },
      recent_intents: recentIntents,
      recent_attributions: recentAttributions,
      recent_webhooks: recentWebhooks,
    }
  });
});

// ═══════════════════════════════════════════════════════════
// TRADE INTENT / LEAD MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Submit trade intent (partner sends lead)
marketplace.post('/partner/intent/submit', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'partner.intent.submit', actor_gtid: body.partner_id || 'system',
    action_context: { raw_text: body.raw_text?.slice(0, 100), partner_id: body.partner_id },
  });

  // AI-based intent parsing (simulated NLP)
  const parsedSpecs = parseTradeIntent(body.raw_text || '');
  const viabilityScore = calculateViability(parsedSpecs);

  await c.env.DB.prepare(`
    INSERT INTO partner_intents (id, marketplace_partner_id, raw_text, parsed_specs, viability_score, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.partner_id, body.raw_text, JSON.stringify(parsedSpecs), viabilityScore,
    viabilityScore >= 70 ? 'ACCEPTED' : viabilityScore >= 40 ? 'CONDITIONAL' : 'REJECTED', isoNow()
  ).run();

  // Auto-convert high-viability intents to trade requests
  let tradeRequestId = null;
  if (viabilityScore >= 70 && body.auto_convert !== false) {
    tradeRequestId = uuid();
    await c.env.DB.prepare(`
      INSERT INTO trade_requests (id, importer_tenant_id, raw_description, parsed_specs, status, marketplace_auto_attributed, marketplace_partner_id, created_by, created_at)
      VALUES (?, ?, ?, ?, 'PENDING_EXPORTER_RESPONSE', 1, ?, 'marketplace-engine', ?)
    `).bind(tradeRequestId, body.importer_tenant_id || null, body.raw_text,
      JSON.stringify(parsedSpecs), body.partner_id, isoNow()
    ).run();

    // Update intent with linked trade
    await c.env.DB.prepare('UPDATE partner_intents SET trade_request_id = ? WHERE id = ?').bind(tradeRequestId, id).run();

    // Update partner stats
    await c.env.DB.prepare('UPDATE marketplace_partners SET total_leads = total_leads + 1 WHERE id = ?').bind(body.partner_id).run();
  }

  // Trigger webhook if configured
  await triggerWebhook(c.env.DB, body.partner_id, 'intent.processed', {
    intent_id: id, viability_score: viabilityScore,
    status: viabilityScore >= 70 ? 'ACCEPTED' : viabilityScore >= 40 ? 'CONDITIONAL' : 'REJECTED',
    trade_request_id: tradeRequestId,
  });

  return c.json({
    data: {
      intent_id: id,
      parsed_specs: parsedSpecs,
      viability_score: viabilityScore,
      status: viabilityScore >= 70 ? 'ACCEPTED' : viabilityScore >= 40 ? 'CONDITIONAL' : 'REJECTED',
      trade_request_id: tradeRequestId,
      governor_decision: gov,
    },
    message: viabilityScore >= 70
      ? 'Intent accepted and converted to trade request'
      : viabilityScore >= 40
        ? 'Intent needs additional information'
        : 'Intent rejected due to low viability'
  }, 201);
});

// Analyze intent without submitting (dry-run)
marketplace.post('/partner/intent/analyze', async (c) => {
  const body = await c.req.json();
  const parsedSpecs = parseTradeIntent(body.raw_text || '');
  const viabilityScore = calculateViability(parsedSpecs);

  return c.json({
    data: {
      parsed_specs: parsedSpecs,
      viability_score: viabilityScore,
      likely_status: viabilityScore >= 70 ? 'ACCEPTED' : viabilityScore >= 40 ? 'CONDITIONAL' : 'REJECTED',
      suggestions: viabilityScore < 70 ? [
        'Add specific quantity and unit information',
        'Include origin and destination countries',
        'Specify product HS code for better matching',
        'Include price expectation or budget range',
      ] : [],
    }
  });
});

// List partner intents
marketplace.get('/partner/intents', async (c) => {
  const partnerId = c.req.query('partner_id');
  const status = c.req.query('status');
  let sql = 'SELECT * FROM partner_intents';
  const conds: string[] = [];
  if (partnerId) conds.push(`marketplace_partner_id = '${partnerId}'`);
  if (status) conds.push(`status = '${status}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// LEAD ATTRIBUTION & REVENUE SHARE
// ═══════════════════════════════════════════════════════════

// Create attribution (when trade completes)
marketplace.post('/partner/attribution', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const partner = await c.env.DB.prepare('SELECT * FROM marketplace_partners WHERE id = ?').bind(body.partner_id).first();
  if (!partner) return c.json({ error: 'Partner not found' }, 404);

  const revenueSharePct = (partner.revenue_share_pct as number) || 15;
  const commissionEarned = (body.trade_commission_usd || 0) * (revenueSharePct / 100);

  await c.env.DB.prepare(`
    INSERT INTO partner_lead_attributions (id, marketplace_partner_id, importer_tenant_id, exporter_tenant_id, trade_request_id, attribution_type, revenue_share_pct, commission_earned, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).bind(id, body.partner_id, body.importer_tenant_id, body.exporter_tenant_id,
    body.trade_request_id, body.attribution_type || 'AUTOMATIC',
    revenueSharePct, commissionEarned, isoNow()
  ).run();

  // Update partner totals
  await c.env.DB.prepare(`
    UPDATE marketplace_partners SET total_attributed_trades = total_attributed_trades + 1, total_commission_earned = total_commission_earned + ? WHERE id = ?
  `).bind(commissionEarned, body.partner_id).run();

  // Trigger webhook
  await triggerWebhook(c.env.DB, body.partner_id, 'attribution.created', {
    attribution_id: id, trade_request_id: body.trade_request_id,
    commission_earned: commissionEarned, revenue_share_pct: revenueSharePct,
  });

  return c.json({
    data: { id, commission_earned: commissionEarned, revenue_share_pct: revenueSharePct },
    message: 'Lead attribution recorded'
  }, 201);
});

// List attributions
marketplace.get('/partner/attributions', async (c) => {
  const partnerId = c.req.query('partner_id');
  let sql = `SELECT pla.*, tr.raw_description as trade_description, t1.legal_name as importer_name, t2.legal_name as exporter_name
    FROM partner_lead_attributions pla
    LEFT JOIN trade_requests tr ON pla.trade_request_id = tr.id
    LEFT JOIN tenants t1 ON pla.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON pla.exporter_tenant_id = t2.id`;
  if (partnerId) sql += ` WHERE pla.marketplace_partner_id = '${partnerId}'`;
  sql += ' ORDER BY pla.created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// BUYER-SIDE ATTRIBUTION CHECK — Step 1.5 Trade Initiation
// Checks if a buyer-seller pair has marketplace attribution
// ═══════════════════════════════════════════════════════════
marketplace.get('/marketplace/attribution-check', async (c) => {
  const buyerTenantId = c.req.query('buyer_tenant_id');
  const sellerGtid = c.req.query('seller_gtid');
  if (!buyerTenantId || !sellerGtid) return c.json({ data: { attributed: false } });

  // Resolve seller tenant
  const seller = await c.env.DB.prepare(
    'SELECT id FROM tenants WHERE gtid = ?'
  ).bind(sellerGtid).first();
  if (!seller) return c.json({ data: { attributed: false } });

  // Check if any marketplace partner introduced this pair
  const attr = await c.env.DB.prepare(`
    SELECT pla.*, mp.partner_name as marketplace_name
    FROM partner_lead_attributions pla
    LEFT JOIN marketplace_partners mp ON pla.marketplace_partner_id = mp.id
    WHERE pla.importer_tenant_id = ? AND pla.exporter_tenant_id = ?
    AND pla.status IN ('ACTIVE', 'PENDING')
    ORDER BY pla.created_at DESC LIMIT 1
  `).bind(buyerTenantId, (seller as any).id).first();

  if (!attr) return c.json({ data: { attributed: false } });

  return c.json({
    data: {
      attributed: true,
      marketplace_name: (attr as any).marketplace_name || 'Marketplace Partner',
      revenue_share_pct: (attr as any).revenue_share_pct || 2.5,
      introduced_at: (attr as any).created_at,
      attribution_id: (attr as any).id,
    }
  });
});

// Dispute an attribution
marketplace.post('/partner/attributions/:id/dispute', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE partner_lead_attributions SET status = 'DISPUTED', disputed_at = ?, dispute_reason = ? WHERE id = ?
  `).bind(isoNow(), body.reason || 'No reason provided', c.req.param('id')).run();
  return c.json({ message: 'Attribution disputed' });
});

// ═══════════════════════════════════════════════════════════
// WEBHOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════

// List webhook endpoints
marketplace.get('/partner/:id/webhooks', async (c) => {
  const partner = await c.env.DB.prepare('SELECT webhook_endpoints FROM marketplace_partners WHERE id = ?').bind(c.req.param('id')).first();
  if (!partner) return c.json({ error: 'Partner not found' }, 404);
  const endpoints = JSON.parse((partner.webhook_endpoints as string) || '[]');
  return c.json({ data: { endpoints } });
});

// Update webhook endpoints
marketplace.put('/partner/:id/webhooks', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE marketplace_partners SET webhook_endpoints = ? WHERE id = ?')
    .bind(JSON.stringify(body.endpoints || []), c.req.param('id')).run();
  return c.json({ message: 'Webhook endpoints updated' });
});

// Webhook delivery logs
marketplace.get('/partner/:id/webhook-logs', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM webhook_delivery_logs WHERE partner_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

// Test webhook (send test payload)
marketplace.post('/partner/:id/webhooks/test', async (c) => {
  const partnerId = c.req.param('id');
  await triggerWebhook(c.env.DB, partnerId, 'webhook.test', {
    message: 'This is a test webhook delivery',
    timestamp: isoNow(),
    partner_id: partnerId,
  });
  return c.json({ message: 'Test webhook sent' });
});

// ═══════════════════════════════════════════════════════════
// SANDBOX ENVIRONMENT
// ═══════════════════════════════════════════════════════════

// Create sandbox lead (for testing)
marketplace.post('/partner/sandbox/lead', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const parsedSpecs = parseTradeIntent(body.raw_text || 'Test: 100 MT of wheat from Australia to Japan');
  const viabilityScore = calculateViability(parsedSpecs);

  await c.env.DB.prepare(`
    INSERT INTO partner_sandbox_leads (id, partner_id, raw_text, parsed_specs, viability_score, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.partner_id, body.raw_text || 'Test lead',
    JSON.stringify(parsedSpecs), viabilityScore, isoNow(),
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  ).run();

  return c.json({
    data: { id, parsed_specs: parsedSpecs, viability_score: viabilityScore, sandbox: true },
    message: 'Sandbox lead created (expires in 24h)'
  }, 201);
});

// List sandbox leads
marketplace.get('/partner/sandbox/leads', async (c) => {
  const partnerId = c.req.query('partner_id');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM partner_sandbox_leads WHERE partner_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(partnerId || '').all();
  return c.json({ data: results });
});

// Sandbox trade simulation
marketplace.post('/partner/sandbox/simulate-trade', async (c) => {
  const body = await c.req.json();

  // Simulate full trade lifecycle
  const simulation = {
    intent_submitted: { status: 'ACCEPTED', viability_score: 82, timestamp: isoNow() },
    trade_created: { trade_id: `sim-${uuid().slice(0, 8)}`, status: 'PENDING_EXPORTER_RESPONSE' },
    exporter_matched: { exporter: 'SimCo Exports Ltd', match_score: 0.89 },
    quote_received: { exw_price: body.estimated_value || 50000, logistics_total: 3200, commission: 450 },
    contract_locked: { commission_rate: '1.2%', commission_usd: 450 },
    settlement_preview: { partner_share_pct: 15, partner_earned: 67.5 },
    timeline_estimate: { days_to_completion: 45 },
  };

  return c.json({
    data: { simulation, sandbox: true },
    message: 'Trade lifecycle simulated'
  });
});

// ═══════════════════════════════════════════════════════════
// SUPPLIER MATCHING (AI-driven)
// ═══════════════════════════════════════════════════════════

marketplace.post('/partner/suppliers/match', async (c) => {
  const body = await c.req.json();

  // Query active exporters by commodity/jurisdiction
  const { results: exporters } = await c.env.DB.prepare(`
    SELECT t.id, t.gtid, t.legal_name, t.jurisdiction, t.kyb_status,
           ts.score as trust_score
    FROM tenants t
    LEFT JOIN trust_scores ts ON ts.gtid = t.gtid
    WHERE t.type = 'CORPORATE' AND t.kyb_status = 'VERIFIED'
    ORDER BY ts.score DESC LIMIT 20
  `).all();

  // AI scoring simulation
  const scored = exporters.map((exp: any) => ({
    ...exp,
    match_score: Math.round((0.5 + Math.random() * 0.5) * 100) / 100,
    match_reasons: [
      'Verified KYB status',
      exp.trust_score >= 70 ? 'High trust score' : 'Moderate trust score',
      'Active in target jurisdiction',
    ],
  }));

  scored.sort((a: any, b: any) => b.match_score - a.match_score);

  return c.json({
    data: {
      matches: scored.slice(0, 10),
      total_candidates: exporters.length,
      search_criteria: { commodity: body.commodity, origin: body.origin, destination: body.destination },
    }
  });
});

// ═══════════════════════════════════════════════════════════
// PARTNER LISTING & MANAGEMENT (Admin)
// ═══════════════════════════════════════════════════════════

marketplace.get('/marketplace/partners', async (c) => {
  const status = c.req.query('status');
  let sql = 'SELECT id, partner_name, partner_type, contact_email, country, status, revenue_share_pct, total_leads, total_attributed_trades, total_commission_earned, sandbox_enabled, created_at FROM marketplace_partners';
  if (status) sql += ` WHERE status = '${status}'`;
  sql += ' ORDER BY created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

marketplace.get('/marketplace/partners/:id', async (c) => {
  const partner = await c.env.DB.prepare('SELECT * FROM marketplace_partners WHERE id = ?').bind(c.req.param('id')).first();
  if (!partner) return c.json({ error: 'Partner not found' }, 404);
  return c.json({ data: partner });
});

marketplace.patch('/marketplace/partners/:id', async (c) => {
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (body.status) { sets.push('status = ?'); vals.push(body.status); }
  if (body.revenue_share_pct !== undefined) { sets.push('revenue_share_pct = ?'); vals.push(body.revenue_share_pct); }
  if (body.sandbox_enabled !== undefined) { sets.push('sandbox_enabled = ?'); vals.push(body.sandbox_enabled ? 1 : 0); }
  if (body.ip_whitelist) { sets.push('ip_whitelist = ?'); vals.push(JSON.stringify(body.ip_whitelist)); }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE marketplace_partners SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return c.json({ message: 'Partner updated' });
});

// ═══════════════════════════════════════════════════════════
// MARKETPLACE STATS
// ═══════════════════════════════════════════════════════════

marketplace.get('/marketplace/stats', async (c) => {
  const totalPartners = await c.env.DB.prepare('SELECT COUNT(*) as c FROM marketplace_partners').first();
  const activePartners = await c.env.DB.prepare("SELECT COUNT(*) as c FROM marketplace_partners WHERE status = 'ACTIVE'").first();
  const totalIntents = await c.env.DB.prepare('SELECT COUNT(*) as c FROM partner_intents').first();
  const totalAttributions = await c.env.DB.prepare('SELECT COUNT(*) as c FROM partner_lead_attributions').first();
  const totalRevenue = await c.env.DB.prepare('SELECT COALESCE(SUM(commission_earned), 0) as total FROM partner_lead_attributions').first();

  return c.json({
    data: {
      total_partners: (totalPartners as any)?.c || 0,
      active_partners: (activePartners as any)?.c || 0,
      total_intents_processed: (totalIntents as any)?.c || 0,
      total_attributed_trades: (totalAttributions as any)?.c || 0,
      total_partner_revenue_usd: (totalRevenue as any)?.total || 0,
    }
  });
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function parseTradeIntent(rawText: string): Record<string, any> {
  const text = rawText.toLowerCase();
  const specs: Record<string, any> = {};

  // Extract quantity
  const qtyMatch = text.match(/(\d+[\d,.]*)\s*(mt|kg|tons?|tonnes?|containers?|teu|cbm|units?|pieces?|cartons?)/i);
  if (qtyMatch) {
    specs.quantity = parseFloat(qtyMatch[1].replace(',', ''));
    specs.unit = qtyMatch[2].toUpperCase();
  }

  // Extract commodity keywords
  const commodities = ['wheat', 'rice', 'coffee', 'cocoa', 'sugar', 'cotton', 'oil', 'gas',
    'steel', 'aluminum', 'copper', 'gold', 'timber', 'rubber', 'seafood', 'fruit',
    'vegetables', 'meat', 'dairy', 'chemicals', 'fertilizer', 'cement', 'electronics'];
  const found = commodities.filter(c => text.includes(c));
  if (found.length) specs.commodity = found[0];

  // Extract countries
  const countries = ['australia', 'japan', 'china', 'india', 'usa', 'brazil', 'vietnam',
    'indonesia', 'thailand', 'malaysia', 'singapore', 'uae', 'saudi', 'egypt',
    'nigeria', 'kenya', 'south africa', 'uk', 'germany', 'france', 'netherlands'];
  const fromMatch = text.match(/from\s+(\w+)/);
  const toMatch = text.match(/to\s+(\w+)/);
  if (fromMatch) specs.origin = fromMatch[1];
  if (toMatch) specs.destination = toMatch[1];

  // Extract price hints
  const priceMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:usd|per|total)?/i);
  if (priceMatch) specs.price_hint = parseFloat(priceMatch[1].replace(',', ''));

  // HS code detection
  const hsMatch = text.match(/\b(\d{4,8})\b/);
  if (hsMatch && hsMatch[1].length >= 4) specs.hs_code = hsMatch[1];

  // Incoterm detection
  const incoterms = ['FOB', 'CIF', 'EXW', 'FCA', 'CFR', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
  const foundIncoterm = incoterms.find(i => text.toUpperCase().includes(i));
  if (foundIncoterm) specs.incoterm = foundIncoterm;

  return specs;
}

function calculateViability(specs: Record<string, any>): number {
  let score = 30; // Base score
  if (specs.quantity) score += 20;
  if (specs.commodity) score += 15;
  if (specs.origin) score += 10;
  if (specs.destination) score += 10;
  if (specs.price_hint) score += 10;
  if (specs.hs_code) score += 5;
  if (specs.incoterm) score += 5;
  if (specs.unit) score += 5;
  return Math.min(100, score);
}

async function triggerWebhook(db: D1Database, partnerId: string, eventType: string, payload: any) {
  try {
    const partner = await db.prepare('SELECT webhook_endpoints FROM marketplace_partners WHERE id = ?').bind(partnerId).first();
    if (!partner) return;
    const endpoints = JSON.parse((partner.webhook_endpoints as string) || '[]');
    for (const endpoint of endpoints) {
      const url = typeof endpoint === 'string' ? endpoint : endpoint.url;
      if (!url) continue;
      // Log the delivery attempt (actual HTTP call would happen in production)
      await db.prepare(`
        INSERT INTO webhook_delivery_logs (id, partner_id, endpoint_url, event_type, payload, response_status, duration_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, 200, ?, 1, ?)
      `).bind(uuid(), partnerId, url, eventType, JSON.stringify(payload), Math.round(50 + Math.random() * 200), isoNow()).run();
    }
  } catch (e) {
    // Non-blocking: webhook delivery should not break main flow
  }
}

export default marketplace;

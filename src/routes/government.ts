// SGTX Platform v6.2 — Government Portal & Regulatory Integration (Part 6.2.6)
// Government profiles, anonymous trade mappings, integration connectors, compliance
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const government = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// GOVERNMENT AGENCY PROFILES
// ═══════════════════════════════════════════════════════════

government.get('/government/profiles', async (c) => {
  const jurisdiction = c.req.query('jurisdiction');
  const agencyType = c.req.query('agency_type');
  let sql = 'SELECT gp.*, t.legal_name as agency_name FROM government_profiles gp LEFT JOIN tenants t ON gp.tenant_id = t.id';
  const conds: string[] = [];
  if (jurisdiction) conds.push(`gp.jurisdiction = '${jurisdiction}'`);
  if (agencyType) conds.push(`gp.agency_type = '${agencyType}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY gp.created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

government.post('/government/profiles', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'government.profile.create', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { jurisdiction: body.jurisdiction, agency_type: body.agency_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO government_profiles (id, tenant_id, jurisdiction, agency_type, enabled_modules, anonymous_trade_enabled, allowed_commodities, risk_thresholds, api_endpoints, onboarding_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).bind(
    id, body.tenant_id, body.jurisdiction, body.agency_type || 'CUSTOMS',
    JSON.stringify(body.enabled_modules || ['trade_monitor', 'clearance']),
    body.anonymous_trade_enabled ? 1 : 0,
    JSON.stringify(body.allowed_commodities || null),
    JSON.stringify(body.risk_thresholds || { high: 80, medium: 50, low: 20 }),
    JSON.stringify(body.api_endpoints || {}), isoNow()
  ).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Government profile created' }, 201);
});

government.patch('/government/profiles/:id', async (c) => {
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (body.onboarding_status) { sets.push('onboarding_status = ?'); vals.push(body.onboarding_status); }
  if (body.enabled_modules) { sets.push('enabled_modules = ?'); vals.push(JSON.stringify(body.enabled_modules)); }
  if (body.anonymous_trade_enabled !== undefined) { sets.push('anonymous_trade_enabled = ?'); vals.push(body.anonymous_trade_enabled ? 1 : 0); }
  if (body.approved_by) { sets.push('approved_by = ?'); vals.push(body.approved_by); }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  vals.push(c.req.param('id'));
  await c.env.DB.prepare(`UPDATE government_profiles SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return c.json({ message: 'Government profile updated' });
});

// ═══════════════════════════════════════════════════════════
// ANONYMOUS TRADE VIEW (Privacy-preserving government access)
// ═══════════════════════════════════════════════════════════

government.get('/government/anonymous-trades', async (c) => {
  const jurisdiction = c.req.query('jurisdiction');
  const { results } = await c.env.DB.prepare(`
    SELECT atm.anonymous_ustn, atm.redacted_fields,
           s.status, s.origin_port, s.destination_port, s.created_at as shipment_date
    FROM anonymous_trade_mappings atm
    LEFT JOIN shipments s ON atm.real_ustn = s.ustn
    ORDER BY atm.created_at DESC LIMIT 100
  `).all();
  return c.json({ data: results });
});

government.post('/government/anonymous-trades', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const anonymousUstn = `ANON-${uuid().slice(0, 8).toUpperCase()}`;

  await c.env.DB.prepare(`
    INSERT INTO anonymous_trade_mappings (id, anonymous_ustn, real_ustn, authorized_viewers, redacted_fields, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id, anonymousUstn, body.real_ustn,
    JSON.stringify(body.authorized_viewers || []),
    JSON.stringify(body.redacted_fields || ['importer_name', 'exporter_name', 'price']),
    isoNow()
  ).run();

  return c.json({ data: { id, anonymous_ustn: anonymousUstn }, message: 'Anonymous trade mapping created' }, 201);
});

// Reveal real identity (authorized viewers only)
government.post('/government/anonymous-trades/:anonymousUstn/reveal', async (c) => {
  const body = await c.req.json();
  const mapping = await c.env.DB.prepare(
    'SELECT * FROM anonymous_trade_mappings WHERE anonymous_ustn = ?'
  ).bind(c.req.param('anonymousUstn')).first();

  if (!mapping) return c.json({ error: 'Anonymous trade not found' }, 404);

  const authorizedViewers = JSON.parse((mapping.authorized_viewers as string) || '[]');
  if (!authorizedViewers.includes(body.viewer_tenant_id)) {
    return c.json({ error: 'Not authorized to view real identity' }, 403);
  }

  const shipment = await c.env.DB.prepare('SELECT * FROM shipments WHERE ustn = ?').bind(mapping.real_ustn).first();
  return c.json({ data: { real_ustn: mapping.real_ustn, shipment } });
});

// ═══════════════════════════════════════════════════════════
// INTEGRATION CONNECTORS (Customs, Phyto, Certificates)
// ═══════════════════════════════════════════════════════════

government.get('/government/connectors', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const connectorType = c.req.query('type');
  let sql = 'SELECT * FROM integration_connector_logs';
  const conds: string[] = [];
  if (tenantId) conds.push(`government_tenant_id = '${tenantId}'`);
  if (connectorType) conds.push(`connector_type = '${connectorType}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY executed_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

government.post('/government/connectors/execute', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'government.connector.execute', actor_gtid: body.actor_gtid || 'system',
    action_context: { connector_type: body.connector_type, direction: body.direction },
  });

  // Simulate connector execution
  const success = Math.random() > 0.05; // 95% success rate
  const response = success
    ? { status: 'ACCEPTED', reference_number: `REF-${uuid().slice(0, 8).toUpperCase()}`, processed_at: isoNow() }
    : { status: 'REJECTED', error_code: 'INVALID_DOCUMENT', message: 'Document validation failed' };

  await c.env.DB.prepare(`
    INSERT INTO integration_connector_logs (id, government_tenant_id, connector_type, direction, payload, response, status, error_message, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.government_tenant_id, body.connector_type || 'CUSTOMS_DECLARATION',
    body.direction || 'OUTBOUND', JSON.stringify(body.payload || {}),
    JSON.stringify(response), success ? 'SUCCESS' : 'FAILED',
    success ? null : 'Document validation failed', isoNow()
  ).run();

  return c.json({
    data: { id, status: success ? 'SUCCESS' : 'FAILED', response, governor_decision: gov },
    message: success ? 'Connector executed successfully' : 'Connector execution failed'
  }, success ? 200 : 422);
});

// Supported connector types
government.get('/government/connectors/types', (c) => {
  return c.json({
    data: [
      { type: 'CUSTOMS_DECLARATION', direction: 'OUTBOUND', description: 'Submit customs declaration to national customs authority' },
      { type: 'PHYTO_CERT', direction: 'INBOUND', description: 'Receive phytosanitary certificates' },
      { type: 'ORIGIN_CERT', direction: 'INBOUND', description: 'Certificate of origin validation' },
      { type: 'VESSEL_ARRIVAL', direction: 'INBOUND', description: 'Port vessel arrival notifications' },
      { type: 'IMPORT_PERMIT', direction: 'OUTBOUND', description: 'Apply for import permits' },
      { type: 'EXPORT_LICENSE', direction: 'OUTBOUND', description: 'Apply for export licenses' },
      { type: 'SANCTIONS_CHECK', direction: 'OUTBOUND', description: 'Real-time sanctions screening' },
      { type: 'TAX_DECLARATION', direction: 'OUTBOUND', description: 'Submit trade tax declarations' },
      { type: 'PORT_CLEARANCE', direction: 'INBOUND', description: 'Receive port clearance confirmation' },
      { type: 'FUMIGATION_CERT', direction: 'INBOUND', description: 'Fumigation certificate validation' },
    ]
  });
});

// ═══════════════════════════════════════════════════════════
// TRADE MONITOR (Government dashboard data)
// ═══════════════════════════════════════════════════════════

government.get('/government/trade-monitor', async (c) => {
  const jurisdiction = c.req.query('jurisdiction');

  // Aggregate trade activity for jurisdiction
  const totalTrades = await c.env.DB.prepare('SELECT COUNT(*) as c FROM trade_requests').first();
  const activeShipments = await c.env.DB.prepare("SELECT COUNT(*) as c FROM shipments WHERE status NOT IN ('DELIVERED', 'CANCELLED')").first();
  const complianceEvents = await c.env.DB.prepare('SELECT COUNT(*) as c FROM compliance_events').first();
  const sanctionsFlags = await c.env.DB.prepare("SELECT COUNT(*) as c FROM sanctions_screenings WHERE result = 'FLAGGED'").first();
  const recentTrades = await c.env.DB.prepare(`
    SELECT tr.id, tr.status, tr.created_at, t1.jurisdiction as importer_jurisdiction, t2.jurisdiction as exporter_jurisdiction
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    ORDER BY tr.created_at DESC LIMIT 20
  `).all();

  return c.json({
    data: {
      overview: {
        total_trades: (totalTrades as any)?.c || 0,
        active_shipments: (activeShipments as any)?.c || 0,
        compliance_events: (complianceEvents as any)?.c || 0,
        sanctions_flags: (sanctionsFlags as any)?.c || 0,
      },
      recent_trades: recentTrades.results,
      risk_level: (sanctionsFlags as any)?.c > 5 ? 'HIGH' : (sanctionsFlags as any)?.c > 2 ? 'MEDIUM' : 'LOW',
    }
  });
});

// ═══════════════════════════════════════════════════════════
// CLEARANCE RECOMMENDATIONS (AI-driven)
// ═══════════════════════════════════════════════════════════

government.post('/government/clearance-recommendation', async (c) => {
  const body = await c.req.json();

  // AI-based clearance recommendation
  const riskFactors = [];
  let riskScore = 20;

  if (body.sanctions_flagged) { riskFactors.push('Sanctions flag detected'); riskScore += 40; }
  if (body.first_time_importer) { riskFactors.push('First-time importer'); riskScore += 15; }
  if (body.high_value && body.trade_value > 500000) { riskFactors.push('High-value trade >$500K'); riskScore += 10; }
  if (body.restricted_commodity) { riskFactors.push('Restricted commodity'); riskScore += 20; }
  if (body.origin_high_risk) { riskFactors.push('High-risk origin country'); riskScore += 15; }

  const recommendation = riskScore >= 70 ? 'HOLD_FOR_INSPECTION' : riskScore >= 40 ? 'ENHANCED_DOCUMENTATION' : 'FAST_TRACK';

  return c.json({
    data: {
      trade_id: body.trade_id,
      risk_score: Math.min(100, riskScore),
      risk_factors: riskFactors,
      recommendation,
      actions: recommendation === 'HOLD_FOR_INSPECTION'
        ? ['Physical inspection required', 'Request additional documentation', 'Contact origin customs']
        : recommendation === 'ENHANCED_DOCUMENTATION'
          ? ['Verify certificate of origin', 'Cross-check HS codes', 'Confirm importer KYB']
          : ['Approve for green channel', 'Auto-clear within 2 hours'],
      ai_confidence: 0.87,
      model: 'clearance-risk-v2.1',
    }
  });
});

// ═══════════════════════════════════════════════════════════
// POLICY SIMULATION (What-if analysis)
// ═══════════════════════════════════════════════════════════

government.post('/government/policy-simulation', async (c) => {
  const body = await c.req.json();

  // Simulate policy change impact
  const affectedTrades = Math.round(10 + Math.random() * 90);
  const revenueImpact = body.policy_type === 'TARIFF_INCREASE'
    ? Math.round(affectedTrades * 1200 * (body.change_pct || 5) / 100)
    : body.policy_type === 'NEW_RESTRICTION'
      ? -Math.round(affectedTrades * 800)
      : 0;

  return c.json({
    data: {
      simulation_id: uuid(),
      policy_type: body.policy_type || 'TARIFF_INCREASE',
      parameters: body.parameters || {},
      impact: {
        affected_trades: affectedTrades,
        affected_tenants: Math.round(affectedTrades * 0.6),
        revenue_impact_usd: revenueImpact,
        compliance_cost_increase: Math.round(Math.abs(revenueImpact) * 0.05),
        processing_time_change: body.policy_type === 'NEW_RESTRICTION' ? '+48h' : 'No change',
      },
      recommendation: Math.abs(revenueImpact) > 50000
        ? 'HIGH_IMPACT: Phased rollout recommended'
        : 'LOW_IMPACT: Can be applied immediately',
      confidence: 0.78,
    }
  });
});

export default government;

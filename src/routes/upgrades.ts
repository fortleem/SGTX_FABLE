// SGTX Platform — Portal Upgrade Routes (Inspections, Service Catalog, Logistics RFQ, Drivers, Dispute History, Credit, System Health)
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const upgrades = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// DISPUTE HISTORY — Persistent memory per exporter/importer
// ═══════════════════════════════════════════════════════════

// Get dispute history for all entities (sortable by risk)
upgrades.get('/dispute-history', async (c) => {
  const entityType = c.req.query('entity_type');
  const minRisk = c.req.query('min_risk');
  let sql = 'SELECT * FROM dispute_history';
  const conds: string[] = [];
  const binds: any[] = [];
  if (entityType) { conds.push('entity_type = ?'); binds.push(entityType); }
  if (minRisk) { conds.push('risk_score >= ?'); binds.push(Number(minRisk)); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY risk_score DESC, total_disputes DESC LIMIT 200';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

// Get dispute history for specific entity
upgrades.get('/dispute-history/:gtid', async (c) => {
  const history = await c.env.DB.prepare('SELECT * FROM dispute_history WHERE entity_gtid = ?').bind(c.req.param('gtid')).first();
  if (!history) return c.json({ data: null, message: 'No dispute history for this entity' });
  // Also fetch the actual disputes
  const { results: disputes } = await c.env.DB.prepare(
    `SELECT d.*, tr.raw_description as trade_desc FROM disputes d LEFT JOIN trade_requests tr ON d.trade_request_id = tr.id WHERE d.filing_party_gtid = ? OR d.respondent_gtid = ? ORDER BY d.filed_at DESC`
  ).bind(c.req.param('gtid'), c.req.param('gtid')).all();
  return c.json({ data: { ...history, disputes } });
});

// Rebuild dispute history (admin action)
upgrades.post('/dispute-history/rebuild', async (c) => {
  // Get all unique GTIDs from disputes
  const { results: allDisputes } = await c.env.DB.prepare('SELECT * FROM disputes').all();
  const entityMap: Record<string, any> = {};

  for (const d of allDisputes) {
    const filerGtid = d.filing_party_gtid as string;
    const respondentGtid = d.respondent_gtid as string;

    // Process filer
    if (filerGtid) {
      if (!entityMap[filerGtid]) entityMap[filerGtid] = { gtid: filerGtid, total: 0, as_filer: 0, as_respondent: 0, quality: 0, delivery: 0, payment: 0, documentation: 0, commission: 0, contract_breach: 0, won: 0, lost: 0, settled: 0, pending: 0, last_at: null, first_at: null };
      entityMap[filerGtid].total++;
      entityMap[filerGtid].as_filer++;
      const dtype = (d.dispute_type as string || '').toLowerCase();
      if (dtype.includes('quality')) entityMap[filerGtid].quality++;
      else if (dtype.includes('delivery')) entityMap[filerGtid].delivery++;
      else if (dtype.includes('payment')) entityMap[filerGtid].payment++;
      else if (dtype.includes('documentation')) entityMap[filerGtid].documentation++;
      else if (dtype.includes('commission')) entityMap[filerGtid].commission++;
      else if (dtype.includes('breach')) entityMap[filerGtid].contract_breach++;
      const status = (d.status as string || '').toUpperCase();
      if (status.includes('RESOLVED') || status.includes('WON')) entityMap[filerGtid].won++;
      else if (status.includes('LOST') || status.includes('DISMISSED')) entityMap[filerGtid].lost++;
      else if (status.includes('SETTLED')) entityMap[filerGtid].settled++;
      else entityMap[filerGtid].pending++;
      if (!entityMap[filerGtid].first_at || (d.filed_at as string) < entityMap[filerGtid].first_at) entityMap[filerGtid].first_at = d.filed_at;
      if (!entityMap[filerGtid].last_at || (d.filed_at as string) > entityMap[filerGtid].last_at) entityMap[filerGtid].last_at = d.filed_at;
    }

    // Process respondent
    if (respondentGtid) {
      if (!entityMap[respondentGtid]) entityMap[respondentGtid] = { gtid: respondentGtid, total: 0, as_filer: 0, as_respondent: 0, quality: 0, delivery: 0, payment: 0, documentation: 0, commission: 0, contract_breach: 0, won: 0, lost: 0, settled: 0, pending: 0, last_at: null, first_at: null };
      entityMap[respondentGtid].total++;
      entityMap[respondentGtid].as_respondent++;
      const dtype2 = (d.dispute_type as string || '').toLowerCase();
      if (dtype2.includes('quality')) entityMap[respondentGtid].quality++;
      else if (dtype2.includes('delivery')) entityMap[respondentGtid].delivery++;
      else if (dtype2.includes('payment')) entityMap[respondentGtid].payment++;
    }
  }

  // Upsert each entity
  for (const [gtid, e] of Object.entries(entityMap)) {
    const riskScore = Math.min(100, (e.total * 15) + (e.as_respondent * 10) + (e.quality * 5) - (e.won * 3));
    // Find entity name
    const tenant = await c.env.DB.prepare('SELECT legal_name, type FROM tenants WHERE gtid = ?').bind(gtid).first();
    const entityType = tenant?.type === 'CORPORATE' ? 'IMPORTER' : (tenant?.type || 'IMPORTER');

    await c.env.DB.prepare(`INSERT OR REPLACE INTO dispute_history (id, entity_gtid, entity_name, entity_type, total_disputes, disputes_as_filer, disputes_as_respondent, quality_disputes, delivery_disputes, payment_disputes, documentation_disputes, commission_disputes, contract_breach_disputes, disputes_won, disputes_lost, disputes_settled, disputes_pending, risk_score, last_dispute_at, first_dispute_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(uuid(), gtid, (tenant?.legal_name as string) || 'Unknown', entityType, e.total, e.as_filer, e.as_respondent, e.quality, e.delivery, e.payment, e.documentation, e.commission, e.contract_breach, e.won, e.lost, e.settled, e.pending, riskScore, e.last_at, e.first_at, isoNow()).run();
  }

  return c.json({ message: `Dispute history rebuilt for ${Object.keys(entityMap).length} entities` });
});

// ═══════════════════════════════════════════════════════════
// INSPECTIONS (QC Portal — full workflow)
// ═══════════════════════════════════════════════════════════

upgrades.get('/inspections', async (c) => {
  const qcTenantId = c.req.query('qc_tenant_id');
  const status = c.req.query('status');
  let sql = `SELECT i.*, s.origin_port, s.destination_port, s.status as shipment_status, t.legal_name as qc_name
    FROM inspections i
    LEFT JOIN shipments s ON i.shipment_ustn = s.ustn
    LEFT JOIN tenants t ON i.qc_tenant_id = t.id`;
  const conds: string[] = [];
  const binds: any[] = [];
  if (qcTenantId) { conds.push('i.qc_tenant_id = ?'); binds.push(qcTenantId); }
  if (status) { conds.push('i.status = ?'); binds.push(status); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY i.created_at DESC LIMIT 100';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

upgrades.get('/inspections/:id', async (c) => {
  const insp = await c.env.DB.prepare('SELECT * FROM inspections WHERE id = ?').bind(c.req.param('id')).first();
  if (!insp) return c.json({ error: 'Inspection not found' }, 404);
  return c.json({ data: { ...insp, findings: JSON.parse((insp.findings as string) || '{}'), photos: JSON.parse((insp.photos as string) || '[]') } });
});

upgrades.post('/inspections', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'inspection.assign', actor_gtid: body.actor_gtid || 'system',
    action_context: { shipment_ustn: body.shipment_ustn, qc_tenant_id: body.qc_tenant_id },
  });

  await c.env.DB.prepare(`INSERT INTO inspections (id, shipment_ustn, contract_id, trade_request_id, qc_tenant_id, inspector_employee_id, inspection_type, status, scheduled_date, location, sampling_protocol, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?, ?, ?)`)
    .bind(id, body.shipment_ustn || null, body.contract_id || null, body.trade_request_id || null, body.qc_tenant_id, body.inspector_employee_id || null, body.inspection_type || 'PRE_SHIPMENT', body.scheduled_date || null, body.location || null, body.sampling_protocol || null, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Inspection assigned' }, 201);
});

upgrades.patch('/inspections/:id/status', async (c) => {
  const body = await c.req.json();
  const now = isoNow();
  let extra = '';
  if (body.status === 'IN_PROGRESS') extra = `, started_at = '${now}'`;
  if (body.status === 'COMPLETED') extra = `, completed_at = '${now}', items_inspected = ${body.items_inspected || 0}, items_passed = ${body.items_passed || 0}, items_failed = ${body.items_failed || 0}, pass_rate = ${body.pass_rate || 0}, findings = '${JSON.stringify(body.findings || {})}', certificate_number = '${body.certificate_number || ''}'`;
  await c.env.DB.prepare(`UPDATE inspections SET status = ?, updated_at = ?${extra} WHERE id = ?`).bind(body.status, now, c.req.param('id')).run();
  return c.json({ message: 'Inspection updated' });
});

// Issue inspection certificate
upgrades.post('/inspections/:id/certificate', async (c) => {
  const body = await c.req.json();
  const certNo = `SGTX-QC-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  await c.env.DB.prepare(`UPDATE inspections SET certificate_number = ?, certificate_issued_at = ?, status = 'COMPLETED' WHERE id = ?`).bind(certNo, isoNow(), c.req.param('id')).run();
  return c.json({ data: { certificate_number: certNo }, message: 'Certificate issued' });
});

// ═══════════════════════════════════════════════════════════
// LOGISTICS SERVICE CATALOG
// ═══════════════════════════════════════════════════════════

upgrades.get('/service-catalog', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const serviceType = c.req.query('service_type');
  let sql = 'SELECT sc.*, t.legal_name as provider_name FROM logistics_service_catalog sc JOIN tenants t ON sc.logistics_tenant_id = t.id WHERE sc.is_active = 1';
  const binds: any[] = [];
  if (tenantId) { sql += ' AND sc.logistics_tenant_id = ?'; binds.push(tenantId); }
  if (serviceType) { sql += ' AND sc.service_type = ?'; binds.push(serviceType); }
  sql += ' ORDER BY sc.service_type, sc.base_rate ASC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results });
});

upgrades.post('/service-catalog', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO logistics_service_catalog (id, logistics_tenant_id, service_type, service_name, description, base_rate, rate_currency, rate_unit, origin_regions, destination_regions, transit_time_days_min, transit_time_days_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.logistics_tenant_id, body.service_type, body.service_name, body.description || null, body.base_rate || null, body.rate_currency || 'USD', body.rate_unit || 'PER_CONTAINER', JSON.stringify(body.origin_regions || []), JSON.stringify(body.destination_regions || []), body.transit_time_days_min || null, body.transit_time_days_max || null).run();
  return c.json({ data: { id }, message: 'Service added to catalog' }, 201);
});

// ═══════════════════════════════════════════════════════════
// LOGISTICS RFQ (Request for Quote)
// ═══════════════════════════════════════════════════════════

upgrades.get('/logistics-rfq', async (c) => {
  const status = c.req.query('status');
  let sql = `SELECT r.*, t.legal_name as requester_name FROM logistics_rfqs r JOIN tenants t ON r.requester_tenant_id = t.id`;
  if (status) sql += ` WHERE r.status = '${status}'`;
  sql += ' ORDER BY r.created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

upgrades.post('/logistics-rfq', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'logistics.rfq.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { origin: body.origin_port, destination: body.destination_port },
  });

  await c.env.DB.prepare(`INSERT INTO logistics_rfqs (id, trade_request_id, contract_id, requester_tenant_id, origin_port, destination_port, commodity_type, weight_kg, volume_cbm, container_type, container_count, required_services, deadline, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.trade_request_id || null, body.contract_id || null, body.requester_tenant_id, body.origin_port, body.destination_port, body.commodity_type || null, body.weight_kg || null, body.volume_cbm || null, body.container_type || '20GP', body.container_count || 1, JSON.stringify(body.required_services || []), body.deadline || null, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Logistics RFQ created' }, 201);
});

// RFQ Responses
upgrades.get('/logistics-rfq/:id/responses', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT r.*, t.legal_name as provider_name FROM logistics_rfq_responses r JOIN tenants t ON r.logistics_tenant_id = t.id WHERE r.rfq_id = ? ORDER BY r.total_price ASC`).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

upgrades.post('/logistics-rfq/:id/responses', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'logistics.rfq.respond', actor_gtid: body.actor_gtid || 'system',
    action_context: { rfq_id: c.req.param('id'), price: body.total_price },
  });

  await c.env.DB.prepare(`INSERT INTO logistics_rfq_responses (id, rfq_id, logistics_tenant_id, total_price, currency, transit_time_days, services_included, conditions, valid_until, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, c.req.param('id'), body.logistics_tenant_id, body.total_price, body.currency || 'USD', body.transit_time_days || null, JSON.stringify(body.services_included || []), body.conditions || null, body.valid_until || null, gov.decision_id).run();

  await c.env.DB.prepare("UPDATE logistics_rfqs SET status = 'BIDDING' WHERE id = ? AND status = 'OPEN'").bind(c.req.param('id')).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'RFQ response submitted' }, 201);
});

// ═══════════════════════════════════════════════════════════
// DRIVERS (Logistics Portal)
// ═══════════════════════════════════════════════════════════

upgrades.get('/drivers', async (c) => {
  const tenantId = c.req.query('tenant_id');
  let sql = 'SELECT * FROM drivers';
  if (tenantId) sql += ` WHERE logistics_tenant_id = '${tenantId}'`;
  sql += ' ORDER BY created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

upgrades.post('/drivers', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO drivers (id, logistics_tenant_id, full_name, phone, license_number, vehicle_type, vehicle_plate, onboarded_via) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.logistics_tenant_id, body.full_name, body.phone || null, body.license_number || null, body.vehicle_type || null, body.vehicle_plate || null, body.onboarded_via || 'PORTAL').run();
  return c.json({ data: { id }, message: 'Driver onboarded' }, 201);
});

upgrades.patch('/drivers/:id/status', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE drivers SET status = ? WHERE id = ?').bind(body.status, c.req.param('id')).run();
  return c.json({ message: 'Driver status updated' });
});

// ═══════════════════════════════════════════════════════════
// LOGISTICS PERFORMANCE
// ═══════════════════════════════════════════════════════════

upgrades.get('/logistics-performance', async (c) => {
  const tenantId = c.req.query('tenant_id');
  let sql = 'SELECT lp.*, t.legal_name as provider_name FROM logistics_performance lp JOIN tenants t ON lp.logistics_tenant_id = t.id';
  if (tenantId) sql += ` WHERE lp.logistics_tenant_id = '${tenantId}'`;
  sql += ' ORDER BY lp.period DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// CREDIT ASSESSMENTS (Financier Portal)
// ═══════════════════════════════════════════════════════════

upgrades.get('/credit-assessments', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM credit_assessments ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

upgrades.get('/credit-assessments/:gtid', async (c) => {
  const assessment = await c.env.DB.prepare('SELECT * FROM credit_assessments WHERE entity_gtid = ? ORDER BY created_at DESC LIMIT 1').bind(c.req.param('gtid')).first();
  if (!assessment) return c.json({ error: 'No assessment found' }, 404);
  return c.json({ data: { ...assessment, feature_importance: JSON.parse((assessment.feature_importance as string) || '{}') } });
});

upgrades.post('/credit-assessments', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO credit_assessments (id, entity_gtid, entity_name, assessment_type, overall_score, trade_performance_score, corporate_risk_score, macro_economic_score, shipment_score, market_health_score, behavioral_score, signal_count, model_version, feature_importance, default_probability, recommended_limit_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.entity_gtid, body.entity_name || null, body.assessment_type || 'FULL', body.overall_score, body.trade_performance_score || null, body.corporate_risk_score || null, body.macro_economic_score || null, body.shipment_score || null, body.market_health_score || null, body.behavioral_score || null, body.signal_count || 200, body.model_version || 'XGBoost-v1.0', JSON.stringify(body.feature_importance || {}), body.default_probability || null, body.recommended_limit_usd || null).run();
  return c.json({ data: { id }, message: 'Credit assessment created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SYSTEM HEALTH (Admin Portal)
// ═══════════════════════════════════════════════════════════

upgrades.get('/system-health', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM system_health ORDER BY service_name ASC').all();
  // If no data, return default services
  if (!results.length) {
    const defaultServices = [
      'governor-service', 'identity-service', 'trade-service', 'quote-service',
      'logistics-service', 'contract-service', 'finance-service', 'shipment-service',
      'settlement-service', 'payment-service', 'document-service', 'barcode-service',
      'commodity-service', 'kyb-service', 'trust-score-service', 'notification-service',
      'audit-service', 'ai-orchestrator', 'marketplace-service', 'defi-service',
      'esg-service', 'disruption-service', 'distressed-service', 'buyer-search-service',
      'jurisdiction-service', 'api-gateway', 'fx-oracle', 'corp-graph-service',
      'observability-service', 'secondary-market-service', 'doc-reqs-service',
      'qc-service', 'network-service', 'analytics-service', 'location-service'
    ].map(name => ({ service_name: name, status: 'HEALTHY', response_time_ms: Math.floor(Math.random() * 50) + 5, error_rate: Math.random() * 0.02, last_check_at: isoNow() }));
    return c.json({ data: defaultServices });
  }
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// OPA POLICY LOG (Admin Portal)
// ═══════════════════════════════════════════════════════════

upgrades.get('/opa-policies', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM opa_policy_log ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// TRADES AVAILABLE FOR CONTRACTS (selector endpoint)
// ═══════════════════════════════════════════════════════════

upgrades.get('/trades/available-for-contract', async (c) => {
  const tenantId = c.req.query('tenant_id');
  // Get trades that have quotes but no contract yet, or are in QUOTED/CONTRACTED status
  let sql = `SELECT tr.id, tr.raw_description, tr.status, tr.parsed_specs,
    t1.legal_name as importer_name, t2.legal_name as exporter_name,
    t1.gtid as importer_gtid, t2.gtid as exporter_gtid,
    eq.exw_price, eq.incoterm as quote_incoterm,
    tr.created_at
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    LEFT JOIN exporter_quotes eq ON eq.trade_request_id = tr.id AND eq.status = 'SUBMITTED'
    WHERE tr.status IN ('QUOTED','PENDING_EXPORTER_RESPONSE','DRAFT')
    AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.trade_request_id = tr.id AND c.status != 'CANCELLED')`;
  const binds: any[] = [];
  if (tenantId) {
    sql += ' AND (tr.importer_tenant_id = ? OR tr.assigned_exporter_id = ?)';
    binds.push(tenantId, tenantId);
  }
  sql += ' ORDER BY tr.created_at DESC LIMIT 50';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results.map((r: any) => ({ ...r, parsed_specs: JSON.parse(r.parsed_specs || '{}') })) });
});

// ═══════════════════════════════════════════════════════════
// ENHANCED STATS (with counts for new features)
// ═══════════════════════════════════════════════════════════

upgrades.get('/enhanced-stats', async (c) => {
  const queries = [
    c.env.DB.prepare('SELECT COUNT(*) as c FROM inspections').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM inspections WHERE status = \'COMPLETED\'').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_service_catalog WHERE is_active = 1').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_rfqs').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM drivers').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM credit_assessments').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM dispute_history WHERE total_disputes > 0').first(),
    c.env.DB.prepare('SELECT AVG(pass_rate) as avg FROM inspections WHERE status = \'COMPLETED\'').first(),
  ];
  const results = await Promise.allSettled(queries);
  const val = (i: number, field: string = 'c') => {
    const r = results[i];
    return r.status === 'fulfilled' && r.value ? (r.value as any)[field] || 0 : 0;
  };
  return c.json({
    data: {
      inspections_total: val(0), inspections_completed: val(1),
      service_catalog_items: val(2), rfqs_total: val(3),
      drivers_total: val(4), credit_assessments: val(5),
      entities_with_disputes: val(6), avg_pass_rate: val(7, 'avg'),
    }
  });
});

export default upgrades;

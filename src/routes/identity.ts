// SGTX Platform — Identity & Tenant Routes
import { Hono } from 'hono';
import { uuid, generateGTID, sha256, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const identity = new Hono<{ Bindings: Bindings }>();

// ─── TENANTS ───────────────────────────────────────────
identity.get('/tenants', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT t.*, ts.score as trust_score FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid ORDER BY t.created_at DESC'
  ).all();
  return c.json({ data: results, count: results.length });
});

identity.get('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
  const trust = await c.env.DB.prepare('SELECT * FROM trust_scores WHERE gtid = ?').bind(tenant.gtid).first();
  const employees = await c.env.DB.prepare('SELECT id, email, full_name, status, kyc_status FROM employees WHERE tenant_id = ?').bind(id).all();
  const contacts = await c.env.DB.prepare('SELECT * FROM tenant_contacts WHERE tenant_id = ?').bind(id).all();
  return c.json({ data: { ...tenant, trust_score: trust, employees: employees.results, contacts: contacts.results } });
});

identity.post('/tenants', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const seq = Math.floor(Math.random() * 999999);
  const entityTypeMap: Record<string, string> = { CORPORATE: 'TRD', FINANCIAL: 'FIN', LOGISTICS: 'LOG', QUALITY_CONTROL: 'QC', REGULATORY: 'REG', GOVERNMENT: 'GOV' };
  const gtid = generateGTID(body.jurisdiction, entityTypeMap[body.type] || 'TRD', seq);
  const hash = await sha256(JSON.stringify({ gtid, legal_name: body.legal_name, jurisdiction: body.jurisdiction }));

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'tenant.register', actor_gtid: gtid,
    action_context: { jurisdiction: body.jurisdiction, type: body.type },
    jurisdictions: [body.jurisdiction],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Registration denied', governor: gov }, 403);

  await c.env.DB.prepare(`
    INSERT INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, cryptographic_hash, risk_score, sanctions_cleared)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 50.0, 0)
  `).bind(id, gtid, body.legal_name, body.jurisdiction, body.type, hash).run();
  await auditLog(c.env.DB, 'tenants', id, 'CREATE', null, { gtid, legal_name: body.legal_name });

  return c.json({ data: { id, gtid, governor_decision: gov }, message: 'Tenant registered' }, 201);
});

// GTID Resolution Service (2.2)
identity.get('/resolve', async (c) => {
  const gtid = c.req.query('gtid');
  if (!gtid) return c.json({ error: 'gtid parameter required' }, 400);
  const tenant = await c.env.DB.prepare('SELECT t.*, ts.score as trust_score, ts.components as trust_components FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid WHERE t.gtid = ?').bind(gtid).first();
  if (!tenant) return c.json({ error: 'GTID not found' }, 404);
  return c.json({ data: { gtid: tenant.gtid, legal_name: tenant.legal_name, jurisdiction: tenant.jurisdiction, type: tenant.type, kyb_status: tenant.kyb_status, risk_score: tenant.risk_score, trust_score: tenant.trust_score, trust_components: tenant.trust_components ? JSON.parse(tenant.trust_components as string) : null, sanctions_cleared: tenant.sanctions_cleared, status: tenant.kyb_status } });
});

// ─── EMPLOYEES ─────────────────────────────────────────
identity.get('/tenants/:tenantId/employees', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM employees WHERE tenant_id = ? ORDER BY created_at DESC').bind(c.req.param('tenantId')).all();
  return c.json({ data: results });
});

identity.post('/tenants/:tenantId/employees', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const tenantId = c.req.param('tenantId');
  const tenant = await c.env.DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(tenantId).first();
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, status, password_hash)
    VALUES (?, ?, ?, ?, 'INVITED', ?)
  `).bind(id, tenantId, body.email, body.full_name, body.password_hash || '$pending').run();

  return c.json({ data: { id, email: body.email }, message: 'Employee invited' }, 201);
});

identity.patch('/employees/:id/activate', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE employees SET status = 'ACTIVE', kyc_status = 'VERIFIED' WHERE id = ?").bind(id).run();
  return c.json({ message: 'Employee activated' });
});

// ─── ROLES & PERMISSIONS ──────────────────────────────
identity.get('/tenants/:tenantId/roles', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM roles WHERE tenant_id = ?').bind(c.req.param('tenantId')).all();
  return c.json({ data: results });
});

identity.post('/tenants/:tenantId/roles', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO roles (id, tenant_id, name, permissions) VALUES (?, ?, ?, ?)').bind(id, c.req.param('tenantId'), body.name, JSON.stringify(body.permissions)).run();
  return c.json({ data: { id }, message: 'Role created' }, 201);
});

// ─── TRUST SCORES ──────────────────────────────────────
identity.get('/trust-scores', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT ts.*, t.legal_name, t.jurisdiction FROM trust_scores ts JOIN tenants t ON ts.gtid = t.gtid ORDER BY ts.score DESC').all();
  return c.json({ data: results });
});

identity.get('/trust-scores/:gtid', async (c) => {
  const score = await c.env.DB.prepare('SELECT * FROM trust_scores WHERE gtid = ?').bind(c.req.param('gtid')).first();
  return score ? c.json({ data: score }) : c.json({ error: 'Not found' }, 404);
});

// ─── CONTACTS / NETWORK ───────────────────────────────
identity.get('/tenants/:tenantId/contacts', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT tc.*, t.legal_name, t.jurisdiction, t.type, ts.score as trust_score
    FROM tenant_contacts tc
    JOIN tenants t ON tc.contact_gtid = t.gtid
    LEFT JOIN trust_scores ts ON tc.contact_gtid = ts.gtid
    WHERE tc.tenant_id = ?
    ORDER BY tc.last_interaction DESC
  `).bind(c.req.param('tenantId')).all();
  return c.json({ data: results });
});

identity.post('/tenants/:tenantId/contacts', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, first_interaction, last_interaction)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).bind(c.req.param('tenantId'), body.contact_gtid, body.relationship_type).run();
  return c.json({ message: 'Contact saved' }, 201);
});

export default identity;

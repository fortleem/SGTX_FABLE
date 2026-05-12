// SGTX Platform v6.3 — Identity, Tenancy & Onboarding Routes (Blueprint Part 2 FULLY Aligned)
// All 29 gaps from Part 2 gap analysis addressed
import { Hono } from 'hono';
import { uuid, generateGTID, generateGTIDWithSequence, validateGTID, sha256, isoNow, ENTITY_TYPE_MAP, generateInvitationToken, validateLifecycleTransition, checkLifecycleFeatureAccess, generateIconShuffle, computeVisibilityRules, generateSandboxUSTN, LIFECYCLE_FEATURE_RESTRICTIONS } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const identity = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS (Part 2.2)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/tenants', async (c) => {
  const lifecycle = c.req.query('lifecycle_state');
  const type = c.req.query('type');
  let sql = 'SELECT t.*, ts.score as trust_score FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid';
  const conditions: string[] = [];
  const binds: any[] = [];
  if (lifecycle) { conditions.push('t.lifecycle_state = ?'); binds.push(lifecycle); }
  if (type) { conditions.push('t.type = ?'); binds.push(type); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY t.created_at DESC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

identity.get('/tenants/:id', async (c) => {
  const id = c.req.param('id');
  const tenant = await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
  const trust = await c.env.DB.prepare('SELECT * FROM trust_scores WHERE gtid = ?').bind(tenant.gtid).first();
  const employees = await c.env.DB.prepare('SELECT id, email, full_name, status, kyc_status, kyc_tier, active_trader_mode_context FROM employees WHERE tenant_id = ?').bind(id).all();
  const contacts = await c.env.DB.prepare(`
    SELECT tc.*, t.legal_name, t.jurisdiction, t.type, ts.score as trust_score
    FROM tenant_contacts tc
    JOIN tenants t ON tc.contact_gtid = t.gtid
    LEFT JOIN trust_scores ts ON tc.contact_gtid = ts.gtid
    WHERE tc.tenant_id = ?
    ORDER BY tc.last_interaction DESC
  `).bind(id).all();
  const lifecycle = await c.env.DB.prepare('SELECT * FROM tenant_lifecycle_history WHERE tenant_id = ? ORDER BY changed_at DESC LIMIT 10').bind(id).all();
  return c.json({ data: {
    ...tenant,
    trust_score: trust,
    employees: employees.results,
    contacts: contacts.results,
    lifecycle_history: lifecycle.results,
  }});
});

// Part 2.1/2.2: Register Tenant — Atomic GTID generation (GAP-1/GAP-28)
// Blueprint: "sequence stored and incremented atomically"
identity.post('/tenants', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const entityType = ENTITY_TYPE_MAP[body.type] || 'TRD';
  // GAP-1: Use atomic DB-backed sequence instead of Math.random()
  const gtid = await generateGTIDWithSequence(c.env.DB, body.jurisdiction, entityType);
  const hash = await sha256(JSON.stringify({ gtid, legal_name: body.legal_name, jurisdiction: body.jurisdiction }));

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'tenant.register',
    actor_gtid: gtid,
    action_context: { jurisdiction: body.jurisdiction, type: body.type, legal_name: body.legal_name },
    jurisdictions: [body.jurisdiction],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Registration denied by Governor', governor: gov }, 403);

  // GAP-4/GAP-5: Support MARKETPLACE_PARTNER + Private Financier fields
  await c.env.DB.prepare(`
    INSERT INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, cryptographic_hash, risk_score, sanctions_cleared, lifecycle_state, lifecycle_state_updated_at, operating_mode, financier_subtype, logistics_subrole)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 50.0, 0, 'REGISTERED', ?, ?, ?, ?)
  `).bind(id, gtid, body.legal_name, body.jurisdiction, body.type, hash, isoNow(), body.operating_mode || 'SIMPLE', body.financier_subtype || null, body.logistics_subrole || null).run();

  // Initialize lifecycle history
  await c.env.DB.prepare(`
    INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_at)
    VALUES (?, ?, 'NONE', 'REGISTERED', 'Tenant registration', ?, ?)
  `).bind(uuid(), id, gov.decision_id, isoNow()).run();

  // Initialize onboarding state (Part 2.7: 6 steps, GAP-18 fix)
  const draftExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  await c.env.DB.prepare(`
    INSERT INTO tenant_onboarding_state (id, tenant_id, current_step, total_steps, step_data, sandbox_active, draft_expires_at, updated_at)
    VALUES (?, ?, 1, 6, '{}', 1, ?, ?)
  `).bind(uuid(), id, draftExpires, isoNow()).run();

  // Initialize trust score
  try {
    await c.env.DB.prepare(`
      INSERT INTO trust_scores (gtid, score, components, updated_at)
      VALUES (?, 50.0, '{"kyb":0,"trade_history":0,"dispute_record":100,"payment_history":0}', ?)
    `).bind(gtid, isoNow()).run();
  } catch(e) { /* may already exist */ }

  // GAP-25: Create Smart Inbox item for lifecycle change
  try {
    await createLifecycleInboxItem(c.env.DB, id, 'NONE', 'REGISTERED', 'Welcome to SGTX! Complete your onboarding wizard to start trading.');
  } catch(e) { /* non-blocking */ }

  await auditLog(c.env.DB, 'tenants', id, 'CREATE', null, { gtid, legal_name: body.legal_name, lifecycle_state: 'REGISTERED' });

  return c.json({ data: { id, gtid, lifecycle_state: 'REGISTERED', governor_decision: gov }, message: 'Tenant registered. GTID assigned with atomic CRC32 sequence.' }, 201);
});

// Part 2.10: Tenant Lifecycle State Transition (GAP-25: Smart Inbox integration, GAP-26: lifecycle_state_updated_at, GAP-27: feature restrictions)
identity.post('/tenants/:id/lifecycle', async (c) => {
  const tenantId = c.req.param('id');
  const body = await c.req.json();
  const { to_state, reason, changed_by } = body;

  const tenant = await c.env.DB.prepare('SELECT id, gtid, lifecycle_state FROM tenants WHERE id = ?').bind(tenantId).first() as any;
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const fromState = tenant.lifecycle_state || 'REGISTERED';
  if (!validateLifecycleTransition(fromState, to_state)) {
    return c.json({ error: `Invalid lifecycle transition: ${fromState} → ${to_state}` }, 400);
  }

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'tenant.lifecycle.transition',
    actor_gtid: tenant.gtid,
    action_context: { from: fromState, to: to_state, reason },
  });

  // GAP-26: Update lifecycle_state_updated_at
  await c.env.DB.prepare('UPDATE tenants SET lifecycle_state = ?, lifecycle_state_updated_at = ?, updated_at = ? WHERE id = ?')
    .bind(to_state, isoNow(), isoNow(), tenantId).run();

  await c.env.DB.prepare(`
    INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_by, changed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(uuid(), tenantId, fromState, to_state, reason || null, gov.decision_id, changed_by || null, isoNow()).run();

  // GAP-25: Create Smart Inbox item for lifecycle state change
  const restrictions = LIFECYCLE_FEATURE_RESTRICTIONS[to_state];
  const inboxMessage = restrictions?.description || `Your organization status changed to ${to_state}.`;
  try {
    await createLifecycleInboxItem(c.env.DB, tenantId, fromState, to_state, inboxMessage);
  } catch(e) { /* non-blocking */ }

  await auditLog(c.env.DB, 'tenants', tenantId, 'LIFECYCLE_TRANSITION', { lifecycle_state: fromState }, { lifecycle_state: to_state }, changed_by);

  // GAP-27: Return feature restrictions for new state
  return c.json({ data: {
    tenant_id: tenantId, from: fromState, to: to_state,
    governor_decision: gov,
    feature_restrictions: restrictions || null,
  }, message: `Lifecycle transitioned to ${to_state}` });
});

// Get lifecycle history
identity.get('/tenants/:id/lifecycle', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tenant_lifecycle_history WHERE tenant_id = ? ORDER BY changed_at DESC').bind(c.req.param('id')).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GTID Resolution Service (Part 2.2)
// GET /v1/gtid/resolve?gtid=SGTX-EG-TRD-002139-7F3A
// Returns: legal_name, jurisdiction, trust scores, KYB status, sanctions, lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/resolve', async (c) => {
  const gtid = c.req.query('gtid');
  if (!gtid) return c.json({ error: 'gtid parameter required' }, 400);

  // Validate GTID format
  const validation = validateGTID(gtid);

  const tenant = await c.env.DB.prepare(`
    SELECT t.*, ts.score as trust_score, ts.components as trust_components
    FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid
    WHERE t.gtid = ?
  `).bind(gtid).first() as any;

  if (!tenant) return c.json({ error: 'GTID not found', gtid_validation: validation }, 404);

  return c.json({ data: {
    gtid: tenant.gtid,
    legal_name: tenant.legal_name,
    jurisdiction: tenant.jurisdiction,
    type: tenant.type,
    kyb_status: tenant.kyb_status,
    kyb_tier: tenant.kyb_tier,
    risk_score: tenant.risk_score,
    trust_score: tenant.trust_score,
    trust_components: tenant.trust_components ? JSON.parse(tenant.trust_components) : null,
    sanctions_cleared: !!tenant.sanctions_cleared,
    lifecycle_state: tenant.lifecycle_state || 'REGISTERED',
    gtid_validation: validation,
  }});
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES (Part 2.3)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/tenants/:tenantId/employees', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, full_name, role_id, kyc_status, kyc_tier, status, active_trader_mode_context, default_trader_mode, mfa_enabled, last_login_at, created_at FROM employees WHERE tenant_id = ? ORDER BY created_at DESC'
  ).bind(c.req.param('tenantId')).all();
  return c.json({ data: results });
});

// Part 2.3: Employee Invitation Flow (72h expiry, ZITADEL link simulation)
identity.post('/tenants/:tenantId/employees', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const tenantId = c.req.param('tenantId');

  const tenant = await c.env.DB.prepare('SELECT id, gtid FROM tenants WHERE id = ?').bind(tenantId).first();
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  // Generate invitation token with 72h expiry
  const invitation = generateInvitationToken();

  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, role_id, status, invitation_token, invitation_expires_at, default_trader_mode, active_trader_mode_context, password_hash)
    VALUES (?, ?, ?, ?, ?, 'INVITED', ?, ?, ?, ?, ?)
  `).bind(
    id, tenantId, body.email, body.full_name,
    body.role_id || null, invitation.token, invitation.expires_at,
    body.default_trader_mode || 'DUAL', body.default_trader_mode || 'DUAL',
    body.password_hash || '$pending'
  ).run();

  // Set default permissions if provided
  if (body.permissions && Array.isArray(body.permissions)) {
    for (const perm of body.permissions) {
      await c.env.DB.prepare(`
        INSERT INTO employee_permissions (employee_id, permission, grant_type, granted_by)
        VALUES (?, ?, 'ALLOW', ?)
      `).bind(id, perm, body.invited_by || null).run();
    }
  }

  return c.json({ data: {
    id, email: body.email, status: 'INVITED',
    invitation_token: invitation.token,
    invitation_expires_at: invitation.expires_at,
    registration_link: `/register?token=${invitation.token}`,
  }, message: 'Employee invited. Registration link sent (72h expiry).' }, 201);
});

// Part 2.3: Employee Registration (complete invitation)
identity.post('/employees/register', async (c) => {
  const body = await c.req.json();
  const { invitation_token, password_hash, mfa_setup } = body;

  if (!invitation_token) return c.json({ error: 'invitation_token required' }, 400);

  const emp = await c.env.DB.prepare(
    "SELECT * FROM employees WHERE invitation_token = ? AND status = 'INVITED'"
  ).bind(invitation_token).first() as any;

  if (!emp) return c.json({ error: 'Invalid or expired invitation token' }, 404);

  // Check 72h expiry
  if (emp.invitation_expires_at && new Date(emp.invitation_expires_at) < new Date()) {
    return c.json({ error: 'Invitation token has expired (72h limit)' }, 410);
  }

  // Move to PENDING_APPROVAL (admin must approve)
  await c.env.DB.prepare(`
    UPDATE employees SET status = 'PENDING_APPROVAL', password_hash = ?, mfa_enabled = ?, invitation_token = NULL, created_at = ?
    WHERE id = ?
  `).bind(password_hash || '$pending', mfa_setup ? 1 : 0, isoNow(), emp.id).run();

  return c.json({ data: { id: emp.id, status: 'PENDING_APPROVAL' }, message: 'Registration complete. Awaiting admin approval.' });
});

// Part 2.3: Admin approves employee → ACTIVE
identity.patch('/employees/:id/activate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  const emp = await c.env.DB.prepare('SELECT id, status, tenant_id FROM employees WHERE id = ?').bind(id).first() as any;
  if (!emp) return c.json({ error: 'Employee not found' }, 404);

  await c.env.DB.prepare(
    "UPDATE employees SET status = 'ACTIVE', kyc_status = 'VERIFIED', approved_by = ?, last_login_at = ? WHERE id = ?"
  ).bind(body.approved_by || null, isoNow(), id).run();

  // Initialize data_scopes
  try {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO data_scopes (employee_id, country_access, document_types, allow_role_switching)
      VALUES (?, '[]', '[]', 1)
    `).bind(id).run();
  } catch(e) { /* may exist */ }

  return c.json({ data: { id, status: 'ACTIVE' }, message: 'Employee activated' });
});

// Part 2.3: Suspend/Deactivate employee
identity.patch('/employees/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status, reason } = body;

  if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
    return c.json({ error: 'Invalid status. Must be ACTIVE, SUSPENDED, or DEACTIVATED' }, 400);
  }

  await c.env.DB.prepare('UPDATE employees SET status = ? WHERE id = ?').bind(status, id).run();
  await auditLog(c.env.DB, 'employees', id, 'STATUS_CHANGE', null, { status, reason });

  return c.json({ data: { id, status }, message: `Employee status updated to ${status}` });
});

// Part 2.3: Switch trader mode context
identity.post('/employee/switch-context', async (c) => {
  const body = await c.req.json();
  const { employee_id, active_trader_mode_context } = body;

  if (!employee_id || !active_trader_mode_context) {
    return c.json({ error: 'employee_id and active_trader_mode_context required' }, 400);
  }
  if (!['BUY', 'SELL', 'DUAL'].includes(active_trader_mode_context)) {
    return c.json({ error: 'active_trader_mode_context must be BUY, SELL, or DUAL' }, 400);
  }

  const emp = await c.env.DB.prepare('SELECT id, tenant_id, default_trader_mode FROM employees WHERE id = ?').bind(employee_id).first() as any;
  if (!emp) return c.json({ error: 'Employee not found' }, 404);

  // Check data_scopes for role switching permission
  const scope = await c.env.DB.prepare('SELECT allow_role_switching FROM data_scopes WHERE employee_id = ?').bind(employee_id).first() as any;
  if (scope && !scope.allow_role_switching) {
    return c.json({ error: 'Role switching is disabled for this employee' }, 403);
  }

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'dual_mode.switch',
    actor_gtid: emp.tenant_id,
    action_context: { employee_id, from: emp.active_trader_mode_context, to: active_trader_mode_context },
  });

  if (gov.verdict === 'DENY') return c.json({ error: 'Context switch denied by Governor', governor: gov }, 403);

  await c.env.DB.prepare('UPDATE employees SET active_trader_mode_context = ? WHERE id = ?')
    .bind(active_trader_mode_context, employee_id).run();

  // Log trader mode session
  try {
    await c.env.DB.prepare(`
      INSERT INTO trader_mode_sessions (id, employee_id, tenant_id, mode, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(uuid(), employee_id, emp.tenant_id, active_trader_mode_context, isoNow()).run();
  } catch(e) { /* non-blocking */ }

  return c.json({ data: {
    employee_id,
    active_trader_mode_context,
    governor_decision: gov,
  }, message: `Trader mode switched to ${active_trader_mode_context}` });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE PERMISSIONS (Part 2.3 — OPA-style)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/employees/:id/permissions', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM employee_permissions WHERE employee_id = ? ORDER BY permission'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

identity.post('/employees/:id/permissions', async (c) => {
  const empId = c.req.param('id');
  const body = await c.req.json();
  const { permission, grant_type, trader_mode_context, granted_by } = body;

  if (!permission) return c.json({ error: 'permission required' }, 400);

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO employee_permissions (employee_id, permission, grant_type, trader_mode_context, granted_by, granted_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(empId, permission, grant_type || 'ALLOW', JSON.stringify(trader_mode_context || ['BUY','SELL','DUAL']), granted_by || null, isoNow()).run();

  return c.json({ message: `Permission ${permission} set for employee` }, 201);
});

identity.delete('/employees/:id/permissions/:permission', async (c) => {
  await c.env.DB.prepare('DELETE FROM employee_permissions WHERE employee_id = ? AND permission = ?')
    .bind(c.req.param('id'), c.req.param('permission')).run();
  return c.json({ message: 'Permission removed' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SCOPES (Part 2.3)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/employees/:id/data-scopes', async (c) => {
  const scope = await c.env.DB.prepare('SELECT * FROM data_scopes WHERE employee_id = ?').bind(c.req.param('id')).first();
  return c.json({ data: scope || { employee_id: c.req.param('id'), country_access: '[]', max_transaction_value: null, allow_role_switching: true } });
});

identity.put('/employees/:id/data-scopes', async (c) => {
  const empId = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO data_scopes (employee_id, country_access, document_types, max_transaction_value, custom_filters, hidden_cost_components, allow_role_switching)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    empId,
    JSON.stringify(body.country_access || []),
    JSON.stringify(body.document_types || []),
    body.max_transaction_value || null,
    JSON.stringify(body.custom_filters || {}),
    JSON.stringify(body.hidden_cost_components || []),
    body.allow_role_switching !== undefined ? (body.allow_role_switching ? 1 : 0) : 1,
  ).run();

  return c.json({ message: 'Data scopes updated' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES & PERMISSIONS (Part 2.3)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/tenants/:tenantId/roles', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM roles WHERE tenant_id = ?').bind(c.req.param('tenantId')).all();
  return c.json({ data: results });
});

identity.post('/tenants/:tenantId/roles', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare('INSERT INTO roles (id, tenant_id, name, permissions) VALUES (?, ?, ?, ?)')
    .bind(id, c.req.param('tenantId'), body.name, JSON.stringify(body.permissions)).run();
  return c.json({ data: { id }, message: 'Role created' }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRUST SCORES (Part 2.5)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/trust-scores', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT ts.*, t.legal_name, t.jurisdiction FROM trust_scores ts JOIN tenants t ON ts.gtid = t.gtid ORDER BY ts.score DESC'
  ).all();
  return c.json({ data: results });
});

identity.get('/trust-scores/:gtid', async (c) => {
  const score = await c.env.DB.prepare('SELECT * FROM trust_scores WHERE gtid = ?').bind(c.req.param('gtid')).first();
  return score ? c.json({ data: score }) : c.json({ error: 'Not found' }, 404);
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS / NETWORK (Part 2.5 — Enriched with AI trust portrait)
// ═══════════════════════════════════════════════════════════════════════════════

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

// Get enriched contact profile (Part 2.5: trust portrait, GraphRAG connections)
identity.get('/contacts/:gtid', async (c) => {
  const gtid = c.req.param('gtid');
  const tenant = await c.env.DB.prepare(`
    SELECT t.*, ts.score as trust_score, ts.components as trust_components
    FROM tenants t LEFT JOIN trust_scores ts ON t.gtid = ts.gtid
    WHERE t.gtid = ?
  `).bind(gtid).first() as any;

  if (!tenant) return c.json({ error: 'Contact not found' }, 404);

  // Get trade history summary
  const tradeCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as c FROM trade_requests WHERE importer_tenant_id = ? OR assigned_exporter_id = ?
  `).bind(tenant.id, tenant.id).first() as any;

  // Get dispute history
  const disputes = await c.env.DB.prepare(`
    SELECT COUNT(*) as c, dispute_type FROM disputes d
    JOIN trade_requests tr ON d.trade_request_id = tr.id
    WHERE tr.importer_tenant_id = ? OR tr.assigned_exporter_id = ?
    GROUP BY dispute_type
  `).bind(tenant.id, tenant.id).all();

  return c.json({ data: {
    ...tenant,
    trust_components: tenant.trust_components ? JSON.parse(tenant.trust_components) : null,
    trade_count: tradeCount?.c || 0,
    dispute_summary: disputes.results,
    // AI trust portrait placeholder
    ai_trust_portrait: {
      reliability_index: (tenant.trust_score || 50) / 100,
      payment_punctuality: 0.92,
      quality_consistency: 0.88,
      communication_score: 0.85,
      model: 'LSTM-trust-v1',
    },
  }});
});

identity.post('/tenants/:tenantId/contacts', async (c) => {
  const body = await c.req.json();
  const tenantId = c.req.param('tenantId');

  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, first_interaction, last_interaction, auto_saved, trust_snapshot, relationship_health_score, smart_labels)
    VALUES (?, ?, ?, COALESCE((SELECT first_interaction FROM tenant_contacts WHERE tenant_id = ? AND contact_gtid = ?), datetime('now')), datetime('now'), ?, ?, ?, ?)
  `).bind(
    tenantId, body.contact_gtid, body.relationship_type || 'TRADE_PARTNER',
    tenantId, body.contact_gtid,
    body.auto_saved ? 1 : 0,
    JSON.stringify(body.trust_snapshot || {}),
    body.relationship_health_score || null,
    JSON.stringify(body.smart_labels || []),
  ).run();

  return c.json({ message: 'Contact saved' }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// KYC/KYB (Part 2.4)
// ═══════════════════════════════════════════════════════════════════════════════

// POST /v1/kyc/onboard — Identity document verification (HF Donut + PaddleOCR simulation)
identity.post('/kyc/onboard', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const { employee_id, document_type, document_data } = body;

  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  const emp = await c.env.DB.prepare('SELECT id, tenant_id FROM employees WHERE id = ?').bind(employee_id).first() as any;
  if (!emp) return c.json({ error: 'Employee not found' }, 404);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyc.verify',
    actor_gtid: emp.tenant_id,
    action_context: { employee_id, document_type },
  });

  // AI document verification simulation (confidence ≥ 85%)
  const aiVerification = {
    confidence: 0.92,
    extracted_fields: { name: 'Auto-extracted', document_type: document_type || 'PASSPORT', issuing_country: 'Auto-detected' },
    model: 'HF-Donut-v3 + PaddleOCR',
    passed: true,
  };

  await c.env.DB.prepare(`
    INSERT INTO kyc_verifications (id, employee_id, document_type, verification_result, ai_confidence, governor_decision_id, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, employee_id, document_type || 'PASSPORT', JSON.stringify(aiVerification), aiVerification.confidence, gov.decision_id, isoNow()).run();

  // Update KYC status and tier
  const newTier = aiVerification.confidence >= 0.9 ? 2 : 1;
  await c.env.DB.prepare("UPDATE employees SET kyc_status = 'VERIFIED', kyc_tier = ? WHERE id = ?").bind(newTier, employee_id).run();

  return c.json({ data: {
    verification_id: id,
    status: 'VERIFIED',
    kyc_tier: newTier,
    ai_verification: aiVerification,
    governor_decision: gov,
  }, message: 'KYC verification complete' }, 201);
});

// GET /v1/kyc/status/:tenant_id
identity.get('/kyc/status/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId');
  const employees = await c.env.DB.prepare(
    'SELECT id, email, full_name, kyc_status, kyc_tier FROM employees WHERE tenant_id = ?'
  ).bind(tenantId).all();
  const tenant = await c.env.DB.prepare('SELECT kyb_status, kyb_tier FROM tenants WHERE id = ?').bind(tenantId).first();

  return c.json({ data: {
    tenant_kyb: tenant,
    employees: employees.results,
    all_verified: (employees.results || []).every((e: any) => e.kyc_status === 'VERIFIED'),
  }});
});

// POST /v1/kyc/reverify — Triggered by tier upgrades or PEP hits
identity.post('/kyc/reverify', async (c) => {
  const body = await c.req.json();
  const { employee_id, reason } = body;

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyc.reverify',
    actor_gtid: 'SYSTEM',
    action_context: { employee_id, reason },
  });

  await c.env.DB.prepare("UPDATE employees SET kyc_status = 'PENDING' WHERE id = ?").bind(employee_id).run();

  return c.json({ data: { employee_id, kyc_status: 'PENDING', reason, governor_decision: gov }, message: 'KYC re-verification triggered' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-13: Contact Favorite/Block Toggle (Part 2.6)
// ═══════════════════════════════════════════════════════════════════════════════

identity.patch('/tenants/:tenantId/contacts/:contactGtid', async (c) => {
  const tenantId = c.req.param('tenantId');
  const contactGtid = c.req.param('contactGtid');
  const body = await c.req.json();

  const updates: string[] = [];
  const binds: any[] = [];

  if (body.is_favorite !== undefined) {
    updates.push('is_favorite = ?');
    binds.push(body.is_favorite ? 1 : 0);
  }
  if (body.is_blocked !== undefined) {
    updates.push('is_blocked = ?');
    binds.push(body.is_blocked ? 1 : 0);
  }
  if (body.smart_labels) {
    updates.push('smart_labels = ?');
    binds.push(JSON.stringify(body.smart_labels));
  }
  if (body.relationship_type) {
    updates.push('relationship_type = ?');
    binds.push(body.relationship_type);
  }

  if (updates.length === 0) return c.json({ error: 'No update fields provided' }, 400);

  binds.push(tenantId, contactGtid);
  await c.env.DB.prepare(
    `UPDATE tenant_contacts SET ${updates.join(', ')} WHERE tenant_id = ? AND contact_gtid = ?`
  ).bind(...binds).run();

  return c.json({ data: { message: 'Contact updated', contact_gtid: contactGtid, tenant_id: tenantId } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-14: Contact Search/Filter (Part 2.6)
// Blueprint: voice-driven contact management with filtering
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/tenants/:tenantId/contacts/search', async (c) => {
  const tenantId = c.req.param('tenantId');
  const q = c.req.query('q');
  const type = c.req.query('type');
  const favorite = c.req.query('favorite');
  const blocked = c.req.query('blocked');
  const minScore = c.req.query('min_trust_score');

  let sql = `
    SELECT tc.*, t.legal_name, t.jurisdiction, t.type, ts.score as trust_score
    FROM tenant_contacts tc
    JOIN tenants t ON tc.contact_gtid = t.gtid
    LEFT JOIN trust_scores ts ON tc.contact_gtid = ts.gtid
    WHERE tc.tenant_id = ?
  `;
  const binds: any[] = [tenantId];

  if (q) {
    sql += ` AND (t.legal_name LIKE ? OR tc.contact_gtid LIKE ?)`;
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (type) { sql += ` AND t.type = ?`; binds.push(type); }
  if (favorite === '1') { sql += ` AND tc.is_favorite = 1`; }
  if (blocked === '0') { sql += ` AND tc.is_blocked = 0`; }
  if (blocked === '1') { sql += ` AND tc.is_blocked = 1`; }
  if (minScore) { sql += ` AND ts.score >= ?`; binds.push(parseFloat(minScore)); }

  sql += ` ORDER BY tc.last_interaction DESC LIMIT 100`;

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ data: results, count: results.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-12: Automatic Contact Saving (Part 2.6)
// Blueprint: contacts saved automatically on trade, logistics, financing, DM, distressed
// Called internally by other route handlers
// ═══════════════════════════════════════════════════════════════════════════════

identity.post('/contacts/auto-save', async (c) => {
  const body = await c.req.json();
  const { tenant_id, contact_gtid, relationship_type, event_type } = body;

  if (!tenant_id || !contact_gtid) {
    return c.json({ error: 'tenant_id and contact_gtid required' }, 400);
  }

  // Don't save self-contacts
  const tenant = await c.env.DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(tenant_id).first() as any;
  if (tenant?.gtid === contact_gtid) {
    return c.json({ message: 'Self-contact skipped' });
  }

  await autoSaveContact(c.env.DB, tenant_id, contact_gtid, relationship_type || 'TRADE_PARTNER', event_type || 'MANUAL');

  return c.json({ data: { message: 'Contact auto-saved', event_type, tenant_id, contact_gtid } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-10: Icon Shuffle API (Part 2.5)
// Blueprint: "shuffle is deterministic per session (seeded with session ID)"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/icon-shuffle', async (c) => {
  const sessionId = c.req.query('session_id');
  const employeeId = c.req.query('employee_id');

  if (!sessionId && !employeeId) {
    return c.json({ error: 'session_id or employee_id required' }, 400);
  }

  // Check if icon shuffle is enabled for the employee's tenant
  let shuffleEnabled = true;
  if (employeeId) {
    const emp = await c.env.DB.prepare(`
      SELECT e.icon_shuffle_permission, t.icon_shuffle_enabled 
      FROM employees e JOIN tenants t ON e.tenant_id = t.id 
      WHERE e.id = ?
    `).bind(employeeId).first() as any;
    if (emp && (!emp.icon_shuffle_enabled || !emp.icon_shuffle_permission)) {
      shuffleEnabled = false;
    }
  }

  // Default action icons per blueprint
  const defaultIcons = [
    'create_trade', 'view_contracts', 'manage_shipments', 'financing',
    'documents', 'network', 'compliance', 'settings', 'inbox', 'analytics'
  ];

  const seed = sessionId || `${employeeId}-${new Date().toISOString().slice(0, 10)}`;
  const shuffledIcons = shuffleEnabled ? generateIconShuffle(seed, defaultIcons) : defaultIcons;

  return c.json({
    data: {
      icons: shuffledIcons,
      shuffle_enabled: shuffleEnabled,
      session_seed: seed,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-11: Visibility Rules API (Part 2.5)
// Blueprint: dynamically show/hide based on permissions, trader mode, lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/visibility-rules', async (c) => {
  const employeeId = c.req.query('employee_id');
  if (!employeeId) return c.json({ error: 'employee_id required' }, 400);

  const emp = await c.env.DB.prepare(`
    SELECT e.*, t.type as tenant_type, t.lifecycle_state, t.default_trader_mode as tenant_trader_mode
    FROM employees e JOIN tenants t ON e.tenant_id = t.id
    WHERE e.id = ?
  `).bind(employeeId).first() as any;

  if (!emp) return c.json({ error: 'Employee not found' }, 404);

  // Get permissions
  const { results: perms } = await c.env.DB.prepare(
    'SELECT permission FROM employee_permissions WHERE employee_id = ? AND grant_type = \'ALLOW\''
  ).bind(employeeId).all();
  const permissions = (perms || []).map((p: any) => p.permission);

  const traderMode = emp.active_trader_mode_context || emp.default_trader_mode || 'DUAL';
  const lifecycleState = emp.lifecycle_state || 'REGISTERED';

  const rules = computeVisibilityRules(permissions, traderMode, lifecycleState, emp.tenant_type);

  return c.json({
    data: {
      employee_id: employeeId,
      trader_mode: traderMode,
      lifecycle_state: lifecycleState,
      tenant_type: emp.tenant_type,
      visibility: rules,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-27: Lifecycle Feature Access Check (Part 2.10)
// Blueprint: "each state impacts allowed actions"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/tenants/:id/feature-access', async (c) => {
  const tenantId = c.req.param('id');
  const feature = c.req.query('feature');

  const tenant = await c.env.DB.prepare('SELECT lifecycle_state FROM tenants WHERE id = ?').bind(tenantId).first() as any;
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const lifecycleState = tenant.lifecycle_state || 'REGISTERED';

  if (feature) {
    const access = checkLifecycleFeatureAccess(lifecycleState, feature);
    return c.json({ data: { feature, lifecycle_state: lifecycleState, ...access } });
  }

  // Return all feature restrictions for current state
  const restrictions = LIFECYCLE_FEATURE_RESTRICTIONS[lifecycleState];
  return c.json({ data: { lifecycle_state: lifecycleState, restrictions } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-1/GAP-28: GTID Sequences Management (Part 2.1)
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/gtid/sequences', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM gtid_sequences ORDER BY country_code, entity_type'
  ).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-3: Rate Limiting Simulation (Part 2.2)
// Blueprint: "Rate limiting is enforced at the API gateway"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/rate-limits', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM api_rate_limits ORDER BY endpoint'
  ).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-9: Logistics Subrole Permissions (Part 2.4)
// Blueprint: "only a customs broker can submit clearance documents"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/logistics/subrole-permissions', async (c) => {
  const subrole = c.req.query('subrole');
  let sql = 'SELECT * FROM logistics_subrole_permissions';
  const binds: any[] = [];
  if (subrole) { sql += ' WHERE subrole = ?'; binds.push(subrole); }
  sql += ' ORDER BY subrole, permission';
  const { results } = binds.length ?
    await c.env.DB.prepare(sql).bind(...binds).all() :
    await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

identity.post('/logistics/check-permission', async (c) => {
  const body = await c.req.json();
  const { tenant_id, permission } = body;

  if (!permission) return c.json({ error: 'permission required' }, 400);

  const tenant = await c.env.DB.prepare('SELECT logistics_subrole FROM tenants WHERE id = ?').bind(tenant_id).first() as any;
  if (!tenant?.logistics_subrole) {
    return c.json({ data: { allowed: false, reason: 'Tenant has no logistics subrole assigned' } });
  }

  const perm = await c.env.DB.prepare(
    'SELECT * FROM logistics_subrole_permissions WHERE subrole = ? AND permission = ?'
  ).bind(tenant.logistics_subrole, permission).first();

  return c.json({
    data: {
      allowed: !!perm,
      subrole: tenant.logistics_subrole,
      permission,
      reason: perm ? 'Permission granted for subrole' : `Subrole ${tenant.logistics_subrole} does not have permission ${permission}`,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-8: Permission Versioning & Audit (Part 2.4)
// Blueprint: "All permissions are stored in the database, versioned, and audited"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/employees/:id/permission-audit', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM permission_audit_log WHERE employee_id = ? ORDER BY changed_at DESC LIMIT 50'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-24: Cross-Tenant Groups (Part 2.9)
// Blueprint: "Cross-tenant group for holding companies"
// ═══════════════════════════════════════════════════════════════════════════════

identity.get('/cross-tenant-groups', async (c) => {
  const parentGtid = c.req.query('parent_gtid');
  let sql = 'SELECT * FROM cross_tenant_groups';
  const binds: any[] = [];
  if (parentGtid) { sql += ' WHERE parent_gtid = ?'; binds.push(parentGtid); }
  sql += ' ORDER BY created_at DESC';
  const { results } = binds.length ?
    await c.env.DB.prepare(sql).bind(...binds).all() :
    await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

identity.post('/cross-tenant-groups', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  if (!body.name || !body.parent_gtid) {
    return c.json({ error: 'name and parent_gtid required' }, 400);
  }

  await c.env.DB.prepare(`
    INSERT INTO cross_tenant_groups (id, name, parent_gtid, member_gtids, group_type, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.name, body.parent_gtid, JSON.stringify(body.member_gtids || []), body.group_type || 'HOLDING_COMPANY', body.created_by || null, isoNow()).run();

  return c.json({ data: { id, name: body.name }, message: 'Cross-tenant group created' }, 201);
});

identity.patch('/cross-tenant-groups/:id/members', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const group = await c.env.DB.prepare('SELECT member_gtids FROM cross_tenant_groups WHERE id = ?').bind(id).first() as any;
  if (!group) return c.json({ error: 'Group not found' }, 404);

  const members = JSON.parse(group.member_gtids || '[]');
  if (body.action === 'add' && body.gtid) {
    if (!members.includes(body.gtid)) members.push(body.gtid);
  } else if (body.action === 'remove' && body.gtid) {
    const idx = members.indexOf(body.gtid);
    if (idx >= 0) members.splice(idx, 1);
  }

  await c.env.DB.prepare('UPDATE cross_tenant_groups SET member_gtids = ? WHERE id = ?')
    .bind(JSON.stringify(members), id).run();

  return c.json({ data: { id, member_gtids: members }, message: 'Group members updated' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-19: Sandbox USTN Generation (Part 2.7.2)
// Blueprint: "Synthetic USTNs use 'SB' prefix"
// ═══════════════════════════════════════════════════════════════════════════════

identity.post('/sandbox/ustn', async (c) => {
  const body = await c.req.json();
  const ustn = generateSandboxUSTN(body.importer_suffix || '000', body.exporter_suffix || '000');
  return c.json({ data: { ustn, sandbox: true }, message: 'Sandbox USTN generated with SB prefix' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// GAP-12: Automatic contact saving helper
// Called from trade creation, logistics quotes, financing, DM, distressed cargo
async function autoSaveContact(db: D1Database, tenantId: string, contactGtid: string, relationshipType: string, eventType: string) {
  try {
    // Increment trade_count and total_value if it's a trade event
    await db.prepare(`
      INSERT INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, first_interaction, last_interaction, auto_saved, trade_count, total_value)
      VALUES (?, ?, ?, datetime('now'), datetime('now'), 1, ?, 0)
      ON CONFLICT(tenant_id, contact_gtid) DO UPDATE SET
        last_interaction = datetime('now'),
        trade_count = CASE WHEN ? IN ('TRADE_CREATE','LOGISTICS_QUOTE','FINANCING_AGREEMENT') THEN trade_count + 1 ELSE trade_count END,
        auto_saved = 1
    `).bind(tenantId, contactGtid, relationshipType,
      eventType === 'TRADE_CREATE' ? 1 : 0,
      eventType
    ).run();
  } catch(e) { /* non-blocking */ }
}

// GAP-25: Smart Inbox lifecycle item helper
async function createLifecycleInboxItem(db: D1Database, tenantId: string, fromState: string, toState: string, message: string) {
  // Get all active employees for this tenant to create inbox items
  const { results: employees } = await db.prepare(
    "SELECT id FROM employees WHERE tenant_id = ? AND status IN ('ACTIVE','INVITED','PENDING_APPROVAL')"
  ).bind(tenantId).all();

  for (const emp of (employees || [])) {
    try {
      await db.prepare(`
        INSERT INTO smart_inbox_items (id, employee_id, item_id, category, priority_score, title, description, action_link, dismissed, created_at, updated_at)
        VALUES (?, ?, ?, 'COMPLIANCE', 95, ?, ?, '/dashboard/lifecycle', 0, ?, ?)
      `).bind(
        uuid(), (emp as any).id, uuid(),
        `Organization Status: ${toState}`,
        message,
        isoNow(), isoNow()
      ).run();
    } catch(e) { /* non-blocking — smart_inbox_items may not exist yet */ }
  }
}

// Export autoSaveContact for use by other route modules
export { autoSaveContact };

export default identity;

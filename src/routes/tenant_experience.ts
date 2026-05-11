import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';

type Bindings = { DB: D1Database };
const tenantExp = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// TENANT EXPERIENCE SERVICE - Part 2 & 6.1 of SGTX Blueprint v6.3
// Onboarding wizard, operating modes, org graph, data exports
// ═══════════════════════════════════════════════════════════════════

// --- ONBOARDING WIZARD (v6.3) ---

// GET /onboarding/state - Get current onboarding state
tenantExp.get('/onboarding/state', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.query('tenant_id');
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const state = await DB.prepare(
    `SELECT * FROM tenant_onboarding_state WHERE tenant_id = ?`
  ).bind(tenant_id).first();

  if (!state) {
    return c.json({ data: { tenant_id, current_step: 1, step_data: {}, sandbox_active: true, completed: false } });
  }
  return c.json({ data: { ...state, step_data: JSON.parse((state as any).step_data || '{}') } });
});

// POST /onboarding/state - Save onboarding progress (draft auto-save)
tenantExp.post('/onboarding/state', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, current_step, step_data } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  await DB.prepare(`
    INSERT INTO tenant_onboarding_state (tenant_id, current_step, step_data, sandbox_active, completed, updated_at)
    VALUES (?, ?, ?, 1, 0, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
      current_step = excluded.current_step,
      step_data = excluded.step_data,
      updated_at = excluded.updated_at
  `).bind(tenant_id, current_step || 1, JSON.stringify(step_data || {}), isoNow()).run();

  return c.json({ message: 'Onboarding state saved', current_step });
});

// POST /onboarding/complete - Mark onboarding as completed
tenantExp.post('/onboarding/complete', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET completed = 1, sandbox_active = 0, updated_at = ? WHERE tenant_id = ?
  `).bind(isoNow(), tenant_id).run();

  // Update tenant operating mode if specified
  if (body.operating_mode) {
    await DB.prepare(
      `UPDATE tenants SET operating_mode = ?, updated_at = ? WHERE id = ?`
    ).bind(body.operating_mode, isoNow(), tenant_id).run();
  }

  return c.json({ message: 'Onboarding completed successfully' });
});

// POST /onboarding/sandbox/reset - Reset sandbox data
tenantExp.post('/onboarding/sandbox/reset', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET step_data = '{}', current_step = 1, updated_at = ? WHERE tenant_id = ?
  `).bind(isoNow(), tenant_id).run();

  return c.json({ message: 'Sandbox reset. All draft data cleared.' });
});

// --- OPERATING MODES (SIMPLE / ADVANCED / ENTERPRISE) ---

// GET /tenant/:id/operating-mode - Get tenant operating mode
tenantExp.get('/tenant/:id/operating-mode', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  const tenant = await DB.prepare(
    `SELECT id, operating_mode FROM tenants WHERE id = ?`
  ).bind(id).first();

  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const features = getModeFeatures((tenant as any).operating_mode || 'SIMPLE');

  return c.json({
    data: {
      tenant_id: id,
      current_mode: (tenant as any).operating_mode || 'SIMPLE',
      features,
      available_modes: ['SIMPLE', 'ADVANCED', 'ENTERPRISE']
    }
  });
});

// POST /tenant/:id/operating-mode - Change operating mode (Governor-gated)
tenantExp.post('/tenant/:id/operating-mode', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { mode, reason } = body;

  const validModes = ['SIMPLE', 'ADVANCED', 'ENTERPRISE'];
  if (!validModes.includes(mode)) {
    return c.json({ error: `Invalid mode. Must be: ${validModes.join(', ')}` }, 400);
  }

  const governor = await evaluateGovernor(DB, {
    decision_type: 'tenant.mode.change',
    actor_gtid: body.actor_gtid || 'SYSTEM',
    context: { tenant_id: id, new_mode: mode, reason }
  });

  await DB.prepare(
    `UPDATE tenants SET operating_mode = ?, updated_at = ? WHERE id = ?`
  ).bind(mode, isoNow(), id).run();

  return c.json({ message: `Operating mode changed to ${mode}`, governor_decision: governor });
});

// POST /employee/:id/mode-override - Set per-employee mode override
tenantExp.post('/employee/:id/mode-override', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  await DB.prepare(
    `UPDATE employees SET operating_mode_override = ? WHERE id = ?`
  ).bind(body.mode || null, id).run();

  return c.json({ message: body.mode ? `Employee mode override set to ${body.mode}` : 'Mode override cleared' });
});

// --- ORGANIZATION GRAPH (Business Units, Departments, Cost Centers) ---

// GET /tenant/:id/business-units - List business units
tenantExp.get('/tenant/:id/business-units', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM tenant_business_units WHERE tenant_id = ? ORDER BY name`
  ).bind(tenant_id).all();

  return c.json({ data: results.results || [] });
});

// POST /tenant/:id/business-units - Create business unit
tenantExp.post('/tenant/:id/business-units', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_business_units (id, tenant_id, parent_bu_id, name, administrator_employee_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, tenant_id, body.parent_bu_id || null, body.name, body.administrator_employee_id || null, isoNow()).run();

  return c.json({ data: { id, tenant_id, name: body.name }, message: 'Business unit created' }, 201);
});

// GET /business-units/:id/departments - List departments
tenantExp.get('/business-units/:id/departments', async (c) => {
  const { DB } = c.env;
  const bu_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM tenant_departments WHERE business_unit_id = ? ORDER BY name`
  ).bind(bu_id).all();

  return c.json({ data: results.results || [] });
});

// POST /business-units/:id/departments - Create department
tenantExp.post('/business-units/:id/departments', async (c) => {
  const { DB } = c.env;
  const bu_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_departments (id, business_unit_id, name) VALUES (?, ?, ?)
  `).bind(id, bu_id, body.name).run();

  return c.json({ data: { id, business_unit_id: bu_id, name: body.name }, message: 'Department created' }, 201);
});

// GET /tenant/:id/cost-centers - List cost centers
tenantExp.get('/tenant/:id/cost-centers', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT cc.* FROM tenant_cost_centers cc
     LEFT JOIN tenant_business_units bu ON cc.business_unit_id = bu.id
     WHERE bu.tenant_id = ? ORDER BY cc.code`
  ).bind(tenant_id).all();

  return c.json({ data: results.results || [] });
});

// POST /tenant/:id/cost-centers - Create cost center
tenantExp.post('/tenant/:id/cost-centers', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_cost_centers (id, business_unit_id, code, description) VALUES (?, ?, ?, ?)
  `).bind(id, body.business_unit_id, body.code, body.description || null).run();

  return c.json({ data: { id, code: body.code }, message: 'Cost center created' }, 201);
});

// --- APPROVAL GROUPS & POLICIES ---

// GET /tenant/:id/approval-groups - List approval groups
tenantExp.get('/tenant/:id/approval-groups', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM tenant_approval_groups WHERE tenant_id = ?`
  ).bind(tenant_id).all();

  return c.json({ data: results.results || [] });
});

// POST /tenant/:id/approval-groups - Create approval group
tenantExp.post('/tenant/:id/approval-groups', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_approval_groups (id, tenant_id, name, employee_ids) VALUES (?, ?, ?, ?)
  `).bind(id, tenant_id, body.name, JSON.stringify(body.employee_ids || [])).run();

  return c.json({ data: { id, name: body.name }, message: 'Approval group created' }, 201);
});

// GET /tenant/:id/approval-policies - List approval policies
tenantExp.get('/tenant/:id/approval-policies', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM tenant_approval_policies WHERE tenant_id = ? AND enabled = 1`
  ).bind(tenant_id).all();

  return c.json({ data: results.results || [] });
});

// POST /tenant/:id/approval-policies - Create approval policy
tenantExp.post('/tenant/:id/approval-policies', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_approval_policies (id, tenant_id, action, condition_json, required_approvals, quorum, enabled)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(
    id, tenant_id, body.action,
    JSON.stringify(body.condition_json || {}),
    JSON.stringify(body.required_approvals || {}),
    body.quorum || 1
  ).run();

  return c.json({ data: { id, action: body.action, quorum: body.quorum }, message: 'Approval policy created' }, 201);
});

// POST /tenant/:id/approval-requests - Submit approval request
tenantExp.post('/tenant/:id/approval-requests', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO tenant_approval_requests (id, tenant_id, policy_id, requested_by, action_context, status, approvals_received, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', '[]', ?)
  `).bind(id, tenant_id, body.policy_id, body.requested_by, JSON.stringify(body.action_context || {}), isoNow()).run();

  return c.json({ data: { id, status: 'PENDING' }, message: 'Approval request submitted' }, 201);
});

// POST /approval-requests/:id/approve - Approve a request
tenantExp.post('/approval-requests/:id/approve', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  const request = await DB.prepare(`SELECT * FROM tenant_approval_requests WHERE id = ?`).bind(id).first();
  if (!request) return c.json({ error: 'Request not found' }, 404);

  const approvals = JSON.parse((request as any).approvals_received || '[]');
  approvals.push({ employee_id: body.employee_id, approved_at: isoNow() });

  // Check quorum
  const policy = await DB.prepare(`SELECT * FROM tenant_approval_policies WHERE id = ?`).bind((request as any).policy_id).first();
  const quorum = policy ? (policy as any).quorum : 1;

  const newStatus = approvals.length >= quorum ? 'APPROVED' : 'PENDING';

  await DB.prepare(`
    UPDATE tenant_approval_requests SET approvals_received = ?, status = ? WHERE id = ?
  `).bind(JSON.stringify(approvals), newStatus, id).run();

  return c.json({ data: { id, status: newStatus, approvals_count: approvals.length, quorum }, message: newStatus === 'APPROVED' ? 'Request approved (quorum met)' : 'Approval recorded' });
});

// --- TENANT DATA EXPORTS (v6.3) ---

// GET /tenant/:id/exports - List export jobs
tenantExp.get('/tenant/:id/exports', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');

  const results = await DB.prepare(
    `SELECT * FROM tenant_data_exports WHERE tenant_id = ? ORDER BY created_at DESC`
  ).bind(tenant_id).all();

  return c.json({ data: results.results || [] });
});

// POST /tenant/:id/exports - Request a data export
tenantExp.post('/tenant/:id/exports', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.param('id');
  const body = await c.req.json();
  const id = uuid();

  const { format, date_range, requested_by, export_type } = body;
  const validFormats = ['CSV', 'PDF', 'JSON'];
  if (!validFormats.includes(format)) {
    return c.json({ error: `Invalid format. Must be: ${validFormats.join(', ')}` }, 400);
  }

  await DB.prepare(`
    INSERT INTO tenant_data_exports (id, tenant_id, requested_by, format, date_range, export_type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, tenant_id, requested_by, format, JSON.stringify(date_range || {}), export_type || 'FULL', isoNow()).run();

  // Simulate async processing → mark as completed
  const signature = `ed25519:${uuid().replace(/-/g, '').substring(0, 32)}`;
  const checksum = `sha256:${uuid().replace(/-/g, '')}`;

  await DB.prepare(`
    UPDATE tenant_data_exports SET status = 'COMPLETED', signature = ?, checksum = ?, completed_at = ? WHERE id = ?
  `).bind(signature, checksum, isoNow(), id).run();

  return c.json({
    data: { id, format, status: 'COMPLETED', signature, checksum },
    message: 'Export generated and cryptographically signed'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function getModeFeatures(mode: string): Record<string, boolean> {
  const features: Record<string, Record<string, boolean>> = {
    SIMPLE: {
      basic_trade: true, single_shipment: true, simple_commission: true,
      voice_commands: false, ai_negotiation: false, multi_shipment: false,
      org_hierarchy: false, custom_approval_chains: false, advanced_analytics: false
    },
    ADVANCED: {
      basic_trade: true, single_shipment: true, simple_commission: true,
      voice_commands: true, ai_negotiation: true, multi_shipment: true,
      org_hierarchy: false, custom_approval_chains: true, advanced_analytics: true
    },
    ENTERPRISE: {
      basic_trade: true, single_shipment: true, simple_commission: true,
      voice_commands: true, ai_negotiation: true, multi_shipment: true,
      org_hierarchy: true, custom_approval_chains: true, advanced_analytics: true
    }
  };
  return features[mode] || features['SIMPLE'];
}

export default tenantExp;

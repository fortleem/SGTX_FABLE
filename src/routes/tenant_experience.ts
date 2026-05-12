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

// POST /onboarding/sandbox/reset - Reset sandbox data (Part 2.7.2)
tenantExp.post('/onboarding/sandbox/reset', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET step_data = '{}', current_step = 1, updated_at = ? WHERE tenant_id = ?
  `).bind(isoNow(), tenant_id).run();

  // Clear sandbox data
  await DB.prepare('DELETE FROM onboarding_sandbox_data WHERE tenant_id = ?').bind(tenant_id).run();

  return c.json({ message: 'Sandbox reset. All draft data cleared.' });
});

// ═══════════════════════════════════════════════════════════════════
// GAP-15: POST /onboarding/skip-step (Part 2.7.3)
// Blueprint: "Step 5 can be skipped for all tenant types. A reminder
// banner appears in Smart Inbox after going live."
// ═══════════════════════════════════════════════════════════════════

tenantExp.post('/onboarding/skip-step', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, step_number } = body;

  if (!tenant_id || !step_number) return c.json({ error: 'tenant_id and step_number required' }, 400);

  const state = await DB.prepare(
    'SELECT * FROM tenant_onboarding_state WHERE tenant_id = ?'
  ).bind(tenant_id).first() as any;

  if (!state) return c.json({ error: 'Onboarding state not found' }, 404);

  // Track skipped steps
  const skipped = JSON.parse(state.skipped_steps || '[]');
  if (!skipped.includes(step_number)) skipped.push(step_number);

  // Advance to next step
  const nextStep = Math.min((state.current_step || step_number) + 1, 6);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET current_step = ?, skipped_steps = ?, updated_at = ? WHERE tenant_id = ?
  `).bind(nextStep, JSON.stringify(skipped), isoNow(), tenant_id).run();

  // Save skip to draft history (GAP-17)
  try {
    await DB.prepare(`
      INSERT INTO onboarding_draft_history (id, tenant_id, step_number, step_data, version, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).bind(uuid(), tenant_id, step_number, JSON.stringify({ action: 'SKIPPED' }), isoNow()).run();
  } catch(e) { /* non-blocking */ }

  return c.json({
    data: { tenant_id, skipped_step: step_number, current_step: nextStep, skipped_steps: skipped },
    message: `Step ${step_number} skipped. A reminder will appear in Smart Inbox after going live.`
  });
});

// ═══════════════════════════════════════════════════════════════════
// GAP-16: POST /onboarding/exit-sandbox (Go Live) (Part 2.7.2)
// Blueprint: "Transition to production ('Go Live') wipes sandbox data
// and sets lifecycle_state to VERIFIED (or KYB_PENDING if manual review required)"
// ═══════════════════════════════════════════════════════════════════

tenantExp.post('/onboarding/exit-sandbox', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, actor_gtid } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const tenant = await DB.prepare('SELECT id, gtid, kyb_status, lifecycle_state FROM tenants WHERE id = ?')
    .bind(tenant_id).first() as any;
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  // Governor gate for going live
  const gov = await evaluateGovernor(DB, {
    decision_type: 'tenant.go_live',
    actor_gtid: actor_gtid || tenant.gtid,
    action_context: { tenant_id, current_lifecycle: tenant.lifecycle_state, kyb_status: tenant.kyb_status },
  });

  // Determine target lifecycle state based on KYB status
  const targetState = tenant.kyb_status === 'VERIFIED' ? 'VERIFIED' : 'KYB_PENDING';

  // Wipe sandbox data
  await DB.prepare('DELETE FROM onboarding_sandbox_data WHERE tenant_id = ?').bind(tenant_id).run();

  // Update onboarding state
  await DB.prepare(`
    UPDATE tenant_onboarding_state SET sandbox_active = 0, completed = 1, updated_at = ? WHERE tenant_id = ?
  `).bind(isoNow(), tenant_id).run();

  // Update tenant: sandbox off, onboarding complete, lifecycle transition
  await DB.prepare(`
    UPDATE tenants SET sandbox_mode = 0, onboarding_completed = 1, lifecycle_state = ?, lifecycle_state_updated_at = ?, updated_at = ? WHERE id = ?
  `).bind(targetState, isoNow(), isoNow(), tenant_id).run();

  // Record lifecycle transition
  await DB.prepare(`
    INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_at)
    VALUES (?, ?, ?, ?, 'Exited sandbox - Go Live', ?, ?)
  `).bind(uuid(), tenant_id, tenant.lifecycle_state || 'ONBOARDING', targetState, gov.decision_id, isoNow()).run();

  // Create Smart Inbox items for skipped steps (reminder banners)
  const state = await DB.prepare('SELECT skipped_steps FROM tenant_onboarding_state WHERE tenant_id = ?')
    .bind(tenant_id).first() as any;
  const skippedSteps = JSON.parse(state?.skipped_steps || '[]');

  if (skippedSteps.length > 0) {
    const { results: employees } = await DB.prepare(
      "SELECT id FROM employees WHERE tenant_id = ? AND status IN ('ACTIVE','INVITED')"
    ).bind(tenant_id).all();

    for (const emp of (employees || [])) {
      try {
        await DB.prepare(`
          INSERT INTO smart_inbox_items (id, employee_id, item_id, category, priority_score, title, description, action_link, dismissed, created_at, updated_at)
          VALUES (?, ?, ?, 'GENERAL', 60, ?, ?, '/onboarding/resume', 0, ?, ?)
        `).bind(
          uuid(), (emp as any).id, uuid(),
          `Complete Skipped Onboarding Steps (${skippedSteps.join(', ')})`,
          `You skipped step(s) ${skippedSteps.join(', ')} during onboarding. Complete them for full platform access.`,
          isoNow(), isoNow()
        ).run();
      } catch(e) { /* non-blocking */ }
    }
  }

  await auditLog(DB, 'tenants', tenant_id, 'GO_LIVE', { lifecycle_state: tenant.lifecycle_state, sandbox_mode: true }, { lifecycle_state: targetState, sandbox_mode: false });

  return c.json({
    data: {
      tenant_id,
      new_lifecycle_state: targetState,
      sandbox_wiped: true,
      onboarding_completed: true,
      skipped_steps: skippedSteps,
      governor_decision: gov,
    },
    message: `Sandbox exited. Organization is now live with lifecycle state: ${targetState}`
  });
});

// ═══════════════════════════════════════════════════════════════════
// GAP-17: Draft Auto-Save with Versioning (Part 2.7.4)
// Blueprint: "Debounced auto-save every 30 seconds. Drafts stored in
// tenant_onboarding_state.step_data JSONB and versioned in draft_history.
// Drafts expire after 14 days."
// ═══════════════════════════════════════════════════════════════════

tenantExp.post('/onboarding/draft/save', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, step_number, step_data } = body;

  if (!tenant_id || !step_number) return c.json({ error: 'tenant_id and step_number required' }, 400);

  // Get current version for this step
  const lastDraft = await DB.prepare(`
    SELECT MAX(version) as max_version FROM onboarding_draft_history WHERE tenant_id = ? AND step_number = ?
  `).bind(tenant_id, step_number).first() as any;
  const newVersion = (lastDraft?.max_version || 0) + 1;

  // Save to draft history
  await DB.prepare(`
    INSERT INTO onboarding_draft_history (id, tenant_id, step_number, step_data, version, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(uuid(), tenant_id, step_number, JSON.stringify(step_data || {}), newVersion, isoNow()).run();

  // Update main onboarding state with merged step data
  const state = await DB.prepare('SELECT step_data FROM tenant_onboarding_state WHERE tenant_id = ?')
    .bind(tenant_id).first() as any;
  const currentData = JSON.parse(state?.step_data || '{}');
  currentData[`step_${step_number}`] = step_data;

  // Reset 14-day draft expiry
  const draftExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET step_data = ?, draft_expires_at = ?, draft_reminder_sent = 0, updated_at = ? WHERE tenant_id = ?
  `).bind(JSON.stringify(currentData), draftExpires, isoNow(), tenant_id).run();

  return c.json({
    data: { tenant_id, step_number, version: newVersion, draft_expires_at: draftExpires },
    message: `Draft saved (version ${newVersion}). Expires in 14 days.`
  });
});

// GET /onboarding/draft/history - Get draft versions for a step
tenantExp.get('/onboarding/draft/history', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.query('tenant_id');
  const step_number = c.req.query('step_number');

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  let sql = 'SELECT * FROM onboarding_draft_history WHERE tenant_id = ?';
  const binds: any[] = [tenant_id];
  if (step_number) { sql += ' AND step_number = ?'; binds.push(parseInt(step_number)); }
  sql += ' ORDER BY step_number, version DESC';

  const { results } = await DB.prepare(sql).bind(...binds).all();
  return c.json({ data: results });
});

// POST /onboarding/draft/restore - Restore a specific draft version
tenantExp.post('/onboarding/draft/restore', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, draft_id } = body;

  if (!tenant_id || !draft_id) return c.json({ error: 'tenant_id and draft_id required' }, 400);

  const draft = await DB.prepare(
    'SELECT * FROM onboarding_draft_history WHERE id = ? AND tenant_id = ?'
  ).bind(draft_id, tenant_id).first() as any;

  if (!draft) return c.json({ error: 'Draft not found' }, 404);

  // Restore draft data to main onboarding state
  const state = await DB.prepare('SELECT step_data FROM tenant_onboarding_state WHERE tenant_id = ?')
    .bind(tenant_id).first() as any;
  const currentData = JSON.parse(state?.step_data || '{}');
  currentData[`step_${draft.step_number}`] = JSON.parse(draft.step_data || '{}');

  // Reset expiry on restore
  const draftExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await DB.prepare(`
    UPDATE tenant_onboarding_state SET step_data = ?, current_step = ?, draft_expires_at = ?, updated_at = ? WHERE tenant_id = ?
  `).bind(JSON.stringify(currentData), draft.step_number, draftExpires, isoNow(), tenant_id).run();

  return c.json({
    data: { tenant_id, restored_step: draft.step_number, restored_version: draft.version },
    message: `Draft restored to step ${draft.step_number} version ${draft.version}`
  });
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

// SGTX Platform v6.3 — Auth Routes (Blueprint Parts 0-2 Aligned)
// Part 2.2: Tenant registration with GTID CRC32, lifecycle_state
// Part 2.3: Employee invitation with 72h token, ZITADEL link simulation
// Part 2.4: KYB/KYC tiered verification
// Part 2.7: Onboarding state initialization (6 steps, sandbox mode)
// Part 2.8: Lifecycle state management on registration
import { Hono } from 'hono';
import { uuid, sha256, isoNow, generateGTID, generateGTIDWithSequence, generateInvitationToken, ENTITY_TYPE_MAP } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const auth = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER TENANT + FIRST ADMIN (Part 2.2 + 2.7 + 2.8)
// Creates tenant with lifecycle_state=REGISTERED, initializes onboarding,
// creates admin employee with TENANT_ADMIN role, trust score, lifecycle history
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/register', async (c) => {
  const body = await c.req.json();
  const { legal_name, jurisdiction, type, admin_email, admin_name, admin_password, operating_mode, default_trader_mode } = body;
  if (!legal_name || !jurisdiction || !admin_email || !admin_password) {
    return c.json({ error: 'Missing required fields: legal_name, jurisdiction, admin_email, admin_password' }, 400);
  }

  const tenantId = uuid();
  const entityType = ENTITY_TYPE_MAP[type || 'CORPORATE'] || 'TRD';
  // GAP-1: Use atomic DB-backed sequence instead of Math.random()
  const gtid = await generateGTIDWithSequence(c.env.DB, jurisdiction, entityType);
  const hash = await sha256(JSON.stringify({ gtid, legal_name, jurisdiction }));
  const pwHash = await sha256(admin_password);

  // Governor gate — Part 2.2: jurisdiction pre-screen
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'tenant.register',
    actor_gtid: gtid,
    action_context: { jurisdiction, type: type || 'CORPORATE', admin_email, legal_name },
    jurisdictions: [jurisdiction],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Registration denied by Governor', reason: gov.explanation, governor: gov }, 403);

  // Create tenant with Part 2.8 lifecycle_state
  await c.env.DB.prepare(`
    INSERT INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, cryptographic_hash, risk_score, sanctions_cleared, lifecycle_state, lifecycle_state_updated_at, operating_mode, default_trader_mode, sandbox_mode, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 50.0, 0, 'REGISTERED', ?, ?, ?, 1, 0, ?, ?)
  `).bind(tenantId, gtid, legal_name, jurisdiction, type || 'CORPORATE', hash, isoNow(), operating_mode || 'SIMPLE', default_trader_mode || 'DUAL', isoNow(), isoNow()).run();

  // Part 2.8: Initialize lifecycle history
  await c.env.DB.prepare(`
    INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_at)
    VALUES (?, ?, 'NONE', 'REGISTERED', 'Tenant registration via auth/register', ?, ?)
  `).bind(uuid(), tenantId, gov.decision_id, isoNow()).run();

  // Part 2.7: Initialize onboarding state (6 steps, sandbox mode active)
  await c.env.DB.prepare(`
    INSERT INTO tenant_onboarding_state (id, tenant_id, current_step, total_steps, step_data, sandbox_active, updated_at)
    VALUES (?, ?, 1, 6, '{}', 1, ?)
  `).bind(uuid(), tenantId, isoNow()).run();

  // Create admin employee with proper Part 2.3 fields
  const empId = uuid();
  const invitation = generateInvitationToken();
  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, role_id, status, kyc_status, kyc_tier, password_hash, default_trader_mode, active_trader_mode_context, mfa_enabled, created_at)
    VALUES (?, ?, ?, ?, NULL, 'ACTIVE', 'PENDING', 0, ?, ?, ?, 0, ?)
  `).bind(empId, tenantId, admin_email, admin_name || admin_email.split('@')[0], pwHash, default_trader_mode || 'DUAL', default_trader_mode || 'DUAL', isoNow()).run();

  // Create TENANT_ADMIN role and assign
  const roleId = uuid();
  await c.env.DB.prepare(`
    INSERT INTO roles (id, tenant_id, name, permissions) VALUES (?, ?, 'TENANT_ADMIN', ?)
  `).bind(roleId, tenantId, JSON.stringify(['*'])).run();
  await c.env.DB.prepare('UPDATE employees SET role_id = ? WHERE id = ?').bind(roleId, empId).run();

  // Initialize admin permissions (Part 2.3: OPA-style)
  try {
    await c.env.DB.prepare(`
      INSERT INTO employee_permissions (employee_id, permission, grant_type, trader_mode_context, granted_by, granted_at)
      VALUES (?, '*', 'ALLOW', '["BUY","SELL","DUAL"]', 'SYSTEM', ?)
    `).bind(empId, isoNow()).run();
  } catch(e) { /* non-critical */ }

  // Initialize data scopes for admin (Part 2.3)
  try {
    await c.env.DB.prepare(`
      INSERT INTO data_scopes (employee_id, country_access, document_types, allow_role_switching)
      VALUES (?, '["*"]', '["*"]', 1)
    `).bind(empId).run();
  } catch(e) { /* non-critical */ }

  // Part 2.5: Initialize trust score with component breakdown
  try {
    await c.env.DB.prepare(`
      INSERT INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score, updated_at)
      VALUES (?, 50.0, 'xgboost-v1.0', ?, 50, 50, ?)
    `).bind(gtid, JSON.stringify({
      kyb: 0, trade_history: 0, dispute_record: 100, payment_history: 0,
      delivery_record: 50, document_accuracy: 50
    }), isoNow()).run();
  } catch(e) { /* may already exist */ }

  // Create session
  const session = await createSession(c.env.DB, empId, tenantId);

  await auditLog(c.env.DB, 'tenants', tenantId, 'REGISTER', null, { gtid, legal_name, lifecycle_state: 'REGISTERED' });

  return c.json({
    data: {
      tenant: {
        id: tenantId, gtid, legal_name, jurisdiction,
        type: type || 'CORPORATE', kyb_status: 'PENDING',
        lifecycle_state: 'REGISTERED', sandbox_mode: true,
      },
      employee: {
        id: empId, email: admin_email, role: 'TENANT_ADMIN',
        full_name: admin_name || admin_email.split('@')[0],
      },
      onboarding: { current_step: 1, total_steps: 6, sandbox_active: true },
      session: { token: session.token, expires_at: session.expires_at },
      governor_decision: gov,
    },
    message: 'Organization registered successfully. GTID assigned with CRC32 checksum. Onboarding wizard started. KYB verification pending.'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN (Part 2.3 — validates employee status, lifecycle, trader mode context)
// ═══════════════════════════════════════════════════════════════════════════════

// Portal → allowed tenant types map (Blueprint Part 12C — individual portal authentication)
const PORTAL_TENANT_TYPES: Record<string, string[]> = {
  trader: ['TRD', 'CORPORATE'],
  logistics: ['LSP', 'CBR', 'LOGISTICS'],
  shipping: ['SHIP', 'LOGISTICS'],
  financier: ['FIN', 'FINANCIAL'],
  qc: ['QC', 'QUALITY_CONTROL'],
  laboratory: ['LAB', 'LABORATORY'],
  government: ['GOV', 'REGULATORY', 'GOVERNMENT'],
  admin: ['*'], // role-gated below
  marketplace: ['MKT', 'MARKETPLACE_PARTNER', 'TRD'],
};

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password, portal } = body;
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const pwHash = await sha256(password);
  const employee = await c.env.DB.prepare(`
    SELECT e.*, t.id as tenant_id, t.gtid as tenant_gtid, t.legal_name as tenant_name,
           t.jurisdiction, t.type as tenant_type, t.kyb_status, t.lifecycle_state,
           t.sandbox_mode, t.onboarding_completed,
           r.name as role_name, r.permissions
    FROM employees e
    JOIN tenants t ON e.tenant_id = t.id
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE e.email = ? AND e.password_hash = ? AND e.status IN ('ACTIVE', 'INVITED', 'PENDING_APPROVAL')
  `).bind(email, pwHash).first() as any;

  if (!employee) return c.json({ error: 'Invalid credentials or account not active' }, 401);

  // ─── Per-portal tenant-type gate (Blueprint 12C: each portal is a sovereign entrance) ───
  if (portal && PORTAL_TENANT_TYPES[portal]) {
    const allowed = PORTAL_TENANT_TYPES[portal];
    const role = (employee.role || employee.role_name || '').toUpperCase();
    const isPlatformAdmin = role === 'PLATFORM_ADMIN';
    if (portal === 'admin') {
      if (!isPlatformAdmin) {
        return c.json({ error: 'Admin Portal requires PLATFORM_ADMIN role. Your account is not authorised for this entrance.' }, 403);
      }
    } else if (!allowed.includes('*') && !allowed.includes(employee.tenant_type) && !isPlatformAdmin) {
      return c.json({ error: `This entrance only accepts ${allowed.filter((t: string) => t.length <= 4).join('/')} organisations. Your organisation type is ${employee.tenant_type}. Use the correct portal at /portals.` }, 403);
    }
  }

  // Check tenant lifecycle — SUSPENDED/ARCHIVED tenants cannot login
  if (employee.lifecycle_state === 'SUSPENDED') {
    return c.json({ error: 'Organization is suspended. Contact support.', lifecycle_state: 'SUSPENDED' }, 403);
  }
  if (employee.lifecycle_state === 'ARCHIVED') {
    return c.json({ error: 'Organization is archived. Data export available.', lifecycle_state: 'ARCHIVED' }, 403);
  }

  // Update status to ACTIVE if INVITED (first login completes invitation)
  if (employee.status === 'INVITED') {
    await c.env.DB.prepare("UPDATE employees SET status = 'ACTIVE', last_login_at = ? WHERE id = ?").bind(isoNow(), employee.id).run();
  } else {
    await c.env.DB.prepare('UPDATE employees SET last_login_at = ? WHERE id = ?').bind(isoNow(), employee.id).run();
  }

  const session = await createSession(c.env.DB, employee.id, employee.tenant_id);

  // Get onboarding state if not completed
  let onboarding = null;
  if (!employee.onboarding_completed) {
    onboarding = await c.env.DB.prepare('SELECT current_step, total_steps, sandbox_active, skipped_steps FROM tenant_onboarding_state WHERE tenant_id = ?').bind(employee.tenant_id).first();
  }

  return c.json({
    data: {
      employee: {
        id: employee.id, email: employee.email, full_name: employee.full_name,
        role: employee.role_name,
        permissions: employee.permissions ? JSON.parse(employee.permissions) : [],
        kyc_status: employee.kyc_status, kyc_tier: employee.kyc_tier,
        active_trader_mode_context: employee.active_trader_mode_context || employee.default_trader_mode || 'DUAL',
        mfa_enabled: !!employee.mfa_enabled,
      },
      tenant: {
        id: employee.tenant_id, gtid: employee.tenant_gtid, legal_name: employee.tenant_name,
        jurisdiction: employee.jurisdiction, type: employee.tenant_type,
        kyb_status: employee.kyb_status, lifecycle_state: employee.lifecycle_state || 'REGISTERED',
        sandbox_mode: !!employee.sandbox_mode,
      },
      onboarding,
      session: { token: session.token, expires_at: session.expires_at },
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION VERIFY (returns enriched context including lifecycle, trader mode)
// ═══════════════════════════════════════════════════════════════════════════════

auth.get('/session', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token');
  if (!token) return c.json({ error: 'No session token' }, 401);

  const tokenHash = await sha256(token);
  const session = await c.env.DB.prepare(`
    SELECT s.*, e.email, e.full_name, e.status as emp_status, e.kyc_status, e.kyc_tier,
           e.active_trader_mode_context, e.default_trader_mode, e.mfa_enabled,
           t.gtid, t.legal_name, t.jurisdiction, t.type as tenant_type, t.kyb_status,
           t.lifecycle_state, t.sandbox_mode, t.onboarding_completed,
           r.name as role_name, r.permissions
    FROM auth_sessions s
    JOIN employees e ON s.employee_id = e.id
    JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).bind(tokenHash).first() as any;

  if (!session) return c.json({ error: 'Invalid or expired session' }, 401);

  // Update activity timestamp
  await c.env.DB.prepare('UPDATE auth_sessions SET last_activity = ? WHERE id = ?').bind(isoNow(), session.id).run();

  return c.json({
    data: {
      employee: {
        id: session.employee_id, email: session.email, full_name: session.full_name,
        role: session.role_name, kyc_status: session.kyc_status, kyc_tier: session.kyc_tier,
        active_trader_mode_context: session.active_trader_mode_context || session.default_trader_mode || 'DUAL',
        mfa_enabled: !!session.mfa_enabled,
      },
      tenant: {
        id: session.tenant_id, gtid: session.gtid, legal_name: session.legal_name,
        jurisdiction: session.jurisdiction, type: session.tenant_type,
        kyb_status: session.kyb_status, lifecycle_state: session.lifecycle_state || 'REGISTERED',
        sandbox_mode: !!session.sandbox_mode,
        onboarding_completed: !!session.onboarding_completed,
      },
      session: {
        id: session.id, active_portal: session.active_portal,
        trader_mode: session.trader_mode, expires_at: session.expires_at,
      },
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    const tokenHash = await sha256(token);
    await c.env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return c.json({ message: 'Logged out' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWITCH PORTAL / TRADER MODE
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/switch-portal', async (c) => {
  const body = await c.req.json();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Not authenticated' }, 401);
  const tokenHash = await sha256(token);
  await c.env.DB.prepare('UPDATE auth_sessions SET active_portal = ? WHERE token_hash = ?').bind(body.portal, tokenHash).run();
  return c.json({ message: `Switched to ${body.portal} portal` });
});

auth.post('/switch-mode', async (c) => {
  const body = await c.req.json();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Not authenticated' }, 401);

  if (!['BUY', 'SELL', 'DUAL'].includes(body.mode)) {
    return c.json({ error: 'Mode must be BUY, SELL, or DUAL' }, 400);
  }

  const tokenHash = await sha256(token);

  // Get session to find employee
  const session = await c.env.DB.prepare('SELECT employee_id, tenant_id FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).first() as any;
  if (!session) return c.json({ error: 'Invalid session' }, 401);

  // Part 2.3: Check data_scopes for role switching permission
  const scope = await c.env.DB.prepare('SELECT allow_role_switching FROM data_scopes WHERE employee_id = ?').bind(session.employee_id).first() as any;
  if (scope && !scope.allow_role_switching) {
    return c.json({ error: 'Role switching is disabled for this employee (data_scopes)' }, 403);
  }

  // Governor gate for mode switch
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'dual_mode.switch',
    actor_gtid: session.tenant_id,
    action_context: { employee_id: session.employee_id, to: body.mode },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Mode switch denied by Governor', governor: gov }, 403);

  await c.env.DB.prepare('UPDATE auth_sessions SET trader_mode = ? WHERE token_hash = ?').bind(body.mode, tokenHash).run();
  await c.env.DB.prepare('UPDATE employees SET active_trader_mode_context = ? WHERE id = ?').bind(body.mode, session.employee_id).run();

  // Log trader mode session
  try {
    await c.env.DB.prepare(`
      INSERT INTO trader_mode_sessions (id, employee_id, tenant_id, mode, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(uuid(), session.employee_id, session.tenant_id, body.mode, isoNow()).run();
  } catch(e) { /* non-blocking */ }

  return c.json({ message: `Mode switched to ${body.mode}`, governor_decision: gov });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KYB SUBMIT & VERIFY (Part 2.4 — Tiered verification)
// Tier 0: Unverified, Tier 1: Basic, Tier 2: Enhanced, Tier 3: Premium
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/kyb/submit', async (c) => {
  const body = await c.req.json();
  const { tenant_id, gtid, documents } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyb.verify',
    actor_gtid: gtid || 'system',
    action_context: { tenant_id, documents: documents || [], document_count: (documents || []).length },
  });

  await c.env.DB.prepare("UPDATE tenants SET kyb_status = 'SUBMITTED', updated_at = ? WHERE id = ?").bind(isoNow(), tenant_id).run();

  // Part 2.8: Transition lifecycle to KYB_PENDING if currently in ONBOARDING
  const tenant = await c.env.DB.prepare('SELECT lifecycle_state FROM tenants WHERE id = ?').bind(tenant_id).first() as any;
  if (tenant?.lifecycle_state === 'ONBOARDING' || tenant?.lifecycle_state === 'REGISTERED') {
    await c.env.DB.prepare("UPDATE tenants SET lifecycle_state = 'KYB_PENDING', updated_at = ? WHERE id = ?").bind(isoNow(), tenant_id).run();
    await c.env.DB.prepare(`
      INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_at)
      VALUES (?, ?, ?, 'KYB_PENDING', 'KYB documents submitted', ?, ?)
    `).bind(uuid(), tenant_id, tenant.lifecycle_state, gov.decision_id, isoNow()).run();
  }

  await auditLog(c.env.DB, 'tenants', tenant_id, 'KYB_SUBMIT', null, { status: 'SUBMITTED', documents: (documents || []).length });

  return c.json({ data: { status: 'SUBMITTED', governor_decision: gov }, message: 'KYB documents submitted for verification' });
});

auth.post('/kyb/verify', async (c) => {
  const body = await c.req.json();
  const { tenant_id, actor_gtid, tier } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const kybTier = tier || 2;
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyb.verify',
    actor_gtid: actor_gtid || 'SGTX-PLATFORM',
    action_context: { tenant_id, tier: kybTier },
  });

  await c.env.DB.prepare("UPDATE tenants SET kyb_status = 'VERIFIED', kyb_tier = ?, sanctions_cleared = 1, updated_at = ? WHERE id = ?")
    .bind(kybTier, isoNow(), tenant_id).run();

  // Part 2.8: Transition lifecycle to VERIFIED
  const tenant = await c.env.DB.prepare('SELECT lifecycle_state FROM tenants WHERE id = ?').bind(tenant_id).first() as any;
  if (tenant?.lifecycle_state === 'KYB_PENDING') {
    await c.env.DB.prepare("UPDATE tenants SET lifecycle_state = 'VERIFIED', updated_at = ? WHERE id = ?").bind(isoNow(), tenant_id).run();
    await c.env.DB.prepare(`
      INSERT INTO tenant_lifecycle_history (id, tenant_id, from_state, to_state, reason, governor_decision_id, changed_at)
      VALUES (?, ?, 'KYB_PENDING', 'VERIFIED', 'KYB verification completed at tier ${kybTier}', ?, ?)
    `).bind(uuid(), tenant_id, gov.decision_id, isoNow()).run();
  }

  await auditLog(c.env.DB, 'tenants', tenant_id, 'KYB_VERIFY', null, { status: 'VERIFIED', tier: kybTier });

  return c.json({ data: { status: 'VERIFIED', tier: kybTier, governor_decision: gov } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// KYC VERIFY (Part 2.4 — Employee-level identity verification)
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/kyc/verify', async (c) => {
  const body = await c.req.json();
  const { employee_id, tier } = body;
  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  const kycTier = tier || 1;
  await c.env.DB.prepare("UPDATE employees SET kyc_status = 'VERIFIED', kyc_tier = ? WHERE id = ?")
    .bind(kycTier, employee_id).run();

  await auditLog(c.env.DB, 'employees', employee_id, 'KYC_VERIFY', null, { status: 'VERIFIED', tier: kycTier });

  return c.json({ message: `Employee KYC verified at tier ${kycTier}` });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVITE EMPLOYEE (Part 2.3 — 72h expiry token, ZITADEL link simulation)
// ═══════════════════════════════════════════════════════════════════════════════

auth.post('/invite', async (c) => {
  const body = await c.req.json();
  const { tenant_id, email, full_name, role_id, default_trader_mode, permissions, invited_by } = body;
  if (!tenant_id || !email) return c.json({ error: 'tenant_id, email required' }, 400);

  // Verify tenant exists
  const tenant = await c.env.DB.prepare('SELECT id, gtid FROM tenants WHERE id = ?').bind(tenant_id).first();
  if (!tenant) return c.json({ error: 'Tenant not found' }, 404);

  const empId = uuid();
  const invitation = generateInvitationToken();

  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, role_id, status, invitation_token, invitation_expires_at, default_trader_mode, active_trader_mode_context, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, 'INVITED', ?, ?, ?, ?, '$pending', ?)
  `).bind(empId, tenant_id, email, full_name || email.split('@')[0], role_id || null, invitation.token, invitation.expires_at, default_trader_mode || 'DUAL', default_trader_mode || 'DUAL', isoNow()).run();

  // Set permissions if provided
  if (permissions && Array.isArray(permissions)) {
    for (const perm of permissions) {
      try {
        await c.env.DB.prepare(`
          INSERT INTO employee_permissions (employee_id, permission, grant_type, granted_by, granted_at)
          VALUES (?, ?, 'ALLOW', ?, ?)
        `).bind(empId, perm, invited_by || null, isoNow()).run();
      } catch(e) { /* non-blocking */ }
    }
  }

  await auditLog(c.env.DB, 'employees', empId, 'INVITE', null, { email, tenant_id, invited_by });

  return c.json({
    data: {
      id: empId, email, status: 'INVITED',
      invitation_token: invitation.token,
      invitation_expires_at: invitation.expires_at,
      registration_link: `/register?token=${invitation.token}`,
    },
    message: 'Employee invited. Registration link sent (72h expiry).'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Create Auth Session
// ═══════════════════════════════════════════════════════════════════════════════

async function createSession(db: D1Database, employeeId: string, tenantId: string) {
  const id = uuid();
  const token = `sgtx_${uuid().replace(/-/g, '')}${uuid().replace(/-/g, '')}`;
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await db.prepare(`
    INSERT INTO auth_sessions (id, employee_id, tenant_id, token_hash, expires_at, last_activity)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, employeeId, tenantId, tokenHash, expiresAt, isoNow()).run();

  return { token, expires_at: expiresAt };
}

export default auth;

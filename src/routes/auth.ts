// SGTX Platform v6.1 — Auth Routes (Registration, Login, Session, KYB/KYC)
import { Hono } from 'hono';
import { uuid, sha256, isoNow, generateGTID } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const auth = new Hono<{ Bindings: Bindings }>();

// ─── REGISTER TENANT + FIRST ADMIN ──────────────────────
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const { legal_name, jurisdiction, type, admin_email, admin_name, admin_password } = body;
  if (!legal_name || !jurisdiction || !admin_email || !admin_password) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const tenantId = uuid();
  const seq = Math.floor(Math.random() * 999999);
  const entityTypeMap: Record<string, string> = { CORPORATE: 'TRD', FINANCIAL: 'FIN', LOGISTICS: 'LOG', QUALITY_CONTROL: 'QC', REGULATORY: 'REG', GOVERNMENT: 'GOV' };
  const gtid = generateGTID(jurisdiction, entityTypeMap[type || 'CORPORATE'] || 'TRD', seq);
  const hash = await sha256(JSON.stringify({ gtid, legal_name, jurisdiction }));
  const pwHash = await sha256(admin_password);

  // Governor gate
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'tenant.register',
    actor_gtid: gtid,
    action_context: { jurisdiction, type: type || 'CORPORATE', admin_email },
    jurisdictions: [jurisdiction],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Registration denied by Governor', reason: gov.explanation }, 403);

  // Create tenant
  await c.env.DB.prepare(`
    INSERT INTO tenants (id, gtid, legal_name, jurisdiction, type, kyb_status, cryptographic_hash, risk_score, sanctions_cleared)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 50.0, 0)
  `).bind(tenantId, gtid, legal_name, jurisdiction, type || 'CORPORATE', hash).run();

  // Create admin employee
  const empId = uuid();
  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, status, kyc_status, password_hash)
    VALUES (?, ?, ?, ?, 'ACTIVE', 'PENDING', ?)
  `).bind(empId, tenantId, admin_email, admin_name || admin_email.split('@')[0], pwHash).run();

  // Create admin role
  const roleId = uuid();
  await c.env.DB.prepare(`
    INSERT INTO roles (id, tenant_id, name, permissions)
    VALUES (?, ?, 'TENANT_ADMIN', ?)
  `).bind(roleId, tenantId, JSON.stringify(['*'])).run();

  await c.env.DB.prepare('UPDATE employees SET role_id = ? WHERE id = ?').bind(roleId, empId).run();

  // Init trust score
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO trust_scores (gtid, score, model_version, components, buy_mode_score, sell_mode_score)
    VALUES (?, 50, 'xgboost-v1.0', ?, 50, 50)
  `).bind(gtid, JSON.stringify({ payment_history: 50, delivery_record: 50, dispute_rate: 50, document_accuracy: 50 })).run();

  // Create session
  const session = await createSession(c.env.DB, empId, tenantId);

  await auditLog(c.env.DB, 'tenants', tenantId, 'REGISTER', null, { gtid, legal_name });
  return c.json({
    data: {
      tenant: { id: tenantId, gtid, legal_name, jurisdiction, type: type || 'CORPORATE', kyb_status: 'PENDING' },
      employee: { id: empId, email: admin_email, role: 'TENANT_ADMIN' },
      session: { token: session.token, expires_at: session.expires_at },
      governor_decision: gov,
    },
    message: 'Organization registered successfully. KYB verification pending.'
  }, 201);
});

// ─── LOGIN ───────────────────────────────────────────────
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const pwHash = await sha256(password);
  const employee = await c.env.DB.prepare(`
    SELECT e.*, t.id as tenant_id, t.gtid as tenant_gtid, t.legal_name as tenant_name,
           t.jurisdiction, t.type as tenant_type, t.kyb_status, r.name as role_name, r.permissions
    FROM employees e
    JOIN tenants t ON e.tenant_id = t.id
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE e.email = ? AND e.password_hash = ? AND e.status IN ('ACTIVE', 'INVITED')
  `).bind(email, pwHash).first();

  if (!employee) return c.json({ error: 'Invalid credentials' }, 401);

  // Update status to ACTIVE if INVITED
  if (employee.status === 'INVITED') {
    await c.env.DB.prepare("UPDATE employees SET status = 'ACTIVE' WHERE id = ?").bind(employee.id).run();
  }

  // Update last login
  await c.env.DB.prepare('UPDATE employees SET last_login_at = ? WHERE id = ?').bind(isoNow(), employee.id).run();

  const session = await createSession(c.env.DB, employee.id as string, employee.tenant_id as string);

  return c.json({
    data: {
      employee: {
        id: employee.id, email: employee.email, full_name: employee.full_name,
        role: employee.role_name, permissions: employee.permissions ? JSON.parse(employee.permissions as string) : [],
      },
      tenant: {
        id: employee.tenant_id, gtid: employee.tenant_gtid, legal_name: employee.tenant_name,
        jurisdiction: employee.jurisdiction, type: employee.tenant_type, kyb_status: employee.kyb_status,
      },
      session: { token: session.token, expires_at: session.expires_at },
    }
  });
});

// ─── SESSION VERIFY ──────────────────────────────────────
auth.get('/session', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.query('token');
  if (!token) return c.json({ error: 'No session token' }, 401);

  const tokenHash = await sha256(token);
  const session = await c.env.DB.prepare(`
    SELECT s.*, e.email, e.full_name, e.status as emp_status, e.kyc_status,
           t.gtid, t.legal_name, t.jurisdiction, t.type as tenant_type, t.kyb_status,
           r.name as role_name, r.permissions
    FROM auth_sessions s
    JOIN employees e ON s.employee_id = e.id
    JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).bind(tokenHash).first();

  if (!session) return c.json({ error: 'Invalid or expired session' }, 401);

  // Update activity
  await c.env.DB.prepare('UPDATE auth_sessions SET last_activity = ? WHERE id = ?').bind(isoNow(), session.id).run();

  return c.json({
    data: {
      employee: { id: session.employee_id, email: session.email, full_name: session.full_name, role: session.role_name, kyc_status: session.kyc_status },
      tenant: { id: session.tenant_id, gtid: session.gtid, legal_name: session.legal_name, jurisdiction: session.jurisdiction, type: session.tenant_type, kyb_status: session.kyb_status },
      session: { id: session.id, active_portal: session.active_portal, trader_mode: session.trader_mode, expires_at: session.expires_at },
    }
  });
});

// ─── LOGOUT ──────────────────────────────────────────────
auth.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    const tokenHash = await sha256(token);
    await c.env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return c.json({ message: 'Logged out' });
});

// ─── SWITCH PORTAL ───────────────────────────────────────
auth.post('/switch-portal', async (c) => {
  const body = await c.req.json();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Not authenticated' }, 401);
  const tokenHash = await sha256(token);
  await c.env.DB.prepare('UPDATE auth_sessions SET active_portal = ? WHERE token_hash = ?').bind(body.portal, tokenHash).run();
  return c.json({ message: `Switched to ${body.portal} portal` });
});

// ─── SWITCH TRADER MODE (BUY/SELL/DUAL) ─────────────────
auth.post('/switch-mode', async (c) => {
  const body = await c.req.json();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Not authenticated' }, 401);
  const tokenHash = await sha256(token);
  await c.env.DB.prepare('UPDATE auth_sessions SET trader_mode = ? WHERE token_hash = ?').bind(body.mode, tokenHash).run();
  return c.json({ message: `Mode switched to ${body.mode}` });
});

// ─── KYB SUBMIT ──────────────────────────────────────────
auth.post('/kyb/submit', async (c) => {
  const body = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyb.verify',
    actor_gtid: body.gtid || 'system',
    action_context: { tenant_id: body.tenant_id, documents: body.documents || [] },
  });

  await c.env.DB.prepare("UPDATE tenants SET kyb_status = 'SUBMITTED', updated_at = ? WHERE id = ?").bind(isoNow(), body.tenant_id).run();
  return c.json({ data: { status: 'SUBMITTED', governor_decision: gov }, message: 'KYB documents submitted for verification' });
});

// ─── KYB VERIFY (Admin) ─────────────────────────────────
auth.post('/kyb/verify', async (c) => {
  const body = await c.req.json();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyb.verify',
    actor_gtid: body.actor_gtid || 'SGTX-PLATFORM',
    action_context: { tenant_id: body.tenant_id, tier: body.tier || 2 },
  });

  await c.env.DB.prepare("UPDATE tenants SET kyb_status = 'VERIFIED', kyb_tier = ?, sanctions_cleared = 1, updated_at = ? WHERE id = ?")
    .bind(body.tier || 2, isoNow(), body.tenant_id).run();
  return c.json({ data: { status: 'VERIFIED', tier: body.tier || 2, governor_decision: gov } });
});

// ─── KYC VERIFY (Employee) ──────────────────────────────
auth.post('/kyc/verify', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare("UPDATE employees SET kyc_status = 'VERIFIED', kyc_tier = ? WHERE id = ?")
    .bind(body.tier || 1, body.employee_id).run();
  return c.json({ message: 'Employee KYC verified' });
});

// ─── INVITE EMPLOYEE ─────────────────────────────────────
auth.post('/invite', async (c) => {
  const body = await c.req.json();
  const empId = uuid();
  const tempPw = await sha256(body.temp_password || 'Welcome1!');
  await c.env.DB.prepare(`
    INSERT INTO employees (id, tenant_id, email, full_name, role_id, status, password_hash)
    VALUES (?, ?, ?, ?, ?, 'INVITED', ?)
  `).bind(empId, body.tenant_id, body.email, body.full_name, body.role_id || null, tempPw).run();
  return c.json({ data: { id: empId, email: body.email }, message: 'Employee invited' }, 201);
});

// Helper: create auth session
async function createSession(db: D1Database, employeeId: string, tenantId: string) {
  const id = uuid();
  const token = `sgtx_${uuid().replace(/-/g, '')}${uuid().replace(/-/g, '')}`;
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await db.prepare(`
    INSERT INTO auth_sessions (id, employee_id, tenant_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, employeeId, tenantId, tokenHash, expiresAt).run();

  return { token, expires_at: expiresAt };
}

export default auth;

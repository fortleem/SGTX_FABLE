import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';

type Bindings = { DB: D1Database };
const recovery = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW RECOVERY SERVICE - Part 4.3 & 3.6 of SGTX Blueprint v6.3
// Stuck trade detection, escalation, auto-cancellation, draft states
// ═══════════════════════════════════════════════════════════════════

// GET /stuck-trades - List stuck trades with SLA violations
recovery.get('/stuck-trades', async (c) => {
  const { DB } = c.env;
  const status = c.req.query('status');
  const tenant_id = c.req.query('tenant_id');

  let sql = `SELECT * FROM stuck_trade_recovery WHERE 1=1`;
  const params: any[] = [];

  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (tenant_id) { sql += ` AND tenant_id = ?`; params.push(tenant_id); }
  sql += ` ORDER BY escalation_level DESC, detected_at DESC LIMIT 50`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// POST /stuck-trades/detect - Run stuck trade detection (SLA timer check)
recovery.post('/stuck-trades/detect', async (c) => {
  const { DB } = c.env;

  // SLA definitions from blueprint (Part 3.6)
  const slaRules = [
    { status: 'PENDING_EXPORTER_RESPONSE', max_days: 7, reminder_days: 4 },
    { status: 'QUOTED', max_days: 5, reminder_days: 3 },
    { status: 'NEGOTIATING', max_days: 14, reminder_days: 10 },
    { status: 'DRAFT', max_days: 30, reminder_days: 21 },
  ];

  const detected: any[] = [];

  for (const rule of slaRules) {
    const cutoff = new Date(Date.now() - rule.reminder_days * 24 * 60 * 60 * 1000).toISOString();

    const stuckTrades = await DB.prepare(`
      SELECT id, importer_tenant_id, status, created_at, updated_at 
      FROM trade_requests 
      WHERE status = ? AND updated_at < ?
    `).bind(rule.status, cutoff).all();

    for (const trade of (stuckTrades.results || [])) {
      const t = trade as any;
      const daysStuck = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      const escalationLevel = daysStuck >= rule.max_days ? 3 : daysStuck >= rule.reminder_days ? 2 : 1;

      // Check if already tracked
      const existing = await DB.prepare(
        `SELECT id FROM stuck_trade_recovery WHERE trade_request_id = ? AND status != 'RESOLVED'`
      ).bind(t.id).first();

      if (!existing) {
        const id = uuid();
        await DB.prepare(`
          INSERT INTO stuck_trade_recovery (id, trade_request_id, tenant_id, stuck_status, days_stuck, escalation_level, sla_deadline, status, detected_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        `).bind(
          id, t.id, t.importer_tenant_id, t.status, daysStuck, escalationLevel,
          new Date(new Date(t.updated_at).getTime() + rule.max_days * 24 * 60 * 60 * 1000).toISOString(),
          isoNow()
        ).run();

        detected.push({ id, trade_id: t.id, status: t.status, days_stuck: daysStuck, escalation_level: escalationLevel });
      }
    }
  }

  return c.json({
    data: { detected_count: detected.length, items: detected },
    message: `Detected ${detected.length} stuck trade(s)`
  });
});

// POST /stuck-trades/:id/escalate - Escalate a stuck trade
recovery.post('/stuck-trades/:id/escalate', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  const record = await DB.prepare(`SELECT * FROM stuck_trade_recovery WHERE id = ?`).bind(id).first();
  if (!record) return c.json({ error: 'Stuck trade record not found' }, 404);

  const newLevel = Math.min(((record as any).escalation_level || 1) + 1, 3);

  await DB.prepare(`
    UPDATE stuck_trade_recovery SET escalation_level = ?, last_reminder_at = ?, status = ? WHERE id = ?
  `).bind(newLevel, isoNow(), newLevel >= 3 ? 'CANCELLATION_PENDING' : 'ACTIVE', id).run();

  // Create governor decision for cancellation if level 3
  if (newLevel >= 3) {
    const governor = await evaluateGovernor(DB, {
      decision_type: 'trade.auto_cancel',
      actor_gtid: 'SYSTEM-RECOVERY',
      context: { trade_request_id: (record as any).trade_request_id, reason: 'SLA exceeded' }
    });
  }

  return c.json({
    data: { id, escalation_level: newLevel, status: newLevel >= 3 ? 'CANCELLATION_PENDING' : 'ACTIVE' },
    message: newLevel >= 3 ? 'Trade escalated to auto-cancellation pending' : `Escalated to level ${newLevel}`
  });
});

// POST /stuck-trades/:id/cancel - Auto-cancel a stuck trade (Governor-gated)
recovery.post('/stuck-trades/:id/cancel', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  const record = await DB.prepare(`SELECT * FROM stuck_trade_recovery WHERE id = ?`).bind(id).first();
  if (!record) return c.json({ error: 'Stuck trade record not found' }, 404);

  const governor = await evaluateGovernor(DB, {
    decision_type: 'trade.auto_cancel.execute',
    actor_gtid: 'SYSTEM-RECOVERY',
    context: { trade_request_id: (record as any).trade_request_id }
  });

  // Cancel the trade request
  await DB.prepare(
    `UPDATE trade_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?`
  ).bind(isoNow(), (record as any).trade_request_id).run();

  // Mark recovery record as resolved
  await DB.prepare(
    `UPDATE stuck_trade_recovery SET status = 'RESOLVED', resolved_at = ? WHERE id = ?`
  ).bind(isoNow(), id).run();

  return c.json({
    data: { id, status: 'RESOLVED', trade_cancelled: true },
    governor_decision: governor,
    message: 'Trade auto-cancelled due to SLA violation'
  });
});

// POST /stuck-trades/:id/resolve - Manually resolve (trade resumed)
recovery.post('/stuck-trades/:id/resolve', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  await DB.prepare(
    `UPDATE stuck_trade_recovery SET status = 'RESOLVED', resolved_at = ?, resolution_notes = ? WHERE id = ?`
  ).bind(isoNow(), body.notes || 'Manually resolved', id).run();

  return c.json({ message: 'Stuck trade resolved manually' });
});

// GET /stuck-trades/stats - Recovery statistics
recovery.get('/stuck-trades/stats', async (c) => {
  const { DB } = c.env;

  const stats = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'CANCELLATION_PENDING' THEN 1 ELSE 0 END) as pending_cancellation,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
      AVG(days_stuck) as avg_days_stuck,
      MAX(escalation_level) as max_escalation
    FROM stuck_trade_recovery
  `).first();

  return c.json({ data: stats });
});

// ═══════════════════════════════════════════════════════════════════
// DRAFT STATE MANAGEMENT (Part 3.6)
// ═══════════════════════════════════════════════════════════════════

// POST /trades/:id/save-draft - Auto-save trade draft
recovery.post('/trades/:id/save-draft', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await DB.prepare(`
    UPDATE trade_requests SET draft_data = ?, draft_expires_at = ?, updated_at = ? WHERE id = ?
  `).bind(JSON.stringify(body.draft_data || {}), expiresAt, isoNow(), id).run();

  return c.json({ message: 'Draft saved', expires_at: expiresAt });
});

// GET /trades/:id/draft - Get saved draft
recovery.get('/trades/:id/draft', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  const trade = await DB.prepare(
    `SELECT id, draft_data, draft_expires_at FROM trade_requests WHERE id = ?`
  ).bind(id).first();

  if (!trade) return c.json({ error: 'Trade not found' }, 404);

  return c.json({
    data: {
      id,
      draft_data: JSON.parse((trade as any).draft_data || '{}'),
      expires_at: (trade as any).draft_expires_at,
      expired: (trade as any).draft_expires_at ? new Date((trade as any).draft_expires_at) < new Date() : false
    }
  });
});

export default recovery;

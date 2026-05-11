import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';

type Bindings = { DB: D1Database };
const inbox = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// SMART INBOX - Part 6.1.1 of SGTX Blueprint v6.3
// Action-driven, trade-centric, role-adaptive inbox system
// ═══════════════════════════════════════════════════════════════════

// GET /inbox - List active inbox items for authenticated user
inbox.get('/inbox', async (c) => {
  const { DB } = c.env;
  const employee_id = c.req.query('employee_id');
  const min_score = c.req.query('min_score') || '0';
  const categories = c.req.query('categories');

  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  let sql = `SELECT * FROM smart_inbox_items WHERE employee_id = ? AND dismissed = 0 AND (snoozed_until IS NULL OR snoozed_until < ?)`;
  const params: any[] = [employee_id, isoNow()];

  if (parseInt(min_score) > 0) {
    sql += ` AND priority_score >= ?`;
    params.push(parseInt(min_score));
  }
  if (categories) {
    const cats = categories.split(',');
    sql += ` AND category IN (${cats.map(() => '?').join(',')})`;
    params.push(...cats);
  }

  sql += ` ORDER BY priority_score DESC, created_at DESC LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();

  // Group by priority
  const items = results.results || [];
  const high = items.filter((i: any) => i.priority_score >= 80);
  const medium = items.filter((i: any) => i.priority_score >= 50 && i.priority_score < 80);
  const low = items.filter((i: any) => i.priority_score < 50);

  return c.json({
    data: {
      total: items.length,
      high_priority: { count: high.length, items: high },
      medium_priority: { count: medium.length, items: medium },
      low_priority: { count: low.length, items: low },
      ai_summary: generateAISummary(high.length, medium.length, low.length)
    }
  });
});

// GET /inbox/history - Last 200 items including dismissed/snoozed
inbox.get('/inbox/history', async (c) => {
  const { DB } = c.env;
  const employee_id = c.req.query('employee_id');
  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  const results = await DB.prepare(
    `SELECT * FROM inbox_history WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 200`
  ).bind(employee_id).all();

  return c.json({ data: results.results || [] });
});

// POST /inbox - Create a new inbox item (system-triggered)
inbox.post('/inbox', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();
  const item_id = uuid();

  const {
    employee_id, ustn, category, priority_score,
    title, description, deadline, action_link
  } = body;

  if (!employee_id || !category || !title || !action_link) {
    return c.json({ error: 'employee_id, category, title, action_link required' }, 400);
  }

  // Validate category
  const validCategories = [
    'NEEDS_SIGNATURE', 'NEEDS_APPROVAL', 'NEEDS_DOCUMENT', 'NEEDS_PAYMENT',
    'SHIPMENT_ALERT', 'NEW_OFFER', 'NEGOTIATION', 'COMPLIANCE', 'GENERAL'
  ];
  if (!validCategories.includes(category)) {
    return c.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, 400);
  }

  // Compute urgency score based on blueprint rules (deterministic A4)
  const finalScore = priority_score || computeUrgencyScore(category, deadline);

  await DB.prepare(`
    INSERT INTO smart_inbox_items (id, employee_id, item_id, ustn, category, priority_score, title, description, deadline, action_link, dismissed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    id, employee_id, item_id, ustn || null, category, finalScore,
    title, description || null, deadline || null, action_link, isoNow(), isoNow()
  ).run();

  return c.json({
    data: { id, item_id, category, priority_score: finalScore, title, action_link },
    message: 'Inbox item created'
  }, 201);
});

// POST /inbox/:item_id/snooze - Snooze an item
inbox.post('/inbox/:item_id/snooze', async (c) => {
  const { DB } = c.env;
  const item_id = c.req.param('item_id');
  const body = await c.req.json();
  const duration_minutes = body.duration_minutes || 120;

  const snoozeUntil = new Date(Date.now() + duration_minutes * 60000).toISOString();

  await DB.prepare(
    `UPDATE smart_inbox_items SET snoozed_until = ?, updated_at = ? WHERE id = ? OR item_id = ?`
  ).bind(snoozeUntil, isoNow(), item_id, item_id).run();

  // Log to inbox_history
  await DB.prepare(
    `INSERT INTO inbox_history (id, employee_id, item_id, action_taken, timestamp) VALUES (?, (SELECT employee_id FROM smart_inbox_items WHERE id = ? OR item_id = ? LIMIT 1), ?, 'SNOOZED', ?)`
  ).bind(uuid(), item_id, item_id, item_id, isoNow()).run();

  return c.json({ message: 'Item snoozed', snoozed_until: snoozeUntil });
});

// POST /inbox/:item_id/dismiss - Permanently dismiss an item
inbox.post('/inbox/:item_id/dismiss', async (c) => {
  const { DB } = c.env;
  const item_id = c.req.param('item_id');

  await DB.prepare(
    `UPDATE smart_inbox_items SET dismissed = 1, updated_at = ? WHERE id = ? OR item_id = ?`
  ).bind(isoNow(), item_id, item_id).run();

  // Log to inbox_history
  await DB.prepare(
    `INSERT INTO inbox_history (id, employee_id, item_id, action_taken, timestamp) VALUES (?, (SELECT employee_id FROM smart_inbox_items WHERE id = ? OR item_id = ? LIMIT 1), ?, 'DISMISSED', ?)`
  ).bind(uuid(), item_id, item_id, item_id, isoNow()).run();

  return c.json({ message: 'Item dismissed' });
});

// POST /inbox/:item_id/action - Record action taken on item
inbox.post('/inbox/:item_id/action', async (c) => {
  const { DB } = c.env;
  const item_id = c.req.param('item_id');
  const body = await c.req.json();

  // Log to inbox_history
  await DB.prepare(
    `INSERT INTO inbox_history (id, employee_id, item_id, ustn, action_taken, timestamp) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(uuid(), body.employee_id, item_id, body.ustn || null, body.action || 'COMPLETED', isoNow()).run();

  // Mark item as dismissed after action
  await DB.prepare(
    `UPDATE smart_inbox_items SET dismissed = 1, updated_at = ? WHERE id = ? OR item_id = ?`
  ).bind(isoNow(), item_id, item_id).run();

  return c.json({ message: 'Action recorded', action: body.action || 'COMPLETED' });
});

// GET /inbox/preferences - Get user inbox preferences
inbox.get('/inbox/preferences', async (c) => {
  const { DB } = c.env;
  const employee_id = c.req.query('employee_id');
  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  const prefs = await DB.prepare(
    `SELECT * FROM inbox_preferences WHERE employee_id = ?`
  ).bind(employee_id).first();

  if (!prefs) {
    return c.json({ data: { employee_id, min_score: 30, muted_categories: [], preferred_language: 'en' } });
  }
  return c.json({ data: { ...prefs, muted_categories: JSON.parse((prefs as any).muted_categories || '[]') } });
});

// POST /inbox/preferences - Update user inbox preferences
inbox.post('/inbox/preferences', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { employee_id, min_score, muted_categories, preferred_language } = body;

  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  await DB.prepare(`
    INSERT INTO inbox_preferences (employee_id, min_score, muted_categories, preferred_language)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(employee_id) DO UPDATE SET
      min_score = excluded.min_score,
      muted_categories = excluded.muted_categories,
      preferred_language = excluded.preferred_language
  `).bind(
    employee_id,
    min_score || 30,
    JSON.stringify(muted_categories || []),
    preferred_language || 'en'
  ).run();

  return c.json({ message: 'Preferences updated' });
});

// GET /inbox/stats - Inbox statistics
inbox.get('/inbox/stats', async (c) => {
  const { DB } = c.env;
  const employee_id = c.req.query('employee_id');
  if (!employee_id) return c.json({ error: 'employee_id required' }, 400);

  const stats = await DB.prepare(`
    SELECT 
      COUNT(*) as total_items,
      SUM(CASE WHEN priority_score >= 80 THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN priority_score >= 50 AND priority_score < 80 THEN 1 ELSE 0 END) as medium_priority,
      SUM(CASE WHEN priority_score < 50 THEN 1 ELSE 0 END) as low_priority,
      SUM(CASE WHEN dismissed = 1 THEN 1 ELSE 0 END) as dismissed,
      SUM(CASE WHEN snoozed_until IS NOT NULL AND snoozed_until > ? THEN 1 ELSE 0 END) as snoozed
    FROM smart_inbox_items WHERE employee_id = ?
  `).bind(isoNow(), employee_id).first();

  return c.json({ data: stats });
});

// ═══════════════════════════════════════════════════════════════════
// TRADE COMMAND CENTER - Part 6.1.2 of SGTX Blueprint v6.3
// Unified aggregation endpoint per USTN
// ═══════════════════════════════════════════════════════════════════

// GET /trade/:ustn/command-center - Aggregated trade view
inbox.get('/trade/:ustn/command-center', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');

  // Aggregate from multiple tables
  const shipment = await DB.prepare(
    `SELECT * FROM shipments WHERE ustn = ?`
  ).bind(ustn).first();

  const contract = shipment ? await DB.prepare(
    `SELECT * FROM contracts WHERE id = ?`
  ).bind((shipment as any)?.contract_id).first() : null;

  const tradeRequest = contract ? await DB.prepare(
    `SELECT * FROM trade_requests WHERE id = ?`
  ).bind((contract as any)?.trade_request_id).first() : null;

  const milestones = await DB.prepare(
    `SELECT * FROM shipment_milestones WHERE shipment_ustn = ? ORDER BY confirmed_at DESC`
  ).bind(ustn).all();

  const documents = await DB.prepare(
    `SELECT * FROM documents WHERE shipment_ustn = ?`
  ).bind(ustn).all();

  const commissionLock = contract ? await DB.prepare(
    `SELECT * FROM commission_locks WHERE contract_id = ?`
  ).bind((contract as any)?.id).first() : null;

  const timeline = await DB.prepare(
    `SELECT * FROM trade_event_timeline WHERE ustn = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(ustn).all();

  const disputes = tradeRequest ? await DB.prepare(
    `SELECT * FROM disputes WHERE trade_request_id = ?`
  ).bind((tradeRequest as any)?.id).all() : { results: [] };

  return c.json({
    data: {
      ustn,
      shipment: shipment || null,
      contract: contract || null,
      trade_request: tradeRequest || null,
      milestones: milestones.results || [],
      documents: documents.results || [],
      commission_lock: commissionLock || null,
      timeline: timeline.results || [],
      disputes: disputes.results || [],
      summary: {
        current_phase: shipment ? getPhaseFromStatus((shipment as any).status) : 'UNKNOWN',
        document_readiness: calculateDocReadiness(documents.results || []),
        milestone_count: (milestones.results || []).length
      }
    }
  });
});

// POST /trade/:ustn/timeline - Add event to trade timeline
inbox.post('/trade/:ustn/timeline', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const body = await c.req.json();
  const id = uuid();

  await DB.prepare(`
    INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, actor_gtid, phase, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ustn, body.event_type || 'SYSTEM', body.event_text, JSON.stringify(body.event_data || {}), body.actor_gtid || null, body.phase || null, isoNow()).run();

  return c.json({ data: { id, ustn, event_text: body.event_text }, message: 'Timeline event added' }, 201);
});

// GET /trade/:ustn/timeline - Get trade event timeline
inbox.get('/trade/:ustn/timeline', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const phase = c.req.query('phase');

  let sql = `SELECT * FROM trade_event_timeline WHERE ustn = ?`;
  const params: any[] = [ustn];

  if (phase) {
    sql += ` AND phase = ?`;
    params.push(phase);
  }
  sql += ` ORDER BY created_at DESC LIMIT 100`;

  const results = await DB.prepare(sql).bind(...params).all();
  return c.json({ data: results.results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function computeUrgencyScore(category: string, deadline: string | null): number {
  let base = 50;
  
  // Category-based baseline from blueprint scoring table
  switch (category) {
    case 'NEEDS_SIGNATURE': base = 95; break;
    case 'NEEDS_PAYMENT': base = 80; break;
    case 'NEEDS_DOCUMENT': base = 85; break;
    case 'NEEDS_APPROVAL': base = 90; break;
    case 'SHIPMENT_ALERT': base = 65; break;
    case 'NEW_OFFER': base = 75; break;
    case 'NEGOTIATION': base = 70; break;
    case 'COMPLIANCE': base = 80; break;
    case 'GENERAL': base = 30; break;
  }

  // Deadline proximity adjustment
  if (deadline) {
    const hoursUntilDeadline = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeadline < 2) base = Math.min(100, base + 5);
    else if (hoursUntilDeadline < 24) base = Math.min(100, base + 2);
  }

  return Math.min(100, base);
}

function generateAISummary(high: number, medium: number, low: number): string {
  if (high === 0 && medium === 0 && low === 0) {
    return "No pending items. All trades are progressing normally.";
  }
  if (high > 0) {
    return `You have ${high} high-priority item${high > 1 ? 's' : ''} requiring immediate attention. ${medium > 0 ? `${medium} medium-priority items also need your review.` : ''} Focus on the top items first to keep your trades moving.`;
  }
  return `You have ${medium} medium-priority and ${low} low-priority items. No urgent actions required right now.`;
}

function getPhaseFromStatus(status: string): string {
  const phaseMap: Record<string, string> = {
    'CREATED': 'Phase 5 - Execution Started',
    'GATED_IN': 'Phase 5 - Gate In',
    'LOADED': 'Phase 5 - Loading',
    'DEPARTED': 'Phase 5 - In Transit',
    'IN_TRANSIT': 'Phase 5 - In Transit',
    'ARRIVED': 'Phase 5 - Arrival',
    'CUSTOMS_IMPORT': 'Phase 5 - Customs',
    'DELIVERED': 'Phase 6 - Settlement',
    'DISPUTED': 'Phase 10 - Dispute',
    'DISTRESSED': 'Phase 7 - Distressed'
  };
  return phaseMap[status] || 'Unknown Phase';
}

function calculateDocReadiness(docs: any[]): { status: string; verified: number; total: number } {
  const total = docs.length;
  const verified = docs.filter((d: any) => d.verified_at || d.status === 'VERIFIED').length;
  let status = 'RED';
  if (total === 0) status = 'GREY';
  else if (verified === total) status = 'GREEN';
  else if (verified >= total * 0.5) status = 'AMBER';
  return { status, verified, total };
}

export default inbox;

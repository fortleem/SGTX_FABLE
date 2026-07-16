// SGTX Platform — Trade & Contract Routes (Phases 1-3)
import { Hono } from 'hono';
import { uuid, generateUSTN, isoNow, defaultCommissionPayer } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import { calculateCommission } from '../lib/commission';
import type { Bindings } from '../lib/types';

const trade = new Hono<{ Bindings: Bindings }>();

// ─── TRADE REQUESTS (Phase 1) ─────────────────────────
trade.get('/trades', async (c) => {
  const status = c.req.query('status');
  const tenantId = c.req.query('tenant_id');
  const mode = c.req.query('mode');
  let sql = `SELECT tr.*, t1.legal_name as importer_name, t1.jurisdiction as importer_jurisdiction, t2.legal_name as exporter_name, t2.jurisdiction as exporter_jurisdiction
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id`;
  const conditions: string[] = [];
  const binds: any[] = [];
  if (status) {
    // Support comma-separated statuses like "QUOTED,NEGOTIATING,COUNTER_OFFER"
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conditions.push('tr.status = ?'); binds.push(statuses[0]);
    } else if (statuses.length > 1) {
      conditions.push(`tr.status IN (${statuses.map(() => '?').join(',')})`);
      binds.push(...statuses);
    }
  }
  if (tenantId) {
    if (mode === 'SELL') {
      conditions.push('tr.assigned_exporter_id = ?'); binds.push(tenantId);
    } else if (mode === 'BUY') {
      conditions.push('tr.importer_tenant_id = ?'); binds.push(tenantId);
    } else {
      conditions.push('(tr.importer_tenant_id = ? OR tr.assigned_exporter_id = ?)'); binds.push(tenantId, tenantId);
    }
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY tr.created_at DESC LIMIT 100';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

// ─── ONGOING TRADES FOR CONTRACT WIZARD (Trade Selector Dropdown) ──
trade.get('/trades/ongoing', async (c) => {
  const tenantId = c.req.query('tenant_id');
  let sql = `
    SELECT tr.id, tr.status, tr.raw_description, tr.parsed_specs, tr.created_at,
           t1.legal_name as importer_name, t1.gtid as importer_gtid,
           t2.legal_name as exporter_name, t2.gtid as exporter_gtid,
           eq.exw_price, eq.incoterm as quote_incoterm
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    LEFT JOIN exporter_quotes eq ON eq.trade_request_id = tr.id
    WHERE tr.status IN ('QUOTED','NEGOTIATING','PENDING_EXPORTER_RESPONSE','MATCHING','DRAFT')
  `;
  if (tenantId) sql += ` AND (tr.importer_tenant_id = '${tenantId}' OR tr.assigned_exporter_id = '${tenantId}')`;
  sql += ' ORDER BY tr.created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

trade.get('/trades/:id', async (c) => {
  const t = await c.env.DB.prepare(`
    SELECT tr.*, t1.legal_name as importer_name, t1.gtid as importer_gtid, t2.legal_name as exporter_name, t2.gtid as exporter_gtid
    FROM trade_requests tr LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    WHERE tr.id = ?
  `).bind(c.req.param('id')).first();
  if (!t) return c.json({ error: 'Trade not found' }, 404);
  const quotes = await c.env.DB.prepare('SELECT * FROM exporter_quotes WHERE trade_request_id = ?').bind(t.id).all();
  const contracts = await c.env.DB.prepare('SELECT * FROM contracts WHERE trade_request_id = ?').bind(t.id).all();
  const channel = await c.env.DB.prepare('SELECT * FROM trade_channels WHERE trade_request_id = ?').bind(t.id).first();
  return c.json({ data: { ...t, parsed_specs: JSON.parse((t.parsed_specs as string) || '{}'), quotes: quotes.results, contracts: contracts.results, channel } });
});

trade.post('/trades', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const importer = await c.env.DB.prepare('SELECT gtid, jurisdiction FROM tenants WHERE id = ?').bind(body.importer_tenant_id).first();
  if (!importer) return c.json({ error: 'Importer tenant not found' }, 404);

  let exporter = null;
  if (body.exporter_gtid) {
    exporter = await c.env.DB.prepare('SELECT id, gtid, jurisdiction FROM tenants WHERE gtid = ?').bind(body.exporter_gtid).first();
    if (!exporter) return c.json({ error: 'Exporter GTID not found' }, 404);
  }

  const jurisdictions = [importer.jurisdiction as string];
  if (exporter) jurisdictions.push(exporter.jurisdiction as string);

  // Governor Pre-Screen (G1-U-5)
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'trade.request.create',
    actor_gtid: importer.gtid as string,
    actor_employee_id: body.created_by,
    action_context: { importer_gtid: importer.gtid, exporter_gtid: exporter?.gtid, specs: body.parsed_specs },
    jurisdictions,
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Trade request denied by Governor', governor: gov }, 403);

  const status = exporter ? 'PENDING_EXPORTER_RESPONSE' : 'DRAFT';
  await c.env.DB.prepare(`
    INSERT INTO trade_requests (id, importer_tenant_id, exporter_tenant_id, raw_description, parsed_specs, specifications, status, assigned_exporter_id, governor_decision_id, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.importer_tenant_id, exporter?.id || null, body.raw_description || null, JSON.stringify(body.parsed_specs), JSON.stringify(body.specifications || {}), status, exporter?.id || null, gov.decision_id, body.created_by, isoNow(), isoNow()).run();

  // Create Trade Channel if both parties known
  if (exporter) {
    await c.env.DB.prepare(`
      INSERT INTO trade_channels (channel_id, trade_request_id, importer_tenant_id, exporter_tenant_id, jurisdiction_rules_snapshot, current_phase, creation_governor_decision_id)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).bind(uuid(), id, body.importer_tenant_id, exporter.id, JSON.stringify({ importer: importer.jurisdiction, exporter: exporter.jurisdiction }), gov.decision_id).run();
  }

  await auditLog(c.env.DB, 'trade_requests', id, 'CREATE', null, { status, importer: importer.gtid });
  return c.json({ data: { id, status, governor_decision: gov }, message: 'Trade request created' }, 201);
});

trade.patch('/trades/:id/status', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE trade_requests SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, isoNow(), c.req.param('id')).run();
  return c.json({ message: 'Trade status updated' });
});

// ─── EXPORTER QUOTES (Phase 2) ────────────────────────
trade.get('/quotes', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  let sql = 'SELECT eq.*, t.legal_name as exporter_name FROM exporter_quotes eq JOIN tenants t ON eq.exporter_tenant_id = t.id';
  if (tradeId) sql += ' WHERE eq.trade_request_id = ?';
  sql += ' ORDER BY eq.created_at DESC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = tradeId ? await stmt.bind(tradeId).all() : await stmt.all();
  return c.json({ data: results });
});

trade.post('/quotes', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'quote.submit', actor_gtid: body.exporter_gtid || 'system',
    action_context: { exw_price: body.exw_price, incoterm: body.incoterm },
  });

  await c.env.DB.prepare(`
    INSERT INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)
  `).bind(id, body.trade_request_id, body.exporter_tenant_id, body.exw_price, body.exw_currency || 'USD', isoNow(), body.incoterm, body.validity_days || 15, gov.decision_id).run();

  await c.env.DB.prepare("UPDATE trade_requests SET status = 'QUOTED', updated_at = ? WHERE id = ?").bind(isoNow(), body.trade_request_id).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'Quote submitted, EXW price locked' }, 201);
});

// ─── CONTRACTS (Phase 3) ──────────────────────────────
trade.get('/contracts', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT c.*, tr.parsed_specs, t1.legal_name as importer_name, t2.legal_name as exporter_name
    FROM contracts c
    JOIN trade_requests tr ON c.trade_request_id = tr.id
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    ORDER BY c.created_at DESC
  `).all();
  return c.json({ data: results });
});

trade.get('/contracts/:id', async (c) => {
  const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(c.req.param('id')).first();
  if (!contract) return c.json({ error: 'Contract not found' }, 404);
  const commLock = contract.commission_lock_id ? await c.env.DB.prepare('SELECT * FROM commission_locks WHERE lock_id = ?').bind(contract.commission_lock_id).first() : null;
  const shipments = await c.env.DB.prepare('SELECT * FROM shipments WHERE contract_id = ?').bind(contract.id).all();
  return c.json({ data: { ...contract, commission_lock: commLock, shipments: shipments.results } });
});

trade.post('/contracts', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'contract.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { trade_request_id: body.trade_request_id, incoterm: body.incoterm },
  });

  const commPayer = defaultCommissionPayer(body.incoterm);
  await c.env.DB.prepare(`
    INSERT INTO contracts (id, trade_request_id, contract_type, incoterm, incoterm_rules, clauses, governing_law, dispute_resolution, status, commission_responsibility, commission_allocation, exporter_commission_pct, importer_commission_pct, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id, body.contract_type || 'SINGLE_SHIPMENT', body.incoterm, JSON.stringify(body.incoterm_rules || {}), JSON.stringify(body.clauses || []), body.governing_law || 'English Law', body.dispute_resolution || 'ICC Arbitration', JSON.stringify({ default_payer: commPayer }), JSON.stringify(body.commission_allocation || { importer: 50, exporter: 50 }), body.exporter_commission_pct || 0, body.importer_commission_pct || 0, gov.decision_id).run();

  return c.json({ data: { id, default_commission_payer: commPayer, governor_decision: gov }, message: 'Contract created' }, 201);
});

trade.post('/contracts/:id/sign', async (c) => {
  const body = await c.req.json();
  const contractId = c.req.param('id');
  const field = body.party === 'IMPORTER' ? 'importer_signature' : 'exporter_signature';
  await c.env.DB.prepare(`UPDATE contracts SET ${field} = ?, updated_at = ? WHERE id = ?`).bind(body.signature || `sig-${uuid().slice(0, 8)}`, isoNow(), contractId).run();

  const contract = await c.env.DB.prepare('SELECT importer_signature, exporter_signature FROM contracts WHERE id = ?').bind(contractId).first();
  if (contract?.importer_signature && contract?.exporter_signature) {
    await c.env.DB.prepare("UPDATE contracts SET status = 'PENDING_SIGNATURES', signed_at = ? WHERE id = ?").bind(isoNow(), contractId).run();
  }
  return c.json({ message: `${body.party} signature recorded` });
});

trade.post('/contracts/:id/lock', async (c) => {
  const contractId = c.req.param('id');
  const body = await c.req.json();
  const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contractId).first();
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  // Governor gate: commission must be paid
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'contract.lock', actor_gtid: body.actor_gtid || 'system',
    action_context: { commission_lock_active: true, all_signatures: !!(contract.importer_signature && contract.exporter_signature) },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Lock denied', governor: gov }, 403);

  // Create CommissionLock
  const lockId = uuid();
  const tradeReq = await c.env.DB.prepare('SELECT * FROM trade_requests WHERE id = ?').bind(contract.trade_request_id).first();
  const commResult = await calculateCommission(c.env.DB, {
    trade_value_usd: body.trade_value_usd || 50000, hs_code: body.hs_code || '070200',
    origin_country: body.origin_country || 'VN', destination_country: body.destination_country || 'EG',
    incoterm: contract.incoterm as string, is_perishable: body.is_perishable || false,
    trade_count_12m: body.trade_count_12m || 5, actor_gtid: body.actor_gtid || 'system',
    trade_request_id: contract.trade_request_id as string,
  });

  await c.env.DB.prepare(`
    INSERT INTO commission_locks (lock_id, contract_id, trade_id, commission_rate_pct, commission_usd, currency, status, release_conditions, responsible_tenant_id, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, 'USD', 'ACTIVE', ?, ?, ?)
  `).bind(lockId, contractId, contract.trade_request_id, commResult.final_rate_pct, commResult.commission_usd, JSON.stringify({ milestones: ['LOADED', 'DEPARTED', 'ARRIVED', 'DELIVERED'], release_per_milestone: 25 }), body.responsible_tenant_id || null, gov.decision_id).run();

  await c.env.DB.prepare("UPDATE contracts SET status = 'LOCKED', locked_at = ?, commission_lock_id = ?, updated_at = ? WHERE id = ?").bind(isoNow(), lockId, isoNow(), contractId).run();
  await c.env.DB.prepare("UPDATE trade_requests SET status = 'CONTRACTED', updated_at = ? WHERE id = ?").bind(isoNow(), contract.trade_request_id).run();

  return c.json({ data: { contract_id: contractId, commission_lock_id: lockId, commission: commResult, governor_decision: gov }, message: 'Contract LOCKED, CommissionLock ACTIVE' });
});

// ─── COMMISSION LOCKS ──────────────────────────────────
trade.get('/commission-locks', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT cl.*, c.incoterm, t.legal_name as responsible_tenant
    FROM commission_locks cl
    LEFT JOIN contracts c ON cl.contract_id = c.id
    LEFT JOIN tenants t ON cl.responsible_tenant_id = t.id
    ORDER BY cl.locked_at DESC
  `).all();
  return c.json({ data: results });
});

trade.post('/commission-locks/:id/release', async (c) => {
  const body = await c.req.json();
  const lockId = c.req.param('id');
  const lock = await c.env.DB.prepare('SELECT * FROM commission_locks WHERE lock_id = ?').bind(lockId).first();
  if (!lock) return c.json({ error: 'CommissionLock not found' }, 404);

  const newPct = (lock.released_pct as number) + (body.release_pct || 25);
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'commission.release', actor_gtid: body.actor_gtid || 'system',
    action_context: { release_pct: newPct, lock_id: lockId },
  });

  const status = newPct >= 100 ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';
  await c.env.DB.prepare('UPDATE commission_locks SET released_pct = ?, status = ?, fully_released_at = ? WHERE lock_id = ?').bind(newPct, status, newPct >= 100 ? isoNow() : null, lockId).run();

  return c.json({ data: { lock_id: lockId, released_pct: newPct, status, governor_decision: gov }, message: `Commission ${status}` });
});

// ─── NEGOTIATION SESSIONS ─────────────────────────────
trade.get('/negotiations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM negotiation_sessions ORDER BY started_at DESC').all();
  return c.json({ data: results });
});

trade.post('/negotiations', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'negotiation.start', actor_gtid: body.actor_gtid || 'system',
    action_context: { trade_request_id: body.trade_request_id },
  });
  await c.env.DB.prepare(`INSERT INTO negotiation_sessions (id, trade_request_id, governor_decision_id) VALUES (?, ?, ?)`).bind(id, body.trade_request_id, gov.decision_id).run();
  return c.json({ data: { id }, message: 'Negotiation session started' }, 201);
});

export default trade;

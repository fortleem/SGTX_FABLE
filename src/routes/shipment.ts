// SGTX Platform — Shipment, Milestone & Barcode Routes (Phases 5-6)
import { Hono } from 'hono';
import { uuid, generateUSTN, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const shipment = new Hono<{ Bindings: Bindings }>();

// ─── SHIPMENTS ─────────────────────────────────────────
shipment.get('/shipments', async (c) => {
  const contractId = c.req.query('contract_id');
  const status = c.req.query('status');
  let sql = `SELECT s.*, c.incoterm, t1.legal_name as importer_name, t2.legal_name as exporter_name
    FROM shipments s
    JOIN contracts c ON s.contract_id = c.id
    JOIN trade_requests tr ON c.trade_request_id = tr.id
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id`;
  const conds: string[] = [];
  const binds: any[] = [];
  if (contractId) { conds.push('s.contract_id = ?'); binds.push(contractId); }
  if (status) { conds.push('s.status = ?'); binds.push(status); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY s.created_at DESC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results, count: results.length });
});

shipment.get('/shipments/:id', async (c) => {
  const s = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ? OR ustn = ?').bind(c.req.param('id'), c.req.param('id')).first();
  if (!s) return c.json({ error: 'Shipment not found' }, 404);
  const milestones = await c.env.DB.prepare('SELECT * FROM shipment_milestones WHERE ustn = ? ORDER BY confirmed_at ASC').bind(s.ustn).all();
  const barcodes = await c.env.DB.prepare('SELECT * FROM shipment_barcodes WHERE shipment_ustn = ?').bind(s.ustn).all();
  const docs = await c.env.DB.prepare('SELECT * FROM shipment_document_requirements WHERE shipment_ustn = ?').bind(s.ustn).all();
  const disruptions = await c.env.DB.prepare('SELECT * FROM disruption_predictions WHERE ustn = ? ORDER BY created_at DESC').bind(s.ustn).all();
  return c.json({ data: { ...s, transport_legs: JSON.parse((s.transport_legs as string) || '[]'), milestones: milestones.results, barcodes: barcodes.results, document_requirements: docs.results, disruption_predictions: disruptions.results } });
});

shipment.post('/shipments', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const contract = await c.env.DB.prepare(`
    SELECT c.*, tr.importer_tenant_id, t.jurisdiction as importer_jurisdiction
    FROM contracts c JOIN trade_requests tr ON c.trade_request_id = tr.id
    JOIN tenants t ON tr.importer_tenant_id = t.id WHERE c.id = ?
  `).bind(body.contract_id).first();
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  const ustn = generateUSTN(body.jurisdiction || (contract.importer_jurisdiction as string) || 'XX');
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'shipment.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { contract_id: body.contract_id, ustn },
    jurisdictions: [body.jurisdiction || (contract.importer_jurisdiction as string) || 'XX'],
  });

  await c.env.DB.prepare(`
    INSERT INTO shipments (id, ustn, contract_id, contract_sequence_number, booking_number, loading_date, loading_time_slot, origin_port, destination_port, vessel_name, imo_number, transport_legs, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ustn, body.contract_id, body.sequence || 1, body.booking_number || null, body.loading_date || null, body.loading_time_slot || null, body.origin_port, body.destination_port, body.vessel_name || null, body.imo_number || null, JSON.stringify(body.transport_legs || []), gov.decision_id).run();

  // Auto-generate barcodes (GS1-128 per pallet)
  const palletCount = body.pallet_count || 1;
  for (let i = 1; i <= palletCount; i++) {
    const sscc = `0${Math.random().toString().slice(2, 19)}`;
    const barcodeData = JSON.stringify({ ustn, pallet: i, origin: body.origin_port, destination: body.destination_port, commodity: body.commodity || 'GENERAL' });
    await c.env.DB.prepare(`INSERT INTO shipment_barcodes (id, shipment_ustn, barcode_type, barcode_data, pallet_number, sscc) VALUES (?, ?, 'GS1-128', ?, ?, ?)`).bind(uuid(), ustn, barcodeData, i, sscc).run();
  }

  // Auto-generate document requirements
  const docTypes = ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'CERTIFICATE_OF_ORIGIN', 'CUSTOMS_DECLARATION'];
  for (const dt of docTypes) {
    await c.env.DB.prepare(`INSERT INTO shipment_document_requirements (id, shipment_ustn, document_type, status) VALUES (?, ?, ?, 'PENDING')`).bind(uuid(), ustn, dt).run();
  }

  await auditLog(c.env.DB, 'shipments', id, 'CREATE', null, { ustn, contract_id: body.contract_id });
  return c.json({ data: { id, ustn, pallet_count: palletCount, governor_decision: gov }, message: 'Shipment created with USTN, barcodes, and document requirements' }, 201);
});

// ─── MILESTONES ────────────────────────────────────────
shipment.post('/shipments/:ustn/milestones', async (c) => {
  const ustn = c.req.param('ustn');
  const body = await c.req.json();
  const id = uuid();

  const s = await c.env.DB.prepare('SELECT * FROM shipments WHERE ustn = ?').bind(ustn).first();
  if (!s) return c.json({ error: 'Shipment not found' }, 404);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'shipment.milestone.confirm', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn, milestone: body.milestone, has_permission: true },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Milestone confirmation denied', governor: gov }, 403);

  await c.env.DB.prepare(`
    INSERT INTO shipment_milestones (id, ustn, milestone, confirmed_at, confirmed_by, confirmation_method, evidence_hash, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ustn, body.milestone, isoNow(), body.confirmed_by || null, body.confirmation_method || 'MANUAL', body.evidence_hash || null, gov.decision_id).run();

  // Update shipment status based on milestone
  const statusMap: Record<string, string> = { 'GATE_IN': 'GATED_IN', 'LOADED': 'LOADED', 'DEPARTED': 'DEPARTED', 'IN_TRANSIT': 'IN_TRANSIT', 'ARRIVED': 'ARRIVED', 'CUSTOMS_CLEARED': 'CUSTOMS_IMPORT', 'DELIVERED': 'DELIVERED' };
  const newStatus = statusMap[body.milestone] || s.status;
  await c.env.DB.prepare('UPDATE shipments SET status = ?, current_milestone = ?, updated_at = ? WHERE ustn = ?').bind(newStatus, body.milestone, isoNow(), ustn).run();

  // Commission release on key milestones (25% per milestone)
  const releaseMap: Record<string, number> = { 'LOADED': 25, 'DEPARTED': 25, 'ARRIVED': 25, 'DELIVERED': 25 };
  let commissionRelease = null;
  if (releaseMap[body.milestone]) {
    const contract = await c.env.DB.prepare('SELECT commission_lock_id FROM contracts WHERE id = ?').bind(s.contract_id).first();
    if (contract?.commission_lock_id) {
      const lock = await c.env.DB.prepare('SELECT * FROM commission_locks WHERE lock_id = ?').bind(contract.commission_lock_id).first();
      if (lock) {
        const newPct = Math.min(100, (lock.released_pct as number) + releaseMap[body.milestone]);
        const status = newPct >= 100 ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';
        await c.env.DB.prepare('UPDATE commission_locks SET released_pct = ?, status = ?, fully_released_at = ? WHERE lock_id = ?').bind(newPct, status, newPct >= 100 ? isoNow() : null, contract.commission_lock_id).run();
        commissionRelease = { lock_id: contract.commission_lock_id, released_pct: newPct, status };
      }
    }
  }

  return c.json({ data: { milestone_id: id, milestone: body.milestone, commission_release: commissionRelease, governor_decision: gov }, message: `Milestone ${body.milestone} confirmed` }, 201);
});

shipment.get('/shipments/:ustn/milestones', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM shipment_milestones WHERE ustn = ? ORDER BY confirmed_at ASC').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

// ─── BARCODES ──────────────────────────────────────────
shipment.get('/shipments/:ustn/barcodes', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM shipment_barcodes WHERE shipment_ustn = ?').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

shipment.post('/barcodes/scan', async (c) => {
  const body = await c.req.json();
  const barcode = await c.env.DB.prepare('SELECT * FROM shipment_barcodes WHERE sscc = ? OR id = ?').bind(body.sscc || '', body.barcode_id || '').first();
  if (!barcode) return c.json({ error: 'Barcode not found' }, 404);

  const shipment_data = await c.env.DB.prepare('SELECT * FROM shipments WHERE ustn = ?').bind(barcode.shipment_ustn).first();
  return c.json({ data: { barcode, shipment: shipment_data, action: 'Barcode scanned - milestone confirmation available' } });
});

// ─── DISRUPTION PREDICTIONS ───────────────────────────
shipment.post('/shipments/:ustn/disruptions', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO disruption_predictions (id, ustn, prediction_type, probability, affected_route, predicted_delay_days, data_sources, recommendation, ai_model_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, c.req.param('ustn'), body.prediction_type, body.probability, body.affected_route || null, body.predicted_delay_days || null, JSON.stringify(body.data_sources || []), body.recommendation || null, body.ai_model_version || 'v1.0').run();
  return c.json({ data: { id }, message: 'Disruption prediction recorded' }, 201);
});

// ─── DOCUMENTS ─────────────────────────────────────────
shipment.get('/documents', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  const ustn = c.req.query('ustn');
  let sql = 'SELECT d.*, t.legal_name as tenant_name FROM documents d LEFT JOIN tenants t ON d.tenant_id = t.id';
  const conds: string[] = [];
  const binds: any[] = [];
  if (tradeId) { conds.push('d.trade_request_id = ?'); binds.push(tradeId); }
  if (ustn) { conds.push('d.shipment_ustn = ?'); binds.push(ustn); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY d.uploaded_at DESC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return c.json({ data: results });
});

shipment.post('/documents', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO documents (id, requirement_id, trade_request_id, shipment_ustn, tenant_id, document_type, filename, storage_path, sha256_hash, uploaded_by, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).bind(id, body.requirement_id || null, body.trade_request_id || null, body.shipment_ustn || null, body.tenant_id, body.document_type, body.filename, body.storage_path || `/documents/${id}`, body.sha256_hash || `sha256:${uuid()}`, body.uploaded_by).run();
  return c.json({ data: { id }, message: 'Document uploaded' }, 201);
});

// ─── SETTLEMENT (Phase 6) ─────────────────────────────
shipment.get('/settlements', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT si.*, s.ustn, s.status as shipment_status FROM settlement_instructions si JOIN shipments s ON si.ustn = s.ustn ORDER BY si.created_at DESC').all();
  return c.json({ data: results });
});

shipment.post('/settlements', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'settlement.execute', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: body.ustn, commission_lock_id: body.commission_lock_id || 'present' },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Settlement denied', governor: gov }, 403);

  await c.env.DB.prepare(`
    INSERT INTO settlement_instructions (id, ustn, instruction_type, payload, status, governor_decision_id)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, body.ustn, body.instruction_type || 'PRINCIPAL_PAYMENT', JSON.stringify(body.payload || {}), gov.decision_id).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'Settlement instruction created' }, 201);
});

shipment.post('/settlements/:id/confirm', async (c) => {
  const body = await c.req.json();
  const confId = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'settlement.confirm', actor_gtid: body.actor_gtid || 'system',
    action_context: { instruction_id: c.req.param('id') },
  });

  await c.env.DB.prepare(`
    INSERT INTO settlement_confirmations (id, instruction_id, proof_hash, amount_confirmed, currency_confirmed, fx_rate_applied, psp_name, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(confId, c.req.param('id'), body.proof_hash || `proof:${uuid()}`, body.amount_confirmed, body.currency || 'USD', body.fx_rate || 1.0, body.psp_name || 'Stripe', gov.decision_id).run();

  await c.env.DB.prepare("UPDATE settlement_instructions SET status = 'CONFIRMED' WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ data: { confirmation_id: confId }, message: 'Settlement confirmed' });
});

export default shipment;

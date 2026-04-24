// SGTX Platform — Finance, Distressed Cargo, Buyer Search Routes (Phases 4, 7-10)
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const finance = new Hono<{ Bindings: Bindings }>();

// ─── FINANCING REQUESTS (Phase 4) ─────────────────────
finance.get('/financing', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT fr.*, t.legal_name as requester_name, c.incoterm
    FROM financing_requests fr
    JOIN tenants t ON fr.requester_tenant_id = t.id
    JOIN contracts c ON fr.contract_id = c.id
    ORDER BY fr.created_at DESC
  `).all();
  return c.json({ data: results });
});

finance.post('/financing', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Governor gate: financing only after contract lock (G4)
  const contract = await c.env.DB.prepare("SELECT * FROM contracts WHERE id = ? AND status = 'LOCKED'").bind(body.contract_id).first();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'financing.request', actor_gtid: body.actor_gtid || 'system',
    action_context: { contract_locked: !!contract, amount: body.amount },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Financing request denied — contract must be locked', governor: gov }, 403);

  await c.env.DB.prepare(`
    INSERT INTO financing_requests (id, contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, collateral, status, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?)
  `).bind(id, body.contract_id, body.requester_tenant_id, body.amount, body.currency || 'USD', body.tenor_days, body.financing_type, JSON.stringify(body.collateral || {}), gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Financing request created' }, 201);
});

finance.patch('/financing/:id/status', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE financing_requests SET status = ? WHERE id = ?').bind(body.status, c.req.param('id')).run();
  return c.json({ message: 'Financing status updated' });
});

// ─── FINANCING OFFERS (Blind Bidding) ─────────────────
finance.get('/financing/:requestId/offers', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT fo.*, t.legal_name as financier_name
    FROM financing_offers fo JOIN tenants t ON fo.financier_tenant_id = t.id
    WHERE fo.financing_request_id = ?
    ORDER BY fo.effective_apr ASC
  `).bind(c.req.param('requestId')).all();
  return c.json({ data: results });
});

finance.post('/financing/:requestId/offers', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO financing_offers (id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost, collateral_required, conditions, bid_encrypted, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'SUBMITTED')
  `).bind(id, c.req.param('requestId'), body.financier_tenant_id, body.effective_apr, body.all_in_cost || null, JSON.stringify(body.collateral_required || {}), JSON.stringify(body.conditions || {})).run();

  // Update request to BIDDING
  await c.env.DB.prepare("UPDATE financing_requests SET status = 'BIDDING' WHERE id = ?").bind(c.req.param('requestId')).run();
  return c.json({ data: { id }, message: 'Financing offer submitted (blind bid)' }, 201);
});

finance.post('/financing/:requestId/award', async (c) => {
  const body = await c.req.json();
  const agreeId = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'financing.award', actor_gtid: body.actor_gtid || 'system',
    action_context: { request_id: c.req.param('requestId'), offer_id: body.offer_id },
  });

  await c.env.DB.prepare(`
    INSERT INTO financing_agreements (id, financing_request_id, winning_offer_id, cryptographic_hash, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
  `).bind(agreeId, c.req.param('requestId'), body.offer_id, `hash:${uuid()}`).run();

  await c.env.DB.prepare("UPDATE financing_requests SET status = 'AWARDED' WHERE id = ?").bind(c.req.param('requestId')).run();
  await c.env.DB.prepare("UPDATE financing_offers SET status = 'AWARDED' WHERE id = ?").bind(body.offer_id).run();

  return c.json({ data: { agreement_id: agreeId, governor_decision: gov }, message: 'Financing awarded' });
});

// ─── FINANCING BIDS (Financier Portal) ──────────────────
finance.post('/financing/bids', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'financing.bid', actor_gtid: body.actor_gtid || 'system',
    action_context: { financing_request_id: body.financing_request_id, financier_tenant_id: body.financier_tenant_id },
  });

  await c.env.DB.prepare(`
    INSERT INTO financing_offers (id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost, conditions, bid_encrypted, status)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'SUBMITTED')
  `).bind(id, body.financing_request_id, body.financier_tenant_id, body.effective_apr, body.all_in_cost || null, JSON.stringify({ text: body.conditions || '' })).run();

  // Update request to BIDDING
  await c.env.DB.prepare("UPDATE financing_requests SET status = 'BIDDING' WHERE id = ? AND status = 'REQUESTED'").bind(body.financing_request_id).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'Financing bid submitted (encrypted)' }, 201);
});

// ─── DISTRESSED CARGO (Phase 7) ───────────────────────
finance.get('/distressed', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT dcl.*, t.legal_name as exporter_name, s.status as shipment_status
    FROM distressed_cargo_listings dcl
    JOIN tenants t ON dcl.exporter_tenant_id = t.id
    LEFT JOIN shipments s ON dcl.original_shipment_ustn = s.ustn
    ORDER BY dcl.created_at DESC
  `).all();
  return c.json({ data: results });
});

finance.post('/distressed', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'distressed.list', actor_gtid: body.actor_gtid || 'system',
    action_context: { shipment_ustn: body.original_shipment_ustn },
  });

  await c.env.DB.prepare(`
    INSERT INTO distressed_cargo_listings (id, original_shipment_ustn, exporter_tenant_id, product_details, quantity, unit, current_location, condition, price_expectation, price_currency, listing_expiry, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.original_shipment_ustn || null, body.exporter_tenant_id, JSON.stringify(body.product_details), body.quantity, body.unit, body.current_location, body.condition, body.price_expectation || null, body.price_currency || 'USD', body.listing_expiry, gov.decision_id).run();

  // Update shipment status to DISTRESSED
  if (body.original_shipment_ustn) {
    await c.env.DB.prepare("UPDATE shipments SET status = 'DISTRESSED', updated_at = ? WHERE ustn = ?").bind(isoNow(), body.original_shipment_ustn).run();
  }

  return c.json({ data: { id, governor_decision: gov }, message: 'Distressed cargo listed' }, 201);
});

finance.post('/distressed/:id/offers', async (c) => {
  const body = await c.req.json();
  const offerId = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'distressed.offer', actor_gtid: body.actor_gtid || 'system',
    action_context: { listing_id: c.req.param('id'), amount: body.amount },
  });

  await c.env.DB.prepare(`
    INSERT INTO distressed_cargo_offers (id, listing_id, buyer_tenant_id, amount, currency, message, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(offerId, c.req.param('id'), body.buyer_tenant_id, body.amount, body.currency || 'USD', body.message || null, gov.decision_id).run();

  return c.json({ data: { offer_id: offerId, governor_decision: gov }, message: 'Offer submitted' }, 201);
});

// ─── BUYER SEARCH (Phase 8) ──────────────────────────
finance.get('/buyer-search', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT bsr.*, t.legal_name as exporter_name
    FROM buyer_search_requests bsr JOIN tenants t ON bsr.exporter_tenant_id = t.id
    WHERE bsr.status = 'ACTIVE' ORDER BY bsr.created_at DESC
  `).all();
  return c.json({ data: results });
});

finance.post('/buyer-search', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'buyer.search', actor_gtid: body.actor_gtid || 'system',
    action_context: { exporter_tenant_id: body.exporter_tenant_id },
  });

  await c.env.DB.prepare(`
    INSERT INTO buyer_search_requests (id, exporter_tenant_id, product_details, quantity, unit, target_regions, preferred_payment_methods, min_buyer_trust_score, listing_expiry, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.exporter_tenant_id, JSON.stringify(body.product_details), body.quantity, body.unit, JSON.stringify(body.target_regions || []), JSON.stringify(body.preferred_payment_methods || []), body.min_buyer_trust_score || 60, body.listing_expiry, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Buyer search initiated' }, 201);
});

// ═══════════════════════════════════════════════════════════
// DISPUTES (Phase 10 — Full Blueprint v6.2 Implementation)
// ═══════════════════════════════════════════════════════════

// ─── LIST ALL DISPUTES ──────────────────────────────────
finance.get('/disputes', async (c) => {
  const status = c.req.query('status');
  const gtid = c.req.query('gtid');
  let sql = `SELECT d.*, 
      t1.legal_name as filing_party_name, 
      t2.legal_name as respondent_name,
      tr.status as trade_status
    FROM disputes d
    LEFT JOIN tenants t1 ON d.filing_party_gtid = t1.gtid
    LEFT JOIN tenants t2 ON d.respondent_gtid = t2.gtid
    LEFT JOIN trade_requests tr ON d.trade_request_id = tr.id`;
  const conditions: string[] = [];
  if (status) conditions.push(`d.status = '${status}'`);
  if (gtid) conditions.push(`(d.filing_party_gtid = '${gtid}' OR d.respondent_gtid = '${gtid}')`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY d.filed_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ─── GET SINGLE DISPUTE WITH RECOMMENDATIONS ────────────
finance.get('/disputes/:id', async (c) => {
  const dispute = await c.env.DB.prepare(`
    SELECT d.*, 
      t1.legal_name as filing_party_name, 
      t2.legal_name as respondent_name,
      tr.status as trade_status
    FROM disputes d
    LEFT JOIN tenants t1 ON d.filing_party_gtid = t1.gtid
    LEFT JOIN tenants t2 ON d.respondent_gtid = t2.gtid
    LEFT JOIN trade_requests tr ON d.trade_request_id = tr.id
    WHERE d.id = ?
  `).bind(c.req.param('id')).first();
  if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

  const { results: recommendations } = await c.env.DB.prepare(
    'SELECT * FROM dispute_recommendations WHERE dispute_id = ? ORDER BY created_at DESC'
  ).bind(c.req.param('id')).all();

  return c.json({ data: { ...dispute, recommendations } });
});

// ─── FILE A DISPUTE (Phase 10 Step 10.1) ────────────────
finance.post('/disputes', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'dispute.file', actor_gtid: body.filing_party_gtid,
    action_context: { trade_request_id: body.trade_request_id, dispute_type: body.dispute_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO disputes (id, trade_request_id, filing_party_gtid, dispute_type, description, evidence_links, severity, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id, body.filing_party_gtid, body.dispute_type, body.description || null, JSON.stringify(body.evidence_links || []), body.severity || 3, gov.decision_id).run();

  // Determine respondent GTID from trade request
  const tradeReq = await c.env.DB.prepare(`
    SELECT tr.*, t1.gtid as importer_gtid, t2.gtid as exporter_gtid
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    WHERE tr.id = ?
  `).bind(body.trade_request_id).first();

  let respondentGtid = null;
  if (tradeReq) {
    respondentGtid = body.filing_party_gtid === tradeReq.importer_gtid ? tradeReq.exporter_gtid : tradeReq.importer_gtid;
    await c.env.DB.prepare('UPDATE disputes SET respondent_gtid = ? WHERE id = ?').bind(respondentGtid, id).run();
  }

  // ─── AUTO-UPDATE DISPUTE HISTORY for both parties ───
  const updateDisputeHistory = async (gtid: string, isFiler: boolean) => {
    if (!gtid) return;
    const existing = await c.env.DB.prepare('SELECT * FROM dispute_history WHERE entity_gtid = ?').bind(gtid).first();
    const tenantData = await c.env.DB.prepare('SELECT legal_name, type FROM tenants WHERE gtid = ?').bind(gtid).first();
    const entityType = (tenantData?.type as string) || 'CORPORATE';
    const now = isoNow();

    if (existing) {
      const total = (existing.total_disputes as number) + 1;
      const filer = (existing.disputes_as_filer as number) + (isFiler ? 1 : 0);
      const respondent = (existing.disputes_as_respondent as number) + (isFiler ? 0 : 1);
      const dtype = (body.dispute_type || '').toUpperCase();
      const q = dtype.includes('QUALITY') ? 1 : 0;
      const d = dtype.includes('DELIVERY') ? 1 : 0;
      const p = dtype.includes('PAYMENT') ? 1 : 0;
      const doc = dtype.includes('DOCUMENTATION') ? 1 : 0;
      const comm = dtype.includes('COMMISSION') ? 1 : 0;
      const breach = dtype.includes('BREACH') ? 1 : 0;
      const risk = Math.min(100, (total * 15) + (respondent * 10) - (filer * 3));
      await c.env.DB.prepare(`UPDATE dispute_history SET total_disputes = ?, disputes_as_filer = ?, disputes_as_respondent = ?, quality_disputes = quality_disputes + ?, delivery_disputes = delivery_disputes + ?, payment_disputes = payment_disputes + ?, documentation_disputes = documentation_disputes + ?, commission_disputes = commission_disputes + ?, contract_breach_disputes = contract_breach_disputes + ?, disputes_pending = disputes_pending + 1, risk_score = ?, last_dispute_at = ?, updated_at = ? WHERE entity_gtid = ?`)
        .bind(total, filer, respondent, q, d, p, doc, comm, breach, risk, now, now, gtid).run();
    } else {
      const dtype = (body.dispute_type || '').toUpperCase();
      const risk = isFiler ? 15 : 25;
      await c.env.DB.prepare(`INSERT INTO dispute_history (id, entity_gtid, entity_name, entity_type, total_disputes, disputes_as_filer, disputes_as_respondent, quality_disputes, delivery_disputes, payment_disputes, documentation_disputes, commission_disputes, contract_breach_disputes, disputes_won, disputes_lost, disputes_settled, disputes_pending, risk_score, last_dispute_at, first_dispute_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?, ?)`)
        .bind(uuid(), gtid, (tenantData?.legal_name as string) || 'Unknown', entityType, isFiler ? 1 : 0, isFiler ? 0 : 1, dtype.includes('QUALITY') ? 1 : 0, dtype.includes('DELIVERY') ? 1 : 0, dtype.includes('PAYMENT') ? 1 : 0, dtype.includes('DOCUMENTATION') ? 1 : 0, dtype.includes('COMMISSION') ? 1 : 0, dtype.includes('BREACH') ? 1 : 0, risk, now, now, now).run();
    }
  };

  // Update history for filer and respondent
  try {
    await updateDisputeHistory(body.filing_party_gtid, true);
    if (respondentGtid) await updateDisputeHistory(respondentGtid as string, false);
  } catch (e) { /* Non-blocking: dispute history update failure should not block dispute filing */ }

  // Auto-generate triage recommendation (Phase 10 Step 10.2)
  try {
    const triageId = uuid();
    const severity = body.severity || 3;
    const settlementProb = severity <= 2 ? 80 : severity <= 3 ? 65 : 40;
    const triagePrediction = `Dispute categorised as ${body.dispute_type}. Severity ${severity}/5. Based on contract clauses, ${settlementProb > 50 ? 'mediation is recommended' : 'arbitration may be needed'}. Estimated ${settlementProb}% chance of settlement without arbitration.`;
    await c.env.DB.prepare(`
      INSERT INTO dispute_recommendations (id, dispute_id, recommendation_type, ai_prediction, confidence, created_at)
      VALUES (?, ?, 'TRIAGE', ?, ?, ?)
    `).bind(triageId, id, triagePrediction, settlementProb / 100, isoNow()).run();

    // Update dispute with triage data
    await c.env.DB.prepare(`UPDATE disputes SET triage_category = ?, resolution_path = ? WHERE id = ?`)
      .bind(body.dispute_type, settlementProb > 50 ? 'MEDIATION' : 'ARBITRATION', id).run();
  } catch (e) { /* Non-blocking */ }

  // Freeze CommissionLock
  const contract = await c.env.DB.prepare('SELECT commission_lock_id FROM contracts WHERE trade_request_id = ?').bind(body.trade_request_id).first();
  if (contract?.commission_lock_id) {
    await c.env.DB.prepare("UPDATE commission_locks SET status = 'DISPUTED' WHERE lock_id = ?").bind(contract.commission_lock_id).run();
  }

  // Audit log
  try {
    await c.env.DB.prepare(`INSERT INTO audit_log (table_name, record_id, action, after_data, changed_by) VALUES ('disputes', ?, 'INSERT', ?, ?)`)
      .bind(id, JSON.stringify({ dispute_type: body.dispute_type, filing_party: body.filing_party_gtid, respondent: respondentGtid }), body.filing_party_gtid).run();
  } catch (e) { /* Non-blocking */ }

  return c.json({ data: { id, respondent_gtid: respondentGtid, governor_decision: gov }, message: 'Dispute filed, CommissionLock frozen' }, 201);
});

// ─── UPDATE DISPUTE STATUS (Phase 10 Step 10.5-10.10) ───
finance.patch('/disputes/:id/status', async (c) => {
  const body = await c.req.json();
  const id = c.req.param('id');
  const dispute = await c.env.DB.prepare('SELECT * FROM disputes WHERE id = ?').bind(id).first();
  if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

  await c.env.DB.prepare(`UPDATE disputes SET status = ?, resolved_at = ? WHERE id = ?`)
    .bind(body.status, body.status === 'RESOLVED' || body.status === 'SETTLED' || body.status === 'ARBITRATED' ? isoNow() : null, id).run();

  // Update dispute history if resolved
  if (['RESOLVED', 'SETTLED', 'ARBITRATED', 'DISMISSED'].includes(body.status)) {
    const filingGtid = dispute.filing_party_gtid as string;
    const respondentGtid = dispute.respondent_gtid as string;
    const winner = body.winner_gtid;
    const now = isoNow();

    for (const gtid of [filingGtid, respondentGtid]) {
      if (!gtid) continue;
      const isWinner = gtid === winner;
      const isSettled = body.status === 'SETTLED';
      await c.env.DB.prepare(`UPDATE dispute_history SET 
        disputes_pending = MAX(0, disputes_pending - 1),
        disputes_won = disputes_won + ?,
        disputes_lost = disputes_lost + ?,
        disputes_settled = disputes_settled + ?,
        updated_at = ? WHERE entity_gtid = ?`)
        .bind(isWinner ? 1 : 0, !isWinner && !isSettled ? 1 : 0, isSettled ? 1 : 0, now, gtid).run();
    }

    // Unfreeze CommissionLock if resolved
    const contractData = await c.env.DB.prepare('SELECT commission_lock_id FROM contracts WHERE trade_request_id = ?').bind(dispute.trade_request_id).first();
    if (contractData?.commission_lock_id) {
      await c.env.DB.prepare("UPDATE commission_locks SET status = 'ACTIVE' WHERE lock_id = ? AND status = 'DISPUTED'")
        .bind(contractData.commission_lock_id).run();
    }
  }

  return c.json({ message: 'Dispute status updated' });
});

// ─── ADD MEDIATION MESSAGE (Phase 10 Step 10.5) ─────────
finance.post('/disputes/:id/mediation', async (c) => {
  const body = await c.req.json();
  const id = c.req.param('id');
  const dispute = await c.env.DB.prepare('SELECT mediation_log FROM disputes WHERE id = ?').bind(id).first();
  if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

  const log = JSON.parse((dispute.mediation_log as string) || '[]');
  log.push({
    id: uuid(),
    sender_gtid: body.sender_gtid,
    sender_name: body.sender_name,
    message: body.message,
    timestamp: isoNow(),
    sentiment: body.sentiment || null,
  });

  await c.env.DB.prepare('UPDATE disputes SET mediation_log = ? WHERE id = ?')
    .bind(JSON.stringify(log), id).run();

  return c.json({ data: { mediation_log: log }, message: 'Mediation message added' });
});

// ─── ADD DISPUTE RECOMMENDATION (Phase 10 Steps 10.2-10.7) ──
finance.post('/disputes/:id/recommendations', async (c) => {
  const body = await c.req.json();
  const recId = uuid();
  await c.env.DB.prepare(`
    INSERT INTO dispute_recommendations (id, dispute_id, recommendation_type, ai_prediction, suggested_settlement, confidence, evidence_package, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(recId, c.req.param('id'), body.recommendation_type || 'TRIAGE', body.ai_prediction || null, JSON.stringify(body.suggested_settlement || null), body.confidence || 0.7, JSON.stringify(body.evidence_package || null), isoNow()).run();

  // If settlement proposal, update the dispute record
  if (body.recommendation_type === 'SETTLEMENT_PROPOSAL' && body.suggested_settlement) {
    await c.env.DB.prepare('UPDATE disputes SET ai_settlement_proposal = ? WHERE id = ?')
      .bind(JSON.stringify(body.suggested_settlement), c.req.param('id')).run();
  }

  return c.json({ data: { id: recId }, message: 'Recommendation added' }, 201);
});

// ─── GET DISPUTE RECOMMENDATIONS ────────────────────────
finance.get('/disputes/:id/recommendations', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM dispute_recommendations WHERE dispute_id = ? ORDER BY created_at DESC'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

// ─── DISPUTE HISTORY (Persistent Per-Entity Tracking) ───
// This is the key endpoint for exporters/importers/government
finance.get('/dispute-history', async (c) => {
  const gtid = c.req.query('gtid');
  const minRisk = c.req.query('min_risk');
  const sortBy = c.req.query('sort') || 'risk_score';

  if (gtid) {
    // Single entity view
    const history = await c.env.DB.prepare('SELECT * FROM dispute_history WHERE entity_gtid = ?').bind(gtid).first();
    // Also get their individual disputes for detail view
    const { results: disputes } = await c.env.DB.prepare(`
      SELECT d.*, t1.legal_name as filing_party_name, t2.legal_name as respondent_name
      FROM disputes d
      LEFT JOIN tenants t1 ON d.filing_party_gtid = t1.gtid
      LEFT JOIN tenants t2 ON d.respondent_gtid = t2.gtid
      WHERE d.filing_party_gtid = ? OR d.respondent_gtid = ?
      ORDER BY d.filed_at DESC
    `).bind(gtid, gtid).all();
    return c.json({ data: { history: history || null, disputes } });
  }

  // All entities — used by government/admin/regulatory
  let sql = 'SELECT * FROM dispute_history';
  if (minRisk) sql += ` WHERE risk_score >= ${parseFloat(minRisk)}`;
  sql += ` ORDER BY ${sortBy === 'total' ? 'total_disputes' : 'risk_score'} DESC LIMIT 200`;
  const { results } = await c.env.DB.prepare(sql).all();

  // Flagged tenants: risk_score >= 40 or disputes_as_respondent >= 3
  const flagged = results.filter((r: any) => r.risk_score >= 40 || r.disputes_as_respondent >= 3);

  return c.json({ data: { all: results, flagged, total_entities: results.length, flagged_count: flagged.length } });
});

// ─── DISPUTE HISTORY STATS (For Dashboard Cards) ────────
finance.get('/dispute-history/stats', async (c) => {
  const totalDisputes = await c.env.DB.prepare('SELECT COUNT(*) as c FROM disputes').first();
  const pendingDisputes = await c.env.DB.prepare("SELECT COUNT(*) as c FROM disputes WHERE status = 'FILED' OR status = 'IN_MEDIATION'").first();
  const resolvedDisputes = await c.env.DB.prepare("SELECT COUNT(*) as c FROM disputes WHERE status IN ('RESOLVED','SETTLED','ARBITRATED','DISMISSED')").first();
  const flaggedEntities = await c.env.DB.prepare('SELECT COUNT(*) as c FROM dispute_history WHERE risk_score >= 40 OR disputes_as_respondent >= 3').first();
  const avgRisk = await c.env.DB.prepare('SELECT AVG(risk_score) as avg_risk FROM dispute_history WHERE total_disputes > 0').first();
  const byType = await c.env.DB.prepare('SELECT dispute_type, COUNT(*) as count FROM disputes GROUP BY dispute_type ORDER BY count DESC').all();
  const byStatus = await c.env.DB.prepare('SELECT status, COUNT(*) as count FROM disputes GROUP BY status ORDER BY count DESC').all();

  return c.json({
    data: {
      total_disputes: (totalDisputes as any)?.c || 0,
      pending_disputes: (pendingDisputes as any)?.c || 0,
      resolved_disputes: (resolvedDisputes as any)?.c || 0,
      flagged_entities: (flaggedEntities as any)?.c || 0,
      avg_risk_score: ((avgRisk as any)?.avg_risk || 0).toFixed(1),
      by_type: byType.results,
      by_status: byStatus.results,
    }
  });
});

// ─── ONGOING TRADES FOR CONTRACT WIZARD (Trade Selector) ──
finance.get('/trades/ongoing', async (c) => {
  const tenantId = c.req.query('tenant_id');
  let sql = `
    SELECT tr.id, tr.status, tr.raw_description, tr.parsed_specs, tr.created_at,
           t1.legal_name as importer_name, t1.gtid as importer_gtid,
           t2.legal_name as exporter_name, t2.gtid as exporter_gtid,
           eq.exw_price, eq.incoterm as quote_incoterm
    FROM trade_requests tr
    LEFT JOIN tenants t1 ON tr.importer_tenant_id = t1.id
    LEFT JOIN tenants t2 ON tr.assigned_exporter_id = t2.id
    LEFT JOIN exporter_quotes eq ON eq.trade_request_id = tr.id AND eq.status = 'ACCEPTED'
    WHERE tr.status IN ('QUOTED','NEGOTIATING','PENDING_EXPORTER_RESPONSE')
  `;
  if (tenantId) sql += ` AND (tr.importer_tenant_id = '${tenantId}' OR tr.assigned_exporter_id = '${tenantId}')`;
  sql += ' ORDER BY tr.created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ─── INSPECTIONS (QC Portal — Blueprint 6.2.4) ──────────
finance.get('/inspections', async (c) => {
  const tenantId = c.req.query('tenant_id');
  let sql = `SELECT i.*, s.origin_port, s.destination_port, s.status as shipment_status
    FROM inspections i
    LEFT JOIN shipments s ON i.shipment_ustn = s.ustn`;
  if (tenantId) sql += ` WHERE i.inspector_tenant_id = '${tenantId}'`;
  sql += ' ORDER BY i.created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

finance.post('/inspections', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'inspection.schedule', actor_gtid: body.actor_gtid || 'system',
    action_context: { shipment_ustn: body.shipment_ustn, inspector_tenant_id: body.inspector_tenant_id },
  });
  await c.env.DB.prepare(`
    INSERT INTO inspections (id, shipment_ustn, inspector_tenant_id, inspection_type, priority_pallets, product_details, status, governor_decision_id, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
  `).bind(id, body.shipment_ustn, body.inspector_tenant_id, body.inspection_type || 'PRE_SHIPMENT', JSON.stringify(body.priority_pallets || []), JSON.stringify(body.product_details || {}), gov.decision_id, body.scheduled_at || isoNow()).run();
  return c.json({ data: { id, governor_decision: gov }, message: 'Inspection scheduled' }, 201);
});

finance.patch('/inspections/:id', async (c) => {
  const body = await c.req.json();
  const id = c.req.param('id');
  await c.env.DB.prepare(`UPDATE inspections SET status = ?, result = ?, findings = ?, ai_summary = ?, completed_at = ? WHERE id = ?`)
    .bind(body.status || 'COMPLETED', body.result || null, JSON.stringify(body.findings || null), body.ai_summary || null, body.status === 'COMPLETED' ? isoNow() : null, id).run();
  return c.json({ message: 'Inspection updated' });
});

// ─── PAYMENT ORCHESTRATOR (Phase 9) ──────────────────
finance.get('/payment-aggregators', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM payment_aggregators WHERE is_active = 1').all();
  return c.json({ data: results });
});

finance.get('/payments', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT pa.*, ag.name as aggregator_name
    FROM payment_attempts pa
    JOIN payment_aggregators ag ON pa.aggregator_id = ag.id
    ORDER BY pa.created_at DESC
  `).all();
  return c.json({ data: results });
});

finance.post('/payments', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Select PSP based on country
  const aggregator = await c.env.DB.prepare("SELECT * FROM payment_aggregators WHERE country_codes LIKE ? AND is_active = 1 ORDER BY uptime_score DESC LIMIT 1").bind(`%${body.buyer_country}%`).first();
  if (!aggregator) return c.json({ error: 'No PSP available for country' }, 400);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'payment.initiate', actor_gtid: body.actor_gtid || 'system',
    action_context: { buyer_country: body.buyer_country, amount: body.amount_local, commission_lock_id: body.commission_lock_id },
    jurisdictions: [body.buyer_country],
  });

  await c.env.DB.prepare(`
    INSERT INTO payment_attempts (id, commission_lock_id, aggregator_id, buyer_country, payment_method, amount_local, currency_local, amount_usd, fx_rate, commission_amount_usd, exporter_amount, psp_fee_usd, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.commission_lock_id, aggregator.id, body.buyer_country, body.payment_method || 'BANK_TRANSFER', body.amount_local, body.currency_local || 'USD', body.amount_usd || body.amount_local, body.fx_rate || 1.0, body.commission_amount_usd, body.exporter_amount || 0, body.psp_fee_usd || 0, gov.decision_id).run();

  return c.json({ data: { payment_id: id, selected_psp: aggregator.name, governor_decision: gov }, message: 'Payment initiated' }, 201);
});

export default finance;

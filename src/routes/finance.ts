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

// ─── DISPUTES (Phase 10) ──────────────────────────────
finance.get('/disputes', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM disputes ORDER BY filed_at DESC').all();
  return c.json({ data: results });
});

finance.post('/disputes', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'dispute.file', actor_gtid: body.filing_party_gtid,
    action_context: { trade_request_id: body.trade_request_id, dispute_type: body.dispute_type },
  });

  await c.env.DB.prepare(`
    INSERT INTO disputes (id, trade_request_id, filing_party_gtid, dispute_type, description, evidence_links, governor_decision_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.trade_request_id, body.filing_party_gtid, body.dispute_type, body.description || null, JSON.stringify(body.evidence_links || []), gov.decision_id).run();

  // Freeze CommissionLock
  const contract = await c.env.DB.prepare('SELECT commission_lock_id FROM contracts WHERE trade_request_id = ?').bind(body.trade_request_id).first();
  if (contract?.commission_lock_id) {
    await c.env.DB.prepare("UPDATE commission_locks SET status = 'DISPUTED' WHERE lock_id = ?").bind(contract.commission_lock_id).run();
  }

  return c.json({ data: { id, governor_decision: gov }, message: 'Dispute filed, CommissionLock frozen' }, 201);
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

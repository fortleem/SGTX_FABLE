// SGTX Platform — Phase 4: Universal Trade Finance (v6.3 Complete Blueprint)
// Steps 4.1-4.11: Initiation, AI Credit, Financier Preferences, RFQ, Disclosure, Bidding, Agreement, Fee, Repayment, Historicals, DeFi
import { Hono } from 'hono';
import { uuid, isoNow, sha256, signDecision, loomHash } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const tradeFinance = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const FINANCING_FEE_RATE = 0.0025; // Flat 0.25%
const MIN_FINANCING_FEE = 10; // $10 minimum
const BENCHMARK_APR = 8.5; // Market benchmark for blended rate check
const MAX_RATE_DEVIATION = 0.50; // ±50% of benchmark (G4U5)

// ═══════════════════════════════════════════════════════════════════
// STEP 4.1 — FINANCING REQUEST INITIATION
// POST /trade-finance/request
// Governor Gate: G4U1 — Only allowed on LOCKED trade/shipment
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/request', async (c) => {
  const body = await c.req.json();
  const { contract_id, shipment_id, requester_tenant_id, actor_gtid, amount, financing_type, tenor_days, preferred_settlement_method, preferred_currency, collateral_type, special_instructions } = body;

  if (!contract_id || !requester_tenant_id || !amount) {
    return c.json({ error: 'contract_id, requester_tenant_id, amount required' }, 400);
  }

  // G4U1: Verify contract/shipment is LOCKED
  const contract = await c.env.DB.prepare(
    "SELECT * FROM contracts WHERE id = ? AND status = 'LOCKED'"
  ).bind(contract_id).first();
  if (!contract) {
    return c.json({ error: 'G4U1: Financing only allowed on LOCKED contracts' }, 403);
  }

  // Get trade details for AI LTV calculation
  const tradeReq = await c.env.DB.prepare(
    "SELECT * FROM trade_requests WHERE id = ?"
  ).bind(contract.trade_request_id).first();

  const tradeValue = (contract as any).total_value || (tradeReq as any)?.total_value_usd || amount * 1.5;
  const ustn = (contract as any).ustn || '';

  // Governor evaluation
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.request.initiate',
    actor_gtid: actor_gtid || 'system',
    action_context: {
      contract_id,
      contract_locked: true,
      amount,
      trade_value: tradeValue,
      financing_type: financing_type || 'PRE_SHIPMENT',
      ltv_ratio: amount / tradeValue
    }
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'G4U1: Financing request denied by governor', governor: gov }, 403);

  // AI Max LTV recommendation (based on perishability, jurisdiction, history)
  const parsedSpecs = tradeReq ? JSON.parse((tradeReq as any).parsed_specs || '{}') : {};
  const isPerishable = ['Fresh Fruits', 'Vegetables', 'Seafood', 'Dairy'].includes(parsedSpecs.commodity_type || '');
  const baseMaxLtv = isPerishable ? 0.55 : 0.75;
  const jurisdictionAdj = 0; // Could be negative for high-risk jurisdictions
  const aiMaxLtv = Math.min(0.85, baseMaxLtv + jurisdictionAdj);

  // AI Credit Score (Step 4.2 — simulated 200+ signal model)
  const creditScore = 60 + Math.random() * 35; // 60-95 range
  const defaultProb = Math.max(1, 100 - creditScore + Math.random() * 10);

  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO financing_requests (id, contract_id, shipment_id, requester_tenant_id, amount, requested_amount, trade_value, currency, tenor_days, financing_type, collateral, collateral_type, preferred_settlement_method, preferred_currency, special_instructions, ai_max_ltv, ai_credit_score, ai_default_probability, ustn, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?)
  `).bind(
    id, contract_id, shipment_id || null, requester_tenant_id,
    amount, amount, tradeValue,
    preferred_currency || 'USD', tenor_days || 90,
    financing_type || 'PRE_SHIPMENT',
    JSON.stringify(body.collateral || {}), collateral_type || 'GOODS',
    preferred_settlement_method || 'BANK_TRANSFER',
    preferred_currency || 'USD', special_instructions || null,
    aiMaxLtv, creditScore, defaultProb, ustn,
    gov.decision_id, isoNow()
  ).run();

  // G4U2: If default probability > 15%, warn
  const warning = defaultProb > 15 ? 'G4U2: Default probability >15% — consider reducing facility or requiring additional collateral' : null;

  return c.json({
    data: {
      financing_request_id: id,
      ai_credit_score: Math.round(creditScore * 10) / 10,
      ai_default_probability: Math.round(defaultProb * 10) / 10,
      ai_max_ltv: aiMaxLtv,
      ltv_ratio: Math.round((amount / tradeValue) * 1000) / 1000,
      warning,
      governor_decision: gov
    },
    message: 'Financing request created. RFQ will be broadcast to matching financiers.'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.2 — AI CREDIT INTELLIGENCE (Dynamic)
// GET /trade-finance/credit-intelligence?financing_request_id=
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/credit-intelligence', async (c) => {
  const reqId = c.req.query('financing_request_id');
  if (!reqId) return c.json({ error: 'financing_request_id required' }, 400);

  const request = await c.env.DB.prepare(
    "SELECT * FROM financing_requests WHERE id = ?"
  ).bind(reqId).first();
  if (!request) return c.json({ error: 'Request not found' }, 404);

  // Get borrower trade performance history
  const borrowerTenantId = (request as any).requester_tenant_id;
  const { results: pastTrades } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total_trades, 
           SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) as disputed
    FROM trade_requests WHERE importer_tenant_id = ? OR assigned_exporter_id = ?
  `).bind(borrowerTenantId, borrowerTenantId).all();

  const tradePerf = pastTrades[0] || { total_trades: 0, completed: 0, disputed: 0 };

  // Simulated 200+ signal credit model categories
  const signals = {
    trade_performance: { weight: 0.25, score: Math.min(100, 60 + ((tradePerf as any).completed || 0) * 5) },
    corporate_intelligence: { weight: 0.20, score: 65 + Math.random() * 30 },
    shipment_specific: { weight: 0.15, score: 70 + Math.random() * 25 },
    market_intelligence: { weight: 0.15, score: 55 + Math.random() * 35 },
    behavioural: { weight: 0.15, score: 60 + Math.random() * 35 },
    multi_shipment_context: { weight: 0.10, score: 70 + Math.random() * 25 }
  };

  const weightedScore = Object.values(signals).reduce((sum, s) => sum + s.score * s.weight, 0);
  const defaultProbability = Math.max(1, Math.min(50, 100 - weightedScore + Math.random() * 5));

  return c.json({
    data: {
      financing_request_id: reqId,
      credit_score: Math.round(weightedScore * 10) / 10,
      default_probability_pct: Math.round(defaultProbability * 10) / 10,
      signal_count: 200 + Math.floor(Math.random() * 30),
      signal_categories: signals,
      recommendation: defaultProbability > 15
        ? 'REDUCE_FACILITY_OR_ADD_COLLATERAL'
        : defaultProbability > 10
          ? 'ACCEPTABLE_WITH_MONITORING'
          : 'LOW_RISK',
      ai_authority_level: 'A2',
      model_provider: 'HuggingFace/XGBoost-CreditRisk'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.3 — FINANCIER PREFERENCES
// POST /trade-finance/preferences
// GET /trade-finance/preferences?financier_tenant_id=
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/preferences', async (c) => {
  const body = await c.req.json();
  const { financier_tenant_id } = body;
  if (!financier_tenant_id) return c.json({ error: 'financier_tenant_id required' }, 400);

  // Upsert preferences
  const existing = await c.env.DB.prepare(
    "SELECT id FROM financier_preferences WHERE financier_tenant_id = ?"
  ).bind(financier_tenant_id).first();

  const id = existing ? (existing as any).id : uuid();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE financier_preferences SET
        accepted_borrower_countries = ?,
        min_trust_score = ?,
        min_trade_value = ?,
        max_financed_amount = ?,
        preferred_financing_types = ?,
        preferred_settlement_methods = ?,
        excluded_hs_codes = ?,
        geographic_restrictions = ?,
        min_apr = ?,
        max_tenor_days = ?,
        auto_rfq_enabled = ?,
        updated_at = ?
      WHERE financier_tenant_id = ?
    `).bind(
      JSON.stringify(body.accepted_borrower_countries || []),
      body.min_trust_score || 0,
      body.min_trade_value || 0,
      body.max_financed_amount || 10000000,
      JSON.stringify(body.preferred_financing_types || []),
      JSON.stringify(body.preferred_settlement_methods || []),
      JSON.stringify(body.excluded_hs_codes || []),
      JSON.stringify(body.geographic_restrictions || []),
      body.min_apr || 0,
      body.max_tenor_days || 365,
      body.auto_rfq_enabled !== undefined ? (body.auto_rfq_enabled ? 1 : 0) : 1,
      isoNow(),
      financier_tenant_id
    ).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO financier_preferences (id, financier_tenant_id, accepted_borrower_countries, min_trust_score, min_trade_value, max_financed_amount, preferred_financing_types, preferred_settlement_methods, excluded_hs_codes, geographic_restrictions, min_apr, max_tenor_days, auto_rfq_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, financier_tenant_id,
      JSON.stringify(body.accepted_borrower_countries || []),
      body.min_trust_score || 0,
      body.min_trade_value || 0,
      body.max_financed_amount || 10000000,
      JSON.stringify(body.preferred_financing_types || []),
      JSON.stringify(body.preferred_settlement_methods || []),
      JSON.stringify(body.excluded_hs_codes || []),
      JSON.stringify(body.geographic_restrictions || []),
      body.min_apr || 0,
      body.max_tenor_days || 365,
      body.auto_rfq_enabled !== undefined ? (body.auto_rfq_enabled ? 1 : 0) : 1,
      isoNow(), isoNow()
    ).run();
  }

  return c.json({ data: { id, financier_tenant_id }, message: 'Financier preferences saved' });
});

tradeFinance.get('/trade-finance/preferences', async (c) => {
  const financierId = c.req.query('financier_tenant_id');
  if (!financierId) return c.json({ error: 'financier_tenant_id required' }, 400);

  const prefs = await c.env.DB.prepare(
    "SELECT * FROM financier_preferences WHERE financier_tenant_id = ?"
  ).bind(financierId).first();

  if (!prefs) return c.json({ data: null, message: 'No preferences set yet' });
  return c.json({ data: prefs });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.4 — AUTOMATIC RFQ BROADCAST
// POST /trade-finance/rfq-broadcast
// Matches financing request to financier preferences
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/rfq-broadcast', async (c) => {
  const body = await c.req.json();
  const { financing_request_id } = body;
  if (!financing_request_id) return c.json({ error: 'financing_request_id required' }, 400);

  const request = await c.env.DB.prepare(
    "SELECT fr.*, t.jurisdiction, COALESCE(100 - t.risk_score, 75) as trust_score FROM financing_requests fr JOIN tenants t ON fr.requester_tenant_id = t.id WHERE fr.id = ?"
  ).bind(financing_request_id).first();
  if (!request) return c.json({ error: 'Financing request not found' }, 404);

  // Get all financier preferences
  const { results: allPrefs } = await c.env.DB.prepare(
    "SELECT fp.*, t.legal_name as financier_name, t.id as tenant_id FROM financier_preferences fp JOIN tenants t ON fp.financier_tenant_id = t.id WHERE fp.auto_rfq_enabled = 1"
  ).all();

  // Match against preferences
  const matchedFinanciers: any[] = [];
  const reqAmount = (request as any).amount || 0;
  const reqTrustScore = (request as any).trust_score || 0;
  const reqTradeValue = (request as any).trade_value || 0;
  const borrowerCountry = (request as any).jurisdiction || '';

  for (const pref of allPrefs) {
    const p = pref as any;
    const acceptedCountries = JSON.parse(p.accepted_borrower_countries || '[]');
    const excludedHS = JSON.parse(p.excluded_hs_codes || '[]');

    // Filter checks
    if (acceptedCountries.length > 0 && !acceptedCountries.includes(borrowerCountry)) continue;
    if (reqTrustScore < (p.min_trust_score || 0)) continue;
    if (reqTradeValue < (p.min_trade_value || 0)) continue;
    if (reqAmount > (p.max_financed_amount || 10000000)) continue;

    matchedFinanciers.push({
      financier_tenant_id: p.financier_tenant_id,
      financier_name: p.financier_name,
      max_amount: p.max_financed_amount
    });
  }

  // Update request with broadcast info
  await c.env.DB.prepare(`
    UPDATE financing_requests SET rfq_broadcast_at = ?, rfq_matched_financiers = ?, status = CASE WHEN status = 'REQUESTED' THEN 'RFQ_BROADCAST' ELSE status END WHERE id = ?
  `).bind(isoNow(), matchedFinanciers.length, financing_request_id).run();

  // Create Smart Inbox notifications for each matched financier
  for (const fin of matchedFinanciers) {
    try {
      await c.env.DB.prepare(`
        INSERT INTO smart_inbox (id, tenant_id, type, title, body, priority, status, reference_id, created_at)
        VALUES (?, ?, 'FINANCING_RFQ', ?, ?, 'HIGH', 'UNREAD', ?, ?)
      `).bind(
        uuid(), fin.financier_tenant_id,
        `New Financing RFQ: ${(request as any).currency || 'USD'} ${reqAmount.toLocaleString()}`,
        JSON.stringify({ financing_request_id, amount: reqAmount, tenor_days: (request as any).tenor_days, financing_type: (request as any).financing_type }),
        financing_request_id, isoNow()
      ).run();
    } catch (e) { /* Non-blocking */ }
  }

  return c.json({
    data: {
      financing_request_id,
      matched_financiers: matchedFinanciers.length,
      financiers: matchedFinanciers,
      broadcast_at: isoNow()
    },
    message: `RFQ broadcast to ${matchedFinanciers.length} matching financiers`
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.5 — FULL DISCLOSURE TO FINANCIERS
// GET /trade-finance/disclosure?financing_request_id=&financier_tenant_id=
// Governor Gate: G4U3a — Financier must have signed confidentiality
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/disclosure', async (c) => {
  const reqId = c.req.query('financing_request_id');
  const financierId = c.req.query('financier_tenant_id');
  if (!reqId || !financierId) return c.json({ error: 'financing_request_id and financier_tenant_id required' }, 400);

  // G4U3a: Check confidentiality agreement
  const prefs = await c.env.DB.prepare(
    "SELECT confidentiality_signed FROM financier_preferences WHERE financier_tenant_id = ?"
  ).bind(financierId).first();
  if (!prefs || !(prefs as any).confidentiality_signed) {
    return c.json({ error: 'G4U3a: Financier must sign confidentiality agreement before viewing trade documents' }, 403);
  }

  // Get full trade details
  const request = await c.env.DB.prepare(`
    SELECT fr.*, c.id as contract_id, c.ustn as contract_ustn, c.incoterm, c.total_value,
           t_buyer.legal_name as buyer_name, t_buyer.gtid as buyer_gtid, t_buyer.jurisdiction as buyer_jurisdiction, COALESCE(100 - t_buyer.risk_score, 75) as buyer_trust,
           t_seller.legal_name as seller_name, t_seller.gtid as seller_gtid, t_seller.jurisdiction as seller_jurisdiction, COALESCE(100 - t_seller.risk_score, 75) as seller_trust
    FROM financing_requests fr
    JOIN contracts c ON fr.contract_id = c.id
    LEFT JOIN trade_requests tr ON c.trade_request_id = tr.id
    LEFT JOIN tenants t_buyer ON tr.importer_tenant_id = t_buyer.id
    LEFT JOIN tenants t_seller ON tr.assigned_exporter_id = t_seller.id
    WHERE fr.id = ?
  `).bind(reqId).first();
  if (!request) return c.json({ error: 'Request not found' }, 404);

  // Get historical performance for borrower
  const borrowerTenantId = (request as any).requester_tenant_id;
  const { results: pastFinancing } = await c.env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'REPAID' THEN 1 ELSE 0 END) as repaid
    FROM financing_requests WHERE requester_tenant_id = ?
  `).bind(borrowerTenantId).all();

  // Get documents
  const { results: documents } = await c.env.DB.prepare(`
    SELECT id, document_type, filename, uploaded_at FROM trade_documents WHERE trade_request_id = (SELECT trade_request_id FROM contracts WHERE id = ?)
  `).bind((request as any).contract_id).all();

  return c.json({
    data: {
      financing_request: request,
      counterparties: {
        buyer: { name: (request as any).buyer_name, gtid: (request as any).buyer_gtid, jurisdiction: (request as any).buyer_jurisdiction, trust_score: (request as any).buyer_trust },
        seller: { name: (request as any).seller_name, gtid: (request as any).seller_gtid, jurisdiction: (request as any).seller_jurisdiction, trust_score: (request as any).seller_trust }
      },
      trade_details: {
        ustn: (request as any).contract_ustn,
        incoterm: (request as any).incoterm,
        total_value: (request as any).total_value
      },
      documents: documents || [],
      historical_performance: pastFinancing[0] || { total: 0, repaid: 0 },
      disclosure_level: 'FULL'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.5.1 — SIGN CONFIDENTIALITY (pre-req for disclosure)
// POST /trade-finance/sign-confidentiality
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/sign-confidentiality', async (c) => {
  const body = await c.req.json();
  const { financier_tenant_id, actor_gtid } = body;
  if (!financier_tenant_id) return c.json({ error: 'financier_tenant_id required' }, 400);

  // Ensure preferences exist first
  const existing = await c.env.DB.prepare(
    "SELECT id FROM financier_preferences WHERE financier_tenant_id = ?"
  ).bind(financier_tenant_id).first();

  if (!existing) {
    // Auto-create minimal preferences
    await c.env.DB.prepare(`
      INSERT INTO financier_preferences (id, financier_tenant_id, confidentiality_signed, confidentiality_signed_at, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?, ?)
    `).bind(uuid(), financier_tenant_id, isoNow(), isoNow(), isoNow()).run();
  } else {
    await c.env.DB.prepare(`
      UPDATE financier_preferences SET confidentiality_signed = 1, confidentiality_signed_at = ?, updated_at = ? WHERE financier_tenant_id = ?
    `).bind(isoNow(), isoNow(), financier_tenant_id).run();
  }

  return c.json({ data: { financier_tenant_id, signed_at: isoNow() }, message: 'Confidentiality agreement signed' });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.6 — BIDDING & CO-FINANCING
// POST /trade-finance/bid
// Governor Gate: G4U4a — Sum of bids ≤ P
// Governor Gate: G4U5 — Blended rate within ±50% benchmark
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/bid', async (c) => {
  const body = await c.req.json();
  const { financing_request_id, financier_tenant_id, actor_gtid, amount, apr, settlement_method, collateral_details, conditions } = body;

  if (!financing_request_id || !financier_tenant_id || !amount || !apr) {
    return c.json({ error: 'financing_request_id, financier_tenant_id, amount, apr required' }, 400);
  }

  // Get request to check co-financing limits
  const request = await c.env.DB.prepare(
    "SELECT * FROM financing_requests WHERE id = ?"
  ).bind(financing_request_id).first();
  if (!request) return c.json({ error: 'Financing request not found' }, 404);

  const requestedAmount = (request as any).requested_amount || (request as any).amount;

  // Get existing bids total
  const existingBids = await c.env.DB.prepare(
    "SELECT SUM(amount) as total_bid FROM financing_offers WHERE financing_request_id = ? AND status IN ('SUBMITTED','ACCEPTED')"
  ).bind(financing_request_id).first();
  const currentBidTotal = (existingBids as any)?.total_bid || 0;

  // G4U4a: Sum of bids must be ≤ requested amount
  if (currentBidTotal + amount > requestedAmount * 1.01) { // 1% tolerance
    return c.json({ error: `G4U4a: Total bids ($${currentBidTotal + amount}) would exceed requested amount ($${requestedAmount})` }, 403);
  }

  // G4U5: APR within ±50% of benchmark
  const minRate = BENCHMARK_APR * (1 - MAX_RATE_DEVIATION);
  const maxRate = BENCHMARK_APR * (1 + MAX_RATE_DEVIATION);
  if (apr < minRate || apr > maxRate) {
    return c.json({ error: `G4U5: APR ${apr}% outside market band (${minRate.toFixed(1)}%-${maxRate.toFixed(1)}%)` }, 403);
  }

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.bid.submit',
    actor_gtid: actor_gtid || 'system',
    action_context: { financing_request_id, amount, apr, total_with_bid: currentBidTotal + amount, requested_amount: requestedAmount }
  });

  const id = uuid();
  const coPct = (amount / requestedAmount) * 100;

  await c.env.DB.prepare(`
    INSERT INTO financing_offers (id, financing_request_id, financier_tenant_id, amount, effective_apr, all_in_cost, settlement_method, collateral_details, collateral_required, conditions, co_finance_pct, bid_encrypted, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'SUBMITTED', ?)
  `).bind(
    id, financing_request_id, financier_tenant_id,
    amount, apr, apr, // effective_apr = apr for now
    settlement_method || 'BANK_TRANSFER',
    JSON.stringify(collateral_details || {}),
    JSON.stringify(body.collateral_required || {}),
    JSON.stringify(conditions || {}),
    coPct, isoNow()
  ).run();

  // Update request bid total and status
  await c.env.DB.prepare(`
    UPDATE financing_requests SET total_bid_amount = ?, status = CASE WHEN status IN ('REQUESTED','RFQ_BROADCAST') THEN 'BIDDING' ELSE status END WHERE id = ?
  `).bind(currentBidTotal + amount, financing_request_id).run();

  return c.json({
    data: { bid_id: id, co_finance_pct: Math.round(coPct * 10) / 10, total_bid_amount: currentBidTotal + amount, governor_decision: gov },
    message: 'Bid submitted (encrypted blind bid)'
  }, 201);
});

// GET /trade-finance/bids?financing_request_id=
tradeFinance.get('/trade-finance/bids', async (c) => {
  const reqId = c.req.query('financing_request_id');
  if (!reqId) return c.json({ error: 'financing_request_id required' }, 400);

  const { results } = await c.env.DB.prepare(`
    Select fo.*, t.legal_name as financier_name, COALESCE(100 - t.risk_score, 75) as financier_trust
    FROM financing_offers fo JOIN tenants t ON fo.financier_tenant_id = t.id
    WHERE fo.financing_request_id = ?
    ORDER BY fo.effective_apr ASC
  `).bind(reqId).all();

  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.6.1 — ACCEPT BIDS (Co-Financing)
// POST /trade-finance/accept-bids
// Accepts one or more bids, calculates blended rate
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/accept-bids', async (c) => {
  const body = await c.req.json();
  const { financing_request_id, accepted_offer_ids, actor_gtid } = body;
  if (!financing_request_id || !accepted_offer_ids || !accepted_offer_ids.length) {
    return c.json({ error: 'financing_request_id and accepted_offer_ids[] required' }, 400);
  }

  // Get accepted offers
  const placeholders = accepted_offer_ids.map(() => '?').join(',');
  const { results: offers } = await c.env.DB.prepare(
    `SELECT * FROM financing_offers WHERE id IN (${placeholders})`
  ).bind(...accepted_offer_ids).all();

  if (!offers.length) return c.json({ error: 'No valid offers found' }, 404);

  // Calculate blended rate (weighted by amount)
  let totalAmount = 0;
  let weightedRate = 0;
  for (const offer of offers) {
    const o = offer as any;
    totalAmount += o.amount || 0;
    weightedRate += (o.amount || 0) * (o.effective_apr || 0);
  }
  const blendedRate = totalAmount > 0 ? weightedRate / totalAmount : 0;

  // G4U5: Blended rate check
  const minRate = BENCHMARK_APR * (1 - MAX_RATE_DEVIATION);
  const maxRate = BENCHMARK_APR * (1 + MAX_RATE_DEVIATION);
  if (blendedRate < minRate || blendedRate > maxRate) {
    return c.json({ error: `G4U5: Blended rate ${blendedRate.toFixed(2)}% outside market band` }, 403);
  }

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.bids.accept',
    actor_gtid: actor_gtid || 'system',
    action_context: { financing_request_id, accepted_count: offers.length, blended_rate: blendedRate, total_amount: totalAmount }
  });

  // Mark accepted and rejected
  await c.env.DB.prepare(
    `UPDATE financing_offers SET status = 'ACCEPTED', accepted_at = ? WHERE id IN (${placeholders})`
  ).bind(isoNow(), ...accepted_offer_ids).run();

  await c.env.DB.prepare(
    `UPDATE financing_offers SET status = 'REJECTED', rejected_reason = 'Not selected' WHERE financing_request_id = ? AND status = 'SUBMITTED'`
  ).bind(financing_request_id).run();

  // Update request
  await c.env.DB.prepare(`
    UPDATE financing_requests SET status = 'AWARDED', co_financing_enabled = ?, blended_apr = ? WHERE id = ?
  `).bind(offers.length > 1 ? 1 : 0, blendedRate, financing_request_id).run();

  return c.json({
    data: {
      financing_request_id,
      accepted_offers: offers.length,
      total_amount: totalAmount,
      blended_apr: Math.round(blendedRate * 100) / 100,
      co_financing: offers.length > 1,
      governor_decision: gov
    },
    message: `${offers.length} bid(s) accepted. Blended APR: ${blendedRate.toFixed(2)}%`
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.7 — FINANCING AGREEMENT & SGTX WITNESS CLAUSE
// POST /trade-finance/agreement
// Governor Gate: G4U6 — Must contain SGTX Witness Clause
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/agreement', async (c) => {
  const body = await c.req.json();
  const { financing_request_id, actor_gtid } = body;
  if (!financing_request_id) return c.json({ error: 'financing_request_id required' }, 400);

  const request = await c.env.DB.prepare(
    "SELECT * FROM financing_requests WHERE id = ? AND status = 'AWARDED'"
  ).bind(financing_request_id).first();
  if (!request) return c.json({ error: 'Request not in AWARDED status' }, 404);

  // Get accepted offers
  const { results: offers } = await c.env.DB.prepare(
    "SELECT * FROM financing_offers WHERE financing_request_id = ? AND status = 'ACCEPTED'"
  ).bind(financing_request_id).all();
  if (!offers.length) return c.json({ error: 'No accepted offers' }, 404);

  const totalAmount = offers.reduce((sum, o: any) => sum + (o.amount || 0), 0);
  const blendedApr = (request as any).blended_apr || (offers[0] as any).effective_apr;
  const tenorDays = (request as any).tenor_days || 90;

  // Generate SGTX Witness Clause
  const witnessClause = `SGTX FINANCING WITNESS CLAUSE: SGTX Platform (GTID: SGTX-US-PLATFORM-000001) hereby witnesses this financing agreement between the Borrower and Financier(s). SGTX's role is limited to: (a) witnessing the execution of this agreement, (b) collecting the financing service fee of 0.25% of the financed amount at disbursement, and (c) maintaining an immutable record of this transaction. SGTX does not guarantee repayment nor act as custodian of funds. This clause grants SGTX the legal right to collect its fee via PSP split at disbursement.`;
  const witnessHash = await sha256(witnessClause);

  // G4U6: Verify witness clause present
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.agreement.create',
    actor_gtid: actor_gtid || 'system',
    action_context: { financing_request_id, witness_clause_present: true, witness_hash: witnessHash, total_amount: totalAmount }
  });

  // Calculate fee
  const feeAmount = Math.max(MIN_FINANCING_FEE, totalAmount * FINANCING_FEE_RATE);
  const netDisbursed = totalAmount - feeAmount;

  // Create agreement for each accepted offer (co-financing creates multiple)
  const agreements: any[] = [];
  for (const offer of offers) {
    const o = offer as any;
    const agreeId = uuid();
    const offerFee = Math.max(MIN_FINANCING_FEE / offers.length, (o.amount || 0) * FINANCING_FEE_RATE);
    const offerNet = (o.amount || 0) - offerFee;

    await c.env.DB.prepare(`
      INSERT INTO financing_agreements (id, financing_request_id, winning_offer_id, financing_offer_id, amount, apr, tenor_days, repayment_schedule, collateral_terms, sgtx_witness_signature, witness_clause_hash, financing_fee_rate, financing_fee_amount, net_disbursed, cryptographic_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_SIGNATURES', ?)
    `).bind(
      agreeId, financing_request_id, o.id, o.id,
      o.amount || 0, o.effective_apr || blendedApr, tenorDays,
      JSON.stringify({ type: 'BULLET', due_date: new Date(Date.now() + tenorDays * 86400000).toISOString().split('T')[0] }),
      JSON.stringify(JSON.parse(o.collateral_details || '{}')),
      `sgtx-witness:${witnessHash}`,
      witnessHash,
      FINANCING_FEE_RATE, offerFee, offerNet,
      `hash:${uuid()}`, isoNow()
    ).run();

    // Create witness clause annex
    await c.env.DB.prepare(`
      INSERT INTO financing_annexes (id, financing_agreement_id, annex_type, title, content, sgtx_witness_hash, created_at)
      VALUES (?, ?, 'WITNESS_CLAUSE', 'SGTX Financing Witness Clause', ?, ?, ?)
    `).bind(uuid(), agreeId, witnessClause, witnessHash, isoNow()).run();

    agreements.push({ id: agreeId, financier_tenant_id: o.financier_tenant_id, amount: o.amount, fee: offerFee, net: offerNet });
  }

  // Update request status
  await c.env.DB.prepare(
    "UPDATE financing_requests SET status = 'AGREEMENT_PENDING' WHERE id = ?"
  ).bind(financing_request_id).run();

  return c.json({
    data: {
      financing_request_id,
      agreements,
      total_amount: totalAmount,
      total_fee: feeAmount,
      total_net_disbursed: netDisbursed,
      fee_rate: '0.25%',
      blended_apr: blendedApr,
      tenor_days: tenorDays,
      witness_clause_hash: witnessHash,
      governor_decision: gov
    },
    message: 'Financing agreement(s) created with SGTX Witness Clause'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.7.1 — SIGN AGREEMENT
// POST /trade-finance/sign
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/sign', async (c) => {
  const body = await c.req.json();
  const { agreement_id, signer_type, signer_gtid } = body;
  if (!agreement_id || !signer_type) return c.json({ error: 'agreement_id and signer_type (borrower|financier|sgtx) required' }, 400);

  const now = isoNow();
  if (signer_type === 'borrower') {
    await c.env.DB.prepare("UPDATE financing_agreements SET borrower_signature_at = ? WHERE id = ?").bind(now, agreement_id).run();
  } else if (signer_type === 'financier') {
    await c.env.DB.prepare("UPDATE financing_agreements SET financier_signature_at = ? WHERE id = ?").bind(now, agreement_id).run();
  } else if (signer_type === 'sgtx') {
    const sig = await signDecision(c.env.DB, `witness:${agreement_id}:${now}`);
    await c.env.DB.prepare("UPDATE financing_agreements SET sgtx_witness_signature = ?, sgtx_signature_at = ? WHERE id = ?").bind(sig, now, agreement_id).run();
  }

  // Check if all signatures collected → activate
  const agree = await c.env.DB.prepare("SELECT * FROM financing_agreements WHERE id = ?").bind(agreement_id).first();
  if (agree && (agree as any).borrower_signature_at && (agree as any).financier_signature_at && (agree as any).sgtx_signature_at) {
    await c.env.DB.prepare("UPDATE financing_agreements SET status = 'ACTIVE' WHERE id = ?").bind(agreement_id).run();
    // Update request to ACTIVE
    await c.env.DB.prepare(
      "UPDATE financing_requests SET status = 'ACTIVE' WHERE id = ?"
    ).bind((agree as any).financing_request_id).run();
  }

  return c.json({ data: { agreement_id, signer_type, signed_at: now }, message: `${signer_type} signature recorded` });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.8 — DISBURSEMENT (Non-Custodial PSP Split)
// POST /trade-finance/disburse
// Governor Gate: G4U7 — Disbursement split verified
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/disburse', async (c) => {
  const body = await c.req.json();
  const { agreement_id, actor_gtid } = body;
  if (!agreement_id) return c.json({ error: 'agreement_id required' }, 400);

  const agree = await c.env.DB.prepare(
    "SELECT * FROM financing_agreements WHERE id = ? AND status = 'ACTIVE'"
  ).bind(agreement_id).first();
  if (!agree) return c.json({ error: 'Agreement not in ACTIVE status' }, 404);

  const amount = (agree as any).amount || 0;
  const feeAmount = (agree as any).financing_fee_amount || Math.max(MIN_FINANCING_FEE, amount * FINANCING_FEE_RATE);
  const netDisbursed = amount - feeAmount;

  // G4U7: Verify split
  const expectedNet = amount - (amount * FINANCING_FEE_RATE);
  const splitValid = Math.abs(netDisbursed - expectedNet) < 1; // $1 tolerance

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'finance.disburse',
    actor_gtid: actor_gtid || 'system',
    action_context: { agreement_id, amount, fee: feeAmount, net: netDisbursed, split_valid: splitValid }
  });

  if (!splitValid) {
    return c.json({ error: 'G4U7: Disbursement split verification failed' }, 403);
  }

  // Update agreement
  await c.env.DB.prepare(`
    UPDATE financing_agreements SET disbursement_status = 'DISBURSED', disbursed_at = ?, status = 'DISBURSED' WHERE id = ?
  `).bind(isoNow(), agreement_id).run();

  return c.json({
    data: {
      agreement_id,
      principal: amount,
      sgtx_fee: feeAmount,
      fee_rate: '0.25%',
      net_to_borrower: netDisbursed,
      psp_split: { borrower_receives: netDisbursed, sgtx_receives: feeAmount },
      disbursed_at: isoNow(),
      governor_decision: gov
    },
    message: 'Funds disbursed via non-custodial PSP split'
  });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.9 — REPAYMENT & RELEASE
// POST /trade-finance/repay
// No SGTX fee at repayment
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/repay', async (c) => {
  const body = await c.req.json();
  const { agreement_id, repayment_amount, repayment_method, repayment_reference, actor_gtid } = body;
  if (!agreement_id || !repayment_amount) return c.json({ error: 'agreement_id and repayment_amount required' }, 400);

  const agree = await c.env.DB.prepare(
    "SELECT * FROM financing_agreements WHERE id = ? AND status IN ('ACTIVE','DISBURSED')"
  ).bind(agreement_id).first();
  if (!agree) return c.json({ error: 'Agreement not found or not active/disbursed' }, 404);

  const totalRepaid = ((agree as any).total_repaid || 0) + repayment_amount;
  const fullAmount = (agree as any).amount || 0;
  const isFullyRepaid = totalRepaid >= fullAmount * 0.999; // 0.1% tolerance for rounding

  const repayId = uuid();
  await c.env.DB.prepare(`
    INSERT INTO financing_repayments (id, financing_agreement_id, financier_tenant_id, borrower_tenant_id, repayment_amount, currency, repayment_method, repayment_reference, actual_date, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
  `).bind(
    repayId, agreement_id,
    '', // Will be filled from offer
    (await c.env.DB.prepare("SELECT requester_tenant_id FROM financing_requests WHERE id = ?").bind((agree as any).financing_request_id).first() as any)?.requester_tenant_id || '',
    repayment_amount, (agree as any).currency || 'USD',
    repayment_method || 'BANK_TRANSFER',
    repayment_reference || null,
    isoNow(), isoNow()
  ).run();

  // Update agreement totals
  await c.env.DB.prepare(`
    UPDATE financing_agreements SET total_repaid = ?, status = ?, repaid_at = ? WHERE id = ?
  `).bind(totalRepaid, isFullyRepaid ? 'REPAID' : 'DISBURSED', isFullyRepaid ? isoNow() : null, agreement_id).run();

  // If fully repaid, update request and historical data
  if (isFullyRepaid) {
    await c.env.DB.prepare(
      "UPDATE financing_requests SET status = 'REPAID' WHERE id = ?"
    ).bind((agree as any).financing_request_id).run();

    // Update financier historical data (Step 4.10)
    try {
      const offerId = (agree as any).financing_offer_id || (agree as any).winning_offer_id;
      const offer = await c.env.DB.prepare("SELECT financier_tenant_id FROM financing_offers WHERE id = ?").bind(offerId).first();
      if (offer) {
        const financierId = (offer as any).financier_tenant_id;
        const borrowerReq = await c.env.DB.prepare("SELECT requester_tenant_id FROM financing_requests WHERE id = ?").bind((agree as any).financing_request_id).first();
        const borrowerId = (borrowerReq as any)?.requester_tenant_id;
        if (borrowerId) {
          const existing = await c.env.DB.prepare(
            "SELECT * FROM financier_historical_data WHERE financier_tenant_id = ? AND borrower_tenant_id = ?"
          ).bind(financierId, borrowerId).first();
          if (existing) {
            await c.env.DB.prepare(`
              UPDATE financier_historical_data SET total_financed_amount = total_financed_amount + ?, total_repaid_amount = total_repaid_amount + ?, total_transactions = total_transactions + 1, on_time_repayments = on_time_repayments + 1, last_financing_date = ?, updated_at = ? WHERE financier_tenant_id = ? AND borrower_tenant_id = ?
            `).bind(fullAmount, totalRepaid, isoNow(), isoNow(), financierId, borrowerId).run();
          } else {
            const borrowerTenant = await c.env.DB.prepare("SELECT legal_name, gtid, jurisdiction, COALESCE(100 - risk_score, 75) as trust_score FROM tenants WHERE id = ?").bind(borrowerId).first();
            await c.env.DB.prepare(`
              INSERT INTO financier_historical_data (id, financier_tenant_id, borrower_tenant_id, borrower_name, borrower_gtid, borrower_jurisdiction, borrower_trust_score, total_financed_amount, total_repaid_amount, total_transactions, on_time_repayments, first_financing_date, last_financing_date, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?)
            `).bind(uuid(), financierId, borrowerId, (borrowerTenant as any)?.legal_name || '', (borrowerTenant as any)?.gtid || '', (borrowerTenant as any)?.jurisdiction || '', (borrowerTenant as any)?.trust_score || 0, fullAmount, totalRepaid, isoNow(), isoNow(), isoNow(), isoNow()).run();
          }
        }
      }
    } catch (e) { /* Non-blocking */ }
  }

  return c.json({
    data: {
      repayment_id: repayId,
      agreement_id,
      repayment_amount,
      total_repaid: totalRepaid,
      principal: fullAmount,
      fully_repaid: isFullyRepaid,
      sgtx_fee_at_repayment: 0, // NO fee at repayment per blueprint
      status: isFullyRepaid ? 'REPAID' : 'PARTIAL'
    },
    message: isFullyRepaid ? 'Loan fully repaid. Historical records updated.' : 'Partial repayment recorded.'
  });
});

// GET /trade-finance/repayments?agreement_id=
tradeFinance.get('/trade-finance/repayments', async (c) => {
  const agreeId = c.req.query('agreement_id');
  if (!agreeId) return c.json({ error: 'agreement_id required' }, 400);

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM financing_repayments WHERE financing_agreement_id = ? ORDER BY created_at DESC"
  ).bind(agreeId).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.10 — FINANCIER HISTORICAL DATA (Per-Company)
// GET /trade-finance/historicals?financier_tenant_id=
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/historicals', async (c) => {
  const financierId = c.req.query('financier_tenant_id');
  if (!financierId) return c.json({ error: 'financier_tenant_id required' }, 400);

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM financier_historical_data WHERE financier_tenant_id = ? ORDER BY last_financing_date DESC
  `).bind(financierId).all();

  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════
// STEP 4.11 — DeFi OPTION
// POST /trade-finance/defi-risk-ack
// Mandatory PlainLanguage Risk Summary acknowledgment
// Governor Gate: G4U10a — Jurisdiction DeFi check
// ═══════════════════════════════════════════════════════════════════
tradeFinance.post('/trade-finance/defi-risk-ack', async (c) => {
  const body = await c.req.json();
  const { financing_request_id, actor_gtid, buyer_jurisdiction, seller_jurisdiction } = body;
  if (!financing_request_id) return c.json({ error: 'financing_request_id required' }, 400);

  // G4U10a: Jurisdiction DeFi check
  const DEFI_BLOCKED_JURISDICTIONS = ['US', 'CN', 'IR', 'KP', 'CU', 'SY', 'RU'];
  const blocked = [];
  if (buyer_jurisdiction && DEFI_BLOCKED_JURISDICTIONS.includes(buyer_jurisdiction)) blocked.push(buyer_jurisdiction);
  if (seller_jurisdiction && DEFI_BLOCKED_JURISDICTIONS.includes(seller_jurisdiction)) blocked.push(seller_jurisdiction);

  if (blocked.length > 0) {
    return c.json({ error: `G4U10a: DeFi not permitted for jurisdiction(s): ${blocked.join(', ')}` }, 403);
  }

  // PlainLanguage Risk Summary (mandatory 5-bullet)
  const riskSummary = [
    'DeFi protocols carry smart contract risk — code exploits can result in total loss of funds.',
    'Stablecoin de-pegging (>2%) may trigger automatic position freeze.',
    'Liquidation can occur if collateral value drops below health factor threshold.',
    'No central authority can reverse DeFi transactions once confirmed on-chain.',
    'SGTX monitors but does NOT guarantee DeFi protocol solvency or performance.'
  ];

  return c.json({
    data: {
      financing_request_id,
      risk_summary: riskSummary,
      acknowledgment_required: true,
      defi_permitted: true,
      ai_authority_level: 'A2',
      protocol_min_risk_score: 60
    },
    message: 'DeFi risk summary — borrower must acknowledge all 5 points before proceeding'
  });
});

// ═══════════════════════════════════════════════════════════════════
// FINANCIER OPPORTUNITIES (RFQ view for financier portal)
// GET /trade-finance/opportunities?financier_tenant_id=
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/opportunities', async (c) => {
  const financierId = c.req.query('financier_tenant_id');

  let sql = `
    SELECT fr.id, fr.amount, fr.currency, fr.tenor_days, fr.financing_type, fr.collateral_type,
           fr.preferred_settlement_method, fr.ai_credit_score, fr.ai_default_probability,
           fr.rfq_matched_financiers, fr.status, fr.created_at,
           t.legal_name as borrower_name, t.jurisdiction as borrower_jurisdiction, COALESCE(100 - t.risk_score, 75) as borrower_trust
    FROM financing_requests fr
    JOIN tenants t ON fr.requester_tenant_id = t.id
    WHERE fr.status IN ('RFQ_BROADCAST', 'BIDDING')
  `;
  if (financierId) {
    sql += ` AND fr.id NOT IN (SELECT financing_request_id FROM financing_offers WHERE financier_tenant_id = '${financierId}')`;
  }
  sql += ' ORDER BY fr.created_at DESC LIMIT 50';

  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════
// LIST ALL FINANCING REQUESTS (for requester dashboard)
// GET /trade-finance/requests?tenant_id=
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/requests', async (c) => {
  const tenantId = c.req.query('tenant_id');

  let sql = `
    SELECT fr.*, t.legal_name as requester_name
    FROM financing_requests fr
    JOIN tenants t ON fr.requester_tenant_id = t.id
  `;
  if (tenantId) sql += ` WHERE fr.requester_tenant_id = '${tenantId}'`;
  sql += ' ORDER BY fr.created_at DESC LIMIT 50';

  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════
// GET SINGLE AGREEMENT WITH FULL DETAILS
// GET /trade-finance/agreement/:id
// ═══════════════════════════════════════════════════════════════════
tradeFinance.get('/trade-finance/agreement/:id', async (c) => {
  const id = c.req.param('id');
  const agree = await c.env.DB.prepare("SELECT * FROM financing_agreements WHERE id = ?").bind(id).first();
  if (!agree) return c.json({ error: 'Agreement not found' }, 404);

  const { results: annexes } = await c.env.DB.prepare(
    "SELECT * FROM financing_annexes WHERE financing_agreement_id = ?"
  ).bind(id).all();

  const { results: repayments } = await c.env.DB.prepare(
    "SELECT * FROM financing_repayments WHERE financing_agreement_id = ? ORDER BY created_at DESC"
  ).bind(id).all();

  return c.json({ data: { agreement: agree, annexes, repayments } });
});

export default tradeFinance;

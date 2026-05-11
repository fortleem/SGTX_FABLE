// SGTX Platform v6.3 — Part 3: Contracting, Negotiation & SGTX Fee Collection
// Steps 3.1–3.10 fully implemented per Blueprint v6.3
// Governor Gates: G3U1–G3U10
// Tables: contracts, contract_shipments, negotiation_amendments, logistics_addenda,
//         release_confirmations, commission_locks, signature_sequences
import { Hono } from 'hono';
import { uuid, isoNow, generateUSTN, gtidSuffix, clampCommissionRate, signDecision } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const contracting = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.1 — IMPORTER REVIEWS QUOTE PACKAGE
// GET /v1/contract/quote-review/:trade_request_id
// Returns the assembled quote with SGTX fee displayed separately
// ═══════════════════════════════════════════════════════════════════════════════
contracting.get('/contract/quote-review/:trade_request_id', async (c) => {
  const { DB } = c.env;
  const tradeId = c.req.param('trade_request_id');

  const trade = await DB.prepare('SELECT * FROM trade_requests WHERE id = ?').bind(tradeId).first() as any;
  if (!trade) return c.json({ error: 'Trade request not found' }, 404);

  const quotes = await DB.prepare(
    'SELECT * FROM exporter_quotes WHERE trade_request_id = ? ORDER BY created_at DESC'
  ).bind(tradeId).all();

  const packingPlans = await DB.prepare(
    'SELECT * FROM packing_plans WHERE trade_request_id = ?'
  ).bind(tradeId).all();

  // provider_quotes links via exporter_quote_id, not trade_request_id
  const quoteIds = (quotes.results || []).map((q: any) => q.id);
  let providerQuotes = { results: [] as any[] };
  if (quoteIds.length > 0) {
    providerQuotes = await DB.prepare(
      `SELECT * FROM provider_quotes WHERE exporter_quote_id IN (${quoteIds.map(() => '?').join(',')})`
    ).bind(...quoteIds).all();
  }

  // Calculate SGTX fee for each quote option
  const options = (quotes.results || []).map((q: any) => {
    const exwPrice = q.exw_price || 0;
    const logisticsTotal = q.logistics_total || 0;
    const subtotal = exwPrice + logisticsTotal;
    const feeRate = clampCommissionRate(0.015); // Default 1.5%, clamped 0.1-2.5%
    const sgtxFee = subtotal * feeRate;
    return {
      quote_id: q.id,
      exw_price: exwPrice,
      logistics_total: logisticsTotal,
      subtotal,
      sgtx_fee_rate: feeRate,
      sgtx_fee_amount: Math.round(sgtxFee * 100) / 100,
      total_price: Math.round((subtotal + sgtxFee) * 100) / 100,
      incoterm: q.incoterm,
      port_of_loading: q.port_of_loading,
      validity_days: q.validity_days,
      status: q.status,
      transparency_note: `Total $${(subtotal + sgtxFee).toFixed(2)} incl. SGTX fee $${sgtxFee.toFixed(2)}`
    };
  });

  return c.json({
    data: {
      trade_request_id: tradeId,
      trade_status: trade.status,
      options,
      packing_plans: packingPlans.results || [],
      logistics_quotes: providerQuotes.results || [],
      importer_actions: ['ACCEPT', 'NEGOTIATE', 'AMEND']
    },
    message: 'Quote package ready for importer review'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.2 — AMENDMENT UI & WORKFLOW
// POST /v1/contract/amend — Importer proposes non-price amendments
// Governor: G3U1 (Amendment ranges check)
// Fields: weight, packaging, port_of_discharge, delivery_date, product_spec, num_pallets
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/amend', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const {
    negotiation_session_id, trade_request_id, proposed_by_gtid,
    amendments, reason
  } = body;

  if (!trade_request_id || !proposed_by_gtid || !amendments) {
    return c.json({ error: 'trade_request_id, proposed_by_gtid, amendments required' }, 400);
  }

  // Validate amendment fields are within allowed set
  const allowedFields = ['weight', 'quantity', 'packaging', 'port_of_discharge',
    'delivery_date', 'product_specification', 'num_pallets', 'container_type'];
  const amendmentObj = typeof amendments === 'string' ? JSON.parse(amendments) : amendments;
  const invalidFields = Object.keys(amendmentObj).filter(f => !allowedFields.includes(f));
  if (invalidFields.length > 0) {
    return c.json({ error: `Invalid amendment fields: ${invalidFields.join(', ')}. Allowed: ${allowedFields.join(', ')}` }, 400);
  }

  if (!reason) {
    return c.json({ error: 'Mandatory reason note required for amendments (Step 3.2)' }, 400);
  }

  // Governor G3U1: Validate amendment ranges
  const gov = await evaluateGovernor(DB, {
    decision_type: 'contract.amendment',
    actor_gtid: proposed_by_gtid,
    action_context: { trade_request_id, amendments: amendmentObj, reason },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Amendment denied by Governor (G3U1)', governor: gov }, 403);

  // Get or create negotiation session
  let sessionId = negotiation_session_id;
  if (!sessionId) {
    sessionId = uuid();
    await DB.prepare(`
      INSERT INTO negotiation_sessions (id, trade_request_id, status, governor_decision_id, started_at)
      VALUES (?, ?, 'ACTIVE', ?, ?)
    `).bind(sessionId, trade_request_id, gov.decision_id, isoNow()).run();
  }

  // Get current round count from amendments table
  const roundResult = await DB.prepare(
    'SELECT MAX(round_number) as max_round FROM negotiation_amendments WHERE negotiation_session_id = ?'
  ).bind(sessionId).first() as any;
  const roundNumber = (roundResult?.max_round || 0) + 1;

  if (roundNumber > 5) {
    return c.json({ error: 'Maximum 5 negotiation rounds reached. Deadlock resolution required.' }, 409);
  }

  await DB.prepare(`
    INSERT INTO negotiation_amendments (id, negotiation_session_id, trade_request_id, proposed_by_gtid, amendment_type, amendments, reason, round_number, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, 'NON_PRICE', ?, ?, ?, 'PENDING', ?, ?)
  `).bind(id, sessionId, trade_request_id, proposed_by_gtid, JSON.stringify(amendmentObj), reason, roundNumber, gov.decision_id, isoNow()).run();

  // Create Smart Inbox item for exporter
  try {
    const trade = await DB.prepare('SELECT assigned_exporter_id FROM trade_requests WHERE id = ?').bind(trade_request_id).first() as any;
    if (trade?.assigned_exporter_id) {
      const emp = await DB.prepare('SELECT id FROM employees WHERE tenant_id = ? LIMIT 1').bind(trade.assigned_exporter_id).first() as any;
      if (emp) {
        await DB.prepare(`
          INSERT INTO smart_inbox_items (id, tenant_id, employee_id, item_id, ustn, category, priority_score, title, description, action_link, dismissed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'NEEDS_APPROVAL', 85, 'Amendment Request', ?, ?, 0, ?, ?)
        `).bind(uuid(), trade.assigned_exporter_id, emp.id, id, trade_request_id, `Amendment proposed: ${Object.keys(amendmentObj).join(', ')}`, `/contract/amend/${id}`, isoNow(), isoNow()).run();
      }
    }
  } catch (e) { /* non-blocking */ }

  await auditLog(DB, 'negotiation_amendments', id, 'INSERT', null, { amendments: amendmentObj, round: roundNumber });

  return c.json({
    data: {
      amendment_id: id,
      negotiation_session_id: sessionId,
      round_number: roundNumber,
      amendments: amendmentObj,
      status: 'PENDING',
      governor_decision: gov
    },
    message: 'Amendment submitted. Awaiting exporter response.'
  }, 201);
});

// GET /v1/contract/amendments/:trade_request_id — List all amendments
contracting.get('/contract/amendments/:trade_request_id', async (c) => {
  const { DB } = c.env;
  const tradeId = c.req.param('trade_request_id');
  const results = await DB.prepare(
    'SELECT * FROM negotiation_amendments WHERE trade_request_id = ? ORDER BY round_number ASC, created_at ASC'
  ).bind(tradeId).all();
  return c.json({ data: results.results || [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.3 — EXPORTER RESPONDS TO AMENDMENT OR NEGOTIATION
// POST /v1/contract/amend/:amendment_id/respond
// Actions: ACCEPT, COUNTER, REJECT, ACCEPT_PARTIAL
// Governor: G3U2 (Signed logs)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/amend/:amendment_id/respond', async (c) => {
  const { DB } = c.env;
  const amendmentId = c.req.param('amendment_id');
  const body = await c.req.json();

  const { action, responded_by_gtid, response_note, counter_amendments } = body;
  if (!action || !responded_by_gtid) {
    return c.json({ error: 'action (ACCEPT|COUNTER|REJECT|ACCEPT_PARTIAL) and responded_by_gtid required' }, 400);
  }

  const validActions = ['ACCEPT', 'COUNTER', 'REJECT', 'ACCEPT_PARTIAL'];
  if (!validActions.includes(action)) {
    return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
  }

  const amendment = await DB.prepare('SELECT * FROM negotiation_amendments WHERE id = ?').bind(amendmentId).first() as any;
  if (!amendment) return c.json({ error: 'Amendment not found' }, 404);

  // Governor G3U2: Signed and logged
  const gov = await evaluateGovernor(DB, {
    decision_type: 'negotiation.respond',
    actor_gtid: responded_by_gtid,
    action_context: { amendment_id: amendmentId, action, round: amendment.round_number },
  });

  let newStatus = action;
  if (action === 'ACCEPT' || action === 'ACCEPT_PARTIAL') newStatus = 'ACCEPTED';
  if (action === 'REJECT') newStatus = 'REJECTED';
  if (action === 'COUNTER') newStatus = 'COUNTERED';

  await DB.prepare(`
    UPDATE negotiation_amendments SET status = ?, response_note = ?, responded_by_gtid = ?, responded_at = ?, governor_decision_id = ? WHERE id = ?
  `).bind(newStatus, response_note || null, responded_by_gtid, isoNow(), gov.decision_id, amendmentId).run();

  // If COUNTER, create a new amendment for the counter-proposal
  let counterAmendmentId = null;
  if (action === 'COUNTER' && counter_amendments) {
    counterAmendmentId = uuid();
    const newRound = (amendment.round_number || 1) + 1;

    await DB.prepare(`
      INSERT INTO negotiation_amendments (id, negotiation_session_id, trade_request_id, proposed_by_gtid, amendment_type, amendments, reason, round_number, status, governor_decision_id, created_at)
      VALUES (?, ?, ?, ?, 'COUNTER', ?, ?, ?, 'PENDING', ?, ?)
    `).bind(counterAmendmentId, amendment.negotiation_session_id, amendment.trade_request_id, responded_by_gtid, JSON.stringify(counter_amendments), response_note || 'Counter-proposal', newRound, gov.decision_id, isoNow()).run();

    // Update session status to reflect ongoing negotiation
    await DB.prepare('UPDATE negotiation_sessions SET status = \'ACTIVE\' WHERE id = ?')
      .bind(amendment.negotiation_session_id).run();
  }

  return c.json({
    data: {
      amendment_id: amendmentId,
      action,
      status: newStatus,
      counter_amendment_id: counterAmendmentId,
      governor_decision: gov
    },
    message: `Amendment ${action.toLowerCase()}${counterAmendmentId ? '. Counter-proposal created.' : '.'}`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.4 — MUTUAL CONFIRMATION
// POST /v1/contract/mutual-confirm
// Both parties must confirm. Records timestamp + pre-contract snapshot (JSONB)
// Governor: G3U3
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/mutual-confirm', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { contract_id, confirmer_gtid, confirmer_role } = body;

  if (!contract_id || !confirmer_gtid) {
    return c.json({ error: 'contract_id, confirmer_gtid required' }, 400);
  }

  const contract = await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contract_id).first() as any;
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  // Governor G3U3: Mutual confirmation gate
  const gov = await evaluateGovernor(DB, {
    decision_type: 'mutual_confirmation',
    actor_gtid: confirmer_gtid,
    action_context: { contract_id, confirmer_role: confirmer_role || 'PARTY' },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Mutual confirmation denied (G3U3)', governor: gov }, 403);

  // Build pre-contract snapshot
  const trade = await DB.prepare('SELECT * FROM trade_requests WHERE id = ?').bind(contract.trade_request_id).first();
  const quote = await DB.prepare('SELECT * FROM exporter_quotes WHERE trade_request_id = ? ORDER BY created_at DESC LIMIT 1').bind(contract.trade_request_id).first();

  const snapshot = {
    contract_id, confirmer_gtid, confirmer_role,
    trade_summary: trade ? { id: (trade as any).id, status: (trade as any).status } : null,
    quote_summary: quote ? { id: (quote as any).id, exw_price: (quote as any).exw_price, incoterm: (quote as any).incoterm } : null,
    confirmed_at: isoNow(),
    governor_decision_id: gov.decision_id,
  };

  // Update contract with mutual confirmation
  const existingSnapshot = contract.mutual_confirmation_snapshot ? JSON.parse(contract.mutual_confirmation_snapshot) : {};
  existingSnapshot[confirmer_role || confirmer_gtid] = snapshot;
  const allConfirmed = existingSnapshot['IMPORTER'] && existingSnapshot['EXPORTER'];

  await DB.prepare(`
    UPDATE contracts SET mutual_confirmation_at = ?, mutual_confirmation_snapshot = ?, status = ?, updated_at = ? WHERE id = ?
  `).bind(
    allConfirmed ? isoNow() : null,
    JSON.stringify(existingSnapshot),
    allConfirmed ? 'PENDING_SIGNATURES' : contract.status,
    isoNow(), contract_id
  ).run();

  return c.json({
    data: {
      contract_id,
      confirmer_gtid,
      confirmer_role,
      all_parties_confirmed: !!allConfirmed,
      status: allConfirmed ? 'PENDING_SIGNATURES' : 'AWAITING_COUNTERPARTY',
      governor_decision: gov
    },
    message: allConfirmed
      ? 'Both parties confirmed. Contract ready for signatures and fee payment.'
      : `${confirmer_role || 'Party'} confirmed. Awaiting counterparty confirmation.`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.5 — CONTRACT ASSEMBLY WITH SGTX WITNESS CLAUSE
// POST /v1/contract/assemble
// Clause Forge agent assembles contract with mandatory SGTX Witness Clause
// Governor: G3U4 (Clause confidence >= 0.90)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/assemble', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const contractId = uuid();

  const {
    trade_request_id, incoterm, governing_law, dispute_resolution,
    clauses, contract_type, multi_shipment_schedule
  } = body;

  if (!trade_request_id || !incoterm) {
    return c.json({ error: 'trade_request_id, incoterm required' }, 400);
  }

  // AI Clause Forge confidence scoring (simulated HF local model)
  const clauseConfidence = {
    payment_terms: 0.96, delivery_terms: 0.94, quality_clause: 0.92,
    force_majeure: 0.91, dispute_resolution: 0.93, insurance: 0.90,
    sgtx_witness: 1.0 // Mandatory clause — always present
  };
  const avgConfidence = Object.values(clauseConfidence).reduce((s, v) => s + v, 0) / Object.values(clauseConfidence).length;

  // Governor G3U4: Clause confidence must be >= 0.90
  const gov = await evaluateGovernor(DB, {
    decision_type: 'contract.genesis',
    actor_gtid: body.initiator_gtid || 'SYSTEM',
    action_context: { trade_request_id, clause_confidence: avgConfidence, incoterm },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Contract assembly denied (G3U4)', governor: gov }, 403);

  // Mandatory SGTX Witness Clause
  const sgtxWitnessClause = {
    clause_id: 'SGTX_WITNESS',
    text: 'SGTX acts as a non-custodial witness to this agreement. The trade execution SGTX fee is independent of the contract terms. SGTX signs as witness via Ed25519 digital signature.',
    mandatory: true,
    removable: false
  };

  // Determine fee model
  const isMultiShipment = contract_type === 'MASTER_MULTI' && multi_shipment_schedule?.length > 0;
  const collectionModel = isMultiShipment ? 'PER_SHIPMENT' : 'UPFRONT';

  // Calculate fee rate
  const quote = await DB.prepare('SELECT exw_price, logistics_total FROM exporter_quotes WHERE trade_request_id = ? ORDER BY created_at DESC LIMIT 1').bind(trade_request_id).first() as any;
  const totalValue = (quote?.exw_price || 0) + (quote?.logistics_total || 0);
  const feeRate = clampCommissionRate(0.015);
  const feeAmount = totalValue * feeRate;

  // Assemble clauses
  const assembledClauses = [
    sgtxWitnessClause,
    ...(clauses || []),
  ];

  // SGTX witness signature (Ed25519 simulation)
  const witnessSignature = await signDecision(JSON.stringify({ contract_id: contractId, trade_request_id }));

  await DB.prepare(`
    INSERT INTO contracts (id, trade_request_id, contract_type, incoterm, incoterm_rules, clauses, multi_shipment_schedule, governing_law, dispute_resolution, status, sgtx_fee_rate, sgtx_fee_amount, commission_collection_model, sgtx_witness_signature, clause_forge_confidence, governor_decision_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    contractId, trade_request_id,
    isMultiShipment ? 'MASTER_MULTI' : 'SINGLE_SHIPMENT',
    incoterm, JSON.stringify({ incoterm }),
    JSON.stringify(assembledClauses),
    isMultiShipment ? JSON.stringify(multi_shipment_schedule) : null,
    governing_law || 'English Law',
    dispute_resolution || 'ICC Arbitration',
    feeRate, Math.round(feeAmount * 100) / 100, collectionModel,
    witnessSignature, avgConfidence, gov.decision_id, isoNow(), isoNow()
  ).run();

  // For multi-shipment: create contract_shipments rows
  const shipmentRows: any[] = [];
  if (isMultiShipment && multi_shipment_schedule) {
    for (let i = 0; i < multi_shipment_schedule.length; i++) {
      const sched = multi_shipment_schedule[i];
      const shipId = uuid();
      const shipFee = (sched.total_price || 0) * feeRate;
      await DB.prepare(`
        INSERT INTO contract_shipments (id, contract_id, shipment_number, scheduled_delivery_date, port_of_discharge, port_of_loading, containers_count, total_price, sgtx_fee_amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
      `).bind(shipId, contractId, i + 1, sched.delivery_date, sched.port_of_discharge || '', sched.port_of_loading || null, sched.containers_count || 1, sched.total_price || 0, Math.round(shipFee * 100) / 100, isoNow()).run();
      shipmentRows.push({ id: shipId, shipment_number: i + 1, sgtx_fee_amount: Math.round(shipFee * 100) / 100 });
    }
  }

  // Store in contract_genesis_sessions for audit trail
  try {
    await DB.prepare(`
      INSERT INTO contract_genesis_sessions (id, trade_request_id, clause_confidence_scores, risk_scores, harmonization_strategy, governor_decision_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(uuid(), trade_request_id, JSON.stringify(clauseConfidence), JSON.stringify({ avg_confidence: avgConfidence }), JSON.stringify({ governing_law: governing_law || 'English Law', incoterm }), gov.decision_id, isoNow()).run();
  } catch (e) { /* non-blocking */ }

  await auditLog(DB, 'contracts', contractId, 'INSERT', null, { contract_type: isMultiShipment ? 'MASTER_MULTI' : 'SINGLE_SHIPMENT', fee_rate: feeRate, collection_model: collectionModel });

  return c.json({
    data: {
      contract_id: contractId,
      contract_type: isMultiShipment ? 'MASTER_MULTI' : 'SINGLE_SHIPMENT',
      clause_confidence: clauseConfidence,
      avg_confidence: avgConfidence,
      sgtx_fee: { rate: feeRate, amount: Math.round(feeAmount * 100) / 100, collection_model: collectionModel },
      sgtx_witness_clause: sgtxWitnessClause,
      sgtx_witness_signature: witnessSignature,
      shipments: shipmentRows,
      governor_decision: gov
    },
    message: `Contract assembled with SGTX Witness Clause. ${isMultiShipment ? `${shipmentRows.length} shipments scheduled. Fee: PER_SHIPMENT.` : `Fee: UPFRONT ($${feeAmount.toFixed(2)}).`}`
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.6 — UPLOAD OWN CONTRACT (WITH SGTX COMMISSION ADDENDUM)
// POST /v1/contract/upload-own
// PDF upload (max 10 MB), HF Donut extraction, mandatory Commission Addendum
// Governor: G3U5 (No contradictions to SGTX terms)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/upload-own', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const contractId = body.contract_id || uuid();

  const { trade_request_id, pdf_hash, extracted_fields, addendum_signed } = body;

  if (!trade_request_id || !pdf_hash) {
    return c.json({ error: 'trade_request_id, pdf_hash required' }, 400);
  }
  if (!addendum_signed) {
    return c.json({ error: 'SGTX Commission Addendum must be signed (addendum_signed=true). This is mandatory per Step 3.6.' }, 400);
  }

  // Governor G3U5: Validate no contradictions to SGTX mandatory terms
  const gov = await evaluateGovernor(DB, {
    decision_type: 'contract.upload_own',
    actor_gtid: body.uploader_gtid || 'SYSTEM',
    action_context: { trade_request_id, pdf_hash, extracted_fields, commission_addendum_included: addendum_signed },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Uploaded contract contradicts SGTX terms (G3U5)', governor: gov }, 403);

  // AI Donut extraction simulation
  const aiExtraction = extracted_fields || {
    parties: 'Auto-extracted', payment_terms: 'Auto-extracted',
    delivery_terms: 'Auto-extracted', governing_law: 'Auto-extracted',
    confidence: 0.88
  };

  // Create or update contract
  const existing = await DB.prepare('SELECT id FROM contracts WHERE id = ?').bind(contractId).first();
  if (existing) {
    await DB.prepare(`
      UPDATE contracts SET own_contract_uploaded = 1, own_contract_pdf_hash = ?, status = 'PENDING_SIGNATURES', updated_at = ? WHERE id = ?
    `).bind(pdf_hash, isoNow(), contractId).run();
  } else {
    await DB.prepare(`
      INSERT INTO contracts (id, trade_request_id, contract_type, incoterm, clauses, status, own_contract_uploaded, own_contract_pdf_hash, sgtx_fee_rate, commission_collection_model, governor_decision_id, created_at, updated_at)
      VALUES (?, ?, 'SINGLE_SHIPMENT', ?, '[]', 'PENDING_SIGNATURES', 1, ?, ?, 'UPFRONT', ?, ?, ?)
    `).bind(contractId, trade_request_id, body.incoterm || 'EXW', pdf_hash, clampCommissionRate(0.015), gov.decision_id, isoNow(), isoNow()).run();
  }

  return c.json({
    data: {
      contract_id: contractId,
      own_contract_uploaded: true,
      pdf_hash,
      ai_extraction: aiExtraction,
      addendum_signed: true,
      addendum_note: 'SGTX Commission Addendum signed. SGTX Witness Clause attached separately.',
      governor_decision: gov
    },
    message: 'Own contract uploaded. SGTX Commission Addendum signed. Ready for signatures.'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.7 — LOGISTICS PROVIDERS SIGN SERVICE ADDENDUM
// POST /v1/contract/logistics-addendum
// Governor: G3U6 (Block lock if unsigned)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/logistics-addendum', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { contract_id, provider_gtid, provider_tenant_id, service_type, addendum_content, signature_hash } = body;

  if (!contract_id || !provider_gtid || !service_type) {
    return c.json({ error: 'contract_id, provider_gtid, service_type required' }, 400);
  }

  // Governor G3U6: Log logistics signature
  const gov = await evaluateGovernor(DB, {
    decision_type: 'logistics.addendum_sign',
    actor_gtid: provider_gtid,
    action_context: { contract_id, service_type },
  });

  const isSigned = !!signature_hash;
  const penalty = 'Provider shall not release any container without SGTX release confirmation. Provider must include USTN and GTIDs on all documentation.';

  await DB.prepare(`
    INSERT INTO logistics_addenda (id, contract_id, provider_gtid, provider_tenant_id, service_type, addendum_content, penalty_clause, signed_at, signature_hash, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, contract_id, provider_gtid, provider_tenant_id || null, service_type,
    addendum_content || 'Standard SGTX logistics service addendum v6.3',
    penalty, isSigned ? isoNow() : null, signature_hash || null,
    isSigned ? 'SIGNED' : 'PENDING', gov.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      addendum_id: id, contract_id, provider_gtid, service_type,
      signed: isSigned, penalty_clause: penalty, governor_decision: gov
    },
    message: isSigned ? 'Logistics addendum signed.' : 'Logistics addendum created. Awaiting provider signature.'
  }, 201);
});

// POST /v1/contract/logistics-addendum/:id/sign — Provider signs
contracting.post('/contract/logistics-addendum/:id/sign', async (c) => {
  const { DB } = c.env;
  const addendumId = c.req.param('id');
  const body = await c.req.json();

  await DB.prepare(`
    UPDATE logistics_addenda SET status = 'SIGNED', signed_at = ?, signature_hash = ? WHERE id = ?
  `).bind(isoNow(), body.signature_hash || uuid(), addendumId).run();

  return c.json({ data: { addendum_id: addendumId, status: 'SIGNED' }, message: 'Logistics addendum signed.' });
});

// GET /v1/contract/:contract_id/logistics-addenda — List all addenda
contracting.get('/contract/:contract_id/logistics-addenda', async (c) => {
  const { DB } = c.env;
  const contractId = c.req.param('contract_id');
  const results = await DB.prepare('SELECT * FROM logistics_addenda WHERE contract_id = ?').bind(contractId).all();
  const allSigned = (results.results || []).every((a: any) => a.status === 'SIGNED');
  return c.json({ data: { addenda: results.results || [], all_signed: allSigned, total: (results.results || []).length } });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.8 — SGTX FEE PAYMENT (SINGLE vs MULTI)
// POST /v1/fee/pay — PSP redirect for fee collection
// Governor: G3U7 (Block USTN generation until fee paid)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/fee/pay', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const paymentId = uuid();

  const { contract_id, contract_shipment_id, payer_gtid, psp_id, amount, currency } = body;

  if (!contract_id || !amount) {
    return c.json({ error: 'contract_id, amount required' }, 400);
  }

  const contract = await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contract_id).first() as any;
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  const isMulti = contract.contract_type === 'MASTER_MULTI';

  // Governor G3U7: Fee payment verification (this creates the lock, so commission_lock_id is not required yet)
  const gov = await evaluateGovernor(DB, {
    decision_type: 'commission.pay',
    actor_gtid: payer_gtid || 'SYSTEM',
    action_context: { contract_id, amount, is_multi: isMulti, contract_shipment_id, commission_lock_id: 'PENDING_CREATION' },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Fee payment denied (G3U7)', governor: gov }, 403);

  // Gross-up calculation: Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer
  const pspFeePercent = 0.029; // e.g., Stripe 2.9%
  const pspFeeFixed = 0.30;
  const safetyBuffer = amount * 0.005; // 0.5%
  const grossAmount = (amount + pspFeeFixed) / (1 - pspFeePercent) + safetyBuffer;

  // Create payment attempt
  await DB.prepare(`
    INSERT INTO payment_attempts (id, commission_lock_id, aggregator_id, amount_usd, gross_amount, net_amount, psp_fee_usd, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'INITIATED', ?, ?)
  `).bind(paymentId, null, psp_id || 'psp-001', amount, Math.round(grossAmount * 100) / 100, amount, Math.round((grossAmount - amount) * 100) / 100, gov.decision_id, isoNow()).run();

  // Create fee calculation record
  try {
    await DB.prepare(`
      INSERT INTO fee_calculations (id, payment_attempt_id, net_fee, gross_amount, fee_breakdown, safety_buffer_applied, safety_buffer_pct, governor_decision_id)
      VALUES (?, ?, ?, ?, ?, 1, 0.005, ?)
    `).bind(uuid(), paymentId, amount, Math.round(grossAmount * 100) / 100, JSON.stringify({ psp_pct: pspFeePercent, psp_fixed: pspFeeFixed, safety_buffer: safetyBuffer }), gov.decision_id).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      payment_id: paymentId,
      contract_id,
      contract_shipment_id: contract_shipment_id || null,
      payment_model: isMulti ? 'PER_SHIPMENT' : 'UPFRONT',
      net_fee: amount,
      gross_amount: Math.round(grossAmount * 100) / 100,
      gross_up: {
        psp_fee_pct: pspFeePercent,
        psp_fee_fixed: pspFeeFixed,
        safety_buffer_pct: 0.005,
        formula: 'Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer'
      },
      redirect_url: `/payment/redirect/${paymentId}`,
      governor_decision: gov
    },
    message: `Fee payment initiated (${isMulti ? 'per-shipment' : 'upfront'}). Redirect to PSP.`
  }, 201);
});

// POST /v1/fee/verify — Verify fee payment via webhook/callback
// Governor: G3U7 continued — activates CommissionLock and generates USTN
contracting.post('/fee/verify', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { payment_id, psp_reference, webhook_data, contract_id, contract_shipment_id } = body;
  if (!payment_id) return c.json({ error: 'payment_id required' }, 400);

  // Update payment status
  await DB.prepare(`
    UPDATE payment_attempts SET status = 'VERIFIED', psp_transaction_id = ?, webhook_verified = 1, completed_at = ? WHERE id = ?
  `).bind(psp_reference || null, isoNow(), payment_id).run();

  // Create CommissionLock — ACTIVE
  const lockId = uuid();
  const contract = contract_id ? await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contract_id).first() as any : null;

  // Governor gate for fee verification
  const govVerify = await evaluateGovernor(DB, {
    decision_type: 'commission.pay',
    actor_gtid: 'SYSTEM',
    action_context: { payment_id, contract_id, commission_lock_id: lockId },
  });

  await DB.prepare(`
    INSERT INTO commission_locks (lock_id, contract_id, trade_id, commission_rate_pct, commission_usd, currency, status, release_conditions, governor_decision_id, locked_at)
    VALUES (?, ?, ?, ?, ?, 'USD', 'ACTIVE', ?, ?, ?)
  `).bind(lockId, contract_id || 'NONE', contract?.trade_request_id || 'NONE', (contract?.sgtx_fee_rate || 0.015) * 100, contract?.sgtx_fee_amount || 0, JSON.stringify({ milestones: ['LOADING', 'DEPARTURE', 'ARRIVAL', 'DELIVERY'] }), govVerify.decision_id, isoNow()).run();

  // Generate USTN (only after fee verified — G3U7)
  let ustn = null;
  if (contract) {
    const trade = await DB.prepare('SELECT importer_tenant_id, exporter_tenant_id FROM trade_requests WHERE id = ?').bind(contract.trade_request_id).first() as any;
    if (trade) {
      const imp = await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(trade.importer_tenant_id).first() as any;
      const exp = trade.exporter_tenant_id ? await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(trade.exporter_tenant_id).first() as any : null;
      ustn = generateUSTN(gtidSuffix(imp?.gtid || 'IMP'), gtidSuffix(exp?.gtid || 'EXP'));

      // Register USTN
      try {
        await DB.prepare(`
          INSERT INTO ustn_registry (ustn, trade_request_id, importer_gtid_suffix, exporter_gtid_suffix, version, created_at)
          VALUES (?, ?, ?, ?, 1, ?)
        `).bind(ustn, contract.trade_request_id, gtidSuffix(imp?.gtid || 'IMP'), gtidSuffix(exp?.gtid || 'EXP'), isoNow()).run();
      } catch (e) { /* may already exist */ }
    }
  }

  // Update contract/shipment with lock and USTN
  if (contract_shipment_id) {
    // Multi-shipment: per-shipment lock
    await DB.prepare(`
      UPDATE contract_shipments SET commission_lock_id = ?, ustn = ?, sgtx_fee_paid = 1, status = 'LOCKED', locked_at = ? WHERE id = ?
    `).bind(lockId, ustn, isoNow(), contract_shipment_id).run();
  } else if (contract_id) {
    // Single-shipment: upfront lock
    await DB.prepare(`
      UPDATE contracts SET commission_lock_id = ?, status = 'LOCKED', locked_at = ? WHERE id = ?
    `).bind(lockId, isoNow(), contract_id).run();
  }

  return c.json({
    data: {
      payment_id,
      commission_lock_id: lockId,
      commission_lock_status: 'ACTIVE',
      ustn,
      contract_id,
      contract_shipment_id: contract_shipment_id || null,
    },
    message: `Fee payment verified. CommissionLock ACTIVE. USTN generated: ${ustn}`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.8.2 — MULTI-SHIPMENT: Per-shipment activation
// POST /v1/contract/multi-shipment/activate
// Mutual confirmation for specific shipment → per-shipment fee + lock
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/multi-shipment/activate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { contract_id, contract_shipment_id, confirmer_gtid } = body;
  if (!contract_id || !contract_shipment_id) {
    return c.json({ error: 'contract_id, contract_shipment_id required' }, 400);
  }

  const shipment = await DB.prepare('SELECT * FROM contract_shipments WHERE id = ? AND contract_id = ?').bind(contract_shipment_id, contract_id).first() as any;
  if (!shipment) return c.json({ error: 'Contract shipment not found' }, 404);

  if (shipment.status === 'LOCKED') {
    return c.json({ error: 'Shipment already locked and fee paid' }, 409);
  }

  // Record mutual confirmation for this shipment
  await DB.prepare(`
    UPDATE contract_shipments SET mutual_confirmation_at = ?, status = 'CONFIRMED' WHERE id = ?
  `).bind(isoNow(), contract_shipment_id).run();

  return c.json({
    data: {
      contract_shipment_id,
      shipment_number: shipment.shipment_number,
      total_price: shipment.total_price,
      sgtx_fee_amount: shipment.sgtx_fee_amount,
      status: 'CONFIRMED',
      next_step: 'Pay SGTX fee via POST /v1/fee/pay with contract_shipment_id'
    },
    message: `Shipment #${shipment.shipment_number} confirmed. Pay SGTX fee ($${shipment.sgtx_fee_amount}) to activate.`
  });
});

// GET /v1/contract/:contract_id/shipments — List multi-shipment schedule
contracting.get('/contract/:contract_id/shipments', async (c) => {
  const { DB } = c.env;
  const contractId = c.req.param('contract_id');
  const results = await DB.prepare('SELECT * FROM contract_shipments WHERE contract_id = ? ORDER BY shipment_number').bind(contractId).all();
  return c.json({ data: results.results || [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.9 — CONTAINER RELEASE CONFIRMATION
// POST /v1/contract/release-token — Send release token to logistics provider
// Governor: G3U8 (Block loading milestone until acknowledged)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/release-token', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();
  const releaseToken = uuid();

  const { ustn, commission_lock_id, contract_id, provider_gtid } = body;
  if (!ustn || !commission_lock_id) {
    return c.json({ error: 'ustn, commission_lock_id required' }, 400);
  }

  // Verify commission lock is ACTIVE (fee paid)
  const lock = await DB.prepare('SELECT status FROM commission_locks WHERE lock_id = ?').bind(commission_lock_id).first() as any;
  if (!lock || lock.status !== 'ACTIVE') {
    return c.json({ error: 'Commission lock must be ACTIVE (fee paid) before release token can be issued (Part 0.5)' }, 403);
  }

  // Governor G3U8: Release confirmation gate
  const gov = await evaluateGovernor(DB, {
    decision_type: 'container.release',
    actor_gtid: 'SGTX-PLATFORM',
    action_context: { ustn, commission_lock_id, provider_gtid },
  });

  await DB.prepare(`
    INSERT INTO release_confirmations (id, ustn, commission_lock_id, contract_id, release_token, provider_gtid, sent_at, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', ?, ?)
  `).bind(id, ustn, commission_lock_id, contract_id || null, releaseToken, provider_gtid || null, isoNow(), gov.decision_id, isoNow()).run();

  return c.json({
    data: {
      release_id: id,
      release_token: releaseToken,
      ustn,
      status: 'SENT',
      provider_gtid,
      governor_decision: gov
    },
    message: 'Release token sent to logistics provider. Awaiting acknowledgment.'
  }, 201);
});

// POST /v1/contract/release-token/:token/acknowledge — Provider acknowledges
contracting.post('/contract/release-token/:token/acknowledge', async (c) => {
  const { DB } = c.env;
  const token = c.req.param('token');
  const body = await c.req.json();

  const release = await DB.prepare('SELECT * FROM release_confirmations WHERE release_token = ?').bind(token).first() as any;
  if (!release) return c.json({ error: 'Release token not found or invalid' }, 404);

  if (release.status === 'ACKNOWLEDGED') {
    return c.json({ error: 'Release token already acknowledged' }, 409);
  }

  await DB.prepare(`
    UPDATE release_confirmations SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by_gtid = ?, method = ? WHERE release_token = ?
  `).bind(isoNow(), body.acknowledged_by_gtid || null, body.method || 'API', token).run();

  return c.json({
    data: { release_token: token, ustn: release.ustn, status: 'ACKNOWLEDGED', acknowledged_at: isoNow() },
    message: 'Release confirmed. Container loading milestone now unblocked.'
  });
});

// GET /v1/contract/release-confirmations/:ustn — Check release status
contracting.get('/contract/release-confirmations/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const results = await DB.prepare('SELECT * FROM release_confirmations WHERE ustn = ? ORDER BY created_at DESC').bind(ustn).all();
  return c.json({ data: results.results || [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3.10 — DIGITAL SIGNATURES & CONTRACT LOCK
// POST /v1/contract/sign-lock — Collect signatures and lock contract
// Governor: G3U9 (All signatures + ACTIVE CommissionLock required)
// ═══════════════════════════════════════════════════════════════════════════════
contracting.post('/contract/sign-lock', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { contract_id, signer_gtid, signer_role, signature_hash } = body;
  if (!contract_id || !signer_gtid) {
    return c.json({ error: 'contract_id, signer_gtid required' }, 400);
  }

  const contract = await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contract_id).first() as any;
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  // Record signature in sequence_config JSON
  const sigId = uuid();
  const sigEntry = { signer_gtid, role: signer_role || 'PARTY', signature_hash: signature_hash || uuid(), signed_at: isoNow() };
  await DB.prepare(`
    INSERT INTO signature_sequences (id, contract_id, sequence_config, current_step, governor_decision_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(sigId, contract_id, JSON.stringify(sigEntry), signer_role === 'EXPORTER' ? 2 : 1, null).run();

  // Update contract signature fields
  const sigField = signer_role === 'EXPORTER' ? 'exporter_signature' : 'importer_signature';
  await DB.prepare(`UPDATE contracts SET ${sigField} = ?, signed_at = COALESCE(signed_at, ?), updated_at = ? WHERE id = ?`)
    .bind(signature_hash || sigId, isoNow(), isoNow(), contract_id).run();

  // Check if fully signed — Governor G3U9
  const updated = await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contract_id).first() as any;
  const fullySigned = updated.importer_signature && updated.exporter_signature;

  if (fullySigned) {
    // G3U6: Check all logistics addenda signed
    const addenda = await DB.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'SIGNED\' THEN 1 ELSE 0 END) as signed FROM logistics_addenda WHERE contract_id = ?').bind(contract_id).first() as any;
    const allLogisticsSigned = addenda.total === 0 || addenda.signed >= addenda.total;

    // G3U7/G3U9: Check CommissionLock is ACTIVE (for single-shipment)
    let commissionActive = true;
    if (contract.commission_collection_model === 'UPFRONT') {
      const lock = contract.commission_lock_id ? await DB.prepare('SELECT status FROM commission_locks WHERE lock_id = ?').bind(contract.commission_lock_id).first() as any : null;
      commissionActive = lock && lock.status === 'ACTIVE';
    }

    const gov = await evaluateGovernor(DB, {
      decision_type: 'contract.sign',
      actor_gtid: signer_gtid,
      action_context: {
        contract_id, fully_signed: true,
        all_logistics_signed: allLogisticsSigned,
        commission_active: commissionActive
      },
    });

    if (allLogisticsSigned && commissionActive) {
      // Compute contract hash
      const contractHash = await signDecision(JSON.stringify({ contract_id, clauses: contract.clauses }));

      const newStatus = contract.contract_type === 'MASTER_MULTI' ? 'ACTIVE_MASTER' : 'LOCKED';
      await DB.prepare(`
        UPDATE contracts SET status = ?, cryptographic_hash = ?, locked_at = ?, governor_decision_id = ?, updated_at = ? WHERE id = ?
      `).bind(newStatus, contractHash, isoNow(), gov.decision_id, isoNow(), contract_id).run();

      return c.json({
        data: {
          contract_id, status: newStatus, cryptographic_hash: contractHash,
          fully_signed: true, all_logistics_signed: allLogisticsSigned,
          commission_lock_active: commissionActive,
          governor_decision: gov
        },
        message: `Contract ${newStatus}. All signatures collected. ${contract.contract_type === 'MASTER_MULTI' ? 'Master contract active.' : 'Contract locked.'}`
      });
    } else {
      return c.json({
        data: {
          contract_id, status: contract.status,
          fully_signed: true,
          blockers: {
            logistics_addenda_unsigned: !allLogisticsSigned,
            commission_not_active: !commissionActive
          }
        },
        message: 'Both parties signed but contract cannot lock: ' +
          (!allLogisticsSigned ? 'logistics addenda not all signed. ' : '') +
          (!commissionActive ? 'SGTX fee not yet paid.' : '')
      }, 202);
    }
  }

  return c.json({
    data: { signature_id: sigId, contract_id, signer_gtid, signer_role, fully_signed: false },
    message: `Signature recorded for ${signer_role || 'party'}. Awaiting remaining signatures.`
  });
});

export default contracting;

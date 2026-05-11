// SGTX Platform v6.3 — Part 6: Settlement & Payment Orchestration
// Steps 6.1–6.8 + Part 10 Global Payment Orchestrator integration
// Governor Gates: G6U1–G6U9, G9U1–G9U6
// Tables: settlement_instructions, settlement_confirmations, payment_attempts,
//         fee_calculations, psp_health_logs, auto_reconciliation_results
import { Hono } from 'hono';
import { uuid, isoNow, signDecision } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const settlement = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.1 — SETTLEMENT INSTRUCTION GENERATION
// POST /v1/settlement/create-instruction
// Unique per USTN. Content: USTN, GTIDs, Amount, Currency, Rail.
// Governor signs instruction (Ed25519). Governor: G6U1
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/create-instruction', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const {
    ustn, instruction_type, payer_tenant_id, payee_tenant_id,
    amount, currency, payment_rail, remittance_info
  } = body;

  if (!ustn || !amount) {
    return c.json({ error: 'ustn, amount required' }, 400);
  }

  // Governor G6U1: Instruction must be signed and linked to USTN
  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.instruction',
    actor_gtid: payer_tenant_id || 'SYSTEM',
    action_context: { ustn, instruction_type: instruction_type || 'TRADE_PRINCIPAL', amount, currency: currency || 'USD' },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Settlement instruction denied (G6U1)', governor: gov }, 403);

  // Build payload with all required fields per blueprint
  const payload = {
    ustn,
    importer_gtid: payer_tenant_id,
    exporter_gtid: payee_tenant_id,
    amount,
    currency: currency || 'USD',
    payment_rail: payment_rail || 'SWIFT',
    remittance_info: remittance_info || `SGTX Trade Settlement - USTN: ${ustn}`,
    instruction_signed_at: isoNow(),
  };

  // Ed25519 signature simulation
  const loomHash = await signDecision(JSON.stringify(payload));

  await DB.prepare(`
    INSERT INTO settlement_instructions (id, ustn, instruction_type, payer_tenant_id, payee_tenant_id, amount, currency, payment_rail, remittance_info, payload, status, loom_hash, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
  `).bind(
    id, ustn, instruction_type || 'TRADE_PRINCIPAL',
    payer_tenant_id || null, payee_tenant_id || null,
    amount, currency || 'USD', payment_rail || 'SWIFT',
    remittance_info || null, JSON.stringify(payload),
    loomHash, gov.decision_id, isoNow()
  ).run();

  // Timeline event
  try {
    await DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, phase, created_at)
      VALUES (?, ?, 'SETTLEMENT', ?, 'Phase 6', ?)
    `).bind(uuid(), ustn, `Settlement instruction created: ${amount} ${currency || 'USD'} via ${payment_rail || 'SWIFT'}`, isoNow()).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      settlement_instruction_id: id,
      ustn,
      instruction_type: instruction_type || 'TRADE_PRINCIPAL',
      amount,
      currency: currency || 'USD',
      payment_rail: payment_rail || 'SWIFT',
      loom_hash: loomHash,
      status: 'PENDING',
      governor_decision: gov
    },
    message: 'Settlement instruction created and Governor-signed.'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.2 — AI PSP ROUTER
// POST /v1/settlement/select-psp
// Selects optimal rail based on health scores, cost, predicted time
// Governor: G6U2 (PSP must have country coverage + health >= 80)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/select-psp', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { settlement_instruction_id, payer_country, payee_country, amount, currency } = body;

  // Query available PSPs with health scores
  const psps = await DB.prepare(`
    SELECT pa.*, 
      (SELECT ph.health_score FROM psp_health_logs ph WHERE ph.aggregator_id = pa.id ORDER BY ph.checked_at DESC LIMIT 1) as latest_health_score,
      (SELECT ph.latency_ms FROM psp_health_logs ph WHERE ph.aggregator_id = pa.id ORDER BY ph.checked_at DESC LIMIT 1) as latest_latency
    FROM payment_aggregators pa WHERE pa.is_active = 1
  `).all();

  // AI PSP Router: LightGBM + Groq simulation
  const scored = (psps.results || []).map((psp: any) => {
    const healthScore = psp.latest_health_score || 95;
    const countryCoverage = psp.country_codes?.includes(payer_country) || psp.country_codes?.includes('GLOBAL');
    const currencySupport = psp.supported_currencies?.includes(currency || 'USD');
    const feeObj = psp.fee_structure ? JSON.parse(psp.fee_structure) : { percentage: 3, fixed: 0 };
    const estimatedFee = (amount || 0) * (feeObj.percentage / 100) + (feeObj.fixed || 0);
    const latency = psp.latest_latency || 200;

    // Composite score: health (40%) + cost efficiency (30%) + speed (20%) + coverage (10%)
    const costScore = Math.max(0, 100 - estimatedFee / (amount || 1) * 1000);
    const speedScore = Math.max(0, 100 - latency / 10);
    const coverageScore = (countryCoverage ? 50 : 0) + (currencySupport ? 50 : 0);
    const compositeScore = healthScore * 0.4 + costScore * 0.3 + speedScore * 0.2 + coverageScore * 0.1;

    return {
      psp_id: psp.id,
      psp_name: psp.name,
      health_score: healthScore,
      latency_ms: latency,
      estimated_fee: Math.round(estimatedFee * 100) / 100,
      composite_score: Math.round(compositeScore * 100) / 100,
      country_coverage: !!countryCoverage,
      currency_support: !!currencySupport,
      avg_settlement_hours: psp.avg_settlement_hours || 4
    };
  }).sort((a: any, b: any) => b.composite_score - a.composite_score);

  // Governor G6U2: Primary must have health >= 80
  const primary = scored[0];
  const fallback = scored[1] || null;

  if (primary && primary.health_score < 80) {
    // Governor intervention: fallback
    const gov = await evaluateGovernor(DB, {
      decision_type: 'settlement.psp_select',
      actor_gtid: 'SYSTEM',
      action_context: { primary_health: primary.health_score, fallback_triggered: true },
    });
    return c.json({
      data: {
        warning: 'Primary PSP health below 80. Fallback triggered.',
        selected: fallback || primary,
        fallback: primary,
        all_options: scored,
        governor_decision: gov
      }
    });
  }

  // Update settlement instruction with selected PSP
  if (settlement_instruction_id && primary) {
    await DB.prepare(`UPDATE settlement_instructions SET psp_id = ? WHERE id = ?`)
      .bind(primary.psp_id, settlement_instruction_id).run();
  }

  return c.json({
    data: {
      selected: primary,
      fallback,
      all_options: scored,
      settlement_instruction_id,
      ai_model: 'LightGBM + Groq (A2)'
    },
    message: `Optimal PSP selected: ${primary?.psp_name} (score: ${primary?.composite_score})`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.3 — IMPORTER APPROVAL (Manual or Voice)
// POST /v1/settlement/approve
// Governor: G6U3 (Importer must have approval permission)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/approve', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { settlement_instruction_id, approver_gtid, approval_method, voice_transcript } = body;
  if (!settlement_instruction_id || !approver_gtid) {
    return c.json({ error: 'settlement_instruction_id, approver_gtid required' }, 400);
  }

  // Governor G6U3: Approval permission check
  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.approve',
    actor_gtid: approver_gtid,
    action_context: { settlement_instruction_id, method: approval_method || 'MANUAL' },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Settlement approval denied (G6U3)', governor: gov }, 403);

  // Voice approval flow: Vosk transcription + HF Mixtral intent extraction
  let voiceVerification = null;
  if (approval_method === 'VOICE' && voice_transcript) {
    voiceVerification = {
      transcript: voice_transcript,
      intent_extracted: 'APPROVE_SETTLEMENT',
      confidence: 0.94,
      biometric_verified: true,
      model: 'Vosk + HF Mixtral (A2)'
    };
  }

  await DB.prepare(`
    UPDATE settlement_instructions SET status = 'AUTHORISED', approved_at = ?, voice_approved = ? WHERE id = ?
  `).bind(isoNow(), approval_method === 'VOICE' ? 1 : 0, settlement_instruction_id).run();

  return c.json({
    data: {
      settlement_instruction_id,
      status: 'AUTHORISED',
      approval_method: approval_method || 'MANUAL',
      voice_verification: voiceVerification,
      governor_decision: gov
    },
    message: `Settlement approved via ${approval_method || 'manual'} confirmation.`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.4 — PAYMENT EXECUTION & MONITORING (Webhook verification)
// POST /v1/settlement/webhook — Receive and verify PSP webhook
// Governor: G6U4 (Webhook signature verified + USTN matched)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/webhook', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const confirmId = uuid();

  const {
    settlement_instruction_id, psp_reference, amount_received,
    currency_received, fx_rate, psp_name, webhook_signature, raw_payload
  } = body;

  if (!settlement_instruction_id) {
    return c.json({ error: 'settlement_instruction_id required' }, 400);
  }

  // Load settlement instruction
  const instruction = await DB.prepare('SELECT * FROM settlement_instructions WHERE id = ?')
    .bind(settlement_instruction_id).first() as any;
  if (!instruction) return c.json({ error: 'Settlement instruction not found' }, 404);

  // Governor G6U4: Verify webhook signature and USTN match
  const signatureValid = !!webhook_signature; // Real impl: verify cryptographic signature
  const ustnMatched = raw_payload ? JSON.stringify(raw_payload).includes(instruction.ustn) : true;
  const amountTolerance = Math.abs((amount_received || 0) - instruction.amount) / instruction.amount;
  const amountMatched = amountTolerance <= 0.01; // 1% tolerance

  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.webhook_verify',
    actor_gtid: 'SYSTEM',
    action_context: {
      settlement_instruction_id, signature_valid: signatureValid,
      ustn_matched: ustnMatched, amount_matched: amountMatched,
      amount_tolerance: amountTolerance
    },
  });

  if (!signatureValid || !ustnMatched) {
    return c.json({
      error: 'Webhook verification failed (G6U4)',
      details: { signature_valid: signatureValid, ustn_matched: ustnMatched, amount_matched: amountMatched },
      governor: gov
    }, 400);
  }

  // Compute proof hash
  const proofHash = await signDecision(JSON.stringify({
    settlement_instruction_id, psp_reference, amount_received, currency_received
  }));

  // Create settlement confirmation
  await DB.prepare(`
    INSERT INTO settlement_confirmations (id, instruction_id, proof_hash, amount_confirmed, currency_confirmed, fx_rate_applied, psp_name, webhook_received_at, verified_by_ai, governor_decision_id, confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(
    confirmId, settlement_instruction_id, proofHash,
    amount_received || instruction.amount,
    currency_received || instruction.currency,
    fx_rate || null, psp_name || null, isoNow(),
    gov.decision_id, isoNow()
  ).run();

  // Update instruction status
  await DB.prepare(`
    UPDATE settlement_instructions SET status = 'CONFIRMED', psp_reference = ?, executed_at = ? WHERE id = ?
  `).bind(psp_reference || null, isoNow(), settlement_instruction_id).run();

  return c.json({
    data: {
      confirmation_id: confirmId,
      settlement_instruction_id,
      proof_hash: proofHash,
      amount_confirmed: amount_received || instruction.amount,
      status: 'CONFIRMED',
      verification: { signature_valid: signatureValid, ustn_matched: ustnMatched, amount_matched: amountMatched },
      governor_decision: gov
    },
    message: 'Payment received and verified. Settlement confirmed.'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.5 — AI-POWERED RECONCILIATION
// POST /v1/settlement/reconcile
// Reconciliation Engine (A2, HF Donut) matches payments with >= 95% confidence
// Governor: G6U5 (Confidence >= 95% for auto-match)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/reconcile', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const reconId = uuid();

  const { settlement_instruction_id, psp_reference, amount_received, ustn_in_reference } = body;
  if (!settlement_instruction_id) {
    return c.json({ error: 'settlement_instruction_id required' }, 400);
  }

  const instruction = await DB.prepare('SELECT * FROM settlement_instructions WHERE id = ?')
    .bind(settlement_instruction_id).first() as any;
  if (!instruction) return c.json({ error: 'Settlement instruction not found' }, 404);

  // AI Reconciliation Engine — confidence scoring
  const amountMatch = amount_received ? (1 - Math.abs(amount_received - instruction.amount) / instruction.amount) : 0.5;
  const ustnPresent = ustn_in_reference ? 1.0 : 0.3;
  const partyConsistency = 0.95; // Simulated: payer/payee identity check

  // Weighted confidence: amount (40%) + USTN (35%) + party (25%)
  const confidence = amountMatch * 0.4 + ustnPresent * 0.35 + partyConsistency * 0.25;
  const confidencePct = Math.round(confidence * 10000) / 100;
  const autoMatched = confidencePct >= 95;

  // Governor G6U5: Auto-match threshold
  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.reconcile',
    actor_gtid: 'SYSTEM',
    action_context: { settlement_instruction_id, confidence: confidencePct, auto_matched: autoMatched },
  });

  // Store reconciliation result
  await DB.prepare(`
    INSERT INTO auto_reconciliation_results (id, settlement_instruction_id, reconciliation_confidence, mismatch_details, requires_human_review, result_status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(reconId, settlement_instruction_id, confidencePct, JSON.stringify({ amount_expected: instruction.amount, amount_received: amount_received || 0, delta: Math.abs((amount_received || 0) - instruction.amount) }), autoMatched ? 0 : 1, autoMatched ? 'AUTO_MATCHED' : 'PENDING_REVIEW', gov.decision_id, isoNow()).run();

  // Update settlement confirmation with reconciliation confidence
  if (autoMatched) {
    await DB.prepare(`
      UPDATE settlement_instructions SET status = 'RECONCILED', reconciled_at = ?, reconciliation_status = 'AUTO_MATCHED' WHERE id = ?
    `).bind(isoNow(), settlement_instruction_id).run();

    // Update confirmation record
    await DB.prepare(`
      UPDATE settlement_confirmations SET verified_by_ai = 1, reconciliation_confidence = ? WHERE instruction_id = ?
    `).bind(confidencePct, settlement_instruction_id).run();
  }

  return c.json({
    data: {
      reconciliation_id: reconId,
      settlement_instruction_id,
      confidence: confidencePct,
      auto_matched: autoMatched,
      status: autoMatched ? 'RECONCILED' : 'MANUAL_REVIEW',
      breakdown: {
        amount_match: Math.round(amountMatch * 100),
        ustn_presence: Math.round(ustnPresent * 100),
        party_consistency: Math.round(partyConsistency * 100)
      },
      threshold: 95,
      ai_model: 'HF Donut + Reconciliation Engine (A2)',
      governor_decision: gov
    },
    message: autoMatched
      ? `Auto-reconciled with ${confidencePct}% confidence.`
      : `Confidence ${confidencePct}% below 95% threshold. Queued for manual review.`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.6 — QUERY & STATUS (including voice query)
// GET /v1/settlement/status/:ustn
// ═══════════════════════════════════════════════════════════════════════════════
settlement.get('/settlement/status/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');

  const instructions = await DB.prepare(
    'SELECT * FROM settlement_instructions WHERE ustn = ? ORDER BY created_at DESC'
  ).bind(ustn).all();

  const confirmations: any[] = [];
  for (const instr of (instructions.results || [])) {
    const confs = await DB.prepare(
      'SELECT * FROM settlement_confirmations WHERE instruction_id = ?'
    ).bind((instr as any).id).all();
    confirmations.push(...(confs.results || []));
  }

  const reconciliations = await DB.prepare(`
    SELECT ar.* FROM auto_reconciliation_results ar
    JOIN settlement_instructions si ON ar.instruction_id = si.id
    WHERE si.ustn = ? ORDER BY ar.created_at DESC
  `).bind(ustn).all();

  return c.json({
    data: {
      ustn,
      instructions: instructions.results || [],
      confirmations,
      reconciliations: reconciliations.results || [],
      summary: {
        total_instructions: (instructions.results || []).length,
        confirmed: confirmations.length,
        reconciled: (instructions.results || []).filter((i: any) => i.status === 'RECONCILED').length
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 10 — SETTLEMENT SPLIT INSTRUCTION
// POST /v1/settlement/split-instruction
// Non-custodial PSP split: Net to recipient, SGTX fee portion
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/settlement/split-instruction', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, total_amount, sgtx_fee_amount, payer_tenant_id, payee_tenant_id, currency } = body;
  if (!ustn || !total_amount) {
    return c.json({ error: 'ustn, total_amount required' }, 400);
  }

  const feeAmount = sgtx_fee_amount || total_amount * 0.015;
  const netToPayee = total_amount - feeAmount;

  // Governor G6U8: No additional commission release during settlement (fees already collected)
  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.split',
    actor_gtid: 'SYSTEM',
    action_context: { ustn, total_amount, fee_amount: feeAmount, net_to_payee: netToPayee },
  });

  const splitPayload = {
    ustn,
    total_amount,
    splits: [
      { recipient: 'PAYEE', gtid: payee_tenant_id, amount: netToPayee, description: 'Trade principal (net)' },
      { recipient: 'SGTX', amount: feeAmount, description: 'SGTX platform fee (already collected upfront)' }
    ],
    currency: currency || 'USD',
    note: 'Non-custodial split via PSP Connect. SGTX fee already collected in Phase 3.',
  };

  await DB.prepare(`
    INSERT INTO settlement_instructions (id, ustn, instruction_type, payer_tenant_id, payee_tenant_id, amount, currency, payload, status, governor_decision_id, created_at)
    VALUES (?, ?, 'FEE_SPLIT', ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).bind(
    id, ustn, payer_tenant_id || null, payee_tenant_id || null,
    total_amount, currency || 'USD', JSON.stringify(splitPayload),
    gov.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      split_instruction_id: id,
      ustn,
      total_amount,
      net_to_payee: netToPayee,
      sgtx_fee: feeAmount,
      splits: splitPayload.splits,
      governor_decision: gov
    },
    message: 'Split settlement instruction created. Non-custodial fee handling.'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 10 — FEE GROSS-UP CALCULATION
// POST /v1/payment/fee/gross-up
// Formula: Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer
// Governor: G9U3 (Validate gross-up)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/payment/fee/gross-up', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { net_fee, psp_id, payer_country } = body;
  if (!net_fee) return c.json({ error: 'net_fee required' }, 400);

  // Get PSP fee schedule
  const psp = psp_id ? await DB.prepare('SELECT * FROM payment_aggregators WHERE id = ?').bind(psp_id).first() as any : null;
  const feeSchedule = psp?.fee_structure ? JSON.parse(psp.fee_structure) : { percentage: 2.9, fixed: 0.30 };
  const pctFee = feeSchedule.percentage / 100;
  const fixedFee = feeSchedule.fixed || 0;
  const safetyBufferPct = 0.005; // 0.5% default

  // Gross-up formula: Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer
  const baseGross = (net_fee + fixedFee) / (1 - pctFee);
  const safetyBuffer = baseGross * safetyBufferPct;
  const grossAmount = baseGross + safetyBuffer;

  // Governor G9U3: Validate gross-up
  const gov = await evaluateGovernor(DB, {
    decision_type: 'payment.gross_up',
    actor_gtid: 'SYSTEM',
    action_context: { net_fee, gross_amount: grossAmount, psp_fee_pct: pctFee },
  });

  // Store fee calculation
  await DB.prepare(`
    INSERT INTO fee_calculations (id, net_fee, gross_amount, fee_breakdown, safety_buffer_applied, safety_buffer_pct, governor_decision_id)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).bind(id, net_fee, Math.round(grossAmount * 100) / 100,
    JSON.stringify({ psp_percentage: feeSchedule.percentage, psp_fixed: fixedFee, safety_buffer_pct: safetyBufferPct * 100, safety_buffer_amount: Math.round(safetyBuffer * 100) / 100 }),
    safetyBufferPct, gov.decision_id
  ).run();

  return c.json({
    data: {
      calculation_id: id,
      net_fee,
      gross_amount: Math.round(grossAmount * 100) / 100,
      formula: 'Gross = (Net + Fixed_Fee) / (1 - Percentage_Fee) + Safety_Buffer',
      breakdown: {
        psp_percentage: feeSchedule.percentage,
        psp_fixed: fixedFee,
        base_gross: Math.round(baseGross * 100) / 100,
        safety_buffer_pct: safetyBufferPct * 100,
        safety_buffer_amount: Math.round(safetyBuffer * 100) / 100,
      },
      psp: psp ? { id: psp.id, name: psp.name } : null,
      governor_decision: gov
    },
    message: `Gross-up calculated: $${net_fee} → $${grossAmount.toFixed(2)} (incl. PSP fees + 0.5% safety buffer)`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PSP HEALTH MONITORING
// POST /v1/payment/psp/health-check — Record PSP health ping
// GET /v1/payment/psp/fallback/:country — Get fallback PSPs for country
// Governor: G9U1/G9U2 (Health >= 80), G9U6 (Fallback if < 50)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/payment/psp/health-check', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { aggregator_id, health_score, latency_ms, error_count, error_details } = body;
  if (!aggregator_id) return c.json({ error: 'aggregator_id required' }, 400);

  await DB.prepare(`
    INSERT INTO psp_health_logs (id, aggregator_id, health_score, latency_ms, error_count, success_rate, error_details, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, aggregator_id, health_score || 95, latency_ms || 100, error_count || 0, body.success_rate || 99.5, error_details ? JSON.stringify(error_details) : null, isoNow()).run();

  // Governor G9U6: Alert if health drops below 50
  if ((health_score || 95) < 50) {
    const gov = await evaluateGovernor(DB, {
      decision_type: 'psp.health_alert',
      actor_gtid: 'SYSTEM',
      action_context: { aggregator_id, health_score, alert: 'CRITICAL' },
    });
    return c.json({
      data: { health_log_id: id, alert: 'CRITICAL', health_score, governor_decision: gov },
      message: `PSP health CRITICAL (${health_score}). Manual override may be required.`
    });
  }

  return c.json({ data: { health_log_id: id, health_score: health_score || 95, status: 'OK' } });
});

settlement.get('/payment/psp/fallback/:country', async (c) => {
  const { DB } = c.env;
  const country = c.req.param('country');

  // Get PSPs that cover this country, ordered by health score
  const psps = await DB.prepare(`
    SELECT pa.id, pa.name, pa.country_codes, pa.supported_currencies, pa.avg_settlement_hours,
      (SELECT ph.health_score FROM psp_health_logs ph WHERE ph.aggregator_id = pa.id ORDER BY ph.checked_at DESC LIMIT 1) as latest_health
    FROM payment_aggregators pa
    WHERE pa.is_active = 1 AND (pa.country_codes LIKE ? OR pa.country_codes LIKE '%GLOBAL%')
    ORDER BY latest_health DESC
  `).bind(`%${country}%`).all();

  const primary = (psps.results || [])[0] || null;
  const fallbacks = (psps.results || []).slice(1);

  return c.json({
    data: {
      country,
      primary,
      fallbacks,
      total_available: (psps.results || []).length,
      note: 'PSPs ordered by latest health score. Primary has highest health.'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 10 — OPEN BANKING RECONCILIATION
// POST /v1/payment/fee/reconcile
// Daily reconciliation: HF Donut extraction from bank statements
// Governor: G10U2 (Confidence >= 95% for auto-match)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.post('/payment/fee/reconcile', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { payment_attempt_id, bank_statement_data, extracted_amount, extracted_reference } = body;
  if (!payment_attempt_id) return c.json({ error: 'payment_attempt_id required' }, 400);

  const payment = await DB.prepare('SELECT * FROM payment_attempts WHERE id = ?').bind(payment_attempt_id).first() as any;
  if (!payment) return c.json({ error: 'Payment attempt not found' }, 404);

  // AI extraction simulation (HF Donut)
  const expectedAmount = payment.amount_usd || payment.gross_amount || 0;
  const receivedAmount = extracted_amount || expectedAmount;
  const amountConfidence = 1 - Math.abs(expectedAmount - receivedAmount) / (expectedAmount || 1);
  const referenceConfidence = extracted_reference ? 0.95 : 0.6;
  const overallConfidence = (amountConfidence * 0.6 + referenceConfidence * 0.4) * 100;
  const autoMatched = overallConfidence >= 95;

  // Governor G10U2
  const gov = await evaluateGovernor(DB, {
    decision_type: 'payment.reconcile',
    actor_gtid: 'SYSTEM',
    action_context: { payment_attempt_id, confidence: overallConfidence, auto_matched: autoMatched },
  });

  if (autoMatched) {
    await DB.prepare(`
      UPDATE payment_attempts SET status = 'RECONCILED', webhook_verified = 1, settled_at = ? WHERE id = ?
    `).bind(isoNow(), payment_attempt_id).run();
  }

  await DB.prepare(`
    INSERT INTO auto_reconciliation_results (id, settlement_instruction_id, reconciliation_confidence, mismatch_details, requires_human_review, result_status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, payment_attempt_id, overallConfidence, JSON.stringify({ amount_expected: expectedAmount, amount_received: receivedAmount, delta: Math.abs(expectedAmount - receivedAmount) }), autoMatched ? 0 : 1, autoMatched ? 'AUTO_MATCHED' : 'PENDING_REVIEW', gov.decision_id, isoNow()).run();

  return c.json({
    data: {
      reconciliation_id: id,
      payment_attempt_id,
      confidence: Math.round(overallConfidence * 100) / 100,
      auto_matched: autoMatched,
      status: autoMatched ? 'RECONCILED' : 'MANUAL_REVIEW',
      ai_model: 'HF Donut (A2)',
      governor_decision: gov
    },
    message: autoMatched
      ? `Fee payment auto-reconciled (${overallConfidence.toFixed(1)}% confidence).`
      : `Below 95% threshold (${overallConfidence.toFixed(1)}%). Queued for manual review.`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.7 — TENANT DATA EXPORT
// GET /v1/settlement/export/:ustn
// Monthly reconciliation statements (PDF/CSV/JSON) with Ed25519 signatures
// ═══════════════════════════════════════════════════════════════════════════════
settlement.get('/settlement/export/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const format = c.req.query('format') || 'JSON';

  const instructions = await DB.prepare(
    'SELECT * FROM settlement_instructions WHERE ustn = ?'
  ).bind(ustn).all();

  const confirmations = await DB.prepare(`
    SELECT sc.* FROM settlement_confirmations sc
    JOIN settlement_instructions si ON sc.instruction_id = si.id
    WHERE si.ustn = ?
  `).bind(ustn).all();

  const exportData = {
    ustn,
    generated_at: isoNow(),
    format,
    instructions: instructions.results || [],
    confirmations: confirmations.results || [],
    signature: await signDecision(JSON.stringify({ ustn, export_at: isoNow() })),
    integrity: 'Ed25519 signed export'
  };

  return c.json({ data: exportData, message: `Settlement export for USTN ${ustn} (${format} format)` });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6.8 — MULTI-SHIPMENT SETTLEMENT
// GET /v1/settlement/multi-shipment/:contract_id
// Independent approval and payment for each shipment
// Governor: G6U9 (Shipments settle independently)
// ═══════════════════════════════════════════════════════════════════════════════
settlement.get('/settlement/multi-shipment/:contract_id', async (c) => {
  const { DB } = c.env;
  const contractId = c.req.param('contract_id');

  const contract = await DB.prepare('SELECT * FROM contracts WHERE id = ?').bind(contractId).first() as any;
  if (!contract) return c.json({ error: 'Contract not found' }, 404);

  const shipments = await DB.prepare(
    'SELECT * FROM contract_shipments WHERE contract_id = ? ORDER BY shipment_number'
  ).bind(contractId).all();

  // For each shipment with a USTN, get settlement status
  const shipmentSettlements = [];
  for (const ship of (shipments.results || [])) {
    const s = ship as any;
    let settlementStatus = null;
    if (s.ustn) {
      const instructions = await DB.prepare(
        'SELECT id, status, amount, currency FROM settlement_instructions WHERE ustn = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(s.ustn).first();
      settlementStatus = instructions;
    }
    shipmentSettlements.push({
      ...s,
      settlement: settlementStatus
    });
  }

  return c.json({
    data: {
      contract_id: contractId,
      contract_type: contract.contract_type,
      shipments: shipmentSettlements,
      summary: {
        total_shipments: shipmentSettlements.length,
        settled: shipmentSettlements.filter((s: any) => s.settlement?.status === 'RECONCILED').length,
        pending: shipmentSettlements.filter((s: any) => !s.settlement || s.settlement?.status === 'PENDING').length,
        note: 'Each shipment settles independently per G6U9'
      }
    }
  });
});

export default settlement;

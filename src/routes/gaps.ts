// SGTX Platform v6.2 — Blueprint Gap Routes
// Covers: Packing Plans, Container Loading, Voice Transcripts, Evidence Packages,
// Digital Twin, PSP Health, Settlement Paths, Commission Singularity, Autonomous Ops,
// Payment Verification, DeFi Financing, Distressed Notifications, Secondary Market,
// Regulatory Compliance, Netting Circles, FX Optimization
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor } from '../lib/governor';
import type { Bindings } from '../lib/types';

const gaps = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// PACKING PLANS & PALLET DETAILS (Phase 2 — Blueprint 3933)
// ═══════════════════════════════════════════════════════════

gaps.get('/packing-plans', async (c) => {
  const tradeId = c.req.query('trade_request_id');
  let sql = `SELECT pp.*, eq.exw_price, eq.incoterm FROM packing_plans pp LEFT JOIN exporter_quotes eq ON pp.exporter_quote_id = eq.id`;
  if (tradeId) sql += ` WHERE pp.trade_request_id = '${tradeId}'`;
  sql += ' ORDER BY pp.created_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.get('/packing-plans/:id', async (c) => {
  const plan = await c.env.DB.prepare('SELECT * FROM packing_plans WHERE id = ?').bind(c.req.param('id')).first();
  if (!plan) return c.json({ error: 'Packing plan not found' }, 404);
  const { results: pallets } = await c.env.DB.prepare('SELECT * FROM pallet_details WHERE packing_plan_id = ? ORDER BY pallet_number ASC').bind(plan.id).all();
  const { results: containers } = await c.env.DB.prepare('SELECT * FROM container_loading_plans WHERE packing_plan_id = ?').bind(plan.id).all();
  return c.json({ data: { ...plan, pallet_details: JSON.parse((plan.pallet_details as string) || '[]'), pallets, containers } });
});

gaps.post('/packing-plans', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'packing.plan.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { trade_request_id: body.trade_request_id, total_pallets: body.total_pallets },
  });

  await c.env.DB.prepare(`INSERT INTO packing_plans (id, exporter_quote_id, trade_request_id, pallet_details, container_type, total_pallets, total_weight_kg, visual_layout, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.exporter_quote_id || null, body.trade_request_id || null, JSON.stringify(body.pallet_details || []), body.container_type || '40HC_REEFER', body.total_pallets || 0, body.total_weight_kg || 0, JSON.stringify(body.visual_layout || {}), gov.decision_id).run();

  // Auto-create pallet detail records
  if (body.pallet_details && Array.isArray(body.pallet_details)) {
    for (let i = 0; i < body.pallet_details.length; i++) {
      const p = body.pallet_details[i];
      await c.env.DB.prepare(`INSERT INTO pallet_details (id, packing_plan_id, pallet_number, commodity_description, hs_code, carton_count, gross_weight_kg, net_weight_kg, dimensions_cm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(uuid(), id, i + 1, p.commodity_description || null, p.hs_code || null, p.carton_count || 0, p.gross_weight_kg || 0, p.net_weight_kg || 0, JSON.stringify(p.dimensions_cm || {})).run();
    }
  }

  return c.json({ data: { id, governor_decision: gov }, message: 'Packing plan created with pallet details' }, 201);
});

gaps.patch('/packing-plans/:id/lock', async (c) => {
  await c.env.DB.prepare("UPDATE packing_plans SET status = 'LOCKED', locked_at = ? WHERE id = ?").bind(isoNow(), c.req.param('id')).run();
  return c.json({ message: 'Packing plan locked' });
});

// ─── CONTAINER LOADING PLANS ──────────────────────────────

gaps.post('/container-loading', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'container.loading.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { packing_plan_id: body.packing_plan_id },
  });

  await c.env.DB.prepare(`INSERT INTO container_loading_plans (id, packing_plan_id, container_number, container_type, seal_number, max_payload_kg, utilized_volume_pct, pallet_sequence, loading_instructions, ar_visualization_data, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.packing_plan_id, body.container_number || null, body.container_type || '40HC_REEFER', body.seal_number || null, body.max_payload_kg || 28000, body.utilized_volume_pct || 0, JSON.stringify(body.pallet_sequence || []), JSON.stringify(body.loading_instructions || {}), JSON.stringify(body.ar_visualization_data || {}), gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Container loading plan created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// VOICE TRANSCRIPTS (Phase 5, 10 — Blueprint 4491)
// ═══════════════════════════════════════════════════════════

gaps.get('/voice-transcripts', async (c) => {
  const ustn = c.req.query('ustn');
  const employeeId = c.req.query('employee_id');
  let sql = 'SELECT * FROM voice_transcripts';
  const conds: string[] = [];
  if (ustn) conds.push(`ustn = '${ustn}'`);
  if (employeeId) conds.push(`employee_id = '${employeeId}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/voice-transcripts', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO voice_transcripts (id, employee_id, ustn, trade_request_id, raw_audio_hash, transcribed_text, extracted_intent, language, model_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.employee_id || null, body.ustn || null, body.trade_request_id || null, body.raw_audio_hash || null, body.transcribed_text, JSON.stringify(body.extracted_intent || {}), body.language || 'en', body.model_version || 'vosk-0.22').run();
  return c.json({ data: { id }, message: 'Voice transcript stored' }, 201);
});

// ═══════════════════════════════════════════════════════════
// EVIDENCE PACKAGES (Phase 10 — Blueprint 4501)
// ═══════════════════════════════════════════════════════════

gaps.get('/disputes/:id/evidence-package', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM evidence_packages WHERE dispute_id = ? ORDER BY compiled_at DESC').bind(c.req.param('id')).all();
  return c.json({ data: results });
});

gaps.post('/disputes/:id/evidence-package', async (c) => {
  const body = await c.req.json();
  const disputeId = c.req.param('id');
  const id = uuid();

  // Auto-compile evidence from trade data
  const dispute = await c.env.DB.prepare('SELECT * FROM disputes WHERE id = ?').bind(disputeId).first();
  if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

  // Gather milestones, documents, IoT data
  let milestones: any[] = [];
  let documents: any[] = [];
  let iot: any[] = [];
  let disruptions: any[] = [];

  if (dispute.trade_request_id) {
    const contract = await c.env.DB.prepare('SELECT * FROM contracts WHERE trade_request_id = ?').bind(dispute.trade_request_id).first();
    if (contract) {
      const shipment = await c.env.DB.prepare('SELECT * FROM shipments WHERE contract_id = ?').bind(contract.id).first();
      if (shipment) {
        const ms = await c.env.DB.prepare('SELECT * FROM shipment_milestones WHERE ustn = ?').bind(shipment.ustn).all();
        milestones = ms.results;
        const docs = await c.env.DB.prepare('SELECT * FROM documents WHERE shipment_ustn = ?').bind(shipment.ustn).all();
        documents = docs.results;
        const iotData = await c.env.DB.prepare('SELECT * FROM iot_sensor_readings WHERE ustn = ? ORDER BY recorded_at DESC LIMIT 50').bind(shipment.ustn).all();
        iot = iotData.results;
        const dp = await c.env.DB.prepare('SELECT * FROM disruption_predictions WHERE ustn = ?').bind(shipment.ustn).all();
        disruptions = dp.results;
      }
    }
  }

  const evidenceData = {
    dispute_id: disputeId,
    dispute_type: dispute.dispute_type,
    milestones,
    documents: documents.map((d: any) => ({ id: d.id, type: d.document_type, hash: d.sha256_hash, filename: d.filename })),
    iot_readings: iot.length,
    disruption_predictions: disruptions,
    additional_evidence: body.additional_evidence || [],
    compiled_at: isoNow(),
  };

  const loomHash = `sha256:evidence:${uuid()}`;
  const aiSummary = `Evidence package compiled for ${dispute.dispute_type} dispute. ${milestones.length} milestones, ${documents.length} documents, ${iot.length} IoT readings, ${disruptions.length} disruption predictions gathered.`;

  await c.env.DB.prepare(`INSERT INTO evidence_packages (id, dispute_id, package, loom_hash, ai_summary, compiled_by) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, disputeId, JSON.stringify(evidenceData), loomHash, aiSummary, body.compiled_by || 'AI_EVIDENCE_COMPILER').run();

  return c.json({ data: { id, summary: aiSummary, evidence_counts: { milestones: milestones.length, documents: documents.length, iot_readings: iot.length, disruptions: disruptions.length } }, message: 'Evidence package compiled' }, 201);
});

// ═══════════════════════════════════════════════════════════
// DIGITAL TWIN SNAPSHOTS (Phase 5 — Blueprint 4509)
// ═══════════════════════════════════════════════════════════

gaps.get('/shipments/:ustn/digital-twin', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM digital_twin_snapshots WHERE ustn = ? ORDER BY created_at DESC LIMIT 10').bind(c.req.param('ustn')).all();
  return c.json({ data: results });
});

gaps.post('/shipments/:ustn/digital-twin', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO digital_twin_snapshots (id, ustn, simulation_params, predicted_eta, shelf_life_days, temperature_forecast, risk_assessment) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, c.req.param('ustn'), JSON.stringify(body.simulation_params || {}), body.predicted_eta || null, body.shelf_life_days || null, JSON.stringify(body.temperature_forecast || {}), JSON.stringify(body.risk_assessment || {})).run();
  return c.json({ data: { id }, message: 'Digital twin snapshot created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// PSP HEALTH MONITORING (Phase 9 — Blueprint 4518)
// ═══════════════════════════════════════════════════════════

gaps.get('/psp-health', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT h.*, a.name as aggregator_name FROM psp_health_logs h
    JOIN payment_aggregators a ON h.aggregator_id = a.id
    ORDER BY h.checked_at DESC LIMIT 100
  `).all();
  return c.json({ data: results });
});

gaps.post('/psp-health', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO psp_health_logs (id, aggregator_id, health_score, latency_ms, error_count) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, body.aggregator_id, body.health_score || 100, body.latency_ms || 0, body.error_count || 0).run();

  // Update aggregator uptime score
  await c.env.DB.prepare('UPDATE payment_aggregators SET uptime_score = ?, last_health_check = ? WHERE id = ?')
    .bind((body.health_score || 100) / 100, isoNow(), body.aggregator_id).run();

  return c.json({ data: { id }, message: 'PSP health check logged' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SECONDARY MARKET (Phase 4 — Blueprint 4526)
// ═══════════════════════════════════════════════════════════

gaps.get('/secondary-market', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT sm.*, fa.financing_request_id FROM secondary_market_prices sm
    JOIN financing_agreements fa ON sm.financing_agreement_id = fa.id
    WHERE sm.status = 'LISTED'
    ORDER BY sm.created_at DESC
  `).all();
  return c.json({ data: results });
});

gaps.post('/secondary-market', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO secondary_market_prices (id, financing_agreement_id, suggested_price, rationale, buyer_gtid, status) VALUES (?, ?, ?, ?, ?, 'LISTED')`)
    .bind(id, body.financing_agreement_id, body.suggested_price, body.rationale || null, body.buyer_gtid || null).run();
  return c.json({ data: { id }, message: 'Secondary market listing created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// DISTRESSED CONTACT NOTIFICATIONS (Phase 8 — Blueprint 4534)
// ═══════════════════════════════════════════════════════════

gaps.get('/distressed/:id/notifications', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM distressed_contact_notifications WHERE distressed_listing_id = ? ORDER BY sent_at DESC').bind(c.req.param('id')).all();
  return c.json({ data: results });
});

gaps.post('/distressed/:id/notify', async (c) => {
  const body = await c.req.json();
  const listingId = c.req.param('id');
  const listing = await c.env.DB.prepare('SELECT * FROM distressed_cargo_listings WHERE id = ?').bind(listingId).first();
  if (!listing) return c.json({ error: 'Listing not found' }, 404);

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'distressed.notify', actor_gtid: body.actor_gtid || 'system',
    action_context: { listing_id: listingId, recipients: body.recipient_gtids },
  });

  const notifications: any[] = [];
  for (const gtid of (body.recipient_gtids || [])) {
    const notifId = uuid();
    const tenant = await c.env.DB.prepare('SELECT legal_name FROM tenants WHERE gtid = ?').bind(gtid).first();
    await c.env.DB.prepare(`INSERT INTO distressed_contact_notifications (id, distressed_listing_id, distressed_ustn, recipient_gtid, recipient_name, message_hash) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(notifId, listingId, listing.original_shipment_ustn || '', gtid, (tenant?.legal_name as string) || 'Unknown', `hash:${uuid()}`).run();
    notifications.push({ id: notifId, recipient_gtid: gtid });
  }

  return c.json({ data: { notifications, governor_decision: gov }, message: `${notifications.length} contacts notified` }, 201);
});

// ═══════════════════════════════════════════════════════════
// AUTONOMOUS OPERATIONS (Phase 5 — Blueprint 4820+)
// ═══════════════════════════════════════════════════════════

gaps.get('/autonomous-milestones', async (c) => {
  const ustn = c.req.query('ustn');
  let sql = 'SELECT am.*, s.status as shipment_status FROM autonomous_milestones am LEFT JOIN shipments s ON am.shipment_ustn = s.ustn';
  if (ustn) sql += ` WHERE am.shipment_ustn = '${ustn}'`;
  sql += ' ORDER BY am.created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/autonomous-milestones', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'autonomous.milestone.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: body.shipment_ustn, milestone: body.milestone },
  });

  await c.env.DB.prepare(`INSERT INTO autonomous_milestones (id, shipment_ustn, milestone, consensus_threshold, source_count, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, body.shipment_ustn, body.milestone, body.consensus_threshold || 0.67, body.source_count || 0, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Autonomous milestone configured' }, 201);
});

gaps.post('/autonomous-milestones/:id/consensus', async (c) => {
  const body = await c.req.json();
  const milestoneId = c.req.param('id');
  const consensusId = uuid();

  await c.env.DB.prepare(`INSERT INTO sensor_consensus (id, milestone_id, source_type, source_value, weight, consensus_met) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(consensusId, milestoneId, body.source_type, JSON.stringify(body.source_value || {}), body.weight || 1.0, 0).run();

  // Check if consensus reached
  const milestone = await c.env.DB.prepare('SELECT * FROM autonomous_milestones WHERE id = ?').bind(milestoneId).first();
  const { results: sources } = await c.env.DB.prepare('SELECT * FROM sensor_consensus WHERE milestone_id = ?').bind(milestoneId).all();
  const totalWeight = sources.reduce((sum: number, s: any) => sum + (s.weight || 0), 0);
  const threshold = (milestone?.consensus_threshold as number) || 0.67;
  const consensusMet = totalWeight >= threshold;

  if (consensusMet) {
    await c.env.DB.prepare("UPDATE autonomous_milestones SET auto_confirmed = 1, source_count = ? WHERE id = ?").bind(sources.length, milestoneId).run();
    await c.env.DB.prepare("UPDATE sensor_consensus SET consensus_met = 1 WHERE milestone_id = ?").bind(milestoneId).run();
  }

  return c.json({ data: { consensus_id: consensusId, total_weight: totalWeight, threshold, consensus_met: consensusMet }, message: consensusMet ? 'Consensus reached — milestone auto-confirmed' : 'Source added, consensus not yet reached' });
});

// ─── COMPUTER VISION ──────────────────────────────────────

gaps.get('/computer-vision', async (c) => {
  const ustn = c.req.query('ustn');
  let sql = 'SELECT * FROM computer_vision_jobs';
  if (ustn) sql += ` WHERE shipment_ustn = '${ustn}'`;
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/computer-vision', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'cv.analyze', actor_gtid: body.actor_gtid || 'system',
    action_context: { shipment_ustn: body.shipment_ustn },
  });

  await c.env.DB.prepare(`INSERT INTO computer_vision_jobs (id, shipment_ustn, image_path, model_version, detected_objects, confidence, requires_human_review, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.shipment_ustn || null, body.image_path, body.model_version || 'hf-donut-v1', JSON.stringify(body.detected_objects || {}), body.confidence || 0.0, body.requires_human_review ? 1 : 0, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'CV job created' }, 201);
});

// ─── DISRUPTION RECOVERY ──────────────────────────────────

gaps.post('/disruptions/:id/recovery', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'disruption.recovery', actor_gtid: body.actor_gtid || 'system',
    action_context: { disruption_id: c.req.param('id'), action_type: body.action_type },
  });

  await c.env.DB.prepare(`INSERT INTO autonomous_recovery_actions (id, disruption_id, action_type, cost_estimate, auto_execute_threshold, requires_approval, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, c.req.param('id'), body.action_type, body.cost_estimate || 0, body.auto_execute_threshold || 0.9, body.requires_approval !== false ? 1 : 0, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Recovery action proposed' }, 201);
});

// ─── SMART CONTAINER DECISIONS ────────────────────────────

gaps.post('/shipments/:ustn/container-decision', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'container.smart.decision', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: c.req.param('ustn'), decision_type: body.decision_type },
  });

  await c.env.DB.prepare(`INSERT INTO smart_container_decisions (id, shipment_ustn, decision_type, decision_data, safety_parameters, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, c.req.param('ustn'), body.decision_type, JSON.stringify(body.decision_data || {}), JSON.stringify(body.safety_parameters || {}), gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Smart container decision recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SETTLEMENT ADVANCED (Phase 6 — Blueprint 4886+)
// ═══════════════════════════════════════════════════════════

// ─── LIQUIDITY PREDICTIONS ──────────────────────────────

gaps.get('/liquidity-predictions', async (c) => {
  const tradeId = c.req.query('trade_id');
  let sql = 'SELECT * FROM liquidity_predictions';
  if (tradeId) sql += ` WHERE trade_id = '${tradeId}'`;
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/liquidity-predictions', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO liquidity_predictions (id, trade_id, prediction_horizon_days, predicted_liquidity_need, confidence, model_version, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.trade_id, body.prediction_horizon_days || 30, body.predicted_liquidity_need, body.confidence || 0.8, body.model_version || 'lightgbm-v1.0', body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Liquidity prediction recorded' }, 201);
});

// ─── NETTING CIRCLES ──────────────────────────────────────

gaps.get('/netting-circles', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM netting_circles WHERE status IN ('PROPOSED','ACTIVE') ORDER BY created_at DESC").all();
  return c.json({ data: results });
});

gaps.post('/netting-circles', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const circleId = `NC-${Date.now()}-${uuid().slice(0, 6)}`;
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'netting.circle.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { member_count: (body.member_gtids || []).length, netted_amount: body.netted_amount },
  });

  await c.env.DB.prepare(`INSERT INTO netting_circles (id, circle_id, member_gtids, netted_amount, governor_decision_id) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, circleId, JSON.stringify(body.member_gtids || []), body.netted_amount || 0, gov.decision_id).run();

  return c.json({ data: { id, circle_id: circleId, governor_decision: gov }, message: 'Netting circle proposed' }, 201);
});

// ─── FX OPTIMIZATION ──────────────────────────────────────

gaps.get('/fx-optimization', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM fx_optimization_paths ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/fx-optimization', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO fx_optimization_paths (id, settlement_instruction_id, currency_path, predicted_slippage, governor_decision_id) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, body.settlement_instruction_id, JSON.stringify(body.currency_path || []), body.predicted_slippage || 0, body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'FX optimization path created' }, 201);
});

// ─── AUTO RECONCILIATION ──────────────────────────────────

gaps.get('/auto-reconciliation', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM auto_reconciliation_results ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/auto-reconciliation', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO auto_reconciliation_results (id, settlement_instruction_id, reconciliation_confidence, mismatch_details, requires_human_review, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, body.settlement_instruction_id || null, body.reconciliation_confidence || 0, JSON.stringify(body.mismatch_details || {}), body.requires_human_review ? 1 : 0, body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Reconciliation result recorded' }, 201);
});

// ─── PREDICTIVE ESCROWS ──────────────────────────────────

gaps.get('/predictive-escrows', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT pe.*, c.incoterm, c.status as contract_status FROM predictive_escrows pe LEFT JOIN contracts c ON pe.contract_id = c.id WHERE pe.status = 'ACTIVE' ORDER BY pe.created_at DESC").all();
  return c.json({ data: results });
});

gaps.post('/predictive-escrows', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'escrow.create', actor_gtid: body.actor_gtid || 'system',
    action_context: { contract_id: body.contract_id },
  });

  await c.env.DB.prepare(`INSERT INTO predictive_escrows (id, contract_id, trigger_hierarchy, primary_condition, escrow_amount, escrow_currency, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.contract_id, JSON.stringify(body.trigger_hierarchy || {}), body.primary_condition || null, body.escrow_amount || 0, body.escrow_currency || 'USD', gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Predictive escrow created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// COMMISSION SINGULARITY (Phase 6 — Blueprint 4939)
// ═══════════════════════════════════════════════════════════

gaps.get('/commission-singularity', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM commission_singularity_calculations ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/commission-singularity', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'commission.singularity', actor_gtid: body.actor_gtid || 'system',
    action_context: { trade_id: body.trade_id, base_rate: body.base_rate },
  });

  const adjustments = body.adjustments || {};
  const baseRate = body.base_rate || 0.01;
  let finalRate = baseRate;
  if (adjustments.loyalty_discount) finalRate -= adjustments.loyalty_discount;
  if (adjustments.volume_bonus) finalRate -= adjustments.volume_bonus;
  if (adjustments.corridor_premium) finalRate += adjustments.corridor_premium;
  if (adjustments.risk_premium) finalRate += adjustments.risk_premium;
  finalRate = Math.max(0.001, Math.min(0.025, finalRate)); // Clamp

  await c.env.DB.prepare(`INSERT INTO commission_singularity_calculations (id, trade_id, base_rate, adjustments, final_rate, policy_bounds_check, explanation, governor_decision_id) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`)
    .bind(id, body.trade_id, baseRate, JSON.stringify(adjustments), finalRate, `Commission singularity: ${(finalRate * 100).toFixed(3)}% after adjustments`, gov.decision_id).run();

  return c.json({ data: { id, final_rate: finalRate, governor_decision: gov }, message: 'Commission singularity calculated' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SETTLEMENT PATHS (Phase 6 — Blueprint 4949)
// ═══════════════════════════════════════════════════════════

gaps.get('/settlement-paths', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM settlement_path_executions ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/settlement-paths', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO settlement_path_executions (id, settlement_instruction_id, bridge_contracts, verification_hashes, execution_status, governor_decision_id) VALUES (?, ?, ?, ?, 'PENDING', ?)`)
    .bind(id, body.settlement_instruction_id, JSON.stringify(body.bridge_contracts || []), JSON.stringify(body.verification_hashes || []), body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Settlement path execution created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// PAYMENT VERIFICATION (Phase 9 — Blueprint 4958)
// ═══════════════════════════════════════════════════════════

gaps.get('/payment-verification', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM payment_verification_events ORDER BY verified_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/payment-verification', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'payment.verify', actor_gtid: body.actor_gtid || 'system',
    action_context: { verification_source: body.verification_source, amount: body.verified_amount },
  });

  await c.env.DB.prepare(`INSERT INTO payment_verification_events (id, settlement_instruction_id, verification_source, external_reference, extracted_ustn, payment_type, verified_amount, verified_currency, verified_at, raw_payload, governor_decision_id, match_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.settlement_instruction_id || null, body.verification_source, body.external_reference, body.extracted_ustn || null, body.payment_type || null, body.verified_amount, body.verified_currency || 'USD', isoNow(), JSON.stringify(body.raw_payload || {}), gov.decision_id, body.match_status || 'MATCHED').run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Payment verification event recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// DeFi FINANCING TRANSACTIONS (Phase 4 — Blueprint 5108)
// ═══════════════════════════════════════════════════════════

gaps.get('/defi-transactions', async (c) => {
  const agreementId = c.req.query('financing_agreement_id');
  let sql = 'SELECT * FROM defi_financing_transactions';
  if (agreementId) sql += ` WHERE financing_agreement_id = '${agreementId}'`;
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/defi-transactions', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'defi.transaction', actor_gtid: body.actor_gtid || 'system',
    action_context: { chain: body.chain, protocol: body.protocol, type: body.transaction_type },
  });

  await c.env.DB.prepare(`INSERT INTO defi_financing_transactions (id, financing_agreement_id, chain, protocol, transaction_type, amount, stablecoin, tx_hash, status, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`)
    .bind(id, body.financing_agreement_id, body.chain, body.protocol, body.transaction_type, body.amount || 0, body.stablecoin || 'USDC', body.tx_hash || null, gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'DeFi transaction recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// REGULATORY COMPLIANCE (Phase 4 — Blueprint 4800)
// ═══════════════════════════════════════════════════════════

gaps.get('/regulatory-compliance', async (c) => {
  const requestId = c.req.query('financing_request_id');
  let sql = 'SELECT * FROM regulatory_compliance';
  if (requestId) sql += ` WHERE financing_request_id = '${requestId}'`;
  sql += ' ORDER BY checked_at DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

gaps.post('/regulatory-compliance', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`INSERT INTO regulatory_compliance (id, financing_request_id, jurisdiction, requirement, satisfied, evidence_ref, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.financing_request_id, body.jurisdiction, body.requirement, body.satisfied ? 1 : 0, body.evidence_ref || null, body.governor_decision_id || null).run();
  return c.json({ data: { id }, message: 'Regulatory compliance check recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// JURISDICTION COMPLIANCE (Blueprint 4988)
// ═══════════════════════════════════════════════════════════

gaps.get('/jurisdiction-compliance', async (c) => {
  const code = c.req.query('jurisdiction_code');
  let sql = 'SELECT * FROM jurisdiction_compliance WHERE is_active = 1';
  if (code) sql += ` AND jurisdiction_code = '${code}'`;
  sql += ' ORDER BY jurisdiction_code, compliance_type';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// COMMISSION SETTLEMENT RECORDS (Phase 9 — Blueprint 5089)
// ═══════════════════════════════════════════════════════════

gaps.get('/commission-settlements', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM commission_settlement_records ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ data: results });
});

gaps.post('/commission-settlements', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'commission.settle', actor_gtid: body.actor_gtid || 'system',
    action_context: { commission_lock_id: body.commission_lock_id, method: body.settlement_method },
  });

  await c.env.DB.prepare(`INSERT INTO commission_settlement_records (id, commission_lock_id, settlement_method, gross_amount, net_amount, fee_amount, psp_name, settled_at, governor_decision_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.commission_lock_id, body.settlement_method || 'BANK_TRANSFER', body.gross_amount, body.net_amount, body.fee_amount || 0, body.psp_name || null, isoNow(), gov.decision_id).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'Commission settlement recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// SENSOR DATA LOGS (Phase 5 Milestone Verification)
// ═══════════════════════════════════════════════════════════

gaps.post('/sensor-data', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  const loomHash = `sha256:sensor:${uuid()}`;
  await c.env.DB.prepare(`INSERT INTO sensor_data_logs (id, milestone_id, sensor_source, data_hash, loom_hash, raw_data) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, body.milestone_id, body.sensor_source, body.data_hash || `hash:${uuid()}`, loomHash, JSON.stringify(body.raw_data || {})).run();
  return c.json({ data: { id, loom_hash: loomHash }, message: 'Sensor data logged' }, 201);
});

// ═══════════════════════════════════════════════════════════
// GAP STATS (aggregate all new table counts)
// ═══════════════════════════════════════════════════════════

gaps.get('/gap-stats', async (c) => {
  const queries = [
    c.env.DB.prepare('SELECT COUNT(*) as c FROM packing_plans').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM pallet_details').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM container_loading_plans').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM voice_transcripts').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM evidence_packages').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM digital_twin_snapshots').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM psp_health_logs').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM secondary_market_prices').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM distressed_contact_notifications').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM autonomous_milestones').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM computer_vision_jobs').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM liquidity_predictions').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM netting_circles').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM fx_optimization_paths').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM auto_reconciliation_results').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM predictive_escrows').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM commission_singularity_calculations').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM settlement_path_executions').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM payment_verification_events').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM defi_financing_transactions').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM regulatory_compliance').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM commission_settlement_records').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM sensor_data_logs').first(),
  ];
  const results = await Promise.allSettled(queries);
  const val = (i: number) => {
    const r = results[i];
    return r.status === 'fulfilled' && r.value ? (r.value as any).c || 0 : 0;
  };

  return c.json({
    data: {
      packing_plans: val(0), pallet_details: val(1), container_loading_plans: val(2),
      voice_transcripts: val(3), evidence_packages: val(4), digital_twin_snapshots: val(5),
      psp_health_logs: val(6), secondary_market_prices: val(7), distressed_notifications: val(8),
      autonomous_milestones: val(9), computer_vision_jobs: val(10), liquidity_predictions: val(11),
      netting_circles: val(12), fx_optimization_paths: val(13), auto_reconciliation: val(14),
      predictive_escrows: val(15), commission_singularity: val(16), settlement_paths: val(17),
      payment_verification: val(18), defi_transactions: val(19), regulatory_compliance: val(20),
      commission_settlements: val(21), sensor_data_logs: val(22),
    }
  });
});

export default gaps;

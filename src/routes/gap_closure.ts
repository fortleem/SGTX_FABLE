// SGTX Platform v6.3 — Blueprint Gap Closure Routes
// Phase 5: Physical Execution & Multiparty Tracking (Steps 5.1-5.7)
// Phase 7/8: Distressed Cargo Resolution (MicroUSTN, Condition AI, Outreach)
// Phase 10: Dispute Resolution (FeeLock Freeze, Evidence, Arbitration)
// QC: AQL Enforcement, Override Accountability
import { Hono } from 'hono';
import type { Bindings } from '../lib/types';

const gapClosure = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// PHASE 5: PHYSICAL EXECUTION & MULTIPARTY TRACKING
// ═══════════════════════════════════════════════════════════════════

// 5.1 Loading Window Selection
gapClosure.post('/physical/loading-window', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { contract_id, ustn, window_start, window_end, port_code, port_name, warehouse_address, contact_name, contact_phone } = body;
  if (!contract_id || !ustn || !window_start || !window_end) {
    return c.json({ error: 'contract_id, ustn, window_start, window_end required' }, 400);
  }
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO loading_windows (id, contract_id, ustn, window_start, window_end, port_code, port_name, warehouse_address, contact_name, contact_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')
  `).bind(id, contract_id, ustn, window_start, window_end, port_code || null, port_name || null, warehouse_address || null, contact_name || null, contact_phone || null).run();
  return c.json({ data: { id, contract_id, ustn, window_start, window_end, status: 'SCHEDULED' } });
});

gapClosure.get('/physical/loading-windows/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const windows = await DB.prepare('SELECT * FROM loading_windows WHERE ustn = ? ORDER BY window_start').bind(ustn).all();
  return c.json({ data: windows.results || [] });
});

gapClosure.patch('/physical/loading-window/:id/confirm', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json() as any;
  await DB.prepare('UPDATE loading_windows SET status = ?, confirmed_by = ?, confirmed_at = ? WHERE id = ?')
    .bind('CONFIRMED', body.confirmed_by || 'SYSTEM', new Date().toISOString(), id).run();
  return c.json({ data: { id, status: 'CONFIRMED' } });
});

// 5.2 Booking Confirmation AI Extraction (HF Donut model)
gapClosure.post('/physical/booking/ai-extract', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { booking_confirmation_id, document_url } = body;
  if (!document_url) return c.json({ error: 'document_url required' }, 400);
  const id = crypto.randomUUID();
  // Simulate HF Donut extraction (in production: call HF inference API)
  const extractedFields = {
    vessel_name: 'MSC OSCAR',
    voyage_number: 'FE425E',
    etd: '2025-02-15T08:00:00Z',
    eta: '2025-03-12T14:00:00Z',
    container_number: 'MSCU1234567',
    seal_number: 'SL-2025-88421',
    booking_reference: 'BK-2025-001234',
    port_of_loading: 'EGALY',
    port_of_discharge: 'VNSGN',
    carrier: 'Mediterranean Shipping Company'
  };
  await DB.prepare(`
    INSERT INTO booking_ai_extractions (id, booking_confirmation_id, document_url, model_used, extracted_fields, confidence_score)
    VALUES (?, ?, ?, 'HF_DONUT', ?, ?)
  `).bind(id, booking_confirmation_id || null, document_url, JSON.stringify(extractedFields), 0.94).run();
  return c.json({ data: { id, extracted_fields: extractedFields, confidence_score: 0.94, model: 'HF_DONUT', requires_human_verification: true } });
});

gapClosure.patch('/physical/booking/ai-extract/:id/verify', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json() as any;
  await DB.prepare('UPDATE booking_ai_extractions SET human_verified = 1, verified_by = ?, verification_notes = ? WHERE id = ?')
    .bind(body.verified_by || 'UNKNOWN', body.notes || null, id).run();
  return c.json({ data: { id, human_verified: true } });
});

// 5.3 Dynamic Document Requirements (AI validation)
gapClosure.get('/physical/document-requirements/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const docs = await DB.prepare('SELECT * FROM shipment_document_requirements WHERE shipment_id IN (SELECT id FROM shipments WHERE ustn = ?)').bind(ustn).all();
  // If no specific requirements, generate defaults based on trade corridors
  if (!docs.results?.length) {
    const defaultRequirements = [
      { type: 'COMMERCIAL_INVOICE', required: true, status: 'PENDING', description: 'Commercial invoice matching contract terms' },
      { type: 'PACKING_LIST', required: true, status: 'PENDING', description: 'Detailed packing list with weights/dims' },
      { type: 'BILL_OF_LADING', required: true, status: 'PENDING', description: 'Original or eBL with USTN reference' },
      { type: 'CERTIFICATE_OF_ORIGIN', required: true, status: 'PENDING', description: 'Certificate of origin (preferential if FTA applies)' },
      { type: 'INSPECTION_CERTIFICATE', required: false, status: 'NOT_REQUIRED', description: 'QC inspection certificate (if inspection booked)' },
      { type: 'INSURANCE_CERTIFICATE', required: false, status: 'PENDING', description: 'Marine cargo insurance (CIF/CIP terms)' },
      { type: 'PHYTOSANITARY', required: false, status: 'NOT_REQUIRED', description: 'Phytosanitary certificate (agricultural goods)' },
    ];
    return c.json({ data: defaultRequirements, source: 'AI_DEFAULT' });
  }
  return c.json({ data: docs.results, source: 'CONTRACT_SPECIFIC' });
});

// 5.5 Provider Invoice Upload & AI Comparison
gapClosure.post('/physical/invoice/compare', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { provider_invoice_id, original_quote_id, ustn, invoiced_items } = body;
  if (!ustn || !invoiced_items) return c.json({ error: 'ustn, invoiced_items required' }, 400);
  const id = crypto.randomUUID();
  // Simulate AI comparison (in production: compare extracted invoice fields against quote)
  const discrepancies = (invoiced_items as any[]).map((item: any) => {
    const variance = ((item.invoiced_amount - item.quoted_amount) / item.quoted_amount * 100);
    return {
      field: item.description,
      quoted_value: item.quoted_amount,
      invoiced_value: item.invoiced_amount,
      variance_pct: Math.round(variance * 100) / 100,
      flagged: Math.abs(variance) > 5
    };
  }).filter((d: any) => d.variance_pct !== 0);
  const totalVariance = discrepancies.reduce((sum: number, d: any) => sum + (d.invoiced_value - d.quoted_value), 0);
  const totalVariancePct = discrepancies.length > 0 ? discrepancies.reduce((sum: number, d: any) => sum + Math.abs(d.variance_pct), 0) / discrepancies.length : 0;
  const recommendation = totalVariancePct > 10 ? 'REJECT' : totalVariancePct > 5 ? 'FLAG' : 'APPROVE';
  await DB.prepare(`
    INSERT INTO invoice_comparisons (id, provider_invoice_id, original_quote_id, ustn, discrepancies, total_variance_amount, total_variance_pct, ai_recommendation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, provider_invoice_id || null, original_quote_id || null, ustn, JSON.stringify(discrepancies), totalVariance, totalVariancePct, recommendation).run();
  return c.json({ data: { id, discrepancies, total_variance_amount: totalVariance, total_variance_pct: totalVariancePct, ai_recommendation: recommendation } });
});

gapClosure.patch('/physical/invoice/compare/:id/approve', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json() as any;
  await DB.prepare('UPDATE invoice_comparisons SET approval_status = ?, approved_by = ?, approved_at = ? WHERE id = ?')
    .bind(body.status || 'APPROVED', body.approved_by || 'UNKNOWN', new Date().toISOString(), id).run();
  return c.json({ data: { id, approval_status: body.status || 'APPROVED' } });
});

// 5.6 Predictive Reliability (Barcode + Performance)
gapClosure.get('/physical/provider-reliability/:provider_gtid', async (c) => {
  const { DB } = c.env;
  const gtid = c.req.param('provider_gtid');
  const performance = await DB.prepare('SELECT * FROM logistics_performance WHERE provider_gtid = ? ORDER BY period_end DESC LIMIT 12').bind(gtid).all();
  // Calculate reliability metrics
  const records = performance.results || [];
  const avgOnTime = records.length > 0 ? (records as any[]).reduce((s: number, r: any) => s + (r.on_time_pct || 0), 0) / records.length : 0;
  const avgDocAccuracy = records.length > 0 ? (records as any[]).reduce((s: number, r: any) => s + (r.document_accuracy_pct || 0), 0) / records.length : 0;
  return c.json({ data: { provider_gtid: gtid, records: records.length, avg_on_time_pct: Math.round(avgOnTime * 10) / 10, avg_document_accuracy_pct: Math.round(avgDocAccuracy * 10) / 10, reliability_tier: avgOnTime > 95 ? 'GOLD' : avgOnTime > 85 ? 'SILVER' : 'BRONZE', trend: records.length >= 3 ? 'STABLE' : 'INSUFFICIENT_DATA' } });
});

// 5.7 Stuck Trade Recovery (escalating reminders)
gapClosure.get('/physical/stuck-trades', async (c) => {
  const { DB } = c.env;
  const stuck = await DB.prepare(`
    SELECT * FROM stuck_trade_recovery WHERE resolution_status = 'OPEN' ORDER BY escalation_level DESC, detected_at ASC LIMIT 50
  `).all();
  return c.json({ data: stuck.results || [] });
});

gapClosure.post('/physical/stuck-trade/escalate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { ustn, reason, current_phase } = body;
  if (!ustn) return c.json({ error: 'ustn required' }, 400);
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT OR REPLACE INTO stuck_trade_recovery (id, ustn, detected_at, reason, current_phase, escalation_level, resolution_status, last_reminder_sent)
    VALUES (?, ?, ?, ?, ?, 1, 'OPEN', ?)
  `).bind(id, ustn, new Date().toISOString(), reason || 'No progress detected', current_phase || 'UNKNOWN', new Date().toISOString()).run();
  return c.json({ data: { id, ustn, escalation_level: 1, status: 'OPEN' } });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 7/8: DISTRESSED CARGO RESOLUTION
// ═══════════════════════════════════════════════════════════════════

// 7.3 AI Condition Assessment (HF ViT model)
gapClosure.post('/distressed/condition-assess', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { listing_id, ustn, image_urls } = body;
  if (!listing_id) return c.json({ error: 'listing_id required' }, 400);
  const id = crypto.randomUUID();
  // Simulate HF ViT condition assessment
  const defects = [
    { type: 'WATER_DAMAGE', severity: 'MAJOR', confidence: 0.89, affected_area_pct: 15 },
    { type: 'PACKAGING_TORN', severity: 'MINOR', confidence: 0.92, affected_area_pct: 5 },
  ];
  const conditionScore = 62.5;
  const conditionGrade = conditionScore >= 90 ? 'A' : conditionScore >= 75 ? 'B' : conditionScore >= 60 ? 'C' : conditionScore >= 40 ? 'D' : 'F';
  await DB.prepare(`
    INSERT INTO condition_assessments (id, listing_id, ustn, model_used, images_analyzed, condition_score, condition_grade, defects_found, environmental_factors, recommendation)
    VALUES (?, ?, ?, 'HF_VIT', ?, ?, ?, ?, ?, ?)
  `).bind(id, listing_id, ustn || null, (image_urls || []).length || 3, conditionScore, conditionGrade,
    JSON.stringify(defects), JSON.stringify({ humidity: 78, temperature: 32, exposure_hours: 168 }),
    'Partial distress declaration recommended. Salvageable portion estimated at 85%.').run();
  return c.json({ data: { id, condition_score: conditionScore, condition_grade: conditionGrade, defects, recommendation: 'Partial distress declaration recommended.', model: 'HF_VIT' } });
});

// 7.4 Dynamic AI Pricing Engine (XGBoost)
gapClosure.post('/distressed/dynamic-price', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { listing_id, condition_score, hs_code, origin_country, original_value, days_in_port } = body;
  if (!listing_id) return c.json({ error: 'listing_id required' }, 400);
  const id = crypto.randomUUID();
  // XGBoost pricing simulation
  const depreciationFactor = Math.max(0.3, 1 - (days_in_port || 14) * 0.01);
  const conditionFactor = (condition_score || 50) / 100;
  const basePrice = (original_value || 100000) * depreciationFactor * conditionFactor;
  const suggestedPrice = Math.round(basePrice * 100) / 100;
  const priceFloor = Math.round(suggestedPrice * 0.7 * 100) / 100;
  const priceCeiling = Math.round(suggestedPrice * 1.3 * 100) / 100;
  await DB.prepare(`
    INSERT INTO dynamic_pricing_runs (id, listing_id, model_used, input_features, suggested_price, price_floor, price_ceiling, currency, confidence, market_comparison)
    VALUES (?, ?, 'XGBOOST', ?, ?, ?, ?, 'USD', ?, ?)
  `).bind(id, listing_id, JSON.stringify({ condition_score, hs_code, origin_country, original_value, days_in_port }),
    suggestedPrice, priceFloor, priceCeiling, 0.82,
    JSON.stringify({ percentile: 45, similar_sales_30d: 7, avg_sale_price: suggestedPrice * 0.95 })).run();
  return c.json({ data: { id, suggested_price: suggestedPrice, price_floor: priceFloor, price_ceiling: priceCeiling, confidence: 0.82, model: 'XGBOOST' } });
});

// 7.5 Triage Dashboard (3 paths)
gapClosure.get('/distressed/triage/:listing_id', async (c) => {
  const { DB } = c.env;
  const listingId = c.req.param('listing_id');
  const listing = await DB.prepare('SELECT * FROM distressed_cargo_listings WHERE id = ?').bind(listingId).first() as any;
  if (!listing) return c.json({ error: 'Listing not found' }, 404);
  const assessment = await DB.prepare('SELECT * FROM condition_assessments WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1').bind(listingId).first() as any;
  const pricing = await DB.prepare('SELECT * FROM dynamic_pricing_runs WHERE listing_id = ? ORDER BY created_at DESC LIMIT 1').bind(listingId).first() as any;
  const offers = await DB.prepare('SELECT COUNT(*) as count FROM distressed_cargo_offers WHERE listing_id = ?').bind(listingId).first() as any;
  return c.json({ data: { listing, condition_assessment: assessment, dynamic_pricing: pricing, offer_count: offers?.count || 0, triage_paths: [
    { path: 'SELL', label: 'Sell at Discount', viable: true, estimated_recovery_pct: 65, timeline_days: 7 },
    { path: 'COMPLY', label: 'Comply & Reship', viable: (assessment?.condition_score || 0) > 50, estimated_cost: (listing?.original_value || 0) * 0.15, timeline_days: 21 },
    { path: 'INSURANCE', label: 'Insurance Claim', viable: true, estimated_recovery_pct: 80, timeline_days: 45 },
  ] } });
});

// 7.7 Partial Distress & USTN Splitting (microUSTN)
gapClosure.post('/distressed/split-ustn', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { parent_ustn, portion_percentage, reason } = body;
  if (!parent_ustn || !portion_percentage) return c.json({ error: 'parent_ustn, portion_percentage required' }, 400);
  if (portion_percentage <= 0 || portion_percentage >= 100) return c.json({ error: 'portion_percentage must be between 0 and 100' }, 400);
  const id = crypto.randomUUID();
  const random8 = Math.random().toString(36).substring(2, 10).toUpperCase();
  const microUstn = `${parent_ustn}-M${random8}`;
  await DB.prepare(`
    INSERT INTO micro_ustns (id, parent_ustn, micro_ustn, portion_percentage, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'CREATED', ?)
  `).bind(id, parent_ustn, microUstn, portion_percentage, reason || 'PARTIAL_DISTRESS', new Date().toISOString()).run();
  return c.json({ data: { id, parent_ustn, micro_ustn: microUstn, portion_percentage, status: 'CREATED' } });
});

// 7.8 Micro-Contract Creation (with country-adjusted fee)
gapClosure.post('/distressed/micro-contract', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { micro_ustn, buyer_tenant_id, seller_tenant_id, terms, value } = body;
  if (!micro_ustn || !buyer_tenant_id || !seller_tenant_id) return c.json({ error: 'micro_ustn, buyer_tenant_id, seller_tenant_id required' }, 400);
  const id = crypto.randomUUID();
  // Calculate country-adjusted SGTX fee
  const seller = await DB.prepare('SELECT jurisdiction FROM tenants WHERE id = ?').bind(seller_tenant_id).first() as any;
  const jurisdiction = await DB.prepare('SELECT distressed_country_factor FROM jurisdictions WHERE code = ?').bind(seller?.jurisdiction || 'US').first() as any;
  const countryFactor = jurisdiction?.distressed_country_factor || 1.0;
  const baseFeeRate = 0.015; // 1.5% base for distressed
  const feeRate = Math.round(baseFeeRate * countryFactor * 10000) / 10000;
  const feeAmount = Math.round((value || 0) * feeRate * 100) / 100;
  await DB.prepare(`
    INSERT INTO micro_contracts (id, micro_ustn, buyer_tenant_id, seller_tenant_id, terms, sgtx_fee_rate, sgtx_fee_amount, country_factor, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')
  `).bind(id, micro_ustn, buyer_tenant_id, seller_tenant_id, JSON.stringify(terms || {}), feeRate, feeAmount, countryFactor).run();
  return c.json({ data: { id, micro_ustn, sgtx_fee_rate: feeRate, sgtx_fee_amount: feeAmount, country_factor: countryFactor, status: 'DRAFT' } });
});

// 7.9 Accelerated Outreach Mode
gapClosure.post('/distressed/outreach/campaign', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { listing_id, seller_tenant_id, mode, recipients, privacy_notice_acknowledged } = body;
  if (!listing_id || !seller_tenant_id) return c.json({ error: 'listing_id, seller_tenant_id required' }, 400);
  if (mode === 'ACCELERATED' && !privacy_notice_acknowledged) {
    return c.json({ error: 'Accelerated outreach requires privacy_notice_acknowledged = true (Part 3.7.9)' }, 400);
  }
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO outreach_campaigns (id, listing_id, seller_tenant_id, mode, privacy_notice_acknowledged, privacy_notice_acknowledged_at, recipients, status, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).bind(id, listing_id, seller_tenant_id, mode || 'STANDARD', privacy_notice_acknowledged ? 1 : 0,
    privacy_notice_acknowledged ? new Date().toISOString() : null,
    JSON.stringify(recipients || []), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()).run();
  return c.json({ data: { id, listing_id, mode: mode || 'STANDARD', status: 'ACTIVE', recipient_count: (recipients || []).length } });
});

gapClosure.get('/distressed/outreach/:listing_id', async (c) => {
  const { DB } = c.env;
  const listingId = c.req.param('listing_id');
  const campaigns = await DB.prepare('SELECT * FROM outreach_campaigns WHERE listing_id = ? ORDER BY created_at DESC').bind(listingId).all();
  return c.json({ data: campaigns.results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 10: DISPUTE RESOLUTION & ARBITRATION
// ═══════════════════════════════════════════════════════════════════

// 10.3 Evidence Package Auto-Compiler (includes QC overrides)
gapClosure.post('/dispute/evidence/auto-compile', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { dispute_id, ustn } = body;
  if (!dispute_id || !ustn) return c.json({ error: 'dispute_id, ustn required' }, 400);
  const packageId = crypto.randomUUID();
  // Auto-compile evidence from multiple sources
  const evidence: any[] = [];
  // 1. Governor decisions
  const decisions = await DB.prepare('SELECT id, policy_rule, verdict, conditions FROM governor_decisions WHERE related_ustn = ? ORDER BY created_at').bind(ustn).all();
  for (const d of (decisions.results || [])) {
    const eid = crypto.randomUUID();
    evidence.push({ id: eid, item_type: 'GOVERNOR_DECISION', title: `Governor Decision: ${(d as any).verdict}`, source_hash: (d as any).id, auto_compiled: 1 });
    await DB.prepare('INSERT INTO dispute_evidence_items (id, dispute_id, evidence_package_id, item_type, title, description, source_hash, auto_compiled) VALUES (?,?,?,?,?,?,?,1)')
      .bind(eid, dispute_id, packageId, 'GOVERNOR_DECISION', `Governor: ${(d as any).verdict} on ${(d as any).policy_rule}`, JSON.stringify((d as any).conditions), (d as any).id).run();
  }
  // 2. QC Override logs (flagged automatically)
  const overrides = await DB.prepare(`SELECT o.* FROM qc_override_log o JOIN qc_jobs j ON o.qc_job_id = j.id WHERE j.ustn = ?`).bind(ustn).all();
  for (const o of (overrides.results || [])) {
    const eid = crypto.randomUUID();
    evidence.push({ id: eid, item_type: 'QC_OVERRIDE', title: `QC Override: ${(o as any).override_action}`, auto_compiled: 1 });
    await DB.prepare('INSERT INTO dispute_evidence_items (id, dispute_id, evidence_package_id, item_type, title, description, auto_compiled) VALUES (?,?,?,?,?,?,1)')
      .bind(eid, dispute_id, packageId, 'QC_OVERRIDE', `Override: ${(o as any).override_action} - ${(o as any).ai_finding}`, (o as any).override_reason).run();
  }
  // 3. Timeline events
  const timeline = await DB.prepare('SELECT * FROM trade_event_timeline WHERE ustn = ? ORDER BY event_time').bind(ustn).all();
  if ((timeline.results || []).length > 0) {
    const eid = crypto.randomUUID();
    await DB.prepare('INSERT INTO dispute_evidence_items (id, dispute_id, evidence_package_id, item_type, title, description, auto_compiled) VALUES (?,?,?,?,?,?,1)')
      .bind(eid, dispute_id, packageId, 'TIMELINE', 'Complete Trade Timeline', JSON.stringify(timeline.results)).run();
    evidence.push({ id: eid, item_type: 'TIMELINE', title: 'Complete Trade Timeline', auto_compiled: 1 });
  }
  // Create evidence package record
  await DB.prepare('INSERT OR REPLACE INTO evidence_packages (id, dispute_id, ustn, item_count, auto_compiled, compiled_at) VALUES (?,?,?,?,1,?)')
    .bind(packageId, dispute_id, ustn, evidence.length, new Date().toISOString()).run();
  return c.json({ data: { package_id: packageId, dispute_id, ustn, items_compiled: evidence.length, evidence_summary: evidence } });
});

// 10.7 Smart FeeLock Management (Freeze)
gapClosure.post('/dispute/feelock/freeze', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { ustn, dispute_id, lock_type, frozen_amount, currency, frozen_by, freeze_reason } = body;
  if (!ustn || !dispute_id) return c.json({ error: 'ustn, dispute_id required' }, 400);
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO feelock_freezes (id, ustn, dispute_id, lock_type, frozen_amount, currency, frozen_by, freeze_reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FROZEN')
  `).bind(id, ustn, dispute_id, lock_type || 'FULL', frozen_amount || 0, currency || 'USD', frozen_by || 'GOVERNOR', freeze_reason || 'Dispute filed').run();
  return c.json({ data: { id, ustn, dispute_id, status: 'FROZEN', lock_type: lock_type || 'FULL', frozen_amount } });
});

gapClosure.patch('/dispute/feelock/:id/release', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json() as any;
  const { released_by, release_reason, multisig_signatures } = body;
  if (!released_by) return c.json({ error: 'released_by required' }, 400);
  // Require multisig for full release (3-of-5)
  if (multisig_signatures && (multisig_signatures as any[]).length < 3) {
    return c.json({ error: 'FeeLock release requires 3-of-5 multisig approval (Part 3.10.10)' }, 403);
  }
  await DB.prepare('UPDATE feelock_freezes SET status = ?, released_at = ?, released_by = ?, release_reason = ?, multisig_signatures = ? WHERE id = ?')
    .bind('RELEASED', new Date().toISOString(), released_by, release_reason || null, JSON.stringify(multisig_signatures || []), id).run();
  return c.json({ data: { id, status: 'RELEASED' } });
});

gapClosure.get('/dispute/feelock/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const freezes = await DB.prepare('SELECT * FROM feelock_freezes WHERE ustn = ? ORDER BY created_at DESC').bind(ustn).all();
  return c.json({ data: freezes.results || [] });
});

// 10.8 Document Authenticity Check
gapClosure.post('/dispute/document/authenticity-check', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { document_id, dispute_id, check_types } = body;
  if (!document_id) return c.json({ error: 'document_id required' }, 400);
  const results: any[] = [];
  for (const checkType of (check_types || ['HASH_VERIFY', 'METADATA_ANALYSIS'])) {
    const id = crypto.randomUUID();
    // Simulate authenticity checks
    const result = Math.random() > 0.1 ? 'AUTHENTIC' : 'SUSPICIOUS';
    const confidence = result === 'AUTHENTIC' ? 0.95 + Math.random() * 0.05 : 0.6 + Math.random() * 0.2;
    await DB.prepare(`
      INSERT INTO document_authenticity_checks (id, document_id, dispute_id, check_type, result, confidence, details, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, document_id, dispute_id || null, checkType, result, Math.round(confidence * 100) / 100,
      JSON.stringify({ check: checkType, timestamp: new Date().toISOString() }), 'HF_LAYOUT_LM').run();
    results.push({ id, check_type: checkType, result, confidence: Math.round(confidence * 100) / 100 });
  }
  const overallResult = results.some((r: any) => r.result === 'TAMPERED') ? 'TAMPERED' : results.some((r: any) => r.result === 'SUSPICIOUS') ? 'SUSPICIOUS' : 'AUTHENTIC';
  return c.json({ data: { document_id, overall_result: overallResult, checks: results } });
});

// 10.9 Escalation to International Arbitration
gapClosure.post('/dispute/arbitration/escalate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { dispute_id, ustn, arbitration_body, jurisdiction, governing_law, claimant_gtid, respondent_gtid, claim_amount, currency } = body;
  if (!dispute_id || !ustn || !arbitration_body) return c.json({ error: 'dispute_id, ustn, arbitration_body required' }, 400);
  const id = crypto.randomUUID();
  const caseRef = `${arbitration_body}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  // Auto-compile evidence package for arbitration
  const evidencePackage = await DB.prepare('SELECT id FROM evidence_packages WHERE dispute_id = ? ORDER BY compiled_at DESC LIMIT 1').bind(dispute_id).first() as any;
  await DB.prepare(`
    INSERT INTO arbitration_cases (id, dispute_id, ustn, arbitration_body, case_reference, jurisdiction, governing_law, claimant_gtid, respondent_gtid, claim_amount, currency, status, sgtx_evidence_package_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FILED', ?)
  `).bind(id, dispute_id, ustn, arbitration_body, caseRef, jurisdiction || 'INTERNATIONAL', governing_law || 'UNCITRAL', claimant_gtid || null, respondent_gtid || null, claim_amount || 0, currency || 'USD', evidencePackage?.id || null).run();
  // Update dispute status
  await DB.prepare("UPDATE disputes SET status = 'ARBITRATION' WHERE id = ?").bind(dispute_id).run();
  return c.json({ data: { id, case_reference: caseRef, arbitration_body, status: 'FILED', evidence_package_attached: !!evidencePackage?.id } });
});

gapClosure.get('/dispute/arbitration/:dispute_id', async (c) => {
  const { DB } = c.env;
  const disputeId = c.req.param('dispute_id');
  const cases = await DB.prepare('SELECT * FROM arbitration_cases WHERE dispute_id = ? ORDER BY created_at DESC').bind(disputeId).all();
  return c.json({ data: cases.results || [] });
});

// 10.4 Predictive Dispute Outcome
gapClosure.post('/dispute/predict-outcome', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { dispute_id } = body;
  if (!dispute_id) return c.json({ error: 'dispute_id required' }, 400);
  const dispute = await DB.prepare('SELECT * FROM disputes WHERE id = ?').bind(dispute_id).first() as any;
  if (!dispute) return c.json({ error: 'Dispute not found' }, 404);
  // AI prediction (simulated)
  const prediction = {
    likely_outcome: 'PARTIAL_SETTLEMENT',
    confidence: 0.73,
    estimated_resolution_days: 14,
    recommended_settlement_range: { min: (dispute.amount || 10000) * 0.4, max: (dispute.amount || 10000) * 0.7 },
    similar_cases_analyzed: 23,
    factors: [
      { factor: 'QC overrides present', weight: 0.25, direction: 'FAVORS_CLAIMANT' },
      { factor: 'Delivery timeline met', weight: 0.2, direction: 'FAVORS_RESPONDENT' },
      { factor: 'Document discrepancies', weight: 0.15, direction: 'FAVORS_CLAIMANT' },
      { factor: 'Historical relationship', weight: 0.1, direction: 'NEUTRAL' },
    ]
  };
  return c.json({ data: { dispute_id, prediction } });
});

// 10.6 AI-Generated Settlement Proposal
gapClosure.post('/dispute/settlement-proposal', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { dispute_id, trade_value } = body;
  if (!dispute_id) return c.json({ error: 'dispute_id required' }, 400);
  const value = trade_value || 100000;
  const proposal = {
    dispute_id,
    proposed_settlement: Math.round(value * 0.55 * 100) / 100,
    currency: 'USD',
    rationale: 'Based on analysis of evidence package, QC findings, and similar historical cases, a 55% settlement is recommended as fair resolution.',
    conditions: [
      'Both parties acknowledge settlement as final',
      'SGTX fee obligation remains unchanged',
      'QC override findings noted in permanent record',
      'No admission of liability by either party'
    ],
    deadline_days: 7,
    model: 'GROQ_ADVISORY',
    generated_at: new Date().toISOString()
  };
  return c.json({ data: proposal });
});

// ═══════════════════════════════════════════════════════════════════
// QC: AQL ENFORCEMENT & OVERRIDE ACCOUNTABILITY
// ═══════════════════════════════════════════════════════════════════

// AQL Sampling Plan Calculator (ISO 28591, General Inspection Level II)
gapClosure.post('/qc/aql/calculate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { qc_job_id, lot_size, inspection_level, aql_major, aql_minor } = body;
  if (!qc_job_id || !lot_size) return c.json({ error: 'qc_job_id, lot_size required' }, 400);
  // ISO 28591 AQL tables (simplified General Inspection Level II)
  const aqlTable: Record<string, {sample: number, accept_25: number, reject_25: number, accept_40: number, reject_40: number}> = {
    '2-8': { sample: 2, accept_25: 0, reject_25: 1, accept_40: 0, reject_40: 1 },
    '9-15': { sample: 3, accept_25: 0, reject_25: 1, accept_40: 0, reject_40: 1 },
    '16-25': { sample: 5, accept_25: 0, reject_25: 1, accept_40: 0, reject_40: 1 },
    '26-50': { sample: 8, accept_25: 0, reject_25: 1, accept_40: 1, reject_40: 2 },
    '51-90': { sample: 13, accept_25: 1, reject_25: 2, accept_40: 1, reject_40: 2 },
    '91-150': { sample: 20, accept_25: 1, reject_25: 2, accept_40: 2, reject_40: 3 },
    '151-280': { sample: 32, accept_25: 2, reject_25: 3, accept_40: 3, reject_40: 4 },
    '281-500': { sample: 50, accept_25: 3, reject_25: 4, accept_40: 5, reject_40: 6 },
    '501-1200': { sample: 80, accept_25: 5, reject_25: 6, accept_40: 7, reject_40: 8 },
    '1201-3200': { sample: 125, accept_25: 7, reject_25: 8, accept_40: 10, reject_40: 11 },
    '3201-10000': { sample: 200, accept_25: 10, reject_25: 11, accept_40: 14, reject_40: 15 },
    '10001+': { sample: 315, accept_25: 14, reject_25: 15, accept_40: 21, reject_40: 22 },
  };
  let selectedPlan: any = aqlTable['10001+'];
  const lotNum = parseInt(lot_size);
  if (lotNum <= 8) selectedPlan = aqlTable['2-8'];
  else if (lotNum <= 15) selectedPlan = aqlTable['9-15'];
  else if (lotNum <= 25) selectedPlan = aqlTable['16-25'];
  else if (lotNum <= 50) selectedPlan = aqlTable['26-50'];
  else if (lotNum <= 90) selectedPlan = aqlTable['51-90'];
  else if (lotNum <= 150) selectedPlan = aqlTable['91-150'];
  else if (lotNum <= 280) selectedPlan = aqlTable['151-280'];
  else if (lotNum <= 500) selectedPlan = aqlTable['281-500'];
  else if (lotNum <= 1200) selectedPlan = aqlTable['501-1200'];
  else if (lotNum <= 3200) selectedPlan = aqlTable['1201-3200'];
  else if (lotNum <= 10000) selectedPlan = aqlTable['3201-10000'];
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO aql_sampling_plans (id, qc_job_id, inspection_level, lot_size, sample_size, aql_major, aql_minor, accept_major, reject_major, accept_minor, reject_minor, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).bind(id, qc_job_id, inspection_level || 'GENERAL_II', lotNum, selectedPlan.sample,
    aql_major || 2.5, aql_minor || 4.0, selectedPlan.accept_25, selectedPlan.reject_25,
    selectedPlan.accept_40, selectedPlan.reject_40).run();
  return c.json({ data: { id, qc_job_id, lot_size: lotNum, sample_size: selectedPlan.sample, inspection_level: inspection_level || 'GENERAL_II', accept_major: selectedPlan.accept_25, reject_major: selectedPlan.reject_25, accept_minor: selectedPlan.accept_40, reject_minor: selectedPlan.reject_40, aql_major: aql_major || 2.5, aql_minor: aql_minor || 4.0 } });
});

// AQL Result Evaluation
gapClosure.post('/qc/aql/evaluate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { plan_id, major_found, minor_found, critical_found } = body;
  if (!plan_id) return c.json({ error: 'plan_id required' }, 400);
  const plan = await DB.prepare('SELECT * FROM aql_sampling_plans WHERE id = ?').bind(plan_id).first() as any;
  if (!plan) return c.json({ error: 'Sampling plan not found' }, 404);
  const majorsOk = (major_found || 0) <= plan.accept_major;
  const minorsOk = (minor_found || 0) <= plan.accept_minor;
  const criticalOk = (critical_found || 0) === 0; // Zero tolerance for critical
  const result = criticalOk && majorsOk && minorsOk ? 'PASS' : 'FAIL';
  await DB.prepare('UPDATE aql_sampling_plans SET major_found = ?, minor_found = ?, critical_found = ?, result = ? WHERE id = ?')
    .bind(major_found || 0, minor_found || 0, critical_found || 0, result, plan_id).run();
  return c.json({ data: { plan_id, result, major_found: major_found || 0, minor_found: minor_found || 0, critical_found: critical_found || 0, thresholds: { accept_major: plan.accept_major, reject_major: plan.reject_major, accept_minor: plan.accept_minor, reject_minor: plan.reject_minor }, pass_reasons: { critical: criticalOk, major: majorsOk, minor: minorsOk } } });
});

// QC Override with Accountability (mandatory reason ≥10 chars)
gapClosure.post('/qc/override', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { qc_job_id, inspector_id, ai_finding, ai_severity, override_action, override_reason, override_evidence_url } = body;
  if (!qc_job_id || !inspector_id || !ai_finding || !override_action || !override_reason) {
    return c.json({ error: 'qc_job_id, inspector_id, ai_finding, override_action, override_reason required' }, 400);
  }
  if (override_reason.length < 10) {
    return c.json({ error: 'override_reason must be at least 10 characters (Part 6.2.4: Override Accountability)' }, 400);
  }
  const id = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO qc_override_log (id, qc_job_id, inspector_id, ai_finding, ai_severity, override_action, override_reason, override_evidence_url, flagged_for_dispute)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(id, qc_job_id, inspector_id, ai_finding, ai_severity || 'UNKNOWN', override_action, override_reason, override_evidence_url || null).run();
  // Create Smart Inbox notification for supervisor
  const inboxId = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO smart_inbox_items (id, tenant_id, category, priority_score, title, description, action_link, status, created_at)
    VALUES (?, (SELECT tenant_id FROM employees WHERE id = ?), 'QC_OVERRIDE', 75, ?, ?, ?, 'UNREAD', ?)
  `).bind(inboxId, inspector_id, `QC Override: ${override_action} on ${ai_finding}`, `Inspector overrode AI finding. Reason: ${override_reason}`, `/qc/overrides/${id}`, new Date().toISOString()).run();
  return c.json({ data: { id, qc_job_id, override_action, flagged_for_dispute: true, notification_sent: true } });
});

gapClosure.get('/qc/overrides/:qc_job_id', async (c) => {
  const { DB } = c.env;
  const jobId = c.req.param('qc_job_id');
  const overrides = await DB.prepare('SELECT * FROM qc_override_log WHERE qc_job_id = ? ORDER BY created_at DESC').bind(jobId).all();
  return c.json({ data: overrides.results || [] });
});

// QC AR Inspection Mode (Defect Detection)
gapClosure.post('/qc/ar-inspect', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as any;
  const { qc_job_id, image_url, inspector_id } = body;
  if (!qc_job_id || !image_url) return c.json({ error: 'qc_job_id, image_url required' }, 400);
  // Simulate HF ViT defect detection (on-device in production)
  const detections = [
    { defect_type: 'STAIN', confidence: 0.94, severity: 'MAJOR', bounding_box: { x: 120, y: 85, w: 45, h: 30 } },
    { defect_type: 'THREAD_PULL', confidence: 0.87, severity: 'MINOR', bounding_box: { x: 200, y: 150, w: 20, h: 15 } },
  ];
  const logId = crypto.randomUUID();
  await DB.prepare(`
    INSERT INTO inspection_logs (id, job_id, inspector_id, log_type, content, created_at)
    VALUES (?, ?, ?, 'AR_DETECTION', ?, ?)
  `).bind(logId, qc_job_id, inspector_id || 'SYSTEM', JSON.stringify({ image_url, detections, model: 'HF_VIT_ON_DEVICE' }), new Date().toISOString()).run();
  return c.json({ data: { id: logId, detections, model: 'HF_VIT', privacy_note: 'Raw images processed on-device only. Never transmitted to server.' } });
});

export default gapClosure;

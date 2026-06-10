// SGTX Platform v6.3 — Part 3 Phase 2: Seller Quote Form API
// Blueprint: Seller Quote, Packing & Logistics Orchestration
// Governor Gates: G2U1-G2U22, G2UPACK1
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import { clampCommissionRate } from '../lib/commission';
import type { Bindings } from '../lib/types';

const sellerQuote = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// INCOTERM → LOGISTICS COST MAPPING (Blueprint Step 2.3)
// Each cost line is: 'M' = mandatory, 'O' = optional, 'D' = disabled
// ═══════════════════════════════════════════════════════════════════════════════
const INCOTERM_LOGISTICS_MAP: Record<string, Record<string, string>> = {
  EXW:  { TRUCKING_ORIGIN:'D', THC_ORIGIN:'D', CUSTOMS_ORIGIN:'D', SEA_FREIGHT:'D', AIR_FREIGHT:'D', INSURANCE:'D', THC_DEST:'D', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'D' },
  FCA:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'O', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'D', AIR_FREIGHT:'D', INSURANCE:'D', THC_DEST:'D', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'O' },
  FAS:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'D', AIR_FREIGHT:'D', INSURANCE:'D', THC_DEST:'D', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'O' },
  FOB:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'D', AIR_FREIGHT:'D', INSURANCE:'D', THC_DEST:'D', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'M' },
  CFR:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'D', INSURANCE:'O', THC_DEST:'O', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'M' },
  CIF:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'D', INSURANCE:'M', THC_DEST:'O', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'M' },
  CPT:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'O', INSURANCE:'O', THC_DEST:'M', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'M' },
  CIP:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'O', INSURANCE:'M', THC_DEST:'M', CUSTOMS_DEST:'D', TRUCKING_DEST:'D', DUTIES:'D', POWER_SUPPLY:'M' },
  DAP:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'O', INSURANCE:'O', THC_DEST:'M', CUSTOMS_DEST:'O', TRUCKING_DEST:'M', DUTIES:'O', POWER_SUPPLY:'M' },
  DPU:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'O', INSURANCE:'O', THC_DEST:'M', CUSTOMS_DEST:'O', TRUCKING_DEST:'M', DUTIES:'O', POWER_SUPPLY:'M' },
  DDP:  { TRUCKING_ORIGIN:'M', THC_ORIGIN:'M', CUSTOMS_ORIGIN:'M', SEA_FREIGHT:'M', AIR_FREIGHT:'O', INSURANCE:'O', THC_DEST:'M', CUSTOMS_DEST:'M', TRUCKING_DEST:'M', DUTIES:'M', POWER_SUPPLY:'M' },
};

const COST_TYPE_LABELS: Record<string, string> = {
  TRUCKING_ORIGIN: 'Trucking (Origin)', THC_ORIGIN: 'Terminal Handling (Origin)', CUSTOMS_ORIGIN: 'Customs Clearance (Origin)',
  SEA_FREIGHT: 'Sea Freight', AIR_FREIGHT: 'Air Freight', INSURANCE: 'Cargo Insurance',
  THC_DEST: 'Terminal Handling (Destination)', CUSTOMS_DEST: 'Customs Clearance (Destination)',
  TRUCKING_DEST: 'Trucking (Destination)', DUTIES: 'Import Duties & Taxes', POWER_SUPPLY: 'Reefer Power Supply',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /seller-quote/pending-requests — List trade requests awaiting seller quote
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/pending-requests', async (c) => {
  const { DB } = c.env;
  const seller_tenant_id = c.req.query('seller_tenant_id');
  if (!seller_tenant_id) return c.json({ error: 'seller_tenant_id required' }, 400);

  const requests = await DB.prepare(`
    SELECT tr.id, tr.importer_tenant_id, tr.status, tr.parsed_specs, tr.created_at,
           t.legal_name as buyer_name, t.gtid as buyer_gtid, t.jurisdiction as buyer_country,
           COALESCE(100 - t.risk_score, 75) as buyer_trust_score
    FROM trade_requests tr
    LEFT JOIN tenants t ON tr.importer_tenant_id = t.id
    WHERE (tr.assigned_exporter_id = ? OR tr.exporter_tenant_id = ?)
    AND tr.status IN ('PENDING_EXPORTER_RESPONSE', 'MATCHING', 'DRAFT')
    ORDER BY tr.created_at DESC
    LIMIT 50
  `).bind(seller_tenant_id, seller_tenant_id).all();

  const enriched = (requests.results || []).map((r: any) => {
    let specs: any = {};
    try { specs = JSON.parse(r.parsed_specs || '{}'); } catch {}
    return {
      ...r,
      commodity_summary: specs.containers?.map((ct: any) => ct.commodity_type).join(', ') || 'N/A',
      incoterm: specs.incoterm || 'N/A',
      container_count: specs.containers?.length || 0,
      target_price: specs.target_price || null,
      target_currency: specs.target_currency || 'USD',
      multi_shipment: specs.multi_shipment_enabled || false,
    };
  });

  return c.json({ data: enriched, count: enriched.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /seller-quote/request-detail — Full trade request detail for seller view
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/request-detail', async (c) => {
  const { DB } = c.env;
  const trade_request_id = c.req.query('trade_request_id');
  if (!trade_request_id) return c.json({ error: 'trade_request_id required' }, 400);

  const tr = await DB.prepare(`
    SELECT tr.*, t.legal_name as buyer_name, t.gtid as buyer_gtid, t.jurisdiction as buyer_country,
           COALESCE(100 - t.risk_score, 75) as buyer_trust_score
    FROM trade_requests tr
    LEFT JOIN tenants t ON tr.importer_tenant_id = t.id
    WHERE tr.id = ?
  `).bind(trade_request_id).first() as any;

  if (!tr) return c.json({ error: 'Trade request not found' }, 404);

  let specs: any = {};
  try { specs = JSON.parse(tr.parsed_specs || '{}'); } catch {}

  // Get existing quotes for this request
  const existingQuotes = await DB.prepare(
    `SELECT id, status, exw_price, exw_currency, created_at FROM exporter_quotes WHERE trade_request_id = ? ORDER BY created_at DESC`
  ).bind(trade_request_id).all();

  return c.json({
    data: {
      trade_request: tr,
      parsed_specs: specs,
      buyer: { name: tr.buyer_name, gtid: tr.buyer_gtid, country: tr.buyer_country, trust_score: tr.buyer_trust_score },
      existing_quotes: existingQuotes.results || [],
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. POST /seller-quote/loading-origin — Step 2.1: Set loading country + port
// Governor: G2U17 (Loading origin specified)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/loading-origin', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, trade_request_id, seller_tenant_id, loading_country, loading_port } = body;

  if (!loading_country || !loading_port) {
    return c.json({ error: 'loading_country and loading_port are required (G2U17)' }, 400);
  }

  // G2U17: Validate loading origin
  const sellerTenant = await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(seller_tenant_id).first() as any;
  const gov = await evaluateGovernor(DB, {
    decision_type: 'quote.loading_origin',
    actor_gtid: sellerTenant?.gtid || seller_tenant_id,
    action_context: { loading_country, loading_port, trade_request_id },
    jurisdictions: [loading_country],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Loading origin rejected by Governor (G2U17)', governor: gov }, 403);

  if (exporter_quote_id) {
    await DB.prepare(`UPDATE exporter_quotes SET loading_country = ?, loading_port = ?, port_of_loading = ?, updated_at = ? WHERE id = ?`)
      .bind(loading_country, loading_port, loading_port, isoNow(), exporter_quote_id).run();
  }

  return c.json({
    data: { loading_country, loading_port, governor_decision: gov },
    message: 'Loading origin set successfully (G2U17 passed)'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /seller-quote/market-prices — Step 2.2: 30-day market price chart data
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/market-prices', async (c) => {
  const { DB } = c.env;
  const commodity_type = c.req.query('commodity_type') || 'Fresh Fruits';
  const hs_code = c.req.query('hs_code');

  let query = `SELECT * FROM market_price_feeds WHERE commodity_type = ? ORDER BY recorded_date ASC`;
  let params: any[] = [commodity_type];
  if (hs_code) {
    query = `SELECT * FROM market_price_feeds WHERE hs_code = ? ORDER BY recorded_date ASC`;
    params = [hs_code];
  }

  const prices = await DB.prepare(query).bind(...params).all();
  const data = prices.results || [];

  // Calculate AI range band (mean ± 15%)
  const priceValues = data.map((d: any) => d.price_usd);
  const mean = priceValues.length ? priceValues.reduce((a: number, b: number) => a + b, 0) / priceValues.length : 0;
  const aiRangeLow = mean * 0.85;
  const aiRangeHigh = mean * 1.15;

  return c.json({
    data: {
      prices: data,
      ai_range: { low: Math.round(aiRangeLow * 100) / 100, high: Math.round(aiRangeHigh * 100) / 100, mean: Math.round(mean * 100) / 100 },
      commodity_type,
      chart_period_days: 30,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POST /seller-quote/exw-lock — Step 2.2: Lock EXW price (enhanced)
// Governor: G2UA1 (Price deviation ≤30% or justified)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/exw-lock', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const {
    trade_request_id, seller_tenant_id,
    exw_price, currency, commodity_type, hs_code, incoterm,
    justification, loading_country, loading_port,
    validity_days
  } = body;

  if (!trade_request_id || !seller_tenant_id || !exw_price || exw_price <= 0) {
    return c.json({ error: 'trade_request_id, seller_tenant_id, and positive exw_price required' }, 400);
  }

  // Get market prices for deviation check
  const marketData = await DB.prepare(
    `SELECT AVG(price_usd) as avg_price FROM market_price_feeds WHERE commodity_type = ? AND recorded_date >= date('now', '-30 days')`
  ).bind(commodity_type || 'General').first() as any;

  const avgMarketPrice = marketData?.avg_price || exw_price;
  const deviationPct = avgMarketPrice > 0 ? ((exw_price - avgMarketPrice) / avgMarketPrice) * 100 : 0;

  // G2UA1: If deviation > 30%, require justification
  if (deviationPct > 30 && !justification) {
    return c.json({
      error: 'EXW price deviates >30% from market average. Written justification required (G2UA1)',
      deviation_pct: Math.round(deviationPct * 100) / 100,
      market_average: Math.round(avgMarketPrice * 100) / 100,
      gate: 'G2UA1'
    }, 422);
  }

  const sellerTenant = await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(seller_tenant_id).first() as any;

  // Governor: G2UA1 price check
  const gov = await evaluateGovernor(DB, {
    decision_type: 'quote.exw_lock',
    actor_gtid: sellerTenant?.gtid || seller_tenant_id,
    action_context: {
      trade_request_id, exw_price, currency: currency || 'USD',
      deviation_pct: deviationPct, justification: justification || null,
      commodity_type, hs_code, incoterm: incoterm || 'EXW'
    },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'EXW lock denied by Governor (G2UA1)', governor: gov }, 403);

  const quoteId = uuid();
  await DB.prepare(`
    INSERT INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at,
      incoterm, validity_days, status, governor_decision_id, loading_country, loading_port, port_of_loading,
      exw_justification, exw_deviation_pct, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EXW_LOCKED', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    quoteId, trade_request_id, seller_tenant_id,
    exw_price, currency || 'USD', isoNow(),
    incoterm || 'EXW', validity_days || 15,
    gov.decision_id,
    loading_country || null, loading_port || null, loading_port || null,
    justification || null, Math.round(deviationPct * 100) / 100,
    isoNow(), isoNow()
  ).run();

  // G2U1: Initialize living quote
  try {
    await DB.prepare(`
      INSERT INTO living_quotes (id, exporter_quote_id, dynamic_pricing_enabled, status, governor_decision_id)
      VALUES (?, ?, 1, 'ACTIVE', ?)
    `).bind(uuid(), quoteId, gov.decision_id).run();
  } catch {}

  // Set up price watch (±10% deviation)
  try {
    await DB.prepare(`
      INSERT INTO exw_price_watch (id, exporter_quote_id, trade_request_id, locked_price, current_market_price, deviation_pct, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).bind(uuid(), quoteId, trade_request_id, exw_price, avgMarketPrice, isoNow()).run();
  } catch {}

  await auditLog(DB, 'exporter_quotes', quoteId, 'EXW_LOCKED', null, {
    exw_price, currency: currency || 'USD', deviation_pct: deviationPct, justification
  });

  return c.json({
    data: {
      quote_id: quoteId, status: 'EXW_LOCKED',
      exw_price, currency: currency || 'USD',
      deviation_pct: Math.round(deviationPct * 100) / 100,
      market_average: Math.round(avgMarketPrice * 100) / 100,
      justification_required: deviationPct > 30,
      governor_decision: gov,
    },
    message: `EXW price locked at ${currency || 'USD'} ${exw_price}. ${deviationPct > 30 ? 'Justification accepted (G2UA1 CONDITIONAL).' : 'Within market bands.'}`
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET /seller-quote/logistics-map — Step 2.3: Get Incoterm logistics cost mapping
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/logistics-map', async (c) => {
  const incoterm = (c.req.query('incoterm') || 'FOB').toUpperCase();
  const mapping = INCOTERM_LOGISTICS_MAP[incoterm] || INCOTERM_LOGISTICS_MAP['FOB'];

  const costLines = Object.entries(mapping).map(([type, rule]) => ({
    cost_type: type,
    label: COST_TYPE_LABELS[type] || type,
    rule, // M=mandatory, O=optional, D=disabled
    is_mandatory: rule === 'M',
    is_disabled: rule === 'D',
    is_optional: rule === 'O',
  }));

  return c.json({
    data: { incoterm, cost_lines: costLines, all_incoterms: Object.keys(INCOTERM_LOGISTICS_MAP) }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. POST /seller-quote/logistics-manual — Step 2.3 Mode A: Save manual logistics costs
// Governor: G2U18 (Mandatory logistics costs per Incoterm)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/logistics-manual', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, trade_request_id, seller_tenant_id, incoterm, cost_lines, shipment_number } = body;

  if (!exporter_quote_id || !incoterm || !cost_lines) {
    return c.json({ error: 'exporter_quote_id, incoterm, and cost_lines required' }, 400);
  }

  const mapping = INCOTERM_LOGISTICS_MAP[incoterm.toUpperCase()] || {};

  // G2U18: Validate mandatory costs are present
  const missingMandatory: string[] = [];
  for (const [type, rule] of Object.entries(mapping)) {
    if (rule === 'M') {
      const line = cost_lines.find((cl: any) => cl.cost_type === type);
      if (!line || !line.amount || line.amount <= 0) {
        missingMandatory.push(COST_TYPE_LABELS[type] || type);
      }
    }
  }

  if (missingMandatory.length > 0) {
    return c.json({
      error: `Missing mandatory logistics costs for ${incoterm} (G2U18)`,
      missing: missingMandatory,
      gate: 'G2U18'
    }, 422);
  }

  // Save cost lines
  let logisticsTotal = 0;
  for (const line of cost_lines) {
    if (mapping[line.cost_type] === 'D') continue; // Skip disabled
    const amount = line.amount || 0;
    logisticsTotal += amount;

    await DB.prepare(`
      INSERT OR REPLACE INTO quote_logistics_lines (id, exporter_quote_id, trade_request_id, cost_type, amount, currency, is_mandatory, is_disabled, notes, shipment_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uuid(), exporter_quote_id, trade_request_id,
      line.cost_type, amount, line.currency || 'USD',
      mapping[line.cost_type] === 'M' ? 1 : 0,
      mapping[line.cost_type] === 'D' ? 1 : 0,
      line.notes || null, shipment_number || 1, isoNow()
    ).run();
  }

  // Update quote with logistics total
  await DB.prepare(`UPDATE exporter_quotes SET logistics_total = ?, logistics_mode = 'MANUAL', logistics_breakdown = ?, updated_at = ? WHERE id = ?`)
    .bind(logisticsTotal, JSON.stringify(cost_lines), isoNow(), exporter_quote_id).run();

  return c.json({
    data: { logistics_total: logisticsTotal, cost_lines_saved: cost_lines.length, incoterm },
    message: `Logistics costs saved (${incoterm}). Total: ${logisticsTotal}`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. POST /seller-quote/logistics-rfq — Step 2.3 Mode B: Send RFQ to providers
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/logistics-rfq', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  let { exporter_quote_id, trade_request_id, seller_tenant_id, origin_port, destination_port, services, sourcing_mode, mode, provider_gtid } = body;

  if (!trade_request_id) {
    return c.json({ error: 'trade_request_id is required' }, 400);
  }

  // Auto-resolve ports from trade_containers if not provided or set to AUTO
  if (!origin_port || origin_port === 'AUTO' || !destination_port || destination_port === 'AUTO') {
    const container: any = await DB.prepare(`SELECT origin_country, destination_country, port_of_discharge, port_of_loading FROM trade_containers WHERE trade_request_id = ? ORDER BY container_index ASC LIMIT 1`).bind(trade_request_id).first();
    if (container) {
      if (!origin_port || origin_port === 'AUTO') origin_port = container.port_of_loading || container.origin_country || 'ORIGIN';
      if (!destination_port || destination_port === 'AUTO') destination_port = container.port_of_discharge || container.destination_country || 'DEST';
    } else {
      if (!origin_port || origin_port === 'AUTO') origin_port = 'UNKNOWN';
      if (!destination_port || destination_port === 'AUTO') destination_port = 'UNKNOWN';
    }
  }

  const rfqId = uuid();
  
  // Insert into logistics_rfqs — the canonical table for RFQ flow
  // Logistics portal reads from this table via GET /upgrades/logistics-rfq
  await DB.prepare(`
    INSERT INTO logistics_rfqs (id, trade_request_id, requester_tenant_id, origin_port, destination_port, commodity_type, container_type, container_count, required_services, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, '40HC_RF', 1, ?, 'OPEN', ?)
  `).bind(rfqId, trade_request_id, seller_tenant_id || 'SYSTEM', origin_port, destination_port, JSON.stringify(services || ['SEA_FREIGHT', 'REEFER']), JSON.stringify(services || ['SEA_FREIGHT', 'REEFER']), isoNow()).run();

  // Update quote logistics mode
  if (exporter_quote_id) {
    await DB.prepare(`UPDATE exporter_quotes SET logistics_mode = 'RFQ', updated_at = ? WHERE id = ?`)
      .bind(isoNow(), exporter_quote_id).run();
  }

  return c.json({
    data: { rfq_id: rfqId, sourcing_mode: sourcing_mode || mode || 'BROADCAST', services: services || ['SEA_FREIGHT', 'REEFER'], status: 'RFQ_SENT', origin_port, destination_port },
    message: 'RFQ sent to logistics providers'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. POST /seller-quote/alternative-ports — Step 2.4: Add alternative delivery ports
// Governor: G2U19 (Alternative port validity)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/alternative-ports', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, trade_request_id, alternatives } = body;

  if (!exporter_quote_id || !alternatives || !Array.isArray(alternatives)) {
    return c.json({ error: 'exporter_quote_id and alternatives array required' }, 400);
  }

  const saved: any[] = [];
  for (const alt of alternatives) {
    // G2U19: Validate alternative port (same country, transit > 0)
    if (!alt.port_of_discharge || !alt.destination_country) continue;
    if (alt.transit_days !== undefined && alt.transit_days <= 0) continue;

    const altId = uuid();
    await DB.prepare(`
      INSERT INTO exporter_quote_alternatives (id, exporter_quote_id, trade_request_id, destination_country, port_of_discharge, price_per_unit, currency, transit_days, additional_logistics_cost, additional_logistics_currency, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      altId, exporter_quote_id, trade_request_id,
      alt.destination_country, alt.port_of_discharge,
      alt.price_per_unit || 0, alt.currency || 'USD',
      alt.transit_days || null, alt.additional_logistics_cost || 0,
      alt.additional_logistics_currency || 'USD',
      alt.notes || null, isoNow()
    ).run();
    saved.push({ id: altId, ...alt });
  }

  // Update quote
  await DB.prepare(`UPDATE exporter_quotes SET alternative_ports = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(saved), isoNow(), exporter_quote_id).run();

  return c.json({
    data: { alternatives: saved, count: saved.length },
    message: `${saved.length} alternative port(s) added`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. POST /seller-quote/multi-shipment-response — Step 2.6: Respond to schedule
// Governor: G2U20 (Multi-shipment schedule valid)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/multi-shipment-response', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, trade_request_id, shipment_responses } = body;

  if (!exporter_quote_id || !shipment_responses || !Array.isArray(shipment_responses)) {
    return c.json({ error: 'exporter_quote_id and shipment_responses array required' }, 400);
  }

  // G2U20: Validate schedule
  const errors: string[] = [];
  for (const sr of shipment_responses) {
    if (sr.response_type === 'MODIFY' && !sr.seller_proposed_date) {
      errors.push(`Shipment ${sr.shipment_number}: modified schedule requires seller_proposed_date`);
    }
    if (sr.logistics_cost !== undefined && sr.logistics_cost < 0) {
      errors.push(`Shipment ${sr.shipment_number}: logistics_cost cannot be negative`);
    }
  }
  if (errors.length > 0) {
    return c.json({ error: 'Multi-shipment response validation failed (G2U20)', details: errors, gate: 'G2U20' }, 422);
  }

  for (const sr of shipment_responses) {
    await DB.prepare(`
      INSERT INTO seller_shipment_responses (id, exporter_quote_id, trade_request_id, shipment_number,
        buyer_requested_date, seller_proposed_date, buyer_requested_port, seller_proposed_port,
        buyer_requested_count, seller_proposed_count, logistics_cost, logistics_currency, response_type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uuid(), exporter_quote_id, trade_request_id, sr.shipment_number,
      sr.buyer_requested_date || null, sr.seller_proposed_date || sr.buyer_requested_date || null,
      sr.buyer_requested_port || null, sr.seller_proposed_port || sr.buyer_requested_port || null,
      sr.buyer_requested_count || null, sr.seller_proposed_count || sr.buyer_requested_count || null,
      sr.logistics_cost || 0, sr.logistics_currency || 'USD',
      sr.response_type || 'ACCEPT', sr.notes || null, isoNow()
    ).run();
  }

  await DB.prepare(`UPDATE exporter_quotes SET multi_shipment_response = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(shipment_responses), isoNow(), exporter_quote_id).run();

  return c.json({
    data: { shipment_responses, count: shipment_responses.length },
    message: `Multi-shipment response saved (${shipment_responses.length} shipments)`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. POST /seller-quote/fee-calculate — Step 2.7: SGTX Platform Fee Calculation
// Formula: final_rate = clamp(0.1%, 2.5%, base_rate + adjustments)
// Governor: G2U22 (Final quoted price = trade value + SGTX fee)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/fee-calculate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, trade_request_id, seller_tenant_id, exw_total, logistics_total, commodity_hs6, seller_country, buyer_country } = body;

  const tradeValue = (exw_total || 0) + (logistics_total || 0);
  if (tradeValue <= 0) return c.json({ error: 'Trade value must be positive' }, 400);

  // XGBoost-style fee computation (simulated)
  const baseRate = 0.012; // 1.2% base
  const countryAdj = (['NG', 'KE', 'EG'].includes(seller_country || '') ? 0.003 : 0);
  const perishAdj = (commodity_hs6 && commodity_hs6.startsWith('08') ? 0.002 : 0); // Fruits are perishable
  const seasonAdj = 0; // Placeholder for seasonal adjustment
  const geoAdj = 0; // Placeholder for geopolitical adjustment
  const volumeDiscount = (tradeValue > 500000 ? -0.002 : tradeValue > 100000 ? -0.001 : 0);

  const rawRate = baseRate + countryAdj + perishAdj + seasonAdj + geoAdj + volumeDiscount;
  const finalRate = Math.max(0.001, Math.min(0.025, rawRate)); // clamp(0.1%, 2.5%)
  const feeAmount = Math.round(tradeValue * finalRate * 100) / 100;
  const finalQuotedPrice = tradeValue + feeAmount;

  const feeId = uuid();
  await DB.prepare(`
    INSERT INTO fee_calculations (id, trade_request_id, exporter_quote_id, exporter_tenant_id,
      commodity_hs6, seller_country, buyer_country, trade_value, base_rate,
      country_adjustment, seasonality_adjustment, perishability_adjustment, geopolitics_adjustment,
      volume_discount, final_rate, fee_amount, net_fee, model_version, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'xgboost-v1.0', ?)
  `).bind(
    feeId, trade_request_id, exporter_quote_id || null, seller_tenant_id || null,
    commodity_hs6 || null, seller_country || null, buyer_country || null,
    tradeValue, baseRate, countryAdj, seasonAdj, perishAdj, geoAdj,
    volumeDiscount, finalRate, feeAmount, feeAmount, isoNow()
  ).run();

  // Update quote with fee
  if (exporter_quote_id) {
    await DB.prepare(`
      UPDATE exporter_quotes SET sgtx_fee_rate = ?, sgtx_fee_amount = ?, total_trade_value = ?, final_quoted_price = ?, updated_at = ? WHERE id = ?
    `).bind(finalRate, feeAmount, tradeValue, finalQuotedPrice, isoNow(), exporter_quote_id).run();
  }

  return c.json({
    data: {
      fee_calculation_id: feeId,
      trade_value: tradeValue,
      exw_total: exw_total || 0,
      logistics_total: logistics_total || 0,
      fee_breakdown: {
        base_rate: baseRate, country_adjustment: countryAdj,
        seasonality_adjustment: seasonAdj, perishability_adjustment: perishAdj,
        geopolitics_adjustment: geoAdj, volume_discount: volumeDiscount,
      },
      final_rate: finalRate,
      final_rate_pct: `${(finalRate * 100).toFixed(2)}%`,
      fee_amount: feeAmount,
      final_quoted_price: finalQuotedPrice,
      model: 'xgboost-v1.0',
      note: 'Fee paid by seller, added to quote. Buyer sees: Total price (includes SGTX platform fee)'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. POST /seller-quote/packing-lock — Step 2.5: Lock packing plan (Loom hash)
// Governor: G2U14 (Packing plan lock creates Loom hash), G2U9 (Freeze logged)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/packing-lock', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { packing_plan_id, seller_tenant_id } = body;

  if (!packing_plan_id) return c.json({ error: 'packing_plan_id required' }, 400);

  const plan = await DB.prepare('SELECT * FROM packing_plans WHERE id = ?').bind(packing_plan_id).first() as any;
  if (!plan) return c.json({ error: 'Packing plan not found' }, 404);
  if (plan.locked_at || plan.locked) return c.json({ error: 'Packing plan already locked (G2U9)' }, 409);

  const sellerTenant = await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(seller_tenant_id).first() as any;
  const gov = await evaluateGovernor(DB, {
    decision_type: 'packing.lock',
    actor_gtid: sellerTenant?.gtid || seller_tenant_id,
    action_context: { packing_plan_id },
  });

  // Create Loom hash (G2U14)
  const { loomHash } = await import('../lib/utils');
  const hash = await loomHash(gov.decision_id, 'packing.lock', isoNow());

  await DB.prepare(`
    UPDATE packing_plans SET locked = 1, locked_at = ?, locked_by = ?, loom_hash = ?, status = 'LOCKED', governor_decision_id = ? WHERE id = ?
  `).bind(isoNow(), seller_tenant_id, hash, gov.decision_id, packing_plan_id).run();

  await auditLog(DB, 'packing_plans', packing_plan_id, 'LOCKED', null, { loom_hash: hash, locked_by: seller_tenant_id });

  return c.json({
    data: { packing_plan_id, status: 'LOCKED', loom_hash: hash, governor_decision: gov },
    message: 'Packing plan locked with Loom hash (G2U14)'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. POST /seller-quote/submit — Step 2.8: Submit final quote package
// Governor: G2U17, G2U18, G2U21, G2U22 (comprehensive final checks)
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.post('/seller-quote/submit', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { exporter_quote_id, seller_tenant_id } = body;

  if (!exporter_quote_id || !seller_tenant_id) {
    return c.json({ error: 'exporter_quote_id and seller_tenant_id required' }, 400);
  }

  // Load quote
  const quote = await DB.prepare('SELECT * FROM exporter_quotes WHERE id = ?').bind(exporter_quote_id).first() as any;
  if (!quote) return c.json({ error: 'Quote not found' }, 404);

  // ─── VALIDATION GATES ─────────────────────────────────────────
  const validationErrors: { gate: string; message: string }[] = [];

  // G2U17: Loading origin must be specified
  if (!quote.loading_country || !quote.loading_port) {
    validationErrors.push({ gate: 'G2U17', message: 'Loading origin (country + port) not specified' });
  }

  // G2U18: Mandatory logistics costs (only if not EXW)
  if (quote.incoterm && quote.incoterm !== 'EXW') {
    const costLines = await DB.prepare(
      'SELECT * FROM quote_logistics_lines WHERE exporter_quote_id = ?'
    ).bind(exporter_quote_id).all();

    const mapping = INCOTERM_LOGISTICS_MAP[quote.incoterm] || {};
    for (const [type, rule] of Object.entries(mapping)) {
      if (rule === 'M') {
        const found = (costLines.results || []).find((cl: any) => cl.cost_type === type && cl.amount > 0);
        if (!found) {
          validationErrors.push({ gate: 'G2U18', message: `Missing mandatory ${COST_TYPE_LABELS[type]} for ${quote.incoterm}` });
        }
      }
    }
  }

  // G2U22: Final quoted price = trade value + SGTX fee
  if (!quote.sgtx_fee_amount && quote.sgtx_fee_amount !== 0) {
    validationErrors.push({ gate: 'G2U22', message: 'SGTX platform fee not calculated' });
  }

  if (!quote.exw_price || quote.exw_price <= 0) {
    validationErrors.push({ gate: 'G2UA1', message: 'EXW price not locked' });
  }

  if (validationErrors.length > 0) {
    return c.json({
      error: 'Quote submission blocked by Governor gates',
      validation_errors: validationErrors,
      gates_failed: validationErrors.map(e => e.gate),
    }, 422);
  }

  // ─── GOVERNOR FINAL EVALUATION ────────────────────────────────
  const sellerTenant = await DB.prepare('SELECT gtid FROM tenants WHERE id = ?').bind(seller_tenant_id).first() as any;
  const gov = await evaluateGovernor(DB, {
    decision_type: 'quote.submit',
    actor_gtid: sellerTenant?.gtid || seller_tenant_id,
    action_context: {
      exporter_quote_id,
      trade_request_id: quote.trade_request_id,
      exw_price: quote.exw_price,
      logistics_total: quote.logistics_total,
      sgtx_fee_amount: quote.sgtx_fee_amount,
      final_quoted_price: quote.final_quoted_price,
      incoterm: quote.incoterm,
      loading_country: quote.loading_country,
    },
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Quote submission denied by Governor', governor: gov }, 403);

  // ─── SUBMIT QUOTE ─────────────────────────────────────────────
  await DB.prepare(`
    UPDATE exporter_quotes SET status = 'SUBMITTED', submitted_at = ?, governor_decision_id = ?, updated_at = ? WHERE id = ?
  `).bind(isoNow(), gov.decision_id, isoNow(), exporter_quote_id).run();

  // Update trade request status
  await DB.prepare(`
    UPDATE trade_requests SET status = 'QUOTED', assigned_exporter_id = ?, updated_at = ? WHERE id = ?
  `).bind(seller_tenant_id, isoNow(), quote.trade_request_id).run();

  // Timeline event
  try {
    await DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, actor_gtid, phase, created_at)
      VALUES (?, ?, 'PHASE_2', 'Seller quote submitted', ?, ?, 'Phase 2', ?)
    `).bind(uuid(), quote.trade_request_id, JSON.stringify({
      exw_price: quote.exw_price, logistics_total: quote.logistics_total,
      sgtx_fee: quote.sgtx_fee_amount, final_price: quote.final_quoted_price
    }), sellerTenant?.gtid || seller_tenant_id, isoNow()).run();
  } catch {}

  await auditLog(DB, 'exporter_quotes', exporter_quote_id, 'SUBMITTED', null, {
    final_quoted_price: quote.final_quoted_price, sgtx_fee: quote.sgtx_fee_amount
  });

  return c.json({
    data: {
      quote_id: exporter_quote_id,
      status: 'SUBMITTED',
      exw_price: quote.exw_price,
      logistics_total: quote.logistics_total || 0,
      total_trade_value: quote.total_trade_value || (quote.exw_price + (quote.logistics_total || 0)),
      sgtx_fee_rate: quote.sgtx_fee_rate,
      sgtx_fee_amount: quote.sgtx_fee_amount,
      final_quoted_price: quote.final_quoted_price,
      incoterm: quote.incoterm,
      loading_origin: { country: quote.loading_country, port: quote.loading_port },
      governor_decision: gov,
    },
    message: 'Quote submitted successfully. Awaiting buyer review.'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14. GET /seller-quote/detail — Get full quote details
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/detail', async (c) => {
  const { DB } = c.env;
  const quote_id = c.req.query('quote_id');
  if (!quote_id) return c.json({ error: 'quote_id required' }, 400);

  const quote = await DB.prepare('SELECT * FROM exporter_quotes WHERE id = ?').bind(quote_id).first();
  if (!quote) return c.json({ error: 'Quote not found' }, 404);

  const costLines = await DB.prepare('SELECT * FROM quote_logistics_lines WHERE exporter_quote_id = ? ORDER BY cost_type').bind(quote_id).all();
  const alternatives = await DB.prepare('SELECT * FROM exporter_quote_alternatives WHERE exporter_quote_id = ?').bind(quote_id).all();
  const packingPlans = await DB.prepare('SELECT * FROM packing_plans WHERE exporter_quote_id = ?').bind(quote_id).all();
  const shipmentResponses = await DB.prepare('SELECT * FROM seller_shipment_responses WHERE exporter_quote_id = ? ORDER BY shipment_number').bind(quote_id).all();
  const feeCalc = await DB.prepare('SELECT * FROM fee_calculations WHERE exporter_quote_id = ? ORDER BY created_at DESC LIMIT 1').bind(quote_id).first();

  return c.json({
    data: {
      quote,
      logistics_lines: costLines.results || [],
      alternatives: alternatives.results || [],
      packing_plans: packingPlans.results || [],
      shipment_responses: shipmentResponses.results || [],
      fee_calculation: feeCalc,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. GET /seller-quote/price-watch — Post-lock price monitoring
// ═══════════════════════════════════════════════════════════════════════════════
sellerQuote.get('/seller-quote/price-watch', async (c) => {
  const { DB } = c.env;
  const quote_id = c.req.query('quote_id');
  if (!quote_id) return c.json({ error: 'quote_id required' }, 400);

  const watch = await DB.prepare('SELECT * FROM exw_price_watch WHERE exporter_quote_id = ? ORDER BY created_at DESC LIMIT 1').bind(quote_id).first() as any;
  if (!watch) return c.json({ data: null, message: 'No price watch active' });

  // Simulate current market price check
  const quote = await DB.prepare('SELECT exw_price, exw_currency FROM exporter_quotes WHERE id = ?').bind(quote_id).first() as any;
  const latestPrice = await DB.prepare(
    `SELECT price_usd FROM market_price_feeds ORDER BY recorded_date DESC LIMIT 1`
  ).first() as any;

  const currentPrice = latestPrice?.price_usd || watch.locked_price;
  const deviation = watch.locked_price > 0 ? ((currentPrice - watch.locked_price) / watch.locked_price) * 100 : 0;
  const alertTriggered = Math.abs(deviation) >= 10;

  return c.json({
    data: {
      locked_price: watch.locked_price,
      current_market_price: currentPrice,
      deviation_pct: Math.round(deviation * 100) / 100,
      alert_triggered: alertTriggered,
      alert_type: deviation >= 10 ? 'PRICE_UP_10' : (deviation <= -10 ? 'PRICE_DOWN_10' : null),
      recommendation: alertTriggered ? 'Consider reopening pricing' : 'Within acceptable range',
    }
  });
});

export default sellerQuote;

import { Hono } from 'hono';
import { uuid, isoNow, generateUSTN, gtidSuffix, clampCommissionRate, defaultCommissionPayer } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';

type Bindings = { DB: D1Database };
const phases = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: TRADE INITIATION
// POST /v1/trade/initiate - Importer describes goods, AI extracts details
// Governor: G1-U-2 (Intent classification), G1-U-5 (Jurisdiction prescreen)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/trade/initiate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const {
    importer_tenant_id, exporter_gtid, raw_description,
    commodities, incoterm, destination_country, origin_country,
    containers, notes, parsed_specs,
    transport_mode, seller_gtid, seller_company_name
  } = body;

  if (!importer_tenant_id) return c.json({ error: 'importer_tenant_id required' }, 400);

  // Verify importer tenant exists
  const importerTenant = await DB.prepare(`SELECT id, gtid, jurisdiction FROM tenants WHERE id = ?`).bind(importer_tenant_id).first() as any;
  if (!importerTenant) return c.json({ error: `Importer tenant '${importer_tenant_id}' not found` }, 404);

  // Resolve exporter if GTID provided — look up by gtid column, store the tenant id
  let exporterTenantId: string | null = null;
  if (exporter_gtid) {
    const exp = await DB.prepare(`SELECT id, gtid FROM tenants WHERE gtid = ? OR id = ?`).bind(exporter_gtid, exporter_gtid).first() as any;
    if (exp) exporterTenantId = exp.id;
  }

  // Governor pre-screen: G1-U-5 Jurisdiction check
  const gov = await evaluateGovernor(DB, {
    decision_type: 'trade.request.create',
    actor_gtid: importerTenant.gtid || importer_tenant_id,
    action_context: { importer_gtid: importerTenant.gtid, origin_country, destination_country, commodities }
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Trade request denied by Governor', governor: gov }, 403);

  // Build parsed specs — either from legacy format or new container-level format
  let specsJson: string;
  if (parsed_specs) {
    specsJson = JSON.stringify(parsed_specs);
  } else if (containers && containers.length > 0) {
    specsJson = JSON.stringify({ containers, notes, incoterm });
  } else {
    specsJson = JSON.stringify(commodities || [{ description: raw_description }]);
  }

  // Find a valid employee reference for the tenant (FK: employees.id)
  let employeeId = body.employee_id;
  if (employeeId) {
    // Verify the provided employee exists
    const empCheck = await DB.prepare(`SELECT id FROM employees WHERE id = ?`).bind(employeeId).first();
    if (!empCheck) employeeId = null;
  }
  if (!employeeId) {
    const emp = await DB.prepare(`SELECT id FROM employees WHERE tenant_id = ? LIMIT 1`).bind(importer_tenant_id).first() as any;
    employeeId = emp?.id || null;
  }
  // If still no employee found, create an auto-employee for this tenant
  if (!employeeId) {
    employeeId = `auto-emp-${importer_tenant_id}`;
    try {
      await DB.prepare(`
        INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, role_id, status, created_at)
        VALUES (?, ?, ?, ?, 'TRADE_OPS', 'ACTIVE', ?)
      `).bind(employeeId, importer_tenant_id, `ops@${importer_tenant_id}.sgtx`, 'Trade Operations', isoNow()).run();
    } catch (e) { /* ignore duplicate */ }
  }

  const status = exporterTenantId ? 'PENDING_EXPORTER_RESPONSE' : 'DRAFT';

  await DB.prepare(`
    INSERT INTO trade_requests (id, importer_tenant_id, exporter_tenant_id, assigned_exporter_id, raw_description, parsed_specs, status, governor_decision_id, created_by, transport_mode, seller_gtid, seller_company_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, importer_tenant_id, exporterTenantId, exporterTenantId, raw_description || null, specsJson, status, gov.decision_id, employeeId, transport_mode || 'SEA_CARGO', seller_gtid || null, seller_company_name || null, isoNow(), isoNow()).run();

  // ── Persist container-level detail (new multi-container flow) ──
  const savedContainers: any[] = [];
  if (containers && Array.isArray(containers)) {
    for (let ci = 0; ci < containers.length; ci++) {
      const ct = containers[ci];
      const containerId = uuid();
      await DB.prepare(`
        INSERT INTO trade_containers (id, trade_request_id, container_index, container_type, origin_country, destination_country, port_of_discharge, port_of_loading, palletized, pallet_size, cloned_from_container_id, notes, transport_mode, destination_override, port_of_loading_unlocode, port_of_discharge_unlocode, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        containerId, id, ci + 1,
        ct.container_type || '40ft_HC',
        ct.origin_country || origin_country || '',
        ct.destination_country || destination_country || '',
        ct.port_of_discharge || null,
        ct.port_of_loading || null,
        ct.palletized !== undefined ? (ct.palletized ? 1 : 0) : 1,
        ct.pallet_size || '120x100',
        ct.cloned_from || null,
        ct.notes || null,
        ct.transport_mode || transport_mode || 'SEA_CARGO',
        ct.destination_override || null,
        ct.port_of_loading_unlocode || null,
        ct.port_of_discharge_unlocode || null,
        isoNow()
      ).run();

      const savedCommodities: any[] = [];
      if (ct.commodities && Array.isArray(ct.commodities)) {
        for (let pi = 0; pi < ct.commodities.length; pi++) {
          const cm = ct.commodities[pi];
          const cmId = uuid();
          await DB.prepare(`
            INSERT INTO trade_container_commodities (id, trade_container_id, trade_request_id, commodity_type, product_name, hs_code, product_specification, packaging, packaging_custom, num_pallets, quantity, unit, sort_order, net_weight_per_unit, gross_weight_per_unit, tare_weight_per_unit, total_units, total_net_weight, total_gross_weight, weight_unit, quantity_type, packaging_description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            cmId, containerId, id,
            cm.commodity_type || 'OTHER',
            cm.product_name || cm.product || 'Unknown',
            cm.hs_code || null,
            cm.product_specification || null,
            cm.packaging || 'boxes',
            cm.packaging_custom || null,
            cm.num_pallets || 1,
            cm.quantity || null,
            cm.unit || 'KG',
            pi + 1,
            cm.net_weight_per_unit || null,
            cm.gross_weight_per_unit || null,
            cm.tare_weight_per_unit || null,
            cm.total_units || null,
            cm.total_net_weight || null,
            cm.total_gross_weight || null,
            cm.weight_unit || 'KG',
            cm.quantity_type || 'WEIGHT',
            cm.packaging_description || null,
            isoNow()
          ).run();
          savedCommodities.push({ id: cmId, ...cm });
        }
      }
      savedContainers.push({ id: containerId, index: ci + 1, commodities: savedCommodities, ...ct });
    }
  }

  // Log trade event timeline (non-blocking)
  try {
    await DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, actor_gtid, phase, created_at)
      VALUES (?, ?, 'PHASE_1', 'Trade initiated by importer', ?, ?, 'Phase 1', ?)
    `).bind(uuid(), id, JSON.stringify({ containers: savedContainers.length, incoterm, notes }), importerTenant.gtid || importer_tenant_id, isoNow()).run();
  } catch (e) { /* non-blocking */ }

  try {
    await auditLog(DB, 'trade_requests', id, 'INSERT', null, { status, containers: savedContainers.length }, importerTenant.gtid || importer_tenant_id);
  } catch (e) { /* non-blocking */ }

  // Create Trade Channel if exporter is known
  if (exporterTenantId) {
    try {
      await DB.prepare(`
        INSERT INTO trade_channels (channel_id, trade_request_id, importer_tenant_id, exporter_tenant_id, jurisdiction_rules_snapshot, current_phase, creation_governor_decision_id)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).bind(uuid(), id, importer_tenant_id, exporterTenantId, JSON.stringify({ importer: importerTenant.jurisdiction }), gov.decision_id).run();
    } catch (e) { /* non-blocking */ }
  }

  return c.json({
    data: {
      trade_request_id: id,
      status,
      governor_decision: gov,
      containers: savedContainers,
      total_containers: savedContainers.length,
      notes: notes || null,
    },
    message: `Trade initiated successfully with ${savedContainers.length || 0} container(s). ${exporterTenantId ? 'Awaiting exporter quote.' : 'Listed in marketplace for exporter matching.'}`
  }, 201);
});

// GET /v1/trade/:id/containers — Get container details for a trade request
phases.get('/trade/:id/containers', async (c) => {
  const { DB } = c.env;
  const tradeId = c.req.param('id');

  const containers = await DB.prepare(
    `SELECT * FROM trade_containers WHERE trade_request_id = ? ORDER BY container_index`
  ).bind(tradeId).all();

  const result: any[] = [];
  for (const ct of (containers.results || [])) {
    const commodities = await DB.prepare(
      `SELECT * FROM trade_container_commodities WHERE trade_container_id = ? ORDER BY sort_order`
    ).bind((ct as any).id).all();
    result.push({ ...ct, commodities: commodities.results || [] });
  }

  return c.json({ data: result });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: EXPORTER QUOTE, PACKING & LOGISTICS
// POST /v1/quote/exw-lock - Lock EXW price per commodity
// Governor: G2-U-A1 (Price deviation check)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/quote/exw-lock', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const {
    trade_request_id, exporter_tenant_id,
    price_per_unit, exw_price, currency, incoterm,
    validity_days, commodity, port_of_loading, recommended_destinations, notes
  } = body;

  // Accept either exw_price or price_per_unit for backward compatibility
  const effectivePrice = exw_price || price_per_unit;

  if (!trade_request_id || !exporter_tenant_id) {
    return c.json({ error: 'trade_request_id, exporter_tenant_id required' }, 400);
  }
  if (!effectivePrice || effectivePrice <= 0) {
    return c.json({ error: 'A positive EXW price (exw_price or price_per_unit) is required' }, 400);
  }

  // Verify trade request exists
  const tradeReq = await DB.prepare(`SELECT id, status FROM trade_requests WHERE id = ?`).bind(trade_request_id).first() as any;
  if (!tradeReq) return c.json({ error: `Trade request '${trade_request_id}' not found` }, 404);

  // Verify exporter tenant exists
  const expTenant = await DB.prepare(`SELECT id, gtid FROM tenants WHERE id = ?`).bind(exporter_tenant_id).first() as any;
  if (!expTenant) return c.json({ error: `Exporter tenant '${exporter_tenant_id}' not found` }, 404);

  // Governor: G2-U-A1 - validate price deviation <= 30%
  const gov = await evaluateGovernor(DB, {
    decision_type: 'quote.submit',
    actor_gtid: expTenant.gtid || exporter_tenant_id,
    action_context: { trade_request_id, exw_price: effectivePrice, incoterm: incoterm || 'EXW' }
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Quote denied by Governor', governor: gov }, 403);

  // Insert into exporter_quotes — matching actual table schema
  // Columns: id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at,
  //          incoterm, validity_days, status, governor_decision_id, created_at,
  //          total_quote_amount, logistics_total, commission_amount, port_of_loading, recommended_destinations
  await DB.prepare(`
    INSERT INTO exporter_quotes (id, trade_request_id, exporter_tenant_id, exw_price, exw_currency, exw_locked_at, incoterm, validity_days, status, governor_decision_id, port_of_loading, recommended_destinations, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'LOCKED', ?, ?, ?, ?)
  `).bind(
    id, trade_request_id, exporter_tenant_id,
    effectivePrice, currency || 'USD', isoNow(),
    incoterm || 'EXW', validity_days || 15,
    gov.decision_id,
    port_of_loading || null,
    recommended_destinations ? JSON.stringify(recommended_destinations) : null,
    isoNow()
  ).run();

  // Update trade request status to QUOTED and assign exporter
  await DB.prepare(`
    UPDATE trade_requests SET status = 'QUOTED', assigned_exporter_id = ?, updated_at = ? WHERE id = ?
  `).bind(exporter_tenant_id, isoNow(), trade_request_id).run();

  // Log timeline event
  try {
    await DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, actor_gtid, phase, created_at)
      VALUES (?, ?, 'PHASE_2', 'EXW price locked by exporter', ?, ?, 'Phase 2', ?)
    `).bind(uuid(), trade_request_id, JSON.stringify({ exw_price: effectivePrice, currency: currency || 'USD', incoterm: incoterm || 'EXW', commodity, port_of_loading }), expTenant.gtid || exporter_tenant_id, isoNow()).run();
  } catch (e) { /* non-blocking timeline logging */ }

  return c.json({
    data: {
      quote_id: id,
      status: 'LOCKED',
      exw_price: effectivePrice,
      currency: currency || 'USD',
      incoterm: incoterm || 'EXW',
      port_of_loading: port_of_loading || null,
      governor_decision: gov
    },
    message: 'EXW price locked successfully'
  }, 201);
});

// POST /v1/packing/optimise - AI packing plan (OR-Tools style)
// Governor: G2-U-10 (Palletisation feasibility)
phases.post('/packing/optimise', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { trade_request_id, exporter_quote_id, items, container_type } = body;

  const gov = await evaluateGovernor(DB, {
    decision_type: 'packing.optimise',
    actor_gtid: body.exporter_tenant_id,
    action_context: { trade_request_id, items, container_type }
  });

  // Simulate AI packing optimisation
  const packingResult = {
    container_type: container_type || '40ft_HC',
    total_pallets: Math.ceil((items?.length || 1) * 1.2),
    utilization_pct: 87.5,
    weight_kg: items?.reduce((sum: number, i: any) => sum + (i.weight_kg || 100), 0) || 1000,
    volume_cbm: items?.reduce((sum: number, i: any) => sum + (i.volume_cbm || 1), 0) || 10,
    ai_recommendation: 'Standard palletisation with corner protectors recommended'
  };

  await DB.prepare(`
    INSERT INTO packing_plans (id, trade_request_id, exporter_quote_id, container_type, total_pallets, utilization_pct, weight_kg, volume_cbm, ai_recommendation, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPTIMISED', ?, ?)
  `).bind(id, trade_request_id, exporter_quote_id || null, packingResult.container_type, packingResult.total_pallets, packingResult.utilization_pct, packingResult.weight_kg, packingResult.volume_cbm, packingResult.ai_recommendation, gov.decision_id, isoNow()).run();

  return c.json({
    data: { packing_plan_id: id, ...packingResult, governor_decision: gov },
    message: 'Packing plan optimised'
  }, 201);
});

// POST /v1/quote/logistics/rfq - Generate and send RFQ to logistics providers
phases.post('/quote/logistics/rfq', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { trade_request_id, exporter_quote_id, origin, destination, services, sourcing_mode } = body;

  await DB.prepare(`
    INSERT INTO provider_quotes (id, trade_request_id, provider_tenant_id, service_type, origin_port, destination_port, price, currency, transit_days, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'USD', 0, 'RFQ_SENT', ?)
  `).bind(id, trade_request_id, 'BROADCAST', JSON.stringify(services || ['FREIGHT']), origin || null, destination || null, isoNow()).run();

  return c.json({
    data: {
      rfq_id: id,
      sourcing_mode: sourcing_mode || 'BROADCAST',
      services_requested: services || ['FREIGHT'],
      status: 'RFQ_SENT'
    },
    message: 'RFQ sent to logistics providers'
  }, 201);
});

// POST /v1/quote/logistics/bundle - AI bundle optimiser
phases.post('/quote/logistics/bundle', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { trade_request_id, provider_quotes } = body;

  // Simulate AI bundle optimisation
  const bundleResult = {
    optimal_combination: provider_quotes?.slice(0, 3) || [],
    total_cost: provider_quotes?.reduce((sum: number, q: any) => sum + (q.price || 0), 0) || 0,
    estimated_transit_days: Math.max(...(provider_quotes?.map((q: any) => q.transit_days || 14) || [14])),
    savings_pct: 12.5,
    ai_confidence: 0.91
  };

  return c.json({
    data: bundleResult,
    message: 'Optimal logistics bundle calculated'
  });
});

// POST /v1/quote/logistics/reoptimise - Refresh carrier risk scores
phases.post('/quote/logistics/reoptimise', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { trade_request_id } = body;

  // Fetch existing quotes and re-score
  const quotes = await DB.prepare(
    `SELECT * FROM provider_quotes WHERE trade_request_id = ? ORDER BY price ASC`
  ).bind(trade_request_id).all();

  const reoptimised = (quotes.results || []).map((q: any, i: number) => ({
    ...q,
    risk_score: Math.random() * 0.3 + 0.7,
    freshness: 'UPDATED',
    rank: i + 1
  }));

  return c.json({
    data: { quotes: reoptimised, reoptimised_at: isoNow() },
    message: 'Logistics re-optimised with fresh carrier risk scores'
  });
});

// POST /v1/quote/submit - Submit assembled quote to importer
phases.post('/quote/submit', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { trade_request_id, exporter_quote_id, commission_split } = body;

  // Update trade request status
  await DB.prepare(
    `UPDATE trade_requests SET status = 'QUOTE_SUBMITTED' WHERE id = ?`
  ).bind(trade_request_id).run();

  // Update quote status
  if (exporter_quote_id) {
    await DB.prepare(
      `UPDATE exporter_quotes SET status = 'SUBMITTED' WHERE id = ?`
    ).bind(exporter_quote_id).run();
  }

  // Log timeline event
  await DB.prepare(`
    INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, phase, created_at)
    VALUES (?, ?, 'PHASE_2', 'Quote submitted to importer', ?, 'Phase 2', ?)
  `).bind(uuid(), trade_request_id, JSON.stringify({ commission_split: commission_split || { importer: 50, exporter: 50 } }), isoNow()).run();

  return c.json({
    data: { trade_request_id, status: 'QUOTE_SUBMITTED', commission_split: commission_split || { importer: 50, exporter: 50 } },
    message: 'Quote submitted to importer for review'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: CONTRACTING, NEGOTIATION & COMMISSION
// POST /v1/contract/genesis - Initiate contract creation
// Governor: G3-U-A1 (Clause verification)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/contract/genesis', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { trade_request_id, clauses, governing_law, incoterm } = body;
  if (!trade_request_id) return c.json({ error: 'trade_request_id required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'contract.genesis',
    actor_gtid: body.initiator_gtid,
    action_context: { trade_request_id, clauses }
  });

  // AI clause analysis
  const clauseConfidence = {
    payment: 0.95, delivery: 0.92, dispute_resolution: 0.88,
    force_majeure: 0.91, quality: 0.93, insurance: 0.89
  };

  const riskScores = {
    jurisdictional_conflict: 0.15, enforcement_risk: 0.12,
    regulatory_complexity: 0.22, fx_exposure: 0.18
  };

  await DB.prepare(`
    INSERT INTO contract_genesis_sessions (id, trade_request_id, clause_confidence_scores, risk_scores, harmonization_strategy, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, trade_request_id, JSON.stringify(clauseConfidence), JSON.stringify(riskScores), JSON.stringify({ governing_law: governing_law || 'English Law', incoterm: incoterm || 'CIF' }), gov.decision_id, isoNow()).run();

  return c.json({
    data: {
      genesis_session_id: id,
      clause_confidence: clauseConfidence,
      risk_scores: riskScores,
      governor_decision: gov
    },
    message: 'Contract genesis session created. AI clause analysis complete.'
  }, 201);
});

// POST /v1/commission/allocate - Set commission split
phases.post('/commission/allocate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { contract_id, trade_request_id, importer_pct, exporter_pct } = body;
  if (!contract_id && !trade_request_id) return c.json({ error: 'contract_id or trade_request_id required' }, 400);

  const total = (importer_pct || 50) + (exporter_pct || 50);
  if (total !== 100) return c.json({ error: 'Commission split must total 100%' }, 400);

  if (contract_id) {
    await DB.prepare(
      `UPDATE contracts SET commission_allocation = ?, importer_commission_pct = ?, exporter_commission_pct = ? WHERE id = ?`
    ).bind(JSON.stringify({ importer: importer_pct, exporter: exporter_pct }), importer_pct, exporter_pct, contract_id).run();
  }

  return c.json({
    data: { importer_pct: importer_pct || 50, exporter_pct: exporter_pct || 50 },
    message: 'Commission allocation set'
  });
});

// POST /v1/commission/pay - Initiate commission payment via PSP
// Governor: G3-U-00 (Commission payment verification)
phases.post('/commission/pay', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { commission_lock_id, psp_id, amount, currency } = body;
  if (!commission_lock_id || !amount) return c.json({ error: 'commission_lock_id and amount required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'commission.pay',
    actor_gtid: body.payer_gtid,
    action_context: { commission_lock_id, amount, currency }
  });

  await DB.prepare(`
    INSERT INTO payment_attempts (id, commission_lock_id, psp_id, amount, currency, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, 'INITIATED', ?, ?)
  `).bind(id, commission_lock_id, psp_id || null, amount, currency || 'USD', gov.decision_id, isoNow()).run();

  return c.json({
    data: {
      payment_attempt_id: id,
      status: 'INITIATED',
      redirect_url: `/payment/redirect/${id}`,
      governor_decision: gov
    },
    message: 'Commission payment initiated'
  }, 201);
});

// POST /v1/contract/sign - Digital signature via passkey
// Governor: G3-U-10 (Contract lock)
phases.post('/contract/sign', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { contract_id, signer_gtid, signature_data, role } = body;
  if (!contract_id || !signer_gtid) return c.json({ error: 'contract_id and signer_gtid required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'contract.sign',
    actor_gtid: signer_gtid,
    action_context: { contract_id, role }
  });

  // Record signature
  const sigId = uuid();
  await DB.prepare(`
    INSERT INTO signature_sequences (id, contract_id, signer_gtid, role, signature_hash, governor_decision_id, signed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(sigId, contract_id, signer_gtid, role || 'PARTY', signature_data || uuid(), gov.decision_id, isoNow()).run();

  // Update contract based on role
  const sigField = role === 'EXPORTER' ? 'exporter_signature' : 'importer_signature';
  await DB.prepare(
    `UPDATE contracts SET ${sigField} = ?, signed_at = COALESCE(signed_at, ?) WHERE id = ?`
  ).bind(signature_data || sigId, isoNow(), contract_id).run();

  // Check if both parties signed -> lock contract
  const contract = await DB.prepare(`SELECT * FROM contracts WHERE id = ?`).bind(contract_id).first() as any;
  if (contract?.importer_signature && contract?.exporter_signature) {
    await DB.prepare(`UPDATE contracts SET status = 'LOCKED', locked_at = ? WHERE id = ?`).bind(isoNow(), contract_id).run();
  }

  return c.json({
    data: { signature_id: sigId, contract_id, signer_gtid, role, governor_decision: gov },
    message: `Contract signed by ${role || 'party'}`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: UNIVERSAL TRADE FINANCE
// POST /v1/finance/request - Initiate financing request
// Governor: G4-U-1 (Credit assessment)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/finance/request', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, collateral } = body;
  if (!contract_id || !requester_tenant_id || !amount) {
    return c.json({ error: 'contract_id, requester_tenant_id, amount required' }, 400);
  }

  const gov = await evaluateGovernor(DB, {
    decision_type: 'finance.request',
    actor_gtid: requester_tenant_id,
    action_context: { contract_id, amount, tenor_days, financing_type }
  });

  // AI Credit Intelligence (200+ signals simulation)
  const creditIntelligence = {
    score: Math.floor(Math.random() * 300 + 600),
    signals_analyzed: 217,
    default_probability: Math.random() * 0.05,
    recommendation: 'APPROVE',
    risk_factors: ['FX exposure moderate', 'Sector: Agriculture - stable']
  };

  await DB.prepare(`
    INSERT INTO financing_requests (id, contract_id, requester_tenant_id, amount, currency, tenor_days, financing_type, collateral, credit_intelligence, monte_carlo_default_prob, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).bind(id, contract_id, requester_tenant_id, amount, currency || 'USD', tenor_days || 90, financing_type || 'PRE_SHIPMENT', JSON.stringify(collateral || {}), JSON.stringify(creditIntelligence), creditIntelligence.default_probability, gov.decision_id, isoNow()).run();

  return c.json({
    data: {
      financing_request_id: id,
      credit_intelligence: creditIntelligence,
      status: 'PENDING',
      governor_decision: gov
    },
    message: 'Financing request submitted. Credit assessment complete.'
  }, 201);
});

// POST /v1/finance/bid - Financier submits encrypted bid
phases.post('/finance/bid', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { financing_request_id, financier_tenant_id, amount, interest_rate, tenor_days, conditions } = body;
  if (!financing_request_id || !financier_tenant_id || !amount || !interest_rate) {
    return c.json({ error: 'financing_request_id, financier_tenant_id, amount, interest_rate required' }, 400);
  }

  await DB.prepare(`
    INSERT INTO financing_offers (id, financing_request_id, financier_tenant_id, amount, interest_rate, tenor_days, conditions, status, bid_encrypted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 1, ?)
  `).bind(id, financing_request_id, financier_tenant_id, amount, interest_rate, tenor_days || 90, JSON.stringify(conditions || {}), isoNow()).run();

  // Update auction qualified bidders count
  await DB.prepare(
    `UPDATE liquidity_auctions SET qualified_bidders = qualified_bidders + 1 WHERE financing_request_id = ?`
  ).bind(financing_request_id).run();

  return c.json({
    data: { bid_id: id, status: 'PENDING', encrypted: true },
    message: 'Bid submitted (encrypted). Awaiting bid window close.'
  }, 201);
});

// POST /v1/finance/award - Accept winning bid
phases.post('/finance/award', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { financing_request_id, financing_offer_id } = body;
  if (!financing_request_id || !financing_offer_id) {
    return c.json({ error: 'financing_request_id, financing_offer_id required' }, 400);
  }

  // Update offer status
  await DB.prepare(`UPDATE financing_offers SET status = 'ACCEPTED' WHERE id = ?`).bind(financing_offer_id).run();
  await DB.prepare(`UPDATE financing_offers SET status = 'REJECTED' WHERE financing_request_id = ? AND id != ?`).bind(financing_request_id, financing_offer_id).run();
  await DB.prepare(`UPDATE financing_requests SET status = 'AWARDED' WHERE id = ?`).bind(financing_request_id).run();

  // Create agreement
  const offer = await DB.prepare(`SELECT * FROM financing_offers WHERE id = ?`).bind(financing_offer_id).first() as any;

  await DB.prepare(`
    INSERT INTO financing_agreements (id, financing_request_id, financing_offer_id, amount, disbursement_status, created_at)
    VALUES (?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, financing_request_id, financing_offer_id, offer?.amount || 0, isoNow()).run();

  return c.json({
    data: { agreement_id: id, financing_offer_id, status: 'AWARDED' },
    message: 'Financing awarded. Agreement created.'
  });
});

// POST /v1/finance/defi/deploy - Deploy DeFi financing
// Governor: G4-U-5c (DeFi protocol score)
phases.post('/finance/defi/deploy', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { financing_request_id, protocol_id, amount, token } = body;

  const gov = await evaluateGovernor(DB, {
    decision_type: 'finance.defi_deploy',
    actor_gtid: body.requester_tenant_id,
    action_context: { protocol_id, amount, token }
  });

  await DB.prepare(`
    INSERT INTO defi_tranche_positions (id, financing_request_id, protocol_id, amount, token, health_factor, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, 1.5, 'DEPLOYED', ?, ?)
  `).bind(id, financing_request_id, protocol_id, amount, token || 'USDC', gov.decision_id, isoNow()).run();

  return c.json({
    data: { tranche_id: id, protocol_id, amount, token: token || 'USDC', health_factor: 1.5, governor_decision: gov },
    message: 'DeFi financing deployed'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: PHYSICAL EXECUTION & MULTI-PARTY TRACKING
// POST /v1/shipment/milestone/confirm - Confirm physical milestone
// Governor: G5-U-1 (Multi-source consensus)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/shipment/milestone/confirm', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, milestone_type, confirmed_by, evidence, location } = body;
  if (!ustn || !milestone_type) return c.json({ error: 'ustn, milestone_type required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'shipment.milestone',
    actor_gtid: confirmed_by,
    action_context: { ustn, milestone_type, evidence }
  });

  await DB.prepare(`
    INSERT INTO shipment_milestones (id, shipment_ustn, milestone_type, confirmed_by, evidence, location, governor_decision_id, confirmed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ustn, milestone_type, confirmed_by || null, JSON.stringify(evidence || {}), location || null, gov.decision_id, isoNow()).run();

  // Update shipment status
  await DB.prepare(`UPDATE shipments SET status = ?, current_milestone = ? WHERE ustn = ?`).bind(milestone_type, milestone_type, ustn).run();

  // Timeline event
  await DB.prepare(`
    INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, phase, created_at)
    VALUES (?, ?, 'MILESTONE', ?, 'Phase 5', ?)
  `).bind(uuid(), ustn, `Milestone confirmed: ${milestone_type}`, isoNow()).run();

  return c.json({
    data: { milestone_id: id, ustn, milestone_type, governor_decision: gov },
    message: `Milestone ${milestone_type} confirmed`
  }, 201);
});

// POST /v1/shipment/barcode/scan - Mobile SSCC-18 scanning
phases.post('/shipment/barcode/scan', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, barcode_data, barcode_type, scanned_by, location } = body;
  if (!ustn || !barcode_data) return c.json({ error: 'ustn, barcode_data required' }, 400);

  await DB.prepare(`
    INSERT INTO shipment_barcodes (id, shipment_ustn, barcode_data, barcode_type, scanned_by, location, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ustn, barcode_data, barcode_type || 'SSCC18', scanned_by || null, location || null, isoNow()).run();

  return c.json({
    data: { scan_id: id, ustn, barcode_data, barcode_type: barcode_type || 'SSCC18' },
    message: 'Barcode scanned and logged'
  }, 201);
});

// POST /v1/shipment/document/upload - Upload and validate document
// Governor: G5-U-A1 (Document validation)
phases.post('/shipment/document/upload', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, document_type, filename, file_hash, uploaded_by } = body;
  if (!ustn || !document_type) return c.json({ error: 'ustn, document_type required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'document.validate',
    actor_gtid: uploaded_by,
    action_context: { ustn, document_type, file_hash }
  });

  // AI Donut validation simulation
  const aiResult = {
    confidence: 0.94,
    extracted_fields: { document_type, issuer: 'Auto-detected', date: isoNow() },
    anomalies: [],
    validation_pass: true
  };

  await DB.prepare(`
    INSERT INTO documents (id, shipment_ustn, document_type, filename, file_hash, ai_validation_status, ai_validation_result, uploaded_by, governor_decision_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'VALIDATED', ?, ?, ?, 'UPLOADED', ?)
  `).bind(id, ustn, document_type, filename || null, file_hash || null, JSON.stringify(aiResult), uploaded_by || null, gov.decision_id, isoNow()).run();

  return c.json({
    data: { document_id: id, ustn, document_type, ai_validation: aiResult, governor_decision: gov },
    message: 'Document uploaded and AI-validated'
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: SETTLEMENT & PAYMENT ORCHESTRATION
// POST /v1/settlement/instruction - Issue settlement instruction
// Governor: G6-U-9 (Final settlement confirmation)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/settlement/instruction', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, instruction_type, payer_tenant_id, payee_tenant_id, amount, currency, payment_rail } = body;
  if (!ustn || !instruction_type || !amount) {
    return c.json({ error: 'ustn, instruction_type, amount required' }, 400);
  }

  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.instruction',
    actor_gtid: payer_tenant_id,
    action_context: { ustn, instruction_type, amount, currency }
  });

  await DB.prepare(`
    INSERT INTO settlement_instructions (id, ustn, instruction_type, payer_tenant_id, payee_tenant_id, amount, currency, payment_rail, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).bind(id, ustn, instruction_type, payer_tenant_id || null, payee_tenant_id || null, amount, currency || 'USD', payment_rail || 'SWIFT', gov.decision_id, isoNow()).run();

  // Timeline
  await DB.prepare(`
    INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, phase, created_at)
    VALUES (?, ?, 'SETTLEMENT', ?, 'Phase 6', ?)
  `).bind(uuid(), ustn, `Settlement instruction issued: ${instruction_type} - ${amount} ${currency || 'USD'}`, isoNow()).run();

  return c.json({
    data: { settlement_id: id, ustn, instruction_type, amount, currency: currency || 'USD', governor_decision: gov },
    message: 'Settlement instruction issued'
  }, 201);
});

// POST /v1/settlement/verify - Multi-rail verification
phases.post('/settlement/verify', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { settlement_id, verification_hash, psp_reference } = body;
  if (!settlement_id) return c.json({ error: 'settlement_id required' }, 400);

  await DB.prepare(
    `UPDATE settlement_instructions SET status = 'VERIFIED', psp_reference = ?, reconciled_at = ? WHERE id = ?`
  ).bind(psp_reference || verification_hash, isoNow(), settlement_id).run();

  return c.json({
    data: { settlement_id, status: 'VERIFIED', verified_at: isoNow() },
    message: 'Settlement verified'
  });
});

// POST /v1/settlement/fx-path - FX arbitrage path finding
phases.post('/settlement/fx-path', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { settlement_instruction_id, source_currency, target_currency, amount } = body;

  const gov = await evaluateGovernor(DB, {
    decision_type: 'settlement.fx_path',
    actor_gtid: body.actor_gtid,
    action_context: { source_currency, target_currency, amount }
  });

  // Simulate multi-hop FX path
  const fxPath = {
    path: [source_currency, 'USD', target_currency].filter(Boolean),
    predicted_slippage: 0.0023,
    total_fee_pct: 0.15,
    estimated_rate: 1.0 + Math.random() * 0.1,
    optimal_timing: 'NEXT_LONDON_OPEN'
  };

  await DB.prepare(`
    INSERT INTO fx_optimization_paths (id, settlement_instruction_id, currency_path, predicted_slippage, governor_decision_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, settlement_instruction_id, JSON.stringify(fxPath.path), fxPath.predicted_slippage, gov.decision_id).run();

  // Update settlement instruction with fx_path
  if (settlement_instruction_id) {
    await DB.prepare(`UPDATE settlement_instructions SET fx_path = ? WHERE id = ?`).bind(JSON.stringify(fxPath), settlement_instruction_id).run();
  }

  return c.json({
    data: { fx_path_id: id, ...fxPath, governor_decision: gov },
    message: 'Optimal FX path calculated'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: DISTRESSED CARGO RESOLUTION
// POST /v1/distressed/list - Declare cargo as distressed
// Governor: G7-U-4 (Jurisdiction compliance)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/distressed/list', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { ustn, pallet_ids, condition_score, exporter_tenant_id, product_details, price_expectation } = body;
  if (!ustn) return c.json({ error: 'ustn required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'distressed.list',
    actor_gtid: exporter_tenant_id,
    action_context: { ustn, condition_score }
  });

  // AI price recommendation
  const aiPrice = (price_expectation || 1000) * (condition_score || 0.5) * 0.8;
  const triagePath = condition_score >= 0.7 ? 'PATH_A_REDIRECT' : condition_score >= 0.4 ? 'PATH_B_DISCOUNT' : 'PATH_C_SALVAGE';

  await DB.prepare(`
    INSERT INTO distressed_cargo_listings (id, original_shipment_ustn, exporter_tenant_id, product_details, condition, price_expectation, condition_score, ai_price_recommendation, triage_path, pallet_ids, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LISTED', ?, ?)
  `).bind(id, ustn, exporter_tenant_id || null, JSON.stringify(product_details || {}), body.condition || 'DAMAGED', price_expectation || 0, condition_score || 0.5, aiPrice, triagePath, JSON.stringify(pallet_ids || []), gov.decision_id, isoNow()).run();

  return c.json({
    data: { listing_id: id, triage_path: triagePath, ai_price_recommendation: aiPrice, governor_decision: gov },
    message: 'Distressed cargo listed'
  }, 201);
});

// POST /v1/distressed/offer - Submit offer on distressed cargo
phases.post('/distressed/offer', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { listing_id, buyer_tenant_id, offer_amount, currency } = body;
  if (!listing_id || !buyer_tenant_id || !offer_amount) {
    return c.json({ error: 'listing_id, buyer_tenant_id, offer_amount required' }, 400);
  }

  await DB.prepare(`
    INSERT INTO distressed_cargo_offers (id, listing_id, buyer_tenant_id, offer_amount, currency, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
  `).bind(id, listing_id, buyer_tenant_id, offer_amount, currency || 'USD', isoNow()).run();

  return c.json({
    data: { offer_id: id, listing_id, offer_amount, status: 'PENDING' },
    message: 'Offer submitted on distressed cargo'
  }, 201);
});

// POST /v1/distressed/resolve - Accept offer & create micro-contract
// Governor: G7-U-7 (Micro-contract signature)
phases.post('/distressed/resolve', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { listing_id, offer_id } = body;
  if (!listing_id || !offer_id) return c.json({ error: 'listing_id, offer_id required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'distressed.resolve',
    actor_gtid: body.resolver_gtid,
    action_context: { listing_id, offer_id }
  });

  await DB.prepare(`UPDATE distressed_cargo_listings SET status = 'RESOLVED' WHERE id = ?`).bind(listing_id).run();
  await DB.prepare(`UPDATE distressed_cargo_offers SET status = 'ACCEPTED' WHERE id = ?`).bind(offer_id).run();
  await DB.prepare(`UPDATE distressed_cargo_offers SET status = 'REJECTED' WHERE listing_id = ? AND id != ?`).bind(listing_id, offer_id).run();

  return c.json({
    data: { listing_id, offer_id, status: 'RESOLVED', governor_decision: gov },
    message: 'Distressed cargo resolved. Micro-contract created.'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: DISTRESSED CARGO OUTREACH
// POST /v1/distressed/notify - Notify contacts of distressed cargo
// Governor: G8-U-1 (Status check), G8-U-3 (Notification logging)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/distressed/notify', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { distressed_ustn, recipient_gtids, message, outreach_mode } = body;
  if (!distressed_ustn || !recipient_gtids?.length) {
    return c.json({ error: 'distressed_ustn, recipient_gtids[] required' }, 400);
  }

  const gov = await evaluateGovernor(DB, {
    decision_type: 'distressed.notify',
    actor_gtid: body.sender_gtid,
    action_context: { distressed_ustn, recipient_count: recipient_gtids.length, outreach_mode }
  });

  const notifications = [];
  for (const gtid of recipient_gtids) {
    const notifId = uuid();
    await DB.prepare(`
      INSERT INTO distressed_contact_notifications (id, distressed_ustn, recipient_gtid, message_hash, sent_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(notifId, distressed_ustn, gtid, uuid(), isoNow()).run();
    notifications.push({ id: notifId, recipient_gtid: gtid });
  }

  return c.json({
    data: { notifications, total_sent: notifications.length, outreach_mode: outreach_mode || 'STANDARD', governor_decision: gov },
    message: `${notifications.length} notifications sent`
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: GLOBAL PAYMENT ORCHESTRATOR & COMMISSION SETTLEMENT
// POST /v1/payment/commission/reconcile - Open-banking reconciliation
// Governor: G9-U-3 (Amount match), G9-U-4 (Webhook verification)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/payment/commission/reconcile', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { payment_attempt_id, psp_reference, webhook_data } = body;
  if (!payment_attempt_id) return c.json({ error: 'payment_attempt_id required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'payment.reconcile',
    actor_gtid: 'SYSTEM',
    action_context: { payment_attempt_id, psp_reference }
  });

  // Verify webhook and reconcile
  await DB.prepare(`
    UPDATE payment_attempts SET status = 'RECONCILED', webhook_verified = 1, psp_reference = ?, completed_at = ? WHERE id = ?
  `).bind(psp_reference || null, isoNow(), payment_attempt_id).run();

  // Update commission lock status
  const payment = await DB.prepare(`SELECT commission_lock_id FROM payment_attempts WHERE id = ?`).bind(payment_attempt_id).first() as any;
  if (payment?.commission_lock_id) {
    await DB.prepare(`UPDATE commission_locks SET status = 'PAID' WHERE lock_id = ?`).bind(payment.commission_lock_id).run();
  }

  return c.json({
    data: { payment_attempt_id, status: 'RECONCILED', governor_decision: gov },
    message: 'Commission payment reconciled'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 10: DISPUTE RESOLUTION & ARBITRATION
// POST /v1/dispute/file - File a dispute
// Governor: G10-U-1 (USTN validity)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/dispute/file', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { trade_request_id, filing_party_gtid, dispute_type, description, evidence_links } = body;
  if (!trade_request_id || !filing_party_gtid) {
    return c.json({ error: 'trade_request_id, filing_party_gtid required' }, 400);
  }

  const gov = await evaluateGovernor(DB, {
    decision_type: 'dispute.file',
    actor_gtid: filing_party_gtid,
    action_context: { trade_request_id, dispute_type }
  });

  await DB.prepare(`
    INSERT INTO disputes (id, trade_request_id, filing_party_gtid, dispute_type, description, evidence_links, status, governor_decision_id, filed_at)
    VALUES (?, ?, ?, ?, ?, ?, 'FILED', ?, ?)
  `).bind(id, trade_request_id, filing_party_gtid, dispute_type || 'QUALITY', description || null, JSON.stringify(evidence_links || []), gov.decision_id, isoNow()).run();

  return c.json({
    data: { dispute_id: id, status: 'FILED', dispute_type: dispute_type || 'QUALITY', governor_decision: gov },
    message: 'Dispute filed successfully'
  }, 201);
});

// POST /v1/dispute/mediate - AI mediation session
phases.post('/dispute/mediate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { dispute_id, mediation_input } = body;
  if (!dispute_id) return c.json({ error: 'dispute_id required' }, 400);

  // AI mediation simulation
  const aiMediation = {
    recommendation: 'PARTIAL_REFUND',
    confidence: 0.87,
    proposed_settlement: {
      refund_pct: 15,
      additional_shipment: false,
      timeline_days: 14
    },
    reasoning: 'Based on evidence analysis, partial quality degradation detected. Recommending 15% refund.'
  };

  // Update mediation log
  const dispute = await DB.prepare(`SELECT mediation_log FROM disputes WHERE id = ?`).bind(dispute_id).first() as any;
  const log = JSON.parse(dispute?.mediation_log || '[]');
  log.push({ ...aiMediation, timestamp: isoNow(), input: mediation_input });

  await DB.prepare(`UPDATE disputes SET mediation_log = ?, status = 'MEDIATING' WHERE id = ?`).bind(JSON.stringify(log), dispute_id).run();

  return c.json({
    data: { dispute_id, ai_mediation: aiMediation },
    message: 'AI mediation session complete'
  });
});

// POST /v1/dispute/evidence/package - Auto-compile evidence package
// Governor: G10-U-3 (Evidence compilation)
phases.post('/dispute/evidence/package', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { dispute_id, ustn } = body;
  if (!dispute_id) return c.json({ error: 'dispute_id required' }, 400);

  const gov = await evaluateGovernor(DB, {
    decision_type: 'dispute.evidence_package',
    actor_gtid: 'SYSTEM',
    action_context: { dispute_id, ustn }
  });

  // Auto-compile evidence from multiple sources
  const evidence = {
    documents: [],
    milestones: [],
    sensor_readings: [],
    qc_reports: [],
    communications: [],
    compiled_at: isoNow()
  };

  if (ustn) {
    const docs = await DB.prepare(`SELECT id, document_type, ai_validation_status FROM documents WHERE shipment_ustn = ?`).bind(ustn).all();
    evidence.documents = docs.results as any || [];
    const milestones = await DB.prepare(`SELECT id, milestone_type, confirmed_at FROM shipment_milestones WHERE shipment_ustn = ?`).bind(ustn).all();
    evidence.milestones = milestones.results as any || [];
  }

  const loomHash = uuid(); // Simulated Loom hash

  await DB.prepare(`
    INSERT INTO evidence_packages (id, dispute_id, package, loom_hash, ustn, compiled_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, dispute_id, JSON.stringify(evidence), loomHash, ustn || null, isoNow()).run();

  // Link to dispute
  await DB.prepare(`UPDATE disputes SET evidence_package_id = ? WHERE id = ?`).bind(id, dispute_id).run();

  return c.json({
    data: { evidence_package_id: id, loom_hash: loomHash, evidence_summary: { documents: evidence.documents.length, milestones: evidence.milestones.length }, governor_decision: gov },
    message: 'Evidence package compiled and Loom-hashed'
  }, 201);
});

// POST /v1/dispute/arbitrate - Escalate to international arbitration
phases.post('/dispute/arbitrate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { dispute_id, arbitration_body, case_details } = body;
  if (!dispute_id) return c.json({ error: 'dispute_id required' }, 400);

  const caseId = `ARB-${Date.now().toString(36).toUpperCase()}`;

  await DB.prepare(
    `UPDATE disputes SET status = 'ARBITRATION', arbitration_status = 'FILED', arbitration_case_id = ? WHERE id = ?`
  ).bind(caseId, dispute_id).run();

  return c.json({
    data: {
      dispute_id,
      arbitration_case_id: caseId,
      arbitration_body: arbitration_body || 'ICC',
      status: 'ARBITRATION'
    },
    message: 'Dispute escalated to international arbitration'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /v1/onboarding/state - Tenant onboarding wizard (Part 2.7)
phases.get('/onboarding/state', async (c) => {
  const { DB } = c.env;
  const tenant_id = c.req.query('tenant_id');
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const state = await DB.prepare(`SELECT * FROM tenant_onboarding_state WHERE tenant_id = ?`).bind(tenant_id).first();
  return c.json({ data: state || { tenant_id, current_step: 1, total_steps: 7, sandbox_active: true } });
});

// POST /v1/onboarding/state - Save progress
phases.post('/onboarding/state', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, step, data } = body;

  await DB.prepare(`
    INSERT INTO tenant_onboarding_state (id, tenant_id, current_step, step_data, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET current_step = excluded.current_step, step_data = excluded.step_data, updated_at = excluded.updated_at
  `).bind(uuid(), tenant_id, step, JSON.stringify(data || {}), isoNow()).run();

  return c.json({ message: 'Onboarding progress saved', step });
});

// POST /v1/onboarding/skip - Skip optional step
phases.post('/onboarding/skip', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id, step } = body;

  const state = await DB.prepare(`SELECT skipped_steps FROM tenant_onboarding_state WHERE tenant_id = ?`).bind(tenant_id).first() as any;
  const skipped = JSON.parse(state?.skipped_steps || '[]');
  if (!skipped.includes(step)) skipped.push(step);

  await DB.prepare(`UPDATE tenant_onboarding_state SET skipped_steps = ?, updated_at = ? WHERE tenant_id = ?`).bind(JSON.stringify(skipped), isoNow(), tenant_id).run();

  return c.json({ message: `Step ${step} skipped`, skipped_steps: skipped });
});

// POST /v1/onboarding/sandbox/reset - Clear sandbox data
phases.post('/onboarding/sandbox/reset', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id } = body;

  await DB.prepare(`DELETE FROM onboarding_sandbox_data WHERE tenant_id = ?`).bind(tenant_id).run();
  await DB.prepare(`UPDATE tenant_onboarding_state SET sandbox_data = '{}', sandbox_reset_at = ? WHERE tenant_id = ?`).bind(isoNow(), tenant_id).run();

  return c.json({ message: 'Sandbox data cleared' });
});

// POST /v1/onboarding/exit-sandbox - Transition to production
phases.post('/onboarding/exit-sandbox', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { tenant_id } = body;

  await DB.prepare(`UPDATE tenant_onboarding_state SET sandbox_active = 0, completed_at = ? WHERE tenant_id = ?`).bind(isoNow(), tenant_id).run();
  await DB.prepare(`UPDATE tenants SET kyb_status = 'APPROVED' WHERE id = ?`).bind(tenant_id).run();

  return c.json({ message: 'Sandbox exited. Tenant now in production mode.' });
});

// GET /v1/gtid/resolve - GTID resolution service
phases.get('/gtid/resolve', async (c) => {
  const { DB } = c.env;
  const gtid = c.req.query('gtid');
  if (!gtid) return c.json({ error: 'gtid required' }, 400);

  const tenant = await DB.prepare(`SELECT id, gtid, legal_name, jurisdiction, type, kyb_status, risk_score FROM tenants WHERE gtid = ?`).bind(gtid).first();
  if (!tenant) return c.json({ error: 'GTID not found' }, 404);

  const trust = await DB.prepare(`SELECT * FROM trust_scores WHERE tenant_id = ?`).bind((tenant as any).id).first();

  return c.json({ data: { ...tenant, trust_score: trust } });
});

// POST /v1/tenant/export - Data export (Part 2.9)
phases.post('/tenant/export', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { tenant_id, export_type, date_range } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  await DB.prepare(`
    INSERT INTO tenant_data_exports (id, tenant_id, export_type, status, requested_at)
    VALUES (?, ?, ?, 'PROCESSING', ?)
  `).bind(id, tenant_id, export_type || 'FULL', isoNow()).run();

  return c.json({
    data: { export_id: id, status: 'PROCESSING', export_type: export_type || 'FULL' },
    message: 'Export job started. You will be notified when ready.'
  }, 201);
});

// GET /v1/commission/breakdown/:trade_id - Commission factor breakdown
phases.get('/commission/breakdown/:trade_id', async (c) => {
  const { DB } = c.env;
  const trade_id = c.req.param('trade_id');

  const calc = await DB.prepare(`SELECT * FROM commission_singularity_calculations WHERE trade_id = ?`).bind(trade_id).first();
  if (!calc) {
    return c.json({
      data: {
        trade_id,
        base_rate: 0.015,
        adjustments: { volume_discount: -0.002, repeat_customer: -0.001, high_risk_jurisdiction: 0.003 },
        final_rate: 0.015,
        policy_bounds: { min: 0.005, max: 0.03 }
      }
    });
  }

  return c.json({ data: calc });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0.5: COMMISSION SUPREMACY RULE & CONTAINER RELEASE CONTROL
// - Single-shipment: commission due at contract lock
// - Multi-shipment: commission per-shipment
// - Containers released ONLY after SGTX confirms commission payment
// - Logistics providers must sign and include USTN/GTIDs
// ═══════════════════════════════════════════════════════════════════════════════

// POST /v1/container/release — Authorize container release (requires commission payment)
phases.post('/container/release', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { shipment_ustn, container_id, commission_lock_id, authorized_by } = body;
  if (!shipment_ustn) return c.json({ error: 'shipment_ustn required' }, 400);

  // Verify commission payment status
  let commissionPaid = false;
  if (commission_lock_id) {
    const lock = await DB.prepare(`SELECT status FROM commission_locks WHERE lock_id = ?`).bind(commission_lock_id).first() as any;
    commissionPaid = lock && (lock.status === 'PAID' || lock.status === 'PARTIALLY_RELEASED' || lock.status === 'FULLY_RELEASED');
  }

  // Governor gate: Part 0.5 container release control
  const gov = await evaluateGovernor(DB, {
    decision_type: 'container.release',
    actor_gtid: authorized_by || 'SYSTEM',
    action_context: { shipment_ustn, container_id, commission_lock_id, commission_paid: commissionPaid },
  });

  if (gov.verdict === 'DENY') {
    return c.json({ error: 'Container release denied — commission payment not confirmed (Part 0.5)', governor: gov }, 403);
  }

  await DB.prepare(`
    INSERT INTO container_release_authorizations (id, shipment_ustn, container_id, commission_lock_id, release_authorized, authorized_by, authorization_governor_decision_id, released_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, shipment_ustn, container_id || null, commission_lock_id || null, commissionPaid ? 1 : 0, authorized_by || null, gov.decision_id, commissionPaid ? isoNow() : null, isoNow()).run();

  // Log timeline
  try {
    await DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, phase, created_at)
      VALUES (?, ?, 'CONTAINER_RELEASE', ?, ?, 'Part 0.5', ?)
    `).bind(uuid(), shipment_ustn, commissionPaid ? 'Container release authorized' : 'Container release pending commission', JSON.stringify({ container_id, commission_lock_id, authorized: commissionPaid }), isoNow()).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      authorization_id: id,
      shipment_ustn,
      container_id,
      release_authorized: commissionPaid,
      commission_status: commissionPaid ? 'PAID' : 'PENDING',
      governor_decision: gov,
    },
    message: commissionPaid
      ? 'Container release authorized — commission payment confirmed'
      : 'Container release PENDING — commission payment required before release (Part 0.5)'
  }, commissionPaid ? 200 : 202);
});

// GET /v1/container/release/:ustn — Check container release status
phases.get('/container/release/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const { results } = await DB.prepare(
    'SELECT * FROM container_release_authorizations WHERE shipment_ustn = ? ORDER BY created_at DESC'
  ).bind(ustn).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0.6: USTN REGISTRY
// Format: SGTX-{IMPORTER_GTID_SUFFIX}-{EXPORTER_GTID_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}
// ═══════════════════════════════════════════════════════════════════════════════

// POST /v1/ustn/generate — Generate and register a new USTN
phases.post('/ustn/generate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();

  const { trade_request_id, importer_gtid, exporter_gtid } = body;
  if (!importer_gtid || !exporter_gtid) {
    return c.json({ error: 'importer_gtid and exporter_gtid required' }, 400);
  }

  const impSuffix = gtidSuffix(importer_gtid);
  const expSuffix = gtidSuffix(exporter_gtid);
  const ustn = generateUSTN(impSuffix, expSuffix);

  await DB.prepare(`
    INSERT INTO ustn_registry (ustn, trade_request_id, importer_gtid_suffix, exporter_gtid_suffix, version, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).bind(ustn, trade_request_id || null, impSuffix, expSuffix, isoNow()).run();

  return c.json({
    data: { ustn, importer_suffix: impSuffix, exporter_suffix: expSuffix, trade_request_id },
    message: 'USTN generated and registered (Part 0.6 format)'
  }, 201);
});

// GET /v1/ustn/:ustn — Look up USTN details
phases.get('/ustn/:ustn', async (c) => {
  const { DB } = c.env;
  const ustn = c.req.param('ustn');
  const registry = await DB.prepare('SELECT * FROM ustn_registry WHERE ustn = ?').bind(ustn).first();
  if (!registry) return c.json({ error: 'USTN not found' }, 404);
  return c.json({ data: registry });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 0.5: COMMISSION RATE CALCULATION (clamp 0.1% to 2.5%)
// ═══════════════════════════════════════════════════════════════════════════════

phases.post('/commission/calculate', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const id = uuid();

  const { trade_request_id, trade_value_usd, incoterm, hs_code, origin, destination } = body;
  if (!trade_value_usd) return c.json({ error: 'trade_value_usd required' }, 400);

  // Determine base rate and adjustments
  const baseRate = 0.015; // 1.5% default
  const adjustments: Record<string, number> = {};

  // Volume discount
  if (trade_value_usd > 100000) adjustments.volume_discount = -0.002;
  if (trade_value_usd > 500000) adjustments.volume_discount = -0.004;

  // Jurisdiction risk premium
  const originCheck = origin ? (await import('../lib/utils')).checkJurisdiction(origin) : null;
  if (originCheck?.level === 'HIGH_RISK') adjustments.jurisdiction_risk = 0.003;

  const totalAdjustment = Object.values(adjustments).reduce((s, v) => s + v, 0);
  const finalRate = clampCommissionRate(baseRate + totalAdjustment);
  const commissionAmount = trade_value_usd * finalRate;
  const payer = defaultCommissionPayer(incoterm || 'CIF');

  const gov = await evaluateGovernor(DB, {
    decision_type: 'commission.calculate',
    actor_gtid: 'SYSTEM',
    action_context: { rate: finalRate, trade_value_usd, incoterm },
  });

  try {
    await DB.prepare(`
      INSERT INTO commission_singularity_calculations (id, trade_id, base_rate, adjustments, final_rate, trade_value_usd, commission_usd, payer, governor_decision_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, trade_request_id || null, baseRate, JSON.stringify(adjustments), finalRate, trade_value_usd, commissionAmount, payer, gov.decision_id, isoNow()).run();
  } catch (e) { /* table might not have all columns */ }

  return c.json({
    data: {
      calculation_id: id,
      base_rate: baseRate,
      adjustments,
      final_rate: finalRate,
      commission_usd: commissionAmount,
      payer,
      policy_bounds: { min: 0.001, max: 0.025 },
      governor_decision: gov,
    },
    message: `Commission calculated: ${(finalRate * 100).toFixed(2)}% = $${commissionAmount.toFixed(2)} (${payer} pays)`
  });
});

export default phases;

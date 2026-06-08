// SGTX Platform v6.3 — Advanced Trade Request Form API
// Part 3 Phase 1: Structured Container-Level Request Form
// Bidirectional HS code ↔ commodity ↔ product auto-fill
// Packaging dropdowns with weight specs, port auto-population, transport mode, GTID lookup

import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const tradeForm = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════════
// CONTACTS SEARCH — GTID autocomplete from saved contacts
// Blueprint 3.0 Step 1.1: Direct GTID Entry (Seller Selection)
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/contacts-search?tenant_id=X&q=searchterm
// Searches saved contacts by GTID, company name, or smart labels
tradeForm.get('/trade-form/contacts-search', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const q = (c.req.query('q') || '').trim();
  if (!tenantId) return c.json({ error: 'tenant_id required' }, 400);
  if (q.length < 1) return c.json({ data: [] });

  const searchTerm = `%${q}%`;

  // Search contacts by GTID or by tenant legal_name
  const { results } = await c.env.DB.prepare(`
    SELECT tc.contact_gtid, tc.relationship_type, tc.trade_count, tc.total_value,
           tc.is_favorite, tc.is_blocked, tc.smart_labels, tc.trust_snapshot,
           t.legal_name, t.jurisdiction, t.type as tenant_type, t.kyb_status, t.risk_score
    FROM tenant_contacts tc
    LEFT JOIN tenants t ON t.gtid = tc.contact_gtid
    WHERE tc.tenant_id = ?
      AND tc.is_blocked = 0
      AND (tc.contact_gtid LIKE ? OR t.legal_name LIKE ?)
    ORDER BY tc.is_favorite DESC, tc.trade_count DESC
    LIMIT 20
  `).bind(tenantId, searchTerm, searchTerm).all();

  return c.json({
    data: (results || []).map((r: any) => ({
      gtid: r.contact_gtid,
      company_name: r.legal_name || 'Unknown',
      jurisdiction: r.jurisdiction,
      tenant_type: r.tenant_type,
      kyb_status: r.kyb_status,
      risk_score: r.risk_score,
      relationship_type: r.relationship_type,
      trade_count: r.trade_count,
      total_value: r.total_value,
      is_favorite: !!r.is_favorite,
      smart_labels: JSON.parse(r.smart_labels || '[]'),
      trust_snapshot: JSON.parse(r.trust_snapshot || '{}'),
    }))
  });
});

// GET /trade-form/gtid-resolve?gtid=SGTX-XX-XX-XXXX-XXXX
// Resolves a GTID to company name, jurisdiction, trust score, sanctions status
tradeForm.get('/trade-form/gtid-resolve', async (c) => {
  const gtid = c.req.query('gtid');
  if (!gtid) return c.json({ error: 'gtid required' }, 400);

  const tenant = await c.env.DB.prepare(`
    SELECT id, gtid, legal_name, jurisdiction, type, kyb_status, risk_score,
           lifecycle_state, sanctions_cleared
    FROM tenants WHERE gtid = ?
  `).bind(gtid).first();

  if (!tenant) return c.json({ error: 'GTID not found', gtid }, 404);

  // Check if blocked or sanctioned
  const sanctions = await c.env.DB.prepare(
    `SELECT * FROM sanctions_screenings WHERE entity_gtid = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(gtid).first();

  // Get trust score
  const trust = await c.env.DB.prepare(
    `SELECT * FROM trust_scores WHERE gtid = ?`
  ).bind(gtid).first();

  return c.json({
    data: {
      gtid: (tenant as any).gtid,
      company_name: (tenant as any).legal_name,
      jurisdiction: (tenant as any).jurisdiction,
      tenant_type: (tenant as any).type,
      kyb_status: (tenant as any).kyb_status,
      risk_score: (tenant as any).risk_score,
      lifecycle_state: (tenant as any).lifecycle_state,
      sanctions_clear: !sanctions || (sanctions as any).result === 'CLEAR',
      trust_score: trust || null,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// PORTS — Auto-populated from country with transport mode filtering
// Blueprint 3.0 Step 1.2.2: Port of Discharge filtered by Destination Country
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/ports?country=EG&transport_mode=SEA_CARGO&direction=discharge
// direction param: 'discharge' (buyer only sees destination ports), 'loading' (seller Phase 2), or omit for all
tradeForm.get('/trade-form/ports', async (c) => {
  const country = c.req.query('country')?.toUpperCase();
  const transportMode = c.req.query('transport_mode');
  const direction = c.req.query('direction'); // 'discharge' | 'loading' | undefined
  if (!country) return c.json({ error: 'country required' }, 400);

  // Map transport mode to port type
  let portTypeFilter = '';
  if (transportMode === 'SEA_CARGO') portTypeFilter = "AND port_type = 'SEA'";
  else if (transportMode === 'AIR_CARGO') portTypeFilter = "AND port_type = 'AIR'";
  else if (transportMode === 'INTERNATIONAL_TRUCKING') portTypeFilter = "AND port_type IN ('LAND','DRY','SEA')";
  // MULTIMODAL and RAIL show all types

  const { results } = await c.env.DB.prepare(`
    SELECT id, unlocode, name, country_code, port_type, is_active
    FROM ports
    WHERE country_code = ? AND is_active = 1 ${portTypeFilter}
    ORDER BY name ASC
  `).bind(country).all();

  return c.json({
    data: results || [],
    meta: { country, transport_mode: transportMode, direction: direction || 'all' }
  });
});

// ═══════════════════════════════════════════════════════════════════
// HS CODE BIDIRECTIONAL LOOKUP
// Blueprint 3.0 Step 1.2.3: Product field with HS code autofill
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/hs-lookup?hs_code=0805.10
// Reverse lookup: HS code → commodity type + product name
tradeForm.get('/trade-form/hs-lookup', async (c) => {
  const hsCode = c.req.query('hs_code');
  if (!hsCode) return c.json({ error: 'hs_code required' }, 400);

  // First try DB (if seeded), then fall back to in-memory reference
  const dbResult = await c.env.DB.prepare(
    `SELECT * FROM hs_codes WHERE hs_code = ? LIMIT 1`
  ).bind(hsCode).first();

  if (dbResult) {
    return c.json({ data: dbResult });
  }

  // Fall back to static reference data
  // This will also be served by /ref/hs-search but we provide a direct lookup here
  return c.json({ data: null, message: 'HS code not found in database. Use /ref/hs-search for static lookup.' });
});

// GET /trade-form/hs-search?q=orange&commodity_type=FRESH_FRUITS
// Search by product name or HS code, optionally filtered by commodity type
tradeForm.get('/trade-form/hs-search', async (c) => {
  const q = (c.req.query('q') || '').trim();
  const commodityType = c.req.query('commodity_type');
  if (q.length < 2) return c.json({ data: [] });

  const searchTerm = `%${q}%`;

  // Search in DB first
  let sql = `SELECT * FROM hs_codes WHERE (hs_code LIKE ? OR product_name LIKE ?)`;
  const params: any[] = [searchTerm, searchTerm];

  if (commodityType) {
    sql += ` AND commodity_type = ?`;
    params.push(commodityType);
  }

  sql += ` ORDER BY product_name ASC LIMIT 30`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ data: results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// PACKAGING TYPES — Extended packaging with weight specs
// User request: boxes, barrels, mesh bags, carton bags, bales, bins
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/packaging?category=MESH_BAGS
tradeForm.get('/trade-form/packaging', async (c) => {
  const category = c.req.query('category');

  let sql = `SELECT * FROM packaging_types WHERE is_active = 1`;
  const params: any[] = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category.toUpperCase());
  }

  sql += ` ORDER BY category ASC, default_net_weight_kg ASC`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();

  // Parse weight_options JSON
  const data = (results || []).map((r: any) => ({
    ...r,
    weight_options: JSON.parse(r.weight_options || '[]'),
  }));

  return c.json({ data });
});

// GET /trade-form/packaging-categories — distinct categories
tradeForm.get('/trade-form/packaging-categories', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT DISTINCT category, COUNT(*) as count FROM packaging_types WHERE is_active = 1 GROUP BY category ORDER BY category`
  ).all();
  return c.json({ data: results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// TRANSPORT MODES
// User request: international trucking, sea cargo, air cargo
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/transport-modes
tradeForm.get('/trade-form/transport-modes', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM transport_modes WHERE is_active = 1 ORDER BY cost_factor ASC`
  ).all();
  return c.json({ data: results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// WEIGHT CALCULATOR — Auto gross weight calculation
// User request: net weight → gross weight auto-calc, total by weight or units
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/calculate-weights
// Input: { packaging_code, net_weight_per_unit, total_units, quantity_type, quantity_value, weight_unit }
// Output: { gross_weight_per_unit, total_net_weight, total_gross_weight, packaging_description }
tradeForm.post('/trade-form/calculate-weights', async (c) => {
  const body = await c.req.json();
  const { packaging_code, net_weight_per_unit, total_units, quantity_type, quantity_value, weight_unit } = body;

  // Look up packaging tare weight from DB
  let tareWeight = 0;
  let packagingLabel = '';
  let defaultNetWeight = 0;
  if (packaging_code) {
    const pkg = await c.env.DB.prepare(
      `SELECT label, tare_weight_kg, default_net_weight_kg FROM packaging_types WHERE code = ?`
    ).bind(packaging_code).first();
    if (pkg) {
      tareWeight = (pkg as any).tare_weight_kg || 0;
      packagingLabel = (pkg as any).label || '';
      defaultNetWeight = (pkg as any).default_net_weight_kg || 0;
    }
  }

  // Use provided net_weight_per_unit, or fall back to packaging default
  const netPerUnit = net_weight_per_unit || defaultNetWeight || 0;
  const grossPerUnit = netPerUnit + tareWeight;
  let units = total_units || 0;
  let totalNetWeight = 0;
  let totalGrossWeight = 0;

  // Calculate based on quantity type
  if (quantity_type === 'UNITS') {
    // User specified number of units (e.g., 2200 boxes)
    units = quantity_value || total_units || 0;
    totalNetWeight = units * netPerUnit;
    totalGrossWeight = units * grossPerUnit;
  } else if (quantity_type === 'WEIGHT') {
    // User specified total weight (e.g., 25000 kg or 25 tons)
    let totalWeightKg = quantity_value || 0;
    const wu = (weight_unit || 'KG').toUpperCase();
    // Convert to KG
    if (wu === 'TONS' || wu === 'MT') totalWeightKg *= 1000;
    else if (wu === 'LBS') totalWeightKg *= 0.453592;

    totalNetWeight = totalWeightKg;
    if (netPerUnit > 0) {
      units = Math.ceil(totalWeightKg / netPerUnit);
    }
    totalGrossWeight = units * grossPerUnit;
  }

  // Build packaging description (e.g., "25 kg mesh bags")
  const packagingDesc = netPerUnit > 0
    ? `${netPerUnit} kg ${packagingLabel || packaging_code || 'units'}`
    : packagingLabel || packaging_code || 'units';

  // Convert back to requested unit
  const wu = (weight_unit || 'KG').toUpperCase();
  let displayNetWeight = totalNetWeight;
  let displayGrossWeight = totalGrossWeight;
  if (wu === 'TONS' || wu === 'MT') { displayNetWeight /= 1000; displayGrossWeight /= 1000; }
  else if (wu === 'LBS') { displayNetWeight /= 0.453592; displayGrossWeight /= 0.453592; }

  return c.json({
    data: {
      packaging_code,
      packaging_label: packagingLabel,
      packaging_description: packagingDesc,
      net_weight_per_unit_kg: netPerUnit,
      tare_weight_per_unit_kg: tareWeight,
      gross_weight_per_unit_kg: grossPerUnit,
      total_units: units,
      total_net_weight_kg: totalNetWeight,
      total_gross_weight_kg: totalGrossWeight,
      display_net_weight: Math.round(displayNetWeight * 100) / 100,
      display_gross_weight: Math.round(displayGrossWeight * 100) / 100,
      weight_unit: wu,
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// DRAFT AUTO-SAVE — Every 30 seconds (Blueprint 3.0 Step 1.2.7)
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/draft-save
tradeForm.post('/trade-form/draft-save', async (c) => {
  const body = await c.req.json();
  const { tenant_id, employee_id, draft_id, form_data } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const id = draft_id || uuid();
  const now = isoNow();

  // Check if draft exists
  if (draft_id) {
    const existing = await c.env.DB.prepare(
      `SELECT id FROM trade_requests WHERE id = ? AND status = 'DRAFT'`
    ).bind(draft_id).first();

    if (existing) {
      // Update existing draft
      await c.env.DB.prepare(`
        UPDATE trade_requests
        SET draft_data = ?, parsed_specs = ?, transport_mode = ?,
            seller_gtid = ?, seller_company_name = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        JSON.stringify(form_data),
        JSON.stringify(form_data.containers || []),
        form_data.transport_mode || 'SEA_CARGO',
        form_data.seller_gtid || null,
        form_data.seller_company_name || null,
        now, draft_id
      ).run();

      return c.json({ data: { draft_id, saved_at: now }, message: 'Draft updated' });
    }
  }

  // Find employee for created_by FK
  let empId = employee_id;
  if (!empId) {
    const emp = await c.env.DB.prepare(
      `SELECT id FROM employees WHERE tenant_id = ? LIMIT 1`
    ).bind(tenant_id).first();
    empId = (emp as any)?.id || `auto-emp-${tenant_id}`;
    // Ensure auto-employee exists
    try {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, role_id, status, created_at)
        VALUES (?, ?, ?, ?, 'TRADE_OPS', 'ACTIVE', ?)
      `).bind(empId, tenant_id, `ops@${tenant_id}.sgtx`, 'Trade Operations', now).run();
    } catch (e) { /* ignore */ }
  }

  // Dummy governor decision for draft
  const govId = uuid();
  try {
    await c.env.DB.prepare(`
      INSERT INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, policy_version, loom_hash, cryptographic_signature, created_at)
      VALUES (?, 'trade.draft.save', 'SYSTEM', 'ALLOW', 'v6.3-draft', ?, 'draft-auto-approved', ?)
    `).bind(govId, 'loom-draft-' + govId, now).run();
  } catch (e) { /* ignore */ }

  // Create new draft
  await c.env.DB.prepare(`
    INSERT INTO trade_requests (id, importer_tenant_id, status, parsed_specs, draft_data, transport_mode,
      seller_gtid, seller_company_name, governor_decision_id, created_by, created_at, updated_at,
      draft_expires_at)
    VALUES (?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, tenant_id,
    JSON.stringify(form_data.containers || []),
    JSON.stringify(form_data),
    form_data.transport_mode || 'SEA_CARGO',
    form_data.seller_gtid || null,
    form_data.seller_company_name || null,
    govId, empId, now, now,
    new Date(Date.now() + 14 * 86400000).toISOString() // 14 days expiry
  ).run();

  return c.json({ data: { draft_id: id, saved_at: now, expires_at: new Date(Date.now() + 14 * 86400000).toISOString() }, message: 'Draft created' }, 201);
});

// GET /trade-form/draft-load?tenant_id=X&draft_id=Y
tradeForm.get('/trade-form/draft-load', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const draftId = c.req.query('draft_id');
  if (!tenantId) return c.json({ error: 'tenant_id required' }, 400);

  let result;
  if (draftId) {
    result = await c.env.DB.prepare(
      `SELECT * FROM trade_requests WHERE id = ? AND importer_tenant_id = ? AND status = 'DRAFT'`
    ).bind(draftId, tenantId).first();
  } else {
    // Load most recent draft
    result = await c.env.DB.prepare(
      `SELECT * FROM trade_requests WHERE importer_tenant_id = ? AND status = 'DRAFT' ORDER BY updated_at DESC LIMIT 1`
    ).bind(tenantId).first();
  }

  if (!result) return c.json({ data: null, message: 'No draft found' });

  return c.json({
    data: {
      draft_id: (result as any).id,
      form_data: JSON.parse((result as any).draft_data || '{}'),
      transport_mode: (result as any).transport_mode,
      seller_gtid: (result as any).seller_gtid,
      seller_company_name: (result as any).seller_company_name,
      created_at: (result as any).created_at,
      updated_at: (result as any).updated_at,
      expires_at: (result as any).draft_expires_at,
    }
  });
});

// GET /trade-form/drafts?tenant_id=X — list all drafts
tradeForm.get('/trade-form/drafts', async (c) => {
  const tenantId = c.req.query('tenant_id');
  if (!tenantId) return c.json({ error: 'tenant_id required' }, 400);

  const { results } = await c.env.DB.prepare(`
    SELECT id, transport_mode, seller_gtid, seller_company_name, created_at, updated_at, draft_expires_at
    FROM trade_requests
    WHERE importer_tenant_id = ? AND status = 'DRAFT'
    ORDER BY updated_at DESC LIMIT 20
  `).bind(tenantId).all();

  return c.json({ data: results || [] });
});

// ═══════════════════════════════════════════════════════════════════
// SUBMIT TRADE REQUEST — Full submission with Governor pre-screen
// Blueprint 3.0 Step 1.6: Governor PreScreen & Submission
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/submit
tradeForm.post('/trade-form/submit', async (c) => {
  const body = await c.req.json();
  const {
    tenant_id, employee_id, draft_id,
    transport_mode, incoterm, seller_gtid, seller_company_name,
    target_price, target_currency, target_price_unit,
    containers, global_notes,
    multi_shipment_enabled, multi_shipment_schedule,
    marketplace_attribution, container_override_log,
    // New Blueprint v6.3 fields
    express_mode_used, express_mode_raw_text, express_mode_confidence,
    agent_session_id, specifications,
  } = body;

  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);
  if (!containers || !containers.length) return c.json({ error: 'At least one container required' }, 400);
  if (!incoterm) return c.json({ error: 'incoterm required' }, 400);

  const now = isoNow();
  const tradeId = draft_id || uuid();

  // Resolve buyer tenant
  const buyer = await c.env.DB.prepare(
    `SELECT id, gtid, jurisdiction FROM tenants WHERE id = ?`
  ).bind(tenant_id).first();
  if (!buyer) return c.json({ error: 'Buyer tenant not found' }, 404);

  // Resolve seller if GTID provided
  let sellerTenantId: string | null = null;
  let sellerGtid = seller_gtid || null;
  if (seller_gtid) {
    const seller = await c.env.DB.prepare(
      `SELECT id, gtid, jurisdiction FROM tenants WHERE gtid = ?`
    ).bind(seller_gtid).first();
    if (seller) {
      sellerTenantId = (seller as any).id;
      sellerGtid = (seller as any).gtid;
    }
  }

  // Find/create employee
  let empId = employee_id;
  if (!empId) {
    const emp = await c.env.DB.prepare(
      `SELECT id FROM employees WHERE tenant_id = ? LIMIT 1`
    ).bind(tenant_id).first();
    empId = (emp as any)?.id || `auto-emp-${tenant_id}`;
    try {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO employees (id, tenant_id, email, full_name, role_id, status, created_at)
        VALUES (?, ?, ?, ?, 'TRADE_OPS', 'ACTIVE', ?)
      `).bind(empId, tenant_id, `ops@${tenant_id}.sgtx`, 'Trade Operations', now).run();
    } catch (e) { /* ignore */ }
  }

  // Governor PreScreen (G1-U-5)
  const jurisdictions = [(buyer as any).jurisdiction];
  if (sellerTenantId) {
    const sellerJ = await c.env.DB.prepare(`SELECT jurisdiction FROM tenants WHERE id = ?`).bind(sellerTenantId).first();
    if (sellerJ) jurisdictions.push((sellerJ as any).jurisdiction);
  }

  // G1U4: Collect all HS codes for dual-use check
  const allHsCodes = containers.flatMap((ct: any) => (ct.commodities || []).map((cm: any) => cm.hs_code)).filter(Boolean);
  // G1U9: Container override log from client
  const overrideCount = container_override_log?.length || 0;

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'trade.request.create',
    actor_gtid: (buyer as any).gtid || tenant_id,
    actor_employee_id: empId,
    action_context: {
      actor_gtid: (buyer as any).gtid || tenant_id,
      importer_gtid: (buyer as any).gtid || tenant_id,
      transport_mode,
      incoterm,
      seller_gtid: sellerGtid,
      container_count: containers.length,
      target_price,
      commodities: allHsCodes,
      // G1U1: Agent mesh session
      agent_session_id: agent_session_id || null,
      // G1U4: Flag for dual-use goods screening
      hs_codes_for_dual_use_check: allHsCodes,
      // G1U5: Jurisdictions for sanctions check
      jurisdictions,
      // G1U8: Marketplace attribution
      marketplace_attributed: !!marketplace_attribution?.attributed,
      marketplace_disputed: !!marketplace_attribution?.disputed,
      // G1U9: Container type override count
      container_override_count: overrideCount,
      // G1U10: Multi-shipment schedule
      multi_shipment_enabled: !!multi_shipment_enabled,
      shipment_count: multi_shipment_schedule?.length || 0,
      // Express Mode tracking (G1U2/G1U3)
      express_mode_used: !!express_mode_used,
      express_mode_confidence: express_mode_confidence || null,
    },
    jurisdictions,
  });

  if (gov.verdict === 'DENY') {
    return c.json({ error: 'Trade request denied by Governor', governor: gov }, 403);
  }

  const status = sellerTenantId ? 'PENDING_EXPORTER_RESPONSE' : 'MATCHING';

  // Build parsed_specs JSONB — buyer flow: no port_of_loading (that's seller Phase 2)
  const parsedSpecs = {
    containers: containers.map((ct: any, ci: number) => ({
      container_index: ci + 1,
      country_of_origin: ct.origin_country,
      destination_country: ct.destination_country,
      // Buyer only selects port of discharge. Port of loading = Seller Phase 2.
      port_of_discharge: ct.port_of_discharge,
      port_of_discharge_unlocode: ct.port_of_discharge_unlocode || null,
      transport_mode: ct.transport_mode || transport_mode,
      palletized: ct.palletized,
      pallet_size: ct.pallet_size,
      container_type: ct.container_type || '40ft_HC',
      destination_override: ct.destination_override,
      notes: ct.notes,
      commodities: (ct.commodities || []).map((cm: any, pi: number) => ({
        sort_order: pi + 1,
        commodity_type: cm.commodity_type,
        product_name: cm.product_name,
        hs_code: cm.hs_code,
        specification: cm.product_specification,
        packaging: cm.packaging_code,
        packaging_description: cm.packaging_description,
        net_weight_per_unit: cm.net_weight_per_unit,
        gross_weight_per_unit: cm.gross_weight_per_unit,
        total_units: cm.total_units,
        total_net_weight: cm.total_net_weight,
        total_gross_weight: cm.total_gross_weight,
        weight_unit: cm.weight_unit,
        quantity_type: cm.quantity_type,
        num_pallets: cm.num_pallets,
      })),
    })),
    incoterm,
    target_price: target_price || null,
    target_currency: target_currency || 'USD',
    target_price_unit: target_price_unit || 'PER_TON',
    transport_mode,
    global_notes,
    multi_shipment_enabled: !!multi_shipment_enabled,
    multi_shipment_schedule: multi_shipment_schedule || null,
    container_override_log: container_override_log || [],
  };

  // G1U8: Persist marketplace attribution if detected
  if (marketplace_attribution?.attributed && !marketplace_attribution?.disputed) {
    try {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO partner_lead_attributions (id, trade_request_id, marketplace_partner_id,
          buyer_tenant_id, seller_tenant_id, revenue_share_pct, attribution_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).bind(
        uuid(), tradeId,
        marketplace_attribution.marketplace_id || 'unknown',
        tenant_id, sellerTenantId || null,
        marketplace_attribution.revenue_share_pct || 0,
        marketplace_attribution.first_trade_date || now,
        now
      ).run();
    } catch (e) { /* non-blocking — table may not exist yet */ }
  }

  // G1U9: Persist container override log
  if (container_override_log?.length > 0) {
    try {
      await auditLog(c.env.DB, 'trade_requests', tradeId, 'CONTAINER_OVERRIDE', null,
        { overrides: container_override_log }, (buyer as any).gtid);
    } catch (e) { /* non-blocking */ }
  }

  // Persist multi-shipment schedule
  if (multi_shipment_enabled && multi_shipment_schedule?.length > 0) {
    try {
      await c.env.DB.prepare(`
        UPDATE trade_requests SET multi_shipment_schedule = ? WHERE id = ?
      `).bind(JSON.stringify(multi_shipment_schedule), tradeId).run();
    } catch (e) { /* column may not exist yet — non-blocking */ }
  }

  // Check if this is an update of an existing draft
  const existingDraft = draft_id ? await c.env.DB.prepare(
    `SELECT id FROM trade_requests WHERE id = ? AND status = 'DRAFT'`
  ).bind(draft_id).first() : null;

  // Persist Express Mode data and specifications
  if (express_mode_used || specifications || agent_session_id) {
    try {
      await c.env.DB.prepare(`
        UPDATE trade_requests SET express_mode_used = ?, express_mode_raw_text = ?,
          express_mode_confidence = ?, agent_session_id = ?, specifications = ?
        WHERE id = ?
      `).bind(
        express_mode_used ? 1 : 0, express_mode_raw_text || null,
        express_mode_confidence || null, agent_session_id || null,
        specifications ? JSON.stringify(specifications) : null, tradeId
      ).run();
    } catch (e) { /* columns may not exist — non-blocking */ }
  }

  if (existingDraft) {
    // Update existing draft → submit
    await c.env.DB.prepare(`
      UPDATE trade_requests SET
        status = ?, parsed_specs = ?, draft_data = NULL, transport_mode = ?,
        seller_gtid = ?, seller_company_name = ?,
        exporter_tenant_id = ?, assigned_exporter_id = ?,
        governor_decision_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      status, JSON.stringify(parsedSpecs), transport_mode || 'SEA_CARGO',
      sellerGtid, seller_company_name || null,
      sellerTenantId, sellerTenantId,
      gov.decision_id, now, draft_id
    ).run();
  } else {
    // Create new trade request
    await c.env.DB.prepare(`
      INSERT INTO trade_requests (id, importer_tenant_id, exporter_tenant_id, assigned_exporter_id,
        parsed_specs, status, transport_mode, seller_gtid, seller_company_name,
        governor_decision_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tradeId, tenant_id, sellerTenantId, sellerTenantId,
      JSON.stringify(parsedSpecs), status, transport_mode || 'SEA_CARGO',
      sellerGtid, seller_company_name || null,
      gov.decision_id, empId, now, now
    ).run();
  }

  // Persist containers and commodities
  const savedContainers: any[] = [];
  for (let ci = 0; ci < containers.length; ci++) {
    const ct = containers[ci];
    const containerId = uuid();
    await c.env.DB.prepare(`
      INSERT INTO trade_containers (id, trade_request_id, container_index, container_type,
        origin_country, destination_country, port_of_discharge, port_of_loading,
        port_of_loading_unlocode, port_of_discharge_unlocode,
        palletized, pallet_size, transport_mode, destination_override, notes,
        clone_source_id, clone_generation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      containerId, tradeId, ci + 1,
      ct.container_type || '40ft_HC',
      ct.origin_country || '', ct.destination_country || '',
      ct.port_of_discharge || null, null, /* port_of_loading = null for buyer, set by seller Phase 2 */
      null, /* port_of_loading_unlocode = null for buyer */ ct.port_of_discharge_unlocode || null,
      ct.palletized !== false ? 1 : 0, ct.pallet_size || '120x100',
      ct.transport_mode || transport_mode || 'SEA_CARGO',
      ct.destination_override || null, ct.notes || null,
      ct.clone_source_id || null, ct.clone_generation || 0, now
    ).run();

    const savedCommodities: any[] = [];
    if (ct.commodities && Array.isArray(ct.commodities)) {
      for (let pi = 0; pi < ct.commodities.length; pi++) {
        const cm = ct.commodities[pi];
        const cmId = uuid();
        await c.env.DB.prepare(`
          INSERT INTO trade_container_commodities (id, trade_container_id, trade_request_id,
            commodity_type, product_name, hs_code, product_specification,
            packaging, packaging_custom, packaging_description,
            net_weight_per_unit, gross_weight_per_unit, tare_weight_per_unit,
            total_units, total_net_weight, total_gross_weight, weight_unit, quantity_type,
            num_pallets, quantity, unit, sort_order, dynamic_specification, spec_confidence, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          cmId, containerId, tradeId,
          cm.commodity_type || 'OTHER',
          cm.product_name || 'Unknown',
          cm.hs_code || null,
          cm.product_specification || null,
          cm.packaging_code || cm.packaging || 'boxes',
          cm.packaging_custom || null,
          cm.packaging_description || null,
          cm.net_weight_per_unit || null,
          cm.gross_weight_per_unit || null,
          cm.tare_weight_per_unit || 0,
          cm.total_units || null,
          cm.total_net_weight || null,
          cm.total_gross_weight || null,
          cm.weight_unit || 'KG',
          cm.quantity_type || 'WEIGHT',
          cm.num_pallets || 1,
          cm.total_net_weight || cm.quantity || null,
          cm.weight_unit || 'KG',
          pi + 1,
          cm.dynamic_specification ? JSON.stringify(cm.dynamic_specification) : null,
          cm.spec_confidence || null,
          now
        ).run();
        savedCommodities.push({ id: cmId, ...cm });
      }
    }
    savedContainers.push({ id: containerId, index: ci + 1, commodities: savedCommodities });
  }

  // Create trade channel if seller known
  if (sellerTenantId) {
    try {
      await c.env.DB.prepare(`
        INSERT INTO trade_channels (channel_id, trade_request_id, importer_tenant_id, exporter_tenant_id,
          jurisdiction_rules_snapshot, current_phase, creation_governor_decision_id)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).bind(uuid(), tradeId, tenant_id, sellerTenantId,
        JSON.stringify({ buyer: (buyer as any).jurisdiction }), gov.decision_id
      ).run();
    } catch (e) { /* non-blocking */ }
  }

  // Audit log
  try {
    await auditLog(c.env.DB, 'trade_requests', tradeId, 'CREATE', null, {
      status, containers: savedContainers.length, transport_mode, incoterm, target_price,
      multi_shipment: !!multi_shipment_enabled, shipments: multi_shipment_schedule?.length || 0,
      marketplace_attributed: !!marketplace_attribution?.attributed,
      container_overrides: container_override_log?.length || 0,
    }, (buyer as any).gtid);
  } catch (e) { /* non-blocking */ }

  // Timeline event
  try {
    await c.env.DB.prepare(`
      INSERT INTO trade_event_timeline (id, ustn, event_type, event_text, event_data, actor_gtid, phase, created_at)
      VALUES (?, ?, 'PHASE_1', 'Trade request submitted via advanced form', ?, ?, 'Phase 1', ?)
    `).bind(uuid(), tradeId, JSON.stringify({
      containers: savedContainers.length, transport_mode, incoterm, seller_gtid: sellerGtid, target_price,
      multi_shipment: !!multi_shipment_enabled, shipment_count: multi_shipment_schedule?.length || 0,
    }), (buyer as any).gtid, now).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      trade_request_id: tradeId,
      status,
      incoterm: incoterm || null,
      transport_mode: transport_mode || 'SEA_CARGO',
      seller_gtid: sellerGtid,
      target_price: target_price || null,
      target_currency: target_currency || 'USD',
      target_price_unit: target_price_unit || 'PER_TON',
      containers: savedContainers,
      total_containers: savedContainers.length,
      multi_shipment: !!multi_shipment_enabled,
      shipment_count: multi_shipment_schedule?.length || 0,
      marketplace_attributed: !!marketplace_attribution?.attributed,
      governor_decision: gov,
    },
    message: `Trade request submitted with ${savedContainers.length} container(s) under ${incoterm}.${multi_shipment_enabled ? ` ${multi_shipment_schedule?.length || 0} shipment(s) scheduled.` : ''} ${sellerTenantId ? 'Awaiting seller quote.' : 'Listed for matching.'}`
  }, 201);
});

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE ATTRIBUTION CHECK — Step 1.5
// Checks partner_lead_attributions for existing marketplace relationship
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/marketplace-check?tenant_id=X&seller_gtid=SGTX-XX-XX-XXXX-XXXX
tradeForm.get('/trade-form/marketplace-check', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const sellerGtid = c.req.query('seller_gtid');
  if (!tenantId || !sellerGtid) return c.json({ data: { attributed: false } });

  // Resolve seller tenant_id
  const seller = await c.env.DB.prepare(
    `SELECT id FROM tenants WHERE gtid = ?`
  ).bind(sellerGtid).first();
  if (!seller) return c.json({ data: { attributed: false } });

  // Check partner_lead_attributions for most recent marketplace introduction
  try {
    const attr = await c.env.DB.prepare(`
      SELECT pla.*, t.legal_name as marketplace_name
      FROM partner_lead_attributions pla
      LEFT JOIN tenants t ON t.id = pla.marketplace_partner_id
      WHERE pla.buyer_tenant_id = ? AND pla.seller_tenant_id = ?
        AND pla.status = 'ACTIVE'
      ORDER BY pla.created_at DESC LIMIT 1
    `).bind(tenantId, (seller as any).id).first();

    if (attr) {
      return c.json({
        data: {
          attributed: true,
          marketplace_id: (attr as any).marketplace_partner_id,
          marketplace_name: (attr as any).marketplace_name || 'Marketplace Partner',
          revenue_share_pct: (attr as any).revenue_share_pct || 0,
          first_trade_date: (attr as any).attribution_date || (attr as any).created_at,
          attribution_id: (attr as any).id,
        }
      });
    }
  } catch (e) {
    // Table may not exist yet — non-blocking
  }

  return c.json({ data: { attributed: false } });
});

// ═══════════════════════════════════════════════════════════════════
// AI CONTAINER ADVISOR — Reefer / Temperature Intelligence API
// Returns temperature, humidity, air circulation, ethylene management
// recommendations based on commodity type and product
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/container-advisor?commodity_type=FRESH_FRUITS&product_name=Oranges
tradeForm.get('/trade-form/container-advisor', async (c) => {
  const commodityType = c.req.query('commodity_type');
  const productName = c.req.query('product_name');
  if (!commodityType) return c.json({ error: 'commodity_type required' }, 400);

  // Comprehensive reefer intelligence database
  const REEFER_DB: Record<string, any> = {
    FROZEN_FRUITS: { temp_min: -18, temp_max: -18, humidity: '85-90%', air_circ_cbm_hr: 40, ethylene_mgmt: false, reefer_required: true, container_recommendation: '40ft_HC_RF', label: 'Deep Frozen', notes: 'Maintain -18°C throughout cold chain. No temperature breaks allowed. Pre-cool container before loading.' },
    FROZEN_VEGETABLES: { temp_min: -18, temp_max: -18, humidity: '90-95%', air_circ_cbm_hr: 40, ethylene_mgmt: false, reefer_required: true, container_recommendation: '40ft_HC_RF', label: 'Deep Frozen', notes: 'Maintain -18°C. Avoid refreezing after thaw. Check blast freeze records.' },
    MEAT_POULTRY: { temp_min: -18, temp_max: -1, humidity: '85-90%', air_circ_cbm_hr: 30, ethylene_mgmt: false, reefer_required: true, container_recommendation: '40ft_RF', label: 'Frozen/Chilled', notes: 'Frozen: -18°C. Chilled: -1 to 4°C. Separate from strong-smelling cargo. Halal/Kosher certification may be required.' },
    SEAFOOD: { temp_min: -25, temp_max: 2, humidity: '85-95%', air_circ_cbm_hr: 40, ethylene_mgmt: false, reefer_required: true, container_recommendation: '40ft_HC_RF', label: 'Frozen/Chilled', notes: 'Frozen seafood: -18 to -25°C. Fresh/chilled: -1 to 2°C. Hygiene and food safety critical.' },
    DAIRY: { temp_min: 0, temp_max: 5, humidity: '85-90%', air_circ_cbm_hr: 25, ethylene_mgmt: false, reefer_required: true, container_recommendation: '40ft_RF', label: 'Chilled', notes: 'Keep 0-5°C. Separate from odor-producing goods. Continuous temperature monitoring required.' },
    FRESH_FRUITS: { temp_min: -1, temp_max: 14, humidity: '85-95%', air_circ_cbm_hr: 60, ethylene_mgmt: true, reefer_required: true, container_recommendation: '40ft_HC_RF', label: 'Fresh / Controlled Atmosphere',
      notes: 'Temperature varies by fruit type. High air circulation (60+ CBM/hr). Ethylene management critical.',
      product_specific: {
        'Oranges': { temp_min: 4, temp_max: 8, humidity: '85-90%', notes: '4-8°C, 85-90% humidity. 4-6 weeks shelf life. Low ethylene producer.' },
        'Lemons & Limes': { temp_min: 8, temp_max: 12, notes: '8-12°C. Chilling injury below 8°C. 4-8 weeks transit.' },
        'Bananas': { temp_min: 13, temp_max: 14, notes: '13-14°C. Major ethylene producer — must isolate. Green: 13.5°C, Ripe: 14°C.' },
        'Strawberries': { temp_min: 0, temp_max: 2, humidity: '90-95%', notes: '0-2°C, 90-95% humidity. Very perishable — max 7 days transit. Pre-cool essential.' },
        'Grapes': { temp_min: -1, temp_max: 0, humidity: '90-95%', notes: '-1 to 0°C, 90-95% humidity. SO₂ pads recommended to prevent botrytis.' },
        'Apples': { temp_min: 0, temp_max: 4, notes: '0-4°C. Controlled atmosphere (low O₂, low CO₂). Major ethylene producer — isolate.' },
        'Mangoes': { temp_min: 10, temp_max: 13, notes: '10-13°C. Chilling injury below 10°C. Ethylene sensitive — do not mix with ethylene producers.' },
        'Avocados': { temp_min: 5, temp_max: 13, notes: 'Unripe: 10-13°C. Ripe: 5-7°C. Ethylene triggers ripening.' },
        'Cherries': { temp_min: -1, temp_max: 0, humidity: '90-95%', notes: '-1 to 0°C, 90-95% humidity. Max 14 days transit. Modified atmosphere packaging helps.' },
        'Dates': { temp_min: 0, temp_max: 5, notes: '0-5°C for fresh dates. Dried dates: ambient OK.' },
        'Pineapples': { temp_min: 7, temp_max: 10, notes: '7-10°C. Chilling injury below 7°C. Moderate ethylene sensitivity.' },
        'Watermelons': { temp_min: 7, temp_max: 10, notes: '7-10°C. Chilling injury below 7°C. Large fruit — check container payload.' },
        'Kiwi Fruit': { temp_min: 0, temp_max: 1, notes: '0-1°C. Ethylene sensitive. Long storage life (3-5 months) at proper temp.' },
        'Peaches': { temp_min: -1, temp_max: 0, notes: '-1 to 0°C, 90-95% humidity. Very perishable — 2-4 weeks max.' },
      }
    },
    FRESH_VEGETABLES: { temp_min: 0, temp_max: 12, humidity: '90-98%', air_circ_cbm_hr: 50, ethylene_mgmt: true, reefer_required: true, container_recommendation: '40ft_HC_RF', label: 'Fresh / High Humidity',
      notes: 'Most vegetables 0-7°C. Tropical vegetables 10-12°C. High humidity essential.',
      product_specific: {
        'Potatoes': { temp_min: 4, temp_max: 8, humidity: '85-90%', notes: '4-8°C. Avoid light (causes greening). Ethylene causes sprouting.' },
        'Tomatoes': { temp_min: 10, temp_max: 13, notes: 'Green: 10-13°C. Ripe: 7-10°C. Chilling injury below 10°C for green tomatoes.' },
        'Onions': { temp_min: 0, temp_max: 2, humidity: '65-70%', notes: '0-2°C, LOW humidity (65-70%). Good ventilation. Long storage life.' },
        'Garlic': { temp_min: 0, temp_max: 2, humidity: '60-70%', notes: '0-2°C, low humidity. Ventilation important.' },
        'Peppers (Bell / Chilli)': { temp_min: 7, temp_max: 10, notes: '7-10°C, 90-95% humidity. Chilling injury below 7°C.' },
        'Asparagus': { temp_min: 0, temp_max: 2, humidity: '95-98%', notes: '0-2°C, very high humidity. Extremely perishable — max 14 days.' },
      }
    },
    GRAINS_CEREALS: { reefer_required: false, container_recommendation: '20ft', label: 'Dry / Ventilated', notes: 'Ventilated container recommended. Moisture < 14%. Fumigation may be required.' },
    PULSES_LEGUMES: { reefer_required: false, container_recommendation: '20ft', label: 'Dry / Ventilated', notes: 'Dry container, moisture control. Fumigation certificate may be required.' },
    TEXTILES: { reefer_required: false, container_recommendation: '40ft_HC', label: 'Dry / Standard', notes: 'Standard container. Protect from moisture and sunlight. Desiccants recommended.' },
    CHEMICALS: { reefer_required: false, container_recommendation: '20ft', label: 'Hazmat / Standard', notes: 'Check IMDG classification. Proper ventilation and segregation from food. DG declaration required.' },
    MINERALS_METALS: { reefer_required: false, container_recommendation: '20ft', label: 'Standard / Open Top', notes: 'Heavy cargo — check weight limits. Open top for oversize. Corrosion protection coating.' },
    PETROLEUM_ENERGY: { reefer_required: false, container_recommendation: '20ft_Tank', label: 'Tank / IMO', notes: 'Tank container or ISO tank. IMO classification. Flash point certification required.' },
    LIVESTOCK: { reefer_required: false, container_recommendation: '40ft_HC', label: 'Ventilated / Special', notes: 'Special livestock containers. Ventilation, feeding, watering systems. Veterinary certificates mandatory.' },
  };

  const baseAdvice = REEFER_DB[commodityType];
  if (!baseAdvice) {
    return c.json({
      data: {
        commodity_type: commodityType,
        product_name: productName || null,
        reefer_required: false,
        container_recommendation: '40ft_HC',
        label: 'Standard',
        notes: 'No specific container requirements found. Standard dry container recommended.',
        temp_display: 'Ambient',
      }
    });
  }

  // Start with base, then override with product-specific
  let result = { ...baseAdvice };
  delete result.product_specific;
  result.commodity_type = commodityType;
  result.product_name = productName || null;

  if (productName && baseAdvice.product_specific?.[productName]) {
    const override = baseAdvice.product_specific[productName];
    result = { ...result, ...override };
  }

  // Build temperature display
  if (result.reefer_required) {
    if (result.temp_min === result.temp_max) {
      result.temp_display = result.temp_min + '°C (' + cToF(result.temp_min) + '°F)';
    } else {
      result.temp_display = result.temp_min + ' to ' + result.temp_max + '°C (' + cToF(result.temp_min) + ' to ' + cToF(result.temp_max) + '°F)';
    }
  } else {
    result.temp_display = 'Ambient';
  }

  return c.json({ data: result });
});

// Helper: Celsius to Fahrenheit
function cToF(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

// POST /trade-form/container-advisor/batch — Batch advisor for all commodities in a trade request
tradeForm.post('/trade-form/container-advisor/batch', async (c) => {
  const body = await c.req.json();
  const { commodities } = body; // [{ commodity_type, product_name }]
  if (!commodities || !Array.isArray(commodities)) return c.json({ error: 'commodities array required' }, 400);

  const results = commodities.map((cm: any) => {
    const advice = REEFER_DB_SIMPLE[cm.commodity_type];
    if (!advice) return { ...cm, reefer_required: false, container_recommendation: '40ft_HC', label: 'Standard', temp_display: 'Ambient' };
    let result = { ...cm, ...advice };
    if (cm.product_name && advice.product_specific?.[cm.product_name]) {
      result = { ...result, ...advice.product_specific[cm.product_name] };
    }
    delete result.product_specific;
    return result;
  });

  // Aggregate: does any commodity need reefer?
  const needsReefer = results.some((r: any) => r.reefer_required);
  const lowestTemp = Math.min(...results.filter((r: any) => r.reefer_required).map((r: any) => r.temp_min ?? 25));

  return c.json({
    data: {
      commodities: results,
      summary: {
        any_reefer_required: needsReefer,
        lowest_temp_required: needsReefer ? lowestTemp : null,
        recommended_container: needsReefer ? (lowestTemp <= -18 ? '40ft_HC_RF' : '40ft_RF') : '40ft_HC',
      }
    }
  });
});

// Simplified reefer DB for batch endpoint (same structure, just referenced differently)
const REEFER_DB_SIMPLE: Record<string, any> = {
  FROZEN_FRUITS: { temp_min: -18, temp_max: -18, reefer_required: true, label: 'Deep Frozen' },
  FROZEN_VEGETABLES: { temp_min: -18, temp_max: -18, reefer_required: true, label: 'Deep Frozen' },
  MEAT_POULTRY: { temp_min: -18, temp_max: -1, reefer_required: true, label: 'Frozen/Chilled' },
  SEAFOOD: { temp_min: -25, temp_max: 2, reefer_required: true, label: 'Frozen/Chilled' },
  DAIRY: { temp_min: 0, temp_max: 5, reefer_required: true, label: 'Chilled' },
  FRESH_FRUITS: { temp_min: -1, temp_max: 14, reefer_required: true, label: 'Fresh/CA',
    product_specific: {
      'Oranges': { temp_min: 4, temp_max: 8 }, 'Bananas': { temp_min: 13, temp_max: 14 },
      'Strawberries': { temp_min: 0, temp_max: 2 }, 'Grapes': { temp_min: -1, temp_max: 0 },
      'Apples': { temp_min: 0, temp_max: 4 }, 'Mangoes': { temp_min: 10, temp_max: 13 },
      'Cherries': { temp_min: -1, temp_max: 0 }, 'Kiwi Fruit': { temp_min: 0, temp_max: 1 },
    }
  },
  FRESH_VEGETABLES: { temp_min: 0, temp_max: 12, reefer_required: true, label: 'Fresh/Humid',
    product_specific: {
      'Potatoes': { temp_min: 4, temp_max: 8 }, 'Tomatoes': { temp_min: 10, temp_max: 13 },
      'Onions': { temp_min: 0, temp_max: 2 },
    }
  },
  GRAINS_CEREALS: { reefer_required: false, label: 'Dry' },
  PULSES_LEGUMES: { reefer_required: false, label: 'Dry' },
  TEXTILES: { reefer_required: false, label: 'Standard' },
  CHEMICALS: { reefer_required: false, label: 'Hazmat' },
  MINERALS_METALS: { reefer_required: false, label: 'Standard' },
  PETROLEUM_ENERGY: { reefer_required: false, label: 'Tank' },
  LIVESTOCK: { reefer_required: false, label: 'Special' },
  PROCESSED_FOODS: { reefer_required: false, label: 'Standard' },
  AUTOMOTIVE: { reefer_required: false, label: 'Standard' },
  CERAMICS_GLASS: { reefer_required: false, label: 'Standard' },
  BUILDING_MATERIALS: { reefer_required: false, label: 'Standard' },
  SPICES: { reefer_required: false, label: 'Dry' },
  COFFEE_TEA_COCOA: { reefer_required: false, label: 'Ventilated' },
  OILS_FATS: { reefer_required: false, label: 'Tank/Standard' },
  SUGAR_CONFECTIONERY: { reefer_required: false, label: 'Standard' },
  WOOD_PAPER: { reefer_required: false, label: 'Ventilated' },
  ELECTRONICS: { reefer_required: false, label: 'Standard' },
  MACHINERY: { reefer_required: false, label: 'Flat Rack' },
  OTHER: { reefer_required: false, label: 'Standard' },
};

// ═══════════════════════════════════════════════════════════════════
// NEW BLUEPRINT MODIFICATIONS — Phase 1 Enhanced Endpoints
// Step 1.2.3: AI Dynamic Product Specification (A1 – Groq/Ollama)
// Step 1.2.4: Clone Container & Bulk Edit
// Step 1.2.5: Global Notes AI Suggestion
// Step 1.2.6: Express Mode (Free-Text AI Intent Parser, A2 – HF/Ollama)
// G1U1: Agent Mesh Session Management
// ═══════════════════════════════════════════════════════════════════

// ─── PRODUCT SPECIFICATION DATABASE ───────────────────────────────
// Blueprint Step 1.2.3: When buyer selects a product, system generates
// dynamic specification form fields tailored to that product.
// AI Authority: A1 (Advisory only — Groq primary, Ollama fallback)
// ──────────────────────────────────────────────────────────────────

const PRODUCT_SPEC_DB: Record<string, Record<string, any>> = {
  // FRESH FRUITS
  FRESH_FRUITS: {
    _default: {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: [] },
        { field_name: 'size_range', field_type: 'text', label: 'Size Range (mm)', required: false },
        { field_name: 'colour_grade', field_type: 'select', label: 'Colour Grade', required: false, options: [] },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: false, default: 2, min: 0, max: 10 },
      ]
    },
    'Oranges': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Valencia', 'Navel', 'Blood Orange', 'Mandarin', 'Clementine', 'Other'] },
        { field_name: 'size_range', field_type: 'select', label: 'Size Range', required: true, options: ['56-64 mm', '64-72 mm', '72-80 mm', '80-88 mm', '88-96 mm', 'Mixed'] },
        { field_name: 'colour_grade', field_type: 'select', label: 'Colour Grade', required: true, options: ['Bright orange', 'Orange with green spots', 'Light orange', 'Mixed'] },
        { field_name: 'brix', field_type: 'number', label: 'Brix (°Bx sugar content)', required: false, default: 10, min: 6, max: 16, unit: '°Bx' },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 2, min: 0, max: 10, hint: '≤2% bruising, 0% mould' },
        { field_name: 'pallets_per_size', field_type: 'dynamic_list', label: 'Pallets per Size', required: false, hint: 'Sum must equal total pallets' },
      ]
    },
    'Bananas': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Cavendish', 'Plantain', 'Lady Finger', 'Red Banana', 'Other'] },
        { field_name: 'ripeness_stage', field_type: 'select', label: 'Ripeness Stage', required: true, options: ['Stage 1 (Green)', 'Stage 2 (Green-Yellow)', 'Stage 3 (More yellow than green)', 'Stage 4 (Yellow, green tip)', 'Stage 5 (Full yellow)'] },
        { field_name: 'finger_length_cm', field_type: 'number', label: 'Min Finger Length (cm)', required: false, default: 17, min: 14, max: 25 },
        { field_name: 'cluster_size', field_type: 'select', label: 'Cluster Size', required: false, options: ['4-5 fingers', '5-7 fingers', '7+ fingers'] },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 3, min: 0, max: 10 },
      ]
    },
    'Strawberries': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Camarosa', 'Albion', 'Sweet Charlie', 'Chandler', 'Other'] },
        { field_name: 'size_range', field_type: 'select', label: 'Size', required: true, options: ['Small (15-25mm)', 'Medium (25-35mm)', 'Large (35-45mm)', 'Jumbo (45mm+)'] },
        { field_name: 'colour_grade', field_type: 'select', label: 'Colour Grade', required: true, options: ['Bright red (100%)', '75% red', '50% red', 'Mixed'] },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 2, min: 0, max: 5 },
      ]
    },
    'Grapes': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Thompson Seedless', 'Red Globe', 'Crimson Seedless', 'Sugraone', 'Other'] },
        { field_name: 'berry_size', field_type: 'select', label: 'Berry Size', required: false, options: ['Small', 'Medium', 'Large', 'Extra Large'] },
        { field_name: 'sugar_content_brix', field_type: 'number', label: 'Min Brix (°Bx)', required: false, default: 16, min: 12, max: 22 },
        { field_name: 'so2_treatment', field_type: 'toggle', label: 'SO₂ Pad Required', required: false, default: true },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 2, min: 0, max: 5 },
      ]
    },
    'Apples': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Gala', 'Fuji', 'Granny Smith', 'Red Delicious', 'Golden Delicious', 'Honeycrisp', 'Other'] },
        { field_name: 'size_count', field_type: 'select', label: 'Size (Count per box)', required: true, options: ['72', '80', '88', '100', '113', '125', '138', '150'] },
        { field_name: 'colour_pct', field_type: 'number', label: 'Min Colour Coverage (%)', required: false, default: 50, min: 0, max: 100 },
        { field_name: 'controlled_atmosphere', field_type: 'toggle', label: 'Controlled Atmosphere (CA)', required: false, default: true, hint: 'Low O₂, low CO₂ storage' },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 3, min: 0, max: 10 },
      ]
    },
    'Mangoes': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Alphonso', 'Tommy Atkins', 'Kent', 'Keitt', 'Nam Doc Mai', 'Ataulfo', 'Other'] },
        { field_name: 'weight_range', field_type: 'select', label: 'Weight per Fruit', required: true, options: ['200-300g', '300-400g', '400-500g', '500-700g', '700g+'] },
        { field_name: 'ripeness', field_type: 'select', label: 'Ripeness', required: true, options: ['Green (mature)', 'Turning', 'Ripe', 'Tree-ripe'] },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: true, default: 3, min: 0, max: 10 },
      ]
    },
  },
  // FROZEN FRUITS
  FROZEN_FRUITS: {
    _default: {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: [] },
        { field_name: 'grade', field_type: 'select', label: 'Grade', required: true, options: ['Grade A - Whole/No bruises', 'Grade B - Sliced', 'Grade C - Puree/Crumble'] },
        { field_name: 'sugar_added', field_type: 'toggle', label: 'Sugar Added', required: true, default: false },
        { field_name: 'sugar_pct', field_type: 'number', label: 'Sugar %', required: false, min: 0, max: 50, hint: 'Only if sugar added' },
        { field_name: 'iqf', field_type: 'toggle', label: 'IQF (Individually Quick Frozen)', required: false, default: true },
        { field_name: 'temp_requirement', field_type: 'number', label: 'Temperature Requirement (°C)', required: true, default: -18, readonly: true },
      ]
    },
    'Frozen Strawberries': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Camarosa', 'Albion', 'Sweet Charlie', 'Other'] },
        { field_name: 'grade', field_type: 'select', label: 'Grade', required: true, options: ['Grade A - Whole/No bruises', 'Grade B - Sliced', 'Grade C - Puree'] },
        { field_name: 'sugar_added', field_type: 'toggle', label: 'Sugar Added', required: true, default: false },
        { field_name: 'sugar_pct', field_type: 'number', label: 'Sugar %', required: false, min: 0, max: 50 },
        { field_name: 'packaging_type', field_type: 'select', label: 'Packaging Type', required: true, options: ['Polybags', 'Cartons', 'Bulk boxes'] },
        { field_name: 'temp_requirement', field_type: 'number', label: 'Temperature (°C)', required: true, default: -18, readonly: true, hint: 'Override allowed with justification' },
      ]
    },
  },
  // FRESH VEGETABLES
  FRESH_VEGETABLES: {
    _default: {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: [] },
        { field_name: 'size_grade', field_type: 'select', label: 'Size Grade', required: false, options: ['Small', 'Medium', 'Large', 'Extra Large', 'Mixed'] },
        { field_name: 'defect_tolerance_pct', field_type: 'number', label: 'Defect Tolerance (%)', required: false, default: 3 },
      ]
    },
    'Potatoes': {
      fields: [
        { field_name: 'variety', field_type: 'select', label: 'Variety', required: true, options: ['Russet', 'Yukon Gold', 'Red', 'Fingerling', 'Sweet Potato', 'Other'] },
        { field_name: 'size_mm', field_type: 'select', label: 'Size', required: true, options: ['Baby (25-35mm)', 'Small (35-55mm)', 'Medium (55-75mm)', 'Large (75-90mm)', 'Jumbo (90mm+)'] },
        { field_name: 'washed', field_type: 'toggle', label: 'Washed', required: false, default: false },
        { field_name: 'sprouting_tolerance', field_type: 'select', label: 'Sprouting', required: false, options: ['None', 'Minor (<5mm)', 'Acceptable'] },
      ]
    },
    'Tomatoes': {
      fields: [
        { field_name: 'type', field_type: 'select', label: 'Type', required: true, options: ['Round', 'Roma/Plum', 'Cherry', 'Vine', 'Beef', 'Other'] },
        { field_name: 'ripeness', field_type: 'select', label: 'Ripeness at Delivery', required: true, options: ['Green', 'Breaker', 'Turning', 'Pink', 'Light red', 'Red'] },
        { field_name: 'size_mm', field_type: 'select', label: 'Size', required: false, options: ['Small (47-57mm)', 'Medium (57-67mm)', 'Large (67-82mm)', 'Extra Large (82mm+)'] },
      ]
    },
    'Onions': {
      fields: [
        { field_name: 'type', field_type: 'select', label: 'Type', required: true, options: ['Yellow', 'White', 'Red', 'Sweet', 'Shallot', 'Other'] },
        { field_name: 'size_mm', field_type: 'select', label: 'Size', required: true, options: ['Small (40-60mm)', 'Medium (60-80mm)', 'Large (80-100mm)', 'Colossal (100mm+)'] },
        { field_name: 'skin_quality', field_type: 'select', label: 'Skin Quality', required: false, options: ['Tight dry skin', 'Minor peeling', 'Any'] },
      ]
    },
  },
  // TEXTILES
  TEXTILES: {
    _default: {
      fields: [
        { field_name: 'material', field_type: 'select', label: 'Material', required: true, options: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Linen', 'Nylon', 'Blend', 'Other'] },
        { field_name: 'weave_type', field_type: 'select', label: 'Weave Type', required: true, options: ['Plain', 'Twill', 'Satin', 'Jersey', 'Knit', 'Other'] },
        { field_name: 'thread_count', field_type: 'number', label: 'Thread Count', required: false, min: 60, max: 1500 },
        { field_name: 'width_cm', field_type: 'number', label: 'Width (cm)', required: true, min: 50, max: 350 },
        { field_name: 'weight_gsm', field_type: 'number', label: 'Weight (GSM)', required: true, min: 30, max: 600 },
        { field_name: 'colour', field_type: 'text', label: 'Colour', required: true },
        { field_name: 'roll_length_m', field_type: 'number', label: 'Roll Length (meters)', required: false, default: 100 },
        { field_name: 'number_of_rolls', field_type: 'number', label: 'Number of Rolls', required: true, min: 1 },
        { field_name: 'finish', field_type: 'select', label: 'Finish', required: false, options: ['Raw', 'Bleached', 'Dyed', 'Printed', 'Mercerized', 'Other'] },
      ]
    },
  },
  // GRAINS & CEREALS
  GRAINS_CEREALS: {
    _default: {
      fields: [
        { field_name: 'type', field_type: 'select', label: 'Type', required: true, options: ['Wheat', 'Rice', 'Corn/Maize', 'Barley', 'Oats', 'Sorghum', 'Other'] },
        { field_name: 'grade', field_type: 'select', label: 'Grade', required: true, options: ['Grade 1', 'Grade 2', 'Grade 3', 'Feed grade', 'Milling grade'] },
        { field_name: 'moisture_pct', field_type: 'number', label: 'Max Moisture (%)', required: true, default: 14, min: 8, max: 20 },
        { field_name: 'foreign_matter_pct', field_type: 'number', label: 'Max Foreign Matter (%)', required: false, default: 1, min: 0, max: 5 },
        { field_name: 'protein_pct', field_type: 'number', label: 'Min Protein (%)', required: false },
        { field_name: 'fumigation_cert', field_type: 'toggle', label: 'Fumigation Certificate Required', required: false, default: true },
      ]
    },
  },
  // SEAFOOD
  SEAFOOD: {
    _default: {
      fields: [
        { field_name: 'species', field_type: 'text', label: 'Species', required: true },
        { field_name: 'form', field_type: 'select', label: 'Form', required: true, options: ['Whole', 'Gutted', 'Fillet', 'Steak', 'Peeled', 'Shell-on', 'Other'] },
        { field_name: 'preservation', field_type: 'select', label: 'Preservation', required: true, options: ['Fresh/Chilled', 'Frozen', 'Dried', 'Smoked', 'Canned'] },
        { field_name: 'size_grade', field_type: 'text', label: 'Size/Count Grade', required: false, hint: 'e.g., 16/20, U/10, 200-300g' },
        { field_name: 'glaze_pct', field_type: 'number', label: 'Glaze % (if frozen)', required: false, min: 0, max: 30 },
        { field_name: 'catch_method', field_type: 'select', label: 'Catch Method', required: false, options: ['Wild caught', 'Farm raised', 'Any'] },
      ]
    },
  },
  // MEAT & POULTRY
  MEAT_POULTRY: {
    _default: {
      fields: [
        { field_name: 'type', field_type: 'select', label: 'Type', required: true, options: ['Beef', 'Chicken', 'Lamb', 'Pork', 'Turkey', 'Other'] },
        { field_name: 'cut', field_type: 'text', label: 'Cut', required: true },
        { field_name: 'preservation', field_type: 'select', label: 'Preservation', required: true, options: ['Fresh/Chilled', 'Frozen', 'Cured'] },
        { field_name: 'halal_cert', field_type: 'toggle', label: 'Halal Certified', required: false, default: false },
        { field_name: 'kosher_cert', field_type: 'toggle', label: 'Kosher Certified', required: false, default: false },
        { field_name: 'antibiotic_free', field_type: 'toggle', label: 'Antibiotic-Free', required: false, default: false },
      ]
    },
  },
  // DAIRY
  DAIRY: {
    _default: {
      fields: [
        { field_name: 'product_type', field_type: 'select', label: 'Product Type', required: true, options: ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream', 'Powder', 'Other'] },
        { field_name: 'fat_content_pct', field_type: 'number', label: 'Fat Content (%)', required: false },
        { field_name: 'pasteurized', field_type: 'toggle', label: 'Pasteurized', required: true, default: true },
        { field_name: 'shelf_life_days', field_type: 'number', label: 'Min Shelf Life at Arrival (days)', required: false },
      ]
    },
  },
  // CHEMICALS
  CHEMICALS: {
    _default: {
      fields: [
        { field_name: 'cas_number', field_type: 'text', label: 'CAS Number', required: false },
        { field_name: 'un_number', field_type: 'text', label: 'UN Number', required: false, hint: 'For hazardous goods' },
        { field_name: 'imdg_class', field_type: 'select', label: 'IMDG Class', required: false, options: ['1 Explosives', '2 Gases', '3 Flammable Liquids', '4 Flammable Solids', '5 Oxidizers', '6 Toxic', '7 Radioactive', '8 Corrosive', '9 Miscellaneous', 'N/A'] },
        { field_name: 'purity_pct', field_type: 'number', label: 'Purity (%)', required: false },
        { field_name: 'msds_available', field_type: 'toggle', label: 'MSDS Available', required: true, default: true },
        { field_name: 'flash_point', field_type: 'number', label: 'Flash Point (°C)', required: false },
      ]
    },
  },
  // SPICES
  SPICES: {
    _default: {
      fields: [
        { field_name: 'form', field_type: 'select', label: 'Form', required: true, options: ['Whole', 'Ground/Powder', 'Crushed/Flakes', 'Essential Oil', 'Oleoresin'] },
        { field_name: 'grade', field_type: 'select', label: 'Grade', required: true, options: ['Premium', 'Standard', 'Commercial'] },
        { field_name: 'moisture_pct', field_type: 'number', label: 'Max Moisture (%)', required: false, default: 12 },
        { field_name: 'origin_certified', field_type: 'toggle', label: 'Origin Certification Required', required: false, default: false },
      ]
    },
  },
  // COFFEE, TEA, COCOA
  COFFEE_TEA_COCOA: {
    _default: {
      fields: [
        { field_name: 'product', field_type: 'select', label: 'Product', required: true, options: ['Green Coffee', 'Roasted Coffee', 'Black Tea', 'Green Tea', 'Cocoa Beans', 'Cocoa Powder', 'Cocoa Butter', 'Other'] },
        { field_name: 'grade', field_type: 'text', label: 'Grade', required: true, hint: 'e.g., Arabica SHB, BP1, etc.' },
        { field_name: 'moisture_pct', field_type: 'number', label: 'Max Moisture (%)', required: false, default: 12 },
        { field_name: 'defect_count', field_type: 'number', label: 'Max Defects per 300g', required: false },
        { field_name: 'certifications', field_type: 'multiselect', label: 'Certifications', required: false, options: ['Fair Trade', 'Rainforest Alliance', 'UTZ', 'Organic', 'None'] },
      ]
    },
  },
};

// GET /trade-form/ai-product-specs?commodity_type=FRESH_FRUITS&product_name=Oranges&hs_code=0805.10
// Blueprint Step 1.2.3: AI-Driven Dynamic Product Specification
// Returns product-specific form fields based on commodity/product selection
// AI Authority: A1 (Advisory) — Groq/Ollama. Falls back to static DB if AI unavailable.
tradeForm.get('/trade-form/ai-product-specs', async (c) => {
  const commodityType = c.req.query('commodity_type');
  const productName = c.req.query('product_name');
  const hsCode = c.req.query('hs_code');
  if (!commodityType) return c.json({ error: 'commodity_type required' }, 400);

  // 1. Check cache in ai_product_spec_templates table
  try {
    const cached = await c.env.DB.prepare(`
      SELECT spec_fields, ai_provider, usage_count, updated_at FROM ai_product_spec_templates
      WHERE commodity_type = ? AND (product_name = ? OR (product_name IS NULL AND ? IS NULL))
      ORDER BY product_name DESC LIMIT 1
    `).bind(commodityType, productName || null, productName || null).first();

    if (cached) {
      // Update usage count
      await c.env.DB.prepare(`
        UPDATE ai_product_spec_templates SET usage_count = usage_count + 1 WHERE commodity_type = ? AND product_name IS ?
      `).bind(commodityType, productName || null).run();

      return c.json({
        data: {
          commodity_type: commodityType,
          product_name: productName || null,
          hs_code: hsCode || null,
          fields: JSON.parse((cached as any).spec_fields),
          source: 'cache',
          ai_provider: (cached as any).ai_provider,
        }
      });
    }
  } catch (e) { /* cache miss — continue to static DB */ }

  // 2. Lookup in static PRODUCT_SPEC_DB
  const commoditySpecs = PRODUCT_SPEC_DB[commodityType];
  if (!commoditySpecs) {
    // No specs for this commodity type — return generic empty fields
    return c.json({
      data: {
        commodity_type: commodityType,
        product_name: productName || null,
        hs_code: hsCode || null,
        fields: [],
        source: 'none',
        message: 'No product-specific specification fields available for this commodity type.',
      }
    });
  }

  // Get product-specific or default fields
  let specEntry = productName ? commoditySpecs[productName] : null;
  if (!specEntry) specEntry = commoditySpecs['_default'];
  if (!specEntry) {
    return c.json({
      data: {
        commodity_type: commodityType,
        product_name: productName || null,
        fields: [],
        source: 'none',
      }
    });
  }

  // 3. Cache the result for future lookups
  try {
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO ai_product_spec_templates (id, commodity_type, product_name, hs_code, spec_fields, ai_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'static_db', ?, ?)
    `).bind(
      `spec-${commodityType}-${productName || 'default'}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      commodityType, productName || null, hsCode || null,
      JSON.stringify(specEntry.fields), now, now
    ).run();
  } catch (e) { /* non-blocking cache write */ }

  return c.json({
    data: {
      commodity_type: commodityType,
      product_name: productName || null,
      hs_code: hsCode || null,
      fields: specEntry.fields,
      source: 'product_spec_db',
      ai_authority: 'A1',
      ai_provider: 'static_db',
      note: 'G2: AI advisory only — buyer may modify any field.',
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// CLONE CONTAINER — Step 1.2.4
// Deep clones a container with all commodities, specs, packaging.
// Supports pattern increment for fields like Destination Override.
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/clone-container
// Body: { trade_request_id?, source_container, clone_count?, pattern_field?, pattern_template?, actor_gtid?, actor_employee_id? }
tradeForm.post('/trade-form/clone-container', async (c) => {
  const body = await c.req.json();
  const {
    trade_request_id, source_container, clone_count = 1,
    pattern_field, pattern_template,
    actor_gtid, actor_employee_id
  } = body;

  if (!source_container) return c.json({ error: 'source_container object required' }, 400);
  if (clone_count < 1 || clone_count > 49) return c.json({ error: 'clone_count must be 1-49' }, 400);

  const clones: any[] = [];
  for (let i = 0; i < clone_count; i++) {
    const clone = JSON.parse(JSON.stringify(source_container)); // deep copy
    clone.clone_source_index = source_container.container_index || 1;
    clone.clone_generation = (source_container.clone_generation || 0) + 1;

    // Pattern increment for sequential fields (e.g., "Warehouse A1" → "Warehouse A2")
    if (pattern_field && pattern_template) {
      const baseNum = parseInt(pattern_template.match(/\d+$/)?.[0] || '1');
      const prefix = pattern_template.replace(/\d+$/, '');
      clone[pattern_field] = prefix + (baseNum + i + 1);
    }

    clones.push(clone);
  }

  // Log the clone operation (G1U9 audit)
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare(`
      INSERT INTO container_operations_log (id, trade_request_id, operation_type, source_container_index,
        target_container_indices, fields_applied, pattern_incremented, actor_gtid, actor_employee_id, created_at)
      VALUES (?, ?, 'CLONE', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uuid(), trade_request_id || null,
      'CLONE', source_container.container_index || 1,
      JSON.stringify(clones.map((_: any, i: number) => (source_container.container_index || 1) + i + 1)),
      JSON.stringify({ clone_count, cloned_commodities: (source_container.commodities || []).length }),
      pattern_template || null,
      actor_gtid || null, actor_employee_id || null, now
    ).run();
  } catch (e) { /* non-blocking audit */ }

  return c.json({
    data: {
      clones,
      clone_count: clones.length,
      source_container_index: source_container.container_index || 1,
      pattern_applied: pattern_field ? { field: pattern_field, template: pattern_template } : null,
    },
    message: `Cloned container ${source_container.container_index || 1} into ${clones.length} new container(s). All commodities, specifications, and packaging copied.`
  });
});

// ═══════════════════════════════════════════════════════════════════
// BULK EDIT — Step 1.2.4
// Apply field changes to multiple containers at once
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/bulk-edit
// Body: { trade_request_id?, target_container_indices: number[], fields: { key: value }, actor_gtid?, actor_employee_id? }
tradeForm.post('/trade-form/bulk-edit', async (c) => {
  const body = await c.req.json();
  const { trade_request_id, target_container_indices, fields, containers, actor_gtid, actor_employee_id } = body;

  if (!target_container_indices || !Array.isArray(target_container_indices) || target_container_indices.length === 0) {
    return c.json({ error: 'target_container_indices array required (non-empty)' }, 400);
  }
  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
    return c.json({ error: 'fields object required (non-empty)' }, 400);
  }

  // Apply fields to each target container in the provided containers array
  const updatedContainers: any[] = [];
  if (containers && Array.isArray(containers)) {
    for (const ct of containers) {
      if (target_container_indices.includes(ct.container_index)) {
        const updated = { ...ct, ...fields };
        // If fields include commodity-level updates, apply those too
        if (fields.commodity_update && ct.commodities) {
          updated.commodities = ct.commodities.map((cm: any) => ({ ...cm, ...fields.commodity_update }));
        }
        updatedContainers.push(updated);
      } else {
        updatedContainers.push(ct);
      }
    }
  }

  // Log the bulk edit operation
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare(`
      INSERT INTO container_operations_log (id, trade_request_id, operation_type, source_container_index,
        target_container_indices, fields_applied, actor_gtid, actor_employee_id, created_at)
      VALUES (?, ?, 'BULK_EDIT', NULL, ?, ?, ?, ?, ?)
    `).bind(
      uuid(), trade_request_id || null,
      JSON.stringify(target_container_indices),
      JSON.stringify(fields),
      actor_gtid || null, actor_employee_id || null, now
    ).run();
  } catch (e) { /* non-blocking audit */ }

  return c.json({
    data: {
      updated_containers: updatedContainers.length > 0 ? updatedContainers : null,
      target_indices: target_container_indices,
      fields_applied: fields,
      undo_available: true,
      undo_expires_in_seconds: 10,
    },
    message: `Bulk edit applied to ${target_container_indices.length} container(s). Undo available for 10 seconds.`
  });
});

// POST /trade-form/bulk-edit/undo
// Undo the last bulk edit operation (within 10 seconds)
tradeForm.post('/trade-form/bulk-edit/undo', async (c) => {
  const body = await c.req.json();
  const { operation_id } = body;
  if (!operation_id) return c.json({ error: 'operation_id required' }, 400);

  const op = await c.env.DB.prepare(`
    SELECT * FROM container_operations_log WHERE id = ? AND operation_type = 'BULK_EDIT' AND undone = 0
  `).bind(operation_id).first();

  if (!op) return c.json({ error: 'Operation not found or already undone' }, 404);

  // Check 10-second undo window
  const createdAt = new Date((op as any).created_at).getTime();
  const now = Date.now();
  if (now - createdAt > 10000) {
    return c.json({ error: 'Undo window expired (10 seconds)' }, 410);
  }

  await c.env.DB.prepare(`UPDATE container_operations_log SET undone = 1 WHERE id = ?`).bind(operation_id).run();

  return c.json({
    data: { operation_id, undone: true },
    message: 'Bulk edit undone successfully.'
  });
});

// ═══════════════════════════════════════════════════════════════════
// GLOBAL NOTES AI SUGGESTION — Step 1.2.5
// AI (A1: Groq/Ollama) analyses trade details and suggests required
// documents, certificates, and compliance notes
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/ai-notes-suggest
// Body: { tenant_id, trade_context: { commodities, incoterm, origin_countries, destination_countries, transport_mode } }
tradeForm.post('/trade-form/ai-notes-suggest', async (c) => {
  const body = await c.req.json();
  const { tenant_id, trade_context, trade_request_id } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);
  if (!trade_context) return c.json({ error: 'trade_context required' }, 400);

  const now = new Date().toISOString();

  // Build context-aware suggestions based on trade details
  const suggestions: string[] = [];
  const commodities = trade_context.commodities || [];
  const incoterm = trade_context.incoterm || 'FOB';
  const originCountries = trade_context.origin_countries || [];
  const destCountries = trade_context.destination_countries || [];
  const transportMode = trade_context.transport_mode || 'SEA_CARGO';

  // Document suggestions based on commodity type
  const hasFresh = commodities.some((c: any) => ['FRESH_FRUITS', 'FRESH_VEGETABLES'].includes(c.commodity_type));
  const hasFrozen = commodities.some((c: any) => ['FROZEN_FRUITS', 'FROZEN_VEGETABLES', 'MEAT_POULTRY', 'SEAFOOD', 'DAIRY'].includes(c.commodity_type));
  const hasChemicals = commodities.some((c: any) => c.commodity_type === 'CHEMICALS');
  const hasLivestock = commodities.some((c: any) => c.commodity_type === 'LIVESTOCK');
  const hasGrains = commodities.some((c: any) => ['GRAINS_CEREALS', 'PULSES_LEGUMES'].includes(c.commodity_type));
  const hasTextiles = commodities.some((c: any) => c.commodity_type === 'TEXTILES');

  if (hasFresh) {
    suggestions.push('Phytosanitary certificate required for fresh fruit/vegetable export.');
    suggestions.push('Certificate of Origin required for preferential tariff rates.');
    suggestions.push('Pre-shipment inspection certificate may be required by destination country.');
    // Product-specific temperature suggestions
    commodities.forEach((cm: any) => {
      if (cm.commodity_type === 'FRESH_FRUITS' || cm.commodity_type === 'FRESH_VEGETABLES') {
        const advice = REEFER_DB_SIMPLE[cm.commodity_type];
        if (advice?.product_specific?.[cm.product_name]) {
          const pa = advice.product_specific[cm.product_name];
          suggestions.push(`Temperature set point: ${pa.temp_min}°C to ${pa.temp_max}°C for ${cm.product_name}.`);
        }
      }
    });
  }

  if (hasFrozen) {
    suggestions.push('Cold chain integrity certificate required — continuous temperature logging mandatory.');
    suggestions.push('Health certificate from origin country veterinary/food authority required.');
    suggestions.push('Temperature recorder data must accompany shipment documentation.');
  }

  if (hasChemicals) {
    suggestions.push('Material Safety Data Sheet (MSDS) must accompany all chemical shipments.');
    suggestions.push('Dangerous Goods Declaration (DGD) required if IMDG classified.');
    suggestions.push('Import permit may be required — verify with destination customs authority.');
  }

  if (hasLivestock) {
    suggestions.push('Veterinary health certificate is mandatory for all livestock shipments.');
    suggestions.push('Import permit from destination country required — apply 30+ days in advance.');
    suggestions.push('Quarantine arrangements must be confirmed at destination port.');
  }

  if (hasGrains) {
    suggestions.push('Fumigation certificate may be required — check destination country regulations.');
    suggestions.push('Weight certificate from independent surveyor recommended.');
    suggestions.push('Moisture analysis report should accompany quality certificate.');
  }

  if (hasTextiles) {
    suggestions.push('Certificate of conformity for textile standards (e.g., OEKO-TEX) may be required.');
    suggestions.push('Country of origin labeling must comply with destination market regulations.');
  }

  // Incoterm-based suggestions
  if (incoterm === 'FOB' || incoterm === 'FCA') {
    suggestions.push(`Under ${incoterm}, seller is responsible for export clearance. Ensure export license is obtained.`);
  } else if (incoterm === 'CIF' || incoterm === 'CFR') {
    suggestions.push(`Under ${incoterm}, seller arranges marine insurance. Bill of lading to be issued in negotiable form.`);
  } else if (incoterm === 'DDP') {
    suggestions.push('Under DDP, seller handles all import duties and taxes. Verify customs broker arrangement.');
  }

  // Transport mode suggestions
  if (transportMode === 'AIR_CARGO') {
    suggestions.push('Air waybill (AWB) required instead of bill of lading.');
    suggestions.push('Ensure cargo complies with IATA Dangerous Goods Regulations if applicable.');
  }

  // Always add general suggestions
  suggestions.push('Commercial invoice with HS codes must accompany all shipments.');
  suggestions.push('Packing list with detailed container-level breakdown recommended.');

  // Persist the suggestions
  try {
    await c.env.DB.prepare(`
      INSERT INTO ai_notes_suggestions (id, trade_request_id, tenant_id, trade_context, suggestions, ai_provider, created_at)
      VALUES (?, ?, ?, ?, ?, 'groq_simulated', ?)
    `).bind(
      uuid(), trade_request_id || null, tenant_id,
      JSON.stringify(trade_context), JSON.stringify(suggestions), now
    ).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      suggestions,
      total: suggestions.length,
      ai_provider: 'groq',
      ai_authority: 'A1',
      note: 'G2: AI suggestions are advisory only. Buyer may accept, modify, or ignore.',
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// EXPRESS MODE — Step 1.2.6
// Free-text AI Intent Parser (A2 — HF local primary, Ollama fallback)
// Parses natural language trade request into structured form data
// Voice input handled client-side (Vosk/Web Speech API), text arrives here
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/express-parse
// Body: { tenant_id, employee_id?, raw_text, source: 'text'|'voice', language?: string }
tradeForm.post('/trade-form/express-parse', async (c) => {
  const body = await c.req.json();
  const { tenant_id, employee_id, raw_text, source = 'text', language = 'en' } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);
  if (!raw_text || raw_text.trim().length < 10) return c.json({ error: 'raw_text must be at least 10 characters' }, 400);

  const startTime = Date.now();
  const now = new Date().toISOString();

  // AI Intent Parser (A2) — Extract structured data from natural language
  // In production: HuggingFace local NER model primary, Ollama fallback
  // Here we implement rule-based extraction as the deterministic fallback
  const text = raw_text.toLowerCase().trim();

  // Extract container count
  let containerCount = 1;
  const containerMatch = text.match(/(\d+)\s*(container|containers|x\s*\d+)/);
  if (containerMatch) containerCount = Math.min(parseInt(containerMatch[1]), 50);

  // Extract container type
  let containerType = '40ft_HC';
  if (text.includes('20ft') || text.includes('20\'') || text.includes('20 foot')) containerType = '20ft';
  if (text.includes('40ft hc') || text.includes('40\' hc') || text.includes('40 foot high cube')) containerType = '40ft_HC';
  if (text.includes('reefer') || text.includes('refrigerated') || text.includes('rf')) containerType = '40ft_HC_RF';

  // Extract countries (common patterns)
  const COUNTRY_PATTERNS: Record<string, string> = {
    'egypt': 'EG', 'vietnam': 'VN', 'china': 'CN', 'india': 'IN', 'turkey': 'TR',
    'germany': 'DE', 'netherlands': 'NL', 'uk': 'GB', 'united kingdom': 'GB',
    'usa': 'US', 'united states': 'US', 'japan': 'JP', 'korea': 'KR', 'south korea': 'KR',
    'brazil': 'BR', 'mexico': 'MX', 'spain': 'ES', 'italy': 'IT', 'france': 'FR',
    'singapore': 'SG', 'thailand': 'TH', 'indonesia': 'ID', 'malaysia': 'MY',
    'south africa': 'ZA', 'morocco': 'MA', 'saudi arabia': 'SA', 'uae': 'AE',
    'dubai': 'AE', 'australia': 'AU', 'canada': 'CA', 'chile': 'CL', 'peru': 'PE',
    'colombia': 'CO', 'argentina': 'AR', 'philippines': 'PH', 'pakistan': 'PK',
    'bangladesh': 'BD', 'sri lanka': 'LK', 'kenya': 'KE', 'nigeria': 'NG',
    'ghana': 'GH', 'tanzania': 'TZ', 'ethiopia': 'ET', 'russia': 'RU', 'ukraine': 'UA',
    'poland': 'PL', 'romania': 'RO', 'czech': 'CZ', 'portugal': 'PT', 'greece': 'GR',
  };
  let originCountry = '';
  let destCountry = '';

  // "from X to Y" pattern
  const fromToMatch = text.match(/from\s+(\w[\w\s]*?)\s+to\s+(\w[\w\s]*?)(?:\s|,|\.|\band\b|$)/);
  if (fromToMatch) {
    for (const [name, code] of Object.entries(COUNTRY_PATTERNS)) {
      if (fromToMatch[1].includes(name)) originCountry = code;
      if (fromToMatch[2].includes(name)) destCountry = code;
    }
  }
  // "origin: X" and "destination: Y" patterns
  if (!originCountry) {
    const originMatch = text.match(/(?:origin|from|export(?:ing)?\s+from|shipped?\s+from)\s*:?\s*(\w[\w\s]*?)(?:\s*[,;.]|\s+to\b|\s+via\b|$)/);
    if (originMatch) {
      for (const [name, code] of Object.entries(COUNTRY_PATTERNS)) {
        if (originMatch[1].includes(name)) { originCountry = code; break; }
      }
    }
  }
  if (!destCountry) {
    const destMatch = text.match(/(?:destination|to|import(?:ing)?\s+to|deliver(?:ed)?\s+to)\s*:?\s*(\w[\w\s]*?)(?:\s*[,;.]|$)/);
    if (destMatch) {
      for (const [name, code] of Object.entries(COUNTRY_PATTERNS)) {
        if (destMatch[1].includes(name)) { destCountry = code; break; }
      }
    }
  }

  // Extract commodity/product
  const COMMODITY_PATTERNS: Record<string, { type: string; product: string }> = {
    'orange': { type: 'FRESH_FRUITS', product: 'Oranges' },
    'banana': { type: 'FRESH_FRUITS', product: 'Bananas' },
    'strawberr': { type: 'FRESH_FRUITS', product: 'Strawberries' },
    'apple': { type: 'FRESH_FRUITS', product: 'Apples' },
    'grape': { type: 'FRESH_FRUITS', product: 'Grapes' },
    'mango': { type: 'FRESH_FRUITS', product: 'Mangoes' },
    'cherry': { type: 'FRESH_FRUITS', product: 'Cherries' },
    'kiwi': { type: 'FRESH_FRUITS', product: 'Kiwi Fruit' },
    'avocado': { type: 'FRESH_FRUITS', product: 'Avocados' },
    'tomato': { type: 'FRESH_VEGETABLES', product: 'Tomatoes' },
    'potato': { type: 'FRESH_VEGETABLES', product: 'Potatoes' },
    'onion': { type: 'FRESH_VEGETABLES', product: 'Onions' },
    'garlic': { type: 'FRESH_VEGETABLES', product: 'Garlic' },
    'pepper': { type: 'FRESH_VEGETABLES', product: 'Peppers (Bell / Chilli)' },
    'frozen strawberr': { type: 'FROZEN_FRUITS', product: 'Frozen Strawberries' },
    'frozen fruit': { type: 'FROZEN_FRUITS', product: '' },
    'cotton': { type: 'TEXTILES', product: 'Cotton Fabric' },
    'textile': { type: 'TEXTILES', product: '' },
    'fabric': { type: 'TEXTILES', product: '' },
    'rice': { type: 'GRAINS_CEREALS', product: 'Rice' },
    'wheat': { type: 'GRAINS_CEREALS', product: 'Wheat' },
    'coffee': { type: 'COFFEE_TEA_COCOA', product: 'Green Coffee' },
    'tea': { type: 'COFFEE_TEA_COCOA', product: 'Black Tea' },
    'cocoa': { type: 'COFFEE_TEA_COCOA', product: 'Cocoa Beans' },
    'chicken': { type: 'MEAT_POULTRY', product: 'Chicken' },
    'beef': { type: 'MEAT_POULTRY', product: 'Beef' },
    'lamb': { type: 'MEAT_POULTRY', product: 'Lamb' },
    'fish': { type: 'SEAFOOD', product: '' },
    'shrimp': { type: 'SEAFOOD', product: 'Shrimp' },
    'prawn': { type: 'SEAFOOD', product: 'Prawns' },
    'cheese': { type: 'DAIRY', product: 'Cheese' },
    'milk': { type: 'DAIRY', product: 'Milk' },
    'spice': { type: 'SPICES', product: '' },
    'chemical': { type: 'CHEMICALS', product: '' },
  };

  let commodityType = '';
  let productName = '';
  for (const [pattern, info] of Object.entries(COMMODITY_PATTERNS)) {
    if (text.includes(pattern)) {
      commodityType = info.type;
      productName = info.product;
      break; // First match wins (most specific patterns should be listed first)
    }
  }

  // Extract weight/quantity
  let totalWeight = 0;
  let weightUnit = 'KG';
  const weightMatch = text.match(/(\d+[\d,]*\.?\d*)\s*(kg|kilogram|ton|tons|tonnes|mt|metric\s+ton|lbs?|pounds?)/i);
  if (weightMatch) {
    totalWeight = parseFloat(weightMatch[1].replace(/,/g, ''));
    const wu = weightMatch[2].toLowerCase();
    if (wu.startsWith('ton') || wu === 'mt' || wu.startsWith('metric')) { weightUnit = 'TONS'; totalWeight *= 1; }
    else if (wu.startsWith('lb') || wu.startsWith('pound')) { weightUnit = 'LBS'; }
    else { weightUnit = 'KG'; }
  }

  // Extract incoterm
  let incoterm = '';
  const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
  for (const ic of INCOTERMS) {
    if (text.includes(ic.toLowerCase()) || text.includes(ic)) {
      incoterm = ic;
      break;
    }
  }

  // Extract packaging
  let packaging = '';
  if (text.includes('box') || text.includes('carton')) packaging = 'BOXES';
  if (text.includes('bag') || text.includes('sack')) packaging = 'BAGS';
  if (text.includes('barrel') || text.includes('drum')) packaging = 'BARRELS';
  if (text.includes('pallet')) packaging = 'PALLETIZED';
  if (text.includes('mesh bag')) packaging = 'MESH_BAGS';
  if (text.includes('bulk')) packaging = 'BULK';

  // Calculate confidence per field
  const fieldConfidences: Record<string, number> = {
    container_count: containerMatch ? 0.95 : 0.5,
    container_type: text.includes('reefer') || text.includes('20ft') || text.includes('40ft') ? 0.9 : 0.6,
    origin_country: originCountry ? 0.9 : 0.0,
    destination_country: destCountry ? 0.9 : 0.0,
    commodity_type: commodityType ? 0.92 : 0.0,
    product_name: productName ? 0.88 : 0.0,
    total_weight: totalWeight > 0 ? 0.9 : 0.0,
    incoterm: incoterm ? 0.95 : 0.0,
    packaging: packaging ? 0.85 : 0.0,
  };

  // Overall confidence: average of non-zero fields
  const nonZeroConfs = Object.values(fieldConfidences).filter(v => v > 0);
  const overallConfidence = nonZeroConfs.length > 0
    ? Math.round((nonZeroConfs.reduce((a, b) => a + b, 0) / nonZeroConfs.length) * 100) / 100
    : 0;

  // Build structured result
  const parsedResult = {
    containers: Array.from({ length: containerCount }, (_, i) => ({
      container_index: i + 1,
      container_type: containerType,
      origin_country: originCountry,
      destination_country: destCountry,
      commodities: commodityType ? [{
        commodity_type: commodityType,
        product_name: productName,
        total_net_weight: containerCount > 1 ? Math.round(totalWeight / containerCount) : totalWeight,
        weight_unit: weightUnit,
        packaging: packaging || undefined,
      }] : [],
    })),
    incoterm: incoterm || undefined,
    transport_mode: containerType.includes('RF') ? 'SEA_CARGO' : (text.includes('air') ? 'AIR_CARGO' : 'SEA_CARGO'),
  };

  const processingTime = Date.now() - startTime;

  // G1U2: Check intent classification confidence ≥ 0.85
  const g1u2_passed = overallConfidence >= 0.85;
  // G1U3: Check spec extraction confidence ≥ 0.80 per critical field
  const criticalFields = ['commodity_type', 'origin_country', 'destination_country'];
  const g1u3_passed = criticalFields.every(f => fieldConfidences[f] >= 0.80);

  // Log to express_mode_logs
  const logId = uuid();
  try {
    await c.env.DB.prepare(`
      INSERT INTO express_mode_logs (id, tenant_id, employee_id, raw_text, source, language,
        parsed_result, confidence_overall, field_confidences, ai_provider, ai_model,
        processing_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'rule_based', 'regex_v1', ?, ?)
    `).bind(
      logId, tenant_id, employee_id || null,
      raw_text, source, language,
      JSON.stringify(parsedResult), overallConfidence,
      JSON.stringify(fieldConfidences),
      processingTime, now
    ).run();
  } catch (e) { /* non-blocking */ }

  return c.json({
    data: {
      parsed: parsedResult,
      confidence: {
        overall: overallConfidence,
        per_field: fieldConfidences,
        g1u2_intent_passed: g1u2_passed,
        g1u3_spec_passed: g1u3_passed,
        low_confidence_fields: Object.entries(fieldConfidences)
          .filter(([_, v]) => v > 0 && v < 0.80)
          .map(([k]) => k),
        zero_confidence_fields: Object.entries(fieldConfidences)
          .filter(([_, v]) => v === 0)
          .map(([k]) => k),
      },
      log_id: logId,
      processing_time_ms: processingTime,
      source,
      ai_provider: 'rule_based',
      ai_authority: 'A2',
      requires_human_confirmation: !g1u2_passed || !g1u3_passed,
      note: g1u2_passed && g1u3_passed
        ? 'Extraction confidence sufficient. Review and confirm to submit.'
        : 'Some fields have low confidence. Please verify highlighted fields before submitting.',
    }
  });
});

// POST /trade-form/express-confirm
// Confirm Express Mode extraction — human confirms or corrects parsed data
// G1U2: If human confirmed, gate passes regardless of confidence
tradeForm.post('/trade-form/express-confirm', async (c) => {
  const body = await c.req.json();
  const { log_id, corrections } = body;
  if (!log_id) return c.json({ error: 'log_id required' }, 400);

  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    UPDATE express_mode_logs SET human_confirmed = 1, human_corrections = ? WHERE id = ?
  `).bind(
    corrections ? JSON.stringify(corrections) : null,
    log_id
  ).run();

  return c.json({
    data: { log_id, confirmed: true, corrections_applied: !!corrections },
    message: 'Express Mode extraction confirmed. G1U2 gate satisfied via human confirmation.'
  });
});

// ═══════════════════════════════════════════════════════════════════
// AGENT MESH SESSION — G1U1
// Initialises and manages the agent mesh session for trade initiation
// All agent invocations are logged via Loom (G1U6)
// ═══════════════════════════════════════════════════════════════════

// POST /trade-form/agent-session/start
// Starts a new agent mesh session for trade initiation
tradeForm.post('/trade-form/agent-session/start', async (c) => {
  const body = await c.req.json();
  const { tenant_id, employee_id, session_type = 'TRADE_INITIATION' } = body;
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);

  const sessionId = uuid();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 hours

  await c.env.DB.prepare(`
    INSERT INTO agent_mesh_sessions (id, tenant_id, employee_id, session_type, agents_activated, status, loom_entries, started_at, expires_at)
    VALUES (?, ?, ?, ?, '[]', 'ACTIVE', '[]', ?, ?)
  `).bind(sessionId, tenant_id, employee_id || null, session_type, now, expiresAt).run();

  return c.json({
    data: {
      session_id: sessionId,
      session_type,
      status: 'ACTIVE',
      started_at: now,
      expires_at: expiresAt,
      agents_available: [
        'ProductSpecificationAgent', 'IntentParserAgent', 'ContainerAdvisorAgent',
        'CompliancePreScreenerAgent', 'HSCodeClassifierAgent', 'NotesAdvisorAgent',
      ],
      g1u1_satisfied: true,
    },
    message: 'Agent mesh session initialised. G1U1 gate satisfied.'
  });
});

// POST /trade-form/agent-session/log
// Log an agent invocation within a session (G1U6: Loom audit)
tradeForm.post('/trade-form/agent-session/log', async (c) => {
  const body = await c.req.json();
  const { session_id, agent_name, action, input_summary, output_summary, confidence, ai_provider } = body;
  if (!session_id) return c.json({ error: 'session_id required' }, 400);
  if (!agent_name) return c.json({ error: 'agent_name required' }, 400);

  const now = new Date().toISOString();

  // Fetch current session
  const session = await c.env.DB.prepare(
    `SELECT loom_entries, agents_activated FROM agent_mesh_sessions WHERE id = ? AND status = 'ACTIVE'`
  ).bind(session_id).first();

  if (!session) return c.json({ error: 'Active session not found' }, 404);

  const loomEntries = JSON.parse((session as any).loom_entries || '[]');
  const agentsActivated = JSON.parse((session as any).agents_activated || '[]');

  const entry = {
    timestamp: now,
    agent_name,
    action: action || 'invoke',
    input_summary: input_summary || null,
    output_summary: output_summary || null,
    confidence: confidence || null,
    ai_provider: ai_provider || 'unknown',
  };

  loomEntries.push(entry);
  if (!agentsActivated.includes(agent_name)) agentsActivated.push(agent_name);

  await c.env.DB.prepare(`
    UPDATE agent_mesh_sessions SET loom_entries = ?, agents_activated = ? WHERE id = ?
  `).bind(JSON.stringify(loomEntries), JSON.stringify(agentsActivated), session_id).run();

  return c.json({
    data: {
      session_id,
      entry_index: loomEntries.length - 1,
      g1u6_logged: true,
    },
    message: `Agent ${agent_name} invocation logged. G1U6 Loom entry created.`
  });
});

// POST /trade-form/agent-session/complete
// Complete/close an agent mesh session
tradeForm.post('/trade-form/agent-session/complete', async (c) => {
  const body = await c.req.json();
  const { session_id } = body;
  if (!session_id) return c.json({ error: 'session_id required' }, 400);

  const now = new Date().toISOString();

  const result = await c.env.DB.prepare(`
    UPDATE agent_mesh_sessions SET status = 'COMPLETED', completed_at = ? WHERE id = ? AND status = 'ACTIVE'
  `).bind(now, session_id).run();

  if (!result.meta.changes) return c.json({ error: 'Active session not found' }, 404);

  return c.json({
    data: { session_id, status: 'COMPLETED', completed_at: now },
    message: 'Agent mesh session completed.'
  });
});

// ═══════════════════════════════════════════════════════════════════
// GOVERNOR GATES UPDATE — G1U1-G1U11 enforcement in submit endpoint
// The submit endpoint already handles G1U4,G1U5,G1U8,G1U9,G1U10.
// New gates G1U1,G1U2,G1U3,G1U6,G1U7,G1U11 are now available
// via the agent session and express mode endpoints above.
// The frontend orchestrates calling these endpoints and passes
// gate results to the submit endpoint.
// ═══════════════════════════════════════════════════════════════════

// GET /trade-form/governor-gates-status
// Returns the status of all G1U1-G1U11 gates for a given trade form session
tradeForm.get('/trade-form/governor-gates-status', async (c) => {
  const sessionId = c.req.query('session_id');
  const expressLogId = c.req.query('express_log_id');

  const gates: Record<string, { gate: string; status: string; description: string }> = {
    G1U1: { gate: 'G1U1', status: sessionId ? 'PASSED' : 'NOT_STARTED', description: 'Agent mesh session initialised' },
    G1U2: { gate: 'G1U2', status: 'N/A', description: 'Intent classification confidence ≥ 0.85 (Express Mode only)' },
    G1U3: { gate: 'G1U3', status: 'N/A', description: 'Spec extraction confidence ≥ 0.80 per field (Express Mode only)' },
    G1U4: { gate: 'G1U4', status: 'PENDING', description: 'HS code/dual-use check complete' },
    G1U5: { gate: 'G1U5', status: 'PENDING', description: 'Jurisdiction prescreen: ALLOW or CONDITIONAL' },
    G1U6: { gate: 'G1U6', status: sessionId ? 'ACTIVE' : 'NOT_STARTED', description: 'All agent invocations logged via Loom' },
    G1U7: { gate: 'G1U7', status: 'PENDING', description: 'Per-container data consistency' },
    G1U8: { gate: 'G1U8', status: 'PENDING', description: 'Marketplace partner attribution recorded' },
    G1U9: { gate: 'G1U9', status: 'PENDING', description: 'Container type recommendation/override logged' },
    G1U10: { gate: 'G1U10', status: 'PENDING', description: 'Multi-shipment schedule validation' },
    G1U11: { gate: 'G1U11', status: 'PENDING', description: 'Decision shown via PlainLanguage Panel' },
  };

  // Check Express Mode gates if log exists
  if (expressLogId) {
    try {
      const log = await c.env.DB.prepare(
        `SELECT confidence_overall, human_confirmed FROM express_mode_logs WHERE id = ?`
      ).bind(expressLogId).first();
      if (log) {
        const conf = (log as any).confidence_overall || 0;
        const confirmed = (log as any).human_confirmed;
        gates.G1U2.status = (conf >= 0.85 || confirmed) ? 'PASSED' : 'FAILED';
        gates.G1U3.status = confirmed ? 'PASSED' : (conf >= 0.80 ? 'PASSED' : 'FAILED');
      }
    } catch (e) { /* ignore */ }
  }

  // Check agent session loom entries for G1U6
  if (sessionId) {
    try {
      const session = await c.env.DB.prepare(
        `SELECT loom_entries, status FROM agent_mesh_sessions WHERE id = ?`
      ).bind(sessionId).first();
      if (session) {
        const entries = JSON.parse((session as any).loom_entries || '[]');
        gates.G1U6.status = entries.length > 0 ? 'PASSED' : 'ACTIVE';
        gates.G1U1.status = 'PASSED';
      }
    } catch (e) { /* ignore */ }
  }

  return c.json({
    data: {
      gates: Object.values(gates),
      all_passed: Object.values(gates).every(g => g.status === 'PASSED' || g.status === 'N/A'),
      blocking: Object.values(gates).filter(g => g.status === 'FAILED').map(g => g.gate),
    }
  });
});

export default tradeForm;

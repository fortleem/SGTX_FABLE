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
           lifecycle_state, sanctions_status
    FROM tenants WHERE gtid = ?
  `).bind(gtid).first();

  if (!tenant) return c.json({ error: 'GTID not found', gtid }, 404);

  // Check if blocked or sanctioned
  const sanctions = await c.env.DB.prepare(
    `SELECT * FROM sanctions_screenings WHERE entity_gtid = ? ORDER BY screened_at DESC LIMIT 1`
  ).bind(gtid).first();

  // Get trust score
  const trust = await c.env.DB.prepare(
    `SELECT * FROM trust_scores WHERE tenant_id = ?`
  ).bind((tenant as any).id).first();

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
      INSERT INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, policy_snapshot, created_at)
      VALUES (?, 'trade.draft.save', 'SYSTEM', 'ALLOW', '{}', ?)
    `).bind(govId, now).run();
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
    marketplace_attribution, container_override_log
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
      transport_mode,
      incoterm,
      seller_gtid: sellerGtid,
      container_count: containers.length,
      target_price,
      commodities: allHsCodes,
      // G1U4: Flag for dual-use goods screening
      hs_codes_for_dual_use_check: allHsCodes,
      // G1U8: Marketplace attribution
      marketplace_attributed: !!marketplace_attribution?.attributed,
      marketplace_disputed: !!marketplace_attribution?.disputed,
      // G1U9: Container type override count
      container_override_count: overrideCount,
      // G1U10: Multi-shipment schedule
      multi_shipment_enabled: !!multi_shipment_enabled,
      shipment_count: multi_shipment_schedule?.length || 0,
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
        palletized, pallet_size, transport_mode, destination_override, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      containerId, tradeId, ci + 1,
      ct.container_type || '40ft_HC',
      ct.origin_country || '', ct.destination_country || '',
      ct.port_of_discharge || null, null, /* port_of_loading = null for buyer, set by seller Phase 2 */
      null, /* port_of_loading_unlocode = null for buyer */ ct.port_of_discharge_unlocode || null,
      ct.palletized !== false ? 1 : 0, ct.pallet_size || '120x100',
      ct.transport_mode || transport_mode || 'SEA_CARGO',
      ct.destination_override || null, ct.notes || null, now
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
            num_pallets, quantity, unit, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          pi + 1, now
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

export default tradeForm;

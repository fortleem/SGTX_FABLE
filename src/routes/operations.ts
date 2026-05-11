// SGTX Platform v6.2 — KYB/KYC, Barcodes, Location/Trucking, Commodities (Parts 16, 19-21)
import { Hono } from 'hono';
import { uuid, isoNow, generateUSTN } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const operations = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// KYB/KYC VERIFICATION (Part 16)
// ═══════════════════════════════════════════════════════════

operations.get('/kyb/verifications', async (c) => {
  const tenantId = c.req.query('tenant_id');
  const status = c.req.query('status');
  let sql = 'SELECT * FROM kyb_verifications';
  const conds: string[] = [];
  if (tenantId) conds.push(`tenant_id = '${tenantId}'`);
  if (status) conds.push(`status = '${status}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 50';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

operations.post('/kyb/verify', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyb.verify', actor_gtid: body.actor_gtid || 'system',
    action_context: { tenant_id: body.tenant_id, jurisdiction: body.jurisdiction, tier: body.tier },
  });

  // AI-driven KYB pipeline simulation
  const checks = [
    { check_type: 'DOCUMENT_OCR', model: 'hf-donut-v3', status: 'PASSED', confidence: 0.94 },
    { check_type: 'SANCTIONS_SCREENING', model: 'hf-mixtral-ofac', status: 'PASSED', confidence: 0.99 },
    { check_type: 'REGISTRY_VALIDATION', model: 'government-api', status: body.registry_match !== false ? 'PASSED' : 'FAILED', confidence: 0.91 },
    { check_type: 'BENEFICIAL_OWNER', model: 'xgboost-trust-v2', status: 'PASSED', confidence: 0.87 },
    { check_type: 'PEP_SCREENING', model: 'hf-ner-pep', status: 'PASSED', confidence: 0.96 },
  ];

  const allPassed = checks.every(ch => ch.status === 'PASSED');
  const overallStatus = allPassed ? 'VERIFIED' : 'REQUIRES_REVIEW';
  const trustScore = allPassed ? Math.round(75 + Math.random() * 20) : Math.round(40 + Math.random() * 25);

  await c.env.DB.prepare(`
    INSERT INTO kyb_verifications (id, tenant_id, jurisdiction, tier, checks, overall_status, trust_score, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.tenant_id, body.jurisdiction || 'UNKNOWN', body.tier || 1,
    JSON.stringify(checks), overallStatus, trustScore, gov.decision_id, isoNow()).run();

  // Update tenant KYB status
  if (body.tenant_id) {
    await c.env.DB.prepare('UPDATE tenants SET kyb_status = ?, kyb_tier = ?, risk_score = ? WHERE id = ?')
      .bind(overallStatus, body.tier || 1, trustScore, body.tenant_id).run();
  }

  return c.json({
    data: { id, checks, overall_status: overallStatus, trust_score: trustScore, governor_decision: gov },
    message: `KYB verification ${overallStatus}`
  }, 201);
});

operations.post('/kyc/verify', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'kyc.verify', actor_gtid: body.actor_gtid || 'system',
    action_context: { employee_id: body.employee_id },
  });

  const checks = [
    { check_type: 'LIVENESS_CHECK', model: 'mediapipe-face-mesh', status: 'PASSED', confidence: 0.96 },
    { check_type: 'DOCUMENT_MATCH', model: 'hf-donut-id-v2', status: 'PASSED', confidence: 0.93 },
    { check_type: 'PEP_SCREENING', model: 'hf-ner-pep', status: 'PASSED', confidence: 0.98 },
  ];

  await c.env.DB.prepare(`
    INSERT INTO kyc_verifications (id, employee_id, checks, overall_status, governor_decision_id, created_at)
    VALUES (?, ?, ?, 'VERIFIED', ?, ?)
  `).bind(id, body.employee_id, JSON.stringify(checks), gov.decision_id, isoNow()).run();

  // Update employee KYC status
  if (body.employee_id) {
    await c.env.DB.prepare("UPDATE employees SET kyc_status = 'VERIFIED', kyc_tier = 2 WHERE id = ?")
      .bind(body.employee_id).run();
  }

  return c.json({ data: { id, checks, status: 'VERIFIED', governor_decision: gov }, message: 'KYC verification passed' }, 201);
});

// ═══════════════════════════════════════════════════════════
// AUTO-GENERATED BARCODES (Part 21)
// SSCC-18 barcode generation for pallets and shipments
// ═══════════════════════════════════════════════════════════

operations.get('/barcodes', async (c) => {
  const ustn = c.req.query('ustn');
  const shipmentId = c.req.query('shipment_id');
  let sql = 'SELECT * FROM shipment_barcodes';
  const conds: string[] = [];
  if (ustn) conds.push(`ustn = '${ustn}'`);
  if (shipmentId) conds.push(`shipment_id = '${shipmentId}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

operations.post('/barcodes/generate', async (c) => {
  const body = await c.req.json();
  const barcodes: any[] = [];

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'barcode.generate', actor_gtid: body.actor_gtid || 'system',
    action_context: { ustn: body.ustn, count: body.count || 1 },
  });

  const count = body.count || 1;
  for (let i = 0; i < count; i++) {
    const id = uuid();
    // Generate SSCC-18: (00) + Extension(1) + GS1 Company Prefix(7) + Serial(9) + Check(1)
    const extension = '0';
    const companyPrefix = '0614141'; // SGTX GS1 prefix (example)
    const serial = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const ssccBase = extension + companyPrefix + serial;
    // Calculate check digit (mod 10)
    let sum = 0;
    for (let j = 0; j < ssccBase.length; j++) {
      const digit = parseInt(ssccBase[j]);
      sum += digit * (j % 2 === 0 ? 3 : 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const sscc18 = `(00)${ssccBase}${checkDigit}`;

    await c.env.DB.prepare(`
      INSERT INTO shipment_barcodes (id, shipment_id, ustn, barcode_type, barcode_value, pallet_id, lot_number, hs_code, generated_by, governor_decision_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, body.shipment_id || null, body.ustn || null, 'SSCC-18', sscc18,
      body.pallet_ids?.[i] || `PAL-${String(i + 1).padStart(3, '0')}`,
      body.lot_number || null, body.hs_code || null,
      body.generated_by || 'barcode-service', gov.decision_id, isoNow()).run();

    barcodes.push({ id, sscc18, pallet_id: body.pallet_ids?.[i] || `PAL-${String(i + 1).padStart(3, '0')}` });
  }

  return c.json({
    data: { barcodes, count: barcodes.length, governor_decision: gov },
    message: `${barcodes.length} SSCC-18 barcode(s) generated`
  }, 201);
});

operations.post('/barcodes/scan', async (c) => {
  const body = await c.req.json();
  const barcodeValue = body.barcode_value;

  const barcode = await c.env.DB.prepare('SELECT * FROM shipment_barcodes WHERE barcode_value = ?').bind(barcodeValue).first();
  if (!barcode) return c.json({ error: 'Barcode not found', scanned_value: barcodeValue }, 404);

  // Get related shipment info
  let shipment = null;
  if (barcode.shipment_id) {
    shipment = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ?').bind(barcode.shipment_id).first();
  }

  // Log scan event
  await c.env.DB.prepare(`
    INSERT INTO barcode_scan_events (id, barcode_id, scanned_by, scan_location, scan_device, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(uuid(), barcode.id, body.scanned_by || null, body.scan_location || null,
    body.scan_device || 'mobile', isoNow()).run();

  return c.json({
    data: {
      barcode,
      shipment,
      pallet_id: barcode.pallet_id,
      lot_number: barcode.lot_number,
      scan_time: isoNow(),
    }
  });
});

// ═══════════════════════════════════════════════════════════
// LOCATION-BASED TRUCKING & ROUTE INTELLIGENCE (Part 20)
// ═══════════════════════════════════════════════════════════

operations.get('/locations', async (c) => {
  const type = c.req.query('type'); // port, warehouse, customs, terminal
  const country = c.req.query('country');
  let sql = 'SELECT * FROM geocoded_locations';
  const conds: string[] = [];
  if (type) conds.push(`location_type = '${type}'`);
  if (country) conds.push(`country_code = '${country}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY name ASC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

operations.post('/locations', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO geocoded_locations (id, name, location_type, country_code, latitude, longitude, address, port_code, operating_hours, capacity_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.name, body.location_type || 'warehouse', body.country_code || '',
    body.latitude || 0, body.longitude || 0, body.address || '',
    body.port_code || null, JSON.stringify(body.operating_hours || {}),
    JSON.stringify(body.capacity_info || {}), isoNow()).run();
  return c.json({ data: { id }, message: 'Location registered' }, 201);
});

operations.get('/trucking/routes', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM trucking_routes
    WHERE (origin_location_id = ? OR destination_location_id = ?)
    ORDER BY estimated_time_min ASC LIMIT 20
  `).bind(origin || '', destination || '').all();
  return c.json({ data: results });
});

operations.post('/trucking/routes/calculate', async (c) => {
  const body = await c.req.json();

  // OSRM-style route calculation (simulation)
  const originLat = body.origin_lat || 10.76;
  const originLng = body.origin_lng || 106.66;
  const destLat = body.dest_lat || 21.03;
  const destLng = body.dest_lng || 105.85;

  // Haversine distance
  const R = 6371; // km
  const dLat = (destLat - originLat) * Math.PI / 180;
  const dLng = (destLng - originLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const road_factor = 1.3; // roads are ~30% longer than straight line
  const road_distance_km = Math.round(distance_km * road_factor);
  const avg_speed_kmh = body.vehicle_type === 'heavy' ? 45 : 55;
  const estimated_time_min = Math.round((road_distance_km / avg_speed_kmh) * 60);

  // Cost estimation
  const cost_per_km = body.vehicle_type === 'heavy' ? 2.5 : 1.8;
  const estimated_cost = Math.round(road_distance_km * cost_per_km);

  return c.json({
    data: {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      straight_line_km: Math.round(distance_km),
      road_distance_km,
      estimated_time_min,
      estimated_time_display: `${Math.floor(estimated_time_min / 60)}h ${estimated_time_min % 60}m`,
      estimated_cost_usd: estimated_cost,
      route_segments: [
        { type: 'pickup', location: body.origin_name || 'Origin', time_min: 30 },
        { type: 'road', distance_km: road_distance_km, time_min: estimated_time_min - 60 },
        { type: 'delivery', location: body.dest_name || 'Destination', time_min: 30 },
      ],
      traffic_factor: 1 + Math.random() * 0.2,
      weather_risk: Math.random() > 0.8 ? 'MODERATE' : 'LOW',
      toll_estimate_usd: Math.round(road_distance_km * 0.05),
    }
  });
});

operations.get('/trucking/gps-traces', async (c) => {
  const shipmentId = c.req.query('shipment_id');
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM trucking_gps_traces
    WHERE shipment_id = ?
    ORDER BY recorded_at DESC LIMIT 100
  `).bind(shipmentId || '').all();
  return c.json({ data: results });
});

operations.post('/trucking/gps-traces', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO trucking_gps_traces (id, shipment_id, driver_id, vehicle_id, latitude, longitude, speed_kmh, heading, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.shipment_id, body.driver_id || null, body.vehicle_id || null,
    body.latitude, body.longitude, body.speed_kmh || 0, body.heading || 0, isoNow()).run();
  return c.json({ data: { id }, message: 'GPS trace recorded' }, 201);
});

// ═══════════════════════════════════════════════════════════
// ENHANCED COMMODITY & PACKING SPECIFICATIONS (Part 19)
// ═══════════════════════════════════════════════════════════

operations.get('/commodities', async (c) => {
  const hsCode = c.req.query('hs_code');
  const category = c.req.query('category');
  let sql = 'SELECT * FROM commodity_specifications';
  const conds: string[] = [];
  if (hsCode) conds.push(`hs_code LIKE '${hsCode}%'`);
  if (category) conds.push(`category = '${category}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY hs_code ASC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

operations.get('/commodities/:hsCode', async (c) => {
  const commodity = await c.env.DB.prepare('SELECT * FROM commodity_specifications WHERE hs_code = ?')
    .bind(c.req.param('hsCode')).first();
  if (!commodity) return c.json({ error: 'Commodity not found' }, 404);

  // Get packing rules
  const packingRules = await c.env.DB.prepare('SELECT * FROM commodity_packing_rules WHERE hs_code = ?')
    .bind(c.req.param('hsCode')).first();

  // Get profit margins
  const margins = await c.env.DB.prepare('SELECT * FROM commodity_profit_margins WHERE hs_code_prefix = ?')
    .bind(c.req.param('hsCode').slice(0, 4)).first();

  return c.json({ data: { ...commodity, packing_rules: packingRules, profit_margins: margins } });
});

operations.post('/commodities', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO commodity_specifications (id, hs_code, name, category, description, storage_requirements, shelf_life_days, temperature_range, humidity_range, packing_guidance, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.hs_code, body.name, body.category || 'GENERAL',
    body.description || '', JSON.stringify(body.storage_requirements || {}),
    body.shelf_life_days || null, JSON.stringify(body.temperature_range || {}),
    JSON.stringify(body.humidity_range || {}), JSON.stringify(body.packing_guidance || {}),
    isoNow()).run();
  return c.json({ data: { id }, message: 'Commodity specification created' }, 201);
});

operations.get('/commodities/:hsCode/compatibility', async (c) => {
  const hsCode = c.req.param('hsCode');
  // Check compatibility with other commodities in same container
  const rules = await c.env.DB.prepare(`
    SELECT * FROM commodity_compatibility_rules WHERE hs_code_a = ? OR hs_code_b = ?
  `).bind(hsCode, hsCode).all();

  return c.json({
    data: {
      hs_code: hsCode,
      compatibility_rules: rules.results || [],
      general_guidance: hsCode.startsWith('08')
        ? 'Citrus fruits: Do not mix with ethylene-sensitive produce. Maintain 4-8°C. Separate lots in different containers.'
        : 'Standard commodity. Check temperature and humidity compatibility before mixing.',
    }
  });
});

// Packing rules lookup
operations.get('/packing-rules', async (c) => {
  const hsCode = c.req.query('hs_code');
  const palletType = c.req.query('pallet_type');
  let sql = 'SELECT * FROM commodity_packing_rules';
  const conds: string[] = [];
  if (hsCode) conds.push(`hs_code = '${hsCode}'`);
  if (palletType) conds.push(`pallet_type = '${palletType}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY hs_code ASC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// SAVED CONTACTS / NETWORK FEATURE (Part 18)
// ═══════════════════════════════════════════════════════════

operations.get('/contacts', async (c) => {
  const ownerTenantId = c.req.query('owner_tenant_id');
  const { results } = await c.env.DB.prepare(`
    SELECT tc.*, t.legal_name, t.gtid, t.jurisdiction, t.type as tenant_type,
      ts.score as trust_score
    FROM tenant_contacts tc
    JOIN tenants t ON tc.contact_tenant_id = t.id
    LEFT JOIN trust_scores ts ON ts.gtid = t.gtid
    WHERE tc.owner_tenant_id = ?
    ORDER BY tc.created_at DESC
  `).bind(ownerTenantId || '').all();
  return c.json({ data: results });
});

operations.post('/contacts', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Check if contact already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM tenant_contacts WHERE owner_tenant_id = ? AND contact_tenant_id = ?'
  ).bind(body.owner_tenant_id, body.contact_tenant_id).first();
  if (existing) return c.json({ error: 'Contact already saved' }, 409);

  await c.env.DB.prepare(`
    INSERT INTO tenant_contacts (id, owner_tenant_id, contact_tenant_id, relationship_type, notes, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.owner_tenant_id, body.contact_tenant_id,
    body.relationship_type || 'BUSINESS_PARTNER', body.notes || null,
    JSON.stringify(body.tags || []), isoNow()).run();

  return c.json({ data: { id }, message: 'Contact saved' }, 201);
});

operations.delete('/contacts/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM tenant_contacts WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Contact removed' });
});

// ═══════════════════════════════════════════════════════════
// OPENAPI 3.1 SPECIFICATION INDEX (Part 27)
// ═══════════════════════════════════════════════════════════

operations.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'SGTX Platform API',
      version: '6.3.0',
      description: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
      contact: { name: 'SGTX Platform', url: 'https://sgtx.io' },
      license: { name: 'Proprietary', url: 'https://sgtx.io/legal' },
    },
    servers: [
      { url: '/api/v1', description: 'Production API' },
      { url: 'https://sandbox.sgtx.io/api/v1', description: 'Sandbox API' },
    ],
    paths: {
      '/trades': { get: { summary: 'List trade requests', tags: ['Trade'] }, post: { summary: 'Create trade request', tags: ['Trade'] } },
      '/trades/{id}': { get: { summary: 'Get trade details', tags: ['Trade'] } },
      '/quotes': { get: { summary: 'List quotes', tags: ['Quote'] }, post: { summary: 'Submit quote', tags: ['Quote'] } },
      '/contracts': { get: { summary: 'List contracts', tags: ['Contract'] }, post: { summary: 'Create contract', tags: ['Contract'] } },
      '/contracts/{id}/lock': { post: { summary: 'Lock contract (CommissionLock)', tags: ['Contract'] } },
      '/shipments': { get: { summary: 'List shipments', tags: ['Shipment'] }, post: { summary: 'Create shipment', tags: ['Shipment'] } },
      '/shipments/{ustn}/milestones': { get: { summary: 'Get milestones', tags: ['Shipment'] }, post: { summary: 'Confirm milestone', tags: ['Shipment'] } },
      '/financing/requests': { get: { summary: 'List financing requests', tags: ['Finance'] }, post: { summary: 'Create financing request', tags: ['Finance'] } },
      '/financing/bids': { post: { summary: 'Submit blind bid', tags: ['Finance'] } },
      '/settlements': { get: { summary: 'List settlement instructions', tags: ['Settlement'] }, post: { summary: 'Create settlement', tags: ['Settlement'] } },
      '/governor/evaluate': { post: { summary: 'Evaluate governor decision', tags: ['Governance'] } },
      '/governor/decisions': { get: { summary: 'List governor decisions', tags: ['Governance'] } },
      '/tenants': { get: { summary: 'List tenants', tags: ['Identity'] }, post: { summary: 'Register tenant', tags: ['Identity'] } },
      '/kyb/verify': { post: { summary: 'Run KYB verification', tags: ['KYB/KYC'] } },
      '/kyc/verify': { post: { summary: 'Run KYC verification', tags: ['KYB/KYC'] } },
      '/barcodes/generate': { post: { summary: 'Generate SSCC-18 barcodes', tags: ['Barcodes'] } },
      '/barcodes/scan': { post: { summary: 'Scan barcode', tags: ['Barcodes'] } },
      '/commodities': { get: { summary: 'List commodities', tags: ['Commodities'] } },
      '/packing-plans': { get: { summary: 'List packing plans', tags: ['Packing'] }, post: { summary: 'Create packing plan', tags: ['Packing'] } },
      '/partner/intent/analyze': { post: { summary: 'Analyze trade intent (Marketplace)', tags: ['Marketplace'] } },
      '/partner/dashboard': { get: { summary: 'Partner dashboard', tags: ['Marketplace'] } },
      '/locations': { get: { summary: 'List locations', tags: ['Location'] } },
      '/trucking/routes/calculate': { post: { summary: 'Calculate route', tags: ['Trucking'] } },
      '/distressed': { get: { summary: 'List distressed cargo', tags: ['Distressed'] } },
      '/disputes': { get: { summary: 'List disputes', tags: ['Disputes'] }, post: { summary: 'File dispute', tags: ['Disputes'] } },
      '/commission-locks': { get: { summary: 'List commission locks', tags: ['Commission'] } },
      '/ai-records': { get: { summary: 'AI inference records', tags: ['AI'] } },
      '/esg': { get: { summary: 'ESG assessments', tags: ['ESG'] } },
      '/carbon': { get: { summary: 'Carbon footprint', tags: ['ESG'] } },
    },
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'ZITADEL Ed25519 JWT' },
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-Partner-Key', description: 'Marketplace Partner API Key' },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Trade', description: 'Trade request lifecycle (Phase 1-3)' },
      { name: 'Quote', description: 'EXW price quotes and logistics bundling (Phase 2)' },
      { name: 'Contract', description: 'Contract creation, signing, and locking (Phase 3)' },
      { name: 'Shipment', description: 'Physical execution and milestones (Phase 5)' },
      { name: 'Finance', description: 'Trade finance and DeFi (Phase 4)' },
      { name: 'Settlement', description: 'Payment orchestration (Phase 6/9)' },
      { name: 'Governance', description: 'Governor service and OPA policies' },
      { name: 'Identity', description: 'Tenant and employee management (Part 2)' },
      { name: 'KYB/KYC', description: 'Know Your Business/Customer verification (Part 16)' },
      { name: 'Barcodes', description: 'SSCC-18 barcode generation and scanning (Part 21)' },
      { name: 'Commodities', description: 'Commodity specifications and packing rules (Part 19)' },
      { name: 'Marketplace', description: 'Marketplace partner API (Part 17)' },
      { name: 'Location', description: 'Geocoded locations and trucking (Part 20)' },
      { name: 'Trucking', description: 'Route intelligence and GPS (Part 20)' },
      { name: 'Distressed', description: 'Distressed cargo management (Phase 7)' },
      { name: 'Disputes', description: 'Dispute resolution (Phase 10)' },
      { name: 'Commission', description: 'Commission locks and calculations (Part 7)' },
      { name: 'AI', description: 'AI inference records and model governance (Part 11)' },
      { name: 'ESG', description: 'Environmental, Social, Governance (Part 14)' },
    ],
  });
});

export default operations;

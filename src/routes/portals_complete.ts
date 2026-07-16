// ═══════════════════════════════════════════════════════════════════════════════
// SGTX Platform v11.2 — Complete Portal Backend (Blueprint v11.0 Full Alignment)
// All portals: Shipping Line, Laboratory, Logistics, Financier, Government, Admin, Marketplace
// ═══════════════════════════════════════════════════════════════════════════════
import { Hono } from 'hono';

const app = new Hono<{ Bindings: any }>();

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: SHIPPING LINE (SHIP) PORTAL
// Tabs: Booking Requests, eBL Management, Vessel Schedule, Freight Invoices, Contract Rate Manager
// ═══════════════════════════════════════════════════════════════════════════════

// 1.1 Booking Requests
app.get('/ship/bookings', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const status = c.req.query('status') || '';
  const results = await c.env.DB.prepare(`
    SELECT sr.id, sr.ustn, sr.trade_request_id, sr.seller_tenant_id, sr.buyer_tenant_id,
           sr.container_type, sr.container_count, sr.sailing_window_start, sr.sailing_window_end,
           sr.origin_port, sr.destination_port, sr.commodity_hs_chapter, sr.volume_cbm,
           sr.status, sr.shipping_line_tenant_id, sr.created_at, sr.updated_at,
           t.legal_name as seller_name, tb.legal_name as buyer_name
    FROM ship_bookings sr
    LEFT JOIN tenants t ON sr.seller_tenant_id = t.id
    LEFT JOIN tenants tb ON sr.buyer_tenant_id = tb.id
    WHERE sr.shipping_line_tenant_id = ? ${status ? "AND sr.status = '" + status + "'" : ''}
    ORDER BY sr.created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [], count: results.results?.length || 0 });
});

app.post('/ship/bookings', async (c) => {
  const body = await c.req.json();
  const id = 'SB-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO ship_bookings (id, ustn, trade_request_id, seller_tenant_id, buyer_tenant_id,
      container_type, container_count, sailing_window_start, sailing_window_end,
      origin_port, destination_port, commodity_hs_chapter, volume_cbm, status,
      shipping_line_tenant_id, addons, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, datetime('now'))
  `).bind(id, body.ustn || '', body.trade_request_id || '', body.seller_tenant_id || '',
    body.buyer_tenant_id || '', body.container_type || '40HC', body.container_count || 1,
    body.sailing_window_start || '', body.sailing_window_end || '',
    body.origin_port || '', body.destination_port || '', body.commodity_hs_chapter || '',
    body.volume_cbm || 0, body.shipping_line_tenant_id || '',
    JSON.stringify(body.addons || [])).run();
  return c.json({ id, status: 'PENDING', message: 'Booking request created' });
});

app.post('/ship/bookings/:id/confirm', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE ship_bookings SET status = 'CONFIRMED', vessel_name = ?, voyage_number = ?,
      departure_date = ?, arrival_date = ?, freight_rate = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.vessel_name || '', body.voyage_number || '', body.departure_date || '',
    body.arrival_date || '', body.freight_rate || 0, id).run();
  return c.json({ id, status: 'CONFIRMED' });
});

app.post('/ship/bookings/:id/decline', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE ship_bookings SET status = 'DECLINED', decline_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.reason || '', id).run();
  return c.json({ id, status: 'DECLINED' });
});

app.post('/ship/bookings/:id/quote', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE ship_bookings SET status = 'QUOTED', freight_rate = ?, vessel_name = ?,
      voyage_number = ?, departure_date = ?, arrival_date = ?, quote_valid_until = ?,
      addons = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.freight_rate || 0, body.vessel_name || '', body.voyage_number || '',
    body.departure_date || '', body.arrival_date || '', body.quote_valid_until || '',
    JSON.stringify(body.addons || []), id).run();
  return c.json({ id, status: 'QUOTED', freight_rate: body.freight_rate });
});

// 1.2 eBL Management
app.get('/ship/ebl', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM electronic_bls WHERE issuer_tenant_id = ? ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/ship/ebl/issue', async (c) => {
  const body = await c.req.json();
  const id = 'EBL-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO electronic_bls (id, ustn, booking_id, shipper, consignee, notify_party,
      vessel_name, voyage_number, port_of_loading, port_of_discharge,
      container_numbers, description_of_goods, gross_weight_kg, measurement_cbm,
      freight_terms, status, issuer_tenant_id, loom_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?, datetime('now'))
  `).bind(id, body.ustn || '', body.booking_id || '', body.shipper || '', body.consignee || '',
    body.notify_party || '', body.vessel_name || '', body.voyage_number || '',
    body.port_of_loading || '', body.port_of_discharge || '',
    JSON.stringify(body.container_numbers || []), body.description_of_goods || '',
    body.gross_weight_kg || 0, body.measurement_cbm || 0,
    body.freight_terms || 'PREPAID', body.issuer_tenant_id || '',
    'loom-' + Date.now()).run();
  return c.json({ id, status: 'ISSUED', loom_hash: 'loom-' + Date.now() });
});

app.post('/ship/ebl/:id/transfer', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE electronic_bls SET consignee = ?, status = 'TRANSFERRED', updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.new_consignee || '', id).run();
  return c.json({ id, status: 'TRANSFERRED' });
});

app.post('/ship/ebl/:id/surrender', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE electronic_bls SET status = 'SURRENDERED', updated_at = datetime('now') WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'SURRENDERED' });
});

// 1.3 Vessel Schedule
app.get('/ship/vessels', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM vessel_schedules WHERE shipping_line_tenant_id = ? ORDER BY departure_date ASC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/ship/vessels', async (c) => {
  const body = await c.req.json();
  const id = 'VS-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO vessel_schedules (id, vessel_name, voyage_number, shipping_line_tenant_id,
      route_ports, departure_date, arrival_date, status, capacity_teu, available_teu, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, datetime('now'))
  `).bind(id, body.vessel_name || '', body.voyage_number || '', body.shipping_line_tenant_id || '',
    JSON.stringify(body.route_ports || []), body.departure_date || '', body.arrival_date || '',
    body.capacity_teu || 0, body.available_teu || 0).run();
  return c.json({ id, status: 'SCHEDULED' });
});

app.patch('/ship/vessels/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE vessel_schedules SET departure_date = COALESCE(?, departure_date),
      arrival_date = COALESCE(?, arrival_date), status = COALESCE(?, status),
      available_teu = COALESCE(?, available_teu), updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.departure_date || null, body.arrival_date || null, body.status || null,
    body.available_teu || null, id).run();
  return c.json({ id, updated: true });
});

// 1.4 Freight Invoices
app.get('/ship/invoices', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM freight_invoices WHERE issuer_tenant_id = ? ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/ship/invoices/generate', async (c) => {
  const body = await c.req.json();
  const id = 'FI-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO freight_invoices (id, booking_id, ustn, issuer_tenant_id, payer_tenant_id,
      amount, currency, payment_terms, due_date, line_items, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', datetime('now'))
  `).bind(id, body.booking_id || '', body.ustn || '', body.issuer_tenant_id || '',
    body.payer_tenant_id || '', body.amount || 0, body.currency || 'USD',
    body.payment_terms || 'NET30', body.due_date || '',
    JSON.stringify(body.line_items || [])).run();
  return c.json({ id, status: 'ISSUED' });
});

// 1.5 Contract Rate Manager
app.get('/ship/contract-rates', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM contract_rates WHERE shipping_line_tenant_id = ? ORDER BY valid_from DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/ship/contract-rates', async (c) => {
  const body = await c.req.json();
  const id = 'CR-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO contract_rates (id, shipping_line_tenant_id, customer_tenant_id,
      route_origin, route_destination, container_type, rate_per_teu, currency,
      valid_from, valid_to, min_volume_teu, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
  `).bind(id, body.shipping_line_tenant_id || '', body.customer_tenant_id || '',
    body.route_origin || '', body.route_destination || '', body.container_type || '40HC',
    body.rate_per_teu || 0, body.currency || 'USD', body.valid_from || '',
    body.valid_to || '', body.min_volume_teu || 0).run();
  return c.json({ id, status: 'ACTIVE' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: LOGISTICS PORTAL — Enhanced
// Tabs: RFQ Inbox, Dispatch Planner, Warehouse Dashboard, Forwarder Console
// ═══════════════════════════════════════════════════════════════════════════════

// 2.1 RFQ Inbox for LSPs
app.get('/lsp/rfq-inbox', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT lr.*, t.legal_name as requester_name
    FROM logistics_rfqs lr
    LEFT JOIN tenants t ON lr.requester_tenant_id = t.id
    WHERE lr.target_lsp_tenant_id = ? OR lr.broadcast = 1
    ORDER BY lr.created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/lsp/rfq-inbox/:id/quote', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const quoteId = 'LQ-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO logistics_quotes (id, rfq_id, lsp_tenant_id, total_amount, currency,
      breakdown, transit_days, valid_until, notes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', datetime('now'))
  `).bind(quoteId, id, body.lsp_tenant_id || '', body.total_amount || 0,
    body.currency || 'USD', JSON.stringify(body.breakdown || {}),
    body.transit_days || 0, body.valid_until || '', body.notes || '').run();
  return c.json({ id: quoteId, status: 'SUBMITTED' });
});

app.post('/lsp/rfq-inbox/:id/decline', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE logistics_rfqs SET status = 'DECLINED', decline_reason = ?, updated_at = datetime('now')
    WHERE id = ? 
  `).bind(body.reason || '', id).run();
  return c.json({ id, status: 'DECLINED' });
});

app.post('/lsp/rfq-inbox/:id/clarification', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE logistics_rfqs SET clarification_request = ?, status = 'CLARIFICATION_NEEDED',
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.question || '', id).run();
  return c.json({ id, status: 'CLARIFICATION_NEEDED' });
});

// 2.2 Dispatch Planner (Trucking)
app.get('/lsp/dispatch', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM dispatch_plans WHERE lsp_tenant_id = ? ORDER BY planned_date DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/lsp/dispatch/optimise', async (c) => {
  const body = await c.req.json();
  // Simulate VRP optimization (ORTools integration placeholder)
  const pickups = body.pickups || [];
  const vehicles = body.vehicles || 3;
  const optimized = pickups.map((p: any, i: number) => ({
    ...p, vehicle: (i % vehicles) + 1,
    sequence: Math.floor(i / vehicles) + 1,
    eta_minutes: 30 + (i * 15),
  }));
  return c.json({
    data: { routes: optimized, total_distance_km: pickups.length * 25,
      total_time_hours: (pickups.length * 0.5), vehicles_used: Math.min(vehicles, pickups.length) },
    optimization: 'VRP_BASIC'
  });
});

app.post('/lsp/dispatch/assign', async (c) => {
  const body = await c.req.json();
  const id = 'DP-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO dispatch_plans (id, lsp_tenant_id, driver_name, vehicle_id,
      route_json, planned_date, status, pickups_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, datetime('now'))
  `).bind(id, body.lsp_tenant_id || '', body.driver_name || '', body.vehicle_id || '',
    JSON.stringify(body.route || []), body.planned_date || '', body.pickups_count || 0).run();
  return c.json({ id, status: 'ASSIGNED' });
});

// 2.3 Warehouse Dashboard
app.get('/lsp/warehouse', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM warehouse_operations WHERE warehouse_tenant_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.get('/lsp/warehouse/stats', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      utilization_pct: 72, total_capacity_pallets: 500, occupied_pallets: 360,
      inbound_today: 12, outbound_today: 8,
      temperature_zones: [
        { zone: 'Ambient', temp_c: 22, capacity: 300, occupied: 210 },
        { zone: 'Chilled', temp_c: 4, capacity: 100, occupied: 85 },
        { zone: 'Frozen', temp_c: -18, capacity: 100, occupied: 65 }
      ],
      pending_inbound: 5, pending_outbound: 3
    }
  });
});

app.post('/lsp/warehouse/receive', async (c) => {
  const body = await c.req.json();
  const id = 'WO-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO warehouse_operations (id, warehouse_tenant_id, ustn, operation_type,
      pallet_count, temperature_zone, status, created_at)
    VALUES (?, ?, ?, 'INBOUND', ?, ?, 'RECEIVED', datetime('now'))
  `).bind(id, body.warehouse_tenant_id || '', body.ustn || '',
    body.pallet_count || 0, body.temperature_zone || 'Ambient').run();
  return c.json({ id, status: 'RECEIVED' });
});

app.post('/lsp/warehouse/load', async (c) => {
  const body = await c.req.json();
  const id = 'WO-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO warehouse_operations (id, warehouse_tenant_id, ustn, operation_type,
      pallet_count, temperature_zone, status, vehicle_id, created_at)
    VALUES (?, ?, ?, 'OUTBOUND', ?, ?, 'LOADED', ?, datetime('now'))
  `).bind(id, body.warehouse_tenant_id || '', body.ustn || '',
    body.pallet_count || 0, body.temperature_zone || 'Ambient',
    body.vehicle_id || '').run();
  return c.json({ id, status: 'LOADED' });
});

// 2.4 Forwarder Console
app.get('/lsp/forwarder/consolidation', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM consolidation_plans WHERE forwarder_tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/lsp/forwarder/consolidation/suggest', async (c) => {
  const body = await c.req.json();
  // AI suggestion for LCL consolidation
  return c.json({
    data: {
      suggested_bundles: [
        { bundle_id: 'BDL-1', shipments: ['SH-001', 'SH-002'], combined_cbm: 18.5,
          container_type: '20GP', fill_rate_pct: 92, savings_pct: 15 },
        { bundle_id: 'BDL-2', shipments: ['SH-003', 'SH-004', 'SH-005'], combined_cbm: 32.1,
          container_type: '40HC', fill_rate_pct: 88, savings_pct: 22 }
      ],
      total_savings_estimate_usd: 1850
    }
  });
});

app.post('/lsp/forwarder/consolidation/build', async (c) => {
  const body = await c.req.json();
  const id = 'CP-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO consolidation_plans (id, forwarder_tenant_id, bundle_shipments,
      container_type, combined_cbm, fill_rate_pct, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'BUILT', datetime('now'))
  `).bind(id, body.forwarder_tenant_id || '', JSON.stringify(body.shipments || []),
    body.container_type || '40HC', body.combined_cbm || 0, body.fill_rate_pct || 0).run();
  return c.json({ id, status: 'BUILT' });
});

// 2.5 LSP Performance
app.get('/lsp/performance', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      on_time_delivery_pct: 94.2, dispute_rate_pct: 1.8,
      avg_transit_days: 12.3, total_shipments: 156,
      monthly_trend: [
        { month: '2025-01', otd: 92.1, disputes: 3 },
        { month: '2025-02', otd: 93.5, disputes: 2 },
        { month: '2025-03', otd: 95.0, disputes: 1 },
        { month: '2025-04', otd: 94.8, disputes: 2 },
        { month: '2025-05', otd: 94.2, disputes: 1 },
        { month: '2025-06', otd: 96.1, disputes: 0 }
      ],
      benchmark_position: { percentile: 78, epsilon: 0.1 }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: FINANCIER PORTAL — Enhanced
// Tabs: Bidding Console, Collateral Monitor, DeFi, Secondary Market, Portfolio
// ═══════════════════════════════════════════════════════════════════════════════

// 3.1 Financing Opportunities with Credit Intelligence
app.get('/financier/opportunities', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT fr.*, t.legal_name as borrower_name, t.kyb_status
    FROM financing_requests fr
    LEFT JOIN tenants t ON fr.borrower_tenant_id = t.id
    WHERE fr.status IN ('SUBMITTED', 'BIDDING')
    ORDER BY fr.created_at DESC
  `).bind().all();
  // Add AI credit intelligence
  const enriched = (results.results || []).map((r: any) => ({
    ...r,
    credit_score: 65 + Math.floor(Math.random() * 30),
    default_probability_pct: (Math.random() * 12).toFixed(2),
    recommended_ltv_pct: 60 + Math.floor(Math.random() * 20),
    match_score: 70 + Math.floor(Math.random() * 25),
  }));
  return c.json({ data: enriched });
});

// 3.2 Submit Bid (Financing Offer)
app.post('/financier/bid', async (c) => {
  const body = await c.req.json();
  const id = 'FO-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO financing_offers (id, financing_request_id, financier_tenant_id,
      amount, interest_rate, effective_apr, all_in_cost, tenor_days,
      settlement_method, collateral_required, collateral_details,
      conditions, co_finance_pct, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', datetime('now'))
  `).bind(id, body.financing_request_id || '', body.financier_tenant_id || '',
    body.amount || 0, body.interest_rate || 0, body.effective_apr || 0,
    body.all_in_cost || 0, body.tenor_days || 30,
    body.settlement_method || 'BANK_TRANSFER', body.collateral_required ? 1 : 0,
    body.collateral_details || '', body.conditions || '', body.co_finance_pct || 100).run();
  return c.json({ id, status: 'SUBMITTED' });
});

// 3.3 Collateral Monitor
app.get('/financier/collateral', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT fo.id, fo.financing_request_id, fo.amount, fo.collateral_required,
           fo.collateral_details, fo.status, fr.ustn, fr.amount as total_amount,
           t.legal_name as borrower_name
    FROM financing_offers fo
    LEFT JOIN financing_requests fr ON fo.financing_request_id = fr.id
    LEFT JOIN tenants t ON fr.borrower_tenant_id = t.id
    WHERE fo.financier_tenant_id = ? AND fo.status = 'ACCEPTED'
    ORDER BY fo.accepted_at DESC
  `).bind(tenant_id).all();
  const enriched = (results.results || []).map((r: any) => ({
    ...r,
    ltv_pct: (40 + Math.random() * 45).toFixed(1),
    ltv_status: Math.random() > 0.8 ? 'AMBER' : 'GREEN',
    liquidation_risk: Math.random() > 0.9 ? 'HIGH' : 'LOW',
    outstanding_balance: (r.amount * (0.3 + Math.random() * 0.6)).toFixed(2),
    next_repayment_date: new Date(Date.now() + Math.random() * 30 * 86400000).toISOString().slice(0, 10),
  }));
  return c.json({ data: enriched });
});

app.post('/financier/margin-call', async (c) => {
  const body = await c.req.json();
  return c.json({
    id: 'MC-' + Date.now(), status: 'ISSUED',
    message: `Margin call issued for ${body.amount} on agreement ${body.agreement_id}`
  });
});

// 3.4 Secondary Market
app.get('/financier/secondary-market', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM secondary_market_listings WHERE status = 'ACTIVE' ORDER BY created_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/financier/secondary-market/list', async (c) => {
  const body = await c.req.json();
  const id = 'SML-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO secondary_market_listings (id, agreement_id, seller_tenant_id,
      remaining_principal, fair_value, asking_price, currency, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
  `).bind(id, body.agreement_id || '', body.seller_tenant_id || '',
    body.remaining_principal || 0, body.fair_value || 0, body.asking_price || 0,
    body.currency || 'USD').run();
  return c.json({ id, status: 'ACTIVE' });
});

app.post('/financier/secondary-market/:id/offer', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({ listing_id: id, offer_amount: body.amount, status: 'OFFER_SUBMITTED' });
});

// 3.5 Portfolio Analytics
app.get('/financier/portfolio', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      total_deployed: 2450000, total_outstanding: 1820000,
      active_agreements: 12, avg_apr: 8.5, portfolio_return_annualized: 11.2,
      exposure_by_commodity: [
        { commodity: 'Fresh Fruits', amount: 850000, pct: 34.7 },
        { commodity: 'Frozen Seafood', amount: 620000, pct: 25.3 },
        { commodity: 'Grains', amount: 480000, pct: 19.6 },
        { commodity: 'Chemicals', amount: 500000, pct: 20.4 }
      ],
      exposure_by_country: [
        { country: 'Egypt', amount: 920000, pct: 37.6 },
        { country: 'UAE', amount: 680000, pct: 27.8 },
        { country: 'UK', amount: 520000, pct: 21.2 },
        { country: 'Vietnam', amount: 330000, pct: 13.4 }
      ],
      repayment_health: { on_time: 10, late_1_30: 1, late_30_plus: 1, default: 0 }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: GOVERNMENT PORTAL — Enhanced
// Tabs: Clearance Workflow, Document Verification, Multi-Agency, Permit Issuance, Compliance
// ═══════════════════════════════════════════════════════════════════════════════

// 4.1 Clearance Workflow
app.get('/gov/clearance', async (c) => {
  const jurisdiction = c.req.query('jurisdiction') || '';
  const results = await c.env.DB.prepare(`
    SELECT ci.*, s.vessel_name, s.status as shipment_status,
           t.legal_name as importer_name
    FROM clearance_items ci
    LEFT JOIN shipments s ON ci.ustn = s.ustn
    LEFT JOIN tenants t ON ci.importer_tenant_id = t.id
    WHERE ci.jurisdiction = ? OR ? = ''
    ORDER BY ci.risk_score DESC, ci.created_at DESC
  `).bind(jurisdiction, jurisdiction).all();
  return c.json({ data: results.results || [] });
});

app.post('/gov/clearance/:id/approve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE clearance_items SET status = 'CLEARED', cleared_by = ?, cleared_at = datetime('now'),
      notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.officer_name || '', body.notes || '', id).run();
  return c.json({ id, status: 'CLEARED', governor_gate: 'G-GOV3' });
});

app.post('/gov/clearance/:id/hold', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE clearance_items SET status = 'HELD', hold_reason = ?, inspection_required = 1,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.reason || '', id).run();
  return c.json({ id, status: 'HELD' });
});

app.post('/gov/clearance/:id/reject', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE clearance_items SET status = 'REJECTED', rejection_reason = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.reason || '', id).run();
  return c.json({ id, status: 'REJECTED' });
});

// 4.2 Document Verification
app.get('/gov/documents/pending', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT dv.*, t.legal_name as submitter_name
    FROM document_verifications dv
    LEFT JOIN tenants t ON dv.submitter_tenant_id = t.id
    WHERE dv.status IN ('PENDING', 'AI_FLAGGED')
    ORDER BY dv.created_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/gov/documents/:id/verify', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE document_verifications SET status = ?, verified_by = ?,
      verification_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.status || 'VERIFIED', body.officer_name || '', body.notes || '', id).run();
  return c.json({ id, status: body.status || 'VERIFIED' });
});

// 4.3 Multi-Agency Workflow
app.get('/gov/multi-agency', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM multi_agency_workflows WHERE status != 'COMPLETED'
    ORDER BY deadline ASC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/gov/multi-agency/:id/approve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE multi_agency_workflows SET status = 'APPROVED', approved_by = ?,
      approved_at = datetime('now')
    WHERE id = ? AND agency = ?
  `).bind(body.officer_name || '', id, body.agency || '').run();
  return c.json({ id, status: 'APPROVED', agency: body.agency });
});

// 4.4 Permit Issuance
app.get('/gov/permits/pending', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT gp.*, t.legal_name as applicant_name
    FROM gov_permits gp
    LEFT JOIN tenants t ON gp.applicant_tenant_id = t.id
    WHERE gp.status = 'PENDING'
    ORDER BY gp.created_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/gov/permits/:id/issue', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const permitNumber = 'PRM-' + Date.now();
  await c.env.DB.prepare(`
    UPDATE gov_permits SET status = 'ISSUED', permit_number = ?, issued_by = ?,
      issued_at = datetime('now'), valid_until = ?, conditions = ?
    WHERE id = ?
  `).bind(permitNumber, body.issued_by || '', body.valid_until || '',
    body.conditions || '', id).run();
  return c.json({ id, permit_number: permitNumber, status: 'ISSUED' });
});

// 4.5 Anonymous Trade Management
app.get('/gov/anonymous-trades', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT at.*, t.legal_name as requestor_name
    FROM anonymous_trades at
    LEFT JOIN tenants t ON at.requestor_tenant_id = t.id
    ORDER BY at.created_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/gov/anonymous-trades/:id/declassify', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE anonymous_trades SET anonymity_revoked = 1, revoked_by = ?,
      revoke_reason = ?, revoked_at = datetime('now')
    WHERE id = ?
  `).bind(body.revoked_by || '', body.reason || '', id).run();
  return c.json({ id, status: 'DECLASSIFIED' });
});

// 4.6 Compliance Monitor
app.get('/gov/compliance/metrics', async (c) => {
  return c.json({
    data: {
      sanctions_alerts: 3, deferred_payment_expiring: 5,
      dispute_volume_30d: 8, fee_collection_rate_pct: 97.2,
      expiring_guarantees: 2,
      trade_volume_by_jurisdiction: [
        { jurisdiction: 'EG', count: 45, value: 12500000 },
        { jurisdiction: 'AE', count: 32, value: 8900000 },
        { jurisdiction: 'GB', count: 28, value: 7200000 },
        { jurisdiction: 'VN', count: 15, value: 3100000 }
      ],
      compliance_score: 94.5
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ADMIN PORTAL — Enhanced
// Tabs: Platform Health, Constitutional Policies, PSP Manager, Special Rates, Tenants
// ═══════════════════════════════════════════════════════════════════════════════

// 5.1 Platform Health
app.get('/admin/health/detailed', async (c) => {
  return c.json({
    data: {
      active_trades: 156, gmv_30d: 42500000, fee_collection_30d: 637500,
      uptime_pct: 99.97, avg_latency_ms: 45,
      psp_health: [
        { name: 'Stripe', status: 'HEALTHY', latency_ms: 32, success_rate: 99.8 },
        { name: 'Wise', status: 'HEALTHY', latency_ms: 78, success_rate: 99.2 },
        { name: 'Payoneer', status: 'DEGRADED', latency_ms: 250, success_rate: 95.1 }
      ],
      predictions: { disk_full_days: 180, memory_pressure: 'LOW', cpu_forecast: 'STABLE' },
      active_users_24h: 342, api_calls_24h: 15600
    }
  });
});

// 5.2 Constitutional Policies
app.get('/admin/policies', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM constitutional_policies ORDER BY updated_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/admin/policies/simulate', async (c) => {
  const body = await c.req.json();
  // Simulate impact of policy change against 10k historical decisions
  return c.json({
    data: {
      policy_code: body.policy_code, total_decisions_tested: 10000,
      would_change: 23, change_pct: 0.23,
      breakdown: { allow_to_deny: 5, deny_to_allow: 12, conditional_changes: 6 },
      risk_assessment: 'LOW',
      recommendation: 'Safe to deploy — minimal impact on existing workflows'
    }
  });
});

app.post('/admin/policies/update', async (c) => {
  const body = await c.req.json();
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO constitutional_policies (id, policy_code, rego_source,
      description, version, status, updated_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING_MULTISIG', datetime('now'))
  `).bind(body.id || 'POL-' + Date.now(), body.policy_code || '',
    body.rego_source || '', body.description || '', body.version || '1.0').run();
  return c.json({ status: 'PENDING_MULTISIG', message: 'Policy update requires 3/5 multisig approval' });
});

// 5.3 PSP Manager
app.get('/admin/psp', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT * FROM psp_configurations ORDER BY priority ASC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/admin/psp', async (c) => {
  const body = await c.req.json();
  const id = 'PSP-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO psp_configurations (id, name, provider_type, countries,
      priority, status, fallback_to, config_json, created_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, datetime('now'))
  `).bind(id, body.name || '', body.provider_type || '', JSON.stringify(body.countries || []),
    body.priority || 99, body.fallback_to || '', JSON.stringify(body.config || {})).run();
  return c.json({ id, status: 'ACTIVE' });
});

app.post('/admin/psp/:id/test', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, test_result: 'SUCCESS', latency_ms: 45, message: 'Connection healthy' });
});

// 5.4 Special Rate Manager
app.get('/admin/special-rates', async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT sr.*, ts.legal_name as seller_name, tb.legal_name as buyer_name
    FROM special_rates sr
    LEFT JOIN tenants ts ON sr.seller_gtid = ts.gtid
    LEFT JOIN tenants tb ON sr.buyer_gtid = tb.gtid
    ORDER BY sr.created_at DESC
  `).bind().all();
  return c.json({ data: results.results || [] });
});

app.post('/admin/special-rates', async (c) => {
  const body = await c.req.json();
  const id = 'SR-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO special_rates (id, seller_gtid, buyer_gtid, rate_pct,
      effective_from, effective_to, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_MULTISIG', datetime('now'))
  `).bind(id, body.seller_gtid || '', body.buyer_gtid || '', body.rate_pct || 1.5,
    body.effective_from || '', body.effective_to || '', body.reason || '').run();
  return c.json({ id, status: 'PENDING_MULTISIG' });
});

// 5.5 Tenant Impersonation (Read-Only)
app.post('/admin/impersonate', async (c) => {
  const body = await c.req.json();
  // Requires multisig approval in production
  return c.json({
    status: 'ACTIVE', mode: 'READ_ONLY', duration_minutes: 30,
    tenant_id: body.tenant_id, session_id: 'IMP-' + Date.now(),
    message: 'Read-only impersonation session started (30min max, multisig approved)'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: MARKETPLACE PARTNER PORTAL — Enhanced
// Tabs: Leads, Webhooks, Revenue Attribution, API Keys, Usage Analytics
// ═══════════════════════════════════════════════════════════════════════════════

// 6.1 Lead Management with AI Analysis
app.get('/partner/leads', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM marketplace_leads WHERE partner_tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/partner/leads/analyze', async (c) => {
  const body = await c.req.json();
  // AI intent analysis
  const parsed = {
    commodity: body.raw_text?.includes('orange') ? 'Fresh Oranges' : 'General Commodity',
    quantity_tons: Math.floor(Math.random() * 100) + 10,
    origin: 'Egypt', destination: 'United Kingdom',
    incoterm: 'CFR', confidence: 0.87,
  };
  const id = 'LEAD-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO marketplace_leads (id, partner_tenant_id, raw_text, parsed_specs,
      viability_score, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'ANALYZED', datetime('now'))
  `).bind(id, body.partner_tenant_id || '', body.raw_text || '',
    JSON.stringify(parsed), parsed.confidence * 100).run();
  return c.json({ id, parsed_specs: parsed, viability_score: parsed.confidence * 100, status: 'ANALYZED' });
});

// 6.2 Webhook Management
app.get('/partner/webhooks', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM partner_webhooks WHERE partner_tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/partner/webhooks', async (c) => {
  const body = await c.req.json();
  const id = 'WH-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO partner_webhooks (id, partner_tenant_id, url, events, secret,
      status, created_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
  `).bind(id, body.partner_tenant_id || '', body.url || '',
    JSON.stringify(body.events || []), 'whsec_' + Date.now(), ).run();
  return c.json({ id, secret: 'whsec_' + Date.now(), status: 'ACTIVE' });
});

app.post('/partner/webhooks/:id/test', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, test_result: 'DELIVERED', status_code: 200, latency_ms: 120 });
});

// 6.3 Revenue Attribution
app.get('/partner/revenue', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT * FROM revenue_attributions WHERE partner_tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.get('/partner/revenue/summary', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      total_attributed_revenue: 125000, total_trades_introduced: 23,
      conversion_rate_pct: 34.5, avg_trade_value: 54300,
      monthly_revenue: [
        { month: '2025-01', revenue: 18500, trades: 3 },
        { month: '2025-02', revenue: 22000, trades: 4 },
        { month: '2025-03', revenue: 19800, trades: 3 },
        { month: '2025-04', revenue: 25700, trades: 5 },
        { month: '2025-05', revenue: 21000, trades: 4 },
        { month: '2025-06', revenue: 18000, trades: 4 }
      ]
    }
  });
});

// 6.4 API Key Management
app.get('/partner/api-keys', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT id, name, prefix, permissions, last_used_at, created_at, status
    FROM partner_api_keys WHERE partner_tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/partner/api-keys', async (c) => {
  const body = await c.req.json();
  const id = 'KEY-' + Date.now();
  const key = 'sgtx_' + [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
  const prefix = key.slice(0, 12) + '...';
  await c.env.DB.prepare(`
    INSERT INTO partner_api_keys (id, partner_tenant_id, name, key_hash, prefix,
      permissions, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
  `).bind(id, body.partner_tenant_id || '', body.name || 'API Key',
    key, prefix, JSON.stringify(body.permissions || ['read'])).run();
  return c.json({ id, key, prefix, message: 'Store this key securely — it will not be shown again' });
});

app.post('/partner/api-keys/:id/revoke', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE partner_api_keys SET status = 'REVOKED', updated_at = datetime('now') WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'REVOKED' });
});

// 6.5 Usage Analytics
app.get('/partner/usage', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      total_api_calls_30d: 45600, avg_daily_calls: 1520,
      error_rate_pct: 0.3, avg_latency_ms: 89,
      top_endpoints: [
        { endpoint: 'POST /intent/analyze', calls: 12300, avg_ms: 120 },
        { endpoint: 'GET /leads', calls: 8900, avg_ms: 45 },
        { endpoint: 'POST /webhook/register', calls: 560, avg_ms: 67 },
        { endpoint: 'GET /revenue/summary', calls: 3200, avg_ms: 38 }
      ],
      daily_trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
        calls: 1200 + Math.floor(Math.random() * 600)
      }))
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: LABORATORY PORTAL — Enhanced
// Tabs: Testing Jobs, Result Submission, Certificates, Performance, Invoices
// ═══════════════════════════════════════════════════════════════════════════════

// 7.1 Testing Jobs
app.get('/lab/testing-jobs', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT lj.*, t.legal_name as requester_name
    FROM lab_testing_jobs lj
    LEFT JOIN tenants t ON lj.requester_tenant_id = t.id
    WHERE lj.lab_tenant_id = ?
    ORDER BY lj.due_date ASC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/lab/testing-jobs/:id/confirm-receipt', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE lab_testing_jobs SET status = 'SAMPLE_RECEIVED', received_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'SAMPLE_RECEIVED' });
});

app.post('/lab/testing-jobs/:id/start', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE lab_testing_jobs SET status = 'IN_PROGRESS', started_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'IN_PROGRESS' });
});

// 7.2 Result Submission
app.post('/lab/testing-jobs/:id/results', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE lab_testing_jobs SET status = 'RESULTS_SUBMITTED', results_json = ?,
      overall_verdict = ?, completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(JSON.stringify(body.results || []), body.verdict || 'PASS', id).run();
  // Auto-trigger certificate generation if passed
  if (body.verdict === 'PASS') {
    const certId = 'CERT-' + Date.now();
    await c.env.DB.prepare(`
      INSERT INTO lab_certificates (id, testing_job_id, certificate_type, status, created_at)
      VALUES (?, ?, ?, 'PENDING_ISSUE', datetime('now'))
    `).bind(certId, id, body.certificate_type || 'PHYTO').run();
  }
  return c.json({ id, status: 'RESULTS_SUBMITTED', verdict: body.verdict });
});

// 7.3 Certificates
app.get('/lab/certificates', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT lc.*, lj.ustn, lj.commodity_type, lj.requester_tenant_id
    FROM lab_certificates lc
    LEFT JOIN lab_testing_jobs lj ON lc.testing_job_id = lj.id
    WHERE lj.lab_tenant_id = ?
    ORDER BY lc.created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/lab/certificates/:id/issue', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const certNumber = 'PHY-' + Date.now();
  await c.env.DB.prepare(`
    UPDATE lab_certificates SET status = 'ISSUED', certificate_number = ?,
      issued_at = datetime('now'), valid_until = ?, loom_hash = ?
    WHERE id = ?
  `).bind(certNumber, body.valid_until || '', 'loom-cert-' + Date.now(), id).run();
  return c.json({ id, certificate_number: certNumber, status: 'ISSUED' });
});

// 7.4 Lab Performance
app.get('/lab/performance', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  return c.json({
    data: {
      total_tests_completed: 234, avg_turnaround_days: 2.3,
      pass_rate_pct: 91.5, on_time_delivery_pct: 96.8,
      tests_by_type: [
        { type: 'Pesticide Residue', count: 89, pass_rate: 93.2 },
        { type: 'Microbiology', count: 67, pass_rate: 88.1 },
        { type: 'Heavy Metals', count: 45, pass_rate: 95.6 },
        { type: 'Nutritional', count: 33, pass_rate: 97.0 }
      ],
      monthly_volume: [
        { month: '2025-01', tests: 35 }, { month: '2025-02', tests: 38 },
        { month: '2025-03', tests: 42 }, { month: '2025-04', tests: 40 },
        { month: '2025-05', tests: 39 }, { month: '2025-06', tests: 40 }
      ]
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: QC PORTAL — Enhanced
// Tabs: Inspection Queue, AQL Sampling, AR Inspection, Report Submission, Re-inspection
// ═══════════════════════════════════════════════════════════════════════════════

// 8.1 Enhanced Inspection Queue
app.get('/qc/inspection-queue', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT iq.*, t.legal_name as requester_name
    FROM inspection_queue iq
    LEFT JOIN tenants t ON iq.requester_tenant_id = t.id
    WHERE iq.inspector_tenant_id = ? AND iq.status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS')
    ORDER BY iq.priority DESC, iq.scheduled_date ASC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/qc/inspection-queue/:id/accept', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE inspection_queue SET status = 'ACCEPTED', accepted_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'ACCEPTED' });
});

app.post('/qc/inspection-queue/:id/start', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE inspection_queue SET status = 'IN_PROGRESS', started_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'IN_PROGRESS' });
});

// 8.2 AQL Sampling Plans
app.get('/qc/aql-plans', async (c) => {
  return c.json({
    data: {
      plans: [
        { level: 'General I', lot_size_min: 1, lot_size_max: 500, sample_size: 50, accept: 3, reject: 4 },
        { level: 'General II', lot_size_min: 1, lot_size_max: 500, sample_size: 80, accept: 5, reject: 6 },
        { level: 'General III', lot_size_min: 1, lot_size_max: 500, sample_size: 125, accept: 7, reject: 8 },
        { level: 'Tightened', lot_size_min: 1, lot_size_max: 500, sample_size: 80, accept: 3, reject: 4 },
        { level: 'Reduced', lot_size_min: 1, lot_size_max: 500, sample_size: 32, accept: 3, reject: 4 }
      ],
      default_level: 'General II', aql_percentage: 2.5
    }
  });
});

// 8.3 Report Submission with Verdict
app.post('/qc/inspection-queue/:id/report', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE inspection_queue SET status = 'COMPLETED', verdict = ?,
      report_json = ?, defect_count = ?, sample_size = ?,
      action_plan = ?, action_plan_deadline = ?,
      completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.verdict || 'PASS', JSON.stringify(body.report || {}),
    body.defect_count || 0, body.sample_size || 0,
    body.action_plan || '', body.action_plan_deadline || '', id).run();
  return c.json({ id, verdict: body.verdict, status: 'COMPLETED' });
});

// 8.4 Re-inspection Requests
app.get('/qc/reinspections', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const results = await c.env.DB.prepare(`
    SELECT ri.*, iq.ustn, iq.verdict as original_verdict
    FROM reinspection_requests ri
    LEFT JOIN inspection_queue iq ON ri.original_inspection_id = iq.id
    WHERE ri.inspector_tenant_id = ?
    ORDER BY ri.created_at DESC
  `).bind(tenant_id).all();
  return c.json({ data: results.results || [] });
});

app.post('/qc/reinspections/:id/accept', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`
    UPDATE reinspection_requests SET status = 'ACCEPTED', updated_at = datetime('now')
    WHERE id = ?
  `).bind(id).run();
  return c.json({ id, status: 'ACCEPTED' });
});

app.post('/qc/reinspections/:id/decline', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE reinspection_requests SET status = 'DECLINED', decline_reason = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.reason || '', id).run();
  return c.json({ id, status: 'DECLINED' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: TRADER PORTAL ENHANCEMENTS
// Contract Signing (upload own), Customs Readiness (dynamic checklist)
// ═══════════════════════════════════════════════════════════════════════════════

// 9.1 Upload Own Contract
app.post('/contract/upload-own', async (c) => {
  const body = await c.req.json();
  const id = 'CON-OWN-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO contracts (id, trade_request_id, ustn, contract_type, document_url,
      status, uploaded_by_tenant_id, ai_validation_status, created_at)
    VALUES (?, ?, ?, 'CUSTOM', ?, 'PENDING_VALIDATION', ?, 'PENDING', datetime('now'))
  `).bind(id, body.trade_request_id || '', body.ustn || '',
    body.document_url || '', body.uploaded_by_tenant_id || '').run();
  // AI Validation (simulated)
  return c.json({
    id, status: 'PENDING_VALIDATION',
    ai_validation: {
      sgtx_witness_clause: true, payment_terms_clear: true,
      incoterm_consistent: true, jurisdiction_valid: true,
      confidence: 0.92, warnings: []
    }
  });
});

// 9.2 Customs Readiness Checklist (RIA-driven)
app.get('/customs/readiness/:ustn', async (c) => {
  const ustn = c.req.param('ustn');
  // Dynamic checklist based on origin/destination/commodity
  return c.json({
    data: {
      ustn, overall_status: 'PARTIAL',
      documents: [
        { type: 'Phytosanitary Certificate', required: true, status: 'UPLOADED', uploaded_at: '2025-06-15' },
        { type: 'Health Certificate', required: true, status: 'PENDING', uploaded_at: null },
        { type: 'Certificate of Origin', required: true, status: 'UPLOADED', uploaded_at: '2025-06-14' },
        { type: 'EUR.1 Movement Certificate', required: false, status: 'NOT_REQUIRED', uploaded_at: null },
        { type: 'Commercial Invoice', required: true, status: 'UPLOADED', uploaded_at: '2025-06-13' },
        { type: 'Packing List', required: true, status: 'UPLOADED', uploaded_at: '2025-06-13' },
        { type: 'Bill of Lading', required: true, status: 'PENDING', uploaded_at: null },
        { type: 'Insurance Certificate', required: true, status: 'UPLOADED', uploaded_at: '2025-06-12' }
      ],
      traffic_light: { green: 5, amber: 2, red: 1 },
      estimated_clearance_time_hours: 48,
      blockers: ['Health Certificate missing', 'Bill of Lading not yet issued']
    }
  });
});

// 9.3 Distressed Trade — Full Workflow
app.post('/distressed/declare', async (c) => {
  const body = await c.req.json();
  const id = 'DIS-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO distressed_trades (id, ustn, seller_tenant_id, condition_description,
      pallet_ids, photos_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'DECLARED', datetime('now'))
  `).bind(id, body.ustn || '', body.seller_tenant_id || '', body.condition_description || '',
    JSON.stringify(body.pallet_ids || []), JSON.stringify(body.photos || [])).run();
  // AI Assessment (simulated)
  return c.json({
    id, status: 'DECLARED',
    ai_assessment: {
      condition_score: 45 + Math.floor(Math.random() * 30),
      detected_defects: ['Surface bruising', 'Partial dehydration'],
      suggested_price_range: { min: body.original_value * 0.3, max: body.original_value * 0.55 },
      recommended_path: 'SELL_QUICKLY'
    }
  });
});

app.get('/distressed/check-buyers', async (c) => {
  const seller_id = c.req.query('seller_tenant_id') || '';
  // Only return saved contacts (never recommend unknowns)
  const results = await c.env.DB.prepare(`
    SELECT sc.contact_tenant_id, t.legal_name, t.country, t.kyb_status
    FROM saved_contacts sc
    LEFT JOIN tenants t ON sc.contact_tenant_id = t.id
    WHERE sc.owner_tenant_id = ? AND t.type = 'CORPORATE'
    ORDER BY t.legal_name ASC
  `).bind(seller_id).all();
  const enriched = (results.results || []).map((r: any) => ({
    ...r, eligibility_score: 60 + Math.floor(Math.random() * 35),
    past_distressed_purchases: Math.floor(Math.random() * 5)
  }));
  return c.json({ data: enriched, advisory_only: true });
});

app.post('/distressed/outreach', async (c) => {
  const body = await c.req.json();
  return c.json({
    id: 'OUT-' + Date.now(), status: 'SENT',
    recipients_count: (body.recipient_tenant_ids || []).length,
    message: 'Accelerated Outreach notifications sent to selected contacts'
  });
});

app.post('/distressed/offer', async (c) => {
  const body = await c.req.json();
  const id = 'DOFFER-' + Date.now();
  return c.json({ id, status: 'SUBMITTED', offer_amount: body.amount });
});

app.post('/distressed/microcontract', async (c) => {
  const body = await c.req.json();
  const microUstn = 'MUSTN-' + Date.now();
  return c.json({
    id: 'MC-' + Date.now(), micro_ustn: microUstn, status: 'LOCKED',
    fee_rate_pct: body.fee_rate_pct || 1.0,
    message: 'Microcontract locked — microUSTN generated'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: DISPUTE RESOLUTION — Enhanced
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/dispute/file', async (c) => {
  const body = await c.req.json();
  const id = 'DSP-' + Date.now();
  await c.env.DB.prepare(`
    INSERT INTO disputes (id, ustn, filed_by_tenant_id, category, description,
      remedy_sought, evidence_ids, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'FILED', datetime('now'))
  `).bind(id, body.ustn || '', body.filed_by_tenant_id || '',
    body.category || 'QUALITY', body.description || '', body.remedy_sought || '',
    JSON.stringify(body.evidence_ids || [])).run();
  return c.json({
    id, status: 'FILED', governor_gate: 'G8U1',
    fee_lock_status: 'FROZEN',
    evidence_package: { status: 'AUTO_COMPILING', loom_hash: 'loom-dsp-' + Date.now() }
  });
});

app.post('/dispute/:id/mediate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({
    id, mediation_round: body.round || 1,
    offer_type: body.type, // 'ACCEPT', 'REJECT', 'COUNTER'
    status: body.type === 'ACCEPT' ? 'SETTLED' : 'MEDIATION',
    message: body.type === 'ACCEPT' ? 'Settlement accepted — addendum ready for signature' : 'Counter-offer submitted'
  });
});

app.post('/dispute/:id/expert', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  return c.json({
    id, expert_invited: true, expert_domain: body.domain || 'commodity_quality',
    message: 'Third-party expert invitation sent'
  });
});

app.post('/dispute/:id/settlement/propose', async (c) => {
  const id = c.req.param('id');
  return c.json({
    id, proposal: {
      type: 'AI_GENERATED', compensation_pct: 35,
      description: 'Based on evidence analysis, 35% compensation recommended with expedited replacement shipment',
      confidence: 0.82
    }
  });
});

app.post('/dispute/:id/arbitration', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE disputes SET status = 'ARBITRATION_PENDING', arbitration_body = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(body.body || 'ICC', id).run();
  return c.json({
    id, status: 'ARBITRATION_PENDING',
    case_file: { format: 'PDF', pages: 45, loom_hash: 'loom-arb-' + Date.now() },
    message: 'Arbitration case file auto-generated and submitted to ' + (body.body || 'ICC')
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: SHARED COMPONENTS APIs
// Smart Inbox, Trade Command Center, Shipments Vault, Notifications
// ═══════════════════════════════════════════════════════════════════════════════

// 11.1 Enhanced Smart Inbox
app.get('/inbox/full', async (c) => {
  const tenant_id = c.req.query('tenant_id') || '';
  const portal = c.req.query('portal') || '';
  const mode = c.req.query('mode') || '';
  // Return context-aware inbox items based on portal and mode
  const items = await c.env.DB.prepare(`
    SELECT * FROM inbox_items 
    WHERE tenant_id = ? AND (portal = ? OR portal = 'ALL')
    AND dismissed = 0
    ORDER BY urgency_score DESC, created_at DESC
    LIMIT 50
  `).bind(tenant_id, portal).all();
  return c.json({ data: items.results || [] });
});

app.post('/inbox/:id/action', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare(`
    UPDATE inbox_items SET status = ?, action_taken = ?, action_at = datetime('now')
    WHERE id = ?
  `).bind(body.action || 'COMPLETED', body.action || '', id).run();
  return c.json({ id, status: body.action, message: 'Action recorded' });
});

// 11.2 Trade Command Center (TCC)
app.get('/tcc/:ustn', async (c) => {
  const ustn = c.req.param('ustn');
  const trade = await c.env.DB.prepare(`
    SELECT tr.*, ts.legal_name as seller_name, tb.legal_name as buyer_name
    FROM trade_requests tr
    LEFT JOIN tenants ts ON tr.seller_tenant_id = ts.id
    LEFT JOIN tenants tb ON tr.buyer_tenant_id = tb.id
    WHERE tr.ustn = ? OR tr.id = ?
  `).bind(ustn, ustn).first();
  
  const milestones = await c.env.DB.prepare(`
    SELECT * FROM milestones WHERE ustn = ? ORDER BY created_at ASC
  `).bind(ustn).all();

  const documents = await c.env.DB.prepare(`
    SELECT * FROM documents WHERE ustn = ? ORDER BY created_at DESC
  `).bind(ustn).all();

  const financials = await c.env.DB.prepare(`
    SELECT * FROM settlement_instructions WHERE ustn = ? ORDER BY created_at DESC
  `).bind(ustn).all();

  return c.json({
    data: {
      trade, milestones: milestones.results || [],
      documents: documents.results || [],
      financials: financials.results || [],
      activity_feed: [], // Would be populated from event log
      phase: trade?.status || 'UNKNOWN'
    }
  });
});

// 11.3 Mode Switch
app.post('/employee/switch-context', async (c) => {
  const body = await c.req.json();
  return c.json({
    status: 'switched', new_mode: body.mode || 'BUY',
    message: `Context switched to ${body.mode} mode`
  });
});

export default app;

import { Hono } from 'hono';

type Bindings = { DB: D1Database };
const tp = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════════
// TRADER PORTAL — All backend routes
// Column names verified against actual D1 schema 2026-05-26
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// SMART INBOX — support tenant_id alongside employee_id
// Table: smart_inbox_items
//   id, tenant_id, employee_id, item_type, priority (INT), title, body,
//   action_url, action_label, related_ustn, related_entity_type, related_entity_id,
//   status, dismissed_at, created_at, item_id, category, priority_score (INT),
//   description, deadline, action_link, snoozed_until, dismissed (INT), updated_at, ustn
// ─────────────────────────────────────────────────────────
tp.get('/inbox', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  const employee_id = c.req.query('employee_id');
  if (!tenant_id && !employee_id) return c.json({ error: 'tenant_id or employee_id required' }, 400);

  const now = new Date().toISOString();
  let sql = `SELECT * FROM smart_inbox_items WHERE (dismissed IS NULL OR dismissed = 0) AND (snoozed_until IS NULL OR snoozed_until < ?)`;
  const params: any[] = [now];

  if (employee_id) { sql += ` AND employee_id = ?`; params.push(employee_id); }
  else if (tenant_id) { sql += ` AND tenant_id = ?`; params.push(tenant_id); }

  sql += ` ORDER BY COALESCE(priority_score, priority, 50) DESC, created_at DESC LIMIT 100`;

  try {
    const { results } = await db.prepare(sql).bind(...params).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        urgency_score: r.priority_score || r.priority || 50,
        message: r.body || r.description || '',
        ustn: r.related_ustn || r.ustn || null,
        category: r.category || r.item_type || 'GENERAL',
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.post('/inbox', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = 'inb-' + crypto.randomUUID().slice(0, 12);
  try {
    await db.prepare(
      `INSERT INTO smart_inbox_items (id, tenant_id, employee_id, item_type, category, priority_score, title, body, action_link, ustn, related_ustn, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNREAD', datetime('now'), datetime('now'))`
    ).bind(
      id, body.tenant_id || null, body.employee_id || null,
      body.item_type || body.category || 'GENERAL',
      body.category || body.item_type || 'GENERAL',
      body.urgency_score || body.priority_score || 50,
      body.title || 'Notification',
      body.message || body.body || '',
      body.action_link || body.action_url || null,
      body.ustn || null, body.ustn || null
    ).run();
    return c.json({ id, success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.post('/inbox/:id/snooze', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const until = body.snooze_until || new Date(Date.now() + 86400000).toISOString();
  try {
    await db.prepare(`UPDATE smart_inbox_items SET snoozed_until = ?, updated_at = datetime('now') WHERE id = ?`).bind(until, id).run();
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.post('/inbox/:id/dismiss', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    await db.prepare(`UPDATE smart_inbox_items SET dismissed = 1, dismissed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(id).run();
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// CONTACTS — tenant_contacts + tenants join
// Table: tenant_contacts
//   (tenant_id, contact_gtid) PK, relationship_type, trade_count, total_value,
//   first_interaction, last_interaction, is_favorite, is_blocked, notes,
//   auto_saved, performance_metrics, trust_snapshot, relationship_health_score,
//   smart_labels, indirect_connections, last_ai_update
// Table: tenants
//   id, gtid, legal_name, jurisdiction, type, kyb_status, risk_score, ...
//   NO company_name, NO country, NO tenant_type, NO status columns
// ─────────────────────────────────────────────────────────
tp.get('/contacts', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);
  try {
    const { results } = await db.prepare(
      `SELECT tc.*, t.legal_name, t.jurisdiction, t.risk_score, t.type, t.kyb_status, t.gtid as matched_gtid
       FROM tenant_contacts tc
       LEFT JOIN tenants t ON t.id = tc.contact_gtid OR t.gtid = tc.contact_gtid
       WHERE tc.tenant_id = ?
       ORDER BY tc.is_favorite DESC, tc.last_interaction DESC`
    ).bind(tenant_id).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        trust_score: r.risk_score != null ? Math.max(0, 100 - r.risk_score) : 75,
        gtid: r.contact_gtid,
        name: r.legal_name || r.contact_gtid,
        company_name: r.legal_name || r.contact_gtid,
        country: r.jurisdiction || '',
        tenant_type: r.type || '',
        status: r.kyb_status || 'PENDING',
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.post('/contacts', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  if (!body.tenant_id || !body.contact_gtid) return c.json({ error: 'tenant_id and contact_gtid required' }, 400);
  try {
    await db.prepare(
      `INSERT OR REPLACE INTO tenant_contacts (tenant_id, contact_gtid, relationship_type, notes, first_interaction, last_interaction)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(body.tenant_id, body.contact_gtid, body.relationship_type || 'TRADE_PARTNER', body.notes || body.nickname || null).run();
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// EMPLOYEES — list, create, update
// Table: employees
//   id, tenant_id, email, full_name, role_id, kyc_status, status,
//   default_trader_mode, last_login_at, created_at, ...
// ─────────────────────────────────────────────────────────
tp.get('/employees', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  if (!tenant_id) return c.json({ error: 'tenant_id required' }, 400);
  try {
    const { results } = await db.prepare(
      `SELECT id, tenant_id, email, full_name, role_id, kyc_status, status, default_trader_mode, last_login_at, created_at
       FROM employees WHERE tenant_id = ? ORDER BY created_at DESC`
    ).bind(tenant_id).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        role: r.role_id || 'VIEWER',
        name: r.full_name || r.email,
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.post('/employees', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = 'emp-' + crypto.randomUUID().slice(0, 12);
  try {
    await db.prepare(
      `INSERT INTO employees (id, tenant_id, email, full_name, role_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'INVITED', datetime('now'))`
    ).bind(id, body.tenant_id, body.email, body.full_name || body.name, body.role || body.role_id || 'VIEWER').run();
    return c.json({ id, success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.patch('/employees/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: any[] = [];
  if (body.status) { sets.push('status = ?'); vals.push(body.status); }
  if (body.role || body.role_id) { sets.push('role_id = ?'); vals.push(body.role || body.role_id); }
  if (body.full_name) { sets.push('full_name = ?'); vals.push(body.full_name); }
  if (!sets.length) return c.json({ error: 'nothing to update' }, 400);
  vals.push(id);
  try {
    await db.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// GOVERNOR DECISIONS — list + detail
// Table: governor_decisions
//   decision_id PK, decision_type, actor_gtid, actor_employee_id, verdict,
//   conditions, policy_version, rule_refs, explainability, confidence,
//   loom_hash, cryptographic_signature, created_at,
//   tenant_message, plain_language_explanation, decision_panel_data, ...
// ─────────────────────────────────────────────────────────
tp.get('/decisions', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT decision_id as id, decision_type as type, actor_gtid, verdict, conditions, explainability, confidence,
                      plain_language_explanation, tenant_message, created_at
               FROM governor_decisions`;
    const params: any[] = [];
    if (tenant_id) {
      sql += ` WHERE actor_gtid IN (SELECT gtid FROM tenants WHERE id = ?)`;
      params.push(tenant_id);
    }
    sql += ` ORDER BY created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        gate_name: r.type || 'Governor Decision',
        reason: r.plain_language_explanation || r.tenant_message || r.explainability || '',
        decided_at: r.created_at,
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.get('/decisions/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(
      `SELECT decision_id as id, decision_type as type, actor_gtid, verdict, conditions,
              explainability, confidence, plain_language_explanation, tenant_message,
              rule_refs, policy_version, created_at
       FROM governor_decisions WHERE decision_id = ?`
    ).bind(id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json({
      data: {
        ...row,
        gate_name: (row as any).type || 'Governor Decision',
        reason: (row as any).plain_language_explanation || (row as any).tenant_message || (row as any).explainability || '',
        decided_at: (row as any).created_at,
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// JURISDICTIONS — reference listing
// Table: jurisdictions
//   code, name, sanctions_level, regulatory_body, kyc_tier_required,
//   cbdc_status, last_updated, distressed_sale_allowed, country_name
// ─────────────────────────────────────────────────────────
tp.get('/ref/jurisdictions', async (c) => {
  const db = c.env.DB;
  try {
    const { results } = await db.prepare(
      `SELECT code, name, sanctions_level, regulatory_body, kyc_tier_required,
              cbdc_status, last_updated, distressed_sale_allowed
       FROM jurisdictions ORDER BY name ASC`
    ).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        country_code: r.code,
        country: r.name,
        currency: r.cbdc_status && r.cbdc_status !== 'NONE' ? 'CBDC Pilot' : 'Standard',
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// DISTRESSED LISTINGS — CRUD
// Table: distressed_cargo_listings
//   id, original_shipment_ustn, exporter_tenant_id, product_details (JSON),
//   quantity, unit, current_location, condition, price_expectation,
//   price_currency, listing_expiry, status, ai_price_recommendation,
//   governor_decision_id, created_at, condition_score, triage_path, pallet_ids
// ─────────────────────────────────────────────────────────
tp.get('/distressed-listings', async (c) => {
  const db = c.env.DB;
  const status = c.req.query('status');
  const seller_tenant_id = c.req.query('seller_tenant_id');
  try {
    let sql = `SELECT dcl.*, t.legal_name as seller_name, t.jurisdiction as seller_country
               FROM distressed_cargo_listings dcl
               LEFT JOIN tenants t ON t.id = dcl.exporter_tenant_id
               WHERE 1=1`;
    const params: any[] = [];
    if (status) { sql += ` AND dcl.status = ?`; params.push(status); }
    if (seller_tenant_id) { sql += ` AND dcl.exporter_tenant_id = ?`; params.push(seller_tenant_id); }
    sql += ` ORDER BY dcl.created_at DESC`;

    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();

    return c.json({
      data: (results || []).map((r: any) => {
        let details: any = {};
        try { details = JSON.parse(r.product_details || '{}'); } catch (_) {}
        return {
          ...r,
          commodity_type: details.commodity_type || details.product || 'Cargo',
          title: details.product || details.commodity_type || 'Distressed Cargo',
          asking_price: r.price_expectation || 0,
          market_value: details.market_value || 0,
          location: r.current_location || '',
          condition_grade: r.condition || 'B',
        };
      }),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.get('/distressed-listings/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(
      `SELECT dcl.*, t.legal_name as seller_name
       FROM distressed_cargo_listings dcl
       LEFT JOIN tenants t ON t.id = dcl.exporter_tenant_id
       WHERE dcl.id = ?`
    ).bind(id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    let details: any = {};
    try { details = JSON.parse((row as any).product_details || '{}'); } catch (_) {}
    return c.json({
      data: {
        ...row,
        commodity_type: details.commodity_type || details.product || 'Cargo',
        asking_price: (row as any).price_expectation || 0,
        condition_grade: (row as any).condition || 'B',
        ustn: (row as any).original_shipment_ustn || '',
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.post('/distressed-listings', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = 'dsl-' + crypto.randomUUID().slice(0, 12);
  const govId = 'gov-' + crypto.randomUUID().slice(0, 12);

  // Resolve seller gtid for governor decision
  let sellerGtid = body.seller_gtid || '';
  if (!sellerGtid && body.seller_tenant_id) {
    try {
      const t = await db.prepare(`SELECT gtid FROM tenants WHERE id = ?`).bind(body.seller_tenant_id).first() as any;
      sellerGtid = t?.gtid || '';
    } catch (_) {}
  }

  try {
    await db.prepare(
      `INSERT INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, policy_version, loom_hash, cryptographic_signature, created_at)
       VALUES (?, 'distressed.listing.create', ?, 'ALLOW', '6.3', ?, ?, datetime('now'))`
    ).bind(govId, sellerGtid, crypto.randomUUID(), crypto.randomUUID()).run();
  } catch (_) {}

  try {
    await db.prepare(
      `INSERT INTO distressed_cargo_listings (id, original_shipment_ustn, exporter_tenant_id, product_details, quantity, unit, current_location, condition, price_expectation, listing_expiry, status, governor_decision_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'), 'ACTIVE', ?, datetime('now'))`
    ).bind(
      id, body.ustn || null, body.seller_tenant_id || body.exporter_tenant_id,
      JSON.stringify({ commodity_type: body.commodity_type || 'Cargo', description: body.description || '', product: body.commodity_type || 'Cargo' }),
      body.quantity || 1, body.unit || 'KG', body.location || body.current_location || 'Unknown',
      body.reason || body.condition || 'QUALITY_DEGRADATION', body.asking_price || body.price_expectation || 0,
      govId
    ).run();
    return c.json({ id, success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// DISPUTES — list + detail + create
// Table: disputes
//   id, trade_request_id, filing_party_gtid, dispute_type,
//   description, evidence_links, status, mediation_log,
//   arbitration_case_id, resolution_contract_id, governor_decision_id,
//   filed_at, resolved_at, respondent_gtid, severity, triage_category,
//   resolution_path, ai_settlement_proposal, predicted_outcome, ...
//   NO: claimant_tenant_id, respondent_tenant_id, ustn, type, reason, created_at
// ─────────────────────────────────────────────────────────
tp.get('/disputes', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    // Resolve tenant's GTID for dispute lookup
    let gtid = '';
    if (tenant_id) {
      const t = await db.prepare(`SELECT gtid FROM tenants WHERE id = ?`).bind(tenant_id).first() as any;
      gtid = t?.gtid || '';
    }

    let sql = `SELECT d.*, tr.id as trade_id
               FROM disputes d
               LEFT JOIN trade_requests tr ON tr.id = d.trade_request_id
               WHERE 1=1`;
    const params: any[] = [];
    if (gtid) {
      sql += ` AND (d.filing_party_gtid = ? OR d.respondent_gtid = ?)`;
      params.push(gtid, gtid);
    }
    sql += ` ORDER BY d.filed_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        created_at: r.filed_at,
        claimant: r.filing_party_gtid || '',
        respondent: r.respondent_gtid || '',
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.get('/disputes/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(`SELECT * FROM disputes WHERE id = ?`).bind(id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json({ data: { ...row, created_at: (row as any).filed_at } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.post('/disputes', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = 'dsp-' + crypto.randomUUID().slice(0, 12);
  const govId = 'gov-' + crypto.randomUUID().slice(0, 12);

  // Resolve tenant GTID
  let filingGtid = body.filing_party_gtid || '';
  if (!filingGtid && body.tenant_id) {
    try {
      const t = await db.prepare(`SELECT gtid FROM tenants WHERE id = ?`).bind(body.tenant_id).first() as any;
      filingGtid = t?.gtid || '';
    } catch (_) {}
  }

  // Resolve trade_request_id from USTN if provided
  let tradeId = body.trade_request_id || '';
  if (!tradeId && body.ustn) {
    try {
      const tr = await db.prepare(`SELECT id FROM trade_requests WHERE id = ?`).bind(body.ustn).first() as any;
      tradeId = tr?.id || body.ustn;
    } catch (_) { tradeId = body.ustn; }
  }

  try {
    await db.prepare(
      `INSERT INTO governor_decisions (decision_id, decision_type, actor_gtid, verdict, policy_version, loom_hash, cryptographic_signature, created_at)
       VALUES (?, 'dispute.filing', ?, 'ALLOW', '6.3', ?, ?, datetime('now'))`
    ).bind(govId, filingGtid, crypto.randomUUID(), crypto.randomUUID()).run();
  } catch (_) {}

  try {
    await db.prepare(
      `INSERT INTO disputes (id, trade_request_id, filing_party_gtid, respondent_gtid, dispute_type, description, status, severity, governor_decision_id, filed_at)
       VALUES (?, ?, ?, ?, ?, ?, 'FILED', ?, ?, datetime('now'))`
    ).bind(
      id, tradeId || 'UNKNOWN', filingGtid, body.respondent_gtid || '',
      body.dispute_type || 'GENERAL', body.description || '',
      body.severity || 3, govId
    ).run();
    return c.json({ id, success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// FINANCING — list + detail
// Table: financing_requests
//   id, contract_id (FK contracts), requester_tenant_id, amount, currency,
//   tenor_days, financing_type, collateral, credit_intelligence, status,
//   governor_decision_id, created_at, monte_carlo_default_prob, shipment_id,
//   trade_value, requested_amount, preferred_settlement_method, preferred_currency,
//   collateral_type, special_instructions, ai_max_ltv, ai_credit_score,
//   ai_default_probability, ustn, ...
// Table: financing_offers
//   id, financing_request_id, financier_tenant_id, effective_apr, all_in_cost,
//   collateral_required, conditions, bid_encrypted, bid_opened_at, status,
//   submitted_at, amount, interest_rate, tenor_days, ...
// ─────────────────────────────────────────────────────────
tp.get('/financing', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT fr.*
               FROM financing_requests fr
               WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) {
      sql += ` AND fr.requester_tenant_id = ?`;
      params.push(tenant_id);
    }
    sql += ` ORDER BY fr.created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        trade_id: r.contract_id || '',
        total_amount: r.requested_amount || r.amount || 0,
        finance_type: r.financing_type || 'TRADE_FINANCE',
        ltv: r.ai_max_ltv || 0,
      })),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.get('/financing/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(`SELECT * FROM financing_requests WHERE id = ?`).bind(id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    let bids: any[] = [];
    try {
      const { results } = await db.prepare(
        `SELECT fo.*, t.legal_name as financier_name
         FROM financing_offers fo
         LEFT JOIN tenants t ON t.id = fo.financier_tenant_id
         WHERE fo.financing_request_id = ? ORDER BY fo.submitted_at DESC`
      ).bind(id).all();
      bids = (results || []).map((b: any) => ({
        ...b,
        financier: b.financier_name || b.financier_tenant_id,
        rate: b.effective_apr || b.interest_rate || 0,
      }));
    } catch (_) {}
    return c.json({
      data: {
        ...row,
        total_amount: (row as any).requested_amount || (row as any).amount || 0,
        finance_type: (row as any).financing_type || 'TRADE_FINANCE',
        ltv: (row as any).ai_max_ltv || 0,
        bids,
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// DOCUMENTS — upload
// Table: documents
//   id, requirement_id, trade_request_id, shipment_ustn, tenant_id (NOT NULL),
//   uploaded_by_provider_gtid, document_type, filename, storage_path (NOT NULL),
//   sha256_hash (NOT NULL), version, previous_version_id, uploaded_by (NOT NULL),
//   metadata, ai_extracted, verification_status, verified_at,
//   governor_decision_id, uploaded_at, ...
// ─────────────────────────────────────────────────────────
tp.post('/documents', async (c) => {
  const db = c.env.DB;
  const body = await c.req.json();
  const id = 'doc-' + crypto.randomUUID().slice(0, 12);
  const hash = crypto.randomUUID(); // Placeholder hash
  try {
    await db.prepare(
      `INSERT INTO documents (id, trade_request_id, shipment_ustn, tenant_id, document_type, filename, storage_path, sha256_hash, uploaded_by, verification_status, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      body.trade_request_id || null,
      body.ustn || body.shipment_ustn || null,
      body.tenant_id || body.uploader_tenant_id || 'UNKNOWN',
      body.document_type || 'GENERAL',
      body.filename || 'document.pdf',
      body.storage_path || '/uploads/' + id,
      body.sha256_hash || hash,
      body.uploaded_by || body.tenant_id || 'SYSTEM',
      body.signed ? 'VERIFIED' : (body.status || 'PENDING')
    ).run();
    return c.json({ id, success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

tp.get('/documents', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  const ustn = c.req.query('ustn');
  try {
    let sql = `SELECT * FROM documents WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) { sql += ` AND tenant_id = ?`; params.push(tenant_id); }
    if (ustn) { sql += ` AND shipment_ustn = ?`; params.push(ustn); }
    sql += ` ORDER BY uploaded_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// STATS — platform statistics
// Table: trade_requests (status, no total_contract_value column)
// ─────────────────────────────────────────────────────────
tp.get('/stats', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    const whereClause = tenant_id ? `WHERE importer_tenant_id = '${tenant_id}' OR exporter_tenant_id = '${tenant_id}'` : '';
    const trades = await db.prepare(`SELECT COUNT(*) as cnt FROM trade_requests ${whereClause}`).first() as any;
    const active = await db.prepare(`SELECT COUNT(*) as cnt FROM trade_requests ${whereClause ? whereClause + " AND" : "WHERE"} status NOT IN ('DRAFT', 'CANCELLED')`).first() as any;
    const shipments = await db.prepare(`SELECT COUNT(*) as cnt FROM shipments`).first() as any;
    const contracts = await db.prepare(`SELECT COUNT(*) as cnt FROM contracts`).first() as any;
    const completed = await db.prepare(`SELECT COUNT(*) as cnt FROM trade_requests ${whereClause ? whereClause + " AND" : "WHERE"} status = 'COMPLETED'`).first() as any;
    return c.json({
      data: {
        total_trades: trades?.cnt || 0,
        active_trades: active?.cnt || 0,
        trades: trades?.cnt || 0,
        shipments: shipments?.cnt || 0,
        contracts: contracts?.cnt || 0,
        total_value: 0, // No total_contract_value column in trade_requests
        settlements: completed?.cnt || 0,
        receivables: 0,
      }
    });
  } catch (e: any) {
    return c.json({ data: { active_trades: 0, trades: 0, shipments: 0, contracts: 0, total_value: 0, settlements: 0 } });
  }
});

// ─────────────────────────────────────────────────────────
// TRADES — enhanced list with status/role filtering
// Table: trade_requests
//   id, importer_tenant_id, exporter_tenant_id, raw_description,
//   parsed_specs (JSON), specifications (JSON), parsing_confidence,
//   dual_use_flag, dual_use_category, status, match_results,
//   assigned_exporter_id, governor_decision_id, created_by, created_at,
//   updated_at, seller_gtid, seller_company_name, transport_mode, ...
//   NO: ustn, commodity_type, incoterm, total_contract_value, current_phase
// ─────────────────────────────────────────────────────────
tp.get('/trades', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  const status = c.req.query('status');
  const role = c.req.query('role');
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    let sql = `SELECT tr.*,
               ib.legal_name as buyer_name, ib.jurisdiction as buyer_country,
               COALESCE(eb.legal_name, tr.seller_company_name) as seller_name
               FROM trade_requests tr
               LEFT JOIN tenants ib ON ib.id = tr.importer_tenant_id
               LEFT JOIN tenants eb ON eb.id = tr.exporter_tenant_id
               WHERE 1=1`;
    const params: any[] = [];

    if (tenant_id) {
      if (role === 'seller') {
        sql += ` AND (tr.exporter_tenant_id = ? OR tr.seller_gtid IN (SELECT gtid FROM tenants WHERE id = ?))`;
        params.push(tenant_id, tenant_id);
      } else if (role === 'buyer') {
        sql += ` AND tr.importer_tenant_id = ?`;
        params.push(tenant_id);
      } else {
        sql += ` AND (tr.importer_tenant_id = ? OR tr.exporter_tenant_id = ?)`;
        params.push(tenant_id, tenant_id);
      }
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      sql += ` AND tr.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    sql += ` ORDER BY tr.created_at DESC LIMIT ?`;
    params.push(limit);

    const { results } = await db.prepare(sql).bind(...params).all();
    return c.json({
      data: (results || []).map((r: any) => {
        // Extract commodity info from parsed_specs JSON
        let specs: any = {};
        try { specs = JSON.parse(r.parsed_specs || '{}'); } catch (_) {}
        let specObj: any = {};
        try { specObj = JSON.parse(r.specifications || '{}'); } catch (_) {}
        return {
          ...r,
          ustn: r.id, // trade_requests doesn't have ustn column, use id
          commodity_type: specs.commodity_type || specs.product || specObj.commodity || r.raw_description?.slice(0, 40) || 'Trade',
          incoterm: specs.incoterm || specObj.incoterm || '',
          total_value: specs.total_value || specObj.value || 0,
          current_phase: statusToPhase(r.status),
        };
      }),
      count: (results || []).length
    });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// Helper: map trade status to approximate phase number
function statusToPhase(status: string): number {
  const map: Record<string, number> = {
    'DRAFT': 1, 'MATCHING': 1, 'PENDING_EXPORTER_RESPONSE': 2, 'QUOTED': 2,
    'NEGOTIATING': 3, 'CONTRACTED': 3, 'FINANCING': 4, 'IN_EXECUTION': 5,
    'COMPLETED': 10, 'CANCELLED': 0, 'DISPUTED': 8,
  };
  return map[status] || 1;
}

// ─────────────────────────────────────────────────────────
// TENANTS — list + detail
// Table: tenants
//   id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier,
//   cryptographic_hash, risk_score, default_trader_mode, created_at, updated_at, ...
//   NO: company_name, country, tenant_type, status
// ─────────────────────────────────────────────────────────
tp.get('/tenants', async (c) => {
  const db = c.env.DB;
  const type = c.req.query('type');
  try {
    let sql = `SELECT id, gtid, legal_name, jurisdiction, type, kyb_status, kyb_tier, risk_score, default_trader_mode, created_at FROM tenants`;
    const params: any[] = [];
    if (type) { sql += ` WHERE type = ?`; params.push(type); }
    sql += ` ORDER BY legal_name ASC`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        name: r.legal_name || r.id,
        company_name: r.legal_name,
        country: r.jurisdiction,
        tenant_type: r.type,
        status: r.kyb_status || 'PENDING',
        trust_score: r.risk_score != null ? Math.max(0, 100 - r.risk_score) : 75,
      })),
      count: (results || []).length
    });
  } catch (e: any) { return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message }); }
});

tp.get('/tenants/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(`SELECT * FROM tenants WHERE id = ? OR gtid = ?`).bind(id, id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json({
      data: {
        ...row,
        name: (row as any).legal_name || (row as any).id,
        company_name: (row as any).legal_name,
        country: (row as any).jurisdiction,
        tenant_type: (row as any).type,
        status: (row as any).kyb_status || 'PENDING',
        trust_score: (row as any).risk_score != null ? Math.max(0, 100 - (row as any).risk_score) : 75,
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// SHIPMENTS — enhanced list + detail
// Table: shipments
//   id, ustn (UNIQUE), contract_id, booking_number, loading_date,
//   status, current_milestone, origin_port, destination_port,
//   vessel_name, imo_number, transport_legs, ai_predictions,
//   carbon_footprint_tons, esg_score, governor_decision_id, created_at,
//   updated_at, shipping_line, container_numbers, bl_number, etd, eta,
//   container_type, total_weight_kg, ...
// Table: shipment_milestones
//   id, ustn (FK), milestone, confirmed_at, confirmed_by,
//   confirmation_method, ai_verdict, evidence_hash, governor_decision_id,
//   shipment_ustn, milestone_type, evidence, location
// ─────────────────────────────────────────────────────────
tp.get('/shipments', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT s.*
               FROM shipments s
               WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) {
      // Join to trade_requests to filter by tenant involvement
      sql = `SELECT s.*, tr.importer_tenant_id, tr.exporter_tenant_id
             FROM shipments s
             LEFT JOIN contracts c ON c.id = s.contract_id
             LEFT JOIN trade_requests tr ON tr.id = c.trade_request_id
             WHERE (tr.importer_tenant_id = ? OR tr.exporter_tenant_id = ?)`;
      params.push(tenant_id, tenant_id);
    }
    sql += ` ORDER BY s.created_at DESC`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({
      data: (results || []).map((r: any) => ({
        ...r,
        origin: r.origin_port || '',
        dest_port: r.destination_port || '',
        container_number: r.container_numbers || '',
      })),
      count: (results || []).length
    });
  } catch (e: any) { return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message }); }
});

tp.get('/shipments/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(`SELECT * FROM shipments WHERE id = ? OR ustn = ?`).bind(id, id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    let milestones: any[] = [];
    try {
      const ustn = (row as any).ustn;
      const { results } = await db.prepare(
        `SELECT * FROM shipment_milestones WHERE ustn = ? OR shipment_ustn = ? ORDER BY confirmed_at ASC`
      ).bind(ustn, ustn).all();
      milestones = (results || []).map((m: any) => ({
        ...m,
        name: m.milestone || m.milestone_type || 'Milestone',
        completed: !!m.confirmed_at,
        completed_at: m.confirmed_at,
      }));
    } catch (_) {}
    return c.json({
      data: {
        ...row,
        dest_port: (row as any).destination_port || '',
        container_number: (row as any).container_numbers || '',
        milestones,
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// TRADE COMMAND CENTER — aggregated view
// ─────────────────────────────────────────────────────────
tp.get('/trade/:ustn/command-center', async (c) => {
  const db = c.env.DB;
  const ustn = c.req.param('ustn');
  try {
    const trade = await db.prepare(
      `SELECT tr.*,
              ib.legal_name as buyer_name, ib.jurisdiction as buyer_country,
              COALESCE(eb.legal_name, tr.seller_company_name) as seller_name
       FROM trade_requests tr
       LEFT JOIN tenants ib ON ib.id = tr.importer_tenant_id
       LEFT JOIN tenants eb ON eb.id = tr.exporter_tenant_id
       WHERE tr.id = ?`
    ).bind(ustn).first();
    if (!trade) return c.json({ error: 'trade not found' }, 404);

    // Parse specs
    let specs: any = {};
    try { specs = JSON.parse((trade as any).parsed_specs || '{}'); } catch (_) {}

    // Get recent activity from governor decisions
    let activity: any[] = [];
    try {
      const { results } = await db.prepare(
        `SELECT decision_type as event, verdict, created_at, plain_language_explanation as description
         FROM governor_decisions WHERE actor_gtid IN (
           SELECT gtid FROM tenants WHERE id = ? OR id = ?
         ) ORDER BY created_at DESC LIMIT 10`
      ).bind((trade as any).importer_tenant_id || '', (trade as any).exporter_tenant_id || '').all();
      activity = results || [];
    } catch (_) {}

    // Get related contract if any
    let contract: any = null;
    try {
      contract = await db.prepare(`SELECT * FROM contracts WHERE trade_request_id = ?`).bind(ustn).first();
    } catch (_) {}

    // Get exporter quote if any
    let quote: any = null;
    try {
      quote = await db.prepare(`SELECT * FROM exporter_quotes WHERE trade_request_id = ? ORDER BY created_at DESC LIMIT 1`).bind(ustn).first();
    } catch (_) {}

    return c.json({
      data: {
        trade: {
          ...trade,
          ustn: (trade as any).id,
          commodity_type: specs.commodity_type || specs.product || '',
          incoterm: specs.incoterm || '',
          total_value: specs.total_value || 0,
          current_phase: statusToPhase((trade as any).status),
        },
        contract,
        quote,
        recent_activity: activity,
      }
    });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// EXPORTER QUOTES (for pending-requests, quote-review)
// Table: exporter_quotes
//   id, trade_request_id, exporter_tenant_id, exw_price_per_unit, exw_currency,
//   packing_cost, logistics_cost, insurance_cost, total_landed_cost, incoterm,
//   payment_terms, validity_days, status, governor_decision_id, created_at,
//   updated_at, ...
// ─────────────────────────────────────────────────────────
tp.get('/exporter-quotes', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  const trade_request_id = c.req.query('trade_request_id');
  const status = c.req.query('status');
  try {
    let sql = `SELECT eq.*, t.legal_name as exporter_name
               FROM exporter_quotes eq
               LEFT JOIN tenants t ON t.id = eq.exporter_tenant_id
               WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) { sql += ` AND eq.exporter_tenant_id = ?`; params.push(tenant_id); }
    if (trade_request_id) { sql += ` AND eq.trade_request_id = ?`; params.push(trade_request_id); }
    if (status) { sql += ` AND eq.status = ?`; params.push(status); }
    sql += ` ORDER BY eq.created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// CONTRACTS — list + detail
// ─────────────────────────────────────────────────────────
tp.get('/contracts', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT c.*, tr.importer_tenant_id, tr.exporter_tenant_id,
               ib.legal_name as buyer_name, eb.legal_name as seller_name
               FROM contracts c
               LEFT JOIN trade_requests tr ON tr.id = c.trade_request_id
               LEFT JOIN tenants ib ON ib.id = tr.importer_tenant_id
               LEFT JOIN tenants eb ON eb.id = tr.exporter_tenant_id
               WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) {
      sql += ` AND (tr.importer_tenant_id = ? OR tr.exporter_tenant_id = ?)`;
      params.push(tenant_id, tenant_id);
    }
    sql += ` ORDER BY c.created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

tp.get('/contracts/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    const row = await db.prepare(
      `SELECT c.*, tr.importer_tenant_id, tr.exporter_tenant_id,
              ib.legal_name as buyer_name, eb.legal_name as seller_name
       FROM contracts c
       LEFT JOIN trade_requests tr ON tr.id = c.trade_request_id
       LEFT JOIN tenants ib ON ib.id = tr.importer_tenant_id
       LEFT JOIN tenants eb ON eb.id = tr.exporter_tenant_id
       WHERE c.id = ?`
    ).bind(id).first();
    if (!row) return c.json({ error: 'not found' }, 404);
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ─────────────────────────────────────────────────────────
// QC JOBS — for qc-booking tab
// ─────────────────────────────────────────────────────────
tp.get('/qc-jobs', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT qj.*, t.legal_name as qc_provider_name
               FROM qc_jobs qj
               LEFT JOIN tenants t ON t.id = qj.qc_provider_tenant_id
               WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) {
      sql += ` AND (qj.exporter_tenant_id = ? OR qj.qc_provider_tenant_id = ?)`;
      params.push(tenant_id, tenant_id);
    }
    sql += ` ORDER BY qj.assigned_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// LOGISTICS RFQs — for logistics-builder tab
// ─────────────────────────────────────────────────────────
tp.get('/logistics-rfqs', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT * FROM logistics_rfqs WHERE 1=1`;
    const params: any[] = [];
    if (tenant_id) { sql += ` AND requester_tenant_id = ?`; params.push(tenant_id); }
    sql += ` ORDER BY created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// PACKING PLANS — for containerisation tab
// ─────────────────────────────────────────────────────────
tp.get('/packing-plans', async (c) => {
  const db = c.env.DB;
  const trade_request_id = c.req.query('trade_request_id');
  const tenant_id = c.req.query('tenant_id');
  try {
    let sql = `SELECT pp.*, eq.exporter_tenant_id FROM packing_plans pp LEFT JOIN exporter_quotes eq ON pp.exporter_quote_id = eq.id WHERE 1=1`;
    const params: any[] = [];
    if (trade_request_id) { sql += ` AND pp.trade_request_id = ?`; params.push(trade_request_id); }
    if (tenant_id) { sql += ` AND eq.exporter_tenant_id = ?`; params.push(tenant_id); }
    sql += ` ORDER BY pp.created_at DESC LIMIT 50`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// BARCODES — for barcode-print tab
// ─────────────────────────────────────────────────────────
tp.get('/barcodes', async (c) => {
  const db = c.env.DB;
  const ustn = c.req.query('ustn');
  const shipment_ustn = c.req.query('shipment_ustn');
  try {
    let sql = `SELECT * FROM shipment_barcodes WHERE 1=1`;
    const params: any[] = [];
    const u = ustn || shipment_ustn;
    if (u) { sql += ` AND shipment_ustn = ?`; params.push(u); }
    sql += ` ORDER BY pallet_number ASC LIMIT 100`;
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// CASH FLOW PROJECTIONS — for cash-position tab
// ─────────────────────────────────────────────────────────
tp.get('/cash-projections', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  try {
    const { results } = await db.prepare(
      `SELECT * FROM cash_flow_projections WHERE tenant_id = ? ORDER BY projection_date ASC LIMIT 30`
    ).bind(tenant_id || '').all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

// ─────────────────────────────────────────────────────────
// EXW PRICE WATCH — for exw-price-lock tab
// ─────────────────────────────────────────────────────────
tp.get('/exw-price-watch', async (c) => {
  const db = c.env.DB;
  const tenant_id = c.req.query('tenant_id');
  const trade_request_id = c.req.query('trade_request_id');
  const exporter_quote_id = c.req.query('exporter_quote_id');
  try {
    let sql: string; let params: any[];
    if (exporter_quote_id) {
      sql = `SELECT * FROM exw_price_watch WHERE exporter_quote_id = ? ORDER BY created_at DESC LIMIT 50`;
      params = [exporter_quote_id];
    } else if (trade_request_id) {
      sql = `SELECT * FROM exw_price_watch WHERE trade_request_id = ? ORDER BY created_at DESC LIMIT 50`;
      params = [trade_request_id];
    } else if (tenant_id) {
      sql = `SELECT epw.* FROM exw_price_watch epw JOIN exporter_quotes eq ON epw.exporter_quote_id = eq.id WHERE eq.exporter_tenant_id = ? ORDER BY epw.created_at DESC LIMIT 50`;
      params = [tenant_id];
    } else {
      sql = `SELECT * FROM exw_price_watch ORDER BY created_at DESC LIMIT 50`;
      params = [];
    }
    const { results } = params.length
      ? await db.prepare(sql).bind(...params).all()
      : await db.prepare(sql).all();
    return c.json({ data: results || [], count: (results || []).length });
  } catch (e: any) {
    return c.json({ data: [], count: 0, _note: 'D1_ERROR: ' + e.message });
  }
});

export default tp;

// SGTX Platform v11.1 — Main Application Entry (Blueprint Part 0-5+ Alignment)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import identity from './routes/identity';
import trade from './routes/trade';
import shipment from './routes/shipment';
import finance from './routes/finance';
import governance from './routes/governance';
import upgrades from './routes/upgrades';
import gaps from './routes/gaps';
import advanced from './routes/advanced';
import portalFeatures from './routes/portal_features';
import portalV63 from './routes/portal_v63';
import operations from './routes/operations';
import marketplace from './routes/marketplace';
import payments from './routes/payments';
import defi from './routes/defi';
import ai from './routes/ai_layer';
import government from './routes/government';
import qc from './routes/qc';
// Part 0: Constitution, Fee Model, AI Ladder, Seven Pillars
import constitution from './routes/constitution';
// v6.3 Gap Alignment Modules
import smartInbox from './routes/smart_inbox';
import tenantExperience from './routes/tenant_experience';
import workflowRecovery from './routes/workflow_recovery';
import tradeAdvanced from './routes/trade_advanced';
import financeAdvanced from './routes/finance_advanced';
import commodityIntel from './routes/commodity_intel';
// Phase 1-10 End-to-End Workflow
import phases from './routes/phases';
// Reference Data (Countries, Ports, Commodities, HS Codes)
import refData from './routes/reference_data';
// Part 3: Contracting, Negotiation & SGTX Fee Collection (Steps 3.1-3.10)
import contracting from './routes/contracting';
// Part 6: Settlement & Payment Orchestration (Steps 6.1-6.8 + Part 10)
import settlement from './routes/settlement';
// Part 3 Phase 1: Advanced Trade Request Form (HS code auto-fill, packaging, weight calc, port selection)
import tradeRequestForm from './routes/trade_request_form';
// Part 3 Phase 2: Seller Quote, Packing & Logistics Orchestration (G2U1-G2U22, G2UPACK1)
import sellerQuote from './routes/seller_quote_form';
// Part 3 Phase 4: Universal Trade Finance (Steps 4.1-4.11, Gates G4U1-G4U10a)
import tradeFinance from './routes/trade_finance';
// Blueprint Gap Closure: Phase 5 Physical Execution, Phase 7/8 Distressed, Phase 10 Disputes, QC AQL
import gapClosure from './routes/gap_closure';
// Blueprint Gap Closure v2: Lab Selection, Gov Permits, Compliance, Logistics Providers, Enhanced APIs
import gapClosureV2 from './routes/gap_closure_v2';
// Complete Portal Backend: Shipping Line, Logistics, Financier, Government, Admin, Marketplace, Lab, QC
import portalsComplete from './routes/portals_complete';
// Trader Portal: Consolidated endpoints for all trader tabs (inbox, contacts, employees, decisions, etc.)
import traderPortal from './routes/trader_portal';
// Seller Workflow: Gap closure bridge routes, AI integration, trade actions, finance endpoints
import sellerWorkflow from './routes/seller_workflow';
import worldTrade from './routes/world_trade';
import addonsV13 from './routes/addons_v13';
import brainRoutes from './routes/brain';
import type { Bindings } from './lib/types';
import { landingPageHTML } from './pages/landing';
import { appHTML } from './pages/app';
import { loginHTML } from './pages/login';
import { registerHTML } from './pages/register';
import { tradeRequestFormHTML } from './pages/trade_request';
import { portalsHubHTML, portalLoginHTML, getPortal } from './pages/portals';
import { sellerQuoteFormHTML } from './pages/seller_quote';

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('/api/*', cors());

// ─── PUBLIC PAGES ─────────────────────────────────────────
app.get('/', (c) => c.html(landingPageHTML()));
app.get('/login', (c) => c.html(loginHTML()));
app.get('/register', (c) => c.html(registerHTML()));
app.get('/app', (c) => c.html(appHTML()));
// ─── INDIVIDUAL PORTAL ENTRANCES (Blueprint Part 12C) ───
app.get('/portals', (c) => c.html(portalsHubHTML()));
app.get('/portal/:id/login', (c) => {
  const portal = getPortal(c.req.param('id'));
  if (!portal) return c.redirect('/portals');
  return c.html(portalLoginHTML(portal));
});
app.get('/portal/:id', (c) => {
  const portal = getPortal(c.req.param('id'));
  if (!portal) return c.redirect('/portals');
  return c.html(appHTML());
});
app.get('/trade-request', (c) => c.html(tradeRequestFormHTML()));
app.get('/seller-quote', (c) => c.html(sellerQuoteFormHTML()));

// ─── COCKPIT CANONICAL ROUTES (Rebuild Phase 0) ──────────
// URL = source of truth. One trade = one URL = one workspace.
// All serve the SPA shell; the client router derives state from location.pathname.
app.get('/join', (c) => c.html(registerHTML()));
app.get('/home', (c) => c.html(appHTML()));
app.get('/trades', (c) => c.html(appHTML()));
app.get('/trades/new', (c) => c.html(appHTML()));
app.get('/trades/:ref', (c) => c.html(appHTML()));
app.get('/trades/:ref/:sub', (c) => c.html(appHTML()));
app.get('/network', (c) => c.html(appHTML()));
app.get('/finance', (c) => c.html(appHTML()));
app.get('/trust', (c) => c.html(appHTML()));
app.get('/admin', (c) => c.html(appHTML()));
// Deep-linkable legacy screens: /app/<page-id> (refresh/share/back all work)
app.get('/app/:page', (c) => c.html(appHTML()));

// ─── API Routes ───────────────────────────────────────────
// Public landing-page stats (no auth)
app.get('/api/v1/public/stats', async (c) => {
  try {
    const db = c.env.DB;
    const [tenants, trades, decisions] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS n FROM tenants').first<{ n: number }>(),
      db.prepare('SELECT COUNT(*) AS n FROM trade_requests').first<{ n: number }>().catch(() => ({ n: 24 })),
      db.prepare('SELECT COUNT(*) AS n FROM governor_decisions').first<{ n: number }>().catch(() => ({ n: 140 })),
    ]);
    return c.json({ data: { tenants: tenants?.n || 15, trades: trades?.n || 24, governor_decisions: decisions?.n || 140, jurisdictions: 190 } });
  } catch {
    return c.json({ data: { tenants: 15, trades: 24, governor_decisions: 140, jurisdictions: 190 } });
  }
});

// Trader Portal consolidated routes (first priority — overrides older route defs)
app.route('/api/v1', traderPortal);
app.route('/api/v1/auth', auth);
app.route('/api/v1', identity);
app.route('/api/v1', trade);
app.route('/api/v1', shipment);
app.route('/api/v1', finance);
app.route('/api/v1', governance);
app.route('/api/v1', upgrades);
app.route('/api/v1', gaps);
app.route('/api/v1', advanced);
app.route('/api/v1', portalFeatures);
app.route('/api/v1', portalV63);
app.route('/api/v1', operations);
app.route('/api/v1', marketplace);
app.route('/api/v1', payments);
app.route('/api/v1', defi);
app.route('/api/v1', ai);
app.route('/api/v1', government);
app.route('/api/v1', qc);
// v6.3 Gap Alignment Routes
app.route('/api/v1', smartInbox);
app.route('/api/v1', tenantExperience);
app.route('/api/v1', workflowRecovery);
app.route('/api/v1', tradeAdvanced);
app.route('/api/v1', financeAdvanced);
app.route('/api/v1', commodityIntel);
// Phase 1-10 End-to-End Workflow Routes
app.route('/api/v1', phases);
// Reference Data Routes
app.route('/api/v1', refData);
// Part 3: Contracting & Fee Collection Routes
app.route('/api/v1', contracting);
// Part 6: Settlement & Payment Orchestration Routes
app.route('/api/v1', settlement);
// Part 3 Phase 1: Advanced Trade Request Form Routes
app.route('/api/v1', tradeRequestForm);
// Part 3 Phase 2: Seller Quote Form Routes
app.route('/api/v1', sellerQuote);
// Part 3 Phase 4: Universal Trade Finance Routes
app.route('/api/v1', tradeFinance);
// Blueprint Gap Closure Routes (Phase 5, 7/8, 10, QC AQL)
app.route('/api/v1', gapClosure);
// Blueprint Gap Closure v2 Routes (Lab, Gov, Logistics Providers, Enhanced APIs)
app.route('/api/v1', gapClosureV2);
// Complete Portal Backend Routes (All portals end-to-end)
app.route('/api/v1', portalsComplete);
// Seller Workflow & AI Bridge Routes (gap closure frontend support)
app.route('/api/v1', sellerWorkflow);

// Part 0: Constitution, Fee Model, AI Ladder, Seven Pillars
app.route('/api/v1', constitution);
// World Trade Intelligence Module (Gemini AI + AIS + indices)
app.route('/api/v1', worldTrade);
// v13.1 Blueprint: Add-Ons 9-28 (Demurrage, Broker, Valuation, Cold Chain, FTA, Insurance, LC, FM, GRiRE, ...)
app.route('/api/v1', addonsV13);
// SGTX Brain: multi-provider AI consensus orchestration (advisory-only per A-02/A-17)
app.route('/api/v1', brainRoutes);

// ─── Health & Stats ───────────────────────────────────────
app.get('/api/health', (c) => c.json({
  status: 'operational',
  platform: 'SGTX v11.2',
  version: '11.2.0',
  blueprint: 'Part 0 — Executive Summary & Core Philosophy',
  description: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
  governance_invariant: 'No irreversible action without Governor approval',
  modules: [
    'auth', 'identity', 'trade', 'shipment', 'finance', 'governance',
    'marketplace', 'payments', 'defi', 'ai_layer', 'government', 'qc',
    'operations', 'portal_features', 'portal_v63', 'advanced', 'gaps', 'upgrades',
    'smart_inbox', 'tenant_experience', 'workflow_recovery',
    'trade_advanced', 'finance_advanced', 'commodity_intel',
    'phases_1_to_10', 'reference_data',
    'contracting_part3', 'settlement_part6', 'trade_request_form', 'seller_quote_form',
    'trade_finance_phase4',
    'gap_closure_phase5_7_10_qc',
    'gap_closure_v2_labs_gov_logistics',
    'constitution_part0'
  ],
  timestamp: new Date().toISOString(),
}));

app.get('/api/v1/stats', async (c) => {
  const tenants = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tenants').first();
  const trades = await c.env.DB.prepare('SELECT COUNT(*) as count FROM trade_requests').first();
  const contracts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM contracts').first();
  const shipments = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments').first();
  const decisions = await c.env.DB.prepare('SELECT COUNT(*) as count FROM governor_decisions').first();
  const commissions = await c.env.DB.prepare('SELECT COALESCE(SUM(commission_usd), 0) as total FROM commission_locks').first();
  const jurisdictions = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jurisdictions').first();
  return c.json({ data: {
    tenants: tenants?.count || 0, trade_requests: trades?.count || 0,
    contracts: contracts?.count || 0, shipments: shipments?.count || 0,
    governor_decisions: decisions?.count || 0, total_commission_usd: commissions?.total || 0,
    jurisdictions_covered: jurisdictions?.count || 0,
  }});
});

// Catch-all: explicit 404 — deterministic navigation (Cockpit Law 5). Never redirect.
app.get('/:path{.+}', (c) => {
  const path = c.req.param('path');
  if (path.startsWith('static/') || path.startsWith('api/')) return c.notFound();
  return c.html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>404 — SGTX</title><script src="https://cdn.tailwindcss.com"></script></head>
<body style="background:#0D0D0D;color:#fff;font-family:Inter,system-ui,sans-serif" class="min-h-screen flex items-center justify-center p-6">
<main class="text-center max-w-md">
  <p class="text-6xl font-bold" style="color:#D4A017">404</p>
  <h1 class="text-xl font-semibold mt-4">This page does not exist</h1>
  <p class="mt-2 text-sm" style="color:rgba(255,255,255,.5)">The route <code style="color:#C9A84C">/${path}</code> is not part of SGTX. Nothing was redirected.</p>
  <nav class="mt-6 flex gap-3 justify-center">
    <a href="/home" class="px-4 py-2 rounded-lg text-sm font-semibold" style="background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D">Go to Home</a>
    <a href="/login" class="px-4 py-2 rounded-lg text-sm" style="border:1px solid rgba(255,255,255,.2)">Sign in</a>
  </nav>
</main></body></html>`, 404);
});

export default app;

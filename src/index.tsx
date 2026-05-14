// SGTX Platform v6.3 — Main Application Entry (Full Blueprint Alignment)
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
import type { Bindings } from './lib/types';
import { landingPageHTML } from './pages/landing';
import { appHTML } from './pages/app';
import { loginHTML } from './pages/login';
import { registerHTML } from './pages/register';
import { tradeRequestFormHTML } from './pages/trade_request';
import { sellerQuoteFormHTML } from './pages/seller_quote';

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('/api/*', cors());

// ─── PUBLIC PAGES ─────────────────────────────────────────
app.get('/', (c) => c.html(landingPageHTML()));
app.get('/login', (c) => c.html(loginHTML()));
app.get('/register', (c) => c.html(registerHTML()));
app.get('/app', (c) => c.html(appHTML()));
app.get('/trade-request', (c) => c.html(tradeRequestFormHTML()));
app.get('/seller-quote', (c) => c.html(sellerQuoteFormHTML()));

// ─── API Routes ───────────────────────────────────────────
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

// ─── Health & Stats ───────────────────────────────────────
app.get('/api/health', (c) => c.json({
  status: 'operational',
  platform: 'SGTX v6.3',
  version: '6.3.0',
  description: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
  governance_invariant: 'No irreversible action without Governor approval',
  modules: [
    'auth', 'identity', 'trade', 'shipment', 'finance', 'governance',
    'marketplace', 'payments', 'defi', 'ai_layer', 'government', 'qc',
    'operations', 'portal_features', 'portal_v63', 'advanced', 'gaps', 'upgrades',
    'smart_inbox', 'tenant_experience', 'workflow_recovery',
    'trade_advanced', 'finance_advanced', 'commodity_intel',
    'phases_1_to_10', 'reference_data',
    'contracting_part3', 'settlement_part6', 'trade_request_form', 'seller_quote_form'
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

// Catch-all: redirect unknown routes to landing
app.get('/:path{.+}', (c) => {
  const path = c.req.param('path');
  if (path.startsWith('static/') || path.startsWith('api/')) return c.notFound();
  return c.redirect('/');
});

export default app;

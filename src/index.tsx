// SGTX Platform v6.1 — Main Application Entry
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
import type { Bindings } from './lib/types';
import { landingPageHTML } from './pages/landing';
import { appHTML } from './pages/app';
import { loginHTML } from './pages/login';
import { registerHTML } from './pages/register';

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('/api/*', cors());

// ─── PUBLIC PAGES ─────────────────────────────────────────
app.get('/', (c) => c.html(landingPageHTML()));
app.get('/login', (c) => c.html(loginHTML()));
app.get('/register', (c) => c.html(registerHTML()));
app.get('/app', (c) => c.html(appHTML()));

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

// ─── Health & Stats ───────────────────────────────────────
app.get('/api/health', (c) => c.json({
  status: 'operational',
  platform: 'SGTX v6.3',
  description: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
  governance_invariant: 'No irreversible action without Governor approval',
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

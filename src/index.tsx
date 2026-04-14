// SGTX Platform — Main Application Entry (v6.1)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import identity from './routes/identity';
import trade from './routes/trade';
import shipment from './routes/shipment';
import finance from './routes/finance';
import governance from './routes/governance';
import type { Bindings } from './lib/types';

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('/api/*', cors());

// API Routes
app.route('/api/v1', identity);
app.route('/api/v1', trade);
app.route('/api/v1', shipment);
app.route('/api/v1', finance);
app.route('/api/v1', governance);

// Health check
app.get('/api/health', (c) => c.json({
  status: 'operational',
  platform: 'SGTX v6.1',
  description: 'Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure',
  governance_invariant: 'No irreversible action without Governor approval',
  timestamp: new Date().toISOString(),
}));

// Platform stats endpoint
app.get('/api/v1/stats', async (c) => {
  const tenants = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tenants').first();
  const trades = await c.env.DB.prepare('SELECT COUNT(*) as count FROM trade_requests').first();
  const contracts = await c.env.DB.prepare('SELECT COUNT(*) as count FROM contracts').first();
  const shipments = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments').first();
  const decisions = await c.env.DB.prepare('SELECT COUNT(*) as count FROM governor_decisions').first();
  const commissions = await c.env.DB.prepare('SELECT COALESCE(SUM(commission_usd), 0) as total FROM commission_locks').first();
  const jurisdictions = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jurisdictions').first();

  return c.json({
    data: {
      tenants: tenants?.count || 0,
      trade_requests: trades?.count || 0,
      contracts: contracts?.count || 0,
      shipments: shipments?.count || 0,
      governor_decisions: decisions?.count || 0,
      total_commission_usd: commissions?.total || 0,
      jurisdictions_covered: jurisdictions?.count || 0,
    }
  });
});

// Dashboard HTML
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform v6.1 — Sovereign Trade Execution</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        sgtx: { 50:'#f0f0ff', 100:'#e0e0ff', 200:'#c4c0ff', 300:'#a49aff', 400:'#7c6eff', 500:'#4E3FE8', 600:'#3d2fc0', 700:'#2d2290', 800:'#1e1660', 900:'#0f0b30' },
        governor: { allow:'#10B981', deny:'#EF4444', conditional:'#F59E0B', escalate:'#8B5CF6', pending:'#6B7280' }
      }
    }
  }
}
</script>
<style>
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease-out; }
.tab-active { border-bottom: 3px solid #4E3FE8; color: #4E3FE8; font-weight: 600; }
.verdict-ALLOW { color: #10B981; } .verdict-DENY { color: #EF4444; }
.verdict-CONDITIONAL { color: #F59E0B; } .verdict-ESCALATE { color: #8B5CF6; }
.status-badge { padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
.status-ACTIVE,.status-VERIFIED,.status-ALLOW,.status-COMPLETED,.status-DELIVERED { background: #D1FAE5; color: #065F46; }
.status-PENDING,.status-DRAFT,.status-CREATED,.status-SUBMITTED,.status-REQUESTED { background: #FEF3C7; color: #92400E; }
.status-LOCKED,.status-CONTRACTED,.status-IN_EXECUTION,.status-IN_TRANSIT { background: #DBEAFE; color: #1E40AF; }
.status-DENIED,.status-BLOCKED,.status-CANCELLED,.status-DISPUTED,.status-DISTRESSED { background: #FEE2E2; color: #991B1B; }
.status-CONDITIONAL,.status-ESCALATE,.status-HIGH_RISK { background: #FDE68A; color: #78350F; }
.card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #E5E7EB; }
.sidebar-item { padding: 10px 16px; cursor: pointer; border-radius: 8px; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
.sidebar-item:hover { background: #F3F4F6; } .sidebar-item.active { background: #EDE9FE; color: #4E3FE8; font-weight: 600; }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal-content { background: white; border-radius: 16px; padding: 24px; max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto; }
</style>
</head>
<body class="bg-gray-50 text-gray-800">
<div id="app" class="flex h-screen overflow-hidden">
<!-- Sidebar -->
<aside id="sidebar" class="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
  <div class="p-5 border-b border-gray-100">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-sgtx-500 rounded-xl flex items-center justify-center"><i class="fas fa-shield-halved text-white text-lg"></i></div>
      <div><div class="font-bold text-lg text-sgtx-800">SGTX</div><div class="text-[10px] text-gray-400 -mt-0.5 tracking-wider">PLATFORM v6.1</div></div>
    </div>
    <div class="mt-3 text-[10px] text-gray-400 italic">Sovereign Trade Execution</div>
  </div>
  <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-1" id="nav-items">
    <div class="sidebar-item active" onclick="navigate('dashboard')"><i class="fas fa-chart-line w-5 text-center"></i><span>Dashboard</span></div>
    <div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">Identity</div>
    <div class="sidebar-item" onclick="navigate('tenants')"><i class="fas fa-building w-5 text-center"></i><span>Tenants</span></div>
    <div class="sidebar-item" onclick="navigate('trust')"><i class="fas fa-star w-5 text-center"></i><span>Trust Scores</span></div>
    <div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">Trade</div>
    <div class="sidebar-item" onclick="navigate('trades')"><i class="fas fa-handshake w-5 text-center"></i><span>Trade Requests</span></div>
    <div class="sidebar-item" onclick="navigate('contracts')"><i class="fas fa-file-contract w-5 text-center"></i><span>Contracts</span></div>
    <div class="sidebar-item" onclick="navigate('commissions')"><i class="fas fa-coins w-5 text-center"></i><span>Commission Locks</span></div>
    <div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">Execution</div>
    <div class="sidebar-item" onclick="navigate('shipments')"><i class="fas fa-ship w-5 text-center"></i><span>Shipments</span></div>
    <div class="sidebar-item" onclick="navigate('settlements')"><i class="fas fa-money-bill-wave w-5 text-center"></i><span>Settlements</span></div>
    <div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">Finance</div>
    <div class="sidebar-item" onclick="navigate('financing')"><i class="fas fa-university w-5 text-center"></i><span>Financing</span></div>
    <div class="sidebar-item" onclick="navigate('distressed')"><i class="fas fa-exclamation-triangle w-5 text-center"></i><span>Distressed Cargo</span></div>
    <div class="sidebar-item" onclick="navigate('payments')"><i class="fas fa-credit-card w-5 text-center"></i><span>Payments</span></div>
    <div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">Governance</div>
    <div class="sidebar-item" onclick="navigate('governor')"><i class="fas fa-gavel w-5 text-center"></i><span>Governor Decisions</span></div>
    <div class="sidebar-item" onclick="navigate('jurisdictions')"><i class="fas fa-globe w-5 text-center"></i><span>Jurisdictions</span></div>
    <div class="sidebar-item" onclick="navigate('compliance')"><i class="fas fa-clipboard-check w-5 text-center"></i><span>Compliance</span></div>
    <div class="sidebar-item" onclick="navigate('audit')"><i class="fas fa-history w-5 text-center"></i><span>Audit Log</span></div>
    <div class="sidebar-item" onclick="navigate('esg')"><i class="fas fa-leaf w-5 text-center"></i><span>ESG Scores</span></div>
  </nav>
  <div class="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
    <div>Governance Invariant:</div>
    <div class="font-semibold text-sgtx-600">No irreversible action without Governor approval</div>
  </div>
</aside>
<!-- Main Content -->
<main class="flex-1 overflow-y-auto">
  <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center justify-between">
    <div>
      <h1 id="page-title" class="text-xl font-bold text-gray-800">Dashboard</h1>
      <p id="page-subtitle" class="text-xs text-gray-400">Sovereign, AI-Governed, Non-Custodial Global Trade Execution</p>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium"><i class="fas fa-circle text-[6px] mr-1"></i>Operational</span>
      <button onclick="showCreateModal()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sgtx-600 transition"><i class="fas fa-plus mr-1"></i>New</button>
    </div>
  </header>
  <div id="content" class="p-6 fade-in"></div>
</main>
</div>

<!-- Modal -->
<div id="modal" class="modal-overlay hidden" onclick="if(event.target===this)closeModal()">
  <div class="modal-content" id="modal-body"></div>
</div>

<script src="/static/app.js"></script>
</body>
</html>`);
});

// Catch-all for SPA routing
app.get('/:path{.+}', async (c) => {
  // Check if it's a static file request
  const path = c.req.param('path');
  if (path.startsWith('static/') || path.startsWith('api/')) {
    return c.notFound();
  }
  // Otherwise redirect to main page
  return c.redirect('/');
});

export default app;

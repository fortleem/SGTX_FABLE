// SGTX Platform v6.1 — Full Frontend Application
const API = '/api/v1';
let currentPage = 'dashboard';
let currentPortal = 'dashboard';
let currentMode = 'DUAL';
let chartInstance = null;
let authToken = null;
let tenant = null;
let employee = null;

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  authToken = localStorage.getItem('sgtx_token');
  tenant = JSON.parse(localStorage.getItem('sgtx_tenant') || 'null');
  employee = JSON.parse(localStorage.getItem('sgtx_employee') || 'null');
  
  if (authToken && tenant) {
    document.getElementById('tenant-info').innerHTML = `<div class="font-semibold text-sgtx-600">${tenant.legal_name}</div><div class="text-[10px] text-gray-400 font-mono">${tenant.gtid || ''}</div><div class="mt-1">${badge(tenant.kyb_status || 'PENDING')}</div>`;
    document.getElementById('user-name').textContent = employee?.full_name || employee?.email || '—';
    // Auto-select portal based on tenant type
    const typePortalMap = { CORPORATE: 'importer', FINANCIAL: 'financier', LOGISTICS: 'logistics', QUALITY_CONTROL: 'qc' };
    const defaultPortal = typePortalMap[tenant.type] || 'dashboard';
    document.getElementById('portal-select').value = defaultPortal;
    switchPortal(defaultPortal);
  } else {
    switchPortal('dashboard');
  }
  navigate('dashboard');
});

// ─── AUTH ────────────────────────────────────────────────
function logout() {
  if (authToken) fetch(`${API}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } }).catch(() => {});
  localStorage.removeItem('sgtx_token');
  localStorage.removeItem('sgtx_tenant');
  localStorage.removeItem('sgtx_employee');
  window.location.href = '/login';
}

// ─── PORTAL SWITCHING ───────────────────────────────────
function switchPortal(portal) {
  currentPortal = portal;
  const nav = document.getElementById('nav-items');
  const portalMenus = {
    dashboard: [
      { section: 'Overview' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
      { section: 'Identity' },
      { id: 'tenants', icon: 'fa-building', label: 'Tenants' },
      { id: 'trust', icon: 'fa-star', label: 'Trust Scores' },
      { id: 'contacts', icon: 'fa-address-book', label: 'Network / Contacts' },
      { section: 'Trade' },
      { id: 'trades', icon: 'fa-handshake', label: 'Trade Requests' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commission Locks' },
      { section: 'Execution' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Barcode Scanner' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlements' },
      { section: 'Finance' },
      { id: 'financing', icon: 'fa-university', label: 'Financing' },
      { id: 'defi', icon: 'fa-link', label: 'DeFi / Crypto' },
      { id: 'distressed', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo' },
      { id: 'buyersearch', icon: 'fa-search-dollar', label: 'Buyer Search' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Payments' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'Disputes' },
      { section: 'Governance' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governor Decisions' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
      { id: 'compliance', icon: 'fa-clipboard-check', label: 'Compliance' },
      { id: 'audit', icon: 'fa-history', label: 'Audit Log' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG Scores' },
      { id: 'marketplace', icon: 'fa-store', label: 'Marketplace API' },
    ],
    importer: [
      { section: 'Importer Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard' },
      { id: 'trades', icon: 'fa-handshake', label: 'My Trades' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'My Contracts' },
      { id: 'shipments', icon: 'fa-ship', label: 'Track Shipments' },
      { id: 'financing', icon: 'fa-university', label: 'Financing' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Payments' },
      { id: 'contacts', icon: 'fa-address-book', label: 'My Network' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'Disputes' },
    ],
    exporter: [
      { section: 'Exporter Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard' },
      { id: 'trades', icon: 'fa-handshake', label: 'Incoming Trades' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'My Contracts' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Barcode Generator' },
      { id: 'buyersearch', icon: 'fa-search-dollar', label: 'Find Buyers' },
      { id: 'distressed', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo' },
      { id: 'contacts', icon: 'fa-address-book', label: 'My Network' },
    ],
    logistics: [
      { section: 'Logistics Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard' },
      { id: 'shipments', icon: 'fa-ship', label: 'Active Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Scan / Track' },
      { id: 'routes', icon: 'fa-route', label: 'Route Intelligence' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlements' },
      { id: 'esg', icon: 'fa-leaf', label: 'Carbon / ESG' },
    ],
    financier: [
      { section: 'Financier Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard' },
      { id: 'financing', icon: 'fa-university', label: 'Active Requests' },
      { id: 'defi', icon: 'fa-link', label: 'DeFi Positions' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Settlements' },
      { id: 'trust', icon: 'fa-star', label: 'Credit Scores' },
    ],
    qc: [
      { section: 'QC / Inspection Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'My Dashboard' },
      { id: 'shipments', icon: 'fa-ship', label: 'Inspections' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Scan Items' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG Reports' },
    ],
    admin: [
      { section: 'Admin Portal' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'Platform Overview' },
      { id: 'tenants', icon: 'fa-building', label: 'All Tenants' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governor Decisions' },
      { id: 'compliance', icon: 'fa-clipboard-check', label: 'Compliance' },
      { id: 'audit', icon: 'fa-history', label: 'Audit Log' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
      { id: 'marketplace', icon: 'fa-store', label: 'Marketplace Partners' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG Assessments' },
    ],
  };
  const items = portalMenus[portal] || portalMenus.dashboard;
  nav.innerHTML = items.map(item => {
    if (item.section) return `<div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">${item.section}</div>`;
    return `<div class="sidebar-item${currentPage === item.id ? ' active' : ''}" onclick="navigate('${item.id}')"><i class="fas ${item.icon} w-5 text-center"></i><span>${item.label}</span></div>`;
  }).join('');
}

function switchMode(mode) {
  currentMode = mode;
  ['BUY', 'SELL', 'DUAL'].forEach(m => {
    const el = document.getElementById('mode-' + m);
    if (m === mode) { el.className = 'px-3 py-1 rounded-full bg-sgtx-500 text-white text-xs'; }
    else { el.className = 'px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 text-xs'; }
  });
}

// ─── NAVIGATION ─────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => { if (el.getAttribute('onclick')?.includes(`'${page}'`)) el.classList.add('active'); });
  loadPage(page);
}

async function loadPage(page) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="flex items-center justify-center h-64"><i class="fas fa-spinner fa-spin text-2xl text-sgtx-500"></i></div>';
  content.classList.remove('fade-in'); void content.offsetWidth; content.classList.add('fade-in');
  try {
    const pages = {
      dashboard: renderDashboard, tenants: renderTenants, trust: renderTrustScores,
      contacts: renderContacts, trades: renderTrades, contracts: renderContracts,
      commissions: renderCommissions, shipments: renderShipments, barcodes: renderBarcodes,
      settlements: renderSettlements, financing: renderFinancing, defi: renderDeFi,
      distressed: renderDistressed, buyersearch: renderBuyerSearch, payments: renderPayments,
      disputes: renderDisputes, governor: renderGovernor, jurisdictions: renderJurisdictions,
      compliance: renderCompliance, audit: renderAudit, esg: renderESG,
      marketplace: renderMarketplace, routes: renderRoutes,
    };
    if (pages[page]) await pages[page]();
    else content.innerHTML = '<div class="card p-12 text-center text-gray-400"><i class="fas fa-construction text-4xl mb-3"></i><p>Page coming soon</p></div>';
  } catch(e) { content.innerHTML = `<div class="card p-6 text-red-600"><i class="fas fa-exclamation-circle mr-2"></i>Error: ${e.message}</div>`; }
}

// ─── HELPERS ────────────────────────────────────────────
async function api(path) { const r = await fetch(`${API}${path}`); return r.json(); }
async function apiPost(path, body) { const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
function setTitle(t, s) { document.getElementById('page-title').textContent = t; document.getElementById('page-subtitle').textContent = s || ''; }
function badge(s) { return `<span class="status-badge status-${s}">${s}</span>`; }
function verdictBadge(v) { return `<span class="verdict-${v} font-semibold">${v}</span>`; }
function time(t) { return t ? new Date(t).toLocaleString() : '—'; }
function usd(n) { return n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function pct(n) { return n != null ? (n * 100).toFixed(2) + '%' : '—'; }
function emptyState(m) { return `<div class="card p-12 text-center text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>${m}</p></div>`; }
function showModal(h) { document.getElementById('modal-body').innerHTML = h; document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function statCard(i, l, v, c) { return `<div class="card p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center ${c}"><i class="${i}"></i></div><div><div class="text-2xl font-bold">${v}</div><div class="text-xs text-gray-500">${l}</div></div></div></div>`; }

// ─── DASHBOARD ──────────────────────────────────────────
async function renderDashboard() {
  setTitle('Dashboard', `${currentPortal === 'dashboard' ? 'Platform overview' : currentPortal.charAt(0).toUpperCase() + currentPortal.slice(1) + ' Portal'} — SGTX v6.1`);
  const { data: stats } = await api('/stats');
  const { data: decisions } = await api('/governor/decisions?limit=8');
  const { data: disclaimer } = await api('/legal/disclaimer');
  document.getElementById('content').innerHTML = `
    ${disclaimer ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800"><i class="fas fa-balance-scale mr-2"></i><b>Legal:</b> ${disclaimer.disclaimer_text}</div>` : ''}
    ${tenant?.kyb_status === 'PENDING' ? `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5"><div class="flex items-center justify-between"><div><i class="fas fa-info-circle text-blue-500 mr-2"></i><span class="text-sm text-blue-800 font-medium">KYB verification pending — submit documents to enable full trading capabilities</span></div><button onclick="showKYBForm()" class="bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium">Submit KYB</button></div></div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-building', 'Tenants', stats.tenants, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-handshake', 'Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-file-contract', 'Contracts', stats.contracts, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-gavel', 'Governor Decisions', stats.governor_decisions, 'bg-sgtx-50 text-sgtx-600')}
      ${statCard('fas fa-coins', 'Total Commission', usd(stats.total_commission_usd), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-globe', 'Jurisdictions', stats.jurisdictions_covered, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-shield-halved', 'Gov. Invariant', 'Enforced', 'bg-yellow-50 text-yellow-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Recent Governor Decisions</h3>
        <div class="space-y-2 max-h-80 overflow-y-auto">${decisions.map(d => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100" onclick="showDecisionDetail('${d.decision_id}')">
            <div><span class="font-mono text-xs text-gray-500">${d.decision_id?.slice(0,8)}...</span> <span class="text-gray-600">${d.decision_type}</span></div>
            <div class="flex items-center gap-2">${verdictBadge(d.verdict)}<span class="text-xs text-gray-400">${time(d.created_at)}</span></div>
          </div>`).join('')}</div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-pie mr-2 text-sgtx-500"></i>Trade Workflow (10 Phases × 84 Gates)</h3>
        <canvas id="phaseChart" height="220"></canvas>
      </div>
    </div>
    <div class="card p-5 mt-6">
      <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-sitemap mr-2 text-sgtx-500"></i>Microservices Architecture (35 Services)</h3>
      <div class="grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
        ${['Governor','Identity','Trade','Quote','Logistics','Location','Contract','Finance','Shipment','Settlement','Payment','Document','Barcode','Commodity','KYB/KYC','Trust Score','Notification','Audit','AI Orchestrator','Marketplace','DeFi','ESG/Carbon','Disruption','Distressed','Buyer Search','Jurisdiction','API Gateway','FX Oracle','Corp Graph','Observability','Secondary Mkt','Doc Reqs','QC','Network','Analytics'].map(s => `<div class="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">${s}</div>`).join('')}
      </div>
    </div>`;
  renderPhaseChart();
}

function renderPhaseChart() {
  const ctx = document.getElementById('phaseChart');
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar', data: {
      labels: ['1.Initiate','2.Quote','3.Contract','4.Finance','5.Execute','6.Settle','7.Distress','8.Search','9.Payment','10.Dispute'],
      datasets: [{ label: 'Governance Gates', data: [8,9,10,10,8,10,9,6,8,6], backgroundColor: 'rgba(78,63,232,0.7)', borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Gate Count' } } } }
  });
}

// ─── TENANTS ────────────────────────────────────────────
async function renderTenants() {
  setTitle('Tenants', 'Organization registry — GTID system');
  const { data } = await api('/tenants');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} registered tenants</span>
      <button onclick="showTenantForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Register</button>
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Legal Name</th><th class="px-4 py-3">Jurisdiction</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">KYB</th><th class="px-4 py-3">Trust</th><th class="px-4 py-3">Risk</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTenantDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
        <td class="px-4 py-3 font-medium">${t.legal_name}</td>
        <td class="px-4 py-3 text-center"><span class="bg-gray-100 px-2 py-0.5 rounded text-xs">${t.jurisdiction}</span></td>
        <td class="px-4 py-3 text-center text-xs">${t.type}</td>
        <td class="px-4 py-3 text-center">${badge(t.kyb_status)}</td>
        <td class="px-4 py-3 text-center font-semibold ${(t.trust_score||0)>=80?'text-green-600':(t.trust_score||0)>=60?'text-yellow-600':'text-red-600'}">${t.trust_score||'—'}</td>
        <td class="px-4 py-3 text-center text-xs">${t.risk_score||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showTenantDetail(id) {
  const { data } = await api(`/tenants/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>${data.legal_name}</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">GTID:</span> <span class="font-mono text-sgtx-600">${data.gtid}</span></div>
      <div><span class="text-gray-500">Jurisdiction:</span> ${data.jurisdiction}</div>
      <div><span class="text-gray-500">Type:</span> ${data.type}</div>
      <div><span class="text-gray-500">KYB:</span> ${badge(data.kyb_status)} (Tier ${data.kyb_tier})</div>
      <div><span class="text-gray-500">Risk:</span> ${data.risk_score}</div>
      <div><span class="text-gray-500">Sanctions:</span> ${data.sanctions_cleared ? '<i class="fas fa-check text-green-500"></i> Cleared' : '<i class="fas fa-times text-red-500"></i>'}</div>
    </div>
    ${data.trust_score ? `<div class="bg-gray-50 rounded-lg p-3 mb-4"><h3 class="font-semibold text-sm mb-2">Trust Score: <span class="${data.trust_score.score>=80?'text-green-600':'text-yellow-600'}">${data.trust_score.score}</span></h3>
      <div class="grid grid-cols-2 gap-2 text-xs">${Object.entries(data.trust_score.components ? JSON.parse(data.trust_score.components) : {}).map(([k,v]) => `<div>${k}: <b>${v}</b></div>`).join('')}</div></div>` : ''}
    <h3 class="font-semibold text-sm mb-2">Employees (${data.employees?.length||0})</h3>
    <div class="space-y-1 text-xs">${(data.employees||[]).map(e=>`<div class="flex justify-between bg-gray-50 p-2 rounded"><span>${e.full_name} (${e.email})</span>${badge(e.status)}</div>`).join('')}</div>
    ${data.contacts?.length?`<h3 class="font-semibold text-sm mt-3 mb-2">Network (${data.contacts.length})</h3>
      <div class="space-y-1 text-xs">${data.contacts.map(c=>`<div class="bg-gray-50 p-2 rounded flex justify-between"><span class="font-mono">${c.contact_gtid}</span><span>${c.trade_count} trades</span></div>`).join('')}</div>`:''}
  `);
}

function showTenantForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>Register New Tenant</h2>
    <form onsubmit="submitTenant(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Legal Name</label><input id="t-name" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Jurisdiction</label><select id="t-jurisdiction" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="US">US</option><option value="EG">Egypt</option><option value="VN">Vietnam</option><option value="AE">UAE</option><option value="DE">Germany</option><option value="GB">UK</option><option value="SG">Singapore</option><option value="IN">India</option><option value="BR">Brazil</option><option value="NG">Nigeria</option></select></div>
        <div><label class="text-sm text-gray-600">Type</label><select id="t-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>CORPORATE</option><option>FINANCIAL</option><option>LOGISTICS</option><option>QUALITY_CONTROL</option></select></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600">Register (Governor Gated)</button>
    </form>`);
}
async function submitTenant(e) { e.preventDefault(); const r = await apiPost('/tenants', { legal_name: document.getElementById('t-name').value, jurisdiction: document.getElementById('t-jurisdiction').value, type: document.getElementById('t-type').value }); if (r.error) { alert('Denied: ' + r.error); return; } closeModal(); navigate('tenants'); }

// ─── TRUST SCORES ───────────────────────────────────────
async function renderTrustScores() {
  setTitle('Trust Scores', 'AI-driven entity trust scoring (XGBoost)');
  const { data } = await api('/trust-scores');
  document.getElementById('content').innerHTML = `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Entity</th><th class="px-4 py-3">Score</th><th class="px-4 py-3">Buy</th><th class="px-4 py-3">Sell</th><th class="px-4 py-3">Updated</th></tr></thead>
    <tbody>${data.map(t => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
      <td class="px-4 py-3 font-medium">${t.legal_name||''}</td>
      <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-20 h-2 bg-gray-200 rounded-full"><div class="h-2 rounded-full ${t.score>=80?'bg-green-500':t.score>=60?'bg-yellow-500':'bg-red-500'}" style="width:${t.score}%"></div></div><span class="font-bold">${t.score}</span></div></td>
      <td class="px-4 py-3 text-center">${t.buy_mode_score||'—'}</td>
      <td class="px-4 py-3 text-center">${t.sell_mode_score||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(t.updated_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── CONTACTS / NETWORK ─────────────────────────────────
async function renderContacts() {
  setTitle('Network / Contacts', 'Saved contacts — auto-populated from trade interactions');
  if (!tenant?.id) { document.getElementById('content').innerHTML = emptyState('Login to view contacts'); return; }
  const { data } = await api(`/tenants/${tenant.id}/contacts`);
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Name</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Trust</th><th class="px-4 py-3">Trades</th><th class="px-4 py-3">Last</th></tr></thead>
    <tbody>${data.map(c => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${c.contact_gtid}</td>
      <td class="px-4 py-3">${c.legal_name||'—'}</td>
      <td class="px-4 py-3 text-center text-xs">${c.type||'—'}</td>
      <td class="px-4 py-3 text-center font-semibold">${c.trust_score||'—'}</td>
      <td class="px-4 py-3 text-center">${c.trade_count}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(c.last_interaction)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No contacts yet — they auto-populate from trade interactions');
}

// ─── TRADES ─────────────────────────────────────────────
async function renderTrades() {
  setTitle('Trade Requests', 'Phase 1 — Trade initiation with governance overlay');
  const { data } = await api('/trades');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} trade requests</span>
      <button onclick="showTradeWizard()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Trade</button>
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3 text-left">Importer</th><th class="px-4 py-3 text-left">Exporter</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTradeDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs">${t.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${t.importer_name||'—'} <span class="text-xs text-gray-400">(${t.importer_jurisdiction||''})</span></td>
        <td class="px-4 py-3">${t.exporter_name||'—'} <span class="text-xs text-gray-400">(${t.exporter_jurisdiction||''})</span></td>
        <td class="px-4 py-3 text-center">${badge(t.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(t.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

async function showTradeDetail(id) {
  const { data } = await api(`/trades/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Trade Request</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Importer:</span> ${data.importer_name||'—'}</div>
      <div><span class="text-gray-500">Exporter:</span> ${data.exporter_name||'—'}</div>
      <div><span class="text-gray-500">Governor:</span> <span class="font-mono text-xs">${data.governor_decision_id?.slice(0,12)}...</span></div>
    </div>
    <h3 class="font-semibold text-sm mb-2">Specifications</h3>
    <pre class="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto mb-3">${JSON.stringify(data.parsed_specs, null, 2)}</pre>
    ${data.quotes?.length?`<h3 class="font-semibold text-sm mb-2">Quotes (${data.quotes.length})</h3>${data.quotes.map(q=>`<div class="bg-gray-50 p-2 rounded mb-1 text-xs">EXW: ${usd(q.exw_price)} (${q.incoterm}) — ${badge(q.status||'SUBMITTED')}</div>`).join('')}`:''}
    ${data.contracts?.length?`<h3 class="font-semibold text-sm mt-3 mb-2">Contracts (${data.contracts.length})</h3>${data.contracts.map(c=>`<div class="bg-gray-50 p-2 rounded mb-1 text-xs">${c.incoterm} — ${badge(c.status)}</div>`).join('')}`:''}
  `);
}

function showTradeWizard() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Create Trade Request</h2>
    <div class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg"><i class="fas fa-info-circle mr-1"></i> Phase 1: Enter exporter GTID directly. AI trust analysis. Multi-commodity specs. Governor pre-screen.</div>
    <form onsubmit="submitTrade(event)" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Importer Tenant ID</label><input id="tr-importer" class="w-full border rounded-lg px-3 py-2 text-sm" value="${tenant?.id||'t-001'}" required></div>
        <div><label class="text-sm text-gray-600">Exporter GTID (Direct Entry)</label><input id="tr-exporter" class="w-full border rounded-lg px-3 py-2 text-sm" value="SGTX-VN-TRD-000002-C3D4" placeholder="SGTX-XX-TRD-NNNNNN-XXXX"></div>
      </div>
      <div><label class="text-sm text-gray-600">Description</label><textarea id="tr-desc" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2">Organic cotton yarn 32s, GOTS certified, 5000kg</textarea></div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="text-sm text-gray-600">HS Code</label><input id="tr-hs" class="w-full border rounded-lg px-3 py-2 text-sm" value="520512"></div>
        <div><label class="text-sm text-gray-600">Incoterm</label><select id="tr-incoterm" class="w-full border rounded-lg px-3 py-2 text-sm"><option>CFR</option><option>FOB</option><option>CIF</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option><option>CPT</option><option>CIP</option><option>DPU</option><option>FAS</option></select></div>
        <div><label class="text-sm text-gray-600">QC Preference</label><select id="tr-qc" class="w-full border rounded-lg px-3 py-2 text-sm"><option>THIRD_PARTY</option><option>SGTX_TEAM</option><option>NONE</option></select></div>
      </div>
      <div><label class="text-sm text-gray-600">Created By (Employee ID)</label><input id="tr-by" class="w-full border rounded-lg px-3 py-2 text-sm" value="${employee?.id||'e-001'}"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-paper-plane mr-1"></i>Submit (Governor Gated)</button>
    </form>`);
}

async function submitTrade(e) {
  e.preventDefault();
  const r = await apiPost('/trades', { importer_tenant_id: document.getElementById('tr-importer').value, exporter_gtid: document.getElementById('tr-exporter').value, raw_description: document.getElementById('tr-desc').value, parsed_specs: { hs_code: document.getElementById('tr-hs').value, incoterm: document.getElementById('tr-incoterm').value, description: document.getElementById('tr-desc').value, qc_preference: document.getElementById('tr-qc').value }, created_by: document.getElementById('tr-by').value });
  if (r.error) { alert('Denied: ' + r.error); return; }
  closeModal(); navigate('trades');
}

// ─── CONTRACTS ──────────────────────────────────────────
async function renderContracts() {
  setTitle('Contracts', 'Phase 3 — Contracting with commission collection');
  const { data } = await api('/contracts');
  document.getElementById('content').innerHTML = `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Importer</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Incoterm</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Locked</th></tr></thead>
    <tbody>${data.map(c => `<tr class="border-t border-gray-50 hover:bg-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${c.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${c.importer_name||'—'}</td>
      <td class="px-4 py-3">${c.exporter_name||'—'}</td>
      <td class="px-4 py-3 text-center"><span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">${c.incoterm}</span></td>
      <td class="px-4 py-3 text-center">${badge(c.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(c.locked_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── COMMISSIONS ────────────────────────────────────────
async function renderCommissions() {
  setTitle('Commission Locks', 'Non-custodial commission protection — NATS KV');
  const { data } = await api('/commission-locks');
  document.getElementById('content').innerHTML = `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Lock ID</th><th class="px-4 py-3">Rate</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Released</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Locked</th></tr></thead>
    <tbody>${data.map(cl => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${cl.lock_id?.slice(0,8)}...</td>
      <td class="px-4 py-3 text-center">${pct(cl.commission_rate_pct)}</td>
      <td class="px-4 py-3 text-center font-semibold text-green-600">${usd(cl.commission_usd)}</td>
      <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-16 h-2 bg-gray-200 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:${cl.released_pct||0}%"></div></div><span class="text-xs">${cl.released_pct||0}%</span></div></td>
      <td class="px-4 py-3 text-center">${badge(cl.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(cl.locked_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── SHIPMENTS ──────────────────────────────────────────
async function renderShipments() {
  setTitle('Shipments', 'Phase 5 — Physical execution with USTN tracking');
  const { data } = await api('/shipments');
  document.getElementById('content').innerHTML = `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">USTN</th><th class="px-4 py-3">Origin</th><th class="px-4 py-3">Destination</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Milestone</th><th class="px-4 py-3">Created</th></tr></thead>
    <tbody>${data.map(s => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showShipmentDetail('${s.id}')">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${s.ustn}</td>
      <td class="px-4 py-3 text-sm">${s.origin_port||'—'}</td>
      <td class="px-4 py-3 text-sm">${s.destination_port||'—'}</td>
      <td class="px-4 py-3 text-center">${badge(s.status)}</td>
      <td class="px-4 py-3 text-center text-xs">${s.current_milestone||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(s.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function showShipmentDetail(id) {
  const { data } = await api(`/shipments/${id}`);
  const milestoneSteps = ['GATE_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];
  const confirmed = new Set((data.milestones||[]).map(m => m.milestone));
  showModal(`
    <h2 class="text-lg font-bold mb-2"><i class="fas fa-ship mr-2 text-sgtx-500"></i>Shipment</h2>
    <div class="font-mono text-sm text-sgtx-600 mb-4">${data.ustn}</div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Origin:</span> ${data.origin_port||'—'}</div>
      <div><span class="text-gray-500">Destination:</span> ${data.destination_port||'—'}</div>
      <div><span class="text-gray-500">Vessel:</span> ${data.vessel_name||'—'}</div>
    </div>
    <h3 class="font-semibold text-sm mb-2">Milestone Tracker</h3>
    <div class="flex items-center gap-1 mb-4">${milestoneSteps.map(m => `
      <div class="flex-1 text-center">
        <div class="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${confirmed.has(m)?'bg-green-500 text-white':'bg-gray-200 text-gray-400'}">
          ${confirmed.has(m)?'<i class="fas fa-check"></i>':''}
        </div><div class="text-[9px] mt-1 text-gray-500">${m}</div>
      </div>`).join('<div class="w-4 h-0.5 bg-gray-200"></div>')}</div>
    ${data.barcodes?.length?`<h3 class="font-semibold text-sm mb-2">Barcodes (${data.barcodes.length})</h3>
      <div class="grid grid-cols-2 gap-2 mb-3">${data.barcodes.map(b=>`<div class="bg-gray-50 p-2 rounded text-xs"><div class="font-semibold">${b.barcode_type} — Pallet ${b.pallet_number}</div><div class="font-mono text-[10px]">SSCC: ${b.sscc}</div></div>`).join('')}</div>`:''}
    ${data.disruption_predictions?.length?`<h3 class="font-semibold text-sm mt-3 mb-2 text-red-600"><i class="fas fa-exclamation-triangle mr-1"></i>Disruptions</h3>
      ${data.disruption_predictions.map(d=>`<div class="bg-red-50 p-2 rounded text-xs mb-1"><b>${d.prediction_type}</b> — ${(d.probability*100).toFixed(0)}% — ${d.recommendation||''}</div>`).join('')}`:''}
  `);
}

// ─── BARCODES ───────────────────────────────────────────
async function renderBarcodes() {
  setTitle('Barcode Scanner', 'GS1-128/QR code scanning — milestone confirmation via barcode');
  document.getElementById('content').innerHTML = `
    <div class="card p-6">
      <h3 class="font-bold mb-4"><i class="fas fa-barcode mr-2 text-sgtx-500"></i>Scan Barcode / Enter SSCC</h3>
      <form onsubmit="scanBarcode(event)" class="flex gap-3">
        <input id="bc-sscc" class="flex-1 border rounded-lg px-4 py-2 text-sm" placeholder="Enter SSCC code or barcode ID">
        <button type="submit" class="bg-sgtx-500 text-white px-6 py-2 rounded-lg text-sm"><i class="fas fa-search mr-1"></i>Scan</button>
      </form>
      <div id="bc-result" class="mt-4"></div>
    </div>`;
}
async function scanBarcode(e) {
  e.preventDefault();
  const r = await apiPost('/barcodes/scan', { sscc: document.getElementById('bc-sscc').value });
  document.getElementById('bc-result').innerHTML = r.data ? `
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 class="font-bold text-green-800 mb-2"><i class="fas fa-check-circle mr-1"></i>Barcode Found</h4>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-500">USTN:</span> <span class="font-mono text-sgtx-600">${r.data.barcode.shipment_ustn}</span></div>
        <div><span class="text-gray-500">Pallet:</span> ${r.data.barcode.pallet_number}</div>
        <div><span class="text-gray-500">Type:</span> ${r.data.barcode.barcode_type}</div>
        <div><span class="text-gray-500">Shipment Status:</span> ${badge(r.data.shipment?.status||'UNKNOWN')}</div>
      </div>
    </div>` : `<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">${r.error || 'Barcode not found'}</div>`;
}

// ─── SETTLEMENTS ────────────────────────────────────────
async function renderSettlements() {
  setTitle('Settlements', 'Phase 6 — USTN-linked settlement orchestration');
  const { data } = await api('/settlements');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">USTN</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
    <tbody>${data.map(s => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${s.id?.slice(0,8)}...</td>
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${s.ustn||'—'}</td>
      <td class="px-4 py-3">${s.instruction_type}</td>
      <td class="px-4 py-3 text-center">${badge(s.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(s.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No settlement instructions yet');
}

// ─── FINANCING ──────────────────────────────────────────
async function renderFinancing() {
  setTitle('Financing', 'Phase 4 — Universal trade finance with blind bidding');
  const { data } = await api('/financing');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Requester</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Tenor</th><th class="px-4 py-3">Status</th></tr></thead>
    <tbody>${data.map(f => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${f.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${f.requester_name||'—'}</td>
      <td class="px-4 py-3 text-center font-semibold">${usd(f.amount)}</td>
      <td class="px-4 py-3 text-center text-xs">${f.financing_type}</td>
      <td class="px-4 py-3 text-center">${f.tenor_days}d</td>
      <td class="px-4 py-3 text-center">${badge(f.status)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No financing requests yet — available after contract lock (Phase 4)');
}

// ─── DeFi ───────────────────────────────────────────────
async function renderDeFi() {
  setTitle('DeFi / Crypto Financing', 'Aave V3, Compound, Uniswap V3 — Stablecoin settlement');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-link','Supported Protocols','4','bg-purple-50 text-purple-600')}
      ${statCard('fas fa-coins','Stablecoin Limit','30% Trade Value','bg-blue-50 text-blue-600')}
      ${statCard('fas fa-shield-halved','Depeg Threshold','0.5% warn / 2% freeze','bg-red-50 text-red-600')}
    </div>
    <div class="card p-5 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-link mr-2 text-sgtx-500"></i>DeFi Protocol Matrix</h3>
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Aave V3</div><div class="text-xs text-gray-500">Polygon</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Compound</div><div class="text-xs text-gray-500">Base</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Uniswap V3</div><div class="text-xs text-gray-500">FX Hedging</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">IPFS/Arweave</div><div class="text-xs text-gray-500">Storage</div><div class="text-xs text-green-600 mt-1">Active</div></div>
      </div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3">Country DeFi Matrix</h3>
      <div class="grid grid-cols-3 gap-3 text-xs">
        <div class="bg-green-50 p-3 rounded-lg"><div class="font-bold text-green-800">Friendly</div><div class="text-green-600 mt-1">SG, CH, AE, GB, HK</div></div>
        <div class="bg-yellow-50 p-3 rounded-lg"><div class="font-bold text-yellow-800">Restricted</div><div class="text-yellow-600 mt-1">US, EU, JP, AU</div></div>
        <div class="bg-red-50 p-3 rounded-lg"><div class="font-bold text-red-800">Prohibited</div><div class="text-red-600 mt-1">CN, EG, IN, RU</div></div>
      </div>
    </div>`;
}

// ─── DISTRESSED ─────────────────────────────────────────
async function renderDistressed() {
  setTitle('Distressed Cargo', 'Phase 7 — AI-driven cargo resolution');
  const { data } = await api('/distressed');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Location</th><th class="px-4 py-3">Qty</th><th class="px-4 py-3">Price</th><th class="px-4 py-3">Status</th></tr></thead>
    <tbody>${data.map(d => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${d.exporter_name||'—'}</td>
      <td class="px-4 py-3">${d.current_location}</td>
      <td class="px-4 py-3 text-center">${d.quantity} ${d.unit}</td>
      <td class="px-4 py-3 text-center">${usd(d.price_expectation)}</td>
      <td class="px-4 py-3 text-center">${badge(d.status)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No distressed cargo listings');
}

// ─── BUYER SEARCH ───────────────────────────────────────
async function renderBuyerSearch() {
  setTitle('Buyer Search', 'Phase 8 — Exporter-initiated buyer matching');
  const { data } = await api('/buyer-search');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-end mb-4">
      <button onclick="showBuyerSearchForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-search mr-1"></i>New Buyer Search</button>
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Product</th><th class="px-4 py-3">Qty</th><th class="px-4 py-3">Min Trust</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${data.map(b => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${b.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${b.exporter_name||'—'}</td>
        <td class="px-4 py-3 text-xs">${JSON.stringify(b.product_details||{}).slice(0,40)}...</td>
        <td class="px-4 py-3 text-center">${b.quantity} ${b.unit}</td>
        <td class="px-4 py-3 text-center">${b.min_buyer_trust_score||60}</td>
        <td class="px-4 py-3 text-center">${badge(b.status)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No active buyer search requests')}`;
}

function showBuyerSearchForm() {
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-search-dollar mr-2 text-sgtx-500"></i>New Buyer Search</h2>
    <form onsubmit="submitBuyerSearch(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Exporter Tenant ID</label><input id="bs-exp" class="w-full border rounded-lg px-3 py-2 text-sm" value="${tenant?.id||'t-002'}" required></div>
      <div><label class="text-sm text-gray-600">Product Description</label><textarea id="bs-product" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2">Organic cotton yarn, GOTS certified</textarea></div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="text-sm text-gray-600">Quantity</label><input id="bs-qty" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="5000"></div>
        <div><label class="text-sm text-gray-600">Unit</label><input id="bs-unit" class="w-full border rounded-lg px-3 py-2 text-sm" value="KG"></div>
        <div><label class="text-sm text-gray-600">Min Trust Score</label><input id="bs-trust" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="60"></div>
      </div>
      <div><label class="text-sm text-gray-600">Listing Expiry</label><input id="bs-expiry" type="date" class="w-full border rounded-lg px-3 py-2 text-sm" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit (Governor Gated)</button>
    </form>`);
}
async function submitBuyerSearch(e) {
  e.preventDefault();
  await apiPost('/buyer-search', { exporter_tenant_id: document.getElementById('bs-exp').value, product_details: { description: document.getElementById('bs-product').value }, quantity: Number(document.getElementById('bs-qty').value), unit: document.getElementById('bs-unit').value, min_buyer_trust_score: Number(document.getElementById('bs-trust').value), listing_expiry: document.getElementById('bs-expiry').value, actor_gtid: tenant?.gtid || 'system' });
  closeModal(); navigate('buyersearch');
}

// ─── PAYMENTS ───────────────────────────────────────────
async function renderPayments() {
  setTitle('Payment Orchestrator', 'Phase 9 — Global PSP routing');
  const [payments, aggregators] = await Promise.all([api('/payments'), api('/payment-aggregators')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-server mr-2 text-sgtx-500"></i>PSP Aggregators (${aggregators.data.length})</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${aggregators.data.map(a => `
      <div class="card p-3 text-center">
        <div class="font-semibold text-sm">${a.name}</div>
        <div class="text-xs text-gray-500 mt-1">${JSON.parse(a.country_codes||'[]').join(', ')}</div>
        <div class="text-xs mt-1">Uptime: <span class="text-green-600 font-semibold">${(a.uptime_score*100).toFixed(1)}%</span></div>
      </div>`).join('')}</div>
    <h3 class="font-bold mb-3"><i class="fas fa-credit-card mr-2 text-sgtx-500"></i>Payment Attempts</h3>
    ${payments.data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">PSP</th><th class="px-4 py-3">Country</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${payments.data.map(p => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${p.aggregator_name}</td>
        <td class="px-4 py-3 text-center">${p.buyer_country}</td>
        <td class="px-4 py-3 text-center">${usd(p.amount_usd)}</td>
        <td class="px-4 py-3 text-center text-green-600">${usd(p.commission_amount_usd)}</td>
        <td class="px-4 py-3 text-center">${badge(p.status)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No payments yet')}`;
}

// ─── DISPUTES ───────────────────────────────────────────
async function renderDisputes() {
  setTitle('Disputes', 'Phase 10 — AI mediation & ICC/DIFC-LCIA arbitration');
  const { data } = await api('/disputes');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Filing Party</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Filed</th></tr></thead>
    <tbody>${data.map(d => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${d.dispute_type}</td>
      <td class="px-4 py-3 font-mono text-xs">${d.filing_party_gtid}</td>
      <td class="px-4 py-3 text-center">${badge(d.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(d.filed_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No disputes filed');
}

// ─── GOVERNOR ───────────────────────────────────────────
async function renderGovernor() {
  setTitle('Governor Decisions', 'OPA + WasmEdge + Loom — Single point of truth');
  const { data } = await api('/governor/decisions?limit=100');
  const counts = { ALLOW: 0, DENY: 0, CONDITIONAL: 0, ESCALATE: 0, PENDING: 0 };
  data.forEach(d => counts[d.verdict] = (counts[d.verdict] || 0) + 1);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-5 gap-3 mb-5">
      ${Object.entries(counts).map(([v,c]) => `<div class="card p-3 text-center"><div class="text-2xl font-bold verdict-${v}">${c}</div><div class="text-xs text-gray-500">${v}</div></div>`).join('')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Actor</th><th class="px-4 py-3">Verdict</th><th class="px-4 py-3">Confidence</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${data.map(d => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showDecisionDetail('${d.decision_id}')">
        <td class="px-4 py-3 font-mono text-xs">${d.decision_id?.slice(0,12)}...</td>
        <td class="px-4 py-3 text-xs">${d.decision_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${(d.actor_gtid||'').slice(0,20)}${(d.actor_gtid||'').length>20?'...':''}</td>
        <td class="px-4 py-3 text-center">${verdictBadge(d.verdict)}</td>
        <td class="px-4 py-3 text-center">${d.confidence?(d.confidence*100).toFixed(0)+'%':'—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(d.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

async function showDecisionDetail(id) {
  const { data } = await api(`/governor/decisions/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Governor Decision</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">ID:</span> <span class="font-mono text-xs">${data.decision_id}</span></div>
      <div><span class="text-gray-500">Type:</span> ${data.decision_type}</div>
      <div><span class="text-gray-500">Verdict:</span> ${verdictBadge(data.verdict)}</div>
      <div><span class="text-gray-500">Confidence:</span> ${data.confidence?(data.confidence*100).toFixed(1)+'%':'—'}</div>
      <div><span class="text-gray-500">Actor:</span> <span class="font-mono text-xs">${data.actor_gtid}</span></div>
      <div><span class="text-gray-500">Policy:</span> ${data.policy_version}</div>
    </div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3"><h3 class="text-xs font-semibold mb-1">Explanation</h3><p class="text-sm">${data.explainability||'—'}</p></div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3"><h3 class="text-xs font-semibold mb-1">Conditions</h3><pre class="text-xs">${data.conditions||'[]'}</pre></div>
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div><span class="text-gray-500">Loom Hash:</span><div class="font-mono break-all">${data.loom_hash}</div></div>
      <div><span class="text-gray-500">Signature:</span><div class="font-mono break-all">${(data.cryptographic_signature||'').slice(0,40)}...</div></div>
    </div>
  `);
}

// ─── JURISDICTIONS ──────────────────────────────────────
async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Global coverage — 27 jurisdictions + sanctions matrix');
  const { data } = await api('/jurisdictions');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-3 mb-5">
      ${statCard('fas fa-check-circle','Clear',data.filter(j=>j.sanctions_level==='NONE').length,'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-circle','High Risk',data.filter(j=>j.sanctions_level==='HIGH_RISK').length,'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-ban','Blocked',data.filter(j=>j.sanctions_level==='BLOCKED').length,'bg-red-50 text-red-600')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Code</th><th class="px-4 py-3 text-left">Country</th><th class="px-4 py-3">Sanctions</th><th class="px-4 py-3">KYC</th><th class="px-4 py-3">CBDC</th><th class="px-4 py-3">PSPs</th></tr></thead>
      <tbody>${data.map(j => `<tr class="border-t border-gray-50 ${j.sanctions_level==='BLOCKED'?'bg-red-50':j.sanctions_level==='HIGH_RISK'?'bg-yellow-50':''}">
        <td class="px-4 py-3 text-center font-semibold">${j.code}</td>
        <td class="px-4 py-3">${j.name}</td>
        <td class="px-4 py-3 text-center">${badge(j.sanctions_level)}</td>
        <td class="px-4 py-3 text-center">T${j.kyc_tier_required}</td>
        <td class="px-4 py-3 text-center text-xs">${j.cbdc_status}</td>
        <td class="px-4 py-3 text-xs">${JSON.parse(j.psp_partners||'[]').join(', ')}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

// ─── COMPLIANCE ─────────────────────────────────────────
async function renderCompliance() {
  setTitle('Compliance', 'AML/KYC/Sanctions screening & monitoring');
  const [events, checks] = await Promise.all([api('/compliance/events'), api('/compliance/checks')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>Events (${events.data.length})</h3>
    ${events.data.length?`<div class="card overflow-x-auto mb-6"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Severity</th><th class="px-4 py-3">Resolved</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${events.data.map(e=>`<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${e.event_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${e.entity_gtid||'—'}</td>
        <td class="px-4 py-3 text-center">${badge(e.severity)}</td>
        <td class="px-4 py-3 text-center">${e.resolved?'<i class="fas fa-check text-green-500"></i>':'<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(e.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`:emptyState('No compliance events')}
    <h3 class="font-bold mb-3"><i class="fas fa-clipboard-check mr-2 text-sgtx-500"></i>Checks (${checks.data.length})</h3>
    ${checks.data.length?`<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Result</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${checks.data.map(c=>`<tr class="border-t border-gray-50"><td class="px-4 py-3">${c.check_type}</td><td class="px-4 py-3 text-center">${badge(c.result)}</td><td class="px-4 py-3 text-xs text-gray-400">${time(c.checked_at)}</td></tr>`).join('')}</tbody></table></div>`:emptyState('No checks')}`;
}

// ─── AUDIT ──────────────────────────────────────────────
async function renderAudit() {
  setTitle('Audit Log', 'Immutable trail — Loom + Ed25519 + hash chain');
  const { data } = await api('/audit?limit=100');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3">#</th><th class="px-4 py-3">Table</th><th class="px-4 py-3">Record</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Time</th></tr></thead>
    <tbody>${data.map(a => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 text-xs">${a.id}</td>
      <td class="px-4 py-3 text-xs font-mono">${a.table_name}</td>
      <td class="px-4 py-3 text-xs font-mono">${(a.record_id||'').slice(0,8)}...</td>
      <td class="px-4 py-3">${badge(a.action)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(a.changed_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No audit entries');
}

// ─── ESG ────────────────────────────────────────────────
async function renderESG() {
  setTitle('ESG Assessments', 'Environmental, Social, Governance — IMO EEXI 2023');
  const { data } = await api('/esg');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">ESG</th><th class="px-4 py-3">Env</th><th class="px-4 py-3">Social</th><th class="px-4 py-3">Gov</th><th class="px-4 py-3">Carbon</th></tr></thead>
    <tbody>${data.map(e => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3">${e.legal_name||e.entity_gtid}</td>
      <td class="px-4 py-3 text-xs">${e.assessment_type}</td>
      <td class="px-4 py-3 text-center font-bold">${e.esg_score}</td>
      <td class="px-4 py-3 text-center text-green-600">${e.environmental_score||'—'}</td>
      <td class="px-4 py-3 text-center text-blue-600">${e.social_score||'—'}</td>
      <td class="px-4 py-3 text-center text-purple-600">${e.governance_score||'—'}</td>
      <td class="px-4 py-3 text-center text-xs">${e.carbon_intensity||'—'}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No ESG assessments');
}

// ─── MARKETPLACE ────────────────────────────────────────
async function renderMarketplace() {
  setTitle('Marketplace API', 'Partner integration — revenue share');
  document.getElementById('content').innerHTML = `
    <div class="card p-6 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-store mr-2 text-sgtx-500"></i>Marketplace API Endpoints</h3>
      <div class="space-y-2 text-sm">
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/intent/analyze</code><span class="text-gray-500 ml-2">— Analyze trade intent</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/trade/initiate</code><span class="text-gray-500 ml-2">— Initiate trade</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">GET /api/v1/partner/suppliers/match</code><span class="text-gray-500 ml-2">— Match suppliers</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/webhook/register</code><span class="text-gray-500 ml-2">— Register webhook</span></div>
      </div>
    </div>
    <div class="card p-6">
      <h3 class="font-bold mb-3">Revenue Model</h3>
      <div class="text-sm text-gray-600">
        <p class="mb-2"><b>Commission Split:</b> Negotiated per partner (e.g., 0.5% partner / 1.0% SGTX)</p>
        <p class="mb-2"><b>Additional Streams:</b> DeFi 0.25%, Financier 0.15%, Stablecoin 0.10%, Blockchain $50/verification</p>
        <p><b>SGTX invisible</b> to marketplace end users — white-label execution engine.</p>
      </div>
    </div>`;
}

// ─── ROUTES ─────────────────────────────────────────────
async function renderRoutes() {
  setTitle('Route Intelligence', 'Self-hosted Nominatim + OSRM — AI learning loop');
  document.getElementById('content').innerHTML = `
    <div class="card p-6 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-route mr-2 text-sgtx-500"></i>Route Intelligence Stack</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-map-marker-alt text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">Nominatim</div><div class="text-xs text-gray-500">Self-hosted geocoding</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-road text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">OSRM/Valhalla</div><div class="text-xs text-gray-500">Routing engine</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-brain text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">AI Learning Loop</div><div class="text-xs text-gray-500">GPS traces → corrections</div></div>
      </div>
    </div>
    <div class="card p-6">
      <h3 class="font-bold mb-3">Learning Pipeline</h3>
      <div class="text-sm text-gray-600">
        <p class="mb-2">GPS traces from trucking → <code>trucking_gps_traces</code> → AI model → <code>route_correction_factors</code></p>
        <p>Corrections by: origin_geohash, destination_geohash, time_of_day, day_of_week → distance/time multipliers</p>
      </div>
    </div>`;
}

// ─── KYB FORM ───────────────────────────────────────────
function showKYBForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-file-alt mr-2 text-sgtx-500"></i>Submit KYB Documents</h2>
    <p class="text-sm text-gray-600 mb-4">AI-driven verification with 40+ government registry integrations. Tiers T1-T4.</p>
    <form onsubmit="submitKYB(event)" class="space-y-3">
      <div class="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 mb-3">
        <b>Required:</b> Certificate of Incorporation, Trade License, Tax Registration, UBO Declaration, Bank Statement
      </div>
      <div><label class="text-sm text-gray-600">Company Registration #</label><input id="kyb-reg" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="REG-12345"></div>
      <div><label class="text-sm text-gray-600">Tax ID</label><input id="kyb-tax" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="TAX-67890"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit for Verification</button>
    </form>`);
}
async function submitKYB(e) {
  e.preventDefault();
  await apiPost('/auth/kyb/submit', { tenant_id: tenant?.id, gtid: tenant?.gtid, documents: [{ type: 'REGISTRATION', ref: document.getElementById('kyb-reg').value }, { type: 'TAX', ref: document.getElementById('kyb-tax').value }] });
  if (tenant) { tenant.kyb_status = 'SUBMITTED'; localStorage.setItem('sgtx_tenant', JSON.stringify(tenant)); }
  closeModal(); navigate('dashboard');
}

// ─── CREATE MODAL ───────────────────────────────────────
function showCreateModal() {
  const ctxActions = { trades: showTradeWizard, tenants: showTenantForm, buyersearch: showBuyerSearchForm };
  if (ctxActions[currentPage]) { ctxActions[currentPage](); return; }
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-plus mr-2 text-sgtx-500"></i>Quick Actions</h2>
    <div class="grid grid-cols-2 gap-3">
      <button onclick="closeModal();showTenantForm()" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-building text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Register Tenant</div></button>
      <button onclick="closeModal();showTradeWizard()" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-handshake text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Create Trade</div></button>
      <button onclick="closeModal();showBuyerSearchForm()" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-search-dollar text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Buyer Search</div></button>
      <button onclick="closeModal();navigate('barcodes')" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-barcode text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Scan Barcode</div></button>
    </div>`);
}

// SGTX Platform v6.1 — Frontend Application
const API = '/api/v1';
let currentPage = 'dashboard';
let chartInstance = null;

// ─── NAVIGATION ─────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const items = document.querySelectorAll('.sidebar-item');
  items.forEach(el => { if (el.getAttribute('onclick')?.includes(`'${page}'`)) el.classList.add('active'); });
  loadPage(page);
}

async function loadPage(page) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="flex items-center justify-center h-64"><i class="fas fa-spinner fa-spin text-2xl text-sgtx-500"></i></div>';
  content.classList.remove('fade-in');
  void content.offsetWidth;
  content.classList.add('fade-in');
  try {
    switch(page) {
      case 'dashboard': await renderDashboard(); break;
      case 'tenants': await renderTenants(); break;
      case 'trust': await renderTrustScores(); break;
      case 'trades': await renderTrades(); break;
      case 'contracts': await renderContracts(); break;
      case 'commissions': await renderCommissions(); break;
      case 'shipments': await renderShipments(); break;
      case 'settlements': await renderSettlements(); break;
      case 'financing': await renderFinancing(); break;
      case 'distressed': await renderDistressed(); break;
      case 'payments': await renderPayments(); break;
      case 'governor': await renderGovernor(); break;
      case 'jurisdictions': await renderJurisdictions(); break;
      case 'compliance': await renderCompliance(); break;
      case 'audit': await renderAudit(); break;
      case 'esg': await renderESG(); break;
      default: content.innerHTML = '<p>Page not found</p>';
    }
  } catch(e) { content.innerHTML = `<div class="card p-6 text-red-600"><i class="fas fa-exclamation-circle mr-2"></i>Error: ${e.message}</div>`; }
}

async function api(path) { const r = await fetch(`${API}${path}`); return r.json(); }
async function apiPost(path, body) { const r = await fetch(`${API}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return r.json(); }
async function apiPatch(path, body) { const r = await fetch(`${API}${path}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return r.json(); }

function setTitle(title, subtitle) {
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle || '';
}

function badge(status) { return `<span class="status-badge status-${status}">${status}</span>`; }
function verdictBadge(v) { return `<span class="verdict-${v} font-semibold">${v}</span>`; }
function time(t) { return t ? new Date(t).toLocaleString() : '—'; }
function usd(n) { return n != null ? '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—'; }
function pct(n) { return n != null ? (n * 100).toFixed(2) + '%' : '—'; }

// ─── DASHBOARD ──────────────────────────────────────────
async function renderDashboard() {
  setTitle('Dashboard', 'Platform overview — real-time metrics');
  const { data: stats } = await api('/stats');
  const { data: decisions } = await api('/governor/decisions?limit=10');
  const { data: disclaimer } = await api('/legal/disclaimer');

  document.getElementById('content').innerHTML = `
    ${disclaimer ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800"><i class="fas fa-balance-scale mr-2"></i><b>Legal:</b> ${disclaimer.disclaimer_text}</div>` : ''}
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
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
            <div><span class="font-mono text-xs text-gray-500">${d.decision_id?.slice(0,8)}...</span> <span class="text-gray-600">${d.decision_type}</span></div>
            <div class="flex items-center gap-2">${verdictBadge(d.verdict)}<span class="text-xs text-gray-400">${time(d.created_at)}</span></div>
          </div>
        `).join('')}</div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-pie mr-2 text-sgtx-500"></i>Trade Workflow (10 Phases)</h3>
        <canvas id="phaseChart" height="220"></canvas>
      </div>
    </div>
    <div class="card p-5 mt-6">
      <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-sitemap mr-2 text-sgtx-500"></i>Microservices Architecture (35 Services)</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        ${['Governor','Identity','Trade','Quote','Logistics','Location','Contract','Finance','Shipment','Settlement','Payment','Document','Barcode','Commodity','KYB/KYC','Trust Score','Notification','Audit','AI Orchestrator','Marketplace API','DeFi','ESG/Carbon','Disruption','Distressed','Buyer Search','Jurisdiction','API Gateway','FX Oracle','Corporate Graph','Observability','Secondary Market','Doc Requirements','QC','Network','Analytics'].map(s => `<div class="bg-gray-50 px-2 py-1 rounded text-center border border-gray-100">${s}</div>`).join('')}
      </div>
    </div>`;
  renderPhaseChart();
}

function statCard(icon, label, value, colors) {
  return `<div class="card p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center ${colors}"><i class="${icon}"></i></div><div><div class="text-2xl font-bold">${value}</div><div class="text-xs text-gray-500">${label}</div></div></div></div>`;
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
      <button onclick="showTenantForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Register Tenant</button>
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Legal Name</th><th class="px-4 py-3">Jurisdiction</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">KYB Status</th><th class="px-4 py-3">Trust</th><th class="px-4 py-3">Risk</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTenantDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
        <td class="px-4 py-3 font-medium">${t.legal_name}</td>
        <td class="px-4 py-3 text-center"><span class="bg-gray-100 px-2 py-0.5 rounded text-xs">${t.jurisdiction}</span></td>
        <td class="px-4 py-3 text-center text-xs">${t.type}</td>
        <td class="px-4 py-3 text-center">${badge(t.kyb_status)}</td>
        <td class="px-4 py-3 text-center font-semibold ${t.trust_score >= 80 ? 'text-green-600' : t.trust_score >= 60 ? 'text-yellow-600' : 'text-red-600'}">${t.trust_score || '—'}</td>
        <td class="px-4 py-3 text-center text-xs">${t.risk_score || '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showTenantDetail(id) {
  const { data } = await api(`/tenants/${id}`);
  const trust = data.trust_score;
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>${data.legal_name}</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">GTID:</span> <span class="font-mono text-sgtx-600">${data.gtid}</span></div>
      <div><span class="text-gray-500">Jurisdiction:</span> ${data.jurisdiction}</div>
      <div><span class="text-gray-500">Type:</span> ${data.type}</div>
      <div><span class="text-gray-500">KYB:</span> ${badge(data.kyb_status)} (Tier ${data.kyb_tier})</div>
      <div><span class="text-gray-500">Risk Score:</span> ${data.risk_score}</div>
      <div><span class="text-gray-500">Sanctions Cleared:</span> ${data.sanctions_cleared ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</div>
    </div>
    ${trust ? `<div class="bg-gray-50 rounded-lg p-3 mb-4"><h3 class="font-semibold text-sm mb-2">Trust Score: <span class="${trust.score >= 80 ? 'text-green-600' : 'text-yellow-600'}">${trust.score}</span></h3>
      <div class="grid grid-cols-2 gap-2 text-xs">${Object.entries(trust.components ? JSON.parse(trust.components) : {}).map(([k,v]) => `<div>${k}: <b>${v}</b></div>`).join('')}</div></div>` : ''}
    <h3 class="font-semibold text-sm mb-2">Employees (${data.employees?.length || 0})</h3>
    <div class="space-y-1 text-xs">${(data.employees || []).map(e => `<div class="flex justify-between bg-gray-50 p-2 rounded"><span>${e.full_name} (${e.email})</span>${badge(e.status)}</div>`).join('')}</div>
    ${data.contacts?.length ? `<h3 class="font-semibold text-sm mt-3 mb-2">Network Contacts (${data.contacts.length})</h3>
      <div class="space-y-1 text-xs">${data.contacts.map(c => `<div class="bg-gray-50 p-2 rounded flex justify-between"><span class="font-mono">${c.contact_gtid}</span><span>${c.trade_count} trades | ${c.relationship_type}</span></div>`).join('')}</div>` : ''}
  `);
}

function showTenantForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>Register New Tenant</h2>
    <form onsubmit="submitTenant(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Legal Name</label><input id="t-name" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Jurisdiction</label><select id="t-jurisdiction" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="US">US</option><option value="EG">Egypt</option><option value="VN">Vietnam</option><option value="AE">UAE</option><option value="DE">Germany</option><option value="GB">UK</option><option value="SG">Singapore</option><option value="IN">India</option><option value="BR">Brazil</option><option value="NG">Nigeria</option><option value="KE">Kenya</option><option value="SA">Saudi Arabia</option><option value="TR">Turkey</option></select></div>
        <div><label class="text-sm text-gray-600">Type</label><select id="t-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>CORPORATE</option><option>FINANCIAL</option><option>LOGISTICS</option><option>QUALITY_CONTROL</option></select></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600">Register (Governor Gated)</button>
    </form>
  `);
}

async function submitTenant(e) {
  e.preventDefault();
  const res = await apiPost('/tenants', { legal_name: document.getElementById('t-name').value, jurisdiction: document.getElementById('t-jurisdiction').value, type: document.getElementById('t-type').value });
  if (res.error) { alert('Denied: ' + res.error); return; }
  closeModal(); navigate('tenants');
}

// ─── TRUST SCORES ───────────────────────────────────────
async function renderTrustScores() {
  setTitle('Trust Scores', 'AI-driven entity trust scoring (XGBoost)');
  const { data } = await api('/trust-scores');
  document.getElementById('content').innerHTML = `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Entity</th><th class="px-4 py-3">Jurisdiction</th><th class="px-4 py-3">Score</th><th class="px-4 py-3">Buy Mode</th><th class="px-4 py-3">Sell Mode</th><th class="px-4 py-3">Updated</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
        <td class="px-4 py-3 font-medium">${t.legal_name || ''}</td>
        <td class="px-4 py-3 text-center">${t.jurisdiction || ''}</td>
        <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-20 h-2 bg-gray-200 rounded-full"><div class="h-2 rounded-full ${t.score >= 80 ? 'bg-green-500' : t.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${t.score}%"></div></div><span class="font-bold">${t.score}</span></div></td>
        <td class="px-4 py-3 text-center">${t.buy_mode_score || '—'}</td>
        <td class="px-4 py-3 text-center">${t.sell_mode_score || '—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(t.updated_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ─── TRADES ─────────────────────────────────────────────
async function renderTrades() {
  setTitle('Trade Requests', 'Phase 1 — Trade initiation with governance overlay');
  const { data } = await api('/trades');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} trade requests</span>
      <button onclick="showTradeForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Trade</button>
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3 text-left">Importer</th><th class="px-4 py-3 text-left">Exporter</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTradeDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs">${t.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${t.importer_name || '—'} <span class="text-xs text-gray-400">(${t.importer_jurisdiction || ''})</span></td>
        <td class="px-4 py-3">${t.exporter_name || '—'} <span class="text-xs text-gray-400">(${t.exporter_jurisdiction || ''})</span></td>
        <td class="px-4 py-3 text-center">${badge(t.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(t.created_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showTradeDetail(id) {
  const { data } = await api(`/trades/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Trade Request</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Importer:</span> ${data.importer_name || '—'}</div>
      <div><span class="text-gray-500">Exporter:</span> ${data.exporter_name || '—'}</div>
      <div><span class="text-gray-500">Governor:</span> <span class="font-mono text-xs">${data.governor_decision_id?.slice(0,12)}...</span></div>
    </div>
    <h3 class="font-semibold text-sm mb-2">Parsed Specifications</h3>
    <pre class="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto mb-3">${JSON.stringify(data.parsed_specs, null, 2)}</pre>
    ${data.quotes?.length ? `<h3 class="font-semibold text-sm mb-2">Quotes (${data.quotes.length})</h3>
      ${data.quotes.map(q => `<div class="bg-gray-50 p-2 rounded mb-1 text-xs">EXW: ${usd(q.exw_price)} (${q.incoterm}) — ${badge(q.status || 'SUBMITTED')}</div>`).join('')}` : ''}
    ${data.contracts?.length ? `<h3 class="font-semibold text-sm mt-3 mb-2">Contracts (${data.contracts.length})</h3>
      ${data.contracts.map(c => `<div class="bg-gray-50 p-2 rounded mb-1 text-xs">${c.incoterm} — ${badge(c.status)} — ${c.governing_law}</div>`).join('')}` : ''}
  `);
}

function showTradeForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Create Trade Request</h2>
    <form onsubmit="submitTrade(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Importer Tenant ID</label><input id="tr-importer" class="w-full border rounded-lg px-3 py-2 text-sm" value="t-001" required></div>
      <div><label class="text-sm text-gray-600">Exporter GTID (Direct Entry)</label><input id="tr-exporter" class="w-full border rounded-lg px-3 py-2 text-sm" value="SGTX-VN-TRD-000002-C3D4"></div>
      <div><label class="text-sm text-gray-600">Description</label><textarea id="tr-desc" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2">Organic cotton yarn 32s, GOTS certified, 5000kg</textarea></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">HS Code</label><input id="tr-hs" class="w-full border rounded-lg px-3 py-2 text-sm" value="520512"></div>
        <div><label class="text-sm text-gray-600">Incoterm</label><select id="tr-incoterm" class="w-full border rounded-lg px-3 py-2 text-sm"><option>CFR</option><option>FOB</option><option>CIF</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option></select></div>
      </div>
      <div><label class="text-sm text-gray-600">Created By (Employee ID)</label><input id="tr-by" class="w-full border rounded-lg px-3 py-2 text-sm" value="e-001"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600">Submit (Governor Gated)</button>
    </form>
  `);
}

async function submitTrade(e) {
  e.preventDefault();
  const res = await apiPost('/trades', {
    importer_tenant_id: document.getElementById('tr-importer').value,
    exporter_gtid: document.getElementById('tr-exporter').value,
    raw_description: document.getElementById('tr-desc').value,
    parsed_specs: { hs_code: document.getElementById('tr-hs').value, incoterm: document.getElementById('tr-incoterm').value, description: document.getElementById('tr-desc').value },
    created_by: document.getElementById('tr-by').value,
  });
  if (res.error) { alert('Denied: ' + res.error); return; }
  closeModal(); navigate('trades');
}

// ─── CONTRACTS ──────────────────────────────────────────
async function renderContracts() {
  setTitle('Contracts', 'Phase 3 — Contracting with commission collection');
  const { data } = await api('/contracts');
  document.getElementById('content').innerHTML = `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Importer</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Incoterm</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Locked</th></tr></thead>
      <tbody>${data.map(c => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${c.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${c.importer_name || '—'}</td>
        <td class="px-4 py-3">${c.exporter_name || '—'}</td>
        <td class="px-4 py-3 text-center"><span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">${c.incoterm}</span></td>
        <td class="px-4 py-3 text-center">${badge(c.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(c.locked_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ─── COMMISSION LOCKS ───────────────────────────────────
async function renderCommissions() {
  setTitle('Commission Locks', 'Non-custodial commission protection — NATS KV');
  const { data } = await api('/commission-locks');
  document.getElementById('content').innerHTML = `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Lock ID</th><th class="px-4 py-3">Rate</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Released</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Responsible</th><th class="px-4 py-3">Locked</th></tr></thead>
      <tbody>${data.map(cl => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${cl.lock_id?.slice(0,8)}...</td>
        <td class="px-4 py-3 text-center">${pct(cl.commission_rate_pct)}</td>
        <td class="px-4 py-3 text-center font-semibold text-green-600">${usd(cl.commission_usd)}</td>
        <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-16 h-2 bg-gray-200 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:${cl.released_pct || 0}%"></div></div><span class="text-xs">${cl.released_pct || 0}%</span></div></td>
        <td class="px-4 py-3 text-center">${badge(cl.status)}</td>
        <td class="px-4 py-3 text-xs">${cl.responsible_tenant || '—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(cl.locked_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ─── SHIPMENTS ──────────────────────────────────────────
async function renderShipments() {
  setTitle('Shipments', 'Phase 5 — Physical execution with USTN tracking');
  const { data } = await api('/shipments');
  document.getElementById('content').innerHTML = `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">USTN</th><th class="px-4 py-3">Importer</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Origin</th><th class="px-4 py-3">Destination</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(s => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showShipmentDetail('${s.id}')">
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${s.ustn}</td>
        <td class="px-4 py-3 text-sm">${s.importer_name || '—'}</td>
        <td class="px-4 py-3 text-sm">${s.exporter_name || '—'}</td>
        <td class="px-4 py-3 text-sm">${s.origin_port || '—'}</td>
        <td class="px-4 py-3 text-sm">${s.destination_port || '—'}</td>
        <td class="px-4 py-3 text-center">${badge(s.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(s.created_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showShipmentDetail(id) {
  const { data } = await api(`/shipments/${id}`);
  const milestoneSteps = ['GATE_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];
  const confirmedMilestones = new Set((data.milestones || []).map(m => m.milestone));
  showModal(`
    <h2 class="text-lg font-bold mb-2"><i class="fas fa-ship mr-2 text-sgtx-500"></i>Shipment Detail</h2>
    <div class="font-mono text-sm text-sgtx-600 mb-4">${data.ustn}</div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Origin:</span> ${data.origin_port || '—'}</div>
      <div><span class="text-gray-500">Destination:</span> ${data.destination_port || '—'}</div>
      <div><span class="text-gray-500">Vessel:</span> ${data.vessel_name || '—'}</div>
    </div>
    <h3 class="font-semibold text-sm mb-2">Milestone Tracker</h3>
    <div class="flex items-center gap-1 mb-4">${milestoneSteps.map(m => `
      <div class="flex-1 text-center">
        <div class="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${confirmedMilestones.has(m) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}">
          ${confirmedMilestones.has(m) ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <div class="text-[9px] mt-1 text-gray-500">${m}</div>
      </div>
    `).join('<div class="w-4 h-0.5 bg-gray-200"></div>')}</div>
    ${data.barcodes?.length ? `<h3 class="font-semibold text-sm mb-2">Barcodes (${data.barcodes.length} pallets)</h3>
      <div class="grid grid-cols-2 gap-2 mb-3">${data.barcodes.map(b => `<div class="bg-gray-50 p-2 rounded text-xs"><div class="font-semibold">${b.barcode_type} — Pallet ${b.pallet_number}</div><div class="font-mono text-[10px] text-gray-500">SSCC: ${b.sscc}</div></div>`).join('')}</div>` : ''}
    ${data.document_requirements?.length ? `<h3 class="font-semibold text-sm mb-2">Documents</h3>
      <div class="space-y-1">${data.document_requirements.map(d => `<div class="flex justify-between text-xs bg-gray-50 p-2 rounded"><span>${d.document_type}</span>${badge(d.status)}</div>`).join('')}</div>` : ''}
    ${data.disruption_predictions?.length ? `<h3 class="font-semibold text-sm mt-3 mb-2 text-red-600"><i class="fas fa-exclamation-triangle mr-1"></i>Disruption Predictions</h3>
      ${data.disruption_predictions.map(d => `<div class="bg-red-50 p-2 rounded text-xs mb-1"><b>${d.prediction_type}</b> — ${(d.probability*100).toFixed(0)}% probability — ${d.recommendation || ''}</div>`).join('')}` : ''}
  `);
}

// ─── SETTLEMENTS ────────────────────────────────────────
async function renderSettlements() {
  setTitle('Settlements', 'Phase 6 — USTN-linked settlement orchestration');
  const { data } = await api('/settlements');
  document.getElementById('content').innerHTML = data.length ? `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">USTN</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(s => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${s.id?.slice(0,8)}...</td>
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${s.ustn || '—'}</td>
        <td class="px-4 py-3">${s.instruction_type}</td>
        <td class="px-4 py-3 text-center">${badge(s.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(s.created_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No settlement instructions yet');
}

// ─── FINANCING ──────────────────────────────────────────
async function renderFinancing() {
  setTitle('Financing', 'Phase 4 — Universal trade finance with blind bidding');
  const { data } = await api('/financing');
  document.getElementById('content').innerHTML = data.length ? `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Requester</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Tenor</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${data.map(f => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${f.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${f.requester_name || '—'}</td>
        <td class="px-4 py-3 text-center font-semibold">${usd(f.amount)}</td>
        <td class="px-4 py-3 text-center text-xs">${f.financing_type}</td>
        <td class="px-4 py-3 text-center">${f.tenor_days}d</td>
        <td class="px-4 py-3 text-center">${badge(f.status)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No financing requests yet');
}

// ─── DISTRESSED CARGO ───────────────────────────────────
async function renderDistressed() {
  setTitle('Distressed Cargo', 'Phase 7 — AI-driven cargo resolution');
  const { data } = await api('/distressed');
  document.getElementById('content').innerHTML = data.length ? `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Location</th><th class="px-4 py-3">Qty</th><th class="px-4 py-3">Price</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${data.map(d => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${d.exporter_name || '—'}</td>
        <td class="px-4 py-3">${d.current_location}</td>
        <td class="px-4 py-3 text-center">${d.quantity} ${d.unit}</td>
        <td class="px-4 py-3 text-center">${usd(d.price_expectation)}</td>
        <td class="px-4 py-3 text-center">${badge(d.status)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No distressed cargo listings');
}

// ─── PAYMENTS ───────────────────────────────────────────
async function renderPayments() {
  setTitle('Payment Orchestrator', 'Phase 9 — Global PSP routing');
  const [payments, aggregators] = await Promise.all([api('/payments'), api('/payment-aggregators')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-server mr-2 text-sgtx-500"></i>Active PSP Aggregators</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${aggregators.data.map(a => `
      <div class="card p-3 text-center">
        <div class="font-semibold text-sm">${a.name}</div>
        <div class="text-xs text-gray-500 mt-1">${JSON.parse(a.country_codes || '[]').join(', ')}</div>
        <div class="text-xs mt-1">Uptime: <span class="text-green-600 font-semibold">${(a.uptime_score * 100).toFixed(1)}%</span></div>
      </div>
    `).join('')}</div>
    <h3 class="font-bold mb-3"><i class="fas fa-credit-card mr-2 text-sgtx-500"></i>Payment Attempts</h3>
    ${payments.data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">PSP</th><th class="px-4 py-3">Country</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${payments.data.map(p => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${p.aggregator_name}</td>
        <td class="px-4 py-3 text-center">${p.buyer_country}</td>
        <td class="px-4 py-3 text-center">${usd(p.amount_usd)}</td>
        <td class="px-4 py-3 text-center text-green-600">${usd(p.commission_amount_usd)}</td>
        <td class="px-4 py-3 text-center">${badge(p.status)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No payment attempts yet')}`;
}

// ─── GOVERNOR DECISIONS ─────────────────────────────────
async function renderGovernor() {
  setTitle('Governor Decisions', 'OPA + WasmEdge + Loom — Single point of truth');
  const { data } = await api('/governor/decisions?limit=100');
  const counts = { ALLOW: 0, DENY: 0, CONDITIONAL: 0, ESCALATE: 0, PENDING: 0 };
  data.forEach(d => counts[d.verdict] = (counts[d.verdict] || 0) + 1);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-5 gap-3 mb-5">
      ${Object.entries(counts).map(([v, c]) => `<div class="card p-3 text-center"><div class="text-2xl font-bold verdict-${v}">${c}</div><div class="text-xs text-gray-500">${v}</div></div>`).join('')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Decision ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Actor</th><th class="px-4 py-3">Verdict</th><th class="px-4 py-3">Confidence</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${data.map(d => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showDecisionDetail('${d.decision_id}')">
        <td class="px-4 py-3 font-mono text-xs">${d.decision_id?.slice(0,12)}...</td>
        <td class="px-4 py-3 text-xs">${d.decision_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${d.actor_gtid?.slice(0,20)}...</td>
        <td class="px-4 py-3 text-center">${verdictBadge(d.verdict)}</td>
        <td class="px-4 py-3 text-center">${d.confidence ? (d.confidence * 100).toFixed(0) + '%' : '—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(d.created_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showDecisionDetail(id) {
  const { data } = await api(`/governor/decisions/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Governor Decision</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">ID:</span> <span class="font-mono text-xs">${data.decision_id}</span></div>
      <div><span class="text-gray-500">Type:</span> ${data.decision_type}</div>
      <div><span class="text-gray-500">Verdict:</span> ${verdictBadge(data.verdict)}</div>
      <div><span class="text-gray-500">Confidence:</span> ${data.confidence ? (data.confidence * 100).toFixed(1) + '%' : '—'}</div>
      <div><span class="text-gray-500">Actor:</span> <span class="font-mono text-xs">${data.actor_gtid}</span></div>
      <div><span class="text-gray-500">Policy:</span> ${data.policy_version}</div>
    </div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <h3 class="text-xs font-semibold mb-1">Explanation</h3>
      <p class="text-sm">${data.explainability || '—'}</p>
    </div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3">
      <h3 class="text-xs font-semibold mb-1">Conditions</h3>
      <pre class="text-xs">${data.conditions || '[]'}</pre>
    </div>
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div><span class="text-gray-500">Loom Hash:</span><div class="font-mono break-all">${data.loom_hash}</div></div>
      <div><span class="text-gray-500">Signature:</span><div class="font-mono break-all">${data.cryptographic_signature?.slice(0, 40)}...</div></div>
    </div>
    ${data.loom_log ? `<div class="mt-3 bg-purple-50 p-3 rounded-lg"><h3 class="text-xs font-semibold mb-1">Loom Log (Deterministic Replay)</h3><pre class="text-xs">${JSON.stringify(JSON.parse(data.loom_log.agent_reasoning || '{}'), null, 2)}</pre></div>` : ''}
  `);
}

// ─── JURISDICTIONS ──────────────────────────────────────
async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Global coverage — Sanctions & settlement matrix');
  const { data } = await api('/jurisdictions');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-3 mb-5">
      ${statCard('fas fa-check-circle', 'Clear', data.filter(j => j.sanctions_level === 'NONE').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-circle', 'High Risk', data.filter(j => j.sanctions_level === 'HIGH_RISK').length, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-ban', 'Blocked', data.filter(j => j.sanctions_level === 'BLOCKED').length, 'bg-red-50 text-red-600')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Code</th><th class="px-4 py-3 text-left">Country</th><th class="px-4 py-3">Sanctions</th><th class="px-4 py-3">KYC Tier</th><th class="px-4 py-3">Regulator</th><th class="px-4 py-3">CBDC</th><th class="px-4 py-3">PSPs</th></tr></thead>
      <tbody>${data.map(j => `<tr class="border-t border-gray-50 ${j.sanctions_level === 'BLOCKED' ? 'bg-red-50' : j.sanctions_level === 'HIGH_RISK' ? 'bg-yellow-50' : ''}">
        <td class="px-4 py-3 text-center font-semibold">${j.code}</td>
        <td class="px-4 py-3">${j.name}</td>
        <td class="px-4 py-3 text-center">${badge(j.sanctions_level)}</td>
        <td class="px-4 py-3 text-center">T${j.kyc_tier_required}</td>
        <td class="px-4 py-3 text-xs">${j.regulatory_body || '—'}</td>
        <td class="px-4 py-3 text-center text-xs">${j.cbdc_status}</td>
        <td class="px-4 py-3 text-xs">${JSON.parse(j.psp_partners || '[]').join(', ')}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ─── COMPLIANCE ─────────────────────────────────────────
async function renderCompliance() {
  setTitle('Compliance', 'AML/KYC/Sanctions screening & monitoring');
  const [events, checks] = await Promise.all([api('/compliance/events'), api('/compliance/checks')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>Compliance Events</h3>
    ${events.data.length ? `<div class="card overflow-x-auto mb-6"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Severity</th><th class="px-4 py-3">Resolved</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${events.data.map(e => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${e.event_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${e.entity_gtid || '—'}</td>
        <td class="px-4 py-3 text-center">${badge(e.severity)}</td>
        <td class="px-4 py-3 text-center">${e.resolved ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(e.created_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No compliance events')}
    <h3 class="font-bold mb-3"><i class="fas fa-clipboard-check mr-2 text-sgtx-500"></i>Compliance Checks</h3>
    ${checks.data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Result</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${checks.data.map(c => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${c.check_type}</td>
        <td class="px-4 py-3 text-center">${badge(c.result)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(c.checked_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No compliance checks')}`;
}

// ─── AUDIT LOG ──────────────────────────────────────────
async function renderAudit() {
  setTitle('Audit Log', 'Immutable trail — Loom + Ed25519 + hash chain');
  const { data } = await api('/audit?limit=100');
  document.getElementById('content').innerHTML = data.length ? `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">#</th><th class="px-4 py-3">Table</th><th class="px-4 py-3">Record</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Changed By</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${data.map(a => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 text-xs">${a.id}</td>
        <td class="px-4 py-3 text-xs font-mono">${a.table_name}</td>
        <td class="px-4 py-3 text-xs font-mono">${a.record_id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${badge(a.action)}</td>
        <td class="px-4 py-3 text-xs">${a.changed_by || '—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(a.changed_at)}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No audit entries yet');
}

// ─── ESG ────────────────────────────────────────────────
async function renderESG() {
  setTitle('ESG Assessments', 'Environmental, Social, Governance scoring');
  const { data } = await api('/esg');
  document.getElementById('content').innerHTML = data.length ? `
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">ESG</th><th class="px-4 py-3">Env</th><th class="px-4 py-3">Social</th><th class="px-4 py-3">Gov</th><th class="px-4 py-3">Carbon</th></tr></thead>
      <tbody>${data.map(e => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${e.legal_name || e.entity_gtid}</td>
        <td class="px-4 py-3 text-xs">${e.assessment_type}</td>
        <td class="px-4 py-3 text-center font-bold">${e.esg_score}</td>
        <td class="px-4 py-3 text-center text-green-600">${e.environmental_score || '—'}</td>
        <td class="px-4 py-3 text-center text-blue-600">${e.social_score || '—'}</td>
        <td class="px-4 py-3 text-center text-purple-600">${e.governance_score || '—'}</td>
        <td class="px-4 py-3 text-center text-xs">${e.carbon_intensity || '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>` : emptyState('No ESG assessments yet');
}

// ─── MODALS & UTILITIES ─────────────────────────────────
function showModal(html) { document.getElementById('modal-body').innerHTML = html; document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function emptyState(msg) { return `<div class="card p-12 text-center text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>${msg}</p></div>`; }

function showCreateModal() {
  const options = {
    dashboard: null, tenants: showTenantForm, trades: showTradeForm, contracts: null, shipments: null,
  };
  if (options[currentPage]) { options[currentPage](); return; }
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-plus mr-2 text-sgtx-500"></i>Quick Actions</h2>
    <div class="grid grid-cols-2 gap-3">
      <button onclick="closeModal();showTenantForm()" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-building text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Register Tenant</div></button>
      <button onclick="closeModal();showTradeForm()" class="card p-4 text-center hover:bg-sgtx-50 transition"><i class="fas fa-handshake text-xl text-sgtx-500 mb-2"></i><div class="text-sm font-medium">Create Trade</div></button>
    </div>
  `);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => navigate('dashboard'));

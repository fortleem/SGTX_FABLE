// SGTX Platform v6.3 — Main Application Shell (Multi-Tenant Portal)
export function appHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform v6.3 — Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  theme: { extend: { colors: {
    sgtx: { 50:'#f0f0ff',100:'#e0e0ff',200:'#c4c0ff',300:'#a49aff',400:'#7c6eff',500:'#4E3FE8',600:'#3d2fc0',700:'#2d2290',800:'#1e1660',900:'#0f0b30' },
    governor: { allow:'#10B981', deny:'#EF4444', conditional:'#F59E0B', escalate:'#8B5CF6', pending:'#6B7280' }
  }}}
}
</script>
<style>
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .3s ease-out}
.tab-active{border-bottom:3px solid #4E3FE8;color:#4E3FE8;font-weight:600}
.verdict-ALLOW{color:#10B981}.verdict-DENY{color:#EF4444}.verdict-CONDITIONAL{color:#F59E0B}.verdict-ESCALATE{color:#8B5CF6}
.status-badge{padding:2px 10px;border-radius:9999px;font-size:.7rem;font-weight:600;text-transform:uppercase}
.status-ACTIVE,.status-VERIFIED,.status-ALLOW,.status-COMPLETED,.status-DELIVERED,.status-FULLY_RELEASED{background:#D1FAE5;color:#065F46}
.status-PENDING,.status-DRAFT,.status-CREATED,.status-SUBMITTED,.status-REQUESTED,.status-OPEN{background:#FEF3C7;color:#92400E}
.status-LOCKED,.status-CONTRACTED,.status-IN_EXECUTION,.status-IN_TRANSIT,.status-BIDDING,.status-AWARDED{background:#DBEAFE;color:#1E40AF}
.status-DENIED,.status-BLOCKED,.status-CANCELLED,.status-DISPUTED,.status-DISTRESSED,.status-FILED,.status-DEFAULTED{background:#FEE2E2;color:#991B1B}
.status-CONDITIONAL,.status-ESCALATE,.status-HIGH_RISK,.status-PARTIALLY_RELEASED{background:#FDE68A;color:#78350F}
.status-NONE{background:#E5E7EB;color:#374151}
.card{background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);border:1px solid #E5E7EB}
.sidebar-item{padding:10px 16px;cursor:pointer;border-radius:8px;transition:all .15s;display:flex;align-items:center;gap:10px;font-size:.875rem}
.sidebar-item:hover{background:#F3F4F6}.sidebar-item.active{background:#EDE9FE;color:#4E3FE8;font-weight:600}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:3px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50}
.modal-content{background:white;border-radius:16px;padding:24px;max-width:720px;width:95%;max-height:85vh;overflow-y:auto}
</style>
</head>
<body class="bg-gray-50 text-gray-800">
<div id="app" class="flex h-screen overflow-hidden">
<!-- Sidebar -->
<aside id="sidebar" class="w-64 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
  <div class="p-5 border-b border-gray-100">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-sgtx-500 rounded-xl flex items-center justify-center"><i class="fas fa-shield-halved text-white text-lg"></i></div>
      <div><div class="font-bold text-lg text-sgtx-800">SGTX</div><div class="text-[10px] text-gray-400 -mt-0.5 tracking-wider">PLATFORM v6.3</div></div>
    </div>
    <div id="tenant-info" class="mt-3 text-xs text-gray-500"></div>
  </div>
  <!-- Portal Selector -->
  <div class="px-3 pt-3">
    <select id="portal-select" onchange="switchPortal(this.value)" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 focus:outline-none focus:border-sgtx-500">
      <option value="dashboard">Main Dashboard</option>
      <option value="importer">Importer Portal</option>
      <option value="exporter">Exporter Portal</option>
      <option value="logistics">Logistics Portal</option>
      <option value="financier">Financier Portal</option>
      <option value="qc">QC / Inspection Portal</option>
      <option value="admin">Admin Portal</option>
    </select>
  </div>
  <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-1" id="nav-items"></nav>
  <div class="p-3 border-t border-gray-100">
    <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
      <span id="user-name">—</span>
      <button onclick="logout()" class="text-red-400 hover:text-red-600"><i class="fas fa-sign-out-alt"></i></button>
    </div>
    <div class="text-[9px] text-gray-400 text-center italic">No irreversible action without Governor approval</div>
    <div class="text-[8px] text-gray-300 text-center mt-1">SGTX is a non-custodial execution platform, not a marketplace.</div>
  </div>
</aside>
<!-- Main -->
<main class="flex-1 overflow-y-auto">
  <header class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center justify-between">
    <div>
      <h1 id="page-title" class="text-xl font-bold text-gray-800">Dashboard</h1>
      <p id="page-subtitle" class="text-xs text-gray-400"></p>
    </div>
    <div class="flex items-center gap-3">
      <div id="mode-switcher" class="flex items-center gap-1 text-xs">
        <button onclick="switchMode('BUY')" id="mode-BUY" class="px-3 py-1 rounded-full border border-gray-200 hover:bg-blue-50">BUY</button>
        <button onclick="switchMode('SELL')" id="mode-SELL" class="px-3 py-1 rounded-full border border-gray-200 hover:bg-green-50">SELL</button>
        <button onclick="switchMode('DUAL')" id="mode-DUAL" class="px-3 py-1 rounded-full bg-sgtx-500 text-white">DUAL</button>
      </div>
      <span class="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium"><i class="fas fa-circle text-[6px] mr-1"></i>Operational</span>
      <button id="new-action-btn" onclick="showCreateModal()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sgtx-600 transition"><i class="fas fa-plus mr-1"></i>New</button>
    </div>
  </header>
  <div id="content" class="p-6 fade-in"></div>
</main>
</div>
<div id="modal" class="modal-overlay hidden" onclick="if(event.target===this)closeModal()">
  <div class="modal-content" id="modal-body"></div>
</div>
<script src="/static/app.js"></script>
<script src="/static/trade_forms.js"></script>
</body>
</html>`;
}

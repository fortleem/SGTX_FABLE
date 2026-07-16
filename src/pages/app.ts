// SGTX Platform v11.2 — Main Application Shell (Gold/Black Brand Identity)
export function appHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform — Sovereign Governed Trade Execution</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    colors: {
      gold: { 50:'#fdf8e7',100:'#faefc7',200:'#f5dc89',300:'#efca4b',400:'#D4A017',500:'#C9A84C',600:'#a8841a',700:'#836514',800:'#5f470e',900:'#3a2c08' },
      dark: { 50:'#f5f5f5',100:'#e8e8e8',200:'#d0d0d0',300:'#b0b0b0',400:'#888888',500:'#666666',600:'#444444',700:'#2a2a2a',800:'#1a1a1a',900:'#0D0D0D',950:'#080808' },
      sgtx: { 50:'#fdf8e7',100:'#faefc7',200:'#f5dc89',300:'#efca4b',400:'#D4A017',500:'#C9A84C',600:'#a8841a',700:'#836514',800:'#5f470e',900:'#3a2c08' },
      surface: { 50:'#fafaf9',100:'#f5f4f0',200:'#ece9e0',300:'#d5d0c5',400:'#b0a898',500:'#8a7f6e',600:'#6b6050',700:'#4a4035',800:'#2e2820',900:'#1a1410',950:'#0d0b08' },
      governor: { allow:'#10b981', deny:'#ef4444', conditional:'#f59e0b', escalate:'#8b5cf6', pending:'#6b7280' },
      accent: { blue:'#3b82f6', cyan:'#06b6d4', emerald:'#10b981', amber:'#D4A017', rose:'#f43f5e' },
    },
    boxShadow: {
      'gold': '0 0 24px rgba(212,160,23,.15)',
      'gold-sm': '0 0 12px rgba(212,160,23,.1)',
      'gold-lg': '0 0 40px rgba(212,160,23,.2)',
      'card': '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.12)',
      'card-hover': '0 8px 32px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.08)',
    },
    animation: {
      'slide-up': 'slideUp .4s cubic-bezier(.16,1,.3,1)',
      'fade-in': 'fadeIn .3s ease-out',
      'pulse-slow': 'pulse 3s infinite',
      'shimmer': 'shimmer 2s infinite',
      'float': 'float 6s ease-in-out infinite',
      'gold-pulse': 'goldPulse 2s ease-in-out infinite',
    },
    keyframes: {
      slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      goldPulse: { '0%,100%': { boxShadow: '0 0 12px rgba(212,160,23,.08)' }, '50%': { boxShadow: '0 0 24px rgba(212,160,23,.18)' } },
    }
  }}
}
</script>
<style>
* { font-family: 'Inter', system-ui, sans-serif; }
:root {
  --gold: #D4A017;
  --gold-muted: #C9A84C;
  --gold-alpha: rgba(212,160,23,.12);
  --gold-border: rgba(201,168,76,.2);
  --sidebar-bg: #111111;
  --sidebar-border: rgba(201,168,76,.1);
  --surface-bg: #f8f6f0;
  --surface-card: #ffffff;
  --text-primary: #1a1410;
  --text-secondary: #3d3528;
  --text-muted: #6b6050;
  --text-faint: #8a7f6e;
  --border-subtle: rgba(201,168,76,.12);
}

/* === Scrollbar — Gold === */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#D4A017,#C9A84C);border-radius:10px}

/* === SIDEBAR === */
.sidebar-nav{background:var(--sidebar-bg);border-right:1px solid var(--sidebar-border)}
.nav-item{position:relative;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:.8rem;font-weight:500;color:rgba(255,255,255,.45);cursor:pointer;transition:all .2s}
.nav-item:hover{background:rgba(212,160,23,.06);color:rgba(255,255,255,.8)}
.nav-item.active{background:rgba(212,160,23,.1);color:#D4A017;font-weight:600;border:1px solid rgba(212,160,23,.15)}
.nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:16px;background:linear-gradient(180deg,#D4A017,#C9A84C);border-radius:0 3px 3px 0}
.nav-section{font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.2);padding:18px 14px 5px;user-select:none}

/* === CARDS — Light Parchment Theme === */
.glass{background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border:1px solid var(--border-subtle);box-shadow:0 2px 12px rgba(0,0,0,.04)}
.glass-dark{background:rgba(17,17,17,.92);backdrop-filter:blur(16px);border:1px solid rgba(212,160,23,.12)}
.sgtx-card,.glass-card{background:var(--surface-card);border-radius:14px;border:1px solid var(--border-subtle);box-shadow:0 1px 3px rgba(0,0,0,.04);transition:all .25s}
.sgtx-card:hover,.glass-card:hover{box-shadow:0 8px 32px rgba(212,160,23,.08),0 2px 8px rgba(0,0,0,.06);border-color:rgba(212,160,23,.25);transform:translateY(-1px)}

/* === FORM INPUTS === */
input, select, textarea { color: var(--text-primary) !important; }
input[type="text"], input[type="number"], input[type="email"], input[type="password"],
input[type="date"], input[type="time"], select, textarea {
  background: #faf9f5 !important;
  color: var(--text-primary) !important;
  border: 1px solid rgba(201,168,76,.2) !important;
  border-radius: 8px !important;
  font-size: 13px;
  padding: 7px 10px;
  transition: all .2s ease;
}
input:focus, select:focus, textarea:focus {
  background: #ffffff !important;
  border-color: var(--gold) !important;
  box-shadow: 0 0 0 3px rgba(212,160,23,.1), 0 1px 4px rgba(212,160,23,.1) !important;
  outline: none !important;
}
select option { background: #fff !important; color: var(--text-primary) !important; }
input::placeholder, textarea::placeholder { color: #b0a898 !important; }
label { color: var(--text-secondary) !important; }

/* === BADGES === */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-size:.6875rem;font-weight:600;letter-spacing:.02em}
.badge-success{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;border:1px solid rgba(16,185,129,.15)}
.badge-warning{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#78350f;border:1px solid rgba(212,160,23,.2)}
.badge-info{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:1px solid rgba(59,130,246,.15)}
.badge-danger{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;border:1px solid rgba(239,68,68,.15)}
.badge-gold{background:linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.06));color:#7a5a00;border:1px solid rgba(212,160,23,.2)}
.badge-neutral{background:linear-gradient(135deg,#f4f4f5,#e4e4e7);color:#52525b;border:1px solid rgba(0,0,0,.04)}

/* === METRIC CARDS === */
.metric-card{background:linear-gradient(135deg,#ffffff,#fdf8e7);border-radius:14px;border:1px solid rgba(212,160,23,.12);padding:18px 22px;position:relative;overflow:hidden}
.metric-card::after{content:'';position:absolute;top:-30%;right:-20%;width:60%;height:160%;background:radial-gradient(circle,rgba(212,160,23,.04) 0%,transparent 70%);pointer-events:none}

/* === MODE TOGGLE === */
.mode-toggle{display:inline-flex;background:linear-gradient(135deg,#fdf8e7,#faefc7);border-radius:10px;padding:3px;gap:2px;border:1px solid rgba(212,160,23,.2)}
.mode-toggle button{padding:6px 14px;border-radius:7px;font-size:.75rem;font-weight:600;transition:all .25s;border:none;cursor:pointer;color:var(--text-muted)}
.mode-toggle button.active{background:white;color:var(--gold);box-shadow:0 2px 10px rgba(212,160,23,.2),0 1px 3px rgba(0,0,0,.06)}

/* === TABLES === */
.sgtx-table{width:100%;font-size:.8125rem}
.sgtx-table thead{background:linear-gradient(135deg,#faf9f5,#fdf8e7);border-bottom:1px solid rgba(212,160,23,.12)}
.sgtx-table th{padding:11px 14px;font-weight:600;color:#6b6050;text-align:left;font-size:.7rem;letter-spacing:.04em;text-transform:uppercase}
.sgtx-table td{padding:11px 14px;border-bottom:1px solid rgba(212,160,23,.06);color:var(--text-secondary)}
.sgtx-table tr:hover td{background:#fdf8e7}

/* === URGENCY INDICATORS === */
.urgency-critical{border-left:3px solid #ef4444}.urgency-high{border-left:3px solid #D4A017}
.urgency-medium{border-left:3px solid #3b82f6}.urgency-low{border-left:3px solid #d5d0c5}

/* === GRADIENT BORDER (gold animated) === */
.gradient-border{position:relative;border-radius:16px;overflow:hidden}
.gradient-border::before{content:'';position:absolute;inset:-1px;background:linear-gradient(135deg,#D4A017,#C9A84C,#efca4b,#D4A017);background-size:300% 300%;animation:gradientMove 6s linear infinite;z-index:-1;border-radius:17px}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

/* === TAB SYSTEM === */
.tab-bar{display:flex;gap:0;border-bottom:1px solid rgba(212,160,23,.12);padding:0;background:linear-gradient(180deg,#fff,#fdf8e7)}
.tab-item{padding:11px 18px;font-size:.8rem;font-weight:500;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
.tab-item:hover{color:var(--text-secondary)}.tab-item.active{color:var(--gold);border-bottom-color:var(--gold);font-weight:600}

/* === SHIMMER LOADING === */
.shimmer{background:linear-gradient(90deg,#fdf8e7 25%,#faefc7 50%,#fdf8e7 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}

/* === PAGE TRANSITION === */
.page-transition{animation:slideUp .35s cubic-bezier(.16,1,.3,1)}

/* === NC BANNER === */
.nc-banner{background:linear-gradient(135deg,rgba(212,160,23,.06),rgba(212,160,23,.03));color:rgba(255,255,255,.3);font-size:.6rem;padding:7px 12px;text-align:center;letter-spacing:.02em;border:1px solid rgba(212,160,23,.08);border-radius:8px}

/* === TOOLTIP === */
[data-tooltip]{position:relative}
[data-tooltip]:hover::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#111;color:rgba(255,255,255,.9);font-size:.6875rem;padding:4px 10px;border-radius:6px;white-space:nowrap;z-index:100;border:1px solid rgba(212,160,23,.2)}

/* === MODAL === */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .25s}
.modal-overlay.show{opacity:1;pointer-events:auto}
.modal-panel{background:white;border-radius:20px;padding:32px;max-width:820px;width:95%;max-height:88vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,.15),0 8px 32px rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.12);transform:translateY(20px);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.modal-overlay.show .modal-panel{transform:translateY(0)}

/* === TOAST === */
.toast-container{position:fixed;top:20px;right:20px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{padding:14px 20px;border-radius:12px;font-size:.8125rem;font-weight:500;box-shadow:0 12px 40px rgba(0,0,0,.12);animation:slideUp .3s cubic-bezier(.16,1,.3,1);max-width:380px}
.toast-success{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border:1px solid #a7f3d0}
.toast-error{background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#991b1b;border:1px solid #fecaca}
.toast-info{background:linear-gradient(135deg,#fdf8e7,#faefc7);color:#78350f;border:1px solid rgba(212,160,23,.3)}

/* === BUTTON STYLES === */
.btn-primary{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(212,160,23,.25)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(212,160,23,.4)}
.btn-secondary{background:white;color:var(--gold);border:1px solid rgba(212,160,23,.25);padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-secondary:hover{background:#fdf8e7;border-color:rgba(212,160,23,.4)}
.btn-success{background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(16,185,129,.2)}
.btn-danger{background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-ghost{background:transparent;color:var(--text-muted);border:1px solid rgba(0,0,0,.08);padding:7px 14px;border-radius:8px;font-size:.8125rem;font-weight:500;cursor:pointer;transition:all .2s}
.btn-ghost:hover{background:#fdf8e7;color:var(--gold);border-color:rgba(212,160,23,.2)}

/* === AI BAND (fair price indicator) === */
.ai-band{position:absolute;pointer-events:none;opacity:.3;background:linear-gradient(90deg,transparent,rgba(212,160,23,.4),transparent)}

/* === RISK HEAT MAP CELLS === */
.risk-high{background:rgba(239,68,68,.08);color:#991b1b}
.risk-medium{background:rgba(245,158,11,.08);color:#78350f}
.risk-low{background:rgba(16,185,129,.08);color:#065f46}
</style>
</head>
<body class="bg-surface-50 text-surface-900 overflow-hidden" style="background:#f8f6f0">
<div id="app" class="flex h-screen">

<!-- DARK SIDEBAR -->
<aside id="sidebar" class="sidebar-nav w-[264px] flex flex-col h-screen shrink-0 relative z-20" style="background:#111111;border-right:1px solid rgba(201,168,76,.1)">
  
  <!-- Logo + Brand -->
  <div class="px-4 py-4" style="border-bottom:1px solid rgba(212,160,23,.08)">
    <div class="flex items-center gap-3">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-8 w-auto" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none" class="w-8 h-8 rounded-lg items-center justify-center flex-shrink-0 flex" style="background:linear-gradient(135deg,#D4A017,#C9A84C)">
        <span class="font-black text-black text-xs">SG</span>
      </div>
      <div>
        <div class="font-black text-sm tracking-tight" style="color:#D4A017">SGTX</div>
        <div class="text-[9px] font-medium tracking-widest" style="color:rgba(255,255,255,.2)">PLATFORM v11.2</div>
      </div>
    </div>
  </div>

  <!-- Tenant Info + Portal Selector -->
  <div class="px-3 py-3" style="border-bottom:1px solid rgba(212,160,23,.08)">
    <div id="tenant-info" class="text-xs mb-2"></div>
    <select id="portal-select" onchange="switchPortal(this.value)" 
      class="w-full rounded-lg px-3 py-2 text-xs font-medium focus:outline-none cursor-pointer"
      style="background:rgba(255,255,255,.06);border:1px solid rgba(212,160,23,.15);color:rgba(255,255,255,.8)">
      <option value="dashboard">Platform Overview</option>
    </select>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5" id="nav-items"></nav>

  <!-- Sidebar Footer -->
  <div class="p-3" style="border-top:1px solid rgba(212,160,23,.08)">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.15)">
          <i class="fas fa-user text-[10px]" style="color:#D4A017"></i>
        </div>
        <div>
          <div id="user-name" class="text-xs font-semibold" style="color:rgba(255,255,255,.8)">-</div>
          <div id="user-role" class="text-[10px]" style="color:rgba(255,255,255,.3)">-</div>
        </div>
      </div>
      <button onclick="logout()" class="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-500/10" style="color:rgba(255,255,255,.3)" data-tooltip="Logout">
        <i class="fas fa-arrow-right-from-bracket text-xs"></i>
      </button>
    </div>
    <div class="nc-banner">
      <i class="fas fa-lock mr-1" style="color:rgba(212,160,23,.5)"></i>Non-custodial execution platform
    </div>
  </div>
</aside>

<!-- MAIN CONTENT (light parchment) -->
<main class="flex-1 flex flex-col overflow-hidden">
  <!-- Header Bar -->
  <header class="sticky top-0 z-10 px-5 py-3" style="background:rgba(248,246,240,.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(212,160,23,.1)">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div>
          <h1 id="page-title" class="text-base font-black tracking-tight" style="color:#1a1410">Dashboard</h1>
          <p id="page-subtitle" class="text-[11px] mt-0.5" style="color:#8a7f6e"></p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- Dual-Mode Toggle -->
        <div id="mode-switcher" class="mode-toggle hidden">
          <button onclick="switchMode('BUY')" id="mode-BUY" class="flex items-center gap-1"><i class="fas fa-cart-shopping text-[10px]"></i>Buy</button>
          <button onclick="switchMode('SELL')" id="mode-SELL" class="flex items-center gap-1"><i class="fas fa-store text-[10px]"></i>Sell</button>
        </div>

        <!-- Search -->
        <div class="relative">
          <input type="text" placeholder="Search trades, GTIDs..." 
            class="rounded-lg pl-9 pr-4 py-2 text-xs w-52 focus:outline-none transition"
            style="background:#fff;border:1px solid rgba(212,160,23,.15);color:#1a1410;font-size:12px"
            onfocus="this.style.borderColor='rgba(212,160,23,.5)'" 
            onblur="this.style.borderColor='rgba(212,160,23,.15)'">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[11px]" style="color:#b0a898"></i>
        </div>

        <!-- Notifications -->
        <button class="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-yellow-50 transition"
          style="background:white;border:1px solid rgba(212,160,23,.15)" data-tooltip="Notifications">
          <i class="fas fa-bell text-sm" style="color:#8a7f6e"></i>
          <span id="notif-count" class="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center hidden" style="background:#ef4444">0</span>
        </button>

        <!-- System Status -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style="background:#f0fdf4;border:1px solid rgba(34,197,94,.2)">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-slow" style="background:#22c55e"></span>
          <span class="text-[11px] font-semibold" style="color:#15803d">Operational</span>
        </div>

        <!-- New Action -->
        <button id="new-action-btn" onclick="showCreateModal()" 
          class="btn-primary px-4 py-2 text-xs flex items-center gap-2">
          <i class="fas fa-plus text-[10px]"></i>New Trade
        </button>
      </div>
    </div>
  </header>

  <!-- Content Area -->
  <div id="content" class="flex-1 overflow-y-auto p-5 page-transition" style="background:#f8f6f0"></div>
</main>
</div>

<!-- Modal -->
<div id="modal" class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal-panel" id="modal-body"></div>
</div>

<!-- Toast Container -->
<div class="toast-container" id="toasts"></div>

<!-- Scripts -->
<script src="/static/app.js"></script>
<script src="/static/trade_forms.js"></script>
</body>
</html>`;
}

// SGTX Platform v6.3 — Main Application Shell (Redesigned Futuristic UI)
// Blueprint Part 6: All Portals — High-tech, glassmorphism, animated, customer-focused
export function appHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark-ready">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform v6.3</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    colors: {
      sgtx: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#7c3aed',600:'#6d28d9',700:'#5b21b6',800:'#4c1d95',900:'#2e1065',950:'#1a0a3e' },
      surface: { 50:'#fafafa',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',700:'#3f3f46',800:'#27272a',900:'#18181b',950:'#09090b' },
      governor: { allow:'#10b981', deny:'#ef4444', conditional:'#f59e0b', escalate:'#8b5cf6', pending:'#6b7280' },
      accent: { blue:'#3b82f6', cyan:'#06b6d4', emerald:'#10b981', amber:'#f59e0b', rose:'#f43f5e' }
    },
    boxShadow: {
      'glow': '0 0 20px rgba(124, 58, 237, 0.15)',
      'glow-sm': '0 0 10px rgba(124, 58, 237, 0.1)',
      'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
      'card-hover': '0 10px 40px rgba(0,0,0,0.08)',
      'elevated': '0 20px 60px rgba(0,0,0,0.1)',
    },
    animation: { 'slide-up': 'slideUp .4s cubic-bezier(.16,1,.3,1)', 'fade-in': 'fadeIn .3s ease-out', 'pulse-slow': 'pulse 3s infinite', 'shimmer': 'shimmer 2s infinite' },
    keyframes: {
      slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
    }
  }}
}
</script>
<style>
* { font-family: 'Inter', system-ui, sans-serif; }
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#d4d4d8;border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:#a1a1aa}

/* Glassmorphism Card */
.glass{background:rgba(255,255,255,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.3)}
.glass-dark{background:rgba(24,24,27,.85);backdrop-filter:blur(12px);border:1px solid rgba(63,63,70,.5)}

/* Sidebar */
.sidebar-nav{transition:width .3s cubic-bezier(.16,1,.3,1)}
.nav-item{position:relative;display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:10px;font-size:.8125rem;font-weight:500;color:#71717a;cursor:pointer;transition:all .2s cubic-bezier(.16,1,.3,1)}
.nav-item:hover{background:rgba(124,58,237,.06);color:#4c1d95}
.nav-item.active{background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(139,92,246,.08));color:#7c3aed;font-weight:600;box-shadow:inset 0 0 0 1px rgba(124,58,237,.15)}
.nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:18px;background:#7c3aed;border-radius:0 4px 4px 0}
.nav-section{font-size:.625rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;padding:20px 16px 6px;user-select:none}

/* Status badges */
.badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:.6875rem;font-weight:600;letter-spacing:.02em}
.badge-success{background:#d1fae5;color:#065f46}.badge-warning{background:#fef3c7;color:#92400e}
.badge-info{background:#dbeafe;color:#1e40af}.badge-danger{background:#fee2e2;color:#991b1b}
.badge-purple{background:#ede9fe;color:#5b21b6}.badge-neutral{background:#f4f4f5;color:#52525b}

/* Cards */
.sgtx-card{background:white;border-radius:16px;border:1px solid #e4e4e7;padding:24px;transition:all .2s cubic-bezier(.16,1,.3,1)}
.sgtx-card:hover{box-shadow:0 10px 40px rgba(0,0,0,.06);border-color:#d4d4d8;transform:translateY(-1px)}
.metric-card{background:linear-gradient(135deg,#fafafa,#fff);border-radius:16px;border:1px solid #e4e4e7;padding:20px 24px}

/* Mode Toggle */
.mode-toggle{display:inline-flex;background:#f4f4f5;border-radius:10px;padding:3px;gap:2px}
.mode-toggle button{padding:6px 16px;border-radius:8px;font-size:.75rem;font-weight:600;transition:all .2s;border:none;cursor:pointer;color:#71717a}
.mode-toggle button.active{background:white;color:#7c3aed;box-shadow:0 2px 8px rgba(124,58,237,.15)}

/* Tables */
.sgtx-table{width:100%;font-size:.8125rem}
.sgtx-table thead{background:#fafafa;border-bottom:1px solid #e4e4e7}
.sgtx-table th{padding:12px 16px;font-weight:600;color:#52525b;text-align:left;font-size:.75rem;letter-spacing:.03em;text-transform:uppercase}
.sgtx-table td{padding:12px 16px;border-bottom:1px solid #f4f4f5;color:#3f3f46}
.sgtx-table tr:hover td{background:#fafafa}

/* Urgency indicators */
.urgency-critical{border-left:3px solid #ef4444}.urgency-high{border-left:3px solid #f59e0b}
.urgency-medium{border-left:3px solid #3b82f6}.urgency-low{border-left:3px solid #d4d4d8}

/* Animated gradient border */
.gradient-border{position:relative;border-radius:16px;overflow:hidden}
.gradient-border::before{content:'';position:absolute;inset:-1px;background:linear-gradient(135deg,#7c3aed,#06b6d4,#10b981,#7c3aed);background-size:300% 300%;animation:gradientMove 6s linear infinite;z-index:-1;border-radius:17px}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

/* Tab system */
.tab-bar{display:flex;gap:2px;border-bottom:1px solid #e4e4e7;padding:0 4px}
.tab-item{padding:12px 20px;font-size:.8125rem;font-weight:500;color:#71717a;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.tab-item:hover{color:#3f3f46}.tab-item.active{color:#7c3aed;border-bottom-color:#7c3aed;font-weight:600}

/* Loading shimmer */
.shimmer{background:linear-gradient(90deg,#f4f4f5 25%,#e4e4e7 50%,#f4f4f5 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}

/* Transitions */
.page-transition{animation:slideUp .35s cubic-bezier(.16,1,.3,1)}

/* Non-custodial footer banner */
.nc-banner{background:linear-gradient(135deg,#2e1065,#4c1d95);color:rgba(255,255,255,.7);font-size:.625rem;padding:8px 16px;text-align:center;letter-spacing:.02em}

/* Tooltip */
[data-tooltip]{position:relative}
[data-tooltip]:hover::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#18181b;color:white;font-size:.6875rem;padding:4px 10px;border-radius:6px;white-space:nowrap;z-index:100}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(9,9,11,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .2s}
.modal-overlay.show{opacity:1;pointer-events:auto}
.modal-panel{background:white;border-radius:20px;padding:32px;max-width:800px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,.2);transform:translateY(20px);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.modal-overlay.show .modal-panel{transform:translateY(0)}

/* Toast notifications */
.toast-container{position:fixed;top:20px;right:20px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{padding:14px 20px;border-radius:12px;font-size:.8125rem;font-weight:500;box-shadow:0 10px 40px rgba(0,0,0,.12);animation:slideUp .3s cubic-bezier(.16,1,.3,1);max-width:380px}
.toast-success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.toast-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.toast-info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
</style>
</head>
<body class="bg-surface-50 text-surface-900 overflow-hidden">
<div id="app" class="flex h-screen">

<!-- ═══ SIDEBAR ═══ -->
<aside id="sidebar" class="sidebar-nav w-[272px] bg-white border-r border-surface-200 flex flex-col h-screen shrink-0 relative z-20">
  <!-- Logo + Brand -->
  <div class="px-5 py-5 border-b border-surface-100">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sgtx-500 to-sgtx-700 flex items-center justify-center shadow-glow-sm">
        <i class="fas fa-shield-halved text-white text-base"></i>
      </div>
      <div>
        <div class="font-bold text-base text-sgtx-900 tracking-tight">SGTX</div>
        <div class="text-[10px] text-surface-400 font-medium tracking-widest">PLATFORM v6.3</div>
      </div>
    </div>
  </div>

  <!-- Tenant Info + Portal Selector -->
  <div class="px-4 py-3 border-b border-surface-100 space-y-2">
    <div id="tenant-info" class="text-xs"></div>
    <select id="portal-select" onchange="switchPortal(this.value)" class="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-[7px] text-xs font-medium text-surface-700 focus:outline-none focus:ring-2 focus:ring-sgtx-500/20 focus:border-sgtx-400 transition cursor-pointer">
      <option value="dashboard">Platform Overview</option>
    </select>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" id="nav-items"></nav>

  <!-- Footer -->
  <div class="border-t border-surface-100 p-3 space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-sgtx-100 flex items-center justify-center">
          <i class="fas fa-user text-sgtx-600 text-[10px]"></i>
        </div>
        <div>
          <div id="user-name" class="text-xs font-medium text-surface-700">—</div>
          <div id="user-role" class="text-[10px] text-surface-400">—</div>
        </div>
      </div>
      <button onclick="logout()" class="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-surface-400 hover:text-red-500 transition" data-tooltip="Logout">
        <i class="fas fa-arrow-right-from-bracket text-xs"></i>
      </button>
    </div>
    <div class="nc-banner rounded-lg">
      <i class="fas fa-lock text-[8px] mr-1"></i>Non-custodial execution platform — not a marketplace
    </div>
  </div>
</aside>

<!-- ═══ MAIN CONTENT ═══ -->
<main class="flex-1 flex flex-col overflow-hidden">
  <!-- Header Bar -->
  <header class="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-surface-100 px-6 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div>
          <h1 id="page-title" class="text-lg font-bold text-surface-900 tracking-tight">Dashboard</h1>
          <p id="page-subtitle" class="text-xs text-surface-400 mt-0.5"></p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- Dual-Mode Toggle (Part 6.1.12) -->
        <div id="mode-switcher" class="mode-toggle hidden">
          <button onclick="switchMode('BUY')" id="mode-BUY" class="flex items-center gap-1"><i class="fas fa-cart-shopping text-[10px]"></i>Buy</button>
          <button onclick="switchMode('SELL')" id="mode-SELL" class="flex items-center gap-1"><i class="fas fa-store text-[10px]"></i>Sell</button>
        </div>

        <!-- Search -->
        <div class="relative">
          <input type="text" placeholder="Search trades, GTIDs..." class="bg-surface-50 border border-surface-200 rounded-lg pl-9 pr-4 py-[7px] text-xs w-56 focus:outline-none focus:ring-2 focus:ring-sgtx-500/20 focus:border-sgtx-400 transition placeholder:text-surface-300">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-300 text-[11px]"></i>
        </div>

        <!-- Notifications -->
        <button class="relative w-9 h-9 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center hover:bg-surface-100 transition" data-tooltip="Notifications">
          <i class="fas fa-bell text-surface-500 text-sm"></i>
          <span id="notif-count" class="absolute -top-1 -right-1 w-4 h-4 bg-accent-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center hidden">0</span>
        </button>

        <!-- System Status -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
          <span class="text-[11px] font-semibold text-emerald-700">Operational</span>
        </div>

        <!-- New Action -->
        <button id="new-action-btn" onclick="showCreateModal()" class="bg-gradient-to-r from-sgtx-500 to-sgtx-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:from-sgtx-600 hover:to-sgtx-700 transition-all shadow-glow-sm hover:shadow-glow flex items-center gap-2">
          <i class="fas fa-plus text-[10px]"></i>New
        </button>
      </div>
    </div>
  </header>

  <!-- Content Area -->
  <div id="content" class="flex-1 overflow-y-auto p-6 page-transition"></div>
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

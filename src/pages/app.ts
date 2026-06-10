// SGTX Platform v6.3 — Main Application Shell (Futuristic Premium UI)
// Blueprint Part 6: All Portals — Next-gen glassmorphism, animated, produce-focused
export function appHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
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
      surface: { 50:'#fafafa',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',400:'#a1a1aa',500:'#71717a',600:'#52525b',700:'#3f3f46',800:'#27272a',900:'#18181b',950:'#09090b' },
      dark: { 700:'#374151',800:'#1f2937',900:'#111827',950:'#030712' },
      brand: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#7c3aed',600:'#6d28d9',700:'#5b21b6' },
      governor: { allow:'#10b981', deny:'#ef4444', conditional:'#f59e0b', escalate:'#8b5cf6', pending:'#6b7280' },
      accent: { blue:'#3b82f6', cyan:'#06b6d4', emerald:'#10b981', amber:'#f59e0b', rose:'#f43f5e' },
      produce: { fresh:'#22c55e', frozen:'#38bdf8', reefer:'#0ea5e9', organic:'#84cc16' }
    },
    boxShadow: {
      'glow': '0 0 24px rgba(124, 58, 237, 0.18)',
      'glow-sm': '0 0 12px rgba(124, 58, 237, 0.1)',
      'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.12)',
      'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
      'card-hover': '0 12px 48px rgba(124,58,237,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      'elevated': '0 24px 64px rgba(0,0,0,0.08)',
      'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.8)',
    },
    animation: {
      'slide-up': 'slideUp .4s cubic-bezier(.16,1,.3,1)',
      'fade-in': 'fadeIn .3s ease-out',
      'pulse-slow': 'pulse 3s infinite',
      'shimmer': 'shimmer 2s infinite',
      'float': 'float 6s ease-in-out infinite',
      'glow-pulse': 'glowPulse 2s ease-in-out infinite',
    },
    keyframes: {
      slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      glowPulse: { '0%,100%': { boxShadow: '0 0 12px rgba(124,58,237,.1)' }, '50%': { boxShadow: '0 0 24px rgba(124,58,237,.2)' } },
    }
  }}
}
</script>
<style>
* { font-family: 'Inter', system-ui, sans-serif; }
:root {
  --glow-primary: rgba(124, 58, 237, 0.15);
  --glow-cyan: rgba(6, 182, 212, 0.12);
  --surface-card: #ffffff;
  --surface-bg: #f8fafc;
  --border-subtle: rgba(228, 228, 231, 0.8);
  --text-primary: #18181b;
  --text-secondary: #3f3f46;
  --text-muted: #71717a;
  --text-faint: #a1a1aa;
}

/* === Scrollbar — Gradient === */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#c4b5fd,#7c3aed);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:#7c3aed}

/* === CARD SYSTEM === */
.glass{background:rgba(255,255,255,.72);backdrop-filter:blur(16px) saturate(180%);border:1px solid rgba(255,255,255,.4);box-shadow:0 4px 30px rgba(0,0,0,.03)}
.glass-dark{background:rgba(24,24,27,.88);backdrop-filter:blur(16px);border:1px solid rgba(63,63,70,.5)}
.sgtx-card,.glass-card{background:var(--surface-card);border-radius:14px;border:1px solid var(--border-subtle);box-shadow:0 1px 3px rgba(0,0,0,.03),0 1px 2px rgba(0,0,0,.04);transition:all .25s cubic-bezier(.16,1,.3,1)}
.sgtx-card:hover,.glass-card:hover{box-shadow:0 8px 32px rgba(124,58,237,.06),0 2px 8px rgba(0,0,0,.04);border-color:#ddd6fe;transform:translateY(-1px)}

/* === FORM INPUTS — High Contrast Light Theme === */
input, select, textarea { color: var(--text-primary) !important; }
input[type="text"], input[type="number"], input[type="email"], input[type="password"],
input[type="date"], input[type="time"], select, textarea {
  background: #f8fafc !important;
  color: #18181b !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  font-size: 13px;
  padding: 7px 10px;
  transition: all .2s ease;
}
input:focus, select:focus, textarea:focus {
  background: #ffffff !important;
  border-color: #7c3aed !important;
  box-shadow: 0 0 0 3px rgba(124,58,237,.08), 0 1px 4px rgba(124,58,237,.1) !important;
  outline: none !important;
}
select { cursor: pointer; appearance: auto; }
select option { background: #fff !important; color: #18181b !important; padding: 8px; }
input::placeholder, textarea::placeholder { color: #94a3b8 !important; }
label { color: var(--text-secondary) !important; }

/* Force light bg on any dark-class inputs */
[class*="bg-dark-"] { background: #f8fafc !important; }

/* === TEXT VISIBILITY — Global override for dark-theme classes === */
.text-surface-200 { color: #27272a !important; }
.text-surface-300 { color: #3f3f46 !important; }
.text-surface-400 { color: #52525b !important; }
.text-surface-500 { color: #71717a !important; }
.text-brand-300 { color: #7c3aed !important; }
.text-cyan-300 { color: #0e7490 !important; }
.text-cyan-400 { color: #0891b2 !important; }

/* === SIDEBAR — Premium Gradient === */
.sidebar-nav{transition:width .3s cubic-bezier(.16,1,.3,1);background:linear-gradient(180deg,#ffffff 0%,#faf5ff 60%,#f5f3ff 100%)}
.nav-item{position:relative;display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:10px;font-size:.8125rem;font-weight:500;color:var(--text-muted);cursor:pointer;transition:all .2s cubic-bezier(.16,1,.3,1)}
.nav-item:hover{background:linear-gradient(135deg,rgba(124,58,237,.05),rgba(6,182,212,.02));color:#4c1d95}
.nav-item.active{background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(139,92,246,.05));color:#7c3aed;font-weight:600;box-shadow:inset 0 0 0 1px rgba(124,58,237,.12),0 2px 8px rgba(124,58,237,.06)}
.nav-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:18px;background:linear-gradient(180deg,#7c3aed,#06b6d4);border-radius:0 4px 4px 0}
.nav-section{font-size:.625rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-faint);padding:20px 16px 6px;user-select:none}

/* === BADGES — Glass Pill === */
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-size:.6875rem;font-weight:600;letter-spacing:.02em}
.badge-success{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;border:1px solid rgba(16,185,129,.15)}
.badge-warning{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;border:1px solid rgba(245,158,11,.15)}
.badge-info{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:1px solid rgba(59,130,246,.15)}
.badge-danger{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;border:1px solid rgba(239,68,68,.15)}
.badge-purple{background:linear-gradient(135deg,#ede9fe,#ddd6fe);color:#5b21b6;border:1px solid rgba(124,58,237,.15)}
.badge-neutral{background:linear-gradient(135deg,#f4f4f5,#e4e4e7);color:#52525b;border:1px solid rgba(0,0,0,.04)}

/* === CARDS — Elevated with Glow === */
.sgtx-card{background:var(--surface-card);border-radius:16px;border:1px solid var(--border-subtle);padding:24px;transition:all .25s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 3px rgba(0,0,0,.02)}
.sgtx-card:hover{box-shadow:0 12px 48px rgba(124,58,237,.05),0 4px 12px rgba(0,0,0,.03);border-color:#ddd6fe;transform:translateY(-1px)}
.metric-card{background:linear-gradient(135deg,#ffffff,#faf5ff);border-radius:16px;border:1px solid var(--border-subtle);padding:20px 24px;position:relative;overflow:hidden}
.metric-card::after{content:'';position:absolute;top:-30%;right:-20%;width:60%;height:160%;background:radial-gradient(circle,rgba(124,58,237,.03) 0%,transparent 70%);pointer-events:none}

/* === MODE TOGGLE === */
.mode-toggle{display:inline-flex;background:linear-gradient(135deg,#f4f4f5,#ede9fe);border-radius:10px;padding:3px;gap:2px;border:1px solid rgba(124,58,237,.08)}
.mode-toggle button{padding:6px 16px;border-radius:8px;font-size:.75rem;font-weight:600;transition:all .25s;border:none;cursor:pointer;color:var(--text-muted)}
.mode-toggle button.active{background:white;color:#7c3aed;box-shadow:0 2px 12px rgba(124,58,237,.15),0 1px 3px rgba(0,0,0,.06)}

/* === TABLES === */
.sgtx-table{width:100%;font-size:.8125rem}
.sgtx-table thead{background:linear-gradient(135deg,#fafafa,#f5f3ff);border-bottom:1px solid #e4e4e7}
.sgtx-table th{padding:12px 16px;font-weight:600;color:#52525b;text-align:left;font-size:.75rem;letter-spacing:.03em;text-transform:uppercase}
.sgtx-table td{padding:12px 16px;border-bottom:1px solid #f4f4f5;color:#3f3f46}
.sgtx-table tr:hover td{background:#faf5ff}

/* === URGENCY INDICATORS === */
.urgency-critical{border-left:3px solid #ef4444}.urgency-high{border-left:3px solid #f59e0b}
.urgency-medium{border-left:3px solid #3b82f6}.urgency-low{border-left:3px solid #d4d4d8}

/* === ANIMATED GRADIENT BORDER === */
.gradient-border{position:relative;border-radius:16px;overflow:hidden}
.gradient-border::before{content:'';position:absolute;inset:-1px;background:linear-gradient(135deg,#7c3aed,#06b6d4,#10b981,#7c3aed);background-size:300% 300%;animation:gradientMove 6s linear infinite;z-index:-1;border-radius:17px}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

/* === TAB SYSTEM === */
.tab-bar{display:flex;gap:2px;border-bottom:1px solid #e4e4e7;padding:0 4px;background:linear-gradient(180deg,#fff,#fafafa)}
.tab-item{padding:12px 20px;font-size:.8125rem;font-weight:500;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
.tab-item:hover{color:#3f3f46}.tab-item.active{color:#7c3aed;border-bottom-color:#7c3aed;font-weight:600}

/* === SHIMMER LOADING === */
.shimmer{background:linear-gradient(90deg,#f4f4f5 25%,#ede9fe 50%,#f4f4f5 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}

/* === PAGE TRANSITION === */
.page-transition{animation:slideUp .35s cubic-bezier(.16,1,.3,1)}

/* === NC BANNER === */
.nc-banner{background:linear-gradient(135deg,#2e1065,#4c1d95);color:rgba(255,255,255,.7);font-size:.625rem;padding:8px 16px;text-align:center;letter-spacing:.02em}

/* === TOOLTIP === */
[data-tooltip]{position:relative}
[data-tooltip]:hover::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#18181b;color:white;font-size:.6875rem;padding:4px 10px;border-radius:6px;white-space:nowrap;z-index:100}

/* === MODAL === */
.modal-overlay{position:fixed;inset:0;background:rgba(9,9,11,.4);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .25s}
.modal-overlay.show{opacity:1;pointer-events:auto}
.modal-panel{background:white;border-radius:20px;padding:32px;max-width:800px;width:95%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 80px rgba(124,58,237,.08),0 8px 32px rgba(0,0,0,.12);transform:translateY(20px);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.modal-overlay.show .modal-panel{transform:translateY(0)}

/* === TOAST === */
.toast-container{position:fixed;top:20px;right:20px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{padding:14px 20px;border-radius:12px;font-size:.8125rem;font-weight:500;box-shadow:0 12px 40px rgba(0,0,0,.1);animation:slideUp .3s cubic-bezier(.16,1,.3,1);max-width:380px;backdrop-filter:blur(8px)}
.toast-success{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border:1px solid #a7f3d0}
.toast-error{background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#991b1b;border:1px solid #fecaca}
.toast-info{background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;border:1px solid #bfdbfe}

/* === PRODUCE INDICATORS === */
.reefer-badge{background:linear-gradient(135deg,#e0f2fe,#bae6fd);color:#0369a1;border:1px solid rgba(14,165,233,.2);animation:glow-pulse 3s infinite}
.temp-indicator{display:inline-flex;align-items:center;gap:4px;font-size:.6875rem;font-weight:600;padding:2px 8px;border-radius:6px}
.temp-cold{background:#e0f2fe;color:#0369a1}
.temp-frozen{background:#dbeafe;color:#1e40af}

/* === FUTURISTIC ACCENT LINES === */
.accent-line{height:2px;background:linear-gradient(90deg,transparent,#7c3aed,#06b6d4,transparent);border-radius:2px;margin:16px 0}
.section-glow{position:relative}
.section-glow::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,.2),transparent)}

/* === BUTTON STYLES === */
.btn-primary{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(124,58,237,.2)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(124,58,237,.3)}
.btn-secondary{background:white;color:#7c3aed;border:1px solid #ddd6fe;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-secondary:hover{background:#f5f3ff;border-color:#c4b5fd}
.btn-success{background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(16,185,129,.2)}
.btn-success:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(16,185,129,.3)}
</style>
</head>
<body class="bg-surface-50 text-surface-900 overflow-hidden">
<div id="app" class="flex h-screen">

<!-- SIDEBAR -->
<aside id="sidebar" class="sidebar-nav w-[272px] border-r border-surface-200 flex flex-col h-screen shrink-0 relative z-20">
  <!-- Logo + Brand -->
  <div class="px-5 py-5 border-b border-surface-100">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sgtx-500 to-sgtx-700 flex items-center justify-center shadow-glow-sm animate-glow-pulse">
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
        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-sgtx-100 to-sgtx-200 flex items-center justify-center">
          <i class="fas fa-user text-sgtx-600 text-[10px]"></i>
        </div>
        <div>
          <div id="user-name" class="text-xs font-medium text-surface-700">-</div>
          <div id="user-role" class="text-[10px] text-surface-400">-</div>
        </div>
      </div>
      <button onclick="logout()" class="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-surface-400 hover:text-red-500 transition" data-tooltip="Logout">
        <i class="fas fa-arrow-right-from-bracket text-xs"></i>
      </button>
    </div>
    <div class="nc-banner rounded-lg">
      <i class="fas fa-lock text-[8px] mr-1"></i>Non-custodial execution platform
    </div>
  </div>
</aside>

<!-- MAIN CONTENT -->
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
        <!-- Dual-Mode Toggle -->
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

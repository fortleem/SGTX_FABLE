// SGTX Platform v12 — Main Application Shell
// Design system: "Sovereign Obsidian & Gold" — private-institution grade UI
export function appHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform — Sovereign Governed Trade Execution</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
tailwind.config = {
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Sora','Inter','sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
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
      'card': '0 1px 2px rgba(26,20,16,.05), 0 4px 16px rgba(26,20,16,.05)',
      'card-hover': '0 12px 40px rgba(212,160,23,.1), 0 4px 12px rgba(26,20,16,.08)',
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
h1,h2,h3,.font-display { font-family: 'Sora','Inter',sans-serif; }
:root {
  --gold: #D4A017;
  --gold-bright: #F0C420;
  --gold-muted: #C9A84C;
  --gold-alpha: rgba(212,160,23,.12);
  --gold-border: rgba(201,168,76,.2);
  --obsidian: #0B0B0D;
  --obsidian-2: #121215;
  --sidebar-bg: #0B0B0D;
  --sidebar-border: rgba(201,168,76,.12);
  --surface-bg: #f7f5ef;
  --surface-card: #ffffff;
  --text-primary: #16120d;
  --text-secondary: #3d3528;
  --text-muted: #6b6050;
  --text-faint: #8a7f6e;
  --border-subtle: rgba(201,168,76,.14);
}

/* === Scrollbar — Gold hairline === */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#D4A017,#8a6a10);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:#F0C420}

/* === OBSIDIAN CHROME (sidebar + header share one material) === */
.sidebar-nav{
  background:
    radial-gradient(1200px 400px at -10% -10%, rgba(212,160,23,.07), transparent 60%),
    linear-gradient(180deg,#0D0D10 0%,#0A0A0C 100%);
  border-right:1px solid var(--sidebar-border);
  box-shadow: inset -1px 0 0 rgba(212,160,23,.04), 8px 0 32px rgba(0,0,0,.25);
}
.nav-item{position:relative;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:9px;font-size:.8rem;font-weight:500;color:rgba(255,255,255,.42);cursor:pointer;transition:all .18s ease}
.nav-item i{width:16px;text-align:center;transition:transform .18s ease}
.nav-item:hover{background:linear-gradient(90deg,rgba(212,160,23,.09),rgba(212,160,23,.02));color:rgba(255,255,255,.85)}
.nav-item:hover i{transform:translateX(1px);color:#D4A017}
.nav-item.active{background:linear-gradient(90deg,rgba(212,160,23,.14),rgba(212,160,23,.03));color:#F0C420;font-weight:600;border:1px solid rgba(212,160,23,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.03), 0 0 16px rgba(212,160,23,.06)}
.nav-item.active::before{content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:3px;height:18px;background:linear-gradient(180deg,#F0C420,#D4A017);border-radius:0 3px 3px 0;box-shadow:0 0 8px rgba(212,160,23,.6)}
.nav-section{font-size:.58rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(212,160,23,.38);padding:20px 14px 6px;user-select:none;font-family:'Sora',sans-serif}
.nav-section::after{content:'';display:block;margin-top:5px;height:1px;background:linear-gradient(90deg,rgba(212,160,23,.18),transparent)}

/* === CARDS — Ivory execution surface === */
.glass{background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border:1px solid var(--border-subtle);box-shadow:0 2px 12px rgba(26,20,16,.04)}
.glass-dark{background:rgba(11,11,13,.94);backdrop-filter:blur(18px);border:1px solid rgba(212,160,23,.14)}
.sgtx-card,.glass-card{
  background:linear-gradient(180deg,#ffffff 0%,#fffdf7 100%);
  border-radius:16px;border:1px solid var(--border-subtle);
  box-shadow:0 1px 2px rgba(26,20,16,.04), 0 6px 24px rgba(26,20,16,.04);
  transition:transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease, border-color .25s ease;
  position:relative;
}
.sgtx-card::before,.glass-card::before{
  content:'';position:absolute;inset:0 0 auto 0;height:1px;border-radius:16px 16px 0 0;
  background:linear-gradient(90deg,transparent 5%,rgba(212,160,23,.28) 50%,transparent 95%);
  opacity:0;transition:opacity .25s ease;pointer-events:none;
}
.sgtx-card:hover,.glass-card:hover{box-shadow:0 12px 44px rgba(212,160,23,.09),0 4px 12px rgba(26,20,16,.07);border-color:rgba(212,160,23,.3);transform:translateY(-2px)}
.sgtx-card:hover::before,.glass-card:hover::before{opacity:1}

/* === FORM INPUTS === */
input, select, textarea { color: var(--text-primary) !important; }
input[type="text"], input[type="number"], input[type="email"], input[type="password"],
input[type="date"], input[type="time"], select, textarea {
  background: #fcfbf7 !important;
  color: var(--text-primary) !important;
  border: 1px solid rgba(201,168,76,.22) !important;
  border-radius: 9px !important;
  font-size: 13px;
  padding: 8px 11px;
  transition: all .2s ease;
  box-shadow: inset 0 1px 2px rgba(26,20,16,.03);
}
input:focus, select:focus, textarea:focus {
  background: #ffffff !important;
  border-color: var(--gold) !important;
  box-shadow: 0 0 0 3px rgba(212,160,23,.12), 0 2px 8px rgba(212,160,23,.08) !important;
  outline: none !important;
}
select option { background: #fff !important; color: var(--text-primary) !important; }
input::placeholder, textarea::placeholder { color: #b0a898 !important; }
label { color: var(--text-secondary) !important; }
input:disabled, select:disabled { opacity:.45; cursor:not-allowed; }

/* === BADGES === */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:9999px;font-size:.6875rem;font-weight:700;letter-spacing:.03em}
.badge-success{background:linear-gradient(135deg,#e9fbf2,#d1fae5);color:#065f46;border:1px solid rgba(16,185,129,.22)}
.badge-warning{background:linear-gradient(135deg,#fdf6df,#fdedbb);color:#78350f;border:1px solid rgba(212,160,23,.28)}
.badge-info{background:linear-gradient(135deg,#eaf2ff,#dbeafe);color:#1e40af;border:1px solid rgba(59,130,246,.2)}
.badge-danger{background:linear-gradient(135deg,#feecec,#fee2e2);color:#991b1b;border:1px solid rgba(239,68,68,.2)}
.badge-gold{background:linear-gradient(135deg,rgba(212,160,23,.14),rgba(212,160,23,.05));color:#7a5a00;border:1px solid rgba(212,160,23,.3)}
.badge-neutral{background:linear-gradient(135deg,#f6f6f4,#ebebe7);color:#52525b;border:1px solid rgba(0,0,0,.05)}

/* === METRIC CARDS === */
.metric-card{
  background:linear-gradient(140deg,#ffffff 0%,#fffdf5 70%,#fdf6e2 100%);
  border-radius:16px;border:1px solid rgba(212,160,23,.16);padding:18px 22px;position:relative;overflow:hidden;
  box-shadow:0 1px 2px rgba(26,20,16,.04), 0 6px 20px rgba(26,20,16,.04);
  transition:transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease;
}
.metric-card:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(212,160,23,.12)}
.metric-card::after{content:'';position:absolute;top:-40%;right:-25%;width:70%;height:180%;background:radial-gradient(circle,rgba(212,160,23,.07) 0%,transparent 65%);pointer-events:none}
.metric-card::before{content:'';position:absolute;left:0;top:14%;bottom:14%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,rgba(212,160,23,.55),rgba(212,160,23,.08))}

/* === MODE TOGGLE === */
.mode-toggle{display:inline-flex;background:rgba(255,255,255,.07);border-radius:11px;padding:3px;gap:2px;border:1px solid rgba(212,160,23,.22)}
.mode-toggle button{padding:6px 15px;border-radius:8px;font-size:.75rem;font-weight:700;transition:all .25s;border:none;cursor:pointer;color:rgba(255,255,255,.45);background:transparent;font-family:'Sora',sans-serif}
.mode-toggle button.active{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0B0B0D;box-shadow:0 2px 12px rgba(212,160,23,.4)}

/* === TABLES === */
.sgtx-table{width:100%;font-size:.8125rem}
.sgtx-table thead{background:linear-gradient(135deg,#faf8f2,#f7f1de);border-bottom:1px solid rgba(212,160,23,.16)}
.sgtx-table th{padding:11px 14px;font-weight:700;color:#6b6050;text-align:left;font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;font-family:'Sora',sans-serif}
.sgtx-table td{padding:12px 14px;border-bottom:1px solid rgba(212,160,23,.06);color:var(--text-secondary)}
.sgtx-table tr{transition:background .15s ease}
.sgtx-table tr:hover td{background:#fdf8e7}

/* === URGENCY INDICATORS === */
.urgency-critical{border-left:3px solid #ef4444}.urgency-high{border-left:3px solid #D4A017}
.urgency-medium{border-left:3px solid #3b82f6}.urgency-low{border-left:3px solid #d5d0c5}

/* === GRADIENT BORDER (gold animated) === */
.gradient-border{position:relative;border-radius:16px;overflow:hidden}
.gradient-border::before{content:'';position:absolute;inset:-1px;background:linear-gradient(135deg,#D4A017,#C9A84C,#F0C420,#D4A017);background-size:300% 300%;animation:gradientMove 6s linear infinite;z-index:-1;border-radius:17px}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

/* === TAB SYSTEM === */
.tab-bar{display:flex;gap:0;border-bottom:1px solid rgba(212,160,23,.14);padding:0;background:linear-gradient(180deg,#fff,#fbf7ea)}
.tab-item{padding:11px 18px;font-size:.8rem;font-weight:600;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;font-family:'Sora',sans-serif}
.tab-item:hover{color:var(--text-secondary)}.tab-item.active{color:var(--gold);border-bottom-color:var(--gold)}

/* === SHIMMER LOADING === */
.shimmer{background:linear-gradient(90deg,#f6f1e2 25%,#fbf5e3 50%,#f6f1e2 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}

/* === PAGE TRANSITION === */
.page-transition{animation:slideUp .35s cubic-bezier(.16,1,.3,1)}

/* === NC BANNER === */
.nc-banner{background:linear-gradient(135deg,rgba(212,160,23,.07),rgba(212,160,23,.02));color:rgba(255,255,255,.32);font-size:.6rem;padding:7px 12px;text-align:center;letter-spacing:.03em;border:1px solid rgba(212,160,23,.1);border-radius:9px}

/* === TOOLTIP === */
[data-tooltip]{position:relative}
[data-tooltip]:hover::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#0B0B0D;color:rgba(255,255,255,.92);font-size:.6875rem;padding:5px 11px;border-radius:7px;white-space:nowrap;z-index:100;border:1px solid rgba(212,160,23,.28);box-shadow:0 8px 24px rgba(0,0,0,.35)}

/* === MODAL === */
.modal-overlay{position:fixed;inset:0;background:rgba(8,8,10,.6);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity .25s}
.modal-overlay.show{opacity:1;pointer-events:auto}
.modal-panel{background:linear-gradient(180deg,#ffffff,#fffdf7);border-radius:22px;padding:32px;max-width:820px;width:95%;max-height:88vh;overflow-y:auto;box-shadow:0 30px 90px rgba(0,0,0,.28),0 8px 32px rgba(212,160,23,.12);border:1px solid rgba(212,160,23,.18);transform:translateY(20px) scale(.985);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.modal-overlay.show .modal-panel{transform:translateY(0) scale(1)}

/* === TOAST === */
.toast-container{position:fixed;top:20px;right:20px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{padding:14px 20px;border-radius:13px;font-size:.8125rem;font-weight:600;box-shadow:0 16px 48px rgba(0,0,0,.16);animation:slideUp .3s cubic-bezier(.16,1,.3,1);max-width:380px;backdrop-filter:blur(10px)}
.toast-success{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border:1px solid #a7f3d0}
.toast-error{background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#991b1b;border:1px solid #fecaca}
.toast-info{background:linear-gradient(135deg,#fdf8e7,#faefc7);color:#78350f;border:1px solid rgba(212,160,23,.3)}

/* === BUTTONS === */
.btn-primary{
  position:relative;overflow:hidden;
  background:linear-gradient(135deg,#E3B120 0%,#C9971B 55%,#B8860B 100%);
  color:#0B0B0D;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:800;cursor:pointer;
  transition:all .2s;box-shadow:0 2px 10px rgba(212,160,23,.3), inset 0 1px 0 rgba(255,255,255,.35);
  font-family:'Sora',sans-serif;letter-spacing:.01em;
}
.btn-primary::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);transition:left .45s ease}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(212,160,23,.45), inset 0 1px 0 rgba(255,255,255,.35)}
.btn-primary:hover::after{left:130%}
.btn-primary:active{transform:translateY(0)}
.btn-secondary{background:#fff;color:#8a6a10;border:1px solid rgba(212,160,23,.32);padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Sora',sans-serif}
.btn-secondary:hover{background:#fdf8e7;border-color:rgba(212,160,23,.5);box-shadow:0 2px 12px rgba(212,160,23,.15)}
.btn-success{background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(16,185,129,.25)}
.btn-success:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(16,185,129,.35)}
.btn-danger{background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;padding:8px 16px;border-radius:10px;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s}
.btn-danger:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(239,68,68,.3)}
.btn-ghost{background:transparent;color:var(--text-muted);border:1px solid rgba(26,20,16,.1);padding:7px 14px;border-radius:9px;font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-ghost:hover{background:#fdf8e7;color:#8a6a10;border-color:rgba(212,160,23,.28)}

/* === AI BAND === */
.ai-band{position:absolute;pointer-events:none;opacity:.3;background:linear-gradient(90deg,transparent,rgba(212,160,23,.4),transparent)}

/* === RISK HEAT MAP CELLS === */
.risk-high{background:rgba(239,68,68,.08);color:#991b1b}
.risk-medium{background:rgba(245,158,11,.08);color:#78350f}
.risk-low{background:rgba(16,185,129,.08);color:#065f46}

/* === HEADER CHROME === */
.app-header{
  background:
    radial-gradient(900px 200px at 15% -60%, rgba(212,160,23,.1), transparent 60%),
    linear-gradient(180deg,#101014 0%,#0B0B0D 100%);
  border-bottom:1px solid rgba(212,160,23,.16);
  box-shadow:0 10px 36px rgba(0,0,0,.25);
}
.header-chip{background:rgba(255,255,255,.05);border:1px solid rgba(212,160,23,.16);border-radius:10px;transition:all .2s}
.header-chip:hover{background:rgba(212,160,23,.1);border-color:rgba(212,160,23,.32)}

/* === CONTENT SURFACE === */
.content-surface{
  background:
    radial-gradient(1200px 500px at 90% -20%, rgba(212,160,23,.05), transparent 55%),
    #f7f5ef;
}
</style>
</head>
<body class="bg-surface-50 text-surface-900 overflow-hidden" style="background:#0B0B0D">
<div id="app" class="flex h-screen">

<!-- OBSIDIAN SIDEBAR -->
<aside id="sidebar" class="sidebar-nav w-[264px] flex flex-col h-screen shrink-0 relative z-20">

  <!-- Logo + Brand -->
  <div class="px-4 py-4" style="border-bottom:1px solid rgba(212,160,23,.1)">
    <div class="flex items-center gap-3">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-9 w-auto drop-shadow-[0_0_10px_rgba(212,160,23,.35)]" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none;background:linear-gradient(135deg,#D4A017,#C9A84C)" class="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0">
        <span class="font-black text-black text-xs">SG</span>
      </div>
      <div>
        <div class="font-black text-[15px] tracking-tight font-display" style="background:linear-gradient(90deg,#F0C420,#C9A84C);-webkit-background-clip:text;background-clip:text;color:transparent">SGTX</div>
        <div class="text-[8.5px] font-bold tracking-[.22em]" style="color:rgba(255,255,255,.24)">SOVEREIGN TRADE OS</div>
      </div>
    </div>
  </div>

  <!-- Tenant Info + Portal Selector -->
  <div class="px-3 py-3" style="border-bottom:1px solid rgba(212,160,23,.1)">
    <div id="tenant-info" class="text-xs mb-2"></div>
    <select id="portal-select" onchange="switchPortal(this.value)"
      class="w-full rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
      style="background:rgba(255,255,255,.06) !important;border:1px solid rgba(212,160,23,.2) !important;color:rgba(255,255,255,.85) !important;box-shadow:none">
      <option value="dashboard">Platform Overview</option>
    </select>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5" id="nav-items"></nav>

  <!-- Sidebar Footer -->
  <div class="p-3" style="border-top:1px solid rgba(212,160,23,.1)">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:linear-gradient(135deg,rgba(212,160,23,.18),rgba(212,160,23,.06));border:1px solid rgba(212,160,23,.25)">
          <i class="fas fa-user text-[10px]" style="color:#F0C420"></i>
        </div>
        <div>
          <div id="user-name" class="text-xs font-bold" style="color:rgba(255,255,255,.85)">-</div>
          <div id="user-role" class="text-[10px] font-medium" style="color:rgba(212,160,23,.55)">-</div>
        </div>
      </div>
      <button onclick="logout()" class="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-500/15" style="color:rgba(255,255,255,.32)" data-tooltip="Logout">
        <i class="fas fa-arrow-right-from-bracket text-xs"></i>
      </button>
    </div>
    <div class="nc-banner">
      <i class="fas fa-lock mr-1" style="color:rgba(212,160,23,.6)"></i>Non-custodial execution platform
    </div>
  </div>
</aside>

<!-- MAIN CONTENT -->
<main class="flex-1 flex flex-col overflow-hidden">
  <!-- Obsidian Header Bar -->
  <header class="app-header sticky top-0 z-10 px-5 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div>
          <h1 id="page-title" class="text-base font-extrabold tracking-tight font-display" style="color:#F5EFDC">Dashboard</h1>
          <p id="page-subtitle" class="text-[11px] mt-0.5 font-medium" style="color:rgba(212,160,23,.6)"></p>
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
          <input type="text" placeholder="Search trades, GTIDs, USTNs..."
            class="rounded-lg pl-9 pr-4 py-2 text-xs w-56 focus:outline-none transition"
            style="background:rgba(255,255,255,.06) !important;border:1px solid rgba(212,160,23,.18) !important;color:rgba(255,255,255,.85) !important;font-size:12px;box-shadow:none">
          <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[11px]" style="color:rgba(212,160,23,.5)"></i>
        </div>

        <!-- Notifications -->
        <button class="header-chip relative w-9 h-9 flex items-center justify-center" data-tooltip="Notifications">
          <i class="fas fa-bell text-sm" style="color:rgba(255,255,255,.55)"></i>
          <span id="notif-count" class="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center hidden" style="background:#ef4444">0</span>
        </button>

        <!-- System Status -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.28)">
          <span class="w-1.5 h-1.5 rounded-full animate-pulse-slow" style="background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.8)"></span>
          <span class="text-[11px] font-bold" style="color:#4ade80">Operational</span>
        </div>

        <!-- New Action -->
        <button id="new-action-btn" onclick="showCreateModal()"
          class="btn-primary px-4 py-2 text-xs flex items-center gap-2">
          <i class="fas fa-plus text-[10px]"></i>New Trade
        </button>
      </div>
    </div>
  </header>

  <!-- Content Area (ivory execution surface) -->
  <div id="content" class="content-surface flex-1 overflow-y-auto p-5 page-transition"></div>
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

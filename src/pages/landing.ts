// SGTX Platform — Cinematic Entrance Landing Page (Gold/Black Brand)
// Blueprint Part 0 (Preamble), Part 12C portals, Part 30 TCN — logo reveal, trade-globe canvas, live stats
export function landingPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX — Sovereign Governed Trade Execution | The Operating System for Global Trade</title>
<meta name="description" content="SGTX: non-custodial, AI-governed, sovereign trade execution infrastructure. Zero counterparty risk. Cryptographic certainty.">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--gold:#D4A017;--gold2:#C9A84C;--gold3:#f5dc89;--bg:#070707}
*{font-family:'Inter',system-ui,sans-serif;box-sizing:border-box}
h1,h2,h3,.grotesk{font-family:'Space Grotesk','Inter',sans-serif}
body{background:var(--bg);color:#fff;margin:0;overflow-x:hidden}
::selection{background:rgba(212,160,23,.35)}
::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:rgba(212,160,23,.3);border-radius:4px}
#intro{position:fixed;inset:0;z-index:100;background:#050505;display:flex;align-items:center;justify-content:center;flex-direction:column;transition:opacity 1s ease,visibility 1s}
#intro.done{opacity:0;visibility:hidden;pointer-events:none}
#intro .ring{position:absolute;border:1px solid rgba(212,160,23,.15);border-radius:50%;animation:ringPulse 3s ease-out infinite}
@keyframes ringPulse{0%{transform:scale(.4);opacity:0}30%{opacity:.6}100%{transform:scale(1.6);opacity:0}}
#intro-logo{width:130px;height:auto;filter:drop-shadow(0 0 40px rgba(212,160,23,.5));animation:logoReveal 1.6s cubic-bezier(.16,1,.3,1) forwards;opacity:0}
@keyframes logoReveal{0%{opacity:0;transform:scale(.6) rotateY(90deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotateY(0)}}
#intro-title{margin-top:28px;font-size:15px;letter-spacing:.55em;text-transform:uppercase;color:rgba(212,160,23,.85);font-weight:600;opacity:0;animation:fadeIn 1s ease 1s forwards}
#intro-sub{margin-top:10px;font-size:11px;letter-spacing:.3em;color:rgba(255,255,255,.35);text-transform:uppercase;opacity:0;animation:fadeIn 1s ease 1.5s forwards}
#intro-bar{margin-top:34px;width:220px;height:2px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}
#intro-bar div{height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--gold3));animation:loadBar 2.2s ease .4s forwards}
@keyframes loadBar{to{width:100%}}
@keyframes fadeIn{to{opacity:1}}
#globe-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.85}
.glass{background:rgba(255,255,255,.035);backdrop-filter:blur(18px);border:1px solid rgba(201,168,76,.12)}
.glass-gold{background:rgba(212,160,23,.06);backdrop-filter:blur(18px);border:1px solid rgba(201,168,76,.22)}
.gradient-text{background:linear-gradient(120deg,#f5dc89 0%,#D4A017 45%,#fff2c4 70%,#C9A84C 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:goldFlow 5s linear infinite}
@keyframes goldFlow{to{background-position:200% center}}
.gold-text{color:var(--gold)}
.btn-gold{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D;font-weight:700;transition:all .25s;box-shadow:0 4px 24px rgba(212,160,23,.35)}
.btn-gold:hover{box-shadow:0 8px 40px rgba(212,160,23,.55);transform:translateY(-2px)}
.btn-ghost{border:1px solid rgba(201,168,76,.3);color:rgba(255,255,255,.8);transition:all .25s}
.btn-ghost:hover{background:rgba(212,160,23,.08);border-color:rgba(212,160,23,.5)}
.nav-link{color:rgba(255,255,255,.55);font-size:13px;font-weight:500;transition:color .2s}
.nav-link:hover{color:var(--gold)}
.section-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.3),transparent)}
.pillar-card{background:rgba(255,255,255,.025);border:1px solid rgba(201,168,76,.1);border-radius:16px;padding:22px;transition:all .35s}
.pillar-card:hover{border-color:rgba(212,160,23,.4);background:rgba(212,160,23,.05);transform:translateY(-4px);box-shadow:0 12px 40px rgba(212,160,23,.12)}
.stat-card{background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.14);border-radius:14px;padding:18px;text-align:center}
.reveal{opacity:0;transform:translateY(36px);transition:all .9s cubic-bezier(.16,1,.3,1)}
.reveal.vis{opacity:1;transform:translateY(0)}
.float{animation:float 6s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.ticker-wrap{overflow:hidden;border-top:1px solid rgba(201,168,76,.12);border-bottom:1px solid rgba(201,168,76,.12);background:rgba(212,160,23,.03)}
.ticker{display:flex;gap:48px;white-space:nowrap;animation:tick 40s linear infinite;padding:12px 0;width:max-content}
@keyframes tick{to{transform:translateX(-50%)}}
.ticker-item{font-size:12px;color:rgba(255,255,255,.55);display:flex;align-items:center;gap:8px}
.phase-dot{width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold3));box-shadow:0 0 16px rgba(212,160,23,.6)}
.grid-bg{background-image:linear-gradient(rgba(212,160,23,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.04) 1px,transparent 1px);background-size:48px 48px}
</style>
</head>
<body>

<section id="intro" aria-label="SGTX cinematic intro">
  <div class="ring" style="width:280px;height:280px;animation-delay:0s"></div>
  <div class="ring" style="width:280px;height:280px;animation-delay:1s"></div>
  <div class="ring" style="width:280px;height:280px;animation-delay:2s"></div>
  <img id="intro-logo" src="/static/brand/sgtx-icon-gold.png" alt="SGTX Logo">
  <div id="intro-title" class="grotesk">S G T X</div>
  <div id="intro-sub">Sovereign Governed Trade Execution</div>
  <div id="intro-bar"><div></div></div>
</section>

<nav id="main-nav" class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom:1px solid rgba(201,168,76,.12)">
  <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
    <a href="/" class="flex items-center gap-3">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-9 w-auto">
      <span class="grotesk font-bold tracking-[.25em] text-sm" style="color:rgba(255,255,255,.9)">SGTX</span>
    </a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#pillars" class="nav-link">Pillars</a>
      <a href="#world-trade" class="nav-link">World Trade</a>
      <a href="/portals" class="nav-link">Portals</a>
      <a href="#workflow" class="nav-link">Workflow</a>
      <a href="#fee-model" class="nav-link">FeeLock</a>
    </div>
    <div class="flex items-center gap-3">
      <a href="/portals" class="px-5 py-2 text-sm btn-ghost rounded-lg font-semibold">Portal Sign In</a>
      <a href="/register" class="px-5 py-2 btn-gold rounded-lg text-sm"><i class="fas fa-shield-halved mr-2"></i>Register</a>
    </div>
  </div>
</nav>

<header class="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg" id="hero-section">
  <canvas id="globe-canvas"></canvas>
  <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 50% 45%,transparent 0%,rgba(7,7,7,.55) 62%,#070707 100%)"></div>
  <div class="relative z-10 text-center px-6 max-w-5xl mx-auto pt-24 pb-16">
    <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-24 w-auto mx-auto mb-8 float" style="filter:drop-shadow(0 0 34px rgba(212,160,23,.45))">
    <div class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] mb-8 tracking-wider uppercase font-semibold" style="background:rgba(212,160,23,.07);border:1px solid rgba(212,160,23,.25);color:rgba(255,255,255,.75)">
      <span class="w-1.5 h-1.5 rounded-full" style="background:#22c55e;box-shadow:0 0 8px #22c55e"></span>
      Non-Custodial · AI-Governed · Zero Counterparty Risk
    </div>
    <h1 class="text-5xl md:text-8xl font-black leading-[1.02] mb-7 tracking-tight">
      The <span class="gradient-text">Operating System</span><br>for Global Trade
    </h1>
    <p class="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style="color:rgba(255,255,255,.55)">
      Not a marketplace. Not a bank. Not a broker.<br>
      SGTX is the provably neutral execution layer that makes every cross-border trade
      <span class="gold-text font-semibold">self-verifying, self-enforcing, and jurisdiction-aware</span>.
    </p>
    <div class="flex items-center justify-center gap-4 flex-wrap mb-14">
      <a href="/register" class="px-9 py-4 btn-gold rounded-xl text-sm font-bold"><i class="fas fa-rocket mr-2"></i>Enter the Platform</a>
      <a href="/portals" class="px-9 py-4 btn-ghost rounded-xl text-sm font-semibold"><i class="fas fa-door-open mr-2 gold-text"></i>Choose Your Portal</a>
      <a href="/api/v1/constitution" class="px-9 py-4 btn-ghost rounded-xl text-sm font-semibold"><i class="fas fa-scroll mr-2 gold-text"></i>Constitution</a>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto" id="stats-bar">
      ${[['stat-tenants','Sovereign Tenants'],['stat-trades','Trade Requests'],['stat-decisions','Governor Decisions'],['stat-jurisdictions','Jurisdictions']].map(([id,l])=>`
      <div class="stat-card"><div class="text-3xl font-black gold-text mb-1 grotesk" id="${id}">—</div><div class="text-[11px] uppercase tracking-wider" style="color:rgba(255,255,255,.4)">${l}</div></div>`).join('')}
    </div>
  </div>
  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-center">
    <div class="text-[10px] uppercase tracking-[.3em] mb-2" style="color:rgba(255,255,255,.3)">Scroll</div>
    <i class="fas fa-chevron-down gold-text animate-bounce text-sm"></i>
  </div>
</header>

<div class="ticker-wrap" id="world-trade">
  <div class="ticker" id="trade-ticker">
    <span class="ticker-item"><i class="fas fa-circle-notch fa-spin gold-text"></i> Loading world trade feed…</span>
  </div>
</div>

<main>
<section id="pillars" class="py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-14 reveal">
      <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">Constitutional Foundation</div>
      <h2 class="text-4xl md:text-5xl font-black">The Seven <span class="gradient-text">Unshakable Pillars</span></h2>
    </div>
    <div class="grid md:grid-cols-3 lg:grid-cols-4 gap-5">
      ${[
        ['fa-hand-holding-dollar','Non-Custodial Always','SGTX never holds funds, never takes title to goods. FeeLock protects both sides without custody.'],
        ['fa-robot','AI-Governed Execution','Every irreversible action passes the Governor: OPA policy gates + Ed25519 signatures + Loom audit.'],
        ['fa-scale-balanced','Provable Neutrality','No introductions, no recommendations, no brokering. All relationships arrive from outside.'],
        ['fa-globe','Jurisdiction-Aware','Dynamic compliance matrix per country pair. RIA agent resolves documentary requirements.'],
        ['fa-fingerprint','Cryptographic Certainty','USTN-anchored trades, signed documents, QR-verifiable offline. Tamper-evident by design.'],
        ['fa-lock','Sovereign Data','Tenant-isolated, PDPL-compliant, differential-privacy market intelligence.'],
        ['fa-network-wired','Open Corridor Network','Trade Corridor Network (TCN) links verified organisations across 190+ jurisdictions.'],
        ['fa-shield-halved','Zero Counterparty Risk','Contract-locked milestones and payment orchestration remove trust from the equation.'],
      ].map(([i,t,d])=>`
      <article class="pillar-card reveal">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.2)">
          <i class="fas ${i} gold-text"></i>
        </div>
        <h3 class="font-bold text-[15px] mb-2">${t}</h3>
        <p class="text-[13px] leading-relaxed" style="color:rgba(255,255,255,.45)">${d}</p>
      </article>`).join('')}
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section class="py-24 px-6" style="background:rgba(212,160,23,.02)">
  <div class="max-w-7xl mx-auto">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div class="reveal">
        <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">World Trade Intelligence</div>
        <h2 class="text-4xl md:text-5xl font-black mb-6">Powered by <span class="gradient-text">Global AI</span><br>Grounded in Live Trade</h2>
        <p class="text-[15px] leading-relaxed mb-8" style="color:rgba(255,255,255,.55)">
          SGTX fuses Gemini-class AI reasoning with live AIS vessel tracking, freight indices, and
          corridor analytics — so every quote, route, and contract decision is made with world-grade context.
        </p>
        <div class="space-y-4">
          ${[
            ['fa-satellite-dish','Live Vessel Tracking','AIS stream integration follows your USTN shipments across every chokepoint — Suez, Malacca, Panama.'],
            ['fa-chart-line','Freight & Commodity Indices','SCFI, BDI, Drewry WCI and commodity baskets feed the EXW fair-price engine.'],
            ['fa-brain','AI Corridor Briefings','Daily Gemini-generated trade intelligence on your active corridors — risks, rates, recommendations.'],
          ].map(([i,t,d])=>`
          <div class="flex gap-4 items-start">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.2)"><i class="fas ${i} gold-text text-sm"></i></div>
            <div><div class="font-bold text-sm mb-1">${t}</div><div class="text-[13px]" style="color:rgba(255,255,255,.45)">${d}</div></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="reveal glass rounded-2xl p-6" id="wt-panel">
        <div class="flex items-center justify-between mb-5">
          <div class="font-bold text-sm grotesk tracking-wider"><i class="fas fa-earth-americas gold-text mr-2"></i>GLOBAL CHOKEPOINT MONITOR</div>
          <span class="text-[10px] px-2 py-1 rounded-full font-bold" style="background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25)">LIVE</span>
        </div>
        <div id="chokepoints" class="space-y-2.5">
          <div class="text-xs" style="color:rgba(255,255,255,.35)"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading…</div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section id="portals-preview" class="py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-14 reveal">
      <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">One Platform · Every Stakeholder</div>
      <h2 class="text-4xl md:text-5xl font-black">Eleven <span class="gradient-text">Sovereign Portals</span></h2>
      <p class="mt-4 text-sm max-w-xl mx-auto" style="color:rgba(255,255,255,.45)">Each portal has its own entrance, its own authentication, and its own AI copilot — click any portal to enter.</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      ${[
        ['trader','fa-building','Importer / Buyer','Trade requests, quote comparison, landed-cost AI, contract signing'],
        ['trader','fa-industry','Exporter / Seller','EXW price lock, packing optimiser, logistics builder, QC booking'],
        ['trader','fa-right-left','Dual-Mode Trader','One identity, instant buy/sell context switching'],
        ['logistics','fa-truck-fast','Logistics (LSP)','RFQ inbox, dispatch planner, OR-Tools VRP, e-BL management'],
        ['shipping','fa-ship','Shipping Line','Booking requests, vessel schedules, container release API'],
        ['financier','fa-landmark','Financier','Full-disclosure financing, bidding, collateral LTV monitor'],
        ['qc','fa-microscope','Quality Control','AQL sampling, AR defect detection, AI-drafted reports'],
        ['laboratory','fa-flask','Laboratory','Sample intake, test protocols, certificate issuance'],
        ['logistics','fa-file-signature','Customs Broker','Document verification, declaration auto-generation, NAFEZA'],
        ['government','fa-building-columns','Government','Live trade monitor, permit issuance, compliance dashboards'],
        ['admin','fa-shield-halved','Platform Admin','Constitutional policies, Governor log, tenant lifecycle'],
        ['marketplace','fa-plug','Marketplace Partner','Attribution API, webhooks, revenue share, sandbox'],
      ].map(([pid,i,t,d])=>`
      <a href="/portal/${pid}/login" class="pillar-card reveal block" style="text-decoration:none;color:inherit">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.15)"><i class="fas ${i} text-sm gold-text"></i></div>
        <h3 class="font-bold text-sm mb-1.5">${t}</h3>
        <p class="text-xs leading-relaxed" style="color:rgba(255,255,255,.42)">${d}</p>
        <div class="mt-3 text-[10px] font-bold gold-text uppercase tracking-wider">Enter Portal <i class="fas fa-arrow-right ml-1"></i></div>
      </a>`).join('')}
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section id="workflow" class="py-24 px-6" style="background:rgba(212,160,23,.02)">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-14 reveal">
      <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">USTN-Anchored Lifecycle</div>
      <h2 class="text-4xl md:text-5xl font-black">Ten Phases. <span class="gradient-text">One Truth.</span></h2>
    </div>
    <div class="grid md:grid-cols-5 gap-4">
      ${[
        ['0','Foundation','Identity, KYB, GTID issuance, governance onboarding'],
        ['1','Trade Initiation','Structured product-aware request, AI specs, Governor prescreen'],
        ['2','Seller Quote','EXW lock, packing optimiser, logistics orchestration'],
        ['3','Contracting','Negotiation, passkey signing, FeeLock collection'],
        ['4','Trade Finance','Full-disclosure financing, competitive bidding'],
        ['5','Execution','Physical tracking, e-BL, multi-party document flow'],
        ['6','Settlement','Payment orchestration, government fee collection'],
        ['7-8','Distressed','Accelerated outreach, micro-contracts, quick offers'],
        ['9','Release','Container release authorisation, offline QR verification'],
        ['10','Disputes','AI mediation, reputation engine, resolution ledger'],
      ].map(([n,t,d])=>`
      <div class="reveal pillar-card !p-4">
        <div class="flex items-center gap-2.5 mb-2.5">
          <div class="phase-dot"></div>
          <span class="text-[10px] font-black gold-text grotesk">PHASE ${n}</span>
        </div>
        <h3 class="font-bold text-[13px] mb-1">${t}</h3>
        <p class="text-[11px] leading-relaxed" style="color:rgba(255,255,255,.4)">${d}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<div class="section-divider"></div>

<section id="fee-model" class="py-24 px-6">
  <div class="max-w-5xl mx-auto text-center">
    <div class="reveal">
      <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">Radically Simple Economics</div>
      <h2 class="text-4xl md:text-5xl font-black mb-6">One Fee. <span class="gradient-text">FeeLock Protected.</span></h2>
      <div class="inline-block glass-gold rounded-3xl px-14 py-10 my-8">
        <div class="text-7xl font-black gradient-text grotesk">1.5%</div>
        <div class="text-sm mt-3 uppercase tracking-widest font-semibold" style="color:rgba(255,255,255,.55)">of contract value — that's all</div>
      </div>
      <div class="grid md:grid-cols-3 gap-4 mt-6">
        ${[
          ['fa-ban','No Subscriptions','No monthly fees, no seat licences, no hidden tiers'],
          ['fa-hand-holding-dollar','Non-Custodial FeeLock','Fee locked cryptographically at contract — released only on execution'],
          ['fa-arrow-trend-down','Success-Aligned','SGTX earns only when your trade executes. Failed trade = no fee'],
        ].map(([i,t,d])=>`
        <div class="glass rounded-xl p-5 text-left">
          <i class="fas ${i} gold-text mb-3"></i>
          <div class="font-bold text-sm mb-1.5">${t}</div>
          <div class="text-xs" style="color:rgba(255,255,255,.45)">${d}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="py-28 px-6 text-center relative overflow-hidden">
  <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 50% 100%,rgba(212,160,23,.1) 0%,transparent 60%)"></div>
  <div class="relative z-10 reveal">
    <img src="/static/brand/sgtx-banner-dark.png" alt="SGTX — Sovereign Governed Trade Execution" class="h-24 md:h-32 w-auto mx-auto mb-10 rounded-2xl" style="box-shadow:0 20px 80px rgba(212,160,23,.15)" onerror="this.style.display='none'">
    <h2 class="text-4xl md:text-6xl font-black mb-6">Trade with <span class="gradient-text">Sovereign Certainty</span></h2>
    <p class="text-base max-w-xl mx-auto mb-10" style="color:rgba(255,255,255,.5)">Join the network of verified organisations executing cross-border trade with cryptographic proof and zero counterparty risk.</p>
    <div class="flex items-center justify-center gap-4 flex-wrap">
      <a href="/register" class="px-10 py-4 btn-gold rounded-xl text-sm font-bold"><i class="fas fa-rocket mr-2"></i>Register Your Organization</a>
      <a href="/portals" class="px-10 py-4 btn-ghost rounded-xl text-sm font-semibold">Sign In to Your Portal</a>
    </div>
  </div>
</section>
</main>

<footer class="py-12 px-6" style="border-top:1px solid rgba(201,168,76,.12)">
  <div class="max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-8 w-auto">
        <div>
          <div class="grotesk font-bold text-sm tracking-[.2em]">SGTX</div>
          <div class="text-[10px]" style="color:rgba(255,255,255,.35)">Sovereign Governed Trade Execution</div>
        </div>
      </div>
      <div class="flex items-center gap-6 text-xs" style="color:rgba(255,255,255,.4)">
        <a href="/api/v1/constitution" class="hover:text-white transition">Constitution</a>
        <a href="/api/health" class="hover:text-white transition">Platform Status</a>
        <a href="/portals" class="hover:text-white transition">Portals</a>
        <a href="/register" class="hover:text-white transition">Register</a>
      </div>
    </div>
    <div class="mt-8 pt-6 text-center text-[11px]" style="border-top:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.25)">
      <i class="fas fa-balance-scale mr-1.5" style="color:rgba(212,160,23,.5)"></i>
      SGTX is non-custodial. It never holds funds, never takes title to goods, never brokers introductions, and never recommends counterparties. No irreversible action without Governor approval.
    </div>
  </div>
</footer>

<script>
(function(){
  var intro = document.getElementById('intro');
  var seen = sessionStorage.getItem('sgtx_intro');
  if (seen) { intro.style.display='none'; return; }
  setTimeout(function(){ intro.classList.add('done'); sessionStorage.setItem('sgtx_intro','1'); }, 3000);
  intro.addEventListener('click', function(){ intro.classList.add('done'); sessionStorage.setItem('sgtx_intro','1'); });
})();

(function(){
  var cv = document.getElementById('globe-canvas'); if(!cv) return;
  var ctx = cv.getContext('2d');
  var W, H, R, cx, cy;
  function resize(){ W=cv.width=cv.offsetWidth*devicePixelRatio; H=cv.height=cv.offsetHeight*devicePixelRatio; cx=W/2; cy=H*0.46; R=Math.min(W,H)*0.34; }
  resize(); addEventListener('resize', resize);
  var hubs=[[30.0,31.2],[52.5,13.4],[1.35,103.8],[25.2,55.3],[31.2,121.5],[51.9,4.5],[40.7,-74.0],[-23.5,-46.6],[35.7,139.7],[19.1,72.9],[6.5,3.4],[33.6,-7.6],[41.0,29.0],[10.8,106.7],[-33.9,18.4]];
  var arcs=[]; for(var i=0;i<14;i++){ arcs.push({a:hubs[Math.floor(Math.random()*hubs.length)], b:hubs[Math.floor(Math.random()*hubs.length)], t:Math.random(), sp:0.0015+Math.random()*0.003}); }
  var rot=0;
  function proj(lat,lon,rotDeg){
    var la=lat*Math.PI/180, lo=(lon+rotDeg)*Math.PI/180;
    var x=Math.cos(la)*Math.sin(lo), y=Math.sin(la), z=Math.cos(la)*Math.cos(lo);
    return {x:cx+x*R, y:cy-y*R*0.92, z:z};
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    rot+=0.06;
    ctx.strokeStyle='rgba(212,160,23,0.10)'; ctx.lineWidth=1;
    for(var la=-60; la<=60; la+=30){
      ctx.beginPath();
      for(var lo=0; lo<=360; lo+=6){ var p=proj(la,lo,rot); if(p.z<-0.15) continue; if(lo===0){ctx.moveTo(p.x,p.y);} else {ctx.lineTo(p.x,p.y);} }
      ctx.stroke();
    }
    for(var lo2=0; lo2<360; lo2+=30){
      ctx.beginPath(); var started=false;
      for(var la2=-85; la2<=85; la2+=5){ var p2=proj(la2,lo2,rot); if(p2.z<-0.15){started=false;continue;} if(!started){ctx.moveTo(p2.x,p2.y);started=true;} else {ctx.lineTo(p2.x,p2.y);} }
      ctx.stroke();
    }
    hubs.forEach(function(h){ var p=proj(h[0],h[1],rot); if(p.z<0) return;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.4*devicePixelRatio,0,7); ctx.fillStyle='rgba(212,160,23,'+(0.35+p.z*0.55)+')'; ctx.fill();
    });
    arcs.forEach(function(a){
      var p1=proj(a.a[0],a.a[1],rot), p2=proj(a.b[0],a.b[1],rot);
      if(p1.z<0&&p2.z<0) return;
      var mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2 - Math.abs(p1.x-p2.x)*0.22;
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.quadraticCurveTo(mx,my,p2.x,p2.y);
      ctx.strokeStyle='rgba(212,160,23,0.12)'; ctx.stroke();
      a.t+=a.sp; if(a.t>1){a.t=0; a.a=hubs[Math.floor(Math.random()*hubs.length)]; a.b=hubs[Math.floor(Math.random()*hubs.length)];}
      var t=a.t, it=1-t;
      var px=it*it*p1.x+2*it*t*mx+t*t*p2.x, py=it*it*p1.y+2*it*t*my+t*t*p2.y;
      ctx.beginPath(); ctx.arc(px,py,2.2*devicePixelRatio,0,7); ctx.fillStyle='rgba(245,220,137,0.9)'; ctx.shadowColor='#D4A017'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

(function(){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target);} }); },{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
})();

(function(){
  fetch('/api/v1/public/stats').then(function(r){return r.json();}).then(function(j){
    var d=j.data||j;
    animate('stat-tenants', d.tenants||15); animate('stat-trades', d.trades||d.trade_requests||24);
    animate('stat-decisions', d.governor_decisions||d.decisions||140); animate('stat-jurisdictions', d.jurisdictions||190);
  }).catch(function(){ animate('stat-tenants',15); animate('stat-trades',24); animate('stat-decisions',140); animate('stat-jurisdictions',190); });
  function animate(id, target){ var el=document.getElementById(id); if(!el) return; var cur=0, step=Math.max(1,Math.ceil(target/50));
    var iv=setInterval(function(){ cur+=step; if(cur>=target){cur=target; clearInterval(iv);} el.textContent=cur.toLocaleString(); },28); }
})();

(function(){
  fetch('/api/v1/world-trade/indices').then(function(r){return r.json();}).then(function(j){
    var idx=(j.data&&j.data.indices)||[];
    var items = idx.map(function(x){
      var up = x.change_pct>=0;
      return '<span class="ticker-item"><b class="gold-text">'+x.code+'</b> '+x.value.toLocaleString()+' <span style="color:'+(up?'#22c55e':'#ef4444')+'">'+(up?'▲':'▼')+' '+Math.abs(x.change_pct)+'%</span></span>';
    });
    var routes=(j.data&&j.data.freight_routes)||[];
    routes.forEach(function(r2){ items.push('<span class="ticker-item"><i class="fas fa-ship gold-text"></i>'+r2.route+' <b>$'+r2.usd_40ft.toLocaleString()+'</b>/40ft · '+r2.transit_days+'d</span>'); });
    var html = items.join('');
    document.getElementById('trade-ticker').innerHTML = html + html;
  }).catch(function(){ document.getElementById('trade-ticker').innerHTML='<span class="ticker-item">World trade feed offline</span>'; });

  fetch('/api/v1/world-trade/overview').then(function(r){return r.json();}).then(function(j){
    var cps=(j.data&&j.data.chokepoints)||[];
    document.getElementById('chokepoints').innerHTML = cps.map(function(cp){
      var ok = cp.status==='OPERATIONAL';
      return '<div class="flex items-center justify-between rounded-lg px-3.5 py-3" style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.08)">'+
        '<div class="flex items-center gap-3"><i class="fas fa-location-dot gold-text text-xs"></i><div><div class="text-[13px] font-semibold">'+cp.name+'</div><div class="text-[10px]" style="color:rgba(255,255,255,.35)">'+cp.region+' · '+cp.share_pct+'% of global trade</div></div></div>'+
        '<span class="text-[9px] px-2 py-1 rounded-full font-bold" style="background:'+(ok?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)')+';color:'+(ok?'#22c55e':'#f59e0b')+'">'+cp.status.replace('_',' ')+'</span></div>';
    }).join('');
  }).catch(function(){});
})();

addEventListener('scroll', function(){
  var nav=document.getElementById('main-nav');
  nav.style.background = scrollY>40 ? 'rgba(7,7,7,.85)' : '';
});
</script>
</body>
</html>`;
}

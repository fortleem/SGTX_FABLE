// SGTX Platform v6.1 — Landing Page
export function landingPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SGTX Platform — Sovereign Global Trade Execution</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{sgtx:{50:'#f0f0ff',100:'#e0e0ff',200:'#c4c0ff',300:'#a49aff',400:'#7c6eff',500:'#4E3FE8',600:'#3d2fc0',700:'#2d2290',800:'#1e1660',900:'#0f0b30'}}}}}</script>
<style>
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.float{animation:float 6s ease-in-out infinite}
.fade-up{animation:fadeInUp .8s ease-out forwards;opacity:0}
.fade-up-1{animation-delay:.1s}.fade-up-2{animation-delay:.3s}.fade-up-3{animation-delay:.5s}.fade-up-4{animation-delay:.7s}
.glass{background:rgba(255,255,255,.08);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12)}
.gradient-text{background:linear-gradient(135deg,#7c6eff,#4E3FE8,#a49aff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
</style>
</head>
<body class="bg-sgtx-900 text-white min-h-screen">

<!-- NAV -->
<nav class="fixed top-0 left-0 right-0 z-50 glass">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-sgtx-500 rounded-xl flex items-center justify-center"><i class="fas fa-shield-halved text-white text-lg"></i></div>
      <div><span class="font-bold text-xl">SGTX</span><span class="text-sgtx-300 text-xs ml-2">v6.1</span></div>
    </div>
    <div class="hidden md:flex items-center gap-8 text-sm text-sgtx-200">
      <a href="#features" class="hover:text-white transition">Features</a>
      <a href="#phases" class="hover:text-white transition">Workflow</a>
      <a href="#governance" class="hover:text-white transition">Governance</a>
      <a href="#coverage" class="hover:text-white transition">Coverage</a>
    </div>
    <div class="flex items-center gap-3">
      <a href="/login" class="px-5 py-2 text-sm text-sgtx-200 hover:text-white transition">Login</a>
      <a href="/register" class="px-5 py-2 bg-sgtx-500 text-white rounded-lg text-sm font-medium hover:bg-sgtx-400 transition">Register Organization</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="pt-32 pb-20 px-6 text-center relative overflow-hidden">
  <div class="absolute inset-0 opacity-20" style="background:radial-gradient(circle at 50% 30%,#4E3FE8 0%,transparent 50%)"></div>
  <div class="max-w-4xl mx-auto relative z-10">
    <div class="fade-up fade-up-1 inline-block px-4 py-1 glass rounded-full text-xs text-sgtx-200 mb-6">
      <i class="fas fa-lock mr-1"></i> Non-Custodial &middot; AI-Governed &middot; 27 Jurisdictions &middot; 84 Governance Gates
    </div>
    <h1 class="fade-up fade-up-2 text-5xl md:text-7xl font-bold leading-tight mb-6">
      Sovereign <span class="gradient-text">Trade Execution</span> Infrastructure
    </h1>
    <p class="fade-up fade-up-3 text-lg text-sgtx-200 max-w-2xl mx-auto mb-8">
      Execute cross-border trade with cryptographic certainty, AI-assisted optimization, and zero counterparty risk. Not a marketplace — an execution engine.
    </p>
    <div class="fade-up fade-up-4 flex items-center justify-center gap-4">
      <a href="/register" class="px-8 py-3 bg-sgtx-500 rounded-lg text-white font-semibold hover:bg-sgtx-400 transition shadow-lg shadow-sgtx-500/30">
        <i class="fas fa-rocket mr-2"></i>Start Trading
      </a>
      <a href="/app" class="px-8 py-3 glass rounded-lg text-sgtx-200 hover:text-white transition">
        <i class="fas fa-eye mr-2"></i>View Dashboard
      </a>
    </div>
  </div>
  <!-- Stats Bar -->
  <div class="max-w-5xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-bar"></div>
</section>

<!-- FEATURES -->
<section id="features" class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-4">Platform Capabilities</h2>
    <p class="text-center text-sgtx-300 mb-12 max-w-2xl mx-auto">35 microservices, 70+ database tables, AI-driven commission engine, and complete governance overlay</p>
    <div class="grid md:grid-cols-3 gap-6">
      ${featureCard('fas fa-gavel','Governor Service','Every irreversible action gated by OPA + WasmEdge + Ed25519 signatures. Loom hash chain for deterministic replay.')}
      ${featureCard('fas fa-brain','AI Intelligence Layer','200+ credit signals, XGBoost scoring, 7 AI layers from data ingestion to governance. Authority levels A0-A5.')}
      ${featureCard('fas fa-coins','Commission AI Engine','Dynamic rate: clamp(0.1%, 2.5%, base + country + seasonality ± geopolitics - discount + perishability).')}
      ${featureCard('fas fa-ship','USTN Tracking','Unique Shipment Tracking Numbers with GS1-128/QR barcodes per pallet. Multi-modal route intelligence.')}
      ${featureCard('fas fa-shield-halved','Jurisdiction Engine','27 countries, 6 auto-blocked (sanctions), 5 high-risk (bank-only). Strictest rule always applies.')}
      ${featureCard('fas fa-money-bill-wave','Payment Orchestrator','8 PSP aggregators (Stripe, Adyen, Fawry, Payoneer, Flutterwave, RazorpayX, M-Pesa, Mercury). LightGBM routing.')}
      ${featureCard('fas fa-file-contract','Contract Genesis','Clause Forge, Risk Oracle, Jurisdiction Harmonizer, Multi-Shipment Planner, Smart Clause Agent pipeline.')}
      ${featureCard('fas fa-chart-line','DeFi Integration','Aave V3, Compound, Uniswap V3. Tokenized invoices (ERC-3525). Stablecoin health monitoring.')}
      ${featureCard('fas fa-leaf','ESG & Carbon','IMO EEXI 2023 methodology. LightGBM regression. Green route alternatives with carbon offset tracking.')}
    </div>
  </div>
</section>

<!-- PHASES -->
<section id="phases" class="py-20 px-6 bg-sgtx-800/30">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-4">10-Phase Trade Workflow</h2>
    <p class="text-center text-sgtx-300 mb-12">End-to-end with 84 governance gates. Every step gated, logged, and cryptographically signed.</p>
    <div class="grid md:grid-cols-5 gap-4">
      ${phaseCard(1,'Trade Initiation','GTID entry, AI trust analysis, multi-commodity specs, Governor pre-screen',8)}
      ${phaseCard(2,'Quote & Logistics','EXW price lock, Living Quotes, multi-agent logistics mesh, route optimization',9)}
      ${phaseCard(3,'Contracting','Commission allocation, payment gateways, contract genesis pipeline, signatures',10)}
      ${phaseCard(4,'Trade Finance','Post-contract financing, blind bidding, 200+ credit signals, DeFi options',10)}
      ${phaseCard(5,'Physical Execution','USTN tracking, barcodes, sensor fusion, disruption prediction, milestones',8)}
      ${phaseCard(6,'Settlement','Multi-rail verification, netting circles, FX arbitrage, CommissionLock release',10)}
      ${phaseCard(7,'Distressed Cargo','48h demurrage alert, AI pricing, alternative buyer matching, jurisdiction matrix',9)}
      ${phaseCard(8,'Buyer Search','Capability broadcast, AI buyer matching, connection protocol, mutual opt-in',6)}
      ${phaseCard(9,'Payment Orchestrator','PSP routing, fee gross-up, commission responsibility engine, CBDC ready',8)}
      ${phaseCard(10,'Dispute Resolution','AI mediation, ICC/DIFC-LCIA escalation, CommissionLock frozen',6)}
    </div>
  </div>
</section>

<!-- GOVERNANCE -->
<section id="governance" class="py-20 px-6">
  <div class="max-w-5xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4">Constitutional Governance</h2>
    <p class="text-sgtx-300 mb-12 max-w-2xl mx-auto">Four immutable principles enforced by WASM-compiled constitutional rules at every microservice call.</p>
    <div class="grid md:grid-cols-2 gap-6 text-left">
      <div class="glass rounded-xl p-6">
        <div class="text-sgtx-400 font-bold text-sm mb-2">G-1: Execution Always Gated</div>
        <p class="text-sgtx-200 text-sm">Temporal workflow + WASM gate. No irreversible action without Governor approval. Stored in governor_decisions with Ed25519 signature.</p>
      </div>
      <div class="glass rounded-xl p-6">
        <div class="text-sgtx-400 font-bold text-sm mb-2">G-2: AI May Block, Never Force</div>
        <p class="text-sgtx-200 text-sm">AI returns structured decision objects only; never executes autonomously. Authority levels A0 (observe) to A5 (forbidden).</p>
      </div>
      <div class="glass rounded-xl p-6">
        <div class="text-sgtx-400 font-bold text-sm mb-2">G-3: Non-Custodial Structural</div>
        <p class="text-sgtx-200 text-sm">No fund tables; only CommissionLock + instruction generator. SGTX never holds buyer or exporter funds.</p>
      </div>
      <div class="glass rounded-xl p-6">
        <div class="text-sgtx-400 font-bold text-sm mb-2">G-4: Every Action Attributable</div>
        <p class="text-sgtx-200 text-sm">Governor decisions with cryptographic signature. Event sourcing + Loom hash chain audit trails. Tamper-evident.</p>
      </div>
    </div>
  </div>
</section>

<!-- COVERAGE -->
<section id="coverage" class="py-20 px-6 bg-sgtx-800/30">
  <div class="max-w-5xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4">Global Coverage</h2>
    <p class="text-sgtx-300 mb-8">27 jurisdictions with dynamic settlement matrix updated from 50+ regulatory sources.</p>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
      ${['US','DE','AE','CN','GB','EG','IN','BR','NG','KE','SA','SG','ZA','TR','ID','VN','JP','AU','CH','HK','PH','MY','TH','MX','CL','CO','PE'].map(c =>
        `<div class="glass rounded-lg p-3 text-center"><div class="text-xl font-bold">${c}</div></div>`
      ).join('')}
    </div>
    <div class="mt-8 flex justify-center gap-6 text-sm">
      <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-green-400"></span> Full (15)</span>
      <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-yellow-400"></span> Standard (7)</span>
      <span class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-400"></span> Blocked (6)</span>
    </div>
  </div>
</section>

<!-- LEGAL -->
<section class="py-12 px-6 border-t border-sgtx-700">
  <div class="max-w-5xl mx-auto text-center">
    <p class="text-xs text-sgtx-400 mb-4"><i class="fas fa-balance-scale mr-1"></i> <b>SGTX Platform Inc.</b>, New Jersey, USA. Non-custodial platform. We do NOT hold funds, process payments, or act as a financial institution. Users bear 100% compliance responsibility. Max liability = commissions paid in last 12 months.</p>
    <div class="flex justify-center gap-6 text-xs text-sgtx-500">
      <span>AML/KYC Compliant</span><span>&middot;</span>
      <span>GDPR Data Residency</span><span>&middot;</span>
      <span>Incoterms 2020</span><span>&middot;</span>
      <span>UCP 600</span><span>&middot;</span>
      <span>FATF Travel Rule</span>
    </div>
    <p class="text-xs text-sgtx-600 mt-6">&copy; 2026 SGTX Platform Inc. All rights reserved. Blueprint v6.1</p>
  </div>
</section>

<script>
// Load stats
fetch('/api/v1/stats').then(r=>r.json()).then(d=>{
  const s=d.data;
  document.getElementById('stats-bar').innerHTML=[
    ['Tenants',s.tenants,'fas fa-building'],['Trades',s.trade_requests,'fas fa-handshake'],
    ['Gov. Decisions',s.governor_decisions,'fas fa-gavel'],['Jurisdictions',s.jurisdictions_covered,'fas fa-globe']
  ].map(([l,v,i])=>'<div class="glass rounded-xl p-4 text-center"><i class="'+i+' text-sgtx-400 text-lg mb-2"></i><div class="text-2xl font-bold">'+v+'</div><div class="text-xs text-sgtx-300">'+l+'</div></div>').join('');
}).catch(()=>{});
</script>
</body>
</html>`;
}

function featureCard(icon: string, title: string, desc: string): string {
  return `<div class="glass rounded-xl p-6 hover:bg-white/5 transition">
    <i class="${icon} text-sgtx-400 text-xl mb-3"></i>
    <h3 class="font-bold mb-2">${title}</h3>
    <p class="text-sgtx-300 text-sm">${desc}</p>
  </div>`;
}

function phaseCard(num: number, title: string, desc: string, gates: number): string {
  return `<div class="glass rounded-xl p-4 text-center hover:bg-white/5 transition">
    <div class="w-8 h-8 bg-sgtx-500/30 text-sgtx-400 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">${num}</div>
    <h4 class="font-bold text-sm mb-1">${title}</h4>
    <p class="text-sgtx-400 text-[10px] mb-2">${desc}</p>
    <div class="text-[10px] text-sgtx-500">${gates} gates</div>
  </div>`;
}

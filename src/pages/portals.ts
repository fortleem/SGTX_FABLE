// SGTX Platform — Individual Portal Entrances & Per-Portal Authentication
// Blueprint Part 12C: each portal is a sovereign entrance with its own login screen,
// its own branding accent, and tenant-type validation at authentication time.

export interface PortalDef {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  tenantTypes: string[];
  blueprint: string;
  features: string[];
  demo?: { email: string; password: string; org: string };
}

export const PORTALS: PortalDef[] = [
  {
    id: 'trader', name: 'Trader Portal', tagline: 'Importers · Exporters · Dual-Mode',
    icon: 'fa-right-left', accent: '#D4A017',
    tenantTypes: ['TRD', 'CORPORATE'],
    blueprint: 'Part 12C.1 / 12C.2',
    features: ['New Trade Request with AI product specs', 'Quote Review & Negotiation', 'EXW Price Lock + market chart', 'Contract Signing (passkey)', 'Customs Readiness', 'Cash Position & Financing'],
    demo: { email: 'ahmed@nilefoods.com', password: 'demo123', org: 'Nile Foods Export Co. (Seller)' },
  },
  {
    id: 'logistics', name: 'Logistics Portal', tagline: 'LSPs · Freight Forwarders · Customs Brokers',
    icon: 'fa-truck-fast', accent: '#22d3ee',
    tenantTypes: ['LSP', 'CBR', 'LOGISTICS'],
    blueprint: 'Part 12C.3 / 9',
    features: ['RFQ Inbox with match scoring', 'Dispatch Planner (OR-Tools VRP)', 'Document Verification Queue', 'e-BL Management', 'Provider Performance Dashboard'],
    demo: { email: 'yasser@nilelogistics.com', password: 'demo123', org: 'Nile Logistics Solutions' },
  },
  {
    id: 'shipping', name: 'Shipping Line Portal', tagline: 'Ocean Carriers · Vessel Operators',
    icon: 'fa-ship', accent: '#38bdf8',
    tenantTypes: ['SHIP', 'LOGISTICS'],
    blueprint: 'Part 12C.4 / 8',
    features: ['Booking Requests & Confirmations', 'Vessel Schedules & AIS Tracking', 'Container Release Authorisation API', 'Demurrage Management'],
    demo: { email: 'captain@medshipping.com', password: 'demo123', org: 'Med Shipping Lines' },
  },
  {
    id: 'financier', name: 'Financier Portal', tagline: 'Banks · Private Capital · DeFi',
    icon: 'fa-landmark', accent: '#fbbf24',
    tenantTypes: ['FIN', 'FINANCIAL'],
    blueprint: 'Part 12C.8 / Phase 4',
    features: ['Full-Disclosure Financing Opportunities', 'Competitive Bidding & Co-Financing', 'Collateral LTV Monitor', 'Secondary Market', 'Settlement Tracking'],
    demo: { email: 'fatma@nbe.com.eg', password: 'demo123', org: 'National Bank of Egypt Trade Finance' },
  },
  {
    id: 'qc', name: 'QC / Inspection Portal', tagline: 'Quality Control · Inspection Agencies',
    icon: 'fa-microscope', accent: '#c084fc',
    tenantTypes: ['QC', 'QUALITY_CONTROL'],
    blueprint: 'Part 12C.6 / 6.2.4',
    features: ['Inspection Job Lifecycle (5 steps)', 'AQL Sampling Calculator', 'AR Defect Detection (HF ViT)', 'AI Report Generation PASS/FAIL/CONDITIONAL', 'Schedule Calendar'],
    demo: { email: 'noha@qualitycheck.com', password: 'demo123', org: 'QualityCheck Egypt' },
  },
  {
    id: 'laboratory', name: 'Laboratory Portal', tagline: 'Testing Labs · Certification Bodies',
    icon: 'fa-flask', accent: '#a78bfa',
    tenantTypes: ['LAB', 'LABORATORY'],
    blueprint: 'Part 9 (LAB) / 12C.2 tab 7',
    features: ['Sample Intake & Chain of Custody', 'Test Protocol Management', 'Certificate Issuance (crypto-sealed)', 'Serviceable Commodities Settings'],
    demo: { email: 'dr.samir@cairolabs.com', password: 'demo123', org: 'Cairo Labs International' },
  },
  {
    id: 'government', name: 'Government Portal', tagline: 'Customs · Ministries · Regulators',
    icon: 'fa-building-columns', accent: '#94a3b8',
    tenantTypes: ['GOV', 'REGULATORY', 'GOVERNMENT'],
    blueprint: 'Part 12C.10 / 7',
    features: ['Live Trade Monitor (anonymised)', 'Permit Issuance', 'Compliance Monitor', 'Multi-Agency Workflow', 'Customs API Connectors (NAFEZA/CargoX)'],
    demo: { email: 'general.ibrahim@customs.gov.eg', password: 'demo123', org: 'Egyptian Customs Authority' },
  },
  {
    id: 'admin', name: 'Platform Admin Portal', tagline: 'SGTX Governance Authority',
    icon: 'fa-shield-halved', accent: '#fb7185',
    tenantTypes: ['*'],
    blueprint: 'Part 12C.11 / 1',
    features: ['Constitutional Policies', 'Governor Decision Log', 'Jurisdiction Matrix', 'Tenant Lifecycle & KYB Review', 'PSP Manager', 'Incident Response'],
    demo: { email: 'admin@sgtx.io', password: 'admin123', org: 'SGTX Platform Governance Authority' },
  },
  {
    id: 'marketplace', name: 'Marketplace Partner Portal', tagline: 'API Partners · Referral Networks',
    icon: 'fa-plug', accent: '#34d399',
    tenantTypes: ['MKT', 'MARKETPLACE_PARTNER', 'TRD'],
    blueprint: 'Part 12C.12',
    features: ['API Key Management', 'Lead Attribution & Dispute Window', 'Webhooks', 'Revenue Share Dashboard', 'Sandbox Environment'],
  },
];

export function getPortal(id: string): PortalDef | undefined {
  return PORTALS.find(p => p.id === id);
}

const sharedHead = (title: string, accent: string) => `
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — SGTX</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--gold:#D4A017;--accent:${accent}}
*{font-family:'Inter',system-ui,sans-serif;box-sizing:border-box}
h1,h2,h3,.grotesk{font-family:'Space Grotesk','Inter',sans-serif}
body{background:#070707;color:#fff;margin:0;min-height:100vh}
::selection{background:rgba(212,160,23,.35)}
.glass{background:rgba(255,255,255,.035);backdrop-filter:blur(18px);border:1px solid rgba(201,168,76,.12)}
.gold-text{color:var(--gold)}
.btn-gold{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D;font-weight:700;transition:all .25s;box-shadow:0 4px 24px rgba(212,160,23,.35)}
.btn-gold:hover{box-shadow:0 8px 40px rgba(212,160,23,.55);transform:translateY(-2px)}
.btn-accent{background:var(--accent);color:#0D0D0D;font-weight:700;transition:all .25s}
.btn-accent:hover{filter:brightness(1.15);transform:translateY(-1px)}
.grid-bg{background-image:linear-gradient(rgba(212,160,23,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,23,.04) 1px,transparent 1px);background-size:48px 48px}
.portal-tile{background:rgba(255,255,255,.025);border:1px solid rgba(201,168,76,.12);border-radius:18px;padding:26px;transition:all .35s;display:block;text-decoration:none;color:inherit;position:relative;overflow:hidden}
.portal-tile:hover{transform:translateY(-5px);box-shadow:0 16px 48px rgba(0,0,0,.5)}
.portal-tile::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--tile-accent,#D4A017);opacity:.7}
input{background:rgba(255,255,255,.04)!important;border:1px solid rgba(201,168,76,.18)!important;color:#fff!important;border-radius:10px;padding:12px 14px;width:100%;font-size:14px;outline:none;transition:border-color .2s}
input:focus{border-color:var(--accent)!important}
.demo-chip{cursor:pointer;transition:all .2s;border:1px solid rgba(201,168,76,.15)}
.demo-chip:hover{background:rgba(212,160,23,.08);border-color:rgba(212,160,23,.35)}
</style>`;

export function portalsHubHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>${sharedHead('Choose Your Portal', '#D4A017')}</head>
<body class="grid-bg">
<nav class="fixed top-0 left-0 right-0 z-50 glass" style="border-bottom:1px solid rgba(201,168,76,.12)">
  <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
    <a href="/" class="flex items-center gap-3">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-9 w-auto">
      <span class="grotesk font-bold tracking-[.25em] text-sm">SGTX</span>
    </a>
    <a href="/register" class="px-5 py-2 btn-gold rounded-lg text-sm"><i class="fas fa-shield-halved mr-2"></i>Register Organization</a>
  </div>
</nav>

<main class="pt-32 pb-20 px-6 max-w-7xl mx-auto">
  <header class="text-center mb-14">
    <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-16 w-auto mx-auto mb-6" style="filter:drop-shadow(0 0 24px rgba(212,160,23,.4))">
    <div class="text-[11px] uppercase tracking-[.35em] gold-text mb-3 font-semibold">Blueprint Part 12C — Sovereign Portals</div>
    <h1 class="text-4xl md:text-6xl font-black mb-4">Choose Your <span style="background:linear-gradient(120deg,#f5dc89,#D4A017,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Portal</span></h1>
    <p class="text-sm max-w-xl mx-auto" style="color:rgba(255,255,255,.5)">Each stakeholder enters through their own sovereign gate. Individual authentication, role-scoped dashboards, dedicated AI copilots.</p>
  </header>

  <section class="grid md:grid-cols-2 lg:grid-cols-3 gap-5" id="portal-grid">
    ${PORTALS.map(p => `
    <a href="/portal/${p.id}/login" class="portal-tile" style="--tile-accent:${p.accent}" id="tile-${p.id}">
      <div class="flex items-start justify-between mb-4">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:${p.accent}18;border:1px solid ${p.accent}35">
          <i class="fas ${p.icon} text-lg" style="color:${p.accent}"></i>
        </div>
        <span class="text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider" style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.08)">${p.blueprint}</span>
      </div>
      <h2 class="font-bold text-lg mb-1">${p.name}</h2>
      <div class="text-[11px] mb-4 font-medium" style="color:${p.accent}">${p.tagline}</div>
      <ul class="space-y-1.5 mb-5">
        ${p.features.slice(0, 3).map(f => `<li class="text-[11.5px] flex items-start gap-2" style="color:rgba(255,255,255,.45)"><i class="fas fa-check text-[9px] mt-1" style="color:${p.accent}"></i>${f}</li>`).join('')}
      </ul>
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider" style="color:${p.accent}">Enter Portal <i class="fas fa-arrow-right ml-1"></i></span>
        <i class="fas fa-lock text-[10px]" style="color:rgba(255,255,255,.25)"></i>
      </div>
    </a>`).join('')}
  </section>

  <footer class="mt-14 text-center text-[11px]" style="color:rgba(255,255,255,.25)">
    <i class="fas fa-balance-scale mr-1.5" style="color:rgba(212,160,23,.5)"></i>
    Every portal action passes the SGTX Governor. Non-custodial · No irreversible action without approval.
  </footer>
</main>
</body>
</html>`;
}

export function portalLoginHTML(portal: PortalDef): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>${sharedHead(portal.name + ' — Sign In', portal.accent)}</head>
<body class="grid-bg">
<div class="min-h-screen flex">
  <aside class="hidden lg:flex flex-col justify-between w-[44%] p-12 relative overflow-hidden" style="background:linear-gradient(160deg,${portal.accent}0d 0%,#070707 55%);border-right:1px solid rgba(201,168,76,.1)">
    <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none" style="background:radial-gradient(circle,${portal.accent}14 0%,transparent 70%)"></div>
    <a href="/portals" class="flex items-center gap-3 relative z-10">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-10 w-auto">
      <div>
        <div class="grotesk font-bold tracking-[.2em] text-sm">SGTX</div>
        <div class="text-[10px]" style="color:rgba(255,255,255,.4)">Sovereign Governed Trade Execution</div>
      </div>
    </a>
    <div class="relative z-10">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style="background:${portal.accent}1a;border:1px solid ${portal.accent}40">
        <i class="fas ${portal.icon} text-2xl" style="color:${portal.accent}"></i>
      </div>
      <div class="text-[10px] uppercase tracking-[.3em] mb-2 font-semibold" style="color:${portal.accent}">${portal.blueprint}</div>
      <h1 class="text-4xl font-black mb-3">${portal.name}</h1>
      <p class="text-sm mb-8" style="color:rgba(255,255,255,.5)">${portal.tagline}</p>
      <ul class="space-y-3">
        ${portal.features.map(f => `<li class="text-[13px] flex items-start gap-3" style="color:rgba(255,255,255,.55)"><i class="fas fa-circle-check mt-0.5" style="color:${portal.accent}"></i>${f}</li>`).join('')}
      </ul>
    </div>
    <div class="text-[11px] relative z-10" style="color:rgba(255,255,255,.3)">
      <i class="fas fa-fingerprint mr-1.5" style="color:${portal.accent}"></i>
      Tenant-type validated authentication · Session-scoped to this portal
    </div>
  </aside>

  <main class="flex-1 flex items-center justify-center p-8">
    <div class="w-full max-w-md">
      <div class="lg:hidden flex items-center gap-3 mb-8">
        <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-10 w-auto">
        <div>
          <div class="font-black text-lg">${portal.name}</div>
          <div class="text-[11px]" style="color:${portal.accent}">${portal.tagline}</div>
        </div>
      </div>

      <div class="glass rounded-2xl p-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-black">Portal Sign In</h2>
            <p class="text-[11px] mt-1" style="color:rgba(255,255,255,.4)">Authenticate to enter the ${portal.name}</p>
          </div>
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${portal.accent}1a;border:1px solid ${portal.accent}35">
            <i class="fas ${portal.icon}" style="color:${portal.accent}"></i>
          </div>
        </div>

        <div id="err" class="hidden mb-4 px-4 py-3 rounded-lg text-xs font-semibold" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#fca5a5"></div>

        <form onsubmit="return doLogin(event)">
          <label for="email" class="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style="color:rgba(255,255,255,.45)">Work Email</label>
          <input id="email" type="email" required autocomplete="email" placeholder="you@organization.com" class="mb-4">
          <label for="password" class="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style="color:rgba(255,255,255,.45)">Password</label>
          <input id="password" type="password" required autocomplete="current-password" placeholder="••••••••" class="mb-6">
          <button type="submit" id="btn" class="w-full py-3.5 btn-accent rounded-xl text-sm">
            <i class="fas fa-right-to-bracket mr-2"></i>Enter ${portal.name}
          </button>
        </form>

        ${portal.demo ? `
        <div class="mt-6 pt-5" style="border-top:1px solid rgba(255,255,255,.06)">
          <div class="text-[10px] uppercase tracking-wider font-semibold mb-2.5" style="color:rgba(255,255,255,.35)"><i class="fas fa-vial mr-1.5" style="color:${portal.accent}"></i>Demo Access</div>
          <div class="demo-chip rounded-xl px-4 py-3 flex items-center justify-between" onclick="demoLogin()">
            <div>
              <div class="text-[13px] font-semibold">${portal.demo.org}</div>
              <div class="text-[11px]" style="color:rgba(255,255,255,.35)">${portal.demo.email}</div>
            </div>
            <i class="fas fa-arrow-right text-xs" style="color:${portal.accent}"></i>
          </div>
        </div>` : ''}

        <div class="mt-6 flex items-center justify-between text-[11px]">
          <a href="/portals" class="hover:text-white transition" style="color:rgba(255,255,255,.4)"><i class="fas fa-table-cells mr-1"></i>All Portals</a>
          <a href="/register" class="font-semibold" style="color:${portal.accent}">Register Organization <i class="fas fa-arrow-right ml-1"></i></a>
        </div>
      </div>

      <div class="mt-6 text-center text-[10px]" style="color:rgba(255,255,255,.25)">
        <i class="fas fa-shield-halved mr-1" style="color:${portal.accent}"></i>
        This entrance only accepts <b>${portal.tenantTypes.includes('*') ? 'platform administrators' : portal.tenantTypes.filter(t=>t.length<=4).join(' / ') + ' organizations'}</b> — Blueprint ${portal.blueprint}
      </div>
    </div>
  </main>
</div>

<script>
var PORTAL_ID = '${portal.id}';
var DEMO = ${portal.demo ? JSON.stringify(portal.demo) : 'null'};

function showErr(m){ var e=document.getElementById('err'); e.textContent=m; e.classList.remove('hidden'); }

async function doLogin(ev){
  ev.preventDefault();
  var btn=document.getElementById('btn'); btn.disabled=true; btn.innerHTML='<i class="fas fa-circle-notch fa-spin mr-2"></i>Authenticating…';
  document.getElementById('err').classList.add('hidden');
  try{
    var r = await fetch('/api/v1/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value, portal: PORTAL_ID })
    });
    var j = await r.json();
    if(!r.ok){ showErr(j.error || 'Authentication failed'); btn.disabled=false; btn.innerHTML='<i class="fas fa-right-to-bracket mr-2"></i>Enter ${portal.name}'; return false; }
    var d = j.data || j;
    localStorage.setItem('sgtx_token', d.session ? d.session.token : d.token);
    localStorage.setItem('sgtx_tenant', JSON.stringify(d.tenant));
    localStorage.setItem('sgtx_employee', JSON.stringify(d.employee));
    localStorage.setItem('sgtx_portal', PORTAL_ID);
    location.href = '/portal/' + PORTAL_ID;
  }catch(e){ showErr('Network error: '+e.message); btn.disabled=false; btn.innerHTML='<i class="fas fa-right-to-bracket mr-2"></i>Enter ${portal.name}'; }
  return false;
}
function demoLogin(){ if(!DEMO) return; document.getElementById('email').value=DEMO.email; document.getElementById('password').value=DEMO.password; document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true})); }
</script>
</body>
</html>`;
}

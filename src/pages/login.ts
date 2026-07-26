// SGTX Platform v11.2 — Login Page (Gold/Black Brand Identity)
export function loginHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign In — SGTX Sovereign Governed Trade Execution</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{font-family:'Inter',system-ui,sans-serif}
h1,h2,h3,.btn-gold{font-family:'Sora','Inter',sans-serif}
body{background:#0B0B0D;background-image:radial-gradient(circle at 20% 50%,rgba(212,160,23,.07) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(212,160,23,.05) 0%,transparent 40%)}
.glass-card{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid rgba(201,168,76,.16);backdrop-filter:blur(16px);position:relative}
.glass-card::before{content:'';position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent 5%,rgba(212,160,23,.3) 50%,transparent 95%)}
.input-field{background:rgba(255,255,255,.05)!important;border:1px solid rgba(201,168,76,.15)!important;color:white!important;border-radius:10px!important;padding:11px 14px!important;font-size:14px!important;width:100%;transition:all .2s;outline:none}
.input-field:focus{background:rgba(255,255,255,.07)!important;border-color:rgba(212,160,23,.5)!important;box-shadow:0 0 0 3px rgba(212,160,23,.08)!important}
.input-field::placeholder{color:rgba(255,255,255,.3)!important}
.btn-gold{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D;font-weight:800;border:none;padding:12px;border-radius:10px;width:100%;font-size:14px;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(212,160,23,.3)}
.btn-gold:hover:not(:disabled){box-shadow:0 6px 30px rgba(212,160,23,.5);transform:translateY(-1px)}
.btn-gold:disabled{opacity:.7;cursor:not-allowed}
.demo-row{display:flex;justify-content:space-between;align-items:center;cursor:pointer;border-radius:8px;padding:9px 12px;transition:all .2s;border:1px solid transparent}
.demo-row:hover{background:rgba(212,160,23,.06);border-color:rgba(212,160,23,.15)}
label{color:rgba(255,255,255,.6);font-size:13px;font-weight:500;margin-bottom:5px;display:block}
</style>
</head>
<body class="min-h-screen flex">

<!-- Left panel - decorative -->
<div class="hidden lg:flex lg:w-1/2 relative overflow-hidden" style="background:linear-gradient(135deg,#0D0D0D 0%,#1a1a1a 100%)">
  <div class="absolute inset-0" style="background:radial-gradient(circle at 40% 50%,rgba(212,160,23,.08) 0%,transparent 60%)"></div>
  <div class="relative z-10 flex flex-col justify-center px-16">
    <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-14 w-auto mb-12" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div style="display:none" class="items-center gap-3 mb-12">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center" style="background:linear-gradient(135deg,#D4A017,#C9A84C)"><span class="font-black text-black text-xl">SG</span></div>
      <span class="font-black text-3xl" style="color:#D4A017">SGTX</span>
    </div>
    <h2 class="text-4xl font-black mb-4 leading-tight" style="color:#F5EFDC">Sovereign<br><span style="background:linear-gradient(90deg,#F0C420,#C9A84C);-webkit-background-clip:text;background-clip:text;color:transparent">Governed</span><br>Trade Execution</h2>
    <p class="text-sm leading-relaxed mb-8" style="color:rgba(255,255,255,.45)">Non-custodial. AI-governed. Cryptographically certain. The operating system for global trade — not a marketplace, not a bank.</p>
    <div class="space-y-3">
      ${['Non-Custodial by Design','AI-Governed, Never Autonomous','Fixed 1.5% Transparent Fee','Jurisdiction-Aware at Every Step'].map(f=>`
      <div class="flex items-center gap-3">
        <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style="background:rgba(212,160,23,.15)"><i class="fas fa-check text-[9px]" style="color:#D4A017"></i></div>
        <span class="text-sm" style="color:rgba(255,255,255,.6)">${f}</span>
      </div>`).join('')}
    </div>
  </div>
  <!-- Decorative hexagon pattern -->
  <div class="absolute bottom-10 right-10 opacity-5">
    <img src="/static/brand/sgtx-icon-gold.png" alt="" class="h-64 w-auto">
  </div>
</div>

<!-- Right panel - login form -->
<div class="flex-1 flex items-center justify-center px-6 py-12">
  <div class="w-full max-w-md">
    
    <!-- Mobile logo -->
    <div class="lg:hidden text-center mb-8">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-10 w-auto mx-auto mb-4" onerror="this.style.display='none'">
    </div>

    <h1 class="text-2xl font-black mb-1" style="background:linear-gradient(90deg,#F5EFDC,#F0C420);-webkit-background-clip:text;background-clip:text;color:transparent">Welcome back</h1>
    <p class="text-sm mb-8" style="color:rgba(255,255,255,.4)">Sign in to your organization's trade execution dashboard</p>

    <div id="login-error" class="hidden text-sm rounded-xl p-3 mb-5" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5"></div>

    <form onsubmit="handleLogin(event)" class="space-y-4">
      <div>
        <label>Email Address</label>
        <input id="email" type="email" required class="input-field" placeholder="admin@company.com">
      </div>
      <div>
        <label>Password</label>
        <input id="password" type="password" required class="input-field" placeholder="••••••••">
      </div>
      <button type="submit" id="login-btn" class="btn-gold">
        <i class="fas fa-sign-in-alt mr-2"></i>Sign In to SGTX
      </button>
    </form>

    <div class="mt-6 text-center">
      <p class="text-sm" style="color:rgba(255,255,255,.35)">Don't have an organization? <a href="/register" class="underline transition" style="color:#D4A017">Register here</a></p>
    </div>

    <!-- Demo Accounts -->
    <div class="mt-8 rounded-2xl p-5" style="background:rgba(255,255,255,.02);border:1px solid rgba(201,168,76,.1)">
      <h3 class="text-xs font-bold mb-4 flex items-center gap-2" style="color:rgba(255,255,255,.5)">
        <i class="fas fa-users" style="color:#D4A017"></i> Demo Accounts <span style="color:rgba(255,255,255,.25);font-weight:400">(click to auto-login)</span>
      </h3>
      <div class="space-y-1">
        ${[
          ['hans@euimport.com','Importer / Buyer','EU Import GmbH','DE','fas fa-building','#60a5fa'],
          ['ahmed@nilefoods.com','Exporter / Seller','Nile Foods Export Co.','EG','fas fa-industry','#34d399'],
          ['khaled@pharaohagri.com','Dual-Mode Trader','Pharaoh Agri Trading','EG','fas fa-right-left','#f59e0b'],
          ['fatma@nbe.com.eg','Financier','National Bank of Egypt','EG','fas fa-landmark','#fbbf24'],
          ['yasser@nilelogistics.com','Logistics (LSP)','Nile Logistics','EG','fas fa-truck','#22d3ee'],
          ['captain@medshipping.com','Shipping Line','Med Shipping Lines','EG','fas fa-ship','#38bdf8'],
          ['noha@qualitycheck.com','QC Inspector','QualityCheck Intl','EG','fas fa-microscope','#c084fc'],
          ['dr.samir@cairolabs.com','Laboratory','Cairo Labs','EG','fas fa-flask','#a78bfa'],
          ['mohamed@deltabrokers.com','Customs Broker','Delta Brokers','EG','fas fa-file-signature','#f472b6'],
          ['general.ibrahim@customs.gov.eg','Government','Egyptian Customs Authority','EG','fas fa-building-columns','#94a3b8'],
          ['admin@sgtx.io','Platform Admin','SGTX Platform','—','fas fa-shield-halved','#fb7185','admin123'],
        ].map(([e,role,name,ctry,icon,clr,pw])=>`
        <div class="demo-row" onclick="demoLogin('${e}','${pw||'demo123'}')">
          <div class="flex items-center gap-3">
            <i class="${icon} text-sm" style="color:${clr}"></i>
            <div>
              <div class="text-sm font-semibold text-white">${name}</div>
              <div class="text-xs" style="color:rgba(255,255,255,.35)">${e}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold" style="background:rgba(212,160,23,.1);color:rgba(212,160,23,.8);border:1px solid rgba(212,160,23,.15)">${role} · ${ctry}</span>
            <i class="fas fa-arrow-right text-[10px]" style="color:rgba(255,255,255,.2)"></i>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div class="mt-6 text-center text-[11px]" style="color:rgba(255,255,255,.2)">
      <i class="fas fa-balance-scale mr-1" style="color:rgba(212,160,23,.4)"></i> SGTX Platform — Non-custodial. No irreversible action without Governor approval.
    </div>
  </div>
</div>

<script>
function fillDemo(e,p){document.getElementById('email').value=e;document.getElementById('password').value=p;}
function demoLogin(e,p){fillDemo(e,p);document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));}

async function handleLogin(ev){
  ev.preventDefault();
  const btn=document.getElementById('login-btn');
  const err=document.getElementById('login-error');
  btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Authenticating...';
  btn.disabled=true;
  err.classList.add('hidden');
  try{
    const r=await fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});
    const d=await r.json();
    if(!r.ok){err.textContent=d.error||'Login failed';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Sign In to SGTX';btn.disabled=false;return;}
    localStorage.setItem('sgtx_token',d.data.session.token);
    localStorage.setItem('sgtx_tenant',JSON.stringify(d.data.tenant));
    localStorage.setItem('sgtx_employee',JSON.stringify(d.data.employee));
    btn.innerHTML='<i class="fas fa-check mr-2"></i>Success! Redirecting...';
    window.location.href='/app';
  }catch(ex){err.textContent='Network error — please try again';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Sign In to SGTX';btn.disabled=false;}
}
</script>
</body>
</html>`;
}

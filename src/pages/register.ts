// SGTX Platform v11.2 — Registration Page (Gold/Black Brand Identity)
export function registerHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Register Organization — SGTX</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{font-family:'Inter',system-ui,sans-serif}
h1,h2,h3,.section-title,.btn-gold{font-family:'Sora','Inter',sans-serif}
body{background:#0B0B0D;background-image:radial-gradient(900px 500px at 80% -10%,rgba(212,160,23,.08) 0%,transparent 55%),radial-gradient(700px 400px at 0% 100%,rgba(212,160,23,.05) 0%,transparent 50%)}
.glass-card{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid rgba(201,168,76,.14);border-radius:18px;padding:24px;position:relative;transition:border-color .25s ease,box-shadow .25s ease}
.glass-card::before{content:'';position:absolute;inset:0 0 auto 0;height:1px;border-radius:18px 18px 0 0;background:linear-gradient(90deg,transparent 5%,rgba(212,160,23,.3) 50%,transparent 95%)}
.glass-card:hover{border-color:rgba(212,160,23,.28);box-shadow:0 0 32px rgba(212,160,23,.06)}
.input-field{background:rgba(255,255,255,.05)!important;border:1px solid rgba(201,168,76,.15)!important;color:white!important;border-radius:10px!important;padding:10px 14px!important;font-size:13px!important;width:100%;transition:all .2s;outline:none}
.input-field:focus{background:rgba(255,255,255,.07)!important;border-color:rgba(212,160,23,.5)!important;box-shadow:0 0 0 3px rgba(212,160,23,.08)!important}
.input-field::placeholder{color:rgba(255,255,255,.25)!important}
select.input-field option{background:#1a1a1a;color:white}
.btn-gold{background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D;font-weight:800;border:none;padding:12px;border-radius:10px;width:100%;font-size:14px;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(212,160,23,.3)}
.btn-gold:hover:not(:disabled){box-shadow:0 6px 30px rgba(212,160,23,.5);transform:translateY(-1px)}
.btn-gold:disabled{opacity:.7;cursor:not-allowed}
label{color:rgba(255,255,255,.6);font-size:12px;font-weight:500;margin-bottom:4px;display:block}
.section-title{color:white;font-size:13px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section-title i{color:#D4A017}
</style>
</head>
<body class="min-h-screen py-10 px-6">

<div class="max-w-lg mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <a href="/" class="inline-block mb-6">
      <img src="/static/brand/sgtx-icon-gold.png" alt="SGTX" class="h-12 w-auto mx-auto" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none" class="items-center justify-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#D4A017,#C9A84C)"><span class="font-black text-black">SG</span></div>
        <span class="font-black text-2xl" style="color:#D4A017">SGTX</span>
      </div>
    </a>
    <h1 class="text-2xl font-black mb-2" style="background:linear-gradient(90deg,#F5EFDC,#F0C420);-webkit-background-clip:text;background-clip:text;color:transparent">Register Organization</h1>
    <p class="text-sm" style="color:rgba(255,255,255,.4)">Create your organization on the Sovereign Trade Execution Infrastructure</p>
  </div>

  <!-- Error / Success -->
  <div id="reg-error" class="hidden text-sm rounded-xl p-3 mb-5" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5"></div>
  <div id="reg-success" class="hidden text-sm rounded-xl p-4 mb-5" style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#86efac"></div>

  <form onsubmit="handleRegister(event)" class="space-y-4">
    
    <!-- Organization Details -->
    <div class="glass-card">
      <div class="section-title"><i class="fas fa-building"></i>Organization Details</div>
      <div class="space-y-3">
        <div>
          <label>Legal Name *</label>
          <input id="r-name" required class="input-field" placeholder="Your Company LLC">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label>Jurisdiction *</label>
            <select id="r-jurisdiction" class="input-field">
              <option value="US">🇺🇸 United States</option>
              <option value="EG">🇪🇬 Egypt</option>
              <option value="VN">🇻🇳 Vietnam</option>
              <option value="AE">🇦🇪 UAE</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="SG">🇸🇬 Singapore</option>
              <option value="IN">🇮🇳 India</option>
              <option value="BR">🇧🇷 Brazil</option>
              <option value="NG">🇳🇬 Nigeria</option>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="SA">🇸🇦 Saudi Arabia</option>
              <option value="TR">🇹🇷 Turkey</option>
              <option value="CN">🇨🇳 China</option>
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="ID">🇮🇩 Indonesia</option>
              <option value="JP">🇯🇵 Japan</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="CH">🇨🇭 Switzerland</option>
              <option value="HK">🇭🇰 Hong Kong</option>
            </select>
          </div>
          <div>
            <label>Organization Type *</label>
            <select id="r-type" class="input-field">
              <option value="CORPORATE">Trading Company</option>
              <option value="FINANCIAL">Financial Institution</option>
              <option value="LOGISTICS">Logistics Provider</option>
              <option value="QUALITY_CONTROL">QC / Inspection</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Account -->
    <div class="glass-card">
      <div class="section-title"><i class="fas fa-user-shield"></i>Admin Account</div>
      <div class="space-y-3">
        <div>
          <label>Full Name *</label>
          <input id="r-admin-name" required class="input-field" placeholder="John Smith">
        </div>
        <div>
          <label>Email *</label>
          <input id="r-email" type="email" required class="input-field" placeholder="admin@company.com">
        </div>
        <div>
          <label>Password *</label>
          <input id="r-password" type="password" required minlength="6" class="input-field" placeholder="Min. 6 characters">
        </div>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="rounded-xl p-4" style="background:rgba(212,160,23,.04);border:1px solid rgba(212,160,23,.12)">
      <label class="flex items-start gap-3 cursor-pointer" style="color:rgba(255,255,255,.55);font-size:12px;line-height:1.5;margin:0">
        <input type="checkbox" required class="mt-0.5 accent-yellow-500 flex-shrink-0">
        <span>I acknowledge that SGTX is a <strong style="color:rgba(212,160,23,.8)">non-custodial platform</strong> headquartered in NJ, USA. It does NOT hold funds or process payments directly. Users bear 100% compliance responsibility. Max liability = SGTX fees paid in last 12 months.</span>
      </label>
    </div>

    <button type="submit" id="reg-btn" class="btn-gold">
      <i class="fas fa-rocket mr-2"></i>Register Organization — Governor Gated
    </button>

    <!-- What happens next -->
    <div class="rounded-xl p-4" style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06)">
      <p class="text-xs font-semibold mb-3" style="color:rgba(255,255,255,.4)">What happens next:</p>
      <div class="space-y-2">
        ${['Governor pre-screens your jurisdiction for compliance (instant)','Your GTID is issued (e.g. SGTX-US-TRD-000001-A1B2)','Sandbox provisioned with demo data for immediate testing','Onboarding checklist appears on first login'].map((s,i)=>`
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style="background:rgba(212,160,23,.1);color:#D4A017">${i+1}</div>
          <span class="text-xs" style="color:rgba(255,255,255,.35)">${s}</span>
        </div>`).join('')}
      </div>
    </div>
  </form>

  <div class="mt-6 text-center">
    <p class="text-sm" style="color:rgba(255,255,255,.35)">Already registered? <a href="/login" class="underline transition" style="color:#D4A017">Sign in</a></p>
  </div>
</div>

<script>
async function handleRegister(e){
  e.preventDefault();
  const btn=document.getElementById('reg-btn');
  const err=document.getElementById('reg-error');
  const suc=document.getElementById('reg-success');
  btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Governor evaluating...';
  btn.disabled=true;
  err.classList.add('hidden');suc.classList.add('hidden');
  try{
    const r=await fetch('/api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        legal_name:document.getElementById('r-name').value,
        jurisdiction:document.getElementById('r-jurisdiction').value,
        type:document.getElementById('r-type').value,
        admin_name:document.getElementById('r-admin-name').value,
        admin_email:document.getElementById('r-email').value,
        admin_password:document.getElementById('r-password').value,
      })});
    const d=await r.json();
    if(!r.ok){err.textContent=d.error||'Registration failed';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-rocket mr-2"></i>Register Organization';btn.disabled=false;return;}
    localStorage.setItem('sgtx_token',d.data.session.token);
    localStorage.setItem('sgtx_tenant',JSON.stringify(d.data.tenant));
    localStorage.setItem('sgtx_employee',JSON.stringify(d.data.employee));
    suc.innerHTML='<i class="fas fa-check-circle mr-2"></i><strong>Organization registered!</strong> Your GTID: <code style="background:rgba(212,160,23,.2);padding:2px 6px;border-radius:4px">'+d.data.tenant.gtid+'</code> — Redirecting to dashboard...';
    suc.classList.remove('hidden');
    setTimeout(()=>window.location.href='/app',2000);
  }catch(ex){err.textContent='Network error — please try again';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-rocket mr-2"></i>Register Organization';btn.disabled=false;}
}
</script>
</body>
</html>`;
}

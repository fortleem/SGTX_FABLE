// SGTX Platform v6.1 — Registration Page
export function registerHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Register — SGTX Platform</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{sgtx:{50:'#f0f0ff',100:'#e0e0ff',200:'#c4c0ff',300:'#a49aff',400:'#7c6eff',500:'#4E3FE8',600:'#3d2fc0',700:'#2d2290',800:'#1e1660',900:'#0f0b30'}}}}}</script>
</head>
<body class="bg-sgtx-900 min-h-screen flex items-center justify-center py-12">
<div class="w-full max-w-lg px-6">
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center gap-3 mb-6">
      <div class="w-12 h-12 bg-sgtx-500 rounded-xl flex items-center justify-center"><i class="fas fa-shield-halved text-white text-xl"></i></div>
      <div class="text-left"><div class="text-white font-bold text-xl">SGTX</div><div class="text-sgtx-400 text-xs">Platform v6.1</div></div>
    </a>
    <h1 class="text-2xl font-bold text-white mb-2">Register Organization</h1>
    <p class="text-sgtx-300 text-sm">Create your organization on the Sovereign Trade Execution Infrastructure</p>
  </div>

  <div id="reg-error" class="hidden bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-lg p-3 mb-4"></div>
  <div id="reg-success" class="hidden bg-green-500/20 border border-green-500/40 text-green-300 text-sm rounded-lg p-3 mb-4"></div>

  <form onsubmit="handleRegister(event)" class="space-y-4">
    <div class="bg-sgtx-800/50 rounded-lg p-4 mb-2">
      <h3 class="text-white text-sm font-bold mb-3"><i class="fas fa-building mr-2 text-sgtx-400"></i>Organization Details</h3>
      <div class="space-y-3">
        <div>
          <label class="text-sgtx-300 text-sm mb-1 block">Legal Name *</label>
          <input id="r-name" required class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="Your Company LLC">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sgtx-300 text-sm mb-1 block">Jurisdiction *</label>
            <select id="r-jurisdiction" class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none">
              <option value="US">United States</option><option value="EG">Egypt</option><option value="VN">Vietnam</option>
              <option value="AE">UAE</option><option value="DE">Germany</option><option value="GB">United Kingdom</option>
              <option value="SG">Singapore</option><option value="IN">India</option><option value="BR">Brazil</option>
              <option value="NG">Nigeria</option><option value="KE">Kenya</option><option value="SA">Saudi Arabia</option>
              <option value="TR">Turkey</option><option value="CN">China</option><option value="ZA">South Africa</option>
              <option value="ID">Indonesia</option><option value="JP">Japan</option><option value="AU">Australia</option>
              <option value="CH">Switzerland</option><option value="HK">Hong Kong</option>
            </select>
          </div>
          <div>
            <label class="text-sgtx-300 text-sm mb-1 block">Organization Type *</label>
            <select id="r-type" class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none">
              <option value="CORPORATE">Trading Company</option><option value="FINANCIAL">Financial Institution</option>
              <option value="LOGISTICS">Logistics Provider</option><option value="QUALITY_CONTROL">QC / Inspection</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-sgtx-800/50 rounded-lg p-4">
      <h3 class="text-white text-sm font-bold mb-3"><i class="fas fa-user-shield mr-2 text-sgtx-400"></i>Admin Account</h3>
      <div class="space-y-3">
        <div>
          <label class="text-sgtx-300 text-sm mb-1 block">Full Name *</label>
          <input id="r-admin-name" required class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="John Smith">
        </div>
        <div>
          <label class="text-sgtx-300 text-sm mb-1 block">Email *</label>
          <input id="r-email" type="email" required class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="admin@company.com">
        </div>
        <div>
          <label class="text-sgtx-300 text-sm mb-1 block">Password *</label>
          <input id="r-password" type="password" required minlength="6" class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-2.5 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="Min. 6 characters">
        </div>
      </div>
    </div>

    <div class="flex items-start gap-2 text-xs text-sgtx-400">
      <input type="checkbox" required class="mt-0.5">
      <span>I acknowledge that SGTX is a non-custodial platform headquartered in NJ, USA. It does NOT hold funds or process payments. Users bear 100% compliance responsibility.</span>
    </div>

    <button type="submit" id="reg-btn" class="w-full bg-sgtx-500 text-white py-3 rounded-lg font-semibold hover:bg-sgtx-400 transition">
      <i class="fas fa-rocket mr-2"></i>Register Organization (Governor Gated)
    </button>
  </form>

  <div class="mt-6 text-center">
    <p class="text-sgtx-400 text-sm">Already registered? <a href="/login" class="text-sgtx-400 hover:text-sgtx-300 underline">Sign in</a></p>
  </div>
</div>

<script>
async function handleRegister(e){
  e.preventDefault();
  const btn=document.getElementById('reg-btn');
  const err=document.getElementById('reg-error');
  const suc=document.getElementById('reg-success');
  btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Registering (Governor evaluating)...';
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
    suc.innerHTML='<i class="fas fa-check-circle mr-2"></i>Organization registered! GTID: <b>'+d.data.tenant.gtid+'</b>. Redirecting...';
    suc.classList.remove('hidden');
    setTimeout(()=>window.location.href='/app',1500);
  }catch(ex){err.textContent='Network error';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-rocket mr-2"></i>Register';btn.disabled=false;}
}
</script>
</body>
</html>`;
}

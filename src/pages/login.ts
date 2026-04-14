// SGTX Platform v6.1 — Login Page
export function loginHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login — SGTX Platform</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script>tailwind.config={theme:{extend:{colors:{sgtx:{50:'#f0f0ff',100:'#e0e0ff',200:'#c4c0ff',300:'#a49aff',400:'#7c6eff',500:'#4E3FE8',600:'#3d2fc0',700:'#2d2290',800:'#1e1660',900:'#0f0b30'}}}}}</script>
</head>
<body class="bg-sgtx-900 min-h-screen flex items-center justify-center">
<div class="w-full max-w-md px-6">
  <div class="text-center mb-8">
    <a href="/" class="inline-flex items-center gap-3 mb-6">
      <div class="w-12 h-12 bg-sgtx-500 rounded-xl flex items-center justify-center"><i class="fas fa-shield-halved text-white text-xl"></i></div>
      <div class="text-left"><div class="text-white font-bold text-xl">SGTX</div><div class="text-sgtx-400 text-xs">Platform v6.1</div></div>
    </a>
    <h1 class="text-2xl font-bold text-white mb-2">Sign In</h1>
    <p class="text-sgtx-300 text-sm">Access your organization's trade execution dashboard</p>
  </div>

  <div id="login-error" class="hidden bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-lg p-3 mb-4"></div>

  <form onsubmit="handleLogin(event)" class="space-y-4">
    <div>
      <label class="text-sgtx-300 text-sm mb-1 block">Email</label>
      <input id="email" type="email" required class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-3 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="admin@company.com">
    </div>
    <div>
      <label class="text-sgtx-300 text-sm mb-1 block">Password</label>
      <input id="password" type="password" required class="w-full bg-sgtx-800 border border-sgtx-700 text-white rounded-lg px-4 py-3 text-sm focus:border-sgtx-500 focus:outline-none" placeholder="••••••••">
    </div>
    <button type="submit" id="login-btn" class="w-full bg-sgtx-500 text-white py-3 rounded-lg font-semibold hover:bg-sgtx-400 transition">
      <i class="fas fa-sign-in-alt mr-2"></i>Sign In
    </button>
  </form>

  <div class="mt-6 text-center">
    <p class="text-sgtx-400 text-sm">Don't have an organization? <a href="/register" class="text-sgtx-400 hover:text-sgtx-300 underline">Register here</a></p>
  </div>

  <div class="mt-8 bg-sgtx-800/50 rounded-lg p-4">
    <h3 class="text-sgtx-300 text-xs font-bold mb-2"><i class="fas fa-info-circle mr-1"></i> Demo Accounts</h3>
    <div class="space-y-2 text-xs text-sgtx-400">
      <div class="flex justify-between cursor-pointer hover:text-sgtx-200" onclick="fillDemo('ahmed@cairoimports.eg','password123')">
        <span>Cairo Imports Co. (Importer, EG)</span><span class="text-sgtx-500">Use →</span>
      </div>
      <div class="flex justify-between cursor-pointer hover:text-sgtx-200" onclick="fillDemo('nguyen@saigontex.vn','password123')">
        <span>Saigon Textiles (Exporter, VN)</span><span class="text-sgtx-500">Use →</span>
      </div>
      <div class="flex justify-between cursor-pointer hover:text-sgtx-200" onclick="fillDemo('chen@asiafinance.sg','password123')">
        <span>Asia Trade Finance (Financier, SG)</span><span class="text-sgtx-500">Use →</span>
      </div>
      <div class="flex justify-between cursor-pointer hover:text-sgtx-200" onclick="fillDemo('muller@hamburg-log.de','password123')">
        <span>Hamburg Logistics (Logistics, DE)</span><span class="text-sgtx-500">Use →</span>
      </div>
      <div class="flex justify-between cursor-pointer hover:text-sgtx-200" onclick="fillDemo('admin@sgtx.us','password123')">
        <span>SGTX Platform (Admin, US)</span><span class="text-sgtx-500">Use →</span>
      </div>
    </div>
  </div>

  <div class="mt-6 text-center text-[10px] text-sgtx-600">
    <i class="fas fa-balance-scale mr-1"></i> SGTX Platform Inc., NJ, USA. Non-custodial. No irreversible action without Governor approval.
  </div>
</div>

<script>
function fillDemo(e,p){document.getElementById('email').value=e;document.getElementById('password').value=p;}

async function handleLogin(e){
  e.preventDefault();
  const btn=document.getElementById('login-btn');
  const err=document.getElementById('login-error');
  btn.innerHTML='<i class="fas fa-spinner fa-spin mr-2"></i>Authenticating...';
  btn.disabled=true;
  err.classList.add('hidden');
  try{
    const r=await fetch('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});
    const d=await r.json();
    if(!r.ok){err.textContent=d.error||'Login failed';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Sign In';btn.disabled=false;return;}
    localStorage.setItem('sgtx_token',d.data.session.token);
    localStorage.setItem('sgtx_tenant',JSON.stringify(d.data.tenant));
    localStorage.setItem('sgtx_employee',JSON.stringify(d.data.employee));
    window.location.href='/app';
  }catch(ex){err.textContent='Network error';err.classList.remove('hidden');btn.innerHTML='<i class="fas fa-sign-in-alt mr-2"></i>Sign In';btn.disabled=false;}
}
</script>
</body>
</html>`;
}

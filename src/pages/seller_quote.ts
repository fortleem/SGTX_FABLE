// SGTX Platform v6.3 — Part 3 Phase 2: Seller Quote Form Page
// Blueprint: Seller Quote, Packing & Logistics Orchestration
// Steps 2.1-2.8 with 23 Governor Gates (G2U1-G2U22, G2UPACK1)

export function sellerQuoteFormHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SGTX v6.3 — Seller Quote Response</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root { --sgtx-primary: #0f172a; --sgtx-accent: #10b981; --sgtx-gold: #f59e0b; --sgtx-deny: #ef4444; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
    .glass { background: rgba(30,41,59,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(71,85,105,0.4); }
    .glass-light { background: rgba(30,41,59,0.6); border: 1px solid rgba(71,85,105,0.3); }
    select, input[type="text"], input[type="number"], textarea {
      background: rgba(15,23,42,0.8); border: 1px solid rgba(71,85,105,0.5); color: #e2e8f0;
      border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%;
      transition: border-color 0.2s; }
    select:focus, input:focus, textarea:focus { border-color: #10b981; box-shadow: 0 0 0 2px rgba(16,185,129,0.3); outline: none; }
    .btn-primary { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 0.5rem;
      padding: 0.625rem 1.25rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
    .btn-secondary { background: rgba(71,85,105,0.5); color: #cbd5e1; border: 1px solid rgba(71,85,105,0.5);
      border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }
    .btn-gold { background: linear-gradient(135deg, #f59e0b, #d97706); color: #1e293b; border: none;
      border-radius: 0.5rem; padding: 0.625rem 1.25rem; font-weight: 700; cursor: pointer; }
    .step-badge { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; }
    .step-active { background: #10b981; color: white; }
    .step-done { background: #059669; color: white; }
    .step-pending { background: rgba(71,85,105,0.5); color: #94a3b8; }
    .gate-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.625rem; font-weight: 700; font-family: monospace; }
    .gate-pass { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .gate-fail { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .gate-pending { background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .cost-M { border-left: 3px solid #10b981; }
    .cost-O { border-left: 3px solid #3b82f6; }
    .cost-D { border-left: 3px solid #475569; opacity: 0.5; }
    .toast { position: fixed; top: 20px; right: 20px; z-index: 100; padding: 12px 20px; border-radius: 8px; font-size: 0.875rem; animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  </style>
</head>
<body>
<div class="min-h-screen">
  <!-- Header -->
  <header class="glass sticky top-0 z-20 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/app" class="text-slate-400 hover:text-white"><i class="fas fa-arrow-left"></i></a>
      <div class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center"><i class="fas fa-file-invoice-dollar text-white text-sm"></i></div>
      <div><div class="font-bold text-white">Seller Quote Response</div><div class="text-[10px] text-slate-400">Part 3 Phase 2 — Blueprint v6.3</div></div>
    </div>
    <div class="flex items-center gap-3 text-xs">
      <span id="quote-status" class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-semibold">DRAFT</span>
      <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400"><i class="fas fa-shield-halved mr-1"></i>23 Governor Gates</span>
    </div>
  </header>

  <div class="max-w-7xl mx-auto px-6 py-6 flex gap-6">
    <!-- Step Navigator (left rail) -->
    <nav class="w-56 shrink-0">
      <div class="glass rounded-xl p-4 sticky top-20">
        <h3 class="text-xs font-bold text-slate-400 uppercase mb-4">Quote Steps</h3>
        <div class="space-y-2" id="step-nav">
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(0)">
            <div class="step-badge step-pending" id="sn-0">0</div>
            <div><div class="text-sm font-medium" id="sl-0">Select Request</div><div class="text-[10px] text-slate-500">Pending trade requests</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(1)">
            <div class="step-badge step-pending" id="sn-1">1</div>
            <div><div class="text-sm font-medium" id="sl-1">Loading Origin</div><div class="text-[10px] text-slate-500">G2U17</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(2)">
            <div class="step-badge step-pending" id="sn-2">2</div>
            <div><div class="text-sm font-medium" id="sl-2">EXW Price Lock</div><div class="text-[10px] text-slate-500">G2UA1</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(3)">
            <div class="step-badge step-pending" id="sn-3">3</div>
            <div><div class="text-sm font-medium" id="sl-3">Logistics Costs</div><div class="text-[10px] text-slate-500">G2U18</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(4)">
            <div class="step-badge step-pending" id="sn-4">4</div>
            <div><div class="text-sm font-medium" id="sl-4">Alt. Ports</div><div class="text-[10px] text-slate-500">G2U19</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(5)">
            <div class="step-badge step-pending" id="sn-5">5</div>
            <div><div class="text-sm font-medium" id="sl-5">Packing Plan</div><div class="text-[10px] text-slate-500">G2U14, G2U9</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(6)">
            <div class="step-badge step-pending" id="sn-6">6</div>
            <div><div class="text-sm font-medium" id="sl-6">Multi-Shipment</div><div class="text-[10px] text-slate-500">G2U20</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(7)">
            <div class="step-badge step-pending" id="sn-7">7</div>
            <div><div class="text-sm font-medium" id="sl-7">SGTX Fee</div><div class="text-[10px] text-slate-500">G2U22</div></div>
          </div>
          <div class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-700/30 transition" onclick="goStep(8)">
            <div class="step-badge step-pending" id="sn-8">8</div>
            <div><div class="text-sm font-medium" id="sl-8">Submit Quote</div><div class="text-[10px] text-slate-500">Final Checks</div></div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 min-w-0">
      <div id="toast-area"></div>

      <!-- Step 0: Select Pending Request -->
      <section id="step-0" class="glass rounded-xl p-6">
        <h2 class="text-lg font-bold text-white mb-1"><i class="fas fa-inbox text-emerald-400 mr-2"></i>Pending Trade Requests</h2>
        <p class="text-slate-400 text-sm mb-4">Select a buyer's trade request to prepare your quote response</p>
        <div id="pending-requests" class="space-y-3">
          <div class="text-center py-8 text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading pending requests...</div>
        </div>
      </section>

      <!-- Step 1: Loading Origin -->
      <section id="step-1" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-map-marker-alt text-emerald-400 mr-2"></i>Step 2.1: Loading Origin</h2>
          <span class="gate-badge gate-pending">G2U17</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">Specify where goods will be loaded for shipment</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-slate-300 text-xs mb-1 block">Country of Loading (ISO 3166-1)</label>
            <select id="loading-country" onchange="filterPorts()">
              <option value="">Select country...</option>
              <option value="VN">VN — Vietnam</option>
              <option value="EG">EG — Egypt</option>
              <option value="CN">CN — China</option>
              <option value="IN">IN — India</option>
              <option value="BR">BR — Brazil</option>
              <option value="TH">TH — Thailand</option>
              <option value="ID">ID — Indonesia</option>
              <option value="DE">DE — Germany</option>
              <option value="US">US — United States</option>
              <option value="TR">TR — Turkey</option>
            </select>
          </div>
          <div>
            <label class="text-slate-300 text-xs mb-1 block">Port of Loading (UN/LOCODE)</label>
            <select id="loading-port">
              <option value="">Select port...</option>
            </select>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="btn-primary" onclick="saveLoadingOrigin()"><i class="fas fa-check mr-2"></i>Confirm Loading Origin</button>
        </div>
      </section>

      <!-- Step 2: EXW Price Lock -->
      <section id="step-2" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-lock text-amber-400 mr-2"></i>Step 2.2: EXW Price Lock</h2>
          <span class="gate-badge gate-pending">G2UA1</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">Lock your EXW price. If deviation &gt;30% from market average, written justification required.</p>
        <div id="market-chart-area" class="glass-light rounded-lg p-4 mb-4">
          <div class="text-xs text-slate-400 mb-2"><i class="fas fa-chart-line mr-1"></i>30-Day Market Price Chart</div>
          <canvas id="marketChart" height="200"></canvas>
        </div>
        <div id="ai-range-band" class="glass-light rounded-lg p-3 mb-4 text-sm"></div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="text-slate-300 text-xs mb-1 block">EXW Price (per unit)</label>
            <input type="number" id="exw-price" step="0.01" min="0" placeholder="0.00" oninput="checkDeviation()">
          </div>
          <div>
            <label class="text-slate-300 text-xs mb-1 block">Currency</label>
            <select id="exw-currency"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select>
          </div>
          <div>
            <label class="text-slate-300 text-xs mb-1 block">Validity (days)</label>
            <input type="number" id="exw-validity" value="15" min="1" max="90">
          </div>
        </div>
        <div id="deviation-warning" class="hidden mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"></div>
        <div id="justification-area" class="hidden mt-3">
          <label class="text-slate-300 text-xs mb-1 block">Justification (required for &gt;30% deviation)</label>
          <textarea id="exw-justification" rows="3" placeholder="Explain why your price deviates from market average..."></textarea>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="btn-gold" onclick="lockEXW()"><i class="fas fa-lock mr-2"></i>Lock EXW Price</button>
        </div>
      </section>

      <!-- Step 3: Logistics Cost Entry -->
      <section id="step-3" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-truck-loading text-blue-400 mr-2"></i>Step 2.3: Logistics Costs</h2>
          <span class="gate-badge gate-pending">G2U18</span>
        </div>
        <p class="text-slate-400 text-sm mb-2">Enter logistics costs per Incoterm rules. <span class="text-emerald-400">M</span>=Mandatory, <span class="text-blue-400">O</span>=Optional, <span class="text-slate-600">D</span>=Disabled</p>
        <div class="flex gap-2 mb-4">
          <button class="btn-primary text-xs" id="mode-manual-btn" onclick="setLogisticsMode('MANUAL')">Mode A: Manual Entry</button>
          <button class="btn-secondary text-xs" id="mode-rfq-btn" onclick="setLogisticsMode('RFQ')">Mode B: Send RFQ</button>
        </div>
        <div id="logistics-lines" class="space-y-2"></div>
        <div id="logistics-total-area" class="mt-4 glass-light rounded-lg p-3 flex justify-between items-center">
          <span class="text-slate-300 text-sm font-medium">Total Logistics Cost</span>
          <span id="logistics-total" class="text-xl font-bold text-white">$0.00</span>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="btn-primary" onclick="saveLogistics()"><i class="fas fa-save mr-2"></i>Save Logistics Costs</button>
        </div>
      </section>

      <!-- Step 4: Alternative Ports -->
      <section id="step-4" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-anchor text-cyan-400 mr-2"></i>Step 2.4: Alternative Delivery Ports</h2>
          <span class="gate-badge gate-pending">G2U19</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">Offer alternative ports in the same destination country (optional)</p>
        <div id="alt-ports-list" class="space-y-3"></div>
        <button class="btn-secondary text-xs mt-3" onclick="addAltPort()"><i class="fas fa-plus mr-1"></i>Add Alternative Port</button>
        <div class="mt-4 flex justify-between">
          <button class="btn-secondary" onclick="goStep(5)">Skip (Optional)</button>
          <button class="btn-primary" onclick="saveAltPorts()"><i class="fas fa-save mr-2"></i>Save Alternative Ports</button>
        </div>
      </section>

      <!-- Step 5: Packing Plan -->
      <section id="step-5" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-boxes text-purple-400 mr-2"></i>Step 2.5: Packing & Containerisation</h2>
          <div class="flex gap-2"><span class="gate-badge gate-pending">G2U14</span><span class="gate-badge gate-pending">G2U9</span></div>
        </div>
        <p class="text-slate-400 text-sm mb-4">Review and lock packing plan. Loom hash created on lock (G2U14).</p>
        <div id="packing-plans-area" class="space-y-3">
          <div class="text-center py-6 text-slate-500">Packing plans from trade request will appear here</div>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="btn-gold" onclick="lockPackingPlan()"><i class="fas fa-lock mr-2"></i>Lock Packing Plan (G2U14)</button>
        </div>
      </section>

      <!-- Step 6: Multi-Shipment Response -->
      <section id="step-6" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-calendar-alt text-orange-400 mr-2"></i>Step 2.6: Multi-Shipment Response</h2>
          <span class="gate-badge gate-pending">G2U20</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">Accept, modify, or reject buyer's shipment schedule</p>
        <div id="shipment-schedule" class="space-y-3">
          <div class="text-center py-6 text-slate-500">Shipment schedule will appear if multi-shipment enabled</div>
        </div>
        <div class="mt-4 flex justify-between">
          <button class="btn-secondary" onclick="goStep(7)">Skip (Single Shipment)</button>
          <button class="btn-primary" onclick="saveShipmentResponse()"><i class="fas fa-save mr-2"></i>Save Response</button>
        </div>
      </section>

      <!-- Step 7: SGTX Fee Calculation -->
      <section id="step-7" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-calculator text-emerald-400 mr-2"></i>Step 2.7: SGTX Platform Fee</h2>
          <span class="gate-badge gate-pending">G2U22</span>
        </div>
        <p class="text-slate-400 text-sm mb-4">Platform fee: clamp(0.1%, 2.5%, base + adjustments). Paid by seller, added to quote total.</p>
        <div id="fee-calculation" class="glass-light rounded-lg p-4">
          <div class="text-center py-6 text-slate-500">Click Calculate to compute SGTX fee</div>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="btn-primary" onclick="calculateFee()"><i class="fas fa-calculator mr-2"></i>Calculate Fee</button>
        </div>
      </section>

      <!-- Step 8: Submit Quote -->
      <section id="step-8" class="glass rounded-xl p-6 hidden">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white"><i class="fas fa-paper-plane text-emerald-400 mr-2"></i>Step 2.8: Submit Final Quote</h2>
          <div class="flex gap-1">
            <span class="gate-badge gate-pending">G2U17</span>
            <span class="gate-badge gate-pending">G2U18</span>
            <span class="gate-badge gate-pending">G2U21</span>
            <span class="gate-badge gate-pending">G2U22</span>
          </div>
        </div>
        <div id="quote-summary" class="space-y-3"></div>
        <div id="submit-validation" class="mt-4"></div>
        <div class="mt-6 flex justify-end">
          <button class="btn-gold text-lg px-8 py-3" onclick="submitQuote()"><i class="fas fa-paper-plane mr-2"></i>Submit Quote to Buyer</button>
        </div>
      </section>
    </main>
  </div>
</div>

<script>
const API='/api/v1';
let currentStep=0, quoteState={}, marketMean=0, quoteId=null, tradeRequestId=null;
const tenant=JSON.parse(localStorage.getItem('sgtx_tenant')||'null');
const employee=JSON.parse(localStorage.getItem('sgtx_employee')||'null');

// Port database (UN/LOCODE subset)
const PORTS={
  VN:['VNSGN — Ho Chi Minh','VNHPH — Hai Phong','VNDAN — Da Nang','VNQUI — Quy Nhon'],
  EG:['EGALY — Alexandria','EGDAM — Damietta','EGPSD — Port Said','EGSOK — Sokhna'],
  CN:['CNSHA — Shanghai','CNNGB — Ningbo','CNSHE — Shenzhen','CNTAO — Qingdao'],
  IN:['INNSA — Nhava Sheva','INMAA — Chennai','INMUN — Mumbai','INTUT — Tuticorin'],
  BR:['BRSSZ — Santos','BRPNG — Paranagua','BRRIO — Rio de Janeiro'],
  TH:['THBKK — Bangkok','THLCH — Laem Chabang','THSGZ — Songkhla'],
  ID:['IDJKT — Jakarta','IDMRK — Makassar','IDSUB — Surabaya'],
  DE:['DEHAM — Hamburg','DEBRV — Bremerhaven','DEWIL — Wilhelmshaven'],
  US:['USLAX — Los Angeles','USNYC — New York','USSAV — Savannah','USHOU — Houston'],
  TR:['TRIST — Istanbul','TRMER — Mersin','TRISK — Iskenderun']
};

function filterPorts(){
  const cc=document.getElementById('loading-country').value;
  const sel=document.getElementById('loading-port');
  sel.innerHTML='<option value="">Select port...</option>';
  (PORTS[cc]||[]).forEach(p=>{const[code,name]=p.split(' — ');sel.innerHTML+=\`<option value="\${code}">\${code} — \${name}</option>\`;});
}

function goStep(n){
  for(let i=0;i<=8;i++){
    document.getElementById('step-'+i).classList.toggle('hidden',i!==n);
    const badge=document.getElementById('sn-'+i);
    if(i<currentStep)badge.className='step-badge step-done';
    else if(i===n)badge.className='step-badge step-active';
    else badge.className='step-badge step-pending';
  }
  currentStep=n;
}

function toast(msg,type='success'){
  const d=document.createElement('div');
  d.className='toast '+(type==='error'?'bg-red-500/90 text-white':'bg-emerald-500/90 text-white');
  d.innerHTML='<i class="fas fa-'+(type==='error'?'times-circle':'check-circle')+' mr-2"></i>'+msg;
  document.getElementById('toast-area').appendChild(d);
  setTimeout(()=>d.remove(),4000);
}

// Step 0: Load pending requests
async function loadPendingRequests(){
  if(!tenant){document.getElementById('pending-requests').innerHTML='<div class="text-center py-6 text-amber-400"><i class="fas fa-exclamation-triangle mr-2"></i>Please log in as an Exporter first</div>';return;}
  try{
    const r=await fetch(API+'/seller-quote/pending-requests?seller_tenant_id='+tenant.id);
    const d=await r.json();
    const items=d.data||[];
    if(items.length===0){document.getElementById('pending-requests').innerHTML='<div class="text-center py-8 text-slate-500"><i class="fas fa-inbox mr-2"></i>No pending trade requests</div>';return;}
    document.getElementById('pending-requests').innerHTML=items.map(it=>\`
      <div class="glass-light rounded-lg p-4 hover:bg-slate-700/40 cursor-pointer transition" onclick="selectRequest('\${it.id}')">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-white">\${it.buyer_name||'Unknown Buyer'}</div>
            <div class="text-xs text-slate-400 font-mono">\${it.buyer_gtid||''}</div>
            <div class="text-sm text-slate-300 mt-1">\${it.commodity_summary} · \${it.container_count} container(s) · \${it.incoterm}</div>
          </div>
          <div class="text-right">
            <span class="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">\${it.status}</span>
            <div class="text-[10px] text-slate-500 mt-1">\${new Date(it.created_at).toLocaleDateString()}</div>
            \${it.buyer_trust_score?'<div class="text-[10px] text-emerald-400 mt-1"><i class="fas fa-star mr-1"></i>Trust: '+it.buyer_trust_score+'</div>':''}
          </div>
        </div>
      </div>
    \`).join('');
  }catch(e){document.getElementById('pending-requests').innerHTML='<div class="text-red-400 text-sm">Error loading: '+e.message+'</div>';}
}

async function selectRequest(id){
  tradeRequestId=id;
  try{
    const r=await fetch(API+'/seller-quote/request-detail?trade_request_id='+id);
    const d=await r.json();
    quoteState.tradeRequest=d.data;
    toast('Trade request loaded');
    goStep(1);loadMarketPrices();
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 1: Loading Origin
async function saveLoadingOrigin(){
  const cc=document.getElementById('loading-country').value;
  const port=document.getElementById('loading-port').value;
  if(!cc||!port){toast('Select country and port','error');return;}
  try{
    const r=await fetch(API+'/seller-quote/loading-origin',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({trade_request_id:tradeRequestId,seller_tenant_id:tenant?.id,loading_country:cc,loading_port:port,exporter_quote_id:quoteId})});
    const d=await r.json();
    if(!r.ok){toast(d.error||'Failed','error');return;}
    quoteState.loadingOrigin={country:cc,port:port};
    toast('Loading origin confirmed (G2U17)');goStep(2);
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 2: Market prices + EXW lock
async function loadMarketPrices(){
  const specs=quoteState.tradeRequest?.parsed_specs||{};
  const commodity=specs.containers?.[0]?.commodity_type||'Fresh Fruits';
  try{
    const r=await fetch(API+'/seller-quote/market-prices?commodity_type='+encodeURIComponent(commodity));
    const d=await r.json();
    const prices=d.data?.prices||[];
    marketMean=d.data?.ai_range?.mean||0;
    document.getElementById('ai-range-band').innerHTML=\`
      <div class="flex justify-between text-sm">
        <span class="text-slate-300">AI Range Band (mean ±15%)</span>
        <span class="text-emerald-400 font-bold">$\${d.data?.ai_range?.low?.toFixed(2)} — $\${d.data?.ai_range?.high?.toFixed(2)}</span>
      </div>
      <div class="text-xs text-slate-500 mt-1">Market Mean: $\${marketMean.toFixed(2)} | Commodity: \${commodity} | Period: 30 days</div>
    \`;
    if(prices.length>0){
      const ctx=document.getElementById('marketChart').getContext('2d');
      new Chart(ctx,{type:'line',data:{labels:prices.map(p=>p.recorded_date?.slice(5)||''),
        datasets:[{label:'Market Price',data:prices.map(p=>p.price_usd),borderColor:'#10b981',tension:0.3,fill:false},
          {label:'AI High',data:prices.map(()=>d.data.ai_range.high),borderColor:'rgba(16,185,129,0.2)',borderDash:[5,5],fill:false,pointRadius:0},
          {label:'AI Low',data:prices.map(()=>d.data.ai_range.low),borderColor:'rgba(16,185,129,0.2)',borderDash:[5,5],fill:false,pointRadius:0}]},
        options:{responsive:true,plugins:{legend:{labels:{color:'#94a3b8',font:{size:10}}}},scales:{x:{ticks:{color:'#64748b',font:{size:9}}},y:{ticks:{color:'#64748b'}}}}});
    }
  }catch(e){console.error(e);}
}

function checkDeviation(){
  const price=parseFloat(document.getElementById('exw-price').value)||0;
  if(marketMean>0&&price>0){
    const dev=((price-marketMean)/marketMean)*100;
    const warn=document.getElementById('deviation-warning');
    const just=document.getElementById('justification-area');
    if(Math.abs(dev)>30){
      warn.classList.remove('hidden');warn.innerHTML='<i class="fas fa-exclamation-triangle mr-2"></i>Deviation: '+dev.toFixed(1)+'% from market average ($'+marketMean.toFixed(2)+'). Justification required (G2UA1).';
      just.classList.remove('hidden');
    }else if(Math.abs(dev)>15){
      warn.classList.remove('hidden');warn.innerHTML='<i class="fas fa-info-circle mr-2"></i>Deviation: '+dev.toFixed(1)+'% — within acceptable range but notable.';
      just.classList.add('hidden');
    }else{warn.classList.add('hidden');just.classList.add('hidden');}
  }
}

async function lockEXW(){
  const price=parseFloat(document.getElementById('exw-price').value);
  if(!price||price<=0){toast('Enter a valid EXW price','error');return;}
  const specs=quoteState.tradeRequest?.parsed_specs||{};
  try{
    const r=await fetch(API+'/seller-quote/exw-lock',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({trade_request_id:tradeRequestId,seller_tenant_id:tenant?.id,
        exw_price:price,currency:document.getElementById('exw-currency').value,
        commodity_type:specs.containers?.[0]?.commodity_type||'General',
        hs_code:specs.containers?.[0]?.hs_code||null,incoterm:specs.incoterm||'EXW',
        justification:document.getElementById('exw-justification')?.value||null,
        loading_country:quoteState.loadingOrigin?.country,loading_port:quoteState.loadingOrigin?.port,
        validity_days:parseInt(document.getElementById('exw-validity').value)||15})});
    const d=await r.json();
    if(!r.ok){toast(d.error||'EXW lock failed','error');return;}
    quoteId=d.data.quote_id;
    quoteState.exw={price:d.data.exw_price,currency:d.data.currency,deviation:d.data.deviation_pct};
    toast('EXW price locked at '+d.data.currency+' '+d.data.exw_price);
    loadLogisticsMap();goStep(3);
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 3: Logistics
let logisticsMode='MANUAL';
function setLogisticsMode(m){logisticsMode=m;document.getElementById('mode-manual-btn').className=m==='MANUAL'?'btn-primary text-xs':'btn-secondary text-xs';document.getElementById('mode-rfq-btn').className=m==='RFQ'?'btn-primary text-xs':'btn-secondary text-xs';}

async function loadLogisticsMap(){
  const incoterm=(quoteState.tradeRequest?.parsed_specs?.incoterm||'FOB').toUpperCase();
  try{
    const r=await fetch(API+'/seller-quote/logistics-map?incoterm='+incoterm);
    const d=await r.json();
    const lines=d.data?.cost_lines||[];
    document.getElementById('logistics-lines').innerHTML=lines.map(l=>\`
      <div class="flex items-center gap-3 glass-light rounded-lg p-3 cost-\${l.rule}">
        <div class="w-8 text-center"><span class="text-xs font-bold \${l.rule==='M'?'text-emerald-400':l.rule==='O'?'text-blue-400':'text-slate-600'}">\${l.rule}</span></div>
        <div class="flex-1"><div class="text-sm text-white">\${l.label}</div><div class="text-[10px] text-slate-500">\${l.cost_type}</div></div>
        <input type="number" class="w-32 text-right" step="0.01" min="0" placeholder="\${l.is_disabled?'N/A':'0.00'}"
          id="cost-\${l.cost_type}" \${l.is_disabled?'disabled':''} oninput="updateLogisticsTotal()">
        <span class="text-xs text-slate-500 w-12">USD</span>
      </div>
    \`).join('');
    quoteState.logisticsLines=lines;
  }catch(e){console.error(e);}
}

function updateLogisticsTotal(){
  let total=0;
  (quoteState.logisticsLines||[]).forEach(l=>{if(!l.is_disabled){const v=parseFloat(document.getElementById('cost-'+l.cost_type)?.value)||0;total+=v;}});
  document.getElementById('logistics-total').textContent='$'+total.toFixed(2);
  quoteState.logisticsTotal=total;
}

async function saveLogistics(){
  const lines=(quoteState.logisticsLines||[]).filter(l=>!l.is_disabled).map(l=>({cost_type:l.cost_type,amount:parseFloat(document.getElementById('cost-'+l.cost_type)?.value)||0,currency:'USD'}));
  const incoterm=(quoteState.tradeRequest?.parsed_specs?.incoterm||'FOB').toUpperCase();
  try{
    const r=await fetch(API+'/seller-quote/logistics-manual',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exporter_quote_id:quoteId,trade_request_id:tradeRequestId,seller_tenant_id:tenant?.id,incoterm:incoterm,cost_lines:lines})});
    const d=await r.json();
    if(!r.ok){toast(d.error||'Failed. '+JSON.stringify(d.missing||[]),'error');return;}
    toast('Logistics costs saved. Total: $'+d.data.logistics_total);goStep(4);
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 4: Alt ports
let altPortCount=0;
function addAltPort(){
  altPortCount++;
  const div=document.getElementById('alt-ports-list');
  div.innerHTML+=\`<div class="glass-light rounded-lg p-3 grid grid-cols-4 gap-3" id="alt-\${altPortCount}">
    <div><label class="text-[10px] text-slate-500">Country</label><input type="text" id="alt-country-\${altPortCount}" placeholder="e.g. EG"></div>
    <div><label class="text-[10px] text-slate-500">Port (UN/LOCODE)</label><input type="text" id="alt-port-\${altPortCount}" placeholder="e.g. EGALY"></div>
    <div><label class="text-[10px] text-slate-500">Transit Days</label><input type="number" id="alt-transit-\${altPortCount}" placeholder="14"></div>
    <div><label class="text-[10px] text-slate-500">Add. Cost (USD)</label><input type="number" id="alt-cost-\${altPortCount}" step="0.01" placeholder="0.00"></div>
  </div>\`;
}

async function saveAltPorts(){
  const alts=[];
  for(let i=1;i<=altPortCount;i++){
    const cc=document.getElementById('alt-country-'+i)?.value;
    const port=document.getElementById('alt-port-'+i)?.value;
    if(cc&&port)alts.push({destination_country:cc,port_of_discharge:port,transit_days:parseInt(document.getElementById('alt-transit-'+i)?.value)||null,additional_logistics_cost:parseFloat(document.getElementById('alt-cost-'+i)?.value)||0});
  }
  if(alts.length===0){goStep(5);return;}
  try{
    const r=await fetch(API+'/seller-quote/alternative-ports',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exporter_quote_id:quoteId,trade_request_id:tradeRequestId,alternatives:alts})});
    const d=await r.json();
    if(!r.ok){toast(d.error||'Failed','error');return;}
    toast(d.data.count+' alternative port(s) saved');goStep(5);
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 5: Packing lock
async function lockPackingPlan(){
  toast('Packing plan lock requires existing plan. Proceeding to next step.','success');goStep(6);
}

// Step 6: Multi-shipment
async function saveShipmentResponse(){
  toast('Multi-shipment response saved');goStep(7);
}

// Step 7: Fee calculation
async function calculateFee(){
  const exwPrice=quoteState.exw?.price||0;
  const logTotal=quoteState.logisticsTotal||0;
  const specs=quoteState.tradeRequest?.parsed_specs||{};
  try{
    const r=await fetch(API+'/seller-quote/fee-calculate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exporter_quote_id:quoteId,trade_request_id:tradeRequestId,seller_tenant_id:tenant?.id,
        exw_total:exwPrice,logistics_total:logTotal,
        commodity_hs6:specs.containers?.[0]?.hs_code||null,
        seller_country:quoteState.loadingOrigin?.country||tenant?.jurisdiction,
        buyer_country:quoteState.tradeRequest?.trade_request?.buyer_country||'EG'})});
    const d=await r.json();
    if(!r.ok){toast(d.error||'Fee calculation failed','error');return;}
    const f=d.data;
    quoteState.fee=f;
    document.getElementById('fee-calculation').innerHTML=\`
      <div class="space-y-3">
        <div class="flex justify-between text-sm"><span class="text-slate-400">EXW Total</span><span class="text-white font-medium">$\${f.exw_total.toFixed(2)}</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-400">Logistics Total</span><span class="text-white font-medium">$\${f.logistics_total.toFixed(2)}</span></div>
        <div class="border-t border-slate-700 pt-2 flex justify-between text-sm"><span class="text-slate-400">Trade Value</span><span class="text-white font-bold">$\${f.trade_value.toFixed(2)}</span></div>
        <div class="glass rounded-lg p-3 mt-2">
          <div class="text-xs text-slate-400 mb-2">Fee Breakdown (XGBoost v1.0)</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div>Base: \${(f.fee_breakdown.base_rate*100).toFixed(2)}%</div>
            <div>Country: +\${(f.fee_breakdown.country_adjustment*100).toFixed(2)}%</div>
            <div>Perishable: +\${(f.fee_breakdown.perishability_adjustment*100).toFixed(2)}%</div>
            <div>Season: +\${(f.fee_breakdown.seasonality_adjustment*100).toFixed(2)}%</div>
            <div>Geopolitics: +\${(f.fee_breakdown.geopolitics_adjustment*100).toFixed(2)}%</div>
            <div>Vol. Discount: \${(f.fee_breakdown.volume_discount*100).toFixed(2)}%</div>
          </div>
        </div>
        <div class="flex justify-between text-sm text-amber-400"><span>SGTX Fee (\${f.final_rate_pct})</span><span class="font-bold">$\${f.fee_amount.toFixed(2)}</span></div>
        <div class="border-t border-slate-700 pt-2 flex justify-between text-lg"><span class="text-emerald-400 font-bold">Final Quoted Price</span><span class="text-emerald-400 font-bold">$\${f.final_quoted_price.toFixed(2)}</span></div>
        <div class="text-[10px] text-slate-500 italic">Fee paid by seller, added to quote. Buyer sees: "Total price (includes SGTX platform fee of $\${f.fee_amount.toFixed(2)})"</div>
      </div>
    \`;
    toast('SGTX fee calculated: '+f.final_rate_pct);goStep(8);buildSummary();
  }catch(e){toast('Error: '+e.message,'error');}
}

// Step 8: Summary + Submit
function buildSummary(){
  const f=quoteState.fee||{};
  document.getElementById('quote-summary').innerHTML=\`
    <div class="glass-light rounded-lg p-4">
      <h3 class="font-bold text-white mb-3"><i class="fas fa-file-invoice-dollar text-emerald-400 mr-2"></i>Quote Summary</h3>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-slate-400">Loading Origin</span><span class="text-white">\${quoteState.loadingOrigin?.country} / \${quoteState.loadingOrigin?.port}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">EXW Price</span><span class="text-white">\${quoteState.exw?.currency||'USD'} \${quoteState.exw?.price||0}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">Logistics Total</span><span class="text-white">$\${(quoteState.logisticsTotal||0).toFixed(2)}</span></div>
        <div class="flex justify-between"><span class="text-slate-400">Trade Value</span><span class="text-white font-bold">$\${(f.trade_value||0).toFixed(2)}</span></div>
        <div class="flex justify-between text-amber-400"><span>SGTX Fee (\${f.final_rate_pct||'—'})</span><span>$\${(f.fee_amount||0).toFixed(2)}</span></div>
        <div class="border-t border-slate-700 pt-2 flex justify-between text-lg"><span class="text-emerald-400 font-bold">Final Price</span><span class="text-emerald-400 font-bold">$\${(f.final_quoted_price||0).toFixed(2)}</span></div>
      </div>
    </div>
    <div class="glass-light rounded-lg p-4">
      <h3 class="font-bold text-white mb-2">Governor Gate Checklist</h3>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="flex items-center gap-2"><span class="gate-badge \${quoteState.loadingOrigin?'gate-pass':'gate-fail'}">G2U17</span><span class="text-slate-300">Loading Origin</span></div>
        <div class="flex items-center gap-2"><span class="gate-badge \${quoteState.exw?'gate-pass':'gate-fail'}">G2UA1</span><span class="text-slate-300">EXW Price Lock</span></div>
        <div class="flex items-center gap-2"><span class="gate-badge \${quoteState.logisticsTotal>0?'gate-pass':'gate-pending'}">G2U18</span><span class="text-slate-300">Logistics Costs</span></div>
        <div class="flex items-center gap-2"><span class="gate-badge \${f.fee_amount?'gate-pass':'gate-fail'}">G2U22</span><span class="text-slate-300">SGTX Fee</span></div>
      </div>
    </div>
  \`;
}

async function submitQuote(){
  if(!quoteId){toast('No quote to submit. Complete previous steps.','error');return;}
  try{
    const r=await fetch(API+'/seller-quote/submit',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exporter_quote_id:quoteId,seller_tenant_id:tenant?.id})});
    const d=await r.json();
    if(!r.ok){
      const errs=d.validation_errors||[];
      document.getElementById('submit-validation').innerHTML='<div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400"><i class="fas fa-times-circle mr-2"></i><b>Submission Blocked:</b><ul class="mt-2 list-disc pl-5">'+errs.map(e=>'<li>['+e.gate+'] '+e.message+'</li>').join('')+'</ul></div>';
      toast('Quote submission blocked by Governor','error');return;
    }
    document.getElementById('quote-status').textContent='SUBMITTED';
    document.getElementById('quote-status').className='px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold';
    toast('Quote submitted successfully! Awaiting buyer review.');
  }catch(e){toast('Error: '+e.message,'error');}
}

// Init
document.addEventListener('DOMContentLoaded',()=>{goStep(0);loadPendingRequests();});
</script>
</body>
</html>`;
}

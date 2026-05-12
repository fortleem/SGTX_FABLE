// SGTX Platform v6.3 — Advanced Trade Request Form Page
// Part 3 Phase 1: Structured Container-Level Request Form
// Features: Bidirectional HS code auto-fill, packaging dropdowns with weight specs,
// port auto-population, transport mode, GTID lookup from saved contacts

export function tradeRequestFormHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SGTX v6.3 — New Trade Request</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    :root { --sgtx-primary: #0f172a; --sgtx-accent: #3b82f6; --sgtx-gold: #f59e0b; --sgtx-success: #10b981; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
    .glass { background: rgba(30,41,59,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(71,85,105,0.4); }
    .glass-light { background: rgba(30,41,59,0.6); border: 1px solid rgba(71,85,105,0.3); }
    select, input[type="text"], input[type="number"], textarea {
      background: rgba(15,23,42,0.8); border: 1px solid rgba(71,85,105,0.5); color: #e2e8f0;
      border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    select:focus, input:focus, textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.3); outline: none; }
    select option { background: #1e293b; color: #e2e8f0; }
    .btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 0.5rem;
      padding: 0.625rem 1.25rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
    .btn-secondary { background: rgba(71,85,105,0.5); color: #cbd5e1; border: 1px solid rgba(71,85,105,0.5);
      border-radius: 0.5rem; padding: 0.5rem 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .btn-secondary:hover { background: rgba(71,85,105,0.7); }
    .btn-danger { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);
      border-radius: 0.5rem; padding: 0.5rem 1rem; font-weight: 500; cursor: pointer; }
    .btn-danger:hover { background: rgba(239,68,68,0.3); }
    .btn-gold { background: linear-gradient(135deg, #f59e0b, #d97706); color: #1e293b; border: none;
      border-radius: 0.5rem; padding: 0.625rem 1.25rem; font-weight: 700; cursor: pointer; }
    .btn-gold:hover { background: linear-gradient(135deg, #d97706, #b45309); }
    .container-tab { cursor: pointer; padding: 0.5rem 1rem; border-radius: 0.5rem 0.5rem 0 0; font-weight: 500;
      background: rgba(30,41,59,0.5); border: 1px solid rgba(71,85,105,0.3); border-bottom: none; transition: all 0.2s; }
    .container-tab.active { background: rgba(59,130,246,0.2); border-color: #3b82f6; color: #60a5fa; }
    .autofill-badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; font-size: 0.7rem;
      padding: 0.125rem 0.5rem; border-radius: 9999px; margin-left: 0.5rem; }
    .weight-display { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 0.5rem;
      padding: 0.75rem; margin-top: 0.5rem; }
    .saved-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(59,130,246,0.15);
      color: #60a5fa; font-size: 0.75rem; padding: 0.25rem 0.625rem; border-radius: 9999px; }
    .search-dropdown { position: absolute; z-index: 50; background: #1e293b; border: 1px solid rgba(71,85,105,0.5);
      border-radius: 0.5rem; max-height: 240px; overflow-y: auto; width: 100%; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .search-dropdown-item { padding: 0.5rem 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(71,85,105,0.2); font-size: 0.875rem; }
    .search-dropdown-item:hover { background: rgba(59,130,246,0.15); }
    .transport-card { cursor: pointer; border: 2px solid rgba(71,85,105,0.4); border-radius: 0.75rem; padding: 1rem;
      text-align: center; transition: all 0.2s; min-width: 140px; }
    .transport-card.selected { border-color: #3b82f6; background: rgba(59,130,246,0.1); box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }
    .transport-card:hover { border-color: rgba(59,130,246,0.6); }
    .draft-indicator { position: fixed; bottom: 1rem; right: 1rem; z-index: 100; }
    @keyframes pulse-green { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
    .pulse-green { animation: pulse-green 2s ease-in-out; }
  </style>
</head>
<body class="min-h-screen">
  <!-- HEADER -->
  <header class="glass sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/app" class="text-slate-400 hover:text-white"><i class="fas fa-arrow-left"></i></a>
      <div>
        <h1 class="text-lg font-bold text-white flex items-center gap-2">
          <i class="fas fa-file-invoice text-blue-400"></i> New Trade Request
        </h1>
        <p class="text-xs text-slate-400">Part 3 Phase 1 — Structured Container-Level Request Form</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span id="draftStatus" class="text-xs text-slate-500"></span>
      <button onclick="saveDraft()" class="btn-secondary text-sm"><i class="fas fa-save mr-1"></i> Save Draft</button>
      <button onclick="submitTradeRequest()" class="btn-gold text-sm"><i class="fas fa-paper-plane mr-1"></i> Submit Request</button>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-6 space-y-6">

    <!-- STEP 0: TRANSPORT MODE SELECTION -->
    <section class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-truck-moving text-blue-400"></i> Transport Mode
      </h2>
      <div id="transportModes" class="flex flex-wrap gap-3">
        <div class="transport-card selected" data-mode="SEA_CARGO" onclick="selectTransport(this)">
          <i class="fas fa-ship text-2xl text-blue-400 mb-1"></i>
          <div class="text-sm font-semibold">Sea Cargo</div>
          <div class="text-xs text-slate-400">Ocean Freight</div>
        </div>
        <div class="transport-card" data-mode="AIR_CARGO" onclick="selectTransport(this)">
          <i class="fas fa-plane text-2xl text-purple-400 mb-1"></i>
          <div class="text-sm font-semibold">Air Cargo</div>
          <div class="text-xs text-slate-400">Air Freight</div>
        </div>
        <div class="transport-card" data-mode="INTERNATIONAL_TRUCKING" onclick="selectTransport(this)">
          <i class="fas fa-truck text-2xl text-green-400 mb-1"></i>
          <div class="text-sm font-semibold">Int'l Trucking</div>
          <div class="text-xs text-slate-400">Road Transport</div>
        </div>
        <div class="transport-card" data-mode="RAIL_CARGO" onclick="selectTransport(this)">
          <i class="fas fa-train text-2xl text-orange-400 mb-1"></i>
          <div class="text-sm font-semibold">Rail Cargo</div>
          <div class="text-xs text-slate-400">Rail Freight</div>
        </div>
        <div class="transport-card" data-mode="MULTIMODAL" onclick="selectTransport(this)">
          <i class="fas fa-random text-2xl text-yellow-400 mb-1"></i>
          <div class="text-sm font-semibold">Multimodal</div>
          <div class="text-xs text-slate-400">Combined</div>
        </div>
      </div>
    </section>

    <!-- STEP 1: SELLER / COUNTERPARTY SELECTION -->
    <section class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-handshake text-amber-400"></i> Seller / Counterparty
        <span class="text-xs text-slate-400 font-normal">(Step 1.1)</span>
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="relative">
          <label class="block text-xs text-slate-400 mb-1">GTID <span class="text-slate-500">(enter or select from contacts)</span></label>
          <input type="text" id="sellerGtid" placeholder="SGTX-XX-XX-XXXX-XXXX or search..." autocomplete="off"
            oninput="onSellerGtidInput(this.value)" onfocus="onSellerGtidInput(this.value)">
          <div id="gtidDropdown" class="search-dropdown hidden"></div>
        </div>
        <div class="relative">
          <label class="block text-xs text-slate-400 mb-1">Company Name <span class="text-slate-500">(or search by name)</span></label>
          <input type="text" id="sellerCompanyName" placeholder="Type company name..." autocomplete="off"
            oninput="onCompanyNameInput(this.value)" onfocus="onCompanyNameInput(this.value)">
          <div id="companyDropdown" class="search-dropdown hidden"></div>
        </div>
      </div>
      <div id="sellerInfo" class="hidden mt-3 glass-light rounded-lg p-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <i class="fas fa-building text-blue-400"></i>
          </div>
          <div>
            <div class="font-semibold text-white text-sm" id="sellerInfoName"></div>
            <div class="text-xs text-slate-400"><span id="sellerInfoGtid"></span> · <span id="sellerInfoJurisdiction"></span></div>
          </div>
          <div id="sellerInfoBadges" class="flex gap-2 ml-auto"></div>
        </div>
      </div>
    </section>

    <!-- STEP 2: CONTAINERS -->
    <section class="glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-white flex items-center gap-2">
          <i class="fas fa-box text-green-400"></i> Containers & Commodities
          <span class="text-xs text-slate-400 font-normal">(Step 1.2)</span>
        </h2>
        <div class="flex items-center gap-3">
          <label class="text-xs text-slate-400">Containers:</label>
          <input type="number" id="containerCount" min="1" max="50" value="1" class="w-16 text-center"
            onchange="updateContainerCount(parseInt(this.value))">
          <button onclick="addContainer()" class="btn-secondary text-xs"><i class="fas fa-plus mr-1"></i> Add</button>
        </div>
      </div>

      <!-- Container Tabs -->
      <div id="containerTabs" class="flex flex-wrap gap-1 mb-3"></div>

      <!-- Container Forms (dynamic) -->
      <div id="containerForms"></div>
    </section>

    <!-- GLOBAL NOTES -->
    <section class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-sticky-note text-slate-400"></i> Additional Notes
      </h2>
      <textarea id="globalNotes" rows="3" maxlength="1000" placeholder="Special instructions for the entire trade (e.g., Seller to provide phytosanitary certificate. Insurance required.)"></textarea>
      <div class="text-xs text-slate-500 mt-1 text-right"><span id="notesCount">0</span>/1000</div>
    </section>

    <!-- SUMMARY -->
    <section id="summarySection" class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-chart-bar text-blue-400"></i> Trade Summary
      </h2>
      <div id="tradeSummary" class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-blue-400" id="sumContainers">1</div>
          <div class="text-xs text-slate-400">Containers</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-green-400" id="sumCommodities">0</div>
          <div class="text-xs text-slate-400">Commodities</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-amber-400" id="sumGrossWeight">0</div>
          <div class="text-xs text-slate-400">Total Gross (kg)</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-purple-400" id="sumTransport">Sea</div>
          <div class="text-xs text-slate-400">Transport Mode</div>
        </div>
      </div>
    </section>

    <!-- SUBMIT -->
    <div class="flex items-center justify-between">
      <button onclick="saveDraft()" class="btn-secondary"><i class="fas fa-save mr-2"></i> Save as Draft</button>
      <button onclick="submitTradeRequest()" class="btn-gold text-lg px-8 py-3">
        <i class="fas fa-paper-plane mr-2"></i> Submit Trade Request
      </button>
    </div>
  </main>

  <!-- DRAFT AUTO-SAVE INDICATOR -->
  <div id="draftIndicator" class="draft-indicator hidden">
    <div class="glass rounded-lg px-3 py-2 text-xs text-green-400 flex items-center gap-2">
      <i class="fas fa-check-circle"></i> Draft saved
    </div>
  </div>

  <script>
  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  const API = '/api/v1';
  let STATE = {
    tenantId: null,
    draftId: null,
    transportMode: 'SEA_CARGO',
    sellerGtid: null,
    sellerCompanyName: null,
    containers: [createEmptyContainer(0)],
    activeContainer: 0,
    countries: [],
    commodityTypes: [],
    packagingTypes: [],
    allProducts: [],
    autoSaveTimer: null,
    lastSaved: null,
  };

  function createEmptyContainer(index) {
    return {
      index, container_type: '40ft_HC',
      origin_country: '', destination_country: '',
      port_of_loading: '', port_of_discharge: '',
      port_of_loading_unlocode: '', port_of_discharge_unlocode: '',
      palletized: true, pallet_size: '120x100',
      transport_mode: null, destination_override: '', notes: '',
      commodities: [createEmptyCommodity(0)],
    };
  }

  function createEmptyCommodity(index) {
    return {
      index, commodity_type: '', product_name: '', hs_code: '',
      product_specification: '', packaging_code: '', packaging_description: '',
      packaging_custom: '', net_weight_per_unit: null, gross_weight_per_unit: null,
      tare_weight_per_unit: 0, total_units: null, total_net_weight: null,
      total_gross_weight: null, weight_unit: 'KG', quantity_type: 'WEIGHT',
      quantity_value: null, num_pallets: 1,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
    // Parse tenant_id from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    STATE.tenantId = params.get('tenant_id') || localStorage.getItem('sgtx_tenant_id') || null;
    STATE.draftId = params.get('draft_id') || null;

    // Load reference data in parallel
    const [countriesRes, commoditiesRes, productsRes, packagingRes] = await Promise.all([
      fetch(API + '/ref/countries').then(r => r.json()),
      fetch(API + '/ref/commodity-types').then(r => r.json()),
      fetch(API + '/ref/products').then(r => r.json()),
      fetch(API + '/trade-form/packaging').then(r => r.json()).catch(() => fetch(API + '/ref/packaging').then(r => r.json())),
    ]);

    STATE.countries = countriesRes.data || [];
    STATE.commodityTypes = commoditiesRes.data || [];
    STATE.allProducts = productsRes.data || [];
    STATE.packagingTypes = packagingRes.data || [];

    // Load draft if specified
    if (STATE.draftId && STATE.tenantId) {
      try {
        const draftRes = await fetch(API + '/trade-form/draft-load?tenant_id=' + STATE.tenantId + '&draft_id=' + STATE.draftId).then(r => r.json());
        if (draftRes.data?.form_data) {
          loadDraftData(draftRes.data);
        }
      } catch (e) { console.warn('Failed to load draft:', e); }
    }

    renderContainerTabs();
    renderContainerForm(0);
    updateSummary();

    // Auto-save every 30s
    STATE.autoSaveTimer = setInterval(() => {
      if (STATE.tenantId && hasFormData()) saveDraft(true);
    }, 30000);

    // Notes counter
    document.getElementById('globalNotes').addEventListener('input', function() {
      document.getElementById('notesCount').textContent = this.value.length;
    });
  });

  function hasFormData() {
    return STATE.containers.some(c => c.origin_country || c.destination_country ||
      c.commodities.some(cm => cm.commodity_type || cm.product_name));
  }

  function loadDraftData(draft) {
    const fd = draft.form_data;
    if (fd.transport_mode) { STATE.transportMode = fd.transport_mode; selectTransportByMode(fd.transport_mode); }
    if (fd.seller_gtid) { STATE.sellerGtid = fd.seller_gtid; document.getElementById('sellerGtid').value = fd.seller_gtid; }
    if (fd.seller_company_name) { STATE.sellerCompanyName = fd.seller_company_name; document.getElementById('sellerCompanyName').value = fd.seller_company_name; }
    if (fd.containers?.length) {
      STATE.containers = fd.containers.map((c, i) => ({
        ...createEmptyContainer(i), ...c, index: i,
        commodities: (c.commodities || [createEmptyCommodity(0)]).map((cm, j) => ({ ...createEmptyCommodity(j), ...cm, index: j })),
      }));
      document.getElementById('containerCount').value = STATE.containers.length;
    }
    STATE.draftId = draft.draft_id;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRANSPORT MODE
  // ═══════════════════════════════════════════════════════════════════
  function selectTransport(el) {
    document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    STATE.transportMode = el.dataset.mode;
    updateSummary();
    // Re-render port dropdowns for active container
    renderContainerForm(STATE.activeContainer);
  }

  function selectTransportByMode(mode) {
    const card = document.querySelector('.transport-card[data-mode="' + mode + '"]');
    if (card) selectTransport(card);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELLER GTID SEARCH (from saved contacts or manual)
  // ═══════════════════════════════════════════════════════════════════
  let gtidSearchTimeout;
  async function onSellerGtidInput(val) {
    clearTimeout(gtidSearchTimeout);
    if (val.length < 1) { hideDropdown('gtidDropdown'); return; }
    gtidSearchTimeout = setTimeout(async () => {
      const dd = document.getElementById('gtidDropdown');
      let items = [];
      // Search saved contacts first
      if (STATE.tenantId) {
        try {
          const res = await fetch(API + '/trade-form/contacts-search?tenant_id=' + STATE.tenantId + '&q=' + encodeURIComponent(val)).then(r => r.json());
          items = (res.data || []).map(c => ({
            label: c.gtid + ' — ' + c.company_name,
            sublabel: c.jurisdiction + ' · ' + c.trade_count + ' trades' + (c.is_favorite ? ' ⭐' : ''),
            gtid: c.gtid, company_name: c.company_name, jurisdiction: c.jurisdiction,
          }));
        } catch(e) {}
      }
      // Also try GTID resolve for exact match
      if (val.startsWith('SGTX-') && val.length > 10) {
        try {
          const res = await fetch(API + '/trade-form/gtid-resolve?gtid=' + encodeURIComponent(val)).then(r => r.json());
          if (res.data) {
            const exists = items.some(i => i.gtid === res.data.gtid);
            if (!exists) items.unshift({
              label: res.data.gtid + ' — ' + res.data.company_name,
              sublabel: res.data.jurisdiction + (res.data.sanctions_clear ? ' ✅ Sanctions Clear' : ' ⚠️ Sanctions Flag'),
              gtid: res.data.gtid, company_name: res.data.company_name, jurisdiction: res.data.jurisdiction,
            });
          }
        } catch(e) {}
      }
      if (items.length === 0) { hideDropdown('gtidDropdown'); return; }
      dd.innerHTML = items.map(item => '<div class="search-dropdown-item" onclick="selectSeller(\\'' + item.gtid.replace(/'/g,"\\\\'") + '\\',\\'' + item.company_name.replace(/'/g,"\\\\'") + '\\',\\'' + (item.jurisdiction||'').replace(/'/g,"\\\\'") + '\\')">' +
        '<div class="font-medium text-white">' + escHtml(item.label) + '</div>' +
        '<div class="text-xs text-slate-400">' + escHtml(item.sublabel) + '</div></div>').join('');
      dd.classList.remove('hidden');
    }, 300);
  }

  let companySearchTimeout;
  async function onCompanyNameInput(val) {
    clearTimeout(companySearchTimeout);
    if (val.length < 2) { hideDropdown('companyDropdown'); return; }
    companySearchTimeout = setTimeout(async () => {
      const dd = document.getElementById('companyDropdown');
      let items = [];
      if (STATE.tenantId) {
        try {
          const res = await fetch(API + '/trade-form/contacts-search?tenant_id=' + STATE.tenantId + '&q=' + encodeURIComponent(val)).then(r => r.json());
          items = (res.data || []).map(c => ({
            label: c.company_name + ' (' + c.gtid + ')',
            sublabel: c.jurisdiction + ' · ' + c.relationship_type,
            gtid: c.gtid, company_name: c.company_name, jurisdiction: c.jurisdiction,
          }));
        } catch(e) {}
      }
      if (items.length === 0) { hideDropdown('companyDropdown'); return; }
      dd.innerHTML = items.map(item => '<div class="search-dropdown-item" onclick="selectSeller(\\'' + item.gtid.replace(/'/g,"\\\\'") + '\\',\\'' + item.company_name.replace(/'/g,"\\\\'") + '\\',\\'' + (item.jurisdiction||'').replace(/'/g,"\\\\'") + '\\')">' +
        '<div class="font-medium text-white">' + escHtml(item.label) + '</div>' +
        '<div class="text-xs text-slate-400">' + escHtml(item.sublabel) + '</div></div>').join('');
      dd.classList.remove('hidden');
    }, 300);
  }

  function selectSeller(gtid, name, jurisdiction) {
    STATE.sellerGtid = gtid;
    STATE.sellerCompanyName = name;
    document.getElementById('sellerGtid').value = gtid;
    document.getElementById('sellerCompanyName').value = name;
    hideDropdown('gtidDropdown');
    hideDropdown('companyDropdown');
    // Show seller info
    const info = document.getElementById('sellerInfo');
    info.classList.remove('hidden');
    document.getElementById('sellerInfoName').textContent = name;
    document.getElementById('sellerInfoGtid').textContent = gtid;
    document.getElementById('sellerInfoJurisdiction').textContent = jurisdiction || '';
    document.getElementById('sellerInfoBadges').innerHTML =
      '<span class="saved-badge"><i class="fas fa-check-circle"></i> Verified</span>';
  }

  function hideDropdown(id) { document.getElementById(id).classList.add('hidden'); }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sellerGtid') && !e.target.closest('#gtidDropdown')) hideDropdown('gtidDropdown');
    if (!e.target.closest('#sellerCompanyName') && !e.target.closest('#companyDropdown')) hideDropdown('companyDropdown');
  });

  // ═══════════════════════════════════════════════════════════════════
  // CONTAINER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  function addContainer() {
    const idx = STATE.containers.length;
    STATE.containers.push(createEmptyContainer(idx));
    document.getElementById('containerCount').value = STATE.containers.length;
    renderContainerTabs();
    switchContainer(idx);
    updateSummary();
  }

  function updateContainerCount(count) {
    count = Math.max(1, Math.min(50, count || 1));
    while (STATE.containers.length < count) STATE.containers.push(createEmptyContainer(STATE.containers.length));
    while (STATE.containers.length > count) STATE.containers.pop();
    if (STATE.activeContainer >= count) STATE.activeContainer = count - 1;
    document.getElementById('containerCount').value = count;
    renderContainerTabs();
    renderContainerForm(STATE.activeContainer);
    updateSummary();
  }

  function cloneContainer(idx) {
    const src = STATE.containers[idx];
    const clone = JSON.parse(JSON.stringify(src));
    clone.index = STATE.containers.length;
    clone.commodities = clone.commodities.map((cm, i) => ({ ...cm, index: i }));
    STATE.containers.push(clone);
    document.getElementById('containerCount').value = STATE.containers.length;
    renderContainerTabs();
    switchContainer(STATE.containers.length - 1);
    updateSummary();
  }

  function removeContainer(idx) {
    if (STATE.containers.length <= 1) return;
    STATE.containers.splice(idx, 1);
    STATE.containers.forEach((c, i) => c.index = i);
    if (STATE.activeContainer >= STATE.containers.length) STATE.activeContainer = STATE.containers.length - 1;
    document.getElementById('containerCount').value = STATE.containers.length;
    renderContainerTabs();
    renderContainerForm(STATE.activeContainer);
    updateSummary();
  }

  function switchContainer(idx) {
    saveCurrentContainerState();
    STATE.activeContainer = idx;
    renderContainerTabs();
    renderContainerForm(idx);
  }

  function renderContainerTabs() {
    const tabs = document.getElementById('containerTabs');
    tabs.innerHTML = STATE.containers.map((c, i) =>
      '<div class="container-tab ' + (i === STATE.activeContainer ? 'active' : '') + '" onclick="switchContainer(' + i + ')">' +
      '<i class="fas fa-box-open mr-1 text-xs"></i> Container ' + (i + 1) +
      (c.origin_country ? ' <span class=\\'text-xs text-slate-500\\'>' + c.origin_country + '→' + c.destination_country + '</span>' : '') +
      '</div>'
    ).join('');
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTAINER FORM RENDERING
  // ═══════════════════════════════════════════════════════════════════
  function renderContainerForm(idx) {
    const c = STATE.containers[idx];
    if (!c) return;
    const form = document.getElementById('containerForms');
    const countriesOpts = '<option value="">Select country...</option>' +
      STATE.countries.map(ct => '<option value="' + ct.code + '"' + (ct.code === c.origin_country ? ' selected' : '') + '>' + escHtml(ct.name) + '</option>').join('');
    const countriesOptsDest = '<option value="">Select country...</option>' +
      STATE.countries.map(ct => '<option value="' + ct.code + '"' + (ct.code === c.destination_country ? ' selected' : '') + '>' + escHtml(ct.name) + '</option>').join('');

    form.innerHTML = '<div class="glass-light rounded-xl p-4 space-y-4">' +
      // Top bar
      '<div class="flex items-center justify-between">' +
        '<h3 class="font-semibold text-white">Container ' + (idx + 1) + '</h3>' +
        '<div class="flex gap-2">' +
          '<button onclick="cloneContainer(' + idx + ')" class="btn-secondary text-xs"><i class="fas fa-clone mr-1"></i> Clone</button>' +
          (STATE.containers.length > 1 ? '<button onclick="removeContainer(' + idx + ')" class="btn-danger text-xs"><i class="fas fa-trash mr-1"></i> Remove</button>' : '') +
        '</div>' +
      '</div>' +
      // Container fields
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Container Type</label>' +
          '<select id="ct_type" onchange="updateContainerField(' + idx + ',\\'container_type\\',this.value)">' +
            ['20ft','40ft','40ft_HC','20ft_RF','40ft_RF','40ft_HC_RF','20ft_OT','40ft_OT','20ft_FR','40ft_FR','20ft_Tank'].map(t =>
              '<option value="' + t + '"' + (t === c.container_type ? ' selected' : '') + '>' + t.replace(/_/g,' ') + '</option>').join('') +
          '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Country of Origin</label>' +
          '<select id="ct_origin" onchange="onOriginCountryChange(' + idx + ',this.value)">' + countriesOpts.replace('value="' + c.origin_country + '"', 'value="' + c.origin_country + '" selected') + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Destination Country</label>' +
          '<select id="ct_dest" onchange="onDestCountryChange(' + idx + ',this.value)">' + countriesOptsDest.replace('value="' + c.destination_country + '"', 'value="' + c.destination_country + '" selected') + '</select></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Port of Loading <span class="autofill-badge" id="polBadge_' + idx + '">auto</span></label>' +
          '<select id="ct_pol_' + idx + '" onchange="updateContainerField(' + idx + ',\\'port_of_loading\\',this.value)">' +
            '<option value="">Select port...</option></select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Port of Discharge <span class="autofill-badge" id="podBadge_' + idx + '">auto</span></label>' +
          '<select id="ct_pod_' + idx + '" onchange="updateContainerField(' + idx + ',\\'port_of_discharge\\',this.value)">' +
            '<option value="">Select port...</option></select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Palletized?</label>' +
          '<div class="flex items-center gap-3 mt-1">' +
            '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="pallet_' + idx + '" value="1"' + (c.palletized ? ' checked' : '') + ' onchange="updateContainerField(' + idx + ',\\'palletized\\',true)"> <span class="text-sm">Yes</span></label>' +
            '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="pallet_' + idx + '" value="0"' + (!c.palletized ? ' checked' : '') + ' onchange="updateContainerField(' + idx + ',\\'palletized\\',false)"> <span class="text-sm">No</span></label>' +
          '</div></div>' +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Pallet Size</label>' +
          '<select id="ct_palletSize" onchange="updateContainerField(' + idx + ',\\'pallet_size\\',this.value)">' +
            [['120x100','1200x1000 EUR2/ISO1'],['120x80','1200x800 EUR/EPAL'],['114x114','1140x1140 AUS'],['110x110','1100x1100 Asia'],['122x102','1219x1016 US/GMA']].map(([v,l]) =>
              '<option value="' + v + '"' + (v === c.pallet_size ? ' selected' : '') + '>' + l + '</option>').join('') +
          '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Destination Override</label>' +
          '<input type="text" id="ct_destOverride" value="' + escHtml(c.destination_override || '') + '" placeholder="e.g. Alexandria Free Zone" onchange="updateContainerField(' + idx + ',\\'destination_override\\',this.value)"></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Container Notes</label>' +
          '<input type="text" id="ct_notes" value="' + escHtml(c.notes || '') + '" placeholder="e.g. Expedite customs" onchange="updateContainerField(' + idx + ',\\'notes\\',this.value)"></div>' +
      '</div>' +
      // Commodities section
      '<div class="border-t border-slate-700 pt-4 mt-2">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<h4 class="text-sm font-semibold text-slate-300"><i class="fas fa-wheat-awn mr-1 text-amber-400"></i> Commodities in this Container</h4>' +
          '<button onclick="addCommodity(' + idx + ')" class="btn-secondary text-xs"><i class="fas fa-plus mr-1"></i> Add Commodity</button>' +
        '</div>' +
        '<div id="commodities_' + idx + '">' + c.commodities.map((cm, ci) => renderCommodityRow(idx, ci, cm)).join('') + '</div>' +
      '</div>' +
    '</div>';

    // Load ports for origin/destination if already set
    if (c.origin_country) loadPorts(idx, 'origin', c.origin_country, c.port_of_loading);
    if (c.destination_country) loadPorts(idx, 'destination', c.destination_country, c.port_of_discharge);
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMMODITY ROW — Bidirectional auto-fill
  // ═══════════════════════════════════════════════════════════════════
  function renderCommodityRow(cIdx, cmIdx, cm) {
    const typeOpts = '<option value="">Select type...</option>' +
      STATE.commodityTypes.map(ct => '<option value="' + ct.type + '"' + (ct.type === cm.commodity_type ? ' selected' : '') + '>' + escHtml(ct.label) + '</option>').join('');

    // Get products for current type
    const productsForType = cm.commodity_type
      ? (STATE.commodityTypes.find(ct => ct.type === cm.commodity_type)?.products || [])
      : [];
    const productOpts = '<option value="">Select product...</option>' +
      productsForType.map(p => '<option value="' + escHtml(p.name) + '" data-hs="' + p.hs_code + '"' + (p.name === cm.product_name ? ' selected' : '') + '>' + escHtml(p.name) + ' (' + p.hs_code + ')</option>').join('') +
      '<option value="__OTHER__">Other (free text)</option>';

    // Packaging grouped by category
    const pkgCategories = {};
    STATE.packagingTypes.forEach(p => {
      const cat = p.category || 'OTHER';
      if (!pkgCategories[cat]) pkgCategories[cat] = [];
      pkgCategories[cat].push(p);
    });
    let pkgOpts = '<option value="">Select packaging...</option>';
    for (const [cat, pkgs] of Object.entries(pkgCategories)) {
      pkgOpts += '<optgroup label="' + cat.replace(/_/g,' ') + '">';
      pkgOpts += pkgs.map(p => '<option value="' + (p.code || p.id) + '" data-net="' + (p.default_net_weight_kg || '') + '" data-tare="' + (p.tare_weight_kg || 0) + '"' + ((p.code || p.id) === cm.packaging_code ? ' selected' : '') + '>' + escHtml(p.label) + '</option>').join('');
      pkgOpts += '</optgroup>';
    }

    const weightUnitOpts = ['KG','TONS','LBS'].map(u => '<option value="' + u + '"' + (u === (cm.weight_unit||'KG') ? ' selected' : '') + '>' + u + '</option>').join('');
    const qtyTypeOpts = ['WEIGHT','UNITS'].map(t => '<option value="' + t + '"' + (t === (cm.quantity_type||'WEIGHT') ? ' selected' : '') + '>' + t + '</option>').join('');

    return '<div class="glass-light rounded-lg p-3 mb-2" id="cmRow_' + cIdx + '_' + cmIdx + '">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<span class="text-xs font-semibold text-slate-400">Commodity ' + (cmIdx + 1) + '</span>' +
        (STATE.containers[cIdx].commodities.length > 1 ?
          '<button onclick="removeCommodity(' + cIdx + ',' + cmIdx + ')" class="text-red-400 hover:text-red-300 text-xs"><i class="fas fa-times"></i></button>' : '') +
      '</div>' +
      // Row 1: Type, Product, HS Code (bidirectional)
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Commodity Type</label>' +
          '<select onchange="onCommodityTypeChange(' + cIdx + ',' + cmIdx + ',this.value)">' + typeOpts + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Product <span class="autofill-badge">auto-fill</span></label>' +
          '<select id="product_' + cIdx + '_' + cmIdx + '" onchange="onProductChange(' + cIdx + ',' + cmIdx + ',this)">' + productOpts + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">HS Code <span class="autofill-badge">bidirectional</span></label>' +
          '<input type="text" id="hsCode_' + cIdx + '_' + cmIdx + '" value="' + escHtml(cm.hs_code || '') + '" placeholder="e.g. 0805.10" onchange="onHsCodeChange(' + cIdx + ',' + cmIdx + ',this.value)"></div>' +
      '</div>' +
      // Row 2: Specification, Packaging
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Specification</label>' +
          '<input type="text" value="' + escHtml(cm.product_specification || '') + '" placeholder="Grade A, Size 72-80mm" onchange="updateCmField(' + cIdx + ',' + cmIdx + ',\\'product_specification\\',this.value)"></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Packaging</label>' +
          '<select id="pkg_' + cIdx + '_' + cmIdx + '" onchange="onPackagingChange(' + cIdx + ',' + cmIdx + ',this)">' + pkgOpts + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Net Weight / Unit (kg)</label>' +
          '<input type="number" id="netWt_' + cIdx + '_' + cmIdx + '" step="0.01" value="' + (cm.net_weight_per_unit || '') + '" placeholder="e.g. 25" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')"></div>' +
      '</div>' +
      // Row 3: Quantity, Weight calculation
      '<div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Quantity Type</label>' +
          '<select id="qtyType_' + cIdx + '_' + cmIdx + '" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')">' + qtyTypeOpts + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Quantity Value</label>' +
          '<input type="number" id="qtyVal_' + cIdx + '_' + cmIdx + '" step="0.01" value="' + (cm.quantity_value || '') + '" placeholder="e.g. 25000 or 2200" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')"></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Unit</label>' +
          '<select id="wtUnit_' + cIdx + '_' + cmIdx + '" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')">' + weightUnitOpts + '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Pallets</label>' +
          '<input type="number" id="numPal_' + cIdx + '_' + cmIdx + '" min="0" value="' + (cm.num_pallets || 1) + '" onchange="updateCmField(' + cIdx + ',' + cmIdx + ',\\'num_pallets\\',parseInt(this.value))"></div>' +
      '</div>' +
      // Weight summary
      '<div class="weight-display" id="weightSummary_' + cIdx + '_' + cmIdx + '">' +
        '<div class="grid grid-cols-4 gap-2 text-xs">' +
          '<div><span class="text-slate-400">Gross/Unit:</span> <span class="text-amber-400 font-semibold" id="grossUnit_' + cIdx + '_' + cmIdx + '">' + (cm.gross_weight_per_unit ? cm.gross_weight_per_unit.toFixed(2) + ' kg' : '—') + '</span></div>' +
          '<div><span class="text-slate-400">Total Units:</span> <span class="text-blue-400 font-semibold" id="totalUnits_' + cIdx + '_' + cmIdx + '">' + (cm.total_units || '—') + '</span></div>' +
          '<div><span class="text-slate-400">Total Net:</span> <span class="text-green-400 font-semibold" id="totalNet_' + cIdx + '_' + cmIdx + '">' + (cm.total_net_weight ? formatWeight(cm.total_net_weight, cm.weight_unit) : '—') + '</span></div>' +
          '<div><span class="text-slate-400">Total Gross:</span> <span class="text-amber-400 font-bold" id="totalGross_' + cIdx + '_' + cmIdx + '">' + (cm.total_gross_weight ? formatWeight(cm.total_gross_weight, cm.weight_unit) : '—') + '</span></div>' +
        '</div>' +
        '<div class="text-xs text-slate-500 mt-1" id="pkgDesc_' + cIdx + '_' + cmIdx + '">' + escHtml(cm.packaging_description || '') + '</div>' +
      '</div>' +
    '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════
  // BIDIRECTIONAL AUTO-FILL HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  // Commodity Type → populate products dropdown
  function onCommodityTypeChange(cIdx, cmIdx, type) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    cm.commodity_type = type;
    cm.product_name = ''; cm.hs_code = ''; // Reset when type changes
    // Re-render this commodity's product dropdown
    const productSel = document.getElementById('product_' + cIdx + '_' + cmIdx);
    if (productSel) {
      const products = STATE.commodityTypes.find(ct => ct.type === type)?.products || [];
      productSel.innerHTML = '<option value="">Select product...</option>' +
        products.map(p => '<option value="' + escHtml(p.name) + '" data-hs="' + p.hs_code + '">' + escHtml(p.name) + ' (' + p.hs_code + ')</option>').join('') +
        '<option value="__OTHER__">Other (free text)</option>';
    }
    document.getElementById('hsCode_' + cIdx + '_' + cmIdx).value = '';
    updateSummary();
  }

  // Product selection → auto-fill HS code
  function onProductChange(cIdx, cmIdx, sel) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const val = sel.value;
    if (val === '__OTHER__') {
      cm.product_name = prompt('Enter custom product name:') || '';
      cm.hs_code = '';
    } else {
      cm.product_name = val;
      // Get HS code from selected option's data attribute
      const opt = sel.options[sel.selectedIndex];
      cm.hs_code = opt?.dataset?.hs || '';
    }
    document.getElementById('hsCode_' + cIdx + '_' + cmIdx).value = cm.hs_code;
    updateSummary();
  }

  // HS Code manual entry → reverse lookup: auto-fill commodity type & product
  async function onHsCodeChange(cIdx, cmIdx, hsCode) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    cm.hs_code = hsCode;
    if (hsCode.length < 4) return;

    // Search in local reference data first
    const normalized = hsCode.replace(/\\./g, '');
    for (const ct of STATE.commodityTypes) {
      for (const p of ct.products) {
        const pNorm = p.hs_code.replace(/\\./g, '');
        if (pNorm === normalized || pNorm.startsWith(normalized) || normalized.startsWith(pNorm)) {
          cm.commodity_type = ct.type;
          cm.product_name = p.name;
          // Update dropdowns
          renderContainerForm(cIdx); // Full re-render to update dependent dropdowns
          return;
        }
      }
    }

    // Try API search
    try {
      const res = await fetch(API + '/ref/hs-search?q=' + encodeURIComponent(hsCode)).then(r => r.json());
      if (res.data?.length > 0) {
        const match = res.data[0];
        cm.commodity_type = match.commodity_type;
        cm.product_name = match.name;
        renderContainerForm(cIdx);
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // PACKAGING & WEIGHT HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  function onPackagingChange(cIdx, cmIdx, sel) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const opt = sel.options[sel.selectedIndex];
    cm.packaging_code = sel.value;
    const netWt = parseFloat(opt?.dataset?.net);
    const tareWt = parseFloat(opt?.dataset?.tare) || 0;
    cm.tare_weight_per_unit = tareWt;
    if (netWt && !isNaN(netWt)) {
      cm.net_weight_per_unit = netWt;
      document.getElementById('netWt_' + cIdx + '_' + cmIdx).value = netWt;
    }
    onWeightChange(cIdx, cmIdx);
  }

  function onWeightChange(cIdx, cmIdx) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const netWtEl = document.getElementById('netWt_' + cIdx + '_' + cmIdx);
    const qtyTypeEl = document.getElementById('qtyType_' + cIdx + '_' + cmIdx);
    const qtyValEl = document.getElementById('qtyVal_' + cIdx + '_' + cmIdx);
    const wtUnitEl = document.getElementById('wtUnit_' + cIdx + '_' + cmIdx);

    cm.net_weight_per_unit = parseFloat(netWtEl?.value) || null;
    cm.quantity_type = qtyTypeEl?.value || 'WEIGHT';
    cm.quantity_value = parseFloat(qtyValEl?.value) || null;
    cm.weight_unit = wtUnitEl?.value || 'KG';

    calculateWeights(cIdx, cmIdx);
  }

  function calculateWeights(cIdx, cmIdx) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const netPerUnit = cm.net_weight_per_unit || 0;
    const tarePerUnit = cm.tare_weight_per_unit || 0;
    const grossPerUnit = netPerUnit + tarePerUnit;
    cm.gross_weight_per_unit = grossPerUnit;

    let totalUnits = 0, totalNet = 0, totalGross = 0;

    if (cm.quantity_type === 'UNITS' && cm.quantity_value) {
      totalUnits = cm.quantity_value;
      totalNet = totalUnits * netPerUnit;
      totalGross = totalUnits * grossPerUnit;
    } else if (cm.quantity_type === 'WEIGHT' && cm.quantity_value) {
      let totalWeightKg = cm.quantity_value;
      const wu = (cm.weight_unit || 'KG').toUpperCase();
      if (wu === 'TONS' || wu === 'MT') totalWeightKg *= 1000;
      else if (wu === 'LBS') totalWeightKg *= 0.453592;
      totalNet = totalWeightKg;
      if (netPerUnit > 0) totalUnits = Math.ceil(totalWeightKg / netPerUnit);
      totalGross = totalUnits * grossPerUnit;
    }

    cm.total_units = totalUnits || null;
    cm.total_net_weight = totalNet || null;
    cm.total_gross_weight = totalGross || null;

    // Build packaging description
    cm.packaging_description = netPerUnit > 0
      ? totalUnits + ' x ' + netPerUnit + ' kg ' + (getPackagingLabel(cm.packaging_code) || cm.packaging_code)
      : '';

    // Update display
    const wu = cm.weight_unit || 'KG';
    document.getElementById('grossUnit_' + cIdx + '_' + cmIdx).textContent = grossPerUnit > 0 ? grossPerUnit.toFixed(2) + ' kg' : '—';
    document.getElementById('totalUnits_' + cIdx + '_' + cmIdx).textContent = totalUnits || '—';
    document.getElementById('totalNet_' + cIdx + '_' + cmIdx).textContent = totalNet > 0 ? formatWeight(totalNet, wu) : '—';
    document.getElementById('totalGross_' + cIdx + '_' + cmIdx).textContent = totalGross > 0 ? formatWeight(totalGross, wu) : '—';
    document.getElementById('pkgDesc_' + cIdx + '_' + cmIdx).textContent = cm.packaging_description;

    updateSummary();
  }

  function getPackagingLabel(code) {
    const pkg = STATE.packagingTypes.find(p => (p.code || p.id) === code);
    return pkg?.label || '';
  }

  function formatWeight(kg, unit) {
    if (!unit || unit === 'KG') return Math.round(kg).toLocaleString() + ' kg';
    if (unit === 'TONS' || unit === 'MT') return (kg / 1000).toFixed(2) + ' tons';
    if (unit === 'LBS') return Math.round(kg / 0.453592).toLocaleString() + ' lbs';
    return kg.toFixed(2) + ' ' + unit;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PORT AUTO-POPULATION
  // ═══════════════════════════════════════════════════════════════════

  function onOriginCountryChange(cIdx, val) {
    STATE.containers[cIdx].origin_country = val;
    loadPorts(cIdx, 'origin', val);
    renderContainerTabs();
    updateSummary();
  }

  function onDestCountryChange(cIdx, val) {
    STATE.containers[cIdx].destination_country = val;
    loadPorts(cIdx, 'destination', val);
    renderContainerTabs();
    updateSummary();
  }

  async function loadPorts(cIdx, direction, countryCode, preselected) {
    const selId = direction === 'origin' ? 'ct_pol_' + cIdx : 'ct_pod_' + cIdx;
    const sel = document.getElementById(selId);
    if (!sel || !countryCode) return;

    try {
      const res = await fetch(API + '/trade-form/ports?country=' + countryCode + '&transport_mode=' + STATE.transportMode).then(r => r.json());
      const ports = res.data || [];
      // Fallback to static reference
      let portsList = ports;
      if (portsList.length === 0) {
        const staticRes = await fetch(API + '/ref/ports?country=' + countryCode).then(r => r.json());
        portsList = staticRes.data || [];
      }
      sel.innerHTML = '<option value="">Select port...</option>' +
        portsList.map(p => '<option value="' + escHtml(p.name || p.unlocode) + '" data-unlocode="' + (p.unlocode || p.code || '') + '"' +
          ((p.name === preselected || p.unlocode === preselected) ? ' selected' : '') + '>' +
          escHtml(p.name) + ' (' + (p.unlocode || p.code || '') + ')' + (p.port_type ? ' [' + p.port_type + ']' : '') + '</option>').join('');

      // Auto-select first port if only one
      if (portsList.length === 1 && !preselected) {
        sel.selectedIndex = 1;
        const field = direction === 'origin' ? 'port_of_loading' : 'port_of_discharge';
        STATE.containers[cIdx][field] = portsList[0].name || portsList[0].unlocode;
      }
    } catch (e) {
      console.warn('Failed to load ports for ' + countryCode, e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMMODITY ADD/REMOVE
  // ═══════════════════════════════════════════════════════════════════
  function addCommodity(cIdx) {
    const c = STATE.containers[cIdx];
    c.commodities.push(createEmptyCommodity(c.commodities.length));
    renderContainerForm(cIdx);
  }

  function removeCommodity(cIdx, cmIdx) {
    const c = STATE.containers[cIdx];
    if (c.commodities.length <= 1) return;
    c.commodities.splice(cmIdx, 1);
    c.commodities.forEach((cm, i) => cm.index = i);
    renderContainerForm(cIdx);
    updateSummary();
  }

  // ═══════════════════════════════════════════════════════════════════
  // FIELD UPDATE HELPERS
  // ═══════════════════════════════════════════════════════════════════
  function updateContainerField(cIdx, field, val) { STATE.containers[cIdx][field] = val; }
  function updateCmField(cIdx, cmIdx, field, val) { STATE.containers[cIdx].commodities[cmIdx][field] = val; updateSummary(); }

  function saveCurrentContainerState() {
    const idx = STATE.activeContainer;
    const c = STATE.containers[idx];
    if (!c) return;
    // Save port selections
    const polSel = document.getElementById('ct_pol_' + idx);
    const podSel = document.getElementById('ct_pod_' + idx);
    if (polSel) c.port_of_loading = polSel.value;
    if (podSel) c.port_of_discharge = podSel.value;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY UPDATE
  // ═══════════════════════════════════════════════════════════════════
  function updateSummary() {
    document.getElementById('sumContainers').textContent = STATE.containers.length;
    const totalCommodities = STATE.containers.reduce((s, c) => s + c.commodities.length, 0);
    document.getElementById('sumCommodities').textContent = totalCommodities;
    const totalGross = STATE.containers.reduce((s, c) =>
      s + c.commodities.reduce((ss, cm) => ss + (cm.total_gross_weight || 0), 0), 0);
    document.getElementById('sumGrossWeight').textContent = totalGross > 0 ? Math.round(totalGross).toLocaleString() : '0';
    const modeLabels = { SEA_CARGO: 'Sea', AIR_CARGO: 'Air', INTERNATIONAL_TRUCKING: 'Truck', RAIL_CARGO: 'Rail', MULTIMODAL: 'Multi' };
    document.getElementById('sumTransport').textContent = modeLabels[STATE.transportMode] || STATE.transportMode;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DRAFT SAVE/LOAD
  // ═══════════════════════════════════════════════════════════════════
  async function saveDraft(silent) {
    saveCurrentContainerState();
    if (!STATE.tenantId) {
      if (!silent) alert('No tenant ID. Please log in first.');
      return;
    }
    const formData = {
      transport_mode: STATE.transportMode,
      seller_gtid: STATE.sellerGtid || document.getElementById('sellerGtid').value || null,
      seller_company_name: STATE.sellerCompanyName || document.getElementById('sellerCompanyName').value || null,
      containers: STATE.containers,
      global_notes: document.getElementById('globalNotes').value,
    };
    try {
      const res = await fetch(API + '/trade-form/draft-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: STATE.tenantId, draft_id: STATE.draftId, form_data: formData }),
      }).then(r => r.json());
      if (res.data?.draft_id) {
        STATE.draftId = res.data.draft_id;
        STATE.lastSaved = new Date();
        document.getElementById('draftStatus').textContent = 'Saved ' + STATE.lastSaved.toLocaleTimeString();
        if (!silent) {
          const indicator = document.getElementById('draftIndicator');
          indicator.classList.remove('hidden');
          indicator.querySelector('div').classList.add('pulse-green');
          setTimeout(() => { indicator.classList.add('hidden'); }, 2000);
        }
      }
    } catch (e) {
      if (!silent) alert('Failed to save draft: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUBMIT TRADE REQUEST
  // ═══════════════════════════════════════════════════════════════════
  async function submitTradeRequest() {
    saveCurrentContainerState();
    if (!STATE.tenantId) { alert('No tenant ID. Please log in first.'); return; }

    // Validate
    for (let i = 0; i < STATE.containers.length; i++) {
      const c = STATE.containers[i];
      if (!c.origin_country) { alert('Container ' + (i+1) + ': Origin country is required.'); switchContainer(i); return; }
      if (!c.destination_country) { alert('Container ' + (i+1) + ': Destination country is required.'); switchContainer(i); return; }
      for (let j = 0; j < c.commodities.length; j++) {
        const cm = c.commodities[j];
        if (!cm.commodity_type) { alert('Container ' + (i+1) + ', Commodity ' + (j+1) + ': Commodity type is required.'); switchContainer(i); return; }
        if (!cm.product_name) { alert('Container ' + (i+1) + ', Commodity ' + (j+1) + ': Product is required.'); switchContainer(i); return; }
      }
    }

    if (!confirm('Submit this trade request with ' + STATE.containers.length + ' container(s)?')) return;

    try {
      const res = await fetch(API + '/trade-form/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: STATE.tenantId,
          draft_id: STATE.draftId,
          transport_mode: STATE.transportMode,
          seller_gtid: STATE.sellerGtid || document.getElementById('sellerGtid').value || null,
          seller_company_name: STATE.sellerCompanyName || document.getElementById('sellerCompanyName').value || null,
          containers: STATE.containers,
          global_notes: document.getElementById('globalNotes').value,
        }),
      }).then(r => r.json());

      if (res.error) { alert('Error: ' + res.error); return; }
      alert('Trade request submitted successfully!\\nID: ' + (res.data?.trade_request_id || 'N/A') + '\\nStatus: ' + (res.data?.status || 'N/A'));
      window.location.href = '/app';
    } catch (e) {
      alert('Failed to submit: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  </script>
</body>
</html>`;
}

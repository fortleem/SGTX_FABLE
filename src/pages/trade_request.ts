// SGTX Platform v6.3 — Advanced Trade Request Form Page (Buyer Flow)
// Part 3 Phase 1: Structured Container-Level Request Form
// CORRECTED per user directives:
//   - Buyer ONLY selects Country of Origin (NOT port of loading — that's seller Phase 2)
//   - Buyer selects Port of Discharge (destination port only)
//   - Optional Target Price with unit selector (per ton, per kg, per box, etc.)
//   - Incoterm selection dropdown
//   - NO SGTX fee display (system-calculated, not user-facing)
//   - NO logistics cost (seller-only per blueprint)
//   - AI Container Advisor with reefer temperature recommendations
//   - Weights displayed in BOTH kg AND lbs simultaneously
//   - Prominent custom weight entry (not just dropdown defaults)
//   - Proper Fresh vs Frozen distinction in categories

export function tradeRequestFormHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SGTX v6.3 — New Trade Request (Buyer)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    :root { --sgtx-primary: #0f172a; --sgtx-accent: #3b82f6; --sgtx-gold: #f59e0b; --sgtx-success: #10b981; --sgtx-reefer: #06b6d4; }
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
    .btn-cyan { background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; border: none;
      border-radius: 0.5rem; padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; }
    .btn-cyan:hover { background: linear-gradient(135deg, #0891b2, #0e7490); }
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
    .advisor-panel { background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.3); border-radius: 0.75rem; }
    .advisor-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: rgba(6,182,212,0.15);
      color: #22d3ee; font-size: 0.7rem; padding: 0.125rem 0.5rem; border-radius: 9999px; }
    .dual-weight { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; }
    .dual-weight .kg-val { color: #34d399; font-weight: 600; }
    .dual-weight .lbs-val { color: #60a5fa; font-weight: 500; font-size: 0.8em; }
    .draft-indicator { position: fixed; bottom: 1rem; right: 1rem; z-index: 100; }
    .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
    .modal-panel { background: #1e293b; border: 1px solid rgba(71,85,105,0.5); border-radius: 1rem; max-width: 600px; width: 95%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .shipment-row { background: rgba(30,41,59,0.6); border: 1px solid rgba(71,85,105,0.3); border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 0.5rem; }
    .attribution-banner { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 0.75rem; padding: 1rem; }
    .compatibility-warning { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 0.5rem; padding: 0.75rem; }
    @keyframes pulse-green { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
    .pulse-green { animation: pulse-green 2s ease-in-out; }
    @keyframes advisor-glow { 0%, 100% { box-shadow: 0 0 8px rgba(6,182,212,0.3); } 50% { box-shadow: 0 0 20px rgba(6,182,212,0.5); } }
    .advisor-glow { animation: advisor-glow 3s ease-in-out infinite; }
    .reefer-indicator { background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.4); border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
    .section-divider { height: 1px; background: linear-gradient(to right, transparent, rgba(71,85,105,0.5), transparent); margin: 0.5rem 0; }
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
          <span class="text-xs font-normal text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">Buyer Flow</span>
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

    <!-- STEP 1: INCOTERM & SELLER SELECTION -->
    <section class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-handshake text-amber-400"></i> Trade Terms & Seller
        <span class="text-xs text-slate-400 font-normal">(Step 1.1)</span>
      </h2>
      <!-- Incoterm Selection -->
      <div class="mb-4">
        <label class="block text-xs text-slate-400 mb-1">Requested Incoterm <span class="text-amber-400">*</span></label>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2" id="incotermGrid">
        </div>
        <p class="text-xs text-slate-500 mt-1" id="incotermDesc"></p>
      </div>
      <div class="section-divider"></div>
      <!-- Seller / Counterparty -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div class="relative">
          <label class="block text-xs text-slate-400 mb-1">Seller GTID <span class="text-slate-500">(enter or select from contacts)</span></label>
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

    <!-- STEP 1.5: OPTIONAL TARGET PRICE -->
    <section class="glass rounded-xl p-5">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-tag text-green-400"></i> Target Price
        <span class="text-xs text-slate-500 font-normal">(Optional — Buyer's indicative price)</span>
      </h2>
      <p class="text-xs text-slate-400 mb-3">
        Set an optional target price to guide seller quotes. This is indicative only — actual price is determined during negotiation (Phase 2).
        <span class="text-amber-400">SGTX fees are system-calculated and not shown here.</span>
      </p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Target Price</label>
          <input type="number" id="targetPrice" step="0.01" min="0" placeholder="e.g. 450.00" onchange="STATE.targetPrice = parseFloat(this.value) || null">
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Currency</label>
          <select id="targetCurrency" onchange="STATE.targetCurrency = this.value">
            <option value="USD" selected>USD ($)</option>
            <option value="EUR">EUR (&euro;)</option>
            <option value="GBP">GBP (&pound;)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="SAR">SAR (﷼)</option>
            <option value="EGP">EGP (E£)</option>
            <option value="CNY">CNY (¥)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Price Unit</label>
          <select id="targetPriceUnit" onchange="STATE.targetPriceUnit = this.value">
            <option value="PER_TON">Per Metric Ton (MT)</option>
            <option value="PER_KG">Per Kilogram (kg)</option>
            <option value="PER_LB">Per Pound (lb)</option>
            <option value="PER_BOX">Per Box / Carton</option>
            <option value="PER_BAG">Per Bag / Sack</option>
            <option value="PER_PALLET">Per Pallet</option>
            <option value="PER_UNIT">Per Unit / Piece</option>
            <option value="PER_CONTAINER">Per Container (FCL)</option>
            <option value="LUMP_SUM">Lump Sum (Total)</option>
          </select>
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

    <!-- AI CONTAINER ADVISOR -->
    <section id="advisorSection" class="advisor-panel p-5 hidden">
      <h2 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
        <i class="fas fa-robot text-cyan-400"></i> AI Container Advisor
        <span class="advisor-badge"><i class="fas fa-snowflake"></i> Reefer Intelligence</span>
      </h2>
      <div id="advisorContent" class="space-y-3">
        <p class="text-xs text-slate-400">Select commodities to receive AI-powered container and temperature recommendations.</p>
      </div>
    </section>

    <!-- STEP 1.3: MULTI-SHIPMENT REQUEST -->
    <section class="glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-white flex items-center gap-2">
          <i class="fas fa-calendar-alt text-purple-400"></i> Multi-Shipment Contract
          <span class="text-xs text-slate-400 font-normal">(Step 1.3 — Optional)</span>
        </h2>
        <label class="flex items-center gap-2 cursor-pointer">
          <span class="text-xs text-slate-400">Enable Schedule</span>
          <div class="relative">
            <input type="checkbox" id="multiShipmentToggle" class="sr-only" onchange="toggleMultiShipment(this.checked)">
            <div class="w-10 h-5 bg-slate-600 rounded-full peer-checked:bg-purple-500 transition-colors" id="msToggleBg"></div>
            <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform" id="msToggleDot"></div>
          </div>
        </label>
      </div>
      <p class="text-xs text-slate-400 mb-3">Request a multi-shipment contract with scheduled deliveries. Each shipment can have different dates, ports, and container counts.</p>
      <div id="multiShipmentBuilder" class="hidden">
        <div id="shipmentRows" class="space-y-2"></div>
        <div class="flex gap-2 mt-2">
          <button onclick="addShipment()" class="btn-secondary text-xs"><i class="fas fa-plus mr-1"></i> Add Shipment</button>
        </div>
      </div>
    </section>

    <!-- STEP 1.5: MARKETPLACE ATTRIBUTION BANNER -->
    <div id="attributionBanner" class="hidden mx-4">
    </div>

    <!-- COMMODITY COMPATIBILITY WARNINGS -->
    <div id="compatibilityWarnings" class="hidden mx-4">
    </div>

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
      <div id="tradeSummary" class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-blue-400" id="sumContainers">1</div>
          <div class="text-xs text-slate-400">Containers</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-green-400" id="sumCommodities">0</div>
          <div class="text-xs text-slate-400">Commodities</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-lg font-bold text-amber-400" id="sumGrossWeightKg">0 kg</div>
          <div class="text-sm text-blue-300" id="sumGrossWeightLbs">0 lbs</div>
          <div class="text-xs text-slate-400">Total Gross</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-purple-400" id="sumTransport">Sea</div>
          <div class="text-xs text-slate-400">Transport</div>
        </div>
        <div class="glass-light rounded-lg p-3">
          <div class="text-2xl font-bold text-cyan-400" id="sumIncoterm">—</div>
          <div class="text-xs text-slate-400">Incoterm</div>
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

  <!-- PLAIN LANGUAGE DECISION PANEL (G1U11) -->
  <div id="governorDecisionModal" class="modal-overlay hidden">
    <div class="modal-panel">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center" id="govModalIcon">
            <i class="fas fa-gavel text-red-400 text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white" id="govModalTitle">Governor Decision</h3>
            <p class="text-xs text-slate-400" id="govModalSubtitle">Your trade request requires attention</p>
          </div>
        </div>
        <div id="govModalBody" class="space-y-3 mb-6">
        </div>
        <div class="flex justify-end gap-3">
          <button onclick="closeGovernorModal()" class="btn-secondary">Close</button>
          <button id="govModalAction" onclick="closeGovernorModal()" class="btn-primary hidden">Resolve & Retry</button>
        </div>
      </div>
    </div>
  </div>

  <script>
  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  const API = '/api/v1';
  const KG_TO_LBS = 2.20462;

  let STATE = {
    tenantId: null,
    draftId: null,
    transportMode: 'SEA_CARGO',
    incoterm: null,
    sellerGtid: null,
    sellerCompanyName: null,
    targetPrice: null,
    targetCurrency: 'USD',
    targetPriceUnit: 'PER_TON',
    containers: [createEmptyContainer(0)],
    activeContainer: 0,
    countries: [],
    commodityTypes: [],
    packagingTypes: [],
    allProducts: [],
    incoterms: [],
    autoSaveTimer: null,
    lastSaved: null,
    advisorCache: {},
    // Multi-shipment (Step 1.3)
    multiShipmentEnabled: false,
    shipments: [],
    // Marketplace attribution (Step 1.5)
    marketplaceAttribution: null,
    // Container override log (G1U9)
    containerOverrideLog: [],
  };

  function createEmptyContainer(index) {
    return {
      index, container_type: '40ft_HC',
      origin_country: '', destination_country: '',
      // Buyer ONLY selects port of discharge (destination). Port of loading = Seller Phase 2.
      port_of_discharge: '', port_of_discharge_unlocode: '',
      palletized: true, pallet_size: '120x100',
      transport_mode: null, destination_override: '', notes: '',
      commodities: [createEmptyCommodity(0)],
    };
  }

  function createEmptyCommodity(index) {
    return {
      index, commodity_type: '', product_name: '', hs_code: '',
      product_specification: '', packaging_code: '', packaging_description: '',
      packaging_custom: '',
      // Weight fields — user can customize freely, dropdown is just a starting point
      net_weight_per_unit: null, gross_weight_per_unit: null,
      tare_weight_per_unit: 0, total_units: null, total_net_weight: null,
      total_gross_weight: null, weight_unit: 'KG', quantity_type: 'WEIGHT',
      quantity_value: null, num_pallets: 1,
      // AI advisor fields
      reefer_recommendation: null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // INCOTERM DATA (loaded from /ref/incoterms, fallback inline)
  // ═══════════════════════════════════════════════════════════════════
  const INCOTERM_DESCRIPTIONS = {
    EXW: 'Seller makes goods available at their premises. Buyer bears all costs & risks.',
    FCA: 'Seller delivers to carrier at named place. Risk transfers at handover.',
    FAS: 'Seller delivers alongside vessel at port. Buyer bears costs from that point.',
    FOB: 'Seller delivers on board the vessel. Risk transfers once on board.',
    CFR: 'Seller pays freight to destination. Risk transfers when goods are on board.',
    CIF: 'Seller pays freight + insurance. Risk transfers when goods are on board.',
    CPT: 'Seller pays carriage to destination. Risk transfers at first carrier.',
    CIP: 'Seller pays carriage + insurance to destination. Risk at first carrier.',
    DAP: 'Seller delivers at named place, ready for unloading. Buyer handles import.',
    DPU: 'Seller delivers and unloads at named place. Buyer handles import clearance.',
    DDP: 'Seller delivers duty paid. Seller bears all costs including import duties.',
  };

  // ═══════════════════════════════════════════════════════════════════
  // AI CONTAINER ADVISOR — Reefer / Temperature Intelligence
  // ═══════════════════════════════════════════════════════════════════
  const REEFER_INTELLIGENCE = {
    // Frozen categories
    FROZEN_FRUITS: { temp_min: -18, temp_max: -18, humidity: '85-90%', air_circ: 40, ethylene: false, reefer: true, label: 'Deep Frozen', notes: 'Maintain -18°C throughout cold chain. No temperature breaks.' },
    FROZEN_VEGETABLES: { temp_min: -18, temp_max: -18, humidity: '90-95%', air_circ: 40, ethylene: false, reefer: true, label: 'Deep Frozen', notes: 'Maintain -18°C. Avoid refreezing after thaw.' },
    MEAT_POULTRY: { temp_min: -18, temp_max: -1, humidity: '85-90%', air_circ: 30, ethylene: false, reefer: true, label: 'Frozen/Chilled', notes: 'Frozen: -18°C. Chilled: -1 to 4°C. Separate from strong-smelling cargo.' },
    SEAFOOD: { temp_min: -18, temp_max: -1, humidity: '85-95%', air_circ: 40, ethylene: false, reefer: true, label: 'Frozen/Chilled', notes: 'Frozen seafood: -18 to -25°C. Fresh/chilled: -1 to 2°C. Hygiene critical.' },
    DAIRY: { temp_min: 0, temp_max: 5, humidity: '85-90%', air_circ: 25, ethylene: false, reefer: true, label: 'Chilled', notes: 'Keep 0–5°C. Separate from odor-producing goods. Monitor constantly.' },
    // Fresh categories
    FRESH_FRUITS: { temp_min: 0, temp_max: 13, humidity: '85-95%', air_circ: 60, ethylene: true, reefer: true, label: 'Fresh / Controlled Atmosphere',
      notes: 'Temperature varies by fruit: Citrus 4-8°C, Tropical 10-13°C, Berries 0-2°C. Ethylene management critical — separate ethylene producers from sensitive items. High air circulation recommended.',
      product_overrides: {
        'Bananas': { temp_min: 13, temp_max: 14, notes: 'Bananas: 13-14°C. Ethylene producer — isolate. Green = 13.5°C, Ripe = 14°C.' },
        'Strawberries': { temp_min: 0, temp_max: 2, notes: 'Fresh strawberries: 0-2°C, 90-95% humidity. Very perishable — max 7 days transit.' },
        'Oranges': { temp_min: 4, temp_max: 8, notes: 'Oranges: 4-8°C, 85-90% humidity. 4-6 weeks shelf life under proper conditions.' },
        'Lemons & Limes': { temp_min: 8, temp_max: 12, notes: 'Lemons/Limes: 8-12°C. Sensitive to chilling injury below 8°C.' },
        'Mangoes': { temp_min: 10, temp_max: 13, notes: 'Mangoes: 10-13°C. Ethylene sensitive. Avoid below 10°C (chilling injury).' },
        'Avocados': { temp_min: 5, temp_max: 13, notes: 'Avocados: 5-7°C (ripe) or 10-13°C (unripe). Ethylene triggers ripening.' },
        'Grapes': { temp_min: -1, temp_max: 0, notes: 'Grapes: -1 to 0°C, 90-95% humidity. SO₂ pads recommended.' },
        'Apples': { temp_min: 0, temp_max: 4, notes: 'Apples: 0-4°C. Controlled atmosphere (low O₂, low CO₂). Ethylene producer.' },
        'Cherries': { temp_min: -1, temp_max: 0, notes: 'Cherries: -1 to 0°C, 90-95% humidity. Very perishable — max 14 days.' },
      }
    },
    FRESH_VEGETABLES: { temp_min: 0, temp_max: 12, humidity: '90-98%', air_circ: 50, ethylene: true, reefer: true, label: 'Fresh / High Humidity',
      notes: 'Most vegetables: 0-7°C. Tropical vegetables: 10-12°C. High humidity essential. Some are ethylene-sensitive (leafy greens).',
      product_overrides: {
        'Potatoes': { temp_min: 4, temp_max: 8, notes: 'Potatoes: 4-8°C. Avoid light exposure. Ethylene causes sprouting.' },
        'Tomatoes': { temp_min: 10, temp_max: 13, notes: 'Tomatoes: 10-13°C (green), 7-10°C (ripe). Chilling injury below 10°C for green.' },
        'Onions': { temp_min: 0, temp_max: 2, notes: 'Onions: 0-2°C, 65-70% humidity (LOW humidity). Good ventilation needed.' },
        'Peppers (Bell / Chilli)': { temp_min: 7, temp_max: 10, notes: 'Bell peppers: 7-10°C, 90-95% humidity. Chilling injury below 7°C.' },
      }
    },
    // Non-reefer categories (standard or ventilated containers)
    GRAINS_CEREALS: { reefer: false, label: 'Dry / Ventilated', notes: 'Ventilated container recommended. Moisture < 14%. Temperature not critical but avoid condensation.' },
    PULSES_LEGUMES: { reefer: false, label: 'Dry / Ventilated', notes: 'Dry container, moisture control. Fumigation may be required.' },
    SPICES: { reefer: false, label: 'Dry / Ventilated', notes: 'Dry container. Separate from strong-smelling cargo. Moisture < 12%.' },
    COFFEE_TEA_COCOA: { reefer: false, label: 'Dry / Ventilated', notes: 'Ventilated container. Hygroscopic — protect from moisture. Green coffee: 20°C max.' },
    OILS_FATS: { reefer: false, label: 'Tank / Standard', notes: 'Liquid oils: tank container or IBC. Solid fats may need heated container. Keep from direct sunlight.' },
    SUGAR_CONFECTIONERY: { reefer: false, label: 'Dry / Standard', notes: 'Dry, clean container. Chocolate: may need reefer at 15-18°C in hot climates.' },
    TEXTILES: { reefer: false, label: 'Dry / Standard', notes: 'Standard container. Protect from moisture and sunlight.' },
    CHEMICALS: { reefer: false, label: 'Hazmat / Standard', notes: 'Check IMDG classification. Proper ventilation. Segregation from food.' },
    MINERALS_METALS: { reefer: false, label: 'Standard / Open Top', notes: 'Heavy cargo — check weight limits. Open top for oversize. Corrosion protection.' },
    MACHINERY: { reefer: false, label: 'Flat Rack / Standard', notes: 'Secure properly. Flat rack for oversize. Corrosion protection for exposed parts.' },
    WOOD_PAPER: { reefer: false, label: 'Dry / Ventilated', notes: 'ISPM-15 compliance for wood packaging. Moisture protection critical for paper.' },
    ELECTRONICS: { reefer: false, label: 'Standard (Climate Controlled)', notes: 'Anti-static packaging. Cushioning for shock. Insurance recommended.' },
    PROCESSED_FOODS: { reefer: false, label: 'Dry / Standard', notes: 'Some items may need reefer (frozen meals). Check individual product requirements.' },
    PETROLEUM_ENERGY: { reefer: false, label: 'Tank / IMO', notes: 'Tank container. IMO classification required. Flash point certification.' },
    AUTOMOTIVE: { reefer: false, label: 'Standard / RoRo', notes: 'Vehicles: RoRo or container. Parts: standard container with proper securing.' },
    CERAMICS_GLASS: { reefer: false, label: 'Standard', notes: 'Fragile — proper cushioning. Heavy — check container floor load limits.' },
    LIVESTOCK: { reefer: false, label: 'Ventilated / Special', notes: 'Special livestock containers with ventilation, feeding, watering. Veterinary certificates required.' },
    BUILDING_MATERIALS: { reefer: false, label: 'Standard / Flat Rack', notes: 'Heavy goods — weight distribution. Steel: corrosion protection. Cement: moisture protection.' },
  };

  function getReeferAdvice(commodityType, productName) {
    const advice = REEFER_INTELLIGENCE[commodityType];
    if (!advice) return { reefer: false, label: 'Standard', notes: 'No specific requirements found. Use standard container.', temp_display: 'N/A' };

    // Check for product-specific overrides
    let result = { ...advice };
    if (advice.product_overrides && productName && advice.product_overrides[productName]) {
      const override = advice.product_overrides[productName];
      result = { ...result, ...override };
    }

    // Build temperature display
    if (result.reefer) {
      if (result.temp_min === result.temp_max) {
        result.temp_display = result.temp_min + '°C';
      } else {
        result.temp_display = result.temp_min + ' to ' + result.temp_max + '°C';
      }
    } else {
      result.temp_display = 'Ambient';
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    STATE.tenantId = params.get('tenant_id') || localStorage.getItem('sgtx_tenant_id') || null;
    STATE.draftId = params.get('draft_id') || null;

    // Load reference data in parallel
    const [countriesRes, commoditiesRes, productsRes, packagingRes, incotermsRes] = await Promise.all([
      fetch(API + '/ref/countries').then(r => r.json()),
      fetch(API + '/ref/commodity-types').then(r => r.json()),
      fetch(API + '/ref/products').then(r => r.json()),
      fetch(API + '/trade-form/packaging').then(r => r.json()).catch(() => fetch(API + '/ref/packaging').then(r => r.json())),
      fetch(API + '/ref/incoterms').then(r => r.json()),
    ]);

    STATE.countries = countriesRes.data || [];
    STATE.commodityTypes = commoditiesRes.data || [];
    STATE.allProducts = productsRes.data || [];
    STATE.packagingTypes = packagingRes.data || [];
    STATE.incoterms = incotermsRes.data || [];

    // Render incoterm grid
    renderIncotermGrid();

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
    if (fd.incoterm) { STATE.incoterm = fd.incoterm; selectIncotermByCode(fd.incoterm); }
    if (fd.seller_gtid) { STATE.sellerGtid = fd.seller_gtid; document.getElementById('sellerGtid').value = fd.seller_gtid; }
    if (fd.seller_company_name) { STATE.sellerCompanyName = fd.seller_company_name; document.getElementById('sellerCompanyName').value = fd.seller_company_name; }
    if (fd.target_price != null) { STATE.targetPrice = fd.target_price; document.getElementById('targetPrice').value = fd.target_price; }
    if (fd.target_currency) { STATE.targetCurrency = fd.target_currency; document.getElementById('targetCurrency').value = fd.target_currency; }
    if (fd.target_price_unit) { STATE.targetPriceUnit = fd.target_price_unit; document.getElementById('targetPriceUnit').value = fd.target_price_unit; }
    // Restore multi-shipment state
    if (fd.multi_shipment_enabled) {
      STATE.multiShipmentEnabled = true;
      STATE.shipments = fd.shipments || [];
      document.getElementById('multiShipmentToggle').checked = true;
      toggleMultiShipment(true);
    }
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
  // INCOTERM SELECTION
  // ═══════════════════════════════════════════════════════════════════
  function renderIncotermGrid() {
    const grid = document.getElementById('incotermGrid');
    const terms = STATE.incoterms.length > 0 ? STATE.incoterms : [
      { code: 'EXW' }, { code: 'FCA' }, { code: 'FAS' }, { code: 'FOB' },
      { code: 'CFR' }, { code: 'CIF' }, { code: 'CPT' }, { code: 'CIP' },
      { code: 'DAP' }, { code: 'DPU' }, { code: 'DDP' },
    ];
    grid.innerHTML = terms.map(t => {
      const code = t.code;
      const groupColors = { E: 'border-gray-500 text-gray-300', F: 'border-blue-500 text-blue-300',
        C: 'border-amber-500 text-amber-300', D: 'border-green-500 text-green-300' };
      const group = t.group || (code === 'EXW' ? 'E' : code.startsWith('F') ? 'F' : code.startsWith('C') ? 'C' : 'D');
      const color = groupColors[group] || 'border-slate-500 text-slate-300';
      return '<button class="incoterm-btn border-2 rounded-lg px-3 py-2 text-center transition-all hover:bg-white/5 ' + color + '" data-code="' + code + '" onclick="selectIncoterm(this)">' +
        '<div class="font-bold text-sm">' + code + '</div>' +
        '<div class="text-[10px] text-slate-400">' + (t.label || INCOTERM_DESCRIPTIONS[code]?.split('.')[0] || code) + '</div>' +
      '</button>';
    }).join('');
  }

  function selectIncoterm(el) {
    document.querySelectorAll('.incoterm-btn').forEach(b => {
      b.classList.remove('bg-white/10', 'ring-2', 'ring-blue-400');
    });
    el.classList.add('bg-white/10', 'ring-2', 'ring-blue-400');
    STATE.incoterm = el.dataset.code;
    document.getElementById('incotermDesc').textContent = INCOTERM_DESCRIPTIONS[STATE.incoterm] || '';
    updateSummary();
  }

  function selectIncotermByCode(code) {
    const btn = document.querySelector('.incoterm-btn[data-code="' + code + '"]');
    if (btn) selectIncoterm(btn);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRANSPORT MODE
  // ═══════════════════════════════════════════════════════════════════
  function selectTransport(el) {
    document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    STATE.transportMode = el.dataset.mode;
    updateSummary();
    renderContainerForm(STATE.activeContainer);
  }

  function selectTransportByMode(mode) {
    const card = document.querySelector('.transport-card[data-mode="' + mode + '"]');
    if (card) selectTransport(card);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELLER GTID SEARCH
  // ═══════════════════════════════════════════════════════════════════
  let gtidSearchTimeout;
  async function onSellerGtidInput(val) {
    clearTimeout(gtidSearchTimeout);
    if (val.length < 1) { hideDropdown('gtidDropdown'); return; }
    gtidSearchTimeout = setTimeout(async () => {
      const dd = document.getElementById('gtidDropdown');
      let items = [];
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
    const info = document.getElementById('sellerInfo');
    info.classList.remove('hidden');
    document.getElementById('sellerInfoName').textContent = name;
    document.getElementById('sellerInfoGtid').textContent = gtid;
    document.getElementById('sellerInfoJurisdiction').textContent = jurisdiction || '';
    document.getElementById('sellerInfoBadges').innerHTML =
      '<span class="saved-badge"><i class="fas fa-check-circle"></i> Verified</span>' +
      '<button onclick="showTrustPortrait()" class="text-xs text-cyan-400 hover:text-cyan-300 ml-2" title="View Trust Portrait"><i class="fas fa-shield-alt mr-1"></i>Trust Portrait</button>';
    // Step 1.5: Check marketplace attribution after seller selection
    checkMarketplaceAttribution();
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRUST PORTRAIT (Step 1.1 — Advisory, Groq-generated summary)
  // ═══════════════════════════════════════════════════════════════════
  async function showTrustPortrait() {
    if (!STATE.sellerGtid) { alert('No seller selected.'); return; }
    try {
      const res = await fetch(API + '/trade-form/gtid-resolve?gtid=' + encodeURIComponent(STATE.sellerGtid)).then(r => r.json());
      const d = res.data;
      if (!d) { alert('Could not load seller data.'); return; }
      const ts = d.trust_score || {};
      showGovernorModal('info',
        'Trust Portrait — ' + escHtml(d.company_name || STATE.sellerGtid),
        'AI-generated summary of trade history, payment behaviour, and public sentiment (advisory only).',
        '<div class="space-y-3">' +
          '<div class="grid grid-cols-2 gap-3">' +
            '<div class="glass-light rounded-lg p-3"><div class="text-xs text-slate-400">Jurisdiction</div><div class="text-sm font-semibold text-white">' + escHtml(d.jurisdiction || 'N/A') + '</div></div>' +
            '<div class="glass-light rounded-lg p-3"><div class="text-xs text-slate-400">KYB Status</div><div class="text-sm font-semibold ' + (d.kyb_status === 'VERIFIED' ? 'text-green-400' : 'text-amber-400') + '">' + escHtml(d.kyb_status || 'N/A') + '</div></div>' +
            '<div class="glass-light rounded-lg p-3"><div class="text-xs text-slate-400">Risk Score</div><div class="text-sm font-semibold text-white">' + (d.risk_score != null ? d.risk_score : 'N/A') + '</div></div>' +
            '<div class="glass-light rounded-lg p-3"><div class="text-xs text-slate-400">Sanctions</div><div class="text-sm font-semibold ' + (d.sanctions_clear ? 'text-green-400' : 'text-red-400') + '">' + (d.sanctions_clear ? '✅ Clear' : '⚠️ Flagged') + '</div></div>' +
          '</div>' +
          (ts.composite_score != null ? '<div class="glass-light rounded-lg p-3"><div class="text-xs text-slate-400">Composite Trust Score</div><div class="text-lg font-bold text-cyan-400">' + ts.composite_score + '/100</div></div>' : '') +
          '<p class="text-xs text-slate-500 italic">Trust Portrait is AI-generated and advisory only. It does not constitute a recommendation to trade.</p>' +
        '</div>'
      );
    } catch (e) { alert('Failed to load Trust Portrait: ' + e.message); }
  }

  function hideDropdown(id) { document.getElementById(id).classList.add('hidden'); }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sellerGtid') && !e.target.closest('#gtidDropdown')) hideDropdown('gtidDropdown');
    if (!e.target.closest('#sellerCompanyName') && !e.target.closest('#companyDropdown')) hideDropdown('companyDropdown');
  });

  // ═══════════════════════════════════════════════════════════════════
  // MARKETPLACE ATTRIBUTION (Step 1.5 — Auto-detection)
  // ═══════════════════════════════════════════════════════════════════
  async function checkMarketplaceAttribution() {
    if (!STATE.tenantId || !STATE.sellerGtid) return;
    try {
      const res = await fetch(API + '/trade-form/marketplace-check?tenant_id=' + STATE.tenantId + '&seller_gtid=' + encodeURIComponent(STATE.sellerGtid)).then(r => r.json());
      const banner = document.getElementById('attributionBanner');
      if (res.data?.attributed) {
        STATE.marketplaceAttribution = res.data;
        banner.innerHTML = '<div class="attribution-banner">' +
          '<div class="flex items-center gap-2 mb-2">' +
            '<i class="fas fa-handshake text-amber-400"></i>' +
            '<span class="text-sm font-semibold text-amber-300">Marketplace Attribution Detected</span>' +
          '</div>' +
          '<p class="text-xs text-slate-300">This trade will be attributed to <strong>' + escHtml(res.data.marketplace_name) + '</strong> because you first connected through them' +
            (res.data.first_trade_date ? ' on ' + res.data.first_trade_date : '') + '. The standard revenue share of <strong>' + (res.data.revenue_share_pct || 'N/A') + '%</strong> will be applied.</p>' +
          '<p class="text-xs text-slate-500 mt-1">You may <button onclick="disputeAttribution()" class="text-amber-400 underline">dispute this</button> within 72 hours.</p>' +
        '</div>';
        banner.classList.remove('hidden');
      } else {
        STATE.marketplaceAttribution = null;
        banner.classList.add('hidden');
      }
    } catch (e) { /* non-blocking */ }
  }

  function disputeAttribution() {
    if (confirm('Are you sure you want to dispute this marketplace attribution? This will be reviewed within 72 hours.')) {
      STATE.marketplaceAttribution = { ...STATE.marketplaceAttribution, disputed: true };
      document.getElementById('attributionBanner').innerHTML = '<div class="attribution-banner border-blue-500/30">' +
        '<div class="flex items-center gap-2"><i class="fas fa-flag text-blue-400"></i>' +
        '<span class="text-sm font-semibold text-blue-300">Attribution Dispute Filed</span></div>' +
        '<p class="text-xs text-slate-400 mt-1">Your dispute has been recorded. Trade will proceed pending review.</p></div>';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-SHIPMENT SCHEDULE BUILDER (Step 1.3)
  // ═══════════════════════════════════════════════════════════════════
  function toggleMultiShipment(enabled) {
    STATE.multiShipmentEnabled = enabled;
    const builder = document.getElementById('multiShipmentBuilder');
    const bg = document.getElementById('msToggleBg');
    const dot = document.getElementById('msToggleDot');
    if (enabled) {
      builder.classList.remove('hidden');
      bg.style.background = '#a855f7';
      dot.style.transform = 'translateX(20px)';
      if (STATE.shipments.length === 0) addShipment();
    } else {
      builder.classList.add('hidden');
      bg.style.background = '';
      dot.style.transform = '';
    }
    updateSummary();
  }

  function addShipment() {
    const num = STATE.shipments.length + 1;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    STATE.shipments.push({
      shipment_number: num,
      delivery_date: tomorrow,
      port_of_discharge: '',
      port_of_discharge_country: STATE.containers[0]?.destination_country || '',
      container_count: 1,
      inherit_commodities: true,
      commodities_override: null,
      notes: '',
    });
    renderShipments();
  }

  function cloneShipment(idx) {
    const src = STATE.shipments[idx];
    const clone = JSON.parse(JSON.stringify(src));
    clone.shipment_number = STATE.shipments.length + 1;
    STATE.shipments.push(clone);
    renderShipments();
  }

  function removeShipment(idx) {
    STATE.shipments.splice(idx, 1);
    STATE.shipments.forEach((s, i) => s.shipment_number = i + 1);
    renderShipments();
  }

  function renderShipments() {
    const container = document.getElementById('shipmentRows');
    if (!container) return;
    const destCountry = STATE.containers[0]?.destination_country || '';
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    container.innerHTML = STATE.shipments.map((s, i) =>
      '<div class="shipment-row">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="text-xs font-semibold text-purple-300"><i class="fas fa-shipping-fast mr-1"></i> Shipment ' + (i + 1) + '</span>' +
          '<div class="flex gap-1">' +
            '<button onclick="cloneShipment(' + i + ')" class="text-xs text-slate-400 hover:text-white" title="Clone"><i class="fas fa-clone"></i></button>' +
            (STATE.shipments.length > 1 ? '<button onclick="removeShipment(' + i + ')" class="text-xs text-red-400 hover:text-red-300" title="Remove"><i class="fas fa-trash"></i></button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">' +
          '<div><label class="block text-[10px] text-slate-400 mb-0.5">Delivery Date <span class="text-amber-400">*</span></label>' +
            '<input type="date" value="' + (s.delivery_date || tomorrow) + '" min="' + tomorrow + '" class="text-xs" onchange="STATE.shipments[' + i + '].delivery_date=this.value"></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-0.5">Destination Country</label>' +
            '<select class="text-xs" onchange="STATE.shipments[' + i + '].port_of_discharge_country=this.value; loadShipmentPorts(' + i + ',this.value)">' +
              '<option value="">Same as main</option>' +
              STATE.countries.map(ct => '<option value="' + ct.code + '"' + (ct.code === s.port_of_discharge_country ? ' selected' : '') + '>' + escHtml(ct.name) + '</option>').join('') +
            '</select></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-0.5">Port of Discharge</label>' +
            '<select id="shipPort_' + i + '" class="text-xs" onchange="STATE.shipments[' + i + '].port_of_discharge=this.value">' +
              '<option value="">Inherit from main</option></select></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-0.5">Containers</label>' +
            '<input type="number" min="1" value="' + (s.container_count || 1) + '" class="text-xs" onchange="STATE.shipments[' + i + '].container_count=parseInt(this.value)||1"></div>' +
        '</div>' +
        '<div class="flex items-center gap-2 mt-2">' +
          '<label class="text-[10px] text-slate-400">Commodities:</label>' +
          '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="shipCom_' + i + '" value="inherit"' + (s.inherit_commodities ? ' checked' : '') + ' onchange="STATE.shipments[' + i + '].inherit_commodities=true" class="text-xs"> <span class="text-[10px]">Inherit from main</span></label>' +
          '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="shipCom_' + i + '" value="custom"' + (!s.inherit_commodities ? ' checked' : '') + ' onchange="STATE.shipments[' + i + '].inherit_commodities=false" class="text-[10px]"> <span class="text-[10px]">Edit per shipment</span></label>' +
          '<input type="text" value="' + escHtml(s.notes || '') + '" placeholder="Notes" class="text-xs flex-1 ml-2" onchange="STATE.shipments[' + i + '].notes=this.value">' +
        '</div>' +
      '</div>'
    ).join('');
    // Load ports for shipments with specific countries
    STATE.shipments.forEach((s, i) => {
      if (s.port_of_discharge_country) loadShipmentPorts(i, s.port_of_discharge_country);
    });
  }

  async function loadShipmentPorts(idx, countryCode) {
    const sel = document.getElementById('shipPort_' + idx);
    if (!sel || !countryCode) return;
    try {
      const res = await fetch(API + '/trade-form/ports?country=' + countryCode + '&transport_mode=' + STATE.transportMode + '&direction=discharge').then(r => r.json());
      const ports = res.data || [];
      sel.innerHTML = '<option value="">Inherit from main</option>' +
        ports.map(p => '<option value="' + escHtml(p.name || p.unlocode) + '"' +
          (p.name === STATE.shipments[idx].port_of_discharge ? ' selected' : '') + '>' +
          escHtml(p.name) + ' (' + (p.unlocode || '') + ')</option>').join('');
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMMODITY COMPATIBILITY WARNINGS
  // ═══════════════════════════════════════════════════════════════════
  function checkCommodityCompatibility() {
    const warnings = [];
    const allCommodities = STATE.containers.flatMap((c, ci) =>
      c.commodities.map((cm, cmi) => ({ ...cm, containerIndex: ci, commodityIndex: cmi }))
    ).filter(cm => cm.commodity_type);

    // Check ethylene producers vs ethylene-sensitive in same container
    const ethyleneProducers = ['Bananas', 'Apples', 'Avocados', 'Mangoes', 'Peaches'];
    const ethyleneSensitive = ['Kiwi Fruit', 'Strawberries', 'Grapes', 'Cherries', 'Asparagus', 'Potatoes'];

    STATE.containers.forEach((c, ci) => {
      const products = c.commodities.filter(cm => cm.product_name).map(cm => cm.product_name);
      const hasProducer = products.some(p => ethyleneProducers.includes(p));
      const hasSensitive = products.some(p => ethyleneSensitive.includes(p));
      if (hasProducer && hasSensitive) {
        const prods = products.filter(p => ethyleneProducers.includes(p));
        const sens = products.filter(p => ethyleneSensitive.includes(p));
        warnings.push({ type: 'ETHYLENE_CONFLICT', container: ci + 1,
          message: 'Container ' + (ci+1) + ': Ethylene producer(s) (' + prods.join(', ') + ') mixed with ethylene-sensitive item(s) (' + sens.join(', ') + '). Consider separating into different containers.' });
      }

      // Check temperature range conflicts
      const reeferItems = c.commodities.filter(cm => cm.commodity_type).map(cm => {
        const advice = getReeferAdvice(cm.commodity_type, cm.product_name);
        return { ...cm, advice };
      }).filter(cm => cm.advice?.reefer);
      if (reeferItems.length >= 2) {
        const minTemp = Math.min(...reeferItems.map(r => r.advice.temp_min ?? 0));
        const maxTemp = Math.max(...reeferItems.map(r => r.advice.temp_max ?? 0));
        if (maxTemp - minTemp > 10) {
          warnings.push({ type: 'TEMPERATURE_RANGE', container: ci + 1,
            message: 'Container ' + (ci+1) + ': Wide temperature range (' + minTemp + '°C to ' + maxTemp + '°C). Items with very different temperature requirements should be in separate reefer containers.' });
        }
      }

      // Check reefer + non-reefer mix
      const reefer = c.commodities.filter(cm => { const a = getReeferAdvice(cm.commodity_type, cm.product_name); return a?.reefer; });
      const nonReefer = c.commodities.filter(cm => { const a = getReeferAdvice(cm.commodity_type, cm.product_name); return cm.commodity_type && !a?.reefer; });
      if (reefer.length > 0 && nonReefer.length > 0) {
        warnings.push({ type: 'REEFER_MIX', container: ci + 1,
          message: 'Container ' + (ci+1) + ': Mixing reefer-required and non-reefer commodities. This may damage non-reefer goods or waste reefer capacity.' });
      }
    });

    const panel = document.getElementById('compatibilityWarnings');
    if (warnings.length > 0) {
      panel.innerHTML = warnings.map(w =>
        '<div class="compatibility-warning mb-2">' +
          '<div class="flex items-center gap-2">' +
            '<i class="fas fa-exclamation-triangle text-red-400"></i>' +
            '<span class="text-xs font-semibold text-red-300">' + w.type.replace(/_/g, ' ') + '</span>' +
          '</div>' +
          '<p class="text-xs text-slate-300 mt-1">' + escHtml(w.message) + '</p>' +
        '</div>'
      ).join('');
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
    return warnings;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PLAIN LANGUAGE DECISION PANEL (G1U11)
  // ═══════════════════════════════════════════════════════════════════
  function showGovernorModal(type, title, subtitle, bodyHtml, actionLabel) {
    const modal = document.getElementById('governorDecisionModal');
    const icon = document.getElementById('govModalIcon');
    const actionBtn = document.getElementById('govModalAction');

    const colors = { deny: 'bg-red-500/20', conditional: 'bg-amber-500/20', info: 'bg-blue-500/20' };
    const icons = { deny: 'fa-ban text-red-400', conditional: 'fa-exclamation-circle text-amber-400', info: 'fa-info-circle text-blue-400' };
    icon.className = 'w-10 h-10 rounded-full flex items-center justify-center ' + (colors[type] || colors.info);
    icon.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + ' text-lg"></i>';

    document.getElementById('govModalTitle').textContent = title || 'Governor Decision';
    document.getElementById('govModalSubtitle').textContent = subtitle || '';
    document.getElementById('govModalBody').innerHTML = bodyHtml || '';

    if (actionLabel) {
      actionBtn.textContent = actionLabel;
      actionBtn.classList.remove('hidden');
    } else {
      actionBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  function closeGovernorModal() {
    document.getElementById('governorDecisionModal').classList.add('hidden');
  }

  function showGovernorDeny(govResult) {
    const reasons = govResult.reasons || govResult.policy_reasons || [];
    const gateId = govResult.gate_id || govResult.decision_type || 'Unknown';
    showGovernorModal('deny', 'Trade Request Denied', 'Governor gate ' + gateId + ' blocked this action.',
      '<div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">' +
        '<p class="text-sm text-red-300 font-semibold">This trade request cannot proceed in its current state.</p>' +
      '</div>' +
      (reasons.length > 0 ? '<div class="space-y-2">' + reasons.map(r =>
        '<div class="flex items-start gap-2">' +
          '<i class="fas fa-times-circle text-red-400 mt-0.5"></i>' +
          '<div><p class="text-sm text-white">' + escHtml(typeof r === 'string' ? r : r.message || r.reason || JSON.stringify(r)) + '</p>' +
          (r.action ? '<p class="text-xs text-cyan-400 mt-0.5"><i class="fas fa-arrow-right mr-1"></i>' + escHtml(r.action) + '</p>' : '') +
          '</div></div>'
      ).join('') + '</div>' : '<p class="text-xs text-slate-400">No specific reason provided. Contact support if this persists.</p>')
    );
  }

  function showGovernorConditional(govResult) {
    const conditions = govResult.conditions || govResult.reasons || [];
    showGovernorModal('conditional', 'Action Required', 'Your trade request needs adjustments before it can be submitted.',
      '<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">' +
        '<p class="text-sm text-amber-300">Please resolve the following conditions:</p>' +
      '</div>' +
      '<div class="space-y-2">' + conditions.map((c, i) =>
        '<div class="flex items-start gap-2">' +
          '<span class="text-xs text-amber-400 font-bold mt-0.5">' + (i + 1) + '.</span>' +
          '<p class="text-sm text-white">' + escHtml(typeof c === 'string' ? c : c.message || c.condition || JSON.stringify(c)) + '</p>' +
        '</div>'
      ).join('') + '</div>',
      'Resolve & Retry'
    );
  }

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
  // BUYER FLOW: Country of Origin (no port), Destination Country + Port of Discharge
  // ═══════════════════════════════════════════════════════════════════
  function renderContainerForm(idx) {
    const c = STATE.containers[idx];
    if (!c) return;
    const form = document.getElementById('containerForms');
    const countriesOptsOrigin = '<option value="">Select country of origin...</option>' +
      STATE.countries.map(ct => '<option value="' + ct.code + '"' + (ct.code === c.origin_country ? ' selected' : '') + '>' + escHtml(ct.name) + '</option>').join('');
    const countriesOptsDest = '<option value="">Select destination country...</option>' +
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
      // Row 1: Container Type, Country of Origin (NO port of loading for buyer), Destination Country
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Container Type</label>' +
          '<select id="ct_type" onchange="updateContainerField(' + idx + ',\\'container_type\\',this.value); checkContainerAdvisor(' + idx + ')">' +
            ['20ft','40ft','40ft_HC','20ft_RF','40ft_RF','40ft_HC_RF','20ft_OT','40ft_OT','20ft_FR','40ft_FR','20ft_Tank'].map(t =>
              '<option value="' + t + '"' + (t === c.container_type ? ' selected' : '') + '>' + t.replace(/_/g,' ') + '</option>').join('') +
          '</select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Country of Origin <span class="text-amber-400">*</span></label>' +
          '<select id="ct_origin" onchange="onOriginCountryChange(' + idx + ',this.value)">' + countriesOptsOrigin + '</select>' +
          '<p class="text-[10px] text-slate-500 mt-0.5">Port of loading is determined by seller in Phase 2</p></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Destination Country <span class="text-amber-400">*</span></label>' +
          '<select id="ct_dest" onchange="onDestCountryChange(' + idx + ',this.value)">' + countriesOptsDest + '</select></div>' +
      '</div>' +
      // Row 2: Port of Discharge (buyer only), Palletized, Pallet Size
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Port of Discharge <span class="autofill-badge" id="podBadge_' + idx + '">auto from destination</span></label>' +
          '<select id="ct_pod_' + idx + '" onchange="onPortDischargeChange(' + idx + ',this)">' +
            '<option value="">Select port...</option></select></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Palletized?</label>' +
          '<div class="flex items-center gap-3 mt-1">' +
            '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="pallet_' + idx + '" value="1"' + (c.palletized ? ' checked' : '') + ' onchange="updateContainerField(' + idx + ',\\'palletized\\',true)"> <span class="text-sm">Yes</span></label>' +
            '<label class="flex items-center gap-1 cursor-pointer"><input type="radio" name="pallet_' + idx + '" value="0"' + (!c.palletized ? ' checked' : '') + ' onchange="updateContainerField(' + idx + ',\\'palletized\\',false)"> <span class="text-sm">No</span></label>' +
          '</div></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Pallet Size</label>' +
          '<select id="ct_palletSize" onchange="updateContainerField(' + idx + ',\\'pallet_size\\',this.value)">' +
            [['120x100','1200x1000 EUR2/ISO1'],['120x80','1200x800 EUR/EPAL'],['114x114','1140x1140 AUS'],['110x110','1100x1100 Asia'],['122x102','1219x1016 US/GMA']].map(([v,l]) =>
              '<option value="' + v + '"' + (v === c.pallet_size ? ' selected' : '') + '>' + l + '</option>').join('') +
          '</select></div>' +
      '</div>' +
      // Row 3: Destination Override, Container Notes
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
        '<div><label class="block text-xs text-slate-400 mb-1">Destination Override</label>' +
          '<input type="text" id="ct_destOverride" value="' + escHtml(c.destination_override || '') + '" placeholder="e.g. Alexandria Free Zone" onchange="updateContainerField(' + idx + ',\\'destination_override\\',this.value)"></div>' +
        '<div><label class="block text-xs text-slate-400 mb-1">Container Notes</label>' +
          '<input type="text" id="ct_notes" value="' + escHtml(c.notes || '') + '" placeholder="e.g. Expedite customs clearance" onchange="updateContainerField(' + idx + ',\\'notes\\',this.value)"></div>' +
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

    // Load ports for destination if already set (buyer only gets discharge ports)
    if (c.destination_country) loadDischargePorts(idx, c.destination_country, c.port_of_discharge);
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMMODITY ROW — Bidirectional auto-fill + Weight in kg & lbs
  // ═══════════════════════════════════════════════════════════════════
  function renderCommodityRow(cIdx, cmIdx, cm) {
    const typeOpts = '<option value="">Select type...</option>' +
      STATE.commodityTypes.map(ct => '<option value="' + ct.type + '"' + (ct.type === cm.commodity_type ? ' selected' : '') + '>' + escHtml(ct.label) + '</option>').join('');

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

    const qtyTypeOpts = ['WEIGHT','UNITS'].map(t => '<option value="' + t + '"' + (t === (cm.quantity_type||'WEIGHT') ? ' selected' : '') + '>' + t + '</option>').join('');

    // Reefer indicator if applicable
    const reeferAdvice = cm.commodity_type ? getReeferAdvice(cm.commodity_type, cm.product_name) : null;
    const reeferHtml = reeferAdvice && reeferAdvice.reefer
      ? '<div class="reefer-indicator mt-2 flex items-center gap-2">' +
          '<i class="fas fa-snowflake text-cyan-400"></i>' +
          '<span class="text-xs text-cyan-300 font-semibold">' + reeferAdvice.label + ': ' + reeferAdvice.temp_display + '</span>' +
          '<span class="text-xs text-slate-400">| Humidity: ' + (reeferAdvice.humidity || 'N/A') + '</span>' +
          (reeferAdvice.ethylene ? '<span class="text-xs text-amber-400">| <i class="fas fa-wind"></i> Ethylene Mgmt</span>' : '') +
          '<button onclick="showAdvisorDetail(\\'' + (cm.commodity_type||'') + '\\',\\'' + (cm.product_name||'').replace(/'/g,"\\\\'") + '\\')" class="btn-cyan text-[10px] ml-auto py-0.5 px-2"><i class="fas fa-robot mr-1"></i>Details</button>' +
        '</div>'
      : (reeferAdvice ? '<div class="mt-1 text-[10px] text-slate-500"><i class="fas fa-box text-slate-500 mr-1"></i>' + reeferAdvice.label + ' — ' + (reeferAdvice.notes||'').substring(0,80) + '</div>' : '');

    // Weight summary with DUAL kg/lbs display
    const grossUnitKg = cm.gross_weight_per_unit || 0;
    const grossUnitLbs = grossUnitKg * KG_TO_LBS;
    const totalNetKg = cm.total_net_weight || 0;
    const totalNetLbs = totalNetKg * KG_TO_LBS;
    const totalGrossKg = cm.total_gross_weight || 0;
    const totalGrossLbs = totalGrossKg * KG_TO_LBS;

    return '<div class="glass-light rounded-lg p-3 mb-2" id="cmRow_' + cIdx + '_' + cmIdx + '">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<span class="text-xs font-semibold text-slate-400">Commodity ' + (cmIdx + 1) + '</span>' +
        (STATE.containers[cIdx].commodities.length > 1 ?
          '<button onclick="removeCommodity(' + cIdx + ',' + cmIdx + ')" class="text-red-400 hover:text-red-300 text-xs"><i class="fas fa-times"></i></button>' : '') +
      '</div>' +
      // Row 1: Type, Product, HS Code
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
        '<div><label class="block text-xs text-slate-400 mb-1">Pallets for this commodity</label>' +
          '<input type="number" id="numPal_' + cIdx + '_' + cmIdx + '" min="0" value="' + (cm.num_pallets || 1) + '" onchange="updateCmField(' + cIdx + ',' + cmIdx + ',\\'num_pallets\\',parseInt(this.value))"></div>' +
      '</div>' +
      // Row 3: PROMINENT CUSTOM WEIGHT ENTRY — user can type any net weight per unit
      '<div class="bg-slate-800/50 rounded-lg p-3 mb-2">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<i class="fas fa-weight-hanging text-amber-400 text-xs"></i>' +
          '<span class="text-xs font-semibold text-amber-300">Weight Configuration</span>' +
          '<span class="text-[10px] text-slate-500">(Customize net weight per unit — dropdown gives defaults, you can override)</span>' +
        '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">' +
          '<div><label class="block text-[10px] text-slate-400 mb-1">Net Weight / Unit</label>' +
            '<div class="flex gap-1">' +
              '<input type="number" id="netWt_' + cIdx + '_' + cmIdx + '" step="0.01" value="' + (cm.net_weight_per_unit || '') + '" placeholder="kg" class="flex-1" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')">' +
              '<span class="text-[10px] text-slate-500 self-center whitespace-nowrap">' + (cm.net_weight_per_unit ? fmtLbs(cm.net_weight_per_unit) + ' lbs' : '') + '</span>' +
            '</div></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-1">Quantity Type</label>' +
            '<select id="qtyType_' + cIdx + '_' + cmIdx + '" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')">' + qtyTypeOpts + '</select></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-1">Quantity Value</label>' +
            '<input type="number" id="qtyVal_' + cIdx + '_' + cmIdx + '" step="0.01" value="' + (cm.quantity_value || '') + '" placeholder="e.g. 25000 kg or 2200 units" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')"></div>' +
          '<div><label class="block text-[10px] text-slate-400 mb-1">Unit (for weight qty)</label>' +
            '<select id="wtUnit_' + cIdx + '_' + cmIdx + '" onchange="onWeightChange(' + cIdx + ',' + cmIdx + ')">' +
              ['KG','TONS','LBS'].map(u => '<option value="' + u + '"' + (u === (cm.weight_unit||'KG') ? ' selected' : '') + '>' + u + '</option>').join('') +
            '</select></div>' +
        '</div>' +
      '</div>' +
      // Weight summary — DUAL kg AND lbs display
      '<div class="weight-display" id="weightSummary_' + cIdx + '_' + cmIdx + '">' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">' +
          '<div>' +
            '<span class="text-slate-400 block">Gross / Unit</span>' +
            '<span class="text-amber-400 font-bold" id="grossUnit_' + cIdx + '_' + cmIdx + '">' + (grossUnitKg > 0 ? grossUnitKg.toFixed(2) + ' kg' : '—') + '</span>' +
            '<span class="text-blue-300 text-[10px] block" id="grossUnitLbs_' + cIdx + '_' + cmIdx + '">' + (grossUnitKg > 0 ? grossUnitLbs.toFixed(2) + ' lbs' : '') + '</span>' +
          '</div>' +
          '<div>' +
            '<span class="text-slate-400 block">Total Cartons / Units</span>' +
            '<span class="text-blue-400 font-bold" id="totalUnits_' + cIdx + '_' + cmIdx + '">' + (cm.total_units || '—') + '</span>' +
          '</div>' +
          '<div>' +
            '<span class="text-slate-400 block">Total Net Weight</span>' +
            '<span class="text-green-400 font-bold" id="totalNet_' + cIdx + '_' + cmIdx + '">' + (totalNetKg > 0 ? fmtKg(totalNetKg) + ' kg' : '—') + '</span>' +
            '<span class="text-blue-300 text-[10px] block" id="totalNetLbs_' + cIdx + '_' + cmIdx + '">' + (totalNetKg > 0 ? fmtLbs(totalNetKg) + ' lbs' : '') + '</span>' +
          '</div>' +
          '<div>' +
            '<span class="text-slate-400 block">Total Gross Weight</span>' +
            '<span class="text-amber-400 font-bold" id="totalGross_' + cIdx + '_' + cmIdx + '">' + (totalGrossKg > 0 ? fmtKg(totalGrossKg) + ' kg' : '—') + '</span>' +
            '<span class="text-blue-300 text-[10px] block" id="totalGrossLbs_' + cIdx + '_' + cmIdx + '">' + (totalGrossKg > 0 ? fmtLbs(totalGrossKg) + ' lbs' : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="text-xs text-slate-500 mt-1" id="pkgDesc_' + cIdx + '_' + cmIdx + '">' + escHtml(cm.packaging_description || '') + '</div>' +
      '</div>' +
      // Reefer / Container advisor indicator
      reeferHtml +
    '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════
  // BIDIRECTIONAL AUTO-FILL HANDLERS
  // ═══════════════════════════════════════════════════════════════════
  function onCommodityTypeChange(cIdx, cmIdx, type) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    cm.commodity_type = type;
    cm.product_name = ''; cm.hs_code = '';
    const productSel = document.getElementById('product_' + cIdx + '_' + cmIdx);
    if (productSel) {
      const products = STATE.commodityTypes.find(ct => ct.type === type)?.products || [];
      productSel.innerHTML = '<option value="">Select product...</option>' +
        products.map(p => '<option value="' + escHtml(p.name) + '" data-hs="' + p.hs_code + '">' + escHtml(p.name) + ' (' + p.hs_code + ')</option>').join('') +
        '<option value="__OTHER__">Other (free text)</option>';
    }
    document.getElementById('hsCode_' + cIdx + '_' + cmIdx).value = '';
    checkContainerAdvisor(cIdx);
    updateAdvisorSection();
    updateSummary();
  }

  function onProductChange(cIdx, cmIdx, sel) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const val = sel.value;
    if (val === '__OTHER__') {
      cm.product_name = prompt('Enter custom product name:') || '';
      cm.hs_code = '';
    } else {
      cm.product_name = val;
      const opt = sel.options[sel.selectedIndex];
      cm.hs_code = opt?.dataset?.hs || '';
    }
    document.getElementById('hsCode_' + cIdx + '_' + cmIdx).value = cm.hs_code;
    // Re-render to update reefer indicator for the specific product
    renderContainerForm(cIdx);
    updateAdvisorSection();
    updateSummary();
  }

  async function onHsCodeChange(cIdx, cmIdx, hsCode) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    cm.hs_code = hsCode;
    if (hsCode.length < 4) return;
    const normalized = hsCode.replace(/\\./g, '');
    for (const ct of STATE.commodityTypes) {
      for (const p of ct.products) {
        const pNorm = p.hs_code.replace(/\\./g, '');
        if (pNorm === normalized || pNorm.startsWith(normalized) || normalized.startsWith(pNorm)) {
          cm.commodity_type = ct.type;
          cm.product_name = p.name;
          renderContainerForm(cIdx);
          updateAdvisorSection();
          return;
        }
      }
    }
    try {
      const res = await fetch(API + '/ref/hs-search?q=' + encodeURIComponent(hsCode)).then(r => r.json());
      if (res.data?.length > 0) {
        const match = res.data[0];
        cm.commodity_type = match.commodity_type;
        cm.product_name = match.name;
        renderContainerForm(cIdx);
        updateAdvisorSection();
      }
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // PACKAGING & WEIGHT HANDLERS — Custom weight entry is prominent
  // ═══════════════════════════════════════════════════════════════════
  function onPackagingChange(cIdx, cmIdx, sel) {
    const cm = STATE.containers[cIdx].commodities[cmIdx];
    const opt = sel.options[sel.selectedIndex];
    cm.packaging_code = sel.value;
    const netWt = parseFloat(opt?.dataset?.net);
    const tareWt = parseFloat(opt?.dataset?.tare) || 0;
    cm.tare_weight_per_unit = tareWt;
    // Set as DEFAULT only if user hasn't already customized
    if (netWt && !isNaN(netWt)) {
      const netWtInput = document.getElementById('netWt_' + cIdx + '_' + cmIdx);
      if (!netWtInput.value || netWtInput.value === '0') {
        cm.net_weight_per_unit = netWt;
        netWtInput.value = netWt;
      }
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

    let totalUnits = 0, totalNetKg = 0, totalGrossKg = 0;

    if (cm.quantity_type === 'UNITS' && cm.quantity_value) {
      totalUnits = cm.quantity_value;
      totalNetKg = totalUnits * netPerUnit;
      totalGrossKg = totalUnits * grossPerUnit;
    } else if (cm.quantity_type === 'WEIGHT' && cm.quantity_value) {
      let totalWeightKg = cm.quantity_value;
      const wu = (cm.weight_unit || 'KG').toUpperCase();
      if (wu === 'TONS' || wu === 'MT') totalWeightKg *= 1000;
      else if (wu === 'LBS') totalWeightKg *= 0.453592;
      totalNetKg = totalWeightKg;
      if (netPerUnit > 0) totalUnits = Math.ceil(totalWeightKg / netPerUnit);
      totalGrossKg = totalUnits * grossPerUnit;
    }

    cm.total_units = totalUnits || null;
    cm.total_net_weight = totalNetKg || null;
    cm.total_gross_weight = totalGrossKg || null;

    cm.packaging_description = netPerUnit > 0
      ? totalUnits + ' x ' + netPerUnit + ' kg ' + (getPackagingLabel(cm.packaging_code) || cm.packaging_code)
      : '';

    // Update displays — DUAL kg AND lbs
    const grossUnitLbs = grossPerUnit * KG_TO_LBS;
    const totalNetLbs = totalNetKg * KG_TO_LBS;
    const totalGrossLbs = totalGrossKg * KG_TO_LBS;

    setTxt('grossUnit_' + cIdx + '_' + cmIdx, grossPerUnit > 0 ? grossPerUnit.toFixed(2) + ' kg' : '—');
    setTxt('grossUnitLbs_' + cIdx + '_' + cmIdx, grossPerUnit > 0 ? grossUnitLbs.toFixed(2) + ' lbs' : '');
    setTxt('totalUnits_' + cIdx + '_' + cmIdx, totalUnits || '—');
    setTxt('totalNet_' + cIdx + '_' + cmIdx, totalNetKg > 0 ? fmtKg(totalNetKg) + ' kg' : '—');
    setTxt('totalNetLbs_' + cIdx + '_' + cmIdx, totalNetKg > 0 ? fmtLbs(totalNetKg) + ' lbs' : '');
    setTxt('totalGross_' + cIdx + '_' + cmIdx, totalGrossKg > 0 ? fmtKg(totalGrossKg) + ' kg' : '—');
    setTxt('totalGrossLbs_' + cIdx + '_' + cmIdx, totalGrossKg > 0 ? fmtLbs(totalGrossKg) + ' lbs' : '');
    setTxt('pkgDesc_' + cIdx + '_' + cmIdx, cm.packaging_description);

    updateSummary();
  }

  function getPackagingLabel(code) {
    const pkg = STATE.packagingTypes.find(p => (p.code || p.id) === code);
    return pkg?.label || '';
  }

  // ═══════════════════════════════════════════════════════════════════
  // PORT LOADING (BUYER = ONLY DISCHARGE PORTS)
  // ═══════════════════════════════════════════════════════════════════
  function onOriginCountryChange(cIdx, val) {
    STATE.containers[cIdx].origin_country = val;
    // Buyer does NOT get port of loading — only country of origin
    renderContainerTabs();
    updateSummary();
  }

  function onDestCountryChange(cIdx, val) {
    STATE.containers[cIdx].destination_country = val;
    loadDischargePorts(cIdx, val);
    renderContainerTabs();
    updateSummary();
  }

  function onPortDischargeChange(cIdx, sel) {
    const opt = sel.options[sel.selectedIndex];
    STATE.containers[cIdx].port_of_discharge = sel.value;
    STATE.containers[cIdx].port_of_discharge_unlocode = opt?.dataset?.unlocode || '';
  }

  async function loadDischargePorts(cIdx, countryCode, preselected) {
    const sel = document.getElementById('ct_pod_' + cIdx);
    if (!sel || !countryCode) return;
    try {
      const res = await fetch(API + '/trade-form/ports?country=' + countryCode + '&transport_mode=' + STATE.transportMode + '&direction=discharge').then(r => r.json());
      let portsList = res.data || [];
      if (portsList.length === 0) {
        const staticRes = await fetch(API + '/ref/ports?country=' + countryCode).then(r => r.json());
        portsList = staticRes.data || [];
      }
      sel.innerHTML = '<option value="">Select port of discharge...</option>' +
        portsList.map(p => '<option value="' + escHtml(p.name || p.unlocode) + '" data-unlocode="' + (p.unlocode || p.code || '') + '"' +
          ((p.name === preselected || p.unlocode === preselected) ? ' selected' : '') + '>' +
          escHtml(p.name) + ' (' + (p.unlocode || p.code || '') + ')' + (p.port_type ? ' [' + p.port_type + ']' : '') + '</option>').join('');
      if (portsList.length === 1 && !preselected) {
        sel.selectedIndex = 1;
        STATE.containers[cIdx].port_of_discharge = portsList[0].name || portsList[0].unlocode;
        STATE.containers[cIdx].port_of_discharge_unlocode = portsList[0].unlocode || portsList[0].code || '';
      }
    } catch (e) {
      console.warn('Failed to load discharge ports for ' + countryCode, e);
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
    updateAdvisorSection();
    updateSummary();
  }

  // ═══════════════════════════════════════════════════════════════════
  // AI ADVISOR SECTION — aggregated reefer/container recommendations
  // ═══════════════════════════════════════════════════════════════════
  function updateAdvisorSection() {
    const section = document.getElementById('advisorSection');
    const content = document.getElementById('advisorContent');
    const allCommodities = STATE.containers.flatMap(c => c.commodities.filter(cm => cm.commodity_type));
    if (allCommodities.length === 0) { section.classList.add('hidden'); return; }

    // Check if any commodity needs reefer
    const reeferCommodities = allCommodities.filter(cm => {
      const advice = getReeferAdvice(cm.commodity_type, cm.product_name);
      return advice && advice.reefer;
    });

    if (reeferCommodities.length === 0 && allCommodities.length > 0) {
      section.classList.remove('hidden');
      content.innerHTML = '<div class="flex items-center gap-2 text-sm text-green-400">' +
        '<i class="fas fa-check-circle"></i> All commodities can use standard (non-reefer) containers.' +
        '</div>' +
        '<div class="text-xs text-slate-400 mt-1">No temperature-controlled transport required for the selected commodity types.</div>';
      return;
    }

    section.classList.remove('hidden');
    section.classList.add('advisor-glow');

    let html = '<div class="text-xs text-cyan-300 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i> Temperature-controlled transport recommended for ' + reeferCommodities.length + ' commodity(ies):</div>';
    html += '<div class="space-y-2">';

    const seen = new Set();
    reeferCommodities.forEach(cm => {
      const key = cm.commodity_type + '|' + (cm.product_name || '');
      if (seen.has(key)) return;
      seen.add(key);
      const advice = getReeferAdvice(cm.commodity_type, cm.product_name);
      html += '<div class="bg-slate-800/60 rounded-lg p-3">' +
        '<div class="flex items-center gap-2 mb-1">' +
          '<i class="fas fa-snowflake text-cyan-400"></i>' +
          '<span class="text-sm font-semibold text-white">' + escHtml(cm.product_name || cm.commodity_type) + '</span>' +
          '<span class="advisor-badge">' + advice.temp_display + '</span>' +
        '</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">' +
          '<div><span class="text-slate-400">Temperature:</span> <span class="text-cyan-300">' + advice.temp_display + '</span></div>' +
          '<div><span class="text-slate-400">Humidity:</span> <span class="text-cyan-300">' + (advice.humidity || 'N/A') + '</span></div>' +
          '<div><span class="text-slate-400">Air Circ:</span> <span class="text-cyan-300">' + (advice.air_circ ? advice.air_circ + ' CBM/hr' : 'Standard') + '</span></div>' +
          '<div><span class="text-slate-400">Ethylene:</span> <span class="' + (advice.ethylene ? 'text-amber-400' : 'text-slate-500') + '">' + (advice.ethylene ? 'Management Required' : 'N/A') + '</span></div>' +
        '</div>' +
        '<div class="text-[10px] text-slate-400 mt-1">' + escHtml(advice.notes || '') + '</div>' +
      '</div>';
    });
    html += '</div>';

    // Suggest container type if reefer needed
    const hasReeferContainer = STATE.containers.some(c => c.container_type.includes('RF'));
    if (reeferCommodities.length > 0 && !hasReeferContainer) {
      html += '<div class="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">' +
        '<i class="fas fa-exclamation-triangle text-amber-400"></i>' +
        '<span class="text-xs text-amber-300">You have reefer-required commodities but no reefer container selected. Consider switching to 40ft_RF or 40ft_HC_RF.</span>' +
      '</div>';
    }

    content.innerHTML = html;
  }

  function showAdvisorDetail(commodityType, productName) {
    const advice = getReeferAdvice(commodityType, productName);
    const msg = 'AI Container Advisor — ' + (productName || commodityType) + '\\n\\n' +
      'Container: ' + advice.label + '\\n' +
      'Temperature: ' + advice.temp_display + '\\n' +
      'Humidity: ' + (advice.humidity || 'N/A') + '\\n' +
      'Air Circulation: ' + (advice.air_circ ? advice.air_circ + ' CBM/hr' : 'Standard') + '\\n' +
      'Ethylene Management: ' + (advice.ethylene ? 'Required' : 'Not Required') + '\\n\\n' +
      'Notes: ' + (advice.notes || 'No specific notes.');
    alert(msg);
  }

  function checkContainerAdvisor(cIdx) {
    // Auto-suggest reefer if any commodity in this container needs it
    const c = STATE.containers[cIdx];
    const needsReefer = c.commodities.some(cm => {
      const advice = getReeferAdvice(cm.commodity_type, cm.product_name);
      return advice && advice.reefer;
    });
    if (needsReefer && !c.container_type.includes('RF')) {
      // Don't auto-change, just show advisor
      updateAdvisorSection();
    }
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
    // Save port of discharge selection (buyer only sees discharge)
    const podSel = document.getElementById('ct_pod_' + idx);
    if (podSel) {
      c.port_of_discharge = podSel.value;
      const opt = podSel.options[podSel.selectedIndex];
      c.port_of_discharge_unlocode = opt?.dataset?.unlocode || '';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY UPDATE
  // ═══════════════════════════════════════════════════════════════════
  function updateSummary() {
    document.getElementById('sumContainers').textContent = STATE.containers.length;
    const totalCommodities = STATE.containers.reduce((s, c) => s + c.commodities.filter(cm => cm.commodity_type).length, 0);
    document.getElementById('sumCommodities').textContent = totalCommodities;

    const totalGrossKg = STATE.containers.reduce((s, c) =>
      s + c.commodities.reduce((ss, cm) => ss + (cm.total_gross_weight || 0), 0), 0);
    const totalGrossLbs = totalGrossKg * KG_TO_LBS;
    document.getElementById('sumGrossWeightKg').textContent = totalGrossKg > 0 ? fmtKg(totalGrossKg) + ' kg' : '0 kg';
    document.getElementById('sumGrossWeightLbs').textContent = totalGrossKg > 0 ? fmtLbs(totalGrossKg) + ' lbs' : '0 lbs';

    const modeLabels = { SEA_CARGO: 'Sea', AIR_CARGO: 'Air', INTERNATIONAL_TRUCKING: 'Truck', RAIL_CARGO: 'Rail', MULTIMODAL: 'Multi' };
    document.getElementById('sumTransport').textContent = modeLabels[STATE.transportMode] || STATE.transportMode;
    document.getElementById('sumIncoterm').textContent = STATE.incoterm || '—';
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
      incoterm: STATE.incoterm,
      seller_gtid: STATE.sellerGtid || document.getElementById('sellerGtid').value || null,
      seller_company_name: STATE.sellerCompanyName || document.getElementById('sellerCompanyName').value || null,
      target_price: STATE.targetPrice,
      target_currency: STATE.targetCurrency,
      target_price_unit: STATE.targetPriceUnit,
      containers: STATE.containers,
      global_notes: document.getElementById('globalNotes').value,
      multi_shipment_enabled: STATE.multiShipmentEnabled,
      shipments: STATE.multiShipmentEnabled ? STATE.shipments : [],
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
    if (!STATE.incoterm) {
      showGovernorConditional({ gate_id: 'G1U7', conditions: ['Incoterm is required. Please select an Incoterm before submitting.'] });
      return;
    }

    // G1U7: Validate per-container data consistency
    for (let i = 0; i < STATE.containers.length; i++) {
      const c = STATE.containers[i];
      if (!c.origin_country) {
        showGovernorConditional({ gate_id: 'G1U7', conditions: ['Container ' + (i+1) + ': Country of origin is required.'] });
        switchContainer(i); return;
      }
      if (!c.destination_country) {
        showGovernorConditional({ gate_id: 'G1U7', conditions: ['Container ' + (i+1) + ': Destination country is required.'] });
        switchContainer(i); return;
      }
      for (let j = 0; j < c.commodities.length; j++) {
        const cm = c.commodities[j];
        if (!cm.commodity_type) {
          showGovernorConditional({ gate_id: 'G1U7', conditions: ['Container ' + (i+1) + ', Commodity ' + (j+1) + ': Commodity type is required.'] });
          switchContainer(i); return;
        }
        if (!cm.product_name) {
          showGovernorConditional({ gate_id: 'G1U7', conditions: ['Container ' + (i+1) + ', Commodity ' + (j+1) + ': Product is required.'] });
          switchContainer(i); return;
        }
        // G1U7: Pallet count must be >= 0
        if (cm.num_pallets != null && cm.num_pallets < 0) {
          showGovernorConditional({ gate_id: 'G1U7', conditions: ['Container ' + (i+1) + ', Commodity ' + (j+1) + ': Pallet count cannot be negative.'] });
          switchContainer(i); return;
        }
      }
    }

    // G1U10: Multi-shipment schedule validation
    if (STATE.multiShipmentEnabled) {
      if (STATE.shipments.length === 0) {
        showGovernorConditional({ gate_id: 'G1U10', conditions: ['Multi-shipment is enabled but no shipments are defined. Add at least one shipment or disable multi-shipment.'] });
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < STATE.shipments.length; i++) {
        const s = STATE.shipments[i];
        if (!s.delivery_date || s.delivery_date <= today) {
          showGovernorConditional({ gate_id: 'G1U10', conditions: ['Shipment ' + (i+1) + ': Delivery date must be in the future.'] });
          return;
        }
        if (s.container_count < 1) {
          showGovernorConditional({ gate_id: 'G1U10', conditions: ['Shipment ' + (i+1) + ': Container count must be at least 1.'] });
          return;
        }
      }
    }

    // Commodity compatibility warnings (advisory — don't block, just warn)
    const compatWarnings = checkCommodityCompatibility();
    if (compatWarnings.length > 0) {
      if (!confirm('Warning: ' + compatWarnings.length + ' commodity compatibility issue(s) detected. Proceed anyway?')) return;
    }

    if (!confirm('Submit this trade request with ' + STATE.containers.length + ' container(s) under ' + STATE.incoterm + '?' +
      (STATE.multiShipmentEnabled ? '\\n\\nMulti-shipment: ' + STATE.shipments.length + ' scheduled shipment(s)' : ''))) return;

    try {
      const res = await fetch(API + '/trade-form/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: STATE.tenantId,
          draft_id: STATE.draftId,
          transport_mode: STATE.transportMode,
          incoterm: STATE.incoterm,
          seller_gtid: STATE.sellerGtid || document.getElementById('sellerGtid').value || null,
          seller_company_name: STATE.sellerCompanyName || document.getElementById('sellerCompanyName').value || null,
          target_price: STATE.targetPrice,
          target_currency: STATE.targetCurrency,
          target_price_unit: STATE.targetPriceUnit,
          containers: STATE.containers,
          global_notes: document.getElementById('globalNotes').value,
          multi_shipment_enabled: STATE.multiShipmentEnabled,
          multi_shipment_schedule: STATE.multiShipmentEnabled ? STATE.shipments : null,
          marketplace_attribution: STATE.marketplaceAttribution,
          container_override_log: STATE.containerOverrideLog,
        }),
      }).then(r => r.json());

      if (res.error) {
        // G1U11: Show PlainLanguage Decision Panel for governor denials
        if (res.governor) {
          if (res.governor.verdict === 'DENY') {
            showGovernorDeny(res.governor);
          } else if (res.governor.verdict === 'CONDITIONAL') {
            showGovernorConditional(res.governor);
          }
        } else {
          showGovernorModal('deny', 'Submission Error', res.error,
            '<p class="text-sm text-red-300">' + escHtml(res.error) + '</p>');
        }
        return;
      }
      alert('Trade request submitted successfully!\\nID: ' + (res.data?.trade_request_id || 'N/A') + '\\nStatus: ' + (res.data?.status || 'N/A') + '\\nIncoterm: ' + STATE.incoterm +
        (STATE.multiShipmentEnabled ? '\\nShipments: ' + STATE.shipments.length : ''));
      window.location.href = '/app';
    } catch (e) {
      alert('Failed to submit: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function fmtKg(kg) { return Math.round(kg).toLocaleString(); }
  function fmtLbs(kg) { return Math.round(kg * KG_TO_LBS).toLocaleString(); }
  function setTxt(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
  </script>
</body>
</html>`;
}

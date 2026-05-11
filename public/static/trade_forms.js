// SGTX Platform v6.3 — Comprehensive Trade Request Forms
// Importer: Multi-container trade initiation with per-container commodity details
// Exporter: Quote response with port of loading + alternative destination pricing

// ═══════════════════════════════════════════════════════════════════
// REFERENCE DATA CACHE (loaded once from API)
// ═══════════════════════════════════════════════════════════════════
let _refCountries = null;
let _refPorts = {};
let _refCommodityTypes = null;
let _refPackaging = null;
let _refPalletSizes = null;
let _refContainerTypes = null;
let _refIncoterms = null;

async function loadRefData() {
  if (!_refCountries) {
    const [countries, commodities, packaging, pallets, containers, incoterms] = await Promise.all([
      api('/ref/countries'), api('/ref/commodity-types'), api('/ref/packaging'),
      api('/ref/pallet-sizes'), api('/ref/container-types'), api('/ref/incoterms'),
    ]);
    _refCountries = countries.data || [];
    _refCommodityTypes = commodities.data || [];
    _refPackaging = packaging.data || [];
    _refPalletSizes = pallets.data || [];
    _refContainerTypes = containers.data || [];
    _refIncoterms = incoterms.data || [];
  }
}

async function loadPortsForCountry(countryCode) {
  if (!countryCode) return [];
  if (_refPorts[countryCode]) return _refPorts[countryCode];
  const r = await api('/ref/ports?country=' + countryCode);
  _refPorts[countryCode] = r.data || [];
  return _refPorts[countryCode];
}

// ═══════════════════════════════════════════════════════════════════
// HTML BUILDERS — Dropdown generators
// ═══════════════════════════════════════════════════════════════════
function countryOptions(selected) {
  if (!_refCountries) return '<option value="">Loading...</option>';
  return '<option value="">-- Select Country --</option>' +
    _refCountries.map(c =>
      `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${c.name} (${c.code})</option>`
    ).join('');
}

function commodityTypeOptions(selected) {
  if (!_refCommodityTypes) return '<option value="">Loading...</option>';
  return '<option value="">-- Select Commodity Type --</option>' +
    _refCommodityTypes.map(ct =>
      `<option value="${ct.type}" ${ct.type === selected ? 'selected' : ''}>${ct.label}</option>`
    ).join('');
}

function productOptionsForType(type, selected) {
  if (!_refCommodityTypes) return '<option value="">Loading...</option>';
  const ct = _refCommodityTypes.find(c => c.type === type);
  if (!ct) return '<option value="">-- Select commodity type first --</option>';
  return '<option value="">-- Select Product --</option>' +
    ct.products.map(p =>
      `<option value="${p.name}" data-hs="${p.hs_code}" ${p.name === selected ? 'selected' : ''}>${p.name} (HS: ${p.hs_code})</option>`
    ).join('') +
    '<option value="__OTHER__">Other (type manually)</option>';
}

function packagingOptions(selected) {
  if (!_refPackaging) return '<option>boxes</option>';
  return _refPackaging.map(p =>
    `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.label}</option>`
  ).join('');
}

function palletSizeOptions(selected) {
  if (!_refPalletSizes) return '<option value="120x100">1200x1000 mm</option>';
  return _refPalletSizes.map(p =>
    `<option value="${p.id}" ${p.id === (selected || '120x100') ? 'selected' : ''}>${p.label}</option>`
  ).join('');
}

function containerTypeOptions(selected) {
  if (!_refContainerTypes) return '<option value="40ft_HC">40\' High Cube</option>';
  return _refContainerTypes.map(ct =>
    `<option value="${ct.id}" ${ct.id === (selected || '40ft_HC') ? 'selected' : ''}>${ct.label} (${ct.capacity_cbm} CBM, max ${(ct.max_payload_kg/1000).toFixed(1)}t)</option>`
  ).join('');
}

function incotermOptions(selected) {
  if (!_refIncoterms) return '<option value="CIF">CIF</option>';
  return _refIncoterms.map(i =>
    `<option value="${i.code}" ${i.code === (selected || 'CIF') ? 'selected' : ''}>${i.code} — ${i.label}</option>`
  ).join('');
}

function portOptions(ports, selected) {
  if (!ports || ports.length === 0) return '<option value="">-- Select country first --</option>';
  return '<option value="">-- Select Port --</option>' +
    ports.map(p =>
      `<option value="${p.code}" ${p.code === selected ? 'selected' : ''}>${p.name} (${p.code})</option>`
    ).join('');
}

// ═══════════════════════════════════════════════════════════════════
// TRADE FORM STATE
// ═══════════════════════════════════════════════════════════════════
let tradeFormState = {
  containers: [],
  nextContainerId: 1,
};

function resetTradeFormState() {
  tradeFormState = { containers: [], nextContainerId: 1 };
}

function addContainer(cloneFrom) {
  const cid = tradeFormState.nextContainerId++;
  let newContainer;
  if (cloneFrom) {
    const src = tradeFormState.containers.find(c => c.cid === cloneFrom);
    if (src) {
      newContainer = JSON.parse(JSON.stringify(src));
      newContainer.cid = cid;
      newContainer.clonedFrom = cloneFrom;
      // Deep copy commodities with new sort orders
      newContainer.commodities = (src.commodities || []).map((cm, i) => ({ ...cm, cmid: Date.now() + i }));
    }
  }
  if (!newContainer) {
    newContainer = {
      cid,
      container_type: '40ft_HC',
      origin_country: '',
      destination_country: '',
      port_of_discharge: '',
      palletized: true,
      pallet_size: '120x100',
      notes: '',
      clonedFrom: null,
      commodities: [{ cmid: Date.now(), commodity_type: '', product_name: '', hs_code: '', product_specification: '', packaging: 'boxes', packaging_custom: '', num_pallets: 1, quantity: '', unit: 'KG' }],
    };
  }
  tradeFormState.containers.push(newContainer);
  return cid;
}

function removeContainer(cid) {
  tradeFormState.containers = tradeFormState.containers.filter(c => c.cid !== cid);
}

function addCommodityToContainer(cid) {
  const ct = tradeFormState.containers.find(c => c.cid === cid);
  if (ct) {
    ct.commodities.push({ cmid: Date.now(), commodity_type: '', product_name: '', hs_code: '', product_specification: '', packaging: 'boxes', packaging_custom: '', num_pallets: 1, quantity: '', unit: 'KG' });
  }
}

function removeCommodityFromContainer(cid, cmid) {
  const ct = tradeFormState.containers.find(c => c.cid === cid);
  if (ct && ct.commodities.length > 1) {
    ct.commodities = ct.commodities.filter(cm => cm.cmid !== cmid);
  }
}

// ═══════════════════════════════════════════════════════════════════
// IMPORTER TRADE REQUEST FORM — Full Wizard
// ═══════════════════════════════════════════════════════════════════
async function showTradeWizardV2() {
  await loadRefData();
  resetTradeFormState();
  addContainer(); // Start with 1 container

  const html = buildTradeWizardHTML();
  // Use full-page overlay instead of modal for complex forms
  showFullPageForm(html);
}

function buildTradeWizardHTML() {
  return `
    <div class="trade-wizard">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-ship mr-2 text-sgtx-500"></i>New Trade Request</h2>
          <p class="text-xs text-gray-500 mt-1">Phase 1 — Multi-container trade initiation with AI governance overlay</p>
        </div>
        <button onclick="closeFullPageForm()" class="text-gray-400 hover:text-gray-600 text-xl"><i class="fas fa-times"></i></button>
      </div>

      <form id="trade-wizard-form" onsubmit="submitTradeV2(event)">
        <!-- ── Header: Basic Trade Info ── -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-info-circle mr-1 text-blue-500"></i>Trade Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Importer Tenant</label>
              <input id="tw-importer" class="tw-input" value="${tenant?.id || ''}" readonly>
              <div class="text-[10px] text-gray-400 mt-0.5">${tenant?.legal_name || ''}</div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Exporter GTID <span class="text-gray-300">(optional — leave blank for marketplace)</span></label>
              <input id="tw-exporter-gtid" class="tw-input" placeholder="SGTX-XX-TRD-NNNNNN-XXXX" oninput="resolveGTIDPreview(this.value, 'tw-gtid-preview')">
              <div id="tw-gtid-preview" class="text-[10px] mt-0.5"></div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Incoterm</label>
              <select id="tw-incoterm" class="tw-input">${incotermOptions('CIF')}</select>
            </div>
          </div>
        </div>

        <!-- ── Number of Containers ── -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-box mr-1 text-orange-500"></i>Containers <span id="tw-container-count" class="text-xs font-normal text-gray-400">(${tradeFormState.containers.length})</span></h3>
            <div class="flex gap-2">
              <button type="button" onclick="twAddContainer()" class="text-xs bg-sgtx-500 text-white px-3 py-1.5 rounded-lg hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Add Container</button>
              ${tradeFormState.containers.length > 0 ? `
              <div class="relative inline-block">
                <button type="button" onclick="twToggleCloneMenu()" class="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600"><i class="fas fa-clone mr-1"></i>Clone Container</button>
                <div id="tw-clone-menu" class="hidden absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                  ${tradeFormState.containers.map(c => `<button type="button" onclick="twCloneContainer(${c.cid})" class="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">Clone Container #${c.cid}</button>`).join('')}
                </div>
              </div>` : ''}
            </div>
          </div>
          <div id="tw-containers-area">
            ${tradeFormState.containers.map(c => renderContainerCard(c)).join('')}
          </div>
        </div>

        <!-- ── General Notes ── -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <label class="block text-xs text-gray-500 mb-1"><i class="fas fa-sticky-note mr-1 text-yellow-500"></i>Additional Notes</label>
          <textarea id="tw-notes" class="tw-input" rows="2" placeholder="Any other notes for this trade request..."></textarea>
        </div>

        <!-- ── Submit ── -->
        <div class="flex gap-3">
          <button type="submit" class="flex-1 bg-sgtx-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-sgtx-600 transition-all shadow-md">
            <i class="fas fa-paper-plane mr-2"></i>Submit Trade Request (Governor Gated)
          </button>
          <button type="button" onclick="closeFullPageForm()" class="px-6 py-3 border rounded-xl text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>`;
}

function renderContainerCard(ct) {
  const isClone = ct.clonedFrom ? `<span class="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-2"><i class="fas fa-clone mr-1"></i>Cloned from #${ct.clonedFrom}</span>` : '';

  return `
    <div class="container-card bg-gray-50 rounded-xl border border-gray-200 p-4 mb-3" id="ct-card-${ct.cid}" data-cid="${ct.cid}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <span class="bg-sgtx-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mr-2">${ct.cid}</span>
          <span class="text-sm font-semibold text-gray-700">Container #${ct.cid}</span>
          ${isClone}
        </div>
        ${tradeFormState.containers.length > 1 ? `<button type="button" onclick="twRemoveContainer(${ct.cid})" class="text-red-400 hover:text-red-600 text-xs"><i class="fas fa-trash mr-1"></i>Remove</button>` : ''}
      </div>

      <!-- Container Settings Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label class="block text-[10px] text-gray-500 mb-0.5">Container Type</label>
          <select class="tw-input text-xs" data-field="container_type" onchange="twUpdateContainer(${ct.cid}, 'container_type', this.value)">${containerTypeOptions(ct.container_type)}</select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-500 mb-0.5">Palletized?</label>
          <select class="tw-input text-xs" data-field="palletized" onchange="twUpdateContainer(${ct.cid}, 'palletized', this.value); twTogglePalletSize(${ct.cid}, this.value)">
            <option value="1" ${ct.palletized ? 'selected' : ''}>Yes — Palletized</option>
            <option value="0" ${!ct.palletized ? 'selected' : ''}>No — Not Palletized</option>
          </select>
        </div>
        <div id="ct-pallet-size-wrap-${ct.cid}" style="${ct.palletized ? '' : 'display:none'}">
          <label class="block text-[10px] text-gray-500 mb-0.5">Pallet Size</label>
          <select class="tw-input text-xs" data-field="pallet_size" onchange="twUpdateContainer(${ct.cid}, 'pallet_size', this.value)">${palletSizeOptions(ct.pallet_size)}</select>
        </div>
      </div>

      <!-- Origin/Destination Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="block text-[10px] text-gray-500 mb-0.5">Country of Origin</label>
          <select class="tw-input text-xs" data-field="origin_country" onchange="twUpdateContainer(${ct.cid}, 'origin_country', this.value)">${countryOptions(ct.origin_country)}</select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-500 mb-0.5">Destination Country</label>
          <select class="tw-input text-xs" data-field="destination_country" onchange="twUpdateContainer(${ct.cid}, 'destination_country', this.value); twLoadPorts(${ct.cid}, this.value)">${countryOptions(ct.destination_country)}</select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-500 mb-0.5">Port of Discharge</label>
          <select class="tw-input text-xs" id="ct-pod-${ct.cid}" data-field="port_of_discharge" onchange="twUpdateContainer(${ct.cid}, 'port_of_discharge', this.value)">
            <option value="">-- Select destination country first --</option>
          </select>
        </div>
      </div>

      <!-- Commodities in this container -->
      <div class="mb-2">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-gray-600"><i class="fas fa-boxes mr-1 text-green-500"></i>Commodities in Container #${ct.cid}</label>
          <button type="button" onclick="twAddCommodity(${ct.cid})" class="text-[10px] bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"><i class="fas fa-plus mr-1"></i>Add Commodity</button>
        </div>
        <div id="ct-commodities-${ct.cid}">
          ${(ct.commodities || []).map((cm, i) => renderCommodityRow(ct.cid, cm, i)).join('')}
        </div>
      </div>

      <!-- Container Notes -->
      <div>
        <label class="block text-[10px] text-gray-500 mb-0.5">Container Notes</label>
        <input class="tw-input text-xs" data-field="notes" value="${ct.notes || ''}" placeholder="Optional notes for this container..." onchange="twUpdateContainer(${ct.cid}, 'notes', this.value)">
      </div>
    </div>`;
}

function renderCommodityRow(cid, cm, index) {
  return `
    <div class="commodity-row bg-white rounded-lg border border-gray-100 p-3 mb-2" data-cid="${cid}" data-cmid="${cm.cmid}">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-semibold text-gray-500">Commodity #${index + 1}</span>
        <button type="button" onclick="twRemoveCommodity(${cid}, ${cm.cmid})" class="text-red-300 hover:text-red-500 text-[10px]"><i class="fas fa-times"></i></button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Commodity Type</label>
          <select class="tw-input text-xs" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'commodity_type', this.value); twRefreshProducts(${cid}, ${cm.cmid}, this.value)">${commodityTypeOptions(cm.commodity_type)}</select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Product</label>
          <select class="tw-input text-xs" id="cm-product-${cid}-${cm.cmid}" onchange="twOnProductSelect(${cid}, ${cm.cmid}, this)">${productOptionsForType(cm.commodity_type, cm.product_name)}</select>
          <input class="tw-input text-xs mt-1 hidden" id="cm-product-custom-${cid}-${cm.cmid}" placeholder="Type product name..." onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'product_name', this.value)" value="${cm.product_name || ''}">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">HS Code</label>
          <input class="tw-input text-xs" id="cm-hs-${cid}-${cm.cmid}" value="${cm.hs_code || ''}" placeholder="Auto or manual" oninput="twSearchHS(this, ${cid}, ${cm.cmid})" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'hs_code', this.value)">
          <div id="cm-hs-results-${cid}-${cm.cmid}" class="hidden absolute bg-white border rounded shadow-lg z-50 max-h-32 overflow-y-auto text-[10px]"></div>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Product Specification</label>
          <input class="tw-input text-xs" value="${cm.product_specification || ''}" placeholder="Grade A, Size 56-64, etc." onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'product_specification', this.value)">
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Packaging</label>
          <select class="tw-input text-xs" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'packaging', this.value); twToggleCustomPackaging(${cid}, ${cm.cmid}, this.value)">${packagingOptions(cm.packaging)}</select>
          <input class="tw-input text-xs mt-1 ${cm.packaging === 'other' ? '' : 'hidden'}" id="cm-pkg-custom-${cid}-${cm.cmid}" placeholder="Describe packaging..." value="${cm.packaging_custom || ''}" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'packaging_custom', this.value)">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Number of Pallets</label>
          <input type="number" min="1" class="tw-input text-xs" value="${cm.num_pallets || 1}" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'num_pallets', parseInt(this.value))">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Quantity</label>
          <input type="number" step="0.01" class="tw-input text-xs" value="${cm.quantity || ''}" placeholder="e.g. 5000" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'quantity', parseFloat(this.value))">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Unit</label>
          <select class="tw-input text-xs" onchange="twUpdateCommodity(${cid}, ${cm.cmid}, 'unit', this.value)">
            <option ${cm.unit === 'KG' ? 'selected' : ''}>KG</option>
            <option ${cm.unit === 'MT' ? 'selected' : ''}>MT</option>
            <option ${cm.unit === 'LBS' ? 'selected' : ''}>LBS</option>
            <option ${cm.unit === 'PCS' ? 'selected' : ''}>PCS</option>
            <option ${cm.unit === 'CARTONS' ? 'selected' : ''}>CARTONS</option>
            <option ${cm.unit === 'BAGS' ? 'selected' : ''}>BAGS</option>
            <option ${cm.unit === 'CBM' ? 'selected' : ''}>CBM</option>
            <option ${cm.unit === 'LITRES' ? 'selected' : ''}>LITRES</option>
          </select>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// FORM INTERACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════
function twAddContainer(cloneFrom) {
  const cid = addContainer(cloneFrom);
  const menu = document.getElementById('tw-clone-menu');
  if (menu) menu.classList.add('hidden');
  twRedrawContainers();
}

function twCloneContainer(srcCid) {
  addContainer(srcCid);
  const menu = document.getElementById('tw-clone-menu');
  if (menu) menu.classList.add('hidden');
  twRedrawContainers();
}

function twRemoveContainer(cid) {
  if (tradeFormState.containers.length <= 1) return;
  removeContainer(cid);
  twRedrawContainers();
}

function twAddCommodity(cid) {
  addCommodityToContainer(cid);
  twRedrawContainers();
}

function twRemoveCommodity(cid, cmid) {
  removeCommodityFromContainer(cid, cmid);
  twRedrawContainers();
}

function twUpdateContainer(cid, field, value) {
  const ct = tradeFormState.containers.find(c => c.cid === cid);
  if (ct) {
    if (field === 'palletized') ct[field] = value === '1' || value === true;
    else ct[field] = value;
  }
}

function twUpdateCommodity(cid, cmid, field, value) {
  const ct = tradeFormState.containers.find(c => c.cid === cid);
  if (ct) {
    const cm = ct.commodities.find(c => c.cmid === cmid);
    if (cm) cm[field] = value;
  }
}

function twTogglePalletSize(cid, value) {
  const wrap = document.getElementById('ct-pallet-size-wrap-' + cid);
  if (wrap) wrap.style.display = (value === '1' || value === true) ? '' : 'none';
}

function twToggleCustomPackaging(cid, cmid, value) {
  const el = document.getElementById('cm-pkg-custom-' + cid + '-' + cmid);
  if (el) el.classList.toggle('hidden', value !== 'other');
}

function twToggleCloneMenu() {
  const menu = document.getElementById('tw-clone-menu');
  if (menu) menu.classList.toggle('hidden');
}

async function twLoadPorts(cid, countryCode) {
  const ports = await loadPortsForCountry(countryCode);
  const sel = document.getElementById('ct-pod-' + cid);
  if (sel) sel.innerHTML = portOptions(ports);
}

function twRefreshProducts(cid, cmid, commodityType) {
  const sel = document.getElementById('cm-product-' + cid + '-' + cmid);
  if (sel) sel.innerHTML = productOptionsForType(commodityType);
  // Reset HS code
  const hsEl = document.getElementById('cm-hs-' + cid + '-' + cmid);
  if (hsEl) hsEl.value = '';
  // Reset custom product input
  const customEl = document.getElementById('cm-product-custom-' + cid + '-' + cmid);
  if (customEl) { customEl.value = ''; customEl.classList.add('hidden'); }
}

function twOnProductSelect(cid, cmid, selectEl) {
  const val = selectEl.value;
  const customInput = document.getElementById('cm-product-custom-' + cid + '-' + cmid);

  if (val === '__OTHER__') {
    if (customInput) { customInput.classList.remove('hidden'); customInput.focus(); }
    twUpdateCommodity(cid, cmid, 'product_name', '');
  } else {
    if (customInput) customInput.classList.add('hidden');
    twUpdateCommodity(cid, cmid, 'product_name', val);
    // Auto-fill HS code
    const opt = selectEl.selectedOptions[0];
    if (opt && opt.dataset.hs) {
      const hsEl = document.getElementById('cm-hs-' + cid + '-' + cmid);
      if (hsEl) hsEl.value = opt.dataset.hs;
      twUpdateCommodity(cid, cmid, 'hs_code', opt.dataset.hs);
    }
  }
}

let _hsSearchTimer = null;
async function twSearchHS(input, cid, cmid) {
  clearTimeout(_hsSearchTimer);
  const q = input.value;
  const resultsEl = document.getElementById('cm-hs-results-' + cid + '-' + cmid);
  if (!resultsEl || q.length < 2) { if (resultsEl) resultsEl.classList.add('hidden'); return; }

  _hsSearchTimer = setTimeout(async () => {
    const r = await api('/ref/hs-search?q=' + encodeURIComponent(q));
    if (r.data && r.data.length > 0) {
      resultsEl.innerHTML = r.data.map(p =>
        `<div class="px-2 py-1 hover:bg-blue-50 cursor-pointer" onclick="twSelectHS(${cid}, ${cmid}, '${p.hs_code}', '${p.name.replace(/'/g, "\\'")}')">
          <span class="font-mono font-semibold">${p.hs_code}</span> — ${p.name} <span class="text-gray-400">(${p.commodity_label})</span>
        </div>`
      ).join('');
      resultsEl.classList.remove('hidden');
    } else {
      resultsEl.classList.add('hidden');
    }
  }, 300);
}

function twSelectHS(cid, cmid, hsCode, productName) {
  const hsEl = document.getElementById('cm-hs-' + cid + '-' + cmid);
  if (hsEl) hsEl.value = hsCode;
  twUpdateCommodity(cid, cmid, 'hs_code', hsCode);
  twUpdateCommodity(cid, cmid, 'product_name', productName);
  const resultsEl = document.getElementById('cm-hs-results-' + cid + '-' + cmid);
  if (resultsEl) resultsEl.classList.add('hidden');
}

function twRedrawContainers() {
  const area = document.getElementById('tw-containers-area');
  if (area) area.innerHTML = tradeFormState.containers.map(c => renderContainerCard(c)).join('');
  const countEl = document.getElementById('tw-container-count');
  if (countEl) countEl.textContent = '(' + tradeFormState.containers.length + ')';
  // Re-load ports for containers that have destination set
  tradeFormState.containers.forEach(ct => {
    if (ct.destination_country) twLoadPorts(ct.cid, ct.destination_country);
  });
  // Rebuild clone menu
  const menuParent = document.querySelector('#tw-clone-menu');
  if (menuParent) {
    menuParent.innerHTML = tradeFormState.containers.map(c =>
      `<button type="button" onclick="twCloneContainer(${c.cid})" class="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">Clone Container #${c.cid}</button>`
    ).join('');
  }
}

async function resolveGTIDPreview(gtid, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview || gtid.length < 10) { if (preview) preview.innerHTML = ''; return; }
  try {
    const r = await api('/gtid/resolve?gtid=' + encodeURIComponent(gtid));
    if (r.data) preview.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>${r.data.legal_name} (${r.data.jurisdiction})</span>`;
    else preview.innerHTML = '<span class="text-red-500"><i class="fas fa-times-circle mr-1"></i>GTID not found</span>';
  } catch (e) { preview.innerHTML = ''; }
}

// ═══════════════════════════════════════════════════════════════════
// SUBMIT TRADE REQUEST (Multi-Container)
// ═══════════════════════════════════════════════════════════════════
async function submitTradeV2(e) {
  e.preventDefault();

  // Validate containers
  if (tradeFormState.containers.length === 0) {
    alert('Please add at least one container.');
    return;
  }

  // Validate each container has at least one commodity with a product
  for (const ct of tradeFormState.containers) {
    if (!ct.origin_country || !ct.destination_country) {
      alert(`Container #${ct.cid}: Origin and Destination country are required.`);
      return;
    }
    for (const cm of ct.commodities) {
      if (!cm.commodity_type || !cm.product_name) {
        alert(`Container #${ct.cid}: Each commodity must have a type and product selected.`);
        return;
      }
    }
  }

  const payload = {
    importer_tenant_id: document.getElementById('tw-importer').value,
    exporter_gtid: document.getElementById('tw-exporter-gtid').value || null,
    incoterm: document.getElementById('tw-incoterm').value,
    notes: document.getElementById('tw-notes').value || null,
    employee_id: employee?.id || null,
    containers: tradeFormState.containers.map(ct => ({
      container_type: ct.container_type,
      origin_country: ct.origin_country,
      destination_country: ct.destination_country,
      port_of_discharge: ct.port_of_discharge || null,
      palletized: ct.palletized,
      pallet_size: ct.palletized ? ct.pallet_size : null,
      cloned_from: ct.clonedFrom ? `container-${ct.clonedFrom}` : null,
      notes: ct.notes || null,
      commodities: ct.commodities.map(cm => ({
        commodity_type: cm.commodity_type,
        product_name: cm.product_name,
        hs_code: cm.hs_code || null,
        product_specification: cm.product_specification || null,
        packaging: cm.packaging,
        packaging_custom: cm.packaging === 'other' ? cm.packaging_custom : null,
        num_pallets: cm.num_pallets || 1,
        quantity: cm.quantity || null,
        unit: cm.unit || 'KG',
      })),
    })),
  };

  try {
    const r = await apiPost('/trade/initiate', payload);
    if (r.error) {
      alert('Governor Denied: ' + (r.error || JSON.stringify(r)));
      return;
    }
    closeFullPageForm();
    showToast(`Trade initiated with ${payload.containers.length} container(s)!`, 'success');
    navigate('trades');
  } catch (err) {
    alert('Error submitting trade: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTER QUOTE FORM — With Port of Loading + Alternative Destinations
// ═══════════════════════════════════════════════════════════════════
let exporterAlternatives = [];
let _altNextId = 1;

async function showExporterQuoteFormV2(tradeId) {
  await loadRefData();
  exporterAlternatives = [];
  _altNextId = 1;

  // Load trade details including containers
  let tradeData = null;
  let containers = [];
  try {
    const [tr, ct] = await Promise.all([
      api('/trades/' + tradeId),
      api('/trade/' + tradeId + '/containers'),
    ]);
    tradeData = tr.data;
    containers = ct.data || [];
  } catch (e) { }

  const html = `
    <div class="trade-wizard">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800"><i class="fas fa-tag mr-2 text-sgtx-500"></i>Submit Exporter Quote</h2>
          <p class="text-xs text-gray-500 mt-1">Phase 2 — EXW price lock, port of loading, and alternative destination pricing</p>
        </div>
        <button onclick="closeFullPageForm()" class="text-gray-400 hover:text-gray-600 text-xl"><i class="fas fa-times"></i></button>
      </div>

      ${tradeData ? `
      <div class="bg-blue-50 rounded-xl border border-blue-200 p-3 mb-4 text-xs">
        <div class="font-semibold text-blue-700 mb-1"><i class="fas fa-info-circle mr-1"></i>Trade Request Summary</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600">
          <div>Importer: <span class="font-semibold">${tradeData.importer_name || tradeData.importer_tenant_id}</span></div>
          <div>Status: ${badge(tradeData.status)}</div>
          <div>Containers: <span class="font-semibold">${containers.length}</span></div>
          <div>ID: <span class="font-mono">${tradeId?.slice(0, 12)}...</span></div>
        </div>
        ${containers.length > 0 ? `
        <div class="mt-2 space-y-1">
          ${containers.map((ct, i) => `
            <div class="bg-white rounded p-2 border">
              <span class="font-semibold">Container #${ct.container_index || i + 1}</span> — ${ct.container_type} | ${ct.origin_country} → ${ct.destination_country}${ct.port_of_discharge ? ` (${ct.port_of_discharge})` : ''}
              <div class="mt-0.5 text-gray-500">${(ct.commodities || []).map(cm => `${cm.product_name} (${cm.num_pallets} pallets, ${cm.packaging})`).join(', ')}</div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>` : ''}

      <form onsubmit="submitExporterQuoteV2(event, '${tradeId}')">
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-lock mr-1 text-green-500"></i>EXW Price Lock</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Exporter Tenant</label>
              <input id="eq-exporter" class="tw-input" value="${tenant?.id || ''}" readonly>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">EXW Price (USD)</label>
              <input id="eq-price" type="number" step="0.01" class="tw-input" value="" placeholder="Total EXW price" required>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Incoterm</label>
              <select id="eq-incoterm" class="tw-input">${incotermOptions('EXW')}</select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Commodity</label>
              <input id="eq-commodity" class="tw-input" value="${containers[0]?.commodities?.[0]?.product_name || ''}" placeholder="Main commodity">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Validity (days)</label>
              <input id="eq-validity" type="number" class="tw-input" value="15">
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Currency</label>
              <select id="eq-currency" class="tw-input">
                <option value="USD" selected>USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
                <option value="EGP">EGP</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Port of Loading -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-anchor mr-1 text-blue-500"></i>Port of Loading</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Origin Country</label>
              <select id="eq-origin-country" class="tw-input" onchange="eqLoadPorts(this.value)">${countryOptions(containers[0]?.origin_country || '')}</select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Port of Loading</label>
              <select id="eq-pol" class="tw-input">
                <option value="">-- Select origin country first --</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Alternative Destinations with different pricing -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-map-signs mr-1 text-orange-500"></i>Recommended Alternative Destinations <span class="text-xs font-normal text-gray-400">(Optional — Different pricing)</span></h3>
            <button type="button" onclick="eqAddAlternative()" class="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600"><i class="fas fa-plus mr-1"></i>Add Alternative</button>
          </div>
          <div id="eq-alternatives-area">
            ${exporterAlternatives.length === 0 ? '<p class="text-xs text-gray-400 italic">No alternative destinations added. Click "Add Alternative" to suggest different ports with different pricing for the importer to choose from.</p>' : ''}
          </div>
        </div>

        <!-- Notes -->
        <div class="bg-white rounded-xl border p-4 mb-4 shadow-sm">
          <label class="block text-xs text-gray-500 mb-1"><i class="fas fa-sticky-note mr-1 text-yellow-500"></i>Exporter Notes</label>
          <textarea id="eq-notes" class="tw-input" rows="2" placeholder="Additional info for the importer..."></textarea>
        </div>

        <div class="flex gap-3">
          <button type="submit" class="flex-1 bg-sgtx-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-sgtx-600 shadow-md">
            <i class="fas fa-paper-plane mr-2"></i>Submit Quote (Governor Gated)
          </button>
          <button type="button" onclick="closeFullPageForm()" class="px-6 py-3 border rounded-xl text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>`;

  showFullPageForm(html);

  // Auto-load origin country ports
  if (containers[0]?.origin_country) {
    document.getElementById('eq-origin-country').value = containers[0].origin_country;
    eqLoadPorts(containers[0].origin_country);
  }
}

async function eqLoadPorts(countryCode) {
  const ports = await loadPortsForCountry(countryCode);
  const sel = document.getElementById('eq-pol');
  if (sel) sel.innerHTML = portOptions(ports);
}

function eqAddAlternative() {
  const id = _altNextId++;
  exporterAlternatives.push({ id, destination_country: '', port_of_discharge: '', price_per_unit: '', currency: 'USD', notes: '' });
  eqRedrawAlternatives();
}

function eqRemoveAlternative(id) {
  exporterAlternatives = exporterAlternatives.filter(a => a.id !== id);
  eqRedrawAlternatives();
}

function eqUpdateAlternative(id, field, value) {
  const alt = exporterAlternatives.find(a => a.id === id);
  if (alt) alt[field] = value;
}

async function eqLoadAltPorts(altId, countryCode) {
  const ports = await loadPortsForCountry(countryCode);
  const sel = document.getElementById('eq-alt-pod-' + altId);
  if (sel) sel.innerHTML = portOptions(ports);
}

function eqRedrawAlternatives() {
  const area = document.getElementById('eq-alternatives-area');
  if (!area) return;
  if (exporterAlternatives.length === 0) {
    area.innerHTML = '<p class="text-xs text-gray-400 italic">No alternative destinations added.</p>';
    return;
  }
  area.innerHTML = exporterAlternatives.map(alt => `
    <div class="bg-gray-50 rounded-lg border p-3 mb-2">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-gray-600">Alternative #${alt.id}</span>
        <button type="button" onclick="eqRemoveAlternative(${alt.id})" class="text-red-400 hover:text-red-600 text-[10px]"><i class="fas fa-times"></i> Remove</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Destination Country</label>
          <select class="tw-input text-xs" onchange="eqUpdateAlternative(${alt.id}, 'destination_country', this.value); eqLoadAltPorts(${alt.id}, this.value)">${countryOptions(alt.destination_country)}</select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Port of Discharge</label>
          <select class="tw-input text-xs" id="eq-alt-pod-${alt.id}" onchange="eqUpdateAlternative(${alt.id}, 'port_of_discharge', this.value)">
            <option value="">-- Select country first --</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Price (per unit)</label>
          <input type="number" step="0.01" class="tw-input text-xs" value="${alt.price_per_unit}" placeholder="e.g. 3.50" onchange="eqUpdateAlternative(${alt.id}, 'price_per_unit', parseFloat(this.value))">
        </div>
        <div>
          <label class="block text-[10px] text-gray-400 mb-0.5">Notes</label>
          <input class="tw-input text-xs" value="${alt.notes || ''}" placeholder="Reason for price diff..." onchange="eqUpdateAlternative(${alt.id}, 'notes', this.value)">
        </div>
      </div>
    </div>
  `).join('');
}

async function submitExporterQuoteV2(e, tradeId) {
  e.preventDefault();

  const payload = {
    trade_request_id: tradeId,
    exporter_tenant_id: document.getElementById('eq-exporter').value,
    commodity: document.getElementById('eq-commodity').value,
    price_per_unit: parseFloat(document.getElementById('eq-price').value),
    currency: document.getElementById('eq-currency').value,
    incoterm: document.getElementById('eq-incoterm').value,
    validity_days: parseInt(document.getElementById('eq-validity').value),
    port_of_loading: document.getElementById('eq-pol').value || null,
    notes: document.getElementById('eq-notes').value || null,
    recommended_destinations: exporterAlternatives.filter(a => a.destination_country && a.port_of_discharge).map(a => ({
      destination_country: a.destination_country,
      port_of_discharge: a.port_of_discharge,
      price_per_unit: a.price_per_unit,
      currency: a.currency || 'USD',
      notes: a.notes || null,
    })),
  };

  try {
    const r = await apiPost('/quote/exw-lock', payload);
    if (r.error) {
      alert('Governor Denied: ' + (r.error || JSON.stringify(r)));
      return;
    }
    closeFullPageForm();
    showToast('Quote submitted successfully!', 'success');
    navigate('trades');
  } catch (err) {
    alert('Error submitting quote: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// FULL PAGE FORM OVERLAY (for complex forms)
// ═══════════════════════════════════════════════════════════════════
function showFullPageForm(html) {
  let overlay = document.getElementById('full-page-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'full-page-overlay';
    overlay.className = 'fixed inset-0 z-[999] bg-gray-900/50 overflow-y-auto';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="min-h-screen py-6 px-4 md:px-8"><div class="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-6 md:p-8">${html}</div></div>`;
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeFullPageForm() {
  const overlay = document.getElementById('full-page-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  document.body.style.overflow = '';
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>${message}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

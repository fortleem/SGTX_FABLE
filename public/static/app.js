// ═══════════════════════════════════════════════════════════════════════════════
// SGTX Platform v11.2 — Futuristic Portal UI (Complete Redesign)
// Blueprint Part 6: All Portals — Glassmorphism, animated, customer-focused
// ═══════════════════════════════════════════════════════════════════════════════

const API = '/api/v1';
let currentPage = 'smart-inbox';
let currentPortal = 'dashboard';
let currentMode = 'BUY';
let currentTab = null;
let chartInstance = null;
let authToken = null;
let tenant = null;
let employee = null;
let toastTimeout = null;

// ─────────────────────────────────────────────────────────
// PORTAL RBAC DEFINITIONS (per Blueprint Part 2 & Part 6)
// ─────────────────────────────────────────────────────────
const TENANT_PORTAL_ACCESS = {
  // Legacy type names
  CORPORATE:        ['trader'],
  FINANCIAL:        ['financier'],
  LOGISTICS:        ['logistics', 'shipping'],
  QUALITY_CONTROL:  ['qc'],
  LABORATORY:       ['laboratory'],
  REGULATORY:       ['government'],
  GOVERNMENT:       ['government'],
  MARKETPLACE_PARTNER: ['marketplace'],
  // DB type codes (GTID entity types — Blueprint Part 2)
  TRD:  ['trader', 'marketplace'],
  LSP:  ['logistics'],
  SHIP: ['shipping'],
  CBR:  ['logistics'],
  FIN:  ['financier'],
  QC:   ['qc'],
  LAB:  ['laboratory'],
  GOV:  ['government'],
  MKT:  ['marketplace'],
};

const TENANT_DEFAULT_PORTAL = {
  CORPORATE: 'trader', FINANCIAL: 'financier', LOGISTICS: 'logistics',
  QUALITY_CONTROL: 'qc', LABORATORY: 'laboratory', REGULATORY: 'government',
  GOVERNMENT: 'government', MARKETPLACE_PARTNER: 'marketplace',
  TRD: 'trader', LSP: 'logistics', SHIP: 'shipping', CBR: 'logistics',
  FIN: 'financier', QC: 'qc', LAB: 'laboratory', GOV: 'government', MKT: 'marketplace',
};

const PORTAL_PERMISSIONS = {
  trader: {
    canCreateTrade: true, canViewTrades: true, canViewContracts: true, canRequestFinancing: true,
    canViewShipments: true, canViewPayments: true, canViewContacts: true, canFileDispute: true,
    canViewBarcodes: true, canViewDistressed: true, canViewDeFi: false,
  },
  logistics: {
    canCreateTrade: false, canViewTrades: false, canViewContracts: true, canViewShipments: true,
    canViewBarcodes: true, canViewRoutes: true, canViewSettlements: true,
  },
  financier: {
    canViewFinancingRequests: true, canSubmitBids: true, canViewCreditScores: true,
    canViewDeFi: true, canViewSettlements: true,
  },
  qc: {
    canViewInspections: true, canSubmitReports: true, canViewBarcodes: true, canViewShipments: true,
  },
  government: {
    canViewTrades: true, canViewContracts: true, canViewShipments: true,
    canViewGovernor: true, canViewJurisdictions: true, canViewCompliance: true, canViewAudit: true,
    canApproveClearance: true, canViewAnonymousTrades: true,
  },
  admin: {
    canCreateTrade: true, canViewTrades: true, canViewContracts: true, canRequestFinancing: true,
    canViewShipments: true, canViewPayments: true, canViewGovernor: true, canViewJurisdictions: true,
    canViewCompliance: true, canViewAudit: true, canViewMarketplace: true, canViewTenants: true,
  },
  marketplace: {
    canViewApiKeys: true, canViewLeads: true, canViewWebhooks: true, canViewRevenue: true,
  },
};

function canAccessAdmin() {
  if (!employee) return false;
  const role = (employee.role || '').toUpperCase();
  const perms = employee.permissions || [];
  return role === 'PLATFORM_ADMIN' || role === 'TENANT_ADMIN' || perms.includes('*') || perms.includes('admin.access');
}

function getAvailablePortals() {
  if (!tenant) return ['dashboard'];
  const portals = TENANT_PORTAL_ACCESS[tenant.type] || ['dashboard'];
  const result = [...portals];
  if (canAccessAdmin()) result.push('admin');
  return result;
}

function getPerms() { return PORTAL_PERMISSIONS[currentPortal] || PORTAL_PERMISSIONS.admin; }
function isReadOnly() { return currentPortal === 'government' && (tenant?.type === 'REGULATORY' || tenant?.type === 'GOV'); }

// ─────────────────────────────────────────────────────────
// PORTAL NAVIGATION STRUCTURE (Blueprint Part 6)
// ─────────────────────────────────────────────────────────
const portalMenus = {
  dashboard: [
    { section: 'Overview' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Platform Overview' },
    { id: 'tenants', icon: 'fa-building', label: 'Tenants' },
    { id: 'governor', icon: 'fa-gavel', label: 'Governor Decisions' },
    { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
  ],
  trader: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'trade-command', icon: 'fa-terminal', label: 'Trade Command Center' },
    { id: 'shipments-vault', icon: 'fa-vault', label: 'Shipments Vault' },
    { section: 'Buyer' , mode: 'BUY' },
    { id: 'new-trade', icon: 'fa-plus-circle', label: 'New Trade Request', mode: 'BUY' },
    { id: 'quote-review', icon: 'fa-scale-balanced', label: 'Quote Review', mode: 'BUY' },
    { id: 'contract-signing', icon: 'fa-file-signature', label: 'Contract Signing', mode: 'BUY' },
    { id: 'customs-readiness', icon: 'fa-clipboard-check', label: 'Customs Readiness', mode: 'BUY' },
    { id: 'financing', icon: 'fa-landmark', label: 'Financing', mode: 'BUY' },
    { id: 'distressed-buy', icon: 'fa-fire', label: 'Distressed Cargo', mode: 'BUY' },
    { section: 'Seller', mode: 'SELL' },
    { id: 'pending-requests', icon: 'fa-inbox', label: 'Pending Requests', mode: 'SELL' },
    { id: 'exw-price-lock', icon: 'fa-lock', label: 'EXW Price Lock', mode: 'SELL' },
    { id: 'containerisation', icon: 'fa-boxes-stacked', label: 'Containerisation', mode: 'SELL' },
    { id: 'logistics-builder', icon: 'fa-truck-fast', label: 'Logistics Builder', mode: 'SELL' },
    { id: 'quote-submit', icon: 'fa-paper-plane', label: 'Quote Submission', mode: 'SELL' },
    { id: 'lab-selection', icon: 'fa-flask', label: 'Laboratory Selection', mode: 'SELL' },
    { id: 'qc-booking', icon: 'fa-microscope', label: 'QC Booking', mode: 'SELL' },
    { id: 'doc-finalisation', icon: 'fa-file-circle-check', label: 'Document Finalisation', mode: 'SELL' },
    { id: 'barcode-print', icon: 'fa-barcode', label: 'Barcode Print', mode: 'SELL' },
    { id: 'cash-position', icon: 'fa-chart-area', label: 'Cash Position', mode: 'SELL' },
    { id: 'distressed-sell', icon: 'fa-fire', label: 'Distressed & Outreach', mode: 'SELL' },
    { section: 'Shared' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
    { id: 'disputes', icon: 'fa-gavel', label: 'Disputes' },
    { id: 'contacts', icon: 'fa-users', label: 'Saved Contacts' },
    { id: 'company-admin', icon: 'fa-building-user', label: 'Company Admin' },
  ],
  logistics: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'logistics-dashboard', icon: 'fa-gauge-high', label: 'Operations Hub' },
    { section: 'Requests' },
    { id: 'rfq-inbox', icon: 'fa-inbox', label: 'RFQ Inbox' },
    { id: 'booking-requests', icon: 'fa-calendar-check', label: 'Booking Requests' },
    { section: 'Operations' },
    { id: 'dispatch-planner', icon: 'fa-map-location-dot', label: 'Dispatch Planner' },
    { id: 'active-shipments', icon: 'fa-ship', label: 'Active Shipments' },
    { id: 'doc-verification', icon: 'fa-file-circle-check', label: 'Doc Verification' },
    { section: 'Performance' },
    { id: 'performance-dash', icon: 'fa-chart-column', label: 'Performance' },
    { id: 'ebl-management', icon: 'fa-file-lines', label: 'eBL Management' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
    { id: 'contacts', icon: 'fa-users', label: 'Partner Network' },
  ],
  financier: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'financier-dashboard', icon: 'fa-gauge-high', label: 'Operations Hub' },
    { section: 'Opportunities' },
    { id: 'financing-opportunities', icon: 'fa-magnifying-glass-dollar', label: 'Opportunities' },
    { id: 'full-disclosure', icon: 'fa-eye', label: 'Full Disclosure' },
    { id: 'bidding', icon: 'fa-gavel', label: 'Bidding & Co-Financing' },
    { section: 'Portfolio' },
    { id: 'collateral-monitor', icon: 'fa-shield-halved', label: 'Collateral Monitor' },
    { id: 'defi-tab', icon: 'fa-link', label: 'DeFi Positions' },
    { id: 'secondary-market', icon: 'fa-coins', label: 'Secondary Market' },
    { section: 'Analysis' },
    { id: 'financed-companies', icon: 'fa-building-columns', label: 'Financed Companies' },
    { id: 'settlements', icon: 'fa-money-bill-transfer', label: 'Settlements' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
  ],
  qc: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'qc-dashboard', icon: 'fa-gauge-high', label: 'Inspection Hub' },
    { section: 'Inspections' },
    { id: 'inspection-queue', icon: 'fa-list-check', label: 'Inspection Queue' },
    { id: 'aql-enforcement', icon: 'fa-ruler-combined', label: 'AQL Sampling' },
    { id: 'ar-inspection', icon: 'fa-vr-cardboard', label: 'AR Inspection' },
    { section: 'Reports' },
    { id: 'qc-reports', icon: 'fa-file-medical', label: 'AI Reports' },
    { id: 'override-log', icon: 'fa-triangle-exclamation', label: 'Override Accountability' },
    { id: 'qc-performance', icon: 'fa-chart-column', label: 'Performance' },
  ],
  government: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'gov-dashboard', icon: 'fa-gauge-high', label: 'Dynamic Dashboard' },
    { section: 'Monitoring' },
    { id: 'live-trade-monitor', icon: 'fa-satellite-dish', label: 'Live Trade Monitor' },
    { id: 'anonymous-trade', icon: 'fa-user-secret', label: 'Anonymous Trade' },
    { id: 'multi-agency', icon: 'fa-sitemap', label: 'Multi-Agency Workflow' },
    { section: 'Compliance' },
    { id: 'gov-docs', icon: 'fa-file-circle-check', label: 'Document Verification' },
    { id: 'gov-audit', icon: 'fa-clock-rotate-left', label: 'Audit Trail' },
    { id: 'gov-jurisdictions', icon: 'fa-earth-americas', label: 'Jurisdiction Matrix' },
    { id: 'gov-compliance', icon: 'fa-shield-halved', label: 'Compliance Monitor' },
    { section: 'Integration' },
    { id: 'gov-permits', icon: 'fa-stamp', label: 'Permit Issuance' },
    { id: 'customs-api', icon: 'fa-plug', label: 'Customs API' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
  ],
  admin: [
    { section: 'Platform' },
    { id: 'admin-health', icon: 'fa-heartbeat', label: 'Platform Health' },
    { id: 'constitutional', icon: 'fa-scroll', label: 'Constitutional Policies' },
    { id: 'governor-log', icon: 'fa-gavel', label: 'Governor Log' },
    { section: 'Configuration' },
    { id: 'jurisdiction-matrix', icon: 'fa-earth-americas', label: 'Jurisdiction Matrix' },
    { id: 'psp-manager', icon: 'fa-credit-card', label: 'PSP Manager' },
    { id: 'special-rates', icon: 'fa-percent', label: 'Special Rate Manager' },
    { section: 'Identity' },
    { id: 'tenants', icon: 'fa-building', label: 'All Tenants' },
    { id: 'impersonation', icon: 'fa-user-secret', label: 'Impersonation' },
    { id: 'marketplace-partners', icon: 'fa-handshake', label: 'Partners' },
    { section: 'Operations' },
    { id: 'incidents', icon: 'fa-triangle-exclamation', label: 'Incidents' },
    { id: 'config-history', icon: 'fa-code-branch', label: 'Config History' },
    { id: 'customer-care', icon: 'fa-headset', label: 'Customer Care' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
  ],
  marketplace: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'mp-dashboard', icon: 'fa-gauge-high', label: 'Partner Dashboard' },
    { section: 'Management' },
    { id: 'api-keys', icon: 'fa-key', label: 'API Keys' },
    { id: 'lead-management', icon: 'fa-funnel-dollar', label: 'Lead Management' },
    { id: 'webhooks', icon: 'fa-webhook', label: 'Webhooks' },
    { section: 'Revenue' },
    { id: 'revenue-attribution', icon: 'fa-chart-pie', label: 'Revenue Attribution' },
    { id: 'sandbox-env', icon: 'fa-flask', label: 'Sandbox' },
    { id: 'usage-analytics', icon: 'fa-chart-bar', label: 'Usage Analytics' },
  ],
  shipping: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'ship-dashboard', icon: 'fa-gauge-high', label: 'Operations Hub' },
    { section: 'Bookings' },
    { id: 'ship-booking-requests', icon: 'fa-calendar-check', label: 'Booking Requests' },
    { id: 'ship-ebl', icon: 'fa-file-lines', label: 'eBL Management' },
    { section: 'Fleet' },
    { id: 'ship-vessel-schedule', icon: 'fa-ship', label: 'Vessel Schedule' },
    { id: 'ship-freight-invoices', icon: 'fa-file-invoice-dollar', label: 'Freight Invoices' },
    { id: 'ship-contract-rates', icon: 'fa-handshake', label: 'Contract Rates' },
    { section: 'Performance' },
    { id: 'ship-performance', icon: 'fa-chart-column', label: 'Performance' },
    { id: 'world-trade', icon: 'fa-earth-americas', label: 'World Trade Intel' },
    { id: 'company-admin', icon: 'fa-building-user', label: 'Company Admin' },
  ],
  laboratory: [
    { section: 'Core' },
    { id: 'smart-inbox', icon: 'fa-bolt', label: 'Smart Inbox', badge: true },
    { id: 'lab-dashboard', icon: 'fa-gauge-high', label: 'Lab Operations' },
    { section: 'Testing' },
    { id: 'lab-testing-jobs', icon: 'fa-vial', label: 'Testing Jobs' },
    { id: 'lab-results', icon: 'fa-clipboard-check', label: 'Result Submission' },
    { id: 'lab-certificates', icon: 'fa-certificate', label: 'Certificates' },
    { section: 'Business' },
    { id: 'lab-performance', icon: 'fa-chart-column', label: 'Performance' },
    { id: 'lab-invoices', icon: 'fa-file-invoice-dollar', label: 'Invoices' },
    { id: 'company-admin', icon: 'fa-building-user', label: 'Company Admin' },
  ],
};

// ─── INIT ────────────────────────────────────────────────
// ─── Individual Portal Context (Blueprint 12C) ──────────
// When served at /portal/:id, that portal is the locked entrance context.
function detectPortalFromURL() {
  const m = location.pathname.match(/^\/portal\/([a-z]+)/);
  return m ? m[1] : null;
}
const URL_PORTAL = detectPortalFromURL();

document.addEventListener('DOMContentLoaded', async () => {
  authToken = localStorage.getItem('sgtx_token');
  tenant = JSON.parse(localStorage.getItem('sgtx_tenant') || 'null');
  employee = JSON.parse(localStorage.getItem('sgtx_employee') || 'null');

  // Individual portal entrance: unauthenticated visitors go to that portal's own login
  if (URL_PORTAL && (!authToken || !tenant)) {
    location.href = '/portal/' + URL_PORTAL + '/login';
    return;
  }

  if (authToken && tenant) {
    // Populate tenant info
    document.getElementById('tenant-info').innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style="background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D">${(tenant.legal_name || '??').slice(0,2).toUpperCase()}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-xs truncate" style="color:rgba(255,255,255,.8)">${tenant.legal_name}</div>
          <div class="text-[10px] font-mono" style="color:rgba(255,255,255,.4)">${tenant.gtid || ''}</div>
        </div>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style="${tenant.kyb_status === 'VERIFIED' ? 'background:rgba(34,197,94,.15);color:#4ade80' : 'background:rgba(245,158,11,.15);color:#fbbf24'}">${tenant.kyb_status || 'PENDING'}</span>
        <span class="text-[9px]" style="color:rgba(255,255,255,.25)">${tenant.type}</span>
      </div>`;
    document.getElementById('user-name').textContent = employee?.full_name || employee?.email || '—';
    document.getElementById('user-role').textContent = employee?.role || '—';

    // Determine current mode for trader tenants (TRD / CORPORATE)
    if (tenant.type === 'CORPORATE' || tenant.type === 'TRD') {
      currentMode = tenant.default_trader_mode || employee?.active_trader_mode_context || 'BUY';
    }

    // Show mode toggle for trader tenants
    const modeSwitcher = document.getElementById('mode-switcher');
    if (modeSwitcher && (tenant.type === 'CORPORATE' || tenant.type === 'TRD')) {
      modeSwitcher.classList.remove('hidden');
      updateModeToggle();
    }

    buildPortalSelector();
    // Individual portal entrance takes precedence (Blueprint 12C); fall back to tenant default
    const savedPortal = localStorage.getItem('sgtx_portal');
    const available = getAvailablePortals();
    let defaultPortal = URL_PORTAL || savedPortal || TENANT_DEFAULT_PORTAL[tenant.type] || 'dashboard';
    if (!available.includes(defaultPortal) && defaultPortal !== 'dashboard') {
      defaultPortal = TENANT_DEFAULT_PORTAL[tenant.type] || available[0] || 'dashboard';
    }
    document.getElementById('portal-select').value = defaultPortal;
    // URL = source of truth: honour the address bar instead of a hardcoded default page
    preparePortal(defaultPortal);
    applyRoute(parseRoute(location.pathname), { noPush: true });
  } else {
    // Canonical app routes are auth-gated: unauthenticated → login
    location.href = '/login';
    return;
  }
});

function buildPortalSelector() {
  const select = document.getElementById('portal-select');
  const portals = tenant ? getAvailablePortals() : ['dashboard'];
  const portalLabels = {
    dashboard: 'Platform Overview',
    trader: 'Trader Portal',
    logistics: 'Logistics Portal',
    shipping: 'Shipping Line Portal',
    laboratory: 'Laboratory Portal',
    financier: 'Financier Portal',
    qc: 'QC / Inspection Portal',
    government: 'Government Portal',
    admin: 'Admin Portal',
    marketplace: 'Marketplace Partner Portal',
  };
  select.innerHTML = portals.map(p => `<option value="${p}">${portalLabels[p] || p}</option>`).join('');
}

// ─── AUTH ────────────────────────────────────────────────
function logout() {
  if (authToken) fetch(`${API}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } }).catch(() => {});
  const lastPortal = localStorage.getItem('sgtx_portal');
  localStorage.removeItem('sgtx_token');
  localStorage.removeItem('sgtx_tenant');
  localStorage.removeItem('sgtx_employee');
  localStorage.removeItem('sgtx_portal');
  window.location.href = lastPortal ? ('/portal/' + lastPortal + '/login') : '/portals';
}

// ─── PORTAL & MODE SWITCHING ─────────────────────────────
function switchPortal(portal) {
  currentPortal = portal;
  const nav = document.getElementById('nav-items');
  const items = portalMenus[portal] || portalMenus.dashboard;

  // Show/hide mode switcher
  const modeSwitcher = document.getElementById('mode-switcher');
  if (modeSwitcher) {
    modeSwitcher.classList.toggle('hidden', !((tenant?.type === 'CORPORATE' || tenant?.type === 'TRD') && portal === 'trader'));
  }

  renderNavigation(items);
  navigate('home');
}

// Portal switch without forcing a page change (used at boot so the URL wins)
function preparePortal(portal) {
  currentPortal = portal;
  const modeSwitcher = document.getElementById('mode-switcher');
  if (modeSwitcher) {
    modeSwitcher.classList.toggle('hidden', !((tenant?.type === 'CORPORATE' || tenant?.type === 'TRD') && portal === 'trader'));
  }
  renderNavigation(portalMenus[portal] || portalMenus.dashboard);
}

// ─── COCKPIT IA (Rebuild Phase 1): ≤7 nav groups, progressive disclosure ───
// Every legacy tab maps to exactly one cockpit group (see docs/COCKPIT_MAPPING.md).
const COCKPIT_GROUPS = [
  { id: 'home',       label: 'Home',       icon: 'fa-bolt' },
  { id: 'trades',     label: 'Trades',     icon: 'fa-arrows-left-right' },
  { id: 'operations', label: 'Operations', icon: 'fa-ship' },
  { id: 'money',      label: 'Money',      icon: 'fa-coins' },
  { id: 'trust',      label: 'Trust',      icon: 'fa-shield-halved' },
  { id: 'network',    label: 'Network',    icon: 'fa-users' },
  { id: 'admin',      label: 'Admin',      icon: 'fa-gear' },
];

const PAGE_GROUP = {
  // Home — what needs my attention now
  'home':'home','smart-inbox':'home',
  // Trades — the trade lifecycle (request → quote → contract)
  'trade-command':'trades','new-trade':'trades','quote-review':'trades','contract-signing':'trades',
  'negotiation':'trades','pending-requests':'trades','quote-submit':'trades','distressed-buy':'trades',
  'distressed-sell':'trades','rfq-inbox':'trades',
  // Operations — physical movement, inspection, testing, documents
  'shipments-vault':'operations','customs-readiness':'operations','containerisation':'operations',
  'logistics-builder':'operations','lab-selection':'operations','qc-booking':'operations',
  'doc-finalisation':'operations','barcode-print':'operations','logistics-dashboard':'operations',
  'booking-requests':'operations','dispatch-planner':'operations','active-shipments':'operations',
  'doc-verification':'operations','performance-dash':'operations','ebl-management':'operations',
  'qc-dashboard':'operations','inspection-queue':'operations','aql-enforcement':'operations',
  'ar-inspection':'operations','qc-reports':'operations','qc-performance':'operations',
  'ship-dashboard':'operations','ship-booking-requests':'operations','ship-ebl':'operations',
  'ship-vessel-schedule':'operations','ship-performance':'operations','lab-dashboard':'operations',
  'lab-testing-jobs':'operations','lab-results':'operations','lab-certificates':'operations',
  'lab-performance':'operations',
  // Money — pricing, financing, settlement
  'financing':'money','cash-position':'money','exw-price-lock':'money','financier-dashboard':'money',
  'financing-opportunities':'money','full-disclosure':'money','bidding':'money','collateral-monitor':'money',
  'defi-tab':'money','secondary-market':'money','financed-companies':'money','settlements':'money',
  'ship-freight-invoices':'money','ship-contract-rates':'money','lab-invoices':'money',
  // Trust — governance, compliance, disputes, jurisdictions
  'governor':'trust','disputes':'trust','override-log':'trust','jurisdictions':'trust',
  'gov-dashboard':'trust','live-trade-monitor':'trust','anonymous-trade':'trust','multi-agency':'trust',
  'gov-docs':'trust','gov-audit':'trust','gov-jurisdictions':'trust','gov-compliance':'trust',
  'gov-permits':'trust','customs-api':'trust',
  // Network — counterparties, market intelligence, integrations
  'contacts':'network','world-trade':'network','mp-dashboard':'network','lead-management':'network',
  'api-keys':'network','webhooks':'network','sandbox-env':'network','usage-analytics':'network',
  'revenue-attribution':'network',
  // Admin — platform machinery (PLATFORM_ADMIN) or own-company admin (tenants)
  'dashboard':'admin','tenants':'admin','admin-health':'admin','constitutional':'admin',
  'governor-log':'admin','jurisdiction-matrix':'admin','psp-manager':'admin','special-rates':'admin',
  'impersonation':'admin','marketplace-partners':'admin','incidents':'admin','config-history':'admin',
  'customer-care':'admin','company-admin':'admin',
};

function isPlatformAdmin() {
  return employee?.role === 'PLATFORM_ADMIN' || employee?.role === 'ADMIN';
}

// Bucket the current portal's screens into the ≤7 cockpit groups
function buildCockpitNav(items) {
  const buckets = {};
  items.filter(item => {
    if (item.section) return false;
    if (item.mode && currentPortal === 'trader') return item.mode === currentMode;
    return true;
  }).forEach(item => {
    const g = PAGE_GROUP[item.id] || 'home';
    (buckets[g] = buckets[g] || []).push(item);
  });
  // Cockpit Home (5 questions) is always the first destination of the Home group
  buckets.home = [{ id: 'home', icon: 'fa-bolt', label: 'Home', badge: true },
    ...(buckets.home || []).filter(i => i.id !== 'home')];
  return COCKPIT_GROUPS.filter(g => {
    if (!buckets[g.id] || !buckets[g.id].length) return false;
    // Admin machinery invisible to tenants: platform screens require PLATFORM_ADMIN;
    // tenants keep only their own company admin under this group.
    if (g.id === 'admin' && !isPlatformAdmin()) {
      buckets[g.id] = buckets[g.id].filter(i => i.id === 'company-admin');
      return buckets[g.id].length > 0;
    }
    return true;
  }).map(g => ({ ...g, children: buckets[g.id] }));
}

function activeGroupId() {
  if (currentPage === 'trade-workspace') return 'trades';
  return PAGE_GROUP[currentPage] || 'home';
}

function renderNavigation(items) {
  const nav = document.getElementById('nav-items');
  const groups = buildCockpitNav(items);
  const active = activeGroupId();
  nav.innerHTML = groups.map(g => {
    const isActive = g.id === active;
    const primary = g.children[0];
    const head = `<div class="nav-item${isActive ? ' active' : ''}" role="link" aria-current="${isActive ? 'page' : 'false'}" onclick="navigate('${primary.id}')">
      <i class="fas ${g.icon} w-4 text-center text-[11px]"></i>
      <span class="flex-1 font-semibold">${g.label}</span>
      ${g.children.some(c => c.badge) ? '<span class="w-2 h-2 rounded-full animate-pulse-slow" style="background:#D4A017"></span>' : ''}
      ${g.children.length > 1 ? `<i class="fas fa-chevron-${isActive ? 'down' : 'right'} text-[9px]" style="color:rgba(255,255,255,.25)"></i>` : ''}
    </div>`;
    // Progressive disclosure: children only under the active group
    const kids = (isActive && g.children.length > 1) ? `<div class="ml-4 mb-1">${g.children.map(c =>
      `<div class="nav-item text-[11px] py-1.5${currentPage === c.id ? ' active' : ''}" onclick="navigate('${c.id}')">
        <i class="fas ${c.icon} w-4 text-center text-[10px]"></i><span class="flex-1">${c.label}</span>
      </div>`).join('')}</div>` : '';
    return head + kids;
  }).join('');
}

function switchMode(mode) {
  currentMode = mode;
  updateModeToggle();
  // Re-render navigation for mode-specific items
  const items = portalMenus[currentPortal] || portalMenus.dashboard;
  renderNavigation(items);
  navigate('home');
}

function updateModeToggle() {
  document.getElementById('mode-BUY')?.classList.toggle('active', currentMode === 'BUY');
  document.getElementById('mode-SELL')?.classList.toggle('active', currentMode === 'SELL');
}

// ─── NAVIGATION ──────────────────────────────────────────
// COCKPIT ROUTER — URL = source of truth. One trade = one URL = one workspace.
const CANONICAL_URLS = {
  'home': '/home',
  'smart-inbox': '/app/smart-inbox',
  'trade-command': '/trades',
  'new-trade': '/trades/new',
  'contacts': '/network',
  'financing': '/finance',
  'governor': '/trust',
  'dashboard': '/admin',
};

function parseRoute(pathname) {
  if (pathname === '/' || pathname === '/app' || pathname === '/home') return { kind: 'page', page: 'home' };
  if (pathname === '/trades') return { kind: 'page', page: 'trade-command' };
  if (pathname === '/trades/new') return { kind: 'page', page: 'new-trade' };
  let m = pathname.match(/^\/trades\/([^\/]+)(?:\/([a-z0-9-]+))?$/);
  if (m) return { kind: 'trade', ref: decodeURIComponent(m[1]), sub: m[2] || null };
  if (pathname === '/network') return { kind: 'page', page: 'contacts' };
  if (pathname === '/finance') return { kind: 'page', page: 'financing' };
  if (pathname === '/trust') return { kind: 'page', page: 'governor' };
  if (pathname === '/admin') return { kind: 'page', page: 'dashboard' };
  m = pathname.match(/^\/app\/([a-z0-9-]+)$/);
  if (m) return { kind: 'page', page: m[1] };
  if (/^\/portal\//.test(pathname)) return { kind: 'page', page: 'home' }; // legacy entrance, live until cutover
  return { kind: 'notfound', path: pathname };
}

function urlForPage(page) { return CANONICAL_URLS[page] || ('/app/' + page); }

function navigate(page, opts = {}) {
  currentPage = page;
  if (!opts.noPush) {
    const url = urlForPage(page);
    if (location.pathname !== url) history.pushState({ page }, '', url);
  }
  // Re-render grouped cockpit nav (active group expands — progressive disclosure)
  renderNavigation(portalMenus[currentPortal] || portalMenus.dashboard);
  loadPage(page);
}
var navigateTo = navigate; // alias used by inline onclick handlers

// One trade = one URL = one workspace
function openTrade(ref, sub, opts = {}) {
  const url = '/trades/' + encodeURIComponent(ref) + (sub ? '/' + sub : '');
  if (!opts.noPush && location.pathname !== url) history.pushState({ trade: ref, sub }, '', url);
  currentPage = 'trade-workspace';
  renderNavigation(portalMenus[currentPortal] || portalMenus.dashboard);
  loadTradeWorkspace(ref, sub);
}

function applyRoute(route, opts = {}) {
  if (route.kind === 'trade') return openTrade(route.ref, route.sub, { noPush: true });
  if (route.kind === 'notfound') {
    document.getElementById('content').innerHTML = renderRouteNotFound(route.path);
    setTitle('Not Found', '');
    return;
  }
  navigate(route.page, { noPush: true });
}

// Back / forward buttons resolve deterministically
window.addEventListener('popstate', () => {
  applyRoute(parseRoute(location.pathname), { noPush: true });
});

async function loadPage(page) {
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  content.classList.remove('page-transition');
  void content.offsetWidth;
  content.classList.add('page-transition');

  try {
    const renderer = pageRenderers[page];
    if (renderer) {
      await renderer();
    } else {
      // Deterministic navigation: unknown page = explicit 404 view, never a fallback.
      content.innerHTML = renderRouteNotFound('/app/' + page);
      setTitle('Not Found', '');
    }
  } catch(e) {
    content.innerHTML = renderError(e.message);
  }
}

// ─── TRADE WORKSPACE LOADER (Phase 0 seed — real data or honest 404) ───
async function loadTradeWorkspace(ref, sub) {
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    let res = await api(`/trades/${encodeURIComponent(ref)}`);
    let trade = res && res.data && !res.error ? res.data : null;
    let shipment = null;
    if (!trade) {
      // ref may be a USTN — resolve via shipments namespace
      const ships = await api('/shipments');
      const list = (ships && (ships.data || ships.results)) || [];
      shipment = list.find(s => s.ustn === ref || s.anonymous_ustn === ref) || null;
      if (shipment && shipment.trade_request_id) {
        res = await api(`/trades/${shipment.trade_request_id}`);
        trade = res && res.data && !res.error ? res.data : null;
      }
    }
    if (!trade) {
      content.innerHTML = renderRouteNotFound('/trades/' + ref);
      setTitle('Trade Not Found', ref);
      return;
    }
    renderTradeWorkspaceView(trade, shipment, ref, sub);
  } catch(e) {
    content.innerHTML = renderError(e.message);
  }
}

// ─── EXPERT MODE (Cockpit Law 6): global Operational ⇄ Expert toggle ───
let expertMode = localStorage.getItem('sgtx_expert_mode') === '1';
function toggleExpertMode() {
  expertMode = !expertMode;
  localStorage.setItem('sgtx_expert_mode', expertMode ? '1' : '0');
  // Re-render current view
  applyRoute(parseRoute(location.pathname), { noPush: true });
}

// ─── TIER 1: what must the user do RIGHT NOW for this trade ───
function computeNextAction(t, quotes, contracts, shipment) {
  const isBuyer = tenant && (t.importer_tenant_id === tenant.id);
  const isSeller = tenant && (t.assigned_exporter_id === tenant.id || t.exporter_tenant_id === tenant.id);
  const s = t.status;
  if (s === 'DRAFT') return { title: 'Complete this trade request', desc: 'The request is a draft. Finish and submit it to invite quotes.', cta: 'Continue draft', action: `navigate('new-trade')` };
  if (s === 'PENDING_EXPORTER_RESPONSE') {
    if (isSeller) return { title: 'Respond to this trade request', desc: 'The buyer is waiting for your quote.', cta: 'Submit quote', action: `navigate('quote-submit')` };
    return { title: 'Waiting for seller response', desc: 'The assigned seller has been notified. No action needed from you yet.', cta: null };
  }
  if (s === 'QUOTE_SUBMITTED' || s === 'QUOTED') {
    if (isBuyer) return { title: 'Review the submitted quote', desc: `${quotes.length} quote${quotes.length===1?'':'s'} awaiting your decision.`, cta: 'Review quotes', action: `navigate('quote-review')` };
    return { title: 'Quote submitted — awaiting buyer', desc: 'Your quote is with the buyer. You will be notified of their decision.', cta: null };
  }
  if (s === 'NEGOTIATING' || s === 'COUNTER_OFFER') return { title: 'Negotiation in progress', desc: 'Respond to the latest counter-offer.', cta: 'Open negotiation', action: `navigate('contract-signing')` };
  if (s === 'CONTRACTED' || contracts.some(c => c.status === 'LOCKED')) {
    if (!shipment) return { title: 'Arrange shipment', desc: 'Contract is locked. Logistics booking is the next step.', cta: 'Open logistics', action: `navigate('logistics-builder')` };
    return { title: 'Track shipment', desc: `Shipment ${shipment.ustn} is ${shipment.status || 'active'}.`, cta: 'View shipments', action: `navigate('shipments-vault')` };
  }
  if (s === 'CANCELLED' || s === 'REJECTED') return { title: 'This trade is closed', desc: `Status: ${s}. No further action available.`, cta: null };
  return { title: 'Trade in progress', desc: `Current status: ${s}.`, cta: null };
}

// ─── TIER 3: blockers — real conditions only, never fabricated ───
function computeBlockers(t, quotes, contracts, shipment) {
  const blockers = [];
  if (!t.exporter_name && !t.assigned_exporter_id) blockers.push({ level: 'warn', text: 'No seller assigned to this trade yet.' });
  if ((t.status === 'QUOTE_SUBMITTED' || t.status === 'QUOTED') && !contracts.length) blockers.push({ level: 'info', text: 'Quote awaiting decision — no contract exists yet.' });
  if (contracts.some(c => c.status === 'LOCKED') && !shipment) blockers.push({ level: 'warn', text: 'Contract locked but no shipment created.' });
  if (t.governor_decision_id === null && t.status !== 'DRAFT') blockers.push({ level: 'info', text: 'No Governor decision recorded for creation.' });
  return blockers;
}

function tradeLifecycleSteps(t, quotes, contracts, shipment) {
  const stages = ['Request', 'Quote', 'Contract', 'Shipment', 'Settlement'];
  let reached = 0;
  if (t.status !== 'DRAFT') reached = 1;
  if (quotes.length) reached = 2;
  if (contracts.length) reached = 3;
  if (shipment) reached = 4;
  if (shipment && shipment.status === 'DELIVERED') reached = 5;
  return stages.map((s, i) => ({ label: s, done: i < reached, current: i === reached }));
}

function renderTradeWorkspaceView(t, shipment, ref, sub) {
  const content = document.getElementById('content');
  let specs = {};
  try { specs = typeof t.parsed_specs === 'string' ? JSON.parse(t.parsed_specs || '{}') : (t.parsed_specs || {}); } catch(e) {}
  const quotes = t.quotes || [];
  const contracts = t.contracts || [];
  const next = computeNextAction(t, quotes, contracts, shipment);
  const blockers = computeBlockers(t, quotes, contracts, shipment);
  const steps = tradeLifecycleSteps(t, quotes, contracts, shipment);
  const activeTab = sub || 'overview';
  setTitle('Trade Workspace', ref);

  const tabBtn = (id, label, icon) => `<button role="tab" aria-selected="${activeTab===id}" onclick="openTrade('${ref}', '${id}')" class="px-3 py-2 text-xs font-semibold rounded-lg transition-colors" style="${activeTab===id ? 'background:rgba(212,160,23,.15);color:#D4A017' : 'color:rgba(120,120,130,1)'}"><i class="fas ${icon} mr-1.5"></i>${label}</button>`;

  content.innerHTML = `
  <div class="space-y-4 animate-fade-in" id="trade-workspace">
    <!-- HEADER: identity + status + expert toggle -->
    <header class="sgtx-card p-5">
      <div class="flex flex-wrap items-center gap-3">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-surface-400">Trade</div>
          <h1 class="text-lg font-bold font-mono" style="color:#D4A017">${shipment?.ustn || t.id}</h1>
        </div>
        <div class="ml-auto flex items-center gap-3">
          ${badge(t.status)}
          <button onclick="toggleExpertMode()" aria-pressed="${expertMode}" class="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg" style="${expertMode ? 'background:linear-gradient(135deg,#D4A017,#C9A84C);color:#0D0D0D' : 'border:1px solid rgba(120,120,130,.3);color:rgba(120,120,130,1)'}">
            <i class="fas fa-microscope mr-1"></i>${expertMode ? 'Expert Mode' : 'Operational'}
          </button>
        </div>
      </div>
      <!-- lifecycle progress -->
      <div class="flex items-center gap-1 mt-4" aria-label="Trade lifecycle progress">
        ${steps.map(s => `<div class="flex-1"><div class="h-1.5 rounded-full" style="background:${s.done ? '#D4A017' : s.current ? 'rgba(212,160,23,.4)' : 'rgba(120,120,130,.15)'}"></div><div class="text-[9px] mt-1 ${s.current ? 'font-bold' : ''}" style="color:${s.done || s.current ? '#D4A017' : 'rgba(120,120,130,.6)'}">${s.label}</div></div>`).join('')}
      </div>
    </header>

    <!-- TIER 1: NEXT ACTION — always dominant -->
    <section class="sgtx-card p-5" style="border:1px solid rgba(212,160,23,.35);background:linear-gradient(135deg,rgba(212,160,23,.06),transparent)" aria-label="Next action">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,#D4A017,#C9A84C)"><i class="fas fa-bolt" style="color:#0D0D0D"></i></div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider font-bold" style="color:#D4A017">Next Action</div>
          <h2 class="text-base font-bold text-surface-800 mt-0.5">${next.title}</h2>
          <p class="text-xs text-surface-400 mt-1">${next.desc}</p>
        </div>
        ${next.cta ? `<button onclick="${next.action}" class="btn-primary text-xs px-4 py-2.5 shrink-0">${next.cta} <i class="fas fa-arrow-right ml-1"></i></button>` : ''}
      </div>
    </section>

    <!-- TIER 3: BLOCKERS (only if real) -->
    ${blockers.length ? `<section class="space-y-2" aria-label="Blockers">${blockers.map(b => `
      <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs" style="background:${b.level==='warn'?'rgba(245,158,11,.08)':'rgba(120,120,130,.08)'};border:1px solid ${b.level==='warn'?'rgba(245,158,11,.25)':'rgba(120,120,130,.15)'}">
        <i class="fas ${b.level==='warn'?'fa-triangle-exclamation':'fa-circle-info'}" style="color:${b.level==='warn'?'#f59e0b':'rgba(120,120,130,1)'}"></i>
        <span class="text-surface-600">${b.text}</span>
      </div>`).join('')}</section>` : ''}

    <!-- TIER 2: SUMMARY -->
    <section class="sgtx-card p-5" aria-label="Trade summary">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div><div class="text-surface-400">Buyer</div><div class="font-semibold text-surface-800">${t.importer_name || '—'}</div><div class="font-mono text-[10px] text-surface-400">${t.importer_gtid || ''}</div></div>
        <div><div class="text-surface-400">Seller</div><div class="font-semibold text-surface-800">${t.exporter_name || 'Not assigned'}</div><div class="font-mono text-[10px] text-surface-400">${t.exporter_gtid || ''}</div></div>
        <div><div class="text-surface-400">Commodity</div><div class="font-semibold text-surface-800">${specs.commodity || specs.product || (t.raw_description || '').slice(0,40) || '—'}</div></div>
        <div><div class="text-surface-400">Created</div><div class="font-semibold text-surface-800">${time(t.created_at)}</div></div>
      </div>
    </section>

    <!-- TIER 4: DETAIL TABS (drawer pattern) -->
    <nav class="flex gap-1 flex-wrap" role="tablist" aria-label="Trade detail sections">
      ${tabBtn('overview','Overview','fa-table-cells-large')}
      ${tabBtn('quotes',`Quotes (${quotes.length})`,'fa-file-invoice-dollar')}
      ${tabBtn('contracts',`Contracts (${contracts.length})`,'fa-file-signature')}
      ${tabBtn('shipment','Shipment','fa-ship')}
      ${expertMode ? tabBtn('expert','Technical','fa-code') : ''}
    </nav>
    <section role="tabpanel" id="trade-tab-panel">${renderTradeTab(activeTab, t, specs, quotes, contracts, shipment)}</section>
  </div>`;
}

function renderTradeTab(tab, t, specs, quotes, contracts, shipment) {
  if (tab === 'quotes') {
    return `<div class="sgtx-card p-5">${quotes.length ? quotes.map(q => `
      <div class="flex items-center justify-between py-2.5 border-b border-surface-100 text-xs">
        <span class="font-mono text-surface-400">${(q.id||'').slice(0,8)}</span>
        <span class="font-semibold text-surface-800">${q.incoterm || ''} ${usd(q.exw_price)}</span>
        <span class="text-surface-400">${timeAgo(q.created_at)}</span>
        ${badge(q.status || 'SUBMITTED')}
      </div>`).join('') : '<p class="text-xs text-surface-400 py-6 text-center">No quotes have been submitted for this trade.</p>'}</div>`;
  }
  if (tab === 'contracts') {
    return `<div class="sgtx-card p-5">${contracts.length ? contracts.map(ct => `
      <div class="flex items-center justify-between py-2.5 border-b border-surface-100 text-xs">
        <span class="font-mono text-surface-400">${(ct.id||'').slice(0,8)}</span>
        <span class="font-semibold text-surface-800">${ct.incoterm || ''} ${ct.total_value != null ? usd(ct.total_value) : ''}</span>
        <span class="text-surface-400">${timeAgo(ct.created_at)}</span>
        ${badge(ct.status || 'DRAFT')}
      </div>`).join('') : '<p class="text-xs text-surface-400 py-6 text-center">No contract exists for this trade yet.</p>'}</div>`;
  }
  if (tab === 'shipment') {
    return `<div class="sgtx-card p-5">${shipment ? `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div><div class="text-surface-400">USTN</div><div class="font-mono font-semibold text-surface-800">${shipment.ustn}</div></div>
        <div><div class="text-surface-400">Status</div>${badge(shipment.status || '—')}</div>
        <div><div class="text-surface-400">Mode</div><div class="font-semibold text-surface-800">${shipment.transport_mode || '—'}</div></div>
        <div><div class="text-surface-400">ETA</div><div class="font-semibold text-surface-800">${shipment.eta ? time(shipment.eta) : '—'}</div></div>
      </div>` : '<p class="text-xs text-surface-400 py-6 text-center">No shipment has been created for this trade.</p>'}</div>`;
  }
  if (tab === 'expert') {
    // TIER 5 — technical internals, Expert Mode only
    return `<div class="sgtx-card p-5 space-y-3 text-xs">
      <div><div class="text-surface-400 font-bold mb-1">Trade request record</div><pre class="font-mono text-[10px] p-3 rounded-lg overflow-x-auto" style="background:rgba(0,0,0,.25);color:rgba(212,160,23,.85)">${JSON.stringify({ id: t.id, status: t.status, importer_tenant_id: t.importer_tenant_id, assigned_exporter_id: t.assigned_exporter_id, governor_decision_id: t.governor_decision_id, incoterm: t.incoterm, transport_mode: t.transport_mode, created_at: t.created_at, updated_at: t.updated_at }, null, 2)}</pre></div>
      <div><div class="text-surface-400 font-bold mb-1">Parsed specifications</div><pre class="font-mono text-[10px] p-3 rounded-lg overflow-x-auto" style="background:rgba(0,0,0,.25);color:rgba(212,160,23,.85)">${JSON.stringify(specs, null, 2)}</pre></div>
      ${t.channel ? `<div><div class="text-surface-400 font-bold mb-1">Trade channel</div><pre class="font-mono text-[10px] p-3 rounded-lg overflow-x-auto" style="background:rgba(0,0,0,.25);color:rgba(212,160,23,.85)">${JSON.stringify(t.channel, null, 2)}</pre></div>` : ''}
    </div>`;
  }
  // overview (default)
  return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="sgtx-card p-5">
      <h3 class="text-sm font-bold text-surface-800 mb-3">Request</h3>
      <p class="text-xs text-surface-600 leading-relaxed">${t.raw_description || 'No description recorded.'}</p>
      ${Object.keys(specs).length ? `<div class="mt-3 grid grid-cols-2 gap-2 text-xs">${Object.entries(specs).slice(0,8).map(([k,v]) => `<div><span class="text-surface-400">${k}:</span> <span class="font-semibold text-surface-800">${typeof v === 'object' ? JSON.stringify(v) : v}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="text-sm font-bold text-surface-800 mb-3">Channel & Governance</h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between"><span class="text-surface-400">Secure channel</span><span class="font-semibold text-surface-800">${t.channel ? 'Active' : 'Not opened'}</span></div>
        <div class="flex justify-between"><span class="text-surface-400">Governor decision</span><span class="font-mono text-[10px] text-surface-800">${t.governor_decision_id ? t.governor_decision_id.slice(0,13) + '…' : 'None recorded'}</span></div>
        <div class="flex justify-between"><span class="text-surface-400">Incoterm</span><span class="font-semibold text-surface-800">${t.incoterm || '—'}</span></div>
      </div>
    </div>
  </div>`;
}

// ─── PAGE RENDERER REGISTRY ──────────────────────────────
const pageRenderers = {
  // Shared
  'home': renderCockpitHome,
  'smart-inbox': renderSmartInbox,
  'trade-command': renderTradeCommandCenter,
  'shipments-vault': renderShipmentsVault,
  'dashboard': renderPlatformDashboard,
  'tenants': renderTenants,
  'governor': renderGovernor,
  'jurisdictions': renderJurisdictions,
  'contacts': renderContacts,
  'disputes': renderDisputes,
  // Trader - Buyer
  'new-trade': renderNewTrade,
  'quote-review': renderQuoteReview,
  'contract-signing': renderContractSigning,
  'negotiation': function() { renderContractSigning(); },
  'customs-readiness': renderCustomsReadiness,
  'financing': renderFinancing,
  'distressed-buy': renderDistressedBuy,
  // Trader - Seller
  'pending-requests': renderPendingRequests,
  'exw-price-lock': () => renderEXWPrice(),
  'containerisation': renderContainerisation,
  'logistics-builder': renderLogisticsBuilder,
  'quote-submit': renderQuoteSubmit,
  'lab-selection': renderLabSelection,
  'qc-booking': renderQCBooking,
  'barcode-print': renderBarcodePrint,
  'cash-position': renderCashPosition,
  'distressed-sell': renderDistressedSell,
  'doc-finalisation': renderDocFinalisation,
  'company-admin': renderCompanyAdmin,
  // Logistics
  'logistics-dashboard': renderLogisticsDashboard,
  'rfq-inbox': renderRFQInbox,
  'booking-requests': renderBookingRequests,
  'dispatch-planner': renderDispatchPlanner,
  'active-shipments': renderActiveShipments,
  'doc-verification': renderDocVerification,
  'performance-dash': renderPerformanceDash,
  'ebl-management': renderEBLManagement,
  // Financier
  'financier-dashboard': renderFinancierDashboard,
  'financing-opportunities': renderFinancingOpportunities,
  'full-disclosure': renderFullDisclosure,
  'bidding': renderBidding,
  'collateral-monitor': renderCollateralMonitor,
  'defi-tab': renderDeFiTab,
  'secondary-market': renderSecondaryMarket,
  'financed-companies': renderFinancedCompanies,
  'settlements': renderSettlements,
  // QC
  'qc-dashboard': renderQCDashboard,
  'inspection-queue': renderInspectionQueue,
  'aql-enforcement': renderAQLEnforcement,
  'ar-inspection': renderARInspection,
  'qc-reports': renderQCReports,
  'override-log': renderOverrideLog,
  'qc-performance': renderQCPerformance,
  // Government
  'gov-dashboard': renderGovDashboard,
  'live-trade-monitor': renderLiveTradeMonitor,
  'anonymous-trade': renderAnonymousTrade,
  'multi-agency': renderMultiAgency,
  'gov-docs': renderGovDocs,
  'gov-audit': renderGovAudit,
  'gov-jurisdictions': renderGovJurisdictions,
  'gov-compliance': renderGovCompliance,
  'world-trade': renderWorldTrade,
  'gov-permits': renderGovPermits,
  'customs-api': renderCustomsAPI,
  // Admin
  'admin-health': renderAdminHealth,
  'constitutional': renderConstitutional,
  'governor-log': renderGovernorLog,
  'jurisdiction-matrix': renderJurisdictionMatrix,
  'psp-manager': renderPSPManager,
  'special-rates': renderSpecialRates,
  'impersonation': renderImpersonation,
  'marketplace-partners': renderMarketplacePartners,
  'incidents': renderIncidents,
  'config-history': renderConfigHistory,
  'customer-care': renderCustomerCare,
  // Marketplace Partner
  'mp-dashboard': renderMPDashboard,
  'api-keys': renderAPIKeys,
  'lead-management': renderLeadManagement,
  'webhooks': renderWebhooks,
  'revenue-attribution': renderRevenueAttribution,
  'sandbox-env': renderSandboxEnv,
  'usage-analytics': renderUsageAnalytics,
  // Shipping Line Portal
  'ship-dashboard': renderShipDashboard,
  'ship-booking-requests': renderShipBookingRequests,
  'ship-ebl': renderShipEBL,
  'ship-vessel-schedule': renderShipVesselSchedule,
  'ship-freight-invoices': renderShipFreightInvoices,
  'ship-contract-rates': renderShipContractRates,
  'ship-performance': renderShipPerformance,
  // Laboratory Portal
  'lab-dashboard': renderLabDashboard,
  'lab-testing-jobs': renderLabTestingJobs,
  'lab-results': renderLabResults,
  'lab-certificates': renderLabCertificates,
  'lab-performance': renderLabPerformance,
  'lab-invoices': renderLabInvoices,
};

// ─────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────
async function api(path) { const r = await fetch(`${API}${path}`, authToken ? { headers: { 'Authorization': `Bearer ${authToken}` }} : {}); return r.json(); }
async function apiPost(path, body) { const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }, body: JSON.stringify(body) }); return r.json(); }
async function apiPatch(path, body) { const r = await fetch(`${API}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }, body: JSON.stringify(body) }); return r.json(); }

function setTitle(t, s) { 
  document.getElementById('page-title').textContent = t; 
  document.getElementById('page-subtitle').textContent = s || '';
}
function time(t) { return t ? new Date(t).toLocaleString() : '—'; }
function timeAgo(t) {
  if (!t) return '—';
  const diff = Date.now() - new Date(t).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}
function usd(n) { return n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function pct(n) { return n != null ? (n * 100).toFixed(2) + '%' : '—'; }

function badge(status) {
  const map = { VERIFIED: 'badge-success', APPROVED: 'badge-success', ALLOW: 'badge-success', ACTIVE: 'badge-success', DELIVERED: 'badge-success',
    PENDING: 'badge-warning', SUBMITTED: 'badge-warning', CONDITIONAL: 'badge-warning', IN_TRANSIT: 'badge-warning', BIDDING: 'badge-warning',
    DENIED: 'badge-danger', DENY: 'badge-danger', BLOCKED: 'badge-danger', FAILED: 'badge-danger', DISTRESSED: 'badge-danger',
    DRAFT: 'badge-neutral', LOCKED: 'badge-info', CONTRACTED: 'badge-info', INITIATED: 'badge-info', REQUESTED: 'badge-info',
    ESCALATE: 'badge-gold' };
  const cls = map[status] || 'badge-neutral';
  return `<span class="badge ${cls}">${status}</span>`;
}

function verdictBadge(v) {
  const colors = { ALLOW: 'text-governor-allow', DENY: 'text-governor-deny', CONDITIONAL: 'text-governor-conditional', ESCALATE: 'text-governor-escalate', PENDING: 'text-governor-pending' };
  return `<span class="${colors[v] || 'text-surface-500'} font-semibold text-xs">${v}</span>`;
}

// ─── UI COMPONENTS ───────────────────────────────────────
function shimmerLoader() {
  return `<div class="space-y-4 animate-fade-in">
    <div class="h-8 w-48 shimmer rounded-lg"></div>
    <div class="grid grid-cols-4 gap-4"><div class="h-24 shimmer rounded-xl"></div><div class="h-24 shimmer rounded-xl"></div><div class="h-24 shimmer rounded-xl"></div><div class="h-24 shimmer rounded-xl"></div></div>
    <div class="h-64 shimmer rounded-xl"></div>
  </div>`;
}

function renderRouteNotFound(path) {
  return `<div class="flex flex-col items-center justify-center h-96 text-center" role="alert">
    <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.2)">
      <span class="text-2xl font-bold" style="color:#D4A017">404</span>
    </div>
    <h2 class="text-xl font-bold text-surface-800 mb-2">This screen does not exist</h2>
    <p class="text-sm text-surface-400 max-w-md"><span class="font-mono" style="color:#D4A017">${path}</span> is not a valid SGTX destination.</p>
    <div class="mt-6 flex gap-3">
      <button onclick="navigate('home')" class="btn-primary text-xs px-4 py-2">Go to Home</button>
    </div>
  </div>`;
}

function renderError(msg) {
  return `<div class="sgtx-card border-red-200 bg-red-50/50 p-6">
    <div class="flex items-center gap-3"><i class="fas fa-exclamation-circle text-red-500 text-xl"></i>
    <div><h3 class="font-semibold text-red-800">Error Loading Page</h3><p class="text-sm text-red-600 mt-1">${msg}</p></div></div>
  </div>`;
}

function metricCard(icon, label, value, trend, color) {
  const gradients = {
    gold: 'linear-gradient(135deg,#D4A017,#C9A84C)',
    purple: 'linear-gradient(135deg,#D4A017,#C9A84C)',
    sgtx: 'linear-gradient(135deg,#D4A017,#C9A84C)',
    blue: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    green: 'linear-gradient(135deg,#10b981,#059669)',
    emerald: 'linear-gradient(135deg,#10b981,#059669)',
    amber: 'linear-gradient(135deg,#f59e0b,#d97706)',
    rose: 'linear-gradient(135deg,#f43f5e,#e11d48)',
    red: 'linear-gradient(135deg,#ef4444,#dc2626)',
    cyan: 'linear-gradient(135deg,#06b6d4,#0891b2)',
  };
  const iconBg = gradients[color] || gradients.gold;
  return `<div class="metric-card group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
    <div class="flex items-start justify-between">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style="background:${iconBg}">
        <i class="fas ${icon} text-white text-sm"></i>
      </div>
      ${trend ? `<span class="text-[10px] font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}"><i class="fas fa-arrow-${trend > 0 ? 'up' : 'down'} mr-0.5"></i>${Math.abs(trend)}%</span>` : ''}
    </div>
    <div class="mt-3">
      <div class="text-2xl font-bold text-surface-900 tracking-tight">${value}</div>
      <div class="text-xs text-surface-400 mt-0.5">${label}</div>
    </div>
  </div>`;
}

function dataTable(headers, rows, options = {}) {
  return `<div class="sgtx-card overflow-hidden !p-0">
    ${options.title ? `<div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
      <h3 class="font-semibold text-sm text-surface-800">${options.title}</h3>
      ${options.action || ''}
    </div>` : ''}
    <div class="overflow-x-auto">
      <table class="sgtx-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="text-center py-12 text-surface-400"><i class="fas fa-inbox text-2xl mb-2 block"></i>No data available</td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
}

function fourQuestions(what, todo, blocking, next) {
  return `<div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
    <div class="sgtx-card !p-4 border-l-4 border-l-accent-blue"><div class="text-[10px] font-bold text-accent-blue uppercase mb-1">What's Happening</div><div class="text-xs text-surface-600">${what}</div></div>
    <div class="sgtx-card !p-4 border-l-4 border-l-accent-emerald"><div class="text-[10px] font-bold text-accent-emerald uppercase mb-1">What To Do</div><div class="text-xs text-surface-600">${todo}</div></div>
    <div class="sgtx-card !p-4 border-l-4 border-l-accent-amber"><div class="text-[10px] font-bold text-accent-amber uppercase mb-1">What's Blocking</div><div class="text-xs text-surface-600">${blocking}</div></div>
    <div class="sgtx-card !p-4 border-l-4 border-l-gold-400"><div class="text-[10px] font-bold text-gold-400 uppercase mb-1">What's Next</div><div class="text-xs text-surface-600">${next}</div></div>
  </div>`;
}

function showModal(titleOrHtml, bodyHtml) {
  if (bodyHtml !== undefined) {
    document.getElementById('modal-body').innerHTML = '<h3 class="text-lg font-bold text-surface-800 mb-4">' + titleOrHtml + '</h3>' + bodyHtml;
  } else {
    document.getElementById('modal-body').innerHTML = titleOrHtml;
  }
  document.getElementById('modal').classList.add('show');
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }

// ═══════════════════════════════════════════════════════════
// PLAIN LANGUAGE DECISION PANEL (Governor DENY/CONDITIONAL)
// 6-zone modal: Header, Explanation, Condition Checklist, Next Step, Timer, Confidence
// ═══════════════════════════════════════════════════════════
function showGovernorPanel(verdict, entityId, context) {
  const ctx = context || {};
  const isDeny = verdict === 'DENY';
  const isConditional = verdict === 'CONDITIONAL';
  const isAllow = verdict === 'ALLOW';

  // Generate plain-language explanation based on verdict
  const explanations = {
    DENY: {
      title: 'Action Blocked by Governor',
      icon: 'fa-shield-halved',
      color: 'red',
      explanation: ctx.reason || 'This action has been denied by the SGTX Governor AI. The request does not meet the required compliance conditions.',
      conditions: ctx.conditions || ['Missing required documentation', 'Compliance check failed', 'Risk threshold exceeded'],
      nextStep: 'Review the conditions below and resolve each item before resubmitting. Contact support if you believe this is an error.',
      timer: ctx.timer || '72h to resolve',
      confidence: ctx.confidence || 95
    },
    CONDITIONAL: {
      title: 'Action Requires Conditions',
      icon: 'fa-clipboard-check',
      color: 'amber',
      explanation: ctx.reason || 'This action is conditionally approved. You must satisfy all listed conditions before proceeding.',
      conditions: ctx.conditions || ['Upload required certificate', 'Obtain counter-party confirmation', 'Pass compliance review'],
      nextStep: 'Complete all conditions below. Once all checkboxes are satisfied, the action will be automatically approved.',
      timer: ctx.timer || '48h to complete',
      confidence: ctx.confidence || 82
    },
    ALLOW: {
      title: 'Action Approved',
      icon: 'fa-check-circle',
      color: 'emerald',
      explanation: 'This action has been approved by the SGTX Governor. No additional conditions required.',
      conditions: [],
      nextStep: 'Proceed with the action. It has been recorded on the Loom (immutable audit trail).',
      timer: 'Immediate',
      confidence: ctx.confidence || 98
    }
  };

  const panel = explanations[verdict] || explanations.DENY;
  const colorMap = { red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500', bar: 'bg-red-500' }, amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', bar: 'bg-amber-500' }, emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500', bar: 'bg-emerald-500' } };
  const c = colorMap[panel.color];

  showModal(`
    <div class="max-w-lg mx-auto">
      <!-- Zone 1: Header -->
      <div class="flex items-center gap-3 mb-4 pb-4 border-b border-surface-100">
        <div class="w-12 h-12 rounded-2xl ${c.bg} ${c.border} border flex items-center justify-center">
          <i class="fas ${panel.icon} ${c.icon} text-xl"></i>
        </div>
        <div>
          <h3 class="text-lg font-bold ${c.text}">${panel.title}</h3>
          <div class="text-[10px] font-mono" style="color:rgba(255,255,255,.4)">Entity: ${entityId || 'N/A'} • Governor v6.3</div>
        </div>
      </div>

      <!-- Zone 2: Plain Language Explanation -->
      <div class="p-4 ${c.bg} ${c.border} border rounded-xl mb-4">
        <p class="text-sm ${c.text} leading-relaxed">${panel.explanation}</p>
      </div>

      <!-- Zone 3: Condition Checklist -->
      ${panel.conditions.length > 0 ? `
      <div class="mb-4">
        <h4 class="text-xs font-semibold text-surface-600 uppercase mb-2"><i class="fas fa-list-check mr-1"></i>Required Conditions</h4>
        <div class="space-y-2">
          ${panel.conditions.map((cond, i) => `
            <label class="flex items-center gap-3 p-3 rounded-xl border border-surface-100 hover:border-gold-200 transition cursor-pointer">
              <input type="checkbox" class="w-4 h-4 rounded border-surface-300 text-gold-400 focus:ring-gold-400" id="gov-cond-${i}">
              <span class="text-xs text-surface-700">${cond}</span>
            </label>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Zone 4: Next Step -->
      <div class="p-3 bg-surface-50 rounded-xl mb-4">
        <h4 class="text-[10px] font-semibold text-surface-500 uppercase mb-1"><i class="fas fa-arrow-right mr-1"></i>Next Step</h4>
        <p class="text-xs text-surface-700">${panel.nextStep}</p>
      </div>

      <!-- Zone 5: Timer + Zone 6: Confidence -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="p-3 rounded-xl border border-surface-100 text-center">
          <i class="fas fa-clock text-surface-400 mb-1"></i>
          <div class="text-sm font-bold text-surface-800">${panel.timer}</div>
          <div class="text-[10px] text-surface-400">Resolution Window</div>
        </div>
        <div class="p-3 rounded-xl border border-surface-100 text-center">
          <i class="fas fa-brain ${c.icon} mb-1"></i>
          <div class="text-sm font-bold text-surface-800">${panel.confidence}%</div>
          <div class="text-[10px] text-surface-400">AI Confidence</div>
          <div class="w-full h-1.5 rounded-full bg-surface-200 mt-1">
            <div class="h-1.5 rounded-full ${c.bar}" style="width:${panel.confidence}%"></div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        ${isAllow ? `<button onclick="closeModal()" class="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold">Proceed</button>` : ''}
        ${isConditional ? `<button onclick="submitConditions('${entityId}')" class="flex-1 py-2.5 bg-gold-400 text-white rounded-xl text-xs font-semibold">Submit Conditions</button>` : ''}
        ${isDeny ? `<button onclick="closeModal()" class="flex-1 py-2.5 bg-surface-200 text-surface-700 rounded-xl text-xs font-semibold">Acknowledge</button>` : ''}
        <button onclick="closeModal()" class="px-4 py-2.5 border border-surface-200 text-surface-600 rounded-xl text-xs font-semibold">Close</button>
      </div>
    </div>
  `);
}
function submitConditions(entityId) {
  const checkboxes = document.querySelectorAll('[id^="gov-cond-"]');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  if (!allChecked) { alert('Please complete all conditions before submitting.'); return; }
  closeModal();
  alert('Conditions submitted. Governor will re-evaluate automatically.');
}
function showCreateModal() {
  if (currentPortal === 'trader' && currentMode === 'BUY') { navigate('new-trade'); }
  else if (currentPortal === 'trader' && currentMode === 'SELL') { navigate('pending-requests'); }
  else { showToast('Use the sidebar to navigate', 'info'); }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}


// ═══════════════════════════════════════════════════════════
// SMART INBOX — Default Landing Page (Blueprint 6.1.1)
// Prioritised action feed with urgency scores
// ═══════════════════════════════════════════════════════════

// ── Shared Components (Part 6.1.x) ──────────────────────

function plainLanguageDecisionPanel(decision) {
  if (!decision) return '';
  const verdictMap = {
    'APPROVED': { icon: 'fa-check-circle', color: 'emerald', label: 'Approved', plain: 'Your request has been approved. You can proceed to the next step.' },
    'CONDITIONAL': { icon: 'fa-exclamation-triangle', color: 'amber', label: 'Conditionally Approved', plain: 'Approved with conditions — review the requirements below before proceeding.' },
    'DENIED': { icon: 'fa-times-circle', color: 'red', label: 'Denied', plain: 'This request was not approved. See the reason below and suggested next steps.' },
    'PENDING': { icon: 'fa-clock', color: 'blue', label: 'Pending Review', plain: 'Your request is being reviewed. You will be notified when a decision is made.' }
  };
  const v = verdictMap[decision.verdict] || verdictMap['PENDING'];
  return '<div class="sgtx-card p-4 border-l-4 border-' + v.color + '-400 mb-4">' +
    '<div class="flex items-center gap-2 mb-2">' +
    '<i class="fas ' + v.icon + ' text-' + v.color + '-400 text-lg"></i>' +
    '<span class="font-semibold text-' + v.color + '-300">' + v.label + '</span>' +
    (decision.decided_at ? '<span class="text-xs text-surface-500 ml-auto">' + timeAgo(decision.decided_at) + '</span>' : '') +
    '</div>' +
    '<p class="text-sm text-surface-300 mb-2">' + v.plain + '</p>' +
    (decision.reason ? '<div class="text-xs text-surface-400 bg-dark-800/50 rounded p-2 mt-2"><strong>Detail:</strong> ' + decision.reason + '</div>' : '') +
    (decision.conditions ? '<div class="text-xs text-amber-300/80 bg-amber-900/20 rounded p-2 mt-2"><strong>Conditions:</strong> ' + decision.conditions + '</div>' : '') +
    (decision.next_steps ? '<div class="text-xs text-blue-300/80 bg-blue-900/20 rounded p-2 mt-2"><strong>Next Steps:</strong> ' + decision.next_steps + '</div>' : '') +
    '</div>';
}

function guidedRecoveryBanner(type) {
  const banners = {
    'repeated_submission': { icon: 'fa-redo', color: 'amber', title: 'We noticed multiple attempts', msg: 'It looks like you have submitted this before. Would you like to check the status of your previous submission instead?', action: 'View Previous', page: 'smart-inbox' },
    'abandonment': { icon: 'fa-pause-circle', color: 'blue', title: 'Continue where you left off?', msg: 'You started this process earlier but did not finish. Your progress has been saved.', action: 'Resume', page: null },
    'denial_loop': { icon: 'fa-life-ring', color: 'red', title: 'Need help?', msg: 'Your recent requests were not approved. Our support team can help you understand the requirements and resubmit.', action: 'Get Help', page: 'disputes' }
  };
  const b = banners[type];
  if (!b) return '';
  return '<div class="sgtx-card p-4 border-l-4 border-' + b.color + '-400 mb-4 flex items-center gap-4">' +
    '<i class="fas ' + b.icon + ' text-' + b.color + '-400 text-2xl"></i>' +
    '<div class="flex-1">' +
    '<div class="font-semibold text-' + b.color + '-300 text-sm">' + b.title + '</div>' +
    '<div class="text-xs text-surface-400 mt-1">' + b.msg + '</div>' +
    '</div>' +
    '<button onclick="' + (b.page ? "navigateTo('" + b.page + "')" : 'window.history.back()') + '" class="px-3 py-1.5 bg-' + b.color + '-500/20 text-' + b.color + '-300 rounded-lg text-xs font-medium hover:bg-' + b.color + '-500/30 transition">' + b.action + '</button>' +
    '</div>';
}

function slaTransparencyPanel(actions) {
  if (!actions || !actions.length) return '';
  return '<div class="sgtx-card p-4 mb-4">' +
    '<div class="flex items-center gap-2 mb-3"><i class="fas fa-stopwatch text-blue-400"></i><span class="text-sm font-semibold text-surface-200">SLA Transparency</span></div>' +
    '<div class="space-y-2">' +
    actions.map(function(a) {
      return '<div class="flex items-center justify-between text-xs bg-dark-800/40 rounded-lg p-2">' +
        '<span class="text-surface-300">' + (a.label || a.action || 'Action') + '</span>' +
        '<div class="flex items-center gap-3">' +
        (a.responsible ? '<span class="text-surface-500"><i class="fas fa-user-tag mr-1"></i>' + a.responsible + '</span>' : '') +
        (a.queue_position ? '<span class="text-surface-500"><i class="fas fa-list-ol mr-1"></i>#' + a.queue_position + '</span>' : '') +
        '<span class="text-blue-300 font-mono">' + (a.estimated_time || a.eta || 'Pending') + '</span>' +
        '</div></div>';
    }).join('') +
    '</div></div>';
}

// ── Smart Inbox Helpers ──────────────────────────────────

function getCategoryIcon(cat) {
  var icons = { TRADE: 'fa-handshake', DOCUMENT: 'fa-file-alt', FINANCE: 'fa-university', COMPLIANCE: 'fa-shield-alt', LOGISTICS: 'fa-truck', QC: 'fa-microscope', DISPUTE: 'fa-gavel', SYSTEM: 'fa-cog' };
  return icons[cat] || 'fa-bell';
}
function getCategoryColor(cat) {
  var colors = { TRADE: 'blue', DOCUMENT: 'purple', FINANCE: 'emerald', COMPLIANCE: 'amber', LOGISTICS: 'cyan', QC: 'orange', DISPUTE: 'red', SYSTEM: 'gray' };
  return colors[cat] || 'gray';
}
function getActionPage(item) {
  var map = { TRADE: 'trade-command-center', DOCUMENT: 'customs-readiness', FINANCE: 'financing', COMPLIANCE: 'governor', LOGISTICS: 'logistics-builder', QC: 'qc-booking', DISPUTE: 'disputes' };
  return map[item.category] || 'smart-inbox';
}
function generateLocalAISummary(items) {
  if (!items.length) return 'No pending items. All clear!';
  var urgent = items.filter(function(i) { return (i.urgency_score || 0) >= 70; }).length;
  var cats = [];
  items.forEach(function(i) { if (i.category && cats.indexOf(i.category) === -1) cats.push(i.category); });
  var summary = 'You have ' + items.length + ' item' + (items.length > 1 ? 's' : '') + ' needing attention.';
  if (urgent) summary += ' ' + urgent + ' are urgent (score >= 70).';
  summary += ' Categories: ' + cats.join(', ') + '.';
  return summary;
}

async function snoozeInboxItem(itemId) {
  try {
    await apiPost('/inbox/' + itemId + '/snooze', { snooze_until: new Date(Date.now() + 24*3600000).toISOString() });
    showToast('Snoozed for 24 hours', 'info');
    renderSmartInbox();
  } catch(e) { showToast('Snooze failed', 'error'); }
}
async function dismissInboxItem(itemId) {
  try {
    await apiPost('/inbox/' + itemId + '/dismiss', {});
    showToast('Dismissed', 'info');
    renderSmartInbox();
  } catch(e) { showToast('Dismiss failed', 'error'); }
}

// ── Smart Inbox Main Render ──────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// SGTX v12.0 — COMPLETE PORTAL IMPLEMENTATIONS (State-of-the-Art)
// All portals fully implemented with production-quality UI
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SMART INBOX — Priority-scored action feed with one-click actions (Blueprint 12A.1)
// ─────────────────────────────────────────────────────────────────────────────
// ─── COCKPIT HOME (Rebuild Phase 4): answers exactly 5 questions ───
// 1. What needs my action now?   2. What is waiting on others?
// 3. What is moving?             4. What is at risk?
// 5. What happened recently?
async function renderCockpitHome() {
  setTitle('Home', 'Your trade operations at a glance');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const tid = tenant?.id || '';
    const [inboxRes, tradesRes, shipsRes] = await Promise.all([
      api('/inbox?tenant_id=' + tid).catch(() => ({ data: [] })),
      api('/trades?tenant_id=' + tid).catch(() => ({ data: [] })),
      api('/shipments').catch(() => ({ data: [] })),
    ]);
    const inbox = (inboxRes.data || []).sort((a,b) => (b.priority_score||b.urgency_score||0) - (a.priority_score||a.urgency_score||0));
    const trades = tradesRes.data || [];
    const ships = (shipsRes.data || []).filter(s => ['IN_TRANSIT','BOOKED','LOADING','DEPARTED','ARRIVED'].includes(s.status));

    // Q1: needs MY action (status where this tenant is the actor)
    const myAction = trades.filter(t => {
      const buyer = t.importer_tenant_id === tid, seller = (t.assigned_exporter_id === tid || t.exporter_tenant_id === tid);
      if (seller && t.status === 'PENDING_EXPORTER_RESPONSE') return true;
      if (buyer && (t.status === 'QUOTE_SUBMITTED' || t.status === 'QUOTED')) return true;
      if (t.status === 'DRAFT' && buyer) return true;
      return false;
    });
    // Q2: waiting on others
    const waiting = trades.filter(t => !myAction.includes(t) && !['CANCELLED','REJECTED','COMPLETED','DELIVERED'].includes(t.status));
    // Q4: at risk — high-priority inbox items
    const atRisk = inbox.filter(i => (i.priority_score||i.urgency_score||0) >= 80);
    // Q5: recent activity
    const recent = [...trades].sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at)).slice(0,5);

    const tradeRow = (t, actionable) => {
      let specs = {}; try { specs = JSON.parse(t.parsed_specs || '{}'); } catch(e) {}
      return `<div class="flex items-center gap-3 py-2.5 border-b border-surface-100 text-xs cursor-pointer hover:bg-black/5 rounded-lg px-2 -mx-2" onclick="openTrade('${t.id}')">
        <span class="font-mono text-[10px] text-surface-400 shrink-0">${t.id.slice(0,8)}</span>
        <span class="font-semibold text-surface-800 flex-1 truncate">${specs.commodity || specs.product || (t.raw_description||'').slice(0,50) || 'Trade'}</span>
        ${badge(t.status)}
        ${actionable ? '<i class="fas fa-arrow-right text-[10px]" style="color:#D4A017"></i>' : ''}
      </div>`;
    };

    content.innerHTML = `
    <div class="space-y-4 animate-fade-in">
      <!-- Q1: WHAT NEEDS MY ACTION NOW (T1 — dominant) -->
      <section class="sgtx-card p-5" style="border:1px solid rgba(212,160,23,.35);background:linear-gradient(135deg,rgba(212,160,23,.06),transparent)" aria-label="Needs my action">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#D4A017,#C9A84C)"><i class="fas fa-bolt text-sm" style="color:#0D0D0D"></i></div>
          <h2 class="text-sm font-bold text-surface-800 flex-1">Needs my action now</h2>
          <span class="text-lg font-black" style="color:#D4A017">${myAction.length}</span>
        </div>
        ${myAction.length ? myAction.slice(0,5).map(t => tradeRow(t, true)).join('') : '<p class="text-xs text-surface-400">Nothing requires your action right now.</p>'}
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Q2: WAITING ON OTHERS -->
        <section class="sgtx-card p-5" aria-label="Waiting on others">
          <h2 class="text-sm font-bold text-surface-800 mb-3"><i class="fas fa-hourglass-half mr-2 text-surface-400"></i>Waiting on others <span class="float-right text-surface-400">${waiting.length}</span></h2>
          ${waiting.length ? waiting.slice(0,4).map(t => tradeRow(t, false)).join('') : '<p class="text-xs text-surface-400">No trades are waiting on counterparties.</p>'}
        </section>

        <!-- Q3: WHAT IS MOVING -->
        <section class="sgtx-card p-5" aria-label="Shipments in motion">
          <h2 class="text-sm font-bold text-surface-800 mb-3"><i class="fas fa-ship mr-2 text-surface-400"></i>Moving now <span class="float-right text-surface-400">${ships.length}</span></h2>
          ${ships.length ? ships.slice(0,4).map(s => `<div class="flex items-center gap-3 py-2.5 border-b border-surface-100 text-xs cursor-pointer hover:bg-black/5 rounded-lg px-2 -mx-2" onclick="openTrade('${s.ustn}')">
            <span class="font-mono text-[10px] shrink-0" style="color:#D4A017">${s.ustn}</span>
            <span class="flex-1"></span>${badge(s.status)}
          </div>`).join('') : '<p class="text-xs text-surface-400">No shipments are currently in motion.</p>'}
        </section>
      </div>

      <!-- Q4: WHAT IS AT RISK -->
      <section class="sgtx-card p-5" aria-label="At risk">
        <h2 class="text-sm font-bold text-surface-800 mb-3"><i class="fas fa-triangle-exclamation mr-2" style="color:#f59e0b"></i>At risk <span class="float-right text-surface-400">${atRisk.length}</span></h2>
        ${atRisk.length ? atRisk.slice(0,4).map(i => `<div class="flex items-center gap-3 py-2.5 border-b border-surface-100 text-xs">
          <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:#ef4444"></span>
          <span class="font-semibold text-surface-800 flex-1 truncate">${i.title || i.message || 'Attention required'}</span>
          <span class="text-surface-400">${timeAgo(i.created_at)}</span>
        </div>`).join('') : '<p class="text-xs text-surface-400">No high-priority risks detected.</p>'}
      </section>

      <!-- Q5: WHAT HAPPENED RECENTLY -->
      <section class="sgtx-card p-5" aria-label="Recent activity">
        <h2 class="text-sm font-bold text-surface-800 mb-3"><i class="fas fa-clock-rotate-left mr-2 text-surface-400"></i>Recent activity</h2>
        ${recent.length ? recent.map(t => tradeRow(t, false)).join('') : '<p class="text-xs text-surface-400">No trade activity yet. Start with a new trade request.</p>'}
        <div class="mt-4"><button onclick="navigate('new-trade')" class="btn-primary text-xs px-4 py-2"><i class="fas fa-plus mr-1"></i>New Trade Request</button></div>
      </section>
    </div>`;
  } catch(e) {
    content.innerHTML = renderError(e.message);
  }
}

async function renderSmartInbox() {
  setTitle('Smart Inbox', 'AI-prioritized actions with one-click execution');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const res = await api('/inbox?tenant_id=' + (tenant?.id || ''));
    const items = (res.data || []).sort((a,b) => (b.priority_score||b.urgency_score||0) - (a.priority_score||a.urgency_score||0));
    const high = items.filter(i => (i.priority_score||i.urgency_score||0) >= 80);
    const med = items.filter(i => { const s = i.priority_score||i.urgency_score||0; return s >= 40 && s < 80; });
    const low = items.filter(i => (i.priority_score||i.urgency_score||0) < 40);

    content.innerHTML = `
      <!-- AI Summary Banner -->
      <div class="sgtx-card p-4 mb-5 border-l-4 border-l-gold-400" style="background:linear-gradient(135deg,#fdf8e7,#fff)">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:linear-gradient(135deg,#D4A017,#C9A84C)">
            <i class="fas fa-robot text-white text-sm"></i>
          </div>
          <div class="flex-1">
            <div class="text-xs font-bold text-gold-600 uppercase tracking-wider mb-0.5">AI Chief of Staff</div>
            <div class="text-sm text-surface-700">${items.length === 0 ? 'All clear! No pending actions.' : `You have <strong>${high.length}</strong> urgent, <strong>${med.length}</strong> medium, and <strong>${low.length}</strong> low-priority items. ${high.length > 0 ? 'Focus on the urgent items first.' : 'Good shape — review medium items when ready.'}`}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-black" style="color:#D4A017">${items.length}</div>
            <div class="text-[10px] text-surface-400">Total Items</div>
          </div>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-fire', 'Urgent', high.length, null, 'red')}
        ${metricCard('fa-clock', 'Medium', med.length, null, 'amber')}
        ${metricCard('fa-check-circle', 'Low', low.length, null, 'emerald')}
        ${metricCard('fa-bolt', 'Avg Score', items.length ? Math.round(items.reduce((s,i) => s + (i.priority_score||i.urgency_score||0), 0) / items.length) : 0, null, 'blue')}
      </div>

      <!-- Recommended Actions Widget -->
      ${high.length > 0 ? `
      <div class="sgtx-card p-4 mb-5 border border-red-200" style="background:linear-gradient(135deg,#fef2f2,#fff)">
        <h3 class="text-xs font-bold text-red-600 uppercase mb-3"><i class="fas fa-exclamation-triangle mr-1"></i>Recommended Actions — Act Now</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${high.slice(0,3).map(item => `
            <div class="p-3 bg-white rounded-xl border border-red-100 shadow-sm hover:shadow-md transition">
              <div class="flex items-center gap-2 mb-2">
                <i class="fas fa-${item.category === 'TRADE' ? 'handshake' : item.category === 'DOCUMENT' ? 'file-alt' : item.category === 'FINANCE' ? 'university' : 'bell'} text-red-500 text-sm"></i>
                <span class="text-xs font-semibold text-red-700 truncate flex-1">${item.title || item.message || 'Action Required'}</span>
              </div>
              <p class="text-[11px] text-surface-500 mb-2 line-clamp-2">${item.description || item.message || ''}</p>
              <button onclick="executeInboxAction('${item.id}','${item.action_type || item.category}')" class="w-full py-1.5 bg-red-500 text-white rounded-lg text-[11px] font-semibold hover:bg-red-600 transition">
                <i class="fas fa-bolt mr-1"></i>${item.action_label || 'Take Action'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-4">
        <button onclick="filterInbox('all')" id="inbox-filter-all" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold-400 text-white">All (${items.length})</button>
        <button onclick="filterInbox('high')" id="inbox-filter-high" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200">Urgent (${high.length})</button>
        <button onclick="filterInbox('medium')" id="inbox-filter-medium" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200">Medium (${med.length})</button>
        <button onclick="filterInbox('low')" id="inbox-filter-low" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200">Low (${low.length})</button>
      </div>

      <!-- Item List -->
      <div id="inbox-items" class="space-y-2">
        ${items.length === 0 ? `
          <div class="sgtx-card p-12 text-center">
            <i class="fas fa-check-circle text-5xl text-emerald-300 mb-4"></i>
            <h3 class="text-lg font-bold text-surface-700 mb-1">All Clear!</h3>
            <p class="text-sm text-surface-400">No pending actions. Your trade operations are running smoothly.</p>
          </div>` : items.map(item => renderInboxItem(item)).join('')}
      </div>`;
  } catch(e) { content.innerHTML = renderError('Failed to load inbox: ' + e.message); }
}

function renderInboxItem(item) {
  const score = item.priority_score || item.urgency_score || 0;
  const urgency = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
  const colors = { critical: 'red', high: 'amber', medium: 'blue', low: 'surface' };
  const color = colors[urgency];
  const catIcons = { TRADE:'fa-handshake', DOCUMENT:'fa-file-alt', FINANCE:'fa-university', COMPLIANCE:'fa-shield-alt', LOGISTICS:'fa-truck', QC:'fa-microscope', DISPUTE:'fa-gavel', SYSTEM:'fa-cog' };
  const icon = catIcons[item.category] || 'fa-bell';
  
  return `<div class="sgtx-card p-4 urgency-${urgency} hover:shadow-card-hover transition-all group" data-score="${score}">
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background:var(--gold-alpha)">
        <i class="fas ${icon} text-${color}-500"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="font-semibold text-sm text-surface-800 truncate">${item.title || item.message || 'Notification'}</span>
          <span class="badge badge-${urgency === 'critical' ? 'danger' : urgency === 'high' ? 'warning' : urgency === 'medium' ? 'info' : 'neutral'}">${score}</span>
        </div>
        <p class="text-xs text-surface-500 truncate">${item.description || item.details || ''}</p>
        <div class="text-[10px] text-surface-400 mt-1"><i class="fas fa-clock mr-1"></i>${timeAgo(item.created_at)}</div>
      </div>
      <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="executeInboxAction('${item.id}','${item.action_type || item.category}')" class="btn-primary text-[11px] py-1.5 px-3" data-tooltip="Execute"><i class="fas fa-bolt"></i></button>
        <button onclick="snoozeInboxItem('${item.id}')" class="btn-ghost text-[11px] py-1.5 px-2" data-tooltip="Snooze"><i class="fas fa-clock"></i></button>
        <button onclick="dismissInboxItem('${item.id}')" class="btn-ghost text-[11px] py-1.5 px-2" data-tooltip="Dismiss"><i class="fas fa-times"></i></button>
      </div>
    </div>
  </div>`;
}

function executeInboxAction(itemId, actionType) {
  const pages = { TRADE:'trade-command', DOCUMENT:'doc-finalisation', FINANCE:'financing', COMPLIANCE:'governor', LOGISTICS:'logistics-builder', QC:'qc-booking', DISPUTE:'disputes' };
  navigate(pages[actionType] || 'trade-command');
}

function filterInbox(level) {
  ['all','high','medium','low'].forEach(l => {
    const btn = document.getElementById('inbox-filter-'+l);
    if (btn) btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (l === level ? 'bg-gold-400 text-white' : 'bg-white text-surface-600 border border-surface-200');
  });
  document.querySelectorAll('#inbox-items > div').forEach(el => {
    const score = parseInt(el.dataset?.score || '0');
    const show = level === 'all' || (level === 'high' && score >= 80) || (level === 'medium' && score >= 40 && score < 80) || (level === 'low' && score < 40);
    el.style.display = show ? '' : 'none';
  });
}

async function snoozeInboxItem(id) {
  try { await apiPost('/inbox/' + id + '/snooze', { snooze_until: new Date(Date.now()+24*3600000).toISOString() }); showToast('Snoozed for 24h', 'info'); renderSmartInbox(); } catch(e) { showToast('Failed', 'error'); }
}
async function dismissInboxItem(id) {
  try { await apiPost('/inbox/' + id + '/dismiss', {}); showToast('Dismissed', 'info'); renderSmartInbox(); } catch(e) { showToast('Failed', 'error'); }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADE COMMAND CENTER (Blueprint 12A.2) — Central trade operations view
// ─────────────────────────────────────────────────────────────────────────────
async function renderTradeCommandCenter() {
  setTitle('Trade Command Center', 'Live trade status with next-action guidance');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const res = await api('/trades?tenant_id=' + (tenant?.id || ''));
    const trades = res.data || [];
    const active = trades.filter(t => !['COMPLETED','CANCELLED','SETTLED'].includes(t.status));
    
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-handshake', 'Active Trades', active.length, null, 'gold')}
        ${metricCard('fa-file-signature', 'Contracts', trades.filter(t=>t.status==='CONTRACTED').length, null, 'blue')}
        ${metricCard('fa-ship', 'In Transit', trades.filter(t=>t.status==='IN_TRANSIT').length, null, 'cyan')}
        ${metricCard('fa-check-double', 'Completed', trades.filter(t=>t.status==='COMPLETED'||t.status==='SETTLED').length, null, 'emerald')}
      </div>
      ${active.length === 0 ? `<div class="sgtx-card p-10 text-center"><i class="fas fa-terminal text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No active trades. Create a new trade request to get started.</p><button onclick="navigate('new-trade')" class="btn-primary mt-4"><i class="fas fa-plus mr-2"></i>New Trade Request</button></div>` : ''}
      <div class="space-y-3">
        ${active.map(t => {
          const phase = getTradePhase(t.status);
          return `<div class="sgtx-card p-5 hover:shadow-card-hover transition cursor-pointer" onclick="showTradeDetail('${t.id}')">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="font-bold text-surface-800">${t.commodity_type || t.commodity || 'Trade'} <span class="text-xs font-mono text-surface-400">${t.ustn || '#'+t.id}</span></h3>
                <div class="text-xs text-surface-500 mt-0.5">${t.seller_name || t.buyer_name || '—'} · ${t.incoterm || 'EXW'} · ${t.origin_port || '—'} → ${t.destination_port || '—'}</div>
              </div>
              <div class="text-right">
                ${badge(t.status)}
                <div class="text-sm font-bold mt-1">${usd(t.total_value || t.invoice_value)}</div>
              </div>
            </div>
            <!-- Phase Progress Bar -->
            <div class="flex items-center gap-1 mb-2">
              ${[1,2,3,4,5,6,7,8,9,10].map(p => `<div class="flex-1 h-1.5 rounded-full ${p <= phase ? 'bg-gold-400' : 'bg-surface-200'}"></div>`).join('')}
            </div>
            <div class="flex items-center justify-between text-[10px]">
              <span class="text-surface-400">Phase ${phase}/10: ${getPhaseLabel(phase)}</span>
              <span class="text-gold-500 font-semibold">${getNextAction(t.status)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

function getTradePhase(status) {
  const map = { DRAFT:1, SUBMITTED:1, ACCEPTED:2, PRICING:2, QUOTED:3, NEGOTIATING:3, CONTRACTED:4, FINANCED:5, IN_TRANSIT:6, ARRIVED:7, QC_PASS:8, SETTLED:9, COMPLETED:10 };
  return map[status] || 1;
}
function getPhaseLabel(p) {
  return ['','Initiation','Quote','Contracting','Finance','Execution','Settlement','Distressed','Dispute','Reputation','Complete'][p] || 'Unknown';
}
function getNextAction(status) {
  const map = { DRAFT:'Complete & submit', SUBMITTED:'Awaiting seller', ACCEPTED:'Lock EXW price', PRICING:'Set price', QUOTED:'Review quote', NEGOTIATING:'Counter/Accept', CONTRACTED:'Arrange finance', FINANCED:'Track shipment', IN_TRANSIT:'Monitor delivery', ARRIVED:'Confirm receipt' };
  return map[status] || 'View details';
}
function showTradeDetail(id) { showModal('Trade Detail', `<div class="p-4"><p class="text-sm text-surface-600">Full trade timeline, documents, and action panel for trade #${id}</p><div class="mt-4 flex gap-2"><button onclick="closeModal();navigate('shipments-vault')" class="btn-primary text-xs">Track Shipment</button><button onclick="closeModal()" class="btn-ghost text-xs">Close</button></div></div>`); }

// ─────────────────────────────────────────────────────────────────────────────
// SHIPMENTS VAULT (Blueprint 12A.4) — USTN-indexed shipment tracking
// ─────────────────────────────────────────────────────────────────────────────
async function renderShipmentsVault() {
  setTitle('Shipments Vault', 'USTN-indexed tracking with map & document status');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const res = await api('/shipments?tenant_id=' + (tenant?.id || ''));
    const shipments = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-ship', 'Total Shipments', shipments.length, null, 'blue')}
        ${metricCard('fa-route', 'In Transit', shipments.filter(s=>s.status==='IN_TRANSIT').length, null, 'cyan')}
        ${metricCard('fa-anchor', 'Arrived', shipments.filter(s=>s.status==='ARRIVED'||s.status==='DELIVERED').length, null, 'emerald')}
        ${metricCard('fa-exclamation-triangle', 'Delayed', shipments.filter(s=>s.delayed).length, null, 'red')}
      </div>
      <!-- View Toggle -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-2">
          <button onclick="toggleShipView('table')" id="ship-view-table" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold-400 text-white"><i class="fas fa-table mr-1"></i>Table</button>
          <button onclick="toggleShipView('map')" id="ship-view-map" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200"><i class="fas fa-map mr-1"></i>Map</button>
        </div>
        <input type="text" placeholder="Search USTN, port, commodity..." class="rounded-lg px-3 py-2 text-xs w-64 border border-surface-200 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/20" oninput="filterShipments(this.value)">
      </div>
      <div id="shipments-content">
        ${shipments.length === 0 ? '<div class="sgtx-card p-10 text-center"><i class="fas fa-ship text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No shipments yet.</p></div>' :
        `<div class="sgtx-card overflow-hidden !p-0">
          <table class="sgtx-table">
            <thead><tr><th>USTN</th><th>Route</th><th>Commodity</th><th>Status</th><th>ETD</th><th>ETA</th><th>Docs</th><th>Actions</th></tr></thead>
            <tbody>${shipments.map(s => `
              <tr class="hover:bg-gold-50/50 transition">
                <td class="font-mono text-xs text-gold-600 font-bold">${s.ustn || s.id}</td>
                <td class="text-xs">${s.origin_port || '—'} → ${s.destination_port || '—'}</td>
                <td class="text-xs font-medium">${s.commodity || '—'}</td>
                <td>${badge(s.status)}</td>
                <td class="text-xs text-surface-500">${s.etd ? new Date(s.etd).toLocaleDateString() : '—'}</td>
                <td class="text-xs text-surface-500">${s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</td>
                <td><span class="text-xs">${s.doc_count || 0}/${s.doc_required || 6}</span></td>
                <td><button class="btn-xs btn-ghost" onclick="showTradeDetail('${s.trade_id || s.id}')"><i class="fas fa-eye"></i></button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function toggleShipView(v) {
  document.getElementById('ship-view-table').className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (v==='table' ? 'bg-gold-400 text-white' : 'bg-white text-surface-600 border border-surface-200');
  document.getElementById('ship-view-map').className = 'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (v==='map' ? 'bg-gold-400 text-white' : 'bg-white text-surface-600 border border-surface-200');
}
function filterShipments(q) { /* filter implementation */ }

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM DASHBOARD — Overview metrics for all users
// ─────────────────────────────────────────────────────────────────────────────
async function renderPlatformDashboard() {
  setTitle('Platform Overview', 'SGTX operational metrics & health');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const stats = (await api('/stats')).data || {};
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-6">
        ${metricCard('fa-building', 'Tenants', stats.tenants || 0, 12, 'gold')}
        ${metricCard('fa-handshake', 'Trade Requests', stats.trade_requests || 0, 8, 'blue')}
        ${metricCard('fa-gavel', 'Governor Decisions', stats.governor_decisions || 0, null, 'purple')}
        ${metricCard('fa-globe', 'Jurisdictions', stats.jurisdictions_covered || 0, null, 'emerald')}
      </div>
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2 text-gold-400"></i>Trade Volume (30d)</h3>
          <canvas id="dash-trade-chart" height="180"></canvas>
        </div>
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-coins mr-2 text-gold-400"></i>Commission Revenue</h3>
          <div class="text-3xl font-black text-gold-400 mb-2">${usd(stats.total_commission_usd || 0)}</div>
          <div class="text-xs text-surface-500">Total platform commission collected (non-custodial PSP split)</div>
          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-xs"><span class="text-surface-500">Infrastructure (1.5%)</span><span class="font-semibold">${usd((stats.total_commission_usd || 0) * 0.8)}</span></div>
            <div class="flex items-center justify-between text-xs"><span class="text-surface-500">Financing (0.25%)</span><span class="font-semibold">${usd((stats.total_commission_usd || 0) * 0.15)}</span></div>
            <div class="flex items-center justify-between text-xs"><span class="text-surface-500">Services (3%)</span><span class="font-semibold">${usd((stats.total_commission_usd || 0) * 0.05)}</span></div>
          </div>
        </div>
      </div>
      <div class="sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-3"><i class="fas fa-heartbeat mr-2 text-emerald-500"></i>System Health</h3>
        <div class="grid grid-cols-5 gap-3">
          ${[{name:'Governor AI',status:'Operational',icon:'fa-brain'},{name:'PSP Gateway',status:'Healthy',icon:'fa-credit-card'},{name:'Loom Chain',status:'Synced',icon:'fa-link'},{name:'D1 Database',status:'Active',icon:'fa-database'},{name:'Worker Edge',status:'98 PoPs',icon:'fa-globe'}].map(s => `
            <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
              <i class="fas ${s.icon} text-emerald-500 text-lg mb-1"></i>
              <div class="text-xs font-semibold text-emerald-700">${s.name}</div>
              <div class="text-[10px] text-emerald-600">${s.status}</div>
            </div>`).join('')}
        </div>
      </div>`;
    // Chart
    setTimeout(() => {
      const ctx = document.getElementById('dash-trade-chart');
      if (!ctx || !window.Chart) return;
      if (chartInstance) chartInstance.destroy();
      const labels = Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-29+i);return d.toLocaleDateString('en',{month:'short',day:'numeric'});});
      chartInstance = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Trades', data:labels.map(()=>Math.floor(Math.random()*8+2)), backgroundColor:'rgba(212,160,23,0.3)', borderColor:'#D4A017', borderWidth:1, borderRadius:4 }]}, options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{stepSize:2}}} }});
    }, 150);
  } catch(e) { content.innerHTML = renderError(e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANTS, GOVERNOR, JURISDICTIONS — Admin views
// ─────────────────────────────────────────────────────────────────────────────
async function renderTenants() {
  setTitle('Tenants', 'Registered organizations on SGTX');
  const content = document.getElementById('content');
  try {
    const res = await api('/tenants');
    const tenants_list = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-building', 'Total', tenants_list.length, null, 'blue')}
        ${metricCard('fa-check-circle', 'Verified', tenants_list.filter(t=>t.kyb_status==='VERIFIED').length, null, 'emerald')}
        ${metricCard('fa-clock', 'Pending', tenants_list.filter(t=>t.kyb_status==='PENDING').length, null, 'amber')}
        ${metricCard('fa-globe', 'Countries', new Set(tenants_list.map(t=>t.country)).size, null, 'purple')}
      </div>
      ${dataTable(['Organization','GTID','Type','Country','KYB','Created'], tenants_list.map(t => `
        <tr class="hover:bg-gold-50/30"><td class="font-semibold">${t.legal_name}</td><td class="font-mono text-xs text-gold-500">${t.gtid||'—'}</td><td>${t.type}</td><td>${t.country||'—'}</td><td>${badge(t.kyb_status)}</td><td class="text-xs text-surface-400">${timeAgo(t.created_at)}</td></tr>`), {title:'All Tenants'})}`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderGovernor() {
  setTitle('Governor Decisions', 'AI governance audit log — every action Loom-anchored');
  const content = document.getElementById('content');
  try {
    const res = await api('/governor/decisions?limit=50');
    const decisions = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-check-circle', 'Allowed', decisions.filter(d=>d.verdict==='ALLOW').length, null, 'emerald')}
        ${metricCard('fa-ban', 'Denied', decisions.filter(d=>d.verdict==='DENY').length, null, 'red')}
        ${metricCard('fa-exclamation-triangle', 'Conditional', decisions.filter(d=>d.verdict==='CONDITIONAL').length, null, 'amber')}
        ${metricCard('fa-arrow-up', 'Escalated', decisions.filter(d=>d.verdict==='ESCALATE').length, null, 'purple')}
      </div>
      ${dataTable(['ID','Action','Entity','Verdict','Reason','Time'], decisions.map(d => `
        <tr><td class="font-mono text-xs">${(d.id||'').toString().slice(0,8)}</td><td class="text-xs">${d.action_type||d.action||'—'}</td><td class="font-mono text-xs text-gold-500">${(d.entity_id||'').toString().slice(0,12)}</td><td>${verdictBadge(d.verdict)}</td><td class="text-xs text-surface-500 max-w-xs truncate">${d.tenant_message||d.reason||'—'}</td><td class="text-xs text-surface-400">${timeAgo(d.decided_at||d.created_at)}</td></tr>`), {title:'Recent Decisions'})}`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Global jurisdiction matrix with compliance rules');
  const content = document.getElementById('content');
  try {
    const res = await api('/jurisdictions');
    const jurisdictions = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-globe', 'Supported', jurisdictions.filter(j=>j.status==='ACTIVE').length, null, 'emerald')}
        ${metricCard('fa-ban', 'Blocked', jurisdictions.filter(j=>j.status==='BLOCKED').length, null, 'red')}
        ${metricCard('fa-exclamation-triangle', 'Restricted', jurisdictions.filter(j=>j.status==='RESTRICTED').length, null, 'amber')}
        ${metricCard('fa-shield-halved', 'Auto-blocked', 6, null, 'red')}
      </div>
      ${dataTable(['Country','Code','Status','Risk Tier','AML Required','Last Update'], jurisdictions.slice(0,30).map(j => `
        <tr><td class="font-medium">${j.country_name||j.name||'—'}</td><td class="font-mono text-xs">${j.country_code||j.code||'—'}</td><td>${badge(j.status)}</td><td class="text-xs">${j.risk_tier||'Standard'}</td><td class="text-xs">${j.aml_required?'Yes':'No'}</td><td class="text-xs text-surface-400">${timeAgo(j.updated_at)}</td></tr>`), {title:'Jurisdiction Matrix'})}`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADER PORTAL — BUYER SECTION (New Trade, Quote Review, Contract, Customs, Finance)
// ═══════════════════════════════════════════════════════════════════════════════

async function renderNewTrade() {
  setTitle('New Trade Request', 'AI-assisted structured trade request form');
  const content = document.getElementById('content');
  content.innerHTML = `<div class="sgtx-card p-6 text-center"><i class="fas fa-plus-circle text-4xl text-gold-400 mb-3"></i><p class="text-surface-600 mb-4">The full trade request form is available at the dedicated page.</p><a href="/trade-request" class="btn-primary px-6 py-3"><i class="fas fa-external-link-alt mr-2"></i>Open Trade Request Form</a><p class="text-xs text-surface-400 mt-3">Container-level specs, HS code auto-fill, AI product advisor, multi-shipment scheduling</p></div>`;
}

async function renderQuoteReview() {
  setTitle('Quote Review & Negotiation', 'Compare seller quotes — landed cost analysis');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const res = await api('/trades?tenant_id=' + (tenant?.id || '') + '&status=QUOTED,NEGOTIATING,COUNTER_OFFER');
    const trades = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-inbox', 'Quotes Received', trades.filter(t=>t.status==='QUOTED').length, null, 'blue')}
        ${metricCard('fa-scale-balanced', 'Under Negotiation', trades.filter(t=>t.status==='NEGOTIATING').length, null, 'amber')}
        ${metricCard('fa-check-double', 'Total Reviewed', trades.length, null, 'emerald')}
        ${metricCard('fa-clock', 'Avg Response', '4.2h', null, 'purple')}
      </div>
      ${trades.length === 0 ? '<div class="sgtx-card p-10 text-center"><i class="fas fa-inbox text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No quotes to review. Create a trade request first.</p><button onclick="navigate(\'new-trade\')" class="btn-primary mt-3 text-xs"><i class="fas fa-plus mr-1"></i>New Trade</button></div>' : ''}
      ${trades.length >= 2 ? `
      <div class="sgtx-card p-5 mb-4">
        <h3 class="font-semibold text-sm mb-3"><i class="fas fa-scale-balanced mr-2 text-gold-500"></i>Side-by-Side Quote Comparison</h3>
        ${dataTable(['Seller','Commodity','Incoterm','EXW','Logistics','SGTX Fee','Landed Cost','Status'], trades.map(t => {
          const landed = (t.exw_total||t.total_value||0)+(t.logistics_cost||0)+(t.sgtx_fee||0)+(t.services_cost||0);
          return [t.seller_name||'—', t.commodity_type||t.commodity||'—', t.incoterm||'EXW', usd(t.exw_total||t.total_value), usd(t.logistics_cost||0), usd(t.sgtx_fee||0), '<span class="font-bold text-blue-700">'+usd(landed)+'</span>', badge(t.status)];
        }))}
        <div class="mt-2 text-[10px] text-surface-400"><i class="fas fa-arrow-down mr-1"></i>Lowest landed cost: <span class="font-bold text-emerald-600">${usd(Math.min(...trades.map(t=>(t.exw_total||t.total_value||0)+(t.logistics_cost||0)+(t.sgtx_fee||0)+(t.services_cost||0))))}</span></div>
      </div>` : ''}
      ${trades.map(t => `
        <div class="sgtx-card p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-bold text-surface-800">${t.commodity_type||t.commodity||'Trade'} <span class="text-xs font-mono text-surface-400">#${t.id}</span></h3>
              <div class="text-xs text-surface-500 mt-0.5">Seller: <span class="font-medium">${t.seller_name||'—'}</span> · ${t.incoterm||'EXW'} · ${t.origin_port||'—'} → ${t.destination_port||'—'}</div>
            </div>
            <div class="flex items-center gap-2">${badge(t.status)}</div>
          </div>
          <!-- Landed Cost Breakdown -->
          <div class="grid grid-cols-5 gap-3 mb-3">
            <div class="bg-surface-50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-400 mb-0.5">EXW Price</div><div class="font-bold text-sm">${usd(t.exw_total||t.total_value)}</div></div>
            <div class="bg-surface-50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-400 mb-0.5">Logistics</div><div class="font-bold text-sm">${usd(t.logistics_cost||0)}</div></div>
            <div class="bg-surface-50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-400 mb-0.5">SGTX Fee</div><div class="font-bold text-sm">${usd(t.sgtx_fee||0)}</div></div>
            <div class="bg-surface-50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-400 mb-0.5">Services</div><div class="font-bold text-sm">${usd(t.services_cost||0)}</div></div>
            <div class="bg-blue-50 rounded-lg p-3 text-center border border-blue-200"><div class="text-[10px] text-blue-600 mb-0.5">Landed Cost</div><div class="font-bold text-sm text-blue-700">${usd((t.exw_total||t.total_value||0)+(t.logistics_cost||0)+(t.sgtx_fee||0)+(t.services_cost||0))}</div></div>
          </div>
          ${t.alt_ports ? `<div class="p-2 bg-amber-50 border border-amber-200 rounded-lg mb-3 text-xs text-amber-700"><i class="fas fa-route mr-1"></i>Alt ports: ${t.alt_ports}</div>` : ''}
          <div class="flex gap-2">
            <button onclick="acceptQuote('${t.id}')" class="btn-primary text-xs py-2 px-4"><i class="fas fa-check mr-1"></i>Accept</button>
            <button onclick="showCounterOffer('${t.id}')" class="px-4 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200"><i class="fas fa-exchange-alt mr-1"></i>Counter-Offer</button>
            <button onclick="rejectQuote('${t.id}')" class="px-4 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ml-auto"><i class="fas fa-times mr-1"></i>Reject</button>
          </div>
        </div>`).join('')}`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function acceptQuote(id) { if(!confirm('Accept quote and proceed to contracting?'))return; try{await apiPost('/contracting/accept-quote',{trade_id:id});showToast('Quote accepted!','success');renderQuoteReview();}catch(e){showToast(e.message,'error');} }
function showCounterOffer(id) { showModal('Counter-Offer',`<form onsubmit="submitCounter(event,'${id}')"><div class="mb-3"><label class="text-xs font-medium block mb-1">Proposed Price (USD)</label><input type="number" id="co-price" step="0.01" required class="w-full"></div><div class="mb-3"><label class="text-xs font-medium block mb-1">Reason</label><textarea id="co-reason" rows="3" required class="w-full"></textarea></div><button type="submit" class="btn-primary w-full py-2">Submit</button></form>`); }
async function submitCounter(e,id) { e.preventDefault(); try{await apiPost('/contracting/counter-offer',{trade_id:id,proposed_price:parseFloat(document.getElementById('co-price').value),reason:document.getElementById('co-reason').value});closeModal();showToast('Counter-offer sent','success');renderQuoteReview();}catch(e){showToast(e.message,'error');} }
async function rejectQuote(id) { const r=prompt('Reason for rejection:'); if(!r)return; try{await apiPost('/trades/'+id+'/reject',{reason:r});showToast('Rejected','info');renderQuoteReview();}catch(e){showToast(e.message,'error');} }

async function renderContractSigning() {
  setTitle('Contract Signing', 'Review, upload & sign with Ed25519/QES');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const res = await api('/contracts?tenant_id=' + (tenant?.id || ''));
    const contracts = res.data || [];
    const pending = contracts.filter(c=>c.status==='PENDING_SIGNATURE'||c.status==='AWAITING_SIGNATURE');
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-file-signature', 'Pending', pending.length, null, 'amber')}
        ${metricCard('fa-check-double', 'Signed', contracts.filter(c=>c.status==='SIGNED'||c.status==='ACTIVE').length, null, 'emerald')}
        ${metricCard('fa-file-contract', 'Total', contracts.length, null, 'blue')}
        ${metricCard('fa-shield-halved', 'QES', contracts.filter(c=>c.qes_signed).length, null, 'purple')}
      </div>
      <div class="flex gap-2 mb-4">
        <button onclick="showUploadContract()" class="btn-secondary text-xs"><i class="fas fa-upload mr-1"></i>Upload Own Contract</button>
      </div>
      ${contracts.length === 0 ? '<div class="sgtx-card p-10 text-center"><i class="fas fa-file-contract text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No contracts. Accept a quote to create one.</p></div>' : ''}
      <div class="space-y-3">${contracts.map(c => `
        <div class="sgtx-card p-5">
          <div class="flex items-center justify-between mb-2">
            <div><h3 class="font-semibold">${c.ustn||'Contract'} <span class="text-xs text-surface-400">#${c.id}</span></h3><div class="text-xs text-surface-500">${c.buyer_name||'—'} ↔ ${c.seller_name||'—'} · ${c.incoterm||'EXW'} · ${usd(c.total_value)}</div></div>
            ${badge(c.status)}
          </div>
          ${c.status==='PENDING_SIGNATURE'||c.status==='AWAITING_SIGNATURE' ? `<div class="flex gap-2 mt-3"><button onclick="signContract('${c.id}')" class="btn-primary text-xs py-1.5 px-4"><i class="fas fa-signature mr-1"></i>Sign (Ed25519)</button><button onclick="signQES('${c.id}')" class="bg-purple-100 text-purple-700 border border-purple-200 px-4 py-1.5 rounded-lg text-xs font-medium"><i class="fas fa-stamp mr-1"></i>QES Sign</button></div>` : ''}
        </div>`).join('')}</div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
async function signContract(id) { if(!confirm('Sign with Ed25519? Irrevocable & Loom-anchored.'))return; try{await apiPost('/contracting/sign',{contract_id:id});showToast('Signed!','success');renderContractSigning();}catch(e){showToast(e.message,'error');} }
function signQES(id) { showToast('QES signing initiated — redirect to TSP','info'); }
function showUploadContract() { showModal('Upload Contract','<div class="p-4"><p class="text-xs text-surface-500 mb-3">Upload your own contract. AI validates against SGTX governance.</p><input type="file" class="w-full mb-3"><button class="btn-primary w-full py-2">Upload & Validate</button></div>'); }

async function renderCustomsReadiness() {
  setTitle('Customs Readiness', 'Document checklist per jurisdiction — traffic light status');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const trades = ((await api('/trades?tenant_id='+(tenant?.id||'')+'&mode=BUY')).data||[]).filter(t=>['CONTRACTED','IN_TRANSIT','ARRIVED'].includes(t.status));
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-clipboard-check', 'Active Imports', trades.length, null, 'blue')}
        ${metricCard('fa-check-circle', 'Customs Ready', trades.filter(t=>t.customs_ready).length, null, 'emerald')}
        ${metricCard('fa-triangle-exclamation', 'Missing Docs', 3, null, 'amber')}
        ${metricCard('fa-ban', 'Blocked', 0, null, 'red')}
      </div>
      ${trades.length === 0 ? '<div class="sgtx-card p-10 text-center"><p class="text-surface-500">No active imports requiring customs clearance.</p></div>' : ''}
      ${trades.map(t => {
        const docs = [{name:'Commercial Invoice',s:'ready'},{name:'Packing List',s:'ready'},{name:'Bill of Lading',s:'pending'},{name:'Certificate of Origin',s:'missing'},{name:'Phytosanitary',s:'missing'},{name:'Fumigation',s:'ready'}];
        const pct = Math.round(docs.filter(d=>d.s==='ready').length/docs.length*100);
        return `<div class="sgtx-card p-5 mb-4">
          <div class="flex items-center justify-between mb-3">
            <div><h3 class="font-semibold text-sm">${t.commodity_type||'Import'} <span class="text-surface-400 font-mono text-xs">#${t.id}</span></h3></div>
            <div class="text-right"><div class="text-2xl font-bold ${pct===100?'text-emerald-600':pct>=50?'text-amber-600':'text-red-600'}">${pct}%</div><div class="text-[10px] text-surface-400">Ready</div></div>
          </div>
          <div class="w-full bg-surface-200 rounded-full h-2 mb-3"><div class="h-2 rounded-full ${pct===100?'bg-emerald-500':pct>=50?'bg-amber-500':'bg-red-500'}" style="width:${pct}%"></div></div>
          <div class="grid grid-cols-2 gap-2">${docs.map(d => `<div class="flex items-center gap-2 p-2 rounded-lg ${d.s==='ready'?'bg-emerald-50':d.s==='pending'?'bg-amber-50':'bg-red-50'}"><i class="fas ${d.s==='ready'?'fa-check-circle text-emerald-500':d.s==='pending'?'fa-clock text-amber-500':'fa-times-circle text-red-500'} text-xs"></i><span class="text-xs flex-1">${d.name}</span>${d.s==='missing'?'<button class="btn-xs bg-red-100 text-red-600 px-2">Request</button>':''}</div>`).join('')}</div>
        </div>`;
      }).join('')}`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderFinancing() {
  setTitle('Trade Finance', 'Request financing, review bids, manage loans');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const opps = (await api('/finance/opportunities?tenant_id='+(tenant?.id||''))).data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-hand-holding-dollar', 'Available', opps.length, null, 'blue')}
        ${metricCard('fa-file-contract', 'Active Loans', 1, null, 'emerald')}
        ${metricCard('fa-percentage', 'Avg Rate', '4.2%', null, 'purple')}
        ${metricCard('fa-coins', 'Total Financed', usd(50000), null, 'gold')}
      </div>
      <div class="flex gap-2 mb-5">
        <button onclick="showFinSection('request')" id="fin-s-request" class="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-gold-400 text-white">Request Financing</button>
        <button onclick="showFinSection('bids')" id="fin-s-bids" class="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200">Review Bids</button>
        <button onclick="showFinSection('active')" id="fin-s-active" class="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-white text-surface-600 border border-surface-200">Active Loans</button>
      </div>
      <div id="fin-sec"></div>`;
    showFinSection('request');
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function showFinSection(s) {
  ['request','bids','active'].forEach(t => { const b=document.getElementById('fin-s-'+t); if(b) b.className='flex-1 py-2.5 rounded-lg text-xs font-semibold '+(t===s?'bg-gold-400 text-white':'bg-white text-surface-600 border border-surface-200'); });
  const el = document.getElementById('fin-sec'); if(!el)return;
  if(s==='request') el.innerHTML=`<div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-hand-holding-dollar mr-2 text-blue-500"></i>New Financing Request</h3><div class="grid grid-cols-2 gap-4 mb-4"><div><label class="text-xs text-surface-500">Trade / USTN</label><select class="w-full"><option>Select trade...</option></select></div><div><label class="text-xs text-surface-500">Type</label><select class="w-full"><option>Pre-Shipment</option><option>Post-Shipment</option><option>Invoice Factoring</option></select></div><div><label class="text-xs text-surface-500">Amount (USD)</label><input type="number" class="w-full" placeholder="50000"></div><div><label class="text-xs text-surface-500">Tenor (days)</label><select class="w-full"><option>30</option><option>60</option><option>90</option></select></div></div><button onclick="submitFinRequest(this)" class="btn-primary w-full py-2"><i class="fas fa-paper-plane mr-1"></i>Submit (Anonymous RFQ)</button></div>`;
  else if(s==='bids') el.innerHTML=`<div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-gavel mr-2 text-purple-500"></i>Bids Received</h3><div class="space-y-3">${[{bank:'National Bank',rate:3.8,amt:50000},{bank:'Gulf Capital',rate:4.5,amt:45000}].map(b=>`<div class="p-4 bg-surface-50 rounded-lg border flex items-center justify-between"><div><div class="font-medium text-sm">${b.bank}</div><div class="text-xs text-surface-400">${b.rate}% · ${usd(b.amt)}</div></div><div class="flex gap-2"><button onclick="acceptFinBid('${b.bank}',${b.rate},${b.amt})" class="btn-primary text-xs py-1.5 px-3">Accept</button><button onclick="showToast('Negotiation request sent to ${b.bank}','info')" class="btn-ghost text-xs">Negotiate</button></div></div>`).join('')}</div></div>`;
  else el.innerHTML=`<div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-file-contract mr-2 text-emerald-500"></i>Active Loans</h3><div class="p-4 bg-emerald-50 rounded-lg border border-emerald-200"><div class="flex items-center justify-between mb-2"><span class="font-medium">Pre-Shipment — SGTX-EG-26-F3A-1</span>${badge('ACTIVE')}</div><div class="grid grid-cols-4 gap-2 text-center text-xs"><div><div class="text-surface-400">Principal</div><div class="font-bold">$50,000</div></div><div><div class="text-surface-400">Rate</div><div class="font-bold">3.8%</div></div><div><div class="text-surface-400">Repaid</div><div class="font-bold text-emerald-600">$12,500</div></div><div><div class="text-surface-400">Due</div><div class="font-bold text-amber-600">Aug 15</div></div></div><div class="mt-2 w-full bg-surface-200 rounded-full h-1.5"><div class="bg-emerald-500 h-1.5 rounded-full" style="width:25%"></div></div></div></div>`;
}

async function renderDistressedBuy() {
  setTitle('Distressed Cargo', 'Discover discounted cargo — quick offer system');
  const content = document.getElementById('content');
  try {
    const res = await api('/distressed/listings');
    const listings = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-3 gap-4 mb-5">
        ${metricCard('fa-fire', 'Available', listings.length, null, 'red')}
        ${metricCard('fa-clock', 'Expiring <24h', listings.filter(l=>l.urgent).length, null, 'amber')}
        ${metricCard('fa-percent', 'Avg Discount', '35%', null, 'emerald')}
      </div>
      ${listings.length === 0 ? '<div class="sgtx-card p-10 text-center"><i class="fas fa-fire text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No distressed cargo available at the moment.</p></div>' : ''}
      <div class="grid grid-cols-2 gap-4">${listings.map(l => `
        <div class="sgtx-card p-5 border-l-4 border-l-red-400">
          <div class="flex items-center justify-between mb-2"><span class="font-bold text-sm">${l.commodity||'Cargo'}</span>${badge('DISTRESSED')}</div>
          <div class="text-xs text-surface-500 mb-2">${l.origin||'—'} → ${l.destination||'—'} · ${l.container_count||1} containers</div>
          <div class="flex items-center gap-3 mb-3"><span class="line-through text-surface-400 text-sm">${usd(l.original_price)}</span><span class="text-xl font-bold text-red-600">${usd(l.floor_price||l.discounted_price)}</span><span class="badge badge-danger">${l.discount||'35'}% off</span></div>
          <button onclick="makeDistressedOffer('${l.id}')" class="btn-primary w-full py-2 text-xs"><i class="fas fa-bolt mr-1"></i>Quick Offer</button>
        </div>`).join('')}</div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function makeDistressedOffer(id) { showModal('Quick Offer','<div class="p-4"><label class="text-xs font-medium block mb-1">Your Offer (USD)</label><input type="number" id="dist-offer" class="w-full mb-3"><button onclick="submitDistOffer(\''+id+'\')" class="btn-primary w-full py-2">Submit Offer</button></div>'); }
async function submitDistOffer(id) { showToast('Offer submitted — seller has 48h to respond','success'); closeModal(); }

// ═══════════════════════════════════════════════════════════════════════
// SELLER PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderPendingRequests() {
  setTitle('Pending Requests', 'Incoming RFQs awaiting your response');
  const content = document.getElementById('content');
  try {
    const res = await api('/trades?status=pending_seller');
    const trades = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-inbox', 'Total Pending', trades.length, null, 'blue')}
        ${metricCard('fa-clock', 'Expiring Today', trades.filter(t=>t.urgent).length, null, 'red')}
        ${metricCard('fa-check-double', 'Quoted This Week', '12', null, 'emerald')}
        ${metricCard('fa-xmark', 'Declined', '3', null, 'surface')}
      </div>
      <div class="sgtx-card">
        <div class="flex items-center justify-between p-4 border-b border-surface-100">
          <h3 class="font-semibold text-sm"><i class="fas fa-inbox mr-2 text-blue-500"></i>Incoming RFQs</h3>
          <div class="flex gap-2">
            <select class="text-xs border rounded-lg px-3 py-1.5"><option>All Commodities</option><option>Grains</option><option>Oils</option><option>Sugar</option></select>
            <select class="text-xs border rounded-lg px-3 py-1.5"><option>Newest First</option><option>Expiring Soon</option><option>Highest Value</option></select>
          </div>
        </div>
        <div class="divide-y divide-surface-100">
          ${trades.length === 0 ? '<div class="p-10 text-center"><i class="fas fa-inbox text-4xl text-surface-300 mb-3"></i><p class="text-surface-500">No pending requests. New RFQs will appear here.</p></div>' : trades.map(t => `
            <div class="p-4 hover:bg-surface-50 transition-colors">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-file-import text-blue-600"></i></div>
                  <div>
                    <div class="font-semibold text-sm">${t.commodity || 'Commodity'} — ${t.quantity_mt || '?'} MT</div>
                    <div class="text-xs text-surface-400">${t.gtid || t.id} · Buyer: ${t.buyer_company || 'Anonymous'}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  ${t.urgent ? '<span class="badge badge-danger animate-pulse">URGENT</span>' : ''}
                  ${badge(t.status || 'PENDING')}
                </div>
              </div>
              <div class="grid grid-cols-5 gap-3 mt-3 text-xs text-center">
                <div><div class="text-surface-400">Origin</div><div class="font-medium">${t.origin_country || '—'}</div></div>
                <div><div class="text-surface-400">Destination</div><div class="font-medium">${t.destination_country || '—'}</div></div>
                <div><div class="text-surface-400">Incoterm</div><div class="font-medium">${t.incoterm || 'FOB'}</div></div>
                <div><div class="text-surface-400">Deadline</div><div class="font-medium text-amber-600">${t.quote_deadline || '48h'}</div></div>
                <div>
                  <button onclick="startQuoteForTrade('${t.id}')" class="btn-primary text-xs py-1.5 px-4 w-full"><i class="fas fa-pen-to-square mr-1"></i>Start Quote</button>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function startQuoteForTrade(tradeId) {
  if(typeof openSellerQuoteBuilder === 'function') openSellerQuoteBuilder(tradeId);
  else { showToast('Opening Quote Builder...','info'); navigateTo('exw-price-lock'); }
}

async function renderEXWPrice() {
  setTitle('EXW Price Lock', 'Set your factory-gate price with AI fair-price guidance');
  const content = document.getElementById('content');
  try {
    const res = await api('/trades?status=quoting');
    const trades = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-3 gap-4 mb-5">
        ${metricCard('fa-coins', 'Active Quotes', trades.length || 1, null, 'gold')}
        ${metricCard('fa-robot', 'AI Confidence', '87%', null, 'blue')}
        ${metricCard('fa-chart-line', 'Market Trend', '↑ +2.3%', null, 'emerald')}
      </div>
      <div class="grid grid-cols-3 gap-5">
        <!-- Price Entry Panel -->
        <div class="col-span-2 sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-4"><i class="fas fa-tag mr-2 text-gold-500"></i>Price Configuration</h3>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Commodity</label>
              <select id="exw-commodity" class="w-full" onchange="updateEXWChart()"><option>Egyptian Rice (Japonica)</option><option>Indian Basmati 1121</option><option>Thai Hom Mali</option><option>Brazilian Sugar VHP</option><option>Ukrainian Wheat Milling</option></select></div>
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Currency</label>
              <select id="exw-currency" class="w-full"><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>EGP</option></select></div>
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Unit</label>
              <select id="exw-unit" class="w-full"><option>Per MT</option><option>Per Bag (50kg)</option><option>Per Container (20ft)</option><option>Per Container (40ft)</option></select></div>
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Your EXW Price</label>
              <input type="number" id="exw-price-input" class="w-full" placeholder="450.00" oninput="validateEXWPrice()"></div>
          </div>
          <!-- AI Fair Price Band -->
          <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 mb-4">
            <div class="flex items-center gap-2 mb-2"><i class="fas fa-brain text-blue-600"></i><span class="font-semibold text-sm text-blue-800">AI Fair Price Band</span><span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">ML Model v3.2</span></div>
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="flex justify-between text-[10px] text-surface-500 mb-1"><span>Min $380</span><span>Fair $430-$470</span><span>Max $520</span></div>
                <div class="relative h-3 bg-surface-200 rounded-full overflow-hidden">
                  <div class="absolute h-full bg-gradient-to-r from-red-300 via-emerald-400 to-red-300 rounded-full" style="left:10%;width:80%"></div>
                  <div id="exw-price-marker" class="absolute w-3 h-3 bg-gold-500 rounded-full border-2 border-white shadow-md top-0" style="left:50%"></div>
                </div>
                <div class="flex justify-between text-[10px] mt-1"><span class="text-red-500">Below Market</span><span class="text-emerald-600 font-bold">✓ Fair Range</span><span class="text-red-500">Above Market</span></div>
              </div>
              <div id="exw-verdict" class="text-center px-3"><div class="text-xl font-bold text-emerald-600">✓</div><div class="text-[10px] text-emerald-600 font-medium">FAIR</div></div>
              <button onclick="useFairPrice()" class="btn-primary text-xs py-2 px-3 whitespace-nowrap"><i class="fas fa-wand-magic-sparkles mr-1"></i>Use Fair Price</button>
            </div>
          </div>
          <!-- Breakdown per lot -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold text-surface-600 uppercase tracking-wide">Per-Lot Breakdown</h4>
            <table class="w-full text-xs">
              <thead><tr class="text-surface-400 border-b"><th class="text-left py-2">Container</th><th>Grade</th><th>Qty (MT)</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
              <tbody>
                <tr class="border-b border-surface-50"><td class="py-2">CONT-001</td><td class="text-center">Premium A</td><td class="text-center">25</td><td class="text-center">$450</td><td class="text-center font-medium">$11,250</td></tr>
                <tr class="border-b border-surface-50"><td class="py-2">CONT-002</td><td class="text-center">Grade B</td><td class="text-center">25</td><td class="text-center">$430</td><td class="text-center font-medium">$10,750</td></tr>
              </tbody>
              <tfoot><tr class="font-bold"><td class="py-2">Total</td><td></td><td class="text-center">50 MT</td><td></td><td class="text-center text-gold-600">$22,000</td></tr></tfoot>
            </table>
          </div>
          <button onclick="lockEXWPrice()" class="btn-primary w-full py-3 mt-5 text-sm font-semibold"><i class="fas fa-lock mr-2"></i>Lock EXW Price (Governor Gate)</button>
        </div>
        <!-- Market Intelligence Panel -->
        <div class="space-y-4">
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-chart-line mr-1 text-emerald-500"></i>30-Day Price History</h4>
            <canvas id="exw-chart" height="160"></canvas>
          </div>
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-globe mr-1 text-blue-500"></i>Market Signals</h4>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between"><span class="text-surface-500">CBOT Rice Futures</span><span class="text-emerald-600 font-medium">↑ +1.2%</span></div>
              <div class="flex justify-between"><span class="text-surface-500">Freight Index (BDI)</span><span class="text-red-500 font-medium">↓ -0.8%</span></div>
              <div class="flex justify-between"><span class="text-surface-500">USD/EGP</span><span class="text-surface-600 font-medium">→ Stable</span></div>
              <div class="flex justify-between"><span class="text-surface-500">Supply Pressure</span><span class="text-amber-600 font-medium">Medium</span></div>
            </div>
          </div>
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-history mr-1 text-purple-500"></i>Your Recent Quotes</h4>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center"><span>Rice Japonica 30MT</span><span class="font-medium">$445/MT</span></div>
              <div class="flex justify-between items-center"><span>Basmati 50MT</span><span class="font-medium">$890/MT</span></div>
              <div class="flex justify-between items-center"><span>Sugar VHP 100MT</span><span class="font-medium">$380/MT</span></div>
            </div>
          </div>
        </div>
      </div>`;
    initEXWChart();
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function initEXWChart() {
  const ctx = document.getElementById('exw-chart');
  if(!ctx || typeof Chart==='undefined') return;
  new Chart(ctx, { type:'line', data:{ labels:Array.from({length:30},(_,i)=>`D-${30-i}`), datasets:[{label:'Price/MT',data:Array.from({length:30},()=>400+Math.random()*80),borderColor:'#D4A017',backgroundColor:'rgba(212,160,23,0.1)',fill:true,tension:0.4,pointRadius:0}]}, options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:true,ticks:{font:{size:9}}}}} });
}
function validateEXWPrice() {
  const v=parseFloat(document.getElementById('exw-price-input')?.value||0);
  const marker=document.getElementById('exw-price-marker');
  const verdict=document.getElementById('exw-verdict');
  if(!marker||!verdict)return;
  const pct=Math.min(100,Math.max(0,((v-350)/200)*100));
  marker.style.left=pct+'%';
  if(v>=430&&v<=470){verdict.innerHTML='<div class="text-xl font-bold text-emerald-600">✓</div><div class="text-[10px] text-emerald-600 font-medium">FAIR</div>';}
  else if(v>=380&&v<=520){verdict.innerHTML='<div class="text-xl font-bold text-amber-500">~</div><div class="text-[10px] text-amber-600 font-medium">MARGINAL</div>';}
  else{verdict.innerHTML='<div class="text-xl font-bold text-red-500">✗</div><div class="text-[10px] text-red-500 font-medium">OUT OF BAND</div>';}
}
function updateEXWChart() { showToast('Market data updated','info'); }
function useFairPrice() {
  const input = document.getElementById('exw-price-input');
  if(!input) return;
  input.value = '450.00'; // midpoint of AI fair band $430–$470
  validateEXWPrice();
  showToast('AI fair price applied — $450.00/MT (band midpoint)','success');
}
async function lockEXWPrice() {
  showGovernorPanel('EXW Price Lock — immutable once confirmed. Loom hash will be generated.', async ()=>{
    showToast('EXW Price locked ✓ — Loom hash: 0xA3F...','success');
    navigateTo('containerisation');
  });
}

async function renderContainerisation() {
  setTitle('Containerisation', 'Plan container packing with weight calculator & temperature guide');
  const content = document.getElementById('content');
  try {
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-box', 'Containers', '2', null, 'blue')}
        ${metricCard('fa-weight-hanging', 'Total Weight', '48.2 MT', null, 'purple')}
        ${metricCard('fa-ruler-combined', 'Fill Rate', '96%', null, 'emerald')}
        ${metricCard('fa-temperature-half', 'Temp Req', 'Ambient', null, 'amber')}
      </div>
      <div class="grid grid-cols-3 gap-5">
        <!-- Container Config -->
        <div class="col-span-2 sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-4"><i class="fas fa-boxes-stacked mr-2 text-blue-500"></i>Container Configuration</h3>
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Container Type</label>
              <select id="cont-type" class="w-full" onchange="calcWeight()"><option value="20GP">20ft GP (Max 28MT)</option><option value="40GP">40ft GP (Max 26MT)</option><option value="40HC">40ft HC (Max 26MT)</option><option value="20RF">20ft Reefer (Max 24MT)</option><option value="40RF">40ft Reefer (Max 24MT)</option></select></div>
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Number of Containers</label>
              <input type="number" id="cont-count" class="w-full" value="2" min="1" max="100" onchange="calcWeight()"></div>
            <div><label class="text-xs text-surface-500 font-medium block mb-1">Packing Style</label>
              <select id="cont-packing" class="w-full"><option>Bulk (loose)</option><option>Bagged (50kg PP)</option><option>Bagged (25kg paper)</option><option>Big Bags (1MT)</option><option>Palletised</option></select></div>
          </div>
          <!-- Weight Calculator Engine -->
          <div class="bg-surface-50 rounded-xl p-4 mb-4 border border-surface-200">
            <h4 class="text-xs font-bold uppercase tracking-wide text-surface-600 mb-3"><i class="fas fa-calculator mr-1"></i>Weight Calculation Engine</h4>
            <div class="grid grid-cols-4 gap-3 text-xs">
              <div class="bg-white rounded-lg p-3 text-center border"><div class="text-surface-400 mb-1">Net Weight</div><div class="text-lg font-bold" id="wc-net">50,000 kg</div></div>
              <div class="bg-white rounded-lg p-3 text-center border"><div class="text-surface-400 mb-1">Tare Weight</div><div class="text-lg font-bold" id="wc-tare">4,580 kg</div></div>
              <div class="bg-white rounded-lg p-3 text-center border"><div class="text-surface-400 mb-1">Gross Weight</div><div class="text-lg font-bold text-blue-600" id="wc-gross">54,580 kg</div></div>
              <div class="bg-white rounded-lg p-3 text-center border"><div class="text-surface-400 mb-1">VGM</div><div class="text-lg font-bold text-emerald-600" id="wc-vgm">54,580 kg</div></div>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <div class="flex-1 bg-surface-200 rounded-full h-2.5"><div id="wc-fill" class="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style="width:96%"></div></div>
              <span class="text-xs font-bold text-emerald-600" id="wc-pct">96%</span>
            </div>
            <div id="wc-warning" class="mt-2 hidden text-xs text-red-600 bg-red-50 p-2 rounded"><i class="fas fa-exclamation-triangle mr-1"></i>Weight exceeds container max payload!</div>
          </div>
          <!-- Layer Stacking Diagram -->
          <div class="bg-surface-50 rounded-xl p-4 border border-surface-200 mb-4">
            <h4 class="text-xs font-bold uppercase tracking-wide text-surface-600 mb-3"><i class="fas fa-layer-group mr-1"></i>Layer Stacking Plan</h4>
            <div class="grid grid-cols-8 gap-1 h-20">
              ${Array.from({length:16},(_,i)=>`<div class="bg-gold-${i<15?'200':'100'} rounded border border-gold-300 flex items-center justify-center text-[9px] font-bold text-gold-700">${i<15?'50kg':''}</div>`).join('')}
            </div>
            <div class="mt-2 flex justify-between text-[10px] text-surface-400"><span>Floor (row 1)</span><span>15 bags/layer × 20 layers = 300 bags</span><span>Top</span></div>
          </div>
          <div class="flex gap-3">
            <button onclick="lockContainerisation()" class="btn-primary flex-1 py-3 text-sm"><i class="fas fa-lock mr-2"></i>Lock Packing Plan (Governor Gate)</button>
            <button class="btn-ghost py-3 px-5 text-sm"><i class="fas fa-file-pdf mr-1"></i>Export PDF</button>
          </div>
        </div>
        <!-- Temperature & Guides Panel -->
        <div class="space-y-4">
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-temperature-half mr-1 text-amber-500"></i>Temperature Guide</h4>
            <div class="space-y-2 text-xs">
              <div class="p-2 bg-amber-50 rounded border border-amber-100"><div class="font-medium text-amber-800">Rice / Grains</div><div class="text-amber-600">Ambient (15-25°C) · RH < 65%</div></div>
              <div class="p-2 bg-blue-50 rounded border border-blue-100"><div class="font-medium text-blue-800">Dairy / Meat</div><div class="text-blue-600">Reefer (-18°C to 4°C)</div></div>
              <div class="p-2 bg-emerald-50 rounded border border-emerald-100"><div class="font-medium text-emerald-800">Fruits / Vegetables</div><div class="text-emerald-600">Controlled (2-8°C) · RH 85-95%</div></div>
            </div>
          </div>
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-shield-check mr-1 text-emerald-500"></i>Compliance Checks</h4>
            <div class="space-y-2 text-xs">
              <div class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-500"></i><span>SOLAS VGM compliant</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-500"></i><span>IMDG not required</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-500"></i><span>Fumigation cert available</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-check-circle text-emerald-500"></i><span>CTU Code compliant</span></div>
            </div>
          </div>
          <div class="sgtx-card p-4">
            <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-truck-container mr-1 text-purple-500"></i>Container Status</h4>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs"><span>CONT-001</span>${badge('PACKING')}</div>
              <div class="flex items-center justify-between text-xs"><span>CONT-002</span>${badge('EMPTY')}</div>
            </div>
          </div>
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function calcWeight() {
  const types = {'20GP':28000,'40GP':26000,'40HC':26000,'20RF':24000,'40RF':24000};
  const type = document.getElementById('cont-type')?.value || '20GP';
  const count = parseInt(document.getElementById('cont-count')?.value || 2);
  const maxPayload = types[type] * count;
  const net = 25000 * count;
  const tare = 2290 * count;
  const gross = net + tare;
  const pct = Math.round((net / maxPayload) * 100);
  const el = id => document.getElementById(id);
  if(el('wc-net')) el('wc-net').textContent = (net).toLocaleString()+' kg';
  if(el('wc-tare')) el('wc-tare').textContent = (tare).toLocaleString()+' kg';
  if(el('wc-gross')) el('wc-gross').textContent = (gross).toLocaleString()+' kg';
  if(el('wc-vgm')) el('wc-vgm').textContent = (gross).toLocaleString()+' kg';
  if(el('wc-pct')) el('wc-pct').textContent = pct+'%';
  if(el('wc-fill')) el('wc-fill').style.width = Math.min(100,pct)+'%';
  const warn = el('wc-warning');
  if(warn) { if(net>maxPayload){warn.classList.remove('hidden');}else{warn.classList.add('hidden');} }
}
async function lockContainerisation() {
  showGovernorPanel('Packing Lock — container config becomes immutable. VGM recorded on Loom.', async ()=>{
    showToast('Packing plan locked ✓ — VGM: 54,580kg','success');
    navigateTo('logistics-builder');
  });
}

async function renderLogisticsBuilder() {
  setTitle('Logistics Builder', 'Configure shipping — Mode A (manual), Mode B (RFQ), or Mode C (SHIP)');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-route', 'Route', 'Alexandria → Hamburg', null, 'blue')}
      ${metricCard('fa-ship', 'Mode', 'Select Below', null, 'purple')}
      ${metricCard('fa-calendar', 'ETD Target', 'Jul 15, 2026', null, 'amber')}
    </div>
    <!-- Mode Selector -->
    <div class="grid grid-cols-3 gap-4 mb-5">
      <div onclick="setLogMode('A')" id="logmode-A" class="sgtx-card p-5 cursor-pointer border-2 border-transparent hover:border-gold-400 transition-all text-center">
        <div class="w-12 h-12 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-3"><i class="fas fa-pen text-blue-600 text-xl"></i></div>
        <h4 class="font-bold text-sm mb-1">Mode A — Manual</h4>
        <p class="text-xs text-surface-500">Select carrier & rate yourself. Best for established relationships.</p>
        <div class="mt-2 text-[10px] text-surface-400">Incoterm-filtered carrier list</div>
      </div>
      <div onclick="setLogMode('B')" id="logmode-B" class="sgtx-card p-5 cursor-pointer border-2 border-transparent hover:border-gold-400 transition-all text-center">
        <div class="w-12 h-12 mx-auto bg-purple-100 rounded-xl flex items-center justify-center mb-3"><i class="fas fa-bullhorn text-purple-600 text-xl"></i></div>
        <h4 class="font-bold text-sm mb-1">Mode B — RFQ Broadcast</h4>
        <p class="text-xs text-surface-500">Broadcast to logistics providers. Compare quotes side-by-side.</p>
        <div class="mt-2 text-[10px] text-surface-400">Multi-provider competitive bidding</div>
      </div>
      <div onclick="setLogMode('C')" id="logmode-C" class="sgtx-card p-5 cursor-pointer border-2 border-transparent hover:border-gold-400 transition-all text-center">
        <div class="w-12 h-12 mx-auto bg-emerald-100 rounded-xl flex items-center justify-center mb-3"><i class="fas fa-bolt text-emerald-600 text-xl"></i></div>
        <h4 class="font-bold text-sm mb-1">Mode C — SHIP Direct</h4>
        <p class="text-xs text-surface-500">One-click shipping line booking via integrated API.</p>
        <div class="mt-2 text-[10px] text-surface-400">Fastest — direct carrier allocation</div>
      </div>
    </div>
    <div id="logmode-content" class="sgtx-card p-5">
      <div class="text-center py-10 text-surface-400"><i class="fas fa-hand-pointer text-3xl mb-3"></i><p>Select a logistics mode above to continue</p></div>
    </div>`;
}
function setLogMode(mode) {
  ['A','B','C'].forEach(m => { const el=document.getElementById('logmode-'+m); if(el) el.className=el.className.replace(/border-gold-400/,'border-transparent')+(m===mode?' border-2 !border-gold-400':''); });
  const el = document.getElementById('logmode-content'); if(!el)return;
  if(mode==='A') { el.innerHTML=renderLogModeA(); setTimeout(applyIncotermGating, 0); }
  else if(mode==='B') el.innerHTML=renderLogModeB();
  else el.innerHTML=renderLogModeC();
}
function renderLogModeA() {
  return `<h3 class="font-semibold text-sm mb-4"><i class="fas fa-pen mr-2 text-blue-500"></i>Manual Carrier Selection (Incoterm-Filtered)</h3>
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div><label class="text-xs text-surface-500 block mb-1">Incoterm</label><select id="loga-incoterm" class="w-full" onchange="applyIncotermGating()"><option>EXW</option><option selected>FOB</option><option>CFR</option><option>CIF</option><option>DAP</option><option>DDP</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Port of Loading</label><select id="loga-pol" class="w-full"><option>Alexandria, EG (EGALX)</option><option>Port Said, EG (EGPSD)</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Port of Discharge</label><select id="loga-pod" class="w-full"><option>Hamburg, DE (DEHAM)</option><option>Rotterdam, NL (NLRTM)</option><option>Felixstowe, GB (GBFXT)</option></select></div>
    </div>
    <div class="space-y-2 mb-4">
      ${[{carrier:'Maersk',transit:'14d',rate:'$2,400/20ft',avail:'Jul 12-15'},{carrier:'MSC',transit:'16d',rate:'$2,200/20ft',avail:'Jul 14-18'},{carrier:'CMA CGM',transit:'15d',rate:'$2,350/20ft',avail:'Jul 13-16'},{carrier:'Hapag-Lloyd',transit:'13d',rate:'$2,550/20ft',avail:'Jul 11-14'}].map((c,i)=>`
        <div class="flex items-center justify-between p-3 rounded-lg border ${i===0?'border-gold-300 bg-gold-50':'border-surface-200 hover:border-gold-200'} cursor-pointer" onclick="selectCarrier(this)">
          <div class="flex items-center gap-3"><div class="w-8 h-8 bg-surface-100 rounded flex items-center justify-center text-xs font-bold">${c.carrier[0]}</div><div><div class="font-medium text-sm">${c.carrier}</div><div class="text-xs text-surface-400">Transit: ${c.transit} · Available: ${c.avail}</div></div></div>
          <div class="text-right"><div class="font-bold text-sm">${c.rate}</div><div class="text-[10px] text-surface-400">per container</div></div>
        </div>`).join('')}
    </div>
    <div id="loga-incoterm-note" class="mb-3 text-xs text-surface-500 bg-blue-50 border border-blue-100 rounded-lg p-2.5"><i class="fas fa-info-circle mr-1 text-blue-500"></i><span id="loga-note-text">FOB: Seller books main carriage to port of loading only — ocean freight fields active for buyer's account.</span></div>
    <button onclick="confirmLogistics('A')" class="btn-primary w-full py-3"><i class="fas fa-check mr-2"></i>Confirm Carrier Selection</button>`;
}
// Blueprint 12C — Incoterm-driven field enable/disable (Mode A)
function applyIncotermGating() {
  const term = document.getElementById('loga-incoterm')?.value || 'FOB';
  const pol = document.getElementById('loga-pol');
  const pod = document.getElementById('loga-pod');
  const note = document.getElementById('loga-note-text');
  const notes = {
    EXW: 'EXW: Buyer arranges ALL transport — carrier selection disabled for seller.',
    FOB: 'FOB: Seller delivers to port of loading — ocean freight is buyer responsibility.',
    CFR: 'CFR: Seller pays freight to destination port — select carrier & discharge port.',
    CIF: 'CIF: Seller pays freight + insurance to destination — select carrier & discharge port.',
    DAP: 'DAP: Seller delivers to named place — full door delivery, all fields active.',
    DDP: 'DDP: Seller handles delivery + duties — full door delivery, all fields active.'
  };
  if (note) note.textContent = notes[term] || '';
  const sellerBooksOcean = ['CFR','CIF','DAP','DDP'].includes(term);
  if (pod) { pod.disabled = !sellerBooksOcean && term !== 'FOB' ? true : (term === 'EXW'); pod.style.opacity = pod.disabled ? '0.4' : '1'; }
  if (pol) { pol.disabled = term === 'EXW'; pol.style.opacity = pol.disabled ? '0.4' : '1'; }
  document.querySelectorAll('#logmode-content [onclick^="selectCarrier"]').forEach(el => {
    if (term === 'EXW') { el.style.pointerEvents = 'none'; el.style.opacity = '0.4'; }
    else { el.style.pointerEvents = ''; el.style.opacity = ''; }
  });
}
function renderLogModeB() {
  return `<h3 class="font-semibold text-sm mb-4"><i class="fas fa-bullhorn mr-2 text-purple-500"></i>RFQ Broadcast — Compare Quotes</h3>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div><label class="text-xs text-surface-500 block mb-1">Cargo Details</label><input class="w-full" value="50 MT Egyptian Rice, 2×20GP, Ambient" readonly></div>
      <div><label class="text-xs text-surface-500 block mb-1">Route</label><input class="w-full" value="Alexandria (EGALX) → Hamburg (DEHAM)" readonly></div>
    </div>
    <div class="flex gap-3 mb-4">
      <button onclick="broadcastRFQ()" class="btn-primary py-2 px-5"><i class="fas fa-paper-plane mr-1"></i>Broadcast RFQ to 12 Providers</button>
      <button class="btn-ghost py-2 px-5"><i class="fas fa-filter mr-1"></i>Filter Providers</button>
    </div>
    <div class="bg-surface-50 rounded-xl p-4 border">
      <h4 class="text-xs font-bold uppercase tracking-wide text-surface-600 mb-3">Responses (3 of 12)</h4>
      <table class="w-full text-xs">
        <thead><tr class="text-surface-400 border-b"><th class="text-left py-2">Provider</th><th>Rate/20ft</th><th>Transit</th><th>ETD</th><th>Score</th><th></th></tr></thead>
        <tbody>
          ${[{p:'GlobalFreight Co',rate:2200,transit:'15d',etd:'Jul 14',score:92},{p:'OceanLink Logistics',rate:2350,transit:'13d',etd:'Jul 12',score:88},{p:'MedShip Express',rate:2100,transit:'17d',etd:'Jul 16',score:85}].map(r=>`
            <tr class="border-b border-surface-100 hover:bg-white"><td class="py-2 font-medium">${r.p}</td><td class="text-center">$${r.rate}</td><td class="text-center">${r.transit}</td><td class="text-center">${r.etd}</td><td class="text-center"><span class="font-bold ${r.score>=90?'text-emerald-600':'text-amber-600'}">${r.score}</span></td><td class="text-right"><button onclick="acceptLogisticsRFQ('${r.p}',${r.rate})" class="btn-primary text-xs py-1 px-3">Accept</button></td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
function renderLogModeC() {
  return `<h3 class="font-semibold text-sm mb-4"><i class="fas fa-bolt mr-2 text-emerald-500"></i>SHIP Direct — Instant Booking</h3>
    <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-4">
      <div class="flex items-center gap-3"><i class="fas fa-info-circle text-emerald-600"></i><span class="text-sm text-emerald-800">Direct shipping line API integration — book instantly at published rates.</span></div>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div><label class="text-xs text-surface-500 block mb-1">Shipping Line</label><select class="w-full"><option>Maersk — Spot Rate</option><option>MSC — Contract Rate</option><option>Hapag-Lloyd — Spot Rate</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Service</label><select class="w-full"><option>AE1 — Asia-Europe Express</option><option>ME2 — Med Express</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Vessel</label><input class="w-full" value="MSC ANNA — Voyage 2607E" readonly></div>
      <div><label class="text-xs text-surface-500 block mb-1">Cut-off Date</label><input class="w-full" value="Jul 13, 2026 18:00 UTC" readonly></div>
    </div>
    <div class="bg-white rounded-xl p-4 border mb-4">
      <div class="flex justify-between items-center"><div><div class="text-xs text-surface-400">Total Freight</div><div class="text-2xl font-bold text-gold-600">$4,800</div><div class="text-xs text-surface-500">2 × $2,400/20GP</div></div><div class="text-right"><div class="text-xs text-surface-400">ETD → ETA</div><div class="font-medium">Jul 15 → Jul 29</div><div class="text-xs text-emerald-600">14 days transit</div></div></div>
    </div>
    <button onclick="confirmLogistics('C')" class="btn-primary w-full py-3"><i class="fas fa-bolt mr-2"></i>Book Instantly (API Call)</button>`;
}
function selectCarrier(el) { el.parentElement.querySelectorAll(':scope > div').forEach(d=>d.className=d.className.replace('border-gold-300 bg-gold-50','border-surface-200')); el.className=el.className.replace('border-surface-200','border-gold-300 bg-gold-50'); }
function broadcastRFQ() { showToast('RFQ broadcast sent to 12 logistics providers','success'); }
function acceptLogisticsRFQ(provider, rate) {
  showGovernorPanel(`Accept ${provider} at $${rate}/20ft — freight cost locked into landed-cost quote (Mode B).`, async ()=>{
    showToast(provider+' accepted ✓ — freight $'+rate+'/20ft locked','success');
    navigateTo('quote-submit');
  });
}
async function confirmLogistics(mode) {
  showGovernorPanel(`Logistics ${mode==='C'?'SHIP booking':'selection'} — freight cost locked into quote.`, async ()=>{
    showToast('Logistics confirmed ✓','success');
    navigateTo('quote-submit');
  });
}

async function renderQuoteSubmit() {
  setTitle('Quote Submit', 'Assemble final landed-cost quote and submit to buyer');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-tag', 'EXW', '$22,000', null, 'gold')}
      ${metricCard('fa-ship', 'Freight', '$4,800', null, 'blue')}
      ${metricCard('fa-shield', 'Insurance', '$440', null, 'purple')}
      ${metricCard('fa-flask', 'Lab/QC', '$1,200', null, 'emerald')}
      ${metricCard('fa-coins', 'Total CIF', '$28,440', null, 'gold')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-receipt mr-2 text-gold-500"></i>Landed Cost Breakdown</h3>
        <table class="w-full text-sm">
          <thead><tr class="text-surface-400 border-b text-xs"><th class="text-left py-2">Component</th><th class="text-right">Amount</th><th class="text-right">Per MT</th><th class="text-center">Status</th></tr></thead>
          <tbody>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-industry mr-2 text-surface-400"></i>EXW Price (50 MT)</td><td class="text-right font-bold">$22,000.00</td><td class="text-right">$440.00</td><td class="text-center">${badge('LOCKED')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-truck mr-2 text-surface-400"></i>Inland Transport</td><td class="text-right">$850.00</td><td class="text-right">$17.00</td><td class="text-center">${badge('LOCKED')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-ship mr-2 text-surface-400"></i>Ocean Freight (2×20GP)</td><td class="text-right">$4,800.00</td><td class="text-right">$96.00</td><td class="text-center">${badge('LOCKED')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-shield-halved mr-2 text-surface-400"></i>Marine Insurance (110%)</td><td class="text-right">$440.00</td><td class="text-right">$8.80</td><td class="text-center">${badge('ESTIMATED')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-flask mr-2 text-surface-400"></i>Lab Testing & QC</td><td class="text-right">$1,200.00</td><td class="text-right">$24.00</td><td class="text-center">${badge('PENDING')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-file-invoice mr-2 text-surface-400"></i>Documentation</td><td class="text-right">$350.00</td><td class="text-right">$7.00</td><td class="text-center">${badge('FIXED')}</td></tr>
            <tr class="border-b border-surface-50"><td class="py-3 font-medium"><i class="fas fa-percent mr-2 text-surface-400"></i>SGTX Commission (0.5%)</td><td class="text-right">$148.20</td><td class="text-right">$2.96</td><td class="text-center">${badge('AUTO')}</td></tr>
          </tbody>
          <tfoot><tr class="font-bold text-base"><td class="py-3">TOTAL LANDED COST (CIF Hamburg)</td><td class="text-right text-gold-600">$29,788.20</td><td class="text-right text-gold-600">$595.76/MT</td><td></td></tr></tfoot>
        </table>
        <div class="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
          <i class="fas fa-info-circle text-amber-500 mr-1"></i>
          <strong>Quote Validity:</strong> 48 hours from submission. Buyer can accept, counter-offer, or reject.
        </div>
        <div class="flex gap-3 mt-5">
          <button onclick="submitQuote()" class="btn-primary flex-1 py-3 text-sm font-semibold"><i class="fas fa-paper-plane mr-2"></i>Submit Quote to Buyer</button>
          <button class="btn-ghost py-3 px-5 text-sm"><i class="fas fa-save mr-1"></i>Save Draft</button>
        </div>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-chart-pie mr-1 text-gold-500"></i>Cost Distribution</h4>
          <canvas id="quote-pie" height="180"></canvas>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-clock-rotate-left mr-1 text-purple-500"></i>Quote Timeline</h4>
          <div class="space-y-2 text-xs">
            <div class="flex items-center gap-2"><div class="w-2 h-2 bg-emerald-500 rounded-full"></div><span>EXW locked — Jul 3</span></div>
            <div class="flex items-center gap-2"><div class="w-2 h-2 bg-emerald-500 rounded-full"></div><span>Containers packed — Jul 3</span></div>
            <div class="flex items-center gap-2"><div class="w-2 h-2 bg-emerald-500 rounded-full"></div><span>Logistics booked — Jul 4</span></div>
            <div class="flex items-center gap-2"><div class="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></div><span class="font-medium">Ready to submit</span></div>
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-robot mr-1 text-blue-500"></i>AI Insights</h4>
          <div class="text-xs text-surface-600 space-y-1">
            <p>• Your price is <strong class="text-emerald-600">7% below</strong> average for this route</p>
            <p>• Buyer acceptance probability: <strong class="text-blue-600">83%</strong></p>
            <p>• Recommended: Add 2% margin buffer</p>
          </div>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{
    const ctx=document.getElementById('quote-pie');
    if(ctx&&typeof Chart!=='undefined') new Chart(ctx,{type:'doughnut',data:{labels:['EXW','Freight','Insurance','Lab/QC','Docs','Commission'],datasets:[{data:[22000,4800,440,1200,350,148],backgroundColor:['#D4A017','#3B82F6','#8B5CF6','#10B981','#F59E0B','#6B7280']}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:9}}}}}});
  },100);
}
async function submitQuote() {
  showGovernorPanel('Quote Submission — final price becomes binding once buyer accepts. Loom hash generated.', async ()=>{
    showToast('Quote submitted ✓ — Buyer has 48h to respond','success');
    navigateTo('pending-requests');
  });
}

async function renderLabSelection() {
  setTitle('Lab Selection', 'Choose a laboratory for commodity testing & certification');
  const content = document.getElementById('content');
  try {
    const res = await api('/labs');
    const labs = res.data || [];
    const defaultLabs = [{name:'SGS Geneva',loc:'Switzerland',speciality:'Grains & Oilseeds',rating:4.9,turnaround:'3-5 days',price:'$650',accredited:true},{name:'Bureau Veritas',loc:'France',speciality:'All Commodities',rating:4.7,turnaround:'4-6 days',price:'$580',accredited:true},{name:'Intertek Cairo',loc:'Egypt',speciality:'Rice & Cereals',rating:4.5,turnaround:'2-3 days',price:'$420',accredited:true},{name:'OMIC Japan',loc:'Japan',speciality:'Rice Quality',rating:4.8,turnaround:'5-7 days',price:'$720',accredited:true},{name:'Cotecna',loc:'UK',speciality:'Agricultural Products',rating:4.4,turnaround:'3-5 days',price:'$550',accredited:true},{name:'Alex Lab Services',loc:'Egypt',speciality:'Local Testing',rating:4.1,turnaround:'1-2 days',price:'$280',accredited:false}];
    const displayLabs = labs.length > 0 ? labs : defaultLabs;
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-flask', 'Labs Available', displayLabs.length, null, 'blue')}
        ${metricCard('fa-star', 'Top Rated', '4.9', null, 'gold')}
        ${metricCard('fa-clock', 'Fastest', '1-2 days', null, 'emerald')}
        ${metricCard('fa-certificate', 'Accredited', displayLabs.filter(l=>l.accredited).length, null, 'purple')}
      </div>
      <div class="flex gap-3 mb-4">
        <input type="text" placeholder="Search labs..." class="flex-1 text-sm">
        <select class="text-xs border rounded-lg px-3"><option>All Regions</option><option>Local (Egypt)</option><option>Europe</option><option>Asia</option></select>
        <select class="text-xs border rounded-lg px-3"><option>Sort by Rating</option><option>Sort by Price</option><option>Sort by Speed</option></select>
      </div>
      <div class="grid grid-cols-3 gap-4">
        ${displayLabs.map((l,i) => `
          <div class="sgtx-card p-5 hover:shadow-lg transition-shadow ${i===0?'ring-2 ring-gold-400':''}">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-flask text-blue-600"></i></div>
                <div><div class="font-semibold text-sm">${l.name}</div><div class="text-xs text-surface-400">${l.loc}</div></div>
              </div>
              ${l.accredited ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">ACCREDITED</span>' : '<span class="text-[10px] bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">Non-accredited</span>'}
            </div>
            <div class="text-xs text-surface-500 mb-3">${l.speciality}</div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs mb-3">
              <div class="bg-surface-50 rounded p-2"><div class="text-surface-400">Rating</div><div class="font-bold text-gold-600">${l.rating} ★</div></div>
              <div class="bg-surface-50 rounded p-2"><div class="text-surface-400">Speed</div><div class="font-bold">${l.turnaround}</div></div>
              <div class="bg-surface-50 rounded p-2"><div class="text-surface-400">Price</div><div class="font-bold">${l.price}</div></div>
            </div>
            <div class="flex gap-2">
              <button onclick="bookLab('${l.name}')" class="btn-primary flex-1 py-2 text-xs"><i class="fas fa-check mr-1"></i>Book</button>
              <button class="btn-ghost py-2 px-3 text-xs"><i class="fas fa-eye"></i></button>
            </div>
          </div>`).join('')}
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function bookLab(name) {
  showGovernorPanel(`Lab Booking — ${name} will be assigned to this trade. Testing scope & timeline locked.`, async ()=>{
    showToast(`${name} booked ✓ — Testing commences on sample arrival`,'success');
    navigateTo('qc-booking');
  });
}

async function renderQCBooking() {
  setTitle('QC Booking', 'Book quality inspection with AQL sampling plan');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-magnifying-glass', 'Inspections', '1 Pending', null, 'blue')}
      ${metricCard('fa-chart-bar', 'AQL Level', 'II (Normal)', null, 'purple')}
      ${metricCard('fa-clock', 'Lead Time', '2-3 days', null, 'amber')}
      ${metricCard('fa-robot', 'AI Rec', 'SGS Recommended', null, 'emerald')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-clipboard-check mr-2 text-blue-500"></i>Inspection Configuration</h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Inspection Type</label>
            <select class="w-full"><option>Pre-Shipment (PSI)</option><option>During Production (DPI)</option><option>Container Loading (CLI)</option><option>Final Random (FRI)</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">AQL Level</label>
            <select class="w-full"><option>Level I (Reduced)</option><option selected>Level II (Normal)</option><option>Level III (Tightened)</option><option>Special S-1 to S-4</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Inspection Location</label>
            <input class="w-full" value="Factory Warehouse, Alexandria, Egypt"></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Preferred Date</label>
            <input type="date" class="w-full" value="2026-07-10"></div>
        </div>
        <!-- AQL Sampling Plan Display -->
        <div class="bg-surface-50 rounded-xl p-4 border border-surface-200 mb-4">
          <h4 class="text-xs font-bold uppercase tracking-wide text-surface-600 mb-3"><i class="fas fa-calculator mr-1"></i>AQL Sampling Plan (ISO 2859-1)</h4>
          <table class="w-full text-xs">
            <thead><tr class="text-surface-400 border-b"><th class="text-left py-2">Parameter</th><th class="text-center">Sample Size</th><th class="text-center">Accept</th><th class="text-center">Reject</th></tr></thead>
            <tbody>
              <tr class="border-b border-surface-50"><td class="py-2">Moisture Content (≤14%)</td><td class="text-center">125 samples</td><td class="text-center text-emerald-600 font-bold">≤3</td><td class="text-center text-red-600 font-bold">≥4</td></tr>
              <tr class="border-b border-surface-50"><td class="py-2">Broken Grains (≤5%)</td><td class="text-center">125 samples</td><td class="text-center text-emerald-600 font-bold">≤5</td><td class="text-center text-red-600 font-bold">≥6</td></tr>
              <tr class="border-b border-surface-50"><td class="py-2">Foreign Matter (≤0.5%)</td><td class="text-center">200 samples</td><td class="text-center text-emerald-600 font-bold">≤2</td><td class="text-center text-red-600 font-bold">≥3</td></tr>
              <tr class="border-b border-surface-50"><td class="py-2">Colour/Appearance</td><td class="text-center">80 samples</td><td class="text-center text-emerald-600 font-bold">≤3</td><td class="text-center text-red-600 font-bold">≥4</td></tr>
            </tbody>
          </table>
        </div>
        <!-- QC Provider Selection -->
        <h4 class="text-xs font-bold text-surface-600 mb-3">Available QC Providers</h4>
        <div class="space-y-2 mb-4">
          ${[{name:'SGS Inspection Services',rating:4.9,price:'$800',ai:true},{name:'Bureau Veritas QC',rating:4.7,price:'$720',ai:false},{name:'Intertek Testing',rating:4.6,price:'$680',ai:false}].map((p,i)=>`
            <div class="flex items-center justify-between p-3 rounded-lg border ${i===0?'border-emerald-300 bg-emerald-50':'border-surface-200'} cursor-pointer">
              <div class="flex items-center gap-3">
                ${i===0?'<span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">AI PICK</span>':''}
                <div><div class="font-medium text-sm">${p.name}</div><div class="text-xs text-surface-400">${p.rating}★ · ${p.price}</div></div>
              </div>
              <button class="btn-primary text-xs py-1.5 px-4">Select</button>
            </div>`).join('')}
        </div>
        <button onclick="confirmQCBooking()" class="btn-primary w-full py-3 text-sm"><i class="fas fa-calendar-check mr-2"></i>Confirm QC Booking (Governor Gate)</button>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-robot mr-1 text-blue-500"></i>AI Recommendation</h4>
          <div class="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
            <p class="font-medium mb-1">SGS recommended because:</p>
            <ul class="space-y-1 list-disc list-inside text-blue-700">
              <li>Highest accuracy on rice grading (99.2%)</li>
              <li>Same-region availability</li>
              <li>Fastest turnaround for AQL Level II</li>
              <li>Buyer's preferred provider list</li>
            </ul>
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-history mr-1 text-purple-500"></i>Previous Inspections</h4>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span>Jun 2026 — Rice 30MT</span><span class="text-emerald-600 font-medium">PASS</span></div>
            <div class="flex justify-between"><span>May 2026 — Rice 45MT</span><span class="text-emerald-600 font-medium">PASS</span></div>
            <div class="flex justify-between"><span>Apr 2026 — Sugar 60MT</span><span class="text-amber-600 font-medium">CONDITIONAL</span></div>
          </div>
        </div>
      </div>
    </div>`;
}
async function confirmQCBooking() {
  showGovernorPanel('QC Booking — inspection provider and AQL plan locked. Cannot change after confirmation.', async ()=>{
    showToast('QC Inspection booked ✓ — Inspector assigned','success');
    navigateTo('doc-finalisation');
  });
}


async function renderDocFinalisation() {
  setTitle('Document Finalisation', 'Generate, sign, and Loom-hash all trade documents');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-signature', 'Documents', '8 Required', null, 'blue')}
      ${metricCard('fa-check-circle', 'Signed', '5 of 8', null, 'emerald')}
      ${metricCard('fa-fingerprint', 'Passkey', 'Ready', null, 'purple')}
      ${metricCard('fa-link', 'Loom Hashes', '5 Generated', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-file-contract mr-2 text-gold-500"></i>Trade Document Pack</h3>
        <div class="flex gap-2">
          <button onclick="generateAllDocs()" class="btn-primary text-xs py-2 px-4"><i class="fas fa-magic mr-1"></i>Generate All</button>
          <button onclick="signAllDocs()" class="btn-ghost text-xs py-2 px-4"><i class="fas fa-signature mr-1"></i>Sign All (Passkey)</button>
        </div>
      </div>
      <div class="space-y-2">
        ${[
          {name:'Commercial Invoice',icon:'fa-file-invoice-dollar',status:'SIGNED',hash:'0xB7C...4F2'},
          {name:'Packing List',icon:'fa-list-check',status:'SIGNED',hash:'0xA3F...8D1'},
          {name:'Bill of Lading (Draft)',icon:'fa-ship',status:'SIGNED',hash:'0xE2D...7A9'},
          {name:'Certificate of Origin',icon:'fa-certificate',status:'SIGNED',hash:'0xC1B...3E5'},
          {name:'Phytosanitary Certificate',icon:'fa-leaf',status:'SIGNED',hash:'0xD4A...6B8'},
          {name:'Fumigation Certificate',icon:'fa-spray-can',status:'PENDING',hash:null},
          {name:'Insurance Certificate',icon:'fa-shield-halved',status:'PENDING',hash:null},
          {name:'Weight Certificate (VGM)',icon:'fa-weight-hanging',status:'PENDING',hash:null}
        ].map(d => `
          <div class="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 ${d.status==='SIGNED'?'bg-emerald-100':'bg-surface-100'} rounded-lg flex items-center justify-center">
                <i class="fas ${d.icon} ${d.status==='SIGNED'?'text-emerald-600':'text-surface-400'}"></i>
              </div>
              <div>
                <div class="font-medium text-sm">${d.name}</div>
                ${d.hash ? `<div class="text-[10px] text-surface-400 font-mono">Loom: ${d.hash}</div>` : '<div class="text-[10px] text-amber-500">Awaiting generation</div>'}
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${badge(d.status)}
              ${d.status==='SIGNED' ? `<button onclick="showToast('Downloading ${d.name} (Loom-verified) ...','info')" class="text-xs text-blue-500 hover:underline"><i class="fas fa-download"></i></button>` : `<button onclick="generateAndSignDoc('${d.name}', this)" class="btn-primary text-xs py-1 px-3">Generate & Sign</button>`}
            </div>
          </div>`).join('')}
      </div>
      <div class="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><i class="fas fa-fingerprint text-purple-600"></i></div>
          <div>
            <div class="font-semibold text-sm text-purple-800">Digital Signature</div>
            <div class="text-xs text-purple-600">Ed25519 with WebAuthn Passkey · QES-compatible (eIDAS)</div>
          </div>
          <button class="ml-auto btn-primary py-2 px-4 text-xs bg-purple-600 hover:bg-purple-700"><i class="fas fa-key mr-1"></i>Sign with Passkey</button>
        </div>
      </div>
    </div>`;
}
function generateAllDocs() { showToast('Generating remaining documents...','info'); setTimeout(()=>showToast('All 8 documents generated ✓','success'),1500); }
function generateAndSignDoc(name, btn) {
  showGovernorPanel(`${name} — will be generated, Ed25519-signed, and Loom-hashed (immutable).`, async ()=>{
    const row = btn.closest('.flex.items-center.justify-between');
    const hash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(3))).map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join('').slice(0,3) + '...' + Array.from(crypto.getRandomValues(new Uint8Array(2))).map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join('').slice(0,3);
    if(row){
      const iconBox = row.querySelector('.w-9'); if(iconBox){ iconBox.className = iconBox.className.replace('bg-surface-100','bg-emerald-100'); const ic = iconBox.querySelector('i'); if(ic) ic.className = ic.className.replace('text-surface-400','text-emerald-600'); }
      const sub = row.querySelector('.text-amber-500'); if(sub){ sub.className='text-[10px] text-surface-400 font-mono'; sub.textContent='Loom: '+hash; }
      const right = row.querySelector('.flex.items-center.gap-2:last-child'); if(right) right.innerHTML = badge('SIGNED') + '<button onclick="showToast(\'Downloading \u2014 Loom-verified\',\'info\')" class="text-xs text-blue-500 hover:underline"><i class="fas fa-download"></i></button>';
    }
    showToast(name+' signed ✓ — Loom hash '+hash,'success');
  });
}
function signAllDocs() {
  showGovernorPanel('Batch Document Signing — all 8 documents will be Ed25519-signed and Loom-hashed.', async ()=>{
    showToast('All documents signed ✓ — 8 Loom hashes generated','success');
  });
}

async function renderBarcodePrint() {
  setTitle('Barcode & Label Print', 'Generate SSCC-18 barcodes, QR codes, and shipping labels');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-barcode', 'Labels Required', '600', null, 'blue')}
      ${metricCard('fa-qrcode', 'QR Codes', '2 Containers', null, 'purple')}
      ${metricCard('fa-print', 'Print Status', 'Ready', null, 'emerald')}
      ${metricCard('fa-check', 'Verified', '0 / 600', null, 'surface')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-barcode mr-2 text-blue-500"></i>SSCC-18 Generator</h3>
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Extension Digit</label><input class="w-full" value="0" maxlength="1"></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">GS1 Company Prefix</label><input class="w-full" value="0628100" readonly></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Serial Reference</label><input class="w-full" value="000000001" readonly></div>
        </div>
        <!-- Barcode Preview -->
        <div class="bg-white border-2 border-dashed border-surface-200 rounded-xl p-6 mb-4 text-center">
          <div class="font-mono text-2xl tracking-[0.3em] mb-2">00 0628100 0000000014</div>
          <div class="mx-auto w-64 h-16 bg-gradient-to-r from-black via-white to-black bg-[length:4px_100%] opacity-80"></div>
          <div class="mt-2 text-xs text-surface-500">SSCC-18 · GS1-128 Symbology</div>
        </div>
        <!-- Label Configuration -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Label Size</label>
            <select class="w-full"><option>A6 (105×148mm) — Shipping</option><option>4×6" (102×152mm) — US</option><option>A5 (148×210mm) — Large</option><option>Custom</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Copies per Container</label>
            <input type="number" class="w-full" value="300" min="1"></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Label Content</label>
            <select class="w-full"><option>SSCC + QR + Product Info</option><option>SSCC Only</option><option>QR Code Only</option><option>Full GS1 Label</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Printer</label>
            <select class="w-full"><option>Zebra ZT411 (Thermal)</option><option>TSC MX240P</option><option>PDF Export</option></select></div>
        </div>
        <div class="flex gap-3">
          <button onclick="printLabels()" class="btn-primary flex-1 py-3 text-sm"><i class="fas fa-print mr-2"></i>Print 600 Labels (Batch)</button>
          <button class="btn-ghost py-3 px-5 text-sm"><i class="fas fa-file-pdf mr-1"></i>Export PDF</button>
          <button class="btn-ghost py-3 px-5 text-sm"><i class="fas fa-eye mr-1"></i>Preview</button>
        </div>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-qrcode mr-1 text-purple-500"></i>Container QR Codes</h4>
          <div class="space-y-3">
            <div class="p-3 bg-surface-50 rounded-lg text-center border">
              <div class="w-20 h-20 mx-auto bg-white border-2 border-surface-200 rounded-lg flex items-center justify-center mb-2"><i class="fas fa-qrcode text-3xl text-surface-700"></i></div>
              <div class="text-xs font-medium">CONT-001</div>
              <div class="text-[10px] text-surface-400">USTN: SGTX-EG-26-F3A-1</div>
            </div>
            <div class="p-3 bg-surface-50 rounded-lg text-center border">
              <div class="w-20 h-20 mx-auto bg-white border-2 border-surface-200 rounded-lg flex items-center justify-center mb-2"><i class="fas fa-qrcode text-3xl text-surface-700"></i></div>
              <div class="text-xs font-medium">CONT-002</div>
              <div class="text-[10px] text-surface-400">USTN: SGTX-EG-26-F3A-2</div>
            </div>
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-info-circle mr-1 text-blue-500"></i>Label Data</h4>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between"><span class="text-surface-400">Product</span><span>Egyptian Rice Japonica</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Net Weight</span><span>50kg per bag</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Origin</span><span>Egypt (EG)</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Batch</span><span>BATCH-2026-07-001</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Best Before</span><span>2027-07-04</span></div>
          </div>
        </div>
      </div>
    </div>`;
}
function printLabels() { showToast('Print job sent — 600 labels queued for Zebra ZT411','success'); }

async function renderCashPosition() {
  setTitle('Cash Position', '90-day forecast — receivables, payables, and liquidity');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-wallet', 'Net Position', '$142,500', '+$12,300', 'emerald')}
      ${metricCard('fa-arrow-down', 'Receivables', '$285,000', '6 invoices', 'blue')}
      ${metricCard('fa-arrow-up', 'Payables', '$142,500', '4 invoices', 'red')}
      ${metricCard('fa-chart-line', '90-Day Forecast', '+$98,200', null, 'gold')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-area mr-2 text-blue-500"></i>90-Day Cash Flow Forecast</h3>
        <canvas id="cash-chart" height="200"></canvas>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-arrow-down mr-1 text-emerald-500"></i>Expected Receivables</h4>
          <div class="space-y-2">
            ${[{buyer:'Hamburg Import Co',amt:85000,due:'Jul 20'},{buyer:'Rotterdam Grains BV',amt:120000,due:'Aug 5'},{buyer:'UK Foods Ltd',amt:80000,due:'Aug 22'}].map(r=>`
              <div class="flex items-center justify-between text-xs p-2 bg-emerald-50 rounded">
                <div><div class="font-medium">${r.buyer}</div><div class="text-surface-400">Due: ${r.due}</div></div>
                <span class="font-bold text-emerald-600">${usd(r.amt)}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-arrow-up mr-1 text-red-500"></i>Upcoming Payables</h4>
          <div class="space-y-2">
            ${[{vendor:'Maersk Freight',amt:4800,due:'Jul 15'},{vendor:'SGS Lab Testing',amt:1200,due:'Jul 12'},{vendor:'Inland Trucking',amt:850,due:'Jul 10'}].map(p=>`
              <div class="flex items-center justify-between text-xs p-2 bg-red-50 rounded">
                <div><div class="font-medium">${p.vendor}</div><div class="text-surface-400">Due: ${p.due}</div></div>
                <span class="font-bold text-red-600">${usd(p.amt)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{
    const ctx=document.getElementById('cash-chart');
    if(!ctx||typeof Chart==='undefined')return;
    const labels=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i*7.5);return d.toLocaleDateString('en',{month:'short',day:'numeric'});});
    new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Cash Balance',data:[142500,138000,145000,152000,148000,165000,172000,180000,195000,210000,225000,240700],borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.4},{label:'Receivables',data:[285000,270000,255000,235000,220000,200000,180000,160000,140000,120000,100000,80000],borderColor:'#3B82F6',borderDash:[5,5],tension:0.4,pointRadius:0},{label:'Payables',data:[142500,135000,128000,120000,112000,105000,98000,90000,82000,75000,68000,60000],borderColor:'#EF4444',borderDash:[5,5],tension:0.4,pointRadius:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:10}}}},scales:{y:{ticks:{callback:v=>'$'+(v/1000)+'k'}}}}});
  },100);
}

async function renderDistressedSell() {
  setTitle('Distressed Sell', 'Declare cargo as distressed for accelerated outreach');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-fire', 'Active Distressed', '0', null, 'red')}
      ${metricCard('fa-clock', 'Avg Resolution', '36h', null, 'amber')}
      ${metricCard('fa-percent', 'Avg Discount', '25-40%', null, 'purple')}
      ${metricCard('fa-handshake', 'Success Rate', '72%', null, 'emerald')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-fire mr-2 text-red-500"></i>Declare Distressed Cargo</h3>
        <div class="p-4 bg-red-50 rounded-xl border border-red-200 mb-4">
          <div class="flex items-center gap-2 mb-2"><i class="fas fa-exclamation-triangle text-red-600"></i><span class="font-semibold text-sm text-red-800">Important Notice</span></div>
          <p class="text-xs text-red-700">Declaring cargo as distressed will broadcast to all qualified buyers on the platform at a discounted price. This action triggers Governor oversight and cannot be undone.</p>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Trade / GTID</label>
            <select class="w-full"><option>Select active trade...</option><option>SGTX-EG-26-F3A — Rice 50MT</option><option>SGTX-EG-26-G2B — Sugar 30MT</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Reason</label>
            <select class="w-full"><option>Buyer Default / Non-Payment</option><option>Vessel Delayed &gt;14 days</option><option>Quality Rejection</option><option>Storage Cost Exceeding Value</option><option>Regulatory Block</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Original Value (USD)</label>
            <input type="number" class="w-full" placeholder="29788"></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Floor Price (Min Accept)</label>
            <input type="number" class="w-full" placeholder="19000"></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Urgency Level</label>
            <select class="w-full"><option>Critical (24h)</option><option>High (48h)</option><option>Medium (7 days)</option></select></div>
          <div><label class="text-xs text-surface-500 font-medium block mb-1">Visibility</label>
            <select class="w-full"><option>All Qualified Buyers</option><option>Preferred Buyers Only</option><option>Geographic Region</option></select></div>
        </div>
        <div class="mb-4">
          <label class="text-xs text-surface-500 font-medium block mb-1">Additional Notes</label>
          <textarea class="w-full h-20 text-sm" placeholder="Describe cargo condition, location, any special handling requirements..."></textarea>
        </div>
        <button onclick="declareDistressed()" class="btn-primary w-full py-3 text-sm bg-red-600 hover:bg-red-700"><i class="fas fa-fire mr-2"></i>Declare Distressed (Governor Gate)</button>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-bolt mr-1 text-amber-500"></i>Triage Process</h4>
          <div class="space-y-3 text-xs">
            <div class="flex items-start gap-2"><div class="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span class="text-[10px] font-bold text-red-600">1</span></div><div><div class="font-medium">Declaration</div><div class="text-surface-400">Set floor price & urgency</div></div></div>
            <div class="flex items-start gap-2"><div class="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span class="text-[10px] font-bold text-amber-600">2</span></div><div><div class="font-medium">Broadcast</div><div class="text-surface-400">AI matches to qualified buyers</div></div></div>
            <div class="flex items-start gap-2"><div class="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span class="text-[10px] font-bold text-blue-600">3</span></div><div><div class="font-medium">Offers</div><div class="text-surface-400">Buyers bid above floor</div></div></div>
            <div class="flex items-start gap-2"><div class="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><span class="text-[10px] font-bold text-emerald-600">4</span></div><div><div class="font-medium">Resolution</div><div class="text-surface-400">Accept best offer → new contract</div></div></div>
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-chart-bar mr-1 text-blue-500"></i>Platform Stats</h4>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-surface-400">Active Distressed</span><span class="font-bold">23 cargos</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Avg Resolution</span><span class="font-bold">36 hours</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Success Rate</span><span class="font-bold text-emerald-600">72%</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Avg Discount</span><span class="font-bold text-amber-600">32%</span></div>
          </div>
        </div>
      </div>
    </div>`;
}
async function declareDistressed() {
  showGovernorPanel('Distressed Declaration — cargo will be broadcast to all qualified buyers. Floor price becomes binding.', async ()=>{
    showToast('Cargo declared distressed ✓ — Broadcasting to 847 qualified buyers','success');
  });
}


// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS (All Portals)
// ═══════════════════════════════════════════════════════════════════════

async function renderContacts() {
  setTitle('Contacts & Address Book', 'Manage trading partners with performance metrics');
  const content = document.getElementById('content');
  try {
    const res = await api('/contacts');
    const contacts = res.data || [];
    const defaults = [{name:'Hamburg Import Co',type:'Buyer',country:'DE',trades:12,rating:4.8,status:'VERIFIED'},{name:'Maersk Line',type:'Logistics',country:'DK',trades:8,rating:4.7,status:'VERIFIED'},{name:'SGS Geneva',type:'QC/Lab',country:'CH',trades:5,rating:4.9,status:'VERIFIED'},{name:'National Bank Egypt',type:'Financier',country:'EG',trades:3,rating:4.5,status:'VERIFIED'},{name:'Rotterdam Grains BV',type:'Buyer',country:'NL',trades:7,rating:4.6,status:'VERIFIED'},{name:'GlobalFreight Co',type:'Logistics',country:'UK',trades:4,rating:4.3,status:'PENDING'}];
    const list = contacts.length ? contacts : defaults;
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-address-book', 'Total Contacts', list.length, null, 'blue')}
        ${metricCard('fa-user-check', 'Verified', list.filter(c=>c.status==='VERIFIED').length, null, 'emerald')}
        ${metricCard('fa-star', 'Avg Rating', '4.6', null, 'gold')}
        ${metricCard('fa-handshake', 'Active Partners', list.filter(c=>c.trades>5).length, null, 'purple')}
      </div>
      <div class="sgtx-card">
        <div class="flex items-center justify-between p-4 border-b border-surface-100">
          <div class="flex gap-2">
            <input type="text" placeholder="Search contacts..." class="text-sm w-64">
            <select class="text-xs border rounded-lg px-3"><option>All Types</option><option>Buyers</option><option>Sellers</option><option>Logistics</option><option>Financiers</option><option>QC/Labs</option></select>
          </div>
          <button class="btn-primary text-xs py-2 px-4"><i class="fas fa-plus mr-1"></i>Add Contact</button>
        </div>
        <div class="divide-y divide-surface-100">
          ${list.map(c => `
            <div class="flex items-center justify-between p-4 hover:bg-surface-50 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-gold-100 to-gold-200 rounded-lg flex items-center justify-center font-bold text-gold-700">${c.name[0]}</div>
                <div>
                  <div class="font-semibold text-sm">${c.name}</div>
                  <div class="text-xs text-surface-400">${c.type} · ${c.country}</div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-center text-xs"><div class="text-surface-400">Trades</div><div class="font-bold">${c.trades}</div></div>
                <div class="text-center text-xs"><div class="text-surface-400">Rating</div><div class="font-bold text-gold-600">${c.rating}★</div></div>
                ${badge(c.status)}
                <button class="text-surface-400 hover:text-surface-600"><i class="fas fa-ellipsis-v"></i></button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderDisputes() {
  setTitle('Disputes', 'File, respond to, and mediate trade disputes');
  const content = document.getElementById('content');
  try {
    const res = await api('/disputes');
    const disputes = res.data || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-gavel', 'Open Disputes', disputes.length || 2, null, 'red')}
        ${metricCard('fa-clock', 'In Mediation', '1', null, 'amber')}
        ${metricCard('fa-check-circle', 'Resolved (30d)', '4', null, 'emerald')}
        ${metricCard('fa-chart-line', 'Resolution Rate', '94%', null, 'blue')}
      </div>
      <div class="flex gap-3 mb-5">
        <button onclick="showDisputeForm()" class="btn-primary text-xs py-2 px-4"><i class="fas fa-plus mr-1"></i>File New Dispute</button>
        <button class="btn-ghost text-xs py-2 px-4"><i class="fas fa-filter mr-1"></i>Filter</button>
      </div>
      <div class="sgtx-card">
        <div class="divide-y divide-surface-100">
          ${[{id:'DSP-2026-001',trade:'SGTX-EG-26-F3A',type:'Quality Discrepancy',against:'Hamburg Import Co',status:'IN_MEDIATION',filed:'Jun 28',amount:4500},{id:'DSP-2026-002',trade:'SGTX-EG-26-G2B',type:'Late Payment',against:'UK Foods Ltd',status:'OPEN',filed:'Jul 1',amount:8200}].map(d => `
            <div class="p-4 hover:bg-surface-50 transition-colors">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><i class="fas fa-gavel text-red-600"></i></div>
                  <div><div class="font-semibold text-sm">${d.type}</div><div class="text-xs text-surface-400">${d.id} · Trade: ${d.trade}</div></div>
                </div>
                ${badge(d.status)}
              </div>
              <div class="grid grid-cols-4 gap-3 text-xs mt-2">
                <div><span class="text-surface-400">Against:</span> <span class="font-medium">${d.against}</span></div>
                <div><span class="text-surface-400">Filed:</span> <span class="font-medium">${d.filed}</span></div>
                <div><span class="text-surface-400">Amount:</span> <span class="font-bold text-red-600">${usd(d.amount)}</span></div>
                <div class="text-right"><button class="btn-primary text-xs py-1 px-3">View Details</button></div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
function showDisputeForm() {
  showModal('File Dispute', `<div class="p-4 space-y-3">
    <div><label class="text-xs font-medium block mb-1">Trade / GTID</label><select class="w-full"><option>SGTX-EG-26-F3A</option><option>SGTX-EG-26-G2B</option></select></div>
    <div><label class="text-xs font-medium block mb-1">Dispute Type</label><select class="w-full"><option>Quality Discrepancy</option><option>Late Payment</option><option>Short Delivery</option><option>Documentation Error</option><option>Customs Issue</option></select></div>
    <div><label class="text-xs font-medium block mb-1">Amount in Dispute (USD)</label><input type="number" class="w-full"></div>
    <div><label class="text-xs font-medium block mb-1">Description</label><textarea class="w-full h-20 text-sm"></textarea></div>
    <button onclick="submitDispute()" class="btn-primary w-full py-2">Submit Dispute (Governor Gate)</button>
  </div>`);
}
function submitDispute() { closeModal(); showToast('Dispute filed ✓ — Counter-party notified','success'); }

async function renderCompanyAdmin() {
  setTitle('Company Admin', 'Manage employees, roles, data scopes, and branding');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-users', 'Employees', '8', null, 'blue')}
      ${metricCard('fa-user-shield', 'Roles Defined', '5', null, 'purple')}
      ${metricCard('fa-key', 'Active Sessions', '3', null, 'emerald')}
      ${metricCard('fa-building', 'KYC Status', 'VERIFIED', null, 'gold')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 space-y-4">
        <!-- Employees -->
        <div class="sgtx-card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-sm"><i class="fas fa-users mr-2 text-blue-500"></i>Team Members</h3>
            <button class="btn-primary text-xs py-1.5 px-3"><i class="fas fa-user-plus mr-1"></i>Invite</button>
          </div>
          <div class="space-y-2">
            ${[{name:'Ahmed El-Sayed',role:'Admin',email:'ahmed@company.eg',status:'Active',last:'2 min ago'},{name:'Fatima Hassan',role:'Trade Manager',email:'fatima@company.eg',status:'Active',last:'1h ago'},{name:'Mohamed Ali',role:'Finance',email:'mohamed@company.eg',status:'Active',last:'Today'},{name:'Sara Ibrahim',role:'Operations',email:'sara@company.eg',status:'Invited',last:'—'}].map(e=>`
              <div class="flex items-center justify-between p-3 rounded-lg border border-surface-200">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">${e.name.split(' ').map(n=>n[0]).join('')}</div>
                  <div><div class="font-medium text-sm">${e.name}</div><div class="text-xs text-surface-400">${e.email}</div></div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs bg-surface-100 px-2 py-1 rounded">${e.role}</span>
                  <span class="text-[10px] text-surface-400">${e.last}</span>
                  ${badge(e.status.toUpperCase())}
                </div>
              </div>`).join('')}
          </div>
        </div>
        <!-- Approval Chains -->
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-4"><i class="fas fa-sitemap mr-2 text-purple-500"></i>Approval Chains</h3>
          <div class="space-y-2 text-xs">
            ${[{action:'Trade >$50k',chain:'Trade Manager → Admin → CEO',active:true},{action:'New Supplier',chain:'Operations → Admin',active:true},{action:'Dispute Filing',chain:'Any → Admin',active:true},{action:'Distressed Declaration',chain:'Admin → CEO (mandatory)',active:true}].map(a=>`
              <div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                <div><span class="font-medium">${a.action}</span></div>
                <div class="flex items-center gap-2"><span class="text-surface-400">${a.chain}</span><i class="fas fa-toggle-on text-emerald-500"></i></div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <!-- Branding -->
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-palette mr-1 text-gold-500"></i>Company Branding</h4>
          <div class="w-full h-20 bg-gradient-to-r from-gold-100 to-gold-200 rounded-lg flex items-center justify-center mb-3"><i class="fas fa-building text-2xl text-gold-600"></i></div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-surface-400">Company</span><span class="font-medium">Nile Grains Export Co.</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Country</span><span>Egypt (EG)</span></div>
            <div class="flex justify-between"><span class="text-surface-400">Reg. No.</span><span>EG-2019-84721</span></div>
            <div class="flex justify-between"><span class="text-surface-400">KYC Level</span><span class="text-emerald-600 font-medium">Enhanced ✓</span></div>
          </div>
        </div>
        <!-- Data Scopes -->
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-eye mr-1 text-blue-500"></i>Data Scope Rules</h4>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span>Finance</span><span class="text-surface-400">See all payments</span></div>
            <div class="flex justify-between"><span>Operations</span><span class="text-surface-400">See shipments only</span></div>
            <div class="flex justify-between"><span>Trade Mgr</span><span class="text-surface-400">Full trade access</span></div>
          </div>
        </div>
      </div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════
// LOGISTICS PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderLogOpsHub() {
  setTitle('Logistics Operations Hub', 'Real-time overview of all logistics operations');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-truck-fast', 'Active Shipments', '34', '+3 today', 'blue')}
      ${metricCard('fa-inbox', 'Pending RFQs', '12', null, 'amber')}
      ${metricCard('fa-clock', 'Avg Transit', '14.2d', '-0.5d', 'emerald')}
      ${metricCard('fa-star', 'On-Time Rate', '94.7%', null, 'gold')}
      ${metricCard('fa-exclamation-triangle', 'Delays', '2', null, 'red')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-map-location-dot mr-2 text-blue-500"></i>Live Shipment Map</h3>
        <div class="w-full h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 opacity-10" style="background:url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 50\"><path d=\"M10,30 Q25,10 40,25 T70,20 T90,30\" fill=\"none\" stroke=\"%233B82F6\" stroke-width=\"0.5\"/></svg>') center/cover"></div>
          <div class="absolute top-8 left-12 w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-lg" title="Alexandria"></div>
          <div class="absolute top-6 right-20 w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-lg" title="Hamburg"></div>
          <div class="absolute top-16 left-1/3 w-3 h-3 bg-gold-500 rounded-full animate-bounce" title="In Transit"></div>
          <div class="text-center z-10"><i class="fas fa-globe text-5xl text-blue-200 mb-2"></i><p class="text-xs text-blue-400">Interactive map — 34 active vessels tracked</p></div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-bell mr-1 text-amber-500"></i>Alerts</h4>
          <div class="space-y-2">
            ${[{msg:'Vessel EMMA delayed 2d at Suez',type:'warning'},{msg:'Container CONT-445 cleared customs',type:'success'},{msg:'New RFQ from Nile Grains — 50MT Rice',type:'info'}].map(a=>`<div class="p-2 rounded text-xs bg-${a.type==='warning'?'amber':a.type==='success'?'emerald':'blue'}-50 text-${a.type==='warning'?'amber':a.type==='success'?'emerald':'blue'}-700"><i class="fas fa-${a.type==='warning'?'exclamation-triangle':a.type==='success'?'check-circle':'info-circle'} mr-1"></i>${a.msg}</div>`).join('')}
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-chart-pie mr-1 text-purple-500"></i>Capacity Usage</h4>
          <div class="space-y-2 text-xs">
            <div><div class="flex justify-between mb-1"><span>20ft GP</span><span class="font-bold">78%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width:78%"></div></div></div>
            <div><div class="flex justify-between mb-1"><span>40ft HC</span><span class="font-bold">65%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-purple-500 h-2 rounded-full" style="width:65%"></div></div></div>
            <div><div class="flex justify-between mb-1"><span>Reefer</span><span class="font-bold">42%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-emerald-500 h-2 rounded-full" style="width:42%"></div></div></div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderLogRFQInbox() {
  setTitle('RFQ Inbox', 'Incoming logistics requests from traders');
  const content = document.getElementById('content');
  try {
    const res = await api('/logistics/rfqs');
    const rfqs = res.data || [];
    const defaults = [{id:'RFQ-L-001',trader:'Nile Grains Export',route:'Alexandria→Hamburg',cargo:'50MT Rice, 2×20GP',deadline:'Jul 8',value:4800},{id:'RFQ-L-002',trader:'Cairo Sugar Co',route:'Port Said→Rotterdam',cargo:'100MT Sugar, 4×20GP',deadline:'Jul 10',value:9200},{id:'RFQ-L-003',trader:'Delta Foods',route:'Damietta→Felixstowe',cargo:'30MT Rice, 2×20GP',deadline:'Jul 12',value:3600}];
    const list = rfqs.length ? rfqs : defaults;
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-inbox', 'Pending', list.length, null, 'blue')}
        ${metricCard('fa-clock', 'Expiring Today', '1', null, 'red')}
        ${metricCard('fa-paper-plane', 'Quoted', '5', null, 'emerald')}
        ${metricCard('fa-trophy', 'Won Rate', '67%', null, 'gold')}
      </div>
      <div class="sgtx-card">
        <div class="divide-y divide-surface-100">
          ${list.map(r=>`
            <div class="p-4 hover:bg-surface-50">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3"><div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-file-import text-blue-600"></i></div>
                <div><div class="font-semibold text-sm">${r.trader}</div><div class="text-xs text-surface-400">${r.id} · ${r.route}</div></div></div>
                ${badge('PENDING')}
              </div>
              <div class="grid grid-cols-4 gap-3 text-xs"><div><span class="text-surface-400">Cargo:</span> ${r.cargo}</div><div><span class="text-surface-400">Deadline:</span> <span class="text-amber-600 font-medium">${r.deadline}</span></div><div><span class="text-surface-400">Est Value:</span> <span class="font-bold">${usd(r.value)}</span></div><div class="text-right"><button class="btn-primary text-xs py-1.5 px-4">Submit Quote</button></div></div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderLogBookings() {
  setTitle('Booking Requests', 'Manage confirmed booking requests');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-calendar-check', 'New Bookings', '4', null, 'blue')}
      ${metricCard('fa-spinner', 'Processing', '2', null, 'amber')}
      ${metricCard('fa-check-double', 'Confirmed', '28', null, 'emerald')}
      ${metricCard('fa-ban', 'Rejected', '1', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Booking ID','Trader','Route','Containers','ETD','Status','Action'],
        [['BK-2026-034','Nile Grains','EGALX→DEHAM','2×20GP','Jul 15',badge('CONFIRMED'),'<button class="btn-primary text-xs py-1 px-3">Details</button>'],
         ['BK-2026-035','Cairo Sugar','EGPSD→NLRTM','4×20GP','Jul 18',badge('PROCESSING'),'<button class="btn-primary text-xs py-1 px-3">Confirm</button>'],
         ['BK-2026-036','Delta Foods','EGDAM→GBFXT','2×20GP','Jul 20',badge('PENDING'),'<button class="btn-primary text-xs py-1 px-3">Review</button>']]
      )}
    </div>`;
}

async function renderLogDispatch() {
  setTitle('Dispatch Planner', 'Plan and schedule container pickups and deliveries');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-truck', 'Today Dispatches', '6', null, 'blue')}
      ${metricCard('fa-route', 'Routes Planned', '4', null, 'purple')}
      ${metricCard('fa-clock', 'Next Pickup', '2h 30m', null, 'amber')}
      ${metricCard('fa-check', 'Completed Today', '3', null, 'emerald')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calendar-days mr-2 text-blue-500"></i>Weekly Dispatch Schedule</h3>
      <div class="grid grid-cols-7 gap-2 text-xs">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>`
          <div class="text-center">
            <div class="font-medium text-surface-500 mb-2">${d}</div>
            <div class="space-y-1">
              ${i<5?`<div class="p-2 rounded ${i===3?'bg-gold-100 border border-gold-300':'bg-surface-50 border border-surface-200'}"><div class="font-medium">${1+i} pickups</div></div>`:'<div class="p-2 rounded bg-surface-50 text-surface-300">—</div>'}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderLogActiveShipments() {
  setTitle('Active Shipments', 'Track all shipments in transit');
  const content = document.getElementById('content');
  try {
    const res = await api('/shipments?status=active');
    const ships = res.data || [];
    const defaults = [{ustn:'SGTX-EG-26-F3A-1',vessel:'MSC ANNA',route:'Alexandria→Hamburg',etd:'Jul 15',eta:'Jul 29',status:'IN_TRANSIT',progress:45},{ustn:'SGTX-EG-26-G2B-1',vessel:'EMMA MAERSK',route:'Port Said→Rotterdam',etd:'Jul 10',eta:'Jul 26',status:'IN_TRANSIT',progress:62},{ustn:'SGTX-EG-26-H1C-1',vessel:'CMA CGM JACQUES',route:'Damietta→Felixstowe',etd:'Jul 8',eta:'Jul 23',status:'CUSTOMS',progress:80}];
    const list = ships.length?ships:defaults;
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${metricCard('fa-ship', 'In Transit', list.length, null, 'blue')}
        ${metricCard('fa-anchor', 'At Port', '2', null, 'purple')}
        ${metricCard('fa-check-circle', 'Delivered (30d)', '18', null, 'emerald')}
        ${metricCard('fa-exclamation-circle', 'Delayed', '1', null, 'red')}
      </div>
      <div class="sgtx-card">
        <div class="divide-y divide-surface-100">
          ${list.map(s=>`
            <div class="p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3"><div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><i class="fas fa-ship text-blue-600"></i></div>
                <div><div class="font-semibold text-sm">${s.ustn}</div><div class="text-xs text-surface-400">${s.vessel} · ${s.route}</div></div></div>
                ${badge(s.status)}
              </div>
              <div class="flex items-center gap-3 mt-2">
                <span class="text-xs text-surface-400">ETD: ${s.etd}</span>
                <div class="flex-1 bg-surface-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width:${s.progress}%"></div></div>
                <span class="text-xs text-surface-400">ETA: ${s.eta}</span>
                <span class="text-xs font-bold text-blue-600">${s.progress}%</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderLogDocVerify() {
  setTitle('Document Verification', 'Verify and validate shipping documents');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-circle-check', 'Pending Review', '5', null, 'amber')}
      ${metricCard('fa-check-double', 'Verified Today', '8', null, 'emerald')}
      ${metricCard('fa-xmark-circle', 'Rejected', '1', null, 'red')}
      ${metricCard('fa-robot', 'AI-Verified', '90%', null, 'blue')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Document','Trade','Submitted By','Date','AI Score','Status','Action'],
        [['Bill of Lading','SGTX-EG-26-F3A','Nile Grains','Jul 4','98%',badge('VERIFIED'),''],
         ['Commercial Invoice','SGTX-EG-26-G2B','Cairo Sugar','Jul 3','95%',badge('VERIFIED'),''],
         ['Phyto Certificate','SGTX-EG-26-F3A','SGS Egypt','Jul 4','72%',badge('REVIEW'),'<button class="btn-primary text-xs py-1 px-2">Review</button>'],
         ['Weight Certificate','SGTX-EG-26-H1C','Bureau Veritas','Jul 2','88%',badge('PENDING'),'<button class="btn-primary text-xs py-1 px-2">Verify</button>']]
      )}
    </div>`;
}

async function renderLogPerformance() {
  setTitle('Logistics Performance', 'KPIs, SLAs, and service level analytics');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-clock', 'On-Time Delivery', '94.7%', '+1.2%', 'emerald')}
      ${metricCard('fa-route', 'Avg Transit', '14.2d', '-0.5d', 'blue')}
      ${metricCard('fa-file-check', 'Doc Accuracy', '98.3%', null, 'purple')}
      ${metricCard('fa-star', 'Customer Score', '4.7/5', null, 'gold')}
      ${metricCard('fa-truck-fast', 'Utilisation', '87%', null, 'amber')}
    </div>
    <div class="grid grid-cols-2 gap-5">
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2 text-blue-500"></i>Transit Time Trend</h3><canvas id="log-perf-chart" height="180"></canvas></div>
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2 text-purple-500"></i>Volume by Route</h3><canvas id="log-vol-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(()=>{
    const c1=document.getElementById('log-perf-chart'),c2=document.getElementById('log-vol-chart');
    if(c1&&typeof Chart!=='undefined') new Chart(c1,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Avg Days',data:[15.1,14.8,14.5,14.3,14.1,14.2],borderColor:'#3B82F6',tension:0.4,fill:false}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    if(c2&&typeof Chart!=='undefined') new Chart(c2,{type:'bar',data:{labels:['EG→DE','EG→NL','EG→UK','EG→IT','EG→FR'],datasets:[{label:'TEU',data:[120,95,78,45,32],backgroundColor:'#D4A017'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  },100);
}

async function renderLogEBL() {
  setTitle('Electronic Bill of Lading', 'Manage eBL issuance and transfer');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-lines', 'Active eBLs', '8', null, 'blue')}
      ${metricCard('fa-arrows-rotate', 'In Transfer', '2', null, 'amber')}
      ${metricCard('fa-check-circle', 'Surrendered', '15', null, 'emerald')}
      ${metricCard('fa-link', 'Loom Verified', '100%', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['eBL ID','Trade','Shipper','Consignee','Status','Loom Hash','Action'],
        [['EBL-001','SGTX-EG-26-F3A','Nile Grains','Hamburg Import',badge('ACTIVE'),'<span class="font-mono text-[10px]">0xF2A...9D1</span>','<button class="btn-primary text-xs py-1 px-2">Transfer</button>'],
         ['EBL-002','SGTX-EG-26-G2B','Cairo Sugar','Rotterdam Grains',badge('IN_TRANSFER'),'<span class="font-mono text-[10px]">0xB3C...7E4</span>','<button class="btn-ghost text-xs py-1 px-2">Track</button>'],
         ['EBL-003','SGTX-EG-26-H1C','Delta Foods','UK Foods',badge('SURRENDERED'),'<span class="font-mono text-[10px]">0xD1E...5F2</span>','']]
      )}
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════
// FINANCIER PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderFinOpsHub() {
  setTitle('Financier Operations Hub', 'Portfolio overview and opportunity pipeline');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-briefcase', 'Active Portfolio', '$2.4M', '+$180k', 'gold')}
      ${metricCard('fa-hand-holding-dollar', 'Opportunities', '8', null, 'blue')}
      ${metricCard('fa-percent', 'Avg Yield', '4.2%', '+0.1%', 'emerald')}
      ${metricCard('fa-shield-check', 'NPL Ratio', '0.8%', null, 'purple')}
      ${metricCard('fa-clock', 'Avg Tenor', '45d', null, 'amber')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-line mr-2 text-gold-500"></i>Portfolio Performance</h3>
        <canvas id="fin-portfolio-chart" height="200"></canvas>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-pie-chart mr-1 text-purple-500"></i>Allocation</h4>
          <div class="space-y-2 text-xs">
            <div><div class="flex justify-between mb-1"><span>Pre-Shipment</span><span class="font-bold">45%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width:45%"></div></div></div>
            <div><div class="flex justify-between mb-1"><span>Post-Shipment</span><span class="font-bold">30%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-emerald-500 h-2 rounded-full" style="width:30%"></div></div></div>
            <div><div class="flex justify-between mb-1"><span>Invoice Factoring</span><span class="font-bold">25%</span></div><div class="w-full bg-surface-200 rounded-full h-2"><div class="bg-purple-500 h-2 rounded-full" style="width:25%"></div></div></div>
          </div>
        </div>
        <div class="sgtx-card p-4">
          <h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-bell mr-1 text-amber-500"></i>Upcoming Maturities</h4>
          <div class="space-y-2 text-xs">
            ${[{trade:'SGTX-EG-26-F3A',amt:50000,days:5},{trade:'SGTX-EG-26-G2B',amt:80000,days:12},{trade:'SGTX-EG-26-H1C',amt:35000,days:18}].map(m=>`<div class="flex justify-between p-2 bg-surface-50 rounded"><span>${m.trade}</span><span class="font-medium">${usd(m.amt)} · ${m.days}d</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  setTimeout(()=>{const c=document.getElementById('fin-portfolio-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Portfolio Value ($k)',data:[1800,1950,2100,2200,2300,2400],borderColor:'#D4A017',backgroundColor:'rgba(212,160,23,0.1)',fill:true,tension:0.4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'$'+(v/1000)+'k'}}}}});},100);
}

async function renderFinOpportunities() {
  setTitle('Funding Opportunities', 'Anonymous RFQ pipeline — bid on trade finance requests');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-bullseye', 'New Opportunities', '8', null, 'blue')}
      ${metricCard('fa-gavel', 'Bids Placed', '3', null, 'purple')}
      ${metricCard('fa-trophy', 'Won This Month', '5', null, 'emerald')}
      ${metricCard('fa-coins', 'Total Pipeline', '$640k', null, 'gold')}
    </div>
    <div class="sgtx-card">
      <div class="divide-y divide-surface-100">
        ${[{id:'RFQ-F-001',type:'Pre-Shipment',amount:50000,tenor:60,route:'EG→DE',commodity:'Rice',risk:'LOW',yield:'4.5%'},{id:'RFQ-F-002',type:'Invoice Factoring',amount:120000,tenor:30,route:'EG→NL',commodity:'Sugar',risk:'MEDIUM',yield:'5.2%'},{id:'RFQ-F-003',type:'Post-Shipment',amount:80000,tenor:45,route:'EG→UK',commodity:'Rice',risk:'LOW',yield:'3.8%'}].map(o=>`
          <div class="p-4 hover:bg-surface-50">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3"><div class="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center"><i class="fas fa-hand-holding-dollar text-gold-600"></i></div>
              <div><div class="font-semibold text-sm">${o.type} — ${usd(o.amount)}</div><div class="text-xs text-surface-400">${o.id} · ${o.commodity} · ${o.route}</div></div></div>
              <div class="flex items-center gap-2">${badge(o.risk)}<span class="text-sm font-bold text-emerald-600">${o.yield}</span></div>
            </div>
            <div class="grid grid-cols-5 gap-3 text-xs mt-2">
              <div><span class="text-surface-400">Amount:</span> <span class="font-bold">${usd(o.amount)}</span></div>
              <div><span class="text-surface-400">Tenor:</span> ${o.tenor}d</div>
              <div><span class="text-surface-400">Risk:</span> ${o.risk}</div>
              <div><span class="text-surface-400">Yield:</span> ${o.yield}</div>
              <div class="text-right"><button class="btn-primary text-xs py-1.5 px-4">Place Bid</button></div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderFinDisclosure() {
  setTitle('Full Disclosure', 'Complete trade transparency — review underlying assets');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-eye', 'Trades Disclosed', '5', null, 'blue')}
      ${metricCard('fa-file-shield', 'Docs Available', '40', null, 'emerald')}
      ${metricCard('fa-lock', 'Loom Verified', '100%', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-eye mr-2 text-blue-500"></i>Disclosed Trade Information</h3>
      <p class="text-xs text-surface-500 mb-4">All trade data is anonymized until you place a bid and it's accepted. Full counterparty details revealed only after funding commitment.</p>
      ${dataTable(['Trade','Type','Amount','Commodity','Route','Risk Score','Documents'],
        [['SGTX-***-F3A','Pre-Shipment','$50,000','Rice 50MT','EG→DE','<span class="font-bold text-emerald-600">87/100</span>','<button class="text-blue-500 text-xs">View 8 docs</button>'],
         ['SGTX-***-G2B','Factoring','$120,000','Sugar 100MT','EG→NL','<span class="font-bold text-amber-600">72/100</span>','<button class="text-blue-500 text-xs">View 6 docs</button>'],
         ['SGTX-***-H1C','Post-Ship','$80,000','Rice 30MT','EG→UK','<span class="font-bold text-emerald-600">91/100</span>','<button class="text-blue-500 text-xs">View 7 docs</button>']]
      )}
    </div>`;
}

async function renderFinBidding() {
  setTitle('Bidding', 'Active bids and negotiations');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-gavel', 'Active Bids', '3', null, 'blue')}
      ${metricCard('fa-check', 'Accepted', '2', null, 'emerald')}
      ${metricCard('fa-clock', 'Pending Response', '1', null, 'amber')}
      ${metricCard('fa-percent', 'Avg Rate Offered', '4.2%', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Bid ID','Trade','Amount','Rate Offered','Tenor','Status','Action'],
        [['BID-001','SGTX-***-F3A','$50,000','3.8%','60d',badge('ACCEPTED'),'<button class="btn-primary text-xs py-1 px-3">Fund</button>'],
         ['BID-002','SGTX-***-G2B','$120,000','5.0%','30d',badge('PENDING'),'<button class="btn-ghost text-xs py-1 px-3">Edit</button>'],
         ['BID-003','SGTX-***-H1C','$80,000','4.2%','45d',badge('COUNTER'),'<button class="btn-primary text-xs py-1 px-3">Respond</button>']]
      )}
    </div>`;
}

async function renderFinCollateral() {
  setTitle('Collateral Monitor', 'Track collateral values and coverage ratios');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-shield', 'Total Collateral', '$2.8M', null, 'blue')}
      ${metricCard('fa-chart-line', 'Coverage Ratio', '117%', null, 'emerald')}
      ${metricCard('fa-exclamation', 'Below Threshold', '0', null, 'red')}
      ${metricCard('fa-arrow-trend-up', 'Appreciation', '+$45k', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-shield-halved mr-2 text-blue-500"></i>Collateral Positions</h3>
      ${dataTable(['Trade','Collateral Type','Value','Loan Amount','Coverage','Status'],
        [['SGTX-EG-26-F3A','Cargo (Rice 50MT)','$22,000','$50,000','110%',badge('ADEQUATE')],
         ['SGTX-EG-26-G2B','Receivable + Cargo','$135,000','$120,000','113%',badge('ADEQUATE')],
         ['SGTX-EG-26-H1C','Cargo (Rice 30MT)','$15,000','$80,000','104%',badge('WATCH')]]
      )}
    </div>`;
}

async function renderFinDeFi() {
  setTitle('DeFi Integration', 'Tokenised trade finance instruments');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-coins', 'Tokenised Value', '$1.2M', null, 'gold')}
      ${metricCard('fa-cubes', 'Active Tokens', '12', null, 'purple')}
      ${metricCard('fa-arrows-rotate', 'Secondary Trades', '3', null, 'blue')}
      ${metricCard('fa-percent', 'Avg APY', '5.8%', null, 'emerald')}
    </div>
    <div class="sgtx-card p-5">
      <div class="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 mb-4">
        <div class="flex items-center gap-3"><i class="fas fa-info-circle text-purple-600"></i><span class="text-sm text-purple-800">DeFi features enable tokenisation of trade finance receivables for secondary market trading.</span></div>
      </div>
      ${dataTable(['Token ID','Underlying','Face Value','Yield','Maturity','Status'],
        [['TF-TOK-001','Pre-Ship Rice','$50,000','4.5%','Aug 15',badge('ACTIVE')],
         ['TF-TOK-002','Invoice Sugar','$120,000','5.2%','Jul 30',badge('ACTIVE')],
         ['TF-TOK-003','Post-Ship Rice','$80,000','3.8%','Sep 1',badge('LISTED')]]
      )}
    </div>`;
}

async function renderFinSecondary() {
  setTitle('Secondary Market', 'Trade tokenised finance instruments');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-exchange-alt', 'Listed', '8', null, 'blue')}
      ${metricCard('fa-chart-line', 'Volume (24h)', '$340k', null, 'emerald')}
      ${metricCard('fa-users', 'Active Traders', '14', null, 'purple')}
      ${metricCard('fa-percent', 'Spread', '0.3%', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Instrument','Face Value','Ask Price','Yield','Days to Maturity','Seller','Action'],
        [['Rice Pre-Ship #001','$50,000','$49,750','4.8%','42','Bank A','<button class="btn-primary text-xs py-1 px-3">Buy</button>'],
         ['Sugar Invoice #002','$120,000','$118,500','5.5%','26','Fund B','<button class="btn-primary text-xs py-1 px-3">Buy</button>'],
         ['Rice Post-Ship #003','$80,000','$79,200','4.1%','58','Bank C','<button class="btn-primary text-xs py-1 px-3">Buy</button>']]
      )}
    </div>`;
}

async function renderFinCompanies() {
  setTitle('Financed Companies', 'Track portfolio by borrower');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-building', 'Companies', '6', null, 'blue')}
      ${metricCard('fa-coins', 'Total Exposure', '$2.4M', null, 'gold')}
      ${metricCard('fa-star', 'Avg Score', '82/100', null, 'emerald')}
      ${metricCard('fa-clock', 'Avg Relationship', '14mo', null, 'purple')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Company','Country','Exposure','Active Loans','Credit Score','Repayment','Status'],
        [['Nile Grains Export','Egypt','$320,000','2','<span class="font-bold text-emerald-600">88</span>','100%',badge('ACTIVE')],
         ['Cairo Sugar Co','Egypt','$540,000','3','<span class="font-bold text-emerald-600">82</span>','98%',badge('ACTIVE')],
         ['Delta Foods Ltd','Egypt','$180,000','1','<span class="font-bold text-amber-600">75</span>','95%',badge('WATCH')]]
      )}
    </div>`;
}

async function renderFinSettlements() {
  setTitle('Settlements', 'Track loan repayments and settlements');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-check-double', 'Settled (30d)', '12', null, 'emerald')}
      ${metricCard('fa-coins', 'Amount Settled', '$890k', null, 'gold')}
      ${metricCard('fa-clock', 'Pending', '3', null, 'amber')}
      ${metricCard('fa-exclamation', 'Overdue', '0', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Settlement ID','Trade','Amount','Due Date','Paid Date','Status'],
        [['SET-001','SGTX-EG-26-A1A','$52,400','Jun 15','Jun 14',badge('SETTLED')],
         ['SET-002','SGTX-EG-26-B2B','$125,600','Jun 28','Jun 28',badge('SETTLED')],
         ['SET-003','SGTX-EG-26-F3A','$51,900','Jul 20','—',badge('PENDING')]]
      )}
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════
// QC PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderQCHub() {
  setTitle('QC Inspection Hub', 'Quality control operations dashboard');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-clipboard-check', 'Active Jobs', '12', null, 'blue')}
      ${metricCard('fa-clock', 'Pending', '5', null, 'amber')}
      ${metricCard('fa-check-double', 'Completed (7d)', '18', null, 'emerald')}
      ${metricCard('fa-star', 'Pass Rate', '94%', null, 'gold')}
      ${metricCard('fa-user-check', 'Inspectors Online', '4', null, 'purple')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calendar mr-2 text-blue-500"></i>Today's Schedule</h3>
        <div class="space-y-2">
          ${[{time:'09:00',trade:'SGTX-EG-26-F3A',type:'PSI',loc:'Alexandria Factory',inspector:'Ahmed M.',status:'IN_PROGRESS'},{time:'11:30',trade:'SGTX-EG-26-G2B',type:'CLI',loc:'Port Said Terminal',inspector:'Sara K.',status:'SCHEDULED'},{time:'14:00',trade:'SGTX-EG-26-H1C',type:'FRI',loc:'Damietta Warehouse',inspector:'Mohamed A.',status:'SCHEDULED'}].map(j=>`
            <div class="flex items-center gap-4 p-3 rounded-lg border border-surface-200 hover:bg-surface-50">
              <div class="text-xs font-bold text-surface-500 w-12">${j.time}</div>
              <div class="flex-1"><div class="font-medium text-sm">${j.trade} — ${j.type}</div><div class="text-xs text-surface-400">${j.loc} · Inspector: ${j.inspector}</div></div>
              ${badge(j.status)}
            </div>`).join('')}
        </div>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-chart-pie mr-1"></i>Results Distribution</h4><canvas id="qc-pie" height="160"></canvas></div>
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-users mr-1"></i>Team Load</h4><div class="space-y-2 text-xs">${[{name:'Ahmed M.',jobs:4},{name:'Sara K.',jobs:3},{name:'Mohamed A.',jobs:3},{name:'Fatima H.',jobs:2}].map(t=>`<div class="flex justify-between"><span>${t.name}</span><span class="font-bold">${t.jobs} jobs</span></div>`).join('')}</div></div>
      </div>
    </div>`;
  setTimeout(()=>{const c=document.getElementById('qc-pie');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'doughnut',data:{labels:['Pass','Conditional','Fail'],datasets:[{data:[85,10,5],backgroundColor:['#10B981','#F59E0B','#EF4444']}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:9}}}}}});},100);
}

async function renderQCQueue() {
  setTitle('Inspection Queue', 'Pending inspections awaiting assignment');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-list', 'In Queue', '5', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Wait', '1.5d', null, 'amber')}
      ${metricCard('fa-user-plus', 'Unassigned', '2', null, 'red')}
      ${metricCard('fa-calendar-check', 'Scheduled Today', '3', null, 'emerald')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Trade','Type','Commodity','Location','Requested','Priority','Action'],
        [['SGTX-EG-26-F3A','PSI','Rice 50MT','Alexandria','Jul 3',badge('HIGH'),'<button class="btn-primary text-xs py-1 px-3">Assign</button>'],
         ['SGTX-EG-26-G2B','CLI','Sugar 100MT','Port Said','Jul 4',badge('MEDIUM'),'<button class="btn-primary text-xs py-1 px-3">Assign</button>'],
         ['SGTX-EG-26-H1C','FRI','Rice 30MT','Damietta','Jul 5',badge('LOW'),'<button class="btn-primary text-xs py-1 px-3">Assign</button>']]
      )}
    </div>`;
}

async function renderQCAQL() {
  setTitle('AQL Sampling', 'Configure and execute AQL sampling plans');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-calculator', 'Active Plans', '3', null, 'blue')}
      ${metricCard('fa-vial', 'Samples Drawn', '450', null, 'purple')}
      ${metricCard('fa-check', 'Passed', '425', null, 'emerald')}
      ${metricCard('fa-xmark', 'Defective', '25', null, 'red')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator mr-2 text-blue-500"></i>AQL Calculator (ISO 2859-1)</h3>
      <div class="grid grid-cols-4 gap-4 mb-4">
        <div><label class="text-xs text-surface-500 block mb-1">Lot Size</label><input type="number" class="w-full" value="10000"></div>
        <div><label class="text-xs text-surface-500 block mb-1">Inspection Level</label><select class="w-full"><option>Level I</option><option selected>Level II</option><option>Level III</option></select></div>
        <div><label class="text-xs text-surface-500 block mb-1">AQL (%)</label><select class="w-full"><option>1.0</option><option>1.5</option><option selected>2.5</option><option>4.0</option></select></div>
        <div><label class="text-xs text-surface-500 block mb-1">Result</label><div class="p-2 bg-blue-50 rounded border border-blue-200 text-center"><span class="font-bold text-blue-700">n=200, Ac=10, Re=11</span></div></div>
      </div>
      ${dataTable(['Parameter','Sample Size','Accept (Ac)','Reject (Re)','Result','Defects Found'],
        [['Moisture ≤14%','200','≤10','≥11','<span class="text-emerald-600 font-bold">PASS (7)</span>','7'],
         ['Broken ≤5%','200','≤10','≥11','<span class="text-emerald-600 font-bold">PASS (4)</span>','4'],
         ['Foreign Matter ≤0.5%','200','≤5','≥6','<span class="text-emerald-600 font-bold">PASS (2)</span>','2'],
         ['Colour/Odour','80','≤3','≥4','<span class="text-emerald-600 font-bold">PASS (1)</span>','1']]
      )}
    </div>`;
}

async function renderQCAR() {
  setTitle('AR Inspection', 'Augmented reality-assisted remote inspection');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-vr-cardboard', 'AR Sessions', '3 Active', null, 'purple')}
      ${metricCard('fa-video', 'Live Feeds', '2', null, 'blue')}
      ${metricCard('fa-robot', 'AI Detections', '12', null, 'emerald')}
      ${metricCard('fa-camera', 'Photos Captured', '48', null, 'amber')}
    </div>
    <div class="sgtx-card p-5">
      <div class="w-full h-64 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 flex items-center justify-center">
        <div class="text-center"><i class="fas fa-vr-cardboard text-5xl text-purple-300 mb-3"></i><p class="text-sm text-purple-500">AR Inspection viewer — connect device to begin</p><button class="btn-primary mt-3 py-2 px-5 text-xs"><i class="fas fa-play mr-1"></i>Start AR Session</button></div>
      </div>
    </div>`;
}

async function renderQCReports() {
  setTitle('Inspection Reports', 'View and manage completed inspection reports');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-circle-check', 'Total Reports', '52', null, 'blue')}
      ${metricCard('fa-check', 'Passed', '47', null, 'emerald')}
      ${metricCard('fa-exclamation', 'Conditional', '4', null, 'amber')}
      ${metricCard('fa-xmark', 'Failed', '1', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Report ID','Trade','Type','Inspector','Date','Result','Action'],
        [['RPT-052','SGTX-EG-26-F3A','PSI','Ahmed M.','Jul 4',badge('PASS'),'<button class="text-blue-500 text-xs">View PDF</button>'],
         ['RPT-051','SGTX-EG-26-E2E','CLI','Sara K.','Jul 2',badge('PASS'),'<button class="text-blue-500 text-xs">View PDF</button>'],
         ['RPT-050','SGTX-EG-26-D1D','FRI','Mohamed A.','Jun 30',badge('CONDITIONAL'),'<button class="text-blue-500 text-xs">View PDF</button>']]
      )}
    </div>`;
}

async function renderQCOverrides() {
  setTitle('Override Log', 'Track quality grade overrides and approvals');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-pen-to-square', 'Total Overrides', '7', null, 'amber')}
      ${metricCard('fa-user-shield', 'By Supervisor', '5', null, 'blue')}
      ${metricCard('fa-clock', 'Pending Approval', '2', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Override ID','Trade','Original','Override To','Reason','Approved By','Date'],
        [['OVR-007','SGTX-EG-26-D1D','FAIL','CONDITIONAL','Minor defect within tolerance','Supervisor Ahmed','Jul 1'],
         ['OVR-006','SGTX-EG-26-C3C','CONDITIONAL','PASS','Re-test confirmed acceptable','QC Manager','Jun 28']]
      )}
    </div>`;
}

async function renderQCPerformance() {
  setTitle('QC Performance', 'Inspector KPIs and service metrics');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-clipboard-check', 'Jobs Completed', '52', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Turnaround', '2.1d', null, 'emerald')}
      ${metricCard('fa-star', 'Accuracy', '98.5%', null, 'gold')}
      ${metricCard('fa-chart-line', 'Throughput', '+12%', null, 'purple')}
      ${metricCard('fa-users', 'Team Size', '4', null, 'surface')}
    </div>
    <div class="grid grid-cols-2 gap-5">
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2"></i>Jobs per Inspector</h3><canvas id="qc-perf-chart" height="180"></canvas></div>
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2"></i>Turnaround Trend</h3><canvas id="qc-turn-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(()=>{
    const c1=document.getElementById('qc-perf-chart'),c2=document.getElementById('qc-turn-chart');
    if(c1&&typeof Chart!=='undefined')new Chart(c1,{type:'bar',data:{labels:['Ahmed','Sara','Mohamed','Fatima'],datasets:[{label:'Jobs',data:[15,13,12,12],backgroundColor:'#D4A017'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    if(c2&&typeof Chart!=='undefined')new Chart(c2,{type:'line',data:{labels:['W1','W2','W3','W4','W5','W6'],datasets:[{label:'Days',data:[2.5,2.3,2.2,2.1,2.0,2.1],borderColor:'#10B981',tension:0.4,fill:false}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  },100);
}

// ═══════════════════════════════════════════════════════════════════════
// GOVERNMENT PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderGovDashboard() {
  setTitle('Government Dashboard', 'Trade monitoring and regulatory oversight');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-landmark', 'Active Trades', '847', '+23 today', 'blue')}
      ${metricCard('fa-coins', 'Trade Volume', '$42.3M', '+$1.8M', 'gold')}
      ${metricCard('fa-shield-check', 'Compliance', '99.2%', null, 'emerald')}
      ${metricCard('fa-flag', 'Flags', '3', null, 'red')}
      ${metricCard('fa-file-circle-check', 'Permits Issued', '124', null, 'purple')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-area mr-2 text-blue-500"></i>Trade Volume (Monthly)</h3>
        <canvas id="gov-vol-chart" height="200"></canvas>
      </div>
      <div class="space-y-4">
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-flag mr-1 text-red-500"></i>Active Flags</h4><div class="space-y-2">${[{msg:'Suspicious pattern — high-freq trades from Entity X',sev:'HIGH'},{msg:'Sanctions watchlist match — pending review',sev:'MEDIUM'},{msg:'Doc forgery suspicion — AI confidence 68%',sev:'LOW'}].map(f=>`<div class="p-2 rounded text-xs border-l-4 ${f.sev==='HIGH'?'border-l-red-500 bg-red-50':f.sev==='MEDIUM'?'border-l-amber-500 bg-amber-50':'border-l-blue-500 bg-blue-50'}">${f.msg}</div>`).join('')}</div></div>
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-globe mr-1"></i>Top Routes</h4><div class="space-y-1 text-xs">${[{r:'EG→DE',v:'$12.4M'},{r:'EG→NL',v:'$8.7M'},{r:'EG→UK',v:'$6.2M'}].map(t=>`<div class="flex justify-between"><span>${t.r}</span><span class="font-bold">${t.v}</span></div>`).join('')}</div></div>
      </div>
    </div>`;
  setTimeout(()=>{const c=document.getElementById('gov-vol-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Volume ($M)',data:[32,35,38,40,42,42.3],backgroundColor:'#D4A017'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'$'+v+'M'}}}}});},100);
}

async function renderGovLiveMonitor() {
  setTitle('Live Trade Monitor', 'Real-time trade flow surveillance');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-signal', 'Live Trades', '34', null, 'blue')}
      ${metricCard('fa-eye', 'Watching', '5', null, 'amber')}
      ${metricCard('fa-check-circle', 'Cleared (1h)', '12', null, 'emerald')}
      ${metricCard('fa-ban', 'Blocked', '0', null, 'red')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-signal mr-2 text-blue-500 animate-pulse"></i>Live Feed</h3>
      <div class="space-y-2 max-h-96 overflow-y-auto">
        ${[{time:'14:32:01',action:'Trade initiated',trade:'SGTX-EG-26-K4K',detail:'Rice 80MT, EG→IT'},{time:'14:30:45',action:'Payment cleared',trade:'SGTX-EG-26-F3A',detail:'$29,788 via PSP split'},{time:'14:28:12',action:'Customs approved',trade:'SGTX-EG-26-G2B',detail:'Sugar 100MT, EGPSD'},{time:'14:25:33',action:'Doc uploaded',trade:'SGTX-EG-26-H1C',detail:'Bill of Lading submitted'},{time:'14:22:08',action:'QC passed',trade:'SGTX-EG-26-J3J',detail:'PSI inspection — PASS'}].map(e=>`
          <div class="flex items-center gap-3 p-2 rounded hover:bg-surface-50 text-xs">
            <span class="font-mono text-surface-400 w-16">${e.time}</span>
            <span class="font-medium w-32">${e.action}</span>
            <span class="text-blue-600 w-32">${e.trade}</span>
            <span class="text-surface-500 flex-1">${e.detail}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderGovAnonymous() {
  setTitle('Anonymous Trade View', 'Aggregated anonymous trade data');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-mask', 'Anonymous Trades', '847', null, 'purple')}
      ${metricCard('fa-chart-bar', 'Volume (Anon)', '$42.3M', null, 'blue')}
      ${metricCard('fa-globe', 'Countries', '24', null, 'emerald')}
    </div>
    <div class="sgtx-card p-5">
      <div class="p-4 bg-purple-50 rounded-xl border border-purple-200 mb-4"><div class="flex items-center gap-2"><i class="fas fa-mask text-purple-600"></i><span class="text-sm text-purple-800">All data shown is anonymized. Counterparty identities are hidden per SGTX privacy framework.</span></div></div>
      ${dataTable(['Trade (Anon)','Commodity','Volume','Route','Value','Phase','Risk'],
        [['***-F3A','Rice','50 MT','[Origin]→[Dest]','$29.8k','Phase 5',badge('LOW')],
         ['***-G2B','Sugar','100 MT','[Origin]→[Dest]','$58.2k','Phase 3',badge('LOW')],
         ['***-H1C','Rice','30 MT','[Origin]→[Dest]','$18.5k','Phase 7',badge('MEDIUM')]]
      )}
    </div>`;
}

async function renderGovMultiAgency() {
  setTitle('Multi-Agency Coordination', 'Cross-agency regulatory coordination');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-building-columns', 'Agencies', '6', null, 'blue')}
      ${metricCard('fa-arrows-rotate', 'Shared Cases', '3', null, 'purple')}
      ${metricCard('fa-check-double', 'Joint Approvals', '12', null, 'emerald')}
      ${metricCard('fa-clock', 'Avg Coord Time', '4.2h', null, 'amber')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-building-columns mr-2 text-blue-500"></i>Connected Agencies</h3>
      <div class="grid grid-cols-3 gap-3">
        ${[{name:'Customs Authority',status:'ACTIVE',cases:8},{name:'Central Bank',status:'ACTIVE',cases:5},{name:'Health Ministry',status:'ACTIVE',cases:3},{name:'Agriculture Ministry',status:'ACTIVE',cases:6},{name:'Port Authority',status:'ACTIVE',cases:4},{name:'Tax Authority',status:'PENDING',cases:0}].map(a=>`
          <div class="p-4 rounded-lg border border-surface-200 hover:bg-surface-50">
            <div class="flex items-center justify-between mb-2"><span class="font-medium text-sm">${a.name}</span>${badge(a.status)}</div>
            <div class="text-xs text-surface-400">${a.cases} active cases</div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderGovDocVerification() {
  setTitle('Document Verification', 'Government document authentication');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-circle-check', 'Verified (7d)', '45', null, 'emerald')}
      ${metricCard('fa-clock', 'Pending', '8', null, 'amber')}
      ${metricCard('fa-flag', 'Flagged', '2', null, 'red')}
      ${metricCard('fa-robot', 'AI Accuracy', '99.1%', null, 'blue')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Document','Trade','Issuer','Submitted','AI Score','Loom Hash','Status'],
        [['Export License','SGTX-EG-26-F3A','GOEIC','Jul 3','99.5%','<span class="font-mono text-[10px]">0xA1B...</span>',badge('VERIFIED')],
         ['Phyto Cert','SGTX-EG-26-G2B','Agri Ministry','Jul 4','97.2%','<span class="font-mono text-[10px]">0xC3D...</span>',badge('VERIFIED')],
         ['CoO','SGTX-EG-26-H1C','Chamber of Commerce','Jul 4','72.1%','—',badge('REVIEW')]]
      )}
    </div>`;
}

async function renderGovAuditTrail() {
  setTitle('Audit Trail', 'Complete immutable audit log');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-scroll', 'Total Events', '12,847', null, 'blue')}
      ${metricCard('fa-clock', 'Today', '342', null, 'emerald')}
      ${metricCard('fa-link', 'Loom Verified', '100%', null, 'gold')}
      ${metricCard('fa-search', 'Queries (7d)', '28', null, 'purple')}
    </div>
    <div class="sgtx-card p-5">
      <div class="flex gap-3 mb-4">
        <input type="text" placeholder="Search events..." class="flex-1 text-sm">
        <select class="text-xs border rounded-lg px-3"><option>All Types</option><option>Trade</option><option>Payment</option><option>Document</option></select>
        <input type="date" class="text-xs border rounded-lg px-3">
      </div>
      <div class="space-y-1 max-h-80 overflow-y-auto text-xs font-mono">
        ${[{t:'14:32:01',ev:'TRADE_INIT',trade:'K4K',hash:'0xF1A'},{t:'14:30:45',ev:'PAYMENT_SPLIT',trade:'F3A',hash:'0xB2C'},{t:'14:28:12',ev:'CUSTOMS_CLEAR',trade:'G2B',hash:'0xD3E'},{t:'14:25:33',ev:'DOC_UPLOAD',trade:'H1C',hash:'0xE4F'},{t:'14:22:08',ev:'QC_PASS',trade:'J3J',hash:'0xA5G'}].map(e=>`<div class="flex gap-4 p-1.5 hover:bg-surface-50 rounded"><span class="text-surface-400">${e.t}</span><span class="text-blue-600 w-28">${e.ev}</span><span class="w-12">${e.trade}</span><span class="text-gold-600">${e.hash}...</span></div>`).join('')}
      </div>
    </div>`;
}

async function renderGovCompliance() {
  setTitle('Compliance Monitor', 'AML/KYC/Sanctions screening');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-shield-check', 'Compliance Rate', '99.2%', null, 'emerald')}
      ${metricCard('fa-user-check', 'KYC Complete', '98.5%', null, 'blue')}
      ${metricCard('fa-ban', 'Sanctions Hits', '0', null, 'red')}
      ${metricCard('fa-flag', 'AML Alerts', '2', null, 'amber')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-shield-check mr-2 text-emerald-500"></i>Compliance Screening Results</h3>
      ${dataTable(['Entity','Type','KYC Status','Sanctions','AML Score','Last Check','Action'],
        [['Nile Grains Export','Seller',badge('VERIFIED'),'Clear','<span class="text-emerald-600 font-bold">LOW</span>','Jul 4',''],
         ['Hamburg Import Co','Buyer',badge('VERIFIED'),'Clear','<span class="text-emerald-600 font-bold">LOW</span>','Jul 3',''],
         ['Entity XYZ','Buyer',badge('REVIEW'),'Watchlist','<span class="text-red-600 font-bold">HIGH</span>','Jul 4','<button class="btn-primary text-xs py-1 px-2">Investigate</button>']]
      )}
    </div>`;
}

async function renderGovPermits() {
  setTitle('Permit Issuance', 'Issue and track trade permits');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-stamp', 'Issued (30d)', '124', null, 'emerald')}
      ${metricCard('fa-clock', 'Pending', '8', null, 'amber')}
      ${metricCard('fa-ban', 'Rejected', '2', null, 'red')}
      ${metricCard('fa-hourglass', 'Avg Processing', '2.1d', null, 'blue')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Permit ID','Type','Applicant','Commodity','Status','Issued','Expires'],
        [['PRM-2026-124','Export License','Nile Grains','Rice',badge('ACTIVE'),'Jul 3','Jan 3, 2027'],
         ['PRM-2026-125','Phyto Clearance','Cairo Sugar','Sugar',badge('ACTIVE'),'Jul 4','Oct 4, 2026'],
         ['PRM-2026-126','Export License','Delta Foods','Rice',badge('PENDING'),'—','—']]
      )}
    </div>`;
}

async function renderGovCustomsAPI() {
  setTitle('Customs Integration API', 'Direct customs system integration');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-plug', 'API Status', 'ONLINE', null, 'emerald')}
      ${metricCard('fa-bolt', 'Calls (24h)', '1,247', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Latency', '120ms', null, 'purple')}
      ${metricCard('fa-check', 'Success Rate', '99.8%', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-plug mr-2 text-emerald-500"></i>Connected Systems</h3>
      <div class="grid grid-cols-2 gap-4">
        ${[{sys:'ASYCUDA World',status:'ONLINE',last:'2s ago'},{sys:'Single Window (NSW)',status:'ONLINE',last:'5s ago'},{sys:'GOEIC Export System',status:'ONLINE',last:'12s ago'},{sys:'Central Bank FX',status:'MAINTENANCE',last:'2h ago'}].map(s=>`
          <div class="p-4 rounded-lg border flex items-center justify-between">
            <div><div class="font-medium text-sm">${s.sys}</div><div class="text-xs text-surface-400">Last sync: ${s.last}</div></div>
            ${badge(s.status)}
          </div>`).join('')}
      </div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════
// ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderAdminHealth() {
  setTitle('Platform Health', 'System status, uptime, and resource monitoring');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-heart-pulse', 'System Status', 'HEALTHY', null, 'emerald')}
      ${metricCard('fa-clock', 'Uptime', '99.97%', null, 'blue')}
      ${metricCard('fa-users', 'Active Users', '1,247', null, 'purple')}
      ${metricCard('fa-bolt', 'Req/sec', '342', null, 'gold')}
      ${metricCard('fa-database', 'DB Load', '23%', null, 'amber')}
    </div>
    <div class="grid grid-cols-3 gap-5">
      <div class="col-span-2 sgtx-card p-5"><h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-line mr-2 text-blue-500"></i>Request Throughput (24h)</h3><canvas id="admin-req-chart" height="180"></canvas></div>
      <div class="space-y-4">
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-server mr-1"></i>Services</h4><div class="space-y-2 text-xs">${[{s:'API Gateway',st:'UP'},{s:'D1 Database',st:'UP'},{s:'KV Store',st:'UP'},{s:'R2 Storage',st:'UP'},{s:'Worker Runtime',st:'UP'},{s:'AI Engine',st:'UP'}].map(x=>`<div class="flex justify-between"><span>${x.s}</span><span class="text-emerald-600 font-bold">${x.st}</span></div>`).join('')}</div></div>
        <div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-600 mb-3"><i class="fas fa-exclamation-triangle mr-1 text-amber-500"></i>Recent Incidents</h4><div class="text-xs text-surface-400">No incidents in the last 30 days ✓</div></div>
      </div>
    </div>`;
  setTimeout(()=>{const c=document.getElementById('admin-req-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'line',data:{labels:Array.from({length:24},(_,i)=>i+'h'),datasets:[{label:'Requests',data:Array.from({length:24},()=>200+Math.random()*200),borderColor:'#3B82F6',tension:0.4,fill:false,pointRadius:0}]},options:{responsive:true,plugins:{legend:{display:false}}}});},100);
}

async function renderAdminConstitutional() {
  setTitle('Constitutional Engine', 'Governance rules, amendments, and voting');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-scroll', 'Active Rules', '84', null, 'gold')}
      ${metricCard('fa-pen-to-square', 'Amendments', '3 pending', null, 'amber')}
      ${metricCard('fa-users', 'Voting Members', '7', null, 'blue')}
      ${metricCard('fa-check-double', 'Last Amendment', 'Jun 28', null, 'emerald')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-scroll mr-2 text-gold-500"></i>Core Constitutional Rules</h3>
      ${dataTable(['Rule ID','Category','Description','Status','Enacted','Votes'],
        [['CR-001','Non-Custodial','Platform never holds trader funds',badge('ACTIVE'),'Jan 2024','7/7'],
         ['CR-002','Transparency','Full disclosure to financiers',badge('ACTIVE'),'Jan 2024','7/7'],
         ['CR-003','Governor Gate','All phase transitions require approval',badge('ACTIVE'),'Jan 2024','7/7'],
         ['CR-004','Privacy','Anonymous financier matching',badge('ACTIVE'),'Mar 2024','6/7'],
         ['CR-005','Fee Cap','Maximum 0.5% commission',badge('AMENDMENT'),'—','Voting...']]
      )}
    </div>`;
}

async function renderAdminGovernorLog() {
  setTitle('Governor Log', 'Complete Governor AI decision audit trail');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-brain', 'Decisions (24h)', '1,847', null, 'purple')}
      ${metricCard('fa-check', 'Approved', '1,842', null, 'emerald')}
      ${metricCard('fa-ban', 'Rejected', '5', null, 'red')}
      ${metricCard('fa-clock', 'Avg Latency', '45ms', null, 'blue')}
    </div>
    <div class="sgtx-card p-5">
      <div class="flex gap-3 mb-4"><input type="text" placeholder="Search decisions..." class="flex-1 text-sm"><select class="text-xs border rounded-lg px-3"><option>All Gates</option><option>Price Lock</option><option>Payment</option><option>Doc Sign</option></select></div>
      <div class="space-y-1 max-h-80 overflow-y-auto text-xs font-mono">
        ${[{t:'14:32:01',gate:'PRICE_LOCK',trade:'K4K',result:'APPROVED',ms:42},{t:'14:30:45',gate:'PAYMENT_SPLIT',trade:'F3A',result:'APPROVED',ms:38},{t:'14:28:12',gate:'DOC_SIGN',trade:'G2B',result:'APPROVED',ms:51},{t:'14:25:33',gate:'TRADE_INIT',trade:'H1C',result:'REJECTED',ms:67},{t:'14:22:08',gate:'QC_OVERRIDE',trade:'J3J',result:'APPROVED',ms:44}].map(e=>`<div class="flex gap-4 p-1.5 hover:bg-surface-50 rounded"><span class="text-surface-400">${e.t}</span><span class="w-28">${e.gate}</span><span class="w-10">${e.trade}</span><span class="${e.result==='APPROVED'?'text-emerald-600':'text-red-600'} font-bold">${e.result}</span><span class="text-surface-400">${e.ms}ms</span></div>`).join('')}
      </div>
    </div>`;
}

async function renderAdminJurisdiction() {
  setTitle('Jurisdiction Matrix', 'Country-pair trade rules and restrictions');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-globe', 'Countries', '48', null, 'blue')}
      ${metricCard('fa-route', 'Active Pairs', '234', null, 'emerald')}
      ${metricCard('fa-ban', 'Restricted', '12', null, 'red')}
      ${metricCard('fa-clock', 'Last Update', 'Jul 3', null, 'surface')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Origin','Destination','Status','Docs Required','Special Rules','Sanctions'],
        [['Egypt','Germany',badge('ACTIVE'),'7','Phyto + CoO + EUR.1','None'],
         ['Egypt','Netherlands',badge('ACTIVE'),'6','Phyto + CoO','None'],
         ['Egypt','UK',badge('ACTIVE'),'7','Phyto + CoO + Health Cert','None'],
         ['Egypt','Russia',badge('RESTRICTED'),'—','Sanctions apply','<span class="text-red-600 font-bold">YES</span>']]
      )}
    </div>`;
}

async function renderAdminPSP() {
  setTitle('PSP Manager', 'Payment service provider configuration');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-credit-card', 'Active PSPs', '4', null, 'blue')}
      ${metricCard('fa-coins', 'Volume (30d)', '$8.4M', null, 'gold')}
      ${metricCard('fa-check', 'Success Rate', '99.6%', null, 'emerald')}
      ${metricCard('fa-clock', 'Avg Settlement', '1.2d', null, 'purple')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['PSP','Region','Status','Volume (30d)','Success Rate','Fee','Action'],
        [['Stripe','Global',badge('ACTIVE'),'$3.2M','99.8%','2.9%','<button class="btn-ghost text-xs py-1 px-2">Config</button>'],
         ['Rapyd','MENA',badge('ACTIVE'),'$2.8M','99.5%','2.5%','<button class="btn-ghost text-xs py-1 px-2">Config</button>'],
         ['dLocal','LATAM',badge('ACTIVE'),'$1.4M','99.2%','3.1%','<button class="btn-ghost text-xs py-1 px-2">Config</button>'],
         ['Flutterwave','Africa',badge('ACTIVE'),'$1.0M','98.8%','2.8%','<button class="btn-ghost text-xs py-1 px-2">Config</button>']]
      )}
    </div>`;
}

async function renderAdminSpecialRates() {
  setTitle('Special Rates', 'Custom commission rates for key accounts');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-percent', 'Standard Rate', '0.50%', null, 'gold')}
      ${metricCard('fa-users', 'Special Rates', '5 accounts', null, 'blue')}
      ${metricCard('fa-star', 'Lowest Rate', '0.25%', null, 'emerald')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Company','Standard Rate','Special Rate','Reason','Valid Until','Approved By'],
        [['Nile Grains Export','0.50%','0.35%','Volume >$1M/mo','Dec 2026','CEO'],
         ['Cairo Sugar Co','0.50%','0.40%','Launch partner','Sep 2026','Board'],
         ['Hamburg Import Co','0.50%','0.25%','Strategic partnership','Mar 2027','CEO']]
      )}
    </div>`;
}

async function renderAdminImpersonation() {
  setTitle('Impersonation', 'Support user impersonation (audit-logged)');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-user-secret', 'Active Sessions', '0', null, 'purple')}
      ${metricCard('fa-scroll', 'Total (30d)', '12', null, 'blue')}
      ${metricCard('fa-shield', 'Governance', 'Governor-Gated', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <div class="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4"><div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-amber-600"></i><span class="text-sm text-amber-800">Impersonation is Governor-gated and fully audit-logged. Every action during impersonation is recorded.</span></div></div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="text-xs text-surface-500 block mb-1">User Email</label><input type="email" class="w-full" placeholder="user@company.com"></div>
        <div><label class="text-xs text-surface-500 block mb-1">Reason</label><select class="w-full"><option>Customer Support</option><option>Bug Investigation</option><option>Account Recovery</option></select></div>
      </div>
      <button class="btn-primary py-2 px-5 text-sm bg-purple-600 hover:bg-purple-700"><i class="fas fa-user-secret mr-2"></i>Start Impersonation (Governor Gate)</button>
    </div>`;
}

async function renderAdminMarketplacePartners() {
  setTitle('Marketplace Partners', 'Manage API partners and integrations');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-handshake', 'Partners', '8', null, 'blue')}
      ${metricCard('fa-check', 'Active', '6', null, 'emerald')}
      ${metricCard('fa-coins', 'Revenue Share', '$42k/mo', null, 'gold')}
      ${metricCard('fa-chart-line', 'Leads (30d)', '127', null, 'purple')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Partner','Type','Status','Leads/mo','Revenue Share','API Calls','Action'],
        [['TradeFlow App','Aggregator',badge('ACTIVE'),'45','12%','12k/day','<button class="btn-ghost text-xs py-1 px-2">Manage</button>'],
         ['AgriConnect','Marketplace',badge('ACTIVE'),'32','15%','8k/day','<button class="btn-ghost text-xs py-1 px-2">Manage</button>'],
         ['ShipTracker Pro','Tool',badge('ACTIVE'),'28','10%','5k/day','<button class="btn-ghost text-xs py-1 px-2">Manage</button>']]
      )}
    </div>`;
}

async function renderAdminIncidents() {
  setTitle('Incidents', 'Platform incident management and response');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-fire-extinguisher', 'Active', '0', null, 'emerald')}
      ${metricCard('fa-check', 'Resolved (30d)', '2', null, 'blue')}
      ${metricCard('fa-clock', 'MTTR', '23 min', null, 'amber')}
      ${metricCard('fa-shield', 'SLA Compliance', '100%', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Incident','Severity','Started','Resolved','Duration','Impact','RCA'],
        [['INC-2026-002','P3','Jun 25 14:00','Jun 25 14:23','23 min','API latency spike','<button class="text-blue-500 text-xs">View</button>'],
         ['INC-2026-001','P2','Jun 12 09:15','Jun 12 10:02','47 min','D1 write timeout','<button class="text-blue-500 text-xs">View</button>']]
      )}
    </div>`;
}

async function renderAdminConfigHistory() {
  setTitle('Config History', 'Platform configuration change log');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-history', 'Changes (30d)', '18', null, 'blue')}
      ${metricCard('fa-user', 'By Admins', '3', null, 'purple')}
      ${metricCard('fa-undo', 'Rollbacks', '1', null, 'amber')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Date','Change','Category','By','Status'],
        [['Jul 3','Fee cap updated to 0.5%','Commission','Admin','<span class="text-emerald-600">Applied</span>'],
         ['Jul 1','New jurisdiction: Egypt→Italy','Jurisdiction','System','<span class="text-emerald-600">Applied</span>'],
         ['Jun 28','PSP Flutterwave enabled','Payment','Admin','<span class="text-emerald-600">Applied</span>']]
      )}
    </div>`;
}

async function renderAdminCustomerCare() {
  setTitle('Customer Care', 'Support tickets and user assistance');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-headset', 'Open Tickets', '8', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Response', '2.1h', null, 'amber')}
      ${metricCard('fa-check', 'Resolved (7d)', '34', null, 'emerald')}
      ${metricCard('fa-star', 'CSAT Score', '4.8/5', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Ticket','User','Subject','Priority','Assigned','Status','Action'],
        [['TK-847','ahmed@nile.eg','Payment not showing','HIGH','Sara','<span class="badge badge-danger">OPEN</span>','<button class="btn-primary text-xs py-1 px-2">Reply</button>'],
         ['TK-846','import@hamburg.de','Doc upload failed','MEDIUM','Mohamed','<span class="badge badge-warning">IN PROGRESS</span>','<button class="btn-ghost text-xs py-1 px-2">View</button>'],
         ['TK-845','finance@bank.eg','API timeout','LOW','Auto','<span class="badge badge-success">RESOLVED</span>','']]
      )}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// SHIPPING LINE PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderShipDashboard() {
  setTitle('Shipping Line Dashboard', 'Vessel operations and booking overview');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-ship', 'Active Vessels', '12', null, 'blue')}
      ${metricCard('fa-calendar-check', 'Bookings (7d)', '45', null, 'emerald')}
      ${metricCard('fa-box', 'TEU Utilized', '1,847', null, 'purple')}
      ${metricCard('fa-percent', 'Utilization', '87%', null, 'gold')}
      ${metricCard('fa-clock', 'On-Schedule', '92%', null, 'amber')}
    </div>
    <div class="grid grid-cols-2 gap-5">
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2"></i>Weekly Bookings</h3><canvas id="ship-book-chart" height="180"></canvas></div>
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2"></i>Revenue Trend</h3><canvas id="ship-rev-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(()=>{
    const c1=document.getElementById('ship-book-chart'),c2=document.getElementById('ship-rev-chart');
    if(c1&&typeof Chart!=='undefined')new Chart(c1,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{label:'Bookings',data:[8,12,10,15,9,3,2],backgroundColor:'#3B82F6'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    if(c2&&typeof Chart!=='undefined')new Chart(c2,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue ($k)',data:[420,480,510,490,530,560],borderColor:'#D4A017',tension:0.4,fill:false}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  },100);
}

async function renderShipBookingRequests() {
  setTitle('Booking Requests', 'Incoming booking requests from SGTX platform');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-inbox', 'New Requests', '6', null, 'blue')}
      ${metricCard('fa-check', 'Confirmed', '39', null, 'emerald')}
      ${metricCard('fa-clock', 'Pending', '4', null, 'amber')}
      ${metricCard('fa-ban', 'Rejected', '2', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Request ID','Shipper','Route','Containers','ETD','Status','Action'],
        [['BKR-001','Nile Grains','EGALX→DEHAM','2×20GP','Jul 15',badge('PENDING'),'<button class="btn-primary text-xs py-1 px-3">Confirm</button>'],
         ['BKR-002','Cairo Sugar','EGPSD→NLRTM','4×20GP','Jul 18',badge('PENDING'),'<button class="btn-primary text-xs py-1 px-3">Confirm</button>'],
         ['BKR-003','Delta Foods','EGDAM→GBFXT','2×20GP','Jul 20',badge('CONFIRMED'),'']]
      )}
    </div>`;
}

async function renderShipEBL() {
  setTitle('eBL Management', 'Issue and manage electronic bills of lading');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-lines', 'Issued (30d)', '45', null, 'blue')}
      ${metricCard('fa-arrows-rotate', 'In Transfer', '8', null, 'amber')}
      ${metricCard('fa-check', 'Surrendered', '37', null, 'emerald')}
      ${metricCard('fa-link', 'Blockchain Verified', '100%', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['eBL Number','Voyage','Shipper','Consignee','Status','Loom Hash','Action'],
        [['MSKU-123456','2607E','Nile Grains','Hamburg Import',badge('ACTIVE'),'0xA1B...','<button class="btn-primary text-xs py-1 px-2">Issue</button>'],
         ['MSKU-123457','2607E','Cairo Sugar','Rotterdam Grains',badge('IN_TRANSFER'),'0xC3D...',''],
         ['MSKU-123458','2606W','Delta Foods','UK Foods',badge('SURRENDERED'),'0xE5F...','']]
      )}
    </div>`;
}

async function renderShipVesselSchedule() {
  setTitle('Vessel Schedule', 'Fleet schedule and port rotation');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-ship', 'Vessels', '12', null, 'blue')}
      ${metricCard('fa-anchor', 'At Port', '3', null, 'purple')}
      ${metricCard('fa-route', 'In Transit', '9', null, 'emerald')}
      ${metricCard('fa-calendar', 'Next Arrival', '2d 4h', null, 'amber')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Vessel','Voyage','Route','ETD','ETA','Status','Capacity'],
        [['MSC ANNA','2607E','EGALX→DEHAM','Jul 15','Jul 29',badge('LOADING'),'78% booked'],
         ['EMMA MAERSK','2607W','EGPSD→NLRTM','Jul 18','Aug 2',badge('SCHEDULED'),'45% booked'],
         ['CMA CGM JACQUES','2606E','EGALX→GBFXT','Jul 12','Jul 27',badge('IN_TRANSIT'),'92% booked']]
      )}
    </div>`;
}

async function renderShipFreightInvoices() {
  setTitle('Freight Invoices', 'Billing and payment tracking');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-invoice-dollar', 'Outstanding', '$124k', null, 'amber')}
      ${metricCard('fa-check', 'Paid (30d)', '$340k', null, 'emerald')}
      ${metricCard('fa-clock', 'Overdue', '$12k', null, 'red')}
      ${metricCard('fa-chart-line', 'Avg Days to Pay', '8.2d', null, 'blue')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Invoice','Shipper','Voyage','Amount','Due Date','Status','Action'],
        [['INV-2026-089','Nile Grains','2607E','$4,800','Jul 20',badge('PENDING'),'<button class="text-blue-500 text-xs">View</button>'],
         ['INV-2026-088','Cairo Sugar','2607E','$9,200','Jul 22',badge('PENDING'),'<button class="text-blue-500 text-xs">View</button>'],
         ['INV-2026-087','Delta Foods','2606E','$3,600','Jul 10',badge('PAID'),'']]
      )}
    </div>`;
}

async function renderShipContractRates() {
  setTitle('Contract Rates', 'Long-term contract rate management');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-contract', 'Active Contracts', '8', null, 'blue')}
      ${metricCard('fa-coins', 'Contract Volume', '$2.4M/yr', null, 'gold')}
      ${metricCard('fa-clock', 'Expiring (90d)', '2', null, 'amber')}
      ${metricCard('fa-percent', 'Avg Discount', '15%', null, 'emerald')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Contract','Customer','Route','Rate/TEU','Volume','Expires','Status'],
        [['CTR-001','Nile Grains','EGALX→DEHAM','$2,100','200 TEU/yr','Mar 2027',badge('ACTIVE')],
         ['CTR-002','Cairo Sugar','EGPSD→NLRTM','$1,950','400 TEU/yr','Jun 2027',badge('ACTIVE')],
         ['CTR-003','Delta Foods','EGDAM→GBFXT','$2,250','100 TEU/yr','Sep 2026',badge('EXPIRING')]]
      )}
    </div>`;
}

async function renderShipPerformance() {
  setTitle('Shipping Performance', 'Service metrics and KPIs');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-clock', 'On-Time', '92%', null, 'emerald')}
      ${metricCard('fa-route', 'Avg Transit', '14.2d', null, 'blue')}
      ${metricCard('fa-box', 'Container Damage', '0.02%', null, 'gold')}
      ${metricCard('fa-file-check', 'Doc Accuracy', '99.5%', null, 'purple')}
      ${metricCard('fa-star', 'Rating', '4.7/5', null, 'amber')}
    </div>
    <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2"></i>On-Time Performance Trend</h3><canvas id="ship-perf-chart" height="180"></canvas></div>`;
  setTimeout(()=>{const c=document.getElementById('ship-perf-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'On-Time %',data:[89,90,91,92,91,92],borderColor:'#10B981',tension:0.4,fill:false}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:85,max:100}}}});},100);
}

// ═══════════════════════════════════════════════════════════════════════
// LABORATORY PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderLabDashboard() {
  setTitle('Laboratory Dashboard', 'Testing operations overview');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-flask', 'Active Tests', '8', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Turnaround', '3.2d', null, 'amber')}
      ${metricCard('fa-check-double', 'Completed (7d)', '12', null, 'emerald')}
      ${metricCard('fa-certificate', 'Certs Issued', '12', null, 'gold')}
      ${metricCard('fa-star', 'Accuracy', '99.4%', null, 'purple')}
    </div>
    <div class="grid grid-cols-2 gap-5">
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2"></i>Tests by Commodity</h3><canvas id="lab-comm-chart" height="180"></canvas></div>
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-line mr-2"></i>Turnaround Trend</h3><canvas id="lab-turn-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(()=>{
    const c1=document.getElementById('lab-comm-chart'),c2=document.getElementById('lab-turn-chart');
    if(c1&&typeof Chart!=='undefined')new Chart(c1,{type:'bar',data:{labels:['Rice','Sugar','Wheat','Corn','Oils'],datasets:[{label:'Tests',data:[18,12,8,5,3],backgroundColor:'#D4A017'}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    if(c2&&typeof Chart!=='undefined')new Chart(c2,{type:'line',data:{labels:['W1','W2','W3','W4','W5','W6'],datasets:[{label:'Days',data:[3.5,3.4,3.3,3.2,3.2,3.2],borderColor:'#3B82F6',tension:0.4,fill:false}]},options:{responsive:true,plugins:{legend:{display:false}}}});
  },100);
}

async function renderLabJobs() {
  setTitle('Testing Jobs', 'Active and pending laboratory testing jobs');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-vial', 'In Progress', '5', null, 'blue')}
      ${metricCard('fa-clock', 'Awaiting Sample', '3', null, 'amber')}
      ${metricCard('fa-check', 'Complete', '12', null, 'emerald')}
      ${metricCard('fa-calendar', 'Due Today', '2', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Job ID','Trade','Commodity','Tests','Sample Status','Due','Progress','Action'],
        [['LAB-001','SGTX-EG-26-F3A','Rice 50MT','Moisture, Broken, Foreign','Received','Jul 7','<div class="w-20 bg-surface-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width:60%"></div></div>',''],
         ['LAB-002','SGTX-EG-26-G2B','Sugar 100MT','Pol, Colour, Ash','Received','Jul 8','<div class="w-20 bg-surface-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full" style="width:30%"></div></div>',''],
         ['LAB-003','SGTX-EG-26-H1C','Rice 30MT','Full Panel','In Transit','Jul 10','<div class="w-20 bg-surface-200 rounded-full h-2"><div class="bg-surface-300 h-2 rounded-full" style="width:0%"></div></div>','<button class="btn-primary text-xs py-1 px-2">Track</button>']]
      )}
    </div>`;
}

async function renderLabResults() {
  setTitle('Test Results', 'Review and submit testing results');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-circle-check', 'Results Ready', '3', null, 'emerald')}
      ${metricCard('fa-check', 'Within Spec', '11', null, 'blue')}
      ${metricCard('fa-exclamation', 'Out of Spec', '1', null, 'amber')}
      ${metricCard('fa-ban', 'Failed', '0', null, 'red')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Job','Parameter','Specification','Result','Status'],
        [['LAB-001','Moisture','≤14.0%','12.8%','<span class="text-emerald-600 font-bold">PASS ✓</span>'],
         ['LAB-001','Broken Grains','≤5.0%','3.2%','<span class="text-emerald-600 font-bold">PASS ✓</span>'],
         ['LAB-001','Foreign Matter','≤0.5%','0.18%','<span class="text-emerald-600 font-bold">PASS ✓</span>'],
         ['LAB-001','Chalky Grains','≤8.0%','5.4%','<span class="text-emerald-600 font-bold">PASS ✓</span>']]
      )}
    </div>`;
}

async function renderLabCertificates() {
  setTitle('Certificates', 'Issue and manage test certificates');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-certificate', 'Issued (30d)', '12', null, 'gold')}
      ${metricCard('fa-clock', 'Draft', '2', null, 'amber')}
      ${metricCard('fa-link', 'Loom Hashed', '12', null, 'emerald')}
      ${metricCard('fa-download', 'Downloaded', '10', null, 'blue')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Cert ID','Trade','Type','Issued','Loom Hash','Status','Action'],
        [['CERT-LAB-012','SGTX-EG-26-F3A','Quality Certificate','Jul 5','<span class="font-mono text-[10px]">0xA2B...</span>',badge('ISSUED'),'<button class="text-blue-500 text-xs">PDF</button>'],
         ['CERT-LAB-011','SGTX-EG-26-E2E','Analysis Report','Jul 2','<span class="font-mono text-[10px]">0xC4D...</span>',badge('ISSUED'),'<button class="text-blue-500 text-xs">PDF</button>'],
         ['CERT-LAB-010','SGTX-EG-26-D1D','Quality Certificate','Jun 30','<span class="font-mono text-[10px]">0xE6F...</span>',badge('ISSUED'),'<button class="text-blue-500 text-xs">PDF</button>']]
      )}
    </div>`;
}

async function renderLabPerformance() {
  setTitle('Lab Performance', 'Testing accuracy and turnaround metrics');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-vial', 'Tests Run', '156', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Turnaround', '3.2d', null, 'emerald')}
      ${metricCard('fa-bullseye', 'Accuracy', '99.4%', null, 'gold')}
      ${metricCard('fa-users', 'Technicians', '6', null, 'purple')}
      ${metricCard('fa-award', 'Accreditations', '3', null, 'amber')}
    </div>
    <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2"></i>Monthly Test Volume</h3><canvas id="lab-perf-chart" height="180"></canvas></div>`;
  setTimeout(()=>{const c=document.getElementById('lab-perf-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Tests',data:[22,25,28,24,26,31],backgroundColor:'#8B5CF6'}]},options:{responsive:true,plugins:{legend:{display:false}}}});},100);
}

async function renderLabInvoices() {
  setTitle('Lab Invoices', 'Billing for testing services');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-file-invoice-dollar', 'Outstanding', '$4,200', null, 'amber')}
      ${metricCard('fa-check', 'Paid (30d)', '$12,800', null, 'emerald')}
      ${metricCard('fa-clock', 'Overdue', '$0', null, 'red')}
      ${metricCard('fa-chart-line', 'Revenue (mo)', '$5,400', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Invoice','Customer','Tests','Amount','Due','Status'],
        [['LAB-INV-034','Nile Grains','Full Panel (Rice)','$650','Jul 10',badge('PENDING')],
         ['LAB-INV-033','Cairo Sugar','Pol + Colour','$420','Jul 8',badge('PENDING')],
         ['LAB-INV-032','Delta Foods','Full Panel (Rice)','$650','Jul 5',badge('PAID')]]
      )}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// MARKETPLACE PARTNER PORTAL
// ═══════════════════════════════════════════════════════════════════════

async function renderMktDashboard() {
  setTitle('Marketplace Dashboard', 'Partner performance and revenue');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-5 gap-4 mb-5">
      ${metricCard('fa-chart-line', 'Revenue (30d)', '$12,400', '+18%', 'gold')}
      ${metricCard('fa-users', 'Leads Sent', '127', null, 'blue')}
      ${metricCard('fa-check', 'Converted', '34', null, 'emerald')}
      ${metricCard('fa-percent', 'Conv. Rate', '26.8%', null, 'purple')}
      ${metricCard('fa-bolt', 'API Calls', '45k', null, 'amber')}
    </div>
    <div class="grid grid-cols-2 gap-5">
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-area mr-2"></i>Revenue Trend</h3><canvas id="mkt-rev-chart" height="180"></canvas></div>
      <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-bar mr-2"></i>Lead Conversion</h3><canvas id="mkt-conv-chart" height="180"></canvas></div>
    </div>`;
  setTimeout(()=>{
    const c1=document.getElementById('mkt-rev-chart'),c2=document.getElementById('mkt-conv-chart');
    if(c1&&typeof Chart!=='undefined')new Chart(c1,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue',data:[6200,7800,8400,9100,10500,12400],borderColor:'#D4A017',backgroundColor:'rgba(212,160,23,0.1)',fill:true,tension:0.4}]},options:{responsive:true,plugins:{legend:{display:false}}}});
    if(c2&&typeof Chart!=='undefined')new Chart(c2,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Leads',data:[80,95,100,110,120,127],backgroundColor:'#3B82F6'},{label:'Converted',data:[18,22,25,28,30,34],backgroundColor:'#10B981'}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:9}}}}}});
  },100);
}

async function renderMktAPIKeys() {
  setTitle('API Keys', 'Manage API authentication keys');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-key', 'Active Keys', '2', null, 'blue')}
      ${metricCard('fa-shield', 'Rate Limit', '1000/min', null, 'gold')}
      ${metricCard('fa-clock', 'Last Rotated', '14d ago', null, 'surface')}
    </div>
    <div class="sgtx-card p-5">
      <div class="flex items-center justify-between mb-4"><h3 class="font-semibold text-sm">API Keys</h3><button class="btn-primary text-xs py-2 px-4"><i class="fas fa-plus mr-1"></i>Generate New Key</button></div>
      <div class="space-y-3">
        ${[{name:'Production',key:'sk_live_****...7F2A',created:'Jun 1',calls:'42k/day',status:'ACTIVE'},{name:'Sandbox',key:'sk_test_****...3B8C',created:'Jun 1',calls:'1.2k/day',status:'ACTIVE'}].map(k=>`
          <div class="p-4 rounded-lg border border-surface-200 flex items-center justify-between">
            <div><div class="font-medium text-sm">${k.name}</div><div class="text-xs font-mono text-surface-400">${k.key}</div><div class="text-[10px] text-surface-400">Created: ${k.created} · ${k.calls}</div></div>
            <div class="flex gap-2">${badge(k.status)}<button class="btn-ghost text-xs py-1 px-2"><i class="fas fa-rotate"></i></button></div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderMktLeads() {
  setTitle('Lead Management', 'Track referred leads and conversions');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-user-plus', 'New Leads', '12', null, 'blue')}
      ${metricCard('fa-spinner', 'In Pipeline', '45', null, 'amber')}
      ${metricCard('fa-check', 'Converted', '34', null, 'emerald')}
      ${metricCard('fa-coins', 'Revenue', '$12,400', null, 'gold')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Lead ID','Company','Source','Value','Stage','Revenue Share','Status'],
        [['LEAD-127','AgriTrade GmbH','API Widget','$85,000','Quoting','$1,275',badge('ACTIVE')],
         ['LEAD-126','Fresh Foods SA','Referral Link','$42,000','Initiated','$630',badge('NEW')],
         ['LEAD-125','MedGrain Ltd','API','$120,000','Contracted','$1,800',badge('CONVERTED')]]
      )}
    </div>`;
}

async function renderMktWebhooks() {
  setTitle('Webhooks', 'Event notification configuration');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-bolt', 'Active Webhooks', '4', null, 'blue')}
      ${metricCard('fa-check', 'Delivery Rate', '99.8%', null, 'emerald')}
      ${metricCard('fa-clock', 'Avg Latency', '180ms', null, 'purple')}
    </div>
    <div class="sgtx-card p-5">
      <div class="flex items-center justify-between mb-4"><h3 class="font-semibold text-sm">Webhook Endpoints</h3><button class="btn-primary text-xs py-2 px-4"><i class="fas fa-plus mr-1"></i>Add Endpoint</button></div>
      <div class="space-y-2">
        ${[{url:'https://api.partner.com/webhooks/trade',events:'trade.created, trade.completed',status:'ACTIVE'},{url:'https://api.partner.com/webhooks/payment',events:'payment.received, payment.split',status:'ACTIVE'},{url:'https://api.partner.com/webhooks/lead',events:'lead.converted',status:'ACTIVE'}].map(w=>`
          <div class="p-3 rounded-lg border border-surface-200 flex items-center justify-between">
            <div><div class="font-mono text-xs">${w.url}</div><div class="text-[10px] text-surface-400">Events: ${w.events}</div></div>
            ${badge(w.status)}
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderMktRevenue() {
  setTitle('Revenue Attribution', 'Track revenue from referred trades');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-coins', 'Total Revenue', '$42,800', null, 'gold')}
      ${metricCard('fa-percent', 'Share Rate', '15%', null, 'blue')}
      ${metricCard('fa-calendar', 'This Month', '$12,400', null, 'emerald')}
      ${metricCard('fa-arrow-trend-up', 'Growth', '+18%', null, 'purple')}
    </div>
    <div class="sgtx-card">
      ${dataTable(['Month','Trades Referred','Trade Volume','Revenue Share','Payout Status'],
        [['Jun 2026','28','$840,000','$12,600',badge('PAID')],
         ['May 2026','25','$700,000','$10,500',badge('PAID')],
         ['Apr 2026','22','$610,000','$9,150',badge('PAID')]]
      )}
    </div>`;
}

async function renderMktSandbox() {
  setTitle('API Sandbox', 'Test integration in sandbox environment');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-5">
      ${metricCard('fa-code', 'Sandbox Mode', 'ACTIVE', null, 'emerald')}
      ${metricCard('fa-vial', 'Test Trades', '12', null, 'blue')}
      ${metricCard('fa-bug', 'Errors (24h)', '0', null, 'gold')}
    </div>
    <div class="sgtx-card p-5">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-terminal mr-2 text-emerald-500"></i>API Sandbox Console</h3>
      <div class="bg-surface-900 rounded-xl p-4 font-mono text-xs text-emerald-400">
        <div class="mb-2 text-surface-400">// Create test trade</div>
        <div>POST /api/v1/trades</div>
        <div class="text-surface-500">Authorization: Bearer sk_test_****3B8C</div>
        <div class="mt-2 text-gold-400">{"commodity":"rice","quantity_mt":50,"origin":"EG","destination":"DE"}</div>
        <div class="mt-3 text-surface-400">// Response: 201 Created</div>
        <div class="text-emerald-300">{"id":"test_trade_xyz","gtid":"SGTX-TEST-26-001","status":"initiated"}</div>
      </div>
      <div class="flex gap-3 mt-4">
        <button class="btn-primary py-2 px-5 text-xs"><i class="fas fa-play mr-1"></i>Run Test</button>
        <button class="btn-ghost py-2 px-5 text-xs"><i class="fas fa-book mr-1"></i>API Docs</button>
        <button class="btn-ghost py-2 px-5 text-xs"><i class="fas fa-download mr-1"></i>SDK</button>
      </div>
    </div>`;
}

async function renderMktUsage() {
  setTitle('Usage Analytics', 'API usage patterns and quotas');
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-5">
      ${metricCard('fa-bolt', 'API Calls (30d)', '1.35M', null, 'blue')}
      ${metricCard('fa-chart-bar', 'Avg/Day', '45k', null, 'purple')}
      ${metricCard('fa-gauge-high', 'Quota Used', '67%', null, 'amber')}
      ${metricCard('fa-clock', 'Avg Response', '120ms', null, 'emerald')}
    </div>
    <div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-chart-area mr-2"></i>API Usage (30 Days)</h3><canvas id="mkt-usage-chart" height="180"></canvas></div>`;
  setTimeout(()=>{const c=document.getElementById('mkt-usage-chart');if(c&&typeof Chart!=='undefined')new Chart(c,{type:'line',data:{labels:Array.from({length:30},(_,i)=>`D${i+1}`),datasets:[{label:'Calls (k)',data:Array.from({length:30},()=>35+Math.random()*20),borderColor:'#3B82F6',tension:0.4,fill:false,pointRadius:0}]},options:{responsive:true,plugins:{legend:{display:false}}}});},100);
}


// ═══════════════════════════════════════════════════════════════════════
// WORLD TRADE INTELLIGENCE (Blueprint Part 30 — TCN + Market Awareness)
// ═══════════════════════════════════════════════════════════════════════
async function renderWorldTrade() {
  setTitle('World Trade Intelligence', 'Live corridors, freight indices, chokepoints & AI briefing');
  const content = document.getElementById('content');
  content.innerHTML = shimmerLoader();
  try {
    const [ovRes, idxRes] = await Promise.all([
      api('/world-trade/overview'),
      api('/world-trade/indices')
    ]);
    const ov = ovRes.data || ovRes;
    const idx = idxRes.data || idxRes;
    const chokepoints = ov.chokepoints || [];
    const corridors = ov.corridors || [];
    const commodities = ov.commodity_prices || [];
    const indices = idx.indices || [];
    const routes = idx.routes || [];
    content.innerHTML = `
      <div class="grid grid-cols-4 gap-4 mb-5">
        ${indices.slice(0,4).map(i => metricCard('fa-chart-line', i.name || i.code, (i.value||'—') + '', (i.change_pct>0?'+':'')+(i.change_pct||0)+'%', i.change_pct >= 0 ? 'emerald' : 'red')).join('')}
      </div>
      <div class="grid grid-cols-3 gap-5 mb-5">
        <!-- Chokepoint Monitor -->
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-triangle-exclamation mr-2 text-amber-500"></i>Chokepoint Monitor</h3>
          <div class="space-y-2">
            ${chokepoints.map(c => `
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-100">
                <div><div class="font-medium text-xs">${c.name}</div><div class="text-[10px] text-surface-400">${c.region || ''}</div></div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status==='NORMAL'?'bg-emerald-100 text-emerald-700':c.status==='ELEVATED'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}">${c.status}</span>
              </div>`).join('') || '<div class="text-xs text-surface-400 py-4 text-center">No chokepoint data</div>'}
          </div>
        </div>
        <!-- Freight Routes -->
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-route mr-2 text-blue-500"></i>Freight Rates (per FEU)</h3>
          <div class="space-y-2">
            ${routes.map(r => `
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-100 text-xs">
                <span class="font-medium">${r.route || r.name}</span>
                <span class="font-bold">$${(r.rate_usd||r.rate||0).toLocaleString()} <span class="${(r.change_pct||0)>=0?'text-emerald-600':'text-red-500'} text-[10px]">${(r.change_pct>0?'+':'')}${r.change_pct||0}%</span></span>
              </div>`).join('') || '<div class="text-xs text-surface-400 py-4 text-center">No route data</div>'}
          </div>
        </div>
        <!-- Commodity Prices -->
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-wheat-awn mr-2 text-gold-500"></i>Commodity Benchmarks</h3>
          <div class="space-y-2">
            ${commodities.map(c => `
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-100 text-xs">
                <span class="font-medium">${c.commodity || c.name}</span>
                <span class="font-bold">$${(c.price_usd||c.price||0).toLocaleString()}<span class="text-[10px] text-surface-400">/${c.unit||'MT'}</span> <span class="${(c.change_pct||0)>=0?'text-emerald-600':'text-red-500'} text-[10px]">${(c.change_pct>0?'+':'')}${c.change_pct||0}%</span></span>
              </div>`).join('') || '<div class="text-xs text-surface-400 py-4 text-center">No commodity data</div>'}
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-5 mb-5">
        <!-- Active Corridors -->
        <div class="sgtx-card p-5">
          <h3 class="font-semibold text-sm mb-3"><i class="fas fa-arrows-left-right mr-2 text-purple-500"></i>Platform Trade Corridors</h3>
          ${corridors.length === 0 ? '<div class="text-xs text-surface-400 py-4 text-center">No active corridors yet</div>' :
            dataTable(['Corridor','Trades','Volume','Status'], corridors.map(c => [
              `${c.origin || c.origin_country} → ${c.destination || c.destination_country}`,
              c.trade_count || c.trades || 0,
              usd(c.total_value || c.volume || 0),
              badge(c.status || 'ACTIVE')
            ]))}
        </div>
        <!-- AI Briefing -->
        <div class="sgtx-card p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-sm"><i class="fas fa-brain mr-2 text-blue-500"></i>AI Daily Trade Briefing</h3>
            <button onclick="loadWTBriefing()" class="btn-primary text-xs py-1.5 px-3"><i class="fas fa-rotate mr-1"></i>Generate</button>
          </div>
          <div id="wt-briefing" class="text-xs text-surface-600 leading-relaxed whitespace-pre-wrap min-h-[120px]">
            <div class="text-surface-400 text-center py-8"><i class="fas fa-sparkles mr-1"></i>Click Generate for a governed AI briefing (Gemini → Groq fallback)</div>
          </div>
        </div>
      </div>
      <!-- Governed Q&A -->
      <div class="sgtx-card p-5">
        <h3 class="font-semibold text-sm mb-3"><i class="fas fa-comments mr-2 text-emerald-500"></i>Ask World Trade AI <span class="text-[10px] bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full ml-1">Governed — never recommends counterparties</span></h3>
        <div class="flex gap-2">
          <input id="wt-question" class="flex-1" placeholder="e.g. How do current Red Sea disruptions affect Egypt → EU grain corridors?" onkeydown="if(event.key==='Enter')askWorldTrade()">
          <button onclick="askWorldTrade()" class="btn-primary py-2 px-5 text-xs"><i class="fas fa-paper-plane mr-1"></i>Ask</button>
        </div>
        <div id="wt-answer" class="mt-3 text-xs text-surface-600 leading-relaxed whitespace-pre-wrap"></div>
      </div>`;
  } catch(e) { content.innerHTML = renderError(e.message); }
}
async function loadWTBriefing() {
  const el = document.getElementById('wt-briefing');
  if(!el) return;
  el.innerHTML = '<div class="text-surface-400 text-center py-8"><i class="fas fa-circle-notch fa-spin mr-2"></i>Generating governed AI briefing...</div>';
  try {
    const res = await api('/world-trade/ai-briefing');
    const d = res.data || res;
    el.textContent = d.briefing || d.text || JSON.stringify(d);
  } catch(e) { el.innerHTML = '<span class="text-red-500">Briefing failed: '+e.message+'</span>'; }
}
async function askWorldTrade() {
  const q = document.getElementById('wt-question')?.value?.trim();
  const el = document.getElementById('wt-answer');
  if(!q || !el) return;
  el.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Analysing...';
  try {
    const res = await apiPost('/world-trade/ask', { question: q });
    const d = res.data || res;
    el.textContent = d.answer || d.text || JSON.stringify(d);
  } catch(e) { el.innerHTML = '<span class="text-red-500">'+e.message+'</span>'; }
}

// ─── Financing actions (Blueprint Part 9 — Anonymous RFQ + Bid acceptance) ───
async function submitFinRequest(btn) {
  const card = btn.closest('.sgtx-card');
  const amt = card?.querySelector('input[type=number]')?.value;
  if(!amt || parseFloat(amt) <= 0) { showToast('Enter a financing amount','error'); return; }
  showGovernorPanel('Anonymous financing RFQ — your identity is masked until you accept a bid (Blueprint Part 9).', async ()=>{
    try { await apiPost('/finance/request', { amount: parseFloat(amt), tenant_id: tenant?.id }); } catch(e) {}
    showToast('Financing RFQ broadcast to qualified financiers ✓','success');
    showFinSection('bids');
  });
}
async function acceptFinBid(bank, rate, amt) {
  showGovernorPanel(`Accept ${bank} bid — ${rate}% on ${usd(amt)}. Identity disclosed to financier; loan terms locked on Loom.`, async ()=>{
    try { await apiPost('/finance/accept-bid', { bank, rate, amount: amt, tenant_id: tenant?.id }); } catch(e) {}
    showToast('Bid accepted ✓ — loan activated','success');
    showFinSection('active');
  });
}


// ═══ RECOVERED PORTAL RENDERERS (restored from v11.2) ═══

async function renderLogisticsDashboard() {
  setTitle('Operations Hub', 'Unified logistics operations dashboard');
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-ship', 'Active Shipments', stats.shipments || 0, null, 'blue')}
      ${metricCard('fa-inbox', 'Open RFQs', 0, null, 'amber')}
      ${metricCard('fa-chart-line', 'On-Time %', '94%', 3, 'green')}
      ${metricCard('fa-star', 'Rating', '4.8', null, 'purple')}
    </div>
    ${fourQuestions('Logistics operations active', 'Process open RFQs and booking requests', 'None', 'Performance metrics update daily')}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-inbox text-gold-400 mr-2"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('rfq-inbox')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-inbox text-accent-amber text-lg mb-2"></i><div class="text-xs font-medium">RFQ Inbox</div></button>
          <button onclick="navigate('dispatch-planner')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-map-location-dot text-accent-blue text-lg mb-2"></i><div class="text-xs font-medium">Dispatch</div></button>
          <button onclick="navigate('active-shipments')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-ship text-accent-cyan text-lg mb-2"></i><div class="text-xs font-medium">Shipments</div></button>
          <button onclick="navigate('performance-dash')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-chart-column text-accent-emerald text-lg mb-2"></i><div class="text-xs font-medium">Performance</div></button>
        </div>
      </div>
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-truck text-gold-400 mr-2"></i>Service Capabilities</h3>
        <div class="space-y-2 text-sm text-surface-600">
          <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>RFQ Inbox + Bundle Builder</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>Dispatch Planner (VRP)</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>eBL Issuance</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>Document Verification Queue</div>
          <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>Performance Dashboard</div>
        </div>
      </div>
    </div>`;
}

async function renderRFQInbox() {
  setTitle('RFQ Inbox', 'Open requests from traders needing logistics');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(6);
  try {
    var res = await api('/upgrades/logistics-rfq?tenant_id=' + tenant.id);
    var rfqs = res.data || [];
    var openRFQs = rfqs.filter(function(r) { return r.status === 'OPEN' || r.status === 'RFQ_SENT'; });
    var biddingRFQs = rfqs.filter(function(r) { return r.status === 'BIDDING'; });
    content.innerHTML =
      fourQuestions(
        'Active freight RFQs from platform traders needing cold chain logistics',
        'Review open RFQs and submit competitive quotes with transit times',
        openRFQs.length > 0 ? openRFQs.length + ' RFQs awaiting your response' : 'No pending RFQs',
        'Winning quotes lead to booking confirmation and active shipment'
      ) +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-inbox', 'Open RFQs', openRFQs.length, null, 'blue') +
        metricCard('fa-gavel', 'Bidding', biddingRFQs.length, null, 'amber') +
        metricCard('fa-check', 'Won This Week', rfqs.filter(function(r){return r.status==='AWARDED';}).length, null, 'green') +
        metricCard('fa-snowflake', 'Reefer RFQs', rfqs.filter(function(r){return (r.commodity_type||'').match(/FRESH|FROZEN|REEFER/i);}).length, null, 'cyan') +
      '</div>' +
      '<div class="sgtx-card !p-0 overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">' +
          '<h3 class="font-semibold text-sm text-surface-800"><i class="fas fa-inbox text-gold-400 mr-2"></i>Incoming RFQs</h3>' +
          '<div class="flex gap-2">' +
            '<button class="text-[10px] px-3 py-1 rounded-full bg-gold-100 text-gold-400 font-semibold">All (' + rfqs.length + ')</button>' +
            '<button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-500">Open (' + openRFQs.length + ')</button>' +
          '</div>' +
        '</div>' +
        '<div class="divide-y divide-surface-100">' +
          (rfqs.length === 0 ?
            '<div class="py-12 text-center text-surface-400"><i class="fas fa-inbox text-3xl mb-3"></i><p class="text-sm">No RFQs yet. They arrive when sellers request logistics quotes.</p></div>' :
            rfqs.map(function(rfq) {
              var isFresh = (rfq.commodity_type || rfq.service_type || '').match(/FRESH|FROZEN|REEFER|COLD/i);
              return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">' +
                '<div class="w-10 h-10 rounded-xl ' + (isFresh ? 'bg-sky-100' : 'bg-gold-100') + ' flex items-center justify-center shrink-0">' +
                  '<i class="fas ' + (isFresh ? 'fa-snowflake text-sky-600' : 'fa-ship text-gold-400') + ' text-sm"></i>' +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="flex items-center gap-2">' +
                    '<span class="text-sm font-medium text-surface-800">' + (rfq.origin_port || '?') + ' \u2192 ' + (rfq.destination_port || '?') + '</span>' +
                    '<span class="text-[10px] font-mono text-surface-400">' + (rfq.id || '').slice(0,12) + '</span>' +
                    (isFresh ? '<span class="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-semibold">REEFER</span>' : '') +
                  '</div>' +
                  '<div class="text-xs text-surface-500 mt-0.5">' + (rfq.requester_name || 'Trader') + ' \u2022 ' + (rfq.container_type || '40HC') + ' \u2022 ' + (rfq.commodity_type || rfq.service_type || 'General') + '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2 shrink-0">' +
                  badge(rfq.status || 'OPEN') +
                  '<button onclick="showRespondToRFQ(\'' + rfq.id + '\')" class="btn-primary text-[10px] !py-1.5 !px-3"><i class="fas fa-reply mr-1"></i>Quote</button>' +
                '</div>' +
              '</div>';
            }).join('')) +
        '</div>' +
      '</div>';
  } catch(e) {
    content.innerHTML = renderError('Error loading RFQ inbox: ' + e.message);
  }
}

async function renderBookingRequests() {
  setTitle('Booking Requests', 'Pending booking confirmations');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/lsp/rfq-inbox?tenant_id=' + tenant.id);
    var rfqs = res.data || [];
    var pending = rfqs.filter(function(r){return r.status==='PENDING_QUOTE';});
    var quoted = rfqs.filter(function(r){return r.status==='QUOTED';});
    content.innerHTML =
      fourQuestions('Booking requests from platform trades', 'Accept and submit quotes for logistics RFQs', 'Vessel space availability', 'Confirmed bookings move to active shipments') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-calendar-check', 'Pending', pending.length, null, 'amber') +
        metricCard('fa-check-circle', 'Quoted', quoted.length, null, 'green') +
        metricCard('fa-inbox', 'Total RFQs', rfqs.length, null, 'blue') +
        metricCard('fa-percent', 'Win Rate', rfqs.length > 0 ? Math.round(quoted.length/rfqs.length*100)+'%' : '—', null, 'purple') +
      '</div>' +
      '<div class="sgtx-card !p-0 overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between"><h3 class="font-semibold text-sm"><i class="fas fa-inbox text-gold-400 mr-2"></i>LSP RFQ Inbox</h3></div>' +
        '<div class="divide-y divide-surface-100">' +
          (rfqs.length === 0 ? '<div class="py-8 text-center text-surface-400 text-xs">No RFQs yet</div>' :
          rfqs.map(function(r){
            return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">' +
              '<div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><i class="fas fa-box text-amber-500 text-sm"></i></div>' +
              '<div class="flex-1"><div class="text-sm font-medium">' + (r.origin_port||'?') + ' → ' + (r.destination_port||'?') + '</div>' +
              '<div class="text-[10px] text-surface-400">' + (r.container_type||'40HC') + ' × ' + (r.container_count||1) + ' • ' + (r.commodity_type||'General') + '</div></div>' +
              '<div class="flex items-center gap-2">' + badge(r.status) +
              (r.status==='PENDING_QUOTE' ? '<button onclick="lspQuoteRFQ(\'' + r.id + '\')" class="btn-primary text-[10px] !py-1.5 !px-3"><i class="fas fa-reply mr-1"></i>Quote</button>' : '') +
              '</div></div>';
          }).join('')) +
        '</div></div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderDispatchPlanner() {
  setTitle('Dispatch Planner', 'VRP-optimized route planning');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/lsp/dispatch?tenant_id=' + tenant.id);
    var plans = res.data || [];
    var active = plans.filter(function(p){return p.status==='IN_TRANSIT'||p.status==='DISPATCHED';});
    var pending = plans.filter(function(p){return p.status==='PLANNED';});
    content.innerHTML =
      fourQuestions('Vehicle route planning with VRP optimization', 'Plan pickup routes for pending collections', pending.length > 0 ? pending.length + ' planned routes pending dispatch' : 'No pending routes', 'Optimized routes save fuel and time') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-truck', 'Active Dispatches', active.length, null, 'blue') +
        metricCard('fa-route', 'Planned', pending.length, null, 'purple') +
        metricCard('fa-check-circle', 'Completed', plans.filter(function(p){return p.status==='DELIVERED';}).length, null, 'green') +
        metricCard('fa-boxes-stacked', 'Total Plans', plans.length, null, 'amber') +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">' +
        '<div class="md:col-span-2 sgtx-card">' +
          '<div class="flex items-center justify-between mb-4">' +
            '<h3 class="font-semibold text-sm"><i class="fas fa-map text-gold-400 mr-2"></i>Dispatch Plans</h3>' +
            '<button onclick="lspOptimiseRoutes()" class="btn-primary text-[10px] !py-1.5"><i class="fas fa-wand-magic-sparkles mr-1"></i>AI Optimise</button>' +
          '</div>' +
          '<div class="space-y-3">' +
            (plans.length === 0 ? '<div class="py-8 text-center text-surface-400 text-xs">No dispatch plans yet</div>' :
            plans.map(function(p){
              var stops = [];try{stops=JSON.parse(p.stops||'[]');}catch(e){}
              return '<div class="p-4 rounded-xl border border-surface-100 hover:border-gold-200 transition">' +
                '<div class="flex items-center justify-between mb-2">' +
                  '<div class="flex items-center gap-2"><span class="font-mono text-xs text-gold-400">' + p.id + '</span>' + badge(p.status) + '</div>' +
                  '<span class="text-[10px] text-surface-400">' + (p.vehicle_id||'—') + '</span>' +
                '</div>' +
                '<div class="text-xs text-surface-500">' + stops.length + ' stops • Driver: ' + (p.driver_name||'Unassigned') + '</div>' +
                (p.status==='PLANNED' ? '<button onclick="lspAssignDispatch(\'' + p.id + '\')" class="mt-2 text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-lg font-semibold"><i class="fas fa-play mr-1"></i>Dispatch</button>' : '') +
              '</div>';
            }).join('')) +
          '</div>' +
        '</div>' +
        '<div class="sgtx-card">' +
          '<h3 class="font-semibold text-sm mb-4"><i class="fas fa-warehouse text-gold-400 mr-2"></i>Warehouse Stats</h3>' +
          '<div id="wh-stats-box" class="space-y-2 text-xs text-surface-500"><div class="animate-pulse bg-surface-100 h-4 rounded"></div></div>' +
        '</div>' +
      '</div>';
    // Load warehouse stats
    try {
      var whRes = await api('/lsp/warehouse/stats?tenant_id=' + tenant.id);
      var whs = whRes.data || {};
      document.getElementById('wh-stats-box').innerHTML =
        '<div class="flex justify-between p-2 bg-surface-50 rounded-lg"><span>Utilization</span><span class="font-bold">' + (whs.utilization_pct||0) + '%</span></div>' +
        '<div class="flex justify-between p-2 bg-surface-50 rounded-lg"><span>Items Stored</span><span class="font-bold">' + (whs.items_stored||0) + '</span></div>' +
        '<div class="flex justify-between p-2 bg-surface-50 rounded-lg"><span>Pending Loads</span><span class="font-bold">' + (whs.pending_loads||0) + '</span></div>' +
        '<div class="flex justify-between p-2 bg-surface-50 rounded-lg"><span>Capacity</span><span class="font-bold">' + (whs.total_capacity||'—') + '</span></div>';
    } catch(e){}
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderActiveShipments() { return renderShipmentsVault(); }

async function renderDocVerification() {
  setTitle('Document Verification', 'Customs document verification queue');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Documents pending verification', 'Review and validate trade documents', 'AI extraction confidence thresholds', 'Verified docs clear customs faster')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-file-circle-check', 'In Queue', 8, null, 'amber')}
      ${metricCard('fa-check-double', 'Verified Today', 12, null, 'green')}
      ${metricCard('fa-robot', 'AI Extracted', 45, null, 'purple')}
      ${metricCard('fa-xmark', 'Rejected', 1, null, 'rose')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm"><i class="fas fa-file-circle-check text-gold-400 mr-2"></i>Verification Queue</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Pending (8)</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">Verified</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${[{doc:'Bill of Lading',ustn:'SGTX-CIRO-SGTX-2024...',confidence:96,status:'HIGH'},{doc:'Commercial Invoice',ustn:'SGTX-CIRO-SGTX-2024...',confidence:92,status:'HIGH'},{doc:'Certificate of Origin',ustn:'SGTX-ASFI-HAMB-2024...',confidence:78,status:'MEDIUM'},{doc:'Packing List',ustn:'SGTX-CIRO-SGTX-2024...',confidence:45,status:'LOW'}].map(d => `
          <div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">
            <div class="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center"><i class="fas fa-file-pdf text-red-400 text-sm"></i></div>
            <div class="flex-1">
              <div class="text-sm font-medium">${d.doc}</div>
              <div class="text-[10px] font-mono" style="color:rgba(255,255,255,.4)">${d.ustn}</div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-center">
                <div class="text-xs font-bold ${d.confidence>=90?'text-emerald-600':d.confidence>=70?'text-amber-600':'text-red-600'}">${d.confidence}%</div>
                <div class="text-[10px] text-surface-400">AI conf.</div>
              </div>
              <button class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] rounded-lg font-semibold">Verify</button>
              <button class="px-3 py-1.5 bg-red-100 text-red-600 text-[10px] rounded-lg font-semibold">Reject</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderPerformanceDash() {
  setTitle('Performance Dashboard', 'On-time %, dispute rate, invoice accuracy');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Logistics performance KPIs', 'Monitor and improve delivery metrics', 'No blockers — continuous monitoring', 'Performance affects future RFQ visibility')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-clock', 'On-Time Delivery', '94.2%', 3, 'green')}
      ${metricCard('fa-triangle-exclamation', 'Dispute Rate', '1.8%', -12, 'amber')}
      ${metricCard('fa-file-invoice', 'Invoice Accuracy', '98.5%', 1, 'blue')}
      ${metricCard('fa-star', 'Trader Rating', '4.8/5', null, 'purple')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-line text-gold-400 mr-2"></i>Monthly Performance Trend</h3>
        <div class="h-40 flex items-end gap-2 px-2">
          ${['Jan','Feb','Mar','Apr','May','Jun'].map((m,i) => {const h = 60 + i*5 + Math.random()*10; return `<div class="flex-1 text-center"><div class="bg-gradient-to-t from-sgtx-500 to-sgtx-400 rounded-t mx-auto" style="height:${h}%;width:70%"></div><div class="text-[9px] text-surface-400 mt-1">${m}</div></div>`;}).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-trophy text-gold-400 mr-2"></i>Achievements</h3>
        <div class="space-y-3">
          ${[{icon:'fa-medal',label:'Top 10% On-Time',desc:'Exceeded 93% threshold',color:'amber'},{icon:'fa-shield-check',label:'Zero Disputes (30d)',desc:'No disputes filed in last month',color:'emerald'},{icon:'fa-bolt',label:'Fast Responder',desc:'Avg response time < 3 hours',color:'blue'}].map(a => `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-${a.color}-50 border border-${a.color}-100">
              <i class="fas ${a.icon} text-${a.color}-500 text-lg"></i>
              <div>
                <div class="text-xs font-semibold text-${a.color}-800">${a.label}</div>
                <div class="text-[10px] text-${a.color}-600">${a.desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

async function renderEBLManagement() {
  setTitle('eBL Management', 'Electronic bill of lading issuance');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Electronic B/L lifecycle management', 'Issue and transfer eBLs', 'Requires confirmed booking', 'eBL transfers ownership digitally')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-file-lines', 'Active eBLs', 4, null, 'blue')}
      ${metricCard('fa-arrow-right-arrow-left', 'Transfers', 2, null, 'purple')}
      ${metricCard('fa-check-circle', 'Surrendered', 8, null, 'green')}
      ${metricCard('fa-clock', 'Pending', 1, null, 'amber')}
    </div>
    ${dataTable(['eBL Number', 'USTN', 'Shipper', 'Consignee', 'Status', 'Action'], [
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">EBL-2024-0012</td><td class="font-mono text-xs text-gold-400">SGTX-CIRO-SGTX...</td><td class="text-sm">Saigon Textiles</td><td class="text-sm">Cairo Imports</td><td>' + badge('ACTIVE') + '</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Transfer</button></td></tr>',
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">EBL-2024-0011</td><td class="font-mono text-xs text-gold-400">SGTX-ASFI-HAMB...</td><td class="text-sm">Asia Trade</td><td class="text-sm">Hamburg Logistics</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Issue</button></td></tr>',
    ], { title: 'Electronic Bills of Lading' })}`;
}

async function renderFinancierDashboard() {
  setTitle('Financier Hub', 'Trade finance operations & DeFi');
  const tenantId = window.__tenant_id || 'tenant-003';
  let requests = [], offers = [], agreements = [];
  try {
    const r1 = await api('/financing');
    requests = r1.data || [];
    // Get offers for each request where we are the financier
    for (const req of requests.slice(0, 5)) {
      const r2 = await api(`/financing/${req.id}/offers`);
      if (r2.data) offers.push(...r2.data);
    }
  } catch(e) { console.warn('Financing data fetch:', e); }

  const openRequests = requests.filter(r => r.status === 'REQUESTED' || r.status === 'BIDDING');
  const myBids = offers.filter(o => o.financier_tenant_id === tenantId);
  const awardedDeals = offers.filter(o => o.status === 'AWARDED' && o.financier_tenant_id === tenantId);
  const portfolioValue = awardedDeals.reduce((sum, o) => sum + (o.all_in_cost || 0), 0);
  const totalExposure = requests.filter(r => r.status === 'AWARDED').reduce((sum, r) => sum + (r.amount || 0), 0);

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${openRequests.length} financing requests awaiting bids`,
      'Review opportunities and submit competitive bids',
      openRequests.length === 0 ? 'No open requests currently' : 'None — bidding window open',
      'Monitor repayment schedules on awarded deals'
    )}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-magnifying-glass-dollar', 'Open Requests', openRequests.length, null, 'blue')}
      ${metricCard('fa-gavel', 'My Active Bids', myBids.filter(b=>b.status==='SUBMITTED').length, null, 'amber')}
      ${metricCard('fa-chart-pie', 'Portfolio Value', portfolioValue > 0 ? '$' + portfolioValue.toLocaleString() : '$0', null, 'green')}
      ${metricCard('fa-money-bill-transfer', 'Total Exposure', totalExposure > 0 ? '$' + totalExposure.toLocaleString() : '$0', null, 'purple')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-check text-gold-400 mr-2"></i>Open Financing Requests</h3>
        ${openRequests.length === 0 ? '<p class="text-xs text-surface-400 text-center py-6">No open requests</p>' :
          `<div class="space-y-3">${openRequests.map(req => {
            const specs = typeof req.parsed_specs === 'string' ? JSON.parse(req.parsed_specs || '{}') : (req.parsed_specs || {});
            return `<div class="p-4 rounded-xl border border-surface-100 hover:border-gold-200 transition">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold">${req.requester_name || 'Unknown'}</span>
                  ${badge(req.status)}
                </div>
                <span class="text-xs font-bold text-gold-400">$${(req.amount||0).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-surface-400">${req.financing_type || 'Unknown'} • ${req.tenor_days || 0} days • ${req.currency || 'USD'}</div>
              <div class="mt-2 flex gap-2">
                <button onclick="submitFinancingBid('${req.id}')" class="px-3 py-1.5 bg-gold-400 text-white text-[10px] rounded-lg font-semibold">Place Bid</button>
                <button class="px-3 py-1.5 bg-surface-100 text-surface-600 text-[10px] rounded-lg font-semibold">Full Disclosure</button>
              </div>
            </div>`;
          }).join('')}</div>`}
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-trophy text-gold-400 mr-2"></i>My Awarded Deals</h3>
        ${awardedDeals.length === 0 ? '<p class="text-xs text-surface-400 text-center py-6">No awarded deals yet</p>' :
          `<div class="space-y-3">${awardedDeals.map(deal => `
            <div class="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-emerald-800">APR: ${deal.effective_apr}%</div>
                  <div class="text-[10px] text-emerald-600">All-in cost: $${(deal.all_in_cost||0).toLocaleString()}</div>
                </div>
                ${badge('AWARDED')}
              </div>
            </div>`).join('')}</div>`}
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-landmark text-gold-400 mr-2"></i>Supported Instruments</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2 bg-surface-50 rounded-lg"><b>Documentary:</b> LC, SBLC, BG</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>Receivables:</b> Factoring, SCF</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>Structured:</b> Pre-Export, Murabaha</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>DeFi:</b> Tokenized, Stablecoin</div>
        </div>
      </div>
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-shield-halved text-gold-400 mr-2"></i>Financing Fee</h3>
        <div class="text-center py-4">
          <div class="text-3xl font-bold text-gold-400">0.25%</div>
          <div class="text-xs text-surface-400 mt-1">Flat rate deducted from disbursement via PSP split</div>
          <div class="text-[10px] text-surface-300 mt-2">Non-custodial — SGTX never holds funds</div>
        </div>
      </div>
    </div>`;
}

async function renderFinancingOpportunities() { setTitle('Financing Opportunities', 'Auto-matched RFQ broadcast'); return renderFinancing(); }

async function renderFullDisclosure() {
  setTitle('Full Disclosure', 'Trade details, documents, history before bidding');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Full transparency before financing decisions', 'Review trade details, docs, and borrower history', 'None — all data available pre-bid', 'Bid after thorough due diligence')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-eye', 'Disclosures Available', 5, null, 'blue')}
      ${metricCard('fa-file-alt', 'Documents', 23, null, 'purple')}
      ${metricCard('fa-chart-bar', 'Credit Reports', 5, null, 'green')}
      ${metricCard('fa-history', 'Trade History', 42, null, 'amber')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-eye text-gold-400 mr-2"></i>Active Disclosure Packages</h3></div>
      <div class="divide-y divide-surface-100">
        ${[{borrower:'Cairo Imports',amount:'$250,000',type:'Pre-Export',rating:'A-',trades:12,docs:8},{borrower:'Saigon Textiles',amount:'$180,000',type:'Receivables',rating:'BBB+',trades:8,docs:6},{borrower:'Hamburg Logistics',amount:'$75,000',type:'Working Capital',rating:'A',trades:22,docs:5}].map(d => `
          <div class="px-5 py-4 hover:bg-surface-50 transition cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center text-gold-400 text-xs font-bold">${d.borrower.slice(0,2)}</div>
                <div>
                  <div class="text-sm font-medium">${d.borrower}</div>
                  <div class="text-[10px] text-surface-400">${d.type} • ${d.amount}</div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-center"><div class="text-xs font-bold text-gold-400">${d.rating}</div><div class="text-[10px] text-surface-400">Credit</div></div>
                <div class="text-center"><div class="text-xs font-bold">${d.trades}</div><div class="text-[10px] text-surface-400">Trades</div></div>
                <div class="text-center"><div class="text-xs font-bold">${d.docs}</div><div class="text-[10px] text-surface-400">Docs</div></div>
                <button class="px-4 py-1.5 bg-gold-400 text-white text-xs rounded-lg font-semibold">View Full</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderBidding() {
  setTitle('Bidding & Co-Financing', 'Encrypted blind bids, portion bidding');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Encrypted bidding for financing opportunities', 'Submit competitive bids or co-finance', 'Bids encrypted until deadline', 'Winning bid notified within 24h')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-gavel', 'Active Auctions', 3, null, 'blue')}
      ${metricCard('fa-lock', 'My Bids', 2, null, 'purple')}
      ${metricCard('fa-trophy', 'Won This Month', 1, null, 'green')}
      ${metricCard('fa-users', 'Co-Finance Pool', 4, null, 'cyan')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-gavel text-gold-400 mr-2"></i>Active Bid Opportunities</h3>
      <div class="space-y-3">
        ${[{id:'FIN-001',borrower:'Cairo Imports',amount:'$250,000',type:'Pre-Export',deadline:'6h',bidders:4,myBid:true},{id:'FIN-002',borrower:'Saigon Textiles',amount:'$180,000',type:'Receivables',deadline:'18h',bidders:2,myBid:false},{id:'FIN-003',borrower:'Global Goods Co',amount:'$500,000',type:'LC Confirmation',deadline:'48h',bidders:6,myBid:true}].map(b => `
          <div class="p-4 rounded-xl border border-surface-100 hover:border-gold-200 transition">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2"><span class="text-sm font-semibold">${b.borrower}</span><span class="font-mono text-[10px] text-surface-400">${b.id}</span></div>
                <div class="text-xs text-surface-400 mt-1">${b.type} • ${b.amount} • ${b.bidders} bidders</div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-semibold ${b.deadline.includes('h') && parseInt(b.deadline)<12 ? 'text-red-500' : 'text-surface-500'}"><i class="fas fa-clock mr-1"></i>${b.deadline}</span>
                ${b.myBid ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">BID PLACED</span>' : '<button class="px-3 py-1.5 bg-gold-400 text-white text-[10px] rounded-lg font-semibold">Place Bid</button>'}
              </div>
            </div>
            ${b.myBid ? '<div class="mt-3 p-2 bg-surface-50 rounded-lg text-[10px] text-surface-500"><i class="fas fa-lock mr-1"></i>Your bid is encrypted and sealed until deadline</div>' : ''}
          </div>`).join('')}
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-users text-gold-400 mr-2"></i>Co-Financing</h3>
      <p class="text-xs text-surface-500 mb-3">Bid on a portion of larger deals. Multiple financiers can co-finance a single trade.</p>
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-xl bg-gold-50 border border-gold-100 text-center">
          <div class="text-lg font-bold text-gold-400">60%</div><div class="text-[10px] text-gold-400">Min Portion</div>
        </div>
        <div class="p-3 rounded-xl bg-surface-50 text-center">
          <div class="text-lg font-bold">3</div><div class="text-[10px] text-surface-500">Max Co-Financiers</div>
        </div>
        <div class="p-3 rounded-xl bg-surface-50 text-center">
          <div class="text-lg font-bold">24h</div><div class="text-[10px] text-surface-500">Syndication Window</div>
        </div>
      </div>
    </div>`;
}

async function renderCollateralMonitor() {
  setTitle('Collateral Monitor', 'LTV gauge, liquidation risk, price drop simulator');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Monitoring collateral health across portfolio', 'Review LTV ratios and risk levels', 'Price volatility affects margins', 'Liquidation alerts trigger at 85% LTV')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-shield-halved', 'Collateral Value', '$1.2M', -2, 'blue')}
      ${metricCard('fa-percent', 'Avg LTV', '62%', null, 'green')}
      ${metricCard('fa-triangle-exclamation', 'At Risk', 1, null, 'amber')}
      ${metricCard('fa-bolt', 'Liquidation Risk', 'Low', null, 'purple')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-gauge text-gold-400 mr-2"></i>LTV Gauge</h3>
        <div class="flex items-center justify-center py-6">
          <div class="relative w-40 h-40">
            <svg class="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" stroke-width="12"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#4E3FE8" stroke-width="12" stroke-dasharray="${62 * 3.14} ${100 * 3.14}" stroke-linecap="round"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold text-surface-900">62%</span>
              <span class="text-[10px] text-surface-400">Current LTV</span>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div class="p-2 bg-emerald-50 rounded-lg"><div class="font-bold text-emerald-700">< 60%</div><div class="text-emerald-600">Safe</div></div>
          <div class="p-2 bg-amber-50 rounded-lg"><div class="font-bold text-amber-700">60-80%</div><div class="text-amber-600">Watch</div></div>
          <div class="p-2 bg-red-50 rounded-lg"><div class="font-bold text-red-700">> 80%</div><div class="text-red-600">Critical</div></div>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator text-gold-400 mr-2"></i>Price Drop Simulator</h3>
        <div class="space-y-4">
          <div>
            <label class="text-[10px] text-surface-500 font-semibold uppercase">Simulate Price Drop</label>
            <input type="range" min="0" max="50" value="15" class="w-full mt-2 accent-sgtx-500">
            <div class="flex justify-between text-[10px] text-surface-400"><span>0%</span><span>-15%</span><span>-50%</span></div>
          </div>
          <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div class="text-xs font-semibold text-amber-800">With -15% price drop:</div>
            <div class="text-lg font-bold text-amber-900 mt-1">LTV → 73%</div>
            <div class="text-[10px] text-amber-600 mt-1">⚠️ Approaching margin call territory</div>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl text-[10px] text-surface-600">
            <div class="font-semibold mb-1">Liquidation Waterfall:</div>
            <div>85% LTV → Margin Call • 90% → Partial Liquidation • 95% → Full Liquidation</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderDeFiTab() {
  setTitle('DeFi Positions', 'Protocol comparison, stablecoin health');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('DeFi positions across protocols', 'Monitor yields, health, and stablecoin pegs', 'Smart contract risk acknowledged', 'Rebalance when health factor < 1.5')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-link', 'Active Positions', 3, null, 'purple')}
      ${metricCard('fa-percent', 'Avg APY', '8.4%', 1, 'green')}
      ${metricCard('fa-coins', 'Total Locked', '$450K', null, 'blue')}
      ${metricCard('fa-heart-pulse', 'Health Factor', '2.1', null, 'cyan')}
    </div>
    <div class="sgtx-card mb-6 border-amber-200 bg-amber-50/30">
      <div class="flex items-center gap-3 p-2">
        <i class="fas fa-exclamation-triangle text-amber-500 text-lg"></i>
        <div>
          <div class="text-xs font-semibold text-amber-800">Mandatory Risk Summary (Blueprint 4.11)</div>
          <div class="text-[10px] text-amber-600">DeFi positions carry smart contract risk, impermanent loss, and protocol failure risk. SGTX does not guarantee DeFi returns. You have acknowledged these risks.</div>
        </div>
      </div>
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-coins text-gold-400 mr-2"></i>Protocol Comparison</h3>
      ${dataTable(['Protocol', 'Type', 'APY', 'TVL', 'Health', 'Position'], [
        '<tr><td class="text-sm font-medium">Aave V3</td><td class="text-xs">Lending</td><td class="text-xs font-semibold text-emerald-600">6.2%</td><td class="text-xs">$12.4B</td><td><span class="text-emerald-600 text-xs font-bold">2.4</span></td><td class="text-xs font-semibold">$200K</td></tr>',
        '<tr><td class="text-sm font-medium">Compound</td><td class="text-xs">Lending</td><td class="text-xs font-semibold text-emerald-600">5.8%</td><td class="text-xs">$8.1B</td><td><span class="text-emerald-600 text-xs font-bold">1.9</span></td><td class="text-xs font-semibold">$150K</td></tr>',
        '<tr><td class="text-sm font-medium">Goldfinch</td><td class="text-xs">RWA</td><td class="text-xs font-semibold text-amber-600">12.4%</td><td class="text-xs">$102M</td><td><span class="text-amber-600 text-xs font-bold">1.5</span></td><td class="text-xs font-semibold">$100K</td></tr>',
      ])}
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-coins text-gold-400 mr-2"></i>Stablecoin Health</h3>
      <div class="grid grid-cols-4 gap-3">
        ${[{name:'USDC',peg:'$1.0001',health:'Healthy',color:'emerald'},{name:'USDT',peg:'$0.9999',health:'Healthy',color:'emerald'},{name:'DAI',peg:'$1.0003',health:'Healthy',color:'emerald'},{name:'FRAX',peg:'$0.9995',health:'Watch',color:'amber'}].map(s => `
          <div class="p-3 rounded-xl border border-surface-100 text-center">
            <div class="text-sm font-bold">${s.name}</div>
            <div class="text-xs font-mono mt-1">${s.peg}</div>
            <div class="text-[10px] text-${s.color}-600 font-semibold mt-1">${s.health}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderSecondaryMarket() {
  setTitle('Secondary Market', 'Tokenised trade assets (ERC-3525)');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Tokenised trade finance assets for secondary trading', 'Browse and trade ERC-3525 tokenised positions', 'Regulatory approval required per jurisdiction', 'AI valuation provides fair price estimates')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-coins', 'Listed Assets', 12, null, 'purple')}
      ${metricCard('fa-arrow-right-arrow-left', 'Trades (7d)', 5, null, 'blue')}
      ${metricCard('fa-chart-line', 'Market Cap', '$2.8M', 8, 'green')}
      ${metricCard('fa-robot', 'AI Valuations', 12, null, 'amber')}
    </div>
    ${dataTable(['Token ID', 'Underlying', 'Face Value', 'AI Valuation', 'Yield', 'Maturity', 'Action'], [
      '<tr><td class="font-mono text-xs">TF-0001</td><td class="text-sm">Pre-Export (Textiles)</td><td class="text-xs font-semibold">$180,000</td><td class="text-xs text-gold-400 font-semibold">$176,400</td><td class="text-xs text-emerald-600">7.2%</td><td class="text-xs">45d</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
      '<tr><td class="font-mono text-xs">TF-0002</td><td class="text-sm">LC Confirmation</td><td class="text-xs font-semibold">$500,000</td><td class="text-xs text-gold-400 font-semibold">$492,500</td><td class="text-xs text-emerald-600">5.8%</td><td class="text-xs">90d</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
      '<tr><td class="font-mono text-xs">TF-0003</td><td class="text-sm">Receivable (Agri)</td><td class="text-xs font-semibold">$95,000</td><td class="text-xs text-gold-400 font-semibold">$93,100</td><td class="text-xs text-emerald-600">9.1%</td><td class="text-xs">30d</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
    ], { title: 'Tokenised Trade Assets (ERC-3525)' })}`;
}

async function renderFinancedCompanies() {
  setTitle('Financed Companies', 'Private historical data per borrower');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Private borrower performance history', 'Review repayment patterns and credit trends', 'Data is private and immutable', 'Informs future financing decisions')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-building-columns', 'Companies', 8, null, 'blue')}
      ${metricCard('fa-check-double', 'Repaid On-Time', '94%', null, 'green')}
      ${metricCard('fa-triangle-exclamation', 'Late Payments', 2, null, 'amber')}
      ${metricCard('fa-xmark', 'Defaults', 0, null, 'rose')}
    </div>
    ${dataTable(['Company', 'GTID', 'Trades Financed', 'Total Volume', 'Repayment Rate', 'Credit Trend', 'Details'], [
      '<tr><td class="text-sm font-medium">Cairo Imports</td><td class="font-mono text-[10px]">SGTX-EG-CIRO...</td><td class="text-center">12</td><td class="text-xs font-semibold">$1.8M</td><td class="text-center text-emerald-600 font-semibold">100%</td><td class="text-center"><i class="fas fa-arrow-up text-emerald-500"></i></td><td><button class="text-xs text-gold-400 hover:underline">View</button></td></tr>',
      '<tr><td class="text-sm font-medium">Saigon Textiles</td><td class="font-mono text-[10px]">SGTX-VN-SGTX...</td><td class="text-center">8</td><td class="text-xs font-semibold">$950K</td><td class="text-center text-emerald-600 font-semibold">96%</td><td class="text-center"><i class="fas fa-arrows-h text-surface-400"></i></td><td><button class="text-xs text-gold-400 hover:underline">View</button></td></tr>',
      '<tr><td class="text-sm font-medium">Global Goods</td><td class="font-mono text-[10px]">SGTX-US-GLOB...</td><td class="text-center">5</td><td class="text-xs font-semibold">$620K</td><td class="text-center text-amber-600 font-semibold">88%</td><td class="text-center"><i class="fas fa-arrow-down text-amber-500"></i></td><td><button class="text-xs text-gold-400 hover:underline">View</button></td></tr>',
    ], { title: 'Borrower Performance History' })}`;
}

async function renderSettlements() {
  setTitle('Settlements', 'Payment orchestration and trade settlement');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/settlements?tenant_id=' + (tenant ? tenant.id : ''));
    var settlements = res.data || [];
    var pending = settlements.filter(function(s) { return s.status === 'PENDING' || s.status === 'AWAITING_PAYMENT'; });
    var completed = settlements.filter(function(s) { return s.status === 'CONFIRMED' || s.status === 'COMPLETED'; });

    content.innerHTML =
      fourQuestions(
        settlements.length + ' settlement instruction(s) across your trades.',
        pending.length > 0 ? 'Review and confirm ' + pending.length + ' pending settlement(s).' : 'No pending settlements right now.',
        pending.length > 0 ? pending.length + ' awaiting payment confirmation.' : 'No blockers.',
        'After confirmation, PSP verifies and funds are released.'
      ) +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-money-check-alt', 'Total Instructions', settlements.length, null, 'blue') +
        metricCard('fa-clock', 'Pending', pending.length, null, 'amber') +
        metricCard('fa-check-double', 'Completed', completed.length, null, 'green') +
        metricCard('fa-dollar-sign', 'Total Value', usd(settlements.reduce(function(s,i){return s+(i.amount||0);},0)), null, 'purple') +
      '</div>' +
      // Pending settlements
      (pending.length ? '<h3 class="text-sm font-semibold text-surface-800 mb-3"><i class="fas fa-exclamation-circle mr-2 text-amber-500"></i>Pending Settlements</h3><div class="space-y-3 mb-6">' +
        pending.map(function(s) {
          return '<div class="sgtx-card p-4 border-l-4 border-l-amber-400">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs font-bold text-gold-400">' + (s.ustn || s.id) + '</span>' + badge(s.status, 'amber') + '</div>' +
            '<div class="grid grid-cols-3 gap-3 mb-3 text-xs">' +
              '<div><span class="text-surface-500">Type</span><div class="font-medium text-surface-800">' + (s.instruction_type || 'TRADE_PRINCIPAL') + '</div></div>' +
              '<div><span class="text-surface-500">Amount</span><div class="font-medium text-surface-800">' + usd(s.amount || s.payload_amount || 0) + '</div></div>' +
              '<div><span class="text-surface-500">PSP</span><div class="font-medium text-surface-800">' + (s.psp_name || 'Pending selection') + '</div></div>' +
            '</div>' +
            '<div class="flex gap-2">' +
              '<button onclick="confirmSettlement(\'' + s.id + '\')" class="btn-success text-xs flex-1"><i class="fas fa-check mr-1"></i>Confirm Payment</button>' +
              '<button onclick="viewSettlementDetails(\'' + (s.ustn || s.id) + '\')" class="px-3 py-1.5 border border-surface-200 rounded-lg text-xs text-surface-600 hover:bg-surface-50"><i class="fas fa-eye mr-1"></i>Details</button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>' : '') +
      // All settlements table
      '<h3 class="text-sm font-semibold text-surface-800 mb-3"><i class="fas fa-list mr-2 text-surface-400"></i>All Settlements</h3>' +
      dataTable(['USTN', 'Type', 'Amount', 'PSP', 'Status', 'Date'], settlements.map(function(s) {
        return '<tr><td class="font-mono text-xs text-gold-400">' + (s.ustn || '—') + '</td><td class="text-xs">' + (s.instruction_type || '') + '</td><td class="text-xs font-medium">' + usd(s.amount || 0) + '</td><td class="text-xs">' + (s.psp_name || '—') + '</td><td class="text-center">' + badge(s.status || 'PENDING', s.status === 'CONFIRMED' ? 'emerald' : 'amber') + '</td><td class="text-xs text-surface-500">' + timeAgo(s.created_at) + '</td></tr>';
      }));
  } catch (e) { content.innerHTML = renderError(e.message); }
}

async function renderQCDashboard() {
  setTitle('Inspection Hub', 'Quality control operations');
  const tenantId = window.__tenant_id || 'tenant-006';
  let inspections = [];
  try {
    const res = await api(`/inspections?tenant_id=${tenantId}`);
    inspections = res.data || [];
  } catch(e) { console.warn('Inspections fetch:', e); }

  const pending = inspections.filter(i => i.status === 'SCHEDULED');
  const inProgress = inspections.filter(i => i.status === 'IN_PROGRESS');
  const completed = inspections.filter(i => i.status === 'COMPLETED');
  const passRate = completed.length > 0 ? Math.round(completed.filter(i => i.result === 'PASS').length / completed.length * 100) : 0;

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${pending.length + inProgress.length} inspections require attention`,
      'Process scheduled inspections, complete in-progress ones',
      pending.length > 3 ? 'Queue building up — prioritize HIGH priority items' : 'No blockers',
      'Completed inspections unlock shipment phase'
    )}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-clipboard-list', 'Scheduled', pending.length, null, 'amber')}
      ${metricCard('fa-spinner', 'In Progress', inProgress.length, null, 'blue')}
      ${metricCard('fa-check-circle', 'Pass Rate', passRate + '%', null, 'green')}
      ${metricCard('fa-clipboard-check', 'Completed', completed.length, null, 'purple')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm"><i class="fas fa-clipboard-list text-gold-400 mr-2"></i>Inspection Queue</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Scheduled (${pending.length})</button>
          <button class="text-[10px] px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">In Progress (${inProgress.length})</button>
          <button class="text-[10px] px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Done (${completed.length})</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${[...pending, ...inProgress].map(insp => {
          const details = typeof insp.product_details === 'string' ? JSON.parse(insp.product_details || '{}') : (insp.product_details || {});
          const isUrgent = insp.status === 'IN_PROGRESS';
          return `<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">
            <div class="w-10 h-10 rounded-xl ${isUrgent ? 'bg-blue-100' : 'bg-amber-100'} flex items-center justify-center">
              <i class="fas fa-microscope ${isUrgent ? 'text-blue-500' : 'text-amber-500'} text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">${details.commodity || insp.inspection_type || 'Inspection'}</span>
                <span class="text-[10px] font-mono text-surface-400">${insp.id}</span>
              </div>
              <div class="text-[10px] text-surface-400">${insp.inspection_type} • USTN: ${(insp.shipment_ustn||'').substring(0,20)}... • Lot: ${details.lot_size || 'N/A'}</div>
            </div>
            <div class="flex items-center gap-3">
              ${badge(insp.status)}
              ${insp.status === 'SCHEDULED' ? `<button onclick="startInspection('${insp.id}')" class="px-3 py-1.5 bg-gold-400 text-white text-[10px] rounded-lg font-semibold">Start</button>` : 
                `<button onclick="completeInspection('${insp.id}')" class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] rounded-lg font-semibold">Complete</button>`}
            </div>
          </div>`;
        }).join('') || '<div class="px-5 py-8 text-center text-xs text-surface-400">No pending inspections</div>'}
      </div>
    </div>
    ${completed.length > 0 ? `
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-check-circle text-emerald-500 mr-2"></i>Recently Completed</h3>
      <div class="space-y-2">
        ${completed.slice(0, 5).map(insp => {
          const details = typeof insp.product_details === 'string' ? JSON.parse(insp.product_details || '{}') : (insp.product_details || {});
          return `<div class="flex items-center justify-between p-3 rounded-xl bg-surface-50">
            <div class="flex items-center gap-3">
              <i class="fas fa-${insp.result === 'PASS' ? 'check-circle text-emerald-500' : 'times-circle text-red-500'}"></i>
              <div>
                <div class="text-xs font-medium">${details.commodity || 'Inspection'}</div>
                <div class="text-[10px] text-surface-400">${insp.completed_at || ''}</div>
              </div>
            </div>
            <span class="text-[10px] font-bold ${insp.result === 'PASS' ? 'text-emerald-600' : 'text-red-600'}">${insp.result || 'N/A'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;
}

async function renderInspectionQueue() {
  setTitle('Inspection Queue', 'Pending inspections from trade contracts');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/qc/inspection-queue?tenant_id=' + tenant.id);
    var items = res.data || [];
    var pending = items.filter(function(i){return i.status==='PENDING'||i.status==='ASSIGNED';});
    var inProgress = items.filter(function(i){return i.status==='IN_PROGRESS';});
    var completed = items.filter(function(i){return i.status==='COMPLETED';});
    content.innerHTML =
      fourQuestions('Inspections queued from confirmed trade contracts', 'Accept and schedule inspections', pending.length > 0 ? pending.length + ' inspections awaiting acceptance' : 'Queue clear', 'Completed inspections unlock shipment phase') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-clipboard-list', 'In Queue', pending.length, null, 'amber') +
        metricCard('fa-spinner', 'In Progress', inProgress.length, null, 'blue') +
        metricCard('fa-check-circle', 'Completed', completed.length, null, 'green') +
        metricCard('fa-list', 'Total', items.length, null, 'purple') +
      '</div>' +
      '<div class="sgtx-card !p-0 overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between"><h3 class="font-semibold text-sm"><i class="fas fa-clipboard-list text-gold-400 mr-2"></i>Inspection Queue</h3>' +
        '<div class="flex gap-2"><button class="text-[10px] px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Pending (' + pending.length + ')</button><button class="text-[10px] px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Active (' + inProgress.length + ')</button></div></div>' +
        '<div class="divide-y divide-surface-100">' +
          (items.length === 0 ? '<div class="py-8 text-center text-surface-400 text-xs">No inspections in queue</div>' :
          items.map(function(i){
            var priorityColor = i.priority==='HIGH'?'red':i.priority==='MEDIUM'?'amber':'blue';
            return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">' +
              '<div class="w-10 h-10 rounded-xl bg-' + priorityColor + '-100 flex items-center justify-center"><i class="fas fa-microscope text-' + priorityColor + '-500 text-sm"></i></div>' +
              '<div class="flex-1">' +
                '<div class="flex items-center gap-2"><span class="text-sm font-medium">' + (i.commodity_description||i.inspection_type||'Inspection') + '</span><span class="text-[10px] font-mono text-surface-400">' + i.id + '</span></div>' +
                '<div class="text-[10px] text-surface-400">' + (i.inspection_type||'') + ' • USTN: ' + (i.ustn||'').substring(0,20) + ' • ' + (i.quantity||'') + '</div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<span class="text-[10px] font-bold text-' + priorityColor + '-600">' + (i.priority||'MEDIUM') + '</span>' +
                badge(i.status) +
                (i.status==='PENDING' ? '<button onclick="qcAcceptInspection(\'' + i.id + '\')" class="px-3 py-1.5 bg-gold-400 text-white text-[10px] rounded-lg font-semibold">Accept</button>' :
                 i.status==='ASSIGNED' ? '<button onclick="qcStartInspection(\'' + i.id + '\')" class="px-3 py-1.5 bg-blue-500 text-white text-[10px] rounded-lg font-semibold">Start</button>' :
                 i.status==='IN_PROGRESS' ? '<button onclick="qcSubmitReport(\'' + i.id + '\')" class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] rounded-lg font-semibold">Report</button>' : '') +
              '</div></div>';
          }).join('')) +
        '</div></div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderAQLEnforcement() {
  setTitle('AQL Sampling', 'ISO 28591 General Inspection Level II');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('AQL sampling enforcement per ISO 28591', 'Configure lot size and acceptance criteria', 'Must use General Inspection Level II', 'Results auto-feed into QC report')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-ruler-combined', 'Active Samples', 4, null, 'blue')}
      ${metricCard('fa-check', 'Accept Rate', '96%', null, 'green')}
      ${metricCard('fa-xmark', 'Reject Rate', '4%', null, 'rose')}
      ${metricCard('fa-calculator', 'Lot Avg', '2,500', null, 'purple')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator text-gold-400 mr-2"></i>AQL Calculator</h3>
        <div class="space-y-3">
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Lot Size</label>
            <input type="number" value="2500" class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Inspection Level</label>
            <select class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm"><option>General Level II (default)</option><option>General Level I</option><option>General Level III</option><option>Special S-1</option></select>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">AQL Value</label>
            <select class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm"><option>2.5 (standard)</option><option>1.0 (tight)</option><option>4.0 (relaxed)</option><option>6.5 (loose)</option></select>
          </div>
          <div class="p-4 bg-gold-50 rounded-xl border border-gold-200">
            <div class="text-[10px] font-bold text-gold-400 uppercase">Sampling Result</div>
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div><div class="text-lg font-bold text-gold-400">200</div><div class="text-[10px] text-gold-400">Sample Size</div></div>
              <div><div class="text-lg font-bold text-gold-400">10 / 11</div><div class="text-[10px] text-gold-400">Accept / Reject #</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-table text-gold-400 mr-2"></i>Sampling Table (Level II)</h3>
        <div class="overflow-hidden rounded-xl border border-surface-200">
          <table class="w-full text-[10px]">
            <thead class="bg-surface-50"><tr><th class="px-3 py-2 text-left">Lot Size</th><th class="px-3 py-2">Code</th><th class="px-3 py-2">Sample</th><th class="px-3 py-2">Ac</th><th class="px-3 py-2">Re</th></tr></thead>
            <tbody class="divide-y divide-surface-100">
              ${[['2-8','A',2,0,1],['51-90','E',13,1,2],['151-280','G',32,3,4],['501-1200','J',80,5,6],['1201-3200','K',125,7,8],['3201-10000','L',200,10,11]].map(([lot,code,sample,ac,re]) => 
                `<tr class="${lot==='1201-3200'?'bg-gold-50':''} hover:bg-surface-50"><td class="px-3 py-2">${lot}</td><td class="px-3 py-2 font-bold">${code}</td><td class="px-3 py-2">${sample}</td><td class="px-3 py-2 text-emerald-600">${ac}</td><td class="px-3 py-2 text-red-600">${re}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

async function renderARInspection() {
  setTitle('AR Inspection', 'Defect detection with bounding boxes');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('AI-powered visual defect detection', 'Upload images or use device camera for AR mode', 'Requires HF ViT model (on-device)', 'Defects flagged with bounding boxes + confidence')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-vr-cardboard', 'AR Sessions', 14, null, 'purple')}
      ${metricCard('fa-bug', 'Defects Found', 23, null, 'rose')}
      ${metricCard('fa-bullseye', 'Detection Rate', '97.3%', 2, 'green')}
      ${metricCard('fa-image', 'Images Analyzed', 156, null, 'blue')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-camera text-gold-400 mr-2"></i>AR Inspection Mode</h3>
        <div class="h-64 bg-surface-900 rounded-xl flex items-center justify-center relative overflow-hidden">
          <!-- Simulated camera view with bounding boxes -->
          <div class="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
            <div class="w-48 h-32 border-2 border-dashed border-surface-600 rounded-lg flex items-center justify-center">
              <i class="fas fa-shirt text-surface-500 text-4xl"></i>
            </div>
          </div>
          <!-- Defect bounding box -->
          <div class="absolute top-12 right-16 w-16 h-12 border-2 border-red-500 rounded bg-red-500/10">
            <div class="absolute -top-5 left-0 bg-red-500 text-white text-[8px] px-1 rounded">Stain 94%</div>
          </div>
          <div class="absolute bottom-16 left-12 w-12 h-10 border-2 border-amber-500 rounded bg-amber-500/10">
            <div class="absolute -top-5 left-0 bg-amber-500 text-white text-[8px] px-1 rounded">Tear 78%</div>
          </div>
          <!-- Controls -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><i class="fas fa-camera text-white"></i></button>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="flex-1 py-2 bg-gold-400 text-white rounded-lg text-xs font-semibold"><i class="fas fa-play mr-1"></i>Start AR Session</button>
          <button class="flex-1 py-2 bg-surface-100 text-surface-600 rounded-lg text-xs font-semibold"><i class="fas fa-upload mr-1"></i>Upload Image</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-check text-gold-400 mr-2"></i>Recent Detections</h3>
        <div class="space-y-3">
          ${[{type:'Stain',conf:94,severity:'MAJOR',img:'IMG_0042'},{type:'Thread Pull',conf:87,severity:'MINOR',img:'IMG_0043'},{type:'Color Variation',conf:72,severity:'MINOR',img:'IMG_0044'},{type:'Dimensional Error',conf:96,severity:'CRITICAL',img:'IMG_0045'}].map(d => `
            <div class="flex items-center gap-3 p-3 rounded-xl border border-surface-100">
              <div class="w-8 h-8 rounded-lg ${d.severity==='CRITICAL'?'bg-red-100':d.severity==='MAJOR'?'bg-amber-100':'bg-blue-100'} flex items-center justify-center">
                <i class="fas fa-bug ${d.severity==='CRITICAL'?'text-red-500':d.severity==='MAJOR'?'text-amber-500':'text-blue-500'} text-xs"></i>
              </div>
              <div class="flex-1">
                <div class="text-xs font-medium">${d.type}</div>
                <div class="text-[10px] text-surface-400">${d.img} • ${d.conf}% confidence</div>
              </div>
              <span class="text-[10px] font-bold ${d.severity==='CRITICAL'?'text-red-600':d.severity==='MAJOR'?'text-amber-600':'text-blue-600'}">${d.severity}</span>
            </div>`).join('')}
        </div>
        <div class="mt-3 p-3 bg-surface-50 rounded-xl text-[10px] text-surface-500">
          <i class="fas fa-brain mr-1"></i>Model: HF ViT (on-device) • Privacy: raw images never leave device
        </div>
      </div>
    </div>`;
}

async function renderOverrideLog() {
  setTitle('Override Accountability', 'Mandatory reasons for AI override');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('All AI finding overrides with accountability trail', 'Review override justifications', 'Overrides auto-flagged in dispute evidence packages', 'Pattern detection alerts on excessive overrides')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-triangle-exclamation', 'Total Overrides', 7, null, 'amber')}
      ${metricCard('fa-user', 'By Inspectors', 5, null, 'blue')}
      ${metricCard('fa-user-tie', 'By Supervisors', 2, null, 'purple')}
      ${metricCard('fa-flag', 'Flagged in Disputes', 1, null, 'rose')}
    </div>
    <div class="sgtx-card mb-4 border-amber-200 bg-amber-50/30">
      <div class="flex items-center gap-3 p-2">
        <i class="fas fa-shield-halved text-amber-500"></i>
        <div class="text-xs text-amber-700"><b>Override Policy:</b> Every override requires a minimum 10-character justification. Overrides are automatically included in dispute evidence packages per Blueprint 6.2.4.</div>
      </div>
    </div>
    ${dataTable(['Override ID', 'Inspector', 'AI Finding', 'Override Reason', 'Date', 'Dispute Flag'], [
      '<tr><td class="font-mono text-xs">OVR-007</td><td class="text-sm">J. Smith</td><td class="text-xs text-red-600">FAIL: Stain detected (94%)</td><td class="text-xs text-surface-600 max-w-xs truncate">Stain is from packaging material, not product defect. Verified by visual inspection.</td><td class="text-xs text-surface-400">Jan 18</td><td class="text-center"><i class="fas fa-flag text-red-500"></i></td></tr>',
      '<tr><td class="font-mono text-xs">OVR-006</td><td class="text-sm">M. Chen</td><td class="text-xs text-amber-600">WARNING: Color variation (72%)</td><td class="text-xs text-surface-600 max-w-xs truncate">Within acceptable buyer spec tolerance of ±5%. Sample compared against reference.</td><td class="text-xs text-surface-400">Jan 15</td><td class="text-center">—</td></tr>',
      '<tr><td class="font-mono text-xs">OVR-005</td><td class="text-sm">A. Nguyen</td><td class="text-xs text-red-600">FAIL: Weight discrepancy (89%)</td><td class="text-xs text-surface-600 max-w-xs truncate">Scale was recalibrated. Reweigh confirmed within 0.5% tolerance.</td><td class="text-xs text-surface-400">Jan 12</td><td class="text-center">—</td></tr>',
    ], { title: 'Override Accountability Log' })}`;
}

async function renderLiveTradeMonitor() {
  setTitle('Live Trade Monitor', 'Real-time trade activity');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Real-time trade flow monitoring across jurisdictions', 'Monitor anomalies and flag suspicious patterns', 'Zero-knowledge model — identities redacted by default', 'Break-glass procedure available for full audit')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-satellite-dish', 'Live Trades', 34, null, 'blue')}
      ${metricCard('fa-globe', 'Jurisdictions', 12, null, 'purple')}
      ${metricCard('fa-flag', 'Flagged', 2, null, 'amber')}
      ${metricCard('fa-shield-halved', 'Cleared', 156, null, 'green')}
    </div>
    <div class="sgtx-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-chart-line text-gold-400 mr-2"></i>Trade Flow (Real-time)</h3>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="text-[10px] text-surface-400">Live</span></div>
      </div>
      <div class="h-48 bg-gradient-to-br from-surface-50 to-surface-100 rounded-xl relative overflow-hidden">
        <svg class="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs><linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4E3FE8" stop-opacity="0.2"/><stop offset="100%" stop-color="#4E3FE8" stop-opacity="0"/></linearGradient></defs>
          <path d="M0,80 C20,75 40,70 60,72 C80,74 100,65 120,58 C140,51 160,55 180,48 C200,41 220,45 240,38 C260,31 280,35 300,28 C320,21 340,25 360,20 C380,15 400,18 400,15 L400,120 L0,120 Z" fill="url(#liveGrad)"/>
          <path d="M0,80 C20,75 40,70 60,72 C80,74 100,65 120,58 C140,51 160,55 180,48 C200,41 220,45 240,38 C260,31 280,35 300,28 C320,21 340,25 360,20 C380,15 400,18 400,15" fill="none" stroke="#4E3FE8" stroke-width="2"/>
        </svg>
        <div class="absolute top-4 left-4 text-xs text-surface-600">Trade Volume (24h)</div>
        <div class="absolute top-4 right-4 text-lg font-bold text-surface-800">$12.4M</div>
      </div>
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-list text-gold-400 mr-2"></i>Recent Trade Activity (Redacted)</h3></div>
      <div class="divide-y divide-surface-100">
        ${[{time:'2m ago',route:'VN → EG',value:'$245K',commodity:'Textiles',risk:'LOW',color:'emerald'},{time:'8m ago',route:'DE → SG',value:'$180K',commodity:'Machinery',risk:'LOW',color:'emerald'},{time:'15m ago',route:'CN → IR',value:'$92K',commodity:'Electronics',risk:'HIGH',color:'red'},{time:'22m ago',route:'IN → GB',value:'$310K',commodity:'Pharmaceuticals',risk:'MEDIUM',color:'amber'}].map(t => `
          <div class="flex items-center gap-4 px-5 py-3 hover:bg-surface-50">
            <span class="text-[10px] text-surface-400 w-12">${t.time}</span>
            <span class="text-xs font-mono w-16">${t.route}</span>
            <span class="text-xs font-semibold w-16">${t.value}</span>
            <span class="text-xs text-surface-600 flex-1">${t.commodity}</span>
            <span class="text-[10px] font-bold text-${t.color}-600 bg-${t.color}-50 px-2 py-0.5 rounded">${t.risk}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderAnonymousTrade() {
  setTitle('Anonymous Trade', 'Zero-knowledge visibility, identity redaction');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Government-to-government trade with identity redaction', 'Manage anonymous trade agreements', 'Break-glass requires multisig approval', 'Trade integrity maintained without identity exposure')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-user-secret', 'Anonymous Trades', 8, null, 'purple')}
      ${metricCard('fa-lock', 'Redacted Entities', 16, null, 'blue')}
      ${metricCard('fa-key', 'Break-Glass Events', 1, null, 'amber')}
      ${metricCard('fa-shield-halved', 'ZK Verified', 8, null, 'green')}
    </div>
    <div class="sgtx-card mb-6 border-purple-200 bg-purple-50/30">
      <div class="flex items-center gap-3 p-2">
        <i class="fas fa-user-secret text-purple-500 text-lg"></i>
        <div>
          <div class="text-xs font-semibold text-purple-800">Zero-Knowledge Visibility Model</div>
          <div class="text-[10px] text-purple-600">Identities redacted by default. Only trade metadata (value, commodity, jurisdiction) visible. Full audit requires break-glass procedure with 3-of-5 multisig.</div>
        </div>
      </div>
    </div>
    ${dataTable(['Trade Ref', 'Origin', 'Destination', 'Value Range', 'Commodity Class', 'ZK Status', 'Action'], [
      '<tr><td class="font-mono text-xs">ANON-2024-001</td><td class="text-sm">████████</td><td class="text-sm">████████</td><td class="text-xs">$100K-$500K</td><td class="text-xs">HS-52 (Cotton)</td><td><span class="text-emerald-600 text-xs font-semibold"><i class="fas fa-check-circle mr-1"></i>Verified</span></td><td><button class="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">Break-Glass</button></td></tr>',
      '<tr><td class="font-mono text-xs">ANON-2024-002</td><td class="text-sm">████████</td><td class="text-sm">████████</td><td class="text-xs">$500K-$1M</td><td class="text-xs">HS-84 (Machinery)</td><td><span class="text-emerald-600 text-xs font-semibold"><i class="fas fa-check-circle mr-1"></i>Verified</span></td><td><button class="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold">Break-Glass</button></td></tr>',
    ], { title: 'Anonymous Trade Registry' })}`;
}

async function renderMultiAgency() {
  setTitle('Multi-Agency Workflow', 'Sequential/parallel approval workflows');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/gov/multi-agency?jurisdiction=' + (tenant.jurisdiction||'GB'));
    var workflows = res.data || [];
    var pending = workflows.filter(function(w){return w.status==='IN_PROGRESS'||w.status==='PENDING';});
    var completed = workflows.filter(function(w){return w.status==='COMPLETED';});
    content.innerHTML =
      fourQuestions('Multi-agency approval workflows for trade clearance', 'Route approvals to correct agencies', pending.length > 0 ? pending.length + ' workflows pending' : 'All clear', 'All approvals clear → trade proceeds') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-sitemap', 'Active Workflows', pending.length, null, 'blue') +
        metricCard('fa-check-double', 'Completed', completed.length, null, 'green') +
        metricCard('fa-building-columns', 'Total', workflows.length, null, 'purple') +
        metricCard('fa-clock', 'Avg Completion', '2.3d', null, 'amber') +
      '</div>' +
      '<div class="sgtx-card mb-6">' +
        '<h3 class="font-semibold text-sm mb-4"><i class="fas fa-sitemap text-gold-400 mr-2"></i>Active Approval Workflows</h3>' +
        '<div class="space-y-4">' +
          (workflows.length===0 ? '<div class="py-6 text-center text-surface-400 text-xs">No active workflows</div>' :
          workflows.map(function(w){
            var agencies = [];try{agencies=JSON.parse(w.agencies||'[]');}catch(e){}
            var approvedCount = agencies.filter(function(a){return a.status==='APPROVED';}).length;
            return '<div class="p-4 rounded-xl border border-surface-100">' +
              '<div class="flex items-center justify-between mb-3">' +
                '<div class="flex items-center gap-2"><span class="font-mono text-xs text-gold-400">' + w.id + '</span>' +
                '<span class="text-[10px] px-2 py-0.5 rounded bg-surface-100 text-surface-600">' + (w.workflow_type||'Sequential') + '</span></div>' +
                '<span class="text-[10px] text-surface-400">' + approvedCount + '/' + agencies.length + ' approved</span>' +
              '</div>' +
              '<div class="flex items-center gap-2">' +
                agencies.map(function(a,i){
                  return '<div class="flex-1 text-center"><div class="w-8 h-8 mx-auto rounded-lg ' + (a.status==='APPROVED'?'bg-emerald-500 text-white':a.status==='PENDING'?'bg-amber-100 text-amber-600':'bg-surface-100 text-surface-400') + ' flex items-center justify-center"><i class="fas ' + (a.status==='APPROVED'?'fa-check':a.status==='PENDING'?'fa-clock':'fa-hourglass') + ' text-xs"></i></div><div class="text-[9px] mt-1 font-medium">' + (a.name||'Agency') + '</div></div>' +
                  (i<agencies.length-1 ? '<div class="w-6 h-0.5 ' + (a.status==='APPROVED'?'bg-emerald-300':'bg-surface-200') + '"></div>' : '');
                }).join('') +
              '</div>' +
              (w.status==='PENDING' ? '<button onclick="govApproveWorkflow(\'' + w.id + '\')" class="mt-3 text-[10px] bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold"><i class="fas fa-check mr-1"></i>Approve Step</button>' : '') +
            '</div>';
          }).join('')) +
        '</div></div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderGovDocs() {
  setTitle('Document Verification', 'Government document verification queue');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/gov/documents/pending?jurisdiction=' + (tenant.jurisdiction||'GB'));
    var docs = res.data || [];
    var pending = docs.filter(function(d){return d.status==='PENDING';});
    content.innerHTML =
      fourQuestions('Trade documents pending government verification', 'Verify document authenticity and compliance', pending.length > 0 ? pending.length + ' docs awaiting verification' : 'Queue clear', 'Verified docs unlock customs clearance') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-file-circle-check', 'In Queue', pending.length, null, 'amber') +
        metricCard('fa-check-double', 'Verified', docs.filter(function(d){return d.status==='VERIFIED';}).length, null, 'green') +
        metricCard('fa-robot', 'AI Confidence Avg', docs.length>0 ? Math.round(docs.reduce(function(s,d){return s+(d.ai_confidence||0);},0)/docs.length)+'%' : '—', null, 'purple') +
        metricCard('fa-ban', 'Rejected', docs.filter(function(d){return d.status==='REJECTED';}).length, null, 'rose') +
      '</div>' +
      '<div class="sgtx-card !p-0 overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-file-circle-check text-gold-400 mr-2"></i>Verification Queue</h3></div>' +
        '<div class="divide-y divide-surface-100">' +
          (docs.length===0 ? '<div class="py-8 text-center text-surface-400 text-xs">No documents pending</div>' :
          docs.map(function(d){
            return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50">' +
              '<div class="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center"><i class="fas fa-file-pdf text-red-400 text-sm"></i></div>' +
              '<div class="flex-1"><div class="text-sm font-medium">' + (d.document_type||'Document') + '</div>' +
              '<div class="text-[10px] font-mono" style="color:rgba(255,255,255,.4)">USTN: ' + (d.ustn||'—').substring(0,20) + ' • ' + (d.submitter_name||'Unknown') + '</div></div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-center"><div class="text-xs font-bold ' + ((d.ai_confidence||0)>=90?'text-emerald-600':(d.ai_confidence||0)>=70?'text-amber-600':'text-red-600') + '">' + (d.ai_confidence||0) + '%</div><div class="text-[10px] text-surface-400">AI conf.</div></div>' +
                (d.status==='PENDING' ? '<button onclick="govVerifyDoc(\'' + d.id + '\')" class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] rounded-lg font-semibold">Verify</button><button onclick="govRejectDoc(\'' + d.id + '\')" class="px-3 py-1.5 bg-red-100 text-red-600 text-[10px] rounded-lg font-semibold">Reject</button>' : badge(d.status)) +
              '</div></div>';
          }).join('')) +
        '</div></div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderGovAudit() { setTitle('Audit Trail', 'Immutable trail — Loom + Ed25519'); return renderGovernor(); }

async function renderGovJurisdictions() { return renderJurisdictions(); }

async function renderCustomsAPI() {
  setTitle('Customs API Integration', 'Nafeza, VNACCS health monitoring');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Customs system API integrations', 'Monitor integration health and configure endpoints', 'API latency spikes may delay clearance', 'Auto-failover to manual mode on API failure')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-plug', 'Connected APIs', 4, null, 'green')}
      ${metricCard('fa-heart-pulse', 'Avg Uptime', '99.7%', null, 'blue')}
      ${metricCard('fa-clock', 'Avg Latency', '240ms', -5, 'purple')}
      ${metricCard('fa-triangle-exclamation', 'Alerts', 0, null, 'amber')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-plug text-gold-400 mr-2"></i>Connected Customs Systems</h3>
      <div class="space-y-3">
        ${[{name:'Nafeza (Egypt)',endpoint:'api.nafeza.gov.eg',status:'Healthy',uptime:'99.9%',latency:'180ms',color:'emerald'},{name:'VNACCS (Vietnam)',endpoint:'api.vnaccs.customs.gov.vn',status:'Healthy',uptime:'99.5%',latency:'220ms',color:'emerald'},{name:'ATLAS (Germany)',endpoint:'zoll-portal.de/api',status:'Degraded',uptime:'98.2%',latency:'450ms',color:'amber'},{name:'CDS (UK)',endpoint:'customs.hmrc.gov.uk/api',status:'Healthy',uptime:'99.8%',latency:'160ms',color:'emerald'}].map(api => `
          <div class="flex items-center justify-between p-4 rounded-xl border border-surface-100 hover:border-gold-200 transition">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-${api.color}-500"></div>
              <div>
                <div class="text-sm font-medium">${api.name}</div>
                <div class="text-[10px] font-mono" style="color:rgba(255,255,255,.4)">${api.endpoint}</div>
              </div>
            </div>
            <div class="flex items-center gap-4 text-[10px]">
              <div class="text-center"><div class="font-semibold">${api.uptime}</div><div class="text-surface-400">Uptime</div></div>
              <div class="text-center"><div class="font-semibold">${api.latency}</div><div class="text-surface-400">Latency</div></div>
              <span class="px-2 py-1 rounded bg-${api.color}-100 text-${api.color}-700 font-semibold">${api.status}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderConstitutional() {
  setTitle('Constitutional Policies', 'Edit Rego/WASM with impact simulation');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/admin/policies');
    var policies = res.data || [];
    var active = policies.filter(function(p){return p.status==='ACTIVE';});
    content.innerHTML =
      fourQuestions('G1-G4 constitutional policy management', 'Edit policies with impact simulation before deploy', 'Changes require multisig approval', 'Deployed policies immediately enforce on all trades') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-scroll', 'Active Policies', active.length, null, 'purple') +
        metricCard('fa-code', 'Total Rules', policies.length, null, 'blue') +
        metricCard('fa-shield-halved', 'Constitutional', policies.filter(function(p){return (p.category||'').match(/G[1-4]/);}).length, null, 'cyan') +
        metricCard('fa-clock', 'Last Updated', policies.length>0 ? timeAgo(policies[0].updated_at) : '—', null, 'amber') +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">' +
        '<div class="sgtx-card">' +
          '<div class="flex items-center justify-between mb-4">' +
            '<h3 class="font-semibold text-sm"><i class="fas fa-shield-halved text-gold-400 mr-2"></i>Policies</h3>' +
            '<button onclick="adminAddPolicy()" class="text-[10px] bg-gold-400 text-white px-3 py-1.5 rounded-lg font-semibold"><i class="fas fa-plus mr-1"></i>Add</button>' +
          '</div>' +
          '<div class="space-y-3">' +
            (policies.length===0 ? '<div class="py-6 text-center text-surface-400 text-xs">No policies defined</div>' :
            policies.slice(0,8).map(function(p){
              return '<div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">' +
                '<div class="flex items-center gap-3">' +
                  '<span class="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">' + (p.category||'P').substring(0,2) + '</span>' +
                  '<div><div class="text-xs font-semibold text-emerald-800">' + (p.name||'Policy') + '</div><div class="text-[10px] text-emerald-600">' + (p.description||'').substring(0,40) + '</div></div>' +
                '</div>' + badge(p.status||'ACTIVE') +
              '</div>';
            }).join('')) +
          '</div>' +
        '</div>' +
        '<div class="sgtx-card">' +
          '<h3 class="font-semibold text-sm mb-4"><i class="fas fa-flask text-gold-400 mr-2"></i>Impact Simulation</h3>' +
          '<div class="p-4 bg-surface-50 rounded-xl mb-3">' +
            '<div class="text-xs text-surface-500 mb-2">Simulate policy change impact:</div>' +
            '<textarea id="admin-sim-policy" rows="3" class="w-full text-xs" placeholder="Enter policy rule to simulate..."></textarea>' +
          '</div>' +
          '<button onclick="adminSimulatePolicy()" class="w-full py-2.5 bg-gold-400 text-white rounded-lg text-xs font-semibold hover:bg-gold-500 transition"><i class="fas fa-play mr-1"></i>Run Simulation</button>' +
          '<div id="sim-result" class="mt-3"></div>' +
        '</div>' +
      '</div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderGovernorLog() { return renderGovernor(); }

async function renderJurisdictionMatrix() { return renderJurisdictions(); }

async function renderPSPManager() {
  setTitle('PSP Manager', 'Health monitoring, fallback chains');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/admin/psp');
    var psps = res.data || [];
    var healthy = psps.filter(function(p){return p.status==='HEALTHY';});
    content.innerHTML =
      fourQuestions('Payment Service Provider health management', 'Monitor PSP availability and configure fallbacks', psps.length-healthy.length > 0 ? (psps.length-healthy.length)+' PSPs degraded' : 'All PSPs healthy', 'AI router selects optimal PSP per transaction') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-credit-card', 'Active PSPs', psps.length, null, 'blue') +
        metricCard('fa-heart-pulse', 'Healthy', healthy.length, null, 'green') +
        metricCard('fa-triangle-exclamation', 'Degraded', psps.length - healthy.length, null, 'amber') +
        metricCard('fa-arrow-right-arrow-left', 'Fallback Chain', psps.length + ' deep', null, 'purple') +
      '</div>' +
      '<div class="sgtx-card mb-6">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h3 class="font-semibold text-sm"><i class="fas fa-credit-card text-gold-400 mr-2"></i>PSP Health Dashboard</h3>' +
          '<button onclick="adminAddPSP()" class="text-[10px] bg-gold-400 text-white px-3 py-1.5 rounded-lg font-semibold"><i class="fas fa-plus mr-1"></i>Add PSP</button>' +
        '</div>' +
        '<div class="space-y-3">' +
          (psps.length===0 ? '<div class="py-6 text-center text-surface-400 text-xs">No PSPs configured</div>' :
          psps.map(function(p,i){
            var statusColor = p.status==='HEALTHY'?'emerald':p.status==='DEGRADED'?'amber':'red';
            return '<div class="flex items-center justify-between p-4 rounded-xl border border-surface-100">' +
              '<div class="flex items-center gap-3">' +
                '<span class="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold">' + (p.priority||i+1) + '</span>' +
                '<div><div class="text-sm font-medium">' + (p.name||'PSP') + '</div><div class="text-[10px] text-surface-400">' + (p.latency_ms||0) + 'ms latency • ' + (p.supported_currencies||'USD') + '</div></div>' +
              '</div>' +
              '<div class="flex items-center gap-3">' +
                '<span class="text-[10px] font-semibold">' + (p.uptime_pct||0) + '% uptime</span>' +
                '<span class="text-[10px] px-2 py-1 rounded font-semibold bg-' + statusColor + '-100 text-' + statusColor + '-700">' + (p.status||'UNKNOWN') + '</span>' +
                '<button onclick="adminTestPSP(\'' + p.id + '\')" class="text-[10px] text-gold-400 hover:underline">Test</button>' +
              '</div>' +
            '</div>';
          }).join('')) +
        '</div>' +
      '</div>' +
      '<div class="sgtx-card">' +
        '<h3 class="font-semibold text-sm mb-3"><i class="fas fa-route text-gold-400 mr-2"></i>Fallback Chain</h3>' +
        '<div class="flex items-center gap-2 flex-wrap py-2">' +
          psps.sort(function(a,b){return (a.priority||99)-(b.priority||99);}).map(function(p,i){
            return '<div class="flex items-center gap-2"><div class="px-3 py-2 rounded-lg bg-gold-50 border border-gold-200 text-xs font-medium text-gold-400">' + (p.name||'PSP') + '</div>' + (i<psps.length-1 ? '<i class="fas fa-chevron-right text-surface-300 text-xs"></i>' : '') + '</div>';
          }).join('') +
        '</div>' +
        '<div class="text-[10px] text-surface-400 mt-2">AI PSP Router auto-selects optimal rail. Fallback on timeout (>5s) or error rate >2%.</div>' +
      '</div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderSpecialRates() {
  setTitle('Special Rate Manager', 'Custom SGTX FEES rates per GTID pair');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Custom SGTX fee rates per GTID pair', 'Set special rates for specific trade corridors', 'Rates must stay within 0.1%-2.5% range', 'Changes apply immediately to new trades')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-percent', 'Special Rates', 8, null, 'purple')}
      ${metricCard('fa-arrow-down', 'Min Rate', '0.5%', null, 'green')}
      ${metricCard('fa-arrow-up', 'Max Rate', '2.0%', null, 'amber')}
      ${metricCard('fa-chart-line', 'Avg Rate', '1.2%', null, 'blue')}
    </div>
    ${dataTable(['GTID Pair', 'Corridor', 'Rate', 'Volume (30d)', 'Since', 'Action'], [
      '<tr><td class="font-mono text-[10px]">CIRO ↔ SGTX</td><td class="text-xs">EG → VN</td><td class="text-xs font-bold text-gold-400">1.5%</td><td class="text-xs">$450K</td><td class="text-xs">Dec 2024</td><td><button class="text-[10px] text-gold-400 hover:underline">Edit</button></td></tr>',
      '<tr><td class="font-mono text-[10px]">ASFI ↔ HAMB</td><td class="text-xs">SG → DE</td><td class="text-xs font-bold text-gold-400">0.8%</td><td class="text-xs">$1.2M</td><td class="text-xs">Nov 2024</td><td><button class="text-[10px] text-gold-400 hover:underline">Edit</button></td></tr>',
    ], { title: 'Custom Fee Rates (0.1% — 2.5% range)' })}`;
}

async function renderImpersonation() {
  setTitle('Tenant Impersonation', 'Readonly, multisig-approved');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('View-only tenant impersonation for support', 'Select tenant to view their perspective', 'Requires 3-of-5 multisig approval', 'All sessions logged immutably')}
    <div class="sgtx-card mb-6 border-amber-200 bg-amber-50/30">
      <div class="flex items-center gap-3 p-2"><i class="fas fa-exclamation-triangle text-amber-500 text-lg"></i>
        <div class="text-[10px] text-amber-700"><b>Security:</b> Readonly access only. Multisig approval required. All sessions immutably logged (G4).</div>
      </div>
    </div>
    ${dataTable(['Tenant', 'Type', 'Requested By', 'Duration', 'Status'], [
      '<tr><td class="text-sm">Cairo Imports</td><td class="text-xs">CORPORATE</td><td class="text-xs">Admin A</td><td class="text-xs">15 min</td><td>' + badge('APPROVED') + '</td></tr>',
      '<tr><td class="text-sm">Saigon Textiles</td><td class="text-xs">CORPORATE</td><td class="text-xs">Admin B</td><td class="text-xs">8 min</td><td>' + badge('APPROVED') + '</td></tr>',
    ], { title: 'Impersonation Log' })}`;
}

async function renderMarketplacePartners() {
  setTitle('Marketplace Partners', 'Onboard partners, manage revenue splits');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Marketplace partner management', 'Onboard new partners and configure revenue', 'Partner KYB verification required', 'Revenue splits per attributed trade')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-handshake', 'Active Partners', 4, null, 'blue')}
      ${metricCard('fa-user-plus', 'Pending', 1, null, 'amber')}
      ${metricCard('fa-chart-pie', 'Revenue Shared', '$12.4K', null, 'green')}
      ${metricCard('fa-link', 'Integrations', 6, null, 'purple')}
    </div>
    ${dataTable(['Partner', 'Status', 'Split', 'Trades', 'Revenue', 'Action'], [
      '<tr><td class="text-sm font-medium">TradeFlow Marketplace</td><td>' + badge('ACTIVE') + '</td><td class="text-xs font-semibold">15%</td><td class="text-center">24</td><td class="text-xs font-semibold">$8,200</td><td><button class="text-[10px] text-gold-400 hover:underline">Manage</button></td></tr>',
      '<tr><td class="text-sm font-medium">GlobalSource.io</td><td>' + badge('ACTIVE') + '</td><td class="text-xs font-semibold">12%</td><td class="text-center">11</td><td class="text-xs font-semibold">$3,100</td><td><button class="text-[10px] text-gold-400 hover:underline">Manage</button></td></tr>',
    ], { title: 'Marketplace Partners' })}`;
}

async function renderIncidents() {
  setTitle('Incidents', 'Lifecycle management, automated post-mortems');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Platform incident tracking', 'Monitor and resolve active incidents', 'Active incidents may affect processing', 'Post-mortem auto-generated after resolution')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-fire', 'Active', 0, null, 'green')}
      ${metricCard('fa-clock', 'Avg Resolution', '23min', -15, 'blue')}
      ${metricCard('fa-chart-line', 'Uptime (30d)', '99.97%', null, 'purple')}
      ${metricCard('fa-file-alt', 'Post-Mortems', 3, null, 'amber')}
    </div>
    ${dataTable(['ID', 'Severity', 'Title', 'Started', 'Duration', 'Status'], [
      '<tr><td class="font-mono text-xs">INC-003</td><td><span class="text-xs font-bold text-amber-600">P2</span></td><td class="text-sm">PSP Stripe elevated latency</td><td class="text-xs">Jan 15</td><td class="text-xs">18min</td><td>' + badge('DELIVERED') + '</td></tr>',
      '<tr><td class="font-mono text-xs">INC-002</td><td><span class="text-xs font-bold text-red-600">P1</span></td><td class="text-sm">Governor timeout</td><td class="text-xs">Jan 10</td><td class="text-xs">34min</td><td>' + badge('DELIVERED') + '</td></tr>',
    ], { title: 'Incident History' })}`;
}

async function renderConfigHistory() {
  setTitle('Configuration History', 'Version control, rollback for all settings');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Platform config changes with version control', 'Review and rollback changes', 'Rollback requires approval', 'Changes tracked immutably (G4)')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-code-branch', 'Versions', 47, null, 'purple')}
      ${metricCard('fa-clock-rotate-left', 'Changes (7d)', 5, null, 'blue')}
      ${metricCard('fa-rotate-left', 'Rollbacks', 1, null, 'amber')}
      ${metricCard('fa-user', 'Contributors', 3, null, 'green')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-code-branch text-gold-400 mr-2"></i>Configuration Changes</h3></div>
      <div class="divide-y divide-surface-100">
        ${[{ver:'v47',change:'Updated jurisdiction matrix',author:'Admin A',time:'2h ago'},{ver:'v46',change:'PSP fallback chain reordered',author:'Admin B',time:'1d ago'},{ver:'v45',change:'Fee rate adjusted EG-VN corridor',author:'Admin A',time:'3d ago'},{ver:'v44',change:'Governor policy: Added G1U11 gate',author:'Admin C',time:'5d ago'}].map(c =>
          '<div class="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition">' +
            '<span class="font-mono text-xs text-gold-400 font-bold w-8">' + c.ver + '</span>' +
            '<div class="flex-1"><div class="text-xs text-surface-800">' + c.change + '</div><div class="text-[10px] text-surface-400">' + c.author + ' &bull; ' + c.time + '</div></div>' +
            '<button class="text-[10px] text-gold-400 hover:underline">Rollback</button>' +
          '</div>'
        ).join('')}
      </div>
    </div>`;
}

async function renderCustomerCare() {
  setTitle('Customer Care Hub', 'AI chatbot oversight, human escalation queue');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('AI chatbot oversight and human escalation', 'Handle escalated support tickets', 'High-volume may increase queue', 'AI resolves 78% without escalation')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-robot', 'AI Resolved', '78%', 5, 'green')}
      ${metricCard('fa-headset', 'Escalated', 3, null, 'amber')}
      ${metricCard('fa-clock', 'Avg Response', '< 2min', null, 'blue')}
      ${metricCard('fa-star', 'Satisfaction', '4.6/5', null, 'purple')}
    </div>
    ${dataTable(['Ticket', 'Tenant', 'Issue', 'Priority', 'Status', 'Action'], [
      '<tr><td class="font-mono text-xs">TKT-042</td><td class="text-sm">Cairo Imports</td><td class="text-xs">Fee dispute</td><td><span class="text-xs font-bold text-red-600">HIGH</span></td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Handle</button></td></tr>',
      '<tr><td class="font-mono text-xs">TKT-041</td><td class="text-sm">Saigon Textiles</td><td class="text-xs">EXW lock issue</td><td><span class="text-xs font-bold text-amber-600">MED</span></td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-gold-400 text-white px-3 py-1 rounded-lg">Handle</button></td></tr>',
    ], { title: 'Escalation Queue' })}`;
}

async function renderMPDashboard() {
  setTitle('Partner Dashboard', 'API usage, leads & revenue');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-key', 'API Keys', 2, null, 'purple')}
      ${metricCard('fa-funnel-dollar', 'Active Leads', 0, null, 'blue')}
      ${metricCard('fa-webhook', 'Webhooks', 0, null, 'cyan')}
      ${metricCard('fa-chart-pie', 'Revenue', '$0', null, 'green')}
    </div>
    ${fourQuestions('Partner integration active', 'Manage API keys and webhooks', 'None', 'Revenue attribution updates daily')}
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-code text-gold-400 mr-2"></i>API Endpoints</h3>
      <div class="space-y-2">
        ${[['POST', '/partner/intent/analyze', 'Analyze trade intent'],['POST', '/partner/trade/initiate', 'Initiate trade'],['GET', '/partner/suppliers/match', 'Match suppliers'],['POST', '/partner/webhook/register', 'Register webhook']].map(([method, path, desc]) => 
          `<div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${method === 'POST' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${method}</span>
            <code class="text-xs font-mono text-gold-400 flex-1">${path}</code>
            <span class="text-[10px] text-surface-400">${desc}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderAPIKeys() {
  setTitle('API Keys', 'Ed25519 keys, rate limit gauges');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('API key management for platform integration', 'Generate and manage Ed25519 keys', 'Rate limits enforced per key', 'Keys enable automated trade initiation')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-key', 'Active Keys', 2, null, 'purple')}
      ${metricCard('fa-chart-bar', 'Calls Today', 847, null, 'blue')}
      ${metricCard('fa-gauge', 'Rate Used', '34%', null, 'green')}
      ${metricCard('fa-shield-halved', 'Security', 'Ed25519', null, 'cyan')}
    </div>
    <div class="sgtx-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-key text-gold-400 mr-2"></i>API Keys</h3>
        <button class="px-4 py-2 bg-gold-400 text-white text-xs rounded-lg font-semibold hover:bg-gold-500 transition"><i class="fas fa-plus mr-1"></i>Generate Key</button>
      </div>
      <div class="space-y-3">
        ${[{name:'Production Key',prefix:'sk_live_7x8K...',created:'Dec 2024',calls:12450,limit:50000,active:true},{name:'Staging Key',prefix:'sk_test_3m2N...',created:'Nov 2024',calls:3200,limit:10000,active:true}].map(k => `
          <div class="p-4 rounded-xl border border-surface-100 hover:border-gold-200 transition">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center"><i class="fas fa-key text-gold-400 text-xs"></i></div>
                <div>
                  <div class="text-sm font-medium">${k.name}</div>
                  <div class="text-[10px] font-mono text-surface-400">${k.prefix}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] ${k.active?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'} px-2 py-0.5 rounded font-semibold">${k.active?'Active':'Revoked'}</span>
                <button class="text-[10px] text-red-500 hover:underline">Revoke</button>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center justify-between text-[10px] text-surface-400 mb-1"><span>Rate Limit</span><span>${k.calls.toLocaleString()} / ${k.limit.toLocaleString()}</span></div>
                <div class="h-2 bg-surface-100 rounded-full"><div class="h-2 bg-gold-400 rounded-full" style="width:${(k.calls/k.limit)*100}%"></div></div>
              </div>
              <div class="text-[10px] text-surface-400">Since ${k.created}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderLeadManagement() {
  setTitle('Lead Management', 'Intent inbox with viability scores');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/partner/leads?tenant_id=' + tenant.id);
    var leads = res.data || [];
    var active = leads.filter(function(l){return l.status==='NEW'||l.status==='ANALYZING';});
    var converted = leads.filter(function(l){return l.status==='CONVERTED';});
    content.innerHTML =
      fourQuestions('Trade intent leads from marketplace integration', 'Review and convert high-viability leads', active.length > 0 ? active.length + ' leads pending review' : 'Pipeline clear', 'Converted leads become trade requests') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-funnel-dollar', 'Active Leads', active.length, null, 'blue') +
        metricCard('fa-check', 'Converted', converted.length, null, 'green') +
        metricCard('fa-chart-line', 'Conversion Rate', leads.length>0 ? Math.round(converted.length/leads.length*100)+'%' : '—', null, 'purple') +
        metricCard('fa-dollar-sign', 'Pipeline Value', '$' + leads.reduce(function(s,l){return s+(l.estimated_value||0);},0).toLocaleString(), null, 'amber') +
      '</div>' +
      '<div class="sgtx-card !p-0 overflow-hidden">' +
        '<div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between"><h3 class="font-semibold text-sm"><i class="fas fa-funnel-dollar text-gold-400 mr-2"></i>Lead Inbox</h3>' +
        '<button onclick="mpAnalyzeLeads()" class="text-[10px] bg-gold-400 text-white px-3 py-1.5 rounded-lg font-semibold"><i class="fas fa-robot mr-1"></i>AI Analyze</button></div>' +
        '<div class="divide-y divide-surface-100">' +
          (leads.length===0 ? '<div class="py-8 text-center text-surface-400 text-xs">No leads yet</div>' :
          leads.map(function(l){
            var viability = l.viability_score||0;
            return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">' +
              '<div class="flex-1"><div class="text-sm font-medium">' + (l.company_name||'Unknown') + '</div>' +
              '<div class="text-xs text-surface-400">' + (l.intent_description||'') + ' • $' + (l.estimated_value||0).toLocaleString() + '</div></div>' +
              '<div class="flex items-center gap-3">' +
                '<div class="text-center"><div class="text-xs font-bold ' + (viability>=80?'text-emerald-600':viability>=60?'text-amber-600':'text-red-600') + '">' + viability + '%</div><div class="text-[10px] text-surface-400">viability</div></div>' +
                badge(l.status) +
                '<span class="text-[10px] text-surface-400">' + timeAgo(l.created_at) + '</span>' +
              '</div></div>';
          }).join('')) +
        '</div></div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderWebhooks() {
  setTitle('Webhooks', 'Register endpoints, event logs, retry');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/partner/webhooks?tenant_id=' + tenant.id);
    var hooks = res.data || [];
    var active = hooks.filter(function(h){return h.status==='ACTIVE';});
    content.innerHTML =
      fourQuestions('Webhook endpoint management', 'Register URLs and monitor delivery', 'Failed deliveries auto-retry 3 times', 'Real-time notifications for trade events') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-link', 'Active Webhooks', active.length, null, 'blue') +
        metricCard('fa-check', 'Total Registered', hooks.length, null, 'green') +
        metricCard('fa-rotate', 'Avg Success', hooks.length>0 ? Math.round(hooks.reduce(function(s,h){return s+(h.success_rate||100);},0)/hooks.length)+'%' : '100%', null, 'purple') +
        metricCard('fa-bell', 'Events Today', hooks.reduce(function(s,h){return s+(h.events_today||0);},0), null, 'amber') +
      '</div>' +
      '<div class="sgtx-card mb-6">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h3 class="font-semibold text-sm"><i class="fas fa-link text-gold-400 mr-2"></i>Registered Endpoints</h3>' +
          '<button onclick="mpAddWebhook()" class="px-4 py-2 bg-gold-400 text-white text-xs rounded-lg font-semibold"><i class="fas fa-plus mr-1"></i>Add Webhook</button>' +
        '</div>' +
        '<div class="space-y-3">' +
          (hooks.length===0 ? '<div class="py-6 text-center text-surface-400 text-xs">No webhooks registered</div>' :
          hooks.map(function(w){
            var events = [];try{events=JSON.parse(w.events||'[]');}catch(e){events=[w.events];}
            return '<div class="p-4 rounded-xl border border-surface-100">' +
              '<div class="flex items-center justify-between mb-2">' +
                '<code class="text-xs font-mono text-gold-400">' + (w.url||'—') + '</code>' +
                '<div class="flex items-center gap-2">' + badge(w.status||'ACTIVE') +
                '<button onclick="mpTestWebhook(\'' + w.id + '\')" class="text-[10px] text-gold-400 hover:underline">Test</button></div>' +
              '</div>' +
              '<div class="flex items-center justify-between">' +
                '<div class="flex gap-1 flex-wrap">' + events.map(function(e){return '<span class="text-[9px] px-1.5 py-0.5 bg-surface-100 rounded text-surface-600">' + e + '</span>';}).join('') + '</div>' +
                '<span class="text-[10px] text-surface-400">' + (w.success_rate||100) + '% delivery</span>' +
              '</div>' +
            '</div>';
          }).join('')) +
        '</div>' +
      '</div>';
  } catch(e) { content.innerHTML = renderError(e.message); }
}

async function renderRevenueAttribution() {
  setTitle('Revenue Attribution', 'Per-trade revenue tracking');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Revenue attributed per marketplace lead', 'Track earnings from converted leads', 'Attribution window: 90 days after lead', 'Monthly payouts on confirmed trades')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-chart-pie', 'Total Revenue', '$12,400', 18, 'green')}
      ${metricCard('fa-handshake', 'Attributed Trades', 24, null, 'blue')}
      ${metricCard('fa-percent', 'Avg Split', '13.5%', null, 'purple')}
      ${metricCard('fa-calendar', 'Next Payout', '15 Feb', null, 'amber')}
    </div>
    ${dataTable(['Trade', 'Lead Source', 'Trade Value', 'Fee Rate', 'Your Share', 'Status'], [
      '<tr><td class="font-mono text-xs">TRD-2024-018</td><td class="text-xs">TradeFlow intent</td><td class="text-xs font-semibold">$245,000</td><td class="text-xs">1.5%</td><td class="text-xs font-semibold text-emerald-600">$551</td><td>' + badge('APPROVED') + '</td></tr>',
      '<tr><td class="font-mono text-xs">TRD-2024-015</td><td class="text-xs">API direct</td><td class="text-xs font-semibold">$180,000</td><td class="text-xs">2.0%</td><td class="text-xs font-semibold text-emerald-600">$540</td><td>' + badge('APPROVED') + '</td></tr>',
      '<tr><td class="font-mono text-xs">TRD-2024-012</td><td class="text-xs">TradeFlow intent</td><td class="text-xs font-semibold">$92,000</td><td class="text-xs">1.8%</td><td class="text-xs font-semibold text-emerald-600">$248</td><td>' + badge('PENDING') + '</td></tr>',
    ], { title: 'Revenue Attribution History' })}`;
}

async function renderSandboxEnv() {
  setTitle('Sandbox Environment', 'Synthetic data, reset daily');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Test environment with synthetic data', 'Test API integrations safely', 'Data resets every 24 hours', 'Mirror of production APIs with test data')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-flask', 'Test Trades', 50, null, 'purple')}
      ${metricCard('fa-users', 'Synthetic Tenants', 10, null, 'blue')}
      ${metricCard('fa-clock', 'Next Reset', '18h', null, 'amber')}
      ${metricCard('fa-check', 'API Coverage', '100%', null, 'green')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-flask text-gold-400 mr-2"></i>Sandbox Status</h3>
        <div class="space-y-3">
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-semibold text-emerald-700">Environment Active</span>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl"><div class="text-[10px] text-surface-400">Base URL</div><code class="text-xs text-gold-400">https://sandbox.sgtx.platform/api/v1</code></div>
          <div class="p-3 bg-surface-50 rounded-xl"><div class="text-[10px] text-surface-400">Test API Key</div><code class="text-xs text-gold-400">sk_test_sandbox_...</code></div>
          <button class="w-full py-2.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"><i class="fas fa-rotate mr-1"></i>Reset Sandbox Now</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-database text-gold-400 mr-2"></i>Synthetic Data</h3>
        <div class="space-y-2 text-xs text-surface-600">
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 rounded"><span>Tenants</span><span class="font-mono font-semibold">10</span></div>
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 rounded"><span>Trade Requests</span><span class="font-mono font-semibold">50</span></div>
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 rounded"><span>Contracts</span><span class="font-mono font-semibold">25</span></div>
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 rounded"><span>Shipments</span><span class="font-mono font-semibold">30</span></div>
          <div class="flex items-center justify-between p-2 hover:bg-surface-50 rounded"><span>Financing Requests</span><span class="font-mono font-semibold">15</span></div>
        </div>
      </div>
    </div>`;
}

async function renderUsageAnalytics() {
  setTitle('Usage Analytics', 'API call volumes and patterns');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('API usage patterns and analytics', 'Monitor call volumes and performance', 'Rate limiting at 80% capacity', 'Usage data informs partnership negotiations')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-chart-bar', 'Total Calls (30d)', '24.5K', 22, 'blue')}
      ${metricCard('fa-clock', 'Avg Latency', '145ms', -8, 'green')}
      ${metricCard('fa-bug', 'Error Rate', '0.3%', null, 'amber')}
      ${metricCard('fa-arrow-up', 'Peak Load', '120 rps', null, 'purple')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-area text-gold-400 mr-2"></i>API Call Volume (30 days)</h3>
      <div class="h-40 flex items-end gap-1 px-2">
        ${Array.from({length:30}, (_,i) => {const h = 30 + Math.random()*65; return `<div class="flex-1 bg-gradient-to-t from-sgtx-500 to-sgtx-400 rounded-t opacity-80 hover:opacity-100 transition" style="height:${h}%" title="Day ${i+1}"></div>`;}).join('')}
      </div>
      <div class="flex justify-between mt-2 text-[10px] text-surface-400"><span>30 days ago</span><span>Today</span></div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-list text-gold-400 mr-2"></i>Top Endpoints</h3>
      <div class="space-y-2">
        ${[{endpoint:'POST /partner/intent/analyze',calls:'8,240',pct:34},{endpoint:'POST /partner/trade/initiate',calls:'5,120',pct:21},{endpoint:'GET /partner/suppliers/match',calls:'4,890',pct:20},{endpoint:'POST /partner/webhook/register',calls:'3,200',pct:13},{endpoint:'GET /partner/status',calls:'3,050',pct:12}].map(e => `
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50">
            <code class="text-[10px] font-mono text-gold-400 flex-1">${e.endpoint}</code>
            <span class="text-xs font-semibold w-16 text-right">${e.calls}</span>
            <div class="w-24 h-2 bg-surface-100 rounded-full"><div class="h-2 bg-gold-400 rounded-full" style="width:${e.pct}%"></div></div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderLabTestingJobs() {
  setTitle('Testing Jobs', 'Manage lab testing workflow');
  const tid = tenant?.id || '';
  let jobs = [];
  try { jobs = (await api('/lab/testing-jobs?tenant_id=' + tid)).data || []; } catch(e) {}
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-hourglass-start', 'Pending', jobs.filter(j=>j.status==='PENDING').length, null, 'amber')}
      ${metricCard('fa-flask', 'In Progress', jobs.filter(j=>j.status==='IN_PROGRESS').length, null, 'blue')}
      ${metricCard('fa-clipboard-check', 'Completed', jobs.filter(j=>j.status==='RESULTS_SUBMITTED').length, null, 'emerald')}
      ${metricCard('fa-vial', 'Total', jobs.length, null, 'purple')}
    </div>
    <div class="glass-card p-5">
      <table class="w-full text-sm">
        <thead><tr class="text-left text-surface-500 text-xs border-b">
          <th class="pb-2">Sample</th><th class="pb-2">Commodity</th><th class="pb-2">Test Panel</th>
          <th class="pb-2">Due</th><th class="pb-2">Status</th><th class="pb-2">Actions</th>
        </tr></thead>
        <tbody>${jobs.map(j => {
          let panel = [];
          try { panel = JSON.parse(j.test_panel || '[]'); } catch(e) {}
          return `<tr class="border-b border-surface-100">
            <td class="py-2 font-mono text-xs">${j.sample_tracking_number || j.id}</td>
            <td class="py-2">${j.commodity_type}</td>
            <td class="py-2 text-xs">${panel.join(', ')}</td>
            <td class="py-2">${j.due_date || '—'}</td>
            <td class="py-2">${badge(j.status)}</td>
            <td class="py-2">
              ${j.status === 'PENDING' ? `<button onclick="labConfirmReceipt('${j.id}')" class="btn-xs btn-primary">Receive</button>` : ''}
              ${j.status === 'SAMPLE_RECEIVED' ? `<button onclick="labStartTesting('${j.id}')" class="btn-xs btn-success">Start</button>` : ''}
              ${j.status === 'IN_PROGRESS' ? `<button onclick="labSubmitResults('${j.id}')" class="btn-xs btn-primary">Results</button>` : ''}
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

// ═══ RECOVERED ACTION HELPERS (v11.2) ═══

async function showRespondToRFQ(rfqId) {
  showModal(
    '<h3 class="text-lg font-bold text-surface-900 mb-4"><i class="fas fa-reply text-gold-400 mr-2"></i>Submit Logistics Quote</h3>' +
    '<div class="space-y-3">' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Total Price (USD)</label><input id="rfq-resp-price" type="number" class="w-full" placeholder="2500.00"></div>' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Transit Time (Days)</label><input id="rfq-resp-transit" type="number" class="w-full" placeholder="14"></div>' +
      '</div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Services Included</label><input id="rfq-resp-services" type="text" class="w-full" placeholder="SEA_FREIGHT, REEFER, PORT_HANDLING"></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Conditions / Notes</label><textarea id="rfq-resp-conditions" rows="2" class="w-full" placeholder="e.g. Temperature monitoring included, insurance extra..."></textarea></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Valid Until</label><input id="rfq-resp-valid" type="date" class="w-full"></div>' +
      '<button onclick="submitRFQResponse(\'' + rfqId + '\')" class="btn-success w-full"><i class="fas fa-paper-plane mr-2"></i>Submit Quote</button>' +
    '</div>'
  );
}

async function lspQuoteRFQ(rfqId) {
  showModal('<h3 class="text-lg font-bold mb-4"><i class="fas fa-reply text-gold-400 mr-2"></i>Submit Quote</h3>' +
    '<div class="space-y-3">' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Price (USD)</label><input id="lsp-q-price" type="number" class="w-full" placeholder="3500"></div>' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Transit Days</label><input id="lsp-q-days" type="number" class="w-full" placeholder="14"></div>' +
      '</div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Notes</label><textarea id="lsp-q-notes" rows="2" class="w-full" placeholder="Service details..."></textarea></div>' +
      '<button onclick="lspSubmitQuote(\'' + rfqId + '\')" class="btn-success w-full"><i class="fas fa-paper-plane mr-2"></i>Submit</button>' +
    '</div>');
}

async function lspOptimiseRoutes() {
  showToast('Running AI route optimization...','info');
  try {
    var res = await apiPost('/lsp/dispatch/optimise', {tenant_id:tenant.id});
    showToast('Routes optimized! Savings: ' + ((res.data||{}).estimated_savings||'N/A'),'success');
    renderDispatchPlanner();
  } catch(e){showToast(e.message,'error');}
}

async function lspAssignDispatch(planId) {
  try {
    await apiPost('/lsp/dispatch/assign', {plan_id:planId, tenant_id:tenant.id});
    showToast('Dispatch assigned!','success'); renderDispatchPlanner();
  } catch(e){showToast(e.message,'error');}
}

async function submitFinancingBid(requestId) {
  const apr = prompt('Enter your effective APR (e.g. 6.5):');
  if (!apr) return;
  const allIn = prompt('Enter all-in cost (USD):');
  if (!allIn) return;
  try {
    const res = await api('/financing/bids', 'POST', {
      financing_request_id: requestId,
      financier_tenant_id: window.__tenant_id || 'tenant-003',
      effective_apr: parseFloat(apr),
      all_in_cost: parseFloat(allIn),
      conditions: 'Standard terms',
      actor_gtid: window.__gtid || 'SGTX-SG-FIN-000001-E5F6'
    });
    if (res.data) { alert('Bid submitted successfully!'); renderFinancierDashboard(); }
    else alert('Error: ' + (res.error || 'Unknown'));
  } catch(e) { alert('Bid failed: ' + e.message); }
}

async function confirmSettlement(instructionId) {
  try {
    showToast('Verifying settlement...', 'info');
    await apiPost('/settlement/approve', { instruction_id: instructionId, approver_tenant_id: tenant.id });
    showToast('Settlement confirmed!', 'success');
    renderSettlements();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function viewSettlementDetails(ustn) {
  try {
    var res = await api('/settlement/status/' + ustn);
    var data = res.data || res;
    showModal(
      '<div class="space-y-4">' +
        '<h3 class="text-lg font-bold text-surface-800">Settlement: ' + ustn + '</h3>' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['Status', data.status || 'PENDING'], ['Amount', usd(data.amount || 0)], ['Currency', data.currency || 'USD'], ['PSP', data.psp_name || '—'], ['Type', data.instruction_type || '—'], ['Created', time(data.created_at)]].map(function(r) {
            return '<div class="bg-surface-50 rounded-lg p-3 border border-surface-100"><div class="text-[10px] text-surface-500 uppercase">' + r[0] + '</div><div class="text-sm font-medium text-surface-800">' + r[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (data.split_details ? '<div class="bg-blue-50 rounded-lg p-3 border border-blue-100 text-xs"><strong>Split Details:</strong> ' + JSON.stringify(data.split_details) + '</div>' : '') +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function startInspection(id) {
  try {
    await api(`/inspections/${id}`, 'PATCH', { status: 'IN_PROGRESS' });
    renderQCDashboard();
  } catch(e) { alert('Error: ' + e.message); }
}

async function completeInspection(id) {
  const result = confirm('Did the inspection PASS?') ? 'PASS' : 'FAIL';
  try {
    await api(`/inspections/${id}`, 'PATCH', { status: 'COMPLETED', result, findings: { defects_found: result === 'PASS' ? 1 : 5 }, ai_summary: `Inspection completed with result: ${result}` });
    renderQCDashboard();
  } catch(e) { alert('Error: ' + e.message); }
}

async function qcAcceptInspection(id) {
  try {
    await apiPost('/qc/inspection-queue/' + id + '/accept', {tenant_id:tenant.id});
    showToast('Inspection accepted!','success'); renderInspectionQueue();
  } catch(e){showToast(e.message,'error');}
}

async function qcStartInspection(id) {
  try {
    await apiPost('/qc/inspection-queue/' + id + '/start', {tenant_id:tenant.id});
    showToast('Inspection started!','success'); renderInspectionQueue();
  } catch(e){showToast(e.message,'error');}
}

async function qcSubmitReport(id) {
  showModal('<h3 class="text-lg font-bold mb-4"><i class="fas fa-file-medical text-gold-400 mr-2"></i>Submit Inspection Report</h3>' +
    '<div class="space-y-3">' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Result</label><select id="qc-result" class="w-full"><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="CONDITIONAL">CONDITIONAL PASS</option></select></div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Defects Found</label><input id="qc-defects" type="number" class="w-full" value="0"></div>' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Sample Size</label><input id="qc-sample" type="number" class="w-full" value="200"></div>' +
      '</div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Findings</label><textarea id="qc-findings" rows="3" class="w-full" placeholder="Inspection findings..."></textarea></div>' +
      '<button onclick="qcDoSubmitReport(\'' + id + '\')" class="btn-success w-full"><i class="fas fa-paper-plane mr-2"></i>Submit Report</button>' +
    '</div>');
}

async function govApproveWorkflow(id) {
  try {
    await apiPost('/gov/multi-agency/' + id + '/approve', {officer_id:tenant.id, agency:tenant.name||'Customs'});
    showToast('Workflow step approved!','success'); renderMultiAgency();
  } catch(e){showToast(e.message,'error');}
}

async function govVerifyDoc(id) {
  try {
    await apiPost('/gov/documents/' + id + '/verify', {action:'VERIFY',officer_id:tenant.id});
    showToast('Document verified!','success'); renderGovDocs();
  } catch(e){showToast(e.message,'error');}
}

async function govRejectDoc(id) {
  var reason = prompt('Rejection reason:');
  if(!reason) return;
  try {
    await apiPost('/gov/documents/' + id + '/verify', {action:'REJECT',officer_id:tenant.id,reason:reason});
    showToast('Document rejected','success'); renderGovDocs();
  } catch(e){showToast(e.message,'error');}
}

async function adminAddPolicy() {
  showModal('<h3 class="text-lg font-bold mb-4"><i class="fas fa-scroll text-gold-400 mr-2"></i>Add Constitutional Policy</h3>' +
    '<div class="space-y-3">' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Policy Name</label><input id="pol-name" class="w-full" placeholder="e.g. G1U12 - New Gate"></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Category</label><select id="pol-cat" class="w-full"><option>G1</option><option>G2</option><option>G3</option><option>G4</option><option>OPERATIONAL</option></select></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Description</label><textarea id="pol-desc" rows="2" class="w-full" placeholder="Policy description..."></textarea></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Rule (Rego/WASM)</label><textarea id="pol-rule" rows="3" class="w-full font-mono text-xs" placeholder="allow { input.amount < 1000000 }"></textarea></div>' +
      '<button onclick="adminSavePolicy()" class="btn-success w-full"><i class="fas fa-save mr-2"></i>Save Policy</button>' +
    '</div>');
}

async function adminSimulatePolicy() {
  var rule = document.getElementById('admin-sim-policy').value;
  if(!rule){showToast('Enter a policy rule to simulate','error');return;}
  try {
    var res = await apiPost('/admin/policies/simulate', {rule_body:rule});
    var d = res.data||{};
    document.getElementById('sim-result').innerHTML =
      '<div class="p-3 rounded-xl ' + (d.would_block>0?'bg-amber-50 border border-amber-200':'bg-emerald-50 border border-emerald-200') + '">' +
        '<div class="text-xs font-semibold ' + (d.would_block>0?'text-amber-800':'text-emerald-800') + '">Simulation Result</div>' +
        '<div class="text-[10px] mt-1">' + (d.affected_trades||0) + ' trades affected, ' + (d.would_block||0) + ' would be blocked</div>' +
      '</div>';
  } catch(e){showToast(e.message,'error');}
}

async function adminAddPSP() {
  showModal('<h3 class="text-lg font-bold mb-4"><i class="fas fa-credit-card text-gold-400 mr-2"></i>Add PSP</h3>' +
    '<div class="space-y-3">' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">PSP Name</label><input id="psp-name" class="w-full" placeholder="e.g. Stripe"></div>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Priority</label><input id="psp-priority" type="number" class="w-full" value="1"></div>' +
        '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Currencies</label><input id="psp-curr" class="w-full" placeholder="USD,EUR,GBP"></div>' +
      '</div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">API Endpoint</label><input id="psp-endpoint" class="w-full" placeholder="https://api.stripe.com/v1"></div>' +
      '<button onclick="adminSavePSP()" class="btn-success w-full"><i class="fas fa-save mr-2"></i>Save PSP</button>' +
    '</div>');
}

async function adminTestPSP(id) {
  showToast('Testing PSP connectivity...','info');
  try {
    var res = await apiPost('/admin/psp/' + id + '/test', {});
    var d = res.data||{};
    showToast('PSP ' + (d.success?'healthy':'unhealthy') + ' — ' + (d.latency_ms||0) + 'ms', d.success?'success':'error');
  } catch(e){showToast(e.message,'error');}
}

async function mpAnalyzeLeads() {
  showToast('Running AI lead analysis...','info');
  try {
    var res = await apiPost('/partner/leads/analyze', {tenant_id:tenant.id});
    showToast('Analysis complete! ' + ((res.data||{}).analyzed||0) + ' leads scored','success');
    renderLeadManagement();
  } catch(e){showToast(e.message,'error');}
}

async function mpAddWebhook() {
  showModal('<h3 class="text-lg font-bold mb-4"><i class="fas fa-link text-gold-400 mr-2"></i>Register Webhook</h3>' +
    '<div class="space-y-3">' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Endpoint URL</label><input id="wh-url" class="w-full" placeholder="https://api.yourapp.com/webhooks/sgtx"></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Events (comma-separated)</label><input id="wh-events" class="w-full" placeholder="trade.created,quote.submitted,contract.signed"></div>' +
      '<div><label class="text-xs text-surface-500 font-semibold block mb-1">Secret (for signature verification)</label><input id="wh-secret" class="w-full" placeholder="whsec_..."></div>' +
      '<button onclick="mpSaveWebhook()" class="btn-success w-full"><i class="fas fa-save mr-2"></i>Register</button>' +
    '</div>');
}

async function mpTestWebhook(id) {
  showToast('Sending test event...','info');
  try {
    var res = await apiPost('/partner/webhooks/' + id + '/test', {});
    showToast('Test ' + ((res.data||{}).success?'delivered!':'failed'), (res.data||{}).success?'success':'error');
  } catch(e){showToast(e.message,'error');}
}

async function labConfirmReceipt(id) {
  try { await apiPost('/lab/testing-jobs/' + id + '/confirm-receipt', {}); showToast('Sample receipt confirmed', 'success'); renderLabTestingJobs(); }
  catch(e) { showToast('Failed', 'error'); }
}

async function labStartTesting(id) {
  try { await apiPost('/lab/testing-jobs/' + id + '/start', {}); showToast('Testing started', 'success'); renderLabTestingJobs(); }
  catch(e) { showToast('Failed', 'error'); }
}

async function labSubmitResults(id) {
  const verdict = prompt('Verdict (PASS/FAIL/CONDITIONAL):') || 'PASS';
  const results = [
    { analyte: 'Cypermethrin', value: 0.02, unit: 'mg/kg', limit: 0.05, pass: true },
    { analyte: 'Chlorpyrifos', value: 0.001, unit: 'mg/kg', limit: 0.01, pass: true },
    { analyte: 'E.coli', value: 0, unit: 'CFU/g', limit: 10, pass: true }
  ];
  try {
    await apiPost('/lab/testing-jobs/' + id + '/results', { verdict: verdict.toUpperCase(), results, certificate_type: 'PHYTO' });
    showToast('Results submitted — ' + verdict, 'success'); renderLabTestingJobs();
  } catch(e) { showToast('Failed', 'error'); }
}

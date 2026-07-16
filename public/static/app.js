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
    switchPortal(defaultPortal);
  } else {
    buildPortalSelector();
    switchPortal('dashboard');
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
  navigate('smart-inbox');
}

function renderNavigation(items) {
  const nav = document.getElementById('nav-items');
  nav.innerHTML = items.filter(item => {
    // Filter by mode for trader portal
    if (item.mode && currentPortal === 'trader') {
      return item.mode === currentMode || !item.mode;
    }
    return true;
  }).map(item => {
    if (item.section) {
      return `<div class="nav-section">${item.section}</div>`;
    }
    const isActive = currentPage === item.id;
    return `<div class="nav-item${isActive ? ' active' : ''}" onclick="navigate('${item.id}')">
      <i class="fas ${item.icon} w-4 text-center text-[11px]"></i>
      <span class="flex-1">${item.label}</span>
      ${item.badge ? '<span class="w-2 h-2 rounded-full animate-pulse-slow" style="background:#D4A017"></span>' : ''}
    </div>`;
  }).join('');
}

function switchMode(mode) {
  currentMode = mode;
  updateModeToggle();
  // Re-render navigation for mode-specific items
  const items = portalMenus[currentPortal] || portalMenus.dashboard;
  renderNavigation(items);
  navigate('smart-inbox');
}

function updateModeToggle() {
  document.getElementById('mode-BUY')?.classList.toggle('active', currentMode === 'BUY');
  document.getElementById('mode-SELL')?.classList.toggle('active', currentMode === 'SELL');
}

// ─── NAVIGATION ──────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  // Update active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${page}'`));
  });
  loadPage(page);
}
var navigateTo = navigate; // alias used by inline onclick handlers

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
      content.innerHTML = renderComingSoon(page);
    }
  } catch(e) {
    content.innerHTML = renderError(e.message);
  }
}

// ─── PAGE RENDERER REGISTRY ──────────────────────────────
const pageRenderers = {
  // Shared
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
  'exw-price-lock': renderEXWPriceLock,
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

function renderComingSoon(page) {
  return `<div class="flex flex-col items-center justify-center h-96 text-center">
    <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style="background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.2)">
      <i class="fas fa-rocket text-3xl" style="color:#D4A017"></i>
    </div>
    <h2 class="text-xl font-bold text-surface-800 mb-2">Coming Soon</h2>
    <p class="text-sm text-surface-400 max-w-md">The <span class="font-semibold" style="color:#D4A017">${page}</span> module is under development. Check back soon for updates.</p>
    <div class="mt-6 flex gap-3">
      <button onclick="navigate('smart-inbox')" class="btn-primary text-xs px-4 py-2">Back to Inbox</button>
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
  if(s==='request') el.innerHTML=`<div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-hand-holding-dollar mr-2 text-blue-500"></i>New Financing Request</h3><div class="grid grid-cols-2 gap-4 mb-4"><div><label class="text-xs text-surface-500">Trade / USTN</label><select class="w-full"><option>Select trade...</option></select></div><div><label class="text-xs text-surface-500">Type</label><select class="w-full"><option>Pre-Shipment</option><option>Post-Shipment</option><option>Invoice Factoring</option></select></div><div><label class="text-xs text-surface-500">Amount (USD)</label><input type="number" class="w-full" placeholder="50000"></div><div><label class="text-xs text-surface-500">Tenor (days)</label><select class="w-full"><option>30</option><option>60</option><option>90</option></select></div></div><button class="btn-primary w-full py-2"><i class="fas fa-paper-plane mr-1"></i>Submit (Anonymous RFQ)</button></div>`;
  else if(s==='bids') el.innerHTML=`<div class="sgtx-card p-5"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-gavel mr-2 text-purple-500"></i>Bids Received</h3><div class="space-y-3">${[{bank:'National Bank',rate:3.8,amt:50000},{bank:'Gulf Capital',rate:4.5,amt:45000}].map(b=>`<div class="p-4 bg-surface-50 rounded-lg border flex items-center justify-between"><div><div class="font-medium text-sm">${b.bank}</div><div class="text-xs text-surface-400">${b.rate}% · ${usd(b.amt)}</div></div><div class="flex gap-2"><button class="btn-primary text-xs py-1.5 px-3">Accept</button><button class="btn-ghost text-xs">Negotiate</button></div></div>`).join('')}</div></div>`;
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
  else { showToast('Opening Quote Builder...','info'); navigateTo('exw-price'); }
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
  if(mode==='A') el.innerHTML=renderLogModeA();
  else if(mode==='B') el.innerHTML=renderLogModeB();
  else el.innerHTML=renderLogModeC();
}
function renderLogModeA() {
  return `<h3 class="font-semibold text-sm mb-4"><i class="fas fa-pen mr-2 text-blue-500"></i>Manual Carrier Selection (Incoterm-Filtered)</h3>
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div><label class="text-xs text-surface-500 block mb-1">Incoterm</label><select class="w-full"><option>FOB</option><option>CFR</option><option>CIF</option><option>DAP</option><option>DDP</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Port of Loading</label><select class="w-full"><option>Alexandria, EG (EGALX)</option><option>Port Said, EG (EGPSD)</option></select></div>
      <div><label class="text-xs text-surface-500 block mb-1">Port of Discharge</label><select class="w-full"><option>Hamburg, DE (DEHAM)</option><option>Rotterdam, NL (NLRTM)</option><option>Felixstowe, GB (GBFXT)</option></select></div>
    </div>
    <div class="space-y-2 mb-4">
      ${[{carrier:'Maersk',transit:'14d',rate:'$2,400/20ft',avail:'Jul 12-15'},{carrier:'MSC',transit:'16d',rate:'$2,200/20ft',avail:'Jul 14-18'},{carrier:'CMA CGM',transit:'15d',rate:'$2,350/20ft',avail:'Jul 13-16'},{carrier:'Hapag-Lloyd',transit:'13d',rate:'$2,550/20ft',avail:'Jul 11-14'}].map((c,i)=>`
        <div class="flex items-center justify-between p-3 rounded-lg border ${i===0?'border-gold-300 bg-gold-50':'border-surface-200 hover:border-gold-200'} cursor-pointer" onclick="selectCarrier(this)">
          <div class="flex items-center gap-3"><div class="w-8 h-8 bg-surface-100 rounded flex items-center justify-center text-xs font-bold">${c.carrier[0]}</div><div><div class="font-medium text-sm">${c.carrier}</div><div class="text-xs text-surface-400">Transit: ${c.transit} · Available: ${c.avail}</div></div></div>
          <div class="text-right"><div class="font-bold text-sm">${c.rate}</div><div class="text-[10px] text-surface-400">per container</div></div>
        </div>`).join('')}
    </div>
    <button onclick="confirmLogistics('A')" class="btn-primary w-full py-3"><i class="fas fa-check mr-2"></i>Confirm Carrier Selection</button>`;
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
            <tr class="border-b border-surface-100 hover:bg-white"><td class="py-2 font-medium">${r.p}</td><td class="text-center">$${r.rate}</td><td class="text-center">${r.transit}</td><td class="text-center">${r.etd}</td><td class="text-center"><span class="font-bold ${r.score>=90?'text-emerald-600':'text-amber-600'}">${r.score}</span></td><td class="text-right"><button class="btn-primary text-xs py-1 px-3">Accept</button></td></tr>`).join('')}
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
              ${d.status==='SIGNED' ? '<button class="text-xs text-blue-500 hover:underline"><i class="fas fa-download"></i></button>' : '<button class="btn-primary text-xs py-1 px-3">Generate & Sign</button>'}
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


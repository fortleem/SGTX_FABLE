// ═══════════════════════════════════════════════════════════════════════════════
// SGTX Platform v6.3 — Futuristic Portal UI (Complete Redesign)
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
  CORPORATE:        ['trader'],
  FINANCIAL:        ['financier'],
  LOGISTICS:        ['logistics'],
  QUALITY_CONTROL:  ['qc'],
  REGULATORY:       ['government'],
  GOVERNMENT:       ['government'],
  MARKETPLACE_PARTNER: ['marketplace'],
};

const TENANT_DEFAULT_PORTAL = {
  CORPORATE: 'trader', FINANCIAL: 'financier', LOGISTICS: 'logistics',
  QUALITY_CONTROL: 'qc', REGULATORY: 'government', GOVERNMENT: 'government',
  MARKETPLACE_PARTNER: 'marketplace',
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
function isReadOnly() { return currentPortal === 'government' && tenant?.type === 'REGULATORY'; }

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
    { id: 'qc-booking', icon: 'fa-microscope', label: 'QC Booking', mode: 'SELL' },
    { id: 'barcode-print', icon: 'fa-barcode', label: 'Barcode Print', mode: 'SELL' },
    { id: 'cash-position', icon: 'fa-chart-area', label: 'Cash Position', mode: 'SELL' },
    { id: 'distressed-sell', icon: 'fa-fire', label: 'Distressed & Outreach', mode: 'SELL' },
    { section: 'Shared' },
    { id: 'disputes', icon: 'fa-gavel', label: 'Disputes' },
    { id: 'contacts', icon: 'fa-users', label: 'Saved Contacts' },
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
    { section: 'Integration' },
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
};

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  authToken = localStorage.getItem('sgtx_token');
  tenant = JSON.parse(localStorage.getItem('sgtx_tenant') || 'null');
  employee = JSON.parse(localStorage.getItem('sgtx_employee') || 'null');

  if (authToken && tenant) {
    // Populate tenant info
    document.getElementById('tenant-info').innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-sgtx-400 to-sgtx-600 flex items-center justify-center text-white text-[10px] font-bold">${(tenant.legal_name || '??').slice(0,2).toUpperCase()}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-xs text-surface-800 truncate">${tenant.legal_name}</div>
          <div class="text-[10px] text-surface-400 font-mono">${tenant.gtid || ''}</div>
        </div>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <span class="badge ${tenant.kyb_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}">${tenant.kyb_status || 'PENDING'}</span>
        <span class="text-[9px] text-surface-400">${tenant.type}</span>
      </div>`;
    document.getElementById('user-name').textContent = employee?.full_name || employee?.email || '—';
    document.getElementById('user-role').textContent = employee?.role || '—';

    // Determine current mode for CORPORATE tenants
    if (tenant.type === 'CORPORATE') {
      currentMode = tenant.default_trader_mode || employee?.active_trader_mode_context || 'BUY';
    }

    // Show mode toggle for CORPORATE tenants
    const modeSwitcher = document.getElementById('mode-switcher');
    if (modeSwitcher && tenant.type === 'CORPORATE') {
      modeSwitcher.classList.remove('hidden');
      updateModeToggle();
    }

    buildPortalSelector();
    const defaultPortal = TENANT_DEFAULT_PORTAL[tenant.type] || 'dashboard';
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
  localStorage.removeItem('sgtx_token');
  localStorage.removeItem('sgtx_tenant');
  localStorage.removeItem('sgtx_employee');
  window.location.href = '/login';
}

// ─── PORTAL & MODE SWITCHING ─────────────────────────────
function switchPortal(portal) {
  currentPortal = portal;
  const nav = document.getElementById('nav-items');
  const items = portalMenus[portal] || portalMenus.dashboard;

  // Show/hide mode switcher
  const modeSwitcher = document.getElementById('mode-switcher');
  if (modeSwitcher) {
    modeSwitcher.classList.toggle('hidden', !(tenant?.type === 'CORPORATE' && portal === 'trader'));
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
      ${item.badge ? '<span class="w-2 h-2 rounded-full bg-accent-rose animate-pulse-slow"></span>' : ''}
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
  'customs-readiness': renderCustomsReadiness,
  'financing': renderFinancing,
  'distressed-buy': renderDistressedBuy,
  // Trader - Seller
  'pending-requests': renderPendingRequests,
  'exw-price-lock': renderEXWPriceLock,
  'containerisation': renderContainerisation,
  'logistics-builder': renderLogisticsBuilder,
  'quote-submit': renderQuoteSubmit,
  'qc-booking': renderQCBooking,
  'barcode-print': renderBarcodePrint,
  'cash-position': renderCashPosition,
  'distressed-sell': renderDistressedSell,
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
    ESCALATE: 'badge-purple' };
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
    <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-sgtx-100 to-sgtx-200 flex items-center justify-center mb-6">
      <i class="fas fa-rocket text-3xl text-sgtx-500"></i>
    </div>
    <h2 class="text-xl font-bold text-surface-800 mb-2">Coming Soon</h2>
    <p class="text-sm text-surface-400 max-w-md">The <span class="font-semibold text-sgtx-600">${page}</span> module is under development. Check back soon for updates.</p>
    <div class="mt-6 flex gap-3">
      <button onclick="navigate('smart-inbox')" class="px-4 py-2 bg-sgtx-500 text-white rounded-lg text-xs font-semibold hover:bg-sgtx-600 transition">Back to Inbox</button>
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
  const colors = { purple: 'from-sgtx-500 to-sgtx-600', blue: 'from-accent-blue to-blue-600', green: 'from-accent-emerald to-emerald-600', amber: 'from-accent-amber to-amber-600', rose: 'from-accent-rose to-rose-600', cyan: 'from-accent-cyan to-cyan-600' };
  return `<div class="metric-card group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
    <div class="flex items-start justify-between">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color] || colors.purple} flex items-center justify-center shadow-sm">
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
    <div class="sgtx-card !p-4 border-l-4 border-l-sgtx-500"><div class="text-[10px] font-bold text-sgtx-500 uppercase mb-1">What's Next</div><div class="text-xs text-surface-600">${next}</div></div>
  </div>`;
}

function showModal(html) { document.getElementById('modal-body').innerHTML = html; document.getElementById('modal').classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
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
async function renderSmartInbox() {
  setTitle('Smart Inbox', 'Prioritised actions requiring your attention');
  
  // Generate contextual inbox items based on portal & real data
  let trades = [], shipments = [], stats = {};
  try {
    const [tradesR, shipmentsR, statsR] = await Promise.all([
      api('/trades').catch(() => ({ data: [] })),
      api('/shipments').catch(() => ({ data: [] })),
      api('/stats').catch(() => ({ data: {} })),
    ]);
    trades = tradesR.data || [];
    shipments = shipmentsR.data || [];
    stats = statsR.data || {};
  } catch(e) {}

  // Build inbox items from real data
  const inboxItems = [];
  
  trades.filter(t => t.status === 'PENDING_EXPORTER_RESPONSE' || t.status === 'DRAFT').forEach(t => {
    inboxItems.push({ urgency: 85, icon: 'fa-handshake', color: 'amber', title: `Trade request awaiting response`, desc: `${t.importer_name || '?'} → ${t.exporter_name || '?'}`, time: t.created_at, action: () => navigate('pending-requests') });
  });
  
  trades.filter(t => t.status === 'QUOTE_SUBMITTED').forEach(t => {
    inboxItems.push({ urgency: 90, icon: 'fa-tag', color: 'blue', title: `Quote ready for review`, desc: `From ${t.exporter_name || 'seller'}`, time: t.created_at, action: () => navigate('quote-review') });
  });

  shipments.filter(s => s.status === 'IN_TRANSIT').forEach(s => {
    inboxItems.push({ urgency: 40, icon: 'fa-ship', color: 'cyan', title: `Shipment in transit`, desc: `${s.ustn} — ${s.origin_port || '?'} → ${s.destination_port || '?'}`, time: s.created_at, action: () => navigate('shipments-vault') });
  });

  // Add some contextual items if inbox is empty
  if (inboxItems.length === 0) {
    inboxItems.push(
      { urgency: 30, icon: 'fa-circle-check', color: 'green', title: 'All caught up!', desc: 'No pending actions. Your trade pipeline is clear.', time: new Date().toISOString() },
      { urgency: 20, icon: 'fa-lightbulb', color: 'purple', title: 'Get started', desc: 'Create a new trade request or explore the platform.', time: new Date().toISOString() },
    );
  }

  // Sort by urgency
  inboxItems.sort((a, b) => b.urgency - a.urgency);

  const urgencyClass = (u) => u >= 80 ? 'urgency-critical' : u >= 60 ? 'urgency-high' : u >= 40 ? 'urgency-medium' : 'urgency-low';
  const urgencyColor = (u) => u >= 80 ? 'text-red-500' : u >= 60 ? 'text-amber-500' : u >= 40 ? 'text-blue-500' : 'text-surface-400';

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${inboxItems.filter(i=>i.urgency>=60).length} high-priority items`,
      inboxItems.length > 0 ? 'Review top items and take action' : 'No actions needed',
      inboxItems.filter(i=>i.urgency>=80).length > 0 ? `${inboxItems.filter(i=>i.urgency>=80).length} critical items need immediate attention` : 'Nothing blocking',
      'Items auto-update as trade events occur'
    )}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-bolt', 'Pending Actions', inboxItems.filter(i=>i.urgency>=40).length, null, 'purple')}
      ${metricCard('fa-handshake', 'Active Trades', trades.length, null, 'blue')}
      ${metricCard('fa-ship', 'Shipments', shipments.length, null, 'cyan')}
      ${metricCard('fa-shield-halved', 'Governor Status', 'Active', null, 'green')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm text-surface-800"><i class="fas fa-bolt text-sgtx-500 mr-2"></i>Priority Actions</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-surface-100 text-surface-600 hover:bg-surface-200 transition">All</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400 transition">Critical</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400 transition">Trade</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${inboxItems.map(item => `
          <div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 cursor-pointer transition ${urgencyClass(item.urgency)}" onclick="${item.action ? 'void(0)' : ''}">
            <div class="w-10 h-10 rounded-xl bg-${item.color}-50 flex items-center justify-center shrink-0">
              <i class="fas ${item.icon} text-${item.color}-500 text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-surface-800 truncate">${item.title}</div>
              <div class="text-xs text-surface-400 truncate mt-0.5">${item.desc}</div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="${urgencyColor(item.urgency)} text-[10px] font-bold">${item.urgency}</span>
              <span class="text-[10px] text-surface-300">${timeAgo(item.time)}</span>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// TRADE COMMAND CENTER (Blueprint 6.1.2)
// Single page per USTN with timeline + summary cards
// ═══════════════════════════════════════════════════════════
async function renderTradeCommandCenter() {
  setTitle('Trade Command Center', 'Unified trade view per USTN');
  const { data: trades } = await api('/trades');
  
  if (!trades.length) {
    document.getElementById('content').innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-center">
      <i class="fas fa-terminal text-4xl text-surface-200 mb-4"></i>
      <p class="text-sm text-surface-400">No active trades. Create a trade request to see the command center.</p>
    </div>`;
    return;
  }

  // Show the most recent trade
  const trade = trades[0];
  const phases = [
    { num: 1, label: 'Initiate', icon: 'fa-play', done: true },
    { num: 2, label: 'Quote', icon: 'fa-tag', done: ['QUOTE_SUBMITTED','QUOTED','CONTRACTED','LOCKED','IN_EXECUTION'].includes(trade.status) },
    { num: 3, label: 'Contract', icon: 'fa-file-contract', done: ['CONTRACTED','LOCKED','IN_EXECUTION'].includes(trade.status) },
    { num: 4, label: 'Finance', icon: 'fa-landmark', done: ['IN_EXECUTION'].includes(trade.status) },
    { num: 5, label: 'Execute', icon: 'fa-ship', done: false },
    { num: 6, label: 'Settle', icon: 'fa-check-double', done: false },
  ];

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `Trade ${trade.status} — Phase ${phases.filter(p=>p.done).length}/6`,
      phases.find(p=>!p.done) ? `Complete Phase ${phases.find(p=>!p.done).num}: ${phases.find(p=>!p.done).label}` : 'All phases complete',
      trade.status === 'PENDING_EXPORTER_RESPONSE' ? 'Awaiting seller response' : 'None',
      phases.find(p=>!p.done) ? `Phase ${phases.find(p=>!p.done).num} will unlock next capabilities` : 'Settlement'
    )}
    <!-- Phase Timeline -->
    <div class="sgtx-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-timeline text-sgtx-500 mr-2"></i>Trade Lifecycle</h3>
        <span class="text-xs text-surface-400">ID: ${trade.id?.slice(0,12)}...</span>
      </div>
      <div class="flex items-center gap-2">
        ${phases.map(p => `
          <div class="flex-1 text-center">
            <div class="w-10 h-10 mx-auto rounded-xl ${p.done ? 'bg-gradient-to-br from-sgtx-500 to-sgtx-600 text-white shadow-glow-sm' : 'bg-surface-100 text-surface-400'} flex items-center justify-center">
              <i class="fas ${p.icon} text-sm"></i>
            </div>
            <div class="text-[10px] mt-2 font-medium ${p.done ? 'text-sgtx-600' : 'text-surface-400'}">${p.label}</div>
          </div>
          ${p.num < 6 ? `<div class="w-8 h-0.5 ${p.done ? 'bg-sgtx-400' : 'bg-surface-200'} rounded-full"></div>` : ''}`).join('')}
      </div>
    </div>
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="sgtx-card">
        <h4 class="text-xs font-semibold text-surface-500 uppercase mb-3">Commercial Terms</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-surface-400">Buyer</span><span class="font-medium">${trade.importer_name || '—'}</span></div>
          <div class="flex justify-between"><span class="text-surface-400">Seller</span><span class="font-medium">${trade.exporter_name || '—'}</span></div>
          <div class="flex justify-between"><span class="text-surface-400">Status</span>${badge(trade.status)}</div>
        </div>
      </div>
      <div class="sgtx-card">
        <h4 class="text-xs font-semibold text-surface-500 uppercase mb-3">Parties & Jurisdiction</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-surface-400">Origin</span><span class="font-medium">${trade.importer_jurisdiction || '—'}</span></div>
          <div class="flex justify-between"><span class="text-surface-400">Destination</span><span class="font-medium">${trade.exporter_jurisdiction || '—'}</span></div>
          <div class="flex justify-between"><span class="text-surface-400">Created</span><span class="text-xs">${timeAgo(trade.created_at)}</span></div>
        </div>
      </div>
      <div class="sgtx-card">
        <h4 class="text-xs font-semibold text-surface-500 uppercase mb-3">Governance</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-surface-400">Governor</span>${badge('ALLOW')}</div>
          <div class="flex justify-between"><span class="text-surface-400">Compliance</span><span class="text-emerald-600 font-medium"><i class="fas fa-check-circle mr-1"></i>Clear</span></div>
          <div class="flex justify-between"><span class="text-surface-400">SGTX Fee</span><span class="font-medium">Pending</span></div>
        </div>
      </div>
    </div>
    <!-- Activity Feed -->
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-clock-rotate-left text-sgtx-500 mr-2"></i>Activity Feed</h3>
      <div class="space-y-3">
        <div class="flex gap-3"><div class="w-2 h-2 rounded-full bg-sgtx-500 mt-1.5 shrink-0"></div><div><div class="text-xs font-medium">Trade initiated</div><div class="text-[10px] text-surface-400">${timeAgo(trade.created_at)}</div></div></div>
        ${trade.status !== 'DRAFT' ? `<div class="flex gap-3"><div class="w-2 h-2 rounded-full bg-accent-blue mt-1.5 shrink-0"></div><div><div class="text-xs font-medium">Governor evaluation passed</div><div class="text-[10px] text-surface-400">G1-G4 gates cleared</div></div></div>` : ''}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// SHIPMENTS VAULT (Blueprint 6.1.6)
// Universal table component — role-specific columns
// ═══════════════════════════════════════════════════════════
async function renderShipmentsVault() {
  setTitle('Shipments Vault', 'Real-time shipment tracking with role-specific views');
  const { data } = await api('/shipments');
  
  const rows = data.map(s => `<tr class="hover:bg-surface-50 cursor-pointer" onclick="showShipmentModal('${s.id}')">
    <td class="font-mono text-xs text-sgtx-600">${s.ustn}</td>
    <td class="text-sm">${s.origin_port || '—'}</td>
    <td class="text-sm">${s.destination_port || '—'}</td>
    <td class="text-center">${badge(s.status)}</td>
    <td class="text-center text-xs">${s.current_milestone || '—'}</td>
    <td class="text-xs text-surface-400">${timeAgo(s.created_at)}</td>
  </tr>`);

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${data.length} shipments tracked`,
      data.filter(s=>s.status==='IN_TRANSIT').length ? 'Monitor in-transit shipments' : 'No active shipments',
      data.filter(s=>s.status==='DISTRESSED').length ? 'Distressed cargo needs attention' : 'None',
      'Milestones auto-confirm via barcode/IoT'
    )}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-ship', 'Total Shipments', data.length, null, 'blue')}
      ${metricCard('fa-truck-fast', 'In Transit', data.filter(s=>s.status==='IN_TRANSIT').length, null, 'cyan')}
      ${metricCard('fa-check-double', 'Delivered', data.filter(s=>s.status==='DELIVERED').length, null, 'green')}
      ${metricCard('fa-fire', 'Distressed', data.filter(s=>s.status==='DISTRESSED').length, null, 'rose')}
    </div>
    ${dataTable(['USTN', 'Origin', 'Destination', 'Status', 'Milestone', 'Updated'], rows, { title: 'All Shipments' })}`;
}

async function showShipmentModal(id) {
  const { data } = await api(`/shipments/${id}`);
  const milestones = ['GATE_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];
  const confirmed = new Set((data.milestones||[]).map(m => m.milestone));
  showModal(`
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold"><i class="fas fa-ship text-sgtx-500 mr-2"></i>Shipment Detail</h2>
      <button onclick="closeModal()" class="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"><i class="fas fa-times text-surface-400"></i></button>
    </div>
    <div class="font-mono text-sm text-sgtx-600 bg-sgtx-50 px-4 py-2 rounded-lg mb-4">${data.ustn}</div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-6">
      <div><span class="text-surface-400">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-surface-400">Origin:</span> ${data.origin_port || '—'}</div>
      <div><span class="text-surface-400">Destination:</span> ${data.destination_port || '—'}</div>
      <div><span class="text-surface-400">Vessel:</span> ${data.vessel_name || '—'}</div>
    </div>
    <h4 class="text-xs font-semibold text-surface-500 uppercase mb-3">Milestone Tracker</h4>
    <div class="flex items-center gap-1 mb-4">${milestones.map(m => `
      <div class="flex-1 text-center">
        <div class="w-8 h-8 mx-auto rounded-lg ${confirmed.has(m) ? 'bg-emerald-500 text-white' : 'bg-surface-100 text-surface-300'} flex items-center justify-center text-[10px]">
          ${confirmed.has(m) ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <div class="text-[8px] mt-1 text-surface-400">${m.replace(/_/g,' ')}</div>
      </div>`).join('<div class="w-3 h-0.5 bg-surface-200 rounded-full"></div>')}</div>
  `);
}

// ═══════════════════════════════════════════════════════════
// PLATFORM DASHBOARD
// ═══════════════════════════════════════════════════════════
async function renderPlatformDashboard() {
  setTitle('Platform Overview', 'SGTX v6.3 — Sovereign, AI-Governed, Non-Custodial Trade Execution');
  const { data: stats } = await api('/stats');
  const { data: decisions } = await api('/governor/decisions?limit=5');

  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-building', 'Tenants', stats.tenants, 12, 'purple')}
      ${metricCard('fa-handshake', 'Trades', stats.trade_requests, 8, 'blue')}
      ${metricCard('fa-file-contract', 'Contracts', stats.contracts, null, 'cyan')}
      ${metricCard('fa-ship', 'Shipments', stats.shipments, null, 'green')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-gavel text-sgtx-500 mr-2"></i>Recent Governor Decisions</h3>
        <div class="space-y-2">${(decisions||[]).map(d => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-surface-50 hover:bg-surface-100 cursor-pointer transition" onclick="showDecisionModal('${d.decision_id}')">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg ${d.verdict === 'ALLOW' ? 'bg-emerald-50 text-emerald-600' : d.verdict === 'DENY' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center">
                <i class="fas ${d.verdict === 'ALLOW' ? 'fa-check' : d.verdict === 'DENY' ? 'fa-xmark' : 'fa-question'} text-xs"></i>
              </div>
              <div>
                <div class="text-xs font-medium text-surface-700">${d.decision_type}</div>
                <div class="text-[10px] text-surface-400">${timeAgo(d.created_at)}</div>
              </div>
            </div>
            ${verdictBadge(d.verdict)}
          </div>`).join('')}</div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-shield-halved text-sgtx-500 mr-2"></i>Governance Health</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div class="text-xs text-emerald-600 font-medium">G1: Execution Gated</div>
            <div class="text-lg font-bold text-emerald-800 mt-1"><i class="fas fa-check-circle"></i> Enforced</div>
          </div>
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div class="text-xs text-emerald-600 font-medium">G2: AI Advisory Only</div>
            <div class="text-lg font-bold text-emerald-800 mt-1"><i class="fas fa-check-circle"></i> Active</div>
          </div>
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div class="text-xs text-emerald-600 font-medium">G3: Non-Custodial</div>
            <div class="text-lg font-bold text-emerald-800 mt-1"><i class="fas fa-check-circle"></i> Structural</div>
          </div>
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div class="text-xs text-emerald-600 font-medium">G4: Attributable</div>
            <div class="text-lg font-bold text-emerald-800 mt-1"><i class="fas fa-check-circle"></i> Signed</div>
          </div>
        </div>
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-cubes text-sgtx-500 mr-2"></i>Microservices Architecture (47 Services)</h3>
      <div class="grid grid-cols-4 md:grid-cols-8 gap-2">
        ${['Governor','Identity','Trade','Quote','Contract','Finance','Shipment','Settlement','Payment','Inbox','Workflow','Export','Preference','Multi-Ship','Fee Split','DeFi'].map(s => 
          `<div class="text-center py-2 px-1 rounded-lg bg-surface-50 border border-surface-100 text-[10px] font-medium text-surface-600 hover:border-sgtx-200 transition">${s}</div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════════════════════════
async function renderTenants() {
  setTitle('Tenants', 'Organisation registry — GTID system');
  const { data } = await api('/tenants');
  const rows = data.map(t => `<tr class="hover:bg-surface-50 cursor-pointer" onclick="showTenantModal('${t.id}')">
    <td class="font-mono text-xs text-sgtx-600">${t.gtid}</td>
    <td class="font-medium text-sm">${t.legal_name}</td>
    <td class="text-center"><span class="text-xs bg-surface-100 px-2 py-0.5 rounded-md">${t.jurisdiction}</span></td>
    <td class="text-center text-xs">${t.type}</td>
    <td class="text-center">${badge(t.kyb_status)}</td>
    <td class="text-center font-semibold ${(t.trust_score||0)>=80?'text-emerald-600':(t.trust_score||0)>=60?'text-amber-600':'text-red-600'}">${t.trust_score||'—'}</td>
  </tr>`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-building', 'Total Tenants', data.length, null, 'purple')}
      ${metricCard('fa-check-circle', 'Verified', data.filter(t=>t.kyb_status==='VERIFIED').length, null, 'green')}
      ${metricCard('fa-clock', 'Pending', data.filter(t=>t.kyb_status==='PENDING').length, null, 'amber')}
      ${metricCard('fa-globe', 'Jurisdictions', [...new Set(data.map(t=>t.jurisdiction))].length, null, 'blue')}
    </div>
    ${dataTable(['GTID', 'Legal Name', 'Jurisdiction', 'Type', 'KYB', 'Trust'], rows, { title: `${data.length} Registered Tenants` })}`;
}

async function showTenantModal(id) {
  const { data } = await api(`/tenants/${id}`);
  showModal(`
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold"><i class="fas fa-building text-sgtx-500 mr-2"></i>${data.legal_name}</h2>
      <button onclick="closeModal()" class="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"><i class="fas fa-times text-surface-400"></i></button>
    </div>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">GTID</span><div class="font-mono text-sgtx-600 mt-1">${data.gtid}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Jurisdiction</span><div class="font-medium mt-1">${data.jurisdiction}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Type</span><div class="font-medium mt-1">${data.type}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">KYB Status</span><div class="mt-1">${badge(data.kyb_status)}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Risk Score</span><div class="font-bold mt-1">${data.risk_score ?? '—'}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Sanctions</span><div class="mt-1">${data.sanctions_cleared ? '<span class="text-emerald-600"><i class="fas fa-check-circle mr-1"></i>Cleared</span>' : '<span class="text-red-500"><i class="fas fa-xmark mr-1"></i>Not Cleared</span>'}</div></div>
    </div>
    ${data.employees?.length ? `<h4 class="font-semibold text-xs text-surface-500 uppercase mt-6 mb-3">Employees (${data.employees.length})</h4>
      <div class="space-y-2">${data.employees.map(e => `<div class="flex justify-between items-center p-2 bg-surface-50 rounded-lg text-xs"><span>${e.full_name} (${e.email})</span>${badge(e.status)}</div>`).join('')}</div>` : ''}
  `);
}

// ═══════════════════════════════════════════════════════════
// GOVERNOR DECISIONS
// ═══════════════════════════════════════════════════════════
async function renderGovernor() {
  setTitle('Governor Decisions', 'OPA + WasmEdge + Loom — Single point of truth');
  const { data } = await api('/governor/decisions?limit=100');
  const counts = { ALLOW: 0, DENY: 0, CONDITIONAL: 0, ESCALATE: 0 };
  data.forEach(d => counts[d.verdict] = (counts[d.verdict] || 0) + 1);

  const rows = data.map(d => `<tr class="hover:bg-surface-50 cursor-pointer" onclick="showDecisionModal('${d.decision_id}')">
    <td class="font-mono text-[10px]">${d.decision_id?.slice(0,12)}...</td>
    <td class="text-xs">${d.decision_type}</td>
    <td class="text-center">${verdictBadge(d.verdict)}</td>
    <td class="text-center text-xs">${d.confidence ? (d.confidence*100).toFixed(0)+'%' : '—'}</td>
    <td class="text-xs text-surface-400">${timeAgo(d.created_at)}</td>
  </tr>`);

  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-check', 'Allowed', counts.ALLOW, null, 'green')}
      ${metricCard('fa-xmark', 'Denied', counts.DENY, null, 'rose')}
      ${metricCard('fa-question', 'Conditional', counts.CONDITIONAL, null, 'amber')}
      ${metricCard('fa-arrow-up', 'Escalated', counts.ESCALATE, null, 'purple')}
    </div>
    ${dataTable(['Decision ID', 'Type', 'Verdict', 'Confidence', 'Time'], rows, { title: `${data.length} Decisions` })}`;
}

async function showDecisionModal(id) {
  const { data } = await api(`/governor/decisions/${id}`);
  showModal(`
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold"><i class="fas fa-gavel text-sgtx-500 mr-2"></i>Governor Decision</h2>
      <button onclick="closeModal()" class="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"><i class="fas fa-times text-surface-400"></i></button>
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Verdict</span><div class="mt-1">${verdictBadge(data.verdict)}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Confidence</span><div class="font-bold mt-1">${data.confidence ? (data.confidence*100).toFixed(1)+'%' : '—'}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Type</span><div class="mt-1">${data.decision_type}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Policy</span><div class="mt-1 font-mono text-xs">${data.policy_version || '—'}</div></div>
    </div>
    <div class="p-4 bg-surface-50 rounded-xl mb-4">
      <h4 class="text-xs font-semibold text-surface-500 mb-2">PlainLanguage Explanation</h4>
      <p class="text-sm text-surface-700">${data.explainability || 'No explanation available.'}</p>
    </div>
    <div class="p-4 bg-surface-50 rounded-xl">
      <h4 class="text-xs font-semibold text-surface-500 mb-2">Cryptographic Proof</h4>
      <div class="space-y-2 text-[10px] font-mono text-surface-500 break-all">
        <div><span class="text-surface-400">Loom Hash:</span> ${data.loom_hash || '—'}</div>
        <div><span class="text-surface-400">Signature:</span> ${(data.cryptographic_signature || '—').slice(0,64)}...</div>
      </div>
    </div>
  `);
}

// ═══════════════════════════════════════════════════════════
// JURISDICTIONS
// ═══════════════════════════════════════════════════════════
async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Global coverage — sanctions matrix + DeFi permissions');
  const { data } = await api('/jurisdictions');
  const rows = data.map(j => `<tr class="${j.sanctions_level==='BLOCKED'?'bg-red-50/50':j.sanctions_level==='HIGH_RISK'?'bg-amber-50/50':''}">
    <td class="text-center font-bold text-sm">${j.code}</td>
    <td class="text-sm">${j.name}</td>
    <td class="text-center">${badge(j.sanctions_level)}</td>
    <td class="text-center text-xs">T${j.kyc_tier_required}</td>
    <td class="text-center text-xs">${j.cbdc_status || '—'}</td>
  </tr>`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${metricCard('fa-check-circle', 'Clear', data.filter(j=>j.sanctions_level==='NONE').length, null, 'green')}
      ${metricCard('fa-exclamation-circle', 'High Risk', data.filter(j=>j.sanctions_level==='HIGH_RISK').length, null, 'amber')}
      ${metricCard('fa-ban', 'Blocked', data.filter(j=>j.sanctions_level==='BLOCKED').length, null, 'rose')}
    </div>
    ${dataTable(['Code', 'Country', 'Sanctions', 'KYC Tier', 'CBDC'], rows, { title: `${data.length} Jurisdictions` })}`;
}

// ═══════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════
async function renderContacts() {
  setTitle('Saved Contacts', 'Network — auto-populated from trade interactions');
  if (!tenant?.id) { document.getElementById('content').innerHTML = renderComingSoon('contacts'); return; }
  const { data } = await api(`/tenants/${tenant.id}/contacts`);
  const rows = data.map(c => `<tr>
    <td class="font-mono text-xs text-sgtx-600">${c.contact_gtid}</td>
    <td class="text-sm font-medium">${c.legal_name || '—'}</td>
    <td class="text-center text-xs">${c.type || '—'}</td>
    <td class="text-center font-semibold">${c.trust_score || '—'}</td>
    <td class="text-center">${c.trade_count}</td>
    <td class="text-xs text-surface-400">${timeAgo(c.last_interaction)}</td>
  </tr>`);
  document.getElementById('content').innerHTML = dataTable(['GTID', 'Name', 'Type', 'Trust', 'Trades', 'Last'], rows, { title: `${data.length} Contacts` });
}

// ═══════════════════════════════════════════════════════════
// DISPUTES
// ═══════════════════════════════════════════════════════════
async function renderDisputes() {
  setTitle('Disputes', 'Phase 10 — AI mediation & arbitration');
  const { data } = await api('/disputes');
  const rows = data.map(d => `<tr class="hover:bg-surface-50 cursor-pointer" onclick="showDisputeModal('${d.id}')">
    <td class="font-mono text-[10px]">${d.id?.slice(0,8)}...</td>
    <td><span class="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-medium">${d.dispute_type}</span></td>
    <td class="text-xs">${d.filing_party_name || d.filing_party_gtid || '—'}</td>
    <td class="text-center">${badge(d.status)}</td>
    <td class="text-center text-xs">${d.severity ? `${d.severity}/5` : '—'}</td>
    <td class="text-xs text-surface-400">${timeAgo(d.filed_at)}</td>
  </tr>`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-gavel', 'Total', data.length, null, 'rose')}
      ${metricCard('fa-clock', 'Pending', data.filter(d=>d.status==='FILED'||d.status==='IN_MEDIATION').length, null, 'amber')}
      ${metricCard('fa-check-circle', 'Resolved', data.filter(d=>['RESOLVED','SETTLED'].includes(d.status)).length, null, 'green')}
      ${metricCard('fa-shield-halved', 'Fee Frozen', data.filter(d=>d.status==='FILED').length, null, 'purple')}
    </div>
    ${dataTable(['ID', 'Type', 'Filer', 'Status', 'Severity', 'Filed'], rows, { 
      title: 'Dispute Registry',
      action: `<button onclick="showFileDisputeForm()" class="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition"><i class="fas fa-plus mr-1"></i>File Dispute</button>`
    })}`;
}

async function showDisputeModal(id) {
  const { data } = await api(`/disputes/${id}`);
  showModal(`
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-bold"><i class="fas fa-gavel text-red-500 mr-2"></i>Dispute Detail</h2>
      <button onclick="closeModal()" class="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"><i class="fas fa-times text-surface-400"></i></button>
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Type</span><div class="mt-1 font-medium">${data.dispute_type}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Status</span><div class="mt-1">${badge(data.status)}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Filer</span><div class="mt-1">${data.filing_party_name || data.filing_party_gtid || '—'}</div></div>
      <div class="p-3 bg-surface-50 rounded-lg"><span class="text-surface-400 text-xs">Respondent</span><div class="mt-1">${data.respondent_name || data.respondent_gtid || '—'}</div></div>
    </div>
    ${data.description ? `<div class="p-4 bg-surface-50 rounded-xl mb-4"><p class="text-sm">${data.description}</p></div>` : ''}
  `);
}

function showFileDisputeForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel text-red-500 mr-2"></i>File Dispute</h2>
    <form onsubmit="submitDispute(event)" class="space-y-4">
      <div><label class="text-xs font-medium text-surface-600">Dispute Type</label>
        <select id="disp-type" class="w-full mt-1 border border-surface-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sgtx-500/20"><option>QUALITY</option><option>DELIVERY</option><option>PAYMENT</option><option>DOCUMENTATION</option><option>CUSTOMS</option></select></div>
      <div><label class="text-xs font-medium text-surface-600">Trade/Contract USTN</label>
        <input id="disp-ustn" class="w-full mt-1 border border-surface-200 rounded-lg px-3 py-2 text-sm" placeholder="SGTX-..." required></div>
      <div><label class="text-xs font-medium text-surface-600">Description</label>
        <textarea id="disp-desc" rows="4" class="w-full mt-1 border border-surface-200 rounded-lg px-3 py-2 text-sm" placeholder="Describe the dispute..." required></textarea></div>
      <button type="submit" class="w-full bg-red-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition">File Dispute (Governor Gated)</button>
    </form>`);
}
async function submitDispute(e) {
  e.preventDefault();
  const r = await apiPost('/disputes', { dispute_type: document.getElementById('disp-type').value, related_ustn: document.getElementById('disp-ustn').value, description: document.getElementById('disp-desc').value, filing_party_gtid: tenant?.gtid, filing_party_name: tenant?.legal_name });
  if (r.error) { showToast('Error: ' + r.error, 'error'); return; }
  showToast('Dispute filed successfully', 'success');
  closeModal(); navigate('disputes');
}

// ═══════════════════════════════════════════════════════════
// TRADER PORTAL — BUYER TABS
// ═══════════════════════════════════════════════════════════
async function renderNewTrade() {
  setTitle('New Trade Request', 'Phase 1 — Structured container & commodity entry');
  if (typeof showTradeWizardV2 === 'function') { showTradeWizardV2(); return; }
  document.getElementById('content').innerHTML = `<div class="sgtx-card text-center py-12">
    <i class="fas fa-plus-circle text-4xl text-sgtx-300 mb-4"></i>
    <p class="text-sm text-surface-500">Loading trade form...</p>
  </div>`;
}

async function renderQuoteReview() {
  setTitle('Quote Review & Negotiation', 'Compare delivery options, landed cost breakdown');
  const { data } = await api('/trades');
  const quoted = data.filter(t => t.status === 'QUOTE_SUBMITTED' || t.status === 'QUOTED');
  
  const rows = quoted.map(t => `<tr class="hover:bg-surface-50 cursor-pointer">
    <td class="font-mono text-xs text-sgtx-600">${t.id?.slice(0,8)}...</td>
    <td class="text-sm">${t.exporter_name || '—'}</td>
    <td class="text-center">${badge(t.status)}</td>
    <td class="text-xs text-surface-400">${timeAgo(t.created_at)}</td>
    <td class="text-center"><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Review</button></td>
  </tr>`);

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${quoted.length} quotes awaiting review`,
      quoted.length ? 'Compare options and accept best quote' : 'No quotes to review',
      quoted.length === 0 ? 'Waiting for seller responses' : 'None',
      'Accept quote → Contract phase begins'
    )}
    ${dataTable(['Trade ID', 'Seller', 'Status', 'Received', 'Action'], rows, { title: 'Quotes Pending Review' })}`;
}

async function renderContractSigning() {
  setTitle('Contract Signing', 'Phase 3 — Review and sign with passkey');
  const { data } = await api('/contracts');
  const rows = data.map(c => `<tr class="hover:bg-surface-50">
    <td class="font-mono text-xs">${c.id?.slice(0,8)}...</td>
    <td class="text-sm">${c.importer_name || '—'}</td>
    <td class="text-sm">${c.exporter_name || '—'}</td>
    <td class="text-center"><span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">${c.incoterm}</span></td>
    <td class="text-center">${badge(c.status)}</td>
    <td class="text-center">${c.status==='DRAFT' ? '<button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Sign</button>' : timeAgo(c.locked_at || c.created_at)}</td>
  </tr>`);
  document.getElementById('content').innerHTML = dataTable(['ID', 'Buyer', 'Seller', 'Incoterm', 'Status', 'Action'], rows, { title: 'Contracts' });
}

async function renderCustomsReadiness() {
  setTitle('Customs Readiness', 'Dynamic document checklist — traffic-light status');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Document compliance tracking', 'Upload required documents', 'Missing certificates flagged in red', 'Auto-submit to customs on completion')}
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-clipboard-check text-sgtx-500 mr-2"></i>Document Checklist</h3>
      <div class="space-y-3">
        ${['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin', 'Insurance Certificate', 'Phytosanitary Certificate'].map((doc, i) => {
          const status = i < 2 ? 'ready' : i < 4 ? 'pending' : 'missing';
          const colors = { ready: 'bg-emerald-50 border-emerald-200 text-emerald-700', pending: 'bg-amber-50 border-amber-200 text-amber-700', missing: 'bg-red-50 border-red-200 text-red-700' };
          const icons = { ready: 'fa-check-circle text-emerald-500', pending: 'fa-clock text-amber-500', missing: 'fa-xmark-circle text-red-500' };
          return `<div class="flex items-center justify-between p-3 rounded-xl border ${colors[status]}">
            <div class="flex items-center gap-3"><i class="fas ${icons[status]}"></i><span class="text-sm font-medium">${doc}</span></div>
            <span class="text-xs font-semibold uppercase">${status}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

async function renderFinancing() {
  setTitle('Financing', 'Phase 4 — Universal trade finance');
  const { data } = await api('/financing');
  const rows = data.map(f => `<tr>
    <td class="font-mono text-xs">${f.id?.slice(0,8)}...</td>
    <td class="text-sm">${f.requester_name || '—'}</td>
    <td class="text-center font-semibold">${usd(f.amount)}</td>
    <td class="text-center text-xs">${f.financing_type}</td>
    <td class="text-center">${badge(f.status)}</td>
  </tr>`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-landmark', 'Active Requests', data.length, null, 'blue')}
      ${metricCard('fa-gavel', 'Bidding', data.filter(f=>f.status==='BIDDING').length, null, 'amber')}
      ${metricCard('fa-check', 'Awarded', data.filter(f=>f.status==='AWARDED').length, null, 'green')}
      ${metricCard('fa-percent', 'Fee Rate', '0.25%', null, 'purple')}
    </div>
    ${dataTable(['ID', 'Requester', 'Amount', 'Type', 'Status'], rows, { title: 'Financing Requests' })}`;
}

async function renderDistressedBuy() {
  setTitle('Distressed Cargo', 'Available distressed cargo from your network');
  const { data } = await api('/distressed');
  const rows = data.map(d => `<tr>
    <td class="text-sm">${d.exporter_name || '—'}</td>
    <td class="text-sm">${d.current_location || '—'}</td>
    <td class="text-center">${d.quantity} ${d.unit}</td>
    <td class="text-center font-semibold">${usd(d.price_expectation)}</td>
    <td class="text-center">${badge(d.status)}</td>
  </tr>`);
  document.getElementById('content').innerHTML = dataTable(['Seller', 'Location', 'Qty', 'Price', 'Status'], rows, { title: 'Distressed Cargo Listings' });
}

// ═══════════════════════════════════════════════════════════
// TRADER PORTAL — SELLER TABS
// ═══════════════════════════════════════════════════════════
async function renderPendingRequests() {
  setTitle('Pending Requests', 'Incoming trade requests awaiting your response');
  const { data } = await api('/trades');
  const pending = data.filter(t => ['PENDING_EXPORTER_RESPONSE','DRAFT','INITIATED'].includes(t.status));
  const rows = pending.map(t => `<tr class="hover:bg-surface-50">
    <td class="font-mono text-xs text-sgtx-600">${t.id?.slice(0,8)}...</td>
    <td class="text-sm">${t.importer_name || '—'}</td>
    <td class="text-center"><span class="text-xs">${t.importer_jurisdiction || '—'}</span></td>
    <td class="text-center">${badge(t.status)}</td>
    <td class="text-xs text-surface-400">${timeAgo(t.created_at)}</td>
    <td class="text-center"><button onclick="event.stopPropagation();showQuoteFormForTrade('${t.id}')" class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg font-medium">Submit Quote</button></td>
  </tr>`);
  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${pending.length} requests waiting`,
      pending.length ? 'Review requests and submit quotes' : 'No pending requests',
      'None — requests auto-expire after SLA',
      'Submit quote → buyer review → contract'
    )}
    ${dataTable(['Trade ID', 'Buyer', 'Origin', 'Status', 'Received', 'Action'], rows, { title: 'Incoming Requests' })}`;
}

function showQuoteFormForTrade(tradeId) {
  if (typeof showExporterQuoteFormV2 === 'function') { showExporterQuoteFormV2(tradeId); }
  else { showToast('Quote form module not loaded', 'error'); }
}

async function renderEXWPriceLock() {
  setTitle('EXW Price Lock', 'AI-recommended range, live market chart, post-lock watch');
  const { data: trades } = await api('/trades');
  const pending = trades.filter(t => ['PENDING_EXPORTER_RESPONSE','INITIATED'].includes(t.status));

  document.getElementById('content').innerHTML = `
    ${fourQuestions('EXW pricing with AI advisory', 'Lock your ex-works price for pending requests', 'Price valid until lock expires (24h default)', 'Locked price feeds into final quote calculation')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-lock', 'Locked Prices', pending.filter(t=>t.exw_price).length, null, 'green')}
      ${metricCard('fa-clock', 'Pending Lock', pending.filter(t=>!t.exw_price).length, null, 'amber')}
      ${metricCard('fa-robot', 'AI Confidence', '87%', 3, 'purple')}
      ${metricCard('fa-chart-line', 'Market Trend', '↑ 2.1%', null, 'blue')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="md:col-span-2 sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-line text-sgtx-500 mr-2"></i>Market Price Chart (30-Day)</h3>
        <div class="h-48 bg-gradient-to-br from-surface-50 to-surface-100 rounded-xl flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-0 flex items-end px-4 pb-4 gap-1">
            ${Array.from({length:30}, (_,i) => {const h = 30 + Math.random()*60; return `<div class="flex-1 bg-gradient-to-t from-sgtx-500/40 to-sgtx-300/20 rounded-t" style="height:${h}%"></div>`;}).join('')}
          </div>
          <div class="relative z-10 text-center">
            <div class="text-2xl font-bold text-surface-800">$1,245</div>
            <div class="text-xs text-surface-400">Avg. market price / MT</div>
          </div>
        </div>
        <div class="flex justify-between mt-3 text-[10px] text-surface-400">
          <span>30 days ago</span><span>Today</span>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-robot text-sgtx-500 mr-2"></i>AI Recommendation</h3>
        <div class="space-y-4">
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div class="text-[10px] font-bold text-emerald-700 uppercase">Fair Price Range</div>
            <div class="text-lg font-bold text-emerald-800 mt-1">$1,180 — $1,310</div>
            <div class="text-[10px] text-emerald-600 mt-1">Based on 200+ market signals</div>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <div class="text-[10px] font-bold text-surface-500 uppercase">Confidence Score</div>
            <div class="mt-2 h-2 bg-surface-200 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:87%"></div></div>
            <div class="text-xs mt-1 text-surface-600">High (87%)</div>
          </div>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div class="text-[10px] font-bold text-amber-700"><i class="fas fa-info-circle mr-1"></i>Advisory Only (A1)</div>
            <div class="text-[10px] text-amber-600 mt-1">AI cannot enforce — G2 compliant</div>
          </div>
        </div>
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list text-sgtx-500 mr-2"></i>Trades Pending EXW Lock</h3>
      ${pending.length ? `<div class="space-y-3">${pending.map(t => `
        <div class="flex items-center justify-between p-4 rounded-xl border border-surface-100 hover:border-sgtx-200 hover:bg-sgtx-50/30 transition">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center"><i class="fas fa-handshake text-surface-500"></i></div>
            <div>
              <div class="text-sm font-medium">${t.importer_name || 'Unknown Buyer'}</div>
              <div class="text-xs text-surface-400 font-mono">${t.id?.slice(0,12)}...</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            ${badge(t.status)}
            <button class="px-4 py-2 bg-sgtx-500 text-white text-xs font-semibold rounded-lg hover:bg-sgtx-600 transition"><i class="fas fa-lock mr-1"></i>Lock EXW</button>
          </div>
        </div>`).join('')}</div>` : '<p class="text-sm text-surface-400 text-center py-8">No trades pending EXW price lock</p>'}
    </div>`;
}

async function renderContainerisation() {
  setTitle('Containerisation & Packing', 'Palletisation solver (ORTools), 3D viewer');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Container loading optimization', 'Configure packing plan for active trades', 'Awaiting commodity dimensions from buyer', 'AI optimizes load via ORTools + 3D visualization')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-boxes-stacked', 'Active Packing Plans', 3, null, 'blue')}
      ${metricCard('fa-cube', 'Containers', 5, null, 'purple')}
      ${metricCard('fa-weight-hanging', 'Avg Utilization', '92%', 4, 'green')}
      ${metricCard('fa-robot', 'AI Suggestions', 8, null, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="md:col-span-2 sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-cube text-sgtx-500 mr-2"></i>3D Container Viewer</h3>
        <div class="h-64 bg-gradient-to-br from-surface-900 to-surface-800 rounded-xl flex items-center justify-center relative overflow-hidden">
          <div class="absolute inset-4 border border-surface-600 rounded-lg flex items-end p-2 gap-1">
            ${Array.from({length:8}, (_,i) => `<div class="flex-1 bg-gradient-to-t ${['from-sgtx-500/60 to-sgtx-400/40','from-emerald-500/60 to-emerald-400/40','from-amber-500/60 to-amber-400/40','from-blue-500/60 to-blue-400/40'][i%4]} rounded" style="height:${50+Math.random()*45}%"></div>`).join('')}
          </div>
          <div class="relative z-10 text-center">
            <div class="text-white text-sm font-medium"><i class="fas fa-cube mr-2"></i>40ft HC Container</div>
            <div class="text-surface-300 text-xs mt-1">67.6 m³ capacity • 92% filled</div>
          </div>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-check text-sgtx-500 mr-2"></i>Packing Details</h3>
        <div class="space-y-3">
          <div class="p-3 bg-surface-50 rounded-xl">
            <div class="text-[10px] text-surface-400">Container Type</div>
            <div class="text-sm font-semibold">40ft High Cube</div>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <div class="text-[10px] text-surface-400">Max Payload</div>
            <div class="text-sm font-semibold">26,580 kg</div>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <div class="text-[10px] text-surface-400">Pallets</div>
            <div class="text-sm font-semibold">24 standard EUR pallets</div>
          </div>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div class="text-[10px] text-emerald-700 font-bold">ORTools Optimized</div>
            <div class="text-xs text-emerald-600 mt-1">+8% space efficiency vs manual</div>
          </div>
        </div>
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-th text-sgtx-500 mr-2"></i>Commodity Layers</h3>
      <div class="grid grid-cols-4 gap-3">
        ${[{name:'Cotton Bales',qty:200,wt:'12,000 kg',fill:'85%'},{name:'Fabric Rolls',qty:80,wt:'6,400 kg',fill:'92%'},{name:'Garments (boxed)',qty:500,wt:'4,000 kg',fill:'78%'},{name:'Accessories',qty:120,wt:'960 kg',fill:'65%'}].map(c => `
          <div class="p-3 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
            <div class="text-xs font-semibold text-surface-800">${c.name}</div>
            <div class="text-[10px] text-surface-400 mt-1">${c.qty} units • ${c.wt}</div>
            <div class="mt-2 h-1.5 bg-surface-100 rounded-full"><div class="h-1.5 bg-sgtx-500 rounded-full" style="width:${c.fill}"></div></div>
            <div class="text-[10px] text-surface-400 mt-1">${c.fill} filled</div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderLogisticsBuilder() {
  setTitle('Logistics Builder', 'RFQ distribution, manual cost entry, alternative ports');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Build logistics cost structure', 'Send RFQs or enter costs manually', 'Need EXW price lock before quoting', 'Logistics costs combine with EXW for final quote')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-paper-plane', 'RFQs Sent', 4, null, 'blue')}
      ${metricCard('fa-comments', 'Responses', 2, null, 'green')}
      ${metricCard('fa-ship', 'Routes Compared', 3, null, 'cyan')}
      ${metricCard('fa-tag', 'Best Rate', '$2,450', null, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-paper-plane text-sgtx-500 mr-2"></i>Distribute RFQ</h3>
        <div class="space-y-3">
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Origin Port</label>
            <select class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm"><option>Ho Chi Minh City (VNSGN)</option><option>Hai Phong (VNHPH)</option></select>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Destination Port</label>
            <select class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm"><option>Alexandria (EGALY)</option><option>Port Said (EGPSD)</option><option>Sokhna (EGSOK)</option></select>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Container Spec</label>
            <div class="text-sm">2 × 40ft HC</div>
          </div>
          <button class="w-full bg-sgtx-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sgtx-600 transition"><i class="fas fa-broadcast-tower mr-2"></i>Broadcast to Providers</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-keyboard text-sgtx-500 mr-2"></i>Manual Cost Entry</h3>
        <div class="space-y-3">
          ${[{label:'Ocean Freight',val:'$2,450'},{label:'THC Origin',val:'$180'},{label:'THC Destination',val:'$220'},{label:'Customs Clearance',val:'$150'},{label:'Inland Transport',val:'$380'},{label:'Insurance',val:'$120'}].map(c => `
            <div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
              <span class="text-xs text-surface-600">${c.label}</span>
              <input type="text" value="${c.val}" class="w-24 text-right text-xs font-mono bg-surface-50 border border-surface-200 rounded px-2 py-1">
            </div>`).join('')}
          <div class="flex items-center justify-between p-3 bg-sgtx-50 rounded-xl border border-sgtx-200">
            <span class="text-sm font-semibold text-sgtx-700">Total Logistics</span>
            <span class="text-sm font-bold text-sgtx-700">$3,500</span>
          </div>
        </div>
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-route text-sgtx-500 mr-2"></i>Alternative Port Pricing</h3>
      <div class="grid grid-cols-3 gap-3">
        ${[{port:'Alexandria (EGALY)',cost:'$3,500',days:'18',best:true},{port:'Port Said (EGPSD)',cost:'$3,250',days:'16',best:false},{port:'Sokhna (EGSOK)',cost:'$3,680',days:'20',best:false}].map(p => `
          <div class="p-4 rounded-xl border ${p.best ? 'border-sgtx-300 bg-sgtx-50' : 'border-surface-100'} hover:border-sgtx-200 transition cursor-pointer">
            <div class="text-xs font-semibold ${p.best ? 'text-sgtx-700' : 'text-surface-800'}">${p.port}</div>
            <div class="text-lg font-bold mt-2 ${p.best ? 'text-sgtx-600' : 'text-surface-700'}">${p.cost}</div>
            <div class="text-[10px] text-surface-400 mt-1">${p.days} transit days</div>
            ${p.best ? '<div class="text-[10px] text-sgtx-600 font-bold mt-2"><i class="fas fa-star mr-1"></i>SELECTED</div>' : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderQuoteSubmit() {
  setTitle('Quote Submission', 'Assemble total price (EXW + logistics + SGTX fee)');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Final quote assembly ready', 'Review all components and submit', 'All price components must be locked', 'Buyer receives quote for review & negotiation')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-calculator', 'Draft Quotes', 2, null, 'blue')}
      ${metricCard('fa-paper-plane', 'Submitted', 5, null, 'green')}
      ${metricCard('fa-check-double', 'Accepted', 3, null, 'purple')}
      ${metricCard('fa-clock', 'Avg Response', '4.2h', null, 'amber')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator text-sgtx-500 mr-2"></i>Quote Package Builder</h3>
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <div class="text-[10px] font-bold text-emerald-700 uppercase">EXW Price</div>
            <div class="text-xl font-bold text-emerald-800 mt-1">$24,900</div>
            <div class="text-[10px] text-emerald-600"><i class="fas fa-lock mr-1"></i>Locked</div>
          </div>
          <div class="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
            <div class="text-[10px] font-bold text-blue-700 uppercase">Logistics</div>
            <div class="text-xl font-bold text-blue-800 mt-1">$3,500</div>
            <div class="text-[10px] text-blue-600"><i class="fas fa-check mr-1"></i>Confirmed</div>
          </div>
          <div class="p-4 rounded-xl bg-sgtx-50 border border-sgtx-100 text-center">
            <div class="text-[10px] font-bold text-sgtx-700 uppercase">SGTX Fee</div>
            <div class="text-xl font-bold text-sgtx-800 mt-1">$569</div>
            <div class="text-[10px] text-sgtx-600">2% × EXW</div>
          </div>
        </div>
        <div class="p-4 rounded-xl bg-gradient-to-r from-sgtx-500 to-sgtx-600 text-white text-center">
          <div class="text-[10px] font-bold uppercase opacity-80">Total Quoted Price (CIF)</div>
          <div class="text-3xl font-bold mt-1">$28,969</div>
          <div class="text-xs opacity-70 mt-1">EXW + Logistics + SGTX Fee • Delivered Alexandria</div>
        </div>
        <button class="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition text-sm"><i class="fas fa-paper-plane mr-2"></i>Submit Quote to Buyer</button>
      </div>
    </div>`;
}

async function renderQCBooking() {
  setTitle('QC Booking', 'Select QC provider, AI-recommended inspection points');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Quality control scheduling', 'Book inspection for traded commodities', 'Requires confirmed trade contract', 'Inspection results feed into compliance checklist')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-microscope', 'Booked', 2, null, 'blue')}
      ${metricCard('fa-clock', 'Scheduled', 1, null, 'amber')}
      ${metricCard('fa-check-circle', 'Completed', 5, null, 'green')}
      ${metricCard('fa-star', 'Avg Score', '4.7', null, 'purple')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-user-doctor text-sgtx-500 mr-2"></i>Available QC Providers</h3>
        <div class="space-y-3">
          ${[{name:'London QC Services',rating:'4.9',loc:'GB',speciality:'Textiles',available:true},{name:'SGS Vietnam',rating:'4.7',loc:'VN',speciality:'General',available:true},{name:'Bureau Veritas',rating:'4.6',loc:'FR',speciality:'Agricultural',available:false}].map(p => `
            <div class="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:border-sgtx-200 transition ${!p.available ? 'opacity-50' : ''}">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-sgtx-100 flex items-center justify-center text-sgtx-600 text-[10px] font-bold">${p.loc}</div>
                <div>
                  <div class="text-xs font-medium">${p.name}</div>
                  <div class="text-[10px] text-surface-400">${p.speciality} • <i class="fas fa-star text-amber-400"></i> ${p.rating}</div>
                </div>
              </div>
              ${p.available ? '<button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Book</button>' : '<span class="text-[10px] text-surface-400">Unavailable</span>'}
            </div>`).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-robot text-sgtx-500 mr-2"></i>AI Inspection Recommendations</h3>
        <div class="space-y-3">
          ${[{point:'Pre-shipment visual',priority:'HIGH',reason:'Required for EG customs'},{point:'AQL sampling (Level II)',priority:'HIGH',reason:'ISO 28591 compliance'},{point:'Weight verification',priority:'MEDIUM',reason:'Container weight declaration'},{point:'Lab testing (fiber content)',priority:'LOW',reason:'Optional for textiles'}].map(r => `
            <div class="p-3 rounded-xl border border-surface-100">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium">${r.point}</span>
                <span class="text-[10px] font-bold ${r.priority==='HIGH' ? 'text-red-600' : r.priority==='MEDIUM' ? 'text-amber-600' : 'text-surface-400'}">${r.priority}</span>
              </div>
              <div class="text-[10px] text-surface-400 mt-1">${r.reason}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

async function renderBarcodePrint() {
  setTitle('Barcode Print', 'Generate ZPL/PDF label sheets — GS1-128 + QR');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Label generation for shipments', 'Generate and print barcode labels', 'Requires confirmed packing plan', 'Labels used for tracking & milestone confirmation')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-barcode', 'Labels Generated', 48, null, 'blue')}
      ${metricCard('fa-print', 'Print Jobs', 3, null, 'purple')}
      ${metricCard('fa-qrcode', 'QR Codes', 24, null, 'cyan')}
      ${metricCard('fa-box', 'Pallets Tagged', 24, null, 'green')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-cog text-sgtx-500 mr-2"></i>Label Configuration</h3>
        <div class="space-y-3">
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Barcode Format</label>
            <select class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm"><option>GS1-128 (SSCC-18)</option><option>QR Code (USTN)</option><option>Code 128</option></select>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Output Format</label>
            <div class="flex gap-2 mt-1">
              <button class="flex-1 py-2 bg-sgtx-500 text-white rounded-lg text-xs font-semibold">ZPL</button>
              <button class="flex-1 py-2 bg-surface-200 text-surface-600 rounded-lg text-xs font-semibold">PDF</button>
              <button class="flex-1 py-2 bg-surface-200 text-surface-600 rounded-lg text-xs font-semibold">PNG</button>
            </div>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl">
            <label class="text-[10px] text-surface-500 font-semibold uppercase block mb-1">Quantity</label>
            <input type="number" value="24" class="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm">
          </div>
          <button class="w-full py-2.5 bg-sgtx-500 text-white rounded-lg text-sm font-semibold hover:bg-sgtx-600 transition"><i class="fas fa-print mr-2"></i>Generate Labels</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-eye text-sgtx-500 mr-2"></i>Label Preview</h3>
        <div class="bg-white border-2 border-dashed border-surface-200 rounded-xl p-6 text-center">
          <div class="font-mono text-lg tracking-wider mb-2">|||||||||||||||||||</div>
          <div class="font-mono text-xs text-surface-600 mb-3">(00) 3 4012345 000000014 5</div>
          <div class="border-t border-surface-200 pt-3 mt-3">
            <div class="text-[10px] text-surface-500">SSCC-18 | GS1-128</div>
            <div class="font-mono text-xs text-sgtx-600 mt-1">SGTX-CIRO-SGTX-20240115-A1B2C3D4</div>
          </div>
          <div class="mt-4 inline-block p-3 border border-surface-200 rounded-lg">
            <div class="w-16 h-16 bg-surface-900 rounded grid grid-cols-4 grid-rows-4 gap-px p-1">
              ${Array.from({length:16}, () => `<div class="${Math.random()>0.4?'bg-white':'bg-surface-900'} rounded-sm"></div>`).join('')}
            </div>
            <div class="text-[9px] text-surface-400 mt-1">QR Code</div>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderCashPosition() {
  setTitle('Cash Position', '90-day rolling cash forecast');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Cash flow visualization across all trades', 'Review upcoming inflows and outflows', 'Delayed payments flagged below', 'AI predicts cash needs 90 days ahead')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-wallet', 'Current Balance', '$142,500', 8, 'green')}
      ${metricCard('fa-arrow-down', 'Expected Inflow', '$89,000', null, 'blue')}
      ${metricCard('fa-arrow-up', 'Expected Outflow', '$52,300', null, 'rose')}
      ${metricCard('fa-chart-line', 'Net Position', '+$36,700', 12, 'purple')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-area text-sgtx-500 mr-2"></i>90-Day Cash Forecast</h3>
      <div class="h-48 relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-50 to-surface-100">
        <svg class="w-full h-full" viewBox="0 0 360 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4E3FE8" stop-opacity="0.3"/><stop offset="100%" stop-color="#4E3FE8" stop-opacity="0"/></linearGradient>
          </defs>
          <path d="M0,80 C30,75 60,60 90,65 C120,70 150,45 180,40 C210,35 240,50 270,35 C300,20 330,25 360,15 L360,120 L0,120 Z" fill="url(#cashGrad)"/>
          <path d="M0,80 C30,75 60,60 90,65 C120,70 150,45 180,40 C210,35 240,50 270,35 C300,20 330,25 360,15" fill="none" stroke="#4E3FE8" stroke-width="2"/>
        </svg>
        <div class="absolute top-3 left-4 text-xs text-surface-500">Projected Net Cash</div>
        <div class="absolute bottom-3 left-4 text-[10px] text-surface-400">Today</div>
        <div class="absolute bottom-3 right-4 text-[10px] text-surface-400">+90 days</div>
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-list text-sgtx-500 mr-2"></i>Upcoming Transactions</h3>
      <div class="space-y-2">
        ${[{type:'INFLOW',desc:'Settlement from Cairo Imports',amt:'+$45,000',date:'In 5 days',status:'confirmed'},{type:'OUTFLOW',desc:'SGTX Fee Payment',amt:'-$1,200',date:'In 7 days',status:'confirmed'},{type:'INFLOW',desc:'QC Service Payment',amt:'+$3,200',date:'In 12 days',status:'pending'},{type:'OUTFLOW',desc:'Logistics - Hamburg Shipping',amt:'-$8,500',date:'In 15 days',status:'confirmed'},{type:'INFLOW',desc:'Trade Settlement - T-00234',amt:'+$38,000',date:'In 22 days',status:'pending'}].map(tx => `
          <div class="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 transition">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg ${tx.type==='INFLOW' ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center">
                <i class="fas ${tx.type==='INFLOW' ? 'fa-arrow-down text-emerald-600' : 'fa-arrow-up text-red-600'} text-xs"></i>
              </div>
              <div>
                <div class="text-xs font-medium text-surface-800">${tx.desc}</div>
                <div class="text-[10px] text-surface-400">${tx.date} • ${tx.status}</div>
              </div>
            </div>
            <span class="text-sm font-semibold ${tx.type==='INFLOW' ? 'text-emerald-600' : 'text-red-600'}">${tx.amt}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

async function renderDistressedSell() {
  setTitle('Distressed Cargo & Outreach', 'Declare distressed, triage, accelerated outreach');
  const { data } = await api('/distressed');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${metricCard('fa-fire', 'Active Listings', data.length, null, 'rose')}
      ${metricCard('fa-users', 'Notified Contacts', 0, null, 'blue')}
      ${metricCard('fa-handshake', 'Offers Received', 0, null, 'green')}
    </div>
    <div class="sgtx-card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-fire text-red-500 mr-2"></i>Distressed Cargo Management</h3>
        <button class="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-medium">Declare Distressed</button>
      </div>
      <p class="text-sm text-surface-500">List distressed cargo for accelerated outreach to your saved contacts. Triage paths: Sell, Comply, or Insurance.</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// LOGISTICS PORTAL
// ═══════════════════════════════════════════════════════════
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
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-inbox text-sgtx-500 mr-2"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('rfq-inbox')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-inbox text-accent-amber text-lg mb-2"></i><div class="text-xs font-medium">RFQ Inbox</div></button>
          <button onclick="navigate('dispatch-planner')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-map-location-dot text-accent-blue text-lg mb-2"></i><div class="text-xs font-medium">Dispatch</div></button>
          <button onclick="navigate('active-shipments')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-ship text-accent-cyan text-lg mb-2"></i><div class="text-xs font-medium">Shipments</div></button>
          <button onclick="navigate('performance-dash')" class="p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition text-center"><i class="fas fa-chart-column text-accent-emerald text-lg mb-2"></i><div class="text-xs font-medium">Performance</div></button>
        </div>
      </div>
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-truck text-sgtx-500 mr-2"></i>Service Capabilities</h3>
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
  setTitle('RFQ Inbox', 'Open requests from traders');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Active freight RFQs from platform traders', 'Review and respond to matching requests', 'None — new RFQs arrive automatically', 'Submit quote → booking confirmation flow')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-inbox', 'Open RFQs', 7, null, 'blue')}
      ${metricCard('fa-clock', 'Avg Response', '2.3h', -5, 'amber')}
      ${metricCard('fa-check', 'Win Rate', '34%', 2, 'green')}
      ${metricCard('fa-ban', 'Declined', 3, null, 'rose')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm text-surface-800"><i class="fas fa-inbox text-sgtx-500 mr-2"></i>Incoming RFQs</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-sgtx-100 text-sgtx-700 font-semibold">All (7)</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">Matching (4)</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">Expiring Soon</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${[{id:'RFQ-001',route:'VNSGN → EGALY',containers:'2×40HC',commodity:'Textiles',deadline:'4h',urgency:85},{id:'RFQ-002',route:'VNHPH → DEHAM',containers:'1×20ft',commodity:'Electronics',deadline:'12h',urgency:60},{id:'RFQ-003',route:'VNSGN → GBFXT',containers:'3×40HC',commodity:'Garments',deadline:'24h',urgency:40},{id:'RFQ-004',route:'VNDAN → SGSIN',containers:'1×40ft',commodity:'Furniture',deadline:'8h',urgency:72}].map(rfq => `
          <div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition cursor-pointer">
            <div class="w-10 h-10 rounded-xl ${rfq.urgency>=80?'bg-red-100':'rfq.urgency>=60'?'bg-amber-100':'bg-blue-100'} flex items-center justify-center shrink-0">
              <i class="fas fa-ship ${rfq.urgency>=80?'text-red-500':rfq.urgency>=60?'text-amber-500':'text-blue-500'} text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-surface-800">${rfq.route}</span>
                <span class="text-[10px] font-mono text-surface-400">${rfq.id}</span>
              </div>
              <div class="text-xs text-surface-400 mt-0.5">${rfq.containers} • ${rfq.commodity}</div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-[10px] font-semibold ${rfq.urgency>=80?'text-red-500':rfq.urgency>=60?'text-amber-500':'text-blue-500'}"><i class="fas fa-clock mr-1"></i>${rfq.deadline}</span>
              <button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold hover:bg-sgtx-600">Quote</button>
              <button class="px-3 py-1.5 bg-surface-100 text-surface-600 text-[10px] rounded-lg font-semibold hover:bg-surface-200">Skip</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
async function renderBookingRequests() {
  setTitle('Booking Requests', 'Pending booking confirmations');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Booking requests awaiting confirmation', 'Confirm or adjust booking details', 'Vessel space availability', 'Confirmed bookings move to active shipments')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-calendar-check', 'Pending', 3, null, 'amber')}
      ${metricCard('fa-check-circle', 'Confirmed Today', 2, null, 'green')}
      ${metricCard('fa-ship', 'Vessels Available', 8, null, 'blue')}
      ${metricCard('fa-percent', 'Fill Rate', '87%', null, 'purple')}
    </div>
    ${dataTable(['Booking Ref', 'Route', 'Containers', 'ETD', 'Vessel', 'Status', 'Action'], [
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">BK-2024-001</td><td class="text-sm">VNSGN → EGALY</td><td>2×40HC</td><td class="text-xs">Jan 28</td><td class="text-xs">MSC Athena</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Confirm</button></td></tr>',
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">BK-2024-002</td><td class="text-sm">VNHPH → DEHAM</td><td>1×20ft</td><td class="text-xs">Feb 3</td><td class="text-xs">Maersk Seoul</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Confirm</button></td></tr>',
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">BK-2024-003</td><td class="text-sm">VNSGN → GBFXT</td><td>3×40HC</td><td class="text-xs">Feb 8</td><td class="text-xs">COSCO Harmony</td><td>' + badge('APPROVED') + '</td><td><span class="text-xs text-emerald-600"><i class="fas fa-check mr-1"></i>Done</span></td></tr>',
    ], { title: 'Booking Queue' })}`;
}
async function renderDispatchPlanner() {
  setTitle('Dispatch Planner', 'VRP-optimized route planning');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Vehicle route planning with VRP optimization', 'Plan pickup routes for pending collections', 'Driver availability constraints', 'Optimized routes save fuel and time')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-truck', 'Active Vehicles', 6, null, 'blue')}
      ${metricCard('fa-route', 'Routes Today', 4, null, 'purple')}
      ${metricCard('fa-clock', 'Avg Delivery', '2.4h', -8, 'green')}
      ${metricCard('fa-gas-pump', 'Fuel Saved', '12%', null, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="md:col-span-2 sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-map text-sgtx-500 mr-2"></i>Route Map (OSRM)</h3>
        <div class="h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl relative overflow-hidden flex items-center justify-center">
          <div class="absolute inset-0 opacity-30" style="background-image:url('data:image/svg+xml,...');background-size:cover"></div>
          <div class="relative text-center">
            <i class="fas fa-map-location-dot text-4xl text-sgtx-500 mb-2"></i>
            <div class="text-sm font-medium text-surface-700">Interactive Route Map</div>
            <div class="text-xs text-surface-400">4 optimized routes • 12 stops</div>
          </div>
          <!-- Route markers -->
          <div class="absolute top-6 left-8 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
          <div class="absolute top-12 right-16 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
          <div class="absolute bottom-16 left-20 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>
          <div class="absolute bottom-8 right-8 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-ol text-sgtx-500 mr-2"></i>Today's Routes</h3>
        <div class="space-y-3">
          ${[{id:'R1',stops:4,dist:'45km',driver:'Nguyen V.',color:'emerald'},{id:'R2',stops:3,dist:'32km',driver:'Tran H.',color:'blue'},{id:'R3',stops:3,dist:'28km',driver:'Le M.',color:'amber'},{id:'R4',stops:2,dist:'18km',driver:'Pham D.',color:'red'}].map(r => `
            <div class="p-3 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-${r.color}-500"></div>
                  <span class="text-xs font-semibold">Route ${r.id}</span>
                </div>
                <span class="text-[10px] text-surface-400">${r.dist}</span>
              </div>
              <div class="text-[10px] text-surface-400 mt-1">${r.stops} stops • ${r.driver}</div>
            </div>`).join('')}
        </div>
        <button class="w-full mt-3 py-2 bg-sgtx-500 text-white rounded-lg text-xs font-semibold hover:bg-sgtx-600 transition"><i class="fas fa-wand-magic-sparkles mr-1"></i>Re-optimize</button>
      </div>
    </div>`;
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
        <h3 class="font-semibold text-sm"><i class="fas fa-file-circle-check text-sgtx-500 mr-2"></i>Verification Queue</h3>
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
              <div class="text-[10px] text-surface-400 font-mono">${d.ustn}</div>
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-line text-sgtx-500 mr-2"></i>Monthly Performance Trend</h3>
        <div class="h-40 flex items-end gap-2 px-2">
          ${['Jan','Feb','Mar','Apr','May','Jun'].map((m,i) => {const h = 60 + i*5 + Math.random()*10; return `<div class="flex-1 text-center"><div class="bg-gradient-to-t from-sgtx-500 to-sgtx-400 rounded-t mx-auto" style="height:${h}%;width:70%"></div><div class="text-[9px] text-surface-400 mt-1">${m}</div></div>`;}).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-trophy text-sgtx-500 mr-2"></i>Achievements</h3>
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
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">EBL-2024-0012</td><td class="font-mono text-xs text-sgtx-600">SGTX-CIRO-SGTX...</td><td class="text-sm">Saigon Textiles</td><td class="text-sm">Cairo Imports</td><td>' + badge('ACTIVE') + '</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Transfer</button></td></tr>',
      '<tr class="hover:bg-surface-50"><td class="font-mono text-xs">EBL-2024-0011</td><td class="font-mono text-xs text-sgtx-600">SGTX-ASFI-HAMB...</td><td class="text-sm">Asia Trade</td><td class="text-sm">Hamburg Logistics</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Issue</button></td></tr>',
    ], { title: 'Electronic Bills of Lading' })}`;
}

// ═══════════════════════════════════════════════════════════
// FINANCIER PORTAL
// ═══════════════════════════════════════════════════════════
async function renderFinancierDashboard() {
  setTitle('Financier Hub', 'Trade finance operations & DeFi');
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-magnifying-glass-dollar', 'Open Requests', 0, null, 'blue')}
      ${metricCard('fa-gavel', 'Active Bids', 0, null, 'amber')}
      ${metricCard('fa-chart-pie', 'Portfolio Value', '—', null, 'green')}
      ${metricCard('fa-link', 'DeFi Positions', 0, null, 'purple')}
    </div>
    ${fourQuestions('Financing operations active', 'Review new opportunities', 'None', 'AI credit intelligence updates continuously')}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-landmark text-sgtx-500 mr-2"></i>Supported Instruments</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2 bg-surface-50 rounded-lg"><b>Documentary:</b> LC, SBLC, BG</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>Receivables:</b> Factoring, SCF</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>Structured:</b> Pre-Export, Murabaha</div>
          <div class="p-2 bg-surface-50 rounded-lg"><b>DeFi:</b> Tokenized, Stablecoin</div>
        </div>
      </div>
      <div class="sgtx-card"><h3 class="font-semibold text-sm mb-3"><i class="fas fa-shield-halved text-sgtx-500 mr-2"></i>Financing Fee</h3>
        <div class="text-center py-4">
          <div class="text-3xl font-bold text-sgtx-600">0.25%</div>
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
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-eye text-sgtx-500 mr-2"></i>Active Disclosure Packages</h3></div>
      <div class="divide-y divide-surface-100">
        ${[{borrower:'Cairo Imports',amount:'$250,000',type:'Pre-Export',rating:'A-',trades:12,docs:8},{borrower:'Saigon Textiles',amount:'$180,000',type:'Receivables',rating:'BBB+',trades:8,docs:6},{borrower:'Hamburg Logistics',amount:'$75,000',type:'Working Capital',rating:'A',trades:22,docs:5}].map(d => `
          <div class="px-5 py-4 hover:bg-surface-50 transition cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-sgtx-100 flex items-center justify-center text-sgtx-600 text-xs font-bold">${d.borrower.slice(0,2)}</div>
                <div>
                  <div class="text-sm font-medium">${d.borrower}</div>
                  <div class="text-[10px] text-surface-400">${d.type} • ${d.amount}</div>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="text-center"><div class="text-xs font-bold text-sgtx-600">${d.rating}</div><div class="text-[10px] text-surface-400">Credit</div></div>
                <div class="text-center"><div class="text-xs font-bold">${d.trades}</div><div class="text-[10px] text-surface-400">Trades</div></div>
                <div class="text-center"><div class="text-xs font-bold">${d.docs}</div><div class="text-[10px] text-surface-400">Docs</div></div>
                <button class="px-4 py-1.5 bg-sgtx-500 text-white text-xs rounded-lg font-semibold">View Full</button>
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
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-gavel text-sgtx-500 mr-2"></i>Active Bid Opportunities</h3>
      <div class="space-y-3">
        ${[{id:'FIN-001',borrower:'Cairo Imports',amount:'$250,000',type:'Pre-Export',deadline:'6h',bidders:4,myBid:true},{id:'FIN-002',borrower:'Saigon Textiles',amount:'$180,000',type:'Receivables',deadline:'18h',bidders:2,myBid:false},{id:'FIN-003',borrower:'Global Goods Co',amount:'$500,000',type:'LC Confirmation',deadline:'48h',bidders:6,myBid:true}].map(b => `
          <div class="p-4 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2"><span class="text-sm font-semibold">${b.borrower}</span><span class="font-mono text-[10px] text-surface-400">${b.id}</span></div>
                <div class="text-xs text-surface-400 mt-1">${b.type} • ${b.amount} • ${b.bidders} bidders</div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-semibold ${b.deadline.includes('h') && parseInt(b.deadline)<12 ? 'text-red-500' : 'text-surface-500'}"><i class="fas fa-clock mr-1"></i>${b.deadline}</span>
                ${b.myBid ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">BID PLACED</span>' : '<button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Place Bid</button>'}
              </div>
            </div>
            ${b.myBid ? '<div class="mt-3 p-2 bg-surface-50 rounded-lg text-[10px] text-surface-500"><i class="fas fa-lock mr-1"></i>Your bid is encrypted and sealed until deadline</div>' : ''}
          </div>`).join('')}
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-users text-sgtx-500 mr-2"></i>Co-Financing</h3>
      <p class="text-xs text-surface-500 mb-3">Bid on a portion of larger deals. Multiple financiers can co-finance a single trade.</p>
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-xl bg-sgtx-50 border border-sgtx-100 text-center">
          <div class="text-lg font-bold text-sgtx-700">60%</div><div class="text-[10px] text-sgtx-600">Min Portion</div>
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-gauge text-sgtx-500 mr-2"></i>LTV Gauge</h3>
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator text-sgtx-500 mr-2"></i>Price Drop Simulator</h3>
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
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-coins text-sgtx-500 mr-2"></i>Protocol Comparison</h3>
      ${dataTable(['Protocol', 'Type', 'APY', 'TVL', 'Health', 'Position'], [
        '<tr><td class="text-sm font-medium">Aave V3</td><td class="text-xs">Lending</td><td class="text-xs font-semibold text-emerald-600">6.2%</td><td class="text-xs">$12.4B</td><td><span class="text-emerald-600 text-xs font-bold">2.4</span></td><td class="text-xs font-semibold">$200K</td></tr>',
        '<tr><td class="text-sm font-medium">Compound</td><td class="text-xs">Lending</td><td class="text-xs font-semibold text-emerald-600">5.8%</td><td class="text-xs">$8.1B</td><td><span class="text-emerald-600 text-xs font-bold">1.9</span></td><td class="text-xs font-semibold">$150K</td></tr>',
        '<tr><td class="text-sm font-medium">Goldfinch</td><td class="text-xs">RWA</td><td class="text-xs font-semibold text-amber-600">12.4%</td><td class="text-xs">$102M</td><td><span class="text-amber-600 text-xs font-bold">1.5</span></td><td class="text-xs font-semibold">$100K</td></tr>',
      ])}
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-coins text-sgtx-500 mr-2"></i>Stablecoin Health</h3>
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
      '<tr><td class="font-mono text-xs">TF-0001</td><td class="text-sm">Pre-Export (Textiles)</td><td class="text-xs font-semibold">$180,000</td><td class="text-xs text-sgtx-600 font-semibold">$176,400</td><td class="text-xs text-emerald-600">7.2%</td><td class="text-xs">45d</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
      '<tr><td class="font-mono text-xs">TF-0002</td><td class="text-sm">LC Confirmation</td><td class="text-xs font-semibold">$500,000</td><td class="text-xs text-sgtx-600 font-semibold">$492,500</td><td class="text-xs text-emerald-600">5.8%</td><td class="text-xs">90d</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
      '<tr><td class="font-mono text-xs">TF-0003</td><td class="text-sm">Receivable (Agri)</td><td class="text-xs font-semibold">$95,000</td><td class="text-xs text-sgtx-600 font-semibold">$93,100</td><td class="text-xs text-emerald-600">9.1%</td><td class="text-xs">30d</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Buy</button></td></tr>',
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
      '<tr><td class="text-sm font-medium">Cairo Imports</td><td class="font-mono text-[10px]">SGTX-EG-CIRO...</td><td class="text-center">12</td><td class="text-xs font-semibold">$1.8M</td><td class="text-center text-emerald-600 font-semibold">100%</td><td class="text-center"><i class="fas fa-arrow-up text-emerald-500"></i></td><td><button class="text-xs text-sgtx-600 hover:underline">View</button></td></tr>',
      '<tr><td class="text-sm font-medium">Saigon Textiles</td><td class="font-mono text-[10px]">SGTX-VN-SGTX...</td><td class="text-center">8</td><td class="text-xs font-semibold">$950K</td><td class="text-center text-emerald-600 font-semibold">96%</td><td class="text-center"><i class="fas fa-arrows-h text-surface-400"></i></td><td><button class="text-xs text-sgtx-600 hover:underline">View</button></td></tr>',
      '<tr><td class="text-sm font-medium">Global Goods</td><td class="font-mono text-[10px]">SGTX-US-GLOB...</td><td class="text-center">5</td><td class="text-xs font-semibold">$620K</td><td class="text-center text-amber-600 font-semibold">88%</td><td class="text-center"><i class="fas fa-arrow-down text-amber-500"></i></td><td><button class="text-xs text-sgtx-600 hover:underline">View</button></td></tr>',
    ], { title: 'Borrower Performance History' })}`;
}
async function renderSettlements() {
  setTitle('Settlements', 'USTN-linked settlement orchestration');
  const { data } = await api('/settlements');
  const rows = data.map(s => `<tr><td class="font-mono text-xs">${s.id?.slice(0,8)}...</td><td class="font-mono text-xs text-sgtx-600">${s.ustn||'—'}</td><td class="text-xs">${s.instruction_type}</td><td class="text-center">${badge(s.status)}</td></tr>`);
  document.getElementById('content').innerHTML = dataTable(['ID', 'USTN', 'Type', 'Status'], rows, { title: 'Settlement Instructions' });
}

// ═══════════════════════════════════════════════════════════
// QC PORTAL
// ═══════════════════════════════════════════════════════════
async function renderQCDashboard() {
  setTitle('Inspection Hub', 'Quality control operations');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-clipboard-check', 'Pending Inspections', 0, null, 'blue')}
      ${metricCard('fa-check-circle', 'Pass Rate', '96%', 2, 'green')}
      ${metricCard('fa-triangle-exclamation', 'Overrides', 0, null, 'amber')}
      ${metricCard('fa-vr-cardboard', 'AR Sessions', 0, null, 'purple')}
    </div>
    ${fourQuestions('QC operations active', 'Process inspection queue', 'None', 'AI reports generated after inspection')}
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-microscope text-sgtx-500 mr-2"></i>QC Standards</h3>
      <div class="space-y-2 text-sm text-surface-600">
        <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>AQL Sampling Enforcement (ISO 28591)</div>
        <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>AR Inspection Mode (HF ViT defect detection)</div>
        <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>Override Accountability (mandatory reason ≥10 chars)</div>
        <div class="flex items-center gap-2"><i class="fas fa-check text-emerald-500 w-4"></i>AI-assisted Report Generation (Groq)</div>
      </div>
    </div>`;
}

async function renderInspectionQueue() {
  setTitle('Inspection Queue', 'Pending inspections from trade contracts');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Inspections queued from confirmed trade contracts', 'Accept and schedule inspections', 'Inspector availability in region', 'Completed inspections unlock shipment phase')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-clipboard-list', 'In Queue', 6, null, 'amber')}
      ${metricCard('fa-user-check', 'Assigned', 3, null, 'blue')}
      ${metricCard('fa-spinner', 'In Progress', 2, null, 'purple')}
      ${metricCard('fa-check-circle', 'Completed (7d)', 9, null, 'green')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm"><i class="fas fa-clipboard-list text-sgtx-500 mr-2"></i>Inspection Queue</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Pending (6)</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">Assigned</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">Completed</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${[{id:'INS-001',commodity:'Cotton Textiles',seller:'Saigon Textiles',qty:'200 bales',deadline:'Jan 25',priority:'HIGH',type:'Pre-shipment'},{id:'INS-002',commodity:'Garments (Mixed)',seller:'VN Apparel Co',qty:'500 boxes',deadline:'Jan 28',priority:'MEDIUM',type:'AQL Sampling'},{id:'INS-003',commodity:'Fabric Rolls',seller:'Saigon Textiles',qty:'80 rolls',deadline:'Feb 2',priority:'LOW',type:'Visual + Weight'},{id:'INS-004',commodity:'Electronics',seller:'Shenzhen Tech',qty:'1200 units',deadline:'Jan 26',priority:'HIGH',type:'Full Inspection'}].map(i => `
          <div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">
            <div class="w-10 h-10 rounded-xl ${i.priority==='HIGH'?'bg-red-100':i.priority==='MEDIUM'?'bg-amber-100':'bg-blue-100'} flex items-center justify-center">
              <i class="fas fa-microscope ${i.priority==='HIGH'?'text-red-500':i.priority==='MEDIUM'?'text-amber-500':'text-blue-500'} text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">${i.commodity}</span>
                <span class="text-[10px] font-mono text-surface-400">${i.id}</span>
              </div>
              <div class="text-[10px] text-surface-400">${i.seller} • ${i.qty} • ${i.type}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold ${i.priority==='HIGH'?'text-red-600':i.priority==='MEDIUM'?'text-amber-600':'text-blue-600'}">${i.priority}</span>
              <span class="text-[10px] text-surface-400">${i.deadline}</span>
              <button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Accept</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-calculator text-sgtx-500 mr-2"></i>AQL Calculator</h3>
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
          <div class="p-4 bg-sgtx-50 rounded-xl border border-sgtx-200">
            <div class="text-[10px] font-bold text-sgtx-700 uppercase">Sampling Result</div>
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div><div class="text-lg font-bold text-sgtx-700">200</div><div class="text-[10px] text-sgtx-600">Sample Size</div></div>
              <div><div class="text-lg font-bold text-sgtx-700">10 / 11</div><div class="text-[10px] text-sgtx-600">Accept / Reject #</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-table text-sgtx-500 mr-2"></i>Sampling Table (Level II)</h3>
        <div class="overflow-hidden rounded-xl border border-surface-200">
          <table class="w-full text-[10px]">
            <thead class="bg-surface-50"><tr><th class="px-3 py-2 text-left">Lot Size</th><th class="px-3 py-2">Code</th><th class="px-3 py-2">Sample</th><th class="px-3 py-2">Ac</th><th class="px-3 py-2">Re</th></tr></thead>
            <tbody class="divide-y divide-surface-100">
              ${[['2-8','A',2,0,1],['51-90','E',13,1,2],['151-280','G',32,3,4],['501-1200','J',80,5,6],['1201-3200','K',125,7,8],['3201-10000','L',200,10,11]].map(([lot,code,sample,ac,re]) => 
                `<tr class="${lot==='1201-3200'?'bg-sgtx-50':''} hover:bg-surface-50"><td class="px-3 py-2">${lot}</td><td class="px-3 py-2 font-bold">${code}</td><td class="px-3 py-2">${sample}</td><td class="px-3 py-2 text-emerald-600">${ac}</td><td class="px-3 py-2 text-red-600">${re}</td></tr>`).join('')}
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-camera text-sgtx-500 mr-2"></i>AR Inspection Mode</h3>
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
          <button class="flex-1 py-2 bg-sgtx-500 text-white rounded-lg text-xs font-semibold"><i class="fas fa-play mr-1"></i>Start AR Session</button>
          <button class="flex-1 py-2 bg-surface-100 text-surface-600 rounded-lg text-xs font-semibold"><i class="fas fa-upload mr-1"></i>Upload Image</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-check text-sgtx-500 mr-2"></i>Recent Detections</h3>
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
async function renderQCReports() {
  setTitle('AI Reports', 'Auto-generated inspection reports');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('AI-generated inspection reports from findings', 'Review and approve AI-drafted reports', 'Overrides require mandatory justification', 'Approved reports shared with trade parties')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-file-medical', 'Draft Reports', 3, null, 'amber')}
      ${metricCard('fa-check-circle', 'Approved', 18, null, 'green')}
      ${metricCard('fa-robot', 'AI Generated', 21, null, 'purple')}
      ${metricCard('fa-clock', 'Avg Generation', '< 30s', null, 'blue')}
    </div>
    ${dataTable(['Report ID', 'Inspection', 'Commodity', 'Result', 'Defects', 'AI Confidence', 'Status', 'Action'], [
      '<tr><td class="font-mono text-xs">RPT-2024-018</td><td class="text-xs">INS-001</td><td class="text-sm">Cotton Textiles</td><td><span class="text-emerald-600 font-semibold text-xs">PASS</span></td><td class="text-center">2 minor</td><td class="text-center text-xs">94%</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Approve</button></td></tr>',
      '<tr><td class="font-mono text-xs">RPT-2024-017</td><td class="text-xs">INS-002</td><td class="text-sm">Garments</td><td><span class="text-red-600 font-semibold text-xs">FAIL</span></td><td class="text-center">5 major</td><td class="text-center text-xs">91%</td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Approve</button></td></tr>',
      '<tr><td class="font-mono text-xs">RPT-2024-016</td><td class="text-xs">INS-003</td><td class="text-sm">Fabric Rolls</td><td><span class="text-emerald-600 font-semibold text-xs">PASS</span></td><td class="text-center">0</td><td class="text-center text-xs">98%</td><td>' + badge('APPROVED') + '</td><td><span class="text-xs text-surface-400">Shared</span></td></tr>',
    ], { title: 'AI-Generated Reports' })}`;
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
async function renderQCPerformance() {
  setTitle('QC Performance', 'Metrics and KPIs');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('QC team performance metrics', 'Track inspection throughput and quality', 'None — metrics update in real-time', 'Performance affects provider selection algorithm')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-clipboard-check', 'Inspections (30d)', 42, 15, 'blue')}
      ${metricCard('fa-clock', 'Avg Turnaround', '1.8d', -10, 'green')}
      ${metricCard('fa-star', 'Client Rating', '4.8', 3, 'purple')}
      ${metricCard('fa-bullseye', 'Accuracy', '97.2%', 1, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-bar text-sgtx-500 mr-2"></i>Monthly Throughput</h3>
        <div class="h-40 flex items-end gap-3 px-2">
          ${[28,35,31,42,38,45].map((v,i) => `<div class="flex-1 text-center"><div class="bg-gradient-to-t from-sgtx-500 to-sgtx-400 rounded-t mx-auto transition-all" style="height:${(v/45)*100}%;width:70%"></div><div class="text-[9px] text-surface-400 mt-1">${['Aug','Sep','Oct','Nov','Dec','Jan'][i]}</div></div>`).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-users text-sgtx-500 mr-2"></i>Inspector Leaderboard</h3>
        <div class="space-y-2">
          ${[{name:'J. Smith',inspections:18,rating:4.9,rank:1},{name:'M. Chen',inspections:14,rating:4.8,rank:2},{name:'A. Nguyen',inspections:10,rating:4.7,rank:3}].map(i => `
            <div class="flex items-center gap-3 p-3 rounded-xl ${i.rank===1?'bg-amber-50 border border-amber-100':'hover:bg-surface-50'} transition">
              <span class="text-xs font-bold text-surface-400 w-4">#${i.rank}</span>
              <div class="w-7 h-7 rounded-full bg-sgtx-100 flex items-center justify-center text-sgtx-600 text-[10px] font-bold">${i.name.split(' ').map(n=>n[0]).join('')}</div>
              <div class="flex-1"><div class="text-xs font-medium">${i.name}</div></div>
              <div class="text-[10px] text-surface-400">${i.inspections} insp.</div>
              <div class="text-xs font-semibold text-amber-500"><i class="fas fa-star mr-0.5"></i>${i.rating}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// GOVERNMENT PORTAL
// ═══════════════════════════════════════════════════════════
async function renderGovDashboard() {
  setTitle('Government Dashboard', 'Dynamic module configuration');
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-handshake', 'Active Trades', stats.trade_requests || 0, null, 'blue')}
      ${metricCard('fa-building', 'Entities', stats.tenants || 0, null, 'purple')}
      ${metricCard('fa-gavel', 'Gov Decisions', stats.governor_decisions || 0, null, 'amber')}
      ${metricCard('fa-globe', 'Jurisdictions', stats.jurisdictions_covered || 0, null, 'green')}
    </div>
    ${fourQuestions('Government monitoring active', 'Review trade activity and clearances', 'None', 'Continuous compliance monitoring')}
    <div class="sgtx-card mb-4">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-toggle-on text-sgtx-500 mr-2"></i>Dynamic Modules</h3>
      <div class="grid grid-cols-3 gap-3">
        ${['Document Verification', 'Risk Scoring', 'AutoClearance', 'Multi-Agency Workflow', 'Anonymous Trade', 'API Integration', 'Permit Issuance', 'Live Trade Monitor', 'Audit Trail'].map(mod => 
          `<div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
            <span class="text-xs font-medium">${mod}</span>
            <div class="w-8 h-4 rounded-full bg-emerald-400 relative"><div class="w-3 h-3 rounded-full bg-white absolute right-0.5 top-0.5"></div></div>
          </div>`).join('')}
      </div>
    </div>`;
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
        <h3 class="font-semibold text-sm"><i class="fas fa-chart-line text-sgtx-500 mr-2"></i>Trade Flow (Real-time)</h3>
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
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-list text-sgtx-500 mr-2"></i>Recent Trade Activity (Redacted)</h3></div>
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
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Multi-agency approval workflows for trade clearance', 'Route approvals to correct agencies', 'Sequential: Agency A must approve before B', 'All approvals clear → trade proceeds')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-sitemap', 'Active Workflows', 5, null, 'blue')}
      ${metricCard('fa-clock', 'Pending Approvals', 3, null, 'amber')}
      ${metricCard('fa-check-double', 'Completed (7d)', 12, null, 'green')}
      ${metricCard('fa-building-columns', 'Agencies', 4, null, 'purple')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-sitemap text-sgtx-500 mr-2"></i>Active Approval Workflows</h3>
      <div class="space-y-4">
        ${[{trade:'TRD-2024-001',type:'Sequential',agencies:[{name:'Customs',status:'APPROVED'},{name:'Health Dept',status:'PENDING'},{name:'Standards',status:'WAITING'}]},{trade:'TRD-2024-002',type:'Parallel',agencies:[{name:'Customs',status:'APPROVED'},{name:'Port Authority',status:'APPROVED'},{name:'Immigration',status:'PENDING'}]}].map(w => `
          <div class="p-4 rounded-xl border border-surface-100">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-sgtx-600">${w.trade}</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-surface-100 text-surface-600">${w.type}</span>
              </div>
              <span class="text-[10px] text-surface-400">${w.agencies.filter(a=>a.status==='APPROVED').length}/${w.agencies.length} approved</span>
            </div>
            <div class="flex items-center gap-2">
              ${w.agencies.map((a,i) => `
                <div class="flex-1 text-center">
                  <div class="w-8 h-8 mx-auto rounded-lg ${a.status==='APPROVED'?'bg-emerald-500 text-white':a.status==='PENDING'?'bg-amber-100 text-amber-600':'bg-surface-100 text-surface-400'} flex items-center justify-center">
                    <i class="fas ${a.status==='APPROVED'?'fa-check':a.status==='PENDING'?'fa-clock':'fa-hourglass'} text-xs"></i>
                  </div>
                  <div class="text-[9px] mt-1 font-medium ${a.status==='APPROVED'?'text-emerald-600':a.status==='PENDING'?'text-amber-600':'text-surface-400'}">${a.name}</div>
                </div>
                ${i < w.agencies.length-1 ? `<div class="w-6 h-0.5 ${a.status==='APPROVED'?'bg-emerald-300':'bg-surface-200'}"></div>` : ''}`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
async function renderGovDocs() {
  setTitle('Document Verification', 'Government document verification queue');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Trade documents pending government verification', 'Verify document authenticity and compliance', 'AI extraction may need manual review', 'Verified docs unlock customs clearance')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-file-circle-check', 'In Queue', 11, null, 'amber')}
      ${metricCard('fa-check-double', 'Verified (7d)', 34, null, 'green')}
      ${metricCard('fa-robot', 'AI Confidence Avg', '89%', null, 'purple')}
      ${metricCard('fa-ban', 'Rejected', 2, null, 'rose')}
    </div>
    ${dataTable(['Document', 'Trade Ref', 'Submitted By', 'AI Confidence', 'Type', 'Action'], [
      '<tr><td class="text-sm">Certificate of Origin</td><td class="font-mono text-xs text-sgtx-600">TRD-2024-001</td><td class="text-xs">Saigon Textiles</td><td class="text-center text-emerald-600 font-semibold text-xs">96%</td><td class="text-xs">CO Form E</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Approve</button></td></tr>',
      '<tr><td class="text-sm">Phytosanitary Certificate</td><td class="font-mono text-xs text-sgtx-600">TRD-2024-003</td><td class="text-xs">VN Agri Export</td><td class="text-center text-amber-600 font-semibold text-xs">74%</td><td class="text-xs">Phyto</td><td><button class="text-xs bg-amber-500 text-white px-3 py-1 rounded-lg">Review</button></td></tr>',
      '<tr><td class="text-sm">Import Permit</td><td class="font-mono text-xs text-sgtx-600">TRD-2024-002</td><td class="text-xs">Cairo Imports</td><td class="text-center text-emerald-600 font-semibold text-xs">92%</td><td class="text-xs">Permit</td><td><button class="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Approve</button></td></tr>',
    ], { title: 'Government Verification Queue' })}`;
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
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-plug text-sgtx-500 mr-2"></i>Connected Customs Systems</h3>
      <div class="space-y-3">
        ${[{name:'Nafeza (Egypt)',endpoint:'api.nafeza.gov.eg',status:'Healthy',uptime:'99.9%',latency:'180ms',color:'emerald'},{name:'VNACCS (Vietnam)',endpoint:'api.vnaccs.customs.gov.vn',status:'Healthy',uptime:'99.5%',latency:'220ms',color:'emerald'},{name:'ATLAS (Germany)',endpoint:'zoll-portal.de/api',status:'Degraded',uptime:'98.2%',latency:'450ms',color:'amber'},{name:'CDS (UK)',endpoint:'customs.hmrc.gov.uk/api',status:'Healthy',uptime:'99.8%',latency:'160ms',color:'emerald'}].map(api => `
          <div class="flex items-center justify-between p-4 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-${api.color}-500"></div>
              <div>
                <div class="text-sm font-medium">${api.name}</div>
                <div class="text-[10px] text-surface-400 font-mono">${api.endpoint}</div>
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

// ═══════════════════════════════════════════════════════════
// ADMIN PORTAL
// ═══════════════════════════════════════════════════════════
async function renderAdminHealth() {
  setTitle('Platform Health', 'Realtime metrics, predictive health, PSP status');
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-heartbeat', 'System Health', '99.9%', null, 'green')}
      ${metricCard('fa-building', 'Tenants', stats.tenants, null, 'purple')}
      ${metricCard('fa-handshake', 'Trades', stats.trade_requests, null, 'blue')}
      ${metricCard('fa-gavel', 'Decisions', stats.governor_decisions, null, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-3"><i class="fas fa-server text-sgtx-500 mr-2"></i>Service Status</h3>
        <div class="space-y-2">
          ${['Governor Service', 'Identity Service', 'Trade Service', 'Payment Orchestrator', 'AI Layer (Groq)'].map(s => 
            `<div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
              <span class="text-xs">${s}</span>
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-[10px] text-emerald-600 font-medium">Healthy</span></span>
            </div>`).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-3"><i class="fas fa-shield-halved text-sgtx-500 mr-2"></i>Constitutional G1-G4</h3>
        <div class="space-y-2">
          ${[['G1','Execution Always Gated'],['G2','AI May Block Never Force'],['G3','Non-Custodial Structural'],['G4','Every Action Attributable']].map(([g,d]) => 
            `<div class="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <span class="text-xs font-semibold text-emerald-800">${g}: ${d}</span>
              <i class="fas fa-check-circle text-emerald-500"></i>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

async function renderConstitutional() {
  setTitle('Constitutional Policies', 'Edit Rego/WASM with impact simulation');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('G1-G4 constitutional policy management', 'Edit policies with impact simulation before deploy', 'Changes require 3-of-5 multisig approval', 'Deployed policies immediately enforce on all trades')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-scroll', 'Active Policies', 84, null, 'purple')}
      ${metricCard('fa-code', 'Rego Rules', 47, null, 'blue')}
      ${metricCard('fa-microchip', 'WASM Gates', 37, null, 'cyan')}
      ${metricCard('fa-clock', 'Last Updated', '2d ago', null, 'amber')}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-shield-halved text-sgtx-500 mr-2"></i>Constitutional Principles (G1-G4)</h3>
        <div class="space-y-3">
          ${[{id:'G1',name:'Execution Always Gated',gates:11,status:'Active'},{id:'G2',name:'AI May Block Never Force',gates:8,status:'Active'},{id:'G3',name:'Non-Custodial Structural',gates:6,status:'Active'},{id:'G4',name:'Every Action Attributable',gates:12,status:'Active'}].map(g => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">${g.id}</span>
                <div>
                  <div class="text-xs font-semibold text-emerald-800">${g.name}</div>
                  <div class="text-[10px] text-emerald-600">${g.gates} enforcement gates</div>
                </div>
              </div>
              <button class="text-[10px] bg-white text-emerald-700 border border-emerald-200 px-2 py-1 rounded font-semibold">Edit</button>
            </div>`).join('')}
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-flask text-sgtx-500 mr-2"></i>Impact Simulation</h3>
        <div class="p-4 bg-surface-50 rounded-xl mb-3">
          <div class="text-xs text-surface-500 mb-2">Simulate policy change impact on:</div>
          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div class="p-2 bg-white rounded-lg border border-surface-200 text-center"><div class="font-bold">34</div>Active Trades</div>
            <div class="p-2 bg-white rounded-lg border border-surface-200 text-center"><div class="font-bold">12</div>Pending Approvals</div>
            <div class="p-2 bg-white rounded-lg border border-surface-200 text-center"><div class="font-bold">8</div>In Financing</div>
            <div class="p-2 bg-white rounded-lg border border-surface-200 text-center"><div class="font-bold">156</div>Historical Trades</div>
          </div>
        </div>
        <button class="w-full py-2.5 bg-sgtx-500 text-white rounded-lg text-xs font-semibold hover:bg-sgtx-600 transition"><i class="fas fa-play mr-1"></i>Run Simulation</button>
        <div class="mt-3 p-3 bg-amber-50 rounded-xl text-[10px] text-amber-700">
          <i class="fas fa-lock mr-1"></i>Deployment requires 3-of-5 multisig approval
        </div>
      </div>
    </div>`;
}
async function renderGovernorLog() { return renderGovernor(); }
async function renderJurisdictionMatrix() { return renderJurisdictions(); }
async function renderPSPManager() {
  setTitle('PSP Manager', 'Health monitoring, fallback chains');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Payment Service Provider health management', 'Monitor PSP availability and configure fallbacks', 'PSP downtime triggers automatic fallback', 'AI router selects optimal PSP per transaction')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-credit-card', 'Active PSPs', 5, null, 'blue')}
      ${metricCard('fa-heart-pulse', 'Avg Health', '98.4%', null, 'green')}
      ${metricCard('fa-arrow-right-arrow-left', 'Txns Today', 23, null, 'purple')}
      ${metricCard('fa-rotate', 'Fallbacks', 1, null, 'amber')}
    </div>
    <div class="sgtx-card mb-6">
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-credit-card text-sgtx-500 mr-2"></i>PSP Health Dashboard</h3>
      <div class="space-y-3">
        ${[{name:'Stripe',status:'Healthy',uptime:'99.99%',latency:'120ms',priority:1},{name:'Wise',status:'Healthy',uptime:'99.8%',latency:'340ms',priority:2},{name:'PayPal Business',status:'Degraded',uptime:'97.2%',latency:'890ms',priority:3},{name:'Local Bank Rails',status:'Healthy',uptime:'99.5%',latency:'200ms',priority:4},{name:'Crypto Rails (Circle)',status:'Maintenance',uptime:'95.0%',latency:'—',priority:5}].map(p =>
          '<div class="flex items-center justify-between p-4 rounded-xl border border-surface-100">' +
            '<div class="flex items-center gap-3">' +
              '<span class="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-[10px] font-bold">' + p.priority + '</span>' +
              '<div><div class="text-sm font-medium">' + p.name + '</div><div class="text-[10px] text-surface-400">' + p.latency + ' avg latency</div></div>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<span class="text-[10px] font-semibold">' + p.uptime + '</span>' +
              '<span class="text-[10px] px-2 py-1 rounded font-semibold ' + (p.status==='Healthy'?'bg-emerald-100 text-emerald-700':p.status==='Degraded'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700') + '">' + p.status + '</span>' +
            '</div>' +
          '</div>'
        ).join('')}
      </div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-route text-sgtx-500 mr-2"></i>Fallback Chain</h3>
      <div class="flex items-center gap-2 flex-wrap py-2">
        ${['Stripe','Wise','PayPal','Bank','Crypto'].map((p,i) => '<div class="flex items-center gap-2"><div class="px-3 py-2 rounded-lg bg-sgtx-50 border border-sgtx-200 text-xs font-medium text-sgtx-700">' + p + '</div>' + (i<4 ? '<i class="fas fa-chevron-right text-surface-300 text-xs"></i>' : '') + '</div>').join('')}
      </div>
      <div class="text-[10px] text-surface-400 mt-2">AI PSP Router auto-selects optimal rail. Fallback on timeout (>5s) or error rate >2%.</div>
    </div>`;
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
      '<tr><td class="font-mono text-[10px]">CIRO ↔ SGTX</td><td class="text-xs">EG → VN</td><td class="text-xs font-bold text-sgtx-600">1.5%</td><td class="text-xs">$450K</td><td class="text-xs">Dec 2024</td><td><button class="text-[10px] text-sgtx-600 hover:underline">Edit</button></td></tr>',
      '<tr><td class="font-mono text-[10px]">ASFI ↔ HAMB</td><td class="text-xs">SG → DE</td><td class="text-xs font-bold text-sgtx-600">0.8%</td><td class="text-xs">$1.2M</td><td class="text-xs">Nov 2024</td><td><button class="text-[10px] text-sgtx-600 hover:underline">Edit</button></td></tr>',
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
      '<tr><td class="text-sm font-medium">TradeFlow Marketplace</td><td>' + badge('ACTIVE') + '</td><td class="text-xs font-semibold">15%</td><td class="text-center">24</td><td class="text-xs font-semibold">$8,200</td><td><button class="text-[10px] text-sgtx-600 hover:underline">Manage</button></td></tr>',
      '<tr><td class="text-sm font-medium">GlobalSource.io</td><td>' + badge('ACTIVE') + '</td><td class="text-xs font-semibold">12%</td><td class="text-center">11</td><td class="text-xs font-semibold">$3,100</td><td><button class="text-[10px] text-sgtx-600 hover:underline">Manage</button></td></tr>',
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
      <div class="px-5 py-4 border-b border-surface-100"><h3 class="font-semibold text-sm"><i class="fas fa-code-branch text-sgtx-500 mr-2"></i>Configuration Changes</h3></div>
      <div class="divide-y divide-surface-100">
        ${[{ver:'v47',change:'Updated jurisdiction matrix',author:'Admin A',time:'2h ago'},{ver:'v46',change:'PSP fallback chain reordered',author:'Admin B',time:'1d ago'},{ver:'v45',change:'Fee rate adjusted EG-VN corridor',author:'Admin A',time:'3d ago'},{ver:'v44',change:'Governor policy: Added G1U11 gate',author:'Admin C',time:'5d ago'}].map(c =>
          '<div class="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition">' +
            '<span class="font-mono text-xs text-sgtx-600 font-bold w-8">' + c.ver + '</span>' +
            '<div class="flex-1"><div class="text-xs text-surface-800">' + c.change + '</div><div class="text-[10px] text-surface-400">' + c.author + ' &bull; ' + c.time + '</div></div>' +
            '<button class="text-[10px] text-sgtx-600 hover:underline">Rollback</button>' +
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
      '<tr><td class="font-mono text-xs">TKT-042</td><td class="text-sm">Cairo Imports</td><td class="text-xs">Fee dispute</td><td><span class="text-xs font-bold text-red-600">HIGH</span></td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Handle</button></td></tr>',
      '<tr><td class="font-mono text-xs">TKT-041</td><td class="text-sm">Saigon Textiles</td><td class="text-xs">EXW lock issue</td><td><span class="text-xs font-bold text-amber-600">MED</span></td><td>' + badge('PENDING') + '</td><td><button class="text-xs bg-sgtx-500 text-white px-3 py-1 rounded-lg">Handle</button></td></tr>',
    ], { title: 'Escalation Queue' })}`;
}

// ═══════════════════════════════════════════════════════════
// MARKETPLACE PARTNER PORTAL
// ═══════════════════════════════════════════════════════════
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
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-code text-sgtx-500 mr-2"></i>API Endpoints</h3>
      <div class="space-y-2">
        ${[['POST', '/partner/intent/analyze', 'Analyze trade intent'],['POST', '/partner/trade/initiate', 'Initiate trade'],['GET', '/partner/suppliers/match', 'Match suppliers'],['POST', '/partner/webhook/register', 'Register webhook']].map(([method, path, desc]) => 
          `<div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${method === 'POST' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${method}</span>
            <code class="text-xs font-mono text-sgtx-600 flex-1">${path}</code>
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
        <h3 class="font-semibold text-sm"><i class="fas fa-key text-sgtx-500 mr-2"></i>API Keys</h3>
        <button class="px-4 py-2 bg-sgtx-500 text-white text-xs rounded-lg font-semibold hover:bg-sgtx-600 transition"><i class="fas fa-plus mr-1"></i>Generate Key</button>
      </div>
      <div class="space-y-3">
        ${[{name:'Production Key',prefix:'sk_live_7x8K...',created:'Dec 2024',calls:12450,limit:50000,active:true},{name:'Staging Key',prefix:'sk_test_3m2N...',created:'Nov 2024',calls:3200,limit:10000,active:true}].map(k => `
          <div class="p-4 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-sgtx-100 flex items-center justify-center"><i class="fas fa-key text-sgtx-600 text-xs"></i></div>
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
                <div class="h-2 bg-surface-100 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:${(k.calls/k.limit)*100}%"></div></div>
              </div>
              <div class="text-[10px] text-surface-400">Since ${k.created}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
async function renderLeadManagement() {
  setTitle('Lead Management', 'Intent inbox with viability scores');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Trade intent leads from marketplace integration', 'Review and convert high-viability leads', 'Low-viability leads auto-archived after 7d', 'Converted leads become trade requests')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-funnel-dollar', 'Active Leads', 12, null, 'blue')}
      ${metricCard('fa-check', 'Converted (30d)', 5, null, 'green')}
      ${metricCard('fa-chart-line', 'Conversion Rate', '42%', 8, 'purple')}
      ${metricCard('fa-dollar-sign', 'Pipeline Value', '$1.8M', null, 'amber')}
    </div>
    <div class="sgtx-card !p-0 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm"><i class="fas fa-funnel-dollar text-sgtx-500 mr-2"></i>Lead Inbox</h3>
        <div class="flex gap-2">
          <button class="text-[10px] px-3 py-1 rounded-full bg-sgtx-100 text-sgtx-700 font-semibold">All (12)</button>
          <button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-400">High Viability</button>
        </div>
      </div>
      <div class="divide-y divide-surface-100">
        ${[{company:'Global Trading LLC',intent:'Import textiles from Vietnam',value:'$250K',viability:92,time:'1h ago'},{company:'MedEast Imports',intent:'Source machinery from Germany',value:'$500K',viability:78,time:'3h ago'},{company:'Pacific Goods Co',intent:'Agricultural products from India',value:'$180K',viability:65,time:'6h ago'}].map(l => `
          <div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">
            <div class="flex-1">
              <div class="text-sm font-medium">${l.company}</div>
              <div class="text-xs text-surface-400">${l.intent} • ${l.value}</div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-center"><div class="text-xs font-bold ${l.viability>=80?'text-emerald-600':l.viability>=60?'text-amber-600':'text-red-600'}">${l.viability}%</div><div class="text-[10px] text-surface-400">viability</div></div>
              <span class="text-[10px] text-surface-400">${l.time}</span>
              <button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Convert</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
async function renderWebhooks() {
  setTitle('Webhooks', 'Register endpoints, event logs, retry');
  document.getElementById('content').innerHTML = `
    ${fourQuestions('Webhook endpoint management', 'Register URLs and monitor delivery', 'Failed deliveries auto-retry 3 times', 'Real-time notifications for trade events')}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-link', 'Active Webhooks', 3, null, 'blue')}
      ${metricCard('fa-check', 'Delivered (24h)', 47, null, 'green')}
      ${metricCard('fa-rotate', 'Retries', 2, null, 'amber')}
      ${metricCard('fa-xmark', 'Failed', 0, null, 'rose')}
    </div>
    <div class="sgtx-card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-sm"><i class="fas fa-link text-sgtx-500 mr-2"></i>Registered Endpoints</h3>
        <button class="px-4 py-2 bg-sgtx-500 text-white text-xs rounded-lg font-semibold"><i class="fas fa-plus mr-1"></i>Add Webhook</button>
      </div>
      <div class="space-y-3">
        ${[{url:'https://api.tradeflow.com/webhooks/sgtx',events:['trade.created','quote.submitted','contract.signed'],status:'Active',success:99},{url:'https://hooks.globalsource.io/v1/sgtx',events:['trade.created','lead.converted'],status:'Active',success:97},{url:'https://staging.myapp.dev/hooks',events:['*'],status:'Active',success:100}].map(w => `
          <div class="p-4 rounded-xl border border-surface-100">
            <div class="flex items-center justify-between mb-2">
              <code class="text-xs font-mono text-sgtx-600">${w.url}</code>
              <span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">${w.status}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex gap-1 flex-wrap">${w.events.map(e => `<span class="text-[9px] px-1.5 py-0.5 bg-surface-100 rounded text-surface-600">${e}</span>`).join('')}</div>
              <span class="text-[10px] text-surface-400">${w.success}% delivery</span>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-flask text-sgtx-500 mr-2"></i>Sandbox Status</h3>
        <div class="space-y-3">
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-semibold text-emerald-700">Environment Active</span>
          </div>
          <div class="p-3 bg-surface-50 rounded-xl"><div class="text-[10px] text-surface-400">Base URL</div><code class="text-xs text-sgtx-600">https://sandbox.sgtx.platform/api/v1</code></div>
          <div class="p-3 bg-surface-50 rounded-xl"><div class="text-[10px] text-surface-400">Test API Key</div><code class="text-xs text-sgtx-600">sk_test_sandbox_...</code></div>
          <button class="w-full py-2.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"><i class="fas fa-rotate mr-1"></i>Reset Sandbox Now</button>
        </div>
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-database text-sgtx-500 mr-2"></i>Synthetic Data</h3>
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
      <h3 class="font-semibold text-sm mb-4"><i class="fas fa-chart-area text-sgtx-500 mr-2"></i>API Call Volume (30 days)</h3>
      <div class="h-40 flex items-end gap-1 px-2">
        ${Array.from({length:30}, (_,i) => {const h = 30 + Math.random()*65; return `<div class="flex-1 bg-gradient-to-t from-sgtx-500 to-sgtx-400 rounded-t opacity-80 hover:opacity-100 transition" style="height:${h}%" title="Day ${i+1}"></div>`;}).join('')}
      </div>
      <div class="flex justify-between mt-2 text-[10px] text-surface-400"><span>30 days ago</span><span>Today</span></div>
    </div>
    <div class="sgtx-card">
      <h3 class="font-semibold text-sm mb-3"><i class="fas fa-list text-sgtx-500 mr-2"></i>Top Endpoints</h3>
      <div class="space-y-2">
        ${[{endpoint:'POST /partner/intent/analyze',calls:'8,240',pct:34},{endpoint:'POST /partner/trade/initiate',calls:'5,120',pct:21},{endpoint:'GET /partner/suppliers/match',calls:'4,890',pct:20},{endpoint:'POST /partner/webhook/register',calls:'3,200',pct:13},{endpoint:'GET /partner/status',calls:'3,050',pct:12}].map(e => `
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50">
            <code class="text-[10px] font-mono text-sgtx-600 flex-1">${e.endpoint}</code>
            <span class="text-xs font-semibold w-16 text-right">${e.calls}</span>
            <div class="w-24 h-2 bg-surface-100 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:${e.pct}%"></div></div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS — Blueprint 6.1
// PlainLanguage Decision Panel, Guided Recovery, SLA Transparency
// ═══════════════════════════════════════════════════════════

// Blueprint 6.1.3 — PlainLanguage Governor Decision Panel
// Translates DENY/CONDITIONAL verdicts into jargon-free explanations
function plainLanguageDecisionPanel(decision) {
  if (!decision) return '';
  const verdictColors = { ALLOW: 'emerald', DENY: 'red', CONDITIONAL: 'amber', ESCALATE: 'purple', PENDING: 'surface' };
  const color = verdictColors[decision.verdict] || 'surface';
  return `<div class="sgtx-card border-${color}-200 bg-${color}-50/30 mb-4">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center shrink-0">
        <i class="fas ${decision.verdict==='ALLOW'?'fa-check-circle':decision.verdict==='DENY'?'fa-times-circle':decision.verdict==='CONDITIONAL'?'fa-exclamation-circle':'fa-question-circle'} text-${color}-600 text-lg"></i>
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm font-bold text-${color}-800">Governor Decision: ${decision.verdict}</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-${color}-100 text-${color}-700 font-semibold">${decision.policy || 'trade.request'}</span>
        </div>
        <p class="text-xs text-${color}-700 mb-3">${decision.plain_language || decision.message || 'No explanation provided.'}</p>
        ${decision.conditions ? `<div class="space-y-1.5 mb-3">
          <div class="text-[10px] font-bold text-${color}-800 uppercase">Conditions to Clear:</div>
          ${decision.conditions.map(c => `<div class="flex items-center gap-2 text-xs text-${color}-700"><i class="fas ${c.met?'fa-check-circle text-emerald-500':'fa-circle text-surface-300'} text-xs"></i><span>${c.label}</span></div>`).join('')}
        </div>` : ''}
        <div class="flex gap-2">
          ${decision.verdict === 'CONDITIONAL' ? '<button class="px-3 py-1.5 bg-amber-500 text-white text-[10px] rounded-lg font-semibold">Complete Conditions</button>' : ''}
          ${decision.verdict === 'DENY' ? '<button class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Request Human Review</button>' : ''}
          <button class="px-3 py-1.5 bg-surface-100 text-surface-600 text-[10px] rounded-lg font-semibold">View Full Decision</button>
        </div>
      </div>
    </div>
  </div>`;
}

// Blueprint 6.1.9 — Guided Recovery System
// Detects user friction and offers proactive help
function guidedRecoveryBanner(type, context = {}) {
  const recoveryTypes = {
    repeated_submission: { icon: 'fa-rotate', color: 'amber', title: 'Having trouble submitting?', message: 'We noticed multiple attempts. Would you like guided help completing this form?', actions: ['Guide Me', 'Dismiss'] },
    abandonment: { icon: 'fa-hand', color: 'blue', title: 'Need help completing this?', message: 'Your progress has been saved. You can resume anytime or get assistance.', actions: ['Resume', 'Save & Exit', 'Get Help'] },
    denial_loop: { icon: 'fa-shield-halved', color: 'purple', title: 'Governor keeps blocking?', message: 'Multiple denials detected. Let us help you understand what\'s needed to proceed.', actions: ['Explain Requirements', 'Request Human Review'] },
    sla_breach: { icon: 'fa-clock', color: 'red', title: 'Response overdue', message: `The expected response time has passed. You can escalate or wait.`, actions: ['Escalate', 'Wait'] },
  };
  const r = recoveryTypes[type] || recoveryTypes.abandonment;
  return `<div class="sgtx-card border-${r.color}-200 bg-${r.color}-50/30 mb-4 animate-fade-in">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-${r.color}-100 flex items-center justify-center"><i class="fas ${r.icon} text-${r.color}-600"></i></div>
      <div class="flex-1">
        <div class="text-xs font-bold text-${r.color}-800">${r.title}</div>
        <div class="text-[10px] text-${r.color}-600 mt-0.5">${r.message}</div>
      </div>
      <div class="flex gap-2">${r.actions.map((a,i) => `<button class="px-3 py-1.5 ${i===0?`bg-${r.color}-500 text-white`:'bg-white text-surface-600 border border-surface-200'} text-[10px] rounded-lg font-semibold">${a}</button>`).join('')}</div>
    </div>
  </div>`;
}

// Blueprint 6.1.10 — SLA Transparency Indicators
// Every pending human action shows estimated response time
function slaIndicator(action, estimatedMinutes, queuePosition, responsibleParty, escalationPath) {
  const urgency = estimatedMinutes <= 30 ? 'emerald' : estimatedMinutes <= 120 ? 'amber' : 'red';
  const timeStr = estimatedMinutes < 60 ? `${estimatedMinutes} min` : estimatedMinutes < 1440 ? `${Math.round(estimatedMinutes/60)}h` : `${Math.round(estimatedMinutes/1440)}d`;
  return `<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${urgency}-50 border border-${urgency}-100 text-[10px]">
    <i class="fas fa-clock text-${urgency}-500"></i>
    <span class="text-${urgency}-700 font-medium">${action}</span>
    <span class="text-${urgency}-600">~${timeStr}</span>
    ${queuePosition ? `<span class="text-${urgency}-500">#${queuePosition} in queue</span>` : ''}
    <span class="text-${urgency}-400">→ ${responsibleParty}</span>
  </div>`;
}

// Combined SLA panel for page-level display
function slaTransparencyPanel(pendingActions) {
  if (!pendingActions || !pendingActions.length) return '';
  return `<div class="sgtx-card !p-4 mb-4 border-surface-200">
    <div class="flex items-center gap-2 mb-3">
      <i class="fas fa-clock text-sgtx-500 text-sm"></i>
      <span class="text-xs font-semibold text-surface-700">SLA Transparency — Pending Actions</span>
    </div>
    <div class="space-y-2">
      ${pendingActions.map(a => `
        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-${a.minutes<=30?'emerald':a.minutes<=120?'amber':'red'}-500"></span>
            <span class="text-xs text-surface-700">${a.action}</span>
          </div>
          <div class="flex items-center gap-3 text-[10px]">
            <span class="text-surface-500">~${a.minutes < 60 ? a.minutes + 'min' : Math.round(a.minutes/60) + 'h'}</span>
            ${a.queue ? `<span class="text-surface-400">#${a.queue}</span>` : ''}
            <span class="text-surface-400">${a.party}</span>
            <button class="text-sgtx-600 hover:underline">Escalate</button>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// LEGACY SUPPORT — Functions called by trade_forms.js
// ═══════════════════════════════════════════════════════════
function showTradeWizard() { if (typeof showTradeWizardV2 === 'function') showTradeWizardV2(); }
function showQuoteForm(tradeId) { if (typeof showExporterQuoteFormV2 === 'function') showExporterQuoteFormV2(tradeId); }
async function resolveGTID(gtid) {
  const preview = document.getElementById('gtid-preview');
  if (!preview || gtid.length < 15) { if(preview) preview.innerHTML = ''; return; }
  try {
    const r = await api('/gtid/resolve?gtid=' + encodeURIComponent(gtid));
    if (r.data) preview.innerHTML = `<span class="text-emerald-600"><i class="fas fa-check-circle mr-1"></i>${r.data.legal_name} (${r.data.jurisdiction}) — Trust: ${r.data.trust_score || '—'}</span>`;
    else preview.innerHTML = '<span class="text-red-500"><i class="fas fa-times-circle mr-1"></i>GTID not found</span>';
  } catch(e) { preview.innerHTML = ''; }
}

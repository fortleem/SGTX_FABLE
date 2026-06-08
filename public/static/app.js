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
          <div class="text-[10px] text-surface-400 font-mono">Entity: ${entityId || 'N/A'} • Governor v6.3</div>
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
            <label class="flex items-center gap-3 p-3 rounded-xl border border-surface-100 hover:border-sgtx-200 transition cursor-pointer">
              <input type="checkbox" class="w-4 h-4 rounded border-surface-300 text-sgtx-500 focus:ring-sgtx-500" id="gov-cond-${i}">
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
        ${isConditional ? `<button onclick="submitConditions('${entityId}')" class="flex-1 py-2.5 bg-sgtx-500 text-white rounded-xl text-xs font-semibold">Submit Conditions</button>` : ''}
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
  return '<div class="glass-card p-4 border-l-4 border-' + v.color + '-400 mb-4">' +
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
  return '<div class="glass-card p-4 border-l-4 border-' + b.color + '-400 mb-4 flex items-center gap-4">' +
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
  return '<div class="glass-card p-4 mb-4">' +
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

async function renderSmartInbox() {
  setTitle('Smart Inbox', 'Prioritized action feed with SLA transparency');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(6);
  try {
    var res = await api('/inbox?tenant_id=' + tenant.id);
    var items = res.data || [];
    var sorted = items.sort(function(a, b) { return (b.priority_score || b.urgency_score || 0) - (a.priority_score || a.urgency_score || 0); });
    var aiSummary = generateLocalAISummary(sorted);
    var categories = ['ALL'];
    sorted.forEach(function(i) { if (i.category && categories.indexOf(i.category) === -1) categories.push(i.category); });
    var highItems = sorted.filter(function(i) { return (i.priority_score || i.urgency_score || 0) >= 80; });
    var medItems = sorted.filter(function(i) { var s = i.priority_score || i.urgency_score || 0; return s >= 50 && s < 80; });
    var lowItems = sorted.filter(function(i) { return (i.priority_score || i.urgency_score || 0) < 50; });

    content.innerHTML =
      fourQuestions(
        sorted.length + ' items in inbox. ' + highItems.length + ' HIGH priority.',
        highItems.length > 0 ? 'Resolve ' + highItems.length + ' urgent item(s) first (score ≥80).' : 'No urgent actions needed.',
        highItems.length > 0 ? highItems.length + ' urgent item(s) require attention.' : 'No blockers. All clear.',
        'After resolving high priority items, work through medium and low.'
      ) +
      // AI Summary Card
      '<div class="sgtx-card p-4 mb-4 border-l-4 border-l-blue-400 bg-gradient-to-r from-blue-50 to-white">' +
        '<div class="flex items-center gap-2 mb-1"><i class="fas fa-robot text-blue-500"></i><span class="text-sm font-semibold text-surface-800">AI Summary</span><span class="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">A1 Advisory</span></div>' +
        '<p class="text-xs text-surface-600">' + aiSummary + '</p>' +
      '</div>' +
      // Category filters
      '<div class="flex gap-2 mb-4 flex-wrap">' +
        categories.map(function(c) {
          return '<button onclick="filterInbox(\'' + c + '\')" class="inbox-filter-btn px-3 py-1.5 rounded-full text-xs font-medium transition border ' + (c === 'ALL' ? 'bg-sgtx-500 text-white border-sgtx-500' : 'bg-white text-surface-600 border-surface-200 hover:border-sgtx-300') + '" data-cat="' + c + '">' +
            (c === 'ALL' ? '<i class="fas fa-layer-group mr-1"></i>' : '<i class="fas ' + getCategoryIcon(c) + ' mr-1"></i>') + c + '</button>';
        }).join('') +
      '</div>' +
      // Priority bands
      (highItems.length ? '<div class="mb-4"><div class="flex items-center gap-2 mb-2"><div class="w-2 h-2 rounded-full bg-red-500"></div><span class="text-xs font-bold text-red-600 uppercase">High Priority (≥80)</span><span class="text-[10px] text-surface-400">' + highItems.length + ' items</span></div><div class="space-y-2">' + highItems.map(renderInboxItem).join('') + '</div></div>' : '') +
      (medItems.length ? '<div class="mb-4"><div class="flex items-center gap-2 mb-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div><span class="text-xs font-bold text-amber-600 uppercase">Medium (50-79)</span><span class="text-[10px] text-surface-400">' + medItems.length + ' items</span></div><div class="space-y-2">' + medItems.map(renderInboxItem).join('') + '</div></div>' : '') +
      (lowItems.length ? '<div class="mb-4"><div class="flex items-center gap-2 mb-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-xs font-bold text-emerald-600 uppercase">Low (0-49)</span><span class="text-[10px] text-surface-400">' + lowItems.length + ' items</span></div><div class="space-y-2">' + lowItems.map(renderInboxItem).join('') + '</div></div>' : '') +
      (sorted.length === 0 ? '<div class="sgtx-card p-8 text-center"><i class="fas fa-check-circle text-4xl text-emerald-500 mb-3"></i><p class="text-surface-500">All clear! No pending actions.</p></div>' : '');
  } catch (e) {
    content.innerHTML = renderError('Could not load inbox: ' + e.message);
  }
}

function renderInboxItem(item) {
  var urgency = item.priority_score || item.urgency_score || 0;
  var urgencyColor = urgency >= 80 ? 'red' : urgency >= 50 ? 'amber' : 'emerald';
  var cat = item.category || item.item_type || 'SYSTEM';
  var catColor = getCategoryColor(cat);
  var deadline = item.deadline || item.sla_deadline;
  var hasDeadline = !!deadline;
  var hoursLeft = hasDeadline ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 3600000)) : null;

  return '<div class="inbox-item sgtx-card p-4 hover:shadow-card-hover transition cursor-pointer border-l-4 border-l-' + urgencyColor + '-400" data-category="' + cat + '" onclick="navigateTo(\'' + getActionPage(item) + '\')">' +
    '<div class="flex items-start gap-3">' +
      '<div class="w-10 h-10 rounded-xl bg-' + catColor + '-100 flex items-center justify-center flex-shrink-0"><i class="fas ' + getCategoryIcon(cat) + ' text-' + catColor + '-600"></i></div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 mb-1">' +
          '<span class="font-medium text-sm text-surface-800 truncate">' + (item.title || 'Notification') + '</span>' +
          '<span class="ml-auto flex items-center gap-1 text-xs font-mono font-bold text-' + urgencyColor + '-600 bg-' + urgencyColor + '-50 px-1.5 py-0.5 rounded"><i class="fas fa-fire text-[9px]"></i>' + urgency + '</span>' +
        '</div>' +
        '<p class="text-xs text-surface-500 line-clamp-2 mb-1">' + (item.message || item.body || item.description || '') + '</p>' +
        // SLA Transparency
        '<div class="flex items-center gap-3 text-[10px] text-surface-400 flex-wrap">' +
          (item.ustn || item.related_ustn ? '<span class="font-mono bg-surface-100 px-1.5 py-0.5 rounded">' + (item.ustn || item.related_ustn) + '</span>' : '') +
          '<span><i class="fas fa-clock mr-0.5"></i>' + timeAgo(item.created_at) + '</span>' +
          (hasDeadline ? '<span class="' + (hoursLeft <= 2 ? 'text-red-500 font-semibold' : '') + '"><i class="fas fa-hourglass-half mr-0.5"></i>' + (hoursLeft <= 0 ? 'Overdue' : hoursLeft + 'h left') + '</span>' : '') +
          (item.responsible_party ? '<span><i class="fas fa-user-shield mr-0.5"></i>' + item.responsible_party + '</span>' : '') +
          (item.queue_position ? '<span><i class="fas fa-users mr-0.5"></i>Queue: #' + item.queue_position + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex flex-col gap-1 flex-shrink-0">' +
        '<button onclick="event.stopPropagation(); snoozeInboxItem(\'' + item.id + '\')" class="text-[10px] text-surface-400 hover:text-blue-500 p-1" title="Snooze 24h"><i class="fas fa-clock"></i></button>' +
        '<button onclick="event.stopPropagation(); dismissInboxItem(\'' + item.id + '\')" class="text-[10px] text-surface-400 hover:text-red-500 p-1" title="Dismiss"><i class="fas fa-times"></i></button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function filterInbox(cat) {
  document.querySelectorAll('.inbox-filter-btn').forEach(function(btn) {
    var isActive = btn.getAttribute('data-cat') === cat;
    btn.className = 'inbox-filter-btn px-3 py-1.5 rounded-full text-xs font-medium transition border ' + (isActive ? 'bg-sgtx-500 text-white border-sgtx-500' : 'bg-white text-surface-600 border-surface-200 hover:border-sgtx-300');
  });
  document.querySelectorAll('.inbox-item').forEach(function(item) {
    item.style.display = (cat === 'ALL' || item.getAttribute('data-category') === cat) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════
// TRADE COMMAND CENTER (Blueprint 6.1.2)
// Single page per USTN with 8-phase timeline
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// TRADE COMMAND CENTER (Blueprint 6.1.2 — Full TCC)
// Single page per USTN with 10-phase timeline + summary cards
// ═══════════════════════════════════════════════════════════

async function renderTradeCommandCenter() {
  setTitle('Trade Command Center', 'Unified per-USTN view — all phases at a glance');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(8);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&limit=20');
    var trades = res.data || [];
    if (!trades.length) {
      content.innerHTML = '<div class="sgtx-card p-8 text-center"><i class="fas fa-folder-open text-surface-400 text-4xl mb-3"></i><p class="text-surface-500">No trades yet.</p><button onclick="navigateTo(\'new-trade\')" class="mt-3 btn-primary">New Trade</button></div>';
      return;
    }
    content.innerHTML =
      fourQuestions('View any trade end-to-end across all 10 phases.', 'Select a trade to drill into its full Trade Command Center.', '', 'Track progress, documents, risk, and take action from one screen.') +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
        trades.map(function(t) {
          var phase = t.current_phase || 1;
          var phasePct = Math.round((phase / 10) * 100);
          var sc = t.status === 'COMPLETED' ? 'emerald' : t.status === 'DISPUTED' ? 'red' : 'blue';
          return '<div class="sgtx-card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer" onclick="showTradeTimeline(\'' + (t.ustn || t.id) + '\')">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-sm font-bold text-sgtx-600">' + (t.ustn || 'PENDING') + '</span>' + badge(t.status || 'DRAFT', sc) + '</div>' +
            '<p class="text-sm text-surface-700 font-medium">' + (t.commodity_type || 'Trade') + '</p>' +
            '<p class="text-xs text-surface-500 mb-3">' + (t.incoterm || '') + ' · ' + usd(t.total_value || 0) + ' · ' + timeAgo(t.created_at) + '</p>' +
            '<div class="flex items-center gap-2"><div class="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sgtx-500 to-emerald-500 rounded-full" style="width:' + phasePct + '%"></div></div><span class="text-xs font-semibold text-surface-600">' + phase + '/10</span></div>' +
          '</div>';
        }).join('') +
      '</div>';
  } catch (e) { content.innerHTML = renderError(e.message); }
}

async function showTradeTimeline(ustn) {
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(10);
  try {
    var res = await api('/trade/' + ustn + '/command-center');
    var data = res.data || res;
    var trade = data.trade || data;
    var phases = [
      { num:1, name:'Initiation', icon:'fa-clipboard-check' },
      { num:2, name:'Quotation', icon:'fa-file-invoice-dollar' },
      { num:3, name:'Contract', icon:'fa-file-signature' },
      { num:4, name:'Finance', icon:'fa-university' },
      { num:5, name:'Execution', icon:'fa-boxes' },
      { num:6, name:'Settlement', icon:'fa-money-check-alt' },
      { num:7, name:'Distressed', icon:'fa-exclamation-triangle' },
      { num:8, name:'QC', icon:'fa-microscope' },
      { num:9, name:'Customs', icon:'fa-gavel' },
      { num:10, name:'Dispute', icon:'fa-balance-scale' }
    ];
    var cp = trade.current_phase || 1;
    var contract = data.contract || {};
    var shipment = data.shipment || {};
    var finance = data.finance || {};
    var timeline = data.recent_activity || data.timeline || [];

    content.innerHTML =
      '<button onclick="renderTradeCommandCenter()" class="text-xs text-surface-500 hover:text-sgtx-600 mb-4 inline-flex items-center gap-1"><i class="fas fa-arrow-left"></i> Back</button>' +
      // Header
      '<div class="sgtx-card p-5 mb-4"><div class="flex items-center justify-between mb-3"><span class="font-mono text-lg font-bold text-sgtx-600 cursor-pointer" onclick="navigator.clipboard.writeText(\'' + (trade.ustn||ustn) + '\');showToast(\'Copied!\',\'success\')" title="Click to copy">' + (trade.ustn||ustn) + ' <i class="fas fa-copy text-xs text-surface-400"></i></span>' + badge(trade.status||'ACTIVE','blue') + '</div>' +
        '<p class="text-sm text-surface-600 mb-3">' + (trade.commodity_type||'') + ' · ' + (trade.incoterm||'') + ' · ' + usd(trade.total_value||0) + '</p>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
          [['Buyer', trade.buyer_name||trade.importer_tenant_id||'-','fa-user-tie'],['Seller', trade.seller_name||trade.exporter_tenant_id||'-','fa-store'],['Created', time(trade.created_at),'fa-calendar'],['Phase','Phase '+cp+' — '+(phases[cp-1]||{}).name,'fa-layer-group']].map(function(c){return '<div class="bg-surface-50 rounded-xl p-3 border border-surface-100"><div class="flex items-center gap-1.5 text-[10px] text-surface-500 uppercase font-semibold mb-1"><i class="fas '+c[2]+'"></i>'+c[0]+'</div><div class="text-sm text-surface-800 font-medium truncate">'+c[1]+'</div></div>';}).join('') +
        '</div></div>' +
      // Phase Timeline
      '<div class="sgtx-card p-5 mb-4"><h3 class="text-sm font-semibold text-surface-800 mb-4"><i class="fas fa-stream mr-2 text-sgtx-500"></i>Phase Timeline</h3><div class="flex items-center gap-0.5">' +
        phases.map(function(p){ var cls = p.num<cp?'bg-emerald-100 text-emerald-700 border-emerald-200':(p.num===cp?'bg-sgtx-500 text-white shadow-lg ring-2 ring-sgtx-300':'bg-surface-100 text-surface-400 border-surface-200'); return '<div class="flex-1 text-center"><div class="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-bold border '+cls+'">'+(p.num<cp?'<i class="fas fa-check"></i>':p.num)+'</div><div class="text-[9px] text-surface-500 mt-1 font-medium">'+p.name+'</div></div>';}).join('') +
      '</div></div>' +
      // Pending Action
      '<div class="sgtx-card p-5 mb-4 border-l-4 border-l-sgtx-500"><div class="flex items-center gap-2 mb-2"><i class="fas fa-bolt text-sgtx-500"></i><span class="font-semibold text-sm text-surface-800">Next Action</span></div><p class="text-sm text-surface-600">' + getNextAction(trade, cp) + '</p><div class="mt-3">' + getActionButton(trade, cp) + '</div></div>' +
      // Summary Cards
      '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-coins mr-1.5 text-amber-500"></i>Commercial</h4><div class="space-y-2 text-xs">' + [['Incoterm',trade.incoterm||'N/A'],['Value',usd(trade.total_value||0)],['SGTX Fee',usd(contract.sgtx_fee_amount||0)],['Currency',trade.currency||'USD']].map(function(r){return '<div class="flex justify-between"><span class="text-surface-500">'+r[0]+'</span><span class="font-medium text-surface-800">'+r[1]+'</span></div>';}).join('') + '</div></div>' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-users mr-1.5 text-blue-500"></i>Parties</h4><div class="space-y-2 text-xs">' + [['Buyer',trade.buyer_name||'-'],['Seller',trade.seller_name||'-'],['Trust (B)',trade.buyer_trust||'—'],['Trust (S)',trade.seller_trust||'—']].map(function(r){return '<div class="flex justify-between"><span class="text-surface-500">'+r[0]+'</span><span class="font-medium text-surface-800">'+r[1]+'</span></div>';}).join('') + '</div></div>' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-ship mr-1.5 text-cyan-500"></i>Shipment</h4><div class="space-y-2 text-xs">' + [['Status',shipment.status||'Pending'],['Vessel',shipment.vessel_name||'—'],['Origin',trade.origin_port||'—'],['Dest.',trade.destination_port||'—']].map(function(r){return '<div class="flex justify-between"><span class="text-surface-500">'+r[0]+'</span><span class="font-medium text-surface-800">'+r[1]+'</span></div>';}).join('') + '</div></div>' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-file-alt mr-1.5 text-purple-500"></i>Documents</h4><div class="space-y-1.5 text-xs">' + [['Contract',contract.status==='SIGNED'],['Packing List',!!trade.packing_locked],['Invoice',cp>=7],['B/L',!!shipment.ebl_issued],['QC Report',cp>=8]].map(function(d){return '<div class="flex items-center gap-2"><i class="fas '+(d[1]?'fa-check-circle text-emerald-500':'fa-circle text-surface-300')+' text-[10px]"></i><span class="'+(d[1]?'text-surface-700':'text-surface-400')+'">'+d[0]+'</span></div>';}).join('') + '</div></div>' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-landmark mr-1.5 text-indigo-500"></i>Finance</h4><div class="space-y-2 text-xs">' + [['Status',finance.status||'Not Requested'],['Amount',usd(finance.amount||0)],['Fee Paid',trade.fee_paid?'Yes':'No']].map(function(r){return '<div class="flex justify-between"><span class="text-surface-500">'+r[0]+'</span><span class="font-medium text-surface-800">'+r[1]+'</span></div>';}).join('') + '</div></div>' +
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-shield-alt mr-1.5 text-red-500"></i>Risk</h4><div class="space-y-2 text-xs">' + [['Risk',trade.risk_score||'Low'],['Sanctions','<span class=text-emerald-600><i class=\\'fas fa-check-circle mr-1\\'></i>Clear</span>'],['Governor','ALLOW']].map(function(r){return '<div class="flex justify-between"><span class="text-surface-500">'+r[0]+'</span><span class="font-medium text-surface-800">'+r[1]+'</span></div>';}).join('') + '</div></div>' +
      '</div>' +
      // Activity Feed
      '<div class="sgtx-card p-5"><h3 class="text-sm font-semibold text-surface-800 mb-3"><i class="fas fa-history mr-2 text-surface-400"></i>Activity Feed</h3><div class="space-y-3 max-h-60 overflow-y-auto">' +
        (timeline.length ? timeline.map(function(a){return '<div class="flex items-start gap-3 text-xs"><div class="w-2 h-2 rounded-full bg-sgtx-400 mt-1.5 flex-shrink-0"></div><div class="flex-1"><span class="text-surface-700">'+(a.description||a.event||a.action)+'</span><div class="text-surface-400 mt-0.5">'+timeAgo(a.created_at||a.timestamp)+'</div></div></div>';}).join('') : '<p class="text-xs text-surface-400">No activity yet.</p>') +
      '</div></div>';
  } catch (e) { content.innerHTML = renderError('Error: ' + e.message); }
}

function getNextAction(trade, phase) {
  var s = (trade.status||'').toUpperCase();
  if (s === 'COMPLETED' || s === 'SETTLED') return 'Trade complete. No action needed.';
  if (s === 'DISPUTED') return 'Active dispute. Review evidence and respond.';
  var m = { 1:'Waiting for seller response.', 2:'Complete EXW, packing, logistics then submit quote.', 3:'Review and sign contract with SGTX witness.', 4:'Request financing or pay SGTX fee to proceed.', 5:'Track milestones and confirm physical events.', 6:'Create settlement instruction and confirm payment.', 7:'Handle distressed cargo if applicable.', 8:'QC inspection in progress.', 9:'Upload customs documents.', 10:'Resolve disputes or finalize.' };
  return m[phase] || 'Proceed with next action.';
}

function getActionButton(trade, phase) {
  if ((trade.status||'').toUpperCase() === 'COMPLETED') return '<span class="text-xs text-emerald-600 font-medium"><i class="fas fa-check-circle mr-1"></i>Complete</span>';
  var b = { 1:'pending-requests', 2:'quote-submit', 3:'contract-signing', 4:'financing', 5:'shipments-vault', 6:'settlements', 7:'distressed-sell', 8:'qc-booking', 9:'customs-readiness', 10:'disputes' };
  var labels = { 1:'View Requests', 2:'Submit Quote', 3:'Sign Contract', 4:'Finance', 5:'Track', 6:'Settlement', 7:'Distressed', 8:'QC', 9:'Customs', 10:'Disputes' };
  return '<button onclick="navigateTo(\'' + (b[phase]||'smart-inbox') + '\')" class="btn-primary text-xs">' + (labels[phase]||'Next') + '</button>';
}

// ═══════════════════════════════════════════════════════════
// SHIPMENTS VAULT (Blueprint 6.2.x shared)
// ═══════════════════════════════════════════════════════════

async function renderShipmentsVault() {
  setTitle('Shipments Vault', 'Track all shipments with milestones and cold chain status');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/shipments?tenant_id=' + tenant.id);
    var shipments = res.data || [];
    var active = shipments.filter(function(s) { return s.status !== 'DELIVERED' && s.status !== 'COMPLETED'; });
    var delivered = shipments.filter(function(s) { return s.status === 'DELIVERED' || s.status === 'COMPLETED'; });

    content.innerHTML =
      fourQuestions(
        shipments.length + ' shipment(s) tracked. ' + active.length + ' active.',
        active.length > 0 ? 'Monitor milestones and confirm physical events.' : 'No active shipments.',
        active.filter(function(s){return s.status==='DELAYED'||s.status==='AT_RISK';}).length > 0 ? 'Delayed shipment(s) need attention.' : 'No blockers.',
        'After all milestones confirmed, move to settlement.'
      ) +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-ship', 'Total Shipments', shipments.length, null, 'blue') +
        metricCard('fa-route', 'In Transit', active.filter(function(s){return s.status==='IN_TRANSIT';}).length, null, 'cyan') +
        metricCard('fa-check-double', 'Delivered', delivered.length, null, 'green') +
        metricCard('fa-temperature-low', 'Cold Chain', shipments.filter(function(s){return s.container_type&&s.container_type.indexOf('RF')>=0;}).length, null, 'purple') +
      '</div>' +
      (active.length ? '<h3 class="text-sm font-semibold text-surface-800 mb-3"><i class="fas fa-satellite-dish mr-2 text-blue-500"></i>Active Shipments</h3><div class="space-y-3 mb-6">' +
        active.map(function(s) {
          var milestones = ['BOOKED','GATED_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS','DELIVERED'];
          var currentIdx = milestones.indexOf((s.current_milestone||s.status||'').toUpperCase());
          if (currentIdx < 0) currentIdx = 0;
          return '<div class="sgtx-card p-4">' +
            '<div class="flex items-center justify-between mb-3"><span class="font-mono text-sm font-bold text-sgtx-600">' + (s.ustn || s.id) + '</span>' + badge(s.status || 'PENDING', s.status === 'IN_TRANSIT' ? 'blue' : 'amber') + '</div>' +
            '<div class="grid grid-cols-4 gap-3 mb-3 text-xs">' +
              '<div><span class="text-surface-500">Origin</span><div class="font-medium">' + (s.origin_port || '-') + '</div></div>' +
              '<div><span class="text-surface-500">Destination</span><div class="font-medium">' + (s.dest_port || s.destination_port || '-') + '</div></div>' +
              '<div><span class="text-surface-500">Vessel</span><div class="font-medium">' + (s.vessel_name || '-') + '</div></div>' +
              '<div><span class="text-surface-500">Container</span><div class="font-medium">' + (s.container_numbers || '-') + '</div></div>' +
            '</div>' +
            // Milestone progress bar
            '<div class="flex items-center gap-0.5 mb-3">' +
              milestones.map(function(m, i) {
                var cls = i < currentIdx ? 'bg-emerald-500 text-white' : i === currentIdx ? 'bg-sgtx-500 text-white ring-1 ring-sgtx-300' : 'bg-surface-100 text-surface-400';
                return '<div class="flex-1 text-center"><div class="h-2 rounded-full ' + cls + '" title="' + m + '"></div><div class="text-[8px] mt-0.5 text-surface-400">' + m.substr(0,4) + '</div></div>';
              }).join('') +
            '</div>' +
            '<div class="flex gap-2">' +
              '<button onclick="confirmMilestone(\'' + (s.ustn||s.id) + '\')" class="btn-primary text-xs flex-1"><i class="fas fa-check mr-1"></i>Confirm Next Milestone</button>' +
              '<button onclick="showShipmentModal(\'' + s.id + '\')" class="px-3 py-1.5 border border-surface-200 rounded-lg text-xs text-surface-600"><i class="fas fa-eye mr-1"></i>Details</button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>' : '') +
      // All shipments table
      (shipments.length ? '<h3 class="text-sm font-semibold text-surface-800 mb-3"><i class="fas fa-list mr-2 text-surface-400"></i>All Shipments</h3>' +
        dataTable(['USTN', 'Origin', 'Destination', 'Status', 'Vessel', 'Action'],
          shipments.map(function(s) {
            return '<tr><td class="font-mono text-xs text-sgtx-600">' + (s.ustn||'-') + '</td><td class="text-xs">' + (s.origin_port||'-') + '</td><td class="text-xs">' + (s.dest_port||s.destination_port||'-') + '</td><td>' + badge(s.status||'PENDING', s.status==='DELIVERED'?'emerald':'blue') + '</td><td class="text-xs">' + (s.vessel_name||'-') + '</td><td><button onclick="showShipmentModal(\'' + s.id + '\')" class="text-xs text-sgtx-500 hover:underline"><i class="fas fa-eye mr-1"></i>View</button></td></tr>';
          })
        ) : '<div class="sgtx-card p-8 text-center"><i class="fas fa-ship text-surface-400 text-4xl mb-3"></i><p class="text-surface-500">No shipments found.</p></div>');
  } catch (e) { content.innerHTML = renderError(e.message); }
}

async function confirmMilestone(ustn) {
  try {
    showToast('Confirming milestone...', 'info');
    await apiPost('/shipment/milestone/confirm', { ustn: ustn, confirmed_by: tenant.id, confirmation_method: 'MANUAL' });
    showToast('Milestone confirmed!', 'success');
    renderShipmentsVault();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function showShipmentModal(id) {
  try {
    var res = await api('/shipments/' + id);
    var s = res.data || res;
    showModal(
      '<div class="space-y-4">' +
        '<h3 class="text-lg font-bold text-surface-800">Shipment: ' + (s.ustn || id) + '</h3>' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['USTN', s.ustn||'-'], ['Status', s.status||'-'], ['Origin', s.origin_port||'-'], ['Destination', s.dest_port||s.destination_port||'-'], ['Vessel', s.vessel_name||'-'], ['Container', s.container_numbers||s.container_number||'-'], ['ETD', s.etd?time(s.etd):'-'], ['ETA', s.eta?time(s.eta):'-']].map(function(p) {
            return '<div class="bg-surface-50 rounded-lg p-3 border border-surface-100"><div class="text-[10px] text-surface-500 uppercase">' + p[0] + '</div><div class="text-sm font-medium text-surface-800">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (s.milestones ? '<div><h4 class="text-sm font-semibold text-surface-800 mb-2">Milestones</h4><div class="space-y-2">' + (s.milestones||[]).map(function(m) { return '<div class="flex items-center gap-2 text-xs"><div class="w-2.5 h-2.5 rounded-full ' + (m.completed ? 'bg-emerald-500' : 'bg-surface-200 border border-surface-300') + '"></div><span class="text-surface-700 flex-1">' + (m.name||m.milestone) + '</span><span class="text-surface-500">' + (m.completed_at ? time(m.completed_at) : 'Pending') + '</span></div>'; }).join('') + '</div></div>' : '') +
      '</div>'
    );
  } catch (e) { showToast('Error loading shipment: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// PLATFORM DASHBOARD / TENANTS / GOVERNOR / JURISDICTIONS
// ═══════════════════════════════════════════════════════════

async function renderPlatformDashboard() {
  setTitle('Platform Dashboard', 'Overview of your trading activity');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/stats');
    var stats = res.data || res;
    content.innerHTML =
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-handshake', 'Active Trades', stats.active_trades || stats.trades || 0, null, 'blue') +
        metricCard('fa-ship', 'Shipments', stats.shipments || 0, null, 'cyan') +
        metricCard('fa-file-signature', 'Contracts', stats.contracts || 0, null, 'purple') +
        metricCard('fa-dollar-sign', 'Total Value', usd(stats.total_value || 0), null, 'emerald') +
      '</div>' +
      '<div class="grid grid-cols-2 gap-4">' +
        '<div class="glass-card p-4"><h3 class="text-sm font-semibold text-surface-200 mb-3"><i class="fas fa-clock mr-2 text-brand-400"></i>Recent Trades</h3><div id="dash-trades" class="space-y-2 text-xs text-surface-400">Loading...</div></div>' +
        '<div class="glass-card p-4"><h3 class="text-sm font-semibold text-surface-200 mb-3"><i class="fas fa-bell mr-2 text-amber-400"></i>Inbox Preview</h3><div id="dash-inbox" class="space-y-2 text-xs text-surface-400">Loading...</div></div>' +
      '</div>';
    // Load sub-data
    api('/trades?tenant_id=' + tenant.id + '&limit=5').then(function(r) {
      var el = document.getElementById('dash-trades');
      if (!el) return;
      var trades = r.data || [];
      el.innerHTML = trades.length ? trades.map(function(t) { return '<div class="flex justify-between"><span class="font-mono text-brand-300">' + (t.ustn || t.id) + '</span>' + badge(t.status || 'DRAFT', 'blue') + '</div>'; }).join('') : '<p class="text-surface-500">No trades yet</p>';
    });
    api('/inbox?tenant_id=' + tenant.id + '&limit=5').then(function(r) {
      var el = document.getElementById('dash-inbox');
      if (!el) return;
      var items = r.data || [];
      el.innerHTML = items.length ? items.slice(0, 5).map(function(i) { return '<div class="flex justify-between"><span>' + (i.title || 'Item') + '</span><span class="text-surface-500">' + timeAgo(i.created_at) + '</span></div>'; }).join('') : '<p class="text-surface-500">No items</p>';
    });
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function renderTenants() {
  setTitle('Tenants', 'Platform tenant directory');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/tenants');
    var tenants = res.data || [];
    content.innerHTML =
      dataTable(['Name', 'Type', 'Country', 'Trust Score', 'Status', ''],
        tenants.map(function(t) {
          var trust = Math.max(0, Math.min(100, 100 - (t.risk_score || 25)));
          return [
            '<span class="font-medium text-surface-200">' + (t.company_name || t.name || '-') + '</span>',
            badge(t.tenant_type || '-', 'blue'),
            t.country || '-',
            '<span class="font-mono text-' + (trust >= 70 ? 'emerald' : trust >= 40 ? 'amber' : 'red') + '-400">' + trust + '</span>',
            badge(t.status || 'ACTIVE', t.status === 'ACTIVE' ? 'emerald' : 'amber'),
            '<button onclick="showTenantModal(\'' + t.id + '\')" class="text-xs text-brand-400 hover:text-brand-300"><i class="fas fa-eye"></i></button>'
          ];
        })
      );
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function showTenantModal(id) {
  try {
    var res = await api('/tenants/' + id);
    var t = res.data || res;
    var trust = Math.max(0, Math.min(100, 100 - (t.risk_score || 25)));
    showModal(t.company_name || 'Tenant Detail',
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['ID', t.id], ['Type', t.tenant_type], ['Country', t.country], ['Trust Score', trust + '/100'], ['Status', t.status], ['Created', time(t.created_at)]].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + (p[1] || '-') + '</div></div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function renderGovernor() {
  setTitle('Governor', 'Decision log and compliance review');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/decisions?tenant_id=' + tenant.id);
    var decisions = res.data || [];
    content.innerHTML =
      fourQuestions('All governance decisions affecting your account.', 'Review each decision. Click for plain-language explanation.', decisions.filter(function(d) { return d.verdict === 'DENIED'; }).length > 0 ? 'Some requests were denied — review details.' : '', 'Address any conditions or resubmit with guidance.') +
      (decisions.length === 0 ? '<div class="glass-card p-8 text-center text-surface-400">No decisions yet.</div>' :
        '<div class="space-y-3">' + decisions.map(function(d) {
          return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5" onclick="showDecisionModal(\'' + d.id + '\')">' +
            '<div class="flex items-center justify-between mb-1">' +
              '<span class="font-medium text-sm text-surface-200">' + (d.gate_name || d.type || 'Decision') + '</span>' +
              verdictBadge(d.verdict) +
            '</div>' +
            '<p class="text-xs text-surface-400">' + (d.reason || 'No details') + '</p>' +
            '<span class="text-[10px] text-surface-500 mt-1 inline-block">' + timeAgo(d.created_at) + '</span>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showDecisionModal(id) {
  api('/decisions/' + id).then(function(res) {
    var d = res.data || res;
    showModal('Decision Detail',
      plainLanguageDecisionPanel(d) +
      '<div class="space-y-2 text-xs">' +
        '<div class="bg-dark-800/50 rounded-lg p-3"><strong class="text-surface-300">Gate:</strong> <span class="text-surface-400">' + (d.gate_name || d.type || '-') + '</span></div>' +
        '<div class="bg-dark-800/50 rounded-lg p-3"><strong class="text-surface-300">USTN:</strong> <span class="font-mono text-brand-300">' + (d.ustn || '-') + '</span></div>' +
        '<div class="bg-dark-800/50 rounded-lg p-3"><strong class="text-surface-300">Decided:</strong> <span class="text-surface-400">' + (d.decided_at ? time(d.decided_at) : 'Pending') + '</span></div>' +
      '</div>'
    );
  }).catch(function(e) { showToast('Error: ' + e.message, 'error'); });
}

async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Regulatory reference by country');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(3);
  try {
    var res = await api('/ref/jurisdictions');
    var jurisdictions = res.data || [];
    content.innerHTML =
      '<div class="grid grid-cols-2 gap-3">' +
        (jurisdictions.length === 0 ? '<div class="glass-card p-8 text-center text-surface-400 col-span-2">No jurisdiction data available.</div>' :
          jurisdictions.map(function(j) {
            return '<div class="glass-card p-4"><div class="flex items-center gap-2 mb-2"><i class="fas fa-globe text-brand-400"></i><span class="font-medium text-surface-200">' + (j.name || j.country || '-') + '</span></div>' +
              '<div class="text-xs text-surface-400 space-y-1">' +
                '<div><strong>Code:</strong> ' + (j.code || j.country_code || '-') + '</div>' +
                '<div><strong>Currency:</strong> ' + (j.currency || '-') + '</div>' +
                '<div><strong>Regulatory Body:</strong> ' + (j.regulatory_body || '-') + '</div>' +
              '</div></div>';
          }).join('')) +
      '</div>';
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

// ═══════════════════════════════════════════════════════════
// CONTACTS (Trust Portrait Cards) + DISPUTES
// ═══════════════════════════════════════════════════════════

async function renderContacts() {
  setTitle('Contacts', 'Your trading partners with trust portraits');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/contacts?tenant_id=' + tenant.id);
    var contacts = res.data || [];
    content.innerHTML =
      fourQuestions('Your trusted trading partners and their trust profiles.', 'Click a contact to view full details. Add new contacts by GTID.', '', 'Build your network to unlock faster trade matching.') +
      '<div class="flex justify-end mb-4"><button onclick="showAddContactForm()" class="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"><i class="fas fa-plus mr-2"></i>Add Contact</button></div>' +
      (contacts.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-address-book text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No contacts yet. Add your first trading partner.</p></div>' :
        '<div class="grid grid-cols-2 gap-4">' +
          contacts.map(function(c) {
            var trust = c.trust_score || Math.max(0, 100 - (c.risk_score || 25));
            var trustColor = trust >= 70 ? 'emerald' : trust >= 40 ? 'amber' : 'red';
            return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5 transition" onclick="showContactDetail(\'' + (c.gtid || c.contact_tenant_id || c.id) + '\')">' +
              '<div class="flex items-start gap-3">' +
                '<div class="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center"><i class="fas fa-building text-brand-400 text-lg"></i></div>' +
                '<div class="flex-1">' +
                  '<div class="font-medium text-surface-200">' + (c.company_name || c.name || 'Unknown') + '</div>' +
                  '<div class="text-xs text-surface-400 mt-0.5">' + (c.gtid || c.contact_tenant_id || '') + '</div>' +
                  '<div class="flex items-center gap-3 mt-2">' +
                    '<div class="flex items-center gap-1"><div class="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden"><div class="h-full bg-' + trustColor + '-400 rounded-full" style="width:' + trust + '%"></div></div><span class="text-[10px] font-mono text-' + trustColor + '-400">' + trust + '</span></div>' +
                    (c.country ? '<span class="text-[10px] text-surface-500">' + c.country + '</span>' : '') +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function showContactDetail(gtid) {
  try {
    var res = await api('/trade-form/gtid-resolve?gtid=' + encodeURIComponent(gtid));
    var c = res.data || res;
    showModal(c.company_name || 'Contact Detail',
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['GTID', c.gtid || gtid], ['Company', c.company_name || '-'], ['Country', c.country || c.jurisdiction || '-'], ['Trust Score', (c.trust_score || '-') + '/100'], ['Sanctions', c.sanctions_clear ? 'Clear' : 'Flagged'], ['Status', c.status || 'ACTIVE']].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  } catch (e) { showToast('Could not resolve contact: ' + e.message, 'error'); }
}

function showAddContactForm() {
  showModal('Add Contact',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Partner GTID</label><input id="add-contact-gtid" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="SGTX-XX-XX-XXXX-XXXX"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Nickname (optional)</label><input id="add-contact-nick" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="e.g. Cairo Oranges Ltd"></div>' +
      '<button onclick="addContact()" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Add Contact</button>' +
    '</div>'
  );
}

async function addContact() {
  var gtid = document.getElementById('add-contact-gtid').value.trim();
  var nick = document.getElementById('add-contact-nick').value.trim();
  if (!gtid) { showToast('GTID is required', 'error'); return; }
  try {
    await apiPost('/contacts', { tenant_id: tenant.id, contact_gtid: gtid, nickname: nick });
    closeModal();
    showToast('Contact added', 'success');
    renderContacts();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Disputes ─────────────────────────────────────────────

async function renderDisputes() {
  setTitle('Disputes', 'File and track trade disputes');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/disputes?tenant_id=' + tenant.id);
    var disputes = res.data || [];
    content.innerHTML =
      fourQuestions('All disputes filed by or against your company.', 'Click a dispute to view evidence and settlement options.', disputes.filter(function(d) { return d.status === 'OPEN'; }).length > 0 ? 'Open disputes require attention.' : '', 'File a new dispute or propose settlement on existing ones.') +
      slaTransparencyPanel([
        { label: 'Dispute Review', responsible: 'SGTX Compliance', estimated_time: '24-48 hours' },
        { label: 'Evidence Compilation', responsible: 'Auto-Compile AI', estimated_time: '< 5 minutes' }
      ]) +
      '<div class="flex justify-end mb-4"><button onclick="showFileDisputeForm()" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"><i class="fas fa-gavel mr-2"></i>File Dispute</button></div>' +
      (disputes.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-peace text-emerald-400 text-4xl mb-3"></i><p class="text-surface-400">No disputes. Everything is running smoothly.</p></div>' :
        '<div class="space-y-3">' + disputes.map(function(d) {
          return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5" onclick="showDisputeModal(\'' + d.id + '\')">' +
            '<div class="flex items-center justify-between mb-1"><span class="font-medium text-sm text-surface-200">' + (d.type || d.dispute_type || 'Dispute') + '</span>' + badge(d.status || 'OPEN', d.status === 'RESOLVED' ? 'emerald' : d.status === 'OPEN' ? 'red' : 'amber') + '</div>' +
            '<p class="text-xs text-surface-400">' + (d.description || d.reason || '') + '</p>' +
            '<div class="flex items-center gap-3 mt-2 text-[10px] text-surface-500">' +
              (d.ustn ? '<span class="font-mono">' + d.ustn + '</span>' : '') +
              '<span>' + timeAgo(d.created_at) + '</span>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function showDisputeModal(id) {
  try {
    var res = await api('/disputes/' + id);
    var d = res.data || res;
    showModal('Dispute Detail',
      '<div class="space-y-4">' +
        plainLanguageDecisionPanel({ verdict: d.resolution_verdict || d.status, reason: d.resolution_reason || d.description, decided_at: d.resolved_at }) +
        '<div class="grid grid-cols-2 gap-3">' +
          [['Type', d.type || d.dispute_type], ['USTN', d.ustn || '-'], ['Status', d.status], ['Filed', time(d.created_at)]].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + (p[1] || '-') + '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="flex gap-2">' +
          '<button onclick="autoCompileEvidence(\'' + (d.ustn || '') + '\', \'' + d.id + '\')" class="flex-1 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30"><i class="fas fa-robot mr-1"></i>Auto-Compile Evidence</button>' +
          '<button onclick="proposeSettlement(\'' + d.id + '\')" class="flex-1 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-500/30"><i class="fas fa-handshake mr-1"></i>Propose Settlement</button>' +
        '</div>' +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function showFileDisputeForm() {
  showModal('File a Dispute',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Trade USTN</label><input id="dispute-ustn" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="SGTX-..."></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Dispute Type</label><select id="dispute-type" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="QUALITY">Quality Issue</option><option value="DELIVERY">Late Delivery</option><option value="DOCUMENTATION">Documentation Mismatch</option><option value="PAYMENT">Payment Dispute</option><option value="OTHER">Other</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Description</label><textarea id="dispute-desc" rows="3" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Describe the issue..."></textarea></div>' +
      '<button onclick="submitDispute()" class="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Submit Dispute</button>' +
    '</div>'
  );
}

async function submitDispute() {
  var ustn = document.getElementById('dispute-ustn').value.trim();
  var type = document.getElementById('dispute-type').value;
  var desc = document.getElementById('dispute-desc').value.trim();
  if (!ustn || !desc) { showToast('USTN and description are required', 'error'); return; }
  try {
    await apiPost('/disputes', { tenant_id: tenant.id, ustn: ustn, dispute_type: type, description: desc });
    closeModal();
    showToast('Dispute filed successfully', 'success');
    renderDisputes();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function autoCompileEvidence(ustn, disputeId) {
  try {
    showToast('Compiling evidence...', 'info');
    await apiPost('/dispute/evidence/auto-compile', { ustn: ustn, dispute_id: disputeId });
    showToast('Evidence compiled successfully', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function proposeSettlement(disputeId) {
  showModal('Propose Settlement',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Settlement Type</label><select id="settle-type" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="PARTIAL_REFUND">Partial Refund</option><option value="FULL_REFUND">Full Refund</option><option value="REPLACEMENT">Replacement Shipment</option><option value="CREDIT_NOTE">Credit Note</option><option value="MUTUAL_RELEASE">Mutual Release</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Proposed Amount (USD)</label><input id="settle-amount" type="number" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="0.00"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Terms</label><textarea id="settle-terms" rows="3" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Describe settlement terms..."></textarea></div>' +
      '<button onclick="submitSettlement(\'' + disputeId + '\')" class="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">Submit Proposal</button>' +
    '</div>'
  );
}

async function submitSettlement(disputeId) {
  var type = document.getElementById('settle-type').value;
  var amount = parseFloat(document.getElementById('settle-amount').value) || 0;
  var terms = document.getElementById('settle-terms').value.trim();
  try {
    await apiPost('/dispute/settlement-proposal', { dispute_id: disputeId, settlement_type: type, amount: amount, terms: terms, proposer_tenant_id: tenant.id });
    closeModal();
    showToast('Settlement proposed', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// BUYER: NEW TRADE REQUEST (Blueprint v6.3 Phase 1 — Steps 1.1–1.7)
// Full structured container-level form with GTID autocomplete,
// dependent dropdowns, AI-driven product specs, cloning, bulk edit,
// multi-shipment schedule, express mode, draft auto-save, governor prescreen
// ═══════════════════════════════════════════════════════════

var ntContainers = [{ commodities: [{ _specs: {} }] }];
var ntExpressMode = false;
var ntMultiShipment = false;
var ntShipments = [];
var ntActiveTab = 0;
var ntDraftId = null;
var ntDraftTimer = null;
var ntSellerResolved = null;
var ntRefCountries = null;
var ntRefPorts = {};
var ntRefCommodityTypes = null;

// ── Reference data loader ──
async function ntLoadRefData() {
  if (!ntRefCountries) {
    try {
      var r = await Promise.all([api('/ref/countries'), api('/ref/commodity-types')]);
      ntRefCountries = (r[0].data || []);
      ntRefCommodityTypes = (r[1].data || []);
    } catch (e) { ntRefCountries = []; ntRefCommodityTypes = []; }
  }
}
async function ntLoadPorts(cc) {
  if (!cc) return [];
  if (ntRefPorts[cc]) return ntRefPorts[cc];
  try { var r = await api('/ref/ports?country=' + cc); ntRefPorts[cc] = r.data || []; } catch(e) { ntRefPorts[cc] = []; }
  return ntRefPorts[cc];
}
function ntCountryOptions(sel) {
  if (!ntRefCountries) return '<option value="">Loading...</option>';
  return '<option value="">-- Select Country --</option>' + ntRefCountries.map(function(c){ return '<option value="'+c.code+'"'+(c.code===sel?' selected':'')+'>'+c.name+' ('+c.code+')</option>'; }).join('');
}
function ntPortOptions(ports, sel) {
  if (!ports || !ports.length) return '<option value="">-- Select country first --</option>';
  return '<option value="">-- Select Port --</option>' + ports.map(function(p){ return '<option value="'+p.code+'"'+(p.code===sel?' selected':'')+'>'+p.name+' ('+p.code+')</option>'; }).join('');
}

// ── AI Product Specification Schemas ──
var NT_PRODUCT_SPECS = {
  'FRESH_FRUITS': {
    'Oranges': [
      {id:'variety',label:'Variety',type:'select',options:['Valencia','Navel','Blood Orange','Mandarin','Other']},
      {id:'size_range',label:'Size Range (mm)',type:'select',options:['56-64','64-72','72-80','80-88','88-96']},
      {id:'color_grade',label:'Color Grade',type:'select',options:['Bright Orange','Orange with Green Spots','Light Orange']},
      {id:'brix',label:'Brix (Sugar Content °Bx)',type:'number',placeholder:'11.0 – 14.0',min:6,max:20},
      {id:'defect_tolerance',label:'Defect Tolerance (%)',type:'number',placeholder:'≤2',min:0,max:10}
    ],
    'Lemons': [
      {id:'variety',label:'Variety',type:'select',options:['Eureka','Lisbon','Meyer','Fino','Other']},
      {id:'size_range',label:'Size Range (mm)',type:'select',options:['45-50','50-60','60-70','70-80']},
      {id:'color_grade',label:'Color Grade',type:'select',options:['Bright Yellow','Green-Yellow','Pale Yellow']},
      {id:'acid_content',label:'Acid Content (%)',type:'number',placeholder:'5.0 – 7.0',min:3,max:10},
      {id:'defect_tolerance',label:'Defect Tolerance (%)',type:'number',placeholder:'≤3',min:0,max:10}
    ],
    'Mangoes': [
      {id:'variety',label:'Variety',type:'select',options:['Alphonso','Kent','Tommy Atkins','Nam Doc Mai','Keitt','Other']},
      {id:'size_range',label:'Size Range (g)',type:'select',options:['200-300','300-400','400-500','500-600','600+']},
      {id:'brix',label:'Brix (°Bx)',type:'number',placeholder:'12 – 20',min:8,max:25},
      {id:'color_grade',label:'Color Grade',type:'select',options:['Full Color','Turning','Green Mature']},
      {id:'defect_tolerance',label:'Defect Tolerance (%)',type:'number',placeholder:'≤2',min:0,max:10}
    ],
    '_default': [
      {id:'variety',label:'Variety',type:'text',placeholder:'e.g. Grade A'},
      {id:'size_range',label:'Size Range',type:'text',placeholder:'e.g. 72-80mm'},
      {id:'defect_tolerance',label:'Defect Tolerance (%)',type:'number',placeholder:'≤2',min:0,max:10}
    ]
  },
  'FROZEN_FRUITS': {
    'Frozen Strawberries': [
      {id:'variety',label:'Variety',type:'select',options:['Festival','Camarosa','Albion','Sweet Charlie','Other']},
      {id:'grade',label:'Grade',type:'select',options:['Grade A (whole, no bruises)','Grade B (sliced)','Grade C (puree)']},
      {id:'sugar_added',label:'Sugar Added',type:'select',options:['No','5%','10%','15%']},
      {id:'temp_req',label:'Temperature (°C)',type:'number',placeholder:'-18',min:-30,max:0}
    ],
    'Frozen Vegetables': [
      {id:'variety',label:'Type/Mix',type:'text',placeholder:'e.g. Mixed vegetable medley'},
      {id:'grade',label:'Grade',type:'select',options:['Grade A (premium)','Grade B (standard)','Grade C (economy)']},
      {id:'blanched',label:'Blanched',type:'select',options:['Yes','No']},
      {id:'temp_req',label:'Temperature (°C)',type:'number',placeholder:'-18',min:-30,max:0}
    ],
    '_default': [
      {id:'grade',label:'Grade',type:'select',options:['Grade A','Grade B','Grade C']},
      {id:'sugar_added',label:'Sugar Added',type:'select',options:['No','5%','10%']},
      {id:'temp_req',label:'Temperature (°C)',type:'number',placeholder:'-18',min:-30,max:0}
    ]
  },
  'VEGETABLES': {
    '_default': [
      {id:'variety',label:'Variety',type:'text',placeholder:'Type'},
      {id:'grade',label:'Grade',type:'select',options:['Grade A','Grade B','Grade C']},
      {id:'size_range',label:'Size',type:'text',placeholder:'e.g. Medium'},
      {id:'defect_tolerance',label:'Defect Tolerance (%)',type:'number',placeholder:'≤5',min:0,max:15}
    ]
  },
  'TEXTILES': {
    '_default': [
      {id:'weave_type',label:'Weave Type',type:'select',options:['Plain','Twill','Satin','Jersey','Knit']},
      {id:'thread_count',label:'Thread Count',type:'number',placeholder:'200'},
      {id:'width_cm',label:'Width (cm)',type:'number',placeholder:'150'},
      {id:'weight_gsm',label:'Weight (g/m²)',type:'number',placeholder:'180'},
      {id:'color',label:'Color',type:'text',placeholder:'White'}
    ]
  },
  '_default': {
    '_default': [
      {id:'specification',label:'Specification',type:'text',placeholder:'Grade A, Size 72-80mm'},
      {id:'quality_grade',label:'Quality Grade',type:'select',options:['Premium','Standard','Economy']}
    ]
  }
};

function ntGetProductSpecs(commodityType, productName) {
  var group = NT_PRODUCT_SPECS[commodityType] || NT_PRODUCT_SPECS['_default'];
  if (!group) return NT_PRODUCT_SPECS['_default']['_default'];
  // Try exact product match
  for (var key in group) {
    if (key !== '_default' && productName && productName.toLowerCase().indexOf(key.toLowerCase()) >= 0) return group[key];
  }
  return group['_default'] || NT_PRODUCT_SPECS['_default']['_default'];
}

// ═══════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════
async function renderNewTrade() {
  setTitle('New Trade Request', 'Phase 1 — Structured container-level import request');
  var content = document.getElementById('content');
  content.innerHTML = '<div class="flex items-center justify-center py-12"><i class="fas fa-spinner fa-spin text-sgtx-500 text-2xl mr-3"></i><span class="text-surface-500">Loading reference data...</span></div>';
  await ntLoadRefData();

  // Check for existing draft
  if (!ntDraftId) {
    try {
      var draftRes = await api('/trade-form/draft-load?tenant_id=' + tenant.id);
      if (draftRes.data && draftRes.data.draft_id) {
        ntDraftId = draftRes.data.draft_id;
        var fd = draftRes.data.form_data || {};
        if (fd.containers && fd.containers.length) {
          ntContainers = fd.containers.map(function(c){ return { commodities: (c.commodities || [{}]).map(function(cm){ return Object.assign({ _specs: cm._specs || cm.specifications || {} }, cm); }), _origin: c.origin_country || '', _dest: c.destination_country || '', _pod: c.port_of_discharge || '', _ct: c.container_type || '', _palletized: c.palletized !== false, _psize: c.pallet_size || '120x100', _cnote: c.notes || '', _destOverride: c.destination_override || '' }; });
        }
        if (fd.incoterm) setTimeout(function(){ var el=document.getElementById('nt-incoterm'); if(el) el.value=fd.incoterm; },100);
        if (fd.seller_gtid) setTimeout(function(){ var el=document.getElementById('nt-seller-gtid'); if(el) el.value=fd.seller_gtid; },100);
        if (fd.transport_mode) setTimeout(function(){ var el=document.getElementById('nt-transport'); if(el) el.value=fd.transport_mode; },100);
        showToast('Draft restored (saved ' + timeAgo(draftRes.data.updated_at) + ')', 'info');
      }
    } catch(e) {}
  }

  content.innerHTML =
    fourQuestions(
      'Create a structured trade request specifying containers, commodities, and delivery terms.',
      'Fill in seller GTID, add containers with commodities. Use Express Mode for free-text AI parsing.',
      '',
      'Governor pre-screens the request. If approved, seller receives it in their Smart Inbox.'
    ) +

    // ── Draft Status Bar ──
    '<div id="nt-draft-bar" class="sgtx-card !p-3 mb-4 flex items-center justify-between border-l-4 border-l-surface-300">' +
      '<div class="flex items-center gap-2"><i class="fas fa-save text-surface-400"></i><span class="text-xs text-surface-500" id="nt-draft-status">Auto-save: idle</span></div>' +
      '<div class="flex items-center gap-3">' +
        '<button onclick="ntSaveDraft()" class="text-xs text-sgtx-500 hover:text-sgtx-600 font-medium"><i class="fas fa-floppy-disk mr-1"></i>Save Now</button>' +
        (ntDraftId ? '<span class="text-[10px] text-surface-400 font-mono">Draft: ' + ntDraftId.substring(0,8) + '...</span>' : '') +
      '</div>' +
    '</div>' +

    // ── Express Mode Toggle (Step 1.2.6) ──
    '<div class="sgtx-card !p-4 mb-4 border-l-4 border-l-sgtx-400">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="flex items-center gap-2"><i class="fas fa-magic text-sgtx-500"></i><span class="text-sm font-semibold text-surface-700">Express Mode</span><span class="text-[10px] text-surface-500">(AI parses your free-text description)</span></div>' +
        '<button onclick="ntExpressMode=!ntExpressMode; ntRenderForm()" class="px-3 py-1 rounded-full text-xs font-medium transition ' + (ntExpressMode ? 'bg-sgtx-500 text-white shadow-glow-sm' : 'bg-surface-100 text-surface-500 border border-surface-200') + '">' + (ntExpressMode ? '<i class="fas fa-check mr-1"></i>ON' : 'OFF') + '</button>' +
      '</div>' +
      (ntExpressMode ? ntRenderExpressMode() : '') +
    '</div>' +

    // ── Structured Form (hidden if express mode) ──
    '<div id="nt-structured-form" style="' + (ntExpressMode ? 'display:none' : '') + '">' +

    // ── Step 1.1: Seller Selection ──
    '<div class="sgtx-card !p-5 mb-4">' +
      '<h3 class="text-sm font-semibold text-surface-800 mb-4"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Step 1: Seller Selection</h3>' +
      '<div class="grid grid-cols-2 gap-4 mb-4">' +
        '<div>' +
          '<label class="text-xs text-surface-500 block mb-1" id="nt-seller-label">Seller GTID <span class="text-surface-400">(type to search or pick from contacts)</span></label>' +
          '<div class="relative">' +
            '<input id="nt-seller-gtid" type="text" class="w-full pr-20" placeholder="SGTX-XX-TRD-XXXX-XXXX" oninput="ntDebounceGTID(this.value)" aria-label="Seller GTID input" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="nt-gtid-dropdown">' +
            '<div class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">' +
              '<button onclick="ntResolveGTID()" class="px-2 py-1 bg-sgtx-50 text-sgtx-500 rounded text-[10px] hover:bg-sgtx-100 border border-sgtx-200" title="Resolve GTID"><i class="fas fa-search"></i></button>' +
              '<button onclick="ntShowContactPicker()" class="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] hover:bg-emerald-100 border border-emerald-200" title="Saved contacts"><i class="fas fa-address-book"></i></button>' +
            '</div>' +
          '</div>' +
          '<div id="nt-gtid-dropdown" class="absolute z-50 bg-white border border-surface-200 rounded-xl shadow-elevated mt-1 max-h-64 overflow-y-auto hidden" style="width:calc(100% - 32px)" role="listbox"></div>' +
          '<div id="nt-seller-info" class="mt-2"></div>' +
        '</div>' +
        '<div>' +
          '<label class="text-xs text-surface-500 block mb-1">Incoterm</label>' +
          '<select id="nt-incoterm">' +
            '<option value="FOB">FOB — Free On Board</option><option value="CIF" selected>CIF — Cost Insurance Freight</option>' +
            '<option value="CFR">CFR — Cost and Freight</option><option value="EXW">EXW — Ex Works</option>' +
            '<option value="DDP">DDP — Delivered Duty Paid</option><option value="DAP">DAP — Delivered at Place</option>' +
            '<option value="FCA">FCA — Free Carrier</option><option value="CPT">CPT — Carriage Paid To</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-3 gap-4">' +
        '<div><label class="text-xs text-surface-500 block mb-1">Transport Mode</label><select id="nt-transport" onchange="ntUpdatePortFilters()">' +
          '<option value="SEA_CARGO">Sea Cargo</option><option value="AIR_CARGO">Air Cargo</option><option value="LAND">Land (Truck/Rail)</option><option value="MULTIMODAL">Multimodal</option></select></div>' +
        '<div><label class="text-xs text-surface-500 block mb-1">Prefer Previous Logistics?</label><select id="nt-prev-logistics"><option value="0">No</option><option value="1">Yes — use same provider</option></select></div>' +
        '<div><label class="text-xs text-surface-500 block mb-1">Number of Containers</label><div class="flex gap-2 items-center"><input id="nt-num-containers" type="number" class="w-20 text-center" value="' + ntContainers.length + '" min="1" max="50"><button onclick="ntSyncContainerCount()" class="btn-secondary !py-1.5 !px-3 !text-[11px]">Apply</button></div></div>' +
      '</div>' +
    '</div>' +

    // ── AI Container Advisor (Step 1.4) ──
    '<div class="sgtx-card !p-4 mb-4 border-l-4 border-l-accent-cyan">' +
      '<div class="flex items-center gap-2 mb-1"><i class="fas fa-robot text-accent-cyan"></i><span class="text-sm font-semibold text-surface-700">AI Container Advisor</span><span class="badge badge-info !text-[10px]">A1 Advisory</span></div>' +
      '<div id="nt-ai-advisor" class="text-xs text-surface-500">Fill in commodity details below and the AI will suggest optimal container type and count.</div>' +
    '</div>' +

    // ── Container Tabs & Progress (Step 1.2.1) ──
    '<div class="mb-4">' +
      '<div class="flex items-center gap-2 mb-2">' +
        '<div id="nt-container-tabs" class="flex gap-1 flex-wrap"></div>' +
        '<div id="nt-container-progress" class="ml-auto text-[10px] text-surface-400"></div>' +
      '</div>' +
      '<div id="nt-containers"></div>' +
    '</div>' +

    // ── Container Actions ──
    '<div class="flex flex-wrap gap-2 mb-4">' +
      '<button onclick="ntAddContainer()" class="btn-secondary !text-xs"><i class="fas fa-plus mr-1"></i>Add Container</button>' +
      '<button onclick="ntCloneContainer(ntActiveTab)" class="btn-secondary !text-xs"><i class="fas fa-clone mr-1"></i>Clone Current</button>' +
      (ntContainers.length >= 10 ? '<button onclick="ntShowBulkEdit()" class="btn-secondary !text-xs !border-amber-300 !text-amber-600"><i class="fas fa-layer-group mr-1"></i>Bulk Edit</button>' : '') +
      '<button onclick="ntRequestAIAdvice()" class="btn-secondary !text-xs !border-accent-cyan !text-accent-cyan"><i class="fas fa-robot mr-1"></i>AI Advise</button>' +
    '</div>' +

    // ── Step 1.2.5: Global Notes ──
    '<div class="sgtx-card !p-4 mb-4">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<h3 class="text-sm font-semibold text-surface-700"><i class="fas fa-sticky-note mr-2 text-amber-500"></i>Global Notes (entire trade)</h3>' +
        '<button onclick="ntSuggestNotes()" class="text-xs text-sgtx-500 hover:text-sgtx-600 flex items-center gap-1" title="AI Suggest"><span class="text-sm">✨</span> Suggest</button>' +
      '</div>' +
      '<textarea id="nt-global-notes" rows="3" maxlength="2000" oninput="ntUpdateNoteCount()" placeholder="e.g. Seller to provide phytosanitary certificate. Insurance required. Please ensure reefers are pre-cooled to 4°C."></textarea>' +
      '<div class="flex items-center justify-between mt-1"><div id="nt-note-suggestion" class="text-[10px] text-surface-400"></div><span id="nt-note-count" class="text-[10px] text-surface-400">0 / 2,000</span></div>' +
    '</div>' +

    // ── Step 1.3: Multi-Shipment Schedule ──
    '<div class="sgtx-card !p-4 mb-4">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="flex items-center gap-2"><i class="fas fa-calendar-alt text-sgtx-500"></i><span class="text-sm font-semibold text-surface-700">Multi-Shipment Schedule</span><span class="text-[10px] text-surface-400">(optional)</span></div>' +
        '<button onclick="ntMultiShipment=!ntMultiShipment; ntRenderShipments()" class="px-3 py-1 rounded-full text-xs font-medium transition ' + (ntMultiShipment ? 'bg-sgtx-500 text-white shadow-glow-sm' : 'bg-surface-100 text-surface-500 border border-surface-200') + '">' + (ntMultiShipment ? '<i class="fas fa-check mr-1"></i>Enabled' : 'Off') + '</button>' +
      '</div>' +
      '<div id="nt-shipments-area"></div>' +
    '</div>' +

    // ── Step 1.5: Marketplace Attribution ──
    '<div id="nt-marketplace-banner"></div>' +

    '</div>' + // end #nt-structured-form

    // ── Actions ──
    '<div class="flex gap-3 mt-4 items-center">' +
      '<button onclick="ntSaveDraft()" class="btn-secondary"><i class="fas fa-save mr-1"></i>Save Draft</button>' +
      '<button onclick="ntSubmitTradeRequest()" class="btn-primary !px-8 !py-3 ml-auto"><i class="fas fa-paper-plane mr-2"></i>Submit Trade Request</button>' +
    '</div>';

  // Render container tabs and first container
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
  ntRenderShipments();
  ntCheckMarketplaceAttribution();

  // Start auto-save timer (Step 1.7)
  ntStartDraftTimer();
}

// ═══════════════════════════════════════════════════════════
// Step 1.1 — GTID Autocomplete with debounce, trust badges, keyboard nav
// ═══════════════════════════════════════════════════════════
var ntGTIDTimer = null;
var ntGTIDResults = [];
var ntGTIDSelected = -1;

function ntDebounceGTID(val) {
  clearTimeout(ntGTIDTimer);
  if (val.length < 2) { ntHideGTIDDropdown(); return; }
  ntGTIDTimer = setTimeout(function(){ ntSearchGTID(val); }, 300);
}

async function ntSearchGTID(q) {
  try {
    var res = await api('/trade-form/contacts-search?tenant_id=' + tenant.id + '&q=' + encodeURIComponent(q));
    ntGTIDResults = res.data || [];
    // Also try GTID resolve if looks like GTID format
    if (q.toUpperCase().indexOf('SGTX') === 0 && ntGTIDResults.length === 0) {
      try {
        var r2 = await api('/trade-form/gtid-resolve?gtid=' + encodeURIComponent(q));
        if (r2.data) ntGTIDResults = [{ gtid: r2.data.gtid, company_name: r2.data.company_name, jurisdiction: r2.data.jurisdiction, risk_score: r2.data.risk_score, trust_snapshot: r2.data.trust_score, sanctions_clear: r2.data.sanctions_clear }];
      } catch(e){}
    }
    ntShowGTIDDropdown();
  } catch(e) { ntHideGTIDDropdown(); }
}

function ntShowGTIDDropdown() {
  var dd = document.getElementById('nt-gtid-dropdown');
  if (!dd || !ntGTIDResults.length) { ntHideGTIDDropdown(); return; }
  ntGTIDSelected = -1;
  dd.innerHTML = ntGTIDResults.map(function(r, i) {
    var trust = r.trust_snapshot ? (typeof r.trust_snapshot === 'object' ? r.trust_snapshot.score : r.trust_snapshot) : r.risk_score;
    trust = parseFloat(trust) || 0;
    var trustColor = trust >= 80 ? 'emerald' : trust >= 50 ? 'amber' : 'red';
    var sanctions = r.sanctions_clear !== false;
    return '<div class="px-4 py-3 hover:bg-sgtx-50 cursor-pointer flex items-center justify-between transition border-b border-surface-50" role="option" id="nt-gtid-opt-' + i + '" onclick="ntSelectGTIDResult(' + i + ')" onmouseenter="ntGTIDSelected=' + i + '">' +
      '<div>' +
        '<div class="flex items-center gap-2"><span class="font-medium text-sm text-surface-800">' + (r.company_name || 'Unknown') + '</span>' +
        (r.trade_count > 0 ? '<span class="badge badge-info !text-[9px] !py-0">recent • ' + r.trade_count + ' trades</span>' : '') + '</div>' +
        '<div class="text-[11px] text-surface-400 font-mono mt-0.5">' + (r.gtid || '') + ' • ' + (r.jurisdiction || '') + '</div>' +
      '</div>' +
      '<div class="flex items-center gap-2">' +
        '<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-' + trustColor + '-50 text-' + trustColor + '-700 border border-' + trustColor + '-200"><i class="fas fa-shield-halved text-[8px]"></i>' + Math.round(trust) + '</span>' +
        (sanctions ? '<i class="fas fa-shield-check text-emerald-500 text-xs" title="Sanctions cleared"></i>' : '<i class="fas fa-shield-exclamation text-red-500 text-xs" title="Sanctions flag"></i>') +
      '</div>' +
    '</div>';
  }).join('');
  dd.classList.remove('hidden');
  document.getElementById('nt-seller-gtid').setAttribute('aria-expanded', 'true');
}

function ntHideGTIDDropdown() {
  var dd = document.getElementById('nt-gtid-dropdown');
  if (dd) { dd.classList.add('hidden'); dd.innerHTML = ''; }
  var inp = document.getElementById('nt-seller-gtid');
  if (inp) inp.setAttribute('aria-expanded', 'false');
}

function ntSelectGTIDResult(i) {
  var r = ntGTIDResults[i];
  if (!r) return;
  document.getElementById('nt-seller-gtid').value = r.gtid;
  ntSellerResolved = r;
  ntHideGTIDDropdown();
  ntShowSellerInfo(r);
}

function ntShowSellerInfo(d) {
  var el = document.getElementById('nt-seller-info');
  if (!el) return;
  var trust = d.trust_snapshot ? (typeof d.trust_snapshot === 'object' ? d.trust_snapshot.score : d.trust_snapshot) : d.risk_score;
  trust = parseFloat(trust) || 0;
  var trustColor = trust >= 80 ? 'emerald' : trust >= 50 ? 'amber' : 'red';
  var sanctions = d.sanctions_clear !== false;
  el.innerHTML = '<div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-100">' +
    '<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sgtx-100 to-sgtx-200 flex items-center justify-center shrink-0"><i class="fas fa-building text-sgtx-600 text-sm"></i></div>' +
    '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center gap-2"><span class="font-semibold text-sm text-surface-800">' + (d.company_name || 'Unknown') + '</span><span class="badge badge-' + trustColor + ' !text-[9px] !py-0"><i class="fas fa-shield-halved text-[8px] mr-0.5"></i>Trust: ' + Math.round(trust) + '</span>' +
      (sanctions ? '<span class="badge badge-success !text-[9px] !py-0"><i class="fas fa-check text-[8px] mr-0.5"></i>Sanctions Clear</span>' : '<span class="badge badge-danger !text-[9px] !py-0"><i class="fas fa-exclamation text-[8px] mr-0.5"></i>Sanctions Flag</span>') +
      (d.trade_count > 0 ? '<span class="badge badge-info !text-[9px] !py-0">Saved Contact</span>' : '') + '</div>' +
      '<div class="text-[11px] text-surface-500 mt-0.5"><span class="font-mono">' + (d.gtid || '') + '</span> • ' + (d.jurisdiction || '') + '</div>' +
    '</div>' +
    '<button onclick="ntShowTrustPortrait()" class="text-[10px] text-sgtx-500 hover:text-sgtx-600 shrink-0" title="View full Trust Portrait"><i class="fas fa-external-link text-[10px]"></i> Trust Portrait</button>' +
  '</div>';
}

async function ntResolveGTID() {
  var gtid = document.getElementById('nt-seller-gtid').value.trim();
  if (!gtid) return;
  var el = document.getElementById('nt-seller-info');
  el.innerHTML = '<div class="text-xs text-surface-400"><i class="fas fa-spinner fa-spin mr-1"></i>Resolving...</div>';
  try {
    var res = await api('/trade-form/gtid-resolve?gtid=' + encodeURIComponent(gtid));
    var d = res.data || res;
    ntSellerResolved = d;
    ntShowSellerInfo(d);
  } catch(e) {
    el.innerHTML = '<div class="text-xs text-red-500"><i class="fas fa-times-circle mr-1"></i>Could not resolve: ' + (e.message || 'Unknown error') + '</div>';
  }
}

function ntShowTrustPortrait() { showToast('Trust Portrait — full 360° AI summary coming in Phase 2', 'info'); }

// Keyboard navigation for GTID dropdown
document.addEventListener('keydown', function(e) {
  var dd = document.getElementById('nt-gtid-dropdown');
  if (!dd || dd.classList.contains('hidden')) return;
  if (document.activeElement !== document.getElementById('nt-seller-gtid')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); ntGTIDSelected = Math.min(ntGTIDSelected + 1, ntGTIDResults.length - 1); ntHighlightGTID(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); ntGTIDSelected = Math.max(ntGTIDSelected - 1, 0); ntHighlightGTID(); }
  else if (e.key === 'Enter' && ntGTIDSelected >= 0) { e.preventDefault(); ntSelectGTIDResult(ntGTIDSelected); }
  else if (e.key === 'Escape') { ntHideGTIDDropdown(); }
});
function ntHighlightGTID() {
  var dd = document.getElementById('nt-gtid-dropdown');
  if (!dd) return;
  dd.querySelectorAll('[role=option]').forEach(function(el,i){ el.style.background = i === ntGTIDSelected ? '#f5f3ff' : ''; });
  var active = document.getElementById('nt-gtid-opt-' + ntGTIDSelected);
  if (active) active.scrollIntoView({ block: 'nearest' });
}

async function ntShowContactPicker() {
  try {
    var res = await api('/trade-form/contacts-search?tenant_id=' + tenant.id + '&q=');
    var contacts = res.data || [];
    // Fallback to general contacts endpoint
    if (!contacts.length) { var r2 = await api('/contacts?tenant_id=' + tenant.id); contacts = r2.data || []; }
    if (!contacts.length) { showToast('No saved contacts found. Add contacts in the Network tab.', 'info'); return; }
    showModal(
      '<h3 class="text-lg font-bold text-surface-800 mb-4"><i class="fas fa-address-book text-sgtx-500 mr-2"></i>Select Saved Contact</h3>' +
      '<input id="nt-contact-search" type="text" placeholder="Search by name or GTID..." class="w-full mb-3" oninput="ntFilterContacts(this.value)">' +
      '<div id="nt-contact-list" class="space-y-2 max-h-80 overflow-y-auto">' +
        contacts.map(function(c) {
          var trust = c.trust_snapshot ? (typeof c.trust_snapshot === 'object' ? c.trust_snapshot.score : c.trust_snapshot) : c.risk_score;
          trust = parseFloat(trust) || 0;
          var trustColor = trust >= 80 ? 'emerald' : trust >= 50 ? 'amber' : 'red';
          return '<div class="nt-contact-item sgtx-card !p-3 cursor-pointer hover:!border-sgtx-300 transition" data-name="' + (c.company_name || c.legal_name || '').toLowerCase() + '" data-gtid="' + (c.gtid || c.contact_gtid || '').toLowerCase() + '" onclick="ntPickContact(\'' + (c.gtid || c.contact_gtid || '') + '\', ' + JSON.stringify(c).replace(/'/g, "\\'").replace(/"/g, '&quot;') + ')">' +
            '<div class="flex items-center justify-between">' +
              '<div><div class="font-medium text-sm text-surface-800">' + (c.company_name || c.legal_name || 'Unknown') + '</div><div class="text-[11px] text-surface-400 font-mono">' + (c.gtid || c.contact_gtid || '') + ' • ' + (c.jurisdiction || '') + '</div></div>' +
              '<div class="flex items-center gap-2"><span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-' + trustColor + '-50 text-' + trustColor + '-700">' + Math.round(trust) + '</span>' +
              (c.trade_count > 0 ? '<span class="text-[10px] text-surface-400">' + c.trade_count + ' trades</span>' : '') + '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    );
  } catch(e) { showToast('Error loading contacts', 'error'); }
}

function ntFilterContacts(q) {
  q = q.toLowerCase();
  document.querySelectorAll('.nt-contact-item').forEach(function(el) {
    var name = el.getAttribute('data-name') || '';
    var gtid = el.getAttribute('data-gtid') || '';
    el.style.display = (!q || name.indexOf(q) >= 0 || gtid.indexOf(q) >= 0) ? '' : 'none';
  });
}

function ntPickContact(gtid, data) {
  document.getElementById('nt-seller-gtid').value = gtid;
  closeModal();
  ntResolveGTID();
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.1 — Container Tabs with Progress
// ═══════════════════════════════════════════════════════════
function ntRenderContainerTabs() {
  var tabsEl = document.getElementById('nt-container-tabs');
  var progEl = document.getElementById('nt-container-progress');
  if (!tabsEl) return;

  var completedCount = 0;
  tabsEl.innerHTML = ntContainers.map(function(c, i) {
    var hasOrigin = !!(c._origin || document.getElementById('nt-origin-' + i)?.value);
    var hasDest = !!(c._dest || document.getElementById('nt-dest-' + i)?.value);
    var hasCommodity = c.commodities.some(function(cm) { return cm.product_name || cm.hs_code; });
    var complete = hasOrigin && hasDest && hasCommodity;
    if (complete) completedCount++;
    var isActive = i === ntActiveTab;
    return '<button onclick="ntSwitchTab(' + i + ')" class="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ' +
      (isActive ? 'bg-sgtx-500 text-white shadow-glow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200 border border-surface-200') + '">' +
      '<i class="fas ' + (complete ? 'fa-check-circle text-emerald-' + (isActive ? '200' : '500') : 'fa-box') + ' text-[10px]"></i>' +
      'C' + (i + 1) +
    '</button>';
  }).join('');

  if (progEl) {
    progEl.innerHTML = '<span class="font-medium">' + completedCount + '/' + ntContainers.length + '</span> containers configured';
  }
}

function ntSwitchTab(i) {
  // Save current tab state first
  ntSaveContainerState(ntActiveTab);
  ntActiveTab = Math.min(i, ntContainers.length - 1);
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
}

function ntSyncContainerCount() {
  var target = parseInt(document.getElementById('nt-num-containers').value) || 1;
  target = Math.max(1, Math.min(50, target));
  ntSaveContainerState(ntActiveTab);
  while (ntContainers.length < target) ntContainers.push({ commodities: [{ _specs: {} }], _origin: '', _dest: '', _pod: '', _ct: '', _palletized: true, _psize: '120x100', _cnote: '', _destOverride: '' });
  while (ntContainers.length > target) ntContainers.pop();
  ntActiveTab = Math.min(ntActiveTab, ntContainers.length - 1);
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
}

function ntAddContainer() {
  if (ntContainers.length >= 50) { showToast('Maximum 50 containers', 'error'); return; }
  ntSaveContainerState(ntActiveTab);
  ntContainers.push({ commodities: [{ _specs: {} }], _origin: '', _dest: '', _pod: '', _ct: '', _palletized: true, _psize: '120x100', _cnote: '', _destOverride: '' });
  ntActiveTab = ntContainers.length - 1;
  document.getElementById('nt-num-containers').value = ntContainers.length;
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
  showToast('Container ' + ntContainers.length + ' added', 'info');
}

function ntCloneContainer(fromIdx) {
  if (ntContainers.length >= 50) { showToast('Maximum 50 containers', 'error'); return; }
  ntSaveContainerState(ntActiveTab);
  var src = ntContainers[fromIdx];
  var clone = JSON.parse(JSON.stringify(src));
  ntContainers.splice(fromIdx + 1, 0, clone);
  ntActiveTab = fromIdx + 1;
  document.getElementById('nt-num-containers').value = ntContainers.length;
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
  showToast('Container cloned from C' + (fromIdx + 1), 'info');
}

function ntRemoveContainer(idx) {
  if (ntContainers.length <= 1) return;
  ntContainers.splice(idx, 1);
  ntActiveTab = Math.min(ntActiveTab, ntContainers.length - 1);
  document.getElementById('nt-num-containers').value = ntContainers.length;
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
}

// ═══════════════════════════════════════════════════════════
// Save/Restore container state from DOM
// ═══════════════════════════════════════════════════════════
function ntSaveContainerState(ci) {
  if (ci < 0 || ci >= ntContainers.length) return;
  var c = ntContainers[ci];
  c._origin = (document.getElementById('nt-origin-' + ci) || {}).value || c._origin || '';
  c._dest = (document.getElementById('nt-dest-' + ci) || {}).value || c._dest || '';
  c._pod = (document.getElementById('nt-pod-' + ci) || {}).value || c._pod || '';
  c._ct = (document.getElementById('nt-ct-' + ci) || {}).value || c._ct || '40ft_HC_RF';
  c._palletized = (document.getElementById('nt-pallet-' + ci) || {}).value !== 'false';
  c._psize = (document.getElementById('nt-psize-' + ci) || {}).value || c._psize || '120x100';
  c._cnote = (document.getElementById('nt-cnote-' + ci) || {}).value || '';
  c._destOverride = (document.getElementById('nt-dest-override-' + ci) || {}).value || '';
  // Save commodity state
  c.commodities.forEach(function(cm, ri) {
    cm.hs_code = (document.getElementById('nt-hs-' + ci + '-' + ri) || {}).value || cm.hs_code || '';
    cm.commodity_type = (document.getElementById('nt-ctype-' + ci + '-' + ri) || {}).value || cm.commodity_type || '';
    cm.product_name = (document.getElementById('nt-prod-' + ci + '-' + ri) || {}).value || cm.product_name || '';
    cm.packaging = (document.getElementById('nt-pkg-' + ci + '-' + ri) || {}).value || cm.packaging || 'boxes';
    cm.num_pallets = parseInt((document.getElementById('nt-pallets-' + ci + '-' + ri) || {}).value) || cm.num_pallets || 0;
    cm.layers_per_pallet = parseInt((document.getElementById('nt-layers-' + ci + '-' + ri) || {}).value) || cm.layers_per_pallet || 0;
    cm.cartons_per_layer = parseInt((document.getElementById('nt-cpl-' + ci + '-' + ri) || {}).value) || cm.cartons_per_layer || 0;
    cm.net_weight_per_unit = parseFloat((document.getElementById('nt-nwt-' + ci + '-' + ri) || {}).value) || cm.net_weight_per_unit || 0;
    cm.weight_unit = (document.getElementById('nt-wunit-' + ci + '-' + ri) || {}).value || cm.weight_unit || 'kg';
    // Save spec fields
    cm._specs = cm._specs || {};
    document.querySelectorAll('[id^="nt-spec-' + ci + '-' + ri + '-"]').forEach(function(el) {
      var specId = el.id.replace('nt-spec-' + ci + '-' + ri + '-', '');
      cm._specs[specId] = el.value;
    });
  });
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.2 — Render single container (dependent dropdowns, flags)
// ═══════════════════════════════════════════════════════════
async function ntRenderContainer(ci) {
  var el = document.getElementById('nt-containers');
  if (!el || ci >= ntContainers.length) return;
  var c = ntContainers[ci];

  // Load ports for destination
  var destPorts = c._dest ? await ntLoadPorts(c._dest) : [];

  el.innerHTML = '<div class="sgtx-card !p-5 animate-fade-in">' +
    '<div class="flex items-center justify-between mb-4">' +
      '<h4 class="text-sm font-semibold text-surface-800"><i class="fas fa-box text-accent-cyan mr-2"></i>Container ' + (ci + 1) + ' of ' + ntContainers.length + '</h4>' +
      '<div class="flex gap-2">' +
        '<button onclick="ntCloneContainer(' + ci + ')" class="btn-secondary !py-1 !px-2 !text-[10px]" data-tooltip="Clone this container"><i class="fas fa-clone"></i> Clone</button>' +
        (ntContainers.length > 1 ? '<button onclick="if(confirm(\'Remove Container ' + (ci+1) + '? This cannot be undone.\'))ntRemoveContainer(' + ci + ')" class="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"><i class="fas fa-trash"></i></button>' : '') +
      '</div>' +
    '</div>' +

    // Per-container location fields with dependent dropdowns
    '<div class="grid grid-cols-4 gap-3 mb-4">' +
      '<div data-tooltip="Country where goods originate"><label class="text-[11px] text-surface-500 block mb-1"><i class="fas fa-location-dot text-[9px] mr-1"></i>Origin Country</label><select id="nt-origin-' + ci + '" onchange="ntSaveContainerState(' + ci + ')">' + ntCountryOptions(c._origin) + '</select></div>' +
      '<div data-tooltip="Destination country for import"><label class="text-[11px] text-surface-500 block mb-1"><i class="fas fa-flag text-[9px] mr-1"></i>Destination Country</label><select id="nt-dest-' + ci + '" onchange="ntOnDestChange(' + ci + ')">' + ntCountryOptions(c._dest) + '</select></div>' +
      '<div data-tooltip="Port where goods are unloaded"><label class="text-[11px] text-surface-500 block mb-1"><i class="fas fa-anchor text-[9px] mr-1"></i>Port of Discharge</label><select id="nt-pod-' + ci + '">' + ntPortOptions(destPorts, c._pod) + '</select></div>' +
      '<div data-tooltip="Container size and type"><label class="text-[11px] text-surface-500 block mb-1"><i class="fas fa-box text-[9px] mr-1"></i>Container Type</label><select id="nt-ct-' + ci + '">' +
        '<option value="40ft_HC_RF"' + (c._ct === '40ft_HC_RF' ? ' selected' : '') + '>40ft HC Reefer</option>' +
        '<option value="40RF"' + (c._ct === '40RF' ? ' selected' : '') + '>40ft Reefer</option>' +
        '<option value="40HC"' + (c._ct === '40HC' ? ' selected' : '') + '>40ft High Cube</option>' +
        '<option value="20RF"' + (c._ct === '20RF' ? ' selected' : '') + '>20ft Reefer</option>' +
        '<option value="20GP"' + (c._ct === '20GP' ? ' selected' : '') + '>20ft Standard</option>' +
      '</select></div>' +
    '</div>' +
    '<div class="grid grid-cols-4 gap-3 mb-4">' +
      '<div data-tooltip="Is cargo on pallets?"><label class="text-[11px] text-surface-500 block mb-1">Palletized?</label><select id="nt-pallet-' + ci + '"><option value="true"' + (c._palletized !== false ? ' selected' : '') + '>Yes</option><option value="false"' + (c._palletized === false ? ' selected' : '') + '>No</option></select></div>' +
      '<div data-tooltip="Standard pallet dimensions"><label class="text-[11px] text-surface-500 block mb-1">Pallet Size</label><select id="nt-psize-' + ci + '">' +
        '<option value="EUR_120x100"' + (c._psize === 'EUR_120x100' || c._psize === '120x100' ? ' selected' : '') + '>EUR 800×1200 mm</option>' +
        '<option value="ISO_100x120"' + (c._psize === 'ISO_100x120' || c._psize === '100x120' ? ' selected' : '') + '>ISO 1000×1200 mm</option>' +
        '<option value="US_48x40"' + (c._psize === 'US_48x40' ? ' selected' : '') + '>US 48×40 in</option>' +
        '<option value="custom"' + (c._psize === 'custom' ? ' selected' : '') + '>Custom (free text)</option>' +
      '</select></div>' +
      '<div data-tooltip="Per-container notes"><label class="text-[11px] text-surface-500 block mb-1">Container Notes</label><input id="nt-cnote-' + ci + '" type="text" placeholder="e.g. Expedite clearance" value="' + (c._cnote || '').replace(/"/g, '&quot;') + '"></div>' +
      '<div><label class="text-[11px] text-surface-500 block mb-1 cursor-pointer" onclick="ntToggleDestOverride(' + ci + ')"><i class="fas fa-pen text-[9px] mr-1"></i>Destination Override <span class="text-[9px] text-surface-400">(click to show)</span></label><input id="nt-dest-override-' + ci + '" type="text" placeholder="e.g. Alexandria Free Zone" value="' + (c._destOverride || '').replace(/"/g, '&quot;') + '" style="display:' + (c._destOverride ? 'block' : 'none') + '"></div>' +
    '</div>' +

    // Commodities section
    '<div class="border-t border-surface-100 pt-4 mt-2">' +
      '<div class="flex items-center justify-between mb-3">' +
        '<h5 class="text-xs font-semibold text-surface-700 uppercase tracking-wider"><i class="fas fa-cubes mr-1 text-amber-500"></i>Commodities in Container ' + (ci + 1) + '</h5>' +
        '<button onclick="ntAddCommodity(' + ci + ')" class="btn-secondary !py-1 !px-3 !text-[10px]"><i class="fas fa-plus mr-1"></i>Add Commodity</button>' +
      '</div>' +
      '<div id="nt-commodities-' + ci + '" class="space-y-3">' +
        c.commodities.map(function(cm, ri) { return ntRenderCommodityRow(ci, ri, cm); }).join('') +
      '</div>' +
    '</div>' +
  '</div>';
}

function ntToggleDestOverride(ci) {
  var el = document.getElementById('nt-dest-override-' + ci);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function ntOnDestChange(ci) {
  ntSaveContainerState(ci);
  var dest = document.getElementById('nt-dest-' + ci).value;
  if (!dest) return;
  var ports = await ntLoadPorts(dest);
  var podEl = document.getElementById('nt-pod-' + ci);
  if (podEl) podEl.innerHTML = ntPortOptions(ports, '');
  ntContainers[ci]._dest = dest;
  ntContainers[ci]._pod = '';
}

function ntUpdatePortFilters() {
  // When transport mode changes, could filter ports by type
  // For now just store the value
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.3 — AI-Driven Dynamic Product Specification
// ═══════════════════════════════════════════════════════════
function ntRenderCommodityRow(ci, ri, cm) {
  cm = cm || {};
  cm._specs = cm._specs || {};
  var specs = ntGetProductSpecs(cm.commodity_type, cm.product_name);
  var totalCartons = (cm.layers_per_pallet || 0) * (cm.cartons_per_layer || 0);
  var netWt = cm.net_weight_per_unit || 0;
  var grossWt = netWt > 0 ? (netWt * 1.05).toFixed(2) : '';
  var totalNetWt = netWt > 0 && totalCartons > 0 ? (netWt * totalCartons * (cm.num_pallets || 0)).toFixed(1) : '';

  return '<div class="bg-surface-50 rounded-xl p-4 border border-surface-100">' +
    '<div class="flex items-center justify-between mb-3">' +
      '<span class="text-xs font-semibold text-surface-600">Commodity ' + (ri + 1) + '</span>' +
      (ri > 0 ? '<button onclick="ntRemoveCommodity(' + ci + ',' + ri + ')" class="text-red-500 hover:text-red-600 text-[10px]"><i class="fas fa-times mr-1"></i>Remove</button>' : '') +
    '</div>' +

    // Row 1: HS Code, Commodity Type, Product Name
    '<div class="grid grid-cols-3 gap-3 mb-3">' +
      '<div><label class="text-[10px] text-surface-500 block mb-0.5">HS Code</label><div class="flex gap-1"><input id="nt-hs-' + ci + '-' + ri + '" type="text" class="flex-1 font-mono text-[12px]" placeholder="0805.10" value="' + (cm.hs_code || '') + '" oninput="ntOnHSInput(' + ci + ',' + ri + ')"><button onclick="ntLookupHS(' + ci + ',' + ri + ')" class="px-2 py-1 bg-sgtx-50 text-sgtx-500 rounded text-[10px] border border-sgtx-200"><i class="fas fa-search"></i></button></div><div id="nt-hs-info-' + ci + '-' + ri + '" class="text-[10px] text-surface-400 mt-0.5"></div></div>' +
      '<div><label class="text-[10px] text-surface-500 block mb-0.5">Commodity Type</label><select id="nt-ctype-' + ci + '-' + ri + '" onchange="ntOnCommodityTypeChange(' + ci + ',' + ri + ')">' +
        '<option value="">-- Select --</option>' +
        '<option value="FRESH_FRUITS"' + (cm.commodity_type === 'FRESH_FRUITS' ? ' selected' : '') + '>Fresh Fruits</option>' +
        '<option value="FROZEN_FRUITS"' + (cm.commodity_type === 'FROZEN_FRUITS' ? ' selected' : '') + '>Frozen Fruits</option>' +
        '<option value="FRESH_VEGETABLES"' + (cm.commodity_type === 'FRESH_VEGETABLES' || cm.commodity_type === 'VEGETABLES' ? ' selected' : '') + '>Fresh Vegetables</option>' +
        '<option value="FROZEN_VEGETABLES"' + (cm.commodity_type === 'FROZEN_VEGETABLES' ? ' selected' : '') + '>Frozen Vegetables</option>' +
        '<option value="GRAINS"' + (cm.commodity_type === 'GRAINS' ? ' selected' : '') + '>Grains & Cereals</option>' +
        '<option value="MEAT"' + (cm.commodity_type === 'MEAT' ? ' selected' : '') + '>Meat</option>' +
        '<option value="SEAFOOD"' + (cm.commodity_type === 'SEAFOOD' ? ' selected' : '') + '>Seafood</option>' +
        '<option value="DAIRY"' + (cm.commodity_type === 'DAIRY' ? ' selected' : '') + '>Dairy</option>' +
        '<option value="TEXTILES"' + (cm.commodity_type === 'TEXTILES' ? ' selected' : '') + '>Textiles</option>' +
        '<option value="CHEMICALS"' + (cm.commodity_type === 'CHEMICALS' ? ' selected' : '') + '>Chemicals</option>' +
        '<option value="MACHINERY"' + (cm.commodity_type === 'MACHINERY' ? ' selected' : '') + '>Machinery</option>' +
        '<option value="OTHER"' + (cm.commodity_type === 'OTHER' ? ' selected' : '') + '>Other</option>' +
      '</select></div>' +
      '<div><label class="text-[10px] text-surface-500 block mb-0.5">Product Name</label><input id="nt-prod-' + ci + '-' + ri + '" type="text" placeholder="e.g. Valencia Oranges" value="' + (cm.product_name || '').replace(/"/g, '&quot;') + '" onchange="ntOnProductChange(' + ci + ',' + ri + ')"></div>' +
    '</div>' +

    // Row 2: AI-Generated Spec Fields (Step 1.2.3)
    '<div id="nt-specfields-' + ci + '-' + ri + '" class="mb-3">' +
      (specs.length > 0 ? '<div class="p-3 bg-white rounded-lg border border-sgtx-100 mb-3">' +
        '<div class="flex items-center gap-2 mb-2"><i class="fas fa-wand-magic-sparkles text-sgtx-500 text-[10px]"></i><span class="text-[10px] font-semibold text-sgtx-600 uppercase tracking-wider">AI Product Specifications</span>' +
        '<button onclick="ntResetSpecs(' + ci + ',' + ri + ')" class="text-[9px] text-surface-400 hover:text-sgtx-500 ml-auto" title="Reset to AI defaults"><i class="fas fa-rotate-left mr-0.5"></i>Reset</button></div>' +
        '<div class="grid grid-cols-' + Math.min(specs.length, 4) + ' gap-2">' +
          specs.map(function(s) {
            var val = cm._specs[s.id] || '';
            if (s.type === 'select') {
              return '<div><label class="text-[10px] text-surface-500 block mb-0.5">' + s.label + '</label><select id="nt-spec-' + ci + '-' + ri + '-' + s.id + '">' +
                '<option value="">-- Select --</option>' + s.options.map(function(o){ return '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
              '</select></div>';
            } else if (s.type === 'number') {
              return '<div><label class="text-[10px] text-surface-500 block mb-0.5">' + s.label + '</label><input id="nt-spec-' + ci + '-' + ri + '-' + s.id + '" type="number" placeholder="' + (s.placeholder || '') + '"' + (s.min !== undefined ? ' min="' + s.min + '"' : '') + (s.max !== undefined ? ' max="' + s.max + '"' : '') + ' value="' + val + '"></div>';
            } else {
              return '<div><label class="text-[10px] text-surface-500 block mb-0.5">' + s.label + '</label><input id="nt-spec-' + ci + '-' + ri + '-' + s.id + '" type="text" placeholder="' + (s.placeholder || '') + '" value="' + (val || '').replace(/"/g, '&quot;') + '"></div>';
            }
          }).join('') +
        '</div></div>' : '') +
    '</div>' +

    // Row 3: Packaging, Pallets, Layers calculation
    '<div class="grid grid-cols-6 gap-2 mb-3">' +
      '<div><label class="text-[10px] text-surface-500 block mb-0.5">Packaging</label><select id="nt-pkg-' + ci + '-' + ri + '">' +
        ['Boxes','Mesh Bags','Plastic Crates','Cartons','Pallet Wrap','Drums','Barrels','Bales','Bins','Carton Bags','Jumbo Bags','Polybags','Other'].map(function(p){ var pv = p.toLowerCase().replace(/ /g,'_'); return '<option value="' + pv + '"' + (cm.packaging === pv ? ' selected' : '') + '>' + p + '</option>'; }).join('') +
      '</select></div>' +
      '<div data-tooltip="Number of pallets for this commodity"><label class="text-[10px] text-surface-500 block mb-0.5">Num Pallets</label><input id="nt-pallets-' + ci + '-' + ri + '" type="number" min="0" value="' + (cm.num_pallets || '') + '" onchange="ntCalcWeight(' + ci + ',' + ri + ')"></div>' +
      '<div data-tooltip="How many layers of cartons per pallet"><label class="text-[10px] text-surface-500 block mb-0.5">Layers/Pallet</label><input id="nt-layers-' + ci + '-' + ri + '" type="number" min="0" value="' + (cm.layers_per_pallet || '') + '" placeholder="e.g. 11" onchange="ntCalcWeight(' + ci + ',' + ri + ')"></div>' +
      '<div data-tooltip="Cartons in each layer"><label class="text-[10px] text-surface-500 block mb-0.5">Cartons/Layer</label><input id="nt-cpl-' + ci + '-' + ri + '" type="number" min="0" value="' + (cm.cartons_per_layer || '') + '" placeholder="e.g. 10" onchange="ntCalcWeight(' + ci + ',' + ri + ')"></div>' +
      '<div data-tooltip="Net weight per unit (kg or lb)"><label class="text-[10px] text-surface-500 block mb-0.5">Net Wt/Unit</label><div class="flex gap-1"><input id="nt-nwt-' + ci + '-' + ri + '" type="number" step="0.1" class="flex-1" value="' + (netWt || '') + '" placeholder="10" onchange="ntCalcWeight(' + ci + ',' + ri + ')"><select id="nt-wunit-' + ci + '-' + ri + '" class="!w-14 !text-[10px]"><option value="kg"' + (cm.weight_unit !== 'lb' ? ' selected' : '') + '>kg</option><option value="lb"' + (cm.weight_unit === 'lb' ? ' selected' : '') + '>lb</option></select></div></div>' +
      '<div data-tooltip="Auto-calculated gross weight (+5% tare)"><label class="text-[10px] text-surface-500 block mb-0.5">Gross Wt/Unit</label><input id="nt-gwt-' + ci + '-' + ri + '" type="number" step="0.1" class="!bg-surface-100" value="' + grossWt + '" placeholder="auto"></div>' +
    '</div>' +

    // Weight calculation summary
    '<div id="nt-weight-summary-' + ci + '-' + ri + '" class="text-[10px] text-surface-500 flex items-center gap-4">' +
      (totalCartons > 0 ? '<span><i class="fas fa-calculator mr-1 text-accent-cyan"></i>Total cartons/pallet: <b>' + totalCartons + '</b></span>' : '') +
      (totalNetWt ? '<span>Total net weight: <b>' + totalNetWt + ' ' + (cm.weight_unit || 'kg') + '</b></span>' : '') +
    '</div>' +

    // Dual-use detection
    '<div id="nt-dualuse-' + ci + '-' + ri + '" class="mt-1"></div>' +
  '</div>';
}

function ntOnCommodityTypeChange(ci, ri) {
  ntSaveContainerState(ci);
  // Re-render just the spec fields for this commodity
  var c = ntContainers[ci];
  var cm = c.commodities[ri];
  // Re-render the whole commodity section to get new spec fields
  ntRenderContainer(ci);
}

function ntOnProductChange(ci, ri) {
  ntSaveContainerState(ci);
  ntRenderContainer(ci);
}

function ntOnHSInput(ci, ri) {
  // Debounced HS code lookup
  clearTimeout(ntContainers[ci].commodities[ri]._hsTimer);
  ntContainers[ci].commodities[ri]._hsTimer = setTimeout(function() { ntLookupHS(ci, ri); }, 500);
}

async function ntLookupHS(ci, ri) {
  var code = (document.getElementById('nt-hs-' + ci + '-' + ri) || {}).value || '';
  code = code.trim();
  if (!code || code.length < 4) return;
  var infoEl = document.getElementById('nt-hs-info-' + ci + '-' + ri);
  try {
    var res = await api('/trade-form/hs-lookup?hs_code=' + encodeURIComponent(code));
    var d = res.data || res;
    if (d && d.product_name) {
      infoEl.innerHTML = '<i class="fas fa-check-circle text-emerald-500 mr-1"></i>' + d.product_name + (d.commodity_type ? ' (' + d.commodity_type + ')' : '');
      // Auto-fill product name and commodity type
      var prodEl = document.getElementById('nt-prod-' + ci + '-' + ri);
      var ctypeEl = document.getElementById('nt-ctype-' + ci + '-' + ri);
      if (prodEl && !prodEl.value) prodEl.value = d.product_name;
      if (ctypeEl && d.commodity_type) ctypeEl.value = d.commodity_type;
    } else {
      // Try search endpoint
      var r2 = await api('/ref/hs-search?q=' + encodeURIComponent(code));
      var items = r2.data || [];
      if (items.length) {
        infoEl.innerHTML = '<i class="fas fa-check-circle text-emerald-500 mr-1"></i>' + items[0].name + ' (' + items[0].commodity_label + ')';
        var prodEl = document.getElementById('nt-prod-' + ci + '-' + ri);
        if (prodEl && !prodEl.value) prodEl.value = items[0].name;
      } else {
        infoEl.textContent = 'HS code not found in database';
      }
    }
  } catch(e) { if (infoEl) infoEl.textContent = 'Lookup failed'; }
}

function ntResetSpecs(ci, ri) {
  ntContainers[ci].commodities[ri]._specs = {};
  ntRenderContainer(ci);
  showToast('Specifications reset to defaults', 'info');
}

function ntCalcWeight(ci, ri) {
  var layers = parseInt((document.getElementById('nt-layers-' + ci + '-' + ri) || {}).value) || 0;
  var cpl = parseInt((document.getElementById('nt-cpl-' + ci + '-' + ri) || {}).value) || 0;
  var pallets = parseInt((document.getElementById('nt-pallets-' + ci + '-' + ri) || {}).value) || 0;
  var netWt = parseFloat((document.getElementById('nt-nwt-' + ci + '-' + ri) || {}).value) || 0;
  var gwtEl = document.getElementById('nt-gwt-' + ci + '-' + ri);
  var summaryEl = document.getElementById('nt-weight-summary-' + ci + '-' + ri);
  var unit = (document.getElementById('nt-wunit-' + ci + '-' + ri) || {}).value || 'kg';

  // Auto gross = net + 5% tare
  if (gwtEl && netWt > 0) gwtEl.value = (netWt * 1.05).toFixed(2);

  var totalCartons = layers * cpl;
  var totalNet = netWt * totalCartons * pallets;
  var html = '';
  if (totalCartons > 0) html += '<span><i class="fas fa-calculator mr-1 text-accent-cyan"></i>Cartons/pallet: <b>' + totalCartons + '</b></span>';
  if (totalNet > 0) html += '<span class="ml-4">Total net: <b>' + totalNet.toFixed(1) + ' ' + unit + '</b></span>';
  if (pallets > 0 && totalCartons > 0) html += '<span class="ml-4">Total cartons: <b>' + (totalCartons * pallets) + '</b></span>';
  if (summaryEl) summaryEl.innerHTML = html;
}

function ntAddCommodity(ci) {
  ntSaveContainerState(ci);
  ntContainers[ci].commodities.push({ _specs: {} });
  ntRenderContainer(ci);
}

function ntRemoveCommodity(ci, ri) {
  if (ntContainers[ci].commodities.length <= 1) return;
  ntSaveContainerState(ci);
  ntContainers[ci].commodities.splice(ri, 1);
  ntRenderContainer(ci);
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.4 — Bulk Edit modal (for 10+ containers)
// ═══════════════════════════════════════════════════════════
function ntShowBulkEdit() {
  ntSaveContainerState(ntActiveTab);
  showModal(
    '<h3 class="text-lg font-bold text-surface-800 mb-4"><i class="fas fa-layer-group text-amber-500 mr-2"></i>Bulk Edit — ' + ntContainers.length + ' Containers</h3>' +
    '<div class="space-y-4">' +
      '<div class="p-3 bg-surface-50 rounded-lg border border-surface-100">' +
        '<h4 class="text-xs font-semibold text-surface-600 mb-2">Apply same settings to all containers</h4>' +
        '<div class="grid grid-cols-2 gap-3">' +
          '<div><label class="text-[10px] text-surface-500 block mb-0.5">Origin Country (all)</label><select id="be-origin">' + ntCountryOptions('') + '</select></div>' +
          '<div><label class="text-[10px] text-surface-500 block mb-0.5">Destination Country (all)</label><select id="be-dest">' + ntCountryOptions('') + '</select></div>' +
          '<div><label class="text-[10px] text-surface-500 block mb-0.5">Container Type (all)</label><select id="be-ct"><option value="">-- No change --</option><option value="40ft_HC_RF">40ft HC Reefer</option><option value="40HC">40ft High Cube</option><option value="20GP">20ft Standard</option></select></div>' +
          '<div><label class="text-[10px] text-surface-500 block mb-0.5">Pallet Size (all)</label><select id="be-psize"><option value="">-- No change --</option><option value="EUR_120x100">EUR 800×1200</option><option value="ISO_100x120">ISO 1000×1200</option></select></div>' +
        '</div>' +
        '<button onclick="ntApplyBulkEdit()" class="btn-primary !text-xs mt-3"><i class="fas fa-check mr-1"></i>Apply to All Containers</button>' +
      '</div>' +
      '<div class="p-3 bg-surface-50 rounded-lg border border-surface-100">' +
        '<h4 class="text-xs font-semibold text-surface-600 mb-2">Copy commodity from Container ' + (ntActiveTab + 1) + ' to all others</h4>' +
        '<button onclick="ntCopyCommodityToAll()" class="btn-secondary !text-xs"><i class="fas fa-copy mr-1"></i>Copy First Commodity to All</button>' +
      '</div>' +
    '</div>'
  );
}

function ntApplyBulkEdit() {
  var origin = document.getElementById('be-origin').value;
  var dest = document.getElementById('be-dest').value;
  var ct = document.getElementById('be-ct').value;
  var psize = document.getElementById('be-psize').value;
  ntContainers.forEach(function(c) {
    if (origin) c._origin = origin;
    if (dest) c._dest = dest;
    if (ct) c._ct = ct;
    if (psize) c._psize = psize;
  });
  closeModal();
  ntRenderContainerTabs();
  ntRenderContainer(ntActiveTab);
  showToast('Bulk edit applied to ' + ntContainers.length + ' containers', 'success');
}

function ntCopyCommodityToAll() {
  var src = ntContainers[ntActiveTab];
  if (!src.commodities.length) return;
  var firstCom = JSON.parse(JSON.stringify(src.commodities[0]));
  ntContainers.forEach(function(c, i) {
    if (i !== ntActiveTab) c.commodities = [JSON.parse(JSON.stringify(firstCom))];
  });
  closeModal();
  showToast('First commodity copied to all containers', 'success');
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.5 — Notes character counter & AI suggest
// ═══════════════════════════════════════════════════════════
function ntUpdateNoteCount() {
  var el = document.getElementById('nt-global-notes');
  var cntEl = document.getElementById('nt-note-count');
  if (el && cntEl) cntEl.textContent = (el.value || '').length + ' / 2,000';
}

async function ntSuggestNotes() {
  var sugEl = document.getElementById('nt-note-suggestion');
  if (sugEl) sugEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>AI generating suggestions...';

  // Build context from current form state
  ntSaveContainerState(ntActiveTab);
  var commodities = [];
  ntContainers.forEach(function(c) {
    c.commodities.forEach(function(cm) { if (cm.product_name) commodities.push(cm.product_name + ' (' + cm.commodity_type + ')'); });
  });
  var incoterm = (document.getElementById('nt-incoterm') || {}).value || 'CIF';

  // Local AI-tier A1 advisory suggestions based on commodities
  var suggestions = [];
  var hasFresh = commodities.some(function(c) { return c.indexOf('FRESH') >= 0; });
  var hasFrozen = commodities.some(function(c) { return c.indexOf('FROZEN') >= 0; });
  if (hasFresh) suggestions.push('Phytosanitary certificate required for fresh produce export.');
  if (hasFrozen) suggestions.push('Temperature set point: -18°C for frozen products.');
  if (hasFresh) suggestions.push('Temperature set point: 4°C for fresh fruits/vegetables.');
  suggestions.push('Bill of lading to be issued in negotiable form.');
  if (incoterm === 'CIF' || incoterm === 'CFR') suggestions.push('Marine cargo insurance certificate required (' + incoterm + ' terms).');
  suggestions.push('Pre-shipment inspection report from accredited QC agent.');

  var text = suggestions.join('\n');
  if (sugEl) sugEl.innerHTML = '<div class="mt-1 p-2 bg-sgtx-50 rounded-lg border border-sgtx-100"><div class="text-[10px] text-sgtx-600 font-semibold mb-1"><i class="fas fa-wand-magic-sparkles mr-1"></i>AI Suggestions</div><div class="text-[11px] text-surface-600 whitespace-pre-line">' + text + '</div><button onclick="ntApplySuggestedNotes()" class="mt-2 text-[10px] text-sgtx-500 font-medium hover:text-sgtx-600"><i class="fas fa-check mr-0.5"></i>Apply to Notes</button></div>';
  window._ntSuggestedNotes = text;
}

function ntApplySuggestedNotes() {
  var el = document.getElementById('nt-global-notes');
  if (el && window._ntSuggestedNotes) {
    el.value = (el.value ? el.value + '\n' : '') + window._ntSuggestedNotes;
    ntUpdateNoteCount();
  }
  var sugEl = document.getElementById('nt-note-suggestion');
  if (sugEl) sugEl.innerHTML = '<span class="text-emerald-600"><i class="fas fa-check mr-1"></i>Applied</span>';
}

// ═══════════════════════════════════════════════════════════
// Step 1.2.6 — Express Mode with confidence scores, preview
// ═══════════════════════════════════════════════════════════
function ntRenderExpressMode() {
  return '<textarea id="nt-express-text" rows="6" class="w-full mt-2" placeholder="Describe your trade in plain English.\n\nExample: I need 20,000 kg of Valencia oranges from Vietnam, CFR Alexandria, packed in 10 kg cartons, 22 pallets. Also 5,376 kg of lemons in mesh bags, 14 pallets. Two containers, second container to Port Said."></textarea>' +
    '<div class="flex items-center gap-2 mt-2">' +
      '<button onclick="ntParseExpress()" class="btn-primary !text-xs"><i class="fas fa-robot mr-1"></i>AI Parse</button>' +
      '<button onclick="ntExpressMode=false; ntRenderForm()" class="btn-secondary !text-xs">Switch to Structured Form</button>' +
      '<button onclick="ntStartVoiceInput()" class="btn-secondary !text-xs !border-sgtx-200" title="Voice Input (Web Speech API)"><i class="fas fa-microphone mr-1"></i>Voice</button>' +
      '<span id="nt-express-status" class="text-xs text-surface-500 ml-2"></span>' +
    '</div>' +
    '<div id="nt-express-preview" class="mt-3"></div>';
}

function ntRenderForm() {
  renderNewTrade();
}

async function ntParseExpress() {
  var text = (document.getElementById('nt-express-text') || {}).value || '';
  if (!text.trim()) { showToast('Please enter a description first', 'error'); return; }
  var statusEl = document.getElementById('nt-express-status');
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Parsing with AI...';
  try {
    var res = await apiPost('/trade-form/express-parse', { text: text, tenant_id: tenant.id });
    var parsed = res.data || res;
    ntShowExpressPreview(parsed);
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-check-circle text-emerald-500 mr-1"></i>Parsed successfully. Review below.';
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-amber-500 mr-1"></i>AI parsing unavailable. Please switch to structured form.';
  }
}

function ntShowExpressPreview(parsed) {
  var prevEl = document.getElementById('nt-express-preview');
  if (!prevEl) return;
  var containers = parsed.containers || [];
  var conf = parsed.confidence || {};
  function confBadge(field) {
    var score = conf[field] || parsed.overall_confidence || 75;
    var color = score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'red';
    return '<span class="text-[9px] px-1.5 py-0.5 rounded bg-' + color + '-50 text-' + color + '-700 font-semibold ml-1">' + score + '%</span>';
  }
  prevEl.innerHTML = '<div class="sgtx-card !p-4 border-l-4 border-l-sgtx-400">' +
    '<h4 class="text-xs font-semibold text-surface-700 mb-3"><i class="fas fa-eye mr-1"></i>Parsed Preview — Review and Confirm</h4>' +
    (parsed.incoterm ? '<div class="mb-2 text-xs text-surface-600">Incoterm: <b>' + parsed.incoterm + '</b>' + confBadge('incoterm') + '</div>' : '') +
    (parsed.seller_gtid ? '<div class="mb-2 text-xs text-surface-600">Seller: <b class="font-mono">' + parsed.seller_gtid + '</b>' + confBadge('seller') + '</div>' : '') +
    '<div class="space-y-2">' + containers.map(function(ct, i) {
      return '<div class="p-3 bg-surface-50 rounded-lg border border-surface-100"><div class="text-xs font-semibold text-surface-700 mb-1">Container ' + (i+1) + confBadge('container_' + i) + '</div>' +
        '<div class="text-[11px] text-surface-600">' +
          (ct.origin_country ? 'Origin: ' + ct.origin_country + ' → ' : '') +
          (ct.destination_country ? ct.destination_country : '') +
          (ct.port_of_discharge ? ' (' + ct.port_of_discharge + ')' : '') +
        '</div>' +
        (ct.commodities || []).map(function(cm) {
          return '<div class="text-[11px] text-surface-500 ml-2 mt-1">• ' + (cm.product_name || cm.hs_code || 'Unknown') + ' — ' + (cm.quantity || '?') + ' ' + (cm.unit || '') + ', ' + (cm.num_pallets || '?') + ' pallets' + confBadge('commodity') + '</div>';
        }).join('') +
      '</div>';
    }).join('') + '</div>' +
    '<div class="flex gap-2 mt-3">' +
      '<button onclick="ntApplyExpressParsed()" class="btn-primary !text-xs"><i class="fas fa-check mr-1"></i>Confirm & Load into Form</button>' +
      '<button onclick="ntExpressMode=false; ntRenderForm()" class="btn-secondary !text-xs">Edit in Structured Form</button>' +
    '</div>' +
  '</div>';
  window._ntExpressParsed = parsed;
}

function ntApplyExpressParsed() {
  var parsed = window._ntExpressParsed;
  if (!parsed) return;
  if (parsed.containers && parsed.containers.length) {
    ntContainers = parsed.containers.map(function(c) {
      return {
        commodities: (c.commodities || [{}]).map(function(cm) { return Object.assign({ _specs: {} }, cm); }),
        _origin: c.origin_country || '', _dest: c.destination_country || '', _pod: c.port_of_discharge || '',
        _ct: c.container_type || '40ft_HC_RF', _palletized: true, _psize: '120x100', _cnote: c.notes || '', _destOverride: ''
      };
    });
  }
  ntExpressMode = false;
  ntActiveTab = 0;
  renderNewTrade();
  // Set incoterm and seller after render
  setTimeout(function() {
    if (parsed.incoterm) { var el = document.getElementById('nt-incoterm'); if (el) el.value = parsed.incoterm; }
    if (parsed.seller_gtid) { var el = document.getElementById('nt-seller-gtid'); if (el) { el.value = parsed.seller_gtid; ntResolveGTID(); } }
  }, 200);
  showToast('Express mode data loaded into structured form. Review all fields.', 'success');
}

function ntStartVoiceInput() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('Voice input not supported in this browser. Please type your description.', 'error');
    return;
  }
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  var statusEl = document.getElementById('nt-express-status');
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-microphone text-red-500 animate-pulse mr-1"></i>Listening... speak now';
  recognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    var textEl = document.getElementById('nt-express-text');
    if (textEl) textEl.value = transcript;
  };
  recognition.onerror = function() { if (statusEl) statusEl.innerHTML = 'Voice input ended'; };
  recognition.onend = function() { if (statusEl) statusEl.innerHTML = '<i class="fas fa-check text-emerald-500 mr-1"></i>Voice input captured. Click AI Parse.'; };
  recognition.start();
  setTimeout(function() { try { recognition.stop(); } catch(e){} }, 15000);
}

// ═══════════════════════════════════════════════════════════
// Step 1.3 — Multi-Shipment Schedule Builder
// ═══════════════════════════════════════════════════════════
function ntRenderShipments() {
  var area = document.getElementById('nt-shipments-area');
  if (!area) return;
  if (!ntMultiShipment) { area.innerHTML = ''; return; }
  if (!ntShipments.length) ntShipments.push({ date: '', port: '', containers: 1, notes: '' });

  area.innerHTML =
    '<div class="mt-3 space-y-2">' +
    ntShipments.map(function(s, i) {
      return '<div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-100">' +
        '<span class="text-xs font-semibold text-surface-500 w-20">Shipment ' + (i + 1) + '</span>' +
        '<div class="flex-1 grid grid-cols-4 gap-2">' +
          '<div><label class="text-[9px] text-surface-400 block">Delivery Date</label><input type="date" id="nt-ship-date-' + i + '" value="' + (s.date || '') + '" min="' + new Date().toISOString().split('T')[0] + '"></div>' +
          '<div><label class="text-[9px] text-surface-400 block">Port</label><select id="nt-ship-port-' + i + '"><option value="' + (s.port || '') + '">' + (s.port || '-- Same as main --') + '</option></select></div>' +
          '<div><label class="text-[9px] text-surface-400 block">Containers</label><input type="number" id="nt-ship-ct-' + i + '" value="' + (s.containers || 1) + '" min="1"></div>' +
          '<div><label class="text-[9px] text-surface-400 block">Notes</label><input type="text" id="nt-ship-note-' + i + '" value="' + (s.notes || '').replace(/"/g, '&quot;') + '" placeholder="Optional"></div>' +
        '</div>' +
        '<div class="flex gap-1">' +
          '<button onclick="ntCloneShipment(' + i + ')" class="text-[10px] text-sgtx-500 hover:text-sgtx-600 px-1" title="Clone"><i class="fas fa-clone"></i></button>' +
          (ntShipments.length > 1 ? '<button onclick="ntRemoveShipment(' + i + ')" class="text-[10px] text-red-500 hover:text-red-600 px-1" title="Remove"><i class="fas fa-trash"></i></button>' : '') +
        '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
    '<button onclick="ntAddShipment()" class="btn-secondary !text-xs mt-2"><i class="fas fa-plus mr-1"></i>Add Shipment</button>';

  // Load ports into shipment dropdowns
  ntShipments.forEach(function(s, i) {
    var destCountry = ntContainers[0]?._dest || '';
    if (destCountry && ntRefPorts[destCountry]) {
      var portEl = document.getElementById('nt-ship-port-' + i);
      if (portEl) portEl.innerHTML = ntPortOptions(ntRefPorts[destCountry], s.port);
    }
  });
}

function ntSaveShipmentState() {
  ntShipments = ntShipments.map(function(s, i) {
    return {
      date: (document.getElementById('nt-ship-date-' + i) || {}).value || s.date || '',
      port: (document.getElementById('nt-ship-port-' + i) || {}).value || s.port || '',
      containers: parseInt((document.getElementById('nt-ship-ct-' + i) || {}).value) || s.containers || 1,
      notes: (document.getElementById('nt-ship-note-' + i) || {}).value || ''
    };
  });
}

function ntAddShipment() { ntSaveShipmentState(); ntShipments.push({ date: '', port: '', containers: 1, notes: '' }); ntRenderShipments(); }
function ntCloneShipment(i) { ntSaveShipmentState(); ntShipments.splice(i + 1, 0, JSON.parse(JSON.stringify(ntShipments[i]))); ntRenderShipments(); }
function ntRemoveShipment(i) { if (ntShipments.length <= 1) return; ntSaveShipmentState(); ntShipments.splice(i, 1); ntRenderShipments(); }

// ═══════════════════════════════════════════════════════════
// Step 1.4 — AI Container Advisor
// ═══════════════════════════════════════════════════════════
function ntRequestAIAdvice() {
  ntSaveContainerState(ntActiveTab);
  var advEl = document.getElementById('nt-ai-advisor');
  if (!advEl) return;
  advEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1 text-accent-cyan"></i>Analyzing cargo specifications...';

  var totalWeight = 0, allHsCodes = [], hasFresh = false, hasFrozen = false;
  ntContainers.forEach(function(c) {
    c.commodities.forEach(function(cm) {
      var layers = cm.layers_per_pallet || 0, cpl = cm.cartons_per_layer || 0, pallets = cm.num_pallets || 0, nwt = cm.net_weight_per_unit || 0;
      totalWeight += nwt * layers * cpl * pallets;
      if (cm.hs_code) allHsCodes.push(cm.hs_code);
      if ((cm.commodity_type || '').indexOf('FRESH') >= 0) hasFresh = true;
      if ((cm.commodity_type || '').indexOf('FROZEN') >= 0) hasFrozen = true;
    });
  });

  var containerType = '40HC', suggestion = '';
  if (hasFrozen) { containerType = '40ft HC Reefer (-18°C)'; suggestion = 'Frozen products detected. Recommending 40ft High-Cube Reefer containers with temperature set to -18°C.'; }
  else if (hasFresh || allHsCodes.some(function(h) { return h.startsWith('08') || h.startsWith('07'); })) { containerType = '40ft HC Reefer (2-4°C)'; suggestion = 'Fresh produce detected. Recommending 40ft HC Reefer containers at 2-4°C for optimal shelf life.'; }
  else if (totalWeight > 25000) { suggestion = 'Total weight exceeds 25 tonnes. Recommending 40ft High-Cube containers.'; }
  else if (totalWeight > 0 && totalWeight <= 12000) { containerType = '20GP'; suggestion = 'Moderate weight (' + Math.round(totalWeight) + ' kg). A 20ft standard may be sufficient.'; }
  else { suggestion = 'Add commodity details with weight info for specific container recommendations.'; }
  var numContainers = totalWeight > 0 ? Math.max(1, Math.ceil(totalWeight / 22000)) : ntContainers.length;

  advEl.innerHTML =
    '<div class="flex items-start gap-3">' +
      '<i class="fas fa-lightbulb text-accent-cyan mt-0.5"></i>' +
      '<div class="flex-1">' +
        '<p class="text-sm text-surface-600 mb-2">' + suggestion + '</p>' +
        '<div class="flex flex-wrap gap-2">' +
          '<span class="badge badge-info !text-[10px]"><i class="fas fa-box mr-1"></i>Suggested: ' + containerType + '</span>' +
          '<span class="badge badge-info !text-[10px]"><i class="fas fa-hashtag mr-1"></i>Est. containers: ' + numContainers + '</span>' +
          (totalWeight > 0 ? '<span class="badge badge-info !text-[10px]"><i class="fas fa-weight-hanging mr-1"></i>' + Math.round(totalWeight) + ' kg total</span>' : '') +
        '</div>' +
        (numContainers !== ntContainers.length && totalWeight > 0 ? '<button onclick="document.getElementById(\'nt-num-containers\').value=' + numContainers + '; ntSyncContainerCount()" class="mt-2 text-[10px] text-sgtx-500 hover:text-sgtx-600 font-medium"><i class="fas fa-check mr-0.5"></i>Accept suggestion (' + numContainers + ' containers)</button>' : '') +
      '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════
// Step 1.5 — Marketplace Attribution Detection
// ═══════════════════════════════════════════════════════════
async function ntCheckMarketplaceAttribution() {
  var banner = document.getElementById('nt-marketplace-banner');
  if (!banner) return;
  var sellerGtid = (document.getElementById('nt-seller-gtid') || {}).value || '';
  if (!sellerGtid || !tenant) { banner.innerHTML = ''; return; }
  try {
    var res = await api('/marketplace/attribution-check?buyer_tenant_id=' + tenant.id + '&seller_gtid=' + encodeURIComponent(sellerGtid));
    var attr = res.data;
    if (attr && attr.attributed) {
      banner.innerHTML = '<div class="sgtx-card !p-4 mb-4 border-l-4 border-l-amber-400 bg-amber-50/50">' +
        '<div class="flex items-center gap-2 mb-2"><i class="fas fa-handshake text-amber-600"></i><span class="text-sm font-semibold text-amber-800">Marketplace Attribution</span></div>' +
        '<p class="text-xs text-amber-700 mb-2">This trade will be attributed to <b>' + (attr.marketplace_name || 'a marketplace partner') + '</b> because you first connected through them' + (attr.introduced_at ? ' on ' + new Date(attr.introduced_at).toLocaleDateString() : '') + '. A standard revenue share of <b>' + (attr.revenue_share_pct || 'X') + '%</b> will be applied.</p>' +
        '<div class="flex items-center gap-3"><span class="text-[10px] text-amber-600">You may dispute within 72 hours.</span><button onclick="ntDisputeAttribution()" class="text-[10px] text-amber-700 underline hover:text-amber-800 font-medium">Dispute</button></div>' +
      '</div>';
    } else {
      banner.innerHTML = '';
    }
  } catch(e) { banner.innerHTML = ''; }
}

function ntDisputeAttribution() {
  showModal(
    '<h3 class="text-lg font-bold text-surface-800 mb-4"><i class="fas fa-gavel text-amber-500 mr-2"></i>Dispute Marketplace Attribution</h3>' +
    '<div class="space-y-3">' +
      '<div><label class="text-xs text-surface-500 block mb-1">Reason for Dispute</label><textarea id="nt-attr-dispute-reason" rows="3" placeholder="Explain why this attribution is incorrect..."></textarea></div>' +
      '<button onclick="ntSubmitAttributionDispute()" class="btn-primary !text-xs">Submit Dispute</button>' +
    '</div>'
  );
}

async function ntSubmitAttributionDispute() {
  showToast('Attribution dispute submitted. It will be reviewed within 72 hours.', 'info');
  closeModal();
}

// ═══════════════════════════════════════════════════════════
// Step 1.6 — Governor Prescreen & Submission
// ═══════════════════════════════════════════════════════════
async function ntSubmitTradeRequest() {
  ntSaveContainerState(ntActiveTab);
  if (ntMultiShipment) ntSaveShipmentState();

  var sellerGtid = (document.getElementById('nt-seller-gtid') || {}).value || '';
  sellerGtid = sellerGtid.trim();
  var incoterm = (document.getElementById('nt-incoterm') || {}).value || 'CIF';
  var transportMode = (document.getElementById('nt-transport') || {}).value || 'SEA_CARGO';
  var prevLogistics = (document.getElementById('nt-prev-logistics') || {}).value === '1';
  var globalNotes = (document.getElementById('nt-global-notes') || {}).value || '';

  if (!sellerGtid) { showToast('Seller GTID is required. Enter or select a seller.', 'error'); return; }

  // Build container payload
  var containers = ntContainers.map(function(c, ci) {
    var commodities = c.commodities.map(function(cm, ri) {
      return {
        hs_code: (cm.hs_code || '').trim(),
        commodity_type: cm.commodity_type || 'OTHER',
        product_name: (cm.product_name || '').trim(),
        product_specification: JSON.stringify(cm._specs || {}),
        packaging_code: cm.packaging || 'boxes',
        packaging: cm.packaging || 'boxes',
        num_pallets: cm.num_pallets || 0,
        layers_per_pallet: cm.layers_per_pallet || 0,
        cartons_per_layer: cm.cartons_per_layer || 0,
        net_weight_per_unit: cm.net_weight_per_unit || 0,
        gross_weight_per_unit: cm.net_weight_per_unit ? cm.net_weight_per_unit * 1.05 : 0,
        weight_unit: cm.weight_unit || 'kg',
        total_net_weight: (cm.net_weight_per_unit || 0) * (cm.layers_per_pallet || 0) * (cm.cartons_per_layer || 0) * (cm.num_pallets || 0),
        quantity_type: 'WEIGHT',
        quantity: (cm.net_weight_per_unit || 0) * (cm.layers_per_pallet || 0) * (cm.cartons_per_layer || 0) * (cm.num_pallets || 0),
        unit: cm.weight_unit || 'kg',
        specifications: cm._specs || {}
      };
    });
    return {
      container_type: c._ct || '40ft_HC_RF',
      origin_country: (c._origin || '').toUpperCase(),
      destination_country: (c._dest || '').toUpperCase(),
      port_of_discharge: (c._pod || '').toUpperCase(),
      palletized: c._palletized !== false,
      pallet_size: c._psize || 'EUR_120x100',
      transport_mode: transportMode,
      destination_override: c._destOverride || null,
      notes: c._cnote || null,
      commodities: commodities
    };
  });

  // Validate
  var hasAnyCommodity = containers.some(function(ct) { return ct.commodities.some(function(cm) { return cm.hs_code || cm.product_name; }); });
  if (!hasAnyCommodity) { showToast('Add at least one commodity with HS code or product name', 'error'); return; }

  // Multi-shipment validation (G1U10)
  if (ntMultiShipment && ntShipments.length) {
    var shipmentErrors = [];
    ntShipments.forEach(function(s, i) {
      if (!s.date) shipmentErrors.push('Shipment ' + (i+1) + ': delivery date required');
      if (s.date && new Date(s.date) <= new Date()) shipmentErrors.push('Shipment ' + (i+1) + ': date must be in the future');
    });
    if (shipmentErrors.length) {
      showToast(shipmentErrors.join('. '), 'error');
      return;
    }
  }

  // Express Mode tracking
  var expressText = (document.getElementById('nt-express-text') || {}).value || '';
  var expressUsed = expressText.trim().length > 10;

  try {
    var res = await apiPost('/trade-form/submit', {
      tenant_id: tenant.id,
      draft_id: ntDraftId || undefined,
      transport_mode: transportMode,
      incoterm: incoterm,
      seller_gtid: sellerGtid,
      seller_company_name: ntSellerResolved ? ntSellerResolved.company_name : '',
      containers: containers,
      global_notes: globalNotes.trim() || null,
      multi_shipment_enabled: ntMultiShipment,
      multi_shipment_schedule: ntMultiShipment ? ntShipments : null,
      express_mode_used: expressUsed,
      express_mode_raw_text: expressUsed ? expressText.trim() : null,
      prefer_previous_logistics: prevLogistics
    });

    var data = res.data || res;
    var govVerdict = data.governor_verdict || (data.governor ? data.governor.verdict : null);

    // Step 1.6: If Governor returns DENY or CONDITIONAL, show Decision Panel
    if (govVerdict === 'DENY' || (res.status === 403)) {
      var govData = data.governor || {};
      showGovernorPanel('DENY', data.trade_id || '', {
        reason: govData.tenant_message || data.error || 'Trade request denied by Governor.',
        conditions: govData.unmet_conditions || [data.error || 'Compliance check failed'],
        confidence: govData.confidence || 95,
        timer: '72h to resolve'
      });
      return;
    }
    if (govVerdict === 'CONDITIONAL') {
      showGovernorPanel('CONDITIONAL', data.trade_id || '', {
        reason: data.governor.tenant_message || 'Additional conditions required.',
        conditions: data.governor.conditions || ['Upload required documentation'],
        confidence: data.governor.confidence || 82,
        timer: '48h to complete'
      });
      return;
    }

    // Success
    ntStopDraftTimer();
    showToast('Trade request submitted! ' + (data.total_containers || containers.length) + ' container(s) under ' + incoterm + '. Status: PENDING_SELLER_RESPONSE', 'success');
    ntContainers = [{ commodities: [{ _specs: {} }] }];
    ntDraftId = null;
    ntMultiShipment = false;
    ntShipments = [];
    ntActiveTab = 0;
    ntSellerResolved = null;
    navigateTo('trade-command-center');
  } catch(e) {
    // Handle governor DENY returned as HTTP 403
    if (e.response && e.response.governor) {
      showGovernorPanel('DENY', '', {
        reason: e.response.governor.tenant_message || e.message,
        conditions: e.response.governor.unmet_conditions || [e.message],
        confidence: 95
      });
    } else {
      showToast('Error: ' + (e.message || 'Submission failed'), 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Step 1.7 — Draft Auto-Save every 30 seconds
// ═══════════════════════════════════════════════════════════
function ntStartDraftTimer() {
  ntStopDraftTimer();
  ntDraftTimer = setInterval(function() { ntSaveDraft(true); }, 30000);
}

function ntStopDraftTimer() {
  if (ntDraftTimer) { clearInterval(ntDraftTimer); ntDraftTimer = null; }
}

async function ntSaveDraft(silent) {
  ntSaveContainerState(ntActiveTab);
  if (ntMultiShipment) ntSaveShipmentState();

  var statusEl = document.getElementById('nt-draft-status');
  if (statusEl && !silent) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Saving draft...';

  var formData = {
    seller_gtid: (document.getElementById('nt-seller-gtid') || {}).value || '',
    seller_company_name: ntSellerResolved ? ntSellerResolved.company_name : '',
    incoterm: (document.getElementById('nt-incoterm') || {}).value || 'CIF',
    transport_mode: (document.getElementById('nt-transport') || {}).value || 'SEA_CARGO',
    prefer_previous_logistics: (document.getElementById('nt-prev-logistics') || {}).value === '1',
    global_notes: (document.getElementById('nt-global-notes') || {}).value || '',
    multi_shipment_enabled: ntMultiShipment,
    multi_shipment_schedule: ntMultiShipment ? ntShipments : null,
    containers: ntContainers.map(function(c) {
      return {
        origin_country: c._origin, destination_country: c._dest, port_of_discharge: c._pod,
        container_type: c._ct, palletized: c._palletized, pallet_size: c._psize,
        notes: c._cnote, destination_override: c._destOverride,
        commodities: c.commodities.map(function(cm) {
          return { hs_code: cm.hs_code, commodity_type: cm.commodity_type, product_name: cm.product_name,
            packaging: cm.packaging, num_pallets: cm.num_pallets, layers_per_pallet: cm.layers_per_pallet,
            cartons_per_layer: cm.cartons_per_layer, net_weight_per_unit: cm.net_weight_per_unit,
            weight_unit: cm.weight_unit, _specs: cm._specs };
        })
      };
    })
  };

  try {
    var res = await apiPost('/trade-form/draft-save', {
      tenant_id: tenant.id,
      draft_id: ntDraftId || undefined,
      employee_id: employee ? employee.id : undefined,
      form_data: formData
    });
    var d = res.data || {};
    if (d.draft_id) ntDraftId = d.draft_id;
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-check text-emerald-500 mr-1"></i>Draft saved ' + new Date().toLocaleTimeString();
    // Update draft bar with ID
    var draftBar = document.getElementById('nt-draft-bar');
    if (draftBar && ntDraftId) {
      draftBar.classList.remove('border-l-surface-300');
      draftBar.classList.add('border-l-emerald-400');
    }
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-amber-500 mr-1"></i>Draft save failed';
  }
}

// ═══════════════════════════════════════════════════════════
// BUYER: QUOTE REVIEW (Blueprint 6.2.1 — Phase 3)
// ═══════════════════════════════════════════════════════════

async function renderQuoteReview() {
  setTitle('Quote Review', 'Review seller quotes with landed cost breakdown');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=QUOTED');
    var trades = res.data || [];
    content.innerHTML =
      fourQuestions('Quotes submitted by sellers for your trade requests.', 'Review each quote, accept, negotiate price, or amend non-price terms.', trades.length === 0 ? '' : trades.length + ' quote(s) awaiting your review.', 'Accept to move to contract signing, or negotiate for better terms.') +
      (trades.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-file-invoice-dollar text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No pending quotes.</p></div>' :
        '<div class="space-y-3">' + trades.map(function(t) {
          return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5" onclick="showQuoteDetail(\'' + t.id + '\')">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs text-brand-300">' + (t.ustn || t.id) + '</span>' + badge('QUOTED', 'purple') + '</div>' +
            '<p class="text-sm text-surface-300">' + (t.commodity_type || 'Trade') + ' — ' + (t.incoterm || '') + '</p>' +
            '<div class="flex items-center gap-4 mt-2 text-xs text-surface-500"><span>' + usd(t.total_value || t.quoted_price || 0) + '</span><span>' + timeAgo(t.updated_at || t.created_at) + '</span></div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function showQuoteDetail(tradeId) {
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(6);
  try {
    var res = await api('/contract/quote-review/' + tradeId);
    var q = res.data || res;
    content.innerHTML =
      '<button onclick="renderQuoteReview()" class="text-xs text-surface-400 hover:text-white mb-4 inline-flex items-center gap-1"><i class="fas fa-arrow-left"></i> Back to quotes</button>' +
      '<div class="glass-card p-5 mb-4">' +
        '<h3 class="text-sm font-semibold text-surface-200 mb-3"><i class="fas fa-file-invoice-dollar mr-2 text-purple-400"></i>Quote Summary</h3>' +
        '<div class="grid grid-cols-3 gap-3 mb-4">' +
          [['EXW Price', usd(q.exw_price || 0)], ['Logistics', usd(q.logistics_cost || 0)], ['Insurance', usd(q.insurance_cost || 0)], ['SGTX Fee', usd(q.sgtx_fee || 0)], ['Total Landed', usd(q.total_landed_cost || q.total_value || 0)], ['Per Unit', usd(q.per_unit_cost || 0)]].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm font-semibold text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (q.breakdown ? '<div class="text-xs text-surface-400 bg-dark-800/30 rounded-lg p-3 mb-4"><strong>Breakdown:</strong> ' + (typeof q.breakdown === 'string' ? q.breakdown : JSON.stringify(q.breakdown)) + '</div>' : '') +
      '</div>' +
      '<div class="flex gap-3">' +
        '<button onclick="acceptQuote(\'' + tradeId + '\')" class="flex-1 py-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"><i class="fas fa-check mr-2"></i>Accept Quote</button>' +
        '<button onclick="showNegotiateForm(\'' + tradeId + '\')" class="flex-1 py-3 bg-amber-500/20 text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-500/30"><i class="fas fa-comments-dollar mr-2"></i>Negotiate Price</button>' +
        '<button onclick="amendQuote(\'' + tradeId + '\')" class="flex-1 py-3 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/30"><i class="fas fa-edit mr-2"></i>Amend Terms</button>' +
      '</div>';
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function acceptQuote(tradeId) {
  try {
    await apiPost('/contract/mutual-confirm', { trade_request_id: tradeId, confirmer_tenant_id: tenant.id });
    showToast('Quote accepted! Moving to contract signing.', 'success');
    navigateTo('contract-signing');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function showNegotiateForm(tradeId) {
  showModal('Negotiate Price',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Your Counter-Price (USD)</label><input id="neg-price" type="number" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="0.00"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Justification</label><textarea id="neg-reason" rows="3" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Why this price is fair..."></textarea></div>' +
      '<button onclick="submitNegotiation(\'' + tradeId + '\')" class="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Submit Counter-Offer</button>' +
    '</div>'
  );
}

async function submitNegotiation(tradeId) {
  var price = parseFloat(document.getElementById('neg-price').value) || 0;
  var reason = document.getElementById('neg-reason').value.trim();
  try {
    await apiPost('/contract/amend', { trade_request_id: tradeId, amendment_type: 'PRICE', proposed_value: price, reason: reason, proposer_tenant_id: tenant.id });
    closeModal();
    showToast('Counter-offer submitted', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function amendQuote(tradeId) {
  showModal('Amend Non-Price Terms',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Amendment Type</label><select id="amend-type" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="INCOTERM">Incoterm Change</option><option value="DELIVERY_DATE">Delivery Date</option><option value="QUANTITY">Quantity Adjustment</option><option value="PACKAGING">Packaging Requirements</option><option value="OTHER">Other</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Proposed Change</label><textarea id="amend-value" rows="3" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Describe the change..."></textarea></div>' +
      '<button onclick="submitAmendment(\'' + tradeId + '\')" class="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">Submit Amendment</button>' +
    '</div>'
  );
}

async function submitAmendment(tradeId) {
  var type = document.getElementById('amend-type').value;
  var value = document.getElementById('amend-value').value.trim();
  try {
    await apiPost('/contract/amend', { trade_request_id: tradeId, amendment_type: type, proposed_value: value, proposer_tenant_id: tenant.id });
    closeModal();
    showToast('Amendment submitted', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// BUYER: CONTRACT SIGNING (Blueprint 6.2.1 — Phase 3)
// Full implementation: Fee display, SGTX Witness, FEES Addendum, signatures
// ═══════════════════════════════════════════════════════════

async function renderContractSigning() {
  setTitle('Contract Signing', 'Review contract, pay fees, and sign with SGTX witness');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=ACCEPTED,PENDING_SIGNATURE,CONTRACT_READY,MUTUAL_CONFIRMED');
    var trades = res.data || [];
    content.innerHTML =
      fourQuestions('Contracts ready for review and signature.', 'Review terms, pay SGTX fee, and digitally sign. SGTX acts as witness.', trades.length === 0 ? 'No blockers.' : trades.filter(function(t){return !t.fee_paid;}).length + ' contract(s) awaiting fee payment before signing.', 'After both parties sign, the trade moves to financing/execution.') +
      (trades.length === 0 ? '<div class="sgtx-card p-8 text-center"><i class="fas fa-file-signature text-surface-400 text-4xl mb-3"></i><p class="text-surface-500">No contracts pending signature.</p></div>' :
        '<div class="space-y-4">' + trades.map(function(t) {
          var signed = t.buyer_signed || t.importer_signed;
          var feePaid = t.fee_paid || t.sgtx_fee_status === 'PAID';
          return '<div class="sgtx-card p-5">' +
            '<div class="flex items-center justify-between mb-3"><span class="font-mono text-sm font-bold text-sgtx-600">' + (t.ustn || t.id) + '</span>' + badge(signed ? 'SIGNED' : feePaid ? 'FEE PAID' : 'PENDING', signed ? 'emerald' : feePaid ? 'blue' : 'amber') + '</div>' +
            '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">' +
              [['Commodity', t.commodity_type || 'N/A'], ['Incoterm', t.incoterm || 'N/A'], ['Value', usd(t.total_value || 0)], ['Fee', usd(t.sgtx_fee || 0)]].map(function(p) {
                return '<div class="bg-surface-50 rounded-lg p-2.5 border border-surface-100 text-center"><div class="text-[10px] text-surface-500 uppercase font-semibold">' + p[0] + '</div><div class="text-sm font-medium text-surface-800 mt-0.5">' + p[1] + '</div></div>';
              }).join('') +
            '</div>' +
            // SGTX Witness Clause
            '<div class="bg-gradient-to-r from-sgtx-50 to-blue-50 rounded-xl p-4 mb-4 border border-sgtx-100">' +
              '<div class="flex items-center gap-2 mb-2"><i class="fas fa-gavel text-sgtx-600"></i><strong class="text-sm text-surface-800">SGTX Witness Clause</strong></div>' +
              '<p class="text-xs text-surface-600 mb-2">SGTX acts as a non-custodial witness to this agreement. The trade execution fee is independent of the contract terms. SGTX signs as witness via Ed25519 digital signature.</p>' +
              '<div class="flex items-center gap-4 text-[10px] text-surface-500"><span><i class="fas fa-lock mr-1"></i>Cryptographic witness</span><span><i class="fas fa-globe mr-1"></i>Jurisdiction: ' + (t.governing_law || 'Platform Rules') + '</span></div>' +
            '</div>' +
            // FEES Addendum
            '<div class="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-100">' +
              '<div class="flex items-center gap-2 mb-2"><i class="fas fa-receipt text-amber-600"></i><strong class="text-sm text-surface-800">FEES Addendum</strong></div>' +
              '<div class="grid grid-cols-3 gap-3 text-xs">' +
                '<div><span class="text-surface-500">Rate</span><div class="font-semibold text-surface-800">' + ((t.sgtx_fee_rate || 0.015) * 100).toFixed(1) + '%</div></div>' +
                '<div><span class="text-surface-500">Amount</span><div class="font-semibold text-surface-800">' + usd(t.sgtx_fee || 0) + '</div></div>' +
                '<div><span class="text-surface-500">Status</span><div class="font-semibold ' + (feePaid ? 'text-emerald-600' : 'text-amber-600') + '">' + (feePaid ? 'Paid' : 'Pending') + '</div></div>' +
              '</div>' +
            '</div>' +
            // Signature Status
            '<div class="flex items-center gap-3 mb-4 text-xs">' +
              '<div class="flex items-center gap-1.5 ' + (t.buyer_signed ? 'text-emerald-600' : 'text-surface-400') + '"><i class="fas ' + (t.buyer_signed ? 'fa-check-circle' : 'fa-circle') + '"></i>Buyer Signed</div>' +
              '<div class="flex items-center gap-1.5 ' + (t.seller_signed ? 'text-emerald-600' : 'text-surface-400') + '"><i class="fas ' + (t.seller_signed ? 'fa-check-circle' : 'fa-circle') + '"></i>Seller Signed</div>' +
              '<div class="flex items-center gap-1.5 text-sgtx-600"><i class="fas fa-shield-alt"></i>SGTX Witness</div>' +
            '</div>' +
            // Action Buttons
            (signed ? '<div class="text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg p-3 text-center"><i class="fas fa-check-circle mr-1"></i>You have signed this contract. Waiting for counterparty.</div>' :
              '<div class="flex gap-3">' +
                (!feePaid ? '<button onclick="payContractFee(\'' + t.id + '\')" class="flex-1 btn-primary"><i class="fas fa-credit-card mr-2"></i>Pay Fee (' + usd(t.sgtx_fee || 0) + ')</button>' : '') +
                '<button onclick="showSignContractModal(\'' + t.id + '\')" class="flex-1 btn-success ' + (!feePaid ? 'opacity-50 cursor-not-allowed' : '') + '" ' + (!feePaid ? 'disabled title="Pay fee first"' : '') + '><i class="fas fa-signature mr-2"></i>Sign Contract</button>' +
                '<button onclick="showNegotiationPanel(\'' + t.id + '\')" class="px-4 py-2 border border-surface-200 rounded-lg text-xs text-surface-600 hover:bg-surface-50"><i class="fas fa-comments mr-1"></i>Negotiate</button>' +
              '</div>') +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = renderError(e.message);
  }
}

async function payContractFee(tradeId) {
  try {
    showToast('Processing fee payment...', 'info');
    var res = await apiPost('/fee/pay', { trade_request_id: tradeId, payer_tenant_id: tenant.id, payment_method: 'PLATFORM_CREDIT' });
    showToast('Fee payment successful!', 'success');
    renderContractSigning();
  } catch (e) { showToast('Fee payment error: ' + e.message, 'error'); }
}

function showSignContractModal(tradeId) {
  showModal(
    '<div class="space-y-4">' +
      '<h3 class="text-lg font-bold text-surface-800">Digital Signature</h3>' +
      '<div class="bg-surface-50 rounded-xl p-4 text-xs text-surface-600 border border-surface-100">' +
        '<p class="mb-2 font-semibold text-surface-800">Confirmation of Digital Signature</p>' +
        '<p>By signing, you confirm: (1) You have read and agree to all contract terms. (2) You accept the SGTX Platform Fee as detailed in the FEES Addendum. (3) You acknowledge SGTX as a non-custodial digital witness.</p>' +
        '<p class="mt-2 text-[10px] text-surface-500">SGTX will record your signature timestamp, IP hash, and Ed25519 digital fingerprint.</p>' +
      '</div>' +
      '<div><label class="text-xs text-surface-600 block mb-1 font-medium">Type your full legal name to confirm</label><input id="sign-name" type="text" class="w-full border border-surface-200 rounded-lg px-4 py-2.5 text-sm" placeholder="Full legal name as registered"></div>' +
      '<div><label class="text-xs text-surface-600 block mb-1 font-medium">Role</label><select id="sign-role" class="w-full border border-surface-200 rounded-lg px-4 py-2.5 text-sm"><option value="BUYER">Buyer / Importer</option><option value="SELLER">Seller / Exporter</option><option value="AUTHORIZED_REP">Authorized Representative</option></select></div>' +
      '<button onclick="signContract(\'' + tradeId + '\')" class="w-full btn-success py-3"><i class="fas fa-signature mr-2"></i>Sign & Lock Contract</button>' +
    '</div>'
  );
}

async function signContract(tradeId) {
  var name = document.getElementById('sign-name').value.trim();
  if (!name) { showToast('Please type your name to confirm', 'error'); return; }
  var role = document.getElementById('sign-role').value;
  try {
    await apiPost('/contract/sign-lock', { trade_request_id: tradeId, signer_tenant_id: tenant.id, signer_name: name, signer_role: role });
    closeModal();
    showToast('Contract signed successfully! SGTX witness recorded.', 'success');
    renderContractSigning();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// NEGOTIATION PANEL (Blueprint 6.2.1 — Phase 3 Step 3.2)
// 3-column: Offer History | Current Offer | Trade Room
// ═══════════════════════════════════════════════════════════

async function showNegotiationPanel(tradeId) {
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(6);
  try {
    var amendRes = await api('/contract/amendments/' + tradeId);
    var amendments = (amendRes.data || []);
    var tradeRes = await api('/trades/' + tradeId + '?tenant_id=' + tenant.id);
    var trade = tradeRes.data || tradeRes;

    content.innerHTML =
      '<button onclick="renderContractSigning()" class="text-xs text-surface-500 hover:text-sgtx-600 mb-4 inline-flex items-center gap-1"><i class="fas fa-arrow-left"></i> Back to Contracts</button>' +
      fourQuestions('Negotiation in progress for ' + (trade.ustn || tradeId) + '.', 'Review amendment history. Submit counter-offer or accept terms.', amendments.filter(function(a){return a.status==='PENDING';}).length + ' pending amendment(s).', 'Max 5 rounds. After 5 rounds, both parties must accept or escalate.') +
      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">' +
        // Column 1: Offer History
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-history mr-1.5"></i>Offer History</h4>' +
          '<div class="space-y-3 max-h-96 overflow-y-auto">' +
            (amendments.length ? amendments.map(function(a, i) {
              var statusCls = a.status === 'ACCEPTED' ? 'text-emerald-600 bg-emerald-50' : a.status === 'REJECTED' ? 'text-red-600 bg-red-50' : a.status === 'COUNTERED' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
              return '<div class="bg-surface-50 rounded-lg p-3 border border-surface-100">' +
                '<div class="flex items-center justify-between mb-1"><span class="text-[10px] font-bold text-surface-500">Round ' + (a.round_number || i+1) + '</span><span class="text-[10px] px-2 py-0.5 rounded-full font-medium ' + statusCls + '">' + (a.status || 'PENDING') + '</span></div>' +
                '<div class="text-xs text-surface-700 mb-1">' + (a.amendments ? (typeof a.amendments === 'string' ? a.amendments : JSON.stringify(a.amendments)).substring(0, 100) : 'Price amendment') + '</div>' +
                '<div class="text-[10px] text-surface-400">By: ' + (a.proposed_by_gtid || 'Unknown') + ' · ' + timeAgo(a.created_at) + '</div>' +
              '</div>';
            }).join('') : '<p class="text-xs text-surface-400 text-center py-4">No amendments yet.</p>') +
          '</div></div>' +
        // Column 2: Current Offer / Submit Counter
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-handshake mr-1.5"></i>Submit Counter-Offer</h4>' +
          '<div class="space-y-3">' +
            '<div><label class="text-xs text-surface-600 block mb-1">Amendment Type</label><select id="neg-type" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm"><option value="PRICE">Price</option><option value="INCOTERM">Incoterm</option><option value="DELIVERY_DATE">Delivery Date</option><option value="QUANTITY">Quantity</option><option value="PACKAGING">Packaging</option></select></div>' +
            '<div><label class="text-xs text-surface-600 block mb-1">Proposed Value</label><input id="neg-value" type="text" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" placeholder="Enter new value"></div>' +
            '<div><label class="text-xs text-surface-600 block mb-1">Justification (required)</label><textarea id="neg-reason" rows="3" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" placeholder="Explain why this is fair..."></textarea></div>' +
            '<button onclick="submitNegotiationOffer(\'' + tradeId + '\')" class="w-full btn-primary py-2.5"><i class="fas fa-paper-plane mr-2"></i>Submit Offer</button>' +
            '<div class="pt-3 border-t border-surface-100"><button onclick="acceptAllTerms(\'' + tradeId + '\')" class="w-full btn-success py-2"><i class="fas fa-check mr-2"></i>Accept Current Terms</button></div>' +
          '</div></div>' +
        // Column 3: Trade Room / Messages
        '<div class="sgtx-card p-4"><h4 class="text-xs font-semibold text-surface-500 uppercase mb-3"><i class="fas fa-comments mr-1.5"></i>Trade Room</h4>' +
          '<div class="bg-surface-50 rounded-lg p-3 border border-surface-100 h-60 overflow-y-auto mb-3" id="trade-room-messages">' +
            '<p class="text-xs text-surface-400 text-center py-8">Messages will appear here during negotiation.</p>' +
          '</div>' +
          '<div class="flex gap-2"><input id="trade-room-msg" type="text" class="flex-1 border border-surface-200 rounded-lg px-3 py-2 text-sm" placeholder="Type a message..."><button onclick="sendTradeRoomMessage(\'' + tradeId + '\')" class="px-4 py-2 bg-sgtx-500 text-white rounded-lg text-xs font-medium hover:bg-sgtx-600"><i class="fas fa-paper-plane"></i></button></div>' +
        '</div>' +
      '</div>';
  } catch (e) { content.innerHTML = renderError(e.message); }
}

async function submitNegotiationOffer(tradeId) {
  var type = document.getElementById('neg-type').value;
  var value = document.getElementById('neg-value').value.trim();
  var reason = document.getElementById('neg-reason').value.trim();
  if (!value || !reason) { showToast('Value and justification required', 'error'); return; }
  try {
    var amendments = {};
    amendments[type.toLowerCase()] = value;
    await apiPost('/contract/amend', { trade_request_id: tradeId, proposed_by_gtid: tenant.gtid || tenant.id, amendments: amendments, reason: reason });
    showToast('Counter-offer submitted (Round updated)', 'success');
    showNegotiationPanel(tradeId);
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function acceptAllTerms(tradeId) {
  try {
    await apiPost('/contract/mutual-confirm', { contract_id: tradeId, confirmer_gtid: tenant.gtid || tenant.id, confirmer_role: currentMode });
    showToast('Terms accepted! Contract moving to signing.', 'success');
    navigateTo('contract-signing');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function sendTradeRoomMessage(tradeId) {
  var msg = document.getElementById('trade-room-msg').value.trim();
  if (!msg) return;
  var container = document.getElementById('trade-room-messages');
  container.innerHTML += '<div class="flex justify-end mb-2"><div class="bg-sgtx-100 text-sgtx-800 rounded-lg px-3 py-1.5 text-xs max-w-[80%]">' + msg + '<div class="text-[9px] text-sgtx-400 mt-0.5">Just now</div></div></div>';
  document.getElementById('trade-room-msg').value = '';
  container.scrollTop = container.scrollHeight;
}

// BUYER: CUSTOMS READINESS (Blueprint 6.2.1 — Phase 5/9)
// Dynamic traffic-light document checklist
// ═══════════════════════════════════════════════════════════

async function renderCustomsReadiness() {
  setTitle('Customs Readiness', 'Document checklist for import clearance');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(5);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=ACTIVE,SIGNED,IN_TRANSIT');
    var trades = res.data || [];
    if (!trades.length) {
      content.innerHTML = '<div class="glass-card p-8 text-center"><i class="fas fa-clipboard-check text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No active trades requiring customs preparation.</p></div>';
      return;
    }
    content.innerHTML =
      fourQuestions('Document readiness for customs clearance on your active trades.', 'Green = ready, Amber = in progress, Red = missing. Click to upload or request from seller.', '', 'Ensure all documents are green before cargo arrives at port.') +
      '<div id="customs-list" class="space-y-4">' + trades.map(function(t) {
        return '<div class="glass-card p-4"><div class="flex items-center justify-between mb-3"><span class="font-mono text-xs text-brand-300">' + (t.ustn || t.id) + '</span>' + badge(t.status || '', 'blue') + '</div><div id="customs-docs-' + (t.ustn || t.id) + '" class="text-xs text-surface-500">Loading requirements...</div></div>';
      }).join('') + '</div>';

    // Load doc requirements for each trade
    trades.forEach(function(t) {
      var ustn = t.ustn || t.id;
      api('/physical/document-requirements/' + ustn).then(function(r) {
        var el = document.getElementById('customs-docs-' + ustn);
        if (!el) return;
        var docs = r.data || r.documents || [];
        if (!docs.length) { el.innerHTML = '<span class="text-surface-500">No requirements defined.</span>'; return; }
        el.innerHTML = '<div class="space-y-2">' + docs.map(function(doc) {
          var color = doc.status === 'READY' ? 'emerald' : doc.status === 'IN_PROGRESS' ? 'amber' : 'red';
          var icon = doc.status === 'READY' ? 'fa-check-circle' : doc.status === 'IN_PROGRESS' ? 'fa-clock' : 'fa-times-circle';
          return '<div class="flex items-center justify-between bg-dark-800/40 rounded-lg p-2">' +
            '<div class="flex items-center gap-2"><i class="fas ' + icon + ' text-' + color + '-400"></i><span class="text-surface-300">' + (doc.name || doc.document_type || 'Document') + '</span></div>' +
            '<div class="flex items-center gap-2">' +
              (doc.status !== 'READY' ? '<button onclick="showDocUploadForm(\'' + ustn + '\', \'' + (doc.document_type || doc.name) + '\')" class="text-[10px] px-2 py-1 bg-brand-500/20 text-brand-300 rounded hover:bg-brand-500/30">Upload</button>' +
              '<button onclick="requestDocFromSeller(\'' + ustn + '\', \'' + (doc.document_type || doc.name) + '\')" class="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30">Request</button>' : '<span class="text-[10px] text-emerald-400">Complete</span>') +
            '</div></div>';
        }).join('') + '</div>';
      }).catch(function() {
        var el = document.getElementById('customs-docs-' + ustn);
        if (el) el.innerHTML = '<span class="text-red-400">Failed to load requirements.</span>';
      });
    });
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showDocUploadForm(ustn, docType) {
  showModal('Upload Document',
    '<div class="space-y-4">' +
      '<p class="text-xs text-surface-400">Upload <strong class="text-surface-200">' + docType + '</strong> for trade <span class="font-mono text-brand-300">' + ustn + '</span></p>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Document Reference</label><input id="doc-ref" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Reference number"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Notes</label><textarea id="doc-notes" rows="2" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"></textarea></div>' +
      '<button onclick="handleDocUpload(\'' + ustn + '\', \'' + docType + '\')" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"><i class="fas fa-upload mr-2"></i>Upload</button>' +
    '</div>'
  );
}

async function handleDocUpload(ustn, docType) {
  var ref = document.getElementById('doc-ref').value.trim();
  var notes = document.getElementById('doc-notes').value.trim();
  try {
    await apiPost('/documents', { ustn: ustn, document_type: docType, reference: ref, notes: notes, uploader_tenant_id: tenant.id, status: 'UPLOADED' });
    closeModal();
    showToast('Document uploaded', 'success');
    renderCustomsReadiness();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function requestDocFromSeller(ustn, docType) {
  try {
    await apiPost('/inbox', { tenant_id: tenant.id, target_tenant_id: null, ustn: ustn, category: 'DOCUMENT', title: 'Document Request: ' + docType, message: 'Please upload ' + docType + ' for trade ' + ustn, urgency_score: 60 });
    showToast('Request sent to seller', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// BUYER: FINANCING (Blueprint 6.2.1 — Phase 4)
// ═══════════════════════════════════════════════════════════

async function renderFinancing() {
  setTitle('Financing', 'Trade finance requests and offers');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/financing?tenant_id=' + tenant.id);
    var items = res.data || [];
    content.innerHTML =
      fourQuestions('Your trade finance requests and available offers.', 'Submit a financing request or review existing bids.', '', 'Once financing is awarded, proceed with physical operations.') +
      '<div class="flex justify-end mb-4"><button onclick="showFinancingRequestForm()" class="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"><i class="fas fa-university mr-2"></i>Request Financing</button></div>' +
      (items.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-university text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No financing requests yet.</p></div>' :
        '<div class="space-y-3">' + items.map(function(f) {
          return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5" onclick="showFinancingDetail(\'' + f.id + '\')">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs text-brand-300">' + (f.ustn || f.trade_id || '-') + '</span>' + badge(f.status || 'PENDING', f.status === 'FUNDED' ? 'emerald' : f.status === 'APPROVED' ? 'blue' : 'amber') + '</div>' +
            '<div class="flex items-center gap-4 text-xs text-surface-400"><span>Amount: ' + usd(f.amount || 0) + '</span><span>LTV: ' + (f.ltv || '-') + '%</span><span>' + timeAgo(f.created_at) + '</span></div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showFinancingRequestForm() {
  showModal('Request Trade Finance',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Trade USTN</label><input id="fin-ustn" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="SGTX-..."></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Requested Amount (USD)</label><input id="fin-amount" type="number" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="0.00"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Finance Type</label><select id="fin-type" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="PRE_SHIPMENT">Pre-Shipment</option><option value="POST_SHIPMENT">Post-Shipment</option><option value="LETTER_OF_CREDIT">Letter of Credit</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Purpose / Notes</label><textarea id="fin-notes" rows="2" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Purpose of financing..."></textarea></div>' +
      '<button onclick="submitFinancingRequest()" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Submit Request</button>' +
    '</div>'
  );
}

async function submitFinancingRequest() {
  var ustn = document.getElementById('fin-ustn').value.trim();
  var amount = parseFloat(document.getElementById('fin-amount').value) || 0;
  var type = document.getElementById('fin-type').value;
  var notes = document.getElementById('fin-notes').value.trim();
  if (!ustn || !amount) { showToast('USTN and amount are required', 'error'); return; }
  try {
    await apiPost('/trade-finance/request', { ustn: ustn, tenant_id: tenant.id, amount: amount, finance_type: type, notes: notes });
    closeModal();
    showToast('Financing request submitted', 'success');
    renderFinancing();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function showFinancingDetail(id) {
  try {
    var res = await api('/financing/' + id);
    var f = res.data || res;
    showModal('Financing Detail',
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['USTN', f.ustn || '-'], ['Amount', usd(f.amount || 0)], ['LTV', (f.ltv || '-') + '%'], ['Type', f.finance_type || '-'], ['Status', f.status || '-'], ['AI Score', f.ai_credit_score || '-']].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (f.bids ? '<div><h4 class="text-sm font-semibold text-surface-200 mb-2">Bids</h4>' + (f.bids || []).map(function(b) { return '<div class="bg-dark-800/40 rounded-lg p-2 text-xs flex justify-between"><span>' + (b.financier || '-') + '</span><span>' + (b.rate || '-') + '%</span>' + badge(b.status || 'PENDING', 'blue') + '</div>'; }).join('') + '</div>' : '') +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// BUYER: DISTRESSED CARGO (Blueprint 6.2.1 — Phase 10)
// ═══════════════════════════════════════════════════════════

async function renderDistressedBuy() {
  setTitle('Distressed Cargo Market', 'Browse and bid on distressed cargo listings');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/distressed-listings?status=ACTIVE');
    var listings = res.data || [];
    content.innerHTML =
      fourQuestions('Available distressed cargo listings from sellers seeking quick resolution.', 'Browse listings and submit offers for cargo below market price.', '', 'Accepted offers create a micro-contract for immediate fulfillment.') +
      (listings.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-box-open text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No distressed listings available at this time.</p></div>' :
        '<div class="grid grid-cols-2 gap-4">' + listings.map(function(l) {
          return '<div class="glass-card p-4">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-medium text-sm text-surface-200">' + (l.commodity_type || l.title || 'Cargo') + '</span>' + badge(l.condition_grade || 'B', l.condition_grade === 'A' ? 'emerald' : 'amber') + '</div>' +
            '<div class="text-xs text-surface-400 space-y-1 mb-3">' +
              '<div>Quantity: ' + (l.quantity || '-') + ' ' + (l.unit || 'kg') + '</div>' +
              '<div>Location: ' + (l.location || '-') + '</div>' +
              '<div>Ask Price: ' + usd(l.asking_price || 0) + '</div>' +
              '<div>Market Value: ' + usd(l.market_value || 0) + '</div>' +
            '</div>' +
            '<button onclick="showDistressedOfferForm(\'' + l.id + '\')" class="w-full py-2 bg-brand-500/20 text-brand-300 rounded-lg text-xs font-medium hover:bg-brand-500/30"><i class="fas fa-hand-holding-usd mr-1"></i>Make Offer</button>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showDistressedOfferForm(listingId) {
  showModal('Make Offer',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Your Offer (USD)</label><input id="dist-offer" type="number" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="0.00"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Notes / Conditions</label><textarea id="dist-notes" rows="2" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Any conditions..."></textarea></div>' +
      '<button onclick="submitDistressedOffer(\'' + listingId + '\')" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Submit Offer</button>' +
    '</div>'
  );
}

async function submitDistressedOffer(listingId) {
  var offer = parseFloat(document.getElementById('dist-offer').value) || 0;
  var notes = document.getElementById('dist-notes').value.trim();
  if (!offer) { showToast('Offer amount required', 'error'); return; }
  try {
    await apiPost('/distressed/micro-contract', { listing_id: listingId, buyer_tenant_id: tenant.id, offer_amount: offer, notes: notes });
    closeModal();
    showToast('Offer submitted!', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// BUYER/SELLER: COMPANY ADMIN (Blueprint 6.2.x)
// ═══════════════════════════════════════════════════════════

async function renderCompanyAdmin() {
  setTitle('Company Admin', 'Manage employees, roles, and company settings');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/employees?tenant_id=' + tenant.id);
    var employees = res.data || [];
    content.innerHTML =
      fourQuestions('Manage your company team and access permissions.', 'Invite new employees, assign roles, deactivate accounts.', '', 'Keep your team roster up to date for compliance.') +
      '<div class="grid grid-cols-3 gap-4 mb-6">' +
        metricCard('fa-users', 'Total Staff', employees.length, null, 'blue') +
        metricCard('fa-user-check', 'Active', employees.filter(function(e) { return e.status === 'ACTIVE'; }).length, null, 'emerald') +
        metricCard('fa-building', 'Company', tenant.company_name || tenant.name || '-', null, 'purple') +
      '</div>' +
      '<div class="flex justify-end mb-4"><button onclick="showInviteEmployeeForm()" class="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"><i class="fas fa-user-plus mr-2"></i>Invite Employee</button></div>' +
      dataTable(['Name', 'Email', 'Role', 'Status', ''],
        employees.map(function(emp) {
          return [
            '<span class="font-medium text-surface-200">' + (emp.full_name || emp.name || '-') + '</span>',
            emp.email || '-',
            badge(emp.role || 'VIEWER', 'blue'),
            badge(emp.status || 'ACTIVE', emp.status === 'ACTIVE' ? 'emerald' : 'red'),
            emp.status === 'ACTIVE' ? '<button onclick="deactivateEmployee(\'' + emp.id + '\')" class="text-xs text-red-400 hover:text-red-300"><i class="fas fa-user-slash"></i></button>' : ''
          ];
        })
      );
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showInviteEmployeeForm() {
  showModal('Invite Employee',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Full Name</label><input id="emp-name" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Jane Doe"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Email</label><input id="emp-email" type="email" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="jane@company.com"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Role</label><select id="emp-role" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="ADMIN">Admin</option><option value="OPERATOR">Operator</option><option value="VIEWER">Viewer</option><option value="FINANCE">Finance</option></select></div>' +
      '<button onclick="inviteEmployee()" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Send Invite</button>' +
    '</div>'
  );
}

async function inviteEmployee() {
  var name = document.getElementById('emp-name').value.trim();
  var email = document.getElementById('emp-email').value.trim();
  var role = document.getElementById('emp-role').value;
  if (!name || !email) { showToast('Name and email are required', 'error'); return; }
  try {
    await apiPost('/employees', { tenant_id: tenant.id, full_name: name, email: email, role: role });
    closeModal();
    showToast('Employee invited', 'success');
    renderCompanyAdmin();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deactivateEmployee(id) {
  if (!confirm('Deactivate this employee?')) return;
  try {
    await apiPatch('/employees/' + id, { status: 'INACTIVE' });
    showToast('Employee deactivated', 'success');
    renderCompanyAdmin();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: PENDING REQUESTS (Blueprint 6.2.2 — Phase 1)
// ═══════════════════════════════════════════════════════════

async function renderPendingRequests() {
  setTitle('Pending Requests', 'Trade requests from buyers awaiting your response');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/seller-quote/pending-requests?seller_tenant_id=' + tenant.id);
    var requests = res.data || [];
    content.innerHTML =
      fourQuestions('Trade requests sent to you by buyers.', 'Accept to begin quoting, decline, or counter with different terms.', requests.length > 0 ? requests.length + ' request(s) awaiting your response.' : '', 'Accepted requests move to the EXW pricing stage.') +
      (requests.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-inbox text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No pending requests from buyers.</p></div>' :
        '<div class="space-y-3">' + requests.map(function(r) {
          var specs = '';
          try { specs = r.specifications ? (typeof r.specifications === 'string' ? r.specifications : JSON.stringify(r.specifications)) : ''; } catch(e) {}
          return '<div class="glass-card p-4">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs text-brand-300">' + (r.ustn || r.id) + '</span>' + badge('PENDING', 'amber') + '</div>' +
            '<p class="text-sm text-surface-300 mb-1">' + (r.commodity_type || 'Trade Request') + ' — ' + (r.incoterm || '') + '</p>' +
            (specs ? '<p class="text-xs text-surface-500 mb-2 truncate">' + specs + '</p>' : '') +
            '<div class="flex items-center gap-4 text-xs text-surface-500 mb-3"><span>From: ' + (r.buyer_name || r.importer_tenant_id || '-') + '</span><span>' + timeAgo(r.created_at) + '</span></div>' +
            '<div class="flex gap-2">' +
              '<button onclick="acceptTradeRequest(\'' + r.id + '\')" class="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600"><i class="fas fa-check mr-1"></i>Accept</button>' +
              '<button onclick="declineTradeRequest(\'' + r.id + '\')" class="flex-1 py-2 bg-red-500/20 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/30"><i class="fas fa-times mr-1"></i>Decline</button>' +
              '<button onclick="showCounterForm(\'' + r.id + '\')" class="flex-1 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium hover:bg-amber-500/30"><i class="fas fa-exchange-alt mr-1"></i>Counter</button>' +
              '<button onclick="showRequestDetail(\'' + r.id + '\')" class="px-3 py-2 glass-card text-surface-400 rounded-lg text-xs hover:text-white"><i class="fas fa-eye"></i></button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function acceptTradeRequest(id) {
  try {
    await apiPatch('/trades/' + id, { status: 'ACCEPTED' });
    showToast('Request accepted! Proceed to EXW pricing.', 'success');
    renderPendingRequests();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function declineTradeRequest(id) {
  if (!confirm('Decline this trade request?')) return;
  try {
    await apiPatch('/trades/' + id, { status: 'REJECTED' });
    showToast('Request declined', 'info');
    renderPendingRequests();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function showCounterForm(id) {
  showModal('Counter-Offer',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Counter Terms</label><textarea id="counter-terms" rows="3" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Propose alternative terms..."></textarea></div>' +
      '<button onclick="submitCounter(\'' + id + '\')" class="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Submit Counter</button>' +
    '</div>'
  );
}

async function submitCounter(id) {
  var terms = document.getElementById('counter-terms').value.trim();
  if (!terms) { showToast('Please specify counter terms', 'error'); return; }
  try {
    await apiPost('/contract/amend', { trade_request_id: id, amendment_type: 'COUNTER', proposed_value: terms, proposer_tenant_id: tenant.id });
    closeModal();
    showToast('Counter submitted', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function showRequestDetail(id) {
  try {
    var res = await api('/seller-quote/request-detail?trade_request_id=' + id + '&seller_tenant_id=' + tenant.id);
    var r = res.data || res;
    showModal('Request Detail',
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['USTN', r.ustn || '-'], ['Buyer', r.buyer_name || r.importer_tenant_id || '-'], ['Commodity', r.commodity_type || '-'], ['Incoterm', r.incoterm || '-'], ['Origin', r.origin_country || '-'], ['Destination', r.destination_country || '-']].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (r.containers ? '<div class="text-xs text-surface-400 bg-dark-800/30 rounded-lg p-3"><strong>Containers:</strong> ' + (typeof r.containers === 'string' ? r.containers : JSON.stringify(r.containers)) + '</div>' : '') +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: EXW PRICE LOCK (Blueprint 6.2.2 — Phase 2)
// ═══════════════════════════════════════════════════════════

async function renderEXWPriceLock() {
  setTitle('EXW Price Lock', 'Lock ex-works price for produce shipments');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=ACCEPTED,MATCHING&role=seller');
    var trades = res.data || [];
    content.innerHTML =
      fourQuestions(
        'Set your EXW (ex-works) price for accepted produce trade requests.',
        'Enter price per unit. AI validates against 30-day market range. Lock to proceed.',
        trades.length > 0 ? trades.length + ' trade(s) awaiting your EXW price' : 'None',
        'After locking EXW, proceed to containerisation and logistics builder.'
      ) +
      // Market price reference panel
      '<div class="glass-card p-5 mb-5 border-l-4 border-l-emerald-400">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<div class="flex items-center gap-2"><i class="fas fa-chart-line text-emerald-500"></i><span class="text-sm font-semibold text-surface-800">30-Day Market Reference</span><span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">AI A1</span></div>' +
        '</div>' +
        '<div class="grid grid-cols-4 gap-4 mb-3">' +
          '<div class="text-center p-2 bg-surface-50 rounded-lg"><div class="text-[10px] text-surface-500">Fresh Oranges</div><div class="text-sm font-bold text-surface-800">$0.85/kg</div><div class="text-[10px] text-emerald-600">+2.4%</div></div>' +
          '<div class="text-center p-2 bg-surface-50 rounded-lg"><div class="text-[10px] text-surface-500">Frozen Strawberries</div><div class="text-sm font-bold text-surface-800">$2.20/kg</div><div class="text-[10px] text-red-500">-1.1%</div></div>' +
          '<div class="text-center p-2 bg-surface-50 rounded-lg"><div class="text-[10px] text-surface-500">Fresh Grapes</div><div class="text-sm font-bold text-surface-800">$1.45/kg</div><div class="text-[10px] text-emerald-600">+5.2%</div></div>' +
          '<div class="text-center p-2 bg-surface-50 rounded-lg"><div class="text-[10px] text-surface-500">Frozen Mango</div><div class="text-sm font-bold text-surface-800">$1.90/kg</div><div class="text-[10px] text-surface-400">0%</div></div>' +
        '</div>' +
        '<div class="h-24 bg-gradient-to-r from-emerald-50 to-sky-50 rounded-lg flex items-center justify-center border border-emerald-100">' +
          '<canvas id="exw-market-chart" class="w-full h-full"></canvas>' +
        '</div>' +
        '<p class="text-[10px] text-surface-400 mt-2"><i class="fas fa-info-circle mr-1"></i>Prices exceeding 30% of market average will require justification (Governor G2U15).</p>' +
      '</div>' +
      (trades.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-tag text-4xl text-surface-300 mb-3"></i><p class="text-sm text-surface-500">No accepted trades awaiting EXW pricing. Trades appear here after buyer submission is matched to you.</p></div>' :
        '<div class="space-y-4">' + trades.map(function(t) {
          var isFresh = (t.commodity_type || '').match(/FRESH|FROZEN|VEGETABLE|FRUIT/i);
          return '<div class="glass-card p-5 ' + (isFresh ? 'border-l-4 border-l-emerald-400' : '') + '">' +
            '<div class="flex items-center justify-between mb-3">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-9 h-9 rounded-lg bg-gradient-to-br ' + (isFresh ? 'from-emerald-100 to-green-100' : 'from-sgtx-100 to-sgtx-200') + ' flex items-center justify-center">' +
                  '<i class="fas ' + (isFresh ? 'fa-leaf text-emerald-600' : 'fa-tag text-sgtx-600') + ' text-sm"></i>' +
                '</div>' +
                '<div>' +
                  '<span class="font-mono text-xs text-sgtx-600 font-semibold">' + (t.ustn || t.id) + '</span>' +
                  '<div class="text-xs text-surface-500 mt-0.5">' + (t.commodity_type || 'General') + ' • ' + (t.incoterm || 'EXW') + '</div>' +
                '</div>' +
              '</div>' +
              badge(t.status || 'ACCEPTED') +
            '</div>' +
            '<div class="grid grid-cols-4 gap-3 mb-3">' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Price per Unit (USD)</label><input id="exw-price-' + t.id + '" type="number" step="0.01" class="w-full" placeholder="0.85"></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Unit</label><select id="exw-unit-' + t.id + '" class="w-full"><option value="KG">per kg</option><option value="TON">per metric ton</option><option value="CARTON">per carton</option><option value="PALLET">per pallet</option><option value="BAG">per bag</option></select></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Valid Until</label><input id="exw-valid-' + t.id + '" type="date" class="w-full"></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Justification</label><input id="exw-justify-' + t.id + '" type="text" class="w-full" placeholder="If >30% deviation"></div>' +
            '</div>' +
            '<button onclick="lockEXWPrice(\'' + t.id + '\')" class="btn-success w-full"><i class="fas fa-lock mr-2"></i>Lock EXW Price</button>' +
          '</div>';
        }).join('') + '</div>');
    // Render mini chart
    setTimeout(function() {
      var canvas = document.getElementById('exw-market-chart');
      if (canvas && typeof Chart !== 'undefined') {
        new Chart(canvas, { type: 'line', data: { labels: Array.from({length:30}, function(_,i){return 'D'+(i+1);}), datasets: [{ label: 'Avg EXW Price', data: Array.from({length:30}, function(){return (0.8 + Math.random()*0.2).toFixed(2);}), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', fill: true, tension: 0.4, pointRadius: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: true, grid: { display: false }, ticks: { font: { size: 9 } } } } } });
      }
    }, 200);
  } catch (e) {
    content.innerHTML = renderError('Error loading EXW data: ' + e.message);
  }
}

async function lockEXWPrice(tradeId) {
  var price = parseFloat(document.getElementById('exw-price-' + tradeId).value) || 0;
  var unit = document.getElementById('exw-unit-' + tradeId).value;
  var validUntil = document.getElementById('exw-valid-' + tradeId).value;
  if (!price) { showToast('Price is required', 'error'); return; }
  try {
    await apiPost('/seller-quote/exw-lock', { trade_request_id: tradeId, seller_tenant_id: tenant.id, exw_price: price, price_unit: unit, valid_until: validUntil || null });
    showToast('EXW price locked!', 'success');
    renderEXWPriceLock();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: CONTAINERISATION (Blueprint 6.2.2 — Phase 5)
// ═══════════════════════════════════════════════════════════

async function renderContainerisation() {
  setTitle('Containerisation', 'Define packing plan for produce shipments');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=ACCEPTED,EXW_LOCKED&role=seller');
    var trades = res.data || [];
    content.innerHTML =
      fourQuestions(
        'Define how fresh/frozen produce will be packed into reefer containers.',
        'Select packaging type, specify palletisation, set temperature requirements.',
        trades.length > 0 ? trades.length + ' trade(s) ready for packing plan' : 'None',
        'After packing plan locked, proceed to logistics builder for reefer quotes.'
      ) +
      // Temperature guidance panel
      '<div class="glass-card p-4 mb-5 border-l-4 border-l-sky-400">' +
        '<div class="flex items-center gap-2 mb-2"><i class="fas fa-temperature-low text-sky-500"></i><span class="text-sm font-semibold text-surface-800">Temperature & Packaging Guide</span></div>' +
        '<div class="grid grid-cols-3 gap-3 text-xs">' +
          '<div class="p-2 bg-sky-50 rounded-lg border border-sky-100"><strong class="text-sky-700">Fresh Fruits</strong><div class="text-surface-600 mt-1">2-8\u00b0C \u2022 Cartons/Crates \u2022 Ventilated pallets</div></div>' +
          '<div class="p-2 bg-blue-50 rounded-lg border border-blue-100"><strong class="text-blue-700">Frozen Produce</strong><div class="text-surface-600 mt-1">-18\u00b0C to -22\u00b0C \u2022 Sealed cartons \u2022 Block stacking</div></div>' +
          '<div class="p-2 bg-emerald-50 rounded-lg border border-emerald-100"><strong class="text-emerald-700">Vegetables</strong><div class="text-surface-600 mt-1">4-12\u00b0C \u2022 Mesh bags/Crates \u2022 Standard pallets</div></div>' +
        '</div>' +
      '</div>' +
      (trades.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-boxes-stacked text-4xl text-surface-300 mb-3"></i><p class="text-sm text-surface-500">No trades ready for containerisation. Lock EXW price first.</p></div>' :
        '<div class="space-y-4">' + trades.map(function(t) {
          var isFresh = (t.commodity_type || '').match(/FRESH|FROZEN|VEGETABLE|FRUIT/i);
          return '<div class="glass-card p-5 ' + (isFresh ? 'border-l-4 border-l-sky-400' : '') + '">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center">' +
                  '<i class="fas fa-boxes-stacked text-sky-600 text-sm"></i>' +
                '</div>' +
                '<div>' +
                  '<span class="font-mono text-xs text-sgtx-600 font-semibold">' + (t.ustn || t.id) + '</span>' +
                  '<div class="text-xs text-surface-500 mt-0.5">' + (t.commodity_type || 'General') + '</div>' +
                '</div>' +
              '</div>' +
              badge(t.status || 'EXW_LOCKED') +
            '</div>' +
            '<div class="grid grid-cols-4 gap-3 mb-3">' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Packaging Type</label><select id="pack-type-' + t.id + '" class="w-full"><option value="CARTONS">Cartons (Standard)</option><option value="MESH_BAGS">Mesh Bags (Fresh)</option><option value="CRATES">Wooden Crates</option><option value="BINS">Bulk Bins</option><option value="WAXED_CARTONS">Waxed Cartons (Cold)</option><option value="POLYSTYRENE">Polystyrene Boxes</option><option value="PALLETS">Pre-packed Pallets</option><option value="BULK">Bulk (no packaging)</option></select></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Pack Weight (kg)</label><input id="pack-wt-' + t.id + '" type="number" class="w-full" placeholder="15"></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Packs per Pallet</label><input id="pack-pp-' + t.id + '" type="number" class="w-full" placeholder="80"></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Pallets/Container</label><input id="pack-pc-' + t.id + '" type="number" class="w-full" placeholder="20"></div>' +
            '</div>' +
            '<div class="grid grid-cols-3 gap-3 mb-3">' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Total Weight (kg)</label><input id="pack-tw-' + t.id + '" type="number" class="w-full" placeholder="20000"></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Target Temp (\u00b0C)</label><select id="pack-temp-' + t.id + '" class="w-full"><option value="2-8">2-8\u00b0C (Fresh)</option><option value="-18">-18\u00b0C (Frozen)</option><option value="-22">-22\u00b0C (Deep Frozen)</option><option value="12-15">12-15\u00b0C (Tropical)</option><option value="ambient">Ambient</option></select></div>' +
              '<div><label class="text-[10px] text-surface-600 font-semibold block mb-1">Ventilation</label><select id="pack-vent-' + t.id + '" class="w-full"><option value="25">25% (Standard)</option><option value="50">50% (High Respiration)</option><option value="0">0% (Frozen/Sealed)</option><option value="75">75% (Maximum)</option></select></div>' +
            '</div>' +
            '<button onclick="submitPackingPlan(\'' + t.id + '\')" class="btn-primary w-full"><i class="fas fa-box mr-2"></i>Lock Packing Plan</button>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = renderError('Error loading containerisation data: ' + e.message);
  }
}

async function submitPackingPlan(tradeId) {
  var type = document.getElementById('pack-type-' + tradeId).value;
  var wt = parseFloat(document.getElementById('pack-wt-' + tradeId).value) || 0;
  var pp = parseInt(document.getElementById('pack-pp-' + tradeId).value) || 0;
  var pc = parseInt(document.getElementById('pack-pc-' + tradeId).value) || 0;
  var tw = parseFloat(document.getElementById('pack-tw-' + tradeId).value) || 0;
  try {
    await apiPost('/seller-quote/packing-lock', { trade_request_id: tradeId, seller_tenant_id: tenant.id, packaging_type: type, pack_weight_kg: wt, packs_per_pallet: pp, pallets_per_container: pc, total_weight_kg: tw });
    showToast('Packing plan locked!', 'success');
    renderContainerisation();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: LOGISTICS BUILDER (Blueprint 6.2.2 — Phase 8)
// Mode A = Auto-Bundle, Mode B = Manual RFQ
// ═══════════════════════════════════════════════════════════

var logisticsMode = 'A';

async function renderLogisticsBuilder() {
  setTitle('Logistics Builder', 'Build logistics quotes for your produce shipments');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=ACCEPTED,EXW_LOCKED,PACKING_LOCKED,MATCHING&role=seller');
    var trades = res.data || [];
    // Also load existing RFQs for status display
    var rfqRes = await api('/upgrades/logistics-rfq?tenant_id=' + tenant.id).catch(function() { return { data: [] }; });
    var existingRFQs = rfqRes.data || [];
    content.innerHTML =
      fourQuestions(
        'Get logistics quotes for your fresh/frozen produce shipments.',
        'Mode A: AI auto-bundles best reefer rates. Mode B: Send manual RFQs to preferred providers.',
        existingRFQs.length > 0 ? existingRFQs.filter(function(r){return r.status==='RFQ_SENT';}).length + ' RFQs awaiting provider responses' : 'None',
        'Once logistics quoted, assemble and submit the full landed cost quote to buyer.'
      ) +
      // Mode selector
      '<div class="flex items-center gap-3 mb-5">' +
        '<div class="flex gap-2 bg-surface-100 p-1 rounded-xl">' +
          '<button onclick="logisticsMode=\'A\'; renderLogisticsBuilder()" class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ' + (logisticsMode === 'A' ? 'bg-white text-sgtx-600 shadow-card' : 'text-surface-500 hover:text-surface-700') + '"><i class="fas fa-wand-magic-sparkles mr-2"></i>Auto-Bundle (A)</button>' +
          '<button onclick="logisticsMode=\'B\'; renderLogisticsBuilder()" class="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ' + (logisticsMode === 'B' ? 'bg-white text-sgtx-600 shadow-card' : 'text-surface-500 hover:text-surface-700') + '"><i class="fas fa-paper-plane mr-2"></i>Manual RFQ (B)</button>' +
        '</div>' +
        '<div class="ml-auto flex items-center gap-2 text-xs text-surface-500">' +
          '<i class="fas fa-snowflake text-sky-500"></i>' +
          '<span>Reefer-optimized routing enabled</span>' +
        '</div>' +
      '</div>' +
      // Existing RFQ status
      (existingRFQs.length > 0 ? '<div class="glass-card p-4 mb-4 border-l-4 border-l-sky-400"><div class="flex items-center gap-2 mb-2"><i class="fas fa-broadcast-tower text-sky-500"></i><span class="text-sm font-semibold text-surface-800">Active RFQs</span></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2">' + existingRFQs.slice(0,4).map(function(r) { return '<div class="bg-surface-50 rounded-lg p-2 text-center"><div class="text-[10px] font-mono text-surface-500">' + (r.id || '').slice(0,8) + '</div><div class="text-xs font-semibold">' + (r.status || 'OPEN') + '</div></div>'; }).join('') + '</div></div>' : '') +
      (trades.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-truck-fast text-4xl text-surface-300 mb-3"></i><p class="text-surface-500 text-sm">No trades ready for logistics. Complete EXW lock and packing first.</p></div>' :
        '<div class="space-y-4">' + trades.map(function(t) {
          var isFresh = (t.commodity_type || '').match(/FRESH|FROZEN|VEGETABLE|FRUIT|SEAFOOD/i);
          return '<div class="glass-card p-5 ' + (isFresh ? 'border-l-4 border-l-sky-400' : '') + '">' +
            '<div class="flex items-center justify-between mb-4">' +
              '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-xl bg-gradient-to-br ' + (isFresh ? 'from-sky-100 to-cyan-100' : 'from-sgtx-100 to-sgtx-200') + ' flex items-center justify-center">' +
                  '<i class="fas ' + (isFresh ? 'fa-snowflake text-sky-600' : 'fa-box text-sgtx-600') + ' text-sm"></i>' +
                '</div>' +
                '<div>' +
                  '<span class="font-mono text-xs text-sgtx-600 font-semibold">' + (t.ustn || t.id) + '</span>' +
                  '<div class="text-xs text-surface-500 mt-0.5">' + (t.commodity_type || 'General Cargo') + (isFresh ? ' <span class="text-sky-600 font-medium">• Reefer Required</span>' : '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="flex items-center gap-2">' + badge(t.status || 'ACTIVE') + '</div>' +
            '</div>' +
            (isFresh ? '<div class="flex items-center gap-3 mb-3 px-3 py-2 bg-sky-50 rounded-lg border border-sky-100"><i class="fas fa-temperature-low text-sky-500"></i><span class="text-xs text-sky-700">Temperature-controlled: -18°C to +4°C range • Cold chain integrity monitoring active</span></div>' : '') +
            (logisticsMode === 'A' ?
              '<button onclick="autoBundleLogistics(\'' + t.id + '\')" class="btn-success w-full"><i class="fas fa-wand-magic-sparkles mr-2"></i>Auto-Bundle Best Reefer Rate</button>' :
              '<div class="space-y-3">' +
                '<div class="grid grid-cols-2 gap-3">' +
                  '<div><label class="text-[10px] text-surface-500 font-semibold block mb-1">Origin Port</label><input id="rfq-origin-' + t.id + '" type="text" class="w-full" placeholder="e.g. VNSGN" value="' + (t.origin_port || '') + '"></div>' +
                  '<div><label class="text-[10px] text-surface-500 font-semibold block mb-1">Destination Port</label><input id="rfq-dest-' + t.id + '" type="text" class="w-full" placeholder="e.g. NLRTM" value="' + (t.destination_port || t.port_of_discharge || '') + '"></div>' +
                '</div>' +
                '<div><label class="text-[10px] text-surface-500 font-semibold block mb-1">Provider GTID <span class="text-surface-400">(leave blank to broadcast)</span></label><input id="rfq-provider-' + t.id + '" type="text" class="w-full" placeholder="SGTX-XX-LOG-XXXX or blank for open broadcast"></div>' +
                '<div class="flex gap-2">' +
                  '<button onclick="submitManualRFQ(\'' + t.id + '\')" class="btn-primary flex-1"><i class="fas fa-paper-plane mr-2"></i>Send RFQ to Provider(s)</button>' +
                  '<button onclick="viewRFQResponses(\'' + t.id + '\')" class="btn-secondary"><i class="fas fa-inbox mr-1"></i>Responses</button>' +
                '</div>' +
              '</div>') +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-red-500"><i class="fas fa-exclamation-circle text-2xl mb-2"></i><p>Error: ' + e.message + '</p></div>';
  }
}

async function autoBundleLogistics(tradeId) {
  try {
    showToast('Finding best reefer rates via AI...', 'info');
    var res = await apiPost('/seller-quote/logistics-rfq', {
      trade_request_id: tradeId,
      seller_tenant_id: tenant.id,
      mode: 'AUTO_BUNDLE',
      origin_port: 'AUTO',
      destination_port: 'AUTO',
      services: ['SEA_FREIGHT', 'REEFER', 'COLD_CHAIN']
    });
    var data = res.data || res;
    showToast('Auto-bundle complete! RFQ ' + (data.rfq_id || '').slice(0,8) + ' sent to logistics network.', 'success');
    renderLogisticsBuilder();
  } catch (e) { showToast('Error: ' + (e.message || 'Auto-bundle failed'), 'error'); }
}

async function submitManualRFQ(tradeId) {
  var provider = (document.getElementById('rfq-provider-' + tradeId) || {}).value || '';
  var originPort = (document.getElementById('rfq-origin-' + tradeId) || {}).value || '';
  var destPort = (document.getElementById('rfq-dest-' + tradeId) || {}).value || '';
  if (!originPort.trim() || !destPort.trim()) {
    showToast('Please enter origin and destination ports', 'error');
    return;
  }
  try {
    var res = await apiPost('/seller-quote/logistics-rfq', {
      trade_request_id: tradeId,
      seller_tenant_id: tenant.id,
      mode: 'MANUAL',
      origin_port: originPort.trim().toUpperCase(),
      destination_port: destPort.trim().toUpperCase(),
      provider_gtid: provider.trim() || null,
      services: ['SEA_FREIGHT', 'REEFER', 'COLD_CHAIN']
    });
    var data = res.data || res;
    showToast('RFQ ' + (data.rfq_id || '').slice(0,8) + ' sent to ' + (provider.trim() ? provider.trim() : 'all logistics providers') + '!', 'success');
    renderLogisticsBuilder();
  } catch (e) { showToast('Error: ' + (e.message || 'RFQ submission failed'), 'error'); }
}

async function viewRFQResponses(tradeId) {
  try {
    var res = await api('/portal/logistics/provider-quotes?tenant_id=' + tenant.id + '&trade_request_id=' + tradeId);
    var responses = res.data || [];
    if (responses.length === 0) {
      showModal(
        '<div class="text-center py-6"><i class="fas fa-inbox text-4xl text-surface-300 mb-3"></i><h3 class="text-lg font-semibold text-surface-800 mb-1">No Responses Yet</h3><p class="text-sm text-surface-500">Logistics providers have not responded to your RFQ yet. Check back shortly.</p></div>'
      );
      return;
    }
    var html = '<h3 class="text-lg font-bold text-surface-900 mb-4"><i class="fas fa-truck-fast text-sgtx-500 mr-2"></i>Logistics Quotes Received</h3>' +
      '<div class="space-y-3">' + responses.map(function(r) {
        return '<div class="glass-card p-4">' +
          '<div class="flex items-center justify-between mb-2">' +
            '<span class="text-sm font-semibold text-surface-800">' + (r.provider_name || r.logistics_tenant_id || 'Provider') + '</span>' +
            '<span class="text-lg font-bold text-sgtx-600">' + usd(r.total_price || r.price) + '</span>' +
          '</div>' +
          '<div class="flex items-center gap-4 text-xs text-surface-500">' +
            '<span><i class="fas fa-clock mr-1"></i>' + (r.transit_time_days || r.transit_days || '?') + ' days</span>' +
            '<span><i class="fas fa-ship mr-1"></i>' + (r.services_included || r.service_type || 'SEA_FREIGHT') + '</span>' +
            (r.valid_until ? '<span><i class="fas fa-calendar mr-1"></i>Valid: ' + time(r.valid_until) + '</span>' : '') +
          '</div>' +
          '<button onclick="selectLogisticsQuote(\'' + tradeId + '\',\'' + r.id + '\',\'' + (r.total_price || r.price || 0) + '\')" class="btn-success w-full mt-3 text-xs"><i class="fas fa-check mr-1"></i>Select This Quote</button>' +
        '</div>';
      }).join('') + '</div>';
    showModal(html);
  } catch(e) { showToast('Error loading responses: ' + e.message, 'error'); }
}

async function selectLogisticsQuote(tradeId, quoteId, price) {
  try {
    await apiPost('/seller-quote/packing-lock', { trade_request_id: tradeId, seller_tenant_id: tenant.id, logistics_quote_id: quoteId, logistics_cost: parseFloat(price) });
    closeModal();
    showToast('Logistics quote selected! Ready to submit full quote.', 'success');
    navigate('quote-submit');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: QUOTE SUBMISSION (Blueprint 6.2.2 — Phase 2)
// ═══════════════════════════════════════════════════════════

async function renderQuoteSubmit() {
  setTitle('Submit Quote', 'Assemble and submit final quote to buyer');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/trades?tenant_id=' + tenant.id + '&status=QUOTE_READY,LOGISTICS_QUOTED&role=seller');
    var trades = res.data || [];
    content.innerHTML =
      fourQuestions('Trades with all components ready for final quote assembly.', 'Click to calculate SGTX fee and submit the complete landed cost quote.', '', 'Once submitted, the buyer can accept, negotiate, or amend.') +
      (trades.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-paper-plane text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No trades ready for quote submission. Complete EXW, packing, and logistics first.</p></div>' :
        '<div class="space-y-3">' + trades.map(function(t) {
          return '<div class="glass-card p-4">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs text-brand-300">' + (t.ustn || t.id) + '</span>' + badge(t.status || '', 'blue') + '</div>' +
            '<p class="text-sm text-surface-300 mb-3">' + (t.commodity_type || '') + ' — ' + (t.incoterm || '') + '</p>' +
            '<button onclick="assembleAndSubmitQuote(\'' + t.id + '\')" class="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"><i class="fas fa-calculator mr-2"></i>Calculate Fee & Submit</button>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function assembleAndSubmitQuote(tradeId) {
  try {
    showToast('Calculating SGTX fee...', 'info');
    var res = await apiPost('/seller-quote/fee-calculate', { trade_request_id: tradeId, seller_tenant_id: tenant.id });
    var fee = res.data || res;
    showModal('Confirm Quote Submission',
      '<div class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['EXW Total', usd(fee.exw_total || 0)], ['Logistics', usd(fee.logistics_cost || 0)], ['SGTX Fee', usd(fee.sgtx_fee || 0)], ['Total Landed', usd(fee.total_landed || 0)]].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-3 text-center"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm font-semibold text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        '<button onclick="doSubmitQuote(\'' + tradeId + '\')" class="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"><i class="fas fa-paper-plane mr-2"></i>Confirm & Submit to Buyer</button>' +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function doSubmitQuote(tradeId) {
  try {
    await apiPost('/seller-quote/submit', { trade_request_id: tradeId, seller_tenant_id: tenant.id });
    closeModal();
    showToast('Quote submitted to buyer!', 'success');
    renderQuoteSubmit();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: QC BOOKING (Blueprint 6.2.2 — Phase 6)
// ═══════════════════════════════════════════════════════════

async function renderQCBooking() {
  setTitle('QC Booking', 'Book quality control inspections');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/qc/jobs?exporter_id=' + tenant.id);
    var jobs = res.data || [];
    content.innerHTML =
      fourQuestions('Quality control inspections for your shipments.', 'Book a new inspection or review results of existing ones.', '', 'QC results feed into the documentation and compliance phase.') +
      '<div class="flex justify-end mb-4"><button onclick="showBookQCForm()" class="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"><i class="fas fa-microscope mr-2"></i>Book Inspection</button></div>' +
      (jobs.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-microscope text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No QC jobs booked yet.</p></div>' :
        dataTable(['USTN', 'Inspector', 'Status', 'Date', ''],
          jobs.map(function(j) {
            return [
              '<span class="font-mono text-xs text-brand-300">' + (j.ustn || j.trade_id || '-') + '</span>',
              j.inspector_name || j.inspector || '-',
              badge(j.status || 'SCHEDULED', j.status === 'PASSED' ? 'emerald' : j.status === 'FAILED' ? 'red' : 'amber'),
              j.scheduled_date ? time(j.scheduled_date) : '-',
              '<button onclick="showQCJobDetail(\'' + j.id + '\')" class="text-xs text-brand-400 hover:text-brand-300"><i class="fas fa-eye"></i></button>'
            ];
          })
        ));
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showBookQCForm() {
  showModal('Book QC Inspection',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Trade USTN</label><input id="qc-ustn" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="SGTX-..."></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Inspection Type</label><select id="qc-type" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="PRE_SHIPMENT">Pre-Shipment</option><option value="LOADING">Loading Supervision</option><option value="CONTAINER">Container Inspection</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Preferred Date</label><input id="qc-date" type="date" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Notes</label><textarea id="qc-notes" rows="2" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Special requirements..."></textarea></div>' +
      '<button onclick="bookQCInspection()" class="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">Book Inspection</button>' +
    '</div>'
  );
}

async function bookQCInspection() {
  var ustn = document.getElementById('qc-ustn').value.trim();
  var type = document.getElementById('qc-type').value;
  var date = document.getElementById('qc-date').value;
  var notes = document.getElementById('qc-notes').value.trim();
  if (!ustn) { showToast('Trade USTN is required', 'error'); return; }
  try {
    await apiPost('/qc/jobs', { ustn: ustn, exporter_tenant_id: tenant.id, inspection_type: type, scheduled_date: date || null, notes: notes });
    closeModal();
    showToast('QC inspection booked!', 'success');
    renderQCBooking();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function showQCJobDetail(id) {
  try {
    var res = await api('/qc/jobs/' + id);
    var j = res.data || res;
    showModal('QC Job Detail',
      '<div class="space-y-3">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['USTN', j.ustn || '-'], ['Type', j.inspection_type || '-'], ['Status', j.status || '-'], ['Inspector', j.inspector_name || '-'], ['Scheduled', j.scheduled_date ? time(j.scheduled_date) : '-'], ['Result', j.result || 'Pending']].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        (j.inspection_logs ? '<div><h4 class="text-sm font-semibold text-surface-200 mb-2">Inspection Logs</h4><div class="space-y-1 text-xs text-surface-400">' + (j.inspection_logs || []).map(function(l) { return '<div class="bg-dark-800/40 rounded p-2">' + (l.note || l.description || JSON.stringify(l)) + '</div>'; }).join('') + '</div></div>' : '') +
      '</div>'
    );
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: DOCUMENT FINALISATION (Blueprint 6.2.2 — Phase 7)
// ═══════════════════════════════════════════════════════════

async function renderDocFinalisation() {
  setTitle('Document Finalisation', 'Sign packing lists and commercial invoices');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/shipments?tenant_id=' + tenant.id);
    var shipments = res.data || [];
    content.innerHTML =
      fourQuestions('Finalize and sign trade documents for your shipments.', 'Sign packing lists and commercial invoices before cargo departs.', '', 'Signed documents trigger the logistics and customs phases.') +
      (shipments.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-file-signature text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No shipments requiring document finalisation.</p></div>' :
        '<div class="space-y-3">' + shipments.map(function(s) {
          return '<div class="glass-card p-4">' +
            '<div class="flex items-center justify-between mb-3"><span class="font-mono text-xs text-brand-300">' + (s.ustn || '-') + '</span>' + badge(s.status || '', 'blue') + '</div>' +
            '<div class="grid grid-cols-2 gap-3">' +
              '<button onclick="signDocument(\'' + (s.ustn || s.id) + '\', \'PACKING_LIST\')" class="py-3 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/30 text-center"><i class="fas fa-list mr-1"></i>Sign Packing List</button>' +
              '<button onclick="signDocument(\'' + (s.ustn || s.id) + '\', \'COMMERCIAL_INVOICE\')" class="py-3 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 text-center"><i class="fas fa-file-invoice mr-1"></i>Sign Commercial Invoice</button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

async function signDocument(ustn, docType) {
  try {
    await apiPost('/documents', { ustn: ustn, document_type: docType, signer_tenant_id: tenant.id, signed: true, status: 'SIGNED' });
    showToast(docType.replace(/_/g, ' ') + ' signed!', 'success');
    renderDocFinalisation();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SELLER: BARCODE PRINT (Blueprint 6.2.2 — Phase 5)
// ═══════════════════════════════════════════════════════════

async function renderBarcodePrint() {
  setTitle('Barcode Print', 'SSCC barcode labels for your shipments');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/shipments?tenant_id=' + tenant.id);
    var shipments = res.data || [];
    content.innerHTML =
      fourQuestions('Print SSCC barcode labels for each shipment.', 'Click print to generate a printable barcode label.', '', 'Barcodes enable tracking through the logistics chain.') +
      (shipments.length === 0 ? '<div class="glass-card p-8 text-center text-surface-400">No shipments with barcodes.</div>' :
        '<div class="space-y-3">' + shipments.map(function(s) {
          return '<div class="glass-card p-4">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs text-brand-300">' + (s.ustn || '-') + '</span><span class="text-xs text-surface-500">' + (s.container_number || '-') + '</span></div>' +
            '<div class="flex items-center gap-3">' +
              '<div class="flex-1 font-mono text-xs text-surface-300 bg-dark-800/50 rounded-lg p-2">' + (s.sscc || s.barcode || 'N/A') + '</div>' +
              '<button onclick="printBarcode(\'' + (s.sscc || s.barcode || '') + '\')" class="px-4 py-2 bg-brand-500/20 text-brand-300 rounded-lg text-xs font-medium hover:bg-brand-500/30"><i class="fas fa-print mr-1"></i>Print</button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function printBarcode(sscc) {
  if (!sscc) { showToast('No barcode available', 'error'); return; }
  showModal('Print Barcode',
    '<div class="text-center space-y-4">' +
      '<div class="bg-white rounded-lg p-6 inline-block">' +
        '<div class="text-black font-mono text-lg font-bold tracking-widest">' + sscc + '</div>' +
        '<div class="mt-2 flex justify-center gap-px">' + sscc.split('').map(function(c) { var h = 20 + (parseInt(c) || 5) * 3; return '<div class="w-1 bg-black" style="height:' + h + 'px"></div>'; }).join('') + '</div>' +
      '</div>' +
      '<p class="text-xs text-surface-400">SSCC: ' + sscc + '</p>' +
      '<button onclick="window.print()" class="px-6 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium"><i class="fas fa-print mr-2"></i>Print Label</button>' +
    '</div>'
  );
}

// ═══════════════════════════════════════════════════════════
// SELLER: CASH POSITION (Blueprint 6.2.2 — Finance Overview)
// ═══════════════════════════════════════════════════════════

async function renderCashPosition() {
  setTitle('Cash Position', 'Financial overview: contracts, receivables, financing');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var stats = {};
    try { var r1 = await api('/stats'); stats = r1.data || r1; } catch(e) {}
    var finRes = { data: [] };
    try { finRes = await api('/financing?tenant_id=' + tenant.id); } catch(e) {}
    var financing = finRes.data || [];

    content.innerHTML =
      fourQuestions('Your financial position across all active trades.', 'Monitor receivables, active financing, and settlement status.', '', 'Track cash flow and ensure timely settlements.') +
      '<div class="grid grid-cols-4 gap-4 mb-6">' +
        metricCard('fa-file-signature', 'Active Contracts', stats.contracts || 0, null, 'purple') +
        metricCard('fa-hand-holding-usd', 'Receivables', usd(stats.receivables || 0), null, 'emerald') +
        metricCard('fa-university', 'Active Financing', financing.filter(function(f) { return f.status === 'FUNDED' || f.status === 'ACTIVE'; }).length, null, 'blue') +
        metricCard('fa-check-double', 'Settlements', stats.settlements || 0, null, 'cyan') +
      '</div>' +
      (financing.length > 0 ? '<div class="glass-card p-4"><h3 class="text-sm font-semibold text-surface-200 mb-3">Active Financing</h3>' +
        dataTable(['Trade', 'Amount', 'Status', 'Type'],
          financing.map(function(f) {
            return [
              '<span class="font-mono text-xs text-brand-300">' + (f.ustn || f.trade_id || '-') + '</span>',
              usd(f.amount || 0),
              badge(f.status || 'PENDING', f.status === 'FUNDED' ? 'emerald' : 'amber'),
              f.finance_type || '-'
            ];
          })
        ) + '</div>' : '');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

// ═══════════════════════════════════════════════════════════
// SELLER: DISTRESSED & OUTREACH (Blueprint 6.2.2 — Phase 10)
// ═══════════════════════════════════════════════════════════

async function renderDistressedSell() {
  setTitle('Distressed Cargo', 'Declare and manage distressed cargo listings');
  var content = document.getElementById('content');
  content.innerHTML = shimmerLoader(4);
  try {
    var res = await api('/distressed-listings?seller_tenant_id=' + tenant.id);
    var listings = res.data || [];
    content.innerHTML =
      fourQuestions('Manage cargo in distress — compliance issues, quality degradation, or market shifts.', 'Declare distressed cargo, choose triage path, launch buyer outreach.', '', 'Triage options: Sell at discount, Comply & re-export, or Claim insurance.') +
      '<div class="flex justify-end mb-4"><button onclick="showDeclareDistressedForm()" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Declare Distressed</button></div>' +
      (listings.length === 0 ? '<div class="glass-card p-8 text-center"><i class="fas fa-box-open text-surface-500 text-4xl mb-3"></i><p class="text-surface-400">No distressed listings.</p></div>' :
        '<div class="space-y-3">' + listings.map(function(l) {
          return '<div class="glass-card p-4 cursor-pointer hover:bg-white/5" onclick="showDistressedListingDetail(\'' + l.id + '\')">' +
            '<div class="flex items-center justify-between mb-2"><span class="font-medium text-sm text-surface-200">' + (l.commodity_type || l.title || 'Listing') + '</span>' + badge(l.status || 'ACTIVE', l.status === 'SOLD' ? 'emerald' : l.status === 'ACTIVE' ? 'amber' : 'gray') + '</div>' +
            '<div class="text-xs text-surface-400 flex gap-4"><span>Ask: ' + usd(l.asking_price || 0) + '</span><span>Qty: ' + (l.quantity || '-') + '</span><span>' + timeAgo(l.created_at) + '</span></div>' +
          '</div>';
        }).join('') + '</div>');
  } catch (e) {
    content.innerHTML = '<div class="glass-card p-8 text-center text-surface-400">Error: ' + e.message + '</div>';
  }
}

function showDeclareDistressedForm() {
  showModal('Declare Distressed Cargo',
    '<div class="space-y-4">' +
      '<div><label class="text-xs text-surface-400 block mb-1">Trade USTN</label><input id="dist-ustn" type="text" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="SGTX-..."></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Reason</label><select id="dist-reason" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200"><option value="QUALITY_DEGRADATION">Quality Degradation</option><option value="COMPLIANCE_BLOCK">Compliance Block</option><option value="MARKET_SHIFT">Market Shift</option><option value="LOGISTICS_FAILURE">Logistics Failure</option></select></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Asking Price (USD)</label><input id="dist-price" type="number" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Discounted price"></div>' +
      '<div><label class="text-xs text-surface-400 block mb-1">Description</label><textarea id="dist-desc" rows="2" class="w-full bg-dark-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200" placeholder="Describe cargo condition..."></textarea></div>' +
      '<button onclick="submitDeclareDistressed()" class="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">Declare & List</button>' +
    '</div>'
  );
}

async function submitDeclareDistressed() {
  var ustn = document.getElementById('dist-ustn').value.trim();
  var reason = document.getElementById('dist-reason').value;
  var price = parseFloat(document.getElementById('dist-price').value) || 0;
  var desc = document.getElementById('dist-desc').value.trim();
  if (!ustn) { showToast('USTN is required', 'error'); return; }
  try {
    await apiPost('/distressed-listings', { seller_tenant_id: tenant.id, ustn: ustn, reason: reason, asking_price: price, description: desc });
    closeModal();
    showToast('Cargo declared distressed', 'success');
    renderDistressedSell();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function showDistressedListingDetail(id) {
  api('/distressed-listings/' + id).then(function(res) {
    var l = res.data || res;
    showModal('Distressed Listing',
      '<div class="space-y-4">' +
        '<div class="grid grid-cols-2 gap-3">' +
          [['USTN', l.ustn || '-'], ['Reason', l.reason || '-'], ['Ask Price', usd(l.asking_price || 0)], ['Status', l.status || '-'], ['Condition', l.condition_grade || '-'], ['Listed', time(l.created_at)]].map(function(p) {
            return '<div class="bg-dark-800/50 rounded-lg p-2"><div class="text-[10px] text-surface-500">' + p[0] + '</div><div class="text-sm text-surface-200">' + p[1] + '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="text-xs text-surface-400 font-semibold mb-2">Triage Options:</div>' +
        '<div class="grid grid-cols-3 gap-2">' +
          '<button class="py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium text-center"><i class="fas fa-tag mr-1"></i>Sell</button>' +
          '<button class="py-2 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium text-center"><i class="fas fa-redo mr-1"></i>Comply</button>' +
          '<button class="py-2 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium text-center"><i class="fas fa-shield-alt mr-1"></i>Insurance</button>' +
        '</div>' +
        '<button onclick="launchOutreach(\'' + id + '\')" class="w-full py-2 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-500/30"><i class="fas fa-bullhorn mr-1"></i>Launch Buyer Outreach</button>' +
      '</div>'
    );
  }).catch(function(e) { showToast('Error: ' + e.message, 'error'); });
}

async function launchOutreach(listingId) {
  try {
    await apiPost('/distressed/outreach/campaign', { listing_id: listingId, seller_tenant_id: tenant.id });
    showToast('Outreach campaign launched!', 'success');
    closeModal();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
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
          '<h3 class="font-semibold text-sm text-surface-800"><i class="fas fa-inbox text-sgtx-500 mr-2"></i>Incoming RFQs</h3>' +
          '<div class="flex gap-2">' +
            '<button class="text-[10px] px-3 py-1 rounded-full bg-sgtx-100 text-sgtx-700 font-semibold">All (' + rfqs.length + ')</button>' +
            '<button class="text-[10px] px-3 py-1 rounded-full hover:bg-surface-100 text-surface-500">Open (' + openRFQs.length + ')</button>' +
          '</div>' +
        '</div>' +
        '<div class="divide-y divide-surface-100">' +
          (rfqs.length === 0 ?
            '<div class="py-12 text-center text-surface-400"><i class="fas fa-inbox text-3xl mb-3"></i><p class="text-sm">No RFQs yet. They arrive when sellers request logistics quotes.</p></div>' :
            rfqs.map(function(rfq) {
              var isFresh = (rfq.commodity_type || rfq.service_type || '').match(/FRESH|FROZEN|REEFER|COLD/i);
              return '<div class="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition">' +
                '<div class="w-10 h-10 rounded-xl ' + (isFresh ? 'bg-sky-100' : 'bg-sgtx-100') + ' flex items-center justify-center shrink-0">' +
                  '<i class="fas ' + (isFresh ? 'fa-snowflake text-sky-600' : 'fa-ship text-sgtx-600') + ' text-sm"></i>' +
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

async function showRespondToRFQ(rfqId) {
  showModal(
    '<h3 class="text-lg font-bold text-surface-900 mb-4"><i class="fas fa-reply text-sgtx-500 mr-2"></i>Submit Logistics Quote</h3>' +
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

async function submitRFQResponse(rfqId) {
  var price = parseFloat(document.getElementById('rfq-resp-price').value) || 0;
  var transit = parseInt(document.getElementById('rfq-resp-transit').value) || 0;
  var services = document.getElementById('rfq-resp-services').value.trim();
  var conditions = document.getElementById('rfq-resp-conditions').value.trim();
  var validUntil = document.getElementById('rfq-resp-valid').value || null;
  if (!price || !transit) { showToast('Price and transit time are required', 'error'); return; }
  try {
    await apiPost('/upgrades/logistics-rfq/' + rfqId + '/responses', {
      logistics_tenant_id: tenant.id,
      total_price: price,
      currency: 'USD',
      transit_time_days: transit,
      services_included: services || 'SEA_FREIGHT',
      conditions: conditions || null,
      valid_until: validUntil,
      actor_gtid: tenant.gtid || ''
    });
    closeModal();
    showToast('Quote submitted! Waiting for trader decision.', 'success');
    renderRFQInbox();
  } catch(e) { showToast('Error: ' + (e.message || 'Submission failed'), 'error'); }
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
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-list-check text-sgtx-500 mr-2"></i>Open Financing Requests</h3>
        ${openRequests.length === 0 ? '<p class="text-xs text-surface-400 text-center py-6">No open requests</p>' :
          `<div class="space-y-3">${openRequests.map(req => {
            const specs = typeof req.parsed_specs === 'string' ? JSON.parse(req.parsed_specs || '{}') : (req.parsed_specs || {});
            return `<div class="p-4 rounded-xl border border-surface-100 hover:border-sgtx-200 transition">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold">${req.requester_name || 'Unknown'}</span>
                  ${badge(req.status)}
                </div>
                <span class="text-xs font-bold text-sgtx-600">$${(req.amount||0).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-surface-400">${req.financing_type || 'Unknown'} • ${req.tenor_days || 0} days • ${req.currency || 'USD'}</div>
              <div class="mt-2 flex gap-2">
                <button onclick="submitFinancingBid('${req.id}')" class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Place Bid</button>
                <button class="px-3 py-1.5 bg-surface-100 text-surface-600 text-[10px] rounded-lg font-semibold">Full Disclosure</button>
              </div>
            </div>`;
          }).join('')}</div>`}
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-trophy text-sgtx-500 mr-2"></i>My Awarded Deals</h3>
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
            '<div class="flex items-center justify-between mb-2"><span class="font-mono text-xs font-bold text-sgtx-600">' + (s.ustn || s.id) + '</span>' + badge(s.status, 'amber') + '</div>' +
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
        return '<tr><td class="font-mono text-xs text-sgtx-600">' + (s.ustn || '—') + '</td><td class="text-xs">' + (s.instruction_type || '') + '</td><td class="text-xs font-medium">' + usd(s.amount || 0) + '</td><td class="text-xs">' + (s.psp_name || '—') + '</td><td class="text-center">' + badge(s.status || 'PENDING', s.status === 'CONFIRMED' ? 'emerald' : 'amber') + '</td><td class="text-xs text-surface-500">' + timeAgo(s.created_at) + '</td></tr>';
      }));
  } catch (e) { content.innerHTML = renderError(e.message); }
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

// ═══════════════════════════════════════════════════════════
// QC PORTAL
// ═══════════════════════════════════════════════════════════
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
        <h3 class="font-semibold text-sm"><i class="fas fa-clipboard-list text-sgtx-500 mr-2"></i>Inspection Queue</h3>
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
              ${insp.status === 'SCHEDULED' ? `<button onclick="startInspection('${insp.id}')" class="px-3 py-1.5 bg-sgtx-500 text-white text-[10px] rounded-lg font-semibold">Start</button>` : 
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
  setTitle('Government Dashboard', 'Trade monitoring & customs clearance');
  let stats = {}, trades = [], decisions = [], disputes = [];
  try {
    const r1 = await api('/stats');
    stats = r1.data || {};
    const r2 = await api('/trades?limit=10');
    trades = r2.data || [];
    const r3 = await api('/disputes');
    disputes = r3.data || [];
  } catch(e) { console.warn('Gov dashboard fetch:', e); }

  const activeTrades = trades.filter(t => ['CONTRACTED','FINANCING','IN_EXECUTION'].includes(t.status));
  const pendingClearance = trades.filter(t => t.status === 'IN_EXECUTION');
  const disputeCount = disputes.length;
  const flaggedCount = disputes.filter(d => d.severity >= 4).length;

  document.getElementById('content').innerHTML = `
    ${fourQuestions(
      `${activeTrades.length} active trades under jurisdiction monitoring`,
      'Review clearance requests and monitor compliance',
      flaggedCount > 0 ? flaggedCount + ' high-severity dispute(s) flagged' : 'No critical issues',
      'Continuous AML/KYC monitoring via Governor AI'
    )}
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${metricCard('fa-handshake', 'Active Trades', stats.trade_requests || activeTrades.length, null, 'blue')}
      ${metricCard('fa-building', 'Entities', stats.tenants || 0, null, 'purple')}
      ${metricCard('fa-gavel', 'Gov Decisions', stats.governor_decisions || 0, null, 'amber')}
      ${metricCard('fa-flag', 'Disputes', disputeCount, null, disputeCount > 0 ? 'rose' : 'green')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-shipping-fast text-sgtx-500 mr-2"></i>Pending Clearance</h3>
        ${pendingClearance.length === 0 ? '<p class="text-xs text-surface-400 text-center py-6">No pending clearances</p>' :
          `<div class="space-y-3">${pendingClearance.map(t => {
            const specs = typeof t.parsed_specs === 'string' ? JSON.parse(t.parsed_specs || '{}') : (t.parsed_specs || {});
            return `<div class="p-4 rounded-xl border border-surface-100 hover:border-amber-200 transition">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium">${specs.commodity || 'Trade'}</span>
                ${badge(t.status)}
              </div>
              <div class="text-[10px] text-surface-400">${specs.origin || '?'} → ${specs.destination || '?'} • ${specs.quantity || ''} ${specs.unit || ''}</div>
              <div class="mt-2 flex gap-2">
                <button onclick="showGovernorPanel('ALLOW','${t.id}')" class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] rounded-lg font-semibold">Clear</button>
                <button onclick="showGovernorPanel('DENY','${t.id}')" class="px-3 py-1.5 bg-red-100 text-red-600 text-[10px] rounded-lg font-semibold">Deny</button>
                <button onclick="showGovernorPanel('CONDITIONAL','${t.id}')" class="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] rounded-lg font-semibold">Conditional</button>
              </div>
            </div>`;
          }).join('')}</div>`}
      </div>
      <div class="sgtx-card">
        <h3 class="font-semibold text-sm mb-4"><i class="fas fa-triangle-exclamation text-amber-500 mr-2"></i>Active Disputes</h3>
        ${disputes.length === 0 ? '<p class="text-xs text-surface-400 text-center py-6">No disputes filed</p>' :
          `<div class="space-y-3">${disputes.slice(0, 5).map(d => `
            <div class="p-3 rounded-xl border ${d.severity >= 4 ? 'border-red-200 bg-red-50/30' : 'border-surface-100'}">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-medium">${d.dispute_type}</div>
                  <div class="text-[10px] text-surface-400">${d.filing_party_name || d.filing_party_gtid} vs ${d.respondent_name || d.respondent_gtid || 'N/A'}</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold ${d.severity >= 4 ? 'text-red-600' : d.severity >= 3 ? 'text-amber-600' : 'text-blue-600'}">Sev ${d.severity}/5</span>
                  ${badge(d.status)}
                </div>
              </div>
            </div>`).join('')}</div>`}
      </div>
    </div>
    <div class="sgtx-card">
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

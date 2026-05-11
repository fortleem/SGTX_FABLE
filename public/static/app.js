// SGTX Platform v6.3 — Full Frontend Application (Portal RBAC + Multi-Tenant)
// Based on Blueprint v6.3: Part 2 (Identity/Tenants), Part 6 (Portals), Part 3 (Workflow)
const API = '/api/v1';
let currentPage = 'dashboard';
let currentPortal = 'dashboard';
let currentMode = 'DUAL';
let chartInstance = null;
let authToken = null;
let tenant = null;
let employee = null;

// ─────────────────────────────────────────────────────────
// PORTAL RBAC DEFINITIONS (per Blueprint Part 2 & Part 6)
// Tenant Types: CORPORATE, FINANCIAL, LOGISTICS, QUALITY_CONTROL, REGULATORY, GOVERNMENT
// ─────────────────────────────────────────────────────────

// Which portals each tenant type is ALLOWED to access
const TENANT_PORTAL_ACCESS = {
  CORPORATE:       ['importer', 'exporter'],       // CORPORATE tenants trade; can import or export
  FINANCIAL:       ['financier'],                    // FINANCIAL tenants provide financing
  LOGISTICS:       ['logistics', 'shipper'],         // LOGISTICS tenants handle shipping/freight
  QUALITY_CONTROL: ['qc'],                           // QC tenants do inspections
  REGULATORY:      ['regulatory'],                   // Regulatory bodies have read-only dashboards
  GOVERNMENT:      ['government'],                   // Government integration portals
};

// Which portal the tenant type defaults to on login
const TENANT_DEFAULT_PORTAL = {
  CORPORATE: 'importer', FINANCIAL: 'financier', LOGISTICS: 'logistics',
  QUALITY_CONTROL: 'qc', REGULATORY: 'regulatory', GOVERNMENT: 'government',
};

// Admin portal is only for Platform Governance Authority (employee role = PLATFORM_ADMIN)
function canAccessAdmin() {
  if (!employee) return false;
  const role = (employee.role || '').toUpperCase();
  const perms = employee.permissions || [];
  return role === 'PLATFORM_ADMIN' || role === 'TENANT_ADMIN' || perms.includes('*') || perms.includes('admin.access');
}

// Get available portals for current user
function getAvailablePortals() {
  if (!tenant) return ['dashboard'];
  const portals = TENANT_PORTAL_ACCESS[tenant.type] || ['dashboard'];
  const result = [...portals];
  if (canAccessAdmin()) result.push('admin');
  return result;
}

// Permission checks per action
const PORTAL_PERMISSIONS = {
  importer: {
    canCreateTrade: true, canViewTrades: true, canViewContracts: true, canRequestFinancing: true,
    canViewShipments: true, canViewPayments: true, canViewContacts: true, canFileDispute: true,
    canViewCommissions: true, canViewBarcodes: false, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: false, canViewRoutes: false,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: false, canViewMarketplace: false, canViewTenants: false,
  },
  exporter: {
    canCreateTrade: false, canViewTrades: true, canViewContracts: true, canRequestFinancing: true,
    canViewShipments: true, canViewPayments: false, canViewContacts: true, canFileDispute: true,
    canViewCommissions: true, canViewBarcodes: true, canViewDistressed: true, canViewBuyerSearch: true,
    canViewDeFi: false, canViewSettlements: false, canViewRoutes: false,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: false, canViewMarketplace: false, canViewTenants: false,
  },
  logistics: {
    canCreateTrade: false, canViewTrades: false, canViewContracts: true, canRequestFinancing: false,
    canViewShipments: true, canViewPayments: false, canViewContacts: true, canFileDispute: false,
    canViewCommissions: true, canViewBarcodes: true, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: true, canViewRoutes: true,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: true, canViewMarketplace: false, canViewTenants: false,
  },
  shipper: {
    canCreateTrade: false, canViewTrades: false, canViewContracts: true, canRequestFinancing: false,
    canViewShipments: true, canViewPayments: false, canViewContacts: true, canFileDispute: false,
    canViewCommissions: true, canViewBarcodes: true, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: true, canViewRoutes: true,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: true, canViewMarketplace: false, canViewTenants: false,
  },
  financier: {
    canCreateTrade: false, canViewTrades: false, canViewContracts: false, canRequestFinancing: false,
    canViewShipments: false, canViewPayments: true, canViewContacts: false, canFileDispute: false,
    canViewCommissions: false, canViewBarcodes: false, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: true, canViewSettlements: true, canViewRoutes: false,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: false, canViewMarketplace: false, canViewTenants: false,
    // Financier-specific
    canViewFinancingRequests: true, canSubmitBids: true, canViewCreditScores: true,
  },
  qc: {
    canCreateTrade: false, canViewTrades: false, canViewContracts: false, canRequestFinancing: false,
    canViewShipments: true, canViewPayments: false, canViewContacts: false, canFileDispute: false,
    canViewCommissions: false, canViewBarcodes: true, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: false, canViewRoutes: false,
    canViewGovernor: false, canViewJurisdictions: false, canViewCompliance: false,
    canViewAudit: false, canViewESG: true, canViewMarketplace: false, canViewTenants: false,
    // QC-specific
    canViewInspections: true, canSubmitReports: true,
  },
  regulatory: {
    canCreateTrade: false, canViewTrades: true, canViewContracts: true, canRequestFinancing: false,
    canViewShipments: true, canViewPayments: true, canViewContacts: false, canFileDispute: false,
    canViewCommissions: true, canViewBarcodes: false, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: true, canViewRoutes: false,
    canViewGovernor: true, canViewJurisdictions: true, canViewCompliance: true,
    canViewAudit: true, canViewESG: true, canViewMarketplace: false, canViewTenants: true,
    canViewDisputeHistory: true,
    readOnly: true, // Regulatory is read-only per blueprint
  },
  government: {
    canCreateTrade: false, canViewTrades: true, canViewContracts: true, canRequestFinancing: false,
    canViewShipments: true, canViewPayments: false, canViewContacts: false, canFileDispute: false,
    canViewCommissions: false, canViewBarcodes: false, canViewDistressed: false, canViewBuyerSearch: false,
    canViewDeFi: false, canViewSettlements: false, canViewRoutes: false,
    canViewGovernor: true, canViewJurisdictions: true, canViewCompliance: true,
    canViewAudit: true, canViewESG: true, canViewMarketplace: false, canViewTenants: true,
    canViewDisputeHistory: true,
    // v6.3: Government portal has dynamic modules, not purely read-only
    canApproveClearance: true, canViewAnonymousTrades: true,
  },
  admin: {
    canCreateTrade: true, canViewTrades: true, canViewContracts: true, canRequestFinancing: true,
    canViewShipments: true, canViewPayments: true, canViewContacts: true, canFileDispute: true,
    canViewCommissions: true, canViewBarcodes: true, canViewDistressed: true, canViewBuyerSearch: true,
    canViewDeFi: true, canViewSettlements: true, canViewRoutes: true,
    canViewGovernor: true, canViewJurisdictions: true, canViewCompliance: true,
    canViewAudit: true, canViewESG: true, canViewMarketplace: true, canViewTenants: true,
  },
};

function getPerms() {
  return PORTAL_PERMISSIONS[currentPortal] || PORTAL_PERMISSIONS.admin;
}
function isReadOnly() {
  return getPerms().readOnly === true;
}

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  authToken = localStorage.getItem('sgtx_token');
  tenant = JSON.parse(localStorage.getItem('sgtx_tenant') || 'null');
  employee = JSON.parse(localStorage.getItem('sgtx_employee') || 'null');

  if (authToken && tenant) {
    document.getElementById('tenant-info').innerHTML = `
      <div class="font-semibold text-sgtx-600">${tenant.legal_name}</div>
      <div class="text-[10px] text-gray-400 font-mono">${tenant.gtid || ''}</div>
      <div class="mt-1">${badge(tenant.kyb_status || 'PENDING')}</div>
      <div class="text-[9px] mt-1 text-gray-400"><i class="fas fa-tag mr-1"></i>${tenant.type}</div>`;
    document.getElementById('user-name').textContent = employee?.full_name || employee?.email || '—';

    // Build portal selector with only allowed portals
    buildPortalSelector();

    // Auto-select default portal for tenant type
    const defaultPortal = TENANT_DEFAULT_PORTAL[tenant.type] || 'dashboard';
    document.getElementById('portal-select').value = defaultPortal;
    switchPortal(defaultPortal);
  } else {
    // Not logged in: show full overview
    buildPortalSelector();
    switchPortal('dashboard');
  }
  navigate('dashboard');
});

function buildPortalSelector() {
  const select = document.getElementById('portal-select');
  const portals = tenant ? getAvailablePortals() : ['dashboard'];
  const portalLabels = {
    dashboard: 'Platform Overview',
    importer: 'Importer Portal',
    exporter: 'Exporter Portal',
    logistics: 'Logistics Portal',
    shipper: 'Shipper / Carrier Portal',
    financier: 'Financier Portal',
    qc: 'QC / Inspection Portal',
    regulatory: 'Regulatory Portal',
    government: 'Government Portal',
    admin: 'Admin Portal',
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

// ─── PORTAL SWITCHING ───────────────────────────────────
function switchPortal(portal) {
  currentPortal = portal;
  const nav = document.getElementById('nav-items');

  // Update mode switcher visibility: only CORPORATE tenants in importer/exporter portal
  const modeSwitcher = document.getElementById('mode-switcher');
  if (modeSwitcher) {
    modeSwitcher.style.display = (tenant?.type === 'CORPORATE' && (portal === 'importer' || portal === 'exporter')) ? 'flex' : 'none';
  }

  // Portal menus — strictly per blueprint Part 6 + RBAC
  const portalMenus = {
    dashboard: [
      { section: 'Platform Overview' },
      { id: 'dashboard', icon: 'fa-chart-line', label: 'Overview' },
      { id: 'tenants', icon: 'fa-building', label: 'Tenants' },
      { id: 'trust', icon: 'fa-star', label: 'Trust Scores' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governor Decisions' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
    ],
    importer: [
      { section: 'Importer Portal (v6.3)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard (Trade Inbox)' },
      { id: 'inboundshipments', icon: 'fa-map-marked-alt', label: 'Inbound Shipments' },
      { section: 'Trade Initiation (Phases 1-3)' },
      { id: 'trades', icon: 'fa-handshake', label: 'New Trade Request' },
      { id: 'quotereview', icon: 'fa-columns', label: 'Quote Review & Negotiation' },
      { id: 'counteroffers', icon: 'fa-comments-dollar', label: 'Counter-Offer Simulator' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'Contract Signing' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commission Locks' },
      { section: 'Execution & Tracking (Phases 5-7)' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments Vault' },
      { id: 'customsreadiness', icon: 'fa-clipboard-check', label: 'Customs Readiness' },
      { id: 'tradelineage', icon: 'fa-project-diagram', label: 'Trade Lineage Graph' },
      { id: 'digitaltwin', icon: 'fa-digital-tachograph', label: 'Live Tracking (Digital Twin)' },
      { id: 'iotdashboard', icon: 'fa-thermometer-half', label: 'IoT / Cold Chain' },
      { section: 'Finance & Payments' },
      { id: 'financing', icon: 'fa-university', label: 'Financing' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Payments' },
      { section: 'Discovery (Phases 7/8)' },
      { id: 'distressed', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo (as Buyer)' },
      { id: 'marketintel', icon: 'fa-chart-pie', label: 'Market Intelligence' },
      { section: 'Network & Disputes' },
      { id: 'contacts', icon: 'fa-address-book', label: 'Saved Contacts & Performance' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'Disputes (Phase 10)' },
      { id: 'disputehistory', icon: 'fa-history', label: 'Dispute History' },
      { section: 'AI Tools' },
      { id: 'aiassistant', icon: 'fa-robot', label: 'AI Assistant' },
    ],
    exporter: [
      { section: 'Exporter Portal (v6.3)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard (Priority Actions)' },
      { section: 'Quotes & Trade (Phases 1-3)' },
      { id: 'trades', icon: 'fa-handshake', label: 'Pending Requests' },
      { id: 'exwpricelock', icon: 'fa-lock', label: 'EXW Price Lock' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'My Contracts' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commission Locks' },
      { id: 'quotesubmission', icon: 'fa-paper-plane', label: 'Quote Submission' },
      { section: 'Packing & Logistics (Phase 2)' },
      { id: 'containerisation', icon: 'fa-boxes', label: 'Containerisation & Packing' },
      { id: 'packingplans', icon: 'fa-pallet', label: 'Packing Plans' },
      { id: 'logisticsbuilder', icon: 'fa-cubes', label: 'Logistics Builder (Re-Optimise)' },
      { id: 'qcbooking', icon: 'fa-clipboard-check', label: 'QC Booking' },
      { id: 'docfinalisation', icon: 'fa-file-signature', label: 'Document Finalisation' },
      { section: 'Execution (Phases 5-7)' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments Vault (+Margin)' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Barcode Print (GS1/QR)' },
      { id: 'cashposition', icon: 'fa-chart-line', label: 'Cash Position (90-Day)' },
      { id: 'iotdashboard', icon: 'fa-thermometer-half', label: 'IoT Readings' },
      { section: 'Discovery (Phases 7/8)' },
      { id: 'buyersearch', icon: 'fa-search-dollar', label: 'Find Buyers' },
      { id: 'distressed', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo' },
      { id: 'distressedfactors', icon: 'fa-globe', label: 'Distressed Factors' },
      { section: 'Network & Disputes' },
      { id: 'contacts', icon: 'fa-address-book', label: 'Saved Contacts' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'Disputes (Phase 10)' },
      { id: 'disputehistory', icon: 'fa-history', label: 'Dispute History' },
      { section: 'AI Tools' },
      { id: 'aiassistant', icon: 'fa-robot', label: 'AI Assistant' },
    ],
    logistics: [
      { section: 'Logistics Portal (v6.3 Multi-Role)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Unified Operations Dashboard' },
      { section: 'Service Requests & RFQ' },
      { id: 'logisticsrfq', icon: 'fa-clipboard-list', label: 'RFQ Inbox (Open Requests)' },
      { id: 'bundlebuilder', icon: 'fa-cubes', label: 'Bundle Builder (FF)' },
      { id: 'servicecatalog', icon: 'fa-th-list', label: 'Service Catalog' },
      { section: 'Active Shipments' },
      { id: 'shipments', icon: 'fa-ship', label: 'Active Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Pallet Scanning' },
      { id: 'routes', icon: 'fa-route', label: 'OSRM Route Intelligence' },
      { id: 'dispatchplanner', icon: 'fa-map-marked-alt', label: 'Dispatch Planner (Trucking)' },
      { section: 'Role-Specific Tabs' },
      { id: 'carrierprofiles', icon: 'fa-truck', label: 'Carrier Profiles' },
      { id: 'eblmanagement', icon: 'fa-file-alt', label: 'eBL Status (Shipping Line)' },
      { id: 'customschecklist', icon: 'fa-clipboard-check', label: 'Customs Doc Queue' },
      { id: 'shippinglineintegration', icon: 'fa-plug', label: 'Shipping Line Integration' },
      { id: 'logisticsperf', icon: 'fa-chart-bar', label: 'Performance Dashboard' },
      { id: 'drivers', icon: 'fa-id-card', label: 'Drivers' },
      { section: 'Tracking & IoT' },
      { id: 'iotdashboard', icon: 'fa-thermometer-half', label: 'IoT Readings' },
      { id: 'digitaltwin', icon: 'fa-digital-tachograph', label: 'Digital Twin' },
      { id: 'shipmentschedules', icon: 'fa-calendar-alt', label: 'Schedules' },
      { section: 'Finance' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'Service Contracts' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlements' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commissions' },
      { id: 'providerinvoices', icon: 'fa-file-invoice-dollar', label: 'Invoices' },
      { section: 'ESG & Network' },
      { id: 'esg', icon: 'fa-leaf', label: 'Carbon / ESG' },
      { id: 'contacts', icon: 'fa-address-book', label: 'Partner Network' },
    ],
    shipper: [
      { section: 'Shipper / Carrier Portal' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'My Dashboard' },
      { section: 'Operations' },
      { id: 'shipments', icon: 'fa-ship', label: 'Active Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Scan / Track' },
      { id: 'routes', icon: 'fa-route', label: 'Route Intelligence' },
      { section: 'Finance' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlements' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commissions' },
      { section: 'ESG' },
      { id: 'esg', icon: 'fa-leaf', label: 'Carbon / ESG' },
      { id: 'contacts', icon: 'fa-address-book', label: 'My Network' },
    ],
    financier: [
      { section: 'Financier Portal (v6.3)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Financing Operations Hub' },
      { section: 'Financing Marketplace' },
      { id: 'financing', icon: 'fa-university', label: 'Open Requests (Matching)' },
      { id: 'financierdetails', icon: 'fa-search', label: 'Request Details & Risk' },
      { id: 'bidsubmission', icon: 'fa-gavel', label: 'Encrypted Blind Bidding' },
      { id: 'risksimulator', icon: 'fa-chart-area', label: 'Risk Simulator (Monte Carlo)' },
      { section: 'DeFi & Assets' },
      { id: 'defi', icon: 'fa-link', label: 'DeFi Positions' },
      { id: 'deficomparison', icon: 'fa-exchange-alt', label: 'DeFi Protocol Comparison' },
      { id: 'tokenizedassets', icon: 'fa-coins', label: 'Tokenized Assets' },
      { id: 'secondarymarket', icon: 'fa-store', label: 'Secondary Market' },
      { id: 'blockchainverify', icon: 'fa-link', label: 'Blockchain Verify' },
      { section: 'Active Agreements' },
      { id: 'portfolio', icon: 'fa-briefcase', label: 'Portfolio Dashboard' },
      { id: 'shipments', icon: 'fa-ship', label: 'Financed Shipments' },
      { id: 'margincalls', icon: 'fa-exclamation-triangle', label: 'Margin Calls' },
      { section: 'Settlements & Analysis' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Settlements' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlement Instructions' },
      { id: 'trust', icon: 'fa-star', label: 'Credit Scores' },
      { id: 'creditassessments', icon: 'fa-chart-pie', label: 'Credit Assessments' },
    ],
    qc: [
      { section: 'QC / Inspection Portal (v6.3)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard (Jobs Overview)' },
      { id: 'qcschedule', icon: 'fa-calendar-alt', label: 'My Schedule Calendar' },
      { section: 'Inspection Jobs' },
      { id: 'inspections', icon: 'fa-clipboard-check', label: 'Inspection Jobs' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments to Inspect' },
      { id: 'packingplans', icon: 'fa-boxes', label: 'Packing Plans' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Scan Items (AR)' },
      { section: 'Reports' },
      { id: 'qcreports', icon: 'fa-file-medical-alt', label: 'Report Generation' },
      { id: 'qcperformance', icon: 'fa-chart-bar', label: 'Performance Dashboard' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG Reports' },
      { section: 'Settings' },
      { id: 'qcsettings', icon: 'fa-cog', label: 'Serviceable Commodities' },
    ],
    regulatory: [
      { section: 'Regulatory Portal (Read-Only)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Overview' },
      { id: 'tenants', icon: 'fa-building', label: 'All Tenants' },
      { id: 'trades', icon: 'fa-handshake', label: 'Trade Requests' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'Contracts' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments' },
      { section: 'Dispute Oversight' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'All Disputes' },
      { id: 'disputehistory', icon: 'fa-history', label: 'Dispute History' },
      { section: 'Governance & Compliance' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governor Decisions' },
      { id: 'compliance', icon: 'fa-clipboard-check', label: 'Compliance' },
      { id: 'audit', icon: 'fa-history', label: 'Audit Log' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
    ],
    government: [
      { section: 'Government Portal (v6.3)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dynamic Dashboard' },
      { section: 'Trade Monitoring' },
      { id: 'govtrademonitor', icon: 'fa-eye', label: 'Live Trade Monitor' },
      { id: 'govclearance', icon: 'fa-check-double', label: 'Clearance Recommendations' },
      { id: 'shipments', icon: 'fa-ship', label: 'Shipments' },
      { section: 'Anonymous Trade' },
      { id: 'govanonaymous', icon: 'fa-user-secret', label: 'Anonymous Trade Requests' },
      { section: 'Document & Compliance' },
      { id: 'trades', icon: 'fa-handshake', label: 'Trade Activity' },
      { id: 'tenants', icon: 'fa-building', label: 'Registered Entities' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'Disputes' },
      { id: 'disputehistory', icon: 'fa-history', label: 'Dispute History' },
      { section: 'Governance & Compliance' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governance' },
      { id: 'compliance', icon: 'fa-clipboard-check', label: 'Compliance' },
      { id: 'audit', icon: 'fa-history', label: 'Audit Trail' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG / Impact' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
      { section: 'Integrations' },
      { id: 'govintegrations', icon: 'fa-plug', label: 'Integration Connectors' },
    ],
    admin: [
      { section: 'Platform Admin (Multisig 3/5)' },
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Platform Health & AI' },
      { section: 'Constitutional Governance' },
      { id: 'policyeditor', icon: 'fa-file-code', label: 'Policy Editor (+Simulation)' },
      { id: 'governor', icon: 'fa-gavel', label: 'Governor Log (+NL Query)' },
      { id: 'psphealth', icon: 'fa-heartbeat', label: 'PSP Health Monitor' },
      { id: 'jurisdictionmatrix', icon: 'fa-globe-americas', label: 'Jurisdiction Matrix (+Conflict)' },
      { id: 'predictivehealth', icon: 'fa-chart-line', label: 'Predictive System Health' },
      { section: 'Incident Response' },
      { id: 'incidents', icon: 'fa-exclamation-circle', label: 'Incidents & Post-Mortem' },
      { id: 'configversions', icon: 'fa-code-branch', label: 'Config Version Control' },
      { section: 'Identity & Tenants' },
      { id: 'tenants', icon: 'fa-building', label: 'All Tenants' },
      { id: 'trust', icon: 'fa-star', label: 'Trust Scores' },
      { id: 'impersonate', icon: 'fa-user-secret', label: 'Tenant Impersonation' },
      { id: 'partneronboard', icon: 'fa-handshake', label: 'Marketplace Partner Onboard' },
      { id: 'jurisdictions', icon: 'fa-globe', label: 'Jurisdictions' },
      { section: 'Trade & Execution' },
      { id: 'trades', icon: 'fa-handshake', label: 'All Trades' },
      { id: 'contracts', icon: 'fa-file-contract', label: 'All Contracts' },
      { id: 'commissions', icon: 'fa-coins', label: 'Commission Locks' },
      { id: 'shipments', icon: 'fa-ship', label: 'All Shipments' },
      { id: 'barcodes', icon: 'fa-barcode', label: 'Barcode Scanner' },
      { id: 'settlements', icon: 'fa-money-bill-wave', label: 'Settlements' },
      { section: 'Finance & DeFi' },
      { id: 'financing', icon: 'fa-university', label: 'Financing' },
      { id: 'defi', icon: 'fa-link', label: 'DeFi / Crypto' },
      { id: 'payments', icon: 'fa-credit-card', label: 'Payments' },
      { section: 'Discovery' },
      { id: 'distressed', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo' },
      { id: 'buyersearch', icon: 'fa-search-dollar', label: 'Buyer Search' },
      { section: 'Compliance & Audit' },
      { id: 'compliance', icon: 'fa-clipboard-check', label: 'Compliance' },
      { id: 'audit', icon: 'fa-history', label: 'Audit Log' },
      { id: 'esg', icon: 'fa-leaf', label: 'ESG Assessments' },
      { id: 'marketplace', icon: 'fa-store', label: 'Marketplace API' },
      { id: 'disputes', icon: 'fa-balance-scale-right', label: 'All Disputes' },
      { id: 'disputehistory', icon: 'fa-history', label: 'Dispute History' },
      { id: 'contacts', icon: 'fa-address-book', label: 'Network' },
      { id: 'routes', icon: 'fa-route', label: 'Route Intelligence' },
      { section: 'Advanced v6.3' },
      { id: 'sanctionsdetail', icon: 'fa-shield-alt', label: 'Sanctions/Fraud/Shell' },
      { id: 'modeldrift', icon: 'fa-brain', label: 'Model Drift' },
      { id: 'policysuggestions', icon: 'fa-lightbulb', label: 'Policy Suggestions' },
      { id: 'advancedstats', icon: 'fa-chart-bar', label: 'Advanced Stats' },
    ],
  };

  const items = portalMenus[portal] || portalMenus.dashboard;
  nav.innerHTML = items.map(item => {
    if (item.section) return `<div class="text-xs text-gray-400 font-semibold mt-4 mb-1 px-3 uppercase tracking-wider">${item.section}</div>`;
    return `<div class="sidebar-item${currentPage === item.id ? ' active' : ''}" onclick="navigate('${item.id}')"><i class="fas ${item.icon} w-5 text-center"></i><span>${item.label}</span></div>`;
  }).join('');

  // Update header "New" button visibility
  const newBtn = document.getElementById('new-action-btn');
  if (newBtn) newBtn.style.display = isReadOnly() ? 'none' : 'block';
}

function switchMode(mode) {
  currentMode = mode;
  ['BUY', 'SELL', 'DUAL'].forEach(m => {
    const el = document.getElementById('mode-' + m);
    if (!el) return;
    if (m === mode) el.className = 'px-3 py-1 rounded-full bg-sgtx-500 text-white text-xs';
    else el.className = 'px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 text-xs';
  });
}

// ─── NAVIGATION ─────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => {
    if (el.getAttribute('onclick')?.includes(`'${page}'`)) el.classList.add('active');
  });
  loadPage(page);
}

async function loadPage(page) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="flex items-center justify-center h-64"><i class="fas fa-spinner fa-spin text-2xl text-sgtx-500"></i></div>';
  content.classList.remove('fade-in'); void content.offsetWidth; content.classList.add('fade-in');
  try {
    const pages = {
      dashboard: renderDashboard, tenants: renderTenants, trust: renderTrustScores,
      contacts: renderContacts, trades: renderTrades, contracts: renderContracts,
      commissions: renderCommissions, shipments: renderShipments, barcodes: renderBarcodes,
      settlements: renderSettlements, financing: renderFinancing, defi: renderDeFi,
      distressed: renderDistressed, buyersearch: renderBuyerSearch, payments: renderPayments,
      disputes: renderDisputes, disputehistory: renderDisputeHistory, governor: renderGovernor, jurisdictions: renderJurisdictions,
      compliance: renderCompliance, audit: renderAudit, esg: renderESG,
      marketplace: renderMarketplace, routes: renderRoutes, inspections: renderInspections,
      servicecatalog: renderServiceCatalog, logisticsrfq: renderLogisticsRFQ,
      drivers: renderDrivers, creditassessments: renderCreditAssessments,
      logisticsperf: renderLogisticsPerformance, packingplans: renderPackingPlans,
      digitaltwin: renderDigitalTwin, gapstats: renderGapStats,
      iotdashboard: renderIoTDashboard, eblmanagement: renderEBLManagement,
      carrierprofiles: renderCarrierProfiles, providerinvoices: renderProviderInvoices,
      sanctionsdetail: renderSanctionsDetail, modeldrift: renderModelDrift,
      policysuggestions: renderPolicySuggestions, feeoptimization: renderFeeOptimization,
      livingquotes: renderLivingQuotes, tradecomposer: renderTradeComposer,
      tokenizedassets: renderTokenizedAssets, blockchainverify: renderBlockchainVerify,
      smartclauses: renderSmartClauses, shipmentschedules: renderShipmentSchedules,
      advancedstats: renderAdvancedStats,
      // v6.2 Gap Closure — Portal-specific features
      counteroffers: renderCounterOffers, tradelineage: renderTradeLineage,
      marketintel: renderMarketIntel, containerisation: renderContainerisation,
      docfinalisation: renderDocFinalisation, qcbooking: renderQCBooking,
      bundlebuilder: renderBundleBuilder, customschecklist: renderCustomsChecklist,
      portfolio: renderPortfolio, risksimulator: renderRiskSimulator,
      policyeditor: renderPolicyEditor, psphealth: renderPSPHealth,
      jurisdictionmatrix: renderJurisdictionMatrix, aiassistant: renderAIAssistant,
      distressedfactors: renderDistressedFactors,
      // v6.3 — Importer Portal new pages
      inboundshipments: renderInboundShipments, customsreadiness: renderCustomsReadiness,
      quotereview: renderQuoteReview,
      // v6.3 — Exporter Portal new pages
      exwpricelock: renderEXWPriceLock, cashposition: renderCashPosition,
      logisticsbuilder: renderLogisticsBuilder, quotesubmission: renderQuoteSubmission,
      // v6.3 — Logistics Portal new pages
      dispatchplanner: renderDispatchPlanner, shippinglineintegration: renderShippingLineIntegration,
      // v6.3 — QC Portal new pages
      qcschedule: renderQCSchedule, qcreports: renderQCReports,
      qcperformance: renderQCPerformance, qcsettings: renderQCSettings,
      // v6.3 — Financier Portal new pages
      financierdetails: renderFinancierDetails, bidsubmission: renderBidSubmission,
      deficomparison: renderDeFiComparison, secondarymarket: renderSecondaryMarket,
      margincalls: renderMarginCalls,
      // v6.3 — Government Portal new pages
      govtrademonitor: renderGovTradeMonitor, govclearance: renderGovClearance,
      govanonaymous: renderGovAnonymous, govintegrations: renderGovIntegrations,
      // v6.3 — Admin Portal new pages
      predictivehealth: renderPredictiveHealth, incidents: renderIncidents,
      configversions: renderConfigVersions, impersonate: renderImpersonate,
      partneronboard: renderPartnerOnboard,
    };
    if (pages[page]) await pages[page]();
    else content.innerHTML = '<div class="card p-12 text-center text-gray-400"><i class="fas fa-hard-hat text-4xl mb-3"></i><p>Page coming soon</p></div>';
  } catch(e) {
    content.innerHTML = `<div class="card p-6 text-red-600"><i class="fas fa-exclamation-circle mr-2"></i>Error: ${e.message}</div>`;
  }
}

// ─── HELPERS ────────────────────────────────────────────
async function api(path) { const r = await fetch(`${API}${path}`); return r.json(); }
async function apiPost(path, body) { const r = await fetch(`${API}${path}`, { method: path.includes('/status') ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.json(); }
function setTitle(t, s) { document.getElementById('page-title').textContent = t; document.getElementById('page-subtitle').textContent = s || ''; }
function badge(s) { return `<span class="status-badge status-${s}">${s}</span>`; }
function verdictBadge(v) { return `<span class="verdict-${v} font-semibold">${v}</span>`; }
function time(t) { return t ? new Date(t).toLocaleString() : '—'; }
function usd(n) { return n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function pct(n) { return n != null ? (n * 100).toFixed(2) + '%' : '—'; }
function emptyState(m) { return `<div class="card p-12 text-center text-gray-400"><i class="fas fa-inbox text-4xl mb-3"></i><p>${m}</p></div>`; }
function showModal(h) { document.getElementById('modal-body').innerHTML = h; document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }
function statCard(i, l, v, c) { return `<div class="card p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg flex items-center justify-center ${c}"><i class="${i}"></i></div><div><div class="text-2xl font-bold">${v}</div><div class="text-xs text-gray-500">${l}</div></div></div></div>`; }
function roLabel() {
  return isReadOnly() ? '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-2"><i class="fas fa-lock mr-1"></i>Read-Only</span>' : '';
}

// ─────────────────────────────────────────────────────────
// DASHBOARD — Renders different content per portal
// ─────────────────────────────────────────────────────────
async function renderDashboard() {
  switch(currentPortal) {
    case 'importer': return renderImporterDashboard();
    case 'exporter': return renderExporterDashboard();
    case 'logistics': case 'shipper': return renderLogisticsDashboard();
    case 'financier': return renderFinancierDashboard();
    case 'qc': return renderQCDashboard();
    case 'regulatory': case 'government': return renderRegulatoryDashboard();
    case 'admin': return renderAdminDashboard();
    default: return renderPlatformDashboard();
  }
}

// Platform overview (unauthenticated or dashboard portal)
async function renderPlatformDashboard() {
  setTitle('Platform Overview', 'SGTX v6.1 — Sovereign, AI-Governed, Non-Custodial Global Trade Execution');
  const { data: stats } = await api('/stats');
  const { data: decisions } = await api('/governor/decisions?limit=8');
  const { data: disclaimer } = await api('/legal/disclaimer');
  document.getElementById('content').innerHTML = `
    ${disclaimer ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800"><i class="fas fa-balance-scale mr-2"></i><b>Legal:</b> ${disclaimer.disclaimer_text}</div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-building', 'Tenants', stats.tenants, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-handshake', 'Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-file-contract', 'Contracts', stats.contracts, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-gavel', 'Governor Decisions', stats.governor_decisions, 'bg-sgtx-50 text-sgtx-600')}
      ${statCard('fas fa-coins', 'Total Commission', usd(stats.total_commission_usd), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-globe', 'Jurisdictions', stats.jurisdictions_covered, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-shield-halved', 'Gov. Invariant', 'Enforced', 'bg-yellow-50 text-yellow-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Recent Governor Decisions</h3>
        <div class="space-y-2 max-h-80 overflow-y-auto">${decisions.map(d => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100" onclick="showDecisionDetail('${d.decision_id}')">
            <div><span class="font-mono text-xs text-gray-500">${d.decision_id?.slice(0,8)}...</span> <span class="text-gray-600">${d.decision_type}</span></div>
            <div class="flex items-center gap-2">${verdictBadge(d.verdict)}<span class="text-xs text-gray-400">${time(d.created_at)}</span></div>
          </div>`).join('')}</div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-pie mr-2 text-sgtx-500"></i>Trade Workflow (10 Phases x 84 Gates)</h3>
        <canvas id="phaseChart" height="220"></canvas>
      </div>
    </div>
    <div class="card p-5 mt-6">
      <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-sitemap mr-2 text-sgtx-500"></i>Microservices Architecture (35 Services)</h3>
      <div class="grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
        ${['Governor','Identity','Trade','Quote','Logistics','Location','Contract','Finance','Shipment','Settlement','Payment','Document','Barcode','Commodity','KYB/KYC','Trust Score','Notification','Audit','AI Orchestrator','Marketplace','DeFi','ESG/Carbon','Disruption','Distressed','Buyer Search','Jurisdiction','API Gateway','FX Oracle','Corp Graph','Observability','Secondary Mkt','Doc Reqs','QC','Network','Analytics'].map(s => `<div class="bg-gray-50 px-2 py-1.5 rounded text-center border border-gray-100">${s}</div>`).join('')}
      </div>
    </div>`;
  renderPhaseChart();
}

// ─── IMPORTER DASHBOARD ─────────────────────────────────
async function renderImporterDashboard() {
  setTitle('Importer Dashboard', `${tenant?.legal_name || 'My Organization'} — Trade Initiation & Tracking`);
  const { data: stats } = await api('/stats');
  const { data: disclaimer } = await api('/legal/disclaimer');
  document.getElementById('content').innerHTML = `
    ${disclaimer ? `<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800"><i class="fas fa-balance-scale mr-2"></i><b>Legal:</b> ${disclaimer.disclaimer_text}</div>` : ''}
    ${tenant?.kyb_status === 'PENDING' ? `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5"><div class="flex items-center justify-between"><div><i class="fas fa-info-circle text-blue-500 mr-2"></i><span class="text-sm text-blue-800 font-medium">KYB verification pending — submit documents to enable full trading</span></div><button onclick="showKYBForm()" class="bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium">Submit KYB</button></div></div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-handshake', 'My Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-file-contract', 'Contracts', stats.contracts, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-coins', 'Commission', usd(stats.total_commission_usd), 'bg-green-50 text-green-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-rocket mr-2 text-sgtx-500"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="showTradeWizard()" class="p-3 bg-sgtx-50 rounded-lg text-center hover:bg-sgtx-100 transition"><i class="fas fa-handshake text-sgtx-500 text-lg mb-1"></i><div class="text-xs font-medium">Create Trade</div></button>
          <button onclick="navigate('shipments')" class="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition"><i class="fas fa-ship text-orange-500 text-lg mb-1"></i><div class="text-xs font-medium">Track Shipments</div></button>
          <button onclick="showFinancingForm()" class="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"><i class="fas fa-university text-blue-500 text-lg mb-1"></i><div class="text-xs font-medium">Request Financing</div></button>
          <button onclick="navigate('contacts')" class="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"><i class="fas fa-address-book text-green-500 text-lg mb-1"></i><div class="text-xs font-medium">My Network</div></button>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-line mr-2 text-sgtx-500"></i>Trade Workflow</h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-500 text-white flex items-center justify-center text-xs">1</span><span>Enter Exporter GTID + Commodity Specs</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-400 text-white flex items-center justify-center text-xs">2</span><span>Review Exporter Quote (EXW Lock)</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-300 text-white flex items-center justify-center text-xs">3</span><span>Sign Contract + Pay Commission</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-200 text-sgtx-700 flex items-center justify-center text-xs">4</span><span>Track Execution → Settlement</span></div>
        </div>
      </div>
    </div>`;
}

// ─── EXPORTER DASHBOARD ─────────────────────────────────
async function renderExporterDashboard() {
  setTitle('Exporter Dashboard', `${tenant?.legal_name || 'My Organization'} — Quote Management & Shipments`);
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    ${tenant?.kyb_status === 'PENDING' ? `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5"><div class="flex items-center justify-between"><div><i class="fas fa-info-circle text-blue-500 mr-2"></i><span class="text-sm text-blue-800 font-medium">KYB verification pending — submit documents to enable full trading</span></div><button onclick="showKYBForm()" class="bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium">Submit KYB</button></div></div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-handshake', 'Incoming Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-file-contract', 'Contracts', stats.contracts, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-barcode', 'Barcodes Active', '—', 'bg-blue-50 text-blue-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-rocket mr-2 text-sgtx-500"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('trades')" class="p-3 bg-sgtx-50 rounded-lg text-center hover:bg-sgtx-100 transition"><i class="fas fa-handshake text-sgtx-500 text-lg mb-1"></i><div class="text-xs font-medium">View Trades</div></button>
          <button onclick="showBuyerSearchForm()" class="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"><i class="fas fa-search-dollar text-green-500 text-lg mb-1"></i><div class="text-xs font-medium">Find Buyers</div></button>
          <button onclick="navigate('barcodes')" class="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"><i class="fas fa-barcode text-blue-500 text-lg mb-1"></i><div class="text-xs font-medium">Barcodes</div></button>
          <button onclick="showDistressedForm()" class="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition"><i class="fas fa-exclamation-triangle text-orange-500 text-lg mb-1"></i><div class="text-xs font-medium">List Distressed</div></button>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-line mr-2 text-sgtx-500"></i>Exporter Workflow</h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-500 text-white flex items-center justify-center text-xs">1</span><span>Receive Trade Request from Importer</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-400 text-white flex items-center justify-center text-xs">2</span><span>Submit EXW Price Lock + Logistics RFQ</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-300 text-white flex items-center justify-center text-xs">3</span><span>Generate Barcodes (GS1-128/QR per pallet)</span></div>
          <div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-sgtx-200 text-sgtx-700 flex items-center justify-center text-xs">4</span><span>Ship + Track + Get Settled</span></div>
        </div>
      </div>
    </div>`;
}

// ─── LOGISTICS DASHBOARD ────────────────────────────────
async function renderLogisticsDashboard() {
  setTitle('Logistics Dashboard', `${tenant?.legal_name || 'My Organization'} — Shipment Operations & Route Intelligence`);
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-ship', 'Active Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-route', 'Routes', '—', 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-money-bill-wave', 'Settlements', '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-leaf', 'ESG Score', '—', 'bg-emerald-50 text-emerald-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-rocket mr-2 text-sgtx-500"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('shipments')" class="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition"><i class="fas fa-ship text-orange-500 text-lg mb-1"></i><div class="text-xs font-medium">Active Shipments</div></button>
          <button onclick="navigate('barcodes')" class="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"><i class="fas fa-barcode text-blue-500 text-lg mb-1"></i><div class="text-xs font-medium">Scan / Track</div></button>
          <button onclick="navigate('routes')" class="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition"><i class="fas fa-route text-purple-500 text-lg mb-1"></i><div class="text-xs font-medium">Route Intelligence</div></button>
          <button onclick="navigate('esg')" class="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"><i class="fas fa-leaf text-green-500 text-lg mb-1"></i><div class="text-xs font-medium">Carbon / ESG</div></button>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-info-circle mr-2 text-sgtx-500"></i>Logistics Capabilities</h3>
        <div class="space-y-2 text-sm text-gray-600">
          <div><i class="fas fa-check text-green-500 mr-2"></i>Service Catalog + Contract Rates</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>RFQ Inbox + Bundle Builder</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>Execution Console + Driver SMS</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>Performance Dashboard + ESG</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>Nominatim + OSRM Route Intelligence</div>
        </div>
      </div>
    </div>`;
}

// ─── FINANCIER DASHBOARD ────────────────────────────────
async function renderFinancierDashboard() {
  setTitle('Financier Dashboard', `${tenant?.legal_name || 'My Organization'} — Trade Finance & DeFi`);
  const { data: stats } = await api('/stats');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-university', 'Active Requests', '—', 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-link', 'DeFi Positions', '—', 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-money-bill-wave', 'Settlements', '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-star', 'Credit Scores', '—', 'bg-yellow-50 text-yellow-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-rocket mr-2 text-sgtx-500"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('financing')" class="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"><i class="fas fa-university text-blue-500 text-lg mb-1"></i><div class="text-xs font-medium">Active Requests</div></button>
          <button onclick="navigate('defi')" class="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition"><i class="fas fa-link text-purple-500 text-lg mb-1"></i><div class="text-xs font-medium">DeFi Positions</div></button>
          <button onclick="navigate('trust')" class="p-3 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition"><i class="fas fa-star text-yellow-500 text-lg mb-1"></i><div class="text-xs font-medium">Credit Analysis</div></button>
          <button onclick="navigate('payments')" class="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"><i class="fas fa-credit-card text-green-500 text-lg mb-1"></i><div class="text-xs font-medium">Settlements</div></button>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-info-circle mr-2 text-sgtx-500"></i>Supported Instruments</h3>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-gray-50 p-2 rounded"><b>Documentary:</b> LC, SBLC, BG, Documentary Collection</div>
          <div class="bg-gray-50 p-2 rounded"><b>Receivables:</b> Factoring, SCF, PO Finance, Forfaiting</div>
          <div class="bg-gray-50 p-2 rounded"><b>Structured:</b> Pre-Export, Warehouse, Tolling, Murabaha</div>
          <div class="bg-gray-50 p-2 rounded"><b>DeFi:</b> Tokenized Invoice, DeFi Pool, Stablecoin</div>
        </div>
      </div>
    </div>`;
}

// ─── QC DASHBOARD ───────────────────────────────────────
async function renderQCDashboard() {
  setTitle('QC / Inspection Dashboard', `${tenant?.legal_name || 'My Organization'} — Quality Control & Inspections`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-clipboard-check', 'Inspections', '—', 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-barcode', 'Items Scanned', '—', 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-leaf', 'ESG Reports', '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-check-circle', 'Pass Rate', '—', 'bg-emerald-50 text-emerald-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-rocket mr-2 text-sgtx-500"></i>Quick Actions</h3>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="navigate('inspections')" class="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"><i class="fas fa-clipboard-check text-blue-500 text-lg mb-1"></i><div class="text-xs font-medium">My Inspections</div></button>
          <button onclick="navigate('shipments')" class="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition"><i class="fas fa-ship text-orange-500 text-lg mb-1"></i><div class="text-xs font-medium">Shipments to Inspect</div></button>
          <button onclick="navigate('barcodes')" class="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition"><i class="fas fa-barcode text-purple-500 text-lg mb-1"></i><div class="text-xs font-medium">Scan Items</div></button>
          <button onclick="navigate('esg')" class="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"><i class="fas fa-leaf text-green-500 text-lg mb-1"></i><div class="text-xs font-medium">ESG Reports</div></button>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-info-circle mr-2 text-sgtx-500"></i>QC Standards</h3>
        <div class="space-y-2 text-sm text-gray-600">
          <div><i class="fas fa-check text-green-500 mr-2"></i>Accredited Third Party inspections</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>SGTX Quality Team for HS 07, 08, 20</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>Computer vision AI verification</div>
          <div><i class="fas fa-check text-green-500 mr-2"></i>GS1-128 barcode scanning + milestone</div>
        </div>
      </div>
    </div>`;
}

// ─── REGULATORY / GOVERNMENT DASHBOARD ──────────────────
async function renderRegulatoryDashboard() {
  setTitle(currentPortal === 'government' ? 'Government Dashboard' : 'Regulatory Dashboard', `Read-Only Overview — ${tenant?.legal_name || 'Platform Monitoring'}`);
  const [statsR, disputeStatsR] = await Promise.all([api('/stats'), api('/dispute-history/stats').catch(() => ({ data: {} }))]);
  const stats = statsR.data;
  const dStats = disputeStatsR.data || {};
  document.getElementById('content').innerHTML = `
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 text-xs text-yellow-800"><i class="fas fa-lock mr-2"></i><b>Read-Only Access:</b> This portal provides monitoring and oversight capabilities. No modification actions are available.</div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-building', 'Tenants', stats.tenants, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-handshake', 'Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-gavel', 'Gov Decisions', stats.governor_decisions, 'bg-sgtx-50 text-sgtx-600')}
      ${statCard('fas fa-globe', 'Jurisdictions', stats.jurisdictions_covered, 'bg-red-50 text-red-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>Platform Metrics</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="bg-gray-50 p-3 rounded"><span class="text-gray-500">Total Commission:</span> <span class="font-bold">${usd(stats.total_commission_usd)}</span></div>
          <div class="bg-gray-50 p-3 rounded"><span class="text-gray-500">Active Shipments:</span> <span class="font-bold">${stats.shipments}</span></div>
          <div class="bg-gray-50 p-3 rounded"><span class="text-gray-500">Contracts Executed:</span> <span class="font-bold">${stats.contracts}</span></div>
          <div class="bg-gray-50 p-3 rounded"><span class="text-gray-500">Gov. Invariant:</span> <span class="font-bold text-green-600">Enforced</span></div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-red-600"><i class="fas fa-balance-scale-right mr-2"></i>Dispute Overview</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="bg-red-50 p-3 rounded"><span class="text-gray-500">Total Disputes:</span> <span class="font-bold">${dStats.total_disputes||0}</span></div>
          <div class="bg-yellow-50 p-3 rounded"><span class="text-gray-500">Pending:</span> <span class="font-bold text-yellow-600">${dStats.pending_disputes||0}</span></div>
          <div class="bg-green-50 p-3 rounded"><span class="text-gray-500">Resolved:</span> <span class="font-bold text-green-600">${dStats.resolved_disputes||0}</span></div>
          <div class="bg-orange-50 p-3 rounded"><span class="text-gray-500">Flagged Entities:</span> <span class="font-bold text-orange-600">${dStats.flagged_entities||0}</span></div>
        </div>
        <div class="mt-3 flex gap-2">
          <button onclick="navigate('disputes')" class="flex-1 bg-red-50 text-red-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-100"><i class="fas fa-list mr-1"></i>View Disputes</button>
          <button onclick="navigate('disputehistory')" class="flex-1 bg-orange-50 text-orange-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-orange-100"><i class="fas fa-history mr-1"></i>Dispute History</button>
        </div>
      </div>
    </div>`;
}

// ─── ADMIN DASHBOARD ────────────────────────────────────
async function renderAdminDashboard() {
  setTitle('Admin Dashboard', 'Platform Governance Authority — Full Control');
  const { data: stats } = await api('/stats');
  const { data: decisions } = await api('/governor/decisions?limit=8');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-building', 'Tenants', stats.tenants, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-handshake', 'Trades', stats.trade_requests, 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-file-contract', 'Contracts', stats.contracts, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Shipments', stats.shipments, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-gavel', 'Governor Decisions', stats.governor_decisions, 'bg-sgtx-50 text-sgtx-600')}
      ${statCard('fas fa-coins', 'Total Commission', usd(stats.total_commission_usd), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-globe', 'Jurisdictions', stats.jurisdictions_covered, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-shield-halved', 'Gov. Invariant', 'Enforced', 'bg-yellow-50 text-yellow-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Recent Governor Decisions</h3>
        <div class="space-y-2 max-h-80 overflow-y-auto">${decisions.map(d => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100" onclick="showDecisionDetail('${d.decision_id}')">
            <div><span class="font-mono text-xs text-gray-500">${d.decision_id?.slice(0,8)}...</span> <span class="text-gray-600">${d.decision_type}</span></div>
            <div class="flex items-center gap-2">${verdictBadge(d.verdict)}<span class="text-xs text-gray-400">${time(d.created_at)}</span></div>
          </div>`).join('')}</div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-pie mr-2 text-sgtx-500"></i>Trade Workflow (10 Phases x 84 Gates)</h3>
        <canvas id="phaseChart" height="220"></canvas>
      </div>
    </div>`;
  renderPhaseChart();
}

function renderPhaseChart() {
  const ctx = document.getElementById('phaseChart');
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar', data: {
      labels: ['1.Initiate','2.Quote','3.Contract','4.Finance','5.Execute','6.Settle','7.Distress','8.Search','9.Payment','10.Dispute'],
      datasets: [{ label: 'Governance Gates', data: [8,9,10,10,8,10,9,6,8,6], backgroundColor: 'rgba(78,63,232,0.7)', borderRadius: 4 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Gate Count' } } } }
  });
}

// ─── TENANTS ────────────────────────────────────────────
async function renderTenants() {
  setTitle('Tenants' + roLabel(), 'Organization registry — GTID system');
  const { data } = await api('/tenants');
  const canRegister = !isReadOnly() && (currentPortal === 'admin' || currentPortal === 'dashboard');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} registered tenants</span>
      ${canRegister ? `<button onclick="showTenantForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Register</button>` : ''}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Legal Name</th><th class="px-4 py-3">Jurisdiction</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">KYB</th><th class="px-4 py-3">Trust</th><th class="px-4 py-3">Risk</th></tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTenantDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
        <td class="px-4 py-3 font-medium">${t.legal_name}</td>
        <td class="px-4 py-3 text-center"><span class="bg-gray-100 px-2 py-0.5 rounded text-xs">${t.jurisdiction}</span></td>
        <td class="px-4 py-3 text-center text-xs">${t.type}</td>
        <td class="px-4 py-3 text-center">${badge(t.kyb_status)}</td>
        <td class="px-4 py-3 text-center font-semibold ${(t.trust_score||0)>=80?'text-green-600':(t.trust_score||0)>=60?'text-yellow-600':'text-red-600'}">${t.trust_score||'—'}</td>
        <td class="px-4 py-3 text-center text-xs">${t.risk_score||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

async function showTenantDetail(id) {
  const { data } = await api(`/tenants/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>${data.legal_name}</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">GTID:</span> <span class="font-mono text-sgtx-600">${data.gtid}</span></div>
      <div><span class="text-gray-500">Jurisdiction:</span> ${data.jurisdiction}</div>
      <div><span class="text-gray-500">Type:</span> ${data.type}</div>
      <div><span class="text-gray-500">KYB:</span> ${badge(data.kyb_status)} (Tier ${data.kyb_tier})</div>
      <div><span class="text-gray-500">Risk:</span> ${data.risk_score}</div>
      <div><span class="text-gray-500">Sanctions:</span> ${data.sanctions_cleared ? '<i class="fas fa-check text-green-500"></i> Cleared' : '<i class="fas fa-times text-red-500"></i>'}</div>
    </div>
    ${data.trust_score ? `<div class="bg-gray-50 rounded-lg p-3 mb-4"><h3 class="font-semibold text-sm mb-2">Trust Score: <span class="${data.trust_score.score>=80?'text-green-600':'text-yellow-600'}">${data.trust_score.score}</span></h3>
      <div class="grid grid-cols-2 gap-2 text-xs">${Object.entries(data.trust_score.components ? JSON.parse(data.trust_score.components) : {}).map(([k,v]) => `<div>${k}: <b>${v}</b></div>`).join('')}</div></div>` : ''}
    <h3 class="font-semibold text-sm mb-2">Employees (${data.employees?.length||0})</h3>
    <div class="space-y-1 text-xs">${(data.employees||[]).map(e=>`<div class="flex justify-between bg-gray-50 p-2 rounded"><span>${e.full_name} (${e.email})</span>${badge(e.status)}</div>`).join('')}</div>
  `);
}

function showTenantForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-building mr-2 text-sgtx-500"></i>Register New Tenant</h2>
    <form onsubmit="submitTenant(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Legal Name</label><input id="t-name" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Jurisdiction</label><select id="t-jurisdiction" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="US">US</option><option value="EG">Egypt</option><option value="VN">Vietnam</option><option value="AE">UAE</option><option value="DE">Germany</option><option value="GB">UK</option><option value="SG">Singapore</option><option value="IN">India</option><option value="BR">Brazil</option><option value="NG">Nigeria</option></select></div>
        <div><label class="text-sm text-gray-600">Type</label><select id="t-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>CORPORATE</option><option>FINANCIAL</option><option>LOGISTICS</option><option>QUALITY_CONTROL</option><option>REGULATORY</option><option>GOVERNMENT</option></select></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600">Register (Governor Gated)</button>
    </form>`);
}
async function submitTenant(e) { e.preventDefault(); const r = await apiPost('/tenants', { legal_name: document.getElementById('t-name').value, jurisdiction: document.getElementById('t-jurisdiction').value, type: document.getElementById('t-type').value }); if (r.error) { alert('Denied: ' + r.error); return; } closeModal(); navigate('tenants'); }

// ─── TRUST SCORES ───────────────────────────────────────
async function renderTrustScores() {
  setTitle('Trust Scores', 'AI-driven entity trust scoring (XGBoost)');
  const { data } = await api('/trust-scores');
  document.getElementById('content').innerHTML = `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Entity</th><th class="px-4 py-3">Score</th><th class="px-4 py-3">Buy</th><th class="px-4 py-3">Sell</th><th class="px-4 py-3">Updated</th></tr></thead>
    <tbody>${data.map(t => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${t.gtid}</td>
      <td class="px-4 py-3 font-medium">${t.legal_name||''}</td>
      <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-20 h-2 bg-gray-200 rounded-full"><div class="h-2 rounded-full ${t.score>=80?'bg-green-500':t.score>=60?'bg-yellow-500':'bg-red-500'}" style="width:${t.score}%"></div></div><span class="font-bold">${t.score}</span></div></td>
      <td class="px-4 py-3 text-center">${t.buy_mode_score||'—'}</td>
      <td class="px-4 py-3 text-center">${t.sell_mode_score||'—'}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(t.updated_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── CONTACTS / NETWORK ─────────────────────────────────
async function renderContacts() {
  setTitle('Network / Contacts', 'Saved contacts — auto-populated from trade interactions');
  if (!tenant?.id) { document.getElementById('content').innerHTML = emptyState('Login to view contacts'); return; }
  const { data } = await api(`/tenants/${tenant.id}/contacts`);
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">GTID</th><th class="px-4 py-3 text-left">Name</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Trust</th><th class="px-4 py-3">Trades</th><th class="px-4 py-3">Last</th></tr></thead>
    <tbody>${data.map(c => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${c.contact_gtid}</td>
      <td class="px-4 py-3">${c.legal_name||'—'}</td>
      <td class="px-4 py-3 text-center text-xs">${c.type||'—'}</td>
      <td class="px-4 py-3 text-center font-semibold">${c.trust_score||'—'}</td>
      <td class="px-4 py-3 text-center">${c.trade_count}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(c.last_interaction)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No contacts yet — they auto-populate from trade interactions');
}

// ─── TRADES ─────────────────────────────────────────────
async function renderTrades() {
  const isImporter = currentPortal === 'importer';
  const isExporter = currentPortal === 'exporter';
  const label = isImporter ? 'My Trade Requests' : isExporter ? 'Incoming Trade Requests' : 'All Trade Requests';
  setTitle(label + roLabel(), 'Phase 1 — Trade initiation with governance overlay');
  const { data } = await api('/trades');
  const canCreate = isImporter && !isReadOnly();
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} trade requests</span>
      ${canCreate ? `<button onclick="showTradeWizard()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Trade</button>` : ''}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3 text-left">Importer</th><th class="px-4 py-3 text-left">Exporter</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th>${isExporter ? '<th class="px-4 py-3">Actions</th>' : ''}</tr></thead>
      <tbody>${data.map(t => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showTradeDetail('${t.id}')">
        <td class="px-4 py-3 font-mono text-xs">${t.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${t.importer_name||'—'} <span class="text-xs text-gray-400">(${t.importer_jurisdiction||''})</span></td>
        <td class="px-4 py-3">${t.exporter_name||'—'} <span class="text-xs text-gray-400">(${t.exporter_jurisdiction||''})</span></td>
        <td class="px-4 py-3 text-center">${badge(t.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(t.created_at)}</td>
        ${isExporter ? `<td class="px-4 py-3 text-center">${['PENDING_EXPORTER_RESPONSE','DRAFT','INITIATED'].includes(t.status)?`<button onclick="event.stopPropagation();showQuoteForm('${t.id}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded"><i class="fas fa-tag mr-1"></i>Submit Quote</button>`:''}</td>` : ''}
      </tr>`).join('')}</tbody></table></div>`;
}

async function showTradeDetail(id) {
  const { data } = await api(`/trades/${id}`);
  const isExporter = currentPortal === 'exporter';
  const isImporter = currentPortal === 'importer';
  const specs = data.parsed_specs || {};

  // Fetch container details for this trade (Phase 1 multi-container data)
  let containers = [];
  try {
    const ctResp = await api(`/trade/${id}/containers`);
    containers = ctResp.data || [];
  } catch(e) { /* no containers */ }

  // Parse specs — handle both legacy and new container-level format
  const hasContainers = containers.length > 0;
  const specsContainers = specs.containers || [];
  const specsIncoterm = specs.incoterm || specs.hs_code ? specs.incoterm : null;

  // Phase progress indicator
  const phaseSteps = [
    { num: 1, label: 'Initiated', done: true },
    { num: 2, label: 'Quoted', done: ['QUOTE_SUBMITTED','QUOTED','CONTRACTED','LOCKED','IN_EXECUTION'].includes(data.status) },
    { num: 3, label: 'Contracted', done: ['CONTRACTED','LOCKED','IN_EXECUTION'].includes(data.status) },
  ];

  showModal(`
    <h2 class="text-lg font-bold mb-2"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Trade Request</h2>
    <div class="flex items-center gap-1 mb-4">${phaseSteps.map(s => `
      <div class="flex items-center gap-1">
        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${s.done ? 'bg-sgtx-500 text-white' : 'bg-gray-200 text-gray-400'}">${s.num}</div>
        <span class="text-[10px] ${s.done ? 'text-sgtx-600 font-semibold' : 'text-gray-400'}">${s.label}</span>
      </div>
      ${s.num < 3 ? '<div class="w-6 h-0.5 bg-gray-200"></div>' : ''}`).join('')}
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Importer:</span> ${data.importer_name||'—'} <span class="text-xs text-gray-400">(${data.importer_gtid||''})</span></div>
      <div><span class="text-gray-500">Exporter:</span> ${data.exporter_name||'—'} <span class="text-xs text-gray-400">(${data.exporter_gtid||''})</span></div>
      <div><span class="text-gray-500">Governor:</span> <span class="font-mono text-xs">${data.governor_decision_id?.slice(0,12)||'—'}...</span></div>
    </div>

    ${hasContainers ? `
    <h3 class="font-semibold text-sm mb-2"><i class="fas fa-box text-orange-500 mr-1"></i>Containers (${containers.length})</h3>
    <div class="space-y-2 mb-3">${containers.map((ct, i) => `
      <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div class="flex items-center gap-2 mb-1">
          <span class="bg-sgtx-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">${ct.container_index || i+1}</span>
          <span class="text-xs font-semibold">${ct.container_type || '40ft_HC'}</span>
          <span class="text-[10px] text-gray-400">${ct.origin_country || '—'} → ${ct.destination_country || '—'}</span>
          ${ct.port_of_discharge ? `<span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded">POD: ${ct.port_of_discharge}</span>` : ''}
          ${ct.port_of_loading ? `<span class="text-[10px] bg-green-50 text-green-600 px-1.5 rounded">POL: ${ct.port_of_loading}</span>` : ''}
        </div>
        ${(ct.commodities||[]).length ? `<div class="ml-7 space-y-1">${ct.commodities.map(cm => `
          <div class="text-[10px] flex gap-2 items-center">
            <span class="font-semibold">${cm.product_name || '—'}</span>
            ${cm.hs_code ? `<span class="font-mono text-gray-500">HS:${cm.hs_code}</span>` : ''}
            <span class="text-gray-400">${cm.num_pallets||1} pallets</span>
            ${cm.quantity ? `<span class="text-gray-400">${cm.quantity} ${cm.unit||'KG'}</span>` : ''}
            <span class="bg-gray-100 px-1 rounded">${cm.packaging||'boxes'}</span>
          </div>`).join('')}</div>` : ''}
      </div>`).join('')}</div>
    ` : `
    <h3 class="font-semibold text-sm mb-2">Commodity Specifications</h3>
    <div class="bg-gray-50 rounded-lg p-3 mb-3">
      <div class="grid grid-cols-2 gap-2 text-xs">
        ${specs.hs_code ? `<div><span class="text-gray-500">HS Code:</span> <span class="font-mono font-semibold">${specs.hs_code}</span></div>` : ''}
        ${specs.incoterm || specsIncoterm ? `<div><span class="text-gray-500">Incoterm:</span> <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">${specs.incoterm || specsIncoterm}</span></div>` : ''}
        ${specs.quantity ? `<div><span class="text-gray-500">Quantity:</span> ${specs.quantity} ${specs.unit||'KG'}</div>` : ''}
        ${specs.qc_preference ? `<div><span class="text-gray-500">QC:</span> ${specs.qc_preference}</div>` : ''}
        ${specs.certifications?.length ? `<div class="col-span-2"><span class="text-gray-500">Certifications:</span> ${specs.certifications.map(c=>`<span class="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px] ml-1">${c}</span>`).join('')}</div>` : ''}
      </div>
      ${specs.description ? `<div class="mt-2 text-xs text-gray-600">${specs.description}</div>` : ''}
    </div>`}

    ${data.quotes?.length ? `<h3 class="font-semibold text-sm mb-2"><i class="fas fa-tag text-green-500 mr-1"></i>Exporter Quotes (${data.quotes.length})</h3>
      <div class="space-y-2 mb-3">${data.quotes.map(q=>`
        <div class="bg-gray-50 p-3 rounded-lg border ${q.status==='ACCEPTED'?'border-green-300':'border-gray-200'}">
          <div class="flex justify-between items-center">
            <div>
              <span class="text-sm font-bold text-green-600">${usd(q.exw_price)}</span>
              <span class="text-xs text-gray-500 ml-2">EXW (${q.incoterm})</span>
              ${q.exw_locked_at ? `<span class="text-[10px] text-blue-500 ml-2"><i class="fas fa-lock mr-1"></i>Locked ${time(q.exw_locked_at)}</span>` : ''}
            </div>
            <div>${badge(q.status||'SUBMITTED')}</div>
          </div>
          <div class="text-[10px] text-gray-400 mt-1">Valid ${q.validity_days} days | Created ${time(q.created_at)}</div>
        </div>`).join('')}</div>` : ''}
    ${data.channel ? `<div class="bg-blue-50 p-2 rounded text-xs mb-3"><i class="fas fa-stream mr-1 text-blue-500"></i> Trade Channel Phase: <b>${data.channel.current_phase}</b>/10</div>` : ''}
    ${!isReadOnly() ? `<div class="flex gap-2 mt-4">
      ${isExporter && ['DRAFT','INITIATED','PENDING_EXPORTER_RESPONSE'].includes(data.status) ? `<button onclick="closeModal();showQuoteForm('${data.id}')" class="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs"><i class="fas fa-tag mr-1"></i>Phase 2: Submit Quote</button>` : ''}
      ${(isImporter || currentPortal === 'admin') && ['QUOTE_SUBMITTED','QUOTED','DRAFT','INITIATED'].includes(data.status) ? `<button onclick="closeModal();showContractWizard()" class="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs"><i class="fas fa-file-contract mr-1"></i>Phase 3: Create Contract</button>` : ''}
    </div>` : ''}
  `);
}

// ─── PHASE 1: TRADE INITIATION (V2 — Multi-Container) ─────────────
// Delegates to showTradeWizardV2() in trade_forms.js for the full
// multi-container, multi-commodity trade initiation form.
function showTradeWizard() {
  if (typeof showTradeWizardV2 === 'function') {
    showTradeWizardV2();
  } else {
    alert('Trade form module not loaded. Please refresh the page.');
  }
}
// Legacy GTID resolver kept for backward compat; V2 uses resolveGTIDPreview
async function resolveGTID(gtid) {
  const preview = document.getElementById('gtid-preview');
  if (!preview || gtid.length < 15) { if(preview) preview.innerHTML = ''; return; }
  try {
    const r = await api('/gtid/resolve?gtid=' + encodeURIComponent(gtid));
    if (r.data) preview.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>${r.data.legal_name} (${r.data.jurisdiction}) — Trust: ${r.data.trust_score || '—'}</span>`;
    else preview.innerHTML = '<span class="text-red-500"><i class="fas fa-times-circle mr-1"></i>GTID not found</span>';
  } catch(e) { preview.innerHTML = ''; }
}

// ─── PHASE 2: EXPORTER QUOTE (V2 — Port of Loading + Alternative Destinations) ─────────────
// Delegates to showExporterQuoteFormV2() in trade_forms.js for the full
// EXW price lock, port of loading, and alternative destination pricing form.
function showQuoteForm(tradeId) {
  if (typeof showExporterQuoteFormV2 === 'function') {
    showExporterQuoteFormV2(tradeId);
  } else {
    alert('Quote form module not loaded. Please refresh the page.');
  }
}

// ─── CONTRACTS ──────────────────────────────────────────
async function renderContracts() {
  setTitle('Contracts' + roLabel(), 'Phase 3 — Contracting with commission collection');
  const { data } = await api('/contracts');
  const canCreate = (currentPortal === 'importer' || currentPortal === 'admin') && !isReadOnly();
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} contracts</span>
      ${canCreate ? `<button onclick="showContractWizard()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Contract</button>` : ''}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Importer</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Incoterm</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Actions</th></tr></thead>
    <tbody>${data.map(c => `<tr class="border-t border-gray-50 hover:bg-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${c.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${c.importer_name||'—'}</td>
      <td class="px-4 py-3">${c.exporter_name||'—'}</td>
      <td class="px-4 py-3 text-center"><span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">${c.incoterm}</span></td>
      <td class="px-4 py-3 text-center">${badge(c.status)}</td>
      <td class="px-4 py-3 text-center">${!isReadOnly() ? (c.status==='DRAFT'?`<button onclick="signAndLockContract('${c.id}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded">Sign & Lock</button>`:(c.status==='LOCKED'?`<button onclick="showShipmentWizard('${c.id}')" class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Create Shipment</button>`:time(c.locked_at))) : time(c.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ─── COMMISSIONS ────────────────────────────────────────
async function renderCommissions() {
  setTitle('Commission Locks', 'Non-custodial commission protection — AI formula: clamp(0.1%, 2.5%, base + country + seasonality ± geoRisk - discount + perishability)');
  const { data } = await api('/commission-locks');
  const canViewCalcs = currentPortal === 'admin' || currentPortal === 'importer' || currentPortal === 'exporter';
  document.getElementById('content').innerHTML = `
    ${canViewCalcs ? `<div class="mb-4"><button onclick="showCommissionBreakdown()" class="bg-sgtx-50 text-sgtx-600 px-4 py-2 rounded-lg text-sm hover:bg-sgtx-100"><i class="fas fa-calculator mr-1"></i>View AI Commission Calculations</button></div>` : ''}
    <div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Lock ID</th><th class="px-4 py-3">Rate</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Released</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Locked</th></tr></thead>
    <tbody>${data.map(cl => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${cl.lock_id?.slice(0,8)}...</td>
      <td class="px-4 py-3 text-center">${pct(cl.commission_rate_pct)}</td>
      <td class="px-4 py-3 text-center font-semibold text-green-600">${usd(cl.commission_usd)}</td>
      <td class="px-4 py-3 text-center"><div class="inline-flex items-center gap-2"><div class="w-16 h-2 bg-gray-200 rounded-full"><div class="h-2 bg-sgtx-500 rounded-full" style="width:${cl.released_pct||0}%"></div></div><span class="text-xs">${cl.released_pct||0}%</span></div></td>
      <td class="px-4 py-3 text-center">${badge(cl.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(cl.locked_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function showCommissionBreakdown() {
  const { data } = await api('/commissions');
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-calculator mr-2 text-sgtx-500"></i>AI Commission Calculations</h2>
    <div class="text-xs text-gray-500 mb-3 bg-blue-50 p-3 rounded-lg">
      <b>Formula:</b> clamp(0.1%, 2.5%, base_profit_rate + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability ± anomaly)
    </div>
    ${data.length ? data.map(c => `
      <div class="bg-gray-50 rounded-lg p-3 mb-3">
        <div class="flex justify-between mb-2">
          <span class="font-semibold text-sm">${c.explanation || 'Commission Calculation'}</span>
          <span class="text-green-600 font-bold">${usd(c.commission_usd)}</span>
        </div>
        <div class="grid grid-cols-4 gap-2 text-xs">
          <div>Base: <b>${(c.base_rate_pct*100).toFixed(2)}%</b></div>
          <div>Country: <b>+${(c.country_boost_pct*100).toFixed(2)}%</b></div>
          <div>Season: <b>+${(c.seasonality_pct*100).toFixed(2)}%</b></div>
          <div>GeoRisk: <b>+${(c.geopolitical_risk_pct*100).toFixed(2)}%</b></div>
          <div>Vol.Disc: <b>-${(c.volume_discount_pct*100).toFixed(2)}%</b></div>
          <div>Perish: <b>+${(c.perishability_surcharge_pct*100).toFixed(2)}%</b></div>
          <div>Anomaly: <b>${(c.anomaly_correction_pct*100).toFixed(2)}%</b></div>
          <div class="font-bold text-sgtx-600">Final: ${(c.final_rate_pct*100).toFixed(2)}%</div>
        </div>
      </div>`).join('') : emptyState('No calculations yet')}
  `);
}

// ─── SHIPMENTS ──────────────────────────────────────────
async function renderShipments() {
  const portalLabel = currentPortal === 'logistics' || currentPortal === 'shipper' ? 'Active Shipments' : currentPortal === 'qc' ? 'Shipments to Inspect' : 'Shipments';
  setTitle(portalLabel + roLabel(), 'Phase 5 — Physical execution with USTN tracking');
  const { data } = await api('/shipments');
  const canCreate = (currentPortal === 'importer' || currentPortal === 'exporter' || currentPortal === 'admin') && !isReadOnly();
  const canConfirmMilestone = (currentPortal === 'logistics' || currentPortal === 'shipper' || currentPortal === 'admin') && !isReadOnly();
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} shipments</span>
      ${canCreate ? `<button onclick="showShipmentWizard()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Shipment</button>` : ''}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">USTN</th><th class="px-4 py-3">Origin</th><th class="px-4 py-3">Destination</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Milestone</th><th class="px-4 py-3">Actions</th></tr></thead>
    <tbody>${data.map(s => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600" onclick="showShipmentDetail('${s.id}')">${s.ustn}</td>
      <td class="px-4 py-3 text-sm" onclick="showShipmentDetail('${s.id}')">${s.origin_port||'—'}</td>
      <td class="px-4 py-3 text-sm" onclick="showShipmentDetail('${s.id}')">${s.destination_port||'—'}</td>
      <td class="px-4 py-3 text-center">${badge(s.status)}</td>
      <td class="px-4 py-3 text-center text-xs">${s.current_milestone||'—'}</td>
      <td class="px-4 py-3 text-center">${canConfirmMilestone && s.status!=='DELIVERED'&&s.status!=='DISTRESSED'?`<button onclick="showMilestoneForm('${s.ustn}','${s.current_milestone||''}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded"><i class="fas fa-check mr-1"></i>Confirm</button>`:time(s.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function showShipmentDetail(id) {
  const { data } = await api(`/shipments/${id}`);
  const milestoneSteps = ['GATE_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];
  const confirmed = new Set((data.milestones||[]).map(m => m.milestone));
  showModal(`
    <h2 class="text-lg font-bold mb-2"><i class="fas fa-ship mr-2 text-sgtx-500"></i>Shipment</h2>
    <div class="font-mono text-sm text-sgtx-600 mb-4">${data.ustn}</div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Origin:</span> ${data.origin_port||'—'}</div>
      <div><span class="text-gray-500">Destination:</span> ${data.destination_port||'—'}</div>
      <div><span class="text-gray-500">Vessel:</span> ${data.vessel_name||'—'} ${data.imo_number ? `<span class="text-[10px] text-gray-400">(${data.imo_number})</span>` : ''}</div>
    </div>
    <h3 class="font-semibold text-sm mb-2">Milestone Tracker</h3>
    <div class="flex items-center gap-1 mb-4">${milestoneSteps.map(m => `
      <div class="flex-1 text-center">
        <div class="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${confirmed.has(m)?'bg-green-500 text-white':'bg-gray-200 text-gray-400'}">
          ${confirmed.has(m)?'<i class="fas fa-check"></i>':''}
        </div><div class="text-[9px] mt-1 text-gray-500">${m}</div>
      </div>`).join('<div class="w-4 h-0.5 bg-gray-200"></div>')}</div>
    ${data.milestones?.length ? `<div class="mb-3"><h4 class="text-xs font-semibold text-gray-500 mb-1">Confirmed Milestones</h4>
      <div class="space-y-1">${data.milestones.map(m=>`<div class="flex justify-between bg-gray-50 p-2 rounded text-xs"><span><i class="fas fa-check-circle text-green-500 mr-1"></i>${m.milestone}</span><span class="text-gray-400">${m.confirmation_method || 'MANUAL'} — ${time(m.confirmed_at)}</span></div>`).join('')}</div></div>` : ''}
    ${data.barcodes?.length?`<h3 class="font-semibold text-sm mb-2">Barcodes (${data.barcodes.length} pallets)</h3>
      <div class="grid grid-cols-2 gap-2 mb-3">${data.barcodes.map(b=>`<div class="bg-gray-50 p-2 rounded text-xs"><div class="font-semibold">${b.barcode_type} — Pallet ${b.pallet_number}</div><div class="font-mono text-[10px]">SSCC: ${b.sscc}</div></div>`).join('')}</div>`:''}
    ${data.document_requirements?.length?`<h3 class="font-semibold text-sm mb-2">Document Requirements</h3>
      <div class="space-y-1 mb-3">${data.document_requirements.map(d=>`<div class="flex justify-between bg-gray-50 p-2 rounded text-xs"><span>${d.document_type.replace(/_/g,' ')}</span>${badge(d.status)}</div>`).join('')}</div>`:''}
    ${data.disruption_predictions?.length?`<h3 class="font-semibold text-sm mb-2"><i class="fas fa-exclamation-triangle text-yellow-500 mr-1"></i>Disruption Predictions</h3>
      <div class="space-y-1 mb-3">${data.disruption_predictions.map(d=>`<div class="bg-yellow-50 p-2 rounded text-xs border border-yellow-200"><div class="font-semibold">${d.prediction_type}: ${(d.probability*100).toFixed(0)}% probability</div><div class="text-gray-500">${d.recommendation||''}</div>${d.predicted_delay_days?`<div class="text-yellow-700">Est. delay: ${d.predicted_delay_days} days</div>`:''}</div>`).join('')}</div>`:''}
  `);
}

// ─── BARCODES ───────────────────────────────────────────
async function renderBarcodes() {
  setTitle('Barcode Scanner', 'GS1-128/QR code scanning — milestone confirmation via barcode');
  document.getElementById('content').innerHTML = `
    <div class="card p-6">
      <h3 class="font-bold mb-4"><i class="fas fa-barcode mr-2 text-sgtx-500"></i>Scan Barcode / Enter SSCC</h3>
      <form onsubmit="scanBarcode(event)" class="flex gap-3">
        <input id="bc-sscc" class="flex-1 border rounded-lg px-4 py-2 text-sm" placeholder="Enter SSCC code or barcode ID">
        <button type="submit" class="bg-sgtx-500 text-white px-6 py-2 rounded-lg text-sm"><i class="fas fa-search mr-1"></i>Scan</button>
      </form>
      <div id="bc-result" class="mt-4"></div>
    </div>`;
}
async function scanBarcode(e) {
  e.preventDefault();
  const r = await apiPost('/barcodes/scan', { sscc: document.getElementById('bc-sscc').value });
  document.getElementById('bc-result').innerHTML = r.data ? `
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 class="font-bold text-green-800 mb-2"><i class="fas fa-check-circle mr-1"></i>Barcode Found</h4>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-500">USTN:</span> <span class="font-mono text-sgtx-600">${r.data.barcode.shipment_ustn}</span></div>
        <div><span class="text-gray-500">Pallet:</span> ${r.data.barcode.pallet_number}</div>
        <div><span class="text-gray-500">Type:</span> ${r.data.barcode.barcode_type}</div>
        <div><span class="text-gray-500">Status:</span> ${badge(r.data.shipment?.status||'UNKNOWN')}</div>
      </div>
    </div>` : `<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">${r.error || 'Barcode not found'}</div>`;
}

// ─── SETTLEMENTS ────────────────────────────────────────
async function renderSettlements() {
  setTitle('Settlements' + roLabel(), 'Phase 6 — USTN-linked settlement orchestration');
  const { data } = await api('/settlements');
  const canCreate = !isReadOnly() && (currentPortal === 'admin' || currentPortal === 'logistics' || currentPortal === 'shipper');
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} settlement instructions</span>
      ${canCreate ? `<button onclick="showSettlementForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Create Settlement</button>` : ''}
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">USTN</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Actions</th></tr></thead>
    <tbody>${data.map(s => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${s.id?.slice(0,8)}...</td>
      <td class="px-4 py-3 font-mono text-xs text-sgtx-600">${s.ustn||'—'}</td>
      <td class="px-4 py-3">${s.instruction_type}</td>
      <td class="px-4 py-3 text-center">${badge(s.status)}</td>
      <td class="px-4 py-3 text-center">${!isReadOnly() && s.status==='PENDING'?`<button onclick="confirmSettlement('${s.id}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded">Confirm</button>`:time(s.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No settlement instructions yet')}`;
}

// ─── FINANCING ──────────────────────────────────────────
async function renderFinancing() {
  const isFinancier = currentPortal === 'financier';
  setTitle(isFinancier ? 'Active Financing Requests' : 'Financing' + roLabel(), 'Phase 4 — Universal trade finance with blind bidding');
  const { data } = await api('/financing');
  const canCreate = (currentPortal === 'importer' || currentPortal === 'admin') && !isReadOnly();
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} financing requests</span>
      ${canCreate ? `<button onclick="showFinancingForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>Request Financing</button>` : ''}
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Requester</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Tenor</th><th class="px-4 py-3">Status</th>${isFinancier ? '<th class="px-4 py-3">Actions</th>' : ''}</tr></thead>
    <tbody>${data.map(f => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${f.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${f.requester_name||'—'}</td>
      <td class="px-4 py-3 text-center font-semibold">${usd(f.amount)}</td>
      <td class="px-4 py-3 text-center text-xs">${f.financing_type}</td>
      <td class="px-4 py-3 text-center">${f.tenor_days}d</td>
      <td class="px-4 py-3 text-center">${badge(f.status)}</td>
      ${isFinancier ? `<td class="px-4 py-3 text-center">${f.status==='REQUESTED'||f.status==='BIDDING'?`<button onclick="showFinancingBidForm('${f.id}','${f.amount}')" class="text-xs bg-green-500 text-white px-2 py-1 rounded">Submit Bid</button>`:''}</td>` : ''}
    </tr>`).join('')}</tbody></table></div>` : emptyState('No financing requests yet — available after contract lock (Phase 4)')}`;
}

// Financier bid form
function showFinancingBidForm(requestId, amount) {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Submit Financing Bid</h2>
    <div class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg"><i class="fas fa-info-circle mr-1"></i> Blind bidding: Your bid is encrypted until the auction window closes (48h).</div>
    <form onsubmit="submitFinancingBid(event)" class="space-y-3">
      <input type="hidden" id="fb-request" value="${requestId}">
      <div class="bg-gray-50 p-3 rounded text-sm mb-2">Requested Amount: <b>${usd(Number(amount))}</b></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Effective APR (%)</label><input id="fb-apr" type="number" step="0.01" class="w-full border rounded-lg px-3 py-2 text-sm" value="8.50" required></div>
        <div><label class="text-sm text-gray-600">All-in Cost (%)</label><input id="fb-allin" type="number" step="0.01" class="w-full border rounded-lg px-3 py-2 text-sm" value="9.25"></div>
      </div>
      <div><label class="text-sm text-gray-600">Conditions</label><textarea id="fb-cond" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Any special conditions..."></textarea></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit Bid (Governor Gated)</button>
    </form>`);
}
async function submitFinancingBid(e) {
  e.preventDefault();
  const r = await apiPost('/financing/bids', {
    financing_request_id: document.getElementById('fb-request').value,
    financier_tenant_id: tenant?.id, effective_apr: Number(document.getElementById('fb-apr').value),
    all_in_cost: Number(document.getElementById('fb-allin').value),
    conditions: document.getElementById('fb-cond').value, actor_gtid: tenant?.gtid || 'system'
  });
  if (r.error) { alert('Error: ' + r.error); return; }
  alert('Bid submitted successfully (encrypted).');
  closeModal(); navigate('financing');
}

// ─── DeFi ───────────────────────────────────────────────
async function renderDeFi() {
  setTitle('DeFi / Crypto Financing', 'Aave V3, Compound, Uniswap V3 — Stablecoin settlement');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-link','Supported Protocols','4','bg-purple-50 text-purple-600')}
      ${statCard('fas fa-coins','Stablecoin Limit','30% Trade Value','bg-blue-50 text-blue-600')}
      ${statCard('fas fa-shield-halved','Depeg Threshold','0.5% warn / 2% freeze','bg-red-50 text-red-600')}
    </div>
    <div class="card p-5 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-link mr-2 text-sgtx-500"></i>DeFi Protocol Matrix</h3>
      <div class="grid grid-cols-4 gap-3">
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Aave V3</div><div class="text-xs text-gray-500">Polygon</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Compound</div><div class="text-xs text-gray-500">Base</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">Uniswap V3</div><div class="text-xs text-gray-500">FX Hedging</div><div class="text-xs text-green-600 mt-1">Active</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><div class="font-bold text-sm">IPFS/Arweave</div><div class="text-xs text-gray-500">Storage</div><div class="text-xs text-green-600 mt-1">Active</div></div>
      </div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3">Country DeFi Matrix</h3>
      <div class="grid grid-cols-3 gap-3 text-xs">
        <div class="bg-green-50 p-3 rounded-lg"><div class="font-bold text-green-800">Friendly</div><div class="text-green-600 mt-1">SG, CH, AE, GB, HK</div></div>
        <div class="bg-yellow-50 p-3 rounded-lg"><div class="font-bold text-yellow-800">Restricted</div><div class="text-yellow-600 mt-1">US, EU, JP, AU</div></div>
        <div class="bg-red-50 p-3 rounded-lg"><div class="font-bold text-red-800">Prohibited</div><div class="text-red-600 mt-1">CN, EG, IN, RU</div></div>
      </div>
    </div>`;
}

// ─── DISTRESSED ─────────────────────────────────────────
async function renderDistressed() {
  setTitle('Distressed Cargo' + roLabel(), 'Phase 7 — AI-driven cargo resolution');
  const { data } = await api('/distressed');
  const canCreate = currentPortal === 'exporter' || currentPortal === 'admin';
  document.getElementById('content').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} distressed listings</span>
      ${canCreate && !isReadOnly() ? `<button onclick="showDistressedForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-plus mr-1"></i>List Distressed Cargo</button>` : ''}
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Location</th><th class="px-4 py-3">Qty</th><th class="px-4 py-3">Price</th><th class="px-4 py-3">Status</th></tr></thead>
    <tbody>${data.map(d => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
      <td class="px-4 py-3">${d.exporter_name||'—'}</td>
      <td class="px-4 py-3">${d.current_location}</td>
      <td class="px-4 py-3 text-center">${d.quantity} ${d.unit}</td>
      <td class="px-4 py-3 text-center">${usd(d.price_expectation)}</td>
      <td class="px-4 py-3 text-center">${badge(d.status)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No distressed cargo listings')}`;
}

// ─── BUYER SEARCH ───────────────────────────────────────
async function renderBuyerSearch() {
  setTitle('Buyer Search', 'Phase 8 — Exporter-initiated buyer matching');
  const { data } = await api('/buyer-search');
  const canCreate = currentPortal === 'exporter' || currentPortal === 'admin';
  document.getElementById('content').innerHTML = `
    <div class="flex justify-end mb-4">
      ${canCreate ? `<button onclick="showBuyerSearchForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-search mr-1"></i>New Buyer Search</button>` : ''}
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Exporter</th><th class="px-4 py-3">Product</th><th class="px-4 py-3">Qty</th><th class="px-4 py-3">Min Trust</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${data.map(b => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${b.id?.slice(0,8)}...</td>
        <td class="px-4 py-3">${b.exporter_name||'—'}</td>
        <td class="px-4 py-3 text-xs">${JSON.stringify(b.product_details||{}).slice(0,40)}...</td>
        <td class="px-4 py-3 text-center">${b.quantity} ${b.unit}</td>
        <td class="px-4 py-3 text-center">${b.min_buyer_trust_score||60}</td>
        <td class="px-4 py-3 text-center">${badge(b.status)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No active buyer search requests')}`;
}
function showBuyerSearchForm() {
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-search-dollar mr-2 text-sgtx-500"></i>New Buyer Search</h2>
    <form onsubmit="submitBuyerSearch(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Exporter Tenant ID</label><input id="bs-exp" class="w-full border rounded-lg px-3 py-2 text-sm" value="${tenant?.id||'t-002'}" required></div>
      <div><label class="text-sm text-gray-600">Product Description</label><textarea id="bs-product" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2">Organic cotton yarn, GOTS certified</textarea></div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="text-sm text-gray-600">Quantity</label><input id="bs-qty" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="5000"></div>
        <div><label class="text-sm text-gray-600">Unit</label><input id="bs-unit" class="w-full border rounded-lg px-3 py-2 text-sm" value="KG"></div>
        <div><label class="text-sm text-gray-600">Min Trust Score</label><input id="bs-trust" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="60"></div>
      </div>
      <div><label class="text-sm text-gray-600">Listing Expiry</label><input id="bs-expiry" type="date" class="w-full border rounded-lg px-3 py-2 text-sm" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit (Governor Gated)</button>
    </form>`);
}
async function submitBuyerSearch(e) {
  e.preventDefault();
  await apiPost('/buyer-search', { exporter_tenant_id: document.getElementById('bs-exp').value, product_details: { description: document.getElementById('bs-product').value }, quantity: Number(document.getElementById('bs-qty').value), unit: document.getElementById('bs-unit').value, min_buyer_trust_score: Number(document.getElementById('bs-trust').value), listing_expiry: document.getElementById('bs-expiry').value, actor_gtid: tenant?.gtid || 'system' });
  closeModal(); navigate('buyersearch');
}

// ─── PAYMENTS ───────────────────────────────────────────
async function renderPayments() {
  setTitle('Payment Orchestrator', 'Phase 9 — Global PSP routing');
  const [payments, aggregators] = await Promise.all([api('/payments'), api('/payment-aggregators')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-server mr-2 text-sgtx-500"></i>PSP Aggregators (${aggregators.data.length})</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">${aggregators.data.map(a => `
      <div class="card p-3 text-center">
        <div class="font-semibold text-sm">${a.name}</div>
        <div class="text-xs text-gray-500 mt-1">${JSON.parse(a.country_codes||'[]').join(', ')}</div>
        <div class="text-xs mt-1">Uptime: <span class="text-green-600 font-semibold">${(a.uptime_score*100).toFixed(1)}%</span></div>
      </div>`).join('')}</div>
    <h3 class="font-bold mb-3"><i class="fas fa-credit-card mr-2 text-sgtx-500"></i>Payment Attempts</h3>
    ${payments.data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">PSP</th><th class="px-4 py-3">Country</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Commission</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${payments.data.map(p => `<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${p.aggregator_name}</td>
        <td class="px-4 py-3 text-center">${p.buyer_country}</td>
        <td class="px-4 py-3 text-center">${usd(p.amount_usd)}</td>
        <td class="px-4 py-3 text-center text-green-600">${usd(p.commission_amount_usd)}</td>
        <td class="px-4 py-3 text-center">${badge(p.status)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No payments yet')}`;
}

// ─── DISPUTES ───────────────────────────────────────────
async function renderDisputes() {
  setTitle('Disputes' + roLabel(), 'Phase 10 — AI mediation, triage, predictive outcome & ICC/DIFC-LCIA arbitration');
  const gtidFilter = (currentPortal === 'importer' || currentPortal === 'exporter') && tenant?.gtid ? `?gtid=${tenant.gtid}` : '';
  const { data } = await api('/disputes' + gtidFilter);
  const canFile = (currentPortal === 'importer' || currentPortal === 'exporter' || currentPortal === 'admin') && !isReadOnly();

  // Stats summary
  const total = data.length;
  const pending = data.filter(d => d.status === 'FILED' || d.status === 'IN_MEDIATION').length;
  const resolved = data.filter(d => ['RESOLVED','SETTLED','ARBITRATED','DISMISSED'].includes(d.status)).length;

  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      ${statCard('fas fa-balance-scale-right', 'Total Disputes', total, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-clock', 'Pending/Mediation', pending, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-check-circle', 'Resolved', resolved, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-triangle', 'CommLocks Frozen', data.filter(d=>d.status==='FILED').length, 'bg-orange-50 text-orange-600')}
    </div>
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">${data.length} disputes</span>
      <div class="flex gap-2">
        ${canFile ? `<button onclick="showDisputeForm()" class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"><i class="fas fa-balance-scale-right mr-1"></i>File Dispute</button>` : ''}
        <button onclick="navigate('disputehistory')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"><i class="fas fa-history mr-1"></i>View History</button>
      </div>
    </div>
    ${data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Filing Party</th><th class="px-4 py-3">Respondent</th><th class="px-4 py-3">Severity</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Filed</th><th class="px-4 py-3">Actions</th></tr></thead>
    <tbody>${data.map(d => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showDisputeDetail('${d.id}')">
      <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
      <td class="px-4 py-3"><span class="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">${d.dispute_type}</span></td>
      <td class="px-4 py-3 text-xs">${d.filing_party_name||d.filing_party_gtid}</td>
      <td class="px-4 py-3 text-xs">${d.respondent_name||d.respondent_gtid||'—'}</td>
      <td class="px-4 py-3 text-center">${d.severity ? `<span class="inline-flex items-center gap-1 text-xs ${d.severity>=4?'text-red-600':d.severity>=3?'text-yellow-600':'text-green-600'}"><i class="fas fa-circle text-[6px]"></i>${d.severity}/5</span>` : '—'}</td>
      <td class="px-4 py-3 text-center">${badge(d.status)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(d.filed_at)}</td>
      <td class="px-4 py-3 text-center">${d.resolution_path ? `<span class="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">${d.resolution_path}</span>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No disputes filed')}`;
}

async function showDisputeDetail(id) {
  const { data } = await api(`/disputes/${id}`);
  const mediationLog = JSON.parse(data.mediation_log || '[]');
  const recs = data.recommendations || [];
  showModal(`
    <h2 class="text-lg font-bold mb-3"><i class="fas fa-balance-scale-right mr-2 text-red-500"></i>Dispute Detail</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">ID:</span> <span class="font-mono text-xs">${data.id}</span></div>
      <div><span class="text-gray-500">Type:</span> <span class="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">${data.dispute_type}</span></div>
      <div><span class="text-gray-500">Status:</span> ${badge(data.status)}</div>
      <div><span class="text-gray-500">Severity:</span> ${data.severity||'—'}/5</div>
      <div><span class="text-gray-500">Filer:</span> ${data.filing_party_name||data.filing_party_gtid}</div>
      <div><span class="text-gray-500">Respondent:</span> ${data.respondent_name||data.respondent_gtid||'—'}</div>
      <div><span class="text-gray-500">Resolution Path:</span> ${data.resolution_path||'Pending Triage'}</div>
      <div><span class="text-gray-500">Filed:</span> ${time(data.filed_at)}</div>
    </div>
    ${data.description ? `<div class="bg-gray-50 rounded-lg p-3 mb-3"><h4 class="text-xs font-semibold text-gray-500 mb-1">Description</h4><p class="text-sm">${data.description}</p></div>` : ''}
    ${recs.length ? `<div class="mb-3"><h4 class="text-xs font-semibold text-gray-500 mb-2">AI Recommendations</h4>
      <div class="space-y-2">${recs.map(r => `
        <div class="bg-blue-50 p-2 rounded-lg text-xs border border-blue-100">
          <div class="flex justify-between mb-1"><span class="font-semibold text-blue-800">${r.recommendation_type||'TRIAGE'}</span><span class="text-gray-400">${r.confidence ? (r.confidence*100).toFixed(0)+'% confidence' : ''}</span></div>
          <div class="text-blue-700">${r.ai_prediction||'—'}</div>
          ${r.suggested_settlement ? `<div class="mt-1 text-green-700"><b>Settlement:</b> ${typeof r.suggested_settlement === 'string' ? r.suggested_settlement : JSON.stringify(r.suggested_settlement)}</div>` : ''}
        </div>`).join('')}</div></div>` : ''}
    ${mediationLog.length ? `<div class="mb-3"><h4 class="text-xs font-semibold text-gray-500 mb-2">Mediation Log (${mediationLog.length} messages)</h4>
      <div class="space-y-2 max-h-40 overflow-y-auto">${mediationLog.map(m => `
        <div class="bg-gray-50 p-2 rounded text-xs">
          <div class="flex justify-between text-gray-400 mb-1"><span class="font-semibold text-gray-700">${m.sender_name||m.sender_gtid}</span><span>${time(m.timestamp)}</span></div>
          <div>${m.message}</div>
        </div>`).join('')}</div></div>` : ''}
    ${data.ai_settlement_proposal ? `<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3"><h4 class="text-xs font-semibold text-green-800 mb-1"><i class="fas fa-robot mr-1"></i>AI Settlement Proposal</h4><p class="text-sm text-green-700">${typeof data.ai_settlement_proposal === 'string' ? data.ai_settlement_proposal : JSON.stringify(data.ai_settlement_proposal)}</p></div>` : ''}
    ${!isReadOnly() ? `<div class="flex gap-2 mt-4">
      <button onclick="closeModal();addMediationMessage('${data.id}')" class="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs"><i class="fas fa-comment mr-1"></i>Add Mediation Message</button>
      ${data.status === 'FILED' || data.status === 'IN_MEDIATION' ? `<button onclick="closeModal();resolveDispute('${data.id}')" class="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs"><i class="fas fa-check mr-1"></i>Resolve</button>` : ''}
    </div>` : ''}
  `);
}

function addMediationMessage(disputeId) {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-comment mr-2 text-blue-500"></i>Add Mediation Message</h2>
    <form onsubmit="submitMediation(event,'${disputeId}')" class="space-y-3">
      <div><label class="text-sm text-gray-600">Message</label><textarea id="med-msg" class="w-full border rounded-lg px-3 py-2 text-sm" rows="4" placeholder="Enter your mediation message..." required></textarea></div>
      <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg text-sm"><i class="fas fa-paper-plane mr-1"></i>Send</button>
    </form>`);
}
async function submitMediation(e, disputeId) {
  e.preventDefault();
  await apiPost(`/disputes/${disputeId}/mediation`, { sender_gtid: tenant?.gtid || 'system', sender_name: tenant?.legal_name || employee?.full_name || 'Unknown', message: document.getElementById('med-msg').value });
  closeModal(); navigate('disputes');
}

async function resolveDispute(disputeId) {
  const status = prompt('Resolution type: RESOLVED, SETTLED, ARBITRATED, DISMISSED', 'SETTLED');
  if (!status) return;
  await apiPost(`/disputes/${disputeId}/status`, { status: status.toUpperCase() });
  navigate('disputes');
}

// ─── DISPUTE HISTORY (Persistent Per-Entity Tracking) ───
async function renderDisputeHistory() {
  const isEntityView = (currentPortal === 'importer' || currentPortal === 'exporter') && tenant?.gtid;
  setTitle('Dispute History' + roLabel(), 'Persistent dispute tracking — risk scoring & flagged entities');

  if (isEntityView) {
    // Show this entity's own dispute history
    const { data } = await api(`/dispute-history?gtid=${tenant.gtid}`);
    const h = data.history;
    const disputes = data.disputes || [];
    document.getElementById('content').innerHTML = `
      ${h ? `
      <div class="card p-5 mb-6">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-user-shield mr-2 text-sgtx-500"></i>My Dispute Profile</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          ${statCard('fas fa-balance-scale-right', 'Total Disputes', h.total_disputes, 'bg-red-50 text-red-600')}
          ${statCard('fas fa-arrow-up', 'Filed by Me', h.disputes_as_filer, 'bg-blue-50 text-blue-600')}
          ${statCard('fas fa-arrow-down', 'Filed Against Me', h.disputes_as_respondent, 'bg-orange-50 text-orange-600')}
          ${statCard('fas fa-shield-halved', 'Risk Score', h.risk_score?.toFixed(0) || '0', h.risk_score >= 40 ? 'bg-red-50 text-red-600' : h.risk_score >= 20 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600')}
        </div>
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.quality_disputes||0}</div><div class="text-gray-500">Quality</div></div>
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.delivery_disputes||0}</div><div class="text-gray-500">Delivery</div></div>
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.payment_disputes||0}</div><div class="text-gray-500">Payment</div></div>
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.documentation_disputes||0}</div><div class="text-gray-500">Docs</div></div>
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.disputes_won||0}</div><div class="text-gray-500 text-green-600">Won</div></div>
          <div class="bg-gray-50 p-2 rounded text-center"><div class="font-bold">${h.disputes_settled||0}</div><div class="text-gray-500 text-blue-600">Settled</div></div>
        </div>
      </div>` : '<div class="card p-5 mb-6 text-center text-gray-400"><i class="fas fa-check-circle text-green-500 text-2xl mb-2"></i><p class="font-semibold">Clean Record</p><p class="text-sm">No dispute history found.</p></div>'}
      <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-list mr-2 text-sgtx-500"></i>My Disputes</h3>
      ${disputes.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
        <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">My Role</th><th class="px-4 py-3">Other Party</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Filed</th></tr></thead>
        <tbody>${disputes.map(d => {
          const isFiler = d.filing_party_gtid === tenant.gtid;
          return `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showDisputeDetail('${d.id}')">
            <td class="px-4 py-3 font-mono text-xs">${d.id?.slice(0,8)}...</td>
            <td class="px-4 py-3"><span class="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs">${d.dispute_type}</span></td>
            <td class="px-4 py-3 text-xs">${isFiler ? '<span class="text-blue-600">Filer</span>' : '<span class="text-orange-600">Respondent</span>'}</td>
            <td class="px-4 py-3 text-xs">${isFiler ? (d.respondent_name||d.respondent_gtid||'—') : (d.filing_party_name||d.filing_party_gtid)}</td>
            <td class="px-4 py-3 text-center">${badge(d.status)}</td>
            <td class="px-4 py-3 text-xs text-gray-400">${time(d.filed_at)}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : emptyState('No disputes found')}`;
  } else {
    // Government / Regulatory / Admin: show all entities
    const [historyData, statsData] = await Promise.all([api('/dispute-history'), api('/dispute-history/stats')]);
    const all = historyData.data?.all || [];
    const flagged = historyData.data?.flagged || [];
    const stats = statsData.data || {};

    document.getElementById('content').innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        ${statCard('fas fa-balance-scale-right', 'Total Disputes', stats.total_disputes, 'bg-red-50 text-red-600')}
        ${statCard('fas fa-clock', 'Pending', stats.pending_disputes, 'bg-yellow-50 text-yellow-600')}
        ${statCard('fas fa-check-circle', 'Resolved', stats.resolved_disputes, 'bg-green-50 text-green-600')}
        ${statCard('fas fa-flag', 'Flagged Entities', stats.flagged_entities, 'bg-orange-50 text-orange-600')}
      </div>
      ${stats.by_type?.length ? `<div class="card p-5 mb-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>Disputes by Type</h3>
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2">${stats.by_type.map(t => `
          <div class="bg-gray-50 p-2 rounded text-center text-xs"><div class="font-bold text-lg">${t.count}</div><div class="text-gray-500">${t.dispute_type}</div></div>`).join('')}</div>
      </div>` : ''}
      ${flagged.length ? `<div class="card p-5 mb-5">
        <h3 class="font-bold mb-3 text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>Flagged Entities (${flagged.length})</h3>
        <div class="text-xs text-gray-500 mb-3">Entities with risk score >= 40 or >= 3 disputes as respondent</div>
        <div class="space-y-2">${flagged.map(f => `
          <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div>
              <span class="font-semibold text-sm">${f.entity_name||f.entity_gtid}</span>
              <span class="text-xs text-gray-500 ml-2 font-mono">${f.entity_gtid}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs"><b>${f.total_disputes}</b> disputes</span>
              <span class="text-xs text-orange-600"><b>${f.disputes_as_respondent}</b> as respondent</span>
              <span class="px-2 py-0.5 rounded text-xs font-bold ${f.risk_score>=60?'bg-red-200 text-red-800':f.risk_score>=40?'bg-orange-200 text-orange-800':'bg-yellow-200 text-yellow-800'}">Risk: ${f.risk_score?.toFixed(0)}</span>
            </div>
          </div>`).join('')}</div>
      </div>` : ''}
      <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-list mr-2 text-sgtx-500"></i>All Entities with Dispute History (${all.length})</h3>
      ${all.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
        <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Entity</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Total</th><th class="px-4 py-3">Filed</th><th class="px-4 py-3">Received</th><th class="px-4 py-3">Won</th><th class="px-4 py-3">Settled</th><th class="px-4 py-3">Pending</th><th class="px-4 py-3">Risk</th><th class="px-4 py-3">Last</th></tr></thead>
        <tbody>${all.map(h => `<tr class="border-t border-gray-50 ${h.risk_score>=40?'bg-red-50':''} hover:bg-gray-50">
          <td class="px-4 py-3"><span class="font-medium">${h.entity_name||'—'}</span><br><span class="font-mono text-[10px] text-gray-400">${h.entity_gtid}</span></td>
          <td class="px-4 py-3 text-xs text-center">${h.entity_type||'—'}</td>
          <td class="px-4 py-3 text-center font-bold">${h.total_disputes}</td>
          <td class="px-4 py-3 text-center text-blue-600">${h.disputes_as_filer}</td>
          <td class="px-4 py-3 text-center text-orange-600">${h.disputes_as_respondent}</td>
          <td class="px-4 py-3 text-center text-green-600">${h.disputes_won}</td>
          <td class="px-4 py-3 text-center">${h.disputes_settled}</td>
          <td class="px-4 py-3 text-center text-yellow-600">${h.disputes_pending}</td>
          <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${h.risk_score>=60?'bg-red-200 text-red-800':h.risk_score>=40?'bg-orange-200 text-orange-800':h.risk_score>=20?'bg-yellow-200 text-yellow-800':'bg-green-200 text-green-800'}">${h.risk_score?.toFixed(0)||0}</span></td>
          <td class="px-4 py-3 text-xs text-gray-400">${time(h.last_dispute_at)}</td>
        </tr>`).join('')}</tbody></table></div>` : emptyState('No dispute history recorded')}`;
  }
}

// ─── GOVERNOR ───────────────────────────────────────────
async function renderGovernor() {
  setTitle('Governor Decisions', 'OPA + WasmEdge + Loom — Single point of truth');
  const { data } = await api('/governor/decisions?limit=100');
  const counts = { ALLOW: 0, DENY: 0, CONDITIONAL: 0, ESCALATE: 0, PENDING: 0 };
  data.forEach(d => counts[d.verdict] = (counts[d.verdict] || 0) + 1);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-5 gap-3 mb-5">
      ${Object.entries(counts).map(([v,c]) => `<div class="card p-3 text-center"><div class="text-2xl font-bold verdict-${v}">${c}</div><div class="text-xs text-gray-500">${v}</div></div>`).join('')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Actor</th><th class="px-4 py-3">Verdict</th><th class="px-4 py-3">Confidence</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${data.map(d => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showDecisionDetail('${d.decision_id}')">
        <td class="px-4 py-3 font-mono text-xs">${d.decision_id?.slice(0,12)}...</td>
        <td class="px-4 py-3 text-xs">${d.decision_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${(d.actor_gtid||'').slice(0,20)}${(d.actor_gtid||'').length>20?'...':''}</td>
        <td class="px-4 py-3 text-center">${verdictBadge(d.verdict)}</td>
        <td class="px-4 py-3 text-center">${d.confidence?(d.confidence*100).toFixed(0)+'%':'—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(d.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

async function showDecisionDetail(id) {
  const { data } = await api(`/governor/decisions/${id}`);
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Governor Decision</h2>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      <div><span class="text-gray-500">ID:</span> <span class="font-mono text-xs">${data.decision_id}</span></div>
      <div><span class="text-gray-500">Type:</span> ${data.decision_type}</div>
      <div><span class="text-gray-500">Verdict:</span> ${verdictBadge(data.verdict)}</div>
      <div><span class="text-gray-500">Confidence:</span> ${data.confidence?(data.confidence*100).toFixed(1)+'%':'—'}</div>
      <div><span class="text-gray-500">Actor:</span> <span class="font-mono text-xs">${data.actor_gtid}</span></div>
      <div><span class="text-gray-500">Policy:</span> ${data.policy_version}</div>
    </div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3"><h3 class="text-xs font-semibold mb-1">Explanation</h3><p class="text-sm">${data.explainability||'—'}</p></div>
    <div class="bg-gray-50 p-3 rounded-lg mb-3"><h3 class="text-xs font-semibold mb-1">Conditions</h3><pre class="text-xs">${data.conditions||'[]'}</pre></div>
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div><span class="text-gray-500">Loom Hash:</span><div class="font-mono break-all">${data.loom_hash}</div></div>
      <div><span class="text-gray-500">Signature:</span><div class="font-mono break-all">${(data.cryptographic_signature||'').slice(0,40)}...</div></div>
    </div>
  `);
}

// ─── JURISDICTIONS ──────────────────────────────────────
async function renderJurisdictions() {
  setTitle('Jurisdictions', 'Global coverage — 27 jurisdictions + sanctions matrix');
  const { data } = await api('/jurisdictions');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-3 mb-5">
      ${statCard('fas fa-check-circle','Clear',data.filter(j=>j.sanctions_level==='NONE').length,'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-circle','High Risk',data.filter(j=>j.sanctions_level==='HIGH_RISK').length,'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-ban','Blocked',data.filter(j=>j.sanctions_level==='BLOCKED').length,'bg-red-50 text-red-600')}
    </div>
    <div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Code</th><th class="px-4 py-3 text-left">Country</th><th class="px-4 py-3">Sanctions</th><th class="px-4 py-3">KYC</th><th class="px-4 py-3">CBDC</th><th class="px-4 py-3">PSPs</th></tr></thead>
      <tbody>${data.map(j => `<tr class="border-t border-gray-50 ${j.sanctions_level==='BLOCKED'?'bg-red-50':j.sanctions_level==='HIGH_RISK'?'bg-yellow-50':''}">
        <td class="px-4 py-3 text-center font-semibold">${j.code}</td>
        <td class="px-4 py-3">${j.name}</td>
        <td class="px-4 py-3 text-center">${badge(j.sanctions_level)}</td>
        <td class="px-4 py-3 text-center">T${j.kyc_tier_required}</td>
        <td class="px-4 py-3 text-center text-xs">${j.cbdc_status}</td>
        <td class="px-4 py-3 text-xs">${JSON.parse(j.psp_partners||'[]').join(', ')}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

// ─── COMPLIANCE ─────────────────────────────────────────
async function renderCompliance() {
  setTitle('Compliance', 'AML/KYC/Sanctions screening & monitoring');
  const [events, checks] = await Promise.all([api('/compliance/events'), api('/compliance/checks')]);
  document.getElementById('content').innerHTML = `
    <h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>Events (${events.data.length})</h3>
    ${events.data.length?`<div class="card overflow-x-auto mb-6"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Severity</th><th class="px-4 py-3">Resolved</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${events.data.map(e=>`<tr class="border-t border-gray-50">
        <td class="px-4 py-3">${e.event_type}</td>
        <td class="px-4 py-3 font-mono text-xs">${e.entity_gtid||'—'}</td>
        <td class="px-4 py-3 text-center">${badge(e.severity)}</td>
        <td class="px-4 py-3 text-center">${e.resolved?'<i class="fas fa-check text-green-500"></i>':'<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(e.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>`:emptyState('No compliance events')}
    <h3 class="font-bold mb-3"><i class="fas fa-clipboard-check mr-2 text-sgtx-500"></i>Checks (${checks.data.length})</h3>
    ${checks.data.length?`<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3">Type</th><th class="px-4 py-3">Result</th><th class="px-4 py-3">Time</th></tr></thead>
      <tbody>${checks.data.map(c=>`<tr class="border-t border-gray-50"><td class="px-4 py-3">${c.check_type}</td><td class="px-4 py-3 text-center">${badge(c.result)}</td><td class="px-4 py-3 text-xs text-gray-400">${time(c.checked_at)}</td></tr>`).join('')}</tbody></table></div>`:emptyState('No checks')}`;
}

// ─── AUDIT ──────────────────────────────────────────────
async function renderAudit() {
  setTitle('Audit Log', 'Immutable trail — Loom + Ed25519 + hash chain');
  const { data } = await api('/audit?limit=100');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3">#</th><th class="px-4 py-3">Table</th><th class="px-4 py-3">Record</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Time</th></tr></thead>
    <tbody>${data.map(a => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3 text-xs">${a.id}</td>
      <td class="px-4 py-3 text-xs font-mono">${a.table_name}</td>
      <td class="px-4 py-3 text-xs font-mono">${(a.record_id||'').slice(0,8)}...</td>
      <td class="px-4 py-3">${badge(a.action)}</td>
      <td class="px-4 py-3 text-xs text-gray-400">${time(a.changed_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No audit entries');
}

// ─── ESG ────────────────────────────────────────────────
async function renderESG() {
  setTitle('ESG Assessments', 'Environmental, Social, Governance — IMO EEXI 2023');
  const { data } = await api('/esg');
  document.getElementById('content').innerHTML = data.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
    <thead class="bg-gray-50"><tr><th class="px-4 py-3">Entity</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">ESG</th><th class="px-4 py-3">Env</th><th class="px-4 py-3">Social</th><th class="px-4 py-3">Gov</th><th class="px-4 py-3">Carbon</th></tr></thead>
    <tbody>${data.map(e => `<tr class="border-t border-gray-50">
      <td class="px-4 py-3">${e.legal_name||e.entity_gtid}</td>
      <td class="px-4 py-3 text-xs">${e.assessment_type}</td>
      <td class="px-4 py-3 text-center font-bold">${e.esg_score}</td>
      <td class="px-4 py-3 text-center text-green-600">${e.environmental_score||'—'}</td>
      <td class="px-4 py-3 text-center text-blue-600">${e.social_score||'—'}</td>
      <td class="px-4 py-3 text-center text-purple-600">${e.governance_score||'—'}</td>
      <td class="px-4 py-3 text-center text-xs">${e.carbon_intensity||'—'}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No ESG assessments');
}

// ─── MARKETPLACE ────────────────────────────────────────
async function renderMarketplace() {
  setTitle('Marketplace API', 'Partner integration — revenue share');
  document.getElementById('content').innerHTML = `
    <div class="card p-6 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-store mr-2 text-sgtx-500"></i>Marketplace API Endpoints</h3>
      <div class="space-y-2 text-sm">
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/intent/analyze</code><span class="text-gray-500 ml-2">— Analyze trade intent</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/trade/initiate</code><span class="text-gray-500 ml-2">— Initiate trade</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">GET /api/v1/partner/suppliers/match</code><span class="text-gray-500 ml-2">— Match suppliers</span></div>
        <div class="bg-gray-50 p-3 rounded"><code class="text-sgtx-600">POST /api/v1/partner/webhook/register</code><span class="text-gray-500 ml-2">— Register webhook</span></div>
      </div>
    </div>
    <div class="card p-6">
      <h3 class="font-bold mb-3">Revenue Model</h3>
      <div class="text-sm text-gray-600">
        <p class="mb-2"><b>Commission Split:</b> Negotiated per partner (e.g., 0.5% partner / 1.0% SGTX)</p>
        <p class="mb-2"><b>Additional Streams:</b> DeFi 0.25%, Financier 0.15%, Stablecoin 0.10%, Blockchain $50/verification</p>
        <p><b>SGTX invisible</b> to marketplace end users — white-label execution engine.</p>
      </div>
    </div>`;
}

// ─── ROUTES ─────────────────────────────────────────────
async function renderRoutes() {
  setTitle('Route Intelligence', 'Self-hosted Nominatim + OSRM — AI learning loop');
  document.getElementById('content').innerHTML = `
    <div class="card p-6 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-route mr-2 text-sgtx-500"></i>Route Intelligence Stack</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-map-marker-alt text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">Nominatim</div><div class="text-xs text-gray-500">Self-hosted geocoding</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-road text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">OSRM/Valhalla</div><div class="text-xs text-gray-500">Routing engine</div></div>
        <div class="bg-gray-50 p-3 rounded-lg text-center"><i class="fas fa-brain text-xl text-sgtx-500 mb-2"></i><div class="font-bold text-sm">AI Learning Loop</div><div class="text-xs text-gray-500">GPS traces to corrections</div></div>
      </div>
    </div>
    <div class="card p-6">
      <h3 class="font-bold mb-3">Learning Pipeline</h3>
      <div class="text-sm text-gray-600">
        <p class="mb-2">GPS traces from trucking → <code>trucking_gps_traces</code> → AI model → <code>route_correction_factors</code></p>
        <p>Corrections by: origin_geohash, destination_geohash, time_of_day, day_of_week → distance/time multipliers</p>
      </div>
    </div>`;
}

// ─── INSPECTIONS (QC Portal) ────────────────────────────
async function renderInspections() {
  setTitle('My Inspections', 'QC inspection assignments and reports');
  // QC portal sees shipments assigned to them for inspection
  const { data } = await api('/shipments');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-6">
      <h3 class="font-bold mb-3"><i class="fas fa-clipboard-check mr-2 text-sgtx-500"></i>Inspection Queue</h3>
      <p class="text-sm text-gray-500 mb-4">Shipments assigned for quality control inspection. Scan barcodes to verify items.</p>
      ${data.length ? `<div class="space-y-2">${data.map(s => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div class="font-mono text-sm text-sgtx-600">${s.ustn}</div>
            <div class="text-xs text-gray-500">${s.origin_port||'—'} → ${s.destination_port||'—'}</div>
          </div>
          <div class="flex items-center gap-2">
            ${badge(s.status)}
            <button onclick="navigate('barcodes')" class="text-xs bg-blue-500 text-white px-2 py-1 rounded"><i class="fas fa-barcode mr-1"></i>Scan</button>
          </div>
        </div>`).join('')}</div>` : emptyState('No shipments assigned for inspection')}
    </div>`;
}

// ─── KYB FORM ───────────────────────────────────────────
function showKYBForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-file-alt mr-2 text-sgtx-500"></i>Submit KYB Documents</h2>
    <p class="text-sm text-gray-600 mb-4">AI-driven verification with 40+ government registry integrations. Tiers T1-T4.</p>
    <form onsubmit="submitKYB(event)" class="space-y-3">
      <div class="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 mb-3">
        <b>Required:</b> Certificate of Incorporation, Trade License, Tax Registration, UBO Declaration, Bank Statement
      </div>
      <div><label class="text-sm text-gray-600">Company Registration #</label><input id="kyb-reg" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="REG-12345"></div>
      <div><label class="text-sm text-gray-600">Tax ID</label><input id="kyb-tax" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="TAX-67890"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit for Verification</button>
    </form>`);
}
async function submitKYB(e) {
  e.preventDefault();
  await apiPost('/auth/kyb/submit', { tenant_id: tenant?.id, gtid: tenant?.gtid, documents: [{ type: 'REGISTRATION', ref: document.getElementById('kyb-reg').value }, { type: 'TAX', ref: document.getElementById('kyb-tax').value }] });
  if (tenant) { tenant.kyb_status = 'SUBMITTED'; localStorage.setItem('sgtx_tenant', JSON.stringify(tenant)); }
  closeModal(); navigate('dashboard');
}

// ─── CONTRACT WIZARD (with Trade Selector Dropdown) ─────
async function showContractWizard() {
  // Fetch ongoing trades for the scroll-down selector
  let ongoingTrades = [];
  try {
    const tenantParam = tenant?.id ? `?tenant_id=${tenant.id}` : '';
    const r = await api('/trades/ongoing' + tenantParam);
    ongoingTrades = r.data || [];
  } catch(e) { /* fallback to manual entry */ }

  const tradeOptions = ongoingTrades.length
    ? ongoingTrades.map(t => {
        const specs = typeof t.parsed_specs === 'string' ? JSON.parse(t.parsed_specs) : (t.parsed_specs || {});
        const desc = specs.description || t.raw_description || 'Trade';
        const price = t.exw_price ? ` — EXW ${usd(t.exw_price)}` : '';
        const label = `${t.importer_name || '?'} ↔ ${t.exporter_name || '?'} | ${desc.slice(0,35)}${desc.length>35?'...':''}${price} [${t.status}]`;
        return `<option value="${t.id}">${label}</option>`;
      }).join('')
    : '';
  const hasOngoing = ongoingTrades.length > 0;

  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-file-contract mr-2 text-sgtx-500"></i>Create Contract</h2>
    <div class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg"><i class="fas fa-info-circle mr-1"></i> Phase 3: Contract Genesis Pipeline — Clause Forge, Risk Oracle, Jurisdiction Harmonizer, Commission Engine. AI generates 47 legal primitives.</div>
    <form onsubmit="submitContract(event)" class="space-y-3">
      ${hasOngoing ? `
      <div>
        <label class="text-sm text-gray-600 font-semibold"><i class="fas fa-list mr-1 text-sgtx-500"></i>Select Ongoing Trade</label>
        <select id="ct-trade-select" class="w-full border rounded-lg px-3 py-2 text-sm mt-1 max-h-48 overflow-y-auto" onchange="onTradeSelected(this.value)" style="max-height:200px">
          <option value="">— Pick an ongoing trade —</option>
          ${tradeOptions}
        </select>
        <div class="text-xs text-gray-400 mt-1">Or enter a Trade Request ID manually below</div>
      </div>
      <div id="ct-trade-preview" class="hidden bg-green-50 border border-green-200 rounded-lg p-3 text-xs"></div>
      ` : ''}
      <div><label class="text-sm text-gray-600">Trade Request ID</label><input id="ct-trade" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="${hasOngoing ? 'Auto-filled from selection above, or enter manually' : 'Enter trade request ID'}" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Incoterm (Incoterms 2020)</label><select id="ct-incoterm" class="w-full border rounded-lg px-3 py-2 text-sm" onchange="updateCommPayer()"><option>CFR</option><option>FOB</option><option>CIF</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option><option>CPT</option><option>CIP</option><option>DPU</option><option>FAS</option></select></div>
        <div><label class="text-sm text-gray-600">Governing Law</label><select id="ct-law" class="w-full border rounded-lg px-3 py-2 text-sm"><option>English Law</option><option>New York Law</option><option>Singapore Law</option><option>UAE Federal Law</option><option>Swiss Law</option></select></div>
      </div>
      <div><label class="text-sm text-gray-600">Dispute Resolution</label><select id="ct-dispute" class="w-full border rounded-lg px-3 py-2 text-sm"><option>ICC Arbitration</option><option>DIFC-LCIA Arbitration</option><option>SIAC Arbitration</option><option>Ad hoc Arbitration</option></select></div>
      <div class="bg-gray-50 p-3 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm text-gray-600 font-semibold">Commission Allocation</label>
          <span id="comm-payer-label" class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Default: Exporter pays (CFR)</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500">Importer</span>
          <input id="ct-comm-slider" type="range" min="0" max="100" value="50" class="flex-1" oninput="document.getElementById('ct-comm-val').textContent=this.value+'% / '+(100-this.value)+'%'">
          <span class="text-xs text-gray-500">Exporter</span>
        </div>
        <div id="ct-comm-val" class="text-center text-xs text-gray-500 mt-1">50% / 50%</div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-paper-plane mr-1"></i>Create Contract (Governor Gated)</button>
    </form>`);

  // Store ongoing trades data for preview
  window._ongoingTrades = ongoingTrades;
}

function onTradeSelected(tradeId) {
  const input = document.getElementById('ct-trade');
  const preview = document.getElementById('ct-trade-preview');
  if (!tradeId) { if(input) input.value = ''; if(preview) preview.classList.add('hidden'); return; }
  if (input) input.value = tradeId;
  const trade = (window._ongoingTrades || []).find(t => t.id === tradeId);
  if (trade && preview) {
    const specs = typeof trade.parsed_specs === 'string' ? JSON.parse(trade.parsed_specs) : (trade.parsed_specs || {});
    preview.classList.remove('hidden');
    preview.innerHTML = `
      <div class="font-semibold text-green-800 mb-1"><i class="fas fa-check-circle mr-1"></i>Trade Selected</div>
      <div class="grid grid-cols-2 gap-1">
        <div><span class="text-gray-500">Importer:</span> ${trade.importer_name || '—'}</div>
        <div><span class="text-gray-500">Exporter:</span> ${trade.exporter_name || '—'}</div>
        ${specs.hs_code ? `<div><span class="text-gray-500">HS Code:</span> ${specs.hs_code}</div>` : ''}
        ${trade.exw_price ? `<div><span class="text-gray-500">EXW Price:</span> ${usd(trade.exw_price)}</div>` : ''}
        ${specs.quantity ? `<div><span class="text-gray-500">Qty:</span> ${specs.quantity} ${specs.unit||'KG'}</div>` : ''}
        ${trade.quote_incoterm ? `<div><span class="text-gray-500">Incoterm:</span> ${trade.quote_incoterm}</div>` : ''}
      </div>`;
    // Auto-set incoterm from quote if available
    if (trade.quote_incoterm) {
      const incotermSelect = document.getElementById('ct-incoterm');
      if (incotermSelect) { incotermSelect.value = trade.quote_incoterm; updateCommPayer(); }
    }
  }
}
function updateCommPayer() {
  const incoterm = document.getElementById('ct-incoterm')?.value;
  const exporterPays = ['CFR','CIF','CPT','CIP','DAP','DPU','DDP'].includes(incoterm);
  const label = document.getElementById('comm-payer-label');
  if (label) label.textContent = `Default: ${exporterPays ? 'Exporter' : 'Importer'} pays (${incoterm})`;
}
async function submitContract(e) {
  e.preventDefault();
  const slider = document.getElementById('ct-comm-slider');
  const importerPct = slider ? Number(slider.value) : 50;
  const tradeRequestId = document.getElementById('ct-trade').value;
  const incoterm = document.getElementById('ct-incoterm').value;
  const governingLaw = document.getElementById('ct-law').value;
  const disputeResolution = document.getElementById('ct-dispute').value;

  // Step 1: Phase 3 — Contract Genesis (AI clause analysis + risk scoring)
  let genesisResult = null;
  try {
    genesisResult = await apiPost('/contract/genesis', {
      trade_request_id: tradeRequestId,
      initiator_gtid: tenant?.gtid || 'system',
      incoterm: incoterm,
      governing_law: governingLaw,
      clauses: { payment: 'NET30', delivery: incoterm, dispute_resolution: disputeResolution, force_majeure: 'ICC_2020', quality: 'ISO_9001' }
    });
  } catch(e) { /* genesis is optional enhancement; continue with legacy create */ }

  // Step 2: Create the contract (legacy endpoint for DB persistence)
  const r = await apiPost('/contracts', {
    trade_request_id: tradeRequestId,
    incoterm: incoterm,
    governing_law: governingLaw,
    dispute_resolution: disputeResolution,
    commission_allocation: { importer: importerPct, exporter: 100 - importerPct },
    genesis_session_id: genesisResult?.data?.genesis_session_id || null,
    actor_gtid: tenant?.gtid || 'system'
  });
  if (r.error) { alert('Governor Denied: ' + r.error); return; }

  // Step 3: Phase 3 — Commission Allocation
  if (r.data?.id) {
    try {
      await apiPost('/commission/allocate', {
        contract_id: r.data.id,
        trade_request_id: tradeRequestId,
        importer_pct: importerPct,
        exporter_pct: 100 - importerPct
      });
    } catch(e) { /* non-blocking */ }
  }

  // Show genesis analysis if available
  if (genesisResult?.data?.clause_confidence) {
    const cc = genesisResult.data.clause_confidence;
    const rs = genesisResult.data.risk_scores;
    const avgConf = Object.values(cc).reduce((a,b) => a + b, 0) / Object.keys(cc).length;
    alert(`Contract created!\n\nAI Clause Analysis:\n  Avg. Confidence: ${(avgConf*100).toFixed(1)}%\n  Payment: ${(cc.payment*100).toFixed(0)}%  Delivery: ${(cc.delivery*100).toFixed(0)}%\n  Quality: ${(cc.quality*100).toFixed(0)}%  Insurance: ${(cc.insurance*100).toFixed(0)}%\n\nRisk Assessment:\n  Jurisdictional: ${(rs.jurisdictional_conflict*100).toFixed(0)}%\n  Enforcement: ${(rs.enforcement_risk*100).toFixed(0)}%\n  FX Exposure: ${(rs.fx_exposure*100).toFixed(0)}%`);
  }
  closeModal(); navigate('contracts');
}
async function signAndLockContract(id) {
  if (!confirm('Sign both parties and lock contract? Commission will be calculated.')) return;
  // Phase 3 — Digital Signature via /contract/sign endpoint
  const impSig = await apiPost('/contract/sign', { contract_id: id, signer_gtid: tenant?.gtid || 'IMPORTER', role: 'IMPORTER' });
  if (impSig.error) { alert('Importer signature failed: ' + impSig.error); return; }
  const expSig = await apiPost('/contract/sign', { contract_id: id, signer_gtid: 'EXPORTER', role: 'EXPORTER' });
  if (expSig.error) { alert('Exporter signature failed: ' + expSig.error); return; }

  // Also call legacy lock endpoint if it exists
  try {
    const r = await apiPost(`/contracts/${id}/lock`, { trade_value_usd: 43500, hs_code: '520512', origin_country: 'VN', destination_country: 'EG', actor_gtid: tenant?.gtid || 'system' });
    if (r.data?.commission) {
      alert(`Contract LOCKED!\nCommission: $${r.data.commission.commission_usd?.toFixed(2)} (${(r.data.commission.final_rate_pct*100)?.toFixed(2)}%)`);
    } else {
      alert('Contract signed and locked successfully!');
    }
  } catch(e) {
    alert('Contract signed by both parties! Lock confirmed.');
  }
  navigate('contracts');
}

// ─── SHIPMENT WIZARD ────────────────────────────────────
function showShipmentWizard(contractId) {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-ship mr-2 text-sgtx-500"></i>Create Shipment</h2>
    <div class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg"><i class="fas fa-info-circle mr-1"></i> Phase 5: USTN generated, GS1-128 barcodes per pallet, 5 document requirements auto-created.</div>
    <form onsubmit="submitShipment(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Contract ID</label><input id="sh-contract" class="w-full border rounded-lg px-3 py-2 text-sm" value="${contractId||''}" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Origin Port</label><input id="sh-origin" class="w-full border rounded-lg px-3 py-2 text-sm" value="VNSGN" placeholder="VNSGN"></div>
        <div><label class="text-sm text-gray-600">Destination Port</label><input id="sh-dest" class="w-full border rounded-lg px-3 py-2 text-sm" value="EGALY" placeholder="EGALY"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Vessel Name</label><input id="sh-vessel" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="MV Saigon Express"></div>
        <div><label class="text-sm text-gray-600">Pallet Count</label><input id="sh-pallets" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="4" min="1" max="100"></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm hover:bg-sgtx-600"><i class="fas fa-paper-plane mr-1"></i>Create Shipment (Governor Gated)</button>
    </form>`);
}
async function submitShipment(e) {
  e.preventDefault();
  const r = await apiPost('/shipments', { contract_id: document.getElementById('sh-contract').value, origin_port: document.getElementById('sh-origin').value, destination_port: document.getElementById('sh-dest').value, vessel_name: document.getElementById('sh-vessel').value, pallet_count: Number(document.getElementById('sh-pallets').value), actor_gtid: tenant?.gtid || 'system' });
  if (r.error) { alert('Denied: ' + r.error); return; }
  alert(`Shipment created!\nUSTN: ${r.data.ustn}\nPallets: ${r.data.pallet_count} with barcodes`);
  closeModal(); navigate('shipments');
}
function showMilestoneForm(ustn, currentMilestone) {
  const milestones = ['GATE_IN','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];
  const nextIdx = currentMilestone ? milestones.indexOf(currentMilestone) + 1 : 0;
  const nextMilestone = milestones[nextIdx] || milestones[0];
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-check-circle mr-2 text-green-500"></i>Confirm Milestone</h2>
    <div class="text-sm mb-4">USTN: <span class="font-mono text-sgtx-600">${ustn}</span></div>
    <form onsubmit="submitMilestone(event,'${ustn}')" class="space-y-3">
      <div><label class="text-sm text-gray-600">Milestone</label><select id="ms-type" class="w-full border rounded-lg px-3 py-2 text-sm">${milestones.map(m=>`<option${m===nextMilestone?' selected':''}>${m}</option>`).join('')}</select></div>
      <div class="bg-yellow-50 p-3 rounded text-xs text-yellow-800"><i class="fas fa-coins mr-1"></i> LOADED/DEPARTED/ARRIVED/DELIVERED each release 25% of CommissionLock</div>
      <button type="submit" class="w-full bg-green-500 text-white py-2 rounded-lg text-sm"><i class="fas fa-check mr-1"></i>Confirm (Governor Gated)</button>
    </form>`);
}
async function submitMilestone(e, ustn) {
  e.preventDefault();
  const r = await apiPost(`/shipments/${ustn}/milestones`, { milestone: document.getElementById('ms-type').value, actor_gtid: tenant?.gtid || 'system' });
  if (r.error) { alert('Denied: ' + r.error); return; }
  const cr = r.data?.commission_release;
  alert(`Milestone confirmed: ${r.data.milestone}${cr ? `\nCommission released: ${cr.released_pct}% (${cr.status})` : ''}`);
  closeModal(); navigate('shipments');
}

// ─── FINANCING WIZARD ───────────────────────────────────
function showFinancingForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-university mr-2 text-sgtx-500"></i>Request Financing</h2>
    <div class="text-xs text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg"><i class="fas fa-info-circle mr-1"></i> Phase 4: Post-contract financing with blind bidding. Contract must be LOCKED first.</div>
    <form onsubmit="submitFinancing(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Contract ID (must be LOCKED)</label><input id="fn-contract" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Amount (USD)</label><input id="fn-amount" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="30000" required></div>
        <div><label class="text-sm text-gray-600">Tenor (days)</label><input id="fn-tenor" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="60"></div>
      </div>
      <div><label class="text-sm text-gray-600">Financing Type</label><select id="fn-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>LC</option><option>BANK_GUARANTEE</option><option>TRADE_CREDIT</option><option>FACTORING</option><option>FORFAITING</option></select></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm"><i class="fas fa-paper-plane mr-1"></i>Submit Request (Governor Gated)</button>
    </form>`);
}
async function submitFinancing(e) {
  e.preventDefault();
  const r = await apiPost('/financing', { contract_id: document.getElementById('fn-contract').value, requester_tenant_id: tenant?.id || 't-001', amount: Number(document.getElementById('fn-amount').value), tenor_days: Number(document.getElementById('fn-tenor').value), financing_type: document.getElementById('fn-type').value, actor_gtid: tenant?.gtid || 'system' });
  if (r.error) { alert('Denied: ' + r.error); return; }
  closeModal(); navigate('financing');
}

// ─── SETTLEMENT WIZARD ──────────────────────────────────
function showSettlementForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-money-bill-wave mr-2 text-sgtx-500"></i>Create Settlement</h2>
    <form onsubmit="submitSettlement(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">USTN (Shipment)</label><input id="st-ustn" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div><label class="text-sm text-gray-600">Type</label><select id="st-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>PRINCIPAL_PAYMENT</option><option>COMMISSION_RELEASE</option><option>REFUND</option><option>NETTING</option></select></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm"><i class="fas fa-paper-plane mr-1"></i>Create (Governor Gated)</button>
    </form>`);
}
async function submitSettlement(e) {
  e.preventDefault();
  const r = await apiPost('/settlements', { ustn: document.getElementById('st-ustn').value, instruction_type: document.getElementById('st-type').value, actor_gtid: tenant?.gtid || 'system' });
  if (r.error) { alert('Denied: ' + r.error); return; }
  closeModal(); navigate('settlements');
}
async function confirmSettlement(id) {
  if (!confirm('Confirm this settlement?')) return;
  await apiPost(`/settlements/${id}/confirm`, { amount_confirmed: 0, psp_name: 'Stripe', actor_gtid: tenant?.gtid || 'system' });
  navigate('settlements');
}

// ─── DISTRESSED CARGO WIZARD ────────────────────────────
function showDistressedForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-exclamation-triangle mr-2 text-orange-500"></i>List Distressed Cargo</h2>
    <form onsubmit="submitDistressed(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Exporter Tenant ID</label><input id="dc-exp" class="w-full border rounded-lg px-3 py-2 text-sm" value="${tenant?.id||'t-002'}" required></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Quantity</label><input id="dc-qty" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="1000"></div>
        <div><label class="text-sm text-gray-600">Unit</label><input id="dc-unit" class="w-full border rounded-lg px-3 py-2 text-sm" value="KG"></div>
      </div>
      <div><label class="text-sm text-gray-600">Current Location</label><input id="dc-loc" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Port Said, Egypt"></div>
      <div><label class="text-sm text-gray-600">Condition</label><select id="dc-cond" class="w-full border rounded-lg px-3 py-2 text-sm"><option>DAMAGED</option><option>EXPIRED</option><option>REJECTED</option><option>ABANDONED</option></select></div>
      <div><label class="text-sm text-gray-600">Expected Price (USD)</label><input id="dc-price" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="5000"></div>
      <div><label class="text-sm text-gray-600">Listing Expiry</label><input id="dc-expiry" type="date" class="w-full border rounded-lg px-3 py-2 text-sm" value="${new Date(Date.now()+14*86400000).toISOString().split('T')[0]}"></div>
      <button type="submit" class="w-full bg-orange-500 text-white py-2 rounded-lg text-sm">List Cargo (Governor Gated)</button>
    </form>`);
}
async function submitDistressed(e) {
  e.preventDefault();
  const r = await apiPost('/distressed', { exporter_tenant_id: document.getElementById('dc-exp').value, product_details: { condition: document.getElementById('dc-cond').value }, quantity: Number(document.getElementById('dc-qty').value), unit: document.getElementById('dc-unit').value, current_location: document.getElementById('dc-loc').value, condition: document.getElementById('dc-cond').value, price_expectation: Number(document.getElementById('dc-price').value), listing_expiry: document.getElementById('dc-expiry').value, actor_gtid: tenant?.gtid || 'system' });
  if (r.error) { alert('Denied: ' + r.error); return; }
  closeModal(); navigate('distressed');
}

// ─── DISPUTE WIZARD ─────────────────────────────────────
function showDisputeForm() {
  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-balance-scale-right mr-2 text-red-500"></i>File Dispute</h2>
    <div class="text-xs text-gray-500 mb-4 bg-red-50 p-3 rounded-lg"><i class="fas fa-warning mr-1"></i> Filing a dispute FREEZES the CommissionLock. AI mediation activates first, then ICC/DIFC-LCIA escalation.</div>
    <form onsubmit="submitDispute(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Trade Request ID</label><input id="dp-trade" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div><label class="text-sm text-gray-600">Dispute Type</label><select id="dp-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>QUALITY</option><option>DELIVERY_DELAY</option><option>PAYMENT</option><option>DOCUMENTATION</option><option>COMMISSION</option><option>CONTRACT_BREACH</option></select></div>
      <div><label class="text-sm text-gray-600">Description</label><textarea id="dp-desc" class="w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="Describe the dispute..."></textarea></div>
      <button type="submit" class="w-full bg-red-500 text-white py-2 rounded-lg text-sm"><i class="fas fa-paper-plane mr-1"></i>File Dispute (Governor Gated)</button>
    </form>`);
}
async function submitDispute(e) {
  e.preventDefault();
  const r = await apiPost('/disputes', { trade_request_id: document.getElementById('dp-trade').value, filing_party_gtid: tenant?.gtid || 'system', dispute_type: document.getElementById('dp-type').value, description: document.getElementById('dp-desc').value });
  if (r.error) { alert('Denied: ' + r.error); return; }
  alert('Dispute filed. CommissionLock has been frozen.');
  closeModal(); navigate('disputes');
}

// ─── CREATE MODAL (+ button top right) ─────────────────
function showCreateModal() {
  if (isReadOnly()) return;
  const perms = getPerms();
  const actions = [];
  if (perms.canCreateTrade) actions.push({ fn: 'showTradeWizard', icon: 'fa-handshake', label: 'Create Trade', color: 'sgtx' });
  if (perms.canViewContracts && !isReadOnly()) actions.push({ fn: 'showContractWizard', icon: 'fa-file-contract', label: 'Create Contract', color: 'sgtx' });
  if (perms.canRequestFinancing) actions.push({ fn: 'showFinancingForm', icon: 'fa-university', label: 'Request Financing', color: 'blue' });
  if (perms.canViewBuyerSearch) actions.push({ fn: 'showBuyerSearchForm', icon: 'fa-search-dollar', label: 'Buyer Search', color: 'green' });
  if (perms.canViewDistressed) actions.push({ fn: 'showDistressedForm', icon: 'fa-exclamation-triangle', label: 'Distressed Cargo', color: 'orange' });
  if (perms.canFileDispute) actions.push({ fn: 'showDisputeForm', icon: 'fa-balance-scale-right', label: 'File Dispute', color: 'red' });
  if (perms.canViewBarcodes) actions.push({ fn: "navigate('barcodes')", icon: 'fa-barcode', label: 'Scan Barcode', color: 'sgtx' });

  if (actions.length === 0) { return; }

  showModal(`
    <h2 class="text-lg font-bold mb-4"><i class="fas fa-plus mr-2 text-sgtx-500"></i>Quick Actions</h2>
    <div class="grid grid-cols-2 gap-3">
      ${actions.map(a => `<button onclick="closeModal();${a.fn.includes('(') ? a.fn : a.fn+'()'}" class="card p-4 text-center hover:bg-${a.color}-50 transition"><i class="fas ${a.icon} text-xl text-${a.color}-500 mb-2"></i><div class="text-sm font-medium">${a.label}</div></button>`).join('')}
    </div>`);
}

// ═══════════════════════════════════════════════════════════
// v6.2 GAP FEATURE PAGES
// ═══════════════════════════════════════════════════════════

// ─── SERVICE CATALOG (Logistics Portal) ──────────────────
async function renderServiceCatalog() {
  setTitle('Service Catalog' + roLabel(), 'Logistics services — rates, transit times, coverage');
  const { data } = await api('/service-catalog');
  document.getElementById('content').innerHTML = `
    ${!isReadOnly() ? `<div class="mb-4 flex justify-end"><button onclick="showServiceCatalogForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-plus mr-1"></i>Add Service</button></div>` : ''}
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Service</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Provider</th><th class="px-4 py-3">Base Rate</th><th class="px-4 py-3">Currency</th><th class="px-4 py-3">Transit (days)</th><th class="px-4 py-3">Status</th></tr></thead>
      <tbody>${data.map(s => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${s.service_name}</td>
        <td class="px-4 py-3 text-xs"><span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${s.service_type}</span></td>
        <td class="px-4 py-3 text-xs">${s.provider_name||'—'}</td>
        <td class="px-4 py-3 text-right font-mono">${s.base_rate ? usd(s.base_rate) : '—'}</td>
        <td class="px-4 py-3 text-center text-xs">${s.rate_currency}/${s.rate_unit}</td>
        <td class="px-4 py-3 text-center">${s.transit_time_days_min||'?'}-${s.transit_time_days_max||'?'}</td>
        <td class="px-4 py-3 text-center">${s.is_active ? '<span class="text-green-600"><i class="fas fa-check"></i></span>' : '<span class="text-gray-400"><i class="fas fa-times"></i></span>'}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No services in catalog')}`;
}
function showServiceCatalogForm() {
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-th-list mr-2 text-sgtx-500"></i>Add Service</h2>
    <form onsubmit="submitServiceCatalog(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Service Name</label><input id="sc-name" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div><label class="text-sm text-gray-600">Service Type</label><select id="sc-type" class="w-full border rounded-lg px-3 py-2 text-sm"><option>OCEAN_FCL</option><option>OCEAN_LCL</option><option>AIR_FREIGHT</option><option>TRUCKING</option><option>RAIL</option><option>CUSTOMS_BROKERAGE</option><option>WAREHOUSING</option><option>INSURANCE</option><option>FUMIGATION</option><option>PACKAGING</option></select></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Base Rate (USD)</label><input id="sc-rate" type="number" step="0.01" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
        <div><label class="text-sm text-gray-600">Transit Days (min-max)</label><div class="flex gap-2"><input id="sc-tmin" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Min"><input id="sc-tmax" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Max"></div></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Add to Catalog</button>
    </form>`);
}
async function submitServiceCatalog(e) {
  e.preventDefault();
  await apiPost('/service-catalog', { logistics_tenant_id: tenant?.id, service_name: document.getElementById('sc-name').value, service_type: document.getElementById('sc-type').value, base_rate: Number(document.getElementById('sc-rate').value), transit_time_days_min: Number(document.getElementById('sc-tmin').value), transit_time_days_max: Number(document.getElementById('sc-tmax').value) });
  closeModal(); navigate('servicecatalog');
}

// ─── LOGISTICS RFQ (Request for Quote) ──────────────────
async function renderLogisticsRFQ() {
  setTitle('Logistics RFQ' + roLabel(), 'Request for quotes — bidding & award');
  const { data } = await api('/logistics-rfq');
  document.getElementById('content').innerHTML = `
    ${!isReadOnly() ? `<div class="mb-4 flex justify-end"><button onclick="showRFQForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-plus mr-1"></i>New RFQ</button></div>` : ''}
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Route</th><th class="px-4 py-3">Requester</th><th class="px-4 py-3">Commodity</th><th class="px-4 py-3">Containers</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Actions</th></tr></thead>
      <tbody>${data.map(r => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-mono text-xs">${r.id?.slice(0,8)}...</td>
        <td class="px-4 py-3 text-xs font-medium">${r.origin_port||'?'} → ${r.destination_port||'?'}</td>
        <td class="px-4 py-3 text-xs">${r.requester_name||'—'}</td>
        <td class="px-4 py-3 text-xs">${r.commodity_type||'—'}</td>
        <td class="px-4 py-3 text-center">${r.container_count||1} × ${r.container_type||'20GP'}</td>
        <td class="px-4 py-3 text-center">${badge(r.status)}</td>
        <td class="px-4 py-3 text-center"><button onclick="showRFQResponses('${r.id}')" class="text-xs text-sgtx-500 hover:underline">View Bids</button></td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No RFQs yet')}`;
}
function showRFQForm() {
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-clipboard-list mr-2 text-sgtx-500"></i>New Logistics RFQ</h2>
    <form onsubmit="submitRFQ(event)" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Origin Port</label><input id="rfq-origin" class="w-full border rounded-lg px-3 py-2 text-sm" value="VNSGN" required></div>
        <div><label class="text-sm text-gray-600">Destination Port</label><input id="rfq-dest" class="w-full border rounded-lg px-3 py-2 text-sm" value="EGALY" required></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Container Type</label><select id="rfq-ctype" class="w-full border rounded-lg px-3 py-2 text-sm"><option>20GP</option><option>40GP</option><option>40HC</option><option>40HC_REEFER</option></select></div>
        <div><label class="text-sm text-gray-600">Container Count</label><input id="rfq-cnt" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="1"></div>
      </div>
      <div><label class="text-sm text-gray-600">Commodity</label><input id="rfq-comm" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Cotton yarn"></div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Submit RFQ (Governor Gated)</button>
    </form>`);
}
async function submitRFQ(e) {
  e.preventDefault();
  await apiPost('/logistics-rfq', { requester_tenant_id: tenant?.id, origin_port: document.getElementById('rfq-origin').value, destination_port: document.getElementById('rfq-dest').value, container_type: document.getElementById('rfq-ctype').value, container_count: Number(document.getElementById('rfq-cnt').value), commodity_type: document.getElementById('rfq-comm').value, actor_gtid: tenant?.gtid || 'system' });
  closeModal(); navigate('logisticsrfq');
}
async function showRFQResponses(rfqId) {
  const { data } = await api(`/logistics-rfq/${rfqId}/responses`);
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>RFQ Bids</h2>
    ${data?.length ? `<div class="space-y-3">${data.map(r => `
      <div class="p-4 bg-gray-50 rounded-lg border">
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold text-sm">${r.provider_name||'Unknown Provider'}</span>
          <span class="text-lg font-bold text-sgtx-600">${usd(r.total_price)}</span>
        </div>
        <div class="text-xs text-gray-500">Transit: ${r.transit_time_days||'?'} days | ${badge(r.status)}</div>
      </div>`).join('')}</div>` : '<p class="text-gray-400 text-center py-8">No bids yet</p>'}`);
}

// ─── DRIVERS (Logistics Portal) ──────────────────────────
async function renderDrivers() {
  setTitle('Drivers' + roLabel(), 'Driver/carrier onboarding & status');
  const { data } = await api('/drivers' + (tenant?.id ? `?tenant_id=${tenant.id}` : ''));
  document.getElementById('content').innerHTML = `
    ${!isReadOnly() ? `<div class="mb-4 flex justify-end"><button onclick="showDriverForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-plus mr-1"></i>Onboard Driver</button></div>` : ''}
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Name</th><th class="px-4 py-3">Phone</th><th class="px-4 py-3">License</th><th class="px-4 py-3">Vehicle</th><th class="px-4 py-3">Plate</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Onboarded</th></tr></thead>
      <tbody>${data.map(d => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${d.full_name}</td>
        <td class="px-4 py-3 text-xs">${d.phone||'—'}</td>
        <td class="px-4 py-3 text-xs font-mono">${d.license_number||'—'}</td>
        <td class="px-4 py-3 text-xs">${d.vehicle_type||'—'}</td>
        <td class="px-4 py-3 text-xs font-mono">${d.vehicle_plate||'—'}</td>
        <td class="px-4 py-3 text-center">${badge(d.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${d.onboarded_via||'PORTAL'}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No drivers onboarded')}`;
}
function showDriverForm() {
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-id-card mr-2 text-sgtx-500"></i>Onboard Driver</h2>
    <form onsubmit="submitDriver(event)" class="space-y-3">
      <div><label class="text-sm text-gray-600">Full Name</label><input id="dr-name" class="w-full border rounded-lg px-3 py-2 text-sm" required></div>
      <div><label class="text-sm text-gray-600">Phone</label><input id="dr-phone" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div><label class="text-sm text-gray-600">License Number</label><input id="dr-license" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-sm text-gray-600">Vehicle Type</label><select id="dr-vehicle" class="w-full border rounded-lg px-3 py-2 text-sm"><option>TRUCK</option><option>CONTAINER_TRAILER</option><option>VAN</option><option>REEFER_TRUCK</option></select></div>
        <div><label class="text-sm text-gray-600">Vehicle Plate</label><input id="dr-plate" class="w-full border rounded-lg px-3 py-2 text-sm"></div>
      </div>
      <button type="submit" class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm">Onboard Driver</button>
    </form>`);
}
async function submitDriver(e) {
  e.preventDefault();
  await apiPost('/drivers', { logistics_tenant_id: tenant?.id, full_name: document.getElementById('dr-name').value, phone: document.getElementById('dr-phone').value, license_number: document.getElementById('dr-license').value, vehicle_type: document.getElementById('dr-vehicle').value, vehicle_plate: document.getElementById('dr-plate').value });
  closeModal(); navigate('drivers');
}

// ─── CREDIT ASSESSMENTS (Financier Portal) ──────────────
async function renderCreditAssessments() {
  setTitle('Credit Assessments' + roLabel(), 'AI-driven credit intelligence — XGBoost scoring');
  const { data } = await api('/credit-assessments');
  document.getElementById('content').innerHTML = `
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Entity</th><th class="px-4 py-3">GTID</th><th class="px-4 py-3">Overall Score</th><th class="px-4 py-3">Default Prob.</th><th class="px-4 py-3">Recommended Limit</th><th class="px-4 py-3">Model</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(a => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${a.entity_name||'—'}</td>
        <td class="px-4 py-3 font-mono text-xs">${a.entity_gtid||'—'}</td>
        <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${a.overall_score>=70?'bg-green-200 text-green-800':a.overall_score>=50?'bg-yellow-200 text-yellow-800':'bg-red-200 text-red-800'}">${a.overall_score?.toFixed(0)||'?'}</span></td>
        <td class="px-4 py-3 text-center text-xs">${a.default_probability ? (a.default_probability*100).toFixed(1)+'%' : '—'}</td>
        <td class="px-4 py-3 text-right font-mono">${a.recommended_limit_usd ? usd(a.recommended_limit_usd) : '—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${a.model_version||'—'}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(a.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No credit assessments')}`;
}

// ─── LOGISTICS PERFORMANCE ──────────────────────────────
async function renderLogisticsPerformance() {
  setTitle('Logistics Performance' + roLabel(), 'Provider performance metrics — on-time delivery, damage rates');
  const { data } = await api('/logistics-performance' + (tenant?.id ? `?tenant_id=${tenant.id}` : ''));
  document.getElementById('content').innerHTML = `
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">Provider</th><th class="px-4 py-3">Period</th><th class="px-4 py-3">Shipments</th><th class="px-4 py-3">On-Time %</th><th class="px-4 py-3">Damage %</th><th class="px-4 py-3">Avg Transit</th><th class="px-4 py-3">ESG</th><th class="px-4 py-3">Carbon/TEU</th></tr></thead>
      <tbody>${data.map(p => `<tr class="border-t border-gray-50 hover:bg-gray-50">
        <td class="px-4 py-3 font-medium">${p.provider_name||'—'}</td>
        <td class="px-4 py-3 text-xs">${p.period}</td>
        <td class="px-4 py-3 text-center">${p.shipments_completed}</td>
        <td class="px-4 py-3 text-center"><span class="${p.on_time_delivery_rate>=95?'text-green-600':p.on_time_delivery_rate>=85?'text-yellow-600':'text-red-600'}">${p.on_time_delivery_rate?.toFixed(1)}%</span></td>
        <td class="px-4 py-3 text-center text-xs">${p.damage_rate?.toFixed(2)}%</td>
        <td class="px-4 py-3 text-center">${p.avg_transit_time_days?.toFixed(1)} days</td>
        <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${p.esg_score>=80?'bg-green-200 text-green-800':p.esg_score>=60?'bg-yellow-200 text-yellow-800':'bg-red-200 text-red-800'}">${p.esg_score?.toFixed(0)||'?'}</span></td>
        <td class="px-4 py-3 text-center text-xs">${p.carbon_per_teu?.toFixed(1)||'—'}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No performance data yet')}`;
}

// ─── PACKING PLANS (Phase 2) ────────────────────────────
async function renderPackingPlans() {
  setTitle('Packing Plans' + roLabel(), 'Container loading optimization — pallet details & AR visualization');
  const { data } = await api('/packing-plans');
  document.getElementById('content').innerHTML = `
    ${data?.length ? `<div class="card overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left">ID</th><th class="px-4 py-3">Container Type</th><th class="px-4 py-3">Pallets</th><th class="px-4 py-3">Weight (kg)</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Created</th></tr></thead>
      <tbody>${data.map(p => `<tr class="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="showPackingDetail('${p.id}')">
        <td class="px-4 py-3 font-mono text-xs">${p.id?.slice(0,8)}...</td>
        <td class="px-4 py-3 text-xs">${p.container_type||'—'}</td>
        <td class="px-4 py-3 text-center">${p.total_pallets||0}</td>
        <td class="px-4 py-3 text-right font-mono">${p.total_weight_kg?.toLocaleString()||'0'}</td>
        <td class="px-4 py-3 text-center">${badge(p.status)}</td>
        <td class="px-4 py-3 text-xs text-gray-400">${time(p.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>` : emptyState('No packing plans created yet')}`;
}
async function showPackingDetail(id) {
  const { data } = await api(`/packing-plans/${id}`);
  const pallets = data?.pallets || [];
  showModal(`<h2 class="text-lg font-bold mb-4"><i class="fas fa-boxes mr-2 text-sgtx-500"></i>Packing Plan Detail</h2>
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="bg-gray-50 p-3 rounded text-center"><div class="text-2xl font-bold text-sgtx-500">${data?.total_pallets||0}</div><div class="text-xs text-gray-500">Pallets</div></div>
      <div class="bg-gray-50 p-3 rounded text-center"><div class="text-2xl font-bold text-sgtx-500">${data?.total_weight_kg?.toLocaleString()||0}</div><div class="text-xs text-gray-500">Total Weight (kg)</div></div>
      <div class="bg-gray-50 p-3 rounded text-center"><div class="text-2xl font-bold text-sgtx-500">${data?.container_type||'—'}</div><div class="text-xs text-gray-500">Container Type</div></div>
    </div>
    ${pallets.length ? `<h3 class="font-bold text-sm mb-2">Pallet Details</h3>
    <div class="space-y-2">${pallets.map(p => `<div class="p-3 bg-gray-50 rounded border text-xs flex justify-between">
      <span><b>Pallet #${p.pallet_number}</b> — ${p.commodity_description||'N/A'} (HS: ${p.hs_code||'?'})</span>
      <span>${p.carton_count||0} cartons | ${p.gross_weight_kg||0} kg</span>
    </div>`).join('')}</div>` : '<p class="text-gray-400 text-sm">No pallet details</p>'}`);
}

// ─── DIGITAL TWIN (Phase 5) ────────────────────────────
async function renderDigitalTwin() {
  setTitle('Digital Twin Dashboard' + roLabel(), 'Real-time shipment simulation — predictive analytics');
  // Get all recent digital twin snapshots from active shipments
  const shipments = await api('/shipments?status=IN_TRANSIT');
  const active = shipments.data || [];
  let twinData = [];
  for (const s of active.slice(0, 5)) {
    try {
      const { data } = await api(`/shipments/${s.ustn}/digital-twin`);
      if (data?.length) twinData.push({ shipment: s, snapshots: data });
    } catch(e) {}
  }
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      ${statCard('fas fa-ship', 'Active Shipments', active.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-digital-tachograph', 'Twin Snapshots', twinData.reduce((s,t) => s + t.snapshots.length, 0), 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-clock', 'With ETAs', twinData.filter(t => t.snapshots[0]?.predicted_eta).length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-thermometer-half', 'With Temp Data', twinData.filter(t => t.snapshots[0]?.temperature_forecast && t.snapshots[0].temperature_forecast !== '{}').length, 'bg-orange-50 text-orange-600')}
    </div>
    ${twinData.length ? `<div class="space-y-4">${twinData.map(t => {
      const latest = t.snapshots[0];
      return `<div class="card p-5">
        <div class="flex justify-between items-center mb-3">
          <div><span class="font-bold">${t.shipment.ustn}</span><span class="ml-2 text-xs text-gray-500">${t.shipment.origin_port} → ${t.shipment.destination_port}</span></div>
          ${badge(t.shipment.status)}
        </div>
        <div class="grid grid-cols-3 gap-3 text-xs">
          <div class="bg-gray-50 p-3 rounded"><div class="font-bold mb-1">Predicted ETA</div>${latest.predicted_eta ? time(latest.predicted_eta) : 'N/A'}</div>
          <div class="bg-gray-50 p-3 rounded"><div class="font-bold mb-1">Shelf Life</div>${latest.shelf_life_days ? latest.shelf_life_days + ' days' : 'N/A'}</div>
          <div class="bg-gray-50 p-3 rounded"><div class="font-bold mb-1">Snapshots</div>${t.snapshots.length}</div>
        </div>
      </div>`;
    }).join('')}</div>` : `<div class="card p-8 text-center text-gray-400"><i class="fas fa-satellite text-4xl mb-3"></i><p>No digital twin data available. Create snapshots for active shipments.</p></div>`}`;
}

// ─── GAP STATS (Admin — overview of all v6.2 tables) ────
async function renderGapStats() {
  setTitle('v6.2 Blueprint Gap Stats', 'Record counts for all newly implemented tables');
  const [gapData, enhancedData] = await Promise.all([api('/gap-stats'), api('/enhanced-stats')]);
  const g = gapData.data || {};
  const e = enhancedData.data || {};
  const tables = [
    { name: 'Packing Plans', count: g.packing_plans, icon: 'fa-boxes', phase: '2' },
    { name: 'Pallet Details', count: g.pallet_details, icon: 'fa-pallet', phase: '2' },
    { name: 'Container Loading Plans', count: g.container_loading_plans, icon: 'fa-truck-loading', phase: '2' },
    { name: 'Voice Transcripts', count: g.voice_transcripts, icon: 'fa-microphone', phase: '5/10' },
    { name: 'Evidence Packages', count: g.evidence_packages, icon: 'fa-folder-open', phase: '10' },
    { name: 'Digital Twin Snapshots', count: g.digital_twin_snapshots, icon: 'fa-satellite', phase: '5' },
    { name: 'PSP Health Logs', count: g.psp_health_logs, icon: 'fa-heartbeat', phase: '9' },
    { name: 'Secondary Market Prices', count: g.secondary_market_prices, icon: 'fa-chart-line', phase: '4' },
    { name: 'Distressed Notifications', count: g.distressed_notifications, icon: 'fa-bell', phase: '8' },
    { name: 'Autonomous Milestones', count: g.autonomous_milestones, icon: 'fa-robot', phase: '5' },
    { name: 'Computer Vision Jobs', count: g.computer_vision_jobs, icon: 'fa-eye', phase: '5' },
    { name: 'Liquidity Predictions', count: g.liquidity_predictions, icon: 'fa-chart-area', phase: '6' },
    { name: 'Netting Circles', count: g.netting_circles, icon: 'fa-circle-nodes', phase: '6' },
    { name: 'FX Optimization Paths', count: g.fx_optimization_paths, icon: 'fa-exchange-alt', phase: '6' },
    { name: 'Auto Reconciliation', count: g.auto_reconciliation, icon: 'fa-check-double', phase: '6' },
    { name: 'Predictive Escrows', count: g.predictive_escrows, icon: 'fa-lock', phase: '6' },
    { name: 'Commission Singularity', count: g.commission_singularity, icon: 'fa-atom', phase: '6' },
    { name: 'Settlement Paths', count: g.settlement_paths, icon: 'fa-road', phase: '6' },
    { name: 'Payment Verification', count: g.payment_verification, icon: 'fa-receipt', phase: '9' },
    { name: 'DeFi Transactions', count: g.defi_transactions, icon: 'fa-link', phase: '4' },
    { name: 'Regulatory Compliance', count: g.regulatory_compliance, icon: 'fa-gavel', phase: '4' },
    { name: 'Commission Settlements', count: g.commission_settlements, icon: 'fa-money-check', phase: '9' },
    { name: 'Sensor Data Logs', count: g.sensor_data_logs, icon: 'fa-broadcast-tower', phase: '5' },
    { name: 'Inspections', count: e.inspections_total, icon: 'fa-clipboard-check', phase: '5' },
    { name: 'Service Catalog', count: e.service_catalog_items, icon: 'fa-th-list', phase: 'Logistics' },
    { name: 'Logistics RFQs', count: e.rfqs_total, icon: 'fa-clipboard-list', phase: 'Logistics' },
    { name: 'Drivers', count: e.drivers_total, icon: 'fa-id-card', phase: 'Logistics' },
    { name: 'Credit Assessments', count: e.credit_assessments, icon: 'fa-chart-pie', phase: '4' },
    { name: 'Entities w/ Disputes', count: e.entities_with_disputes, icon: 'fa-flag', phase: '10' },
  ];
  const total = tables.reduce((s, t) => s + (t.count || 0), 0);
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-gray-700"><i class="fas fa-database mr-2 text-sgtx-500"></i>Blueprint v6.2 Gap Tables — ${tables.length} Tables Implemented</h3>
        <span class="text-sm text-gray-500">Total Records: <b>${total.toLocaleString()}</b></span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        ${tables.map(t => `
          <div class="bg-gray-50 p-3 rounded-lg border hover:border-sgtx-300 transition">
            <div class="flex items-center gap-2 mb-1"><i class="fas ${t.icon} text-sgtx-400 text-xs"></i><span class="text-xs font-semibold text-gray-700">${t.name}</span></div>
            <div class="text-xl font-bold text-sgtx-600">${t.count || 0}</div>
            <div class="text-[10px] text-gray-400">Phase ${t.phase}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// v6.2 ADVANCED PORTAL PAGES
// ═══════════════════════════════════════════════════════════

// ─── IoT DASHBOARD (Cold Chain, Sensors — Phase 5) ──────
async function renderIoTDashboard() {
  setTitle('IoT Sensor Readings', 'Cold-chain monitoring, temperature, humidity, GPS tracking');
  const data = await api('/iot-readings');
  const readings = data.data || [];
  const temps = readings.filter(r => r.sensor_type === 'TEMPERATURE');
  const humids = readings.filter(r => r.sensor_type === 'HUMIDITY');
  const anomalies = readings.filter(r => r.anomaly_flag);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-thermometer-half', 'Total Readings', readings.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-temperature-low', 'Temperature', temps.length, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-tint', 'Humidity', humids.length, 'bg-cyan-50 text-cyan-600')}
      ${statCard('fas fa-exclamation-triangle', 'Anomalies', anomalies.length, 'bg-yellow-50 text-yellow-600')}
    </div>
    ${!isReadOnly() ? `<div class="mb-4"><button onclick="showIoTForm()" class="btn-primary"><i class="fas fa-plus mr-2"></i>Record IoT Reading</button></div>` : ''}
    ${readings.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>USTN</th><th>Sensor</th><th>Value</th><th>Unit</th><th>Device</th><th>Anomaly</th><th>Recorded</th>
    </tr></thead><tbody>${readings.map(r => `<tr>
      <td class="font-mono text-xs">${r.ustn || '—'}</td>
      <td>${badge(r.sensor_type)}</td>
      <td class="font-bold">${r.value}</td>
      <td>${r.unit || '—'}</td>
      <td class="text-xs">${r.device_id || '—'}</td>
      <td>${r.anomaly_flag ? '<span class="text-red-600 font-bold">⚠ YES</span>' : '<span class="text-green-600">OK</span>'}</td>
      <td class="text-xs">${time(r.recorded_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No IoT readings yet')}`;
}

function showIoTForm() {
  showModal(`<h3 class="font-bold text-lg mb-4"><i class="fas fa-thermometer-half mr-2"></i>Record IoT Reading</h3>
    <form onsubmit="submitIoT(event)">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-xs font-semibold">USTN</label><input id="iot-ustn" class="input w-full" required></div>
        <div><label class="text-xs font-semibold">Sensor Type</label><select id="iot-type" class="input w-full">
          <option>TEMPERATURE</option><option>HUMIDITY</option><option>GPS</option><option>SHOCK</option><option>LIGHT</option>
        </select></div>
        <div><label class="text-xs font-semibold">Value</label><input id="iot-value" type="number" step="0.01" class="input w-full" required></div>
        <div><label class="text-xs font-semibold">Unit</label><input id="iot-unit" class="input w-full" value="celsius"></div>
        <div><label class="text-xs font-semibold">Device ID</label><input id="iot-device" class="input w-full"></div>
        <div><label class="text-xs font-semibold">Battery %</label><input id="iot-battery" type="number" class="input w-full"></div>
      </div>
      <button type="submit" class="btn-primary mt-4 w-full">Record Reading</button>
    </form>`);
}
async function submitIoT(e) {
  e.preventDefault();
  await apiPost('/iot-readings', { ustn: document.getElementById('iot-ustn').value, sensor_type: document.getElementById('iot-type').value, value: parseFloat(document.getElementById('iot-value').value), unit: document.getElementById('iot-unit').value, device_id: document.getElementById('iot-device').value || null, battery_pct: parseFloat(document.getElementById('iot-battery').value) || null });
  closeModal(); navigate('iotdashboard');
}

// ─── eBL MANAGEMENT (Phase 5) ───────────────────────────
async function renderEBLManagement() {
  setTitle('Electronic Bill of Lading (eBL)', 'eBL issuance, transfers, and carrier capability matrix');
  const [eblData, capData] = await Promise.all([api('/ebls'), api('/ebl-capability')]);
  const ebls = eblData.data || [];
  const caps = capData.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-file-alt', 'eBLs Issued', ebls.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-truck', 'Carrier Capabilities', caps.length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exchange-alt', 'Transferred', ebls.filter(e => e.ebl_status === 'TRANSFERRED').length, 'bg-purple-50 text-purple-600')}
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="card p-5"><h4 class="font-bold mb-3"><i class="fas fa-file-alt mr-2"></i>eBL Records</h4>
        ${ebls.length ? `<div class="space-y-2">${ebls.map(e => `<div class="bg-gray-50 p-3 rounded flex justify-between items-center">
          <div><span class="font-mono text-xs">${e.ebl_reference || e.id?.slice(0,8)}</span> <span class="text-xs text-gray-500 ml-2">${e.shipment_ustn || ''}</span></div>
          <div>${badge(e.ebl_status)} <span class="text-xs ml-2">${e.carrier_name || ''} / ${e.ebl_platform || ''}</span></div>
        </div>`).join('')}</div>` : '<p class="text-gray-400 text-sm">No eBLs issued yet</p>'}
      </div>
      <div class="card p-5"><h4 class="font-bold mb-3"><i class="fas fa-truck mr-2"></i>Carrier Capability Matrix</h4>
        ${caps.length ? `<div class="space-y-2">${caps.map(c => `<div class="bg-gray-50 p-3 rounded flex justify-between items-center">
          <div><span class="font-semibold">${c.carrier_name}</span> <span class="text-xs text-gray-500 ml-2">${c.carrier_scac || ''}</span></div>
          <div>${badge(c.status)} <span class="text-xs ml-2">${c.ebl_platform || ''}</span></div>
        </div>`).join('')}</div>` : '<p class="text-gray-400 text-sm">No carrier capabilities registered</p>'}
      </div>
    </div>`;
}

// ─── CARRIER PROFILES (Phase 5) ─────────────────────────
async function renderCarrierProfiles() {
  setTitle('Carrier Performance Profiles', 'On-time %, dispute rates, ESG scores, risk assessments');
  const data = await api('/carrier-profiles');
  const profiles = data.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-truck', 'Total Carriers', profiles.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-check-circle', 'Avg On-Time', profiles.length ? (profiles.reduce((s,p) => s + (p.on_time_pct||0), 0)/profiles.length).toFixed(1)+'%' : '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-leaf', 'Avg ESG', profiles.length ? (profiles.reduce((s,p) => s + (p.esg_score||0), 0)/profiles.length).toFixed(0) : '—', 'bg-emerald-50 text-emerald-600')}
      ${statCard('fas fa-exclamation-triangle', 'High Risk', profiles.filter(p => p.risk_score > 60).length, 'bg-red-50 text-red-600')}
    </div>
    ${profiles.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Carrier</th><th>On-Time %</th><th>Dispute Rate</th><th>ESG Score</th><th>Risk Score</th><th>Shipments</th><th>Avg Transit</th><th>Updated</th>
    </tr></thead><tbody>${profiles.map(p => `<tr>
      <td class="font-semibold">${p.carrier_name}</td>
      <td><span class="${p.on_time_pct >= 90 ? 'text-green-600' : p.on_time_pct >= 75 ? 'text-yellow-600' : 'text-red-600'} font-bold">${(p.on_time_pct||0).toFixed(1)}%</span></td>
      <td>${(p.dispute_rate||0).toFixed(2)}%</td>
      <td>${p.esg_score||0}/100</td>
      <td><span class="${p.risk_score > 60 ? 'text-red-600' : p.risk_score > 30 ? 'text-yellow-600' : 'text-green-600'} font-bold">${p.risk_score||0}</span></td>
      <td>${p.total_shipments||0}</td>
      <td>${p.avg_transit_days||0} days</td>
      <td class="text-xs">${time(p.last_updated)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No carrier profiles yet')}`;
}

// ─── PROVIDER INVOICES (Phase 2) ────────────────────────
async function renderProviderInvoices() {
  setTitle('Provider Invoices', 'Logistics and service provider invoice management');
  const data = await api('/provider-invoices');
  const invoices = data.data || [];
  const pending = invoices.filter(i => i.status === 'PENDING');
  const paid = invoices.filter(i => i.status === 'PAID');
  const totalAmount = invoices.reduce((s,i) => s + (i.amount||0), 0);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-file-invoice-dollar', 'Total Invoices', invoices.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-clock', 'Pending', pending.length, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-check-circle', 'Paid', paid.length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-dollar-sign', 'Total Amount', usd(totalAmount), 'bg-sgtx-50 text-sgtx-600')}
    </div>
    ${invoices.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Invoice #</th><th>Provider</th><th>Amount</th><th>Currency</th><th>Service</th><th>Status</th><th>Due Date</th>
    </tr></thead><tbody>${invoices.map(i => `<tr>
      <td class="font-mono text-xs">${i.invoice_number || i.id?.slice(0,8)}</td>
      <td class="font-semibold">${i.provider_name || '—'}</td>
      <td class="font-bold">${usd(i.amount)}</td>
      <td>${i.currency || 'USD'}</td>
      <td class="text-xs">${i.service_description || '—'}</td>
      <td>${badge(i.status)}</td>
      <td class="text-xs">${i.due_date || '—'}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No invoices yet')}`;
}

// ─── SANCTIONS / SHELL / FRAUD DETECTION (Phase 7) ──────
async function renderSanctionsDetail() {
  setTitle('Sanctions Proximity & Fraud Detection', 'Advanced compliance screening: sanctions proximity, shell company detection, fraud analysis');
  const [spData, sdData, fdData] = await Promise.all([
    api('/sanctions-proximity'), api('/shell-detection'), api('/fraud-detection')
  ]);
  const sanctions = spData.data || [];
  const shells = sdData.data || [];
  const fraud = fdData.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-shield-alt', 'Sanctions Checks', sanctions.length, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-building', 'Shell Detections', shells.length, 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-user-secret', 'Fraud Alerts', fraud.length, 'bg-purple-50 text-purple-600')}
    </div>
    <div class="grid grid-cols-3 gap-4">
      <div class="card p-5"><h4 class="font-bold mb-3 text-red-600"><i class="fas fa-shield-alt mr-2"></i>Sanctions Proximity</h4>
        ${sanctions.length ? sanctions.slice(0,10).map(s => `<div class="bg-gray-50 p-3 rounded mb-2">
          <div class="flex justify-between"><span class="font-mono text-xs">${s.target_gtid}</span><span class="font-bold ${s.proximity_score > 0.5 ? 'text-red-600' : 'text-green-600'}">${(s.proximity_score*100).toFixed(0)}%</span></div>
          <div class="text-xs text-gray-500 mt-1">${s.sanctioned_entity_name || '—'} (${s.relationship_type})</div>
        </div>`).join('') : '<p class="text-gray-400 text-sm">No sanctions proximity checks</p>'}
      </div>
      <div class="card p-5"><h4 class="font-bold mb-3 text-orange-600"><i class="fas fa-building mr-2"></i>Shell Detection</h4>
        ${shells.length ? shells.slice(0,10).map(s => `<div class="bg-gray-50 p-3 rounded mb-2">
          <div class="flex justify-between"><span class="font-mono text-xs">${s.target_gtid}</span><span class="font-bold ${s.shell_score > 0.5 ? 'text-red-600' : 'text-green-600'}">${(s.shell_score*100).toFixed(0)}%</span></div>
          <div class="text-xs text-gray-500 mt-1">Employees: ${s.employee_count || 0}, Age: ${s.registration_age_days || 0}d, Physical: ${s.physical_presence ? 'Yes' : 'No'}</div>
        </div>`).join('') : '<p class="text-gray-400 text-sm">No shell detections</p>'}
      </div>
      <div class="card p-5"><h4 class="font-bold mb-3 text-purple-600"><i class="fas fa-user-secret mr-2"></i>Fraud Detection</h4>
        ${fraud.length ? fraud.slice(0,10).map(f => `<div class="bg-gray-50 p-3 rounded mb-2">
          <div class="flex justify-between"><span class="font-mono text-xs">${f.target_gtid}</span><span class="font-bold ${f.fraud_score > 0.5 ? 'text-red-600' : 'text-green-600'}">${(f.fraud_score*100).toFixed(0)}%</span></div>
          <div class="text-xs text-gray-500 mt-1">${f.fraud_type || '—'} — ${f.requires_investigation ? '⚠ Investigation Required' : 'Cleared'}</div>
        </div>`).join('') : '<p class="text-gray-400 text-sm">No fraud alerts</p>'}
      </div>
    </div>`;
}

// ─── MODEL DRIFT (AI Governance) ────────────────────────
async function renderModelDrift() {
  setTitle('AI Model Drift Monitoring', 'Monitor model accuracy degradation and trigger retraining');
  const data = await api('/model-drift');
  const records = data.data || [];
  const highDrift = records.filter(r => r.drift_score > 0.3);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-brain', 'Total Records', records.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-exclamation-triangle', 'High Drift', highDrift.length, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-check', 'Healthy Models', records.length - highDrift.length, 'bg-green-50 text-green-600')}
    </div>
    ${records.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Model</th><th>Version</th><th>Drift Score</th><th>Drift Type</th><th>Action</th><th>Detected</th>
    </tr></thead><tbody>${records.map(r => `<tr>
      <td class="font-semibold">${r.model_name}</td>
      <td>${r.model_version}</td>
      <td><span class="font-bold ${r.drift_score > 0.3 ? 'text-red-600' : r.drift_score > 0.15 ? 'text-yellow-600' : 'text-green-600'}">${(r.drift_score*100).toFixed(1)}%</span></td>
      <td>${badge(r.drift_type)}</td>
      <td class="text-xs">${r.action_taken}</td>
      <td class="text-xs">${time(r.detected_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No model drift records. All AI models are healthy.')}`;
}

// ─── POLICY SUGGESTIONS (Governance) ────────────────────
async function renderPolicySuggestions() {
  setTitle('Policy Suggestions', 'AI-generated governance policy change proposals');
  const data = await api('/policy-suggestions');
  const suggestions = data.data || [];
  const proposed = suggestions.filter(s => s.status === 'PROPOSED');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-lightbulb', 'Total Suggestions', suggestions.length, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-clock', 'Pending Review', proposed.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-check-circle', 'Approved', suggestions.filter(s => s.status === 'APPROVED').length, 'bg-green-50 text-green-600')}
    </div>
    ${suggestions.length ? `<div class="space-y-3">${suggestions.map(s => `<div class="card p-5">
      <div class="flex justify-between items-start mb-2">
        <div><span class="font-bold">${s.policy_area || 'General'}</span> ${badge(s.status)}</div>
        <span class="text-xs text-gray-400">${time(s.created_at)}</span>
      </div>
      <div class="bg-gray-50 p-3 rounded text-sm mb-2"><strong>Suggested Change:</strong> ${s.suggested_change || '—'}</div>
      ${s.justification ? `<div class="text-xs text-gray-500"><strong>Justification:</strong> ${s.justification}</div>` : ''}
      <div class="text-xs text-gray-400 mt-1">Confidence: ${((s.ai_confidence||0)*100).toFixed(0)}% | Triggered by: ${s.triggered_by || '—'}</div>
    </div>`).join('')}</div>` : emptyState('No policy suggestions yet')}`;
}

// ─── FEE OPTIMIZATION (Phase 6) ─────────────────────────
async function renderFeeOptimization() {
  setTitle('Fee Optimization', 'PSP comparison, FX strategy, and savings analysis');
  const data = await api('/fee-optimization');
  const runs = data.data || [];
  const totalSavings = runs.reduce((s,r) => s + (r.savings||0), 0);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-calculator', 'Optimization Runs', runs.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-dollar-sign', 'Total Savings', usd(totalSavings), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-chart-line', 'Avg Savings', runs.length ? usd(totalSavings/runs.length) : '—', 'bg-sgtx-50 text-sgtx-600')}
    </div>
    ${runs.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Trade ID</th><th>Original Fees</th><th>Optimized</th><th>Savings</th><th>Type</th><th>Created</th>
    </tr></thead><tbody>${runs.map(r => `<tr>
      <td class="font-mono text-xs">${(r.trade_id||'').slice(0,8)}</td>
      <td>${usd(r.original_fees)}</td>
      <td>${usd(r.optimized_fees)}</td>
      <td class="font-bold text-green-600">${usd(r.savings)}</td>
      <td>${badge(r.optimization_type || 'FULL')}</td>
      <td class="text-xs">${time(r.created_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No fee optimization runs yet')}`;
}

// ─── LIVING QUOTES (Phase 2) ────────────────────────────
async function renderLivingQuotes() {
  setTitle('Living Quotes', 'Real-time price-adjusted quotes with market index tracking');
  const data = await api('/living-quotes');
  const quotes = data.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-sync-alt', 'Active Quotes', quotes.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-dollar-sign', 'Avg Price', quotes.length ? usd(quotes.reduce((s,q) => s + (q.current_price||0), 0)/quotes.length) : '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-clock', 'Expiring Soon', quotes.filter(q => q.expiry_at && new Date(q.expiry_at) < new Date(Date.now()+86400000*3)).length, 'bg-yellow-50 text-yellow-600')}
    </div>
    ${quotes.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Quote ID</th><th>Exporter</th><th>Current Price</th><th>Currency</th><th>Market Ref</th><th>Reason</th><th>Expiry</th><th>Updated</th>
    </tr></thead><tbody>${quotes.map(q => `<tr>
      <td class="font-mono text-xs">${(q.id||'').slice(0,8)}</td>
      <td>${q.exporter_name || '—'}</td>
      <td class="font-bold">${usd(q.current_price)}</td>
      <td>${q.currency || 'USD'}</td>
      <td class="text-xs">${q.market_index_ref || '—'}</td>
      <td class="text-xs">${q.adjustment_reason || '—'}</td>
      <td class="text-xs">${q.expiry_at || 'No expiry'}</td>
      <td class="text-xs">${time(q.updated_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No living quotes active')}`;
}

// ─── TRADE COMPOSER (Phase 1 — AI) ──────────────────────
async function renderTradeComposer() {
  setTitle('AI Trade Composer', 'AI-powered trade description parsing and field extraction');
  const data = await api('/trade-composer');
  const interactions = data.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-magic', 'Interactions', interactions.length, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-bullseye', 'Avg Confidence', interactions.length ? ((interactions.reduce((s,i) => s + (i.ai_confidence||0), 0)/interactions.length)*100).toFixed(0)+'%' : '—', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-keyboard', 'Input Types', [...new Set(interactions.map(i => i.input_type))].length, 'bg-blue-50 text-blue-600')}
    </div>
    ${!isReadOnly() ? `<div class="card p-5 mb-4">
      <h4 class="font-bold mb-3"><i class="fas fa-magic mr-2 text-purple-600"></i>Compose a Trade</h4>
      <form onsubmit="submitTradeComposer(event)">
        <textarea id="tc-input" class="input w-full h-24" placeholder="Describe your trade in natural language, e.g. 'I need to buy 500 MT of Egyptian oranges HS0805 CIF Hamburg, prefer letter of credit terms...'"></textarea>
        <button type="submit" class="btn-primary mt-2"><i class="fas fa-brain mr-2"></i>Parse with AI</button>
      </form>
    </div>` : ''}
    ${interactions.length ? `<div class="space-y-3">${interactions.map(i => {
      const fields = JSON.parse(i.extracted_fields || '{}');
      return `<div class="card p-4">
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs text-gray-500">${i.input_type || 'TEXT'} — Confidence: ${((i.ai_confidence||0)*100).toFixed(0)}%</span>
          <span class="text-xs text-gray-400">${time(i.created_at)}</span>
        </div>
        <div class="bg-gray-50 p-3 rounded text-sm mb-2">${i.raw_input || '—'}</div>
        <div class="flex gap-2 flex-wrap">${Object.entries(fields).filter(([k,v]) => v).map(([k,v]) => `<span class="bg-sgtx-50 text-sgtx-700 px-2 py-0.5 rounded text-xs"><b>${k}:</b> ${v}</span>`).join('')}</div>
      </div>`;
    }).join('')}</div>` : emptyState('No trade composer interactions yet')}`;
}
async function submitTradeComposer(e) {
  e.preventDefault();
  await apiPost('/trade-composer', { tenant_id: tenant?.id, raw_input: document.getElementById('tc-input').value, input_type: 'TEXT' });
  navigate('tradecomposer');
}

// ─── TOKENIZED ASSETS (Phase 4 — DeFi) ─────────────────
async function renderTokenizedAssets() {
  setTitle('Tokenized Trade Assets', 'Blockchain-tokenized trade receivables and financing instruments');
  const data = await api('/tokenized-assets');
  const assets = data.data || [];
  const totalValue = assets.reduce((s,a) => s + (a.face_value||0), 0);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-coins', 'Total Assets', assets.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-dollar-sign', 'Total Face Value', usd(totalValue), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-check-circle', 'Minted', assets.filter(a => a.status === 'MINTED').length, 'bg-purple-50 text-purple-600')}
    </div>
    ${assets.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Asset ID</th><th>Type</th><th>Chain</th><th>Face Value</th><th>Holder</th><th>Status</th><th>Token Address</th>
    </tr></thead><tbody>${assets.map(a => `<tr>
      <td class="font-mono text-xs">${(a.id||'').slice(0,8)}</td>
      <td>${badge(a.asset_type || 'TRADE_RECEIVABLE')}</td>
      <td>${a.chain || 'ethereum'}</td>
      <td class="font-bold">${usd(a.face_value)}</td>
      <td class="font-mono text-xs">${(a.current_holder_gtid||'—').slice(0,16)}</td>
      <td>${badge(a.status)}</td>
      <td class="font-mono text-xs">${(a.token_address||'').slice(0,12)}...</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No tokenized assets yet')}`;
}

// ─── BLOCKCHAIN VERIFICATIONS (Phase 4) ─────────────────
async function renderBlockchainVerify() {
  setTitle('Blockchain Verifications', 'On-chain document and transaction verification records');
  const data = await api('/blockchain-verifications');
  const verifications = data.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-link', 'Total Verifications', verifications.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-file-alt', 'Document Hashes', verifications.filter(v => v.verification_type === 'DOCUMENT_HASH').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-cube', 'Chains Used', [...new Set(verifications.map(v => v.chain))].length, 'bg-purple-50 text-purple-600')}
    </div>
    ${verifications.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Entity Type</th><th>Entity ID</th><th>Chain</th><th>TX Hash</th><th>Block</th><th>Type</th><th>Verified</th>
    </tr></thead><tbody>${verifications.map(v => `<tr>
      <td>${v.entity_type}</td>
      <td class="font-mono text-xs">${(v.entity_id||'').slice(0,12)}</td>
      <td>${v.chain}</td>
      <td class="font-mono text-xs">${(v.tx_hash||'').slice(0,16)}...</td>
      <td>${v.block_number||0}</td>
      <td>${badge(v.verification_type)}</td>
      <td class="text-xs">${time(v.verified_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No blockchain verifications yet')}`;
}

// ─── SMART CLAUSES (Phase 3) ────────────────────────────
async function renderSmartClauses() {
  setTitle('Smart Clause Executions', 'Auto-executing contract clauses with trigger conditions');
  const data = await api('/smart-clauses');
  const clauses = data.data || [];
  const triggered = clauses.filter(c => c.trigger_met);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-file-code', 'Total Executions', clauses.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-bolt', 'Triggered', triggered.length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-pause', 'Pending', clauses.length - triggered.length, 'bg-yellow-50 text-yellow-600')}
    </div>
    ${clauses.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>Contract</th><th>Clause Type</th><th>Trigger Condition</th><th>Triggered</th><th>Executed</th>
    </tr></thead><tbody>${clauses.map(c => `<tr>
      <td class="font-mono text-xs">${(c.contract_id||'').slice(0,8)}</td>
      <td class="font-semibold">${c.clause_type}</td>
      <td class="text-xs">${c.trigger_condition || '—'}</td>
      <td>${c.trigger_met ? '<span class="text-green-600 font-bold">✓ Yes</span>' : '<span class="text-gray-400">No</span>'}</td>
      <td class="text-xs">${time(c.executed_at)}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No smart clause executions yet')}`;
}

// ─── SHIPMENT SCHEDULES (Phase 5) ───────────────────────
async function renderShipmentSchedules() {
  setTitle('Shipment Schedules', 'Vessel schedules, departure/arrival tracking');
  const data = await api('/shipment-schedules');
  const schedules = data.data || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-calendar-alt', 'Total Schedules', schedules.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-ship', 'Vessels', [...new Set(schedules.filter(s => s.vessel_name).map(s => s.vessel_name))].length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-clock', 'Avg Transit', schedules.length ? (schedules.reduce((s,x) => s + (x.transit_days||0), 0)/schedules.length).toFixed(0) + ' days' : '—', 'bg-sgtx-50 text-sgtx-600')}
    </div>
    ${schedules.length ? `<div class="card overflow-hidden"><table class="data-table"><thead><tr>
      <th>USTN</th><th>Carrier</th><th>Vessel</th><th>Voyage</th><th>Origin</th><th>Destination</th><th>Departure</th><th>Arrival</th><th>Status</th>
    </tr></thead><tbody>${schedules.map(s => `<tr>
      <td class="font-mono text-xs">${s.shipment_ustn || '—'}</td>
      <td>${s.carrier_name || '—'}</td>
      <td>${s.vessel_name || '—'}</td>
      <td>${s.voyage_number || '—'}</td>
      <td>${s.origin_port || '—'}</td>
      <td>${s.destination_port || '—'}</td>
      <td class="text-xs">${s.departure_date || '—'}</td>
      <td class="text-xs">${s.arrival_date || '—'}</td>
      <td>${badge(s.status || 'SCHEDULED')}</td>
    </tr>`).join('')}</tbody></table></div>` : emptyState('No shipment schedules yet')}`;
}

// ─── ADVANCED STATS (aggregate new tables) ──────────────
async function renderAdvancedStats() {
  setTitle('Advanced Blueprint Stats', 'Record counts for v6.2 advanced tables');
  const data = await api('/advanced-stats');
  const d = data.data || {};
  const tables = [
    { name: 'IoT Readings', count: d.iot_readings, icon: 'fa-thermometer-half', phase: '5' },
    { name: 'eBLs', count: d.ebls, icon: 'fa-file-alt', phase: '5' },
    { name: 'Commodity Warnings', count: d.commodity_warnings, icon: 'fa-exclamation', phase: '1' },
    { name: 'HS Codes', count: d.hs_codes, icon: 'fa-barcode', phase: '1' },
    { name: 'Carrier Profiles', count: d.carrier_profiles, icon: 'fa-truck', phase: '5' },
    { name: 'Provider Invoices', count: d.provider_invoices, icon: 'fa-file-invoice-dollar', phase: '2' },
    { name: 'Sanctions Proximity', count: d.sanctions_proximity, icon: 'fa-shield-alt', phase: '7' },
    { name: 'Shell Detection', count: d.shell_detection, icon: 'fa-building', phase: '7' },
    { name: 'Fraud Detection', count: d.fraud_detection, icon: 'fa-user-secret', phase: '7' },
    { name: 'Model Drift', count: d.model_drift, icon: 'fa-brain', phase: 'AI' },
    { name: 'Policy Suggestions', count: d.policy_suggestions, icon: 'fa-lightbulb', phase: 'Gov' },
    { name: 'Fee Optimization', count: d.fee_optimization, icon: 'fa-calculator', phase: '6' },
    { name: 'Living Quotes', count: d.living_quotes, icon: 'fa-sync-alt', phase: '2' },
    { name: 'Trade Composer', count: d.trade_composer, icon: 'fa-magic', phase: '1' },
    { name: 'Tokenized Assets', count: d.tokenized_assets, icon: 'fa-coins', phase: '4' },
    { name: 'Blockchain Verify', count: d.blockchain_verifications, icon: 'fa-link', phase: '4' },
    { name: 'Individual Financiers', count: d.individual_financiers, icon: 'fa-user-tie', phase: '4' },
    { name: 'Shipment Schedules', count: d.shipment_schedules, icon: 'fa-calendar-alt', phase: '5' },
    { name: 'Smart Clauses', count: d.smart_clauses, icon: 'fa-file-code', phase: '3' },
  ];
  const total = tables.reduce((s, t) => s + (t.count || 0), 0);
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-gray-700"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>v6.2 Advanced Tables — ${tables.length} Tables</h3>
        <span class="text-sm text-gray-500">Total Records: <b>${total.toLocaleString()}</b></span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        ${tables.map(t => `
          <div class="bg-gray-50 p-3 rounded-lg border hover:border-sgtx-300 transition">
            <div class="flex items-center gap-2 mb-1"><i class="fas ${t.icon} text-sgtx-400 text-xs"></i><span class="text-xs font-semibold text-gray-700">${t.name}</span></div>
            <div class="text-xl font-bold text-sgtx-600">${t.count || 0}</div>
            <div class="text-[10px] text-gray-400">Phase ${t.phase}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// v6.2 GAP CLOSURE — Portal-Specific Feature Pages
// Blueprint alignment: 6.2.1-6.2.6 complete features
// ═══════════════════════════════════════════════════════

// ─── IMPORTER: Counter-Offer Simulator (Phase 3.1) ────
async function renderCounterOffers() {
  setTitle('Counter-Offer Simulator', 'AI-powered negotiation bot — Phase 3.1');
  const { data: offers } = await api('/counter-offers');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-comments-dollar', 'Counter-Offers', offers.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-robot', 'AI Recommendations', offers.filter(o => o.ai_analysis).length, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-handshake', 'Accepted', offers.filter(o => o.status === 'ACCEPTED').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-chart-line', 'Avg Acceptance %', offers.length ? (offers.reduce((s,o) => s + (JSON.parse(o.ai_analysis || '{}').acceptance_probability || 0), 0) / offers.length * 100).toFixed(0) + '%' : '—', 'bg-orange-50 text-orange-600')}
    </div>
    <div class="card p-5 mb-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-700"><i class="fas fa-calculator mr-2 text-sgtx-500"></i>Simulate Counter-Offer</h3>
        <button onclick="showCounterOfferForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sgtx-600"><i class="fas fa-plus mr-2"></i>New Simulation</button>
      </div>
      <p class="text-sm text-gray-500 mb-4">Enter original and proposed prices to simulate AI negotiation outcomes. The simulator models acceptance probability, optimal price point, and estimated rounds to closure.</p>
      ${offers.length ? `<div class="space-y-3">${offers.map(o => {
        const analysis = JSON.parse(o.ai_analysis || '{}');
        return `<div class="border rounded-lg p-4 hover:bg-gray-50 transition">
          <div class="flex justify-between items-start">
            <div><span class="font-mono text-xs text-gray-400">${o.id?.slice(0,8)}…</span> <span class="font-medium">Round ${o.round_number || 1}</span> — ${o.proposer_name || 'Unknown'}</div>
            <div>${badge(o.status)}</div>
          </div>
          <div class="grid grid-cols-4 gap-3 mt-3 text-sm">
            <div class="bg-blue-50 p-2 rounded"><span class="text-gray-500 text-xs">Proposed</span><div class="font-bold">${usd(o.proposed_price)}</div></div>
            <div class="bg-green-50 p-2 rounded"><span class="text-gray-500 text-xs">AI Recommended</span><div class="font-bold">${usd(analysis.ai_recommended_price)}</div></div>
            <div class="bg-purple-50 p-2 rounded"><span class="text-gray-500 text-xs">Accept Prob.</span><div class="font-bold">${((analysis.acceptance_probability || 0) * 100).toFixed(1)}%</div></div>
            <div class="bg-orange-50 p-2 rounded"><span class="text-gray-500 text-xs">Est. Rounds</span><div class="font-bold">${analysis.estimated_rounds_to_close || '—'}</div></div>
          </div>
          ${analysis.analysis ? `<div class="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded"><i class="fas fa-robot mr-1 text-sgtx-400"></i>${analysis.analysis}</div>` : ''}
        </div>`;
      }).join('')}</div>` : emptyState('No counter-offer simulations yet')}
    </div>`;
}

function showCounterOfferForm() {
  showModal('Counter-Offer Simulator', `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium mb-1">Original Price (USD)</label><input id="co-original" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="26400"></div>
      <div><label class="block text-sm font-medium mb-1">Your Proposed Price (USD)</label><input id="co-proposed" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="24000"></div>
      <div><label class="block text-sm font-medium mb-1">Round Number</label><input id="co-round" type="number" value="1" class="w-full border rounded px-3 py-2 text-sm"></div>
      <button onclick="submitCounterOffer()" class="w-full bg-sgtx-500 text-white py-2 rounded-lg font-medium hover:bg-sgtx-600"><i class="fas fa-robot mr-2"></i>Run AI Simulation</button>
    </div>`);
}

async function submitCounterOffer() {
  const r = await apiPost('/counter-offers', {
    original_price: parseFloat(document.getElementById('co-original').value),
    proposed_price: parseFloat(document.getElementById('co-proposed').value),
    round: parseInt(document.getElementById('co-round').value) || 1,
    proposer_tenant_id: tenant?.id,
    actor_gtid: tenant?.gtid,
  });
  closeModal();
  if (r.data) { alert(`AI Analysis: ${r.data.acceptance_probability ? (r.data.acceptance_probability * 100).toFixed(1) + '% acceptance probability' : 'Simulation complete'}. Recommended: $${r.data.ai_recommended_price?.toFixed(2) || '—'}`); }
  renderCounterOffers();
}

// ─── IMPORTER: Trade Lineage Graph ────────────────────
async function renderTradeLineage() {
  setTitle('Trade Lineage Graph', 'Visual resell chains for commodities — Importer Portal');
  const tenantId = tenant?.id;
  const { data } = await api(`/trade-lineage?tenant_id=${tenantId || ''}`);
  const trades = data.trades || [];
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-project-diagram', 'Trade Chains', trades.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-circle-nodes', 'Nodes', nodes.length, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-arrows-alt', 'Connections', edges.length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-ship', 'Active USTNs', trades.filter(t => t.ustn).length, 'bg-orange-50 text-orange-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold text-gray-700 mb-4"><i class="fas fa-project-diagram mr-2 text-sgtx-500"></i>Lineage Flow</h3>
      ${trades.length ? `<div class="space-y-4">${trades.map(t => `
        <div class="border rounded-lg p-4 hover:bg-gray-50">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-handshake text-blue-500"></i></div>
              <div><div class="text-sm font-medium">${t.importer_name || '—'}</div><div class="text-xs text-gray-400">Importer</div></div>
            </div>
            <i class="fas fa-arrow-right text-gray-300"></i>
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-store text-green-500"></i></div>
              <div><div class="text-sm font-medium">${t.exporter_name || '—'}</div><div class="text-xs text-gray-400">Exporter</div></div>
            </div>
            ${t.contract_id ? `<i class="fas fa-arrow-right text-gray-300"></i>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><i class="fas fa-file-contract text-purple-500 text-xs"></i></div>
              <div class="text-xs">${badge(t.contract_status || 'DRAFT')}</div>
            </div>` : ''}
            ${t.ustn ? `<i class="fas fa-arrow-right text-gray-300"></i>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"><i class="fas fa-ship text-orange-500 text-xs"></i></div>
              <div><div class="font-mono text-xs">${t.ustn}</div>${badge(t.shipment_status || 'PENDING')}</div>
            </div>` : ''}
            ${t.commission_usd ? `<i class="fas fa-arrow-right text-gray-300"></i>
            <div class="bg-green-50 px-3 py-1 rounded text-xs"><i class="fas fa-coins mr-1 text-green-500"></i>${usd(t.commission_usd)} ${badge(t.lock_status)}</div>` : ''}
          </div>
          <div class="mt-2 text-xs text-gray-400"><i class="fas fa-clock mr-1"></i>${time(t.created_at)} — ${t.raw_description?.slice(0, 60) || t.id.slice(0, 12)}</div>
        </div>`).join('')}</div>` : emptyState('No trade lineage data available')}
    </div>`;
}

// ─── IMPORTER: Anonymous Market Intelligence ──────────
async function renderMarketIntel() {
  setTitle('Market Intelligence', 'Anonymous aggregated trade data — OpenDP differential privacy');
  const { data } = await api('/market-intelligence');
  document.getElementById('content').innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-800"><i class="fas fa-shield-alt mr-2"></i><b>Privacy:</b> ${data.disclaimer}</div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-dollar-sign', 'Avg EXW Price', usd(data.price_range?.avg), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-chart-line', 'Trade Count', data.price_range?.trade_count, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-percentage', 'Avg Commission', pct(data.commission_range?.avg_rate_pct), 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-globe', 'Top Corridors', data.top_corridors?.length || 0, 'bg-orange-50 text-orange-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>Price Range (OpenDP)</h3>
        <div class="space-y-3">
          <div class="flex justify-between p-3 bg-gray-50 rounded"><span class="text-gray-500">Min EXW Price:</span><span class="font-bold">${usd(data.price_range?.min)}</span></div>
          <div class="flex justify-between p-3 bg-gray-50 rounded"><span class="text-gray-500">Average EXW Price:</span><span class="font-bold">${usd(data.price_range?.avg)}</span></div>
          <div class="flex justify-between p-3 bg-gray-50 rounded"><span class="text-gray-500">Max EXW Price:</span><span class="font-bold">${usd(data.price_range?.max)}</span></div>
          <div class="flex justify-between p-3 bg-yellow-50 rounded"><span class="text-gray-500">Privacy Budget:</span><span class="font-bold text-yellow-600">${data.price_range?.privacy_budget}</span></div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-globe mr-2 text-sgtx-500"></i>Top Trade Corridors</h3>
        ${data.top_corridors?.length ? `<div class="space-y-2">${data.top_corridors.map(c => `
          <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span><i class="fas fa-flag mr-1 text-sgtx-400"></i>${c.origin} → ${c.destination}</span>
            <span class="font-bold text-sgtx-600">${c.count} trades</span>
          </div>`).join('')}</div>` : '<p class="text-gray-400 text-sm">No corridor data yet</p>'}
      </div>
    </div>`;
}

// ─── EXPORTER: Containerisation & Packing (Phase 2.2) ─
async function renderContainerisation() {
  setTitle('Containerisation & Packing', 'AI palletisation + 3D loading guidance — Phase 2.2');
  const { data: plans } = await api('/palletisation');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-boxes', 'Packing Plans', plans.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-pallet', 'Pallets', plans.reduce((s,p) => s + (p.pallet_count || 0), 0), 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-cubes', 'Containers', plans.reduce((s,p) => s + (p.container_count || 0), 0), 'bg-orange-50 text-orange-600')}
      ${statCard('fas fa-robot', 'AI Optimised', plans.filter(p => p.ai_recommendation).length, 'bg-green-50 text-green-600')}
    </div>
    <div class="card p-5 mb-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-700"><i class="fas fa-calculator mr-2 text-sgtx-500"></i>Palletisation Calculator</h3>
        <button onclick="showPalletisationCalc()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm font-medium"><i class="fas fa-calculator mr-2"></i>Calculate</button>
      </div>
      <div class="grid grid-cols-4 gap-4 text-sm text-center mb-4">
        <div class="bg-blue-50 p-3 rounded-lg"><i class="fas fa-box text-blue-500 text-2xl mb-2"></i><div class="font-bold">40' HC</div><div class="text-xs text-gray-500">12.03 × 2.35 × 2.69m</div><div class="text-xs text-gray-400">26,500 kg max</div></div>
        <div class="bg-green-50 p-3 rounded-lg"><i class="fas fa-box text-green-500 text-2xl mb-2"></i><div class="font-bold">20' DC</div><div class="text-xs text-gray-500">5.90 × 2.35 × 2.39m</div><div class="text-xs text-gray-400">21,800 kg max</div></div>
        <div class="bg-purple-50 p-3 rounded-lg"><i class="fas fa-box text-purple-500 text-2xl mb-2"></i><div class="font-bold">40' DC</div><div class="text-xs text-gray-500">12.03 × 2.35 × 2.39m</div><div class="text-xs text-gray-400">26,500 kg max</div></div>
        <div class="bg-orange-50 p-3 rounded-lg"><i class="fas fa-snowflake text-orange-500 text-2xl mb-2"></i><div class="font-bold">40' Reefer</div><div class="text-xs text-gray-500">11.58 × 2.29 × 2.50m</div><div class="text-xs text-gray-400">27,400 kg max</div></div>
      </div>
    </div>
    ${plans.length ? `<div class="card p-5"><h4 class="font-bold mb-3"><i class="fas fa-list mr-2"></i>Existing Plans</h4><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Plan ID</th><th class="p-2">Pallets</th><th class="p-2">Containers</th><th class="p-2">Status</th><th class="p-2">AI Rec.</th></tr></thead><tbody>${plans.map(p => `<tr class="border-t hover:bg-gray-50"><td class="p-2 font-mono text-xs">${p.id?.slice(0,8)}…</td><td class="p-2 text-center">${p.pallet_count || '—'}</td><td class="p-2 text-center">${p.container_count || '—'}</td><td class="p-2 text-center">${badge(p.status || 'DRAFT')}</td><td class="p-2 text-xs text-gray-500">${p.ai_recommendation || '—'}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}

function showPalletisationCalc() {
  showModal('Palletisation Calculator (OR-Tools)', `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium mb-1">Container Type</label>
        <select id="pall-container" class="w-full border rounded px-3 py-2 text-sm">
          <option value="40HC">40' HC (12.03 × 2.35 × 2.69m)</option>
          <option value="20DC">20' DC (5.90 × 2.35 × 2.39m)</option>
          <option value="40DC">40' DC (12.03 × 2.35 × 2.39m)</option>
          <option value="40REEFER">40' Reefer (11.58 × 2.29 × 2.50m)</option>
        </select></div>
      <div><label class="block text-sm font-medium mb-1">Total Cartons</label><input id="pall-cartons" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="500"></div>
      <div><label class="block text-sm font-medium mb-1">Avg Weight per Carton (kg)</label><input id="pall-weight" type="number" class="w-full border rounded px-3 py-2 text-sm" placeholder="18"></div>
      <button onclick="runPalletisation()" class="w-full bg-sgtx-500 text-white py-2 rounded-lg font-medium hover:bg-sgtx-600"><i class="fas fa-robot mr-2"></i>Calculate Palletisation</button>
    </div>`);
}

async function runPalletisation() {
  const qty = parseInt(document.getElementById('pall-cartons').value) || 500;
  const wt = parseFloat(document.getElementById('pall-weight').value) || 18;
  const r = await apiPost('/palletisation/calculate', {
    container_type: document.getElementById('pall-container').value,
    cartons: [{ quantity: qty, weight_kg: wt }],
  });
  closeModal();
  if (r.data) {
    const d = r.data;
    showModal('Palletisation Result', `
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 p-3 rounded"><span class="text-xs text-gray-500">Container</span><div class="font-bold">${d.container_type}</div></div>
          <div class="bg-green-50 p-3 rounded"><span class="text-xs text-gray-500">Utilisation</span><div class="font-bold">${d.utilization_pct}%</div></div>
          <div class="bg-purple-50 p-3 rounded"><span class="text-xs text-gray-500">Pallets</span><div class="font-bold">${d.max_pallets_per_container}</div></div>
          <div class="bg-orange-50 p-3 rounded"><span class="text-xs text-gray-500">Containers Needed</span><div class="font-bold">${d.containers_needed}</div></div>
        </div>
        <div class="bg-sgtx-50 p-3 rounded text-sm"><i class="fas fa-robot mr-1 text-sgtx-500"></i>${d.ai_recommendation}</div>
        <div class="text-xs text-gray-400">${d.palletisation_plan?.length || 0} pallets in plan, ${d.cartons_per_pallet} cartons each</div>
      </div>`);
  }
}

// ─── EXPORTER: Document Finalisation ──────────────────
async function renderDocFinalisation() {
  setTitle('Document Finalisation', 'Sign packing list/invoice with automatic translation — Phase 2/3');
  const { data } = await api('/document-finalisation');
  const docs = data.documents || [];
  const missing = data.missing || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-file-alt', 'Documents', docs.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-check-circle', 'Completion', data.completion_pct + '%', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-triangle', 'Missing', missing.length, missing.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}
      ${statCard('fas fa-signature', 'Signed', docs.filter(d => d.status === 'SIGNED').length, 'bg-purple-50 text-purple-600')}
    </div>
    ${missing.length ? `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-5"><h4 class="font-bold text-red-700 mb-2"><i class="fas fa-exclamation-triangle mr-2"></i>Missing Required Documents</h4><div class="flex flex-wrap gap-2">${missing.map(m => `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">${m}</span>`).join('')}</div></div>` : '<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 text-sm text-green-700"><i class="fas fa-check-circle mr-2"></i>All required documents uploaded</div>'}
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-file-alt mr-2 text-sgtx-500"></i>Document Checklist</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Type</th><th class="p-2">Status</th><th class="p-2">Uploaded</th><th class="p-2">Actions</th></tr></thead><tbody>
      ${(data.required || []).map(type => {
        const doc = docs.find(d => d.document_type === type);
        return `<tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${type.replace(/_/g, ' ')}</td><td class="p-2 text-center">${doc ? badge(doc.status) : '<span class="text-red-500 text-xs font-medium">MISSING</span>'}</td><td class="p-2 text-center text-xs text-gray-400">${doc ? time(doc.uploaded_at) : '—'}</td><td class="p-2 text-center">${doc && doc.status !== 'SIGNED' ? `<button onclick="signDocument('${doc.id}')" class="bg-sgtx-500 text-white px-3 py-1 rounded text-xs">Sign</button>` : (doc ? '<span class="text-green-500 text-xs">Signed</span>' : '<button class="bg-blue-500 text-white px-3 py-1 rounded text-xs">Upload</button>')}</td></tr>`;
      }).join('')}
      </tbody></table></div>
    </div>`;
}

async function signDocument(docId) {
  await apiPost('/document-finalisation/sign', { document_id: docId, signed_by: tenant?.id });
  renderDocFinalisation();
}

// ─── EXPORTER: QC Booking ─────────────────────────────
async function renderQCBooking() {
  setTitle('QC Booking', 'AI-prioritised inspection points — Phase 2');
  const { data: bookings } = await api(`/qc-bookings?tenant_id=${tenant?.id || ''}`);
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-clipboard-check', 'Bookings', bookings.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-calendar-check', 'Scheduled', bookings.filter(b => b.status === 'SCHEDULED').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-check-double', 'Completed', bookings.filter(b => b.status === 'COMPLETED').length, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-robot', 'AI Priority', bookings.filter(b => b.ai_recommendation).length, 'bg-orange-50 text-orange-600')}
    </div>
    <div class="card p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-700"><i class="fas fa-clipboard-check mr-2 text-sgtx-500"></i>Inspection Bookings</h3>
        <button onclick="showQCBookingForm()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm font-medium"><i class="fas fa-plus mr-2"></i>Book Inspection</button>
      </div>
      ${bookings.length ? `<div class="space-y-3">${bookings.map(b => `
        <div class="border rounded-lg p-4 hover:bg-gray-50">
          <div class="flex justify-between"><div class="font-medium">${b.inspector_name || 'Pending Assignment'} <span class="text-xs text-gray-400">— ${b.inspection_type || 'PRE_SHIPMENT'}</span></div>${badge(b.status)}</div>
          ${b.ustn ? `<div class="text-xs text-gray-400 mt-1">USTN: ${b.ustn}</div>` : ''}
          ${b.ai_recommendation ? `<div class="mt-2 bg-sgtx-50 p-2 rounded text-xs"><i class="fas fa-robot mr-1 text-sgtx-500"></i>${b.ai_recommendation}</div>` : ''}
          <div class="text-xs text-gray-400 mt-1"><i class="fas fa-calendar mr-1"></i>Scheduled: ${time(b.scheduled_date)}</div>
        </div>`).join('')}</div>` : emptyState('No QC bookings yet — book an inspection to get AI-recommended priority pallets')}
    </div>`;
}

function showQCBookingForm() {
  showModal('Book QC Inspection', `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium mb-1">Shipment ID</label><input id="qcb-shipment" class="w-full border rounded px-3 py-2 text-sm" placeholder="Shipment ID"></div>
      <div><label class="block text-sm font-medium mb-1">Commodity HS Code</label><input id="qcb-hs" class="w-full border rounded px-3 py-2 text-sm" placeholder="0805 (Citrus)"></div>
      <div><label class="block text-sm font-medium mb-1">Inspection Type</label>
        <select id="qcb-type" class="w-full border rounded px-3 py-2 text-sm">
          <option value="PRE_SHIPMENT">Pre-Shipment</option>
          <option value="LOADING">Loading Supervision</option>
          <option value="ARRIVAL">Arrival Inspection</option>
        </select></div>
      <button onclick="submitQCBooking()" class="w-full bg-sgtx-500 text-white py-2 rounded-lg font-medium"><i class="fas fa-calendar-check mr-2"></i>Book & Get AI Priority Pallets</button>
    </div>`);
}

async function submitQCBooking() {
  await apiPost('/qc-bookings', {
    shipment_id: document.getElementById('qcb-shipment').value,
    commodity_hs: document.getElementById('qcb-hs').value,
    inspection_type: document.getElementById('qcb-type').value,
    requested_by: tenant?.id, actor_gtid: tenant?.gtid,
  });
  closeModal();
  renderQCBooking();
}

// ─── LOGISTICS: Bundle Builder / Freight Forwarder ────
async function renderBundleBuilder() {
  setTitle('Logistics Bundle Builder', 'AI-optimized provider combination — Freight Forwarder');
  const { data } = await api('/logistics/bundle-builder');
  const bundle = data.bundle || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-cubes', 'Responses', data.responses?.length || 0, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-dollar-sign', 'Optimal Cost', usd(data.total_optimal_cost), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-layer-group', 'Service Types', bundle.length, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-robot', 'On-Time Prob.', '87%', 'bg-orange-50 text-orange-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-magic mr-2 text-sgtx-500"></i>AI-Optimized Bundle</h3>
      <div class="bg-sgtx-50 p-3 rounded-lg text-sm mb-4"><i class="fas fa-robot mr-1 text-sgtx-500"></i>${data.ai_recommendation || 'Bundle analysis pending'}</div>
      ${bundle.length ? `<div class="space-y-4">${bundle.map(b => `
        <div class="border rounded-lg p-4">
          <div class="flex justify-between items-center mb-2"><h4 class="font-bold text-sgtx-600">${b.service_type}</h4><span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Saves ${b.savings_vs_max}</span></div>
          <div class="bg-green-50 p-3 rounded mb-2"><span class="text-sm text-gray-600">Recommended:</span> <span class="font-bold">${b.recommended?.provider_name || '—'}</span> — ${usd(b.recommended?.total_price)}</div>
          ${b.alternatives?.length ? `<div class="text-xs text-gray-400">Alternatives: ${b.alternatives.map(a => `${a.provider_name} (${usd(a.total_price)})`).join(', ')}</div>` : ''}
        </div>`).join('')}</div>` : emptyState('No RFQ responses yet — submit RFQs to logistics providers')}
    </div>`;
}

// ─── LOGISTICS: Customs Broker Checklist ──────────────
async function renderCustomsChecklist() {
  setTitle('Customs Broker Checklist', 'AI-validated document compliance');
  const { data } = await api('/logistics/customs-checklist');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-clipboard-check', 'Required', data.total_required, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-check-circle', 'Completed', data.completed, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-percentage', 'Compliance', data.compliance_pct + '%', 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-ship', 'Customs Ready', data.customs_ready ? 'YES' : 'NO', data.customs_ready ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-clipboard-list mr-2 text-sgtx-500"></i>Document Compliance Checklist</h3>
      ${data.checklist?.length ? `<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Document</th><th class="p-2">Required</th><th class="p-2">AI Validated</th><th class="p-2">Status</th></tr></thead><tbody>${data.checklist.map(d => `
        <tr class="border-t hover:bg-gray-50">
          <td class="p-2 font-medium">${(d.document_type || '').replace(/_/g, ' ')}</td>
          <td class="p-2 text-center">${d.required ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-minus text-gray-300"></i>'}</td>
          <td class="p-2 text-center">${d.ai_validated ? '<i class="fas fa-robot text-green-500"></i>' : '<i class="fas fa-times text-red-400"></i>'}</td>
          <td class="p-2 text-center">${badge(d.compliance_status)}</td>
        </tr>`).join('')}</tbody></table></div>` : emptyState('No document requirements loaded')}
    </div>`;
}

// ─── FINANCIER: Portfolio Dashboard ───────────────────
async function renderPortfolio() {
  setTitle('Portfolio Dashboard', 'Active loans, tokenized assets, stablecoin health — Monte Carlo VaR');
  const { data } = await api(`/portfolio?tenant_id=${tenant?.id || ''}`);
  const mc = data.monte_carlo_analysis || {};
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-university', 'Active Loans', data.active_loans, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-dollar-sign', 'Total Exposure', usd(data.total_exposure), 'bg-red-50 text-red-600')}
      ${statCard('fas fa-coins', 'Tokenized Assets', data.tokenized_assets, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-heartbeat', 'Stablecoin', data.stablecoin_health?.status || '—', 'bg-green-50 text-green-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-red-600"><i class="fas fa-chart-area mr-2"></i>Monte Carlo Risk Analysis (${mc.simulations?.toLocaleString()} iterations)</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between p-2 bg-gray-50 rounded"><span>Portfolio Default Prob:</span><span class="font-bold">${(mc.portfolio_default_probability * 100).toFixed(2)}%</span></div>
          <div class="flex justify-between p-2 bg-red-50 rounded"><span>Total Expected Loss:</span><span class="font-bold text-red-600">${usd(mc.total_expected_loss)}</span></div>
          <div class="flex justify-between p-2 bg-orange-50 rounded"><span>VaR (95%):</span><span class="font-bold text-orange-600">${usd(mc.var_95)}</span></div>
          <div class="flex justify-between p-2 bg-red-50 rounded"><span>VaR (99%):</span><span class="font-bold text-red-700">${usd(mc.var_99)}</span></div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3 text-gray-700"><i class="fas fa-heartbeat mr-2 text-green-500"></i>Stablecoin Health</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between p-2 bg-green-50 rounded"><span>Status:</span><span class="font-bold text-green-600">${data.stablecoin_health?.status}</span></div>
          <div class="flex justify-between p-2 bg-gray-50 rounded"><span>Peg Deviation:</span><span class="font-bold">${data.stablecoin_health?.peg_deviation}</span></div>
        </div>
        <h4 class="font-bold mt-4 mb-2 text-gray-600 text-sm">Individual Loan Risk</h4>
        ${mc.individual?.length ? `<div class="space-y-1 max-h-40 overflow-y-auto">${mc.individual.map(i => `
          <div class="flex justify-between text-xs p-1 bg-gray-50 rounded"><span>${i.borrower || i.loan_id?.slice(0,8)}</span><span class="text-red-500">${(i.default_probability * 100).toFixed(1)}% default</span></div>`).join('')}</div>` : '<p class="text-gray-400 text-xs">No active loans</p>'}
      </div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-list mr-2 text-sgtx-500"></i>Loan Portfolio</h3>
      ${data.loans?.length ? `<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Borrower</th><th class="p-2">Amount</th><th class="p-2">Instrument</th><th class="p-2">USTN</th><th class="p-2">Status</th></tr></thead><tbody>${data.loans.map(l => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2">${l.borrower_name || '—'}</td><td class="p-2 text-right">${usd(l.financing_amount)}</td><td class="p-2 text-center">${l.instrument_type || '—'}</td><td class="p-2 font-mono text-xs">${l.ustn || '—'}</td><td class="p-2">${badge(l.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No financing agreements')}
    </div>`;
}

// ─── FINANCIER: Risk Simulator (Monte Carlo) ──────────
async function renderRiskSimulator() {
  setTitle('Risk Simulator', 'Monte Carlo trade outcome simulation — 10,000 iterations');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-4 text-gray-700"><i class="fas fa-chart-area mr-2 text-sgtx-500"></i>Monte Carlo Trade Risk Simulator</h3>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div><label class="block text-sm font-medium mb-1">Trade Value (USD)</label><input id="rs-value" type="number" class="w-full border rounded px-3 py-2 text-sm" value="26400"></div>
        <div><label class="block text-sm font-medium mb-1">Logistics Cost (USD)</label><input id="rs-logistics" type="number" class="w-full border rounded px-3 py-2 text-sm" value="9000"></div>
        <div><label class="block text-sm font-medium mb-1">Market Price (USD)</label><input id="rs-market" type="number" class="w-full border rounded px-3 py-2 text-sm" value="42000"></div>
      </div>
      <button onclick="runRiskSim()" class="bg-sgtx-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-sgtx-600"><i class="fas fa-play mr-2"></i>Run 10,000 Simulations</button>
    </div>
    <div id="risk-results"></div>`;
}

async function runRiskSim() {
  document.getElementById('risk-results').innerHTML = '<div class="flex items-center justify-center h-32"><i class="fas fa-spinner fa-spin text-2xl text-sgtx-500"></i></div>';
  const r = await apiPost('/risk-simulator', {
    trade_value: parseFloat(document.getElementById('rs-value').value),
    logistics_cost: parseFloat(document.getElementById('rs-logistics').value),
    market_price: parseFloat(document.getElementById('rs-market').value),
  });
  const d = r.data;
  document.getElementById('risk-results').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-thumbs-up', 'Profitable', d.profitable_pct + '%', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-triangle', 'Default Risk', d.default_pct + '%', 'bg-red-50 text-red-600')}
      ${statCard('fas fa-dollar-sign', 'Avg Profit', usd(d.avg_profit), 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-chart-line', 'Median', usd(d.median_profit), 'bg-purple-50 text-purple-600')}
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>Distribution</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between p-2 bg-red-50 rounded"><span>Worst Case (0%):</span><span class="font-bold text-red-600">${usd(d.worst_case)}</span></div>
          <div class="flex justify-between p-2 bg-orange-50 rounded"><span>VaR 5%:</span><span class="font-bold text-orange-600">${usd(d.var_5pct)}</span></div>
          <div class="flex justify-between p-2 bg-blue-50 rounded"><span>Average:</span><span class="font-bold">${usd(d.avg_profit)}</span></div>
          <div class="flex justify-between p-2 bg-green-50 rounded"><span>VaR 95%:</span><span class="font-bold text-green-600">${usd(d.var_95pct)}</span></div>
          <div class="flex justify-between p-2 bg-green-50 rounded"><span>Best Case (100%):</span><span class="font-bold text-green-700">${usd(d.best_case)}</span></div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3"><i class="fas fa-robot mr-2 text-sgtx-500"></i>AI Recommendation</h3>
        <div class="bg-sgtx-50 p-4 rounded-lg"><span class="text-lg font-bold text-sgtx-700">${d.recommendation}</span></div>
        <div class="mt-3 text-xs text-gray-500">${d.iterations?.toLocaleString()} iterations completed.</div>
      </div>
    </div>`;
}

// ─── ADMIN: Constitutional Policy Editor ──────────────
async function renderPolicyEditor() {
  setTitle('Constitutional Policy Editor', 'Visual Rego editor with WASM compilation — Admin Portal');
  const { data } = await api('/admin/policies');
  const rules = data.governance_rules || [];
  const policies = data.policies || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-gavel', 'Total Phases', data.total_phases, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-shield-alt', 'Governance Gates', data.total_gates, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-file-code', 'Policy Updates', policies.length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-tag', 'Version', data.policy_version, 'bg-orange-50 text-orange-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-gavel mr-2 text-sgtx-500"></i>Active Governance Rules (10 Phases × 84 Gates)</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Policy ID</th><th class="p-2">Phase</th><th class="p-2">Description</th><th class="p-2">Version</th></tr></thead><tbody>${rules.map(r => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-mono text-xs text-sgtx-600">${r.id}</td><td class="p-2 text-center"><span class="bg-sgtx-100 text-sgtx-700 px-2 py-0.5 rounded-full text-xs">${r.phase}</span></td><td class="p-2">${r.description}</td><td class="p-2 text-center">${badge(r.version)}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-history mr-2 text-sgtx-500"></i>Recent Policy Changes</h3>
      ${policies.length ? `<div class="space-y-2">${policies.map(p => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded"><div><span class="font-medium">${p.policy_name}</span> <span class="text-xs text-gray-400">${p.version}</span></div><div>${badge(p.status)} <span class="text-xs text-gray-400">${time(p.created_at)}</span></div></div>`).join('')}</div>` : emptyState('No policy changes recorded')}
    </div>`;
}

// ─── ADMIN: PSP Health Monitor ────────────────────────
async function renderPSPHealth() {
  setTitle('PSP Health Monitor', 'Real-time health scores and fallback status — Admin Portal');
  const { data } = await api('/admin/psp-health');
  const summary = data.summary || {};
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-heartbeat', 'Total PSPs', summary.total, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-check-circle', 'Healthy', summary.healthy, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-circle', 'Degraded', summary.degraded, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-times-circle', 'Down', summary.down, summary.down > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}
    </div>
    ${summary.fallback_active ? '<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700"><i class="fas fa-exclamation-triangle mr-2"></i><b>Fallback Active:</b> One or more PSPs are down. Automatic failover is engaged.</div>' : ''}
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-server mr-2 text-sgtx-500"></i>PSP Aggregators</h3>
      ${data.aggregators?.length ? `<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Name</th><th class="p-2">Country</th><th class="p-2">Avg Health</th><th class="p-2">Avg Latency</th><th class="p-2">Status</th></tr></thead><tbody>${data.aggregators.map(a => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${a.name}</td><td class="p-2 text-center">${a.country || '—'}</td><td class="p-2 text-center"><span class="${(a.avg_health || 0) >= 0.8 ? 'text-green-600' : (a.avg_health || 0) >= 0.5 ? 'text-yellow-600' : 'text-red-600'} font-bold">${((a.avg_health || 0) * 100).toFixed(0)}%</span></td><td class="p-2 text-center">${(a.avg_latency || 0).toFixed(0)}ms</td><td class="p-2 text-center">${badge(a.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No PSP aggregators configured')}
    </div>`;
}

// ─── ADMIN: Global Jurisdiction Matrix ────────────────
async function renderJurisdictionMatrix() {
  setTitle('Global Jurisdiction Matrix', 'Visual editor with versioned changes — Admin Portal');
  const { data } = await api('/admin/jurisdiction-matrix');
  const jurisdictions = data.jurisdictions || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-globe', 'Jurisdictions', data.count, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-shield-alt', 'Sanctioned', jurisdictions.filter(j => j.sanctions_level === 'BLOCKED').length, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-exclamation-triangle', 'High Risk', jurisdictions.filter(j => j.sanctions_level === 'HIGH_RISK').length, 'bg-yellow-50 text-yellow-600')}
      ${statCard('fas fa-check-circle', 'Clear', jurisdictions.filter(j => j.sanctions_level === 'NONE' || j.sanctions_level === 'LOW').length, 'bg-green-50 text-green-600')}
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-globe mr-2 text-sgtx-500"></i>Jurisdiction Matrix (v${data.version})</h3>
      ${jurisdictions.length ? `<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Code</th><th class="p-2 text-left">Name</th><th class="p-2">Sanctions</th><th class="p-2">KYC Tier</th><th class="p-2">CBDC</th><th class="p-2">Compliance</th></tr></thead><tbody>${jurisdictions.map(j => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-mono font-bold">${j.code}</td><td class="p-2">${j.name}</td><td class="p-2 text-center">${badge(j.sanctions_level || 'NONE')}</td><td class="p-2 text-center">${j.kyc_tier_required || '—'}</td><td class="p-2 text-center">${j.cbdc_status || '—'}</td><td class="p-2 text-center">${j.compliance_checks?.length ? `<span class="text-xs text-green-600">${j.compliance_checks.length} checks</span>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No jurisdictions configured')}
    </div>`;
}

// ─── AI Assistant Panel (Cross-cutting all portals) ───
async function renderAIAssistant() {
  setTitle('AI Assistant', 'Conversational AI over trade data — Voice commands supported');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-robot mr-2 text-sgtx-500"></i>SGTX AI Assistant</h3>
      <p class="text-sm text-gray-500 mb-4">Type or speak commands. Examples: "Show my active shipments", "Track USTN SGTX-EG-...", "Create new trade", "File dispute"</p>
      <div class="flex gap-2">
        <input id="ai-input" class="flex-1 border rounded-lg px-4 py-2 text-sm" placeholder="Ask me anything about your trades..." onkeydown="if(event.key==='Enter')sendAIQuery()">
        <button onclick="startVoiceInput()" class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-microphone"></i></button>
        <button onclick="sendAIQuery()" class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
    <div id="ai-responses" class="space-y-3"></div>
    <div class="card p-5 mt-5">
      <h4 class="font-bold mb-3 text-gray-700"><i class="fas fa-lightbulb mr-2 text-yellow-500"></i>Suggested Commands</h4>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        ${['Show my active shipments', 'Track USTN', 'Create new trade', 'File dispute', 'Show commissions', 'Request financing', 'View contacts', 'Check packing plans', 'Scan barcode'].map(cmd => `
          <button onclick="document.getElementById('ai-input').value='${cmd}';sendAIQuery()" class="bg-gray-50 hover:bg-sgtx-50 border rounded-lg p-2 text-xs text-left transition">${cmd}</button>`).join('')}
      </div>
    </div>`;
}

async function sendAIQuery() {
  const input = document.getElementById('ai-input');
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  const container = document.getElementById('ai-responses');
  container.innerHTML = `<div class="bg-blue-50 p-3 rounded-lg text-sm"><i class="fas fa-user mr-2 text-blue-500"></i>${query}</div>` + container.innerHTML;
  const r = await apiPost('/ai-assistant', { query, portal: currentPortal, tenant_id: tenant?.id });
  const resp = r.data || {};
  container.innerHTML = `<div class="bg-sgtx-50 p-3 rounded-lg text-sm"><i class="fas fa-robot mr-2 text-sgtx-500"></i>${resp.message}</div>` + container.innerHTML;
  if (resp.type === 'navigate' && resp.target) { setTimeout(() => navigate(resp.target), 1000); }
  if (resp.type === 'action' && resp.target && window[resp.target]) { setTimeout(() => window[resp.target](), 1000); }
}

function startVoiceInput() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => { document.getElementById('ai-input').value = event.results[0][0].transcript; sendAIQuery(); };
    recognition.start();
  } else {
    alert('Voice recognition not supported in this browser. Use Chrome for voice commands.');
  }
}

// ─── Distressed Cargo Country Factors (Phase 7.8) ─────
async function renderDistressedFactors() {
  setTitle('Distressed Cargo Factors', 'Dynamic country-specific disposal costs — Phase 7.8');
  const { data } = await api('/distressed-factors');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-orange-500"></i>Country Distressed Factors</h3>
      <p class="text-sm text-gray-500 mb-4">Commission floor: 0.05%. Factor = 1 - estimated_local_cost_pct. Applied to distressed portion of trade.</p>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Country</th><th class="p-2">Code</th><th class="p-2">Factor</th><th class="p-2">Cost Explanation</th><th class="p-2">Sanctions</th></tr></thead><tbody>${(data || []).map(d => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${d.name}</td><td class="p-2 text-center font-mono">${d.code}</td><td class="p-2 text-center font-bold ${d.distressed_country_factor < 0.9 ? 'text-orange-600' : 'text-green-600'}">${d.distressed_country_factor}</td><td class="p-2 text-xs">${d.cost_explanation}</td><td class="p-2 text-center">${badge(d.sanctions_level || 'NONE')}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — IMPORTER PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderInboundShipments() {
  setTitle('Inbound Shipments', 'Map, Timeline & Document Status — Phases 5,6,7');
  const { data } = await api('/importer/inbound-shipments');
  const ships = data.shipments || [];
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-ship', 'Active Inbound', ships.length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-map-pin', 'On Time', ships.filter(s => s.pin_color === 'green').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-exclamation-triangle', 'Delayed', ships.filter(s => s.is_delayed).length, 'bg-red-50 text-red-600')}
      ${statCard('fas fa-file-alt', 'Docs Pending', ships.filter(s => s.status === 'CUSTOMS_IMPORT').length, 'bg-amber-50 text-amber-600')}
    </div>
    <div class="flex gap-2 mb-4">
      <button class="px-4 py-2 bg-sgtx-500 text-white rounded-lg text-sm"><i class="fas fa-map mr-1"></i>Map View</button>
      <button class="px-4 py-2 bg-gray-200 rounded-lg text-sm"><i class="fas fa-stream mr-1"></i>Timeline View</button>
      <button class="px-4 py-2 bg-gray-200 rounded-lg text-sm"><i class="fas fa-file-alt mr-1"></i>Document Status</button>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-map-marked-alt mr-2 text-sgtx-500"></i>World Map — Active Inbound Vessels</h3>
      <div class="bg-blue-50 rounded-lg p-6 text-center text-sm text-gray-600">
        <i class="fas fa-globe-americas text-4xl text-blue-300 mb-3"></i>
        <p>Interactive Leaflet map showing ${ships.length} vessel positions</p>
        <div class="flex justify-center gap-4 mt-3 text-xs">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-green-500 rounded-full"></span> On Time</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-yellow-500 rounded-full"></span> Delayed &lt;24h</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-500 rounded-full"></span> Delayed &gt;24h</span>
        </div>
      </div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-table mr-2 text-sgtx-500"></i>Shipment Details</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="p-2 text-left">USTN</th><th class="p-2">Vessel</th><th class="p-2">Origin</th><th class="p-2">Destination</th>
        <th class="p-2">ETA</th><th class="p-2">Status</th><th class="p-2">Days</th><th class="p-2">Actions</th>
      </tr></thead><tbody>${ships.map(s => `
        <tr class="border-t hover:bg-gray-50">
          <td class="p-2 font-mono text-xs text-sgtx-600">${s.ustn || '—'}</td>
          <td class="p-2">${s.vessel_name || '—'}</td>
          <td class="p-2">${s.origin_port || '—'}</td>
          <td class="p-2">${s.destination_port || '—'}</td>
          <td class="p-2">${s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</td>
          <td class="p-2">${badge(s.status)}</td>
          <td class="p-2 text-center"><span class="font-bold ${s.pin_color === 'red' ? 'text-red-600' : s.pin_color === 'amber' ? 'text-yellow-600' : 'text-green-600'}">${s.days_to_eta || '—'}d</span></td>
          <td class="p-2"><button class="text-sgtx-500 text-xs hover:underline" onclick="navigate('digitaltwin')">Track</button> <button class="text-sgtx-500 text-xs hover:underline ml-2" onclick="navigate('customsreadiness')">Docs</button></td>
        </tr>`).join('')}</tbody></table></div>
    </div>`;
}

async function renderCustomsReadiness() {
  setTitle('Customs Readiness', 'Pre-arrival document checklist per shipment — Phase 5.3');
  const { data } = await api('/importer/customs-readiness');
  document.getElementById('content').innerHTML = `
    <div class="space-y-4">${(data || []).map(s => `
      <div class="card p-5">
        <div class="flex justify-between items-center mb-3">
          <div><span class="font-bold text-sgtx-600">${s.ustn || '—'}</span> <span class="text-sm text-gray-500">— ${s.vessel_name || 'Unknown Vessel'}</span></div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${s.traffic_light === 'green' ? 'bg-green-500' : s.traffic_light === 'red' ? 'bg-red-500' : 'bg-yellow-500'}"></span>
            <span class="text-sm">${s.verified_count}/${s.total_required} verified</span>
            <span class="text-xs text-gray-400">ETA: ${s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</span>
          </div>
        </div>
        <table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Document</th><th class="p-2">Responsible</th><th class="p-2">Status</th><th class="p-2">Action</th></tr></thead>
        <tbody>${s.documents.map(d => `
          <tr class="border-t"><td class="p-2 ${d.critical ? 'font-bold' : ''}">${d.critical ? '<i class="fas fa-exclamation-circle text-red-500 mr-1"></i>' : ''}${d.name}</td>
          <td class="p-2 text-xs">${d.responsible}</td>
          <td class="p-2"><span class="${d.status === 'VERIFIED' || d.status === 'ISSUED' ? 'text-green-600' : d.status === 'MISSING' ? 'text-red-600' : d.status === 'PENDING' ? 'text-yellow-600' : 'text-gray-400'} font-medium text-xs">${d.status}</span></td>
          <td class="p-2">${d.status === 'PENDING' ? '<button class="text-xs bg-sgtx-500 text-white px-2 py-1 rounded">Request</button>' : d.status === 'MISSING' ? '<button class="text-xs bg-orange-500 text-white px-2 py-1 rounded">Upload</button>' : d.status === 'VERIFIED' || d.status === 'ISSUED' ? '<button class="text-xs text-sgtx-500 hover:underline">View</button>' : '—'}</td></tr>`).join('')}
        </tbody></table>
      </div>`).join('')}
    </div>`;
}

async function renderQuoteReview() {
  setTitle('Quote Review & Negotiation', 'Compare quotes, landed cost, AI negotiation — Phase 3');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-columns mr-2 text-sgtx-500"></i>Panel A — Compare Quotes Side-by-Side</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr>
        <th class="p-2 text-left">Exporter</th><th class="p-2">Total (CFR)</th><th class="p-2">EXW</th><th class="p-2">Logistics</th><th class="p-2">Incoterm</th><th class="p-2">Trust Score</th><th class="p-2">Commission</th><th class="p-2">Action</th>
      </tr></thead><tbody>
        <tr class="border-t bg-green-50"><td class="p-2 font-medium">Mekong Fresh</td><td class="p-2 font-bold">$48,660</td><td class="p-2">$38,310</td><td class="p-2">$10,350</td><td class="p-2">CFR</td><td class="p-2"><span class="text-green-600 font-bold">88</span></td><td class="p-2 text-xs">55/45</td><td class="p-2"><button class="bg-sgtx-500 text-white px-3 py-1 rounded text-xs">Select</button></td></tr>
        <tr class="border-t"><td class="p-2 font-medium">Exporter Y</td><td class="p-2">$49,200</td><td class="p-2">$39,000</td><td class="p-2">$10,200</td><td class="p-2">CFR</td><td class="p-2"><span class="text-yellow-600 font-bold">82</span></td><td class="p-2 text-xs">60/40</td><td class="p-2"><button class="bg-gray-300 px-3 py-1 rounded text-xs">Select</button></td></tr>
        <tr class="border-t"><td class="p-2 font-medium">Exporter Z</td><td class="p-2">$47,800</td><td class="p-2">$37,500</td><td class="p-2">$10,300</td><td class="p-2">CFR</td><td class="p-2"><span class="text-orange-600 font-bold">75</span></td><td class="p-2 text-xs">50/50</td><td class="p-2"><button class="bg-gray-300 px-3 py-1 rounded text-xs">Select</button></td></tr>
      </tbody></table></div>
      <div class="mt-3 p-3 bg-blue-50 rounded-lg text-sm"><i class="fas fa-robot mr-2 text-blue-600"></i><b>AI Summary:</b> Mekong Fresh offers the best balance of price and trust score. Exporter Z is cheapest but has lower trust and later delivery.</div>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-calculator mr-2 text-sgtx-500"></i>Panel B — Landed Cost Breakdown</h3>
      <div class="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1">
        <div class="flex justify-between"><span>EXW value (oranges + lemons)</span><span>$38,310</span></div>
        <div class="flex justify-between"><span>Ocean freight (3 x 40' HC Reefer)</span><span>$8,400</span></div>
        <div class="flex justify-between"><span>Trucking (port to warehouse)</span><span>$900</span></div>
        <div class="flex justify-between"><span>Customs clearance (import)</span><span>$600</span></div>
        <div class="flex justify-between"><span>Insurance</span><span>$450</span></div>
        <div class="border-t my-2"></div>
        <div class="flex justify-between font-bold"><span>CIF value</span><span>$48,660</span></div>
        <div class="flex justify-between text-red-600"><span>Import duty (15% of CIF)</span><span>$7,299</span></div>
        <div class="flex justify-between text-red-600"><span>VAT (14% of CIF + duty)</span><span>$7,834</span></div>
        <div class="border-t my-2"></div>
        <div class="flex justify-between font-bold text-lg"><span>Total landed cost</span><span>$63,793</span></div>
        <div class="flex justify-between text-sgtx-600"><span>SGTX commission (1.03%)</span><span>$501</span></div>
        <div class="border-t my-2 border-sgtx-300"></div>
        <div class="flex justify-between font-bold text-xl text-sgtx-700"><span>GRAND TOTAL</span><span>$64,294</span></div>
      </div>
      <div class="mt-3 p-3 bg-yellow-50 rounded-lg text-sm"><i class="fas fa-info-circle mr-2 text-yellow-600"></i>Duties for HS 0805.10 into Egypt are currently 15% ad valorem. Consult your customs broker for exact calculation.</div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-comments mr-2 text-sgtx-500"></i>Panel C — Negotiation Assistant</h3>
      <div class="p-4 bg-sgtx-50 rounded-lg text-sm mb-3">The exporter's EXW price of $1.52/kg is 3% above the market average of $1.48/kg. A counter-offer of $1.46/kg has a 68% probability of acceptance. You could also ask for a 5% discount on trucking.</div>
      <div class="flex gap-3">
        <button class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-robot mr-1"></i>Apply to Bot</button>
        <button class="bg-gray-200 px-4 py-2 rounded-lg text-sm"><i class="fas fa-pen mr-1"></i>Send Manual Counter</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — EXPORTER PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderEXWPriceLock() {
  setTitle('EXW Price Lock', 'AI-recommended price range + live market chart — Phase 2.1');
  const { data } = await api('/exporter/exw-market-data');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-tag', 'Market Price', '$' + (data.current_market_price || 0).toFixed(2) + '/kg', 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-chart-line', 'AI Range Low', '$' + (data.ai_recommended_range?.min || 0).toFixed(2), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-chart-line', 'AI Range High', '$' + (data.ai_recommended_range?.max || 0).toFixed(2), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-clock', '30-Day History', (data.price_history || []).length + ' points', 'bg-purple-50 text-purple-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-chart-line mr-2 text-sgtx-500"></i>Live Market Chart (30 Days) — ${data.commodity || 'Commodity'}</h3>
      <div class="bg-gray-50 rounded-lg p-4 h-48 flex items-center justify-center text-gray-500">
        <div class="text-center"><i class="fas fa-chart-area text-4xl mb-2 text-sgtx-300"></i><p class="text-sm">Chart.js line chart: ${(data.price_history || []).length} data points</p>
        <p class="text-xs mt-1">Green band: AI recommended range. Live input line tracks your EXW price.</p></div>
      </div>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-lock mr-2 text-sgtx-500"></i>Lock EXW Price</h3>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div><label class="block text-sm font-medium mb-1">EXW Price ($/kg)</label><input type="number" class="w-full border rounded px-3 py-2" value="1.50" step="0.01"></div>
        <div><label class="block text-sm font-medium mb-1">Commodity</label><input type="text" class="w-full border rounded px-3 py-2" value="Valencia Oranges" disabled></div>
        <div><label class="block text-sm font-medium mb-1">HS Code</label><input type="text" class="w-full border rounded px-3 py-2" value="0805.10" disabled></div>
      </div>
      <div class="p-3 bg-green-50 rounded-lg text-sm mb-3"><i class="fas fa-check-circle text-green-500 mr-2"></i>Price is within AI-recommended range. No warning.</div>
      <button class="bg-sgtx-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-sgtx-600"><i class="fas fa-lock mr-2"></i>Lock EXW Price</button>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-bell mr-2 text-orange-500"></i>Post-Lock Price Watch</h3>
      <p class="text-sm text-gray-600 mb-2">After locking, a background watch triggers if the market moves ±10% from your locked price.</p>
      <div class="p-3 bg-orange-50 rounded-lg text-sm"><i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>Market update: FAO index +12.4% since lock. Your $1.50/kg is now below market at $1.69/kg. <button class="ml-2 bg-orange-500 text-white px-3 py-1 rounded text-xs">Re-open Pricing</button></div>
    </div>`;
}

async function renderCashPosition() {
  setTitle('Cash Position', '90-Day Rolling Cash Forecast — Exporter Portal');
  const { data } = await api('/exporter/cash-position');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-arrow-down', 'Total Inflows', usd(data.total_inflows), 'bg-green-50 text-green-600')}
      ${statCard('fas fa-arrow-up', 'Total Outflows', usd(data.total_outflows), 'bg-red-50 text-red-600')}
      ${statCard('fas fa-balance-scale', 'Net Position', usd(data.net_position), data.net_position >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}
      ${statCard('fas fa-calendar', 'Forecast Period', '90 days', 'bg-blue-50 text-blue-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-robot mr-2 text-sgtx-500"></i>AI Cash Summary (Groq, A1)</h3>
      <div class="p-4 ${data.has_gap ? 'bg-red-50' : 'bg-green-50'} rounded-lg text-sm">${data.ai_summary}</div>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-chart-bar mr-2 text-sgtx-500"></i>90-Day Cash Flow Timeline</h3>
      <div class="bg-gray-50 rounded-lg p-4 h-48 flex items-center justify-center"><div class="text-center text-gray-500"><i class="fas fa-chart-bar text-4xl mb-2 text-sgtx-300"></i><p class="text-sm">${(data.events || []).length} cash events over 90 days</p><p class="text-xs">Green bars = inflows, Red bars = outflows</p></div></div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-list mr-2 text-sgtx-500"></i>Cash Event Ledger</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2">Date</th><th class="p-2">Description</th><th class="p-2">Type</th><th class="p-2">Amount</th><th class="p-2">Status</th></tr></thead>
      <tbody>${(data.events || []).slice(0, 15).map(e => `
        <tr class="border-t"><td class="p-2 text-xs">${e.date}</td><td class="p-2">${e.description}</td>
        <td class="p-2"><span class="${e.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'} font-bold text-xs">${e.type}</span></td>
        <td class="p-2 font-bold ${e.type === 'INFLOW' ? 'text-green-600' : 'text-red-600'}">${usd(e.amount)}</td>
        <td class="p-2">${badge(e.status)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

async function renderLogisticsBuilder() {
  setTitle('Logistics Builder', 'AI Bundle Optimiser + Re-Optimise Diff View — Phase 2.3');
  const { data } = await api('/exporter/logistics-reoptimise', {method:'POST',body:'{}'});
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold"><i class="fas fa-cubes mr-2 text-sgtx-500"></i>Logistics Bundle Re-Optimise — Diff View</h3>
        <button class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-sync mr-1"></i>Re-Optimise Now</button>
      </div>
      <div class="grid grid-cols-2 gap-6">
        <div class="border rounded-lg p-4">
          <h4 class="font-bold text-sm mb-3 text-gray-600">Previous Recommendation</h4>
          ${(data?.previous_bundle?.providers || []).map(p => `
            <div class="flex justify-between items-center p-2 border-b text-sm">
              <div><span class="font-medium">${p.name}</span> <span class="text-xs text-gray-400">(${p.role})</span></div>
              <div class="flex gap-3"><span>$${p.cost}</span><span class="${p.risk_score < 50 ? 'text-red-600' : p.risk_score < 80 ? 'text-yellow-600' : 'text-green-600'} font-bold">Risk: ${p.risk_score}</span></div>
            </div>`).join('')}
          <div class="mt-3 text-sm"><b>Total:</b> $${data?.previous_bundle?.total_cost} | <b>On-time:</b> ${data?.previous_bundle?.on_time_probability}%</div>
        </div>
        <div class="border-2 border-sgtx-300 rounded-lg p-4 bg-sgtx-50">
          <h4 class="font-bold text-sm mb-3 text-sgtx-600">New Recommendation</h4>
          ${(data?.recommended_bundle?.providers || []).map(p => `
            <div class="flex justify-between items-center p-2 border-b text-sm">
              <div><span class="font-medium">${p.name}</span> <span class="text-xs text-gray-400">(${p.role})</span></div>
              <div class="flex gap-3"><span>$${p.cost}</span><span class="${p.risk_score < 50 ? 'text-red-600' : p.risk_score < 80 ? 'text-yellow-600' : 'text-green-600'} font-bold">Risk: ${p.risk_score}</span></div>
            </div>`).join('')}
          <div class="mt-3 text-sm"><b>Total:</b> $${data?.recommended_bundle?.total_cost} | <b>On-time:</b> ${data?.recommended_bundle?.on_time_probability}%</div>
        </div>
      </div>
      <div class="flex justify-between mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <span>Cost delta: <b class="${data?.cost_delta < 0 ? 'text-green-600' : 'text-red-600'}">$${data?.cost_delta}</b></span>
        <span>On-time delta: <b>${data?.on_time_delta > 0 ? '+' : ''}${data?.on_time_delta}%</b></span>
      </div>
      <div class="flex gap-3 mt-4">
        <button class="bg-sgtx-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Switch to New Bundle</button>
        <button class="bg-gray-200 px-6 py-2 rounded-lg text-sm">Keep Current</button>
      </div>
    </div>`;
}

async function renderQuoteSubmission() {
  setTitle('Quote Submission', 'Assemble total delivered price — Phase 2.5');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-4"><i class="fas fa-paper-plane mr-2 text-sgtx-500"></i>Assemble & Submit Final Quote</h3>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="block text-sm font-medium mb-1">EXW Total (USD)</label><input type="number" class="w-full border rounded px-3 py-2" value="38310"></div>
        <div><label class="block text-sm font-medium mb-1">Logistics Total (USD)</label><input type="number" class="w-full border rounded px-3 py-2" value="9790"></div>
        <div><label class="block text-sm font-medium mb-1">Insurance (USD)</label><input type="number" class="w-full border rounded px-3 py-2" value="450"></div>
        <div><label class="block text-sm font-medium mb-1">Incoterm</label><select class="w-full border rounded px-3 py-2"><option>CFR</option><option>CIF</option><option>FOB</option><option>EXW</option></select></div>
      </div>
      <div class="bg-sgtx-50 rounded-lg p-4 mb-4 font-mono text-sm space-y-1">
        <div class="flex justify-between"><span>EXW Total</span><span>$38,310.00</span></div>
        <div class="flex justify-between"><span>Logistics</span><span>$9,790.00</span></div>
        <div class="flex justify-between"><span>Insurance</span><span>$450.00</span></div>
        <div class="border-t my-2"></div>
        <div class="flex justify-between font-bold text-lg"><span>Total Delivered Price (CFR)</span><span>$48,550.00</span></div>
        <div class="flex justify-between text-sgtx-600"><span>Commission Preview (1.03%)</span><span>$500.07</span></div>
      </div>
      <button class="bg-sgtx-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-sgtx-600"><i class="fas fa-paper-plane mr-2"></i>Submit Quote to Importer</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — LOGISTICS PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderDispatchPlanner() {
  setTitle('Dispatch Planner', 'OR-Tools VRP optimised daily routes — Trucking Portal');
  const { data } = await api('/logistics/dispatch-planner');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      ${statCard('fas fa-truck', 'Pending Pickups', (data.pending_pickups || []).length, 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-id-card', 'Available Drivers', (data.drivers || []).filter(d => d.status === 'AVAILABLE').length, 'bg-green-50 text-green-600')}
      ${statCard('fas fa-route', 'Optimised Routes', (data.optimised_routes || []).length, 'bg-purple-50 text-purple-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-map-marked-alt mr-2 text-sgtx-500"></i>Pending Pickups</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2">Container</th><th class="p-2">Location</th><th class="p-2">Weight</th><th class="p-2">Window</th><th class="p-2">Driver</th></tr></thead>
      <tbody>${(data.pending_pickups || []).map(p => `<tr class="border-t"><td class="p-2 font-mono">${p.container}</td><td class="p-2">${p.port}</td><td class="p-2">${p.weight_kg} kg</td><td class="p-2">${p.window}</td><td class="p-2">${p.assigned_driver || '<span class="text-red-500">Unassigned</span>'}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-route mr-2 text-sgtx-500"></i>Optimised Routes (OR-Tools VRP)</h3>
      ${(data.optimised_routes || []).map(r => `
        <div class="p-3 bg-green-50 rounded-lg mb-2 flex justify-between items-center">
          <div><b>${r.driver}</b>: ${r.stops.join(' → ')}</div>
          <div class="text-sm">${r.distance_km} km | ${r.estimated_time_min} min | Empty miles: ${r.empty_miles} km</div>
        </div>`).join('')}
    </div>`;
}

async function renderShippingLineIntegration() {
  setTitle('Shipping Line Integration', 'API / Email / Manual channel status — Shipping Line Portal');
  const { data } = await api('/logistics/shipping-line-status');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-plug mr-2 text-sgtx-500"></i>Integration Channel Status</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Shipping Line</th><th class="p-2">Channel</th><th class="p-2">Status</th><th class="p-2">Latency</th><th class="p-2">Bookings</th><th class="p-2">Last Check</th></tr></thead>
      <tbody>${(data.integrations || []).map(i => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${i.name}</td>
        <td class="p-2"><span class="bg-gray-100 px-2 py-0.5 rounded text-xs">${i.channel}</span></td>
        <td class="p-2">${badge(i.status)}</td>
        <td class="p-2">${i.latency_ms ? i.latency_ms + 'ms' : '—'}</td>
        <td class="p-2 text-center font-bold">${i.bookings_processed}</td>
        <td class="p-2 text-xs">${time(i.last_check)}</td></tr>`).join('')}</tbody></table></div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3">Channel Selection Logic (Per Request)</h3>
      <div class="space-y-2 text-sm">
        <div class="p-3 bg-green-50 rounded-lg"><b>1. API</b> — Preferred. Auto-submit booking, receive instant confirmation. Health-checked every 5 min.</div>
        <div class="p-3 bg-yellow-50 rounded-lg"><b>2. Email</b> — Fallback. Structured email sent, HF Donut extracts PDF response. Auto-confirm if confidence ≥80%.</div>
        <div class="p-3 bg-red-50 rounded-lg"><b>3. Manual Portal</b> — Last resort. Human operator enters booking confirmation manually.</div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — QC PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderQCSchedule() {
  setTitle('My Schedule Calendar', 'Inspection job calendar — QC Portal');
  const { data } = await api('/qc/schedule');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-calendar-alt mr-2 text-sgtx-500"></i>Upcoming Inspections</h3>
      <div class="space-y-3">${(data || []).map(e => `
        <div class="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
          <div><span class="font-bold">${e.date}</span> — ${e.type === 're-inspection' ? '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Re-Inspection</span>' : '<span class="bg-sgtx-100 text-sgtx-700 px-2 py-0.5 rounded text-xs">Inspection</span>'} <span class="text-sm text-gray-600 ml-2">${e.product}</span></div>
          <div class="text-sm text-gray-500"><i class="fas fa-map-marker-alt mr-1"></i>${e.location}</div>
        </div>`).join('')}</div>
    </div>`;
}

async function renderQCReports() {
  setTitle('Report Generation', 'AI-drafted inspection reports with digital signing — QC Portal');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-file-medical-alt mr-2 text-sgtx-500"></i>AI Report Generator</h3>
      <p class="text-sm text-gray-600 mb-4">After inspection completion, Groq (A1) auto-generates a draft report from collected data (defects, photos, measurements).</p>
      <div class="bg-gray-50 rounded-lg p-4 text-sm font-mono mb-4">
        <div class="font-bold mb-2">DRAFT INSPECTION REPORT</div>
        <div>USTN: SGTX-EG-20260615-ABC-V1 | Date: 14 Jun 2026</div>
        <div>Container: MAEU8901234 | Seal: SGTX-SEAL-001 (Intact)</div>
        <div class="mt-2">Sampling: 5/22 pallets inspected (random). 2 high-priority (AI-recommended).</div>
        <div class="mt-2 text-red-600">Defects: Pallet OR-019 — mould on 4 cartons (exceeds 0% limit). Severity: MEDIUM.</div>
        <div class="mt-2 font-bold">Verdict: FAIL</div>
        <div>Recommendation: Replace affected cartons before loading.</div>
      </div>
      <div class="flex gap-3">
        <button class="bg-sgtx-500 text-white px-4 py-2 rounded-lg text-sm"><i class="fas fa-signature mr-1"></i>Sign & Submit Report</button>
        <button class="bg-gray-200 px-4 py-2 rounded-lg text-sm"><i class="fas fa-edit mr-1"></i>Edit Draft</button>
      </div>
    </div>`;
}

async function renderQCPerformance() {
  setTitle('Performance Dashboard', 'Turnaround, accuracy, benchmarks — QC Portal');
  const { data } = await api('/qc/performance');
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statCard('fas fa-clock', 'Avg Turnaround', data.avg_turnaround_days + ' days', 'bg-blue-50 text-blue-600')}
      ${statCard('fas fa-bullseye', 'Detection Accuracy', data.defect_detection_accuracy + '%', 'bg-green-50 text-green-600')}
      ${statCard('fas fa-clipboard-check', 'Inspections Done', data.inspections_completed, 'bg-purple-50 text-purple-600')}
      ${statCard('fas fa-exclamation-triangle', 'Dispute Rate', data.dispute_rate + '%', 'bg-yellow-50 text-yellow-600')}
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-robot mr-2 text-sgtx-500"></i>AI Performance Summary</h3>
      <div class="p-4 bg-green-50 rounded-lg text-sm">${data.ai_summary}</div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3">Benchmarks (Anonymised, OpenDP)</h3>
      <div class="space-y-3">
        <div class="flex justify-between p-3 bg-gray-50 rounded"><span>Peer Avg Turnaround</span><span class="font-bold">${data.benchmarks?.peer_turnaround} days</span></div>
        <div class="flex justify-between p-3 bg-gray-50 rounded"><span>Peer Dispute Rate</span><span class="font-bold">${data.benchmarks?.peer_dispute_rate}%</span></div>
        <div class="flex justify-between p-3 bg-gray-50 rounded"><span>Peer Detection Accuracy</span><span class="font-bold">${data.benchmarks?.peer_accuracy}%</span></div>
      </div>
    </div>`;
}

async function renderQCSettings() {
  setTitle('Serviceable Commodities & Regions', 'QC provider profile settings');
  const { data } = await api('/qc/settings');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-leaf mr-2 text-green-500"></i>Serviceable Commodities</h3>
      <div class="space-y-2">${(data.serviceable_commodities || []).map(c => `<div class="p-3 bg-gray-50 rounded flex justify-between"><span>${c.description}</span><span class="font-mono text-xs text-gray-500">HS ${c.hs_range}</span></div>`).join('')}</div>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-globe mr-2 text-blue-500"></i>Serviceable Regions</h3>
      <div class="flex gap-2 flex-wrap">${(data.serviceable_regions || []).map(r => `<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">${r}</span>`).join('')}</div>
    </div>
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-microscope mr-2 text-purple-500"></i>Inspection Methods</h3>
      <div class="flex gap-2 flex-wrap">${(data.inspection_methods || []).map(m => `<span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">${m.replace(/_/g, ' ')}</span>`).join('')}</div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-certificate mr-2 text-yellow-500"></i>Certifications</h3>
      <div class="flex gap-2 flex-wrap">${(data.certifications || []).map(c => `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">${c}</span>`).join('')}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — FINANCIER PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderFinancierDetails() {
  setTitle('Request Details & Risk Analysis', 'Credit intelligence + AI recommended LTV — Financier Portal');
  const { data } = await api('/financier/request-details');
  const ci = data.credit_intelligence || {};
  document.getElementById('content').innerHTML = `
    <div class="grid grid-cols-3 gap-6">
      <div class="card p-5">
        <h3 class="font-bold mb-3">Request Summary</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span>USTN:</span><span class="font-mono text-sgtx-600">${data.request?.ustn}</span></div>
          <div class="flex justify-between"><span>Amount:</span><span class="font-bold">${usd(data.request?.amount)}</span></div>
          <div class="flex justify-between"><span>Tenor:</span><span>${data.request?.tenor_days} days</span></div>
          <div class="flex justify-between"><span>Type:</span><span>${data.request?.financing_type}</span></div>
          <div class="flex justify-between"><span>Collateral:</span><span>${data.request?.collateral_type}</span></div>
        </div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3">AI Credit Intelligence (A2)</h3>
        <div class="text-center mb-3"><span class="text-4xl font-bold text-sgtx-600">${ci.credit_score}</span><span class="text-sm text-gray-500">/100</span></div>
        <div class="space-y-1 text-xs">${Object.entries(ci.breakdown || {}).map(([k,v]) => `<div class="flex justify-between"><span>${k.replace(/_/g, ' ')}</span><span class="font-bold">${v}</span></div>`).join('')}</div>
        <div class="mt-3 p-2 bg-yellow-50 rounded text-xs">Default Prob: <b>${ci.default_probability}%</b> (Monte Carlo ${ci.monte_carlo_iterations?.toLocaleString()} iterations)</div>
        <div class="mt-2 p-2 bg-green-50 rounded text-xs">Recommended LTV: <b>${ci.recommended_ltv}%</b> (max ${usd(ci.max_financing)})</div>
      </div>
      <div class="card p-5">
        <h3 class="font-bold mb-3">Submit Bid</h3>
        <div class="space-y-3">
          <div><label class="block text-xs font-medium mb-1">APR (%)</label><input type="number" class="w-full border rounded px-3 py-2 text-sm" value="5.2" step="0.1"></div>
          <div><label class="block text-xs font-medium mb-1">Collateral Req.</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" value="Goods"></div>
          <div><label class="block text-xs font-medium mb-1">Conditions</label><textarea class="w-full border rounded px-3 py-2 text-sm" rows="2"></textarea></div>
          <button class="w-full bg-sgtx-500 text-white py-2 rounded-lg text-sm font-medium"><i class="fas fa-lock mr-1"></i>Submit Encrypted Bid</button>
        </div>
        <div class="mt-3 text-center"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Match Score: ${data.match_score}</span></div>
      </div>
    </div>
    <div class="card p-5 mt-5">
      <div class="p-4 bg-blue-50 rounded-lg text-sm">${ci.ai_explanation || 'AI analysis pending...'}</div>
    </div>`;
}

async function renderBidSubmission() {
  setTitle('Encrypted Blind Bidding', 'Submit encrypted bids — Financier Portal');
  document.getElementById('content').innerHTML = `<div class="card p-5"><h3 class="font-bold mb-3"><i class="fas fa-lock mr-2 text-sgtx-500"></i>Encrypted Blind Bidding</h3><p class="text-sm text-gray-600">Bids are encrypted with the borrower's public key. Even SGTX cannot read the bid. Stored in NATS JetStream KV with 48h TTL.</p><div class="mt-4 p-4 bg-sgtx-50 rounded-lg text-sm"><i class="fas fa-shield-alt mr-2 text-sgtx-600"></i>Select a financing request from "Open Requests" to submit an encrypted bid.</div></div>`;
}

async function renderDeFiComparison() {
  setTitle('DeFi Protocol Comparison', 'Available protocols + stablecoin health — Financier Portal');
  const { data } = await api('/financier/defi-comparison');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-exchange-alt mr-2 text-sgtx-500"></i>Available DeFi Protocols</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Protocol</th><th class="p-2">Chain</th><th class="p-2">Risk</th><th class="p-2">TVL</th><th class="p-2">Audit</th><th class="p-2">APY</th><th class="p-2">Gas</th></tr></thead>
      <tbody>${(data.protocols || []).map(p => `<tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${p.name}</td><td class="p-2">${p.chain}</td><td class="p-2 font-bold ${p.risk_score >= 90 ? 'text-green-600' : 'text-yellow-600'}">${p.risk_score}</td><td class="p-2">${p.tvl}</td><td class="p-2 text-xs">${p.audit_status}</td><td class="p-2 font-bold">${p.apy}%</td><td class="p-2">$${p.gas_cost}</td></tr>`).join('')}</tbody></table></div>
      <div class="mt-3 p-3 bg-blue-50 rounded-lg text-sm"><i class="fas fa-robot mr-2"></i>${data.ai_recommendation}</div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-coins mr-2 text-sgtx-500"></i>Stablecoin Health Monitor</h3>
      <div class="grid grid-cols-3 gap-4">${Object.entries(data.stablecoin_health || {}).map(([k,v]) => `
        <div class="p-4 border rounded-lg text-center"><div class="font-bold text-lg">${k}</div><div class="text-2xl font-bold ${v.status === 'HEALTHY' ? 'text-green-600' : 'text-red-600'}">$${v.price}</div><div class="text-xs">${badge(v.status)}</div></div>`).join('')}</div>
    </div>`;
}

async function renderSecondaryMarket() {
  setTitle('Secondary Market', 'Tokenized asset listings (ERC-3525) — Financier Portal');
  const { data } = await api('/financier/secondary-market');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-store mr-2 text-sgtx-500"></i>Active Listings</h3>
      <div class="space-y-3">${(data.listings || []).map(l => `
        <div class="p-4 border rounded-lg"><div class="flex justify-between"><span class="font-bold">${l.token_type}</span><span>${badge(l.status)}</span></div>
        <div class="grid grid-cols-4 gap-3 mt-3 text-sm">
          <div><span class="text-gray-500">Principal:</span> <b>${usd(l.remaining_principal)}</b></div>
          <div><span class="text-gray-500">AI Price:</span> <b>${usd(l.ai_suggested_price)}</b></div>
          <div><span class="text-gray-500">Asking:</span> <b>${usd(l.asking_price)}</b></div>
          <div><span class="text-gray-500">Maturity:</span> <b>${l.time_to_maturity_days}d</b></div>
        </div>
        <div class="text-xs mt-2 text-gray-500">${l.commodity} — ${l.trade_progress}</div></div>`).join('')}</div>
      <div class="mt-3 text-xs text-gray-400">Commission: ${(data.commission_rate * 100).toFixed(1)}% per transaction</div>
    </div>`;
}

async function renderMarginCalls() {
  setTitle('Margin Calls', 'LTV monitoring and margin call alerts — Financier Portal');
  const { data } = await api('/financier/margin-calls');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>Active Margin Calls</h3>
      ${(data || []).length === 0 ? emptyState('No active margin calls') : (data || []).map(m => `
        <div class="p-4 border-2 border-red-300 rounded-lg bg-red-50 mb-3">
          <div class="font-bold text-red-700 mb-2">LTV ${m.ltv_at_call}% exceeds threshold ${m.threshold_ltv}%</div>
          <div class="text-sm">${m.ai_explanation}</div>
          <div class="flex justify-between mt-3 text-sm">
            <span>Required: <b class="text-red-600">${usd(m.required_amount_usd)}</b></span>
            <span>Deadline: <b>${time(m.deadline)}</b></span>
            <span>Action: <b>${m.required_action}</b></span>
          </div>
        </div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — GOVERNMENT PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderGovTradeMonitor() {
  setTitle('Live Trade Monitor', 'Dynamic trade monitoring with integration status — Government Portal');
  const { data } = await api('/government/trade-monitor');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-eye mr-2 text-sgtx-500"></i>Live Trade Monitor</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">USTN</th><th class="p-2">Origin</th><th class="p-2">ETA</th><th class="p-2">Risk</th><th class="p-2">Docs</th><th class="p-2">Declaration</th><th class="p-2">Integration</th><th class="p-2">Action</th></tr></thead>
      <tbody>${(data || []).map(t => `
        <tr class="border-t hover:bg-gray-50 ${t.is_anonymous ? 'bg-purple-50' : ''}"><td class="p-2 font-mono text-xs">${t.is_anonymous ? '🔒 ' : ''}${(t.ustn || '').slice(0,20)}...</td>
        <td class="p-2">${t.origin_port || '—'}</td><td class="p-2">${t.eta ? new Date(t.eta).toLocaleDateString() : '—'}</td>
        <td class="p-2"><span class="${t.risk_score < 30 ? 'text-green-600' : t.risk_score < 70 ? 'text-yellow-600' : 'text-red-600'} font-bold">${t.risk_score}</span></td>
        <td class="p-2">${t.docs_status}</td><td class="p-2 text-xs">${t.declaration_status}</td><td class="p-2 text-xs">${t.integration}</td>
        <td class="p-2">${t.risk_score < 30 ? '<button class="bg-green-500 text-white px-2 py-1 rounded text-xs">Clear</button>' : '<button class="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Hold</button>'}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

async function renderGovClearance() {
  setTitle('Clearance Recommendations', 'AI-powered clearance decisions — Government Portal');
  const { data } = await api('/government/clearance-recommendation');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-check-double mr-2 text-sgtx-500"></i>Clearance Recommendation</h3>
      <div class="p-4 ${data.auto_clearance_eligible ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg mb-4">
        <div class="text-lg font-bold ${data.auto_clearance_eligible ? 'text-green-700' : 'text-yellow-700'}">${data.recommended_action}</div>
        <div class="text-sm mt-2">Risk Score: <b>${data.risk_score}</b> | Documents: ${data.documents_verified}/${data.documents_total} verified</div>
        ${data.declaration_status ? `<div class="text-sm mt-1">Declaration: ${data.declaration_status}</div>` : ''}
      </div>
      <div class="flex gap-3">
        <button class="bg-green-500 text-white px-6 py-2 rounded-lg font-medium"><i class="fas fa-check mr-1"></i>Approve Clearance</button>
        <button class="bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium"><i class="fas fa-search mr-1"></i>Manual Review</button>
      </div>
    </div>`;
}

async function renderGovAnonymous() {
  setTitle('Anonymous Trade Requests', 'High-confidentiality government trades — Government Portal');
  const { data } = await api('/government/anonymous-trades');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-user-secret mr-2 text-purple-500"></i>Anonymous Trade Management</h3>
      <p class="text-sm text-gray-600 mb-4">Anonymous trades hide exporter/importer identities from all parties except counterparty governments and compliance auditors.</p>
      <div class="space-y-3">${(data || []).map(t => `
        <div class="p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
          <div class="flex justify-between mb-2"><span class="font-mono text-sm">${t.anonymous_ustn}</span><span>${badge(t.status)}</span></div>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div>Counterparty: <b>${t.counterparty?.name}</b></div>
            <div>Commodity: <b>${t.commodity?.description}</b> (HS ${t.commodity?.hs_code})</div>
            <div>Created: ${time(t.created_at)}</div>
          </div>
          <div class="mt-3 flex gap-2">
            <button class="text-xs bg-purple-500 text-white px-3 py-1 rounded">View Full Details</button>
            <button class="text-xs bg-gray-300 px-3 py-1 rounded">Audit Log</button>
            <button class="text-xs bg-red-500 text-white px-3 py-1 rounded">Revoke Anonymity (A3)</button>
          </div>
        </div>`).join('')}</div>
    </div>`;
}

async function renderGovIntegrations() {
  setTitle('Integration Connectors', 'Dynamic per-country government system integrations');
  const { data } = await api('/government/integrations');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-plug mr-2 text-green-500"></i>Active Integrations</h3>
      ${(data.active_integrations || []).map(i => `
        <div class="p-3 bg-green-50 rounded-lg flex justify-between mb-2"><span class="font-medium">${i.name} — ${badge(i.status)}</span><span class="text-sm">Avg latency: ${i.avg_latency_ms}ms | Error rate: ${(i.error_rate*100).toFixed(1)}%</span></div>`).join('')}
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-th-list mr-2 text-sgtx-500"></i>Available Connectors Library</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Connector</th><th class="p-2">Countries</th><th class="p-2">Method</th><th class="p-2">Action</th></tr></thead>
      <tbody>${(data.available_connectors || []).map(c => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${c.name}</td><td class="p-2 text-xs">${c.countries.join(', ')}</td><td class="p-2 text-xs">${c.method}</td><td class="p-2"><button class="bg-sgtx-500 text-white px-3 py-1 rounded text-xs">Enable</button></td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// v6.3 — ADMIN PORTAL NEW PAGES
// ═══════════════════════════════════════════════════════════════

async function renderPredictiveHealth() {
  setTitle('Predictive System Health', 'LSTM-based forecasting for resource exhaustion — Admin Portal');
  const { data } = await api('/admin/predictive-health');
  document.getElementById('content').innerHTML = `
    <div class="card p-5 mb-5">
      <h3 class="font-bold mb-3"><i class="fas fa-robot mr-2 text-sgtx-500"></i>AI Health Prediction</h3>
      <div class="p-4 bg-blue-50 rounded-lg text-sm">${data.ai_summary}</div>
    </div>
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-chart-line mr-2 text-sgtx-500"></i>System Metrics & Predictions</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left">Metric</th><th class="p-2">Current</th><th class="p-2">Predicted</th><th class="p-2">Threshold</th><th class="p-2">Status</th><th class="p-2">Action</th></tr></thead>
      <tbody>${(data.metrics || []).map(m => `
        <tr class="border-t hover:bg-gray-50"><td class="p-2 font-medium">${m.metric}</td>
        <td class="p-2 text-center">${m.current}</td>
        <td class="p-2 text-center font-bold">${m.predicted_7d || m.predicted_24h || m.predicted_6h || m.predicted_1h}</td>
        <td class="p-2 text-center">${m.alert_threshold}</td>
        <td class="p-2 text-center">${badge(m.status)}</td>
        <td class="p-2 text-xs">${m.action || '—'}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

async function renderIncidents() {
  setTitle('Incidents & Post-Mortem', 'Automated evidence collection + AI-drafted post-mortems — Admin Portal');
  const { data } = await api('/admin/incidents');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-exclamation-circle mr-2 text-red-500"></i>Incidents</h3>
      ${(data || []).map(i => `
        <div class="p-4 border-l-4 ${i.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'} rounded-lg mb-4">
          <div class="flex justify-between"><span class="font-bold">${i.id}</span><span>${badge(i.status)}</span></div>
          <div class="font-bold text-lg mt-1">${i.title}</div>
          <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><b>Impact:</b> ${i.impact}</div>
            <div><b>Root Cause:</b> ${i.root_cause}</div>
            <div><b>Resolution:</b> ${i.resolution}</div>
            <div><b>Duration:</b> ${i.start_time} — ${i.end_time}</div>
          </div>
          <div class="mt-3 p-3 bg-white rounded text-sm"><b>AI Post-Mortem:</b> ${i.ai_post_mortem}</div>
          <div class="flex gap-2 mt-3">
            <button class="bg-sgtx-500 text-white px-4 py-1 rounded text-xs">Publish to Status Page</button>
            <button class="bg-gray-200 px-4 py-1 rounded text-xs">Edit Post-Mortem</button>
          </div>
        </div>`).join('')}
    </div>`;
}

async function renderConfigVersions() {
  setTitle('Configuration Version Control', 'Track all platform config changes with rollback — Admin Portal');
  const { data } = await api('/admin/config-versions');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-code-branch mr-2 text-sgtx-500"></i>Configuration Versions</h3>
      <div class="space-y-3">${(data || []).map(v => `
        <div class="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
          <div><span class="font-bold text-sgtx-600">v${v.version}</span> <span class="text-sm text-gray-500">— ${v.description}</span>
            <div class="text-xs text-gray-400 mt-1">By: ${v.changed_by} | ${time(v.timestamp)}</div>
            <div class="text-xs mt-1">${v.components.map(c => `<span class="bg-gray-100 px-2 py-0.5 rounded mr-1">${c}</span>`).join('')}</div>
          </div>
          <div class="flex gap-2">
            <button class="bg-gray-200 px-3 py-1 rounded text-xs">Diff</button>
            <button class="bg-red-500 text-white px-3 py-1 rounded text-xs">Rollback (Multisig)</button>
          </div>
        </div>`).join('')}</div>
    </div>`;
}

async function renderImpersonate() {
  setTitle('Tenant Impersonation', 'Read-only support mode with multisig 3/5 approval — Admin Portal');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-user-secret mr-2 text-sgtx-500"></i>Tenant Impersonation (Support Mode)</h3>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm"><i class="fas fa-exclamation-triangle text-red-500 mr-2"></i><b>Highly Restricted:</b> Requires multisig 3/5 approval. Read-only. 30 min max. Tenant notified after session ends.</div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="block text-sm font-medium mb-1">Tenant ID / GTID</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="SGTX-EG-TRD-000123"></div>
        <div><label class="block text-sm font-medium mb-1">Reason for Impersonation</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="Support ticket #12345"></div>
      </div>
      <button class="bg-red-500 text-white px-6 py-2 rounded-lg font-medium"><i class="fas fa-user-secret mr-2"></i>Request Impersonation (Multisig Required)</button>
    </div>`;
}

async function renderPartnerOnboard() {
  setTitle('Marketplace Partner Onboarding', 'AI-generated agreements + risk escalation — Admin Portal');
  document.getElementById('content').innerHTML = `
    <div class="card p-5">
      <h3 class="font-bold mb-3"><i class="fas fa-handshake mr-2 text-sgtx-500"></i>Onboard New Marketplace Partner</h3>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="block text-sm font-medium mb-1">Partner Legal Name</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="TradeBridge Inc."></div>
        <div><label class="block text-sm font-medium mb-1">Jurisdiction</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="US"></div>
        <div><label class="block text-sm font-medium mb-1">Contact Email</label><input type="text" class="w-full border rounded px-3 py-2 text-sm" placeholder="partner@example.com"></div>
        <div><label class="block text-sm font-medium mb-1">Revenue Split (%)</label><input type="number" class="w-full border rounded px-3 py-2 text-sm" value="0.5" step="0.1"></div>
      </div>
      <button class="bg-sgtx-500 text-white px-6 py-2 rounded-lg font-medium"><i class="fas fa-magic mr-2"></i>Generate AI Agreement & Onboard</button>
      <div class="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">The system will auto-generate a custom revenue-share agreement using Clause Forge + Groq. If revenue split >2% or jurisdiction risk >70, escalation to A3 (manual legal review) is required.</div>
    </div>`;
}

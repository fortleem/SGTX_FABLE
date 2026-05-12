// SGTX Platform — Utility Functions (v6.3 Blueprint Parts 0-2 Fully Aligned)

// Generate UUID v4
export function uuid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 0.6: USTN Format
// SGTX-{IMPORTER_GTID_SUFFIX}-{EXPORTER_GTID_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}
// Example: SGTX-1397F3A-456ABC-20260415120000-A1B2C3D4
// ═══════════════════════════════════════════════════════════════════════════════

export function generateUSTN(importerGtidSuffix: string, exporterGtidSuffix: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SGTX-${importerGtidSuffix}-${exporterGtidSuffix}-${ts}-${rand}`;
}

// Extract GTID suffix for USTN generation (last segment before checksum, or last 7 chars)
export function gtidSuffix(gtid: string): string {
  if (!gtid) return '0000000';
  // GTID format: SGTX-{COUNTRY}-{TYPE}-{SEQ}-{CHECKSUM}
  const parts = gtid.split('-');
  if (parts.length >= 5) {
    // Return checksum part (4 hex chars) + last 3 of sequence
    const checksum = parts[parts.length - 1];
    const seq = parts[parts.length - 2];
    return (seq.slice(-3) + checksum).toUpperCase();
  }
  // Fallback: last 7 characters
  return gtid.slice(-7).replace(/[^A-Za-z0-9]/g, '0').toUpperCase();
}

// Legacy USTN format (backward compatible for existing code that passes jurisdiction)
export function generateUSTNLegacy(jurisdiction: string, version: number = 1): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase();
  return `SGTX-${jurisdiction}-${ts}-${rand}-V${version}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 2.1: GTID Format
// SGTX-{COUNTRY_CODE}-{ENTITY_TYPE}-{SEQUENCE}-{CHECKSUM}
// Country: ISO-3166-1 alpha-2
// Entity Types: TRD, LOG, FIN, QC, GOV, REG, MP
// Sequence: zero-padded 6-digit
// Checksum: 4-hex CRC32
// Example: SGTX-EG-TRD-002139-7F3A
// ═══════════════════════════════════════════════════════════════════════════════

// CRC32 lookup table
const CRC32_TABLE = new Uint32Array(256);
(function initCrc32() {
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC32_TABLE[i] = c >>> 0;
  }
})();

export function crc32(data: string): number {
  const bytes = new TextEncoder().encode(data);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function generateGTID(country: string, entityType: string, sequence: number): string {
  const seq = String(sequence).padStart(6, '0');
  const base = `SGTX-${country}-${entityType}-${seq}`;
  const checksum = (crc32(base) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return `${base}-${checksum}`;
}

// Part 2.1 (GAP-1/GAP-28): Atomic GTID sequence generation via DB
// Blueprint: "sequence stored in PostgreSQL and incremented atomically"
// Uses gtid_sequences table for deterministic, collision-free GTID assignment
export async function generateGTIDWithSequence(db: D1Database, country: string, entityType: string): Promise<string> {
  // Atomic increment: INSERT OR UPDATE the sequence counter
  await db.prepare(`
    INSERT INTO gtid_sequences (country_code, entity_type, current_sequence, last_assigned_at)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(country_code, entity_type) DO UPDATE SET
      current_sequence = current_sequence + 1,
      last_assigned_at = datetime('now')
  `).bind(country.toUpperCase(), entityType).run();

  // Read the current (just-incremented) sequence
  const row = await db.prepare(
    'SELECT current_sequence FROM gtid_sequences WHERE country_code = ? AND entity_type = ?'
  ).bind(country.toUpperCase(), entityType).first() as any;

  const sequence = row?.current_sequence || 1;
  return generateGTID(country.toUpperCase(), entityType, sequence);
}

// Part 2.7.2 (GAP-19): Sandbox synthetic USTN with "SB" prefix
export function generateSandboxUSTN(importerSuffix: string, exporterSuffix: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SB-${importerSuffix}-${exporterSuffix}-${ts}-${rand}`;
}

// Validate GTID format
export function validateGTID(gtid: string): { valid: boolean; error?: string } {
  const pattern = /^SGTX-[A-Z]{2}-(TRD|LOG|FIN|QC|GOV|REG|MP)-\d{6}-[0-9A-F]{4}$/;
  if (!pattern.test(gtid)) {
    return { valid: false, error: 'Invalid GTID format. Expected: SGTX-{CC}-{TYPE}-{SEQ}-{CHECKSUM}' };
  }
  // Verify checksum
  const base = gtid.slice(0, gtid.lastIndexOf('-'));
  const expectedChecksum = (crc32(base) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  const actualChecksum = gtid.slice(gtid.lastIndexOf('-') + 1);
  if (expectedChecksum !== actualChecksum) {
    return { valid: false, error: `GTID checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}` };
  }
  return { valid: true };
}

// Entity type mapping from tenant type
export const ENTITY_TYPE_MAP: Record<string, string> = {
  CORPORATE: 'TRD', FINANCIAL: 'FIN', LOGISTICS: 'LOG',
  QUALITY_CONTROL: 'QC', REGULATORY: 'REG', GOVERNMENT: 'GOV',
  MARKETPLACE_PARTNER: 'MP'
};

// SHA-256 hash
export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return 'sha256:' + Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Ed25519-like signature simulation (using HMAC for Cloudflare Workers)
export async function signDecision(data: string, key?: string): Promise<string> {
  const keyData = new TextEncoder().encode(key || 'sgtx-governor-key-v1');
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return 'sig:' + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Loom hash (deterministic logging hash)
export async function loomHash(decisionId: string, action: string, timestamp: string): Promise<string> {
  return sha256(`${decisionId}:${action}:${timestamp}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1.4: Jurisdiction Supremacy — applies strictest rule among all parties
// Autoblocked: North Korea, Iran, Syria, Cuba, Russia, Belarus
// High-risk: Iraq, Afghanistan, Yemen, Lebanon, Pakistan
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_COUNTRIES = new Set(['KP', 'IR', 'SY', 'CU', 'RU', 'BY']);
const HIGH_RISK_COUNTRIES = new Set(['IQ', 'AF', 'YE', 'LB', 'PK']);

export function checkJurisdiction(code: string): { allowed: boolean; level: string; reason?: string } {
  if (!code) return { allowed: true, level: 'NONE' };
  const upper = code.toUpperCase();
  if (BLOCKED_COUNTRIES.has(upper)) {
    return { allowed: false, level: 'BLOCKED', reason: `Jurisdiction ${upper} is sanctioned/blocked` };
  }
  if (HIGH_RISK_COUNTRIES.has(upper)) {
    return { allowed: true, level: 'HIGH_RISK', reason: 'Bank-only + enhanced due diligence required' };
  }
  return { allowed: true, level: 'NONE' };
}

// Part 1.4: Apply strictest jurisdiction rule (importer, exporter, logistics, financier, contract law)
export function strictestJurisdiction(...codes: string[]): { allowed: boolean; level: string; blocked: string[] } {
  const blocked: string[] = [];
  let strictest = 'NONE';
  for (const code of codes) {
    if (!code) continue;
    const check = checkJurisdiction(code);
    if (!check.allowed) blocked.push(code);
    if (check.level === 'BLOCKED') strictest = 'BLOCKED';
    else if (check.level === 'HIGH_RISK' && strictest !== 'BLOCKED') strictest = 'HIGH_RISK';
  }
  return { allowed: blocked.length === 0, level: strictest, blocked };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 0.5: Commission Supremacy Rule & Incoterm mapping
// Single-shipment: commission due at contract lock
// Multi-shipment: commission per-shipment
// Commission payer determined by incoterm
// ═══════════════════════════════════════════════════════════════════════════════

const EXPORTER_PAYS_INCOTERMS = new Set(['CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']);
export function defaultCommissionPayer(incoterm: string): 'IMPORTER' | 'EXPORTER' {
  return EXPORTER_PAYS_INCOTERMS.has(incoterm) ? 'EXPORTER' : 'IMPORTER';
}

// Commission rate clamping per Part 0.5 (min 0.1%, max 2.5%)
export function clampCommissionRate(rate: number): number {
  return Math.max(0.001, Math.min(0.025, rate));
}

// Format currency
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Date formatting
export function isoNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Generate invitation token (72h expiry per Part 2.3)
export function generateInvitationToken(): { token: string; expires_at: string } {
  const token = `inv_${uuid().replace(/-/g, '')}`;
  const expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
  return { token, expires_at: expires.toISOString().replace('T', ' ').slice(0, 19) };
}

// Part 2.10: Validate lifecycle state transitions
// States: REGISTERED, ONBOARDING, KYB_PENDING, VERIFIED, LIMITED_MODE, AT_RISK, SUSPENDED, ARCHIVED
const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  'REGISTERED': ['ONBOARDING'],
  'ONBOARDING': ['KYB_PENDING', 'REGISTERED'],
  'KYB_PENDING': ['VERIFIED', 'ONBOARDING'],
  'VERIFIED': ['LIMITED_MODE', 'AT_RISK', 'SUSPENDED'],
  'LIMITED_MODE': ['VERIFIED', 'AT_RISK', 'SUSPENDED'],
  'AT_RISK': ['VERIFIED', 'SUSPENDED'],
  'SUSPENDED': ['VERIFIED', 'ARCHIVED'],
  'ARCHIVED': [],
};

export function validateLifecycleTransition(from: string, to: string): boolean {
  const allowed = VALID_LIFECYCLE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Part 2.10 (GAP-27): Lifecycle state feature restrictions
// Blueprint: "each state impacts allowed actions"
export const LIFECYCLE_FEATURE_RESTRICTIONS: Record<string, { allowed: string[]; blocked: string[]; description: string }> = {
  'REGISTERED': {
    allowed: ['onboarding', 'profile.view', 'sandbox'],
    blocked: ['trade.create', 'contract.sign', 'shipment.create', 'financing.request'],
    description: 'New tenant. Only onboarding and sandbox access allowed.'
  },
  'ONBOARDING': {
    allowed: ['onboarding', 'profile.edit', 'sandbox', 'kyb.submit'],
    blocked: ['trade.create', 'contract.sign', 'shipment.create', 'financing.request'],
    description: 'Onboarding in progress. Sandbox mode only.'
  },
  'KYB_PENDING': {
    allowed: ['profile.view', 'sandbox', 'contacts.view', 'kyb.submit'],
    blocked: ['trade.create', 'contract.sign', 'shipment.create', 'financing.request'],
    description: 'KYB verification pending. Real trade creation disabled, sandbox allowed.'
  },
  'VERIFIED': {
    allowed: ['*'],
    blocked: [],
    description: 'Fully verified. All features available.'
  },
  'LIMITED_MODE': {
    allowed: ['trade.view', 'profile.view', 'contacts.view', 'contract.view', 'support'],
    blocked: ['trade.create', 'financing.request', 'contract.sign'],
    description: 'Limited mode. View-only access to trades, no new trade creation.'
  },
  'AT_RISK': {
    allowed: ['profile.view', 'trade.view', 'support', 'compliance.respond'],
    blocked: ['trade.create', 'contract.sign', 'shipment.create', 'financing.request'],
    description: 'At risk. Compliance action required. Limited to view and compliance responses.'
  },
  'SUSPENDED': {
    allowed: ['profile.view', 'support', 'data.export'],
    blocked: ['trade.create', 'trade.view', 'contract.sign', 'shipment.create', 'financing.request'],
    description: 'Suspended. Contact support. Only profile view and data export allowed.'
  },
  'ARCHIVED': {
    allowed: ['data.export'],
    blocked: ['*'],
    description: 'Archived. Data export only. No other actions permitted.'
  },
};

export function checkLifecycleFeatureAccess(lifecycleState: string, feature: string): { allowed: boolean; reason: string } {
  const restrictions = LIFECYCLE_FEATURE_RESTRICTIONS[lifecycleState];
  if (!restrictions) return { allowed: false, reason: `Unknown lifecycle state: ${lifecycleState}` };
  if (restrictions.allowed.includes('*')) return { allowed: true, reason: 'Fully verified tenant' };
  if (restrictions.blocked.includes('*')) return { allowed: false, reason: restrictions.description };
  if (restrictions.blocked.includes(feature)) return { allowed: false, reason: restrictions.description };
  if (restrictions.allowed.includes(feature)) return { allowed: true, reason: 'Permitted in current state' };
  return { allowed: false, reason: `Feature '${feature}' not explicitly allowed in ${lifecycleState} state` };
}

// Part 2.5 (GAP-10): Icon Shuffle — deterministic per session
// Blueprint: "shuffle is deterministic per session (seeded with session ID)"
export function generateIconShuffle(sessionSeed: string, icons: string[]): string[] {
  // Simple deterministic shuffle using seed hash
  const shuffled = [...icons];
  let seed = 0;
  for (let i = 0; i < sessionSeed.length; i++) {
    seed = ((seed << 5) - seed + sessionSeed.charCodeAt(i)) | 0;
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Part 2.5 (GAP-11): Visibility Rules — dynamic show/hide based on permissions, trader mode, lifecycle
export function computeVisibilityRules(
  permissions: string[],
  traderMode: string,
  lifecycleState: string,
  tenantType: string
): Record<string, boolean> {
  const restrictions = LIFECYCLE_FEATURE_RESTRICTIONS[lifecycleState] || LIFECYCLE_FEATURE_RESTRICTIONS['REGISTERED'];
  const isFullAccess = restrictions.allowed.includes('*');
  
  return {
    // Navigation tabs
    nav_dashboard: true,
    nav_trades: isFullAccess || restrictions.allowed.includes('trade.view'),
    nav_contracts: isFullAccess || restrictions.allowed.includes('contract.view'),
    nav_shipments: isFullAccess || restrictions.allowed.includes('shipment.view'),
    nav_financing: isFullAccess && (tenantType === 'CORPORATE' || tenantType === 'FINANCIAL'),
    nav_network: isFullAccess || restrictions.allowed.includes('contacts.view'),
    nav_settings: true,
    nav_compliance: isFullAccess || restrictions.allowed.includes('compliance.respond'),
    // Trader mode specific
    show_buy_actions: traderMode === 'BUY' || traderMode === 'DUAL',
    show_sell_actions: traderMode === 'SELL' || traderMode === 'DUAL',
    show_mode_toggle: traderMode === 'DUAL',
    // Action buttons
    btn_create_trade: isFullAccess && !restrictions.blocked.includes('trade.create'),
    btn_sign_contract: isFullAccess && !restrictions.blocked.includes('contract.sign'),
    btn_create_shipment: isFullAccess && !restrictions.blocked.includes('shipment.create'),
    btn_request_financing: isFullAccess && !restrictions.blocked.includes('financing.request'),
    // Sandbox
    show_sandbox_banner: lifecycleState === 'ONBOARDING' || lifecycleState === 'KYB_PENDING',
    // Logistics-specific
    show_logistics_panel: tenantType === 'LOGISTICS',
    show_qc_panel: tenantType === 'QUALITY_CONTROL',
    show_government_panel: tenantType === 'GOVERNMENT' || tenantType === 'REGULATORY',
  };
}

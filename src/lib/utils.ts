// SGTX Platform — Utility Functions (v6.3 Blueprint Parts 0-2 Aligned)

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

// Part 2.8: Validate lifecycle state transitions
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

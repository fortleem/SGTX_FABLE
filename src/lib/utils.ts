// SGTX Platform — Utility Functions

// Generate UUID v4
export function uuid(): string {
  return crypto.randomUUID();
}

// Generate USTN: SGTX-{JURISDICTION}-{YYYYMMDDHHMMSS}-{RANDOM8}-{VERSION}
export function generateUSTN(jurisdiction: string, version: number = 1): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase();
  return `SGTX-${jurisdiction}-${ts}-${rand}-V${version}`;
}

// Generate GTID: SGTX-{COUNTRY}-{TYPE}-{SEQ}-{CHECKSUM}
export function generateGTID(country: string, entityType: string, sequence: number): string {
  const seq = String(sequence).padStart(6, '0');
  const base = `SGTX-${country}-${entityType}-${seq}`;
  const checksum = Array.from(new TextEncoder().encode(base))
    .reduce((a, b) => a ^ b, 0).toString(16).toUpperCase().padStart(4, '0');
  return `${base}-${checksum}`;
}

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

// Jurisdiction check
const BLOCKED_COUNTRIES = new Set(['KP', 'IR', 'SY', 'CU', 'RU', 'BY']);
const HIGH_RISK_COUNTRIES = new Set(['IQ', 'AF', 'YE', 'LB', 'PK']);

export function checkJurisdiction(code: string): { allowed: boolean; level: string; reason?: string } {
  if (BLOCKED_COUNTRIES.has(code)) {
    return { allowed: false, level: 'BLOCKED', reason: `Jurisdiction ${code} is sanctioned/blocked` };
  }
  if (HIGH_RISK_COUNTRIES.has(code)) {
    return { allowed: true, level: 'HIGH_RISK', reason: 'Bank-only + enhanced due diligence required' };
  }
  return { allowed: true, level: 'NONE' };
}

// Apply strictest jurisdiction rule (G‑1.4)
export function strictestJurisdiction(...codes: string[]): { allowed: boolean; level: string; blocked: string[] } {
  const blocked: string[] = [];
  let strictest = 'NONE';
  for (const code of codes) {
    const check = checkJurisdiction(code);
    if (!check.allowed) blocked.push(code);
    if (check.level === 'BLOCKED') strictest = 'BLOCKED';
    else if (check.level === 'HIGH_RISK' && strictest !== 'BLOCKED') strictest = 'HIGH_RISK';
  }
  return { allowed: blocked.length === 0, level: strictest, blocked };
}

// Incoterm commission payer mapping
const EXPORTER_PAYS_INCOTERMS = new Set(['CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']);
export function defaultCommissionPayer(incoterm: string): 'IMPORTER' | 'EXPORTER' {
  return EXPORTER_PAYS_INCOTERMS.has(incoterm) ? 'EXPORTER' : 'IMPORTER';
}

// Format currency
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Date formatting
export function isoNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

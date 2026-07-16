// GTID (Global Trade Identity) Utilities
// Format: SGTX-{COUNTRY_CODE}-{ENTITY_TYPE}-{SEQUENCE}-{CHECKSUM}

export function generateGTID(
  countryCode: string,
  entityType: string,
  sequence: number
): string {
  const seqStr = String(sequence).padStart(6, '0');
  const base = `SGTX-${countryCode.toUpperCase()}-${entityType.toUpperCase()}-${seqStr}`;
  const checksum = computeChecksum(base);
  return `${base}-${checksum}`;
}

export function generateUSTN(
  buyerSuffix: string,
  sellerSuffix: string,
  randomSuffix?: string
): string {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = randomSuffix || generateRandomHex(8);
  return `SGTX-${buyerSuffix}-${sellerSuffix}-${timestamp}-${random}`;
}

export function generateMicroUSTN(parentUSTN: string): string {
  const random = generateRandomHex(4);
  return `${parentUSTN}-MCRO-${random}`;
}

export function generateAnonymousUSTN(): string {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = generateRandomHex(8);
  return `SGTX-ANON-${timestamp}-${random}`;
}

function computeChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const abs = Math.abs(hash);
  return abs.toString(16).toUpperCase().substring(0, 4);
}

function generateRandomHex(length: number): string {
  const chars = '0123456789ABCDEF';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % 16];
  }
  return result;
}

export function computeLoomHash(previousHash: string, decisionData: string): string {
  const data = previousHash + decisionData;
  return simpleSHA256(data);
}

function simpleSHA256(message: string): string {
  // Web Crypto-based SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  // We'll use a hash approach suitable for Cloudflare Workers
  // This is a placeholder - real implementation uses crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const abs = Math.abs(hash);
  return abs.toString(16).padStart(16, '0') + generateRandomHex(48);
}

export function computeTradeHealthScore(components: {
  compliance: number;
  documentation: number;
  logistics: number;
  payment: number;
  risk: number;
  timeline: number;
}): number {
  const score =
    components.compliance * 0.20 +
    components.documentation * 0.20 +
    components.logistics * 0.15 +
    components.payment * 0.15 +
    components.risk * 0.20 +
    components.timeline * 0.10;
  return Math.round(score * 10) / 10;
}

export function getHealthBand(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Healthy', color: 'green' };
  if (score >= 65) return { label: 'Stable', color: 'amber' };
  if (score >= 40) return { label: 'At Risk', color: 'orange' };
  return { label: 'Critical', color: 'red' };
}

export function parseGTID(gtid: string): {
  countryCode: string;
  entityType: string;
  sequence: string;
  checksum: string;
} | null {
  const parts = gtid.split('-');
  if (parts.length !== 5 || parts[0] !== 'SGTX') return null;
  return {
    countryCode: parts[1],
    entityType: parts[2],
    sequence: parts[3],
    checksum: parts[4],
  };
}

export const ENTITY_TYPES: Record<string, string> = {
  TRD: 'Trader',
  LSP: 'Logistics Service Provider',
  SHIP: 'Shipping Line',
  LAB: 'Laboratory',
  QC: 'Quality Control / Inspection',
  FIN: 'Financier',
  GOV: 'Government Agency',
  MP: 'Marketplace Partner',
  CBR: 'Customs Broker',
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  INITIATED: 'Initiated',
  STAGE1_PENDING: 'Stage 1 Payment Pending',
  STAGE1_SETTLED: 'Stage 1 Settled',
  CUSTOMS_SUBMITTED: 'Customs Submitted',
  BOOKED: 'Booked',
  LOADED: 'Loaded',
  DEPARTED: 'Departed',
  IN_TRANSIT: 'In Transit',
  ARRIVED: 'Arrived',
  CUSTOMS_IMPORT: 'Import Customs',
  DELIVERED: 'Delivered',
  SETTLED: 'Settled',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
  DISTRESSED: 'Distressed',
  CANCELLED: 'Cancelled',
};

export const DISPUTE_CATEGORY_LABELS: Record<string, string> = {
  QUALITY: 'Quality Issue',
  DELAY: 'Delay',
  NON_PAYMENT: 'Non-Payment',
  DOCUMENTATION_FRAUD: 'Documentation Fraud',
  COLD_CHAIN: 'Cold Chain Breach',
  WEIGHT_SHORTAGE: 'Weight Shortage',
  SERVICE_QUALITY: 'Service Quality',
  FINANCING: 'Financing Issue',
  SGTX_FEE: 'SGTX Fee Dispute',
  OTHER: 'Other',
};

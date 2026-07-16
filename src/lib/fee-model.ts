// ═══════════════════════════════════════════════════════════════════════════════
// SGTX Platform — Fee Model Engine (Part 0.9: Global Fee Model)
// Blueprint v11.1 — Non-custodial, transparent, constitutional fee structure
// ═══════════════════════════════════════════════════════════════════════════════
//
// Fee Model per blueprint:
// - Infrastructure fee: 1.5% per country side on cross-border flows
// - Financing fee: 0.25% of financed amount (paid by borrower)
// - Optional service fee: 3% platform fee on provider payments
// - Commission formula: clamp(0.1%, 2.5%, base + country_boost + seasonality
//                       ± geopolitical_risk - volume_discount + perishability ± anomaly)
// - Gross-up formula: (Net + Fixed) / (1 - Pct%) + Buffer
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constants ─────────────────────────────────────────────────────────────────
export const INFRASTRUCTURE_FEE_RATE = 0.015;   // 1.5% per country side
export const FINANCING_FEE_RATE = 0.0025;        // 0.25% of financed amount
export const OPTIONAL_SERVICE_PLATFORM_RATE = 0.03; // 3% on provider payment
export const COMMISSION_MIN = 0.001;              // 0.1% floor
export const COMMISSION_MAX = 0.025;              // 2.5% ceiling
export const DEFAULT_COMMISSION_BASE = 0.015;     // 1.5% default

// Incoterms where EXPORTER pays
const EXPORTER_PAYS_INCOTERMS = new Set(['CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']);

// ─── Country Corridor Boosts (basis points) ────────────────────────────────────
const COUNTRY_BOOSTS: Record<string, number> = {
  'EG': 0.000,  // Egypt: baseline
  'SA': 0.000,  // Saudi Arabia: baseline
  'AE': 0.001,  // UAE: +10bps
  'DE': -0.001, // Germany: -10bps (stable market)
  'VN': 0.002,  // Vietnam: +20bps
  'CN': 0.001,  // China: +10bps
  'IN': 0.001,  // India: +10bps
  'US': -0.001, // US: -10bps
  'GB': -0.001, // UK: -10bps
  'NG': 0.003,  // Nigeria: +30bps
  'KE': 0.002,  // Kenya: +20bps
  'ZA': 0.001,  // South Africa: +10bps
  'BR': 0.002,  // Brazil: +20bps
  'TR': 0.002,  // Turkey: +20bps
};

// ─── Seasonality Adjustments (basis points, per month) ─────────────────────────
const SEASONALITY: Record<number, number> = {
  1: 0.001,   // January: +10bps (post-holiday)
  2: 0.000,   // February
  3: -0.001,  // March: -10bps (spring)
  4: -0.001,  // April
  5: 0.000,   // May
  6: 0.000,   // June
  7: 0.001,   // July: +10bps (summer peak)
  8: 0.002,   // August: +20bps (high season)
  9: 0.001,   // September
  10: 0.000,  // October
  11: -0.001, // November
  12: 0.001,  // December: +10bps (holiday rush)
};

// ─── Perishability Multipliers ─────────────────────────────────────────────────
const PERISHABILITY: Record<string, number> = {
  'NON_PERISHABLE': 0.000,
  'SEMI_PERISHABLE': 0.001,     // +10bps (e.g., potatoes, onions)
  'PERISHABLE': 0.003,          // +30bps (e.g., strawberries, fresh produce)
  'HIGHLY_PERISHABLE': 0.005,   // +50bps (e.g., cut flowers, seafood)
  'FROZEN': -0.001,             // -10bps (lower risk than fresh)
  'PHARMACEUTICAL': 0.004,      // +40bps (cold chain complexity)
};

// ─── Geopolitical Risk Premiums (basis points) ─────────────────────────────────
const GEOPOLITICAL_RISK: Record<string, number> = {
  'STABLE': -0.001,
  'ELEVATED': 0.001,
  'HIGH': 0.003,
  'CRITICAL': 0.005,
};

// ─── Volume Discount Tiers ─────────────────────────────────────────────────────
function getVolumeDiscount(invoiceValueUSD: number): number {
  if (invoiceValueUSD >= 10_000_000) return -0.005;  // -50bps for $10M+
  if (invoiceValueUSD >= 5_000_000) return -0.003;   // -30bps for $5M+
  if (invoiceValueUSD >= 1_000_000) return -0.002;   // -20bps for $1M+
  if (invoiceValueUSD >= 500_000) return -0.001;     // -10bps for $500K+
  return 0;
}

// ─── Core Commission Calculation ───────────────────────────────────────────────
export interface CommissionInput {
  invoiceValueUSD: number;
  exporterCountry: string;
  importerCountry: string;
  incoterm: string;
  perishabilityCategory?: string;
  geopoliticalLevel?: string;
  month?: number;  // 1-12
  anomalyScore?: number; // -1.0 to 1.0, 0 = no anomaly
}

export interface CommissionResult {
  baseRate: number;
  countryBoost: number;
  seasonality: number;
  geopoliticalRisk: number;
  volumeDiscount: number;
  perishability: number;
  anomaly: number;
  effectiveRate: number;
  clampedRate: number;
  commissionUSD: number;
  exporterSideFee: number;
  importerSideFee: number;
  exporterSidePayer: string;
  importerSidePayer: string;
  totalPlatformFee: number;
  breakdown: Record<string, { bp: number; usd: number; label: string }>;
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const month = input.month || new Date().getMonth() + 1;

  // Component calculations (in basis points for readability)
  const baseRate = DEFAULT_COMMISSION_BASE;
  const countryBoost = COUNTRY_BOOSTS[input.exporterCountry] || 0;
  const seasonality = SEASONALITY[month] || 0;
  const geopoliticalRisk = GEOPOLITICAL_RISK[input.geopoliticalLevel || 'STABLE'] || 0;
  const volumeDiscount = getVolumeDiscount(input.invoiceValueUSD);
  const perishability = PERISHABILITY[input.perishabilityCategory || 'NON_PERISHABLE'] || 0;
  const anomaly = (input.anomalyScore || 0) * 0.005; // Max ±50bps anomaly impact

  // Effective rate before clamping
  const effectiveRate = baseRate + countryBoost + seasonality + geopoliticalRisk
    + volumeDiscount + perishability + anomaly;

  // Constitutional clamp: 0.1% to 2.5%
  const clampedRate = Math.max(COMMISSION_MIN, Math.min(COMMISSION_MAX, effectiveRate));

  // Commission USD
  const commissionUSD = input.invoiceValueUSD * clampedRate;

  // Per-side fees
  const exporterSideFee = input.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE;
  const importerSideFee = input.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE;

  // Who pays per side (based on incoterm)
  const exporterSidePayer = EXPORTER_PAYS_INCOTERMS.has(input.incoterm.toUpperCase())
    ? 'EXPORTER' : 'IMPORTER';
  const importerSidePayer = EXPORTER_PAYS_INCOTERMS.has(input.incoterm.toUpperCase())
    ? 'IMPORTER' : 'EXPORTER';

  const totalPlatformFee = exporterSideFee + importerSideFee;

  return {
    baseRate,
    countryBoost,
    seasonality,
    geopoliticalRisk,
    volumeDiscount,
    perishability,
    anomaly,
    effectiveRate,
    clampedRate,
    commissionUSD,
    exporterSideFee,
    importerSideFee,
    exporterSidePayer,
    importerSidePayer,
    totalPlatformFee,
    breakdown: {
      base: { bp: Math.round(baseRate * 10000), usd: input.invoiceValueUSD * baseRate, label: 'Base Rate' },
      country: { bp: Math.round(countryBoost * 10000), usd: input.invoiceValueUSD * countryBoost, label: `Country Boost (${input.exporterCountry})` },
      seasonality: { bp: Math.round(seasonality * 10000), usd: input.invoiceValueUSD * seasonality, label: `Seasonality (Month ${month})` },
      geopolitical: { bp: Math.round(geopoliticalRisk * 10000), usd: input.invoiceValueUSD * geopoliticalRisk, label: `Geopolitical Risk (${input.geopoliticalLevel || 'STABLE'})` },
      volume: { bp: Math.round(volumeDiscount * 10000), usd: input.invoiceValueUSD * volumeDiscount, label: 'Volume Discount' },
      perishability: { bp: Math.round(perishability * 10000), usd: input.invoiceValueUSD * perishability, label: `Perishability (${input.perishabilityCategory || 'NON_PERISHABLE'})` },
      anomaly: { bp: Math.round(anomaly * 10000), usd: input.invoiceValueUSD * anomaly, label: 'Market Anomaly' },
      effective: { bp: Math.round(effectiveRate * 10000), usd: input.invoiceValueUSD * effectiveRate, label: 'Effective Rate (pre-clamp)' },
      clamped: { bp: Math.round(clampedRate * 10000), usd: commissionUSD, label: 'Clamped Rate (constitutional)' },
    },
  };
}

// ─── Gross-Up Calculation ──────────────────────────────────────────────────────
// Formula: Gross = (Net + Fixed_Fees) / (1 - Percentage_Fee) + Safety_Buffer
export interface GrossUpInput {
  netAmount: number;
  percentageFee: number;   // e.g., 0.015 for 1.5%
  fixedFees?: number;
  safetyBuffer?: number;   // default: 0.5% of gross
}

export interface GrossUpResult {
  netAmount: number;
  percentageFee: number;
  fixedFees: number;
  subTotalBeforeBuffer: number;
  safetyBuffer: number;
  grossAmount: number;
  feeAmount: number;
  netAfterFees: number;
  verification: string;
}

export function calculateGrossUp(input: GrossUpInput): GrossUpResult {
  const fixedFees = input.fixedFees || 0;
  const net = input.netAmount;

  if (input.percentageFee >= 1) {
    throw new Error(`Percentage fee ${(input.percentageFee * 100).toFixed(1)}% >= 100% — division by zero in gross-up formula`);
  }

  const subTotalBeforeBuffer = (net + fixedFees) / (1 - input.percentageFee);
  const safetyBuffer = input.safetyBuffer || (subTotalBeforeBuffer * 0.005); // default 0.5%
  const grossAmount = subTotalBeforeBuffer + safetyBuffer;
  const feeAmount = grossAmount - net;
  const netAfterFees = grossAmount - feeAmount;

  return {
    netAmount: net,
    percentageFee: input.percentageFee,
    fixedFees,
    subTotalBeforeBuffer,
    safetyBuffer,
    grossAmount,
    feeAmount,
    netAfterFees,
    verification: `Gross = (${net} + ${fixedFees}) / (1 - ${input.percentageFee}) + ${safetyBuffer} = ${grossAmount.toFixed(2)}`,
  };
}

// ─── Financing Fee Calculation ─────────────────────────────────────────────────
export interface FinancingFeeInput {
  financedAmount: number;
  financingFeeRate?: number; // defaults to 0.25%
}

export interface FinancingFeeResult {
  financedAmount: number;
  feeRate: number;
  feeAmount: number;
  disbursementAmount: number;
  payer: string;
}

export function calculateFinancingFee(input: FinancingFeeInput): FinancingFeeResult {
  const rate = input.financingFeeRate || FINANCING_FEE_RATE;
  const feeAmount = input.financedAmount * rate;
  const disbursementAmount = input.financedAmount - feeAmount;

  return {
    financedAmount: input.financedAmount,
    feeRate: rate,
    feeAmount,
    disbursementAmount,
    payer: 'Borrower',
  };
}

// ─── Optional Service Fee Calculation ──────────────────────────────────────────
export interface ServiceFeeInput {
  serviceFee: number;
  platformRate?: number; // defaults to 3%
}

export interface ServiceFeeResult {
  serviceFee: number;
  platformRate: number;
  platformFee: number;
  providerNet: number;
  payer: string;
}

export function calculateServiceFee(input: ServiceFeeInput): ServiceFeeResult {
  const rate = input.platformRate || OPTIONAL_SERVICE_PLATFORM_RATE;
  const platformFee = input.serviceFee * rate;
  const providerNet = input.serviceFee - platformFee;

  return {
    serviceFee: input.serviceFee,
    platformRate: rate,
    platformFee,
    providerNet,
    payer: 'Service Provider',
  };
}

// ─── Multi-Shipment Fee Calculation ────────────────────────────────────────────
export interface MultiShipmentFeeInput {
  totalInvoiceValue: number;
  shipmentCount: number;
  exporterCountry: string;
  importerCountry: string;
  incoterm: string;
}

export interface MultiShipmentFeeResult {
  perShipmentValue: number;
  perShipmentFee: number;
  totalFees: number;
  collectionTiming: string;
}

export function calculateMultiShipmentFees(input: MultiShipmentFeeInput): MultiShipmentFeeResult {
  const perShipmentValue = input.totalInvoiceValue / input.shipmentCount;
  const commission = calculateCommission({
    invoiceValueUSD: perShipmentValue,
    exporterCountry: input.exporterCountry,
    importerCountry: input.importerCountry,
    incoterm: input.incoterm,
    perishabilityCategory: 'NON_PERISHABLE',
  });

  return {
    perShipmentValue,
    perShipmentFee: commission.clampedRate * perShipmentValue,
    totalFees: commission.clampedRate * input.totalInvoiceValue,
    collectionTiming: `Per-shipment at each of ${input.shipmentCount} shipment locks`,
  };
}

// ─── Complete Trade Fee Summary ────────────────────────────────────────────────
export interface TradeFeeSummaryInput extends CommissionInput {
  financedAmount?: number;
  serviceFees?: { serviceName: string; amount: number }[];
}

export interface TradeFeeSummary {
  invoiceValue: number;
  commission: CommissionResult;
  exporterSide: { rate: string; amount: number; payer: string };
  importerSide: { rate: string; amount: number; payer: string };
  financing?: FinancingFeeResult;
  services?: ServiceFeeResult[];
  totalSGTXFees: number;
  comparisonNote: string;
}

export function calculateTradeFeeSummary(input: TradeFeeSummaryInput): TradeFeeSummary {
  const commission = calculateCommission(input);

  const exporterSide = {
    rate: '1.5%',
    amount: input.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE,
    payer: EXPORTER_PAYS_INCOTERMS.has(input.incoterm.toUpperCase()) ? 'EXPORTER' : 'IMPORTER',
  };

  const importerSide = {
    rate: '1.5%',
    amount: input.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE,
    payer: EXPORTER_PAYS_INCOTERMS.has(input.incoterm.toUpperCase()) ? 'IMPORTER' : 'EXPORTER',
  };

  let financing: FinancingFeeResult | undefined;
  if (input.financedAmount && input.financedAmount > 0) {
    financing = calculateFinancingFee({ financedAmount: input.financedAmount });
  }

  let services: ServiceFeeResult[] | undefined;
  let totalServiceFees = 0;
  if (input.serviceFees && input.serviceFees.length > 0) {
    services = input.serviceFees.map(s => {
      const result = calculateServiceFee({ serviceFee: s.amount });
      totalServiceFees += result.platformFee;
      return result;
    });
  }

  const totalSGTXFees = exporterSide.amount + importerSide.amount
    + (financing?.feeAmount || 0) + totalServiceFees;

  return {
    invoiceValue: input.invoiceValueUSD,
    commission,
    exporterSide,
    importerSide,
    financing,
    services,
    totalSGTXFees,
    comparisonNote: 'Still less than traditional demurrage, document discrepancies, and financing costs combined.',
  };
}

// ─── Fee Rate Display Helpers ──────────────────────────────────────────────────
export function formatBasisPoints(rate: number): string {
  const bp = Math.round(rate * 10000);
  const sign = bp > 0 ? '+' : '';
  return `${sign}${bp}bp`;
}

export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

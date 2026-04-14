// SGTX Platform — Commission AI Engine (v6.1)
// Formula: clamp(0.1%, 2.5%, base + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability ± anomaly)

import { uuid, isoNow } from './utils';
import { evaluateGovernor } from './governor';

interface CommissionInput {
  trade_value_usd: number;
  hs_code: string;
  origin_country: string;
  destination_country: string;
  incoterm: string;
  is_perishable: boolean;
  trade_count_12m: number; // volume for discount
  actor_gtid: string;
  trade_request_id?: string;
}

// Base rate mapping from estimated profit margin
function baseRate(marginPct: number): number {
  if (marginPct < 5) return 0.001;
  if (marginPct < 10) return 0.003;
  if (marginPct < 15) return 0.006;
  if (marginPct < 20) return 0.009;
  if (marginPct < 25) return 0.012;
  if (marginPct < 30) return 0.015;
  if (marginPct < 40) return 0.018;
  return 0.022;
}

// Country corridor boost
function countryBoost(origin: string, dest: string): number {
  const highMarginCorridors: Record<string, number> = {
    'VN-EG': 0.003, 'CN-AE': 0.002, 'IN-US': 0.002, 'BR-DE': 0.0015,
    'VN-US': 0.0025, 'CN-DE': 0.002, 'EG-AE': 0.001, 'KE-GB': 0.002,
  };
  return highMarginCorridors[`${origin}-${dest}`] || 0;
}

// Seasonality adjustment (simplified)
function seasonalityAdj(hsCode: string): number {
  const week = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  // Perishables (HS 07, 08, 20) have seasonal pricing
  if (hsCode.startsWith('07') || hsCode.startsWith('08') || hsCode.startsWith('20')) {
    if (week >= 20 && week <= 35) return 0.002; // Summer premium
    if (week >= 48 || week <= 4) return 0.001;   // Holiday premium
  }
  return 0;
}

// Geopolitical risk premium
function geopoliticalRisk(origin: string, dest: string): number {
  const riskZones: Record<string, number> = {
    'YE': 0.005, 'LB': 0.004, 'PK': 0.003, 'IQ': 0.004, 'AF': 0.005,
    'NG': 0.002, 'EG': 0.001, 'TR': 0.001,
  };
  return Math.max(riskZones[origin] || 0, riskZones[dest] || 0);
}

// Volume discount
function volumeDiscount(tradeCount: number): number {
  if (tradeCount >= 100) return 0.005;
  if (tradeCount >= 50) return 0.003;
  if (tradeCount >= 20) return 0.002;
  if (tradeCount >= 10) return 0.001;
  return 0;
}

export async function calculateCommission(db: D1Database, input: CommissionInput): Promise<{
  id: string;
  final_rate_pct: number;
  commission_usd: number;
  explanation: string;
  breakdown: Record<string, number>;
  governor_decision_id: string;
}> {
  // Estimate profit margin (simplified — in production, uses XGBoost model)
  const estimatedMargin = 20; // Default 20% margin estimate

  const base = baseRate(estimatedMargin);
  const country = countryBoost(input.origin_country, input.destination_country);
  const season = seasonalityAdj(input.hs_code);
  const geoRisk = geopoliticalRisk(input.origin_country, input.destination_country);
  const volDiscount = volumeDiscount(input.trade_count_12m);
  const perishSurcharge = input.is_perishable ? 0.002 : 0;
  const anomaly = 0; // Anomaly correction (ML model in production)

  // Final rate with clamp(0.1%, 2.5%)
  const rawRate = base + country + season + geoRisk - volDiscount + perishSurcharge + anomaly;
  const finalRate = Math.max(0.001, Math.min(0.025, rawRate));
  const commissionUsd = input.trade_value_usd * finalRate;

  // Governor approval for commission calculation
  const govResult = await evaluateGovernor(db, {
    decision_type: 'commission.calculate',
    actor_gtid: input.actor_gtid,
    action_context: { trade_value: input.trade_value_usd, rate: finalRate },
  });

  const calcId = uuid();
  await db.prepare(`
    INSERT INTO commission_calculations (id, trade_request_id, effective_margin_pct, base_rate_pct, country_boost_pct, seasonality_pct, geopolitical_risk_pct, volume_discount_pct, perishability_surcharge_pct, anomaly_correction_pct, final_rate_pct, commission_usd, explanation, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    calcId, input.trade_request_id || input.actor_gtid, estimatedMargin, base, country, season,
    geoRisk, volDiscount, perishSurcharge, anomaly, finalRate, commissionUsd,
    `Commission: ${(finalRate * 100).toFixed(2)}% of $${input.trade_value_usd.toLocaleString()}`,
    govResult.decision_id, isoNow()
  ).run();

  return {
    id: calcId,
    final_rate_pct: finalRate,
    commission_usd: commissionUsd,
    explanation: `Commission: ${(finalRate * 100).toFixed(2)}% = $${commissionUsd.toFixed(2)}`,
    breakdown: { base, country_boost: country, seasonality: season, geopolitical_risk: geoRisk, volume_discount: volDiscount, perishability: perishSurcharge, anomaly },
    governor_decision_id: govResult.decision_id,
  };
}

import { Hono } from 'hono';
import type { Bindings } from '../lib/types';
import { CONSTITUTION, SEVEN_PILLARS, AI_LADDER, MISSION_STATEMENT, GTID_SPEC, USTN_SPEC, FEE_MODEL, ONE_CLICK_AUTOMATION, NON_CUSTODIAL_GUARANTEE, ZERO_COST_INVENTORY, PLATFORM_CONSTITUTION } from '../lib/constitution';
import { calculateCommission, calculateGrossUp, calculateFinancingFee, calculateServiceFee, calculateMultiShipmentFees, calculateTradeFeeSummary, formatBasisPoints, formatPercentage, formatUSD, INFRASTRUCTURE_FEE_RATE, FINANCING_FEE_RATE, COMMISSION_MIN, COMMISSION_MAX } from '../lib/fee-model';

const constitution = new Hono<{ Bindings: Bindings }>();

// ═══════════════ CONSTITUTION & PHILOSOPHY ENDPOINTS ═══════════════

constitution.get('/constitution', (c) => c.json({
  platform: 'SGTX — Sovereign Governed Trade Execution',
  version: '11.1',
  blueprint_alignment: 'Part 0 — Executive Summary & Core Philosophy',
  mission: MISSION_STATEMENT,
  pillars: SEVEN_PILLARS.map(p => ({ id: p.id, name: p.name, tagline: p.tagline, principle_count: p.principles.length, invariant: p.invariant })),
  articles: PLATFORM_CONSTITUTION.articles,
  non_custodial_guarantee: NON_CUSTODIAL_GUARANTEE,
  zero_cost: ZERO_COST_INVENTORY,
  amendment_process: '3/5 multisig approval from Platform Governance Authority',
  ratified: '2026-06-14',
  immutable: true,
}));

constitution.get('/constitution/pillars', (c) => c.json({ title: 'The Seven Unshakable Pillars of SGTX', pillars: SEVEN_PILLARS }));

constitution.get('/constitution/pillars/:id', (c) => {
  const pillar = CONSTITUTION.getPillar(c.req.param('id'));
  if (!pillar) return c.json({ error: 'Pillar not found', valid_ids: SEVEN_PILLARS.map(p => p.id) }, 404);
  return c.json(pillar);
});

constitution.get('/constitution/ai-ladder', (c) => c.json(AI_LADDER));

constitution.get('/constitution/ai-ladder/:level', (c) => {
  const details = CONSTITUTION.getAILevel(c.req.param('level').toUpperCase());
  if (!details) return c.json({ error: 'AI level not found', valid_levels: ['A0', 'A1', 'A2', 'A3', 'A4'] }, 404);
  return c.json({ level: c.req.param('level').toUpperCase(), ...details });
});

constitution.get('/constitution/gtid', (c) => c.json(GTID_SPEC));

constitution.get('/constitution/ustn', (c) => c.json(USTN_SPEC));

constitution.get('/constitution/fee-model', (c) => c.json({
  ...FEE_MODEL,
  constants: {
    infrastructure_fee_rate: formatPercentage(INFRASTRUCTURE_FEE_RATE),
    financing_fee_rate: formatPercentage(FINANCING_FEE_RATE),
    commission_floor: formatPercentage(COMMISSION_MIN),
    commission_ceiling: formatPercentage(COMMISSION_MAX),
  },
}));

constitution.get('/constitution/automation', (c) => c.json(ONE_CLICK_AUTOMATION));

constitution.get('/constitution/non-custodial', (c) => c.json(NON_CUSTODIAL_GUARANTEE));

constitution.get('/constitution/zero-cost', (c) => c.json(ZERO_COST_INVENTORY));

constitution.get('/constitution/articles', (c) => c.json(PLATFORM_CONSTITUTION));

constitution.post('/constitution/verify', async (c) => {
  const { action, context } = await c.req.json();
  if (!action || !context) return c.json({ error: 'action and context required' }, 400);
  return c.json({ action, ...CONSTITUTION.verify(action, context), timestamp: new Date().toISOString() });
});

// ═══════════════ FEE MODEL ENDPOINTS ═══════════════

constitution.post('/fee/calculate', async (c) => {
  const b = await c.req.json();
  for (const f of ['invoiceValueUSD', 'exporterCountry', 'importerCountry', 'incoterm'])
    if (b[f] === undefined) return c.json({ error: `Missing: ${f}` }, 400);
  try {
    const r = calculateCommission({
      invoiceValueUSD: b.invoiceValueUSD, exporterCountry: b.exporterCountry.toUpperCase(),
      importerCountry: b.importerCountry.toUpperCase(), incoterm: b.incoterm.toUpperCase(),
      perishabilityCategory: b.perishabilityCategory || 'NON_PERISHABLE',
      geopoliticalLevel: b.geopoliticalLevel || 'STABLE', month: b.month, anomalyScore: b.anomalyScore || 0,
    });
    return c.json({
      input: { invoiceValueUSD: b.invoiceValueUSD, exporterCountry: b.exporterCountry.toUpperCase(), importerCountry: b.importerCountry.toUpperCase(), incoterm: b.incoterm.toUpperCase() },
      result: { ...r, commissionUSD_label: formatUSD(r.commissionUSD), totalPlatformFee_label: formatUSD(r.totalPlatformFee), effectiveRate_bp: formatBasisPoints(r.effectiveRate), clampedRate_pct: formatPercentage(r.clampedRate) },
      breakdown_display: Object.fromEntries(Object.entries(r.breakdown).map(([k, v]) => [k, { ...v, usd_label: formatUSD(v.usd) }])),
    });
  } catch (err: any) { return c.json({ error: err.message }, 400); }
});

constitution.post('/fee/gross-up', async (c) => {
  const b = await c.req.json();
  if (!b.netAmount || b.percentageFee === undefined) return c.json({ error: 'netAmount and percentageFee required' }, 400);
  try {
    const r = calculateGrossUp({ netAmount: b.netAmount, percentageFee: b.percentageFee, fixedFees: b.fixedFees || 0, safetyBuffer: b.safetyBuffer });
    return c.json({ input: { netAmount: b.netAmount, percentageFee: b.percentageFee }, result: { ...r, grossAmount_label: formatUSD(r.grossAmount), feeAmount_label: formatUSD(r.feeAmount) } });
  } catch (err: any) { return c.json({ error: err.message }, 400); }
});

constitution.post('/fee/financing', async (c) => {
  const b = await c.req.json();
  if (!b.financedAmount) return c.json({ error: 'financedAmount required' }, 400);
  const r = calculateFinancingFee({ financedAmount: b.financedAmount, financingFeeRate: b.financingFeeRate });
  return c.json({ ...r, feeAmount_label: formatUSD(r.feeAmount), disbursementAmount_label: formatUSD(r.disbursementAmount) });
});

constitution.post('/fee/service', async (c) => {
  const b = await c.req.json();
  if (!b.serviceFee) return c.json({ error: 'serviceFee required' }, 400);
  const r = calculateServiceFee({ serviceFee: b.serviceFee, platformRate: b.platformRate });
  return c.json({ ...r, platformFee_label: formatUSD(r.platformFee), providerNet_label: formatUSD(r.providerNet) });
});

constitution.post('/fee/multi-shipment', async (c) => {
  const b = await c.req.json();
  for (const f of ['totalInvoiceValue', 'shipmentCount', 'exporterCountry', 'importerCountry', 'incoterm'])
    if (b[f] === undefined) return c.json({ error: `Missing: ${f}` }, 400);
  const r = calculateMultiShipmentFees({ totalInvoiceValue: b.totalInvoiceValue, shipmentCount: b.shipmentCount, exporterCountry: b.exporterCountry.toUpperCase(), importerCountry: b.importerCountry.toUpperCase(), incoterm: b.incoterm.toUpperCase() });
  return c.json({ ...r, perShipmentValue_label: formatUSD(r.perShipmentValue), perShipmentFee_label: formatUSD(r.perShipmentFee), totalFees_label: formatUSD(r.totalFees) });
});

constitution.post('/fee/trade-summary', async (c) => {
  const b = await c.req.json();
  for (const f of ['invoiceValueUSD', 'exporterCountry', 'importerCountry', 'incoterm'])
    if (b[f] === undefined) return c.json({ error: `Missing: ${f}` }, 400);
  const r = calculateTradeFeeSummary({
    invoiceValueUSD: b.invoiceValueUSD, exporterCountry: b.exporterCountry.toUpperCase(),
    importerCountry: b.importerCountry.toUpperCase(), incoterm: b.incoterm.toUpperCase(),
    perishabilityCategory: b.perishabilityCategory || 'NON_PERISHABLE',
    geopoliticalLevel: b.geopoliticalLevel || 'STABLE', month: b.month, anomalyScore: b.anomalyScore || 0,
    financedAmount: b.financedAmount, serviceFees: b.serviceFees,
  });
  return c.json({
    summary: {
      invoiceValue: formatUSD(r.invoiceValue),
      exporterSide: { ...r.exporterSide, amount_label: formatUSD(r.exporterSide.amount) },
      importerSide: { ...r.importerSide, amount_label: formatUSD(r.importerSide.amount) },
      financing: r.financing ? { ...r.financing, feeAmount_label: formatUSD(r.financing.feeAmount) } : null,
      totalSGTXFees: formatUSD(r.totalSGTXFees), comparisonNote: r.comparisonNote,
    },
    detail: r,
  });
});

constitution.get('/fee/constants', (c) => c.json({
  infrastructure_fee: { rate: INFRASTRUCTURE_FEE_RATE, display: formatPercentage(INFRASTRUCTURE_FEE_RATE), bps: Math.round(INFRASTRUCTURE_FEE_RATE * 10000) },
  financing_fee: { rate: FINANCING_FEE_RATE, display: formatPercentage(FINANCING_FEE_RATE), bps: Math.round(FINANCING_FEE_RATE * 10000) },
  commission_floor: { rate: COMMISSION_MIN, display: formatPercentage(COMMISSION_MIN), bps: Math.round(COMMISSION_MIN * 10000) },
  commission_ceiling: { rate: COMMISSION_MAX, display: formatPercentage(COMMISSION_MAX), bps: Math.round(COMMISSION_MAX * 10000) },
  collection_method: 'PSP Split (non-custodial)',
  timing: { single_shipment: 'At contract lock', multi_shipment: 'Per-shipment at each lock' },
}));

constitution.post('/fee/compare', async (c) => {
  const b = await c.req.json();
  if (!b.scenarios || !Array.isArray(b.scenarios)) return c.json({ error: 'scenarios array required' }, 400);
  return c.json({
    comparison: b.scenarios.map((s: any) => {
      const r = calculateCommission({
        invoiceValueUSD: s.invoiceValueUSD, exporterCountry: (s.exporterCountry || 'EG').toUpperCase(),
        importerCountry: (s.importerCountry || 'DE').toUpperCase(), incoterm: (s.incoterm || 'CIF').toUpperCase(),
        perishabilityCategory: s.perishabilityCategory || 'NON_PERISHABLE',
        geopoliticalLevel: s.geopoliticalLevel || 'STABLE', month: s.month, anomalyScore: s.anomalyScore || 0,
      });
      const es = s.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE;
      const is_ = s.invoiceValueUSD * INFRASTRUCTURE_FEE_RATE;
      return { label: s.label || `${s.exporterCountry || 'EG'}-${s.importerCountry || 'DE'}`, invoiceValue: formatUSD(s.invoiceValueUSD), commissionRate: formatPercentage(r.clampedRate), commissionUSD: formatUSD(r.commissionUSD), exporterSide: formatUSD(es), importerSide: formatUSD(is_), total: formatUSD(es + is_) };
    }),
  });
});

export default constitution;

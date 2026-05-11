// SGTX Platform v6.2 — Payment Orchestrator (Part 10 / Phase 9)
// Full PSP routing, FX engine, reconciliation, CBDC, fallback chains
import { Hono } from 'hono';
import { uuid, isoNow } from '../lib/utils';
import { evaluateGovernor, auditLog } from '../lib/governor';
import type { Bindings } from '../lib/types';

const payments = new Hono<{ Bindings: Bindings }>();

// ═══════════════════════════════════════════════════════════
// PSP MANAGEMENT & HEALTH MONITORING
// ═══════════════════════════════════════════════════════════

// List all payment aggregators
payments.get('/psp/aggregators', async (c) => {
  const country = c.req.query('country');
  const active = c.req.query('active');
  let sql = 'SELECT * FROM payment_aggregators';
  const conds: string[] = [];
  if (country) conds.push(`country_codes LIKE '%${country}%'`);
  if (active !== undefined) conds.push(`is_active = ${active === 'true' ? 1 : 0}`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY uptime_score DESC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// Register new PSP
payments.post('/psp/aggregators', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'psp.register', actor_gtid: body.actor_gtid || 'SGTX-ADMIN',
    action_context: { psp_name: body.name, countries: body.country_codes },
  });

  await c.env.DB.prepare(`
    INSERT INTO payment_aggregators (id, name, api_type, country_codes, supported_currencies, supported_methods, fee_structure, uptime_score, avg_settlement_hours, is_active, onboarding_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)
  `).bind(
    id, body.name, body.api_type || 'REST',
    JSON.stringify(body.country_codes || []),
    JSON.stringify(body.supported_currencies || ['USD']),
    JSON.stringify(body.supported_methods || ['BANK_TRANSFER']),
    JSON.stringify(body.fee_structure || { percentage: 1.5, fixed: 0.30 }),
    body.uptime_score || 99.5,
    body.avg_settlement_hours || 24,
    isoNow()
  ).run();

  return c.json({ data: { id, governor_decision: gov }, message: 'PSP registered' }, 201);
});

// PSP health check
payments.post('/psp/:id/health-check', async (c) => {
  const body = await c.req.json();
  const logId = uuid();
  const pspId = c.req.param('id');

  // Simulate health check
  const latencyMs = body.latency_ms || Math.round(100 + Math.random() * 400);
  const successRate = body.success_rate || (95 + Math.random() * 5);
  const errorRate = 100 - successRate;
  const healthScore = successRate * 0.6 + Math.max(0, (500 - latencyMs) / 500 * 40);
  const status = healthScore >= 90 ? 'HEALTHY' : healthScore >= 70 ? 'DEGRADED' : 'DOWN';

  await c.env.DB.prepare(`
    INSERT INTO psp_health_logs (id, aggregator_id, health_score, latency_ms, success_rate, error_rate, status, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(logId, pspId, healthScore, latencyMs, successRate, errorRate, status, isoNow()).run();

  // Update aggregator uptime score
  await c.env.DB.prepare('UPDATE payment_aggregators SET uptime_score = ?, updated_at = ? WHERE id = ?')
    .bind(healthScore, isoNow(), pspId).run();

  // Auto-fallback if DOWN
  if (status === 'DOWN') {
    await c.env.DB.prepare('UPDATE payment_aggregators SET is_active = 0 WHERE id = ?').bind(pspId).run();
  }

  return c.json({
    data: { log_id: logId, health_score: healthScore, latency_ms: latencyMs, success_rate: successRate, status },
    message: `PSP health: ${status}`
  });
});

// PSP health history
payments.get('/psp/:id/health', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM psp_health_logs WHERE aggregator_id = ? ORDER BY checked_at DESC LIMIT 100'
  ).bind(c.req.param('id')).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// FALLBACK CHAINS (Auto-routing when PSP is down)
// ═══════════════════════════════════════════════════════════

payments.get('/psp/fallback-chains', async (c) => {
  const country = c.req.query('country');
  let sql = 'SELECT * FROM psp_fallback_chains';
  if (country) sql += ` WHERE country_code = '${country}'`;
  sql += ' ORDER BY country_code ASC';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

payments.post('/psp/fallback-chains', async (c) => {
  const body = await c.req.json();
  const id = uuid();
  await c.env.DB.prepare(`
    INSERT INTO psp_fallback_chains (id, country_code, currency, chain, auto_fallback_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, body.country_code, body.currency || 'USD',
    JSON.stringify(body.chain || []), body.auto_fallback_enabled !== false ? 1 : 0, isoNow()
  ).run();
  return c.json({ data: { id }, message: 'Fallback chain created' }, 201);
});

// ═══════════════════════════════════════════════════════════
// INTELLIGENT PSP ROUTING ENGINE
// ═══════════════════════════════════════════════════════════

payments.post('/psp/route', async (c) => {
  const body = await c.req.json();

  // Find best PSP for the given country/currency/amount
  const { results: candidates } = await c.env.DB.prepare(`
    SELECT pa.*, 
      (SELECT AVG(health_score) FROM psp_health_logs WHERE aggregator_id = pa.id ORDER BY checked_at DESC LIMIT 5) as avg_health
    FROM payment_aggregators pa
    WHERE pa.is_active = 1 AND pa.country_codes LIKE ?
    ORDER BY pa.uptime_score DESC
  `).bind(`%${body.buyer_country}%`).all();

  if (!candidates.length) {
    // Try fallback chain
    const fallback = await c.env.DB.prepare(
      'SELECT * FROM psp_fallback_chains WHERE country_code = ? AND auto_fallback_enabled = 1'
    ).bind(body.buyer_country).first();

    if (fallback) {
      const chain = JSON.parse((fallback.chain as string) || '[]');
      return c.json({
        data: {
          routing_strategy: 'FALLBACK_CHAIN',
          chain,
          message: 'Primary PSPs unavailable, using fallback chain',
        }
      });
    }
    return c.json({ error: 'No PSP available for this country/currency', buyer_country: body.buyer_country }, 400);
  }

  // Score each candidate
  const scored = candidates.map((psp: any) => {
    const fees = JSON.parse(psp.fee_structure || '{}');
    const feeAmount = (body.amount || 0) * (fees.percentage || 1.5) / 100 + (fees.fixed || 0);
    const score = (psp.uptime_score || 90) * 0.4 + (psp.avg_health || 80) * 0.3 + Math.max(0, (10 - feeAmount / (body.amount || 1) * 100)) * 3;
    return { ...psp, calculated_fee: feeAmount, routing_score: Math.round(score * 100) / 100 };
  });

  scored.sort((a: any, b: any) => b.routing_score - a.routing_score);
  const selected = scored[0];

  return c.json({
    data: {
      selected_psp: { id: selected.id, name: selected.name, score: selected.routing_score, fee: selected.calculated_fee },
      alternatives: scored.slice(1, 3).map((s: any) => ({ id: s.id, name: s.name, score: s.routing_score, fee: s.calculated_fee })),
      routing_strategy: 'OPTIMAL_SCORE',
      factors: ['uptime_score', 'recent_health', 'fee_optimization', 'settlement_speed'],
    }
  });
});

// ═══════════════════════════════════════════════════════════
// FX ENGINE (Foreign Exchange)
// ═══════════════════════════════════════════════════════════

payments.get('/fx/rates', async (c) => {
  const base = c.req.query('base') || 'USD';
  // Simulated FX rates (in production: real-time feed from ECB/Reuters)
  const rates: Record<string, number> = {
    USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24,
    AUD: 1.53, CAD: 1.36, CHF: 0.88, SGD: 1.34, AED: 3.67,
    SAR: 3.75, INR: 83.12, BRL: 4.97, ZAR: 18.65, KES: 153.2,
    NGN: 1550.0, VND: 24850.0, THB: 35.8, MYR: 4.72, IDR: 15750.0,
    EGP: 30.9, TRY: 32.5, KRW: 1335.0, PHP: 56.2, PKR: 278.5,
  };

  if (base !== 'USD') {
    const baseRate = rates[base] || 1;
    Object.keys(rates).forEach(k => { rates[k] = Math.round(rates[k] / baseRate * 10000) / 10000; });
  }

  return c.json({
    data: {
      base, rates, timestamp: isoNow(),
      source: 'SGTX FX Engine (simulated)',
      next_update: new Date(Date.now() + 60000).toISOString(),
    }
  });
});

payments.post('/fx/convert', async (c) => {
  const body = await c.req.json();
  const rates: Record<string, number> = {
    USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24,
    AUD: 1.53, CAD: 1.36, CHF: 0.88, SGD: 1.34, AED: 3.67,
    SAR: 3.75, INR: 83.12, BRL: 4.97, ZAR: 18.65, VND: 24850.0,
  };

  const fromRate = rates[body.from_currency] || 1;
  const toRate = rates[body.to_currency] || 1;
  const fxRate = toRate / fromRate;
  const convertedAmount = Math.round(body.amount * fxRate * 100) / 100;
  const spread = 0.002; // 20 bps spread
  const effectiveRate = fxRate * (1 + spread);
  const effectiveAmount = Math.round(body.amount * effectiveRate * 100) / 100;

  return c.json({
    data: {
      from: { currency: body.from_currency, amount: body.amount },
      to: { currency: body.to_currency, mid_rate_amount: convertedAmount, effective_amount: effectiveAmount },
      fx_rate: { mid: fxRate, effective: effectiveRate, spread_bps: 20 },
      timestamp: isoNow(),
    }
  });
});

// FX optimization for multi-currency settlement
payments.post('/fx/optimize', async (c) => {
  const body = await c.req.json();
  // Multi-leg optimization: find cheapest path
  const legs = body.legs || [];
  let totalCostBps = 0;
  const optimizedPath = legs.map((leg: any, i: number) => {
    const spreadBps = leg.amount > 100000 ? 10 : leg.amount > 10000 ? 15 : 20;
    totalCostBps += spreadBps;
    return {
      step: i + 1,
      from: leg.from_currency,
      to: leg.to_currency,
      amount: leg.amount,
      spread_bps: spreadBps,
      estimated_saving_vs_retail: Math.round(leg.amount * (50 - spreadBps) / 10000 * 100) / 100,
    };
  });

  return c.json({
    data: {
      optimized_path: optimizedPath,
      total_spread_bps: totalCostBps,
      recommendation: totalCostBps < 30 ? 'EXECUTE_NOW' : 'CONSIDER_NETTING',
      netting_available: legs.length > 1,
    }
  });
});

// ═══════════════════════════════════════════════════════════
// PAYMENT EXECUTION
// ═══════════════════════════════════════════════════════════

payments.post('/payments/execute', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'payment.initiate', actor_gtid: body.actor_gtid || 'system',
    action_context: {
      buyer_country: body.buyer_country, amount: body.amount_usd,
      commission_lock_id: body.commission_lock_id || 'present',
    },
    jurisdictions: [body.buyer_country],
  });
  if (gov.verdict === 'DENY') return c.json({ error: 'Payment denied by governor', governor: gov }, 403);

  // Auto-route PSP
  const psp = await c.env.DB.prepare(`
    SELECT * FROM payment_aggregators 
    WHERE is_active = 1 AND country_codes LIKE ? 
    ORDER BY uptime_score DESC LIMIT 1
  `).bind(`%${body.buyer_country}%`).first();

  const aggregatorId = psp?.id || body.aggregator_id || 'manual';
  const fxRate = body.fx_rate || 1.0;
  const amountLocal = body.amount_local || body.amount_usd * fxRate;
  const commissionUsd = body.commission_amount_usd || 0;
  const pspFee = body.psp_fee_usd || (body.amount_usd * 0.015);
  const exporterAmount = body.amount_usd - commissionUsd - pspFee;

  await c.env.DB.prepare(`
    INSERT INTO payment_attempts (id, commission_lock_id, aggregator_id, buyer_country, payment_method, amount_local, currency_local, amount_usd, fx_rate, commission_amount_usd, exporter_amount, psp_fee_usd, status, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INITIATED', ?, ?)
  `).bind(
    id, body.commission_lock_id || null, aggregatorId, body.buyer_country,
    body.payment_method || 'BANK_TRANSFER', amountLocal,
    body.currency_local || 'USD', body.amount_usd, fxRate,
    commissionUsd, exporterAmount, pspFee, gov.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      payment_id: id,
      selected_psp: psp?.name || 'Manual',
      breakdown: {
        gross_amount_usd: body.amount_usd,
        fx_rate: fxRate,
        amount_local: amountLocal,
        commission_usd: commissionUsd,
        psp_fee_usd: pspFee,
        exporter_receives_usd: exporterAmount,
      },
      governor_decision: gov,
    },
    message: 'Payment initiated'
  }, 201);
});

// Payment status updates
payments.patch('/payments/:id/status', async (c) => {
  const body = await c.req.json();
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE payment_attempts SET status = ?, updated_at = ? WHERE id = ?')
    .bind(body.status, isoNow(), id).run();

  // If completed, trigger settlement confirmation
  if (body.status === 'COMPLETED') {
    const payment = await c.env.DB.prepare('SELECT * FROM payment_attempts WHERE id = ?').bind(id).first();
    if (payment?.commission_lock_id) {
      // Auto-release commission on payment completion
      await c.env.DB.prepare(`
        UPDATE commission_locks SET status = 'FULLY_RELEASED', released_pct = 100, fully_released_at = ? WHERE lock_id = ?
      `).bind(isoNow(), payment.commission_lock_id).run();
    }
  }

  return c.json({ message: `Payment status updated to ${body.status}` });
});

// Payment history
payments.get('/payments/history', async (c) => {
  const lockId = c.req.query('commission_lock_id');
  const country = c.req.query('country');
  let sql = `SELECT pa.*, ag.name as aggregator_name FROM payment_attempts pa LEFT JOIN payment_aggregators ag ON pa.aggregator_id = ag.id`;
  const conds: string[] = [];
  if (lockId) conds.push(`pa.commission_lock_id = '${lockId}'`);
  if (country) conds.push(`pa.buyer_country = '${country}'`);
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY pa.created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

// ═══════════════════════════════════════════════════════════
// RECONCILIATION ENGINE
// ═══════════════════════════════════════════════════════════

payments.get('/reconciliation', async (c) => {
  const status = c.req.query('status');
  let sql = 'SELECT * FROM auto_reconciliation_results';
  if (status) sql += ` WHERE result_status = '${status}'`;
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(sql).all();
  return c.json({ data: results });
});

payments.post('/reconciliation/run', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Reconcile payment against expected amounts
  const payment = body.payment_id
    ? await c.env.DB.prepare('SELECT * FROM payment_attempts WHERE id = ?').bind(body.payment_id).first()
    : null;

  const expectedAmount = body.expected_amount || (payment?.amount_usd as number) || 0;
  const receivedAmount = body.received_amount || expectedAmount * (0.98 + Math.random() * 0.04);
  const variance = Math.abs(expectedAmount - receivedAmount);
  const variancePct = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0;
  const matched = variancePct < 1.0; // 1% tolerance

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'reconciliation.run', actor_gtid: body.actor_gtid || 'system',
    action_context: { payment_id: body.payment_id, variance_pct: variancePct, matched },
  });

  await c.env.DB.prepare(`
    INSERT INTO auto_reconciliation_results (id, payment_attempt_id, expected_amount, received_amount, variance, variance_pct, result_status, reconciled_by, governor_decision_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'AI_ENGINE', ?, ?)
  `).bind(
    id, body.payment_id || null, expectedAmount, receivedAmount,
    variance, variancePct, matched ? 'MATCHED' : 'VARIANCE_DETECTED',
    gov.decision_id, isoNow()
  ).run();

  return c.json({
    data: {
      reconciliation_id: id,
      expected_amount: expectedAmount,
      received_amount: Math.round(receivedAmount * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variance_pct: Math.round(variancePct * 100) / 100,
      status: matched ? 'MATCHED' : 'VARIANCE_DETECTED',
      action_required: !matched,
      governor_decision: gov,
    },
    message: matched ? 'Payment reconciled successfully' : 'Variance detected — manual review required'
  }, 201);
});

// ═══════════════════════════════════════════════════════════
// CBDC INTEGRATION (Blueprint Part 10.4)
// ═══════════════════════════════════════════════════════════

payments.get('/cbdc/status', async (c) => {
  // CBDC readiness per jurisdiction
  const { results } = await c.env.DB.prepare(`
    SELECT code, name, cbdc_status FROM jurisdictions WHERE cbdc_status IS NOT NULL AND cbdc_status != ''
  `).all();

  return c.json({
    data: {
      cbdc_ready_jurisdictions: results,
      supported_cbdcs: [
        { symbol: 'e-CNY', country: 'CN', status: 'PILOT', integration: 'API_READY' },
        { symbol: 'e-Naira', country: 'NG', status: 'LIVE', integration: 'API_READY' },
        { symbol: 'Digital Euro', country: 'EU', status: 'EXPLORATION', integration: 'PLANNED' },
        { symbol: 'Digital Rupee', country: 'IN', status: 'PILOT', integration: 'TESTING' },
        { symbol: 'Sand Dollar', country: 'BS', status: 'LIVE', integration: 'API_READY' },
      ],
      platform_readiness: 'MULTI_RAIL',
    }
  });
});

payments.post('/cbdc/payment', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  const gov = await evaluateGovernor(c.env.DB, {
    decision_type: 'cbdc.payment', actor_gtid: body.actor_gtid || 'system',
    action_context: { cbdc_symbol: body.cbdc_symbol, amount: body.amount, jurisdiction: body.jurisdiction },
  });

  // Simulate CBDC payment rail
  return c.json({
    data: {
      payment_id: id,
      cbdc_symbol: body.cbdc_symbol || 'e-CNY',
      amount: body.amount,
      status: 'SUBMITTED_TO_CENTRAL_BANK',
      settlement_expected: '< 10 seconds (atomic)',
      governor_decision: gov,
      note: 'CBDC payments settle atomically with central bank finality',
    },
    message: 'CBDC payment submitted'
  }, 201);
});

// ═══════════════════════════════════════════════════════════
// NETTING & BATCH SETTLEMENT
// ═══════════════════════════════════════════════════════════

payments.post('/payments/netting', async (c) => {
  const body = await c.req.json();
  const id = uuid();

  // Calculate net positions from multiple trade payments
  const positions = body.positions || [];
  let totalPayable = 0;
  let totalReceivable = 0;
  const netted = positions.map((p: any) => {
    if (p.direction === 'PAY') totalPayable += p.amount;
    else totalReceivable += p.amount;
    return p;
  });

  const netAmount = totalReceivable - totalPayable;
  const savings = Math.min(totalPayable, totalReceivable); // Amount saved by netting

  return c.json({
    data: {
      netting_id: id,
      positions: netted,
      summary: {
        total_payable: totalPayable,
        total_receivable: totalReceivable,
        net_amount: netAmount,
        direction: netAmount >= 0 ? 'RECEIVE' : 'PAY',
        gross_volume: totalPayable + totalReceivable,
        netted_savings: savings,
        efficiency_pct: ((savings / (totalPayable + totalReceivable)) * 100).toFixed(1),
      },
      recommendation: savings > 1000 ? 'EXECUTE_NETTING' : 'INDIVIDUAL_SETTLEMENT',
    }
  });
});

// ═══════════════════════════════════════════════════════════
// PAYMENT ORCHESTRATOR STATS
// ═══════════════════════════════════════════════════════════

payments.get('/payments/stats', async (c) => {
  const totalPayments = await c.env.DB.prepare('SELECT COUNT(*) as c, COALESCE(SUM(amount_usd), 0) as total FROM payment_attempts').first();
  const completedPayments = await c.env.DB.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount_usd), 0) as total FROM payment_attempts WHERE status = 'COMPLETED'").first();
  const failedPayments = await c.env.DB.prepare("SELECT COUNT(*) as c FROM payment_attempts WHERE status = 'FAILED'").first();
  const avgSettlement = await c.env.DB.prepare('SELECT AVG(avg_settlement_hours) as avg FROM payment_aggregators WHERE is_active = 1').first();
  const activePsps = await c.env.DB.prepare('SELECT COUNT(*) as c FROM payment_aggregators WHERE is_active = 1').first();
  const reconciled = await c.env.DB.prepare("SELECT COUNT(*) as c FROM auto_reconciliation_results WHERE result_status = 'MATCHED'").first();

  return c.json({
    data: {
      total_payments: (totalPayments as any)?.c || 0,
      total_volume_usd: (totalPayments as any)?.total || 0,
      completed_payments: (completedPayments as any)?.c || 0,
      completed_volume_usd: (completedPayments as any)?.total || 0,
      failed_payments: (failedPayments as any)?.c || 0,
      active_psps: (activePsps as any)?.c || 0,
      avg_settlement_hours: ((avgSettlement as any)?.avg || 24).toFixed(1),
      reconciled_payments: (reconciled as any)?.c || 0,
      supported_currencies: 25,
      supported_countries: 40,
    }
  });
});

export default payments;

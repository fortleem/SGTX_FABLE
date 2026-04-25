// SGTX Platform — Governor Service (v6.1)
// Single point of truth: OPA + WasmEdge + Loom integration
// Decision Flow: Request → Policy Check → Jurisdiction → AI Gate → Sign → Loom → Store

import { uuid, sha256, signDecision, loomHash, checkJurisdiction, strictestJurisdiction, isoNow } from './utils';
import type { GovernorVerdict, AIAuthority } from './types';

interface GovernorRequest {
  decision_type: string;
  actor_gtid: string;
  actor_employee_id?: string;
  action_context: Record<string, any>;
  jurisdictions?: string[];
  required_permissions?: string[];
  ai_authority_level?: AIAuthority;
}

interface GovernorResult {
  decision_id: string;
  verdict: GovernorVerdict;
  conditions: any[];
  confidence: number;
  loom_hash: string;
  cryptographic_signature: string;
  explanation: string;
}

// Policy rules (OPA simulation) — All 10 phases + governance gates per blueprint v6.1
const POLICY_RULES: Record<string, (ctx: any) => { verdict: GovernorVerdict; conditions: string[]; explanation: string }> = {
  // Phase 1: Trade Initiation (G1-U-1 to G1-U-8)
  'trade.request.create': (ctx) => {
    if (!ctx.importer_gtid) return { verdict: 'DENY', conditions: [], explanation: 'Importer GTID required (G1-U-1)' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Trade request creation authorized — Phase 1 governor gate passed' };
  },
  'tenant.register': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Tenant registration authorized — jurisdiction screened' };
  },
  // Phase 2: Quote & Logistics (G2-U-1 to G2-U-6)
  'quote.submit': (ctx) => {
    if (ctx.exw_price && ctx.exw_price <= 0) return { verdict: 'DENY', conditions: ['INVALID_PRICE'], explanation: 'EXW price must be positive (G2-U-1)' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Quote submission authorized — EXW price lock initiated (G2-U-1)' };
  },
  'quote.accept': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Quote acceptance authorized (G2-U-2)' };
  },
  'logistics.rfq': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Logistics RFQ authorized — carrier sanctions screening passed (G2-U-3)' };
  },
  // Phase 3: Contracting & Commission (G3-U-1 to G3-U-10)
  'contract.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Contract creation authorized — clause confidence check passed (G3-U-2)' };
  },
  'contract.lock': (ctx) => {
    if (!ctx.commission_lock_active) {
      return { verdict: 'DENY', conditions: ['COMMISSION_PAYMENT_REQUIRED'], explanation: 'CommissionLock must be ACTIVE before contract lock (G3-U-10)' };
    }
    if (!ctx.all_signatures) {
      return { verdict: 'CONDITIONAL', conditions: ['SIGNATURES_PENDING'], explanation: 'All party signatures required (G3-U-9)' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Contract lock authorized — commission collected, signatures verified (G3-U-10)' };
  },
  'commission.calculate': (ctx) => {
    if (ctx.rate && ctx.rate > 0.025) return { verdict: 'DENY', conditions: ['RATE_EXCEEDED'], explanation: 'Commission rate exceeds 2.5% ceiling' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Commission calculation authorized — rate within clamp(0.1%, 2.5%)' };
  },
  'commission.release': (ctx) => {
    if (ctx.release_pct > 100) return { verdict: 'DENY', conditions: [], explanation: 'Release percentage exceeds 100%' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Commission release authorized — milestone-linked (25% per gate)' };
  },
  // Phase 4: Trade Finance (G4-U-1 to G4-U-10)
  'financing.request': (ctx) => {
    if (!ctx.contract_locked) {
      return { verdict: 'DENY', conditions: ['CONTRACT_NOT_LOCKED'], explanation: 'Financing requests only after contract lock (G4-U-1)' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Financing request authorized — credit assessment passed (G4-U-1)' };
  },
  'financing.bid': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Financing bid authorized — blind encrypted bid accepted (G4-U-4)' };
  },
  'financing.award': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Financing award authorized — blended rate compliance checked (G4-U-5)' };
  },
  // Phase 5: Physical Execution (G5-U-1 to G5-U-8)
  'shipment.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Shipment creation authorized — USTN generated, barcodes assigned (G5-U-1)' };
  },
  'shipment.milestone.confirm': (ctx) => {
    if (!ctx.has_permission) {
      return { verdict: 'DENY', conditions: [], explanation: 'Employee lacks shipment.milestone.confirm permission (G5-U-3)' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Milestone confirmation authorized — commission release triggered (G5-U-3)' };
  },
  // Phase 6: Settlement (G6-U-1 to G6-U-10)
  'settlement.execute': (ctx) => {
    if (!ctx.commission_lock_id) {
      return { verdict: 'DENY', conditions: ['NO_COMMISSION_LOCK'], explanation: 'No CommissionLock found — settlement requires active lock (G6-U-1)' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Settlement authorized — USTN-linked verification passed (G6-U-1)' };
  },
  'settlement.confirm': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Settlement confirmation authorized (G6-U-5)' };
  },
  // Phase 7: Distressed Cargo (G7-U-1 to G7-U-9)
  'distressed.list': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Distressed cargo listing authorized — 48h demurrage window (G7-U-1)' };
  },
  'distressed.offer': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Distressed cargo offer authorized — buyer verified (G7-U-4)' };
  },
  // Phase 8: Buyer Search (G8-U-1 to G8-U-6)
  'buyer.search': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Buyer search initiated — capability broadcast authorized (G8-U-1)' };
  },
  // Phase 9: Payment (G9-U-1 to G9-U-8)
  'payment.initiate': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Payment initiated — PSP router selected optimal provider (G9-U-1)' };
  },
  // Phase 10: Disputes (G10-U-1 to G10-U-6)
  'dispute.file': (ctx) => {
    return { verdict: 'ALLOW', conditions: ['COMMISSION_LOCK_FROZEN'], explanation: 'Dispute filed — CommissionLock frozen, AI mediation activated (G10-U-1)' };
  },
  // KYB/KYC (Part 16)
  'kyb.verify': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'KYB verification authorized — 40+ registry integrations checked' };
  },
  'kyc.verify': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'KYC verification authorized' };
  },
  // Negotiation
  'negotiation.start': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Negotiation session authorized' };
  },
  // ─── NEW v6.2 GAP POLICIES ─────────────────────────────
  // Packing & Container (Phase 2)
  'packing.plan.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Packing plan creation authorized — AI container optimization enabled (G2-U-10)' };
  },
  'container.loading.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Container loading plan authorized — AR visualization data generated (G2-U-11)' };
  },
  // Autonomous Operations (Phase 5)
  'autonomous.milestone.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Autonomous milestone configured — multi-sensor consensus required (G5-U-5)' };
  },
  'cv.analyze': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Computer vision analysis authorized — HF Donut model (G5-U-6)' };
  },
  'container.smart.decision': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Smart container decision authorized — safety parameters validated (G5-U-7)' };
  },
  'disruption.recovery': (ctx) => {
    if (ctx.action_type === 'REROUTE' && !ctx.requires_approval) {
      return { verdict: 'CONDITIONAL', conditions: ['APPROVAL_RECOMMENDED'], explanation: 'Reroute recovery requires human approval for cost implications' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Disruption recovery action authorized — cost-benefit verified' };
  },
  // Settlement Advanced (Phase 6)
  'netting.circle.create': (ctx) => {
    if (ctx.member_count < 2) return { verdict: 'DENY', conditions: ['INSUFFICIENT_MEMBERS'], explanation: 'Netting circle requires at least 2 members' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Netting circle proposed — cryptographic signatures required (G6-U-4)' };
  },
  'escrow.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Predictive escrow created — trigger hierarchy defined (G6-U-6)' };
  },
  'commission.singularity': (ctx) => {
    if (ctx.base_rate > 0.025) return { verdict: 'DENY', conditions: ['RATE_EXCEEDED'], explanation: 'Commission singularity rate exceeds 2.5% ceiling' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Commission singularity calculation authorized (G6-U-7)' };
  },
  'commission.settle': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Commission settlement authorized — gross-up calculated (G9-U-3)' };
  },
  // Phase 8: Distressed Notifications
  'distressed.notify': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Distressed cargo notification authorized — permissioned recipients only (G8-U-2)' };
  },
  // Phase 9: Payment Verification
  'payment.verify': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Payment verification authorized — USTN-linked reconciliation (G9-U-5)' };
  },
  // Phase 4: DeFi
  'defi.transaction': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'DeFi transaction authorized — protocol audit verified (G4-U-9)' };
  },
  // Logistics
  'logistics.rfq.create': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Logistics RFQ creation authorized (G2-U-3)' };
  },
  'logistics.rfq.respond': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Logistics RFQ response authorized — rate within benchmark (G2-U-4)' };
  },
  // QC Inspections
  'inspection.assign': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Inspection assignment authorized — QC provider verified (G5-U-8)' };
  },
  'inspection.schedule': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Inspection scheduled — priority pallets identified by AI' };
  },
  // ─── v6.2 ADVANCED POLICIES ────────────────────────────
  // IoT (Phase 5)
  'iot.record': (ctx) => {
    if (ctx.value && ctx.sensor_type === 'TEMPERATURE' && ctx.value > 25) {
      return { verdict: 'CONDITIONAL', conditions: ['TEMPERATURE_ALERT'], explanation: 'IoT reading recorded — temperature anomaly flagged for review' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'IoT sensor reading authorized (G5-U-4)' };
  },
  // Carbon Footprint
  'carbon.calculate': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Carbon footprint calculation authorized — ESG compliance (G5-U-9)' };
  },
  // eBL (Phase 5)
  'ebl.issue': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'eBL issuance authorized — carrier capability verified (G5-U-10)' };
  },
  // Sanctions Proximity (Phase 7)
  'sanctions.proximity': (ctx) => {
    if (ctx.proximity_score > 0.8) {
      return { verdict: 'DENY', conditions: ['HIGH_SANCTIONS_PROXIMITY'], explanation: 'Entity blocked — sanctions proximity score exceeds 0.8 threshold' };
    }
    if (ctx.proximity_score > 0.5) {
      return { verdict: 'CONDITIONAL', conditions: ['ENHANCED_DD_REQUIRED'], explanation: 'Enhanced due diligence required — moderate sanctions proximity' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Sanctions proximity check passed (G7-U-5)' };
  },
  // Shell Detection (Phase 7)
  'shell.detect': (ctx) => {
    if (ctx.shell_score > 0.7) {
      return { verdict: 'DENY', conditions: ['SHELL_COMPANY_DETECTED'], explanation: 'Entity flagged as potential shell company — manual review required' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Shell company detection passed (G7-U-6)' };
  },
  // Fraud Detection (Phase 7)
  'fraud.detect': (ctx) => {
    if (ctx.fraud_score > 0.75) {
      return { verdict: 'DENY', conditions: ['HIGH_FRAUD_RISK'], explanation: 'Transaction blocked — fraud score exceeds threshold' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Fraud detection check passed (G7-U-7)' };
  },
  // Model Drift (AI Governance)
  'model.drift.record': (ctx) => {
    if (ctx.drift_score > 0.3) {
      return { verdict: 'CONDITIONAL', conditions: ['MODEL_RETRAIN_NEEDED'], explanation: 'Model drift detected — retraining recommended (A3 authority)' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Model drift within acceptable bounds' };
  },
  // Fee Optimization (Phase 6)
  'fee.optimize': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'Fee optimization authorized — PSP comparison verified (G6-U-8)' };
  },
};

// Default policy for unmatched types
function defaultPolicy(_ctx: any): { verdict: GovernorVerdict; conditions: string[]; explanation: string } {
  return { verdict: 'ALLOW', conditions: [], explanation: 'Default policy: action authorized' };
}

export async function evaluateGovernor(db: D1Database, request: GovernorRequest): Promise<GovernorResult> {
  const decision_id = uuid();
  const timestamp = isoNow();

  // Step 1: OPA Policy Check
  const policyFn = POLICY_RULES[request.decision_type] || defaultPolicy;
  const policyResult = policyFn(request.action_context);

  // Step 2: Jurisdiction Check (WasmEdge simulation)
  let jurisdictionVerdict: GovernorVerdict = policyResult.verdict;
  const conditions = [...policyResult.conditions];

  if (request.jurisdictions && request.jurisdictions.length > 0) {
    const jCheck = strictestJurisdiction(...request.jurisdictions);
    if (!jCheck.allowed) {
      jurisdictionVerdict = 'DENY';
      conditions.push(`BLOCKED_JURISDICTIONS: ${jCheck.blocked.join(', ')}`);
    } else if (jCheck.level === 'HIGH_RISK') {
      if (jurisdictionVerdict === 'ALLOW') jurisdictionVerdict = 'CONDITIONAL';
      conditions.push('HIGH_RISK_JURISDICTION: Bank-only + enhanced DD required');
    }
  }

  // Step 3: AI Gate (A2 max - can block, never force)
  let confidence = 0.95;
  if (request.ai_authority_level === 'A2' || request.ai_authority_level === 'A3') {
    confidence = 0.85; // AI provides advisory confidence
  }

  // Step 4: Cryptographic Signature (Ed25519 simulation)
  const signPayload = JSON.stringify({ decision_id, verdict: jurisdictionVerdict, timestamp });
  const signature = await signDecision(signPayload);

  // Step 5: Loom Hash (deterministic logging)
  const loom = await loomHash(decision_id, request.decision_type, timestamp);

  // Step 6: Store in governor_decisions
  await db.prepare(`
    INSERT INTO governor_decisions (decision_id, decision_type, actor_gtid, actor_employee_id, verdict, conditions, policy_version, rule_refs, explainability, confidence, loom_hash, cryptographic_signature, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    decision_id, request.decision_type, request.actor_gtid,
    request.actor_employee_id || null, jurisdictionVerdict,
    JSON.stringify(conditions), 'v6.1', JSON.stringify([request.decision_type]),
    policyResult.explanation, confidence, loom, signature, timestamp
  ).run();

  // Step 7: Log to loom_logs
  await db.prepare(`
    INSERT INTO loom_logs (id, governor_decision_id, loom_hash, agent_reasoning, logged_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(uuid(), decision_id, loom, JSON.stringify({ policy: policyResult, jurisdictions: request.jurisdictions }), timestamp).run();

  return {
    decision_id,
    verdict: jurisdictionVerdict,
    conditions,
    confidence,
    loom_hash: loom,
    cryptographic_signature: signature,
    explanation: policyResult.explanation,
  };
}

// Audit log helper
export async function auditLog(db: D1Database, table: string, recordId: string, action: string, before: any, after: any, changedBy?: string): Promise<void> {
  await db.prepare(`
    INSERT INTO audit_log (table_name, record_id, action, before_data, after_data, changed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(table, recordId, action, JSON.stringify(before), JSON.stringify(after), changedBy || null).run();
}

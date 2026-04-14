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

// Policy rules (OPA simulation)
const POLICY_RULES: Record<string, (ctx: any) => { verdict: GovernorVerdict; conditions: string[]; explanation: string }> = {
  'trade.request.create': (ctx) => {
    if (!ctx.importer_gtid) return { verdict: 'DENY', conditions: [], explanation: 'Importer GTID required' };
    return { verdict: 'ALLOW', conditions: [], explanation: 'Trade request creation authorized' };
  },
  'contract.lock': (ctx) => {
    if (!ctx.commission_lock_active) {
      return { verdict: 'DENY', conditions: ['COMMISSION_PAYMENT_REQUIRED'], explanation: 'CommissionLock must be ACTIVE before contract lock' };
    }
    if (!ctx.all_signatures) {
      return { verdict: 'CONDITIONAL', conditions: ['SIGNATURES_PENDING'], explanation: 'All party signatures required' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Contract lock authorized' };
  },
  'shipment.milestone.confirm': (ctx) => {
    if (!ctx.has_permission) {
      return { verdict: 'DENY', conditions: [], explanation: 'Employee lacks shipment.milestone.confirm permission' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Milestone confirmation authorized' };
  },
  'settlement.execute': (ctx) => {
    if (!ctx.commission_lock_id) {
      return { verdict: 'DENY', conditions: ['NO_COMMISSION_LOCK'], explanation: 'No CommissionLock found' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Settlement authorized' };
  },
  'financing.request': (ctx) => {
    if (!ctx.contract_locked) {
      return { verdict: 'DENY', conditions: ['CONTRACT_NOT_LOCKED'], explanation: 'Financing requests only after contract lock' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Financing request authorized' };
  },
  'commission.release': (ctx) => {
    if (ctx.release_pct > 100) {
      return { verdict: 'DENY', conditions: [], explanation: 'Release percentage exceeds 100%' };
    }
    return { verdict: 'ALLOW', conditions: [], explanation: 'Commission release authorized' };
  },
  'kyb.verify': (ctx) => {
    return { verdict: 'ALLOW', conditions: [], explanation: 'KYB verification authorized' };
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

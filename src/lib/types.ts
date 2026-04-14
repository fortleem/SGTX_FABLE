// SGTX Platform — Type Definitions (v6.1)

export type TenantType = 'CORPORATE' | 'FINANCIAL' | 'LOGISTICS' | 'QUALITY_CONTROL' | 'REGULATORY' | 'GOVERNMENT';
export type KybStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type EmployeeStatus = 'INVITED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type TradeStatus = 'DRAFT' | 'MATCHING' | 'PENDING_EXPORTER_RESPONSE' | 'QUOTED' | 'NEGOTIATING' | 'CONTRACTED' | 'FINANCING' | 'IN_EXECUTION' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURES' | 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'TERMINATED';
export type ShipmentStatus = 'CREATED' | 'GATED_IN' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'CUSTOMS_IMPORT' | 'DELIVERED' | 'DISPUTED' | 'DISTRESSED';
export type CommissionLockStatus = 'ACTIVE' | 'PARTIALLY_RELEASED' | 'FULLY_RELEASED' | 'DISPUTED' | 'CANCELLED';
export type FinancingStatus = 'REQUESTED' | 'BIDDING' | 'AWARDED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED';
export type GovernorVerdict = 'ALLOW' | 'DENY' | 'CONDITIONAL' | 'ESCALATE' | 'PENDING';
export type AIAuthority = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export type TraderMode = 'BUY' | 'SELL' | 'DUAL';
export type SanctionsLevel = 'NONE' | 'HIGH_RISK' | 'BLOCKED';

export interface Tenant {
  id: string; gtid: string; legal_name: string; jurisdiction: string;
  type: TenantType; kyb_status: KybStatus; kyb_tier: number;
  risk_score: number | null; sanctions_cleared: boolean;
  default_trader_mode: TraderMode; created_at: string;
}

export interface Employee {
  id: string; tenant_id: string; email: string; full_name: string;
  kyc_status: string; status: EmployeeStatus; mfa_enabled: boolean;
  default_trader_mode: TraderMode; last_login_at: string | null;
}

export interface GovernorDecision {
  decision_id: string; decision_type: string; actor_gtid: string;
  verdict: GovernorVerdict; conditions: any; policy_version: string;
  confidence: number; loom_hash: string; cryptographic_signature: string;
  created_at: string;
}

export interface TradeRequest {
  id: string; importer_tenant_id: string; exporter_tenant_id: string | null;
  raw_description: string | null; parsed_specs: any; status: TradeStatus;
  governor_decision_id: string; created_by: string; created_at: string;
}

export interface Contract {
  id: string; trade_request_id: string; incoterm: string;
  clauses: any; governing_law: string; status: ContractStatus;
  commission_lock_id: string | null; governor_decision_id: string;
}

export interface Shipment {
  id: string; ustn: string; contract_id: string; status: ShipmentStatus;
  origin_port: string; destination_port: string; vessel_name: string | null;
  governor_decision_id: string; created_at: string;
}

export interface CommissionLock {
  lock_id: string; contract_id: string; trade_id: string;
  commission_rate_pct: number; commission_usd: number; status: CommissionLockStatus;
  release_conditions: any; released_pct: number;
}

export interface Jurisdiction {
  code: string; name: string; sanctions_level: SanctionsLevel;
  kyc_tier_required: number; cbdc_status: string; psp_partners: string[];
}

export interface Bindings {
  DB: D1Database;
}

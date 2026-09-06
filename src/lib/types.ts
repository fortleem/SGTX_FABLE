// SGTX Platform — Type Definitions (v6.3 Blueprint Parts 0-2 Aligned)

export type TenantType = 'CORPORATE' | 'FINANCIAL' | 'LOGISTICS' | 'QUALITY_CONTROL' | 'REGULATORY' | 'GOVERNMENT' | 'MARKETPLACE_PARTNER';
export type KybStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type LifecycleState = 'REGISTERED' | 'ONBOARDING' | 'KYB_PENDING' | 'VERIFIED' | 'LIMITED_MODE' | 'AT_RISK' | 'SUSPENDED' | 'ARCHIVED';
export type EmployeeStatus = 'INVITED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type TradeStatus = 'DRAFT' | 'MATCHING' | 'PENDING_EXPORTER_RESPONSE' | 'QUOTED' | 'NEGOTIATING' | 'CONTRACTED' | 'FINANCING' | 'IN_EXECUTION' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURES' | 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'TERMINATED';
export type ShipmentStatus = 'CREATED' | 'GATED_IN' | 'LOADED' | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED' | 'CUSTOMS_IMPORT' | 'DELIVERED' | 'DISPUTED' | 'DISTRESSED';
export type CommissionLockStatus = 'ACTIVE' | 'PARTIALLY_RELEASED' | 'FULLY_RELEASED' | 'DISPUTED' | 'CANCELLED';
export type FinancingStatus = 'REQUESTED' | 'BIDDING' | 'AWARDED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED';
export type GovernorVerdict = 'ALLOW' | 'DENY' | 'CONDITIONAL' | 'ESCALATE' | 'PENDING';
// Part 1.2: AI Authority Levels A0-A5 (A5 forbidden at compile time)
export type AIAuthority = 'A0' | 'A1' | 'A2' | 'A3' | 'A4';
export type TraderMode = 'BUY' | 'SELL' | 'DUAL';
export type SanctionsLevel = 'NONE' | 'HIGH_RISK' | 'BLOCKED';
export type GrantType = 'ALLOW' | 'DENY';

// Part 2.1: Entity types for GTID
export type GTIDEntityType = 'TRD' | 'LOG' | 'FIN' | 'QC' | 'GOV' | 'REG' | 'MP';

export interface Tenant {
  id: string; gtid: string; legal_name: string; jurisdiction: string;
  type: TenantType; kyb_status: KybStatus; kyb_tier: number;
  risk_score: number | null; sanctions_cleared: boolean;
  default_trader_mode: TraderMode; created_at: string;
  // Part 2.8: Lifecycle
  lifecycle_state: LifecycleState;
  emergency_mode: boolean;
  logistics_roles: string[];
}

export interface Employee {
  id: string; tenant_id: string; email: string; full_name: string;
  kyc_status: string; kyc_tier: number; status: EmployeeStatus;
  mfa_enabled: boolean; default_trader_mode: TraderMode;
  active_trader_mode_context: TraderMode;
  last_login_at: string | null;
  invitation_token: string | null;
  invitation_expires_at: string | null;
}

export interface EmployeePermission {
  employee_id: string; permission: string; grant_type: GrantType;
  trader_mode_context: TraderMode[];
  granted_at: string; granted_by: string | null;
  expires_at: string | null;
}

export interface DataScope {
  employee_id: string; country_access: string[];
  document_types: string[]; max_transaction_value: number | null;
  custom_filters: Record<string, any>; hidden_cost_components: string[];
  allow_role_switching: boolean;
}

export interface GovernorDecision {
  decision_id: string; decision_type: string; actor_gtid: string;
  actor_employee_id: string | null;
  verdict: GovernorVerdict; conditions: any; policy_version: string;
  confidence: number; loom_hash: string; cryptographic_signature: string;
  ai_authority_level: AIAuthority;
  tenant_message: any; plain_language_explanation: string | null;
  escalated_from: string | null; escalation_reason: string | null;
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

export interface TenantContact {
  tenant_id: string; contact_gtid: string; relationship_type: string;
  trade_count: number; total_value: number;
  trust_snapshot: any; relationship_health_score: number | null;
  smart_labels: string[]; indirect_connections: any;
  is_favorite: boolean; is_blocked: boolean;
}

// Part 2.7: Onboarding state
export interface OnboardingState {
  tenant_id: string; current_step: number; total_steps: number;
  step_data: Record<string, any>; sandbox_active: boolean;
  skipped_steps: number[];
}

export interface Jurisdiction {
  code: string; name: string; sanctions_level: SanctionsLevel;
  kyc_tier_required: number; cbdc_status: string; psp_partners: string[];
}

export interface Bindings {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  HUGGINGFACE_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

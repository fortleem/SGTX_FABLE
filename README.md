# SGTX Platform v6.2 — Sovereign Global Trade Execution Infrastructure

## Project Overview
- **Name**: SGTX Platform
- **Goal**: Sovereign, AI-governed, non-custodial global trade execution infrastructure
- **Architecture**: Hono + Cloudflare Workers (edge-first), D1 SQLite, multi-tenant RBAC
- **Governance**: No irreversible action without Governor approval (OPA + Ed25519 + Loom)

## Live URLs
- **Sandbox**: https://3000-il85601vwqkrrkvpugkce-d0b9e1e2.sandbox.novita.ai
- **Health**: `/api/health`
- **API Base**: `/api/v1`

## Completed Features (Blueprint Phases 1-10 + Governance)

### Phase 1: Trade Initiation & Identity
- Tenant registration with GTID generation and Governor gate
- Employee onboarding, KYB/KYC verification
- Trust score system (XGBoost-based components)
- Contact/network management
- Trade request creation with jurisdiction screening
- AI Trade Composer (NLP parsing)
- Commodity compatibility warnings
- HS code classification

### Phase 2: Quote & Logistics
- Exporter quote submission with EXW price lock
- Living quotes (dynamic pricing with market index)
- Packing plans with pallet details and container loading
- Logistics service catalog
- Logistics RFQ bidding system
- Driver management
- Carrier performance profiles

### Phase 3: Contracting & Commission
- Contract creation with incoterm-based commission payer logic
- Dual-party signing workflow
- Commission lock creation (rate clamp 0.1%-2.5%)
- Contract lock (Governor-gated, requires active CommissionLock)
- Smart clause executions (auto-triggering)
- Commission singularity calculations
- Negotiation sessions

### Phase 4: Trade Finance & DeFi
- Financing requests (Governor-gated: contract must be LOCKED)
- Blind bid financing offers
- Financing award with agreement creation
- Credit assessments
- DeFi financing transactions
- Tokenized trade assets (ERC-721)
- Blockchain verifications
- Individual financier management
- Secondary market listings
- Regulatory compliance checks

### Phase 5: Physical Execution
- Shipment creation with USTN generation
- Auto-generated GS1-128 barcodes per pallet
- Auto-generated document requirements (5 doc types)
- Milestone confirmation with commission auto-release (25% per gate)
- IoT sensor readings (temperature, humidity, GPS, shock)
- Digital twin snapshots with ETA prediction
- Disruption predictions
- Autonomous milestones with multi-sensor consensus
- Computer vision jobs (HF Donut)
- Smart container decisions
- Disruption recovery actions
- eBL management (capability matrix, issuance, transfers)
- Shipment schedules
- Carrier performance tracking

### Phase 6: Settlement
- Settlement instructions (Governor-gated, requires CommissionLock)
- Settlement confirmations with proof hash
- Liquidity predictions
- Netting circles
- FX optimization paths
- Auto reconciliation
- Predictive escrows
- Settlement path executions
- Fee optimization runs
- Commission settlement records

### Phase 7: Distressed Cargo
- Distressed cargo listings (auto-marks shipment as DISTRESSED)
- Distressed cargo offers
- Distressed contact notifications

### Phase 8: Buyer Search
- Buyer search requests with target regions and trust score filters

### Phase 9: Payment Orchestration
- PSP selection (country-based routing)
- Payment initiation with FX conversion
- PSP health monitoring
- Payment verification events
- Commission settlement records

### Phase 10: Disputes
- Dispute filing with auto-respondent detection
- CommissionLock auto-freeze on dispute
- AI triage recommendations (severity-based)
- Mediation log (chat-style)
- Settlement proposals
- Evidence package auto-compilation
- Dispute history tracking (per-entity risk scoring)
- Status management with CommissionLock unfreeze on resolution

### Governance & Compliance
- Governor decision engine (OPA policy simulation)
- 40+ policy rules covering all 10 phases
- Jurisdiction screening (blocked/high-risk countries)
- AI authority levels (A0-A4)
- Cryptographic signatures (Ed25519 simulation)
- Loom hash logging (deterministic audit)
- Compliance events and checks
- Sanctions screening
- Sanctions proximity detection
- Shell company detection
- Fraud detection with graph cycle analysis
- Model drift monitoring
- Policy suggestions (AI governance)
- ESG assessments
- OPA policy catalog viewer
- Loom integrity checking

### Identity & Auth
- Tenant registration with admin employee
- Login with session management (24h expiry)
- Portal switching
- Trader mode switching (BUY/SELL/DUAL)
- KYB submit/verify workflow
- KYC verification
- Employee invitation

## Portal Architecture (RBAC)

| Portal | Tenant Type | Access |
|--------|------------|--------|
| Importer | CORPORATE | Trades, Contracts, Shipments, Financing, Payments, IoT, Disputes |
| Exporter | CORPORATE | Quotes, Contracts, Shipments, Barcodes, Packing Plans, IoT, Buyer Search, Distressed |
| Logistics | LOGISTICS | Shipments, Routes, Drivers, Service Catalog, RFQ, IoT, Digital Twin, Carrier Profiles |
| Financier | FINANCIAL | Financing Requests, DeFi, Tokenized Assets, Blockchain Verify, Credit Assessments |
| QC | QUALITY_CONTROL | Inspections, Shipments, Barcodes, ESG |
| Regulatory | REGULATORY | Read-only: All trades, disputes, compliance, governance, audit |
| Government | GOVERNMENT | Read-only: Entity registry, trade activity, compliance, governance |
| Admin | PLATFORM_ADMIN | Full access to all features + Gap Stats + Advanced Stats |

## Data Architecture

### Core Tables (4 migrations, 120+ tables)
- Identity: tenants, employees, roles, permissions, trust_scores
- Trade: trade_requests, exporter_quotes, contracts, commission_locks
- Shipments: shipments, milestones, barcodes, documents, IoT readings
- Finance: financing_requests/offers/agreements, settlement_instructions
- Governance: governor_decisions, audit_log, loom_logs, compliance_events
- Advanced: sanctions_proximity, shell_detection, fraud_detection, model_drift_records

### Storage: Cloudflare D1 (SQLite)

## API Routes Summary

### Auth (`/api/v1/auth/*`)
POST /register, /login, /logout, /switch-portal, /switch-mode, /kyb/submit, /kyb/verify, /kyc/verify, /invite

### Identity (`/api/v1/*`)
GET/POST tenants, employees, roles, trust-scores, contacts, GTID resolution

### Trade (`/api/v1/*`)
GET/POST trades, quotes, contracts, commission-locks, negotiations

### Shipment (`/api/v1/*`)
GET/POST shipments, milestones, barcodes, documents, disruptions, settlements

### Finance (`/api/v1/*`)
GET/POST financing, distressed, buyer-search, disputes, inspections, payments

### Governance (`/api/v1/*`)
GET governor/decisions, audit, jurisdictions, compliance, sanctions, ESG, marketplace, loom

### Gaps (`/api/v1/*`)
Packing plans, container loading, voice transcripts, evidence packages, digital twin, PSP health, secondary market, autonomous milestones, computer vision, netting circles, FX optimization, predictive escrows, commission singularity, settlement paths, payment verification, DeFi transactions, regulatory compliance

### Advanced (`/api/v1/*`)
IoT readings, eBL management, commodity warnings, HS codes, carrier profiles, provider invoices, sanctions proximity, shell detection, fraud detection, model drift, policy suggestions, fee optimization, living quotes, trade composer, tokenized assets, blockchain verifications, individual financiers, shipment schedules, smart clauses

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS + TailwindCSS CDN + FontAwesome
- **Build**: Vite + @hono/vite-cloudflare-pages
- **Dev Server**: Wrangler Pages Dev + PM2

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active (Sandbox)
- **Last Updated**: 2026-04-25

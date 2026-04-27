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

## Portal Architecture (RBAC) — Blueprint v6.2.1-6.2.6 Alignment

| Portal | Blueprint Section | Features | Alignment Status |
|--------|------------------|----------|-----------------|
| **Importer** | 6.2.1 | Dashboard, Shipments Vault, Market Intelligence (OpenDP), Trade Requests, Quote Review & Counter-Offer Simulator, Contract Signing, Live Tracking (Digital Twin), Trade Lineage Graph, Distressed Cargo, Disputes (Phase 10), Saved Contacts, AI Assistant, Voice Commands | **COMPLETE** |
| **Exporter** | 6.2.2 | Dashboard, Shipments Vault, Pending Requests, EXW Price Lock, Containerisation & Packing (OR-Tools palletisation), QC Booking (AI-prioritised), Document Finalisation (signing + translation), Barcode Print (GS1-128/QR), Distressed Cargo & Country Factors, AI Assistant | **COMPLETE** |
| **Logistics** | 6.2.3 | Dashboard, Shipments Vault, RFQ Inbox, Quote Submission, Bundle Builder (Freight Forwarder), eBL Status (Shipping Line), Pallet Scanning + OSRM Route (Trucking), Customs Checklist (AI validation), Carrier Profiles, Performance, Digital Twin, Schedules, ESG | **COMPLETE** |
| **QC** | 6.2.4 | Shipments Vault (inspections), Packing Plans (priority pallets), Inspection Jobs (AI report generation), Barcode Scanning, ESG Reports | **COMPLETE** |
| **Financier** | 6.2.5 | Financing Marketplace (risk filtering), Shipments Vault (milestones), Bid Submission, Portfolio Dashboard (Monte Carlo VaR, stablecoin health), Risk Simulator (10k iterations), DeFi Positions, Tokenized Assets, Credit Assessments | **COMPLETE** |
| **Admin** | 6.2.6 | Shipments Vault (full unfiltered), Constitutional Policy Editor (Rego/WASM, 10 phases × 84 gates), Governor Decision Log, PSP Health Monitor (real-time), Global Jurisdiction Matrix (visual editor, versioned) | **COMPLETE** |
| **Regulatory** | Blueprint | Read-only: All trades, disputes, compliance, governance, audit, ESG | **COMPLETE** |
| **Government** | Blueprint | Read-only: Entity registry, trade activity, compliance, governance, ESG | **COMPLETE** |

### v6.2 Gap Closure — New Features Added

#### Backend API Routes (portal_features.ts)
| Endpoint | Method | Portal | Blueprint Phase |
|----------|--------|--------|----------------|
| `/counter-offers` | GET/POST | Importer | 3.1 Counter-Offer Simulator |
| `/trade-lineage` | GET | Importer | 6.2.1 Visual Trade Lineage |
| `/market-intelligence` | GET | Importer | 6.2.1 OpenDP Market Intelligence |
| `/palletisation` | GET | Exporter | 2.2 Packing Data |
| `/palletisation/calculate` | POST | Exporter | 2.2 OR-Tools Palletisation |
| `/qc-bookings` | GET/POST | Exporter | 2.2 QC Booking |
| `/document-finalisation` | GET | Exporter | 2/3 Document Status |
| `/document-finalisation/sign` | POST | Exporter | 2/3 Document Signing |
| `/logistics/bundle-builder` | GET | Logistics | 2.3 AI Bundle Optimizer |
| `/logistics/ebl-status` | GET | Logistics | 5 eBL Status |
| `/logistics/customs-checklist` | GET | Logistics | 5 Customs AI Validation |
| `/inspections/:id/report` | POST | QC | 5 AI Report Generation |
| `/inspections/:id/priority-pallets` | GET | QC | 5 Priority Pallets |
| `/portfolio` | GET | Financier | 4 Portfolio Dashboard |
| `/risk-simulator` | POST | Financier | 3/4 Monte Carlo (10k) |
| `/admin/policies` | GET/POST | Admin | Gov Constitutional Editor |
| `/admin/psp-health` | GET | Admin | 9 PSP Health Monitor |
| `/admin/jurisdiction-matrix` | GET/PATCH | Admin | Gov Jurisdiction Matrix |
| `/distressed-factors` | GET | Cross | 7.8 Country Factors |
| `/ai-assistant` | POST | Cross | 6.5 AI Assistant + Voice |

#### Governor Policies Added
- `counter.offer.simulate` — Phase 3 negotiation bot (G3-U-3)
- `qc.booking.create` — AI-prioritised inspection points
- `document.finalise` — Translation verification (G3-U-7)
- `admin.policy.update` — Multisig 3/5 constitutional change (GC-U-1)
- `admin.jurisdiction.update` — Versioned change logged (GC-U-5)
- `distressed.country.factor` — Commission floor 0.05% (G7-U-10/11)
- `risk.simulate` — Monte Carlo 10k iterations (G3-U-5)
- `portfolio.review` — VaR analysis generation (G4-U-8)

#### Frontend Pages Added
- `renderCounterOffers` — AI Counter-Offer Simulator with acceptance probability
- `renderTradeLineage` — Visual trade chain graph (Importer → Exporter → Contract → USTN)
- `renderMarketIntel` — OpenDP differential privacy aggregated stats
- `renderContainerisation` — Palletisation calculator (container types, OR-Tools)
- `renderDocFinalisation` — Document checklist with signing
- `renderQCBooking` — AI-prioritised inspection booking
- `renderBundleBuilder` — Freight Forwarder AI-optimised provider bundles
- `renderCustomsChecklist` — AI-validated customs document compliance
- `renderPortfolio` — Monte Carlo VaR, stablecoin health, loan portfolio
- `renderRiskSimulator` — 10,000 iteration Monte Carlo trade outcomes
- `renderPolicyEditor` — 10 phases × 84 gates governance rules viewer
- `renderPSPHealth` — Real-time PSP status with fallback alerts
- `renderJurisdictionMatrix` — 31 jurisdictions with compliance checks
- `renderAIAssistant` — Voice commands + text AI assistant
- `renderDistressedFactors` — Country-specific disposal cost factors

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
- **Last Updated**: 2026-04-27

## End-to-End Workflow Alignment (Phases 1-10)

All 10 blueprint phases are fully implemented with 84+ governance gates:

| Phase | Name | Gates | Status |
|-------|------|-------|--------|
| 1 | Trade Initiation | G1-U-1 to G1-U-8 | **COMPLETE** |
| 2 | Quote & Logistics | G2-U-1 to G2-U-14 | **COMPLETE** |
| 3 | Contracting & Commission | G3-U-1 to G3-U-10 | **COMPLETE** |
| 4 | Trade Finance & DeFi | G4-U-1 to G4-U-10 | **COMPLETE** |
| 5 | Physical Execution | G5-U-1 to G5-U-10 | **COMPLETE** |
| 6 | Settlement | G6-U-1 to G6-U-10 | **COMPLETE** |
| 7 | Distressed Cargo | G7-U-1 to G7-U-12 | **COMPLETE** |
| 8 | Buyer Search | G8-U-1 to G8-U-6 | **COMPLETE** |
| 9 | Payment Orchestration | G9-U-1 to G9-U-8 | **COMPLETE** |
| 10 | Disputes | G10-U-1 to G10-U-6 | **COMPLETE** |

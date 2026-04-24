# SGTX Platform v6.2

## Project Overview
- **Name**: SGTX Platform v6.2
- **Goal**: Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure
- **Blueprint**: v6.2 (2026-04-24) — 28 Parts, 35 Microservices, 84 Governance Gates, 10 Phases

## Live URLs
- **Sandbox**: https://3000-il85601vwqkrrkvpugkce-d0b9e1e2.sandbox.novita.ai
- **Landing**: `/`
- **Login**: `/login`
- **Register**: `/register`
- **App Dashboard**: `/app`

## Demo Accounts (password: `password123`)
| Email | Role | Portal |
|-------|------|--------|
| ahmed@cairoimports.eg | Importer (CORPORATE, EG) | Importer Portal |
| nguyen@saigontex.vn | Exporter (CORPORATE, VN) | Exporter Portal |
| chen@asiafinance.sg | Financier (FINANCIAL, SG) | Financier Portal |
| muller@hamburg-log.de | Logistics (LOGISTICS, DE) | Logistics Portal |
| james@londonqc.co.uk | QC Inspector (QUALITY_CONTROL, GB) | QC Portal |
| admin@sgtx.us | Platform Admin (CORPORATE, US) | Admin Portal |

## Implemented Features

### Backend API Routes (Hono + Cloudflare Workers)

#### Core (Pre-existing)
- **Auth**: Register, Login, Session, Logout, KYB/KYC, Employee Invite, Portal Switch, Mode Switch
- **Identity**: Tenants CRUD, GTID Resolution, Employees, Roles/Permissions, Trust Scores, Contacts/Network
- **Trade (Phase 1-3)**: Trade Requests, Exporter Quotes (EXW Lock), Contracts, Commission Locks, Negotiation Sessions
- **Trade Selector**: `GET /trades/ongoing` — Fetches ongoing trades for contract wizard dropdown
- **Shipment (Phase 5)**: Shipment CRUD with USTN, Milestone Confirmation, Barcode Generation/Scanning, Document Management, Disruption Predictions
- **Finance (Phase 4)**: Financing Requests, Blind Bidding, Offer Award, DeFi Protocol Matrix
- **Settlement (Phase 6)**: Settlement Instructions, Confirmations, Multi-Rail Verification
- **Distressed Cargo (Phase 7)**: Listings, Offers, Buyer Search (Phase 8)
- **Payment (Phase 9)**: PSP Aggregator Routing, Payment Attempts, FX Handling
- **Disputes (Phase 10)**: Full Lifecycle (File, Triage, Mediation, Resolve/Settle/Arbitrate)
- **Dispute History**: Persistent per-entity tracking with risk scoring
- **Inspections (QC)**: Schedule, update, complete inspections per shipment
- **Governance**: Governor Decisions, OPA Policy Summary, Loom Logs, Audit Trail, AI Inference Records
- **Compliance**: Events, Checks, Sanctions Screening
- **ESG**: Assessments, Carbon Footprint Calculations
- **Marketplace API**: Partner matching, trade initiation, revenue share

#### v6.2 Gap Implementation (NEW)
- **Packing Plans (Phase 2)**: `GET/POST /packing-plans`, `POST /packing-plans/:id/lock` — Container loading optimization with pallet details
- **Pallet Details (Phase 2)**: Auto-created from packing plan with HS codes, carton counts, weights, dimensions
- **Container Loading Plans (Phase 2)**: `POST /container-loading` — AR visualization data, seal numbers, pallet sequences
- **Voice Transcripts (Phase 5/10)**: `GET/POST /voice-transcripts` — Vosk offline STT with intent extraction
- **Evidence Packages (Phase 10)**: `GET/POST /disputes/:id/evidence-package` — Auto-compiled evidence from milestones, documents, IoT, disruptions
- **Digital Twin Snapshots (Phase 5)**: `GET/POST /shipments/:ustn/digital-twin` — Predicted ETA, shelf life, temperature forecasts
- **PSP Health Monitoring (Phase 9)**: `GET/POST /psp-health` — Aggregator health scoring, latency tracking
- **Secondary Market (Phase 4)**: `GET/POST /secondary-market` — Tokenized trade asset listings
- **Distressed Contact Notifications (Phase 8)**: `GET/POST /distressed/:id/notify` — Permissioned contact alerts
- **Autonomous Milestones (Phase 5)**: `GET/POST /autonomous-milestones`, `POST /:id/consensus` — Multi-sensor consensus verification
- **Computer Vision (Phase 5)**: `GET/POST /computer-vision` — HF Donut model integration for cargo inspection
- **Autonomous Recovery (Phase 5)**: `POST /disruptions/:id/recovery` — AI-proposed reroute/transship actions
- **Smart Container Decisions (Phase 5)**: `POST /shipments/:ustn/container-decision` — Temperature/ventilation/atmosphere control
- **Sensor Data Logs (Phase 5)**: `POST /sensor-data` — Loom-hashed sensor evidence chain
- **Liquidity Predictions (Phase 6)**: `GET/POST /liquidity-predictions` — LightGBM-powered forecasting
- **Netting Circles (Phase 6)**: `GET/POST /netting-circles` — Multi-party settlement optimization
- **FX Optimization (Phase 6)**: `GET/POST /fx-optimization` — Currency path optimization with slippage prediction
- **Auto Reconciliation (Phase 6)**: `GET/POST /auto-reconciliation` — AI-matched settlement verification
- **Predictive Escrows (Phase 6)**: `GET/POST /predictive-escrows` — IoT-triggered smart escrow logic
- **Commission Singularity (Phase 6)**: `GET/POST /commission-singularity` — Loyalty/volume/corridor rate adjustments
- **Settlement Paths (Phase 6)**: `GET/POST /settlement-paths` — Bridge contract execution tracking
- **Payment Verification (Phase 9)**: `GET/POST /payment-verification` — USTN-linked multi-source verification
- **DeFi Transactions (Phase 4)**: `GET/POST /defi-transactions` — On-chain deposit/withdraw/yield tracking
- **Regulatory Compliance (Phase 4)**: `GET/POST /regulatory-compliance` — Per-jurisdiction financing requirements
- **Jurisdiction Compliance**: `GET /jurisdiction-compliance` — Active compliance requirements per country
- **Commission Settlements (Phase 9)**: `GET/POST /commission-settlements` — Gross-up, fee, PSP settlement records
- **Gap Stats**: `GET /gap-stats` — Aggregate counts for all 23 new tables
- **Service Catalog (Logistics)**: `GET/POST /service-catalog` — Logistics provider service listings
- **Logistics RFQ (Logistics)**: `GET/POST /logistics-rfq`, `GET/POST /:id/responses` — Request for quotes with bidding
- **Drivers (Logistics)**: `GET/POST /drivers`, `PATCH /:id/status` — Driver/carrier onboarding
- **Logistics Performance**: `GET /logistics-performance` — On-time delivery, damage rates, ESG scores
- **Credit Assessments (Financier)**: `GET/POST /credit-assessments` — XGBoost credit intelligence

### Governor Policy Rules (20+ new v6.2 policies)
- `packing.plan.create` (G2-U-10), `container.loading.create` (G2-U-11)
- `autonomous.milestone.create` (G5-U-5), `cv.analyze` (G5-U-6), `container.smart.decision` (G5-U-7)
- `disruption.recovery`, `netting.circle.create` (G6-U-4), `escrow.create` (G6-U-6)
- `commission.singularity` (G6-U-7), `commission.settle` (G9-U-3)
- `distressed.notify` (G8-U-2), `payment.verify` (G9-U-5), `defi.transaction` (G4-U-9)
- `logistics.rfq.create` (G2-U-3), `logistics.rfq.respond` (G2-U-4)
- `inspection.assign` (G5-U-8), `inspection.schedule`

### Frontend Pages (Vanilla JS + Tailwind CSS + FontAwesome)
- **Portal RBAC**: 10 portals (Importer, Exporter, Logistics, Shipper, Financier, QC, Regulatory, Government, Admin, Platform Overview)
- **Contract Wizard with Trade Selector Dropdown**
- **Dispute History Page** (personal + government/admin all-entities view)
- **Service Catalog** (Logistics Portal) — add/view services with rates
- **Logistics RFQ** (Logistics Portal) — create RFQs, view bids
- **Drivers** (Logistics Portal) — onboard drivers with vehicles
- **Credit Assessments** (Financier Portal) — XGBoost credit scoring table
- **Logistics Performance** — on-time delivery rates, ESG scores
- **Packing Plans** — container loading optimization, pallet detail viewer
- **Digital Twin Dashboard** — shipment simulation, predicted ETAs, shelf life
- **Gap Stats** (Admin) — record counts for all 29 new blueprint tables

## Database Architecture
- **Storage**: Cloudflare D1 (SQLite)
- **Migrations**: 4 files
  - `0001_initial_schema.sql` — Core identity, governance, trade, shipment, finance, compliance (77 statements)
  - `0002_v6_additions.sql` — DeFi, advanced routing, auth sessions, contract genesis (49 statements)
  - `0003_dispute_history_and_gaps.sql` — Dispute tracking, inspections, packing plans (17 statements)
  - `0004_v62_complete_gaps.sql` — 30+ new tables: pallet details, container loading, voice transcripts, evidence packages, digital twin, PSP health, autonomous ops, settlement advanced, payment verification, DeFi financing, regulatory compliance (44 statements)
- **Total Tables**: 90+ tables covering all 10 phases of the SGTX workflow

## Source Files
```
src/
  index.tsx          — Main app entry, route registration
  routes/
    auth.ts          — Authentication, sessions, KYB/KYC
    identity.ts      — Tenants, employees, trust scores, contacts
    trade.ts         — Trade requests, quotes, contracts, commission locks
    shipment.ts      — Shipments, milestones, barcodes, documents, settlements
    finance.ts       — Financing, disputes, payments, inspections
    governance.ts    — Governor, audit, compliance, ESG, marketplace
    upgrades.ts      — Logistics RFQ, drivers, credit, dispute history rebuild
    gaps.ts          — v6.2 gap implementations (30+ new endpoint groups)
  lib/
    types.ts         — TypeScript type definitions
    utils.ts         — USTN/GTID generation, SHA-256, signatures, jurisdiction checks
    governor.ts      — OPA policy engine with 35+ policy rules, loom logging
    commission.ts    — AI commission calculation engine
  pages/
    landing.ts       — Public landing page
    login.ts         — Login page
    register.ts      — Registration page
    app.ts           — Main app shell
```

## Remaining Blueprint Items (Not Feasible in Cloudflare Workers)
- [ ] Real-time NATS WebSocket subscriptions (requires persistent connections)
- [ ] 3D container viewer (Three.js — heavy frontend-only)
- [ ] AR inspection mode (requires native app)
- [ ] Voice commands / Vosk offline (requires native/WASM runtime)
- [ ] Offline LLM (ONNX Runtime — requires native runtime)
- [ ] Collaborative editing (Y-js + WebRTC — requires server)
- [ ] Digital Twin Leaflet map integration (frontend-only enhancement)

## Deployment
- **Platform**: Cloudflare Pages
- **Tech Stack**: Hono + TypeScript + TailwindCSS (CDN) + D1 SQLite
- **Status**: Active
- **Last Updated**: 2026-04-24

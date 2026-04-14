# SGTX Platform v6.1 — Sovereign Trade Execution Infrastructure

## Project Overview
- **Name**: SGTX Platform (Sovereign, AI-Governed, Non-Custodial Global Trade Execution)
- **Version**: 6.1 (Merged Complete)
- **Goal**: Provide infrastructure for organizations to execute cross-border trade with cryptographic certainty, AI-assisted optimization, and zero counterparty risk through non-custodial commission protection
- **Governance Invariant**: No irreversible action without Governor approval

## URLs
- **Live Dashboard**: https://3000-il85601vwqkrrkvpugkce-d0b9e1e2.sandbox.novita.ai/
- **Health Check**: /api/health
- **API Base**: /api/v1

## Architecture
Built on Cloudflare Pages with Hono + D1 (SQLite), implementing the full SGTX v6.1 blueprint:

### Core Components
- **Governor Service** — OPA + WasmEdge (simulated) + Loom logging, Ed25519 signing
- **Commission AI Engine** — Dynamic rate calculation: `clamp(0.1%, 2.5%, base + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability)`
- **USTN Generator** — `SGTX-{JURISDICTION}-{YYYYMMDDHHMMSS}-{RANDOM8}-{VERSION}`
- **GTID System** — `SGTX-{COUNTRY}-{TYPE}-{SEQ}-{CHECKSUM}`
- **Jurisdiction Engine** — 27 countries, auto-blocked sanctions, high-risk enhanced DD

### 10-Phase Trade Workflow (All Implemented)
1. **Trade Initiation** — Direct GTID entry, multi-commodity specs, Governor pre-screen
2. **Exporter Quote** — EXW price lock, logistics sourcing
3. **Contracting** — Commission allocation, signature collection, CommissionLock creation
4. **Trade Finance** — Post-contract financing requests, blind bidding, credit intelligence
5. **Physical Execution** — Shipment creation, USTN tracking, auto-generated barcodes (GS1-128), milestone confirmation, disruption predictions
6. **Settlement** — USTN-linked settlement instructions, multi-rail verification
7. **Distressed Cargo** — AI-driven cargo resolution, alternative buyer matching
8. **Buyer Search** — Exporter-initiated capability broadcast
9. **Payment Orchestrator** — PSP routing (8 aggregators: Stripe, Adyen, Fawry, Payoneer, Flutterwave, RazorpayX, M-Pesa, Mercury)
10. **Dispute Resolution** — Filing, CommissionLock freeze, mediation

### Governance Gates
- **84 governance gates** across all 10 phases (as specified in blueprint)
- Every gate enforced by Governor decision with cryptographic signature + Loom hash
- AI operates at A2 max (can block, never force)

## API Endpoints

### Identity & Tenants
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants` | List all tenants |
| GET | `/api/v1/tenants/:id` | Tenant detail with employees, contacts, trust |
| POST | `/api/v1/tenants` | Register tenant (Governor gated) |
| GET | `/api/v1/resolve?gtid=...` | GTID Resolution Service |
| GET | `/api/v1/trust-scores` | All trust scores (XGBoost model) |
| GET | `/api/v1/tenants/:id/contacts` | Network contacts |

### Trade Core
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/trades` | List trades (filter by status, tenant) |
| POST | `/api/v1/trades` | Create trade request |
| POST | `/api/v1/quotes` | Submit exporter quote (EXW lock) |
| POST | `/api/v1/contracts` | Create contract |
| POST | `/api/v1/contracts/:id/sign` | Sign contract |
| POST | `/api/v1/contracts/:id/lock` | Lock contract (creates CommissionLock + calculates commission) |
| GET | `/api/v1/commission-locks` | All commission locks |
| POST | `/api/v1/commission-locks/:id/release` | Release commission |

### Shipments & Execution
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/shipments` | List shipments |
| POST | `/api/v1/shipments` | Create shipment (auto-generates USTN, barcodes, doc requirements) |
| POST | `/api/v1/shipments/:ustn/milestones` | Confirm milestone (auto-releases commission) |
| GET | `/api/v1/shipments/:ustn/barcodes` | Get pallet barcodes |
| POST | `/api/v1/barcodes/scan` | Scan barcode |

### Finance & Settlement
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/financing` | Create financing request (post-contract only) |
| POST | `/api/v1/financing/:id/offers` | Submit financing offer (blind bid) |
| POST | `/api/v1/settlements` | Create settlement instruction |
| POST | `/api/v1/payments` | Initiate payment (auto PSP routing) |

### Governance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/governor/decisions` | All governor decisions |
| POST | `/api/v1/governor/evaluate` | Manual governor evaluation |
| GET | `/api/v1/jurisdictions` | 27 jurisdictions (sanctions, PSPs, CBDC) |
| POST | `/api/v1/jurisdictions/check` | Jurisdiction supremacy check |
| GET | `/api/v1/audit` | Immutable audit log |
| GET | `/api/v1/compliance/events` | Compliance events |
| POST | `/api/v1/sanctions/screen` | Screen entity against sanctions |
| GET | `/api/v1/esg` | ESG assessments |

## Data Architecture
- **Database**: Cloudflare D1 (SQLite) with 70+ tables
- **Schema**: Full SGTX v6.1 DDL adapted for SQLite (UUIDs, JSON columns, foreign keys)
- **Key Tables**: tenants, employees, governor_decisions, trade_requests, contracts, commission_locks, shipments, shipment_milestones, financing_requests, settlement_instructions, jurisdictions, payment_aggregators
- **Seed Data**: 7 demo tenants, 7 employees, 5 roles, 27 jurisdictions, 8 PSP aggregators, trust scores, contacts

## Jurisdiction Coverage
- **Clear (14)**: US, DE, AE, CN, GB, EG, IN, BR, NG, KE, SA, SG, ZA, TR, VN, JP
- **High Risk (5)**: IQ, AF, YE, LB, PK — Bank-only + enhanced DD
- **Blocked (6)**: KP, IR, SY, CU, RU, BY — Auto-blocked

## Commission Engine
- Base rate from estimated profit margin (0.1%–2.2%)
- Country corridor boost (VN→EG: +0.3%, CN→AE: +0.2%)
- Seasonality adjustment (perishables: summer/holiday premium)
- Geopolitical risk premium
- Volume discount (10+ trades: -0.1% to -0.5%)
- Perishability surcharge (+0.2%)
- Final rate clamped: `max(0.1%, min(2.5%, calculated))`

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS + Tailwind CSS + Chart.js + FontAwesome
- **Build**: Vite + @hono/vite-build

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Running (sandbox)
- **Last Updated**: 2026-04-14

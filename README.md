# SGTX Platform v6.1

## Project Overview
- **Name**: SGTX Platform v6.1
- **Goal**: Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure
- **Blueprint**: v6.2 (2026-04-24) — 28 Parts, 35 Microservices, 84 Governance Gates

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

### Backend (Hono + Cloudflare Workers)
- **Auth**: Register, Login, Session, Logout, KYB/KYC, Employee Invite, Portal Switch, Mode Switch
- **Identity**: Tenants CRUD, GTID Resolution, Employees, Roles/Permissions, Trust Scores, Contacts/Network
- **Trade (Phase 1-3)**: Trade Requests, Exporter Quotes (EXW Lock), Contracts, Commission Locks, Negotiation Sessions
- **Trade Selector**: `GET /trades/ongoing` — Fetches ongoing trades for contract wizard dropdown
- **Shipment (Phase 5)**: Shipment CRUD with USTN, Milestone Confirmation, Barcode Generation/Scanning, Document Management, Disruption Predictions
- **Finance (Phase 4)**: Financing Requests, Blind Bidding, Offer Award, DeFi Protocol Matrix
- **Settlement (Phase 6)**: Settlement Instructions, Confirmations, Multi-Rail Verification
- **Distressed Cargo (Phase 7)**: Listings, Offers, Buyer Search (Phase 8)
- **Payment (Phase 9)**: PSP Aggregator Routing, Payment Attempts, FX Handling
- **Disputes (Phase 10)**: Full Lifecycle — File, Triage, Mediation, Resolve/Settle/Arbitrate
  - Auto-respondent detection from trade parties
  - AI triage with severity scoring and resolution path recommendation
  - Mediation log (timestamped, attributed messages)
  - Dispute recommendations (TRIAGE, OUTCOME_PREDICTION, SETTLEMENT_PROPOSAL, EVIDENCE_SUMMARY)
  - Commission Lock freeze/unfreeze on dispute file/resolve
- **Dispute History**: Persistent per-entity tracking
  - `GET /dispute-history` — All entities (gov/admin) or per-entity (?gtid=...)
  - `GET /dispute-history/stats` — Dashboard statistics
  - Risk scoring: 0-100 based on dispute count, role (filer vs respondent), type
  - Flagged entities: risk_score >= 40 or disputes_as_respondent >= 3
- **Inspections (QC)**: Schedule, update, complete inspections per shipment
- **Governance**: Governor Decisions, OPA Policy Summary, Loom Logs, Audit Trail, AI Inference Records
- **Compliance**: Events, Checks, Sanctions Screening
- **ESG**: Assessments, Carbon Footprint Calculations
- **Marketplace API**: Partner matching, trade initiation, revenue share

### Frontend (Vanilla JS + Tailwind CSS + FontAwesome)
- **Portal RBAC**: 10 portals (Importer, Exporter, Logistics, Shipper, Financier, QC, Regulatory, Government, Admin, Platform Overview)
- **Contract Wizard with Trade Selector Dropdown**: Scroll-down picker of ongoing trades, auto-fills trade ID/incoterm/preview
- **Dispute History Page**: 
  - Importer/Exporter: personal dispute profile (risk score, type breakdown, win/loss/settled, dispute list)
  - Government/Regulatory/Admin: all-entities view with flagged entities, risk heatmap, dispute stats
- **Enhanced Disputes Page**: Severity badges, resolution path, mediation actions, AI recommendations, dispute detail modal
- **Government/Regulatory Dashboard**: Dispute overview section with pending/resolved/flagged stats and quick navigation
- **Full Dashboard Suite**: Per-portal dashboards with stat cards, quick actions, workflow guides

### API Endpoints Summary
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/trades/ongoing` | GET | Ongoing trades for contract wizard dropdown |
| `/api/v1/disputes` | GET/POST | List/file disputes |
| `/api/v1/disputes/:id` | GET | Dispute detail with recommendations |
| `/api/v1/disputes/:id/status` | PATCH | Update dispute status (resolve/settle/etc.) |
| `/api/v1/disputes/:id/mediation` | POST | Add mediation log message |
| `/api/v1/disputes/:id/recommendations` | GET/POST | Dispute AI recommendations |
| `/api/v1/dispute-history` | GET | Dispute history (all or per-entity) |
| `/api/v1/dispute-history/stats` | GET | Dispute statistics for dashboards |
| `/api/v1/inspections` | GET/POST | QC inspections |
| `/api/v1/inspections/:id` | PATCH | Update inspection |
| + all existing endpoints from v6.1 | | |

## Data Architecture
- **Storage**: Cloudflare D1 (SQLite)
- **Migrations**: 3 files (initial schema, v6 additions, dispute history + gaps)
- **Key Tables**: `dispute_history` (persistent per-entity), `disputes` (with respondent_gtid, severity, triage, mediation_log), `dispute_recommendations`, `inspections`, `service_catalog`, `packing_plans`

## Blueprint v6.2 Gap Analysis (Post-Implementation)

### Completed Features
- [x] Persistent dispute-history tracking per entity
- [x] Contract wizard trade selector dropdown
- [x] Government/Regulatory dispute oversight
- [x] AI triage and recommendation system
- [x] Mediation log with timestamped messages
- [x] Risk scoring and flagged entity detection
- [x] Inspection scheduling (QC portal)

### Remaining Gaps (Not Feasible in Cloudflare Workers)
- [ ] Real-time NATS WebSocket subscriptions (requires persistent connections)
- [ ] 3D container viewer (Three.js — frontend-only, would need heavy JS)
- [ ] AR inspection mode (requires native app)
- [ ] Voice commands / Vosk offline (requires native/WASM runtime)
- [ ] Offline LLM (ONNX Runtime — requires native runtime)
- [ ] Collaborative editing (Y-js + WebRTC — requires server)
- [ ] Digital Twin Dashboard with Leaflet map (frontend-only enhancement)

## Deployment
- **Platform**: Cloudflare Pages
- **Tech Stack**: Hono + TypeScript + TailwindCSS (CDN) + D1 SQLite
- **Last Updated**: 2026-04-24

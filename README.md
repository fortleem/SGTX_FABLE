# SGTX Platform v6.1

## Project Overview
- **Name**: SGTX Platform v6.1
- **Goal**: Sovereign, AI-Governed, Non-Custodial Global Trade Execution Infrastructure
- **Blueprint**: v6.1 (2026-04-13) — 24 Parts, 35 Microservices, 84 Governance Gates

## Live URLs
- **Sandbox**: https://3000-il85601vwqkrrkvpugkce-b32ec7bb.sandbox.novita.ai
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
- **Shipment (Phase 5-6)**: Shipments with USTN, Milestones (commission release), Barcodes (GS1-128/QR), Document Requirements, Disruption Predictions, Settlements
- **Finance (Phase 4, 7-10)**: Financing Requests, Blind Bidding, Distressed Cargo, Buyer Search, Disputes (CommissionLock freeze), Payment Orchestrator (8 PSPs)
- **Governance**: Governor Decisions (OPA simulation), Audit Log (Loom hash chain), Jurisdictions (31 countries), Compliance Events/Checks, Sanctions Screening, ESG Assessments, Marketplace API, Carbon Footprint, Commission Calculations, AI Inference Records, Legal Disclaimers

### Governor Service (OPA Policies)
All 10 phases covered with specific policy rules:
- Phase 1: `trade.request.create`, `tenant.register`
- Phase 2: `quote.submit`, `quote.accept`, `logistics.rfq`
- Phase 3: `contract.create`, `contract.lock`, `commission.calculate`, `commission.release`
- Phase 4: `financing.request`, `financing.bid`, `financing.award`
- Phase 5: `shipment.create`, `shipment.milestone.confirm`
- Phase 6: `settlement.execute`, `settlement.confirm`
- Phase 7: `distressed.list`, `distressed.offer`
- Phase 8: `buyer.search`
- Phase 9: `payment.initiate`
- Phase 10: `dispute.file`
- KYB/KYC: `kyb.verify`, `kyc.verify`

### Commission AI Engine (Part 7)
Formula: `clamp(0.1%, 2.5%, base + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability ± anomaly)`
- Base rate mapping from estimated profit margin
- Country corridor boost (VN-EG, CN-AE, IN-US, etc.)
- Seasonality adjustment for perishables (HS 07, 08, 20)
- Geopolitical risk premium
- Volume discount (10-100+ trades)
- Full breakdown persisted in `commission_calculations` table

### Frontend (Tailwind CSS + Chart.js)
- **Portal RBAC**: Each tenant type sees only its authorized portals
- **Dashboards**: Importer, Exporter, Logistics, Financier, QC, Regulatory, Government, Admin — each with role-specific stats and quick actions
- **Trade Wizard**: Multi-commodity specs, GTID resolver with live preview, incoterm selection
- **Contract Wizard**: Commission allocation slider, governing law, dispute resolution
- **Shipment Detail**: Milestone tracker, barcode listing, document requirements, disruption predictions
- **Commission View**: AI commission calculation breakdown with full formula components
- **Financing**: Blind bid forms for financiers
- **All 10 Phases**: Complete UI coverage for trades, quotes, contracts, shipments, financing, settlements, distressed cargo, buyer search, payments, disputes

### Database (D1 SQLite)
- 70+ tables across 2 migrations (1423 lines of DDL)
- Seed data: 7 tenants, 31 jurisdictions, 8 PSPs, 1 complete trade pipeline, 3 milestones, 4 barcodes, ESG/compliance/audit data

## API Endpoints Summary

### Auth (`/api/v1/auth/`)
- `POST /register` — Register org + admin
- `POST /login` — Login
- `GET /session` — Verify session
- `POST /logout` — Logout
- `POST /kyb/submit` — Submit KYB
- `POST /kyb/verify` — Verify KYB (admin)

### Identity (`/api/v1/`)
- `GET /tenants` — List tenants
- `GET /tenants/:id` — Tenant detail
- `GET /resolve?gtid=` — GTID resolution
- `GET /trust-scores` — Trust scores

### Trade (`/api/v1/`)
- `GET /trades` — List trades
- `POST /trades` — Create trade
- `POST /quotes` — Submit exporter quote
- `GET /contracts` — List contracts
- `POST /contracts` — Create contract
- `POST /contracts/:id/lock` — Lock + CommissionLock

### Shipment (`/api/v1/`)
- `GET /shipments` — List shipments
- `POST /shipments` — Create shipment (USTN + barcodes)
- `POST /shipments/:ustn/milestones` — Confirm milestone

### Finance (`/api/v1/`)
- `GET /financing` — List requests
- `POST /financing` — Create request
- `POST /financing/bids` — Submit bid
- `GET /distressed` — Distressed cargo
- `GET /buyer-search` — Buyer search
- `GET /disputes` — Disputes
- `GET /payments` — Payment attempts

### Governance (`/api/v1/`)
- `GET /governor/decisions` — Governor decisions
- `GET /jurisdictions` — 31 jurisdictions
- `GET /compliance/events` — Compliance
- `GET /audit` — Audit log
- `GET /esg` — ESG assessments
- `GET /commissions` — Commission calculations

## Tech Stack
- **Backend**: Hono 4.x + TypeScript (Cloudflare Workers runtime)
- **Database**: Cloudflare D1 (SQLite) — 70+ tables
- **Frontend**: Vanilla JS + Tailwind CSS CDN + Chart.js + FontAwesome
- **Build**: Vite + @hono/vite-cloudflare-pages
- **Dev**: Wrangler pages dev (PM2 managed)
- **Deployment**: Cloudflare Pages

## Last Updated
2026-04-19 — Blueprint v6.1 gaps fixed

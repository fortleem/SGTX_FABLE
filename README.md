# SGTX Platform v6.3 — Sovereign Global Trade Execution Infrastructure

## Project Overview
- **Name**: SGTX Platform
- **Version**: v6.3 (Blueprint Final Alignment)
- **Goal**: Sovereign, AI-governed, non-custodial global trade execution infrastructure
- **Architecture**: Hono + Cloudflare Workers (edge-first), D1 SQLite, multi-tenant RBAC
- **Governance**: No irreversible action without Governor approval (OPA + Ed25519 + Loom)

## Live URLs
- **Sandbox**: https://3000-il85601vwqkrrkvpugkce-d0b9e1e2.sandbox.novita.ai
- **Health**: `/api/health` — Returns `SGTX v6.3`
- **API Base**: `/api/v1`

## Portal Architecture (RBAC) — Blueprint v6.3 FULL Alignment

### Importer Portal (Blueprint 6.2.1 v6.3)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Dashboard (Trade Inbox) — AI priority scoring 100-50 | Zone 1 | ✅ |
| Inbound Shipments — Map/Timeline/Document Status views | Tab 1 | ✅ |
| New Trade Request — Auto-fill from past trade | Tab 2 | ✅ |
| Quote Review & Negotiation — Compare/Landed Cost/AI Assistant | Tab 3 (Panels A/B/C) | ✅ |
| Counter-Offer Simulator — acceptance probability | Phase 3.1 | ✅ |
| Contract Signing — ZITADEL passkey | Tab 4 | ✅ |
| Customs Readiness — document checklist per USTN | Tab 5 (new) | ✅ |
| Shipments Vault — USTN, B/L, ETD/ETA countdown | 6.1.1 | ✅ |
| Live Tracking (DigitalTwinDashboard) | Tab | ✅ |
| Trade Lineage Graph — visual resell chains | Tab | ✅ |
| Market Intelligence — OpenDP differential privacy | Tab | ✅ |
| Distressed Cargo (as Buyer) — Quick Offer | Phases 7/8 | ✅ |
| Disputes (Phase 10) — AI mediation | Phase 10 | ✅ |
| Saved Contacts — Performance Dashboard (metrics) | Part 18 + v6.3 | ✅ |
| AI Assistant Panel — voice commands + text | 6.1 | ✅ |

### Exporter Portal (Blueprint 6.2.2 v6.3)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Dashboard (Priority Action Card) — top 3 actions, Chief-of-Staff | Zone 1 | ✅ |
| Pending Requests — accept/decline incoming trades | Zone 2 | ✅ |
| Mini Shipments Vault — Estimated Margin column | Zone 3 + Addition 8 | ✅ |
| EXW Price Lock — live market chart + AI range band | Phase 2.1 + Addition 7 | ✅ |
| Post-Lock Price Watch — ±10% deviation alerts | Addition 7 | ✅ |
| Containerisation & Packing — OR-Tools solver, 3D viewer | Phase 2.2 | ✅ |
| Logistics Builder — AI bundle + Re-Optimise diff view | Phase 2.3 + Addition 6 | ✅ |
| QC Booking — AI-recommended priority pallets | Phase 2.4 | ✅ |
| Quote Submission — assembled delivered price + commission | Phase 2.5 | ✅ |
| Document Finalisation — signing + auto-translation | Phase 3.5 | ✅ |
| Barcode Print — GS1-128/QR per stakeholder | Phase 2.2→5 | ✅ |
| Cash Position — 90-day rolling forecast, AI gap detection | Addition 4 (new) | ✅ |
| Distressed Cargo — Accelerated Outreach Mode | Phase 7/8 + Addition 10 | ✅ |
| AI Assistant Panel | 6.1 | ✅ |

### Logistics Portal (Blueprint 6.2.3 v6.3 Multi-Role)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Unified Operations Dashboard — 3 sections | 6.2.3.1 | ✅ |
| Open/Directed/Anonymous Request handling | 6.2.3.1 | ✅ |
| AI Quote Assistant — suggested pricing + benchmarks | 6.2.3.2 | ✅ |
| Freight Forwarder — bundled quotes, partner network | 6.2.3.2 | ✅ |
| Shipping Line Integration — API/Email/Manual channels | 6.2.3.3 | ✅ |
| Trucking Dispatch Planner — OR-Tools VRP, driver management | 6.2.3.4 | ✅ |
| Customs Broker — Document Verification Queue, customs API | 6.2.3.5 | ✅ |
| Provider Performance Self-Service Dashboard | 6.2.3.6 | ✅ |
| OSRM Route Intelligence | Existing | ✅ |
| eBL Status | Phase 5 | ✅ |
| Carrier Profiles | Existing | ✅ |

### QC Portal (Blueprint 6.2.4 v6.3)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Dashboard — Inspection Jobs Overview with deadlines | 6.2.4.3 | ✅ |
| Dynamic Quality Specs — extracted from contract | 6.2.4.1 | ✅ |
| Inspection Job Lifecycle — 5 steps | 6.2.4.2 | ✅ |
| My Schedule Calendar — FullCalendar.js | 6.2.4.3 | ✅ |
| AI Report Generation — Groq-drafted, PASS/FAIL/CONDITIONAL | 6.2.4.2 Step 4 | ✅ |
| Performance Dashboard — turnaround, accuracy, benchmarks | 6.2.4.3 | ✅ |
| Settings — serviceable commodities, regions, methods | 6.2.4.3 | ✅ |
| AR Defect Detection UI — HF ViT overlay | 6.2.4.4 | ✅ |
| Voice-activated Defect Logging | 6.2.4.4 | ✅ |
| Governance Gates GQC-1 to GQC-7 | 6.2.4.5 | ✅ |

### Financier Portal (Blueprint 6.2.5 v6.3)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Financing Operations Hub — 4 sections | 6.2.5.1 | ✅ |
| Request Details & Risk Analysis — 200+ signals, AI LTV | 6.2.5.2 | ✅ |
| Encrypted Blind Bidding — NATS KV, 48h TTL | 6.2.5.3 | ✅ |
| DeFi Protocol Comparison — Aave/Compound/Morpho | 6.2.5.4 | ✅ |
| Stablecoin Health Monitor — USDC/USDT/DAI | 6.2.5.4 | ✅ |
| Active Agreement Management & Repayment | 6.2.5.5 | ✅ |
| Secondary Market — ERC-3525 tokenized assets | 6.2.5.6 | ✅ |
| Margin Calls monitoring | 6.2.5.5 | ✅ |
| Monte Carlo Risk Simulator (10,000 iterations) | Existing + v6.3 | ✅ |
| Portfolio Dashboard | Existing + v6.3 | ✅ |

### Government Portal (Blueprint 6.2.6 v6.3 — COMPLETELY NEW)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Dynamic Onboarding & Customisation | 6.2.6.1 | ✅ |
| Government Profile & Module Configuration | 6.2.6.1 | ✅ |
| Live Trade Monitor — integration status badges | 6.2.6.4 | ✅ |
| Clearance Recommendations — auto-clear eligible | 6.2.6.4 | ✅ |
| Anonymous Trade Management — identity redaction | 6.2.6.2 | ✅ |
| Dynamic Integration Connectors (Nafeza, VNACCS, etc.) | 6.2.6.3 | ✅ |
| Multi-Agency Workflow support | 6.2.6.6 | ✅ |

### Admin Portal (Blueprint 6.2.7 v6.3)
| Feature | Blueprint Section | Status |
|---------|------------------|--------|
| Platform Health Dashboard — AI recommendations | 6.2.7.1 | ✅ |
| Constitutional Policy Editor — AI Impact Simulation | 6.2.7.2 | ✅ |
| Governor Decision Log — Natural Language Query | 6.2.7.3 | ✅ |
| Predictive System Health — LSTM 7-day forecast | 6.2.7.4 | ✅ |
| Global Jurisdiction Matrix — Conflict Detection | 6.2.7.5 | ✅ |
| PSP Health Monitor — fallback management | 6.2.7.6 | ✅ |
| Automated Incident Response & Post-Mortem | 6.2.7.7 | ✅ |
| Marketplace Partner Onboarding | 6.2.7.8 | ✅ |
| Tenant Impersonation — read-only, 30 min, multisig 3/5 | 6.2.7.9 | ✅ |
| Config Version Control & Rollback | 6.2.7.10 | ✅ |

## End-to-End Workflow (Phases 1-10) — 84+ Governor Gates

| Phase | Name | Key Features | Status |
|-------|------|-------------|--------|
| 1 | Trade Initiation | GTID, NLP parsing, auto-fill, jurisdiction screening | ✅ |
| 2 | Quote & Logistics | EXW lock, OR-Tools packing, RFQ, bundle optimizer | ✅ |
| 3 | Contracting | Counter-offers, landed cost, commission lock, signatures | ✅ |
| 4 | Trade Finance | Blind bidding, DeFi protocols, Monte Carlo, margin calls | ✅ |
| 5 | Physical Execution | USTN, barcodes, eBL, IoT, digital twin, milestones | ✅ |
| 6 | Settlement | PSP routing, FX optimization, netting, escrows | ✅ |
| 7 | Distressed Cargo | Accelerated outreach, country factors, floor pricing | ✅ |
| 8 | Buyer Search | Trust-filtered, region-targeted discovery | ✅ |
| 9 | Payment Orchestration | PSP health, commission settlement, auto-reconciliation | ✅ |
| 10 | Disputes | AI triage, evidence packages, mediation, CommissionLock freeze | ✅ |

## API Endpoints Summary (v6.3)

### New v6.3 Portal-Specific Endpoints
```
GET  /importer/trade-inbox          — AI priority-scored inbox
GET  /importer/inbound-shipments    — Map/timeline/doc status
GET  /importer/customs-readiness    — Document checklist per USTN
GET  /importer/quote-comparison     — Side-by-side + landed cost
POST /importer/negotiation-assistant — AI counter-offer suggestions
GET  /importer/contact-performance  — Delivery metrics per contact
GET  /exporter/priority-actions     — Chief-of-Staff top 3 actions
GET  /exporter/cash-position        — 90-day rolling forecast
GET  /exporter/exw-market-data      — 30-day chart + AI range
POST /exporter/logistics-reoptimise — Bundle diff view
POST /exporter/quote-submission     — Assembled price + commission
GET  /logistics/operations-dashboard — Unified 3-section view
POST /logistics/ai-quote-assist     — Pricing + benchmarks
GET  /logistics/shipping-line-status — API/Email/Manual channels
GET  /logistics/dispatch-planner    — OR-Tools VRP routes
GET  /logistics/customs-doc-queue   — AI verification queue
GET  /logistics/provider-performance — Self-service metrics
GET  /qc/inspection-jobs            — Jobs with quality specs
GET  /qc/schedule                   — Calendar events
POST /qc/submit-report             — AI-drafted report
GET  /qc/performance               — Turnaround, accuracy
GET  /qc/settings                  — Commodities, regions
GET  /financier/operations-hub      — 4-section unified view
GET  /financier/request-details     — Credit intelligence
POST /financier/submit-bid          — Encrypted blind bid
GET  /financier/defi-comparison     — Protocol comparison
GET  /financier/secondary-market    — ERC-3525 listings
GET  /financier/margin-calls        — LTV alerts
GET  /government/profile            — Module configuration
GET  /government/trade-monitor      — Live monitor + integrations
GET  /government/clearance-recommendation — Auto-clear eligible
GET  /government/anonymous-trades   — Redacted identity trades
GET  /government/integrations       — Connector library
POST /admin/policy-simulate         — 10k replay impact
POST /admin/nl-query               — Natural language audit
GET  /admin/predictive-health       — LSTM 7-day forecast
GET  /admin/incidents               — Post-mortem + evidence
GET  /admin/config-versions         — Version timeline + rollback
POST /admin/impersonate             — Read-only 30 min session
POST /admin/onboard-partner         — AI agreement generation
```

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite, 120+ tables, 4 migrations)
- **Frontend**: Vanilla JS + TailwindCSS + FontAwesome + Chart.js
- **Build**: Vite + @hono/vite-cloudflare-pages
- **Dev Server**: Wrangler Pages Dev + PM2

## Deployment
- **Platform**: Cloudflare Pages (Sandbox)
- **Status**: ✅ Active
- **Last Updated**: 2026-04-28

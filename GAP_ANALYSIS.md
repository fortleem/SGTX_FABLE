# SGTX Platform — Blueprint v11.0 Gap Analysis
## Current State vs Required State

### Legend
- ✅ = Implemented & working
- ⚠️ = Partially implemented (needs enhancement)
- ❌ = Missing entirely
- 🔧 = Backend exists, frontend missing/stub

---

## PART A: PHASE 0 — Foundation & Shared Components

### A1. Common Components (12A)

| Component | Status | Details |
|---|---|---|
| Smart Inbox (12A.1) | ⚠️ | Backend: `/inbox` GET exists. Frontend: `renderSmartInbox()` exists (~45 lines), fetches & renders. **GAP**: No "Recommended Actions Widget" with one-click actions (accept quote, sign contract, pay). No priority scoring (High/Med/Low). No action execution from inbox. |
| Trade Command Center (12A.2) | ⚠️ | Backend: `/trade/:ustn/command-center` and `/trade/:ustn/timeline` exist. Frontend: `renderTradeCommandCenter()` exists (~100 lines). **GAP**: No "pending action panel" with single next button. No expandable cards (Commercial, Parties, Documents). |
| PlainLanguage Governor Panel (12A.3) | ⚠️ | Backend governor returns `tenant_message`. Frontend `showModal()` can display. **GAP**: No structured condition checklist with red/amber icons. No one-click remediation links. Governor panel not rendered as a dedicated reusable component. |
| Shared Shipments Vault (12A.4) | ⚠️ | Backend: `/shipments` GET exists. Frontend: `renderShipmentsVault()` exists (~90 lines). **GAP**: No table/map view toggle. No filter chips. No role-specific columns. No full-text search. |
| VoiceCommandButton (12A.5) | ❌ | Not implemented. Blueprint requires Vosk speech-to-text. |
| Customer Care Chatbot (12A.6) | ❌ | Not implemented. Blueprint requires PIN-based impersonation and VoIP callback. |
| Dual-Mode Toggle (12A.7) | ✅ | Backend: `/switch-mode` exists. Frontend: mode toggle in header works. JWT updated, UI refreshes. |

### A2. Seller Portal Tab Completeness (12C.2)

| Blueprint Tab | Nav ID | Status | Notes |
|---|---|---|---|
| Inbox | smart-inbox | ✅ | Shared component, works |
| Pending Requests | pending-requests | ✅ | Phase 2 rewrite complete, lists trades, Start Quote button |
| EXW Price Lock | exw-price-lock | ⚠️ | Redirects to Quote Builder. Missing: standalone market chart, unit toggle. |
| Containerisation & Packing | containerisation | ⚠️ | Redirects to Quote Builder. Missing: standalone packing module, 3D viewer, layer stacking UI, ORTools optimiser call. |
| Logistics Builder | logistics-builder | ⚠️ | Redirects to Quote Builder. Missing: Mode B RFQ UI (provider selection, compare panel), Mode C SHIP request UI, advanced options. |
| Quote Submission | quote-submit | ✅ | Redirects to Quote Builder, handles submission |
| **Laboratory Selection** | **MISSING** | ❌ | **No nav item. No render function. Blueprint 12C.2 tab 7.** |
| QC Booking | qc-booking | ⚠️ | Basic list + book modal. Missing: AI-recommended inspection points, conditional pass support. |
| Document Finalisation | doc-finalisation | ⚠️ | Placeholder only ("Available after Phase 3"). Needs packing list/invoice sign with passkey. |
| Barcode Print | barcode-print | ⚠️ | Placeholder only ("Available after packing lock"). Needs SSCC-18 label generation UI. |
| Cash Position | cash-position | ⚠️ | Fetches from API, shows table. Missing: 90-day rolling forecast. |
| Distressed & Outreach | distressed-sell | ✅ | Declare, triage, outreach implemented |
| Disputes | disputes | ✅ | Shared component, file/respond/mediation |
| Saved Contacts | contacts | ✅ | Shared component |
| Company Admin | company-admin | ⚠️ | Shows employees and roles. Missing: data scopes, approval chains, branding. |

### A3. Buyer Portal Tab Completeness (12C.1)

| Blueprint Tab | Nav ID | Status | Notes |
|---|---|---|---|
| Inbox | smart-inbox | ✅ | Works |
| New Trade Request | new-trade | ✅ | ~1239 lines, comprehensive. Has seller selection, incoterm, containers, commodities, AI specs, multi-shipment, draft auto-save, express mode. |
| Quote Review & Negotiation | quote-review | ⚠️ | ~100 lines. Missing: comparison table of seller quotes, alternative ports display, landed cost breakdown, partial acceptance, counter-offer with reason, deadline extension. |
| Contract Signing | contract-signing | ⚠️ | ~180 lines. Shows contract list + sign modal. Missing: upload own contract, AI validation, logistics addendum signing. |
| Customs Readiness | customs-readiness | ⚠️ | Basic list. Missing: dynamic document checklist (RIA), traffic light status, one-click upload/request. |
| Financing | financing | 🔧 | Backend is comprehensive (trade_finance.ts ~800 lines). Frontend only shows list. Missing: request financing UI, bid viewing, loan management. |
| Distressed Cargo (Buy) | distressed-buy | ⚠️ | Shows listings + offer. Missing: microcontract tracking. |
| Saved Contacts | contacts | ✅ | Works |
| Company Admin | company-admin | ⚠️ | As above |

---

## PART B: PHASE 1 — Trade Initiation (Buyer)

### B1. Section 3B.2 Implementation Status

| Substep | Status | Details |
|---|---|---|
| 3B.2.1 Seller Selection | ✅ | GTID entry + autocomplete + saved contacts search. |
| 3B.2.2 Incoterm Selection | ✅ | Dropdown with all Incoterms 2020. Auto-config of logistics services in backend. |
| 3B.2.3.1 Per-Container Fields | ⚠️ | Has: container type, origin, destination, port of discharge, palletized, pallet size, notes. **GAP**: No "Destination Override" field. |
| 3B.2.3.2 Commodities per Container | ✅ | Two-way HS code/product resolution. Packaging dropdown. Weight fields. |
| 3B.2.3.3 AI Product Specs | ✅ | Backend `/trade-form/ai-product-specs` generates dynamic JSON schema per commodity. Frontend renders dynamic fields. |
| 3B.2.4 Multi-Shipment | ✅ | Toggle reveals schedule builder. |
| 3B.2.5 AI Container Advisor | ✅ | Backend `/trade-form/container-advisor`. Frontend shows advisory banner. |
| 3B.2.6 Marketplace Auto-Attribution | ✅ | Backend `/trade-form/marketplace-check`. Frontend shows banner with dispute window. |
| 3B.2.7 Governor PreScreen | ⚠️ | Backend has 7-step gates. Frontend calls `/trade-form/submit`. **GAP**: Frontend doesn't display individual gate results to user. No visual pre-screen progress. |
| 3B.2.8 Draft Auto-Save | ✅ | 30-second interval. Saves to `trade_requests.draft_data`. Resume via draft-load. |
| 3B.2.9-11 Integration | ✅ | Trade request flows into Phase 2. |

---

## PART C: PHASE 2 — Seller Quote (3B.3)

### C1. Quote Builder (Unified Screen)

| Substep | Status | Details |
|---|---|---|
| 3B.3.1 Open Request | ✅ | `openSellerQuoteBuilder()` loads trade detail, initializes `sqState`. |
| 3B.3.2 Loading Origin | ⚠️ | Frontend has country/port dropdowns. Backend `/seller-quote/loading-origin` has G2U17. **GAP**: No "Alternative Loading Point" (free text + map). No OSRM distance auto-calculation. |
| 3B.3.3.1 Live Market Chart | ⚠️ | `sqDrawMarketChart()` draws Chart.js. Backend `/seller-quote/market-prices` returns data. **GAP**: No green AI-recommended band overlay. No "Use fair price" one-click button. |
| 3B.3.3.2 Dynamic Price Input | ⚠️ | EXW price entry exists. **GAP**: No Per Ton/Per Kilo/Per Unit tabs. No auto-conversion between units. No currency dropdown (hardcoded USD). |
| 3B.3.3.3 Weight Unit Toggle | ❌ | Not implemented. Blueprint requires global metric/imperial toggle. |
| 3B.3.3.4 Total EXW Value | ⚠️ | Shows total. **GAP**: No per-commodity, per-container breakdown. |
| 3B.3.3.5 Deviation Justification | ✅ | Backend checks >30% deviation, requires justification. Frontend has justification field. |
| 3B.3.3.6 Post-Lock Price Watch | 🔧 | Backend `/seller-quote/price-watch` exists. **GAP**: No frontend rendering. No Smart Inbox integration. |
| 3B.3.4.1 Weight Calc Engine | ❌ | Not implemented in frontend. Backend has basic weight fields. |
| 3B.3.4.2 Palletisation Optimiser | ❌ | No ORTools call. No non-uniform layer stacking UI. |
| 3B.3.4.3 Collaborative Editing | ❌ | No Yjs/WebRTC. (Advanced — acceptable to defer) |
| 3B.3.4.4 3D Viewer | ❌ | Not implemented. (Advanced — acceptable to defer) |
| 3B.3.4.5 Ecological Advisor | ❌ | Not implemented. (Nice-to-have) |
| 3B.3.4.6 Carbon Footprint | ❌ | Not implemented. (Nice-to-have) |
| 3B.3.4.7 Lock Packing Plan | 🔧 | Backend `/seller-quote/packing-lock` exists with Loom hash. **GAP**: No frontend button/UI in Quote Builder. |
| 3B.3.5.1 Mode A Manual | ⚠️ | Frontend shows cost lines. Backend saves. **GAP**: Incoterm-based M/O/D filtering shown but fields not dynamically enabled/disabled per rule. Disabled fields still show in UI. |
| 3B.3.5.2 Mode B RFQ | 🔧 | Backend `/seller-quote/logistics-rfq` exists. Frontend has "Send RFQ" button. **GAP**: No provider selection UI. No anonymous broadcast. No clarification Q&A. No "Compare Quotes" panel. |
| 3B.3.5.3 Mode C SHIP Direct | ❌ | Backend table `ship_quote_requests` not in schema. No endpoints. No frontend. |
| 3B.3.5.4 Combining B+C | ❌ | Not possible without Mode C. |
| 3B.3.5.5 Advanced Options | ❌ | No special equipment, loading window, should-cost, batch RFQ. |
| 3B.3.6 Alt Delivery Ports | ⚠️ | Frontend has add/remove port rows. Backend saves. **GAP**: No AI suggestions. No mini-RFQ for unknown costs. No transit time/cost display. |
| 3B.3.7 Multi-Shipment Response | 🔧 | Backend `/seller-quote/multi-shipment-response`. **GAP**: Frontend has no UI for this. |
| 3B.3.8 SGTX Fee Calc | ✅ | Backend calculates 1.5%. Frontend `sqCalculateFee()` calls API and shows breakdown. **NOTE**: Blueprint says 1.5% flat. Backend code says `clamp(0.1%, 2.5%, base_rate + adjustments)` with XGBoost model. Need to verify which is correct per v11.0. |
| 3B.3.9 Submit Quote | ✅ | `sqSubmitQuote()` calls backend, handles governor response. |

### C2. Missing Backend (DB/API)

| Item | Status | Details |
|---|---|---|
| `ship_quote_requests` table | ❌ | Mode C data model not in schema |
| `ship_quotes` table | ❌ | Mode C responses not in schema |
| Mode C endpoints | ❌ | No SHIP direct request/response endpoints |
| Packing plan tables | ⚠️ | `packing_plans` table exists but no `non_uniform_layers` support |

---

## PART D: Other Portals

### D1. Logistics Portal (12C.3)

| Tab | Status | Details |
|---|---|---|
| Smart Inbox | ✅ | Shared |
| Operations Hub | ⚠️ | Dashboard with metrics, ~30 lines |
| RFQ Inbox | ⚠️ | Lists RFQs, ~100 lines. Missing: match score, clarification Q&A |
| Booking Requests | ⚠️ | Stub, ~15 lines |
| Dispatch Planner | ⚠️ | Shows map embed + route list, ~45 lines. No ORTools VRP integration |
| Active Shipments | ✅ | Reuses ShipmentsVault |
| Doc Verification | ⚠️ | Lists docs, ~40 lines |
| Performance | ⚠️ | Shows stats, ~30 lines |
| eBL Management | ⚠️ | Lists eBLs, ~20 lines |

### D2. Financier Portal (12C.8)

| Tab | Status | Details |
|---|---|---|
| Smart Inbox | ✅ | Shared |
| Operations Hub | ⚠️ | Dashboard ~100 lines |
| Opportunities | ✅ | Reuses Financing |
| Full Disclosure | ⚠️ | Shows trade detail + risk, ~35 lines |
| Bidding | ⚠️ | Shows bids, ~45 lines. No co-financing UI |
| Collateral Monitor | ⚠️ | Shows LTV chart, ~50 lines |
| DeFi | ⚠️ | Shows protocols, ~40 lines |
| Secondary Market | ⚠️ | Shows listings, ~15 lines |
| Financed Companies | ⚠️ | Shows list, ~15 lines |
| Settlements | ⚠️ | Shows table, ~75 lines |

### D3. QC Portal (12C.6)

| Tab | Status | Details |
|---|---|---|
| Smart Inbox | ✅ | Shared |
| Inspection Hub | ⚠️ | Dashboard ~90 lines |
| Inspection Queue | ⚠️ | Lists jobs, ~40 lines |
| AQL Sampling | ⚠️ | Shows calculator, ~50 lines |
| AR Inspection | ⚠️ | Placeholder, ~55 lines |
| Reports | ⚠️ | Placeholder, ~15 lines |
| Override Log | ⚠️ | Shows log, ~20 lines |
| Performance | ⚠️ | Shows stats, ~35 lines |

### D4. Government Portal (12C.10)

| Tab | Status | Details |
|---|---|---|
| Smart Inbox | ✅ | Shared |
| Dashboard | ⚠️ | Shows metrics, ~80 lines |
| Live Trade Monitor | ⚠️ | Shows trades, ~40 lines |
| Anonymous Trade | ⚠️ | Shows list, ~25 lines. Missing: declassification audit. |
| Multi-Agency | ⚠️ | Shows workflow, ~35 lines |
| Doc Verification | ⚠️ | Shows flagged docs, ~15 lines |
| Audit Trail | ✅ | Reuses Governor |
| Jurisdiction Matrix | ✅ | Reuses Jurisdictions |
| Customs API | ⚠️ | Shows connectors, ~35 lines |
| **Permit Issuance** | ❌ | Missing tab |
| **Compliance Monitor** | ❌ | Missing tab |

### D5. Admin Portal (12C.11)

| Tab | Status | Details |
|---|---|---|
| Platform Health | ⚠️ | Basic metrics |
| Constitutional Policies | ⚠️ | Shows policies list |
| Governor Log | ✅ | Reuses Governor |
| Jurisdiction Matrix | ✅ | Reuses Jurisdictions |
| PSP Manager | ⚠️ | Shows PSPs |
| Special Rate Manager | ⚠️ | Shows rates |
| Impersonation | ⚠️ | Basic UI |
| Marketplace Partners | ⚠️ | Shows list |
| Incidents | ⚠️ | Shows list |
| Config History | ⚠️ | Shows versions |
| Customer Care | ⚠️ | Shows queue |
| **Tenant Management** | ⚠️ | Shows list but missing: KYB review, multisig impersonation |

### D6. Marketplace Partner Portal (12C.12)

| Tab | Status | Notes |
|---|---|---|
| Dashboard | ⚠️ | Basic stats |
| API Keys | ⚠️ | Shows keys |
| Lead Management | ⚠️ | Shows leads |
| Webhooks | ⚠️ | Shows webhooks |
| Revenue Attribution | ⚠️ | Shows list |
| Sandbox | ⚠️ | Shows status |
| Usage Analytics | ⚠️ | Shows chart |

---

## PRIORITY RANKING FOR IMPLEMENTATION

### Priority 1 — Critical (Blocks demo flow)
1. **Missing "Laboratory Selection" seller tab** — Blueprint 12C.2 tab 7
2. **Quote Builder EXW: AI fair price band + "Use fair price" button**
3. **Quote Builder EXW: Per-commodity/container price breakdown**
4. **Quote Builder EXW: Currency dropdown (not just USD)**
5. **Quote Builder Logistics: Mode A field enable/disable per incoterm rule**
6. **Quote Builder: Packing Lock button in UI**
7. **Buyer Quote Review: Comparison table with seller quotes**
8. **Government Portal: Missing Permit Issuance and Compliance Monitor tabs**

### Priority 2 — Important (Enhances demo completeness)
9. **Quote Builder Logistics: Mode B provider selection + Compare Quotes panel**
10. **Multi-Shipment Response UI in seller flow**
11. **Alt Delivery Ports: AI suggestions + transit time display**
12. **Smart Inbox: Recommended Actions Widget with one-click actions**
13. **Loading Origin: Distance auto-calc display**
14. **Buyer Financing: Full request/bid/manage UI**
15. **Document Finalisation: Actual sign/generate functionality**
16. **Barcode Print: SSCC-18 label generation**

### Priority 3 — Nice-to-have (Advanced features)
17. Mode C SHIP Direct Request (needs new DB tables + endpoints)
18. Weight Unit Toggle (metric/imperial)
19. Palletisation Optimiser UI
20. Post-Lock Price Watch UI
21. VoiceCommandButton
22. Customer Care Chatbot
23. 3D Container Viewer
24. Ecological Packaging Advisor
25. Carbon Footprint Calculator

---

*Generated: 2026-06-10*

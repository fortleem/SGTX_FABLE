# SGTX Cockpit — Tab → Destination Mapping (Rebuild Phase 1)

The old portal system exposed 94 flat tabs across 10 portal menus. The cockpit
collapses everything into **7 top-level groups**. Every legacy tab maps to exactly
one destination — nothing was deleted from the product, only repackaged.

## Top-level groups (max 7 — Law: IA collapse)

| # | Group | Canonical URL | Purpose |
|---|-------|---------------|---------|
| 1 | Home | `/home` | What needs my attention now (Smart Inbox) |
| 2 | Trades | `/trades` | Trade lifecycle: request → quote → contract. One trade = one URL: `/trades/:ref` |
| 3 | Operations | `/app/shipments-vault` | Physical movement, inspection, testing, documents |
| 4 | Money | `/finance` | Pricing, financing, settlement, invoices |
| 5 | Trust | `/trust` | Governance, compliance, disputes, jurisdictions |
| 6 | Network | `/network` | Counterparties, market intelligence, integrations |
| 7 | Admin | `/admin` | Platform machinery (PLATFORM_ADMIN only) / own-company admin (tenants) |

Visibility rules:
- A group renders only if the current role's portal has at least one screen in it.
- **Admin machinery is invisible to tenants**: non-admin users see at most
  "Company Admin" under Admin; platform screens (tenants, impersonation, PSP,
  incidents, config history…) require `PLATFORM_ADMIN`.
- Progressive disclosure: child screens render only under the **active** group.

## Full legacy-tab mapping

| Legacy tab | Group | Notes |
|---|---|---|
| smart-inbox | Home | Landing destination `/home` |
| trade-command | Trades | `/trades` list |
| new-trade | Trades | `/trades/new` wizard |
| quote-review, contract-signing, negotiation | Trades | buyer lifecycle |
| pending-requests, quote-submit, rfq-inbox | Trades | seller lifecycle |
| distressed-buy, distressed-sell | Trades | distressed cargo market |
| shipments-vault, active-shipments, dispatch-planner, booking-requests | Operations | movement |
| customs-readiness, doc-verification, doc-finalisation, ebl-management | Operations | documents |
| containerisation, logistics-builder, logistics-dashboard, barcode-print | Operations | logistics |
| lab-selection, lab-dashboard, lab-testing-jobs, lab-results, lab-certificates, lab-performance | Operations | laboratory |
| qc-booking, qc-dashboard, inspection-queue, aql-enforcement, ar-inspection, qc-reports, qc-performance | Operations | QC/inspection |
| ship-dashboard, ship-booking-requests, ship-ebl, ship-vessel-schedule, ship-performance, performance-dash | Operations | shipping line |
| financing, cash-position, exw-price-lock | Money | trader money |
| financier-dashboard, financing-opportunities, full-disclosure, bidding, collateral-monitor, defi-tab, secondary-market, financed-companies, settlements | Money | financier |
| ship-freight-invoices, ship-contract-rates, lab-invoices | Money | provider billing |
| governor, disputes, override-log, jurisdictions | Trust | governance |
| gov-dashboard, live-trade-monitor, anonymous-trade, multi-agency, gov-docs, gov-audit, gov-jurisdictions, gov-compliance, gov-permits, customs-api | Trust | government portal |
| contacts, world-trade | Network | counterparties + intel |
| mp-dashboard, lead-management, api-keys, webhooks, sandbox-env, usage-analytics, revenue-attribution | Network | marketplace/integrations |
| dashboard, tenants, admin-health, constitutional, governor-log, jurisdiction-matrix, psp-manager, special-rates, impersonation, marketplace-partners, incidents, config-history, customer-care | Admin | PLATFORM_ADMIN only |
| company-admin | Admin | visible to the tenant itself |

## Canonical URL scheme (Phase 0)

| URL | Resolves to |
|---|---|
| `/` | Landing (public) |
| `/login`, `/join` | Auth |
| `/home` | Smart Inbox (action-first home) |
| `/trades` | Trade list |
| `/trades/new` | Trade request wizard |
| `/trades/:ref` | Canonical trade workspace (ref = trade id or USTN) |
| `/trades/:ref/:sub` | Workspace subview |
| `/network` `/finance` `/trust` `/admin` | Group destinations |
| `/app/:page` | Deep link to any legacy screen id |
| anything else | **Explicit 404 — never redirected** (Law 5) |

# SGTX — Sovereign Governed Trade Execution Platform

## Project Overview
- **Name**: SGTX Platform (v12)
- **Goal**: Non-custodial, AI-governed operating system for global trade execution — per Blueprint v11.0 (Parts 1–30)
- **Model**: Not a marketplace, not a bank. Governed execution rails with a fixed 1.5% FeeLock, USTN shipment identity, GTID tenant identity, and Loom-anchored audit.

## URLs (Local Sandbox)
- **Live preview**: https://3000-il85601vwqkrrkvpugkce-d0b9e1e2.sandbox.novita.ai
- **Landing (cinematic)**: `/` — intro reveal, canvas trade globe, live world-trade ticker, chokepoint monitor
- **Portal hub**: `/portals` — 9 individual portal entrances
- **Individual portal logins**: `/portal/:id/login` (trader, logistics, shipping, financier, qc, laboratory, government, admin, marketplace)
- **Portal app**: `/portal/:id` (auth-gated per tenant type, server-side 403)
- **Registration**: `/register`
- Cloud deployment: deferred per owner instruction (local only for now)

## Individual Portal Authentication (Blueprint 12C)
- Each portal has its own branded login screen and server-side tenant-type gate.
- Login POST `/api/v1/auth/login` with `{email, password, portal}` — wrong tenant type → 403.
- Admin portal requires PLATFORM_ADMIN role.

### Demo Credentials (password: `demo123`, admin: `admin123`)
| Portal | Email |
|---|---|
| Trader (Buyer) | hans@euimport.com |
| Trader (Seller) | ahmed@nilefoods.com |
| Financier | fatma@nbe.com.eg |
| Logistics | yasser@nilelogistics.com |
| Shipping Line | captain@medshipping.com |
| QC | noha@qualitycheck.com |
| Laboratory | dr.samir@cairolabs.com |
| Customs Broker | mohamed@deltabrokers.com |
| Government | general.ibrahim@customs.gov.eg |
| Admin | admin@sgtx.io |

## v12 Design System — "Sovereign Obsidian & Gold"
- Obsidian chrome (sidebar + header, #0B0B0D) with gold radial glows and hairline gold rules
- Ivory execution surface for content, gold-topline cards with hover lift
- Sora display font for headings/buttons, Inter body, JetBrains Mono for identifiers
- Gold sheen buttons, gradient-text headlines, glowing active nav states
- Applied across: app shell, login, register, portal hub, portal logins, landing

## Feature Coverage (10-Phase Lifecycle)
- Trade Request (container specs, HS auto-fill, AI advisor, multi-shipment)
- EXW Price Lock (AI fair-price band + "Use Fair Price", per-lot breakdown, currency, Governor gate)
- Containerisation (weight engine, VGM, layer stacking, Packing Lock)
- Logistics Builder — Mode A (incoterm-gated carrier selection), Mode B (RFQ broadcast + compare/accept), Mode C (SHIP direct)
- Quote Submit (landed-cost assembly), Buyer Quote Review (side-by-side comparison table, counter-offer, accept)
- Contract Signing (Ed25519 + QES), Document Finalisation (per-doc generate & sign, Loom hashes), SSCC-18 Barcode Print
- Financing (anonymous RFQ, bid accept via Governor gate, active loans), Distressed Cargo
- Lab Selection, QC Booking, Customs Readiness, Disputes
- World Trade Intelligence tab (trader, logistics, shipping, financier, government, admin) — chokepoints, freight indices (SCFI/BDI/WCI/FBX), commodity benchmarks, corridors, Gemini→Groq AI briefing + governed Q&A
- All 9 portals fully rendered: LSP ops, Financier desk, QC inspection, Government (compliance monitor, permits, customs API), Admin (constitutional policies, PSP, impersonation…), Marketplace partner, Shipping line, Laboratory

## Data Architecture
- **Storage**: Cloudflare D1 (local SQLite via `--local`), migrations in `migrations/0001_consolidated.sql`, seed in `seed.sql` (15 tenants, 16 employees)
- **AI**: Gemini 2.0 Flash primary → Groq llama-3.3-70b fallback (keys in `.dev.vars`, gitignored)
- **Key models**: tenants (GTID), employees, trade_requests, contracts, shipments (USTN), governor_decisions

## Dev Commands
```bash
npm run build                      # vite build (kill workerd/vite first — 985MB RAM sandbox)
pm2 start ecosystem.config.cjs     # wrangler pages dev dist --d1 ... --local, port 3000
npm run db:migrate:local && npm run db:seed
```

## Deployment
- **Platform**: Cloudflare Pages (deferred; local sandbox only for now)
- **Status**: ✅ Active locally · Build: 77 modules, _worker.js ~1.43MB
- **Tech Stack**: Hono + TypeScript + D1 + vanilla JS SPA + TailwindCSS (CDN)
- **Last Updated**: 2026-07-26

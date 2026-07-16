// ═══════════════════════════════════════════════════════════════════════════════
// SGTX Platform — Constitution Module (Part 0: Core Governance Philosophy)
// Blueprint v11.1 — Part 0.2: The Seven Unshakable Pillars
// ═══════════════════════════════════════════════════════════════════════════════
//
// This module codifies the immutable constitutional principles of SGTX.
// These are NOT configurable — they are the platform's DNA.
// Any change requires a constitutional amendment (3/5 multisig approval).
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 0.1 Mission Statement ────────────────────────────────────────────────────
export const MISSION_STATEMENT = {
  title: 'SGTX — Sovereign Governed Trade Execution',
  subtitle: 'The Operating System for Global Trade',
  core: 'SGTX is a non-custodial, AI-governed, sovereign trade execution engine — an operating system for global trade, not a marketplace.',
  what_it_is: [
    'Infrastructure for organisations that already know each other to execute cross-border trade with cryptographic certainty',
    'AI-assisted optimisation with zero counterparty risk through non-custodial FeeLock protection',
    'A provably neutral execution layer — the OS that makes every trade self-verifying, self-enforcing, and jurisdiction-aware',
  ],
  what_it_is_not: [
    'Not a marketplace — never introduces buyers to sellers',
    'Not a bank — never holds funds',
    'Not a logistics company — never takes title to goods',
    'Not a broker — never recommends counterparties',
  ],
  vision: 'One click to ship, one click to import, one click to pay, and one universal number to rule the entire transaction.',
  zero_cost: 'Every line of code, every microservice, every AI model, every deployment artefact is built exclusively on open-source software, free public APIs, and bare-metal infrastructure. No cloud, no SaaS, no billing details ever required.',
  version: '11.1',
  ratified: '2026-06-14',
};

// ─── 0.2 The Seven Unshakable Pillars ─────────────────────────────────────────
export const SEVEN_PILLARS = [
  {
    id: 'P1',
    name: 'Non-Custodial by Design',
    tagline: 'SGTX never holds funds, never takes title to goods, never brokers introductions.',
    principles: [
      'All funds flow directly between buyer and seller via PSP split instructions',
      'The platform only instructs PSPs — it never touches the money',
      'FeeLock protects counterparties without custodial risk',
      'No escrow, no float, no intermediation of funds',
    ],
    technical: 'PSP split instruction model: SGTX instructs PSP to split payment at source. Platform receives only the 1.5% infrastructure fee via the PSP split, never the full trade value.',
    invariant: 'The platform\'s balance sheet never reflects a single dollar of trade value.',
  },
  {
    id: 'P2',
    name: 'AI-Governed, Never Autonomous',
    tagline: 'AI assists, advises, and constrains — but never executes irreversible actions autonomously.',
    principles: [
      'Every irreversible action requires Governor approval (OPA + WasmEdge + AI consult)',
      'AI Authority Ladder A0-A4 defines exactly what AI can and cannot do',
      'A5 (autonomous execution) is forbidden — blocked at WASM compile time',
      'All AI calls are logged in ai_inference_records with full traceability',
    ],
    technical: 'Three-stage pipeline: OPA (Rego policies) → WasmEdge (constitutional modules) → AI Router (Groq for A1, HuggingFace for A2/A3). AI only returns DecisionSuggestion — Governor merges with policy verdicts.',
    invariant: 'The final decision always originates from human intent and immutable constitutional rules.',
  },
  {
    id: 'P3',
    name: 'No Marketplace, No Recommendations',
    tagline: 'SGTX never suggests counterparties, ranks tenants, or recommends service providers.',
    principles: [
      'All relationships are established outside SGTX and onboarded by users themselves',
      'AI autocomplete is limited to user\'s own history — never "other users also picked"',
      'Dropdown populations come from static catalogues or RIA, never "popular choices"',
      'LSP/SHIP/LAB/QC providers must be explicitly saved by the user (Network feature)',
    ],
    technical: 'The platform only displays providers from the user\'s own contacts list. The Network feature shows saved contacts only — never a global directory. No ranking engine exists in the codebase.',
    invariant: 'Users control exactly who they trade with. The platform facilitates, never recommends.',
  },
  {
    id: 'P4',
    name: 'Jurisdiction Supremacy',
    tagline: 'The strictest rule among all parties always applies.',
    principles: [
      'Applies strictest of: buyer country, seller country, logistics country, financier country, governing law',
      'RIA (Regulatory Intelligence Agent) scrapes 300+ official sources every 15 minutes',
      'Jurisdiction tiers: FULL → STANDARD → LIMITED → RESTRICTED → BLOCKED',
      'Autoblocked jurisdictions: KP, IR, SY, CU, RU, BY — DENY at Governor level',
    ],
    technical: 'jurisdiction_matrix.wasm module compiled by RIA, hot-loaded without restart. Governor applies WasmEdge constitutional gate before any action proceeds.',
    invariant: 'No trade can proceed if any party is from a blocked jurisdiction.',
  },
  {
    id: 'P5',
    name: 'Universal Traceability — GTID & USTN',
    tagline: 'Every entity has a GTID. Every shipment has a USTN. Every action is attributable.',
    principles: [
      'GTID: SGTX-{COUNTRY}-{ENTITY_TYPE}-{SEQUENCE}-{CHECKSUM} — deterministic, zero-cost',
      'USTN: SGTX-{BUYER_SUFFIX}-{SELLER_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8} — company-anchored',
      'Loom: deterministic append-only hash chain for immutable audit trail',
      'Every irreversible action is signed (Ed25519) and logged in the Loom chain',
    ],
    technical: 'GTID uses CRC32-ISO-HDLC checksum. USTN prevents replay attacks through company anchoring — a USTN cannot be reused across different counterparties. Loom chain anchored at genesis (hash of compiled constitutional WASM modules).',
    invariant: 'Governments get absolute, real-time visibility of the entire trade cycle.',
  },
  {
    id: 'P6',
    name: 'Fixed, Transparent Fee Model',
    tagline: '1.5% per country side. No hidden fees. Non-custodial collection.',
    principles: [
      'Each country\'s side pays 1.5% of invoice value on their cross-border flows',
      'Financing fee: flat 0.25% of financed amount, paid by borrower',
      'Optional service fees (broker, lab, QC): 3% platform fee on provider payment',
      'All fees collected via PSP split — SGTX never holds funds',
    ],
    technical: 'Commission formula: clamp(0.1%, 2.5%, base + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability ± anomaly). Gross-up: (Net + Fixed) / (1 - Pct%) + Buffer.',
    invariant: 'No variable "marketplace commissions" — just fixed, transparent, constitutional percentages.',
  },
  {
    id: 'P7',
    name: 'Zero-Cost Technology Commitment',
    tagline: 'Every component is built on open-source software, free APIs, and bare-metal infrastructure.',
    principles: [
      'No cloud dependency — runs on bare-metal servers',
      'No SaaS — every component is self-hosted',
      'No billing details ever required from users beyond trade identity',
      'All add-ons (GNN, Federated Learning, Causal Inference, PQC, ZK) are zero-cost and self-hosted',
    ],
    technical: 'Stack: Hono (TypeScript), Cloudflare Workers/Pages (edge runtime), D1 (SQLite), WasmEdge (constitutional engine), OPA (policy engine), Groq/HuggingFace (AI, free tiers).',
    invariant: 'The platform\'s operating cost is zero. Only trade infrastructure fees apply.',
  },
];

// ─── 0.3 GTID Specification ───────────────────────────────────────────────────
export const GTID_SPEC = {
  prefix: 'SGTX',
  format: 'SGTX-{COUNTRY_CODE}-{ENTITY_TYPE}-{SEQUENCE}-{CHECKSUM}',
  example: 'SGTX-EG-TRD-002139-7F3A',
  components: {
    COUNTRY_CODE: { description: 'ISO 3166-1 alpha-2', examples: ['EG', 'DE', 'VN', 'SA', 'AE'] },
    ENTITY_TYPE: {
      description: '3-letter entity type code',
      values: {
        TRD: 'Trader (importer/exporter)',
        LOG: 'Logistics provider (LSP, SHIP, freight forwarder)',
        FIN: 'Financial institution (bank, PFI, DeFi protocol)',
        QC: 'Quality control / inspection / laboratory',
        GOV: 'Government entity',
        REG: 'Regulatory body',
        MP: 'Marketplace partner (PSP, insurer, etc.)',
      },
    },
    SEQUENCE: { description: 'Zero-padded 6-digit number, unique per (country, type)', example: '002139' },
    CHECKSUM: { description: '4-hex-digit CRC32-ISO-HDLC of concatenated fields', example: '7F3A' },
  },
  resolution_endpoint: 'GET /api/v1/gtid/resolve?gtid=SGTX-EG-TRD-002139-7F3A',
  resolution_returns: ['legal_name', 'type', 'jurisdiction', 'trust_score', 'kyb_tier', 'sanctions_cleared', 'lifecycle_state'],
  resolution_never_returns: ['trade_data', 'email', 'bank_details', 'counterparty_list'],
};

// ─── 0.4 USTN Specification ───────────────────────────────────────────────────
export const USTN_SPEC = {
  format: 'SGTX-{BUYER_SUFFIX}-{SELLER_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}',
  example: 'SGTX-1397F3A-456ABC-20260415120000-A1B2C3D4',
  total_length: 42,
  components: {
    BUYER_SUFFIX: 'Last 7 alphanumeric of buyer GTID (after removing hyphens)',
    SELLER_SUFFIX: 'Last 7 alphanumeric of seller GTID',
    TIMESTAMP: 'UTC timestamp of contract lock: YYYYMMDDHHMMSS (14 digits)',
    RANDOM8: '8 random alphanumeric characters (34-char alphabet excluding I, O, 0, 1)',
  },
  properties: [
    'Company-anchored — prevents replay attacks across different counterparties',
    'Deterministically generated at contract lock — no user input required',
    'Auto-populated into every document, API call, and payment reference',
    'Single-shipment: one USTN per contract. Multi-shipment: one USTN per shipment.',
  ],
  micro_ustn_format: 'SGTX-MC-{PARENT_USTN_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}',
  anonymous_ustn_format: 'SGTX-ANON-{YYYYMMDDHHMMSS}-{RANDOM12}',
  sandbox_ustn_format: 'SB-{BUYER_SUFFIX}-{SELLER_SUFFIX}-{YYYYMMDDHHMMSS}-{RANDOM8}',
};

// ─── 0.5 AI Authority Ladder (canonical definitions) ───────────────────────────
export const AI_LADDER = {
  title: 'AI Authority Ladder — Three-Tier, Zero-Cost, Assistive Only',
  constraint: 'AI never suggests a counterparty, never ranks logistics providers, never recommends a specific financier, and never offers "you may also trade with X".',
  levels: {
    A0: {
      name: 'Observational',
      description: 'Logging only, no influence. Performance monitoring, analytics.',
      can_execute: false,
      can_block: false,
      can_advise: false,
      primary_provider: 'none',
      fallback: 'none',
      examples: ['Performance monitoring', 'Analytics dashboards', 'System health metrics'],
    },
    A1: {
      name: 'Advisory',
      description: 'Suggestions only, cannot block. AI provides autocomplete, dropdowns, default values.',
      can_execute: false,
      can_block: false,
      can_advise: true,
      primary_provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      fallback: 'ollama (Llama 3 8B quantised)',
      rate_limit: '30 req/min, 14,400 req/day',
      allowed_uses: [
        'Smart Inbox title/description generation',
        'Tenant message generation (explaining policy blocks)',
        'Form autocomplete (product names, HS codes, port codes) — user\'s own history only',
        'Dropdown population (packaging types, pallet sizes, incoterms) — static catalogues only',
        'Default value recommendations ("Based on your previous trades...")',
        'Live market charts and AI-recommended price bands (anonymised aggregates)',
        'Loading guide generation',
      ],
      failure_mode: 'Static template with notice: "This message is not available in your language. Please contact support."',
    },
    A2: {
      name: 'Constraining',
      description: 'Can block, delay, escalate — never force. AI returns CONDITIONAL verdicts.',
      can_execute: false,
      can_block: true,
      can_advise: true,
      primary_provider: 'huggingface',
      model: 'Mixtral-8x7B-Instruct',
      fallback: 'ollama',
      rate_limit: 'None (local inference)',
      allowed_uses: [
        'Compliance prescreen (sanctions, dual-use goods) — returns CONDITIONAL',
        'Document verification (AI flags discrepancies) — blocks submission until resolved',
        'Cold-chain anomaly detection — alerts buyer/seller',
        'GNN risk flagging — blocks trade if sanctions proximity ≤2 hops',
        'Price reasonableness check — requires justification if deviation >30% from AI band',
        'SAR detection (Isolation Forest + rule-based)',
        'Shell company detection',
        'Fraud detection',
      ],
      failure_mode: 'Governor returns CONDITIONAL with "Manual review required" and escalates to human.',
    },
    A3: {
      name: 'Escalation',
      description: 'Forces human review, cannot decide autonomously. Governance-level oversight.',
      can_execute: false,
      can_block: true,
      can_advise: true,
      primary_provider: 'huggingface+groq',
      model: 'Mixtral-8x7B-Instruct + llama-3.3-70b-versatile',
      fallback: 'ollama (for both)',
      allowed_uses: [
        'High-risk trade approval (new high-risk corridor, large value)',
        'Negotiation deadlock — suggests settlement structure but does not impose',
        'Causal analysis for disputes — provides root cause contribution percentages',
        'Model drift detection — triggers retraining recommendation',
      ],
      failure_mode: 'Governor creates high-priority Smart Inbox item for Platform Governance Authority.',
    },
    A4: {
      name: 'Governance',
      description: 'Auto-executes within constitutional bounds. OPA + WasmEdge only, no AI call.',
      can_execute: true,
      can_block: true,
      can_advise: false,
      primary_provider: 'opa+wasmEdge',
      model: 'constitutional_gate',
      fallback: 'none',
      allowed_uses: [
        'Low-risk milestone confirmation (barcode scan matches expected pallet)',
        'Auto-reconciliation of payments (match PSP webhook to open invoice)',
        'Fee calculation (dynamic rate based on commodity/country pair)',
        'Lifecycle state transitions',
        'Governor verdict enforcement (ALLOW/DENY)',
      ],
      constraint: 'No AI inference — purely deterministic OPA policy evaluation and WasmEdge constitutional gate.',
    },
    A5: {
      name: 'FORBIDDEN',
      description: 'Any autonomous execution. Blocked at WASM compile time.',
      can_execute: false,
      can_block: false,
      can_advise: false,
      primary_provider: 'NONE',
      model: 'BLOCKED',
      fallback: 'NONE',
      constraint: 'Attempts to invoke A5 are logged as constitutional violations and trigger an incident. This level exists only to document what must never happen.',
    },
  },
};

// ─── 0.6 Fee Model Specification ──────────────────────────────────────────────
export const FEE_MODEL = {
  infrastructure_fee: {
    rate: 0.015, // 1.5%
    description: 'Each country\'s side pays 1.5% of invoice value on their cross-border flows',
    payer: 'Determined by incoterm: exporter pays for CFR/CIF/CPT/CIP/DAP/DPU/DDP; importer pays for EXW/FCA/FAS/FOB',
    collection: 'Via PSP split — SGTX never holds funds',
    collection_timing: {
      single_shipment: 'At contract lock (full amount)',
      multi_shipment: 'Per-shipment at each shipment lock',
    },
  },
  financing_fee: {
    rate: 0.0025, // 0.25%
    description: 'Flat 0.25% of financed amount, deducted from disbursement via PSP split',
    payer: 'Borrower',
    collection: 'Via PSP split at disbursement',
  },
  optional_service_fee: {
    rate: 0.03, // 3%
    description: '3% platform fee on service provider payment (broker, lab, QC)',
    payer: 'Service provider (deducted from their payment)',
    services: ['Customs broker certification', 'Laboratory testing', 'QC inspection'],
  },
  commission_formula: 'clamp(0.1%, 2.5%, base_rate + country_boost + seasonality ± geopolitical_risk - volume_discount + perishability ± anomaly)',
  gross_up_formula: 'Gross = (Net + Fixed_Fees) / (1 - Percentage_Fee) + Safety_Buffer',
  examples: [
    {
      scenario: 'Egyptian exporter sells $100,000 to German importer (CIF, single shipment)',
      egyptian_side: { rate: '1.5%', amount: '$1,500', payer: 'Egyptian exporter' },
      german_side: { rate: '1.5%', amount: '$1,500', payer: 'German importer', note: 'Applies when Germany adopts SGTX' },
      optional_broker: { fee: '$150', platform_cut: '$4.50', provider_net: '$145.50' },
      total_sgtx_fees: '$3,150',
      comparison: 'Less than traditional demurrage, document discrepancies, and financing costs combined.',
    },
    {
      scenario: 'Vietnamese exporter sells $50,000 to Saudi importer (FOB, single shipment)',
      vietnamese_side: { rate: '1.5%', amount: '$750', payer: 'Saudi importer (FOB → importer pays)' },
      saudi_side: { rate: '1.5%', amount: '$750', payer: 'Saudi importer', note: 'Applies when Saudi Arabia adopts SGTX' },
      total_sgtx_fees: '$1,500',
    },
  ],
};

// ─── 0.7 One-Click Automation Map ─────────────────────────────────────────────
export const ONE_CLICK_AUTOMATION = {
  description: 'Every irreversible action from trade request to settlement is a single click (or voice command) that triggers a deterministic, Governor-gated chain of events.',
  max_clicks: 7,
  phases: [
    { phase: 0, action: 'Submit Trade Request', gates: ['G0U1-G0U5'], description: 'AI parses free-text → fills dynamic product form → HS code lookup → jurisdiction prescreen' },
    { phase: 1, action: 'Seller Quote & Lock', gates: ['G1U1-G1U11'], description: 'Seller locks EXW price → AI recommends price band → logistics RFQ auto-generated' },
    { phase: 2, action: 'Contract Assembly', gates: ['G2U1-G2U10'], description: 'Clause Forge assembles contract → CommissionLock created → parties sign' },
    { phase: 3, action: 'Contract Lock', gates: ['G3U1-G3U10'], description: 'Commission collected → USTN generated → documents auto-populated → Loom chain started' },
    { phase: 4, action: 'Financing (if needed)', gates: ['G4U1-G4U10'], description: 'Financier bids → AI ranks → award → disbursement via PSP split' },
    { phase: 5, action: 'Physical Execution', gates: ['G5U1-G5U8'], description: 'IoT tracking → milestone auto-confirmation → commission release per gate' },
    { phase: 6, action: 'Settlement', gates: ['G6U1-G6U9'], description: 'PSP split → reconciliation → government notification → Loom chain verification' },
  ],
  ai_assistance: [
    'Autocomplete product names from user\'s own history',
    'Auto-populate customs declaration from USTN',
    'Live market chart with AI-recommended price band (user can override)',
    'No data re-entry across any phase',
  ],
};

// ─── 0.8 Non-Custodial Guarantee ──────────────────────────────────────────────
export const NON_CUSTODIAL_GUARANTEE = {
  title: 'SGTX Never Holds Funds',
  description: 'The platform\'s balance sheet never reflects a single dollar of trade value. All funds flow directly between trading parties via PSP split instructions.',
  mechanisms: [
    {
      name: 'PSP Split Instruction',
      description: 'SGTX instructs the Payment Service Provider to split the payment at source. The PSP sends the net amount to the seller and the infrastructure fee to SGTX. SGTX never receives the full trade value.',
    },
    {
      name: 'FeeLock Protection',
      description: 'CommissionLock is a cryptographic commitment, not a custodial hold. Funds remain in the buyer\'s account until the PSP executes the split at settlement.',
    },
    {
      name: 'No Escrow, No Float',
      description: 'SGTX does not operate an escrow service, does not hold balances, and does not earn interest on trade funds. There is no float.',
    },
  ],
  guarantees: [
    'Zero counterparty risk from SGTX itself',
    'If SGTX ceases operations, all trades settle directly between parties',
    'All PSP relationships are direct between trader and PSP — SGTX is not a party',
    'Trade funds never appear on SGTX\'s balance sheet',
  ],
};

// ─── 0.9 Zero-Cost Technology Inventory ───────────────────────────────────────
export const ZERO_COST_INVENTORY = {
  description: 'Every component is built on open-source software, free public APIs, and bare-metal infrastructure.',
  categories: {
    runtime: ['Hono (TypeScript web framework)', 'Cloudflare Workers/Pages (edge runtime)'],
    database: ['Cloudflare D1 (SQLite, globally distributed)', 'Cloudflare KV (key-value store)', 'Cloudflare R2 (object storage)'],
    governance: ['OPA/Rego (policy engine)', 'WasmEdge (constitutional sandbox)', 'CRC32-ISO-HDLC (GTID checksum)'],
    ai: ['Groq (free tier: llama-3.3-70b, 30 req/min)', 'HuggingFace (free tier: Mixtral-8x7B, Donut, ViT)', 'Ollama (local: Llama 3 8B quantised)'],
    frontend: ['TailwindCSS (CDN)', 'Chart.js (CDN)', 'Font Awesome (CDN)', 'Axios (CDN)'],
    cryptography: ['SHA-256 (Web Crypto API)', 'Ed25519-sim (HMAC for Workers)', 'Deterministic Loom hash chain'],
  },
  cost: '$0/month (infrastructure) + trade fees only',
};

// ─── 0.10 Platform Constitution (canonical, immutable) ────────────────────────
export const PLATFORM_CONSTITUTION = {
  preamble: 'SGTX is the Sovereign Governed Trade Execution platform — a non-custodial, AI-governed operating system for global trade. This constitution defines the immutable principles that govern the platform\'s operation.',
  articles: [
    {
      article: 1,
      title: 'Non-Custodial Guarantee',
      text: 'The platform shall never hold funds, take title to goods, or act as a counterparty to any trade. All funds flow directly between trading parties via PSP split instructions.',
    },
    {
      article: 2,
      title: 'No Marketplace',
      text: 'The platform shall never introduce buyers to sellers, rank counterparties, recommend service providers, or suggest trading partners. All relationships are established outside SGTX.',
    },
    {
      article: 3,
      title: 'AI Governance',
      text: 'AI shall assist, advise, and constrain — but never autonomously execute irreversible actions. The AI Authority Ladder (A0-A4) defines precise boundaries. A5 (autonomous execution) is constitutionally forbidden.',
    },
    {
      article: 4,
      title: 'Governor Supremacy',
      text: 'Every irreversible action must pass through the Governor Service (OPA + WasmEdge + AI consult). No action bypasses this layer.',
    },
    {
      article: 5,
      title: 'Jurisdiction Supremacy',
      text: 'The strictest rule among all parties (buyer, seller, logistics, financier, governing law) always applies. Blocked jurisdictions result in automatic DENY.',
    },
    {
      article: 6,
      title: 'Universal Traceability',
      text: 'Every entity has a GTID. Every shipment has a USTN. Every Governor decision is logged in the deterministic Loom hash chain. Every action is attributable.',
    },
    {
      article: 7,
      title: 'Fixed Fee Model',
      text: 'Fees are fixed and transparent: 1.5% per country side on cross-border flows, 0.25% on financing, 3% on optional services. No hidden fees. No variable commissions.',
    },
    {
      article: 8,
      title: 'Zero-Cost Technology',
      text: 'Every component shall be built on open-source software, free public APIs, and infrastructure that requires no billing details. The platform\'s operating cost is zero.',
    },
    {
      article: 9,
      title: 'Constitutional Amendment',
      text: 'Any change to this constitution requires a 3/5 multisig approval from the Platform Governance Authority. Constitutional WASM modules are pre-compiled, signed, and immutable without amendment.',
    },
    {
      article: 10,
      title: 'Data Sovereignty',
      text: 'Tenants control their data. GTID resolution returns only consent-granted fields. The Loom verification endpoint returns only hash chains, never trade data. Full PDPL/GDPR compliance.',
    },
  ],
};

// ─── Helper: Get pillar by ID ──────────────────────────────────────────────────
export function getPillar(id: string) {
  return SEVEN_PILLARS.find(p => p.id === id) || null;
}

// ─── Helper: Get AI ladder level ──────────────────────────────────────────────
export function getAILevel(level: string) {
  return (AI_LADDER.levels as Record<string, any>)[level] || null;
}

// ─── Helper: Verify action against constitution ───────────────────────────────
export function verifyConstitutionalCompliance(action: string, context: Record<string, any>): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];

  // Article 1: Non-custodial check
  if (context.holds_funds || context.takes_title) {
    violations.push('Article 1: Platform must not hold funds or take title to goods');
  }

  // Article 2: Marketplace check
  if (context.recommends_counterparty || context.ranks_tenants || context.suggests_provider) {
    violations.push('Article 2: Platform must not recommend, rank, or suggest counterparties');
  }

  // Article 3: AI autonomy check
  if (context.ai_autonomous_execution || context.ai_authority === 'A5') {
    violations.push('Article 3: AI must not autonomously execute irreversible actions. A5 is forbidden.');
  }

  // Article 4: Governor bypass check
  if (context.bypasses_governor) {
    violations.push('Article 4: All irreversible actions must pass through Governor Service');
  }

  // Article 5: Jurisdiction check
  if (context.blocked_jurisdictions?.length > 0) {
    violations.push(`Article 5: Blocked jurisdictions detected: ${context.blocked_jurisdictions.join(', ')}`);
  }

  // Article 7: Fee bounds check
  if (context.fee_rate && (context.fee_rate < 0.001 || context.fee_rate > 0.025)) {
    violations.push(`Article 7: Fee rate ${(context.fee_rate * 100).toFixed(1)}% outside constitutional bounds (0.1% - 2.5%)`);
  }

  return { compliant: violations.length === 0, violations };
}

// ─── Full constitution export ──────────────────────────────────────────────────
export const CONSTITUTION = {
  mission: MISSION_STATEMENT,
  pillars: SEVEN_PILLARS,
  gtid: GTID_SPEC,
  ustn: USTN_SPEC,
  ai_ladder: AI_LADDER,
  fee_model: FEE_MODEL,
  automation: ONE_CLICK_AUTOMATION,
  non_custodial: NON_CUSTODIAL_GUARANTEE,
  zero_cost: ZERO_COST_INVENTORY,
  articles: PLATFORM_CONSTITUTION,
  verify: verifyConstitutionalCompliance,
  getPillar,
  getAILevel,
};

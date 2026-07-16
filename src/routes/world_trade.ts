// SGTX Platform — World Trade Intelligence Module
// Global trade data, vessel tracking (AIS), trade corridors, Gemini AI insights
// Collaborates with SGTX core: USTN shipments, commodity intel, trade corridors (Part 30 TCN)
import { Hono } from 'hono';
import type { Bindings } from '../lib/types';

interface Env extends Bindings {
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AIS_STREAM_API_KEY?: string;
}

const wt = new Hono<{ Bindings: Env }>();

// ═══════════════════════════════════════════════════════════════════
// HELPER: Gemini AI (Google) — primary for world-trade analysis
// ═══════════════════════════════════════════════════════════════════
async function callGemini(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    });
    if (!res.ok) return '';
    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch { return ''; }
}

async function callGroq(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt || 'You are SGTX World Trade AI.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, max_tokens: 1024,
      }),
    });
    if (!res.ok) return '';
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

// AI with fallback chain: Gemini → Groq
async function aiAnalyze(env: Env, prompt: string, systemPrompt?: string): Promise<{ text: string; provider: string }> {
  if (env.GEMINI_API_KEY) {
    const t = await callGemini(env.GEMINI_API_KEY, prompt, systemPrompt);
    if (t) return { text: t, provider: 'gemini-2.0-flash' };
  }
  if (env.GROQ_API_KEY) {
    const t = await callGroq(env.GROQ_API_KEY, prompt, systemPrompt);
    if (t) return { text: t, provider: 'groq-llama-3.3-70b' };
  }
  return { text: 'AI providers unavailable. Configure GEMINI_API_KEY or GROQ_API_KEY.', provider: 'none' };
}

// ═══════════════════════════════════════════════════════════════════
// GET /world-trade/overview — Global trade dashboard data
// Combines platform data (USTN trades, corridors) with world context
// ═══════════════════════════════════════════════════════════════════
wt.get('/world-trade/overview', async (c) => {
  const { DB } = c.env;
  const [trades, shipments, corridors, prices] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) n, COALESCE(SUM(total_value_usd),0) v FROM trades`).first().catch(() => ({ n: 0, v: 0 })),
    DB.prepare(`SELECT COUNT(*) n FROM shipments WHERE status NOT IN ('DELIVERED','CANCELLED')`).first().catch(() => ({ n: 0 })),
    DB.prepare(`SELECT origin_country, destination_country, COUNT(*) n FROM trades GROUP BY origin_country, destination_country ORDER BY n DESC LIMIT 10`).all().catch(() => ({ results: [] })),
    DB.prepare(`SELECT hs_code, commodity_name, price_usd, unit, price_date FROM commodity_market_prices ORDER BY price_date DESC LIMIT 12`).all().catch(() => ({ results: [] })),
  ]) as any[];

  // Major world trade chokepoints — static reference enriched with live platform routing
  const chokepoints = [
    { name: 'Suez Canal', lat: 30.42, lon: 32.35, share_pct: 12, status: 'OPERATIONAL', region: 'MENA' },
    { name: 'Strait of Hormuz', lat: 26.57, lon: 56.25, share_pct: 21, status: 'OPERATIONAL', region: 'Gulf' },
    { name: 'Strait of Malacca', lat: 1.43, lon: 102.89, share_pct: 30, status: 'OPERATIONAL', region: 'SE Asia' },
    { name: 'Panama Canal', lat: 9.08, lon: -79.68, share_pct: 5, status: 'OPERATIONAL', region: 'Americas' },
    { name: 'Bab el-Mandeb', lat: 12.58, lon: 43.33, share_pct: 9, status: 'ELEVATED_RISK', region: 'Red Sea' },
    { name: 'Bosphorus Strait', lat: 41.12, lon: 29.06, share_pct: 3, status: 'OPERATIONAL', region: 'Black Sea' },
  ];

  return c.json({
    success: true,
    data: {
      platform: {
        total_trades: trades?.n || 0,
        total_value_usd: trades?.v || 0,
        active_shipments: shipments?.n || 0,
      },
      top_corridors: corridors?.results || [],
      commodity_prices: prices?.results || [],
      chokepoints,
      generated_at: new Date().toISOString(),
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET /world-trade/ai-briefing — Gemini-powered daily trade briefing
// ═══════════════════════════════════════════════════════════════════
wt.get('/world-trade/ai-briefing', async (c) => {
  const { DB } = c.env;
  const corridors = await DB.prepare(`SELECT origin_country, destination_country, COUNT(*) n FROM trades GROUP BY origin_country, destination_country ORDER BY n DESC LIMIT 5`).all().catch(() => ({ results: [] })) as any;
  const corridorTxt = (corridors?.results || []).map((r: any) => `${r.origin_country}→${r.destination_country} (${r.n} trades)`).join(', ') || 'EG→DE, VN→AE (sample)';

  const { text, provider } = await aiAnalyze(c.env,
    `Today is ${new Date().toISOString().slice(0, 10)}. Our platform's most active trade corridors: ${corridorTxt}. ` +
    `Provide a concise world trade intelligence briefing for cross-border traders covering: (1) key global trade dynamics affecting these corridors, ` +
    `(2) shipping & logistics considerations (Red Sea, Suez, container rates), (3) commodity market outlook for agricultural exports, ` +
    `(4) one actionable recommendation. Use short bullet points. Max 300 words.`,
    'You are SGTX World Trade AI, the intelligence layer of the Sovereign Governed Trade Execution platform. Professional, precise, actionable.');

  return c.json({ success: true, data: { briefing: text, provider, generated_at: new Date().toISOString() } });
});

// ═══════════════════════════════════════════════════════════════════
// POST /world-trade/corridor-analysis — AI analysis of a specific corridor
// ═══════════════════════════════════════════════════════════════════
wt.post('/world-trade/corridor-analysis', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { origin, destination, commodity, hs_code } = body;
  if (!origin || !destination) return c.json({ error: 'origin and destination required' }, 400);

  const { text, provider } = await aiAnalyze(c.env,
    `Analyze the trade corridor ${origin} → ${destination}${commodity ? ` for ${commodity}` : ''}${hs_code ? ` (HS ${hs_code})` : ''}. ` +
    `Cover: (1) typical shipping routes & transit times, (2) key ports, (3) documentary/customs requirements, (4) risks & mitigations, ` +
    `(5) estimated freight cost range for a 40ft container. Concise bullets, max 350 words.`,
    'You are SGTX Corridor Intelligence AI. Provide practical, trade-execution-focused analysis.');

  return c.json({ success: true, data: { analysis: text, provider, corridor: `${origin}→${destination}` } });
});

// ═══════════════════════════════════════════════════════════════════
// GET /world-trade/vessels — Live vessel snapshot for tracked shipments
// AIS Stream is websocket-based; we maintain a cached snapshot + demo fleet
// ═══════════════════════════════════════════════════════════════════
wt.get('/world-trade/vessels', async (c) => {
  const { DB } = c.env;
  // Vessels linked to active platform shipments
  const linked = await DB.prepare(`
    SELECT s.ustn, s.vessel_name, s.vessel_imo, s.status, s.origin_port, s.destination_port, s.etd, s.eta
    FROM shipments s WHERE s.vessel_name IS NOT NULL AND s.status NOT IN ('DELIVERED','CANCELLED') LIMIT 20
  `).all().catch(() => ({ results: [] })) as any;

  // Representative live fleet positions on major corridors (simulated AIS snapshot — real feed via wss://stream.aisstream.io)
  const now = Date.now();
  const fleet = [
    { mmsi: '353136000', name: 'MSC OSCAR', type: 'Container Ship', lat: 30.1 + Math.sin(now / 8e7) * 0.5, lon: 32.4, speed_kn: 12.3, heading: 175, route: 'Suez Transit', flag: 'PA' },
    { mmsi: '477995000', name: 'EVER GIVEN', type: 'Container Ship', lat: 1.2 + Math.sin(now / 9e7) * 0.3, lon: 103.5, speed_kn: 15.8, heading: 92, route: 'Malacca → Singapore', flag: 'PA' },
    { mmsi: '636019825', name: 'CMA CGM MARCO POLO', type: 'Container Ship', lat: 36.1, lon: -5.4 + Math.sin(now / 7e7) * 0.4, speed_kn: 18.1, heading: 270, route: 'Gibraltar → Atlantic', flag: 'LR' },
    { mmsi: '219018271', name: 'MAERSK ESSEX', type: 'Container Ship', lat: 25.3, lon: 55.2 + Math.sin(now / 6e7) * 0.3, speed_kn: 0.2, heading: 0, route: 'Jebel Ali Anchorage', flag: 'DK' },
    { mmsi: '256987000', name: 'MSC GÜLSÜN', type: 'Container Ship', lat: 31.2 + Math.sin(now / 5e7) * 0.4, lon: 121.7, speed_kn: 14.5, heading: 120, route: 'Shanghai → Ningbo', flag: 'MT' },
    { mmsi: '229384000', name: 'HMM ALGECIRAS', type: 'Container Ship', lat: 51.9, lon: 4.1 + Math.sin(now / 4e7) * 0.2, speed_kn: 8.7, heading: 78, route: 'Rotterdam Approach', flag: 'PA' },
  ];

  return c.json({
    success: true,
    data: {
      platform_shipments: linked?.results || [],
      live_fleet: fleet,
      ais_provider: 'aisstream.io (websocket feed)',
      note: 'Real-time AIS available via wss://stream.aisstream.io with configured API key',
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// GET /world-trade/indices — Key world trade indices & freight rates
// ═══════════════════════════════════════════════════════════════════
wt.get('/world-trade/indices', async (c) => {
  // Reference indices (representative values; production would poll providers)
  const indices = [
    { code: 'SCFI', name: 'Shanghai Containerized Freight Index', value: 1842.6, change_pct: -2.1, unit: 'points' },
    { code: 'BDI', name: 'Baltic Dry Index', value: 1975, change_pct: 1.4, unit: 'points' },
    { code: 'WCI', name: 'Drewry World Container Index', value: 2795, change_pct: -0.8, unit: 'USD/40ft' },
    { code: 'FBX', name: 'Freightos Baltic Index (Global)', value: 2410, change_pct: 0.6, unit: 'USD/FEU' },
    { code: 'BRENT', name: 'Brent Crude (Bunker proxy)', value: 78.4, change_pct: 0.9, unit: 'USD/bbl' },
    { code: 'EGX-AGRI', name: 'Egypt Agri Export Basket', value: 112.3, change_pct: 2.7, unit: 'index' },
  ];
  const routes = [
    { route: 'Shanghai → Rotterdam', usd_40ft: 2610, transit_days: 32, trend: 'down' },
    { route: 'Shanghai → Los Angeles', usd_40ft: 3120, transit_days: 16, trend: 'flat' },
    { route: 'Alexandria → Hamburg', usd_40ft: 1480, transit_days: 12, trend: 'up' },
    { route: 'Ho Chi Minh → Jebel Ali', usd_40ft: 1650, transit_days: 11, trend: 'flat' },
    { route: 'Alexandria → Jeddah', usd_40ft: 920, transit_days: 4, trend: 'up' },
    { route: 'Santos → Shanghai', usd_40ft: 2280, transit_days: 34, trend: 'down' },
  ];
  return c.json({ success: true, data: { indices, freight_routes: routes, as_of: new Date().toISOString() } });
});

// ═══════════════════════════════════════════════════════════════════
// POST /world-trade/ask — Free-form Gemini trade Q&A (governed, read-only)
// ═══════════════════════════════════════════════════════════════════
wt.post('/world-trade/ask', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { question } = body;
  if (!question) return c.json({ error: 'question required' }, 400);
  const { text, provider } = await aiAnalyze(c.env, question,
    'You are SGTX World Trade AI. Answer questions about global trade, shipping, customs, incoterms, trade finance, and commodities. ' +
    'You NEVER recommend specific counterparties (SGTX constitutional rule). Concise, professional, max 300 words.');
  return c.json({ success: true, data: { answer: text, provider } });
});

export default wt;

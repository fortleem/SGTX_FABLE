// SGTX BRAIN — AI Consensus Orchestration Layer (v13.1 Directive 10)
// Multi-provider consensus: Gemini + GROQ + HuggingFace (+OpenRouter fallback).
// CONSTITUTIONAL BOUND (A-02/A-17): The Brain is ADVISORY ONLY. It proposes,
// explains, classifies, and escalates. It NEVER holds authoritative decision
// rights — the deterministic Governor + OPA gates remain authoritative.
// Every consensus run is logged to brain_consensus_log; validated insights
// accumulate in brain_knowledge (constant learning, Directive 10).

import { uuid, isoNow } from './utils';

export interface BrainProviderResponse {
  provider: string;
  ok: boolean;
  text?: string;
  latency_ms?: number;
  error?: string;
}

export interface BrainConsensusResult {
  id: string;
  task_type: string;
  verdict: string;
  confidence: number;
  agreement_ratio: number;
  providers_queried: string[];
  providers_responded: string[];
  responses: BrainProviderResponse[];
  advisory_only: true;
  latency_ms: number;
}

const TIMEOUT_MS = 12000;

function withTimeout(p: Promise<Response>, ms = TIMEOUT_MS): Promise<Response> {
  return Promise.race([
    p,
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function askGroq(key: string, system: string, prompt: string): Promise<BrainProviderResponse> {
  const t0 = Date.now();
  try {
    const r = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: 0.2, max_tokens: 600,
      }),
    }));
    if (!r.ok) return { provider: 'groq', ok: false, error: `HTTP ${r.status}`, latency_ms: Date.now() - t0 };
    const j: any = await r.json();
    return { provider: 'groq', ok: true, text: j.choices?.[0]?.message?.content || '', latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { provider: 'groq', ok: false, error: String(e?.message || e), latency_ms: Date.now() - t0 };
  }
}

async function askGemini(key: string, system: string, prompt: string): Promise<BrainProviderResponse> {
  const t0 = Date.now();
  try {
    const r = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
      }
    ));
    if (!r.ok) return { provider: 'gemini', ok: false, error: `HTTP ${r.status}`, latency_ms: Date.now() - t0 };
    const j: any = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    return { provider: 'gemini', ok: true, text, latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { provider: 'gemini', ok: false, error: String(e?.message || e), latency_ms: Date.now() - t0 };
  }
}

async function askHuggingFace(key: string, system: string, prompt: string): Promise<BrainProviderResponse> {
  const t0 = Date.now();
  try {
    // HF Inference Providers router (OpenAI-compatible)
    const r = await withTimeout(fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: 0.2, max_tokens: 600,
      }),
    }));
    if (!r.ok) return { provider: 'huggingface', ok: false, error: `HTTP ${r.status}`, latency_ms: Date.now() - t0 };
    const j: any = await r.json();
    return { provider: 'huggingface', ok: true, text: j.choices?.[0]?.message?.content || '', latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { provider: 'huggingface', ok: false, error: String(e?.message || e), latency_ms: Date.now() - t0 };
  }
}

// Extract a verdict token (APPROVE/REVIEW/REJECT or LOW/MEDIUM/HIGH etc.) from a response
function extractVerdict(text: string, verdictSet: string[]): string | null {
  const upper = (text || '').toUpperCase();
  for (const v of verdictSet) {
    if (upper.includes(v.toUpperCase())) return v.toUpperCase();
  }
  return null;
}

const DEFAULT_VERDICTS = ['APPROVE', 'REVIEW', 'REJECT'];

export interface BrainAskOptions {
  task_type: string;
  system?: string;
  prompt: string;
  verdict_set?: string[];   // consensus tokens to vote on
  ustn?: string;
  tenant_id?: string;
}

// Core consensus engine: query all available providers in parallel, majority-vote on verdict
export async function brainConsensus(
  db: D1Database,
  env: { GEMINI_API_KEY?: string; GROQ_API_KEY?: string; HUGGINGFACE_API_KEY?: string },
  opts: BrainAskOptions
): Promise<BrainConsensusResult> {
  const t0 = Date.now();
  const verdictSet = opts.verdict_set || DEFAULT_VERDICTS;
  const system = (opts.system || 'You are the SGTX Brain, an advisory AI for a sovereign non-custodial trade execution platform. You NEVER make authoritative decisions; you advise, explain and classify.') +
    ` End your answer with exactly one verdict token from: ${verdictSet.join(', ')}.`;

  const tasks: Promise<BrainProviderResponse>[] = [];
  const queried: string[] = [];
  if (env.GROQ_API_KEY) { queried.push('groq'); tasks.push(askGroq(env.GROQ_API_KEY, system, opts.prompt)); }
  if (env.GEMINI_API_KEY) { queried.push('gemini'); tasks.push(askGemini(env.GEMINI_API_KEY, system, opts.prompt)); }
  if (env.HUGGINGFACE_API_KEY) { queried.push('huggingface'); tasks.push(askHuggingFace(env.HUGGINGFACE_API_KEY, system, opts.prompt)); }

  const responses = tasks.length ? await Promise.all(tasks) : [];
  const responded = responses.filter(r => r.ok);

  // Majority vote on extracted verdicts
  const votes: Record<string, number> = {};
  for (const r of responded) {
    const v = extractVerdict(r.text || '', verdictSet);
    if (v) votes[v] = (votes[v] || 0) + 1;
  }
  let verdict = 'NO_CONSENSUS';
  let top = 0;
  for (const [v, n] of Object.entries(votes)) {
    if (n > top) { top = n; verdict = v; }
  }
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const agreement = totalVotes ? top / totalVotes : 0;
  const confidence = responded.length
    ? Math.round(100 * agreement * (responded.length / Math.max(queried.length, 1))) / 100
    : 0;

  const id = uuid();
  const latency = Date.now() - t0;
  try {
    await db.prepare(`
      INSERT INTO brain_consensus_log
        (id, task_type, prompt_hash, question, providers_queried, providers_responded,
         responses, consensus_verdict, consensus_confidence, agreement_ratio,
         latency_ms, advisory_only, ustn, tenant_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(
      id, opts.task_type, String(opts.prompt.length), opts.prompt.slice(0, 500),
      JSON.stringify(queried), JSON.stringify(responded.map(r => r.provider)),
      JSON.stringify(responses.map(r => ({ provider: r.provider, ok: r.ok, latency_ms: r.latency_ms, text: (r.text || r.error || '').slice(0, 800) }))),
      verdict, confidence, agreement, latency,
      opts.ustn ?? null, opts.tenant_id ?? null, isoNow()
    ).run();
  } catch { /* logging must never break the request */ }

  return {
    id, task_type: opts.task_type, verdict, confidence, agreement_ratio: agreement,
    providers_queried: queried, providers_responded: responded.map(r => r.provider),
    responses, advisory_only: true, latency_ms: latency,
  };
}

// Learning loop: store a validated insight into the Brain knowledge base
export async function brainLearn(db: D1Database, domain: string, topic: string, insight: string, confidence = 0.5, source = 'CONSENSUS') {
  const existing = await db.prepare('SELECT id, usage_count FROM brain_knowledge WHERE domain = ? AND topic = ?').bind(domain, topic).first<any>();
  if (existing) {
    await db.prepare('UPDATE brain_knowledge SET insight = ?, confidence = ?, usage_count = usage_count + 1, updated_at = ? WHERE id = ?')
      .bind(insight, confidence, isoNow(), existing.id).run();
    return existing.id;
  }
  const id = uuid();
  await db.prepare('INSERT INTO brain_knowledge (id, domain, topic, insight, source, confidence, usage_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
    .bind(id, domain, topic, insight, source, confidence, isoNow(), isoNow()).run();
  return id;
}

// Recall knowledge for a domain (used to enrich prompts — the "constantly expanding knowledge")
export async function brainRecall(db: D1Database, domain: string, limit = 5): Promise<string[]> {
  const { results } = await db.prepare(
    'SELECT insight FROM brain_knowledge WHERE domain = ? ORDER BY confidence DESC, usage_count DESC LIMIT ?'
  ).bind(domain, limit).all<any>();
  return (results || []).map((r: any) => r.insight);
}

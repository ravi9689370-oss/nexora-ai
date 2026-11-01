/**
 * discovery.ts — LIVE model catalog discovery. No hardcoded model list as
 * the source of truth; the registry seed is used ONLY as an offline
 * fallback when the upstream catalog is unreachable.
 *
 * Sources:
 *   - OpenRouter public catalog: GET https://openrouter.ai/api/v1/models
 *     (no auth required for the catalog). Free = pricing.prompt === "0"
 *     AND pricing.completion === "0".
 *   - Pollinations: GET https://text.pollinations.ai/models (anonymous/free).
 *
 * Normalized fields: id, name, provider, contextLength, maxOutput,
 * streaming, imageInput, toolCalling, reasoning, free + _src.
 * Cache: data/models-catalog.json with TTL (default 10 min) so the UI stays
 * fast and upstream is not hammered; force=true bypasses the cache.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_FILE = path.join(process.cwd(), "data", "models-catalog.json");
const TTL_MS = 10 * 60 * 1000;

export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  upstream?: string;
  contextLength: number | null;
  maxOutput: number | null;
  streaming: boolean;
  imageInput: boolean;
  toolCalling: boolean;
  reasoning: boolean;
  free: boolean;
  gateway: "openrouter" | "pollinations";
  _seed?: boolean;
};

type CacheShape = {
  fetchedAt: number;
  models: CatalogModel[];
  providerHealth: Record<string, unknown>;
};

export const POLLI_ENDPOINT = "https://text.pollinations.ai/openai";
export const POLLI_MODEL_ID = "pollinations/openai";      // our registry naming
export const POLLI_UPSTREAM = "openai-fast";             // upstream model name

/** Cheap live check that Pollinations is actually responding. */
export async function probePollinations(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(POLLI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: POLLI_UPSTREAM,
        messages: [{ role: "user", content: "Reply with exactly: PONG" }],
        max_tokens: 16,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} — ${body.slice(0, 160)}` };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, error: "empty completion" };
    return { ok: true, latencyMs: latency };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchOpenRouter(): Promise<CatalogModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`openrouter catalog HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      pricing?: { prompt?: string; completion?: string };
      architecture?: { input_modalities?: string[]; output_modalities?: string[]; tokenizer?: string };
      context_length?: number;
      top_provider?: { max_completion_tokens?: number | null; context_length?: number };
      supported_parameters?: string[];
    }>;
  };
  const out: CatalogModel[] = [];
  for (const m of json.data ?? []) {
    const pricing0 = String(m.pricing?.prompt ?? "1") === "0" && String(m.pricing?.completion ?? "1") === "0";
    const freeTag = m.id.endsWith(":free");
    const inputs = m.architecture?.input_modalities ?? ["text"];
    const params = m.supported_parameters ?? [];
    out.push({
      id: m.id,
      name: m.name || m.id,
      provider: m.id.split("/")[0] ?? "unknown",
      upstream: m.id,
      contextLength: m.context_length ?? m.top_provider?.context_length ?? null,
      maxOutput: m.top_provider?.max_completion_tokens ?? null,
      streaming: true, // OpenRouter exposes /chat/completions SSE for these
      imageInput: inputs.includes("image"),
      toolCalling: params.includes("tool_choice") || params.includes("tools"),
      reasoning: params.includes("reasoning") || /reasoning|thinking/i.test(m.name ?? ""),
      free: pricing0 || freeTag,
      gateway: "openrouter",
    });
  }
  return out;
}

async function fetchPollinations(): Promise<CatalogModel[]> {
  const res = await fetch("https://text.pollinations.ai/models", {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`pollinations catalog HTTP ${res.status}`);
  const json = (await res.json()) as Array<{
    name?: string; description?: string; reasoning?: boolean; vision?: boolean;
    input_modalities?: string[]; tools?: boolean; aliases?: string[]; tier?: string;
  }>;
  const seed: CatalogModel[] = [];
  for (const m of Array.isArray(json) ? json : []) {
    seed.push({
      id: `${POLLI_MODEL_ID}`,
      name: m.description || m.name || "Pollinations OpenAI-compatible (free, keyless)",
      provider: "pollinations",
      upstream: m.name || POLLI_UPSTREAM,
      contextLength: null,
      maxOutput: null,
      streaming: true,
      imageInput: Boolean(m.vision) || (m.input_modalities ?? []).includes("image"),
      toolCalling: Boolean(m.tools),
      reasoning: Boolean(m.reasoning),
      free: (m.tier ?? "anonymous") === "anonymous" || (m.tier ?? "") === "seed",
      gateway: "pollinations",
    });
  }
  if (seed.length === 0) {
    seed.push({
      id: POLLI_MODEL_ID, name: "Pollinations gpt-oss-20b (free, keyless)",
      provider: "pollinations", upstream: POLLI_UPSTREAM,
      contextLength: null, maxOutput: null, streaming: true,
      imageInput: false, toolCalling: true, reasoning: true, free: true,
      gateway: "pollinations",
    });
  }
  return seed;
}

/** Static registry only when BOTH catalogs are unreachable. */
const FALLBACK: CatalogModel[] = [
  { id: POLLI_MODEL_ID, name: "Pollinations gpt-oss-20b (free, keyless)", provider: "pollinations", upstream: POLLI_UPSTREAM, contextLength: null, maxOutput: null, streaming: true, imageInput: false, toolCalling: true, reasoning: true, free: true, gateway: "pollinations", _seed: true },
  { id: "kilo-auto/free", name: "Auto router (bills at the selected model's rate — not guaranteed free)", provider: "auto", upstream: "openrouter/auto", contextLength: 128000, maxOutput: null, streaming: true, imageInput: false, toolCalling: true, reasoning: false, free: false, gateway: "openrouter", _seed: true },
  { id: "openai/gpt-4.1-mini", name: "OpenAI GPT-4.1-mini (paid, key required)", provider: "openai", upstream: "openai/gpt-4.1-mini", contextLength: 1000000, maxOutput: 32768, streaming: true, imageInput: true, toolCalling: true, reasoning: false, free: false, gateway: "openrouter", _seed: true },
];

export type DiscoveryResult = {
  source: "live" | "cache" | "fallback";
  fetchedAt: string;
  total: number;
  freeCount: number;
  models: CatalogModel[];
  catalogHealth: {
    openrouter: { ok: boolean; error?: string; count?: number };
    pollinations: { ok: boolean; error?: string; count?: number; probe?: { ok: boolean; latencyMs?: number; error?: string } };
  };
};

export async function discoverModels(opts: { force?: boolean; probe?: boolean } = {}): Promise<DiscoveryResult> {
  let cached: CacheShape | null = null;
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    cached = JSON.parse(raw) as CacheShape;
  } catch {
    cached = null;
  }

  if (!opts.force && cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return {
      source: "cache",
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
      total: cached.models.length,
      freeCount: cached.models.filter((m) => m.free).length,
      models: cached.models,
      catalogHealth: cached.providerHealth as DiscoveryResult["catalogHealth"],
    };
  }

  const results = await Promise.allSettled([fetchOpenRouter(), fetchPollinations()]);
  const catalogHealth: DiscoveryResult["catalogHealth"] = {
    openrouter: { ok: false },
    pollinations: { ok: false },
  };

  const models: CatalogModel[] = [];
  if (results[0].status === "fulfilled") {
    models.push(...results[0].value);
    catalogHealth.openrouter = { ok: true, count: results[0].value.length };
  } else {
    catalogHealth.openrouter = { ok: false, error: String(results[0].reason).slice(0, 200) };
  }
  if (results[1].status === "fulfilled") {
    const polli = results[1].value;
    // Only the canonical pollinations entry (dedupe aliases into one)
    const existing = models.find((m) => m.gateway === "pollinations");
    if (!existing) models.unshift(...polli);
    catalogHealth.pollinations = { ok: true, count: polli.length };
  } else {
    catalogHealth.pollinations = { ok: false, error: String(results[1].reason).slice(0, 200) };
  }

  let source: DiscoveryResult["source"] = models.length ? "live" : "fallback";
  if (!models.length) {
    models.push(...FALLBACK);
  }
  // Dedupe by upstream id.
  const seen = new Set<string>();
  const dedup = models.filter((m) => {
    const k = m.id.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const health = { ...catalogHealth };
  if (opts.probe) {
    health.pollinations.probe = await probePollinations();
  }

  const cacheObj: CacheShape = {
    fetchedAt: Date.now(),
    models: dedup,
    providerHealth: health,
  };
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cacheObj));
  } catch {
    /* read-only FS — cache skipped, not fatal */
  }

  return {
    source,
    fetchedAt: new Date().toISOString(),
    total: dedup.length,
    freeCount: dedup.filter((m) => m.free).length,
    models: dedup,
    catalogHealth: health,
  };
}

/**
 * providerGateway.ts — REAL AI provider client. No fake/sample responses.
 *
 * Providers (in configurable priority):
 *   - openrouter     (OPENROUTER_API_KEY / x-openrouter-key)      OpenAI-compatible
 *   - github-models  (GITHUB_TOKEN / x-github-key)                OpenAI-compatible
 *   - openai         (OPENAI_API_KEY / x-openai-key)              OpenAI-compatible
 *   - gemini         (GEMINI_API_KEY / x-gemini-key)              generateContent API
 *
 * Model-id routing rules:
 *   "github/<vendor>/<model>"  -> github-models
 *   "kilo-auto/free"           -> openrouter "openrouter/auto"
 *   everything else            -> openrouter (ids are OpenRouter-style,
 *      e.g. "opencode/glm-5.3-flash:free", "moonshotai/kimi-k2:free")
 *
 * A provider is only ever marked CONNECTED after a live HTTP probe per
 * test-provider endpoint — key presence alone is UNVERIFIED.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ProviderKey = "openrouter" | "github" | "openai" | "gemini" | "kilo";

export const KEYLESS_GATEWAY = {
  id: "pollinations" as const,
  endpoint: "https://text.pollinations.ai/openai",
  catalog: "https://text.pollinations.ai/models",
  upstreamDefault: "openai-fast",
};

export const PROVIDERS: ProviderKey[] = ["openrouter", "kilo", "github", "openai", "gemini"];

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  openrouter: "OpenRouter",
  kilo: "Kilo Gateway",
  github: "GitHub Models",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

export const PROVIDER_ENDPOINTS: Record<ProviderKey, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  // Kilo Gateway (kilo.ai) is OpenAI-compatible. Base URL overridable via env.
  kilo: process.env.KILO_GATEWAY_URL || "https://api.kilo.ai/api/gateway/v1",
  github: "https://models.github.ai/inference",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
};

export const ENV_KEYS: Record<ProviderKey, string> = {
  openrouter: "OPENROUTER_API_KEY",
  kilo: "KILO_API_KEY",
  github: "GITHUB_TOKEN",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const HEADER_KEYS: Record<ProviderKey, string> = {
  openrouter: "x-openrouter-key",
  kilo: "x-kilo-key",
  github: "x-github-key",
  openai: "x-openai-key",
  gemini: "x-gemini-key",
};

export function resolveKey(
  provider: ProviderKey,
  headers?: Headers | Record<string, string | undefined> | null
): string | null {
  const h = headers
    ? headers instanceof Headers
      ? (name: string) => headers.get(name)
      : (name: string) => headers[name]
    : () => null;
  return h(HEADER_KEYS[provider]) || process.env[ENV_KEYS[provider]] || null;
}

/** Pick the first configured provider (env or explicit headers). */
export function resolveDefaultProvider(
  headers?: Headers | Record<string, string | undefined> | null
): { provider: ProviderKey; key: string } | null {
  for (const p of PROVIDERS) {
    const key = resolveKey(p, headers);
    if (key) return { provider: p, key };
  }
  return null;
}

export function routeModel(modelId: string): { provider: ProviderKey | typeof KEYLESS_GATEWAY.id; upsertModel: string } {
  if (modelId.startsWith("kilo/")) {
    // Explicit kilo gateway model, e.g. "kilo/recursive/flint-v1.0"
    return { provider: "kilo", upsertModel: modelId.slice("kilo/".length) };
  }
  if (modelId.startsWith("github/")) {
    return { provider: "github", upsertModel: modelId.slice("github/".length) };
  }
  if (modelId === "kilo-auto/free") {
    // "Auto Free" style router — routed through OpenRouter's auto route.
    // NOTE: openrouter/auto bills at the selected model's rate, so auto is
    // NOT guaranteed free; the catalog marks it accordingly.
    return { provider: "openrouter", upsertModel: "openrouter/auto" };
  }
  if (modelId.startsWith("pollinations/")) {
    return { provider: KEYLESS_GATEWAY.id, upsertModel: modelId.slice("pollinations/".length) || KEYLESS_GATEWAY.upstreamDefault };
  }
  return { provider: "openrouter", upsertModel: modelId };
}

export type CompletionConfig = {
  model: string; // registry model id (routed internally)
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
};

export class ConfigurationRequiredError extends Error {
  provider?: ProviderKey;
  detail: string;
  constructor(detail: string, provider?: ProviderKey) {
    super("CONFIGURATION_REQUIRED: no AI provider key is configured.");
    this.detail = detail;
    this.provider = provider;
  }
}

/** Live probe: 1 completion with 12-token cap. Throws on failure. */
export async function probeProvider(
  provider: ProviderKey,
  key: string,
  signal?: AbortSignal
): Promise<{ latencyMs: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const sig = signal ?? controller.signal;
  try {
    if (provider === "gemini") {
      const res = await fetch(
        `${PROVIDER_ENDPOINTS.gemini}/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 12 } }),
          signal: sig,
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
    } else if (provider === "kilo") {
      // Cheap, token-free probe: list models from the gateway.
      const res = await fetch(`${PROVIDER_ENDPOINTS.kilo}/models`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
        signal: sig,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
    } else {
      const endpoint = `${PROVIDER_ENDPOINTS[provider]}/chat/completions`;
      const probeModel = provider === "github" ? "openai/gpt-4.1-mini" : provider === "openai" ? "gpt-4.1-mini" : "openai/gpt-4.1-mini";
      const headers: Record<string, string> = {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      };
      if (provider === "openrouter") headers["http-referer"] = "https://nexora-ai.local";
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: probeModel, messages: [{ role: "user", content: "ping" }], max_tokens: 12 }),
        signal: sig,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
    }
    return { latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonMessage(payload: unknown): string {
  const p = payload as { choices?: Array<{ message?: { content?: string } }> };
  return p?.choices?.[0]?.message?.content ?? "";
}

export type GatewayResult = {
  provider: ProviderKey | typeof KEYLESS_GATEWAY.id;
  model: string; // upstream model as sent
  content: string;
  raw?: unknown;
  usage?: unknown;
};

export async function chatCompletion(
  cfg: CompletionConfig,
  headers?: Headers | Record<string, string | undefined> | null
): Promise<GatewayResult> {
  const chosen = routeModel(cfg.model);

  /* Keyless gateway: Pollinations (OpenAI-compatible, anonymous tier). */
  if (chosen.provider === KEYLESS_GATEWAY.id) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch(KEYLESS_GATEWAY.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: chosen.upsertModel,
          messages: cfg.messages,
          max_tokens: cfg.maxTokens ?? 2048,
          temperature: cfg.temperature ?? 0.7,
          stream: cfg.stream ?? false,
        }),
        signal: cfg.signal ?? controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Pollinations HTTP ${res.status} — ${body.slice(0, 300)}`);
      }
      if (cfg.stream) {
        return { provider: KEYLESS_GATEWAY.id, model: chosen.upsertModel, content: "", raw: res.body };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: unknown };
      const content = json.choices?.[0]?.message?.content ?? "";
      return { provider: KEYLESS_GATEWAY.id, model: chosen.upsertModel, content, usage: json.usage, raw: json };
    } finally {
      clearTimeout(timer);
    }
  }

  const key = resolveKey(chosen.provider, headers);
  if (!key) {
    throw new ConfigurationRequiredError(
      `No API key for provider "${chosen.provider}". Set ${ENV_KEYS[chosen.provider]} on the server or deliver it via Settings → API Keys (stored per browser).`,
      chosen.provider
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    if (chosen.provider === "gemini") {
      const res = await fetch(
        `${PROVIDER_ENDPOINTS.gemini}/models/${encodeURIComponent(chosen.upsertModel.replace(":free", ""))}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: cfg.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
            systemInstruction: cfg.messages.find((m) => m.role === "system")
              ? { parts: [{ text: cfg.messages.find((m) => m.role === "system")!.content }] }
              : undefined,
            generationConfig: { maxOutputTokens: cfg.maxTokens ?? 2048, temperature: cfg.temperature ?? 0.7 },
          }),
          signal: cfg.signal ?? controller.signal,
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Gemini HTTP ${res.status} — ${body.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: unknown;
      };
      const content = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      return { provider: "gemini", model: chosen.upsertModel, content, usage: json.usageMetadata, raw: json };
    }

    const headersOut: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    };
    if (chosen.provider === "openrouter") {
      headersOut["http-referer"] = "https://nexora-ai.local";
      headersOut["x-title"] = "Nexora AI";
    }
    const res = await fetch(`${PROVIDER_ENDPOINTS[chosen.provider]}/chat/completions`, {
      method: "POST",
      headers: headersOut,
      body: JSON.stringify({
        model: chosen.upsertModel,
        messages: cfg.messages,
        max_tokens: cfg.maxTokens ?? 2048,
        temperature: cfg.temperature ?? 0.7,
        stream: cfg.stream ?? false,
      }),
      signal: cfg.signal ?? controller.signal,
    });
    if (!res.ok) {
      let body = "";
      if (res.body) {
        body = await res.text();
      } else {
        body = "";
      }
      throw new Error(
        `${PROVIDER_LABELS[chosen.provider]} HTTP ${res.status}` +
          (body ? ` — ${body.slice(0, 400)}` : "")
      );
    }
    if (cfg.stream) {
      // Pass the raw SSE body straight through to the caller.
      return { provider: chosen.provider, model: chosen.upsertModel, content: "", raw: res.body };
    }
    const json = await res.json();
    return {
      provider: chosen.provider,
      model: chosen.upsertModel,
      content: extractJsonMessage(json),
      usage: (json as { usage?: unknown }).usage,
      raw: json,
    };
  } finally {
    clearTimeout(timer);
  }
}
